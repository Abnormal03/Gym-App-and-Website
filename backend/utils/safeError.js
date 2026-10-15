/**
 * Prisma errors ("Invalid `prisma.booking.findUnique()` invocation in /home/.../payment.service.js ...") contain
 * server file paths and SQL details. They are logged on the server but never sent to the client.
 */
const isInternalDbError = (error) =>
  Boolean(
    error &&
    (String(error.name || "").startsWith("PrismaClient") ||
      /Invalid `prisma\./.test(String(error.message || ""))),
  );

const clientMessage = (error, fallback) =>
  isInternalDbError(error) ? fallback : error?.message || fallback;

module.exports = { isInternalDbError, clientMessage };
