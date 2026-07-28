const prisma = require("../config/prisma")

const getPackages = async (id) => {
    try {
        const packages = await prisma.package.findMany({
            where: {
                gymId: Number(id)
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


module.exports = {
    getPackages,
    createPackage
}