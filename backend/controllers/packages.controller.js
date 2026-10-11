const {
  getPackages,
  createPackage: createPackageService,
  updatePackage: updatePackageService,
  isActive: checkActive,
  deletePackage: deactivatePackage,
  getPackagesForAdmin: getPackagesAdmin,
} = require("../services/packages.service");

const handleError = (res, error, fallbackMessage) => {
  const message = error.message || fallbackMessage;

  const badRequestMessages = [
    "Invalid ID",
    "Invalid gym ID",
    "Invalid admin ID",
    "Invalid package ID",
    "Package data must be an object",
    "Package details are required",
    "Package name is required",
    "Package price is required",
    "Package durationDays is required",
    "Package name must be a non-empty string",
    "Package description must be a string or null",
    "Package price must be a non-negative number",
    "durationDays must be a positive integer",
    "sessions must be a positive integer or null",
    "Provide at least one package field to update",
  ];

  if (
    badRequestMessages.includes(message) ||
    message.startsWith("Cannot update or set these fields:")
  ) {
    return res.status(400).json({
      success: false,
      message,
    });
  }

  if (message === "Gym not found" || message === "Package not found") {
    return res.status(404).json({
      success: false,
      message,
    });
  }

  if (
    message === "Gym is not active" ||
    message === "Cannot update an inactive package" ||
    message === "Package is already inactive"
  ) {
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

// GET /api/packages?gym_id=1
const gymPackages = async (req, res) => {
  try {
    const gymId = req.query.gym_id;

    if (!gymId) {
      return res.status(400).json({
        success: false,
        message: "gym_id is required",
      });
    }

    const packages = await getPackages(gymId);

    return res.status(200).json({
      success: true,
      packages,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch gym packages");
  }
};

// GET /api/packages/admin?gym_id=1
// If gym_id is omitted, returns packages for all gyms owned by this admin.
const gymPackagesForAdmin = async (req, res) => {
  try {
    const adminId = req.user?.id;
    const gymId = req.query.gym_id;

    const packages = await getPackagesAdmin(adminId, gymId);

    return res.status(200).json({
      success: true,
      packages,
    });
  } catch (error) {
    return handleError(res, error, "Failed to fetch admin packages");
  }
};

// POST /api/packages
const createPackage = async (req, res) => {
  try {
    const newPackage = await createPackageService(req.body);

    return res.status(201).json({
      success: true,
      package: newPackage,
    });
  } catch (error) {
    return handleError(res, error, "Failed to create package");
  }
};

// PUT /api/packages/:id
const updatePackage = async (req, res) => {
  try {
    const updatedPackage = await updatePackageService(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      package: updatedPackage,
    });
  } catch (error) {
    return handleError(res, error, "Failed to update package");
  }
};

// DELETE /api/packages/:id
const deletePackage = async (req, res) => {
  try {
    const deleted = await deactivatePackage(req.params.id);

    return res.status(200).json({
      success: true,
      deleted,
      message: "Package deactivated successfully",
    });
  } catch (error) {
    return handleError(res, error, "Failed to deactivate package");
  }
};

module.exports = {
  gymPackages,
  createPackage,
  updatePackage,
  deletePackage,
  gymPackagesForAdmin,
};
