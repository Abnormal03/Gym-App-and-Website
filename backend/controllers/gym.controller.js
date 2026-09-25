const {
  getGymsService,
  gymDetails,
  createGym,
  UpdateDetails,
  checkOwnership,
  isAvailable,
  searchGymsService,
} = require("../services/gym.service");

const GetGyms = async (req, res) => {
  try {
    const gyms = await getGymsService();

    if (!gyms || gyms.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No gyms found",
        gyms: [],
      });
    }

    return res.status(200).json({
      success: true,
      gyms,
    });
  } catch (error) {
    console.log("Gyms Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get gyms",
    });
  }
};

const getGymDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const details = await gymDetails(id);

    return res.status(200).json({
      success: true,
      gymDetails: details,
    });
  } catch (error) {
    console.log("Gym Detail Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to get Gym Details",
    });
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

    const { id } = req.user;

    if (
      !name ||
      !address ||
      longitude === undefined ||
      latitude === undefined ||
      !openingTime ||
      !closingTime ||
      !capacity
    ) {
      return res.status(400).json({
        success: false,
        message: "Full detail is needed",
      });
    }

    const newGym = await createGym({
      name,
      address,
      latitude,
      longitude,
      openingTime,
      closingTime,
      capacity,
      photos,
      amenities,
      adminId: id,
    });

    return res.status(201).json({
      success: true,
      gym: newGym,
    });
  } catch (error) {
    console.log("Add Gym Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to add Gym",
    });
  }
};

const updateGym = async (req, res) => {
  try {
    const { id } = req.params;

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

    const { id: userId } = req.user;

    const checkOwner = await checkOwnership(userId, id);

    if (!checkOwner) {
      return res.status(403).json({
        success: false,
        message: "Access Denied",
      });
    }

    const updatedGym = await UpdateDetails({
      id,
      name,
      address,
      latitude,
      longitude,
      openingTime,
      closingTime,
      capacity,
      photos,
      amenities,
    });

    return res.status(200).json({
      success: true,
      updatedGym,
    });
  } catch (error) {
    console.log("Update Gym Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update Gym",
    });
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
    console.log("Availability Check Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to check availability",
    });
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

    if (!gyms || gyms.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No gyms found",
        gyms: [],
      });
    }

    return res.status(200).json({
      success: true,
      gyms,
    });
  } catch (error) {
    console.log("Search Gyms Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to search gyms",
    });
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
