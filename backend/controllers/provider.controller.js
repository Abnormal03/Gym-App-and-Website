const {
  searchProvidersService,
  getPublicProviderPackages,
  getPublicProviderAvailability,
  getPublicProvidersAtGym,
  getPublicProviderDetails,

  // Gym admin provider management
  createProvider: createProviderService,
  listProviders: listProvidersService,
  getProvider: getProviderService,
  updateProvider: updateProviderService,
  resetProviderPassword: resetProviderPasswordService,
} = require("../services/provider.service");

// GET /api/providers/search?name=&type=&gymId=&specialization=&startsAt=&endsAt=
const searchProviders = async (req, res, next) => {
  try {
    const { name, type, gymId, specialization, startsAt, endsAt } = req.query;

    const providers = await searchProvidersService({
      name,
      type,
      gymId,
      specialization,
      startsAt,
      endsAt,
    });

    return res.status(200).json({
      success: true,
      count: providers.length,
      providers,
    });
  } catch (error) {
    if (
      error.message?.startsWith("Invalid provider type") ||
      error.message === "Invalid gym ID" ||
      error.code === "VALIDATION"
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
    const provider = await getPublicProviderDetails(req.params.id);

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

const createProviderController = async (req, res, next) => {
  try {
    const provider = await createProviderService(req.user.id, req.body);

    return res.status(201).json({
      success: true,
      message: "Provider created successfully",
      provider,
    });
  } catch (error) {
    if (error.code === "ALREADY_EXISTS") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
};

const listProvidersController = async (req, res, next) => {
  try {
    const { gymId, type, isActive, page, limit } = req.query;

    const query = { gymId, type };

    if (isActive !== undefined) {
      if (!["true", "false"].includes(isActive)) {
        return res.status(400).json({
          success: false,
          message: "isActive must be true or false",
        });
      }

      query.isActive = isActive === "true";
    }

    const result = await listProvidersService(req.user.id, query, {
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

const getManagedProviderController = async (req, res, next) => {
  try {
    const provider = await getProviderService(req.user.id, req.params.id);

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

    if (error.code === "FORBIDDEN") {
      return res.status(403).json({
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

    console.error("[getManagedProviderController]", error);
    return next(error);
  }
};

const updateProviderController = async (req, res, next) => {
  try {
    // Only allow editable fields.
    // Never accept type, email, gymId, password, or password hash.
    const allowedFields = [
      "name",
      "phone",
      "photoUrl",
      "bio",
      "specializations",
      "experienceYears",
      "certifications",
      "sharePercent",
      "isActive",
    ];

    const input = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        input[field] = req.body[field];
      }
    }

    if (Object.keys(input).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No editable provider fields were supplied",
      });
    }

    const provider = await updateProviderService(
      req.user.id,
      req.params.id,
      input,
    );

    return res.status(200).json({
      success: true,
      message: "Provider updated successfully",
      provider,
    });
  } catch (error) {
    return next(error);
  }
};

const resetProviderPasswordController = async (req, res, next) => {
  try {
    const result = await resetProviderPasswordService(
      req.user.id,
      req.params.id,
    );

    return res.status(200).json({
      success: true,
      message: "Temporary password generated successfully",
      ...result,
    });
  } catch (error) {
    return next(error);
  }
};

// Keep this export because provider.routes.js uses it.

module.exports = {
  // Existing controllers
  searchProviders,
  getProviderPackages,
  getProviderAvailability,
  getGymProvidersController,
  getMemberProviderDetailController,

  // New admin controllers
  createProviderController,
  listProvidersController,
  getManagedProviderController,
  updateProviderController,
  resetProviderPasswordController,
};
