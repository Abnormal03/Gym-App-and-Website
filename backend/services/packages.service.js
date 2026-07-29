const prisma = require("../config/prisma")

const getPackages = async (id) => {
    try {
        const packages = await prisma.package.findMany({
            where: {
                gymId: Number(id),
                isActive: true
            }
        })

        return packages;
    } catch (error) {
        console.log("Packages Error: ", error.message);
        throw new Error(error.message || "Failed to fetch packages.");
    }
}


const createPackage = async (packageData) => {
    try {
        const newPackage = await prisma.package.create({
            data: packageData
        });

        return newPackage;
    } catch (error) {
        console.log("Create Package Service Error: ", error.message);
        throw new Error(error.message || "Failed to create package.");
    }
}


const updatePackage = async (id, packageData) => {
    try {
        const { gymId, isActive } = packageData;
        if (gymId !== undefined || isActive !== undefined) {
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
        const package = await prisma.package.findUnique({
            where: {
                id: Number(id)
            }
        })

        return package.isActive;
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
    deletePackage
}