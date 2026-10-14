const {
  searchProvidersService,
  getPublicProviderPackages,
  getPublicProviderAvailability,
} = require("../services/provider.service");

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

const getProviderPackages = async (req, res, next) => {
  try {
    const packages = await getPublicProviderPackages(req.params.id);
    return res.status(200).json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    return next(error);
  }
};

const getProviderAvailability = async (req, res, next) => {
  try {
    const availability = await getPublicProviderAvailability(req.params.id);
    return res.status(200).json({
      success: true,
      ...availability,
    });
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    return next(error);
  }
};

module.exports = {
  searchProviders,
  getProviderPackages,
  getProviderAvailability,
};
