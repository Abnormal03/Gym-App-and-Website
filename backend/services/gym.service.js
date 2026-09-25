const prisma = require("../config/prisma");

const getGymsService = async () => {
  try {
    const gyms = await prisma.gym.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        address: true,
        openingTime: true,
        closingTime: true,
        capacity: true,
        photos: true,
        amenities: true,
      },
    });

    return gyms;
  } catch (error) {
    console.log("Gyms service error:", error.message);

    throw new Error(error.message || "Failed to fetch gyms");
  }
};

const gymDetails = async (id) => {
  try {
    const now = new Date();
    const gymDetail = await prisma.gym.findUnique({
      where: {
        id: Number(id)
      },
      include: {
        packages: {
          where: { isActive: true }
        },
        _count: {
          select: {
            bookings: {
              where: {
                slotStart: {
                  gt: now
                }
              }
            }
          }
        }
      }
    })

    if (!gymDetail || !gymDetail.isActive) {
      throw new Error("Gym Not Found");
    }

    return gymDetail;
  } catch (error) {
    console.log('Gym Details Service Error: ', error.message);
    throw new Error(error.message || "Failed to fetch Gym details");
  }
};

const createGym = async ({
  name,
  address,
  latitude,
  longitude,
  openingTime,
  closingTime,
  capacity,
  photos,
  amenities,
  adminId,
}) => {
  try {
    const gym = await prisma.gym.create({
      data: {
        name,
        address,
        latitude,
        longitude,
        openingTime,
        closingTime,
        capacity,
        photos: photos || [],
        amenities: amenities || [],
        adminId,
      },
    });

    return gym;
  } catch (error) {
    console.log("Add Gym Service Error:", error.message);

    throw new Error(error.message || "Failed to create gym");
  }
};

const checkOwnership = async (userId, gymId) => {
  try {
    const gym = await prisma.gym.findFirst({
      where: {
        id: Number(gymId),
        adminId: Number(userId),
      },
    });

    return !!gym;
  } catch (error) {
    console.log("Owner Check Error:", error.message);

    throw new Error(error.message || "Failed to check ownership");
  }
};

const UpdateDetails = async ({
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
}) => {
  try {
    const updateData = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (address !== undefined) {
      updateData.address = address;
    }

    if (latitude !== undefined) {
      updateData.latitude = latitude;
    }

    if (longitude !== undefined) {
      updateData.longitude = longitude;
    }

    if (openingTime !== undefined) {
      updateData.openingTime = openingTime;
    }

    if (closingTime !== undefined) {
      updateData.closingTime = closingTime;
    }

    if (capacity !== undefined) {
      updateData.capacity = capacity;
    }

    if (photos !== undefined) {
      updateData.photos = photos;
    }

    if (amenities !== undefined) {
      updateData.amenities = amenities;
    }

    const updatedGym = await prisma.gym.update({
      where: {
        id: Number(id),
      },
      data: updateData,
    });

    return updatedGym;
  } catch (error) {
    console.log("Update Gym Service Error:", error.message);

    throw new Error(error.message || "Failed to update Gym");
  }
};

const isAvailable = async (id, slot_start, slot_end) => {
  try {
    const start = new Date(slot_start);
    const end = new Date(slot_end);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error("Invalid slot range");
    }

    if (start >= end) {
      throw new Error("Invalid slot range");
    }

    //get the number of bookings at a given time 
    const overlapping = await prisma.booking.count({
      where: {
        gymId: Number(id),
        status: "confirmed",
        slotStart: { lt: end },
        slotEnd: { gt: start },
      },
    });

    //get the capacity of the gym...
    const gymCapacity = await prisma.gym.findFirst({
      where: {
        id: Number(id)
      },
      select: {
        capacity: true
      }
    });

    if (!gymCapacity) {
      throw new Error("Gym Not Found");
    }

    return {
      capacity: gymCapacity.capacity,
      booked: overlapping,
      available: (gymCapacity.capacity - overlapping)
    }

  } catch (error) {
    console.log("Availability Check Service Error: ", error.message);
    throw new Error(error.message || "Failed to check availability");
  }
};

const searchGymsService = async (name, location) => {
  try {
    const where = {
      isActive: true,
    };

    if (name) {
      where.name = {
        contains: name.trim(),
        mode: "insensitive",
      };
    }

    if (location) {
      where.address = {
        contains: location.trim(),
        mode: "insensitive",
      };
    }

    const gyms = await prisma.gym.findMany({
      where,

      select: {
        id: true,
        name: true,
        address: true,
        openingTime: true,
        closingTime: true,
        capacity: true,
        photos: true,
        amenities: true,
      },
    });

    return gyms;
  } catch (error) {
    console.log("Search Gyms Service Error:", error.message);

    throw new Error(error.message || "Failed to search gyms");
  }
};

module.exports = {
  getGymsService,
  gymDetails,
  createGym,
  UpdateDetails,
  checkOwnership,
  isAvailable,
  searchGymsService,
};
