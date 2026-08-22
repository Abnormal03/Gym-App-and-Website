const prisma = require("../config/prisma");

const verifyGymOwner = async (req, res, next) => {
    // Implement logic to verify if the user is the owner of the gym
    const { id } = req.user;
    const { gymId } = req.body;

    if (!gymId) {
        return res.status(400).json({
            success: false,
            message: "gymId is required"
        });
    }

    try {
        const gym = await prisma.gym.findFirst({
            where: {
                id: Number(gymId),
                adminId: Number(id)
            }
        })

        if (!gym) {
            return res.status(403).json({
                success: false,
                message: "Access Denied"
            });
        }

        next();
    } catch (error) {
        console.log("Verify Middleware Error: ", error.message);
        return res.status(400).json({
            success: false,
            message: "Gym Admin Only Access"
        })
    }
}


const verifyPackageOwner = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { id: userId } = req.user;

        const pkg = await prisma.package.findFirst({
            where: {
                id: Number(id),
                gym: {
                    is: {
                        adminId: Number(userId)
                    }
                }
            }
        })

        if (!pkg) {
            return res.status(404).json({
                success: false,
                message: "Package does not exist"
            })
        }

        next();
    } catch (error) {
        console.log("Verify pkg Middleware Error: ", error.message);
        return res.status(400).json({
            success: false,
            message: "Package Admin Only Access"
        })
    }
}

module.exports = {
    verifyGymOwner,
    verifyPackageOwner
}