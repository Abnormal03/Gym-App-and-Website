/** The logged-in provider's own profile (trainer, physiotherapist or nutrition consultant). Always scoped by providerId from the token. */
const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require('../utils/errors');

/** What the provider sees about themselves. sharePercent is shown but cannot be edited (the gym admin sets it). Never the password. */
const toMyProfile = (p) => ({
    id: p.id,
    type: p.type,
    name: p.name,
    email: p.email,
    phone: p.phone,
    photoUrl: p.photoUrl,
    bio: p.bio,
    specializations: p.specializations,
    experienceYears: p.experienceYears,
    certifications: p.certifications,
    sharePercent: p.sharePercent,
    gym: p.gym ? { id: p.gym.id, name: p.gym.name } : null, // null for consultants
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    sessionsCompleted: p.sessionsCompleted,
    createdAt: p.createdAt,
});

const GYM = { select: { id: true, name: true } };

async function getMyProfile(providerId) {
    const provider = await prisma.provider.findUnique({ where: { id: providerId }, include: { gym: GYM } });
    if (!provider) throw new AppError('NOT_FOUND', 'Provider not found');
    return toMyProfile(provider);
}

/** PUT /me/provider behaves as a partial update: only the fields you send change. */
async function updateMyProfile(providerId, input) {
    const updated = await prisma.provider.update({ where: { id: providerId }, data: input, include: { gym: GYM } });
    return toMyProfile(updated);
}

module.exports = { getMyProfile, updateMyProfile };