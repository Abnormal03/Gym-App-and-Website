const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  checkExist,
  createUser,
  checkAdmin,
} = require("../services/auth.service.js");

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const { exist } = await checkExist(email);

    if (exist) {
      return res.status(409).json({
        success: false,
        message: "Email already in use",
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await createUser({
      name,
      email,
      phone,
      password: hashed,
    });

    const token = generateToken(user.id, "member");

    return res.status(201).json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const { exist, user } = await checkExist(email);
    if (!exist) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(user.id, "member");

    // Return user without the password field
    const { password: _, ...userWithoutPassword } = user;

    res.json({ success: true, user: userWithoutPassword, token });
  } catch (error) {
    console.log("Login Error: ", error.message)
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/auth/admin/login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const admin = await checkAdmin(email);
    if (!admin) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    const token = generateToken(admin.id, "gym_admin");

    const { password: _, ...adminWithoutPassword } = admin;

    res.json({ success: true, admin: adminWithoutPassword, token });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const { z } = require('zod');
const { ok, asyncHandler } = require('../utils/responses');
const service = require('../services/auth.service.js');

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

// 8-72 characters (bcrypt ignores everything after 72 bytes), at least one letter and one digit.
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'At least 8 characters')
    .max(72, 'At most 72 characters')
    .regex(/[A-Za-z]/, 'Must contain a letter')
    .regex(/\d/, 'Must contain a digit'),
});

const providerLogin = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  return ok(res, await service.loginProvider(email, password));
});

const staffLogin = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  return ok(res, await service.loginStaff(email, password));
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  return ok(res, await service.changePassword(req.auth, currentPassword, newPassword));
});

const me = asyncHandler(async (req, res) => ok(res, await service.getMe(req.auth)));

module.exports = {
  adminLogin,
  register,
  login,
  providerLogin,
  staffLogin,
  changePassword,
  me
};
