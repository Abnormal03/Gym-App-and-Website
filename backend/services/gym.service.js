const prisma = require("../config/prisma");

const getGymsService = async () => {
    try {
        const gyms = await prisma.gym.findMany({
            where: {
                isActive: true
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
            }
        });

        return gyms;
    } catch (error) {
        console.log('Gyms service error: ', error.message);
        throw new Error(error.message || "Failed to fetch gyms")
    }
}


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
}


const createGym = async ({ name, address, latitude, longitude, openingTime, closingTime, capacity, photos, amenities, adminId }) => {
    try {
        const numericCapacity = Number(capacity);
        const numericLatitude = Number(latitude);
        const numericLongitude = Number(longitude);

        if (!Number.isInteger(numericCapacity) || numericCapacity <= 0) {
            throw new Error("capacity must be a positive integer");
        }

        if (Number.isNaN(numericLatitude) || Number.isNaN(numericLongitude)) {
            throw new Error("latitude and longitude must be numbers");
        }
        const gym = await prisma.gym.create({
            data: {
                name,
                address,
                longitude: numericLongitude,
                latitude: numericLatitude,
                openingTime,
                closingTime,
                capacity: numericCapacity,
                amenities,
                photos,
                adminId
            },
        })

        return gym;
    } catch (error) {
        console.log("Add Gym Service Error: ", error.message);
        throw new Error(error.message || "Failed to create gym");
    }
}


const checkOwnership = async (userId, gymId) => {
    try {
        const gym = await prisma.gym.findFirst({
            where: {
                id: Number(gymId),
                adminId: Number(userId)
            }
        })

        if (gym) {
            return true;
        }

        return false;
    } catch (error) {
        console.log("Owner Check Error: ", error.message);
        throw new Error(error.message || "Failed to check ownership")
    }
}

const UpdateDetails = async ({ id, name, address, latitude, longitude, openingTime, closingTime, capacity, photos, amenities }) => {
    try {
        const updateDate = {};
        if (name !== undefined) updateDate.name = name;
        if (address !== undefined) updateDate.address = address;
        if (latitude !== undefined) updateDate.latitude = latitude;
        if (longitude !== undefined) updateDate.longitude = longitude;
        if (openingTime !== undefined) updateDate.openingTime = openingTime;
        if (closingTime !== undefined) updateDate.closingTime = closingTime;
        if (capacity !== undefined) updateDate.capacity = capacity;
        if (photos !== undefined) updateDate.photos = photos;
        if (amenities !== undefined) updateDate.amenities = amenities;


        const updatedGym = await prisma.gym.update({
            where: {
                id: Number(id)
            },
            data: updateDate
        })


        return updatedGym;
    } catch (error) {
        console.log("Update Gym Service Error: ", error.message);
        throw new Error(error.message || "Failed to update Gym");
    }
}


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
}


module.exports = {
    getGymsService,
    gymDetails,
    createGym,
    UpdateDetails,
    checkOwnership,
    isAvailable
}