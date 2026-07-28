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
        const gym = await prisma.gym.findUnique({
            where: {
                id: Number(gymId),
                adminId: Number(id)
            }
        })

        next();
    } catch (error) {
        console.log("Verify Middleware Error: ", error.message);
        return res.status(400).json({
            success: false,
            message: "Gym Admin Only Access"
        })
    }
}

module.exports = {
    verifyGymOwner
}