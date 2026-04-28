import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// REGISTER USER
export const register = async (req, res) => {
  try {
    const { userId, name, phone, email, password, role } = req.body;

    if (!userId || !name || !password || !role) {
      return res.status(400).json({ error: "Required fields are missing: userId, name, password, role" });
    }

    const existing = await User.findOne({
      $or: [{ userId }, { phone }, { email }],
    });

    if (existing) {
      let message = "User already exists.";
      if (existing.userId === userId) {
        message = `User with ID '${userId}' already exists.`;
      } else if (existing.phone === phone) {
        message = `User with phone number '${phone}' already exists.`;
      } else if (existing.email === email) {
        message = `User with email '${email}' already exists.`;
      }
      return res.status(409).json({ error: message });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      userId,
      name,
      phone,
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LOGIN USER
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      // Allow login using userId, phone or email
      $or: [{ userId: identifier }, { phone: identifier }, { email: identifier }],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, userId: user.userId, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE USER
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await User.findOneAndDelete({ userId });
    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};