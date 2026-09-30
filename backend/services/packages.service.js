const prisma = require("../config/prisma")

const getPackages = async (id) => {
    try {
        const gymId = Number(id);

        if (!Number.isInteger(gymId) || gymId <= 0) {
            throw new Error("Invalid gym id");
        }

        const packages = await prisma.package.findMany({
            where: {
                gymId,
                isActive: true
            }
        })

        return packages;
    } catch (error) {
        console.log("Packages Error: ", error.message);
        throw new Error(error.message || "Failed to fetch packages.");
    }
}
const getPackagesForAdmin = async (id) => {
    try {
        const gymId = Number(id);

        if (!Number.isInteger(gymId) || gymId <= 0) {
            throw new Error("Invalid gym id");
        }

        const packages = await prisma.package.findMany({
            where: {
                gymId,
            }
        })

        return packages;
    } catch (error) {
        console.log("Packages Error: ", error.message);
        throw new Error(error.message || "Failed to fetch packages.");
    }
}


const createPackage = async ({ gymId, name, description, price, durationDays, sessions }) => {
    try {
        const newPackage = await prisma.package.create({
            data: {
                gymId: Number(gymId),
                name,
                description,
                price,
                durationDays,
                sessions
            }
        });

        return newPackage;
    } catch (error) {
        console.log("Create Package Service Error: ", error.message);
        throw new Error(error.message || "Failed to create package.");
    }
}


const updatePackage = async (id, packageData) => {
    try {
        const { gymId } = packageData;
        if (gymId !== undefined) {
            throw new Error("Couldn't Update these fields.")
        }
        const updatedPackage = await prisma.package.update({
            where: {
                id: Number(id)
            },
            data: packageData
        })

        return updatedPackage;
    } catch (error) {
        console.log("Update Package Service Error: ", error.message);
        throw new Error(error.message || "Failed to update package.");
    }
}


const deletePackage = async (id) => {
    try {
        const deleted = await prisma.package.update({
            where: {
                id: Number(id)
            },
            data: {
                isActive: false
            }
        })

        if (deleted) {
            return true;
        }

        return false;
    } catch (error) {
        console.log("Delete Package Service Error: ", error.message);
        throw new Error(error.message || "Failed to delete package.");
    }
}


const isActive = async (id) => {
    try {
        const pkg = await prisma.package.findUnique({
            where: {
                id: Number(id)
            }
        })

        if (!pkg) {
            throw new Error("Package not found");
        }

        return pkg.isActive;
    } catch (error) {
        console.log("IsActive Service Error: ", error.message);
        throw new Error(error.message || "Failed to check activity.")
    }
}


module.exports = {
    getPackages,
    createPackage,
    updatePackage,
    isActive,
    deletePackage,
    getPackagesForAdmin
}