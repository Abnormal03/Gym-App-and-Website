/**
 * The member's check-in QR. It identifies the MEMBER only (never a booking or package): the server decides what the
 * member is entitled to at scan time. The token lives 60 seconds and the app refreshes it every ~30 s, so a screenshot is useless.
 * Signed with QR_SECRET (falls back to JWT_SECRET + ':qr'). Login tokens use a different secret AND have no `typ`,
 * so a login token can never be used as a QR and a QR can never be used as a login token.
 */
const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');

const QR_TTL_SECONDS = 60;

function getSecret() {
    if (process.env.QR_SECRET) return process.env.QR_SECRET;
    if (process.env.JWT_SECRET) return `${process.env.JWT_SECRET}:qr`;
    throw new Error('QR_SECRET (or JWT_SECRET) is not set');
}

function signQrToken(userId) {
    const token = jwt.sign({ sub: String(userId), typ: 'qr' }, getSecret(), { expiresIn: QR_TTL_SECONDS });
    return { token, expiresAt: new Date(Date.now() + QR_TTL_SECONDS * 1000) };
}

/** Returns the member id, or throws UNAUTHORIZED. */
function verifyQrToken(token) {
    let payload;
    try {
        payload = jwt.verify(token, getSecret());
    } catch (_) {
        throw new AppError('UNAUTHORIZED', 'This QR code is invalid or has expired. Ask the member to refresh it.');
    }
    const userId = Number(payload.sub);
    if (payload.typ !== 'qr' || !Number.isInteger(userId) || userId <= 0) {
        throw new AppError('UNAUTHORIZED', 'This is not a check-in QR code.');
    }
    return userId;
}

module.exports = { signQrToken, verifyQrToken, QR_TTL_SECONDS };