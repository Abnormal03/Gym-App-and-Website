const { getPackages, createPackage: package, updatePackage: update, isActive: checkActive, deletePackage: deactivate } = require("../services/packages.service");

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


const updatePackage = async (req, res) => {
    try {
        const packageData = req.body;
        const { id } = req.params;

        const updatedPackage = await update(id, packageData);
        return res.status(200).json({
            success: true,
            package: updatedPackage
        })

    } catch (error) {
        console.log("updatePackage error: ", error.message);
        return res.status(400).json({
            success: false,
            message: "Failed to update package"
        });
    }
}


const deletePackage = async (req, res) => {
    try {
        const { id } = req.params;
        const isActive = await checkActive(id);

        let deleted;
        if (isActive) {
            deleted = await deactivate(id);
        } else {
            return res.status(400).json({
                success: false,
                message: "Package is not active."
            })
        }
        res.status(200).json({
            success: true,
            deleted
        })
    } catch (error) {
        console.log("deletePackage error: ", error.message);
        return res.status(400).json({
            success: false,
            message: "Failed to delete package"
        });
    }
}


module.exports = {
    gymPackages,
    createPackage,
    updatePackage,
    deletePackage
}