const prisma = require("../config/prisma.js");
const bcrypt = require("bcryptjs");

const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const parseUserId = (value) => {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const isValidPhotoUrl = (value) => {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// Retrieve the user's profile and confirmed booking count.
const getMeService = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      photoUrl: true,
      createdAt: true,
      fcmToken: true,
      _count: {
        select: {
          bookings: {
            where: {
              status: {
                in: ["confirmed", "checked_in"],
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  const { _count, ...userData } = user;

  return {
    ...userData,
    totalBookings: _count.bookings,
  };
};

// Update only profile fields provided by the user.
const updateMeService = async (userId, body = {}) => {
  const { name, phone, photoUrl, fcmToken } = body;
  const data = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw createError("Name must be a non-empty string", 400);
    }

    if (name.trim().length > 100) {
      throw createError("Name cannot exceed 100 characters", 400);
    }

    data.name = name.trim();
  }

  if (phone !== undefined) {
    if (
      phone !== null &&
      (typeof phone !== "string" || phone.trim().length > 30)
    ) {
      throw createError(
        "Phone must be a valid string of at most 30 characters",
        400,
      );
    }

    data.phone = phone === null || phone.trim() === "" ? null : phone.trim();
  }

  if (photoUrl !== undefined) {
    if (!isValidPhotoUrl(photoUrl)) {
      throw createError("photoUrl must be a valid HTTP or HTTPS URL", 400);
    }

    data.photoUrl = photoUrl || null;
  }

  if (fcmToken !== undefined) {
    if (
      fcmToken !== null &&
      (typeof fcmToken !== "string" || fcmToken.length > 4096)
    ) {
      throw createError("Invalid FCM token", 400);
    }

    data.fcmToken = fcmToken || null;
  }

  if (Object.keys(data).length === 0) {
    throw createError("Provide at least one profile field to update", 400);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      photoUrl: true,
    },
  });

  return user;
};

// Verify the current password and save the new hashed password.
const changePasswordService = async (userId, currentPassword, newPassword) => {
  if (
    typeof currentPassword !== "string" ||
    typeof newPassword !== "string" ||
    !currentPassword ||
    !newPassword
  ) {
    throw createError("Please provide current and new passwords", 400);
  }

  if (newPassword.length < 8) {
    throw createError("New password must be at least 8 characters", 400);
  }

  if (Buffer.byteLength(newPassword, "utf8") > 72) {
    throw createError("Password cannot exceed 72 bytes", 400);
  }

  if (currentPassword === newPassword) {
    throw createError("New password must differ from current password", 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password: true,
    },
  });

  if (!user) {
    throw createError("User not found", 404);
  }

  const validPassword = await bcrypt.compare(currentPassword, user.password);

  if (!validPassword) {
    throw createError("Invalid current password", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: "Password changed successfully" };
};

// Update one or more notification preferences.
const updateUserPreferenceService = async (userId, body = {}) => {
  const allowedFields = [
    "bookingConfirm",
    "sessionReminders",
    "offersAndPromotions",
  ];

  const suppliedFields = allowedFields.filter((field) =>
    Object.prototype.hasOwnProperty.call(body, field),
  );

  if (suppliedFields.length === 0) {
    throw createError("Provide at least one preference to update", 400);
  }

  for (const field of suppliedFields) {
    if (typeof body[field] !== "boolean") {
      throw createError(`${field} must be a boolean`, 400);
    }
  }

  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!userExists) {
    throw createError("User not found", 404);
  }

  const updates = Object.fromEntries(
    suppliedFields.map((field) => [field, body[field]]),
  );

  return prisma.userPreference.upsert({
    where: { userId },
    update: updates,
    create: {
      userId,
      bookingConfirm: false,
      sessionReminders: false,
      offersAndPromotions: false,
      ...updates,
    },
    select: {
      bookingConfirm: true,
      sessionReminders: true,
      offersAndPromotions: true,
    },
  });
};

// Retrieve saved notification preferences.
const getPreferenceService = async (userId) => {
  const preference = await prisma.userPreference.findUnique({
    where: { userId },
    select: {
      bookingConfirm: true,
      sessionReminders: true,
      offersAndPromotions: true,
    },
  });

  if (!preference) {
    throw createError("User preferences not found", 404);
  }

  return preference;
};

module.exports = {
  getMeService,
  updateMeService,
  changePasswordService,
  updateUserPreferenceService,
  getPreferenceService,
};
