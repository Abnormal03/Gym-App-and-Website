const {
  getGymsService,
  gymDetails,
  createGym,
  UpdateDetails,
  checkOwnership,
  isAvailable,
  searchGymsService,
} = require("../services/gym.service");

const sendError = (res, error, fallbackMessage) => {
  const message = error.message || fallbackMessage;

  const badRequestErrors = [
    "Invalid ID",
    "Invalid gym ID",
    "Invalid user ID",
    "Invalid admin ID",
    "Gym name is required",
    "Gym address is required",
    "Gym name cannot be empty",
    "Gym address cannot be empty",
    "Capacity must be a positive integer",
    "Invalid latitude",
    "Invalid longitude",
    "Opening time and closing time are required",
    "Invalid opening time",
    "Invalid closing time",
    "Photos must be an array",
    "Amenities must be an array",
    "No gym details provided to update",
    "Slot start and end are required",
    "Invalid slot range",
    "Booking start must be in the future",
    "Invalid gym capacity",
  ];

  if (badRequestErrors.includes(message)) {
    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (message === "Gym not found") {
    return res.status(404).json({
      success: false,
      message,
    });
  }

  if (message === "Gym is not active") {
    return res.status(409).json({
      success: false,
      message,
    });
  }

  console.error(`${fallbackMessage}:`, error);

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

const GetGyms = async (req, res) => {
  try {
    const gyms = await getGymsService();

    return res.status(200).json({
      success: true,
      ...(gyms.length === 0 ? { message: "No gyms found" } : {}),
      gyms,
    });
  } catch (error) {
    return sendError(res, error, "Failed to get gyms");
  }
};

const getGymDetails = async (req, res) => {
  try {
    const gymId = Number(req.params.id);

    if (!Number.isSafeInteger(gymId) || gymId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid gym ID",
      });
    }

    const details = await gymDetails(gymId);

    return res.status(200).json({
      success: true,
      gymDetails: details,
    });
  } catch (error) {
    return sendError(res, error, "Failed to get gym details");
  }
};

const addGym = async (req, res) => {
  try {
    const {
      name,
      address,
      latitude,
      longitude,
      openingTime,
      closingTime,
      capacity,
      photos,
      amenities,
    } = req.body;

    if (
      !name ||
      !address ||
      latitude === undefined ||
      longitude === undefined ||
      !openingTime ||
      !closingTime ||
      capacity === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Full detail is needed",
      });
    }

    const gym = await createGym({
      name,
      address,
      latitude,
      longitude,
      openingTime,
      closingTime,
      capacity,
      photos,
      amenities,
      adminId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      gym,
    });
  } catch (error) {
    return sendError(res, error, "Failed to add gym");
  }
};

const updateGym = async (req, res) => {
  try {
    const gymId = Number(req.params.id);

    if (!Number.isSafeInteger(gymId) || gymId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid gym ID",
      });
    }

    const isOwner = await checkOwnership(req.user.id, gymId);

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: "You are not the owner of this gym",
      });
    }

    const updatedGym = await UpdateDetails({
      id: gymId,
      ...req.body,
    });

    return res.status(200).json({
      success: true,
      updatedGym,
    });
  } catch (error) {
    if (error.message === "Gym not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message === "You are not the owner of this gym") {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return sendError(res, error, "Failed to update gym");
  }
};

const checkAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { slot_start, slot_end } = req.query;

    const available = await isAvailable(id, slot_start, slot_end);

    return res.status(200).json({
      success: true,
      available,
    });
  } catch (error) {
    return sendError(res, error, "Failed to check availability");
  }
};

const searchGyms = async (req, res) => {
  try {
    const name = req.query.name?.trim();
    const location = req.query.location?.trim();

    if (!name && !location) {
      return res.status(400).json({
        success: false,
        message: "Please provide a gym name or location",
      });
    }

    const gyms = await searchGymsService(name, location);

    return res.status(200).json({
      success: true,
      ...(gyms.length === 0 ? { message: "No gyms found" } : {}),
      gyms,
    });
  } catch (error) {
    return sendError(res, error, "Failed to search gyms");
  }
};

module.exports = {
  GetGyms,
  getGymDetails,
  addGym,
  updateGym,
  checkAvailability,
  searchGyms,
};
