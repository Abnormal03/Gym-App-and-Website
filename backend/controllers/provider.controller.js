const { searchProvidersService } = require("../services/provider.service");

const searchProviders = async (req, res, next) => {
  try {
    const { name, type, gymId, specialization } = req.query;

    const providers = await searchProvidersService({
      name,
      type,
      gymId,
      specialization,
    });

    return res.status(200).json({
      success: true,
      count: providers.length,
      providers,
    });
  } catch (error) {
    if (
      error.message.startsWith("Invalid provider type") ||
      error.message === "Invalid gym ID"
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

module.exports = {
  searchProviders,
};
