import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Test users for when MongoDB is down
const testUsers = [
  {
    userId: "ADMIN01",
    name: "Ansh",
    email: "admin@gmail.com",
    phone: "",
    password: bcrypt.hashSync("aa", 10),
    role: "ADMIN"
  },
  {
    userId: "DOC004",
    name: "Dr. Akhand",
    email: "akhand@gmail.com",
    phone: "",
    password: bcrypt.hashSync("aa", 10),
    role: "DOCTOR"
  },
  {
    userId: "NURSE01",
    name: "Nurse Joy",
    email: "nurse1@gmail.com",
    phone: "",
    password: bcrypt.hashSync("aa", 10),
    role: "NURSE"
  }
];

// Check if MongoDB is connected
const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

// REGISTER USER
export const register = async (req, res) => {
  try {
    const { userId, name, phone, email, password, role } = req.body;

    if (!userId || !name || !password || !role) {
      return res.status(400).json({ error: "Required fields are missing: userId, name, password, role" });
    }

    // Try to use MongoDB first only if connected
    if (isDbConnected()) {
      try {
        // Dynamically import User model only when needed
        const User = (await import("../models/user.model.js")).default;
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

        return res.status(201).json({
          message: "User registered successfully",
          user: {
            userId: user.userId,
            name: user.name,
            role: user.role,
          },
        });
      } catch (dbErr) {
        console.error("DB register error:", dbErr.message);
        // Fallback to in-memory
      }
    }

    // Fallback to in-memory
    const existing = testUsers.find(u => u.userId === userId || u.phone === phone || u.email === email);
    if (existing) {
      return res.status(409).json({ error: "User already exists (in-memory)" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    testUsers.push({ userId, name, phone, email, password: hashedPassword, role });
    return res.status(201).json({
      message: "User registered successfully (in-memory)",
      user: { userId, name, role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LOGIN USER
export const login = async (req, res) => {
  try {
    console.log("🔐 Login request received");
    console.log("mongoose.connection.readyState:", mongoose.connection.readyState);
    const { identifier, password } = req.body;

    // Try to use MongoDB first only if connected
    if (isDbConnected()) {
      try {
        console.log("🗄️ Using MongoDB for login");
        // Dynamically import User model only when needed
        const User = (await import("../models/user.model.js")).default;
        const user = await User.findOne({
          // Allow login using userId, phone or email
          $or: [{ userId: identifier }, { phone: identifier }, { email: identifier }],
        });

        if (user) {
          const match = await bcrypt.compare(password, user.password);
          if (!match) {
            return res.status(401).json({ error: "Invalid credentials" });
          }

          const token = jwt.sign(
            { id: user._id, userId: user.userId, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
          );

          return res.json({
            token,
            user: {
              userId: user.userId,
              name: user.name,
              role: user.role,
            },
          });
        }
      } catch (dbErr) {
        console.error("DB login error:", dbErr.message);
        // Fallback to test users
      }
    }

    // Fallback to in-memory test users
    console.log("🧪 Using in-memory test users for login");
    const user = testUsers.find(u => u.userId === identifier || u.phone === identifier || u.email === identifier);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.userId, role: user.role },
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
    console.error("❌ Login error:", err);
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