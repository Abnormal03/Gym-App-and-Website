const { getPackages, createPackage: createPackageService, updatePackage: updatePackageService, isActive: checkActive, deletePackage: deactivate, getPackagesForAdmin: getPackagesAdmin } = require("../services/packages.service");

const gymPackages = async (req, res) => {
    try {
        const { gym_id } = req.query;
        const packages = await getPackages(gym_id);

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
const gymPackagesForAdmin = async (req, res) => {
    try {
        const { gym_id } = req.query;
        const packages = await getPackagesAdmin(gym_id);

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
        const newPackage = await createPackageService(packageData);

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

        const updatedPackage = await updatePackageService(id, packageData);
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
    deletePackage,
    gymPackagesForAdmin
}