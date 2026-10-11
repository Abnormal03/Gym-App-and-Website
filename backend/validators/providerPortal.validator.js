/**
 * Input schemas for the provider portal (/me/...). Update schemas are .strict(): fields a provider must NOT change
 * (type, gymId, sharePercent, email, isActive on themselves...) are rejected with VALIDATION, never silently ignored.
 */
const { z } = require('zod');

const id = z.coerce.number().int().positive();
const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');
const atLeastOne = (obj) => Object.keys(obj).length > 0;
const NEED_ONE = { message: 'Send at least one field to update' };
const stringList = z.array(z.string().trim().min(1).max(60)).max(15);

// ---------- profile (E-40) ----------
const updateProfile = z
    .object({
        name: z.string().trim().min(2).max(100).optional(),
        phone: z.string().trim().min(7).max(20).nullable().optional(),
        bio: z.string().trim().max(1000).nullable().optional(),
        photoUrl: z.string().trim().url().max(500).nullable().optional(),
        specializations: stringList.optional(),
        experienceYears: z.number().int().min(0).max(60).optional(),
        certifications: stringList.optional(),
    })
    .strict()
    .refine(atLeastOne, NEED_ONE);

// ---------- availability (E-41): the FULL set of weekday x period slots ----------
const replaceAvailability = z
    .object({
        slots: z
            .array(
                z
                    .object({
                        dayOfWeek: z.number().int().min(0).max(6), // 0 = Sunday
                        period: z.enum(['MORNING', 'AFTERNOON', 'EVENING']),
                    })
                    .strict(),
            )
            .max(21), // 7 days x 3 periods
    })
    .strict();

// ---------- provider packages (E-42) ----------
const createPackage = z
    .object({
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(500).optional(),
        sessionCount: z.number().int().min(1).max(100),
        price: z.number().positive().max(1_000_000),
        validityDays: z.number().int().min(1).max(365),
    })
    .strict();

const updatePackage = z
    .object({
        name: z.string().trim().min(2).max(80).optional(),
        description: z.string().trim().max(500).nullable().optional(),
        sessionCount: z.number().int().min(1).max(100).optional(),
        price: z.number().positive().max(1_000_000).optional(),
        validityDays: z.number().int().min(1).max(365).optional(),
        isActive: z.boolean().optional(),
    })
    .strict()
    .refine(atLeastOne, NEED_ONE);

const listPackagesQuery = z.object({ isActive: boolQuery.optional() });

module.exports = { id, updateProfile, replaceAvailability, createPackage, updatePackage, listPackagesQuery };