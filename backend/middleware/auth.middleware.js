const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Not logged in",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};



/**
 * V2 authentication + role checks. Does NOT replace the V1 middleware: V1 routes keep using it.
 *
 *   router.get('/me/provider', requireRole('TRAINER', 'PHYSIOTHERAPIST'), handler)
 *
 * After it runs, req.auth is one of:
 *   { role: 'MEMBER',     id, userId }
 *   { role: 'GYM_ADMIN',  id, adminId }
 *   { role: 'GYM_STAFF',  id, staffId,    gymId }
 *   { role: 'TRAINER' | 'PHYSIOTHERAPIST' | 'NUTRITION_CONSULTANT', id, providerId, gymId (null for consultants) }
 *   + mustChangePassword (providers/staff)
 *
 * Provider and staff are re-loaded from the DB on every request, so a deactivated account stops working
 * immediately and a role/gym change is never stale.
 */
const prismaModule = require('../config/prisma');
const prisma = prismaModule.prisma || prismaModule;
const { AppError } = require('../utils/errors');

const PROVIDER_ROLES = ['TRAINER', 'PHYSIOTHERAPIST', 'NUTRITION_CONSULTANT'];

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

/**
 * V1 tokens (members and gym admins) were not created by this file, so their payload shape is read here.
 * >>> If V1 puts different fields in its token, adjust ONLY this function. <<<
 * Handles: { role:'admin'|'user'|..., id } , { adminId } , { userId } , { id } (member).
 */
function normalizeLegacyPayload(p) {
  const raw = String(p.role || p.type || '').toLowerCase().replace(/[^a-z]/g, ''); // 'GYM_ADMIN' -> 'gymadmin'
  if (raw === 'gymadmin' || raw === 'admin' || (!raw && p.adminId)) {
    const adminId = Number(p.adminId ?? p.userId ?? p.id);
    return { role: 'GYM_ADMIN', id: adminId, adminId };
  }
  if (raw === 'member' || raw === 'user' || (!raw && (p.userId || p.id))) {
    const userId = Number(p.userId ?? p.id);
    return { role: 'MEMBER', id: userId, userId };
  }
  return null;
}

async function loadProvider(id) {
  const p = await prisma.provider.findUnique({
    where: { id },
    select: { id: true, type: true, gymId: true, isActive: true, mustChangePassword: true },
  });
  if (!p || !p.isActive) throw new AppError('UNAUTHORIZED', 'Account not found or deactivated');
  return { role: p.type, id: p.id, providerId: p.id, gymId: p.gymId, mustChangePassword: p.mustChangePassword };
}

async function loadStaff(id) {
  const s = await prisma.gymStaff.findUnique({
    where: { id },
    select: { id: true, gymId: true, isActive: true, mustChangePassword: true },
  });
  if (!s || !s.isActive) throw new AppError('UNAUTHORIZED', 'Account not found or deactivated');
  return { role: 'GYM_STAFF', id: s.id, staffId: s.id, gymId: s.gymId, mustChangePassword: s.mustChangePassword };
}

function makeAuthenticate({ allowPasswordChange = false } = {}) {
  return async function authenticate(req, _res, next) {
    try {
      const [scheme, token] = (req.headers.authorization || '').split(' ');
      if (scheme !== 'Bearer' || !token) throw new AppError('UNAUTHORIZED', 'Missing token');

      let payload;
      try {
        payload = jwt.verify(token, getJwtSecret());
      } catch (e) {
        if (e.message === 'JWT_SECRET is not set') throw e;
        throw new AppError('UNAUTHORIZED', 'Invalid or expired token');
      }

      let auth;
      if (PROVIDER_ROLES.includes(payload.role)) auth = await loadProvider(Number(payload.id));
      else if (payload.role === 'GYM_STAFF') auth = await loadStaff(Number(payload.id));
      else auth = normalizeLegacyPayload(payload);

      if (!auth || !Number.isInteger(auth.id) || auth.id <= 0) throw new AppError('UNAUTHORIZED', 'Invalid token');
      if (auth.mustChangePassword && !allowPasswordChange) {
        throw new AppError('PASSWORD_CHANGE_REQUIRED', 'You must change your password first');
      }

      req.auth = auth;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Normal authentication: blocks accounts that still must change their temporary password. */
const authenticate = makeAuthenticate();
/** Only for /auth/change-password and /auth/me. */
const authenticateAllowingPasswordChange = makeAuthenticate({ allowPasswordChange: true });

/** Authenticates AND checks the role in one go. Returns an array of two handlers (Express accepts that). */
function requireRole(...roles) {
  const check = (req, _res, next) => {
    if (!req.auth) return next(new AppError('UNAUTHORIZED', 'Authentication required'));
    if (!roles.includes(req.auth.role)) return next(new AppError('FORBIDDEN', 'You are not allowed to do this'));
    return next();
  };
  return [authenticate, check];
}

module.exports = {
  protect,
  authenticate, authenticateAllowingPasswordChange, requireRole, PROVIDER_ROLES
};
