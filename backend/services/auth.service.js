const prisma = require("../config/prisma")

const checkExist = async (email) => {
    try {
        const user = await prisma.user.findUnique({
            where: {
                email
            },
            include: {
                preference: {
                    select: {
                        bookingConfirm: true,
                        sessionReminders: true,
                        offersAndPromotions: true
                    }
                }
            }
        });
        if (!user) {
            return {
                exist: false
            }
        }

        return { exist: true, user };
    } catch (error) {
        console.log("Check Error:", error.message);
        throw new Error(error.message || "failed to check user!");
    }
}

const checkAdmin = async (email) => {
    try {
        const admin = await prisma.gymAdmin.findUnique({
            where: {
                email
            }
        })

        return admin;
    } catch (error) {
        console.log("Admin Check Error:", error.message);
        throw new Error(error.message || 'failed to check admin!')
    }
}


const createUser = async ({ name, email, phone, password }) => {
    try {
        const user = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                password,
                preference: {
                    create: {
                        bookingConfirm: true,
                        sessionReminders: true,
                        offersAndPromotions: false
                    }
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                createdAt: true,
                preference: true
            }
        })

        return user;
    } catch (error) {
        console.log("Create User Error:", error.message);
        throw new Error(error.message || "unable to create user");
    }
}

module.exports = {
    checkExist,
    createUser,
    checkAdmin
}