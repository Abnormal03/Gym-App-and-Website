const {
  searchProvidersService,
  getPublicProviderPackages,
  getPublicProviderAvailability,
  getPublicProvidersAtGym,
  getPublicProviderDetails,
} = require("../services/provider.service");

// GET /api/providers/search?name=&type=&gymId=&specialization=
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
      error.message?.startsWith("Invalid provider type") ||
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

// GET /api/providers/:id/packages
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

    if (error.code === "VALIDATION") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

// GET /api/providers/:id/availability
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

    if (error.code === "VALIDATION") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

/**
 * GET /api/gyms/:id/providers?type=TRAINER&startsAt=...&endsAt=...
 * Returns providers with at least one valid session start in the window.
 */
const getGymProvidersController = async (req, res, next) => {
  try {
    const { type, startsAt, endsAt } = req.query;

    const providers = await getPublicProvidersAtGym(req.params.id, {
      type,
      startsAt,
      endsAt,
    });

    return res.status(200).json({
      success: true,
      count: providers.length,
      providers,
    });
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "VALIDATION") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

/**
 * GET /api/providers/:id?startsAt=...&endsAt=...
 * Returns the public provider profile, packages, weekly availability,
 * and valid session starts for the requested window.
 */
const getMemberProviderDetailController = async (req, res, next) => {
  try {
    const { startsAt, endsAt } = req.query;

    const provider = await getPublicProviderDetails(
      req.params.id,
      startsAt,
      endsAt,
    );

    return res.status(200).json({
      success: true,
      provider,
    });
  } catch (error) {
    if (error.code === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "VALIDATION") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

// Keep this export because provider.routes.js uses it.
module.exports = {
  searchProviders,
  getProviderPackages,
  getProviderAvailability,
  getGymProvidersController,
  getMemberProviderDetailController,
};
