const { getPackages, createPackage: package } = require("../services/packages.service");

const gymPackages = async (req, res) => {
    try {
        const { gym_id } = req.query;
        const packages = await getPackages(gym_id);

        if (packages.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No packages found for this gym"
            })
        }

        return res.status(200).json({
            success: true,
            packages
        })
    } catch (error) {
        console.log("gymPackages error: ", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch gym packages"
        });
    }
}

const createPackage = async (req, res) => {
    try {
        const packageData = req.body;
        const newPackage = await package(packageData);

        return res.status(201).json({
            success: true,
            package: newPackage
        });
    } catch (error) {
        console.log("createPackage error: ", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to create package"
        });
    }
}


module.exports = {
    gymPackages,
    createPackage
}