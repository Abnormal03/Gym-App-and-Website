const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma.js");

const {
  allowedTrainerSessionTransitions,
} = require("../config/trainerSessionTransitions");
const createTrainer = async ({
  name,
  email,
  phone,
  password,
  bio,
  specialization,
  experienceYears,
}) => {
  const existingTrainer = await prisma.trainer.findUnique({
    where: { email },
  });

  if (existingTrainer) {
    throw new Error("A trainer with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const trainer = await prisma.trainer.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      bio: bio || null,
      specialization: specialization || null,
      experienceYears:
        experienceYears !== undefined ? Number(experienceYears) : null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      bio: true,
      specialization: true,
      experienceYears: true,
      profilePhotoUrl: true,
      sessionPrice: true,
      gymId: true,
      verificationStatus: true,
      rating: true,
      createdAt: true,
    },
  });

  return trainer;
};

const findTrainerByEmail = async (email) => {
  return prisma.trainer.findUnique({
    where: { email },
  });
};

const getTrainerById = async (trainerId) => {
  return prisma.trainer.findUnique({
    where: { id: trainerId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      bio: true,
      specialization: true,
      experienceYears: true,
      profilePhotoUrl: true,
      sessionPrice: true,
      gymId: true,
      verificationStatus: true,
      rating: true,
      createdAt: true,
      gym: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },
  });
};

const updateTrainerProfile = async (trainerId, data) => {
  return prisma.trainer.update({
    where: { id: trainerId },
    data: {
      name: data.name,
      bio: data.bio,
      specialization: data.specialization,
      experienceYears:
        data.experienceYears !== undefined
          ? Number(data.experienceYears)
          : undefined,
      profilePhotoUrl: data.profilePhotoUrl,
      sessionPrice:
        data.sessionPrice !== undefined ? data.sessionPrice : undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      bio: true,
      specialization: true,
      experienceYears: true,
      profilePhotoUrl: true,
      sessionPrice: true,
      gymId: true,
      verificationStatus: true,
      rating: true,
      createdAt: true,
    },
  });
};

const createAvailability = async ({
  trainerId,
  dayOfWeek,
  startTime,
  endTime,
}) => {
  // Check that the start time is before the end time
  if (startTime >= endTime) {
    throw new Error("Start time must be before end time");
  }

  return prisma.trainerAvailability.create({
    data: {
      trainerId,
      dayOfWeek,
      startTime,
      endTime,
    },
    select: {
      id: true,
      trainerId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
    },
  });
};

const getTrainerAvailability = async (trainerId) => {
  return prisma.trainerAvailability.findMany({
    where: {
      trainerId,
    },
    orderBy: [
      {
        dayOfWeek: "asc",
      },
      {
        startTime: "asc",
      },
    ],
    select: {
      id: true,
      trainerId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
    },
  });
};

const updateAvailability = async ({
  availabilityId,
  trainerId,
  dayOfWeek,
  startTime,
  endTime,
}) => {
  const availability = await prisma.trainerAvailability.findFirst({
    where: {
      id: availabilityId,
      trainerId,
    },
  });

  if (!availability) {
    throw new Error("Availability not found");
  }

  if (startTime >= endTime) {
    throw new Error("Start time must be before end time");
  }

  return prisma.trainerAvailability.update({
    where: {
      id: availabilityId,
    },
    data: {
      dayOfWeek,
      startTime,
      endTime,
    },
    select: {
      id: true,
      trainerId: true,
      dayOfWeek: true,
      startTime: true,
      endTime: true,
    },
  });
};

const deleteAvailability = async ({ availabilityId, trainerId }) => {
  const availability = await prisma.trainerAvailability.findFirst({
    where: {
      id: availabilityId,
      trainerId,
    },
  });

  if (!availability) {
    throw new Error("Availability not found");
  }

  await prisma.trainerAvailability.delete({
    where: {
      id: availabilityId,
    },
  });

  return availability;
};

const browseVerifiedTrainers = async ({
  specialization,
  minPrice,
  maxPrice,
}) => {
  const where = {
    verificationStatus: "VERIFIED",
  };

  if (specialization) {
    where.specialization = {
      contains: specialization,
      mode: "insensitive",
    };
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.sessionPrice = {};

    if (minPrice !== undefined) {
      where.sessionPrice.gte = minPrice;
    }

    if (maxPrice !== undefined) {
      where.sessionPrice.lte = maxPrice;
    }
  }

  return prisma.trainer.findMany({
    where,

    select: {
      id: true,
      name: true,
      bio: true,
      specialization: true,
      experienceYears: true,
      profilePhotoUrl: true,
      sessionPrice: true,
      rating: true,
      verificationStatus: true,

      gym: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
    },

    orderBy: [
      {
        rating: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
};

const getPublicTrainerProfile = async (trainerId) => {
  return prisma.trainer.findFirst({
    where: {
      id: trainerId,
      verificationStatus: "VERIFIED",
    },

    select: {
      id: true,
      name: true,
      bio: true,
      specialization: true,
      experienceYears: true,
      profilePhotoUrl: true,
      sessionPrice: true,
      rating: true,
      verificationStatus: true,
      createdAt: true,

      gym: {
        select: {
          id: true,
          name: true,
          address: true,
          latitude: true,
          longitude: true,
        },
      },

      availability: {
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          endTime: true,
        },

        orderBy: [
          {
            dayOfWeek: "asc",
          },
          {
            startTime: "asc",
          },
        ],
      },
    },
  });
};

const createTrainerBooking = async ({
  trainerId,
  memberId,
  startTime,
  endTime,
}) => {
  trainerId = Number(trainerId);
  memberId = Number(memberId);

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (!Number.isInteger(trainerId) || trainerId <= 0) {
    throw new Error("Invalid trainer ID");
  }

  if (!Number.isInteger(memberId) || memberId <= 0) {
    throw new Error("Invalid member ID");
  }

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid booking date");
  }

  if (start >= end) {
    throw new Error("startTime must be before endTime");
  }

  if (start <= new Date()) {
    throw new Error("Trainer sessions must be booked for a future time");
  }

  // Find trainer
  const trainer = await prisma.trainer.findUnique({
    where: { id: trainerId },
    include: {
      availability: true,
    },
  });

  if (!trainer) {
    throw new Error("Trainer not found");
  }

  // Only verified trainers can be booked
  if (trainer.verificationStatus !== "VERIFIED") {
    throw new Error("Trainer is not available for booking");
  }

  // Trainer must have a session price
  if (trainer.sessionPrice === null) {
    throw new Error("Trainer has not set a session price");
  }

  // Check requested day
  const dayOfWeek = start.getDay();

  // Find availability matching the requested day
  const availableSlot = trainer.availability.find((slot) => {
    if (slot.dayOfWeek !== dayOfWeek) {
      return false;
    }

    const slotStart = slot.startTime;
    const slotEnd = slot.endTime;

    const requestedStart = start.toTimeString().slice(0, 5);
    const requestedEnd = end.toTimeString().slice(0, 5);

    return requestedStart >= slotStart && requestedEnd <= slotEnd;
  });

  if (!availableSlot) {
    throw new Error("Trainer is not available during the selected time");
  }

  // Check for overlapping active sessions
  const overlappingSession = await prisma.trainerSession.findFirst({
    where: {
      trainerId,
      status: {
        in: ["PENDING_PAYMENT", "CONFIRMED"],
      },
      startTime: {
        lt: end,
      },
      endTime: {
        gt: start,
      },
    },
  });

  if (overlappingSession) {
    throw new Error("Trainer already has a session during the selected time");
  }

  // Create trainer session
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  return prisma.trainerSession.create({
    data: {
      trainerId,
      memberId,
      startTime: start,
      endTime: end,
      price: trainer.sessionPrice,
      status: "PENDING_PAYMENT",
      expiresAt,
    },
    include: {
      trainer: {
        select: {
          id: true,
          name: true,
          specialization: true,
          profilePhotoUrl: true,
          sessionPrice: true,
          rating: true,
        },
      },
      member: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return session;
};

const changeTrainerSessionStatus = async (sessionId, newStatus) => {
  sessionId = Number(sessionId);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    throw new Error("Invalid session ID");
  }

  const session = await prisma.trainerSession.findUnique({
    where: {
      id: sessionId,
    },
  });

  if (!session) {
    throw new Error("Trainer session not found");
  }

  const allowed = allowedTrainerSessionTransitions[session.status];

  if (!allowed) {
    throw new Error(`Unknown current session status: ${session.status}`);
  }

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot change trainer session from ${session.status} to ${newStatus}`,
    );
  }

  return prisma.trainerSession.update({
    where: {
      id: sessionId,
    },
    data: {
      status: newStatus,
    },
    include: {
      trainer: {
        select: {
          id: true,
          name: true,
          specialization: true,
          sessionPrice: true,
        },
      },
      member: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

const cancelTrainerSession = async (sessionId, memberId) => {
  sessionId = Number(sessionId);
  memberId = Number(memberId);

  const session = await prisma.trainerSession.findUnique({
    where: {
      id: sessionId,
    },
  });

  if (!session) {
    throw new Error("Trainer session not found");
  }

  if (session.memberId !== memberId) {
    throw new Error("Access denied");
  }

  return changeTrainerSessionStatus(sessionId, "CANCELLED");
};

const getMemberTrainerSessions = async (memberId) => {
  return prisma.trainerSession.findMany({
    where: {
      memberId: Number(memberId),
    },
    orderBy: {
      startTime: "desc",
    },
    include: {
      trainer: {
        select: {
          id: true,
          name: true,
          specialization: true,
          profilePhotoUrl: true,
          sessionPrice: true,
          rating: true,
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          chapaTxRef: true,
          createdAt: true,
        },
      },
    },
  });
};

const expirePendingTrainerSessions = async () => {
  const now = new Date();

  const result = await prisma.trainerSession.updateMany({
    where: {
      status: "PENDING_PAYMENT",
      expiresAt: {
        lte: now,
      },
    },
    data: {
      status: "CANCELLED",
    },
  });

  if (result.count > 0) {
    console.log(`EXPIRED TRAINER SESSIONS: ${result.count}`);
  }

  return result.count;
};

const createTrainerReview = async ({
  trainerId,
  memberId,
  sessionId,
  rating,
  review,
}) => {
  trainerId = Number(trainerId);
  memberId = Number(memberId);
  sessionId = Number(sessionId);
  rating = Number(rating);

  // Validate IDs
  if (
    !Number.isInteger(trainerId) ||
    trainerId <= 0 ||
    !Number.isInteger(memberId) ||
    memberId <= 0 ||
    !Number.isInteger(sessionId) ||
    sessionId <= 0
  ) {
    throw new Error("Invalid trainer, member, or session ID");
  }

  // Validate rating
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Rating must be an integer between 1 and 5");
  }

  // Check trainer exists
  const trainer = await prisma.trainer.findUnique({
    where: {
      id: trainerId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!trainer) {
    throw new Error("Trainer not found");
  }

  // Find the member's session with this trainer
  const session = await prisma.trainerSession.findFirst({
    where: {
      id: sessionId,
      trainerId,
      memberId,
    },
  });

  if (!session) {
    throw new Error(
      "Training session not found or you are not authorized to review this session",
    );
  }

  // A review is only allowed after the session is completed
  if (session.status !== "COMPLETED") {
    throw new Error("You can only review a completed training session");
  }

  // Check whether this session has already been reviewed
  const existingReview = await prisma.trainerReview.findUnique({
    where: {
      sessionId,
    },
  });

  if (existingReview) {
    throw new Error("This training session has already been reviewed");
  }

  // Create the review
  const newReview = await prisma.trainerReview.create({
    data: {
      trainerId,
      memberId,
      sessionId,
      rating,
      review: review ? review.trim() : null,
    },
    include: {
      member: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Recalculate trainer's average rating
  const ratingAggregate = await prisma.trainerReview.aggregate({
    where: {
      trainerId,
    },
    _avg: {
      rating: true,
    },
  });

  const averageRating = ratingAggregate._avg.rating || 0;

  await prisma.trainer.update({
    where: {
      id: trainerId,
    },
    data: {
      rating: averageRating,
    },
  });

  return newReview;
};

const getTrainerReviews = async (trainerId) => {
  trainerId = Number(trainerId);

  if (!Number.isInteger(trainerId) || trainerId <= 0) {
    throw new Error("Invalid trainer ID");
  }

  // Make sure trainer exists
  const trainer = await prisma.trainer.findUnique({
    where: {
      id: trainerId,
    },
    select: {
      id: true,
    },
  });

  if (!trainer) {
    throw new Error("Trainer not found");
  }

  const reviews = await prisma.trainerReview.findMany({
    where: {
      trainerId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      trainerId: true,
      memberId: true,
      sessionId: true,
      rating: true,
      review: true,
      createdAt: true,

      member: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const ratingAggregate = await prisma.trainerReview.aggregate({
    where: {
      trainerId,
    },
    _avg: {
      rating: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    reviews,
    averageRating: ratingAggregate._avg.rating || 0,
    reviewCount: ratingAggregate._count.id,
  };
};

module.exports = {
  createTrainer,
  findTrainerByEmail,
  getTrainerById,
  updateTrainerProfile,

  createAvailability,
  getTrainerAvailability,
  updateAvailability,
  deleteAvailability,

  browseVerifiedTrainers,
  getPublicTrainerProfile,

  createTrainerBooking,
  changeTrainerSessionStatus,
  cancelTrainerSession,
  getMemberTrainerSessions,
  expirePendingTrainerSessions,

  createTrainerReview,
  getTrainerReviews,
};
