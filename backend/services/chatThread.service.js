const { z } = require('zod');
const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require('../utils/errors');

let firebaseAdmin = null;
try {
    firebaseAdmin = require('firebase-admin');
} catch (_error) {
    firebaseAdmin = null;
}

const PROVIDER_ROLES = ['TRAINER', 'PHYSIOTHERAPIST', 'NUTRITION_CONSULTANT'];
const CHAT_MESSAGE_BODY = z.string().trim().min(1).max(2000);

/**
 * One chat thread per (member, provider). Whether the member can WRITE is not stored here:
 * it is computed from active access (an ACTIVE package purchase or consultation for the pair), see task A6.
 */

/** Find the thread or create it. Safe to call many times and from concurrent requests. */
async function ensureChatThread(tx, userId, providerId) {
    return tx.chatThread.upsert({
        where: { userId_providerId: { userId, providerId } },
        update: {},
        create: { userId, providerId },
    });
}

function getMemberIdFromAuth(auth) {
    if (!auth || auth.role !== 'MEMBER') return null;
    return Number(auth.userId ?? auth.id);
}

function getProviderIdFromAuth(auth) {
    if (!auth || !PROVIDER_ROLES.includes(auth.role)) return null;
    return Number(auth.providerId ?? auth.id);
}

async function ensureThreadMembership(auth, threadId) {
    const threadIdNumber = Number(threadId);
    if (!Number.isInteger(threadIdNumber) || threadIdNumber <= 0) {
        throw new AppError('VALIDATION', 'Thread id is invalid');
    }

    const thread = await prisma.chatThread.findUnique({
        where: { id: threadIdNumber },
        include: {
            user: { select: { id: true, name: true, photoUrl: true, fcmToken: true } },
            provider: { select: { id: true, name: true, photoUrl: true, fcmToken: true } },
        },
    });

    if (!thread) {
        throw new AppError('NOT_FOUND', 'Thread not found');
    }

    const memberId = getMemberIdFromAuth(auth);
    const providerId = getProviderIdFromAuth(auth);

    if (auth.role === 'MEMBER' && memberId !== thread.userId) {
        throw new AppError('FORBIDDEN', 'You do not belong to this chat');
    }

    if (PROVIDER_ROLES.includes(auth.role) && providerId !== thread.providerId) {
        throw new AppError('FORBIDDEN', 'You do not belong to this chat');
    }

    if (!memberId && !providerId) {
        throw new AppError('FORBIDDEN', 'You are not allowed to access chat');
    }

    return thread;
}

async function isChatWritableForPair(userId, providerId, now = new Date()) {
    const activePackage = await prisma.providerPackagePurchase.findFirst({
        where: {
            userId,
            providerId,
            status: 'ACTIVE',
            expiresAt: { gt: now },
        },
    });

    if (activePackage) return true;

    const activeConsultation = await prisma.consultationAccess.findFirst({
        where: {
            userId,
            consultantId: providerId,
            status: 'ACTIVE',
            expiresAt: { gt: now },
        },
    });

    return Boolean(activeConsultation);
}

function isUserOnline(io, userId, providerId) {
    if (!io) return false;
    const sockets = io.sockets instanceof Map ? io.sockets : io.sockets?.sockets;
    if (!sockets) return false;
    for (const socket of sockets.values()) {
        const socketUserId = socket.data?.userId;
        const socketProviderId = socket.data?.providerId;

        if (userId && socketUserId === userId) return true;
        if (providerId && socketProviderId === providerId) return true;
    }
    return false;
}

async function sendPushNotification(token, title, body, payload = {}) {
    if (!token || !firebaseAdmin || !firebaseAdmin.messaging || !firebaseAdmin.apps?.length) {
        return false;
    }

    try {
        await firebaseAdmin.messaging().send({
            token,
            notification: { title, body },
            data: Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, String(value)])),
        });
        return true;
    } catch (_error) {
        return false;
    }
}

async function listThreads(auth) {
    let where;
    if (auth?.role === 'MEMBER') {
        where = { userId: Number(auth.userId ?? auth.id) };
    } else if (auth && PROVIDER_ROLES.includes(auth.role)) {
        where = { providerId: Number(auth.providerId ?? auth.id) };
    } else {
        throw new AppError('FORBIDDEN', 'You are not allowed to access chat');
    }

    const threads = await prisma.chatThread.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            user: { select: { id: true, name: true, photoUrl: true, fcmToken: true } },
            provider: { select: { id: true, name: true, photoUrl: true, fcmToken: true } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
    });

    return Promise.all(threads.map(async (thread) => {
        const lastMessage = thread.messages[0] || null;
        const unreadCount = await prisma.message.count({
            where: {
                threadId: thread.id,
                ...(auth.role === 'MEMBER'
                    ? { senderProviderId: thread.providerId }
                    : { senderUserId: thread.userId }),
                readAt: null,
            },
        });

        const writable = await isChatWritableForPair(thread.userId, thread.providerId);

        return {
            id: thread.id,
            userId: thread.userId,
            providerId: thread.providerId,
            otherParty: auth.role === 'MEMBER'
                ? { id: thread.provider.id, name: thread.provider.name, photoUrl: thread.provider.photoUrl, type: thread.provider.type || 'PROVIDER' }
                : { id: thread.user.id, name: thread.user.name, photoUrl: thread.user.photoUrl },
            lastMessage: lastMessage ? {
                id: lastMessage.id,
                body: lastMessage.body,
                createdAt: lastMessage.createdAt,
                senderUserId: lastMessage.senderUserId,
                senderProviderId: lastMessage.senderProviderId,
            } : null,
            unreadCount,
            writable,
            createdAt: thread.createdAt,
        };
    }));
}

async function getThreadMessages(auth, threadId, before, limit = 50) {
    const thread = await ensureThreadMembership(auth, threadId);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const where = { threadId: thread.id };

    if (before) {
        const beforeId = Number(before);
        if (Number.isInteger(beforeId) && beforeId > 0) {
            where.id = { lt: beforeId };
        }
    }

    const messages = await prisma.message.findMany({
        where,
        orderBy: { id: 'desc' },
        take: safeLimit,
    });

    return {
        threadId: thread.id,
        messages: [...messages].reverse().map((message) => ({
            id: message.id,
            threadId: message.threadId,
            body: message.body,
            senderUserId: message.senderUserId,
            senderProviderId: message.senderProviderId,
            createdAt: message.createdAt,
            readAt: message.readAt,
        })),
    };
}

async function sendMessage(auth, threadId, rawBody, io = null) {
    const body = CHAT_MESSAGE_BODY.parse(rawBody);
    const thread = await ensureThreadMembership(auth, threadId);
    const userId = getMemberIdFromAuth(auth);
    const providerId = getProviderIdFromAuth(auth);

    if (!userId && !providerId) {
        throw new AppError('FORBIDDEN', 'You are not allowed to send messages');
    }

    const writable = await isChatWritableForPair(thread.userId, thread.providerId);
    if (!writable) {
        throw new AppError('NOT_WRITABLE', 'This chat is no longer writable');
    }

    const senderUserId = auth.role === 'MEMBER' ? userId : null;
    const senderProviderId = auth.role === 'MEMBER' ? null : providerId;

    const message = await prisma.message.create({
        data: {
            threadId: thread.id,
            senderUserId,
            senderProviderId,
            body,
        },
    });

    const payload = {
        id: message.id,
        threadId: message.threadId,
        body: message.body,
        senderUserId: message.senderUserId,
        senderProviderId: message.senderProviderId,
        createdAt: message.createdAt,
        readAt: message.readAt,
    };

    if (io) {
        io.to(`chat:${thread.id}`).emit('message:new', { threadId: thread.id, message: payload });

        const recipient = auth.role === 'MEMBER' ? thread.provider : thread.user;
        const recipientId = auth.role === 'MEMBER' ? thread.providerId : thread.userId;
        const recipientFcmToken = auth.role === 'MEMBER' ? recipient?.fcmToken : recipient?.fcmToken;

        const online = auth.role === 'MEMBER'
            ? isUserOnline(io, null, thread.providerId)
            : isUserOnline(io, thread.userId, null);
        if (recipientFcmToken && !online) {
            await sendPushNotification(
                recipientFcmToken,
                'New message',
                body,
                { threadId: String(thread.id), recipientId: String(recipientId) },
            );
        }
    }

    return payload;
}

async function markThreadRead(auth, threadId, io = null) {
    const thread = await ensureThreadMembership(auth, threadId);
    const now = new Date();
    const readFilter = auth.role === 'MEMBER'
        ? { threadId: thread.id, senderProviderId: thread.providerId, readAt: null }
        : { threadId: thread.id, senderUserId: thread.userId, readAt: null };

    const result = await prisma.message.updateMany({
        where: readFilter,
        data: { readAt: now },
    });

    if (io) {
        io.to(`chat:${thread.id}`).emit('message:read', {
            threadId: thread.id,
            readAt: now,
            updatedCount: result.count,
            readBy: auth.role,
        });
    }

    return {
        threadId: thread.id,
        readAt: now,
        updatedCount: result.count,
    };
}

module.exports = {
    ensureChatThread,
    ensureThreadMembership,
    isChatWritableForPair,
    isUserOnline,
    listThreads,
    getThreadMessages,
    sendMessage,
    markThreadRead,
    sendPushNotification,
};