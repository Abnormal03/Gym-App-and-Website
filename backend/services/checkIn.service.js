const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require('../utils/errors');
const { toId, assertStaffInGym, assertAdminOwnsGym } = require('../utils/scope');
const { toAddisDate, addMinutes } = require('../utils/time');
const { verifyQrToken, signQrToken } = require('./qrToken.service');
const { packageAllowsNow, isWithinGymHours } = require('../utils/checkInRules');
const { getBoolSetting } = require('./platformSetting.service');
const { getUsedCapacity, expireStale } = require('./bookingHelpers.service');
const { recordWorkout } = require('./memberStats.service');
const { awardBadges } = require('./badge.service');

async function getMemberPass(auth, gymIdParam) {
    const gymId = toId(gymIdParam, 'gymId');
    const userId = auth.userId;
    const now = new Date();

    const gym = await prisma.gym.findUnique({ where: { id: gymId } });
    if (!gym || !gym.isActive) throw new AppError('NOT_FOUND', 'Gym not found');

    await expireStale(prisma, { userId, gymId });

    // 1. Check covering booking (allow 30 minutes early)
    const booking = await prisma.booking.findFirst({
        where: {
            userId,
            gymId,
            status: { in: ['confirmed', 'checked_in'] },
            slotStart: { lte: addMinutes(now, 30) },
            slotEnd: { gte: now },
        },
        orderBy: { slotStart: 'asc' },
    });

    if (booking) {
        const existingCheckIn = await prisma.checkIn.findFirst({
            where: { bookingId: booking.id, localDate: toAddisDate(now) },
            orderBy: { checkedInAt: 'asc' },
        });
        if (existingCheckIn) {
            return {
                state: 'CHECKED_IN',
                checkedInAt: existingCheckIn.checkedInAt,
            };
        }
        const { token, expiresAt } = signQrToken(userId);
        return {
            state: 'READY',
            qrToken: token,
            expiresAt,
        };
    }

    // 2. Check active MemberPackage for this gym
    const memberPkg = await prisma.memberPackage.findFirst({
        where: {
            userId,
            gymId,
            status: 'ACTIVE',
        },
        include: { package: true },
        orderBy: { endsAt: 'desc' },
    });

    if (!memberPkg) {
        return { state: 'NOT_VALID_TODAY', reason: 'NO_ACTIVE_BOOKING_OR_PACKAGE' };
    }

    if (memberPkg.endsAt <= now) {
        return { state: 'EXPIRED', reason: 'PACKAGE_ENDED' };
    }

    if (memberPkg.maxVisits !== null && memberPkg.visitsUsed >= memberPkg.maxVisits) {
        return { state: 'EXPIRED', reason: 'NO_VISITS_LEFT' };
    }

    const allowCheck = packageAllowsNow(memberPkg.package, now);
    if (!allowCheck.ok) {
        return { state: 'NOT_VALID_TODAY', reason: allowCheck.reason };
    }

    if (!isWithinGymHours(gym, now)) {
        return { state: 'NOT_VALID_TODAY', reason: 'OUTSIDE_HOURS' };
    }

    const { token, expiresAt } = signQrToken(userId);
    return {
        state: 'READY',
        qrToken: token,
        expiresAt,
    };
}

async function assertScannerAuth(auth, gymId) {
    if (auth.role === 'GYM_STAFF') {
        assertStaffInGym(auth, gymId);
    } else if (auth.role === 'GYM_ADMIN') {
        await assertAdminOwnsGym(auth.adminId, gymId);
    } else {
        throw new AppError('FORBIDDEN', 'Only staff or admin can perform check-ins');
    }
}

async function recordCheckIn(auth, { token, userId, gymId: gymIdParam }) {
    const gymId = toId(gymIdParam, 'gymId');
    await assertScannerAuth(auth, gymId);

    let targetUserId;
    if (token) {
        targetUserId = verifyQrToken(token);
    } else if (userId) {
        targetUserId = toId(userId, 'userId');
    } else {
        throw new AppError('VALIDATION', 'Either token or userId is required');
    }

    const now = new Date();
    const todayStr = toAddisDate(now);

    return prisma.$transaction(async (tx) => {
        await expireStale(tx, { userId: targetUserId, gymId });

        const user = await tx.user.findUnique({
            where: { id: targetUserId },
            select: { id: true, name: true, phone: true },
        });
        if (!user) throw new AppError('NOT_FOUND', 'User not found');

        // Look for covering booking
        const booking = await tx.booking.findFirst({
            where: {
                userId: targetUserId,
                gymId,
                status: { in: ['confirmed', 'checked_in'] },
                slotStart: { lte: addMinutes(now, 30) },
                slotEnd: { gte: now },
            },
            orderBy: { slotStart: 'asc' },
        });

        if (booking) {
            const existingCheckIn = await tx.checkIn.findFirst({
                where: { bookingId: booking.id, localDate: todayStr },
                orderBy: { checkedInAt: 'asc' },
            });
            if (existingCheckIn) {
                return {
                    success: true,
                    alreadyCheckedIn: true,
                    checkedInAt: existingCheckIn.checkedInAt,
                    memberName: user.name,
                    guestCount: booking.headcount,
                    covering: 'BOOKING',
                };
            }

            if (booking.memberPackageId) {
                await tx.memberPackage.update({
                    where: { id: booking.memberPackageId },
                    data: { visitsUsed: { increment: 1 } },
                });
            }

            const checkIn = await tx.checkIn.create({
                data: {
                    userId: targetUserId,
                    gymId,
                    bookingId: booking.id,
                    memberPackageId: booking.memberPackageId || null,
                    localDate: todayStr,
                    guestCount: booking.headcount,
                    scannedByAdminId: auth.role === 'GYM_ADMIN' ? auth.adminId : null,
                    scannedByStaffId: auth.role === 'GYM_STAFF' ? auth.staffId : null,
                },
            });

            await recordWorkout(tx, targetUserId, todayStr);
            const newBadges = await awardBadges(tx, { userId: targetUserId }, 'CHECK_IN');

            return {
                success: true,
                alreadyCheckedIn: false,
                checkedInAt: checkIn.checkedInAt,
                memberName: user.name,
                guestCount: booking.headcount,
                covering: 'BOOKING',
                newBadges,
            };
        }

        // Walk-in with active MemberPackage
        const allowWalkin = await getBoolSetting('ALLOW_WALKIN_WITH_PACKAGE');
        if (!allowWalkin) {
            throw new AppError('FORBIDDEN', 'Walk-in with package is disabled');
        }

        const memberPkg = await tx.memberPackage.findFirst({
            where: {
                userId: targetUserId,
                gymId,
                status: 'ACTIVE',
                endsAt: { gt: now },
            },
            include: { package: true },
            orderBy: { endsAt: 'desc' },
        });

        if (!memberPkg) {
            throw new AppError('NOT_FOUND', 'No valid booking or active package found for check-in');
        }

        if (memberPkg.maxVisits !== null && memberPkg.visitsUsed >= memberPkg.maxVisits) {
            throw new AppError('PACKAGE_RESTRICTED', 'Package visits exhausted');
        }

        const allowCheck = packageAllowsNow(memberPkg.package, now);
        if (!allowCheck.ok) {
            throw new AppError('PACKAGE_RESTRICTED', `Package not valid now (${allowCheck.reason})`);
        }

        // Lock gym row for capacity check
        const gymRows = await tx.$queryRaw`
            SELECT "id", "capacity" FROM "Gym" WHERE "id" = ${gymId} FOR UPDATE
        `;
        const gym = gymRows[0];
        if (!gym) throw new AppError('NOT_FOUND', 'Gym not found');

        const used = await getUsedCapacity(tx, gymId, now, addMinutes(now, 60));
        if (used + 1 > gym.capacity) {
            throw new AppError('CAPACITY_EXCEEDED', 'Gym is at full capacity');
        }

        // Check if already checked in today with this package
        const existingCheckIn = await tx.checkIn.findFirst({
            where: {
                userId: targetUserId,
                gymId,
                memberPackageId: memberPkg.id,
                localDate: todayStr,
            },
        });

        if (existingCheckIn) {
            return {
                success: true,
                alreadyCheckedIn: true,
                checkedInAt: existingCheckIn.checkedInAt,
                memberName: user.name,
                guestCount: 1,
                covering: 'PACKAGE',
            };
        }

        await tx.memberPackage.update({
            where: { id: memberPkg.id },
            data: { visitsUsed: { increment: 1 } },
        });

        const checkIn = await tx.checkIn.create({
            data: {
                userId: targetUserId,
                gymId,
                bookingId: null,
                memberPackageId: memberPkg.id,
                localDate: todayStr,
                guestCount: 1,
                scannedByAdminId: auth.role === 'GYM_ADMIN' ? auth.adminId : null,
                scannedByStaffId: auth.role === 'GYM_STAFF' ? auth.staffId : null,
            },
        });

        await recordWorkout(tx, targetUserId, todayStr);
        const newBadges = await awardBadges(tx, { userId: targetUserId }, 'CHECK_IN');

        return {
            success: true,
            alreadyCheckedIn: false,
            checkedInAt: checkIn.checkedInAt,
            memberName: user.name,
            guestCount: 1,
            covering: 'PACKAGE',
            newBadges,
        };
    });
}

async function getTodayCheckIns(auth, gymIdParam) {
    const gymId = toId(gymIdParam, 'gymId');
    await assertScannerAuth(auth, gymId);

    const todayStr = toAddisDate(new Date());
    const list = await prisma.checkIn.findMany({
        where: { gymId, localDate: todayStr },
        include: {
            user: { select: { id: true, name: true, phone: true } },
            booking: { select: { id: true, headcount: true, slotStart: true, slotEnd: true } },
            memberPackage: { select: { id: true, package: { select: { name: true, type: true } } } },
        },
        orderBy: { checkedInAt: 'desc' },
    });

    return list.map((c) => ({
        id: c.id,
        userId: c.userId,
        memberName: c.user.name,
        guestCount: c.guestCount,
        checkedInAt: c.checkedInAt,
        type: c.bookingId ? 'BOOKING' : 'PACKAGE_WALKIN',
        package: c.memberPackage?.package?.name || null,
    }));
}

async function searchMembers(auth, gymIdParam, query) {
    const gymId = toId(gymIdParam, 'gymId');
    await assertScannerAuth(auth, gymId);

    const q = (query || '').trim();
    if (!q) return [];

    const now = new Date();
    const todayStr = toAddisDate(now);

    const members = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q, mode: 'insensitive' } },
            ],
            AND: {
                OR: [
                    {
                        bookings: {
                            some: {
                                gymId,
                                status: { in: ['confirmed', 'checked_in'] },
                                slotStart: { lte: addMinutes(now, 1440) }, // today's range
                            },
                        },
                    },
                    {
                        memberPackages: {
                            some: {
                                gymId,
                                status: 'ACTIVE',
                                endsAt: { gt: now },
                            },
                        },
                    },
                ],
            },
        },
        select: {
            id: true,
            name: true,
            phone: true,
        },
        take: 20,
    });

    return members;
}

module.exports = {
    getMemberPass,
    recordCheckIn,
    getTodayCheckIns,
    searchMembers,
};
