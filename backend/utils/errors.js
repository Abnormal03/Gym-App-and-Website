/** One error type for the whole backend. Throw AppError anywhere; the error middleware turns it into { data: null, error }. */

const ERROR_STATUS = {
    VALIDATION: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    ALREADY_EXISTS: 409,
    PACKAGE_RESTRICTED: 422,
    CAPACITY_EXCEEDED: 409,
    PROVIDER_UNAVAILABLE: 409,
    SESSION_OUTSIDE_BOOKING: 422,
    NO_CONSULTANT_AVAILABLE: 409,
    ORDER_EXPIRED: 409,
    NOT_WRITABLE: 403,
    BALANCE_TOO_LOW: 422,
    PASSWORD_CHANGE_REQUIRED: 403,
    INTERNAL: 500,
};

class AppError extends Error {
    constructor(code, message, details) {
        super(message ?? code);
        this.name = 'AppError';
        this.code = code;
        this.status = ERROR_STATUS[code] ?? 500;
        this.details = details;
    }
}

/** Short helpers so call sites read well: throw notFound('Booking'), throw forbidden(). */
const notFound = (what = 'Resource') => new AppError('NOT_FOUND', `${what} not found`);
const forbidden = (message = 'You are not allowed to do this') => new AppError('FORBIDDEN', message);
const unauthorized = (message = 'Authentication required') => new AppError('UNAUTHORIZED', message);
const validation = (message, details) => new AppError('VALIDATION', message, details);


module.exports = {
    ERROR_STATUS,
    AppError,
    notFound,
    forbidden,
    unauthorized,
    validation
}
