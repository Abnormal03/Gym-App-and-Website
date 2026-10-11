/**
 * Input schemas for the admin endpoints (zod). Controllers call schema.parse(req.body / req.query).
 * Update schemas are .strict(): unknown fields (like password, type, gymId on a provider) are REJECTED, never silently saved.
 */
const { z } = require('zod');

// ---------- building blocks ----------
const id = z.coerce.number().int().positive();
const email = z.string().trim().toLowerCase().email().max(120);
const name = z.string().trim().min(2).max(100);
const phone = z.string().trim().min(7).max(20);
const password = z
    .string()
    .min(8, 'At least 8 characters')
    .max(72, 'At most 72 characters')
    .regex(/[A-Za-z]/, 'Must contain a letter')
    .regex(/\d/, 'Must contain a digit');
const boolQuery = z.enum(['true', 'false']).transform((v) => v === 'true');
const uniqueSorted = (arr) => [...new Set(arr)].sort((a, b) => a - b);
const atLeastOne = (obj) => Object.keys(obj).length > 0;
const NEED_ONE = { message: 'Send at least one field to update' };

const dayList = z.array(z.number().int().min(0).max(6)).max(7).transform(uniqueSorted); // 0 = Sunday
const periodList = z.array(z.enum(['MORNING', 'AFTERNOON', 'EVENING'])).max(3).transform((a) => [...new Set(a)]);
const stringList = z.array(z.string().trim().min(1).max(60)).max(15);

// ---------- staff ----------
const createStaff = z
    .object({
        gymId: id,
        name,
        email,
        phone: phone.optional(),
        password: password.optional(), // omit it and the server generates a temporary one
    })
    .strict();

const updateStaff = z
    .object({ name: name.optional(), phone: phone.nullable().optional(), isActive: z.boolean().optional(), gymId: id.optional() })
    .strict()
    .refine(atLeastOne, NEED_ONE);

const listStaffQuery = z.object({ gymId: id.optional(), isActive: boolQuery.optional() });

// ---------- providers (trainer / physiotherapist only) ----------
const createProvider = z
    .object({
        gymId: id,
        type: z.enum(['TRAINER', 'PHYSIOTHERAPIST']),
        name,
        email,
        phone: phone.optional(),
        password: password.optional(),
        bio: z.string().trim().max(1000).optional(),
        specializations: stringList.default([]),
        experienceYears: z.number().int().min(0).max(60).default(0),
        certifications: stringList.default([]),
        sharePercent: z.number().int().min(0).max(100).default(100),
    })
    .strict();

const updateProvider = z
    .object({
        name: name.optional(),
        phone: phone.nullable().optional(),
        bio: z.string().trim().max(1000).nullable().optional(),
        specializations: stringList.optional(),
        experienceYears: z.number().int().min(0).max(60).optional(),
        certifications: stringList.optional(),
        sharePercent: z.number().int().min(0).max(100).optional(),
        isActive: z.boolean().optional(),
    })
    .strict()
    .refine(atLeastOne, NEED_ONE);

const listProvidersQuery = z.object({
    gymId: id.optional(),
    type: z.enum(['TRAINER', 'PHYSIOTHERAPIST']).optional(),
    isActive: boolQuery.optional(),
});

// ---------- gym packages ----------
const packageFields = {
    name: z.string().trim().min(2).max(80),
    type: z.enum(['daily', 'weekly', 'monthly', 'annual']),
    price: z.number().positive().max(1_000_000),
    durationDays: z.number().int().min(1).max(366),
    benefits: z.string().trim().max(500).nullable(),
    maxVisits: z.number().int().min(1).max(1000).nullable(), // null = unlimited
    allowedDays: dayList, // empty = every day
    allowedPeriods: periodList, // empty = every period
    maxGroupSize: z.number().int().min(1).max(50), // 1 = single booking only
};

const createGymPackage = z
    .object({
        gymId: id,
        name: packageFields.name,
        type: packageFields.type,
        price: packageFields.price,
        durationDays: packageFields.durationDays,
        benefits: packageFields.benefits.optional(),
        maxVisits: packageFields.maxVisits.default(null),
        allowedDays: packageFields.allowedDays.default([]),
        allowedPeriods: packageFields.allowedPeriods.default([]),
        maxGroupSize: packageFields.maxGroupSize.default(1),
    })
    .strict();

const updateGymPackage = z
    .object({
        name: packageFields.name.optional(),
        type: packageFields.type.optional(),
        price: packageFields.price.optional(),
        durationDays: packageFields.durationDays.optional(),
        benefits: packageFields.benefits.optional(),
        maxVisits: packageFields.maxVisits.optional(),
        allowedDays: packageFields.allowedDays.optional(),
        allowedPeriods: packageFields.allowedPeriods.optional(),
        maxGroupSize: packageFields.maxGroupSize.optional(),
        isActive: z.boolean().optional(),
    })
    .strict()
    .refine(atLeastOne, NEED_ONE);

const listGymPackagesQuery = z.object({ gymId: id.optional(), isActive: boolQuery.optional() });

module.exports = {
    createStaff, updateStaff, listStaffQuery,
    createProvider, updateProvider, listProvidersQuery,
    createGymPackage, updateGymPackage, listGymPackagesQuery,
};