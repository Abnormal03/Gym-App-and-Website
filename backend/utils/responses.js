const { Prisma } = require('@prisma/client');
const { ZodError } = require('zod');
const { AppError } = require('./errors.js');

/**
 * Response envelope used by every V2 endpoint:
 *   success: { "data": ..., "error": null }
 *   failure: { "data": null, "error": { "code": "...", "message": "...", "details"?: ... } }
 */
const ok = (res, data, status = 200) => res.status(status).json({ data, error: null });
const created = (res, data) => ok(res, data, 201);

/** Wrap an async route so thrown errors reach the error middleware. */
const asyncHandler =
    (fn) =>
        (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };

/** Register LAST: app.use(errorHandler). Maps AppError, zod and common Prisma errors to the envelope. */
function errorHandler(err, _req, res, _next) {
    if (err instanceof AppError) {
        return res.status(err.status).json({ data: null, error: { code: err.code, message: err.message, details: err.details } });
    }
    if (err instanceof ZodError) {
        return res.status(400).json({
            data: null,
            error: { code: 'VALIDATION', message: 'Invalid input', details: err.flatten() },
        });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            return res.status(409).json({ data: null, error: { code: 'ALREADY_EXISTS', message: 'Already exists' } });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({ data: null, error: { code: 'NOT_FOUND', message: 'Not found' } });
        }
    }
    console.error(err); // never put tokens or passwords in logs
    return res.status(500).json({ data: null, error: { code: 'INTERNAL', message: 'Something went wrong' } });
}


module.exports = {
    created,
    ok,
    asyncHandler,
    errorHandler
}