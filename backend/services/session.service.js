const bookingService = require("./booking.service");

const getSessions = async (userId, role, status) => {
  return bookingService.getSessionsForUser(userId, role, status);
};

module.exports = { getSessions };
