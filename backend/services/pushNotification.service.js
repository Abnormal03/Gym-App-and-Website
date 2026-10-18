const prisma = require("../config/prisma");
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const isExpoPushToken = (token) => typeof token === "string" && (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken["));
async function sendExpoPush(token, { title, body, data = {} }) {
  if (!isExpoPushToken(token)) return false;
  try {
    const response = await fetch(EXPO_PUSH_URL, { method: "POST", headers: { Accept: "application/json", "Accept-Encoding": "gzip, deflate", "Content-Type": "application/json" }, body: JSON.stringify({ to: token, title, body, data, sound: "default", channelId: "default", priority: "high" }) });
    const result = await response.json(); const ticket = result?.data;
    const accepted = response.ok && ticket?.status === "ok";
    if (!accepted && ticket?.details?.error === "DeviceNotRegistered") await prisma.user.updateMany({ where: { expoPushToken: token }, data: { expoPushToken: null } });
    if (!accepted) console.warn("[Expo Push] Message was not accepted", { status: response.status, error: ticket?.details?.error || ticket?.message });
    return accepted;
  } catch (error) { console.warn("[Expo Push] Request failed", { message: error.message }); return false; }
}
async function sendMemberNotification(userId, { preference, title, body, data }) {
  const user = await prisma.user.findFirst({ where: { id: Number(userId), deletedAt: null }, select: { expoPushToken: true, preference: { select: { bookingConfirm: true, sessionReminders: true, offersAndPromotions: true } } } });
  if (!user?.expoPushToken || (preference && user.preference?.[preference] === false)) return false;
  return sendExpoPush(user.expoPushToken, { title, body, data });
}
async function notifyBookingConfirmed(bookingId) {
  const booking = await prisma.booking.findUnique({ where: { id: Number(bookingId) }, select: { id: true, userId: true, status: true, gym: { select: { name: true } }, user: { select: { expoPushToken: true, deletedAt: true, preference: { select: { bookingConfirm: true } } } } } });
  if (!booking || booking.status !== "confirmed" || booking.user.deletedAt || !booking.user.expoPushToken || booking.user.preference?.bookingConfirm === false) return false;
  const now = new Date(); const claimed = await prisma.booking.updateMany({ where: { id: booking.id, status: "confirmed", confirmationNotificationSentAt: null }, data: { confirmationNotificationSentAt: now } });
  if (!claimed.count) return false;
  const sent = await sendExpoPush(booking.user.expoPushToken, { title: "Booking confirmed", body: "Your booking at " + booking.gym.name + " is confirmed.", data: { url: "/booking/details/" + booking.id, bookingId: String(booking.id) } });
  if (!sent) await prisma.booking.updateMany({ where: { id: booking.id, confirmationNotificationSentAt: now }, data: { confirmationNotificationSentAt: null } });
  return sent;
}
async function sendDueMemberReminders() {
  const now = new Date(); const dueBefore = new Date(now.getTime() + 3600000);
  const bookings = await prisma.booking.findMany({ where: { status: "confirmed", slotStart: { gt: now, lte: dueBefore }, reminderNotificationSentAt: null, user: { deletedAt: null, expoPushToken: { not: null }, preference: { is: { sessionReminders: true } } } }, select: { id: true, userId: true, gym: { select: { name: true } } }, take: 100, orderBy: { slotStart: "asc" } });
  let sentCount = 0;
  for (const booking of bookings) {
    const claim = await prisma.booking.updateMany({ where: { id: booking.id, status: "confirmed", reminderNotificationSentAt: null }, data: { reminderNotificationSentAt: now } });
    if (!claim.count) continue;
    const sent = await sendMemberNotification(booking.userId, { preference: "sessionReminders", title: "Your gym booking is coming up", body: booking.gym.name + " starts in about an hour.", data: { url: "/booking/details/" + booking.id, bookingId: String(booking.id) } });
    if (sent) sentCount++; else await prisma.booking.updateMany({ where: { id: booking.id, reminderNotificationSentAt: now }, data: { reminderNotificationSentAt: null } });
  }
  const sessions = await prisma.trainingSession.findMany({ where: { status: "SCHEDULED", startsAt: { gt: now, lte: dueBefore }, reminderNotificationSentAt: null, user: { deletedAt: null, expoPushToken: { not: null }, preference: { is: { sessionReminders: true } } } }, select: { id: true, userId: true, provider: { select: { name: true } } }, take: 100, orderBy: { startsAt: "asc" } });
  for (const session of sessions) {
    const claim = await prisma.trainingSession.updateMany({ where: { id: session.id, status: "SCHEDULED", reminderNotificationSentAt: null }, data: { reminderNotificationSentAt: now } });
    if (!claim.count) continue;
    const sent = await sendMemberNotification(session.userId, { preference: "sessionReminders", title: "Your provider session is coming up", body: "Your session with " + session.provider.name + " starts in about an hour.", data: { url: "/sessions", sessionId: String(session.id) } });
    if (sent) sentCount++; else await prisma.trainingSession.updateMany({ where: { id: session.id, reminderNotificationSentAt: now }, data: { reminderNotificationSentAt: null } });
  }
  return { sentCount, dueBookings: bookings.length, dueSessions: sessions.length };
}
module.exports = { isExpoPushToken, sendExpoPush, sendMemberNotification, sendDueMemberReminders, notifyBookingConfirmed };
