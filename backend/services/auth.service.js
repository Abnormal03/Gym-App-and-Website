const prisma = require("../config/prisma")

const checkExist = async (email) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                email
            },
            include: {
                preference: {
                    select: {
                        bookingConfirm: true,
                        sessionReminders: true,
                        offersAndPromotions: true
                    }
                }
            }
        });
        if (!user) {
            return {
                exist: false
            }
        }

        return { exist: true, user };
    } catch (error) {
        console.log("Check Error:", error.message);
        throw new Error(error.message || "failed to check user!");
    }
}

const checkAdmin = async (email) => {
    try {
        const admin = await prisma.gymAdmin.findUnique({
            where: {
                email
            }
        })

        return admin;
    } catch (error) {
        console.log("Admin Check Error:", error.message);
        throw new Error(error.message || 'failed to check admin!')
    }
}


const createUser = async ({ name, email, phone, password }) => {
    try {
        const user = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                password,
                preference: {
                    create: {
                        bookingConfirm: true,
                        sessionReminders: true,
                        offersAndPromotions: false
                    }
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                createdAt: true,
                preference: true
            }
        })

        return user;
    } catch (error) {
        console.log("Create User Error:", error.message);
        throw new Error(error.message || "unable to create user");
    }
}


//version 2 features
/** Login and password change for Provider (trainer, physio, consultant) and GymStaff. Members/admins keep the V1 flow. */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

const SALT_ROUNDS = 10;
// Compared when the email does not exist, so a wrong email and a wrong password take the same time (no user enumeration).
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', SALT_ROUNDS);

const normalizeEmail = (email) => email.trim().toLowerCase();

function signActorToken({ role, id }) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set');
    // Only role + id go in the token. Everything else (gym, active, must-change-password) is read from the DB on each request.
    return jwt.sign({ role, id }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

const publicProvider = (p) => ({
    id: p.id,
    role: p.type,
    type: p.type,
    name: p.name,
    email: p.email,
    phone: p.phone,
    photoUrl: p.photoUrl,
    gymId: p.gymId,
    mustChangePassword: p.mustChangePassword,
});

const publicStaff = (s) => ({
    id: s.id,
    role: 'GYM_STAFF',
    name: s.name,
    email: s.email,
    phone: s.phone,
    gymId: s.gymId,
    mustChangePassword: s.mustChangePassword,
});

async function loginProvider(email, password) {
    const provider = await prisma.provider.findUnique({ where: { email: normalizeEmail(email) } });
    const passwordOk = await bcrypt.compare(password, provider ? provider.password : DUMMY_HASH);
    if (!provider || !passwordOk) throw new AppError('UNAUTHORIZED', 'Invalid email or password');
    if (!provider.isActive) throw new AppError('FORBIDDEN', 'This account is deactivated');

    return {
        token: signActorToken({ role: provider.type, id: provider.id }),
        mustChangePassword: provider.mustChangePassword,
        user: publicProvider(provider),
    };
}

async function loginStaff(email, password) {
    const staff = await prisma.gymStaff.findUnique({ where: { email: normalizeEmail(email) } });
    const passwordOk = await bcrypt.compare(password, staff ? staff.password : DUMMY_HASH);
    if (!staff || !passwordOk) throw new AppError('UNAUTHORIZED', 'Invalid email or password');
    if (!staff.isActive) throw new AppError('FORBIDDEN', 'This account is deactivated');

    return {
        token: signActorToken({ role: 'GYM_STAFF', id: staff.id }),
        mustChangePassword: staff.mustChangePassword,
        user: publicStaff(staff),
    };
}

/** auth = req.auth set by the middleware. Works for providers and staff only. */
async function changePassword(auth, currentPassword, newPassword) {
    const isStaff = auth.role === 'GYM_STAFF';
    const isProvider = Boolean(auth.providerId);
    if (!isStaff && !isProvider) {
        throw new AppError('FORBIDDEN', 'Use the member or admin password flow');
    }

    const table = isStaff ? prisma.gymStaff : prisma.provider;
    const actor = await table.findUnique({ where: { id: auth.id } });
    if (!actor) throw new AppError('UNAUTHORIZED', 'Account not found');

    const currentOk = await bcrypt.compare(currentPassword, actor.password);
    if (!currentOk) throw new AppError('UNAUTHORIZED', 'Current password is wrong');
    if (await bcrypt.compare(newPassword, actor.password)) {
        throw new AppError('VALIDATION', 'The new password must be different from the current one');
    }

    await table.update({
        where: { id: auth.id },
        data: { password: await bcrypt.hash(newPassword, SALT_ROUNDS), mustChangePassword: false },
    });
    return { mustChangePassword: false };
}

/** Current actor profile (for the web app to restore a session). */
async function getMe(auth) {
    if (auth.role === 'GYM_STAFF') {
        const s = await prisma.gymStaff.findUnique({ where: { id: auth.id } });
        return s ? publicStaff(s) : null;
    }
    if (auth.providerId) {
        const p = await prisma.provider.findUnique({ where: { id: auth.id } });
        return p ? publicProvider(p) : null;
    }
    return { role: auth.role, id: auth.id }; // member or admin: just the token identity
}

module.exports = {
    checkExist,
    createUser,
    checkAdmin,
    loginProvider, loginStaff, changePassword, getMe, signActorToken
}