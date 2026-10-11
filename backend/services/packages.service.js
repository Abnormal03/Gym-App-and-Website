const prisma = require("../config/prisma");

const parsePositiveId = (value, fieldName = "ID") => {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) <= 0
  ) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return Number(value);
};

const validatePackageData = (data, { creating = false } = {}) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Package data must be an object");
  }

  const allowedFields = [
    "name",
    "description",
    "price",
    "durationDays",
    "sessions",
  ];

  const unknownFields = Object.keys(data).filter(
    (key) => !allowedFields.includes(key),
  );

  if (unknownFields.length > 0) {
    throw new Error(
      `Cannot update or set these fields: ${unknownFields.join(", ")}`,
    );
  }

  if (creating && !Object.prototype.hasOwnProperty.call(data, "name")) {
    throw new Error("Package name is required");
  }

  if (creating && !Object.prototype.hasOwnProperty.call(data, "price")) {
    throw new Error("Package price is required");
  }

  if (creating && !Object.prototype.hasOwnProperty.call(data, "durationDays")) {
    throw new Error("Package durationDays is required");
  }

  const result = {};

  if (Object.prototype.hasOwnProperty.call(data, "name")) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      throw new Error("Package name must be a non-empty string");
    }

    result.name = data.name.trim();
  }

  if (Object.prototype.hasOwnProperty.call(data, "description")) {
    if (data.description !== null && typeof data.description !== "string") {
      throw new Error("Package description must be a string or null");
    }

    result.description = data.description;
  }

  if (Object.prototype.hasOwnProperty.call(data, "price")) {
    const price = Number(data.price);

    if (
      data.price === "" ||
      data.price === null ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error("Package price must be a non-negative number");
    }

    result.price = price;
  }

  if (Object.prototype.hasOwnProperty.call(data, "durationDays")) {
    const durationDays = Number(data.durationDays);

    if (
      data.durationDays === "" ||
      !Number.isSafeInteger(durationDays) ||
      durationDays <= 0
    ) {
      throw new Error("durationDays must be a positive integer");
    }

    result.durationDays = durationDays;
  }

  if (Object.prototype.hasOwnProperty.call(data, "sessions")) {
    if (data.sessions === null) {
      result.sessions = null;
    } else {
      const sessions = Number(data.sessions);

      if (
        data.sessions === "" ||
        !Number.isSafeInteger(sessions) ||
        sessions <= 0
      ) {
        throw new Error("sessions must be a positive integer or null");
      }

      result.sessions = sessions;
    }
  }

  if (creating && Object.keys(result).length === 0) {
    throw new Error("Package details are required");
  }

  if (!creating && Object.keys(result).length === 0) {
    throw new Error("Provide at least one package field to update");
  }

  return result;
};

// Public listing: active packages for one gym.
const getPackages = async (id) => {
  const gymId = parsePositiveId(id, "gym ID");

  return prisma.package.findMany({
    where: {
      gymId,
      isActive: true,
      gym: {
        is: {
          isActive: true,
        },
      },
    },
    orderBy: {
      id: "desc",
    },
  });
};

// Admin listing: only packages belonging to the logged-in admin's gyms.
// If gymId is provided, the list is restricted to that gym.
const getPackagesForAdmin = async (adminId, gymId) => {
  const ownerId = parsePositiveId(adminId, "admin ID");

  const where = {
    gym: {
      is: {
        adminId: ownerId,
      },
    },
  };

  if (gymId !== undefined && gymId !== null && gymId !== "") {
    where.gymId = parsePositiveId(gymId, "gym ID");
  }

  return prisma.package.findMany({
    where,
    orderBy: {
      id: "desc",
    },
  });
};

const createPackage = async (packageData) => {
  const gymId = parsePositiveId(packageData?.gymId, "gym ID");

  const data = validatePackageData(packageData, { creating: true });

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { id: true, isActive: true },
  });

  if (!gym) {
    throw new Error("Gym not found");
  }

  if (!gym.isActive) {
    throw new Error("Gym is not active");
  }

  return prisma.package.create({
    data: {
      ...data,
      gymId,
    },
  });
};

const updatePackage = async (id, packageData) => {
  const packageId = parsePositiveId(id, "package ID");
  const data = validatePackageData(packageData);

  const existingPackage = await prisma.package.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!existingPackage) {
    throw new Error("Package not found");
  }

  if (!existingPackage.isActive) {
    throw new Error("Cannot update an inactive package");
  }

  return prisma.package.update({
    where: { id: packageId },
    data,
  });
};

// Check package status.
const isActive = async (id) => {
  const packageId = parsePositiveId(id, "package ID");

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    select: { isActive: true },
  });

  if (!pkg) {
    throw new Error("Package not found");
  }

  return pkg.isActive;
};

// Soft-delete: keep the record, but deactivate it.
const deletePackage = async (id) => {
  const packageId = parsePositiveId(id, "package ID");

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!pkg) {
    throw new Error("Package not found");
  }

  if (!pkg.isActive) {
    throw new Error("Package is already inactive");
  }

  await prisma.package.update({
    where: { id: packageId },
    data: { isActive: false },
  });

  return true;
};

module.exports = {
  getPackages,
  getPackagesForAdmin,
  createPackage,
  updatePackage,
  isActive,
  deletePackage,
};
