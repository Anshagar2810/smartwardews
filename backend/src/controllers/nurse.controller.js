// src/controllers/nurse.controller.js
import mongoose from 'mongoose';
import bcrypt from "bcryptjs";

const testUsers = [
  {
    userId: "ADMIN01",
    name: "Ansh",
    email: "admin@gmail.com",
    phone: "",
    role: "ADMIN"
  },
  {
    userId: "DOC004",
    name: "Dr. Akhand",
    email: "akhand@gmail.com",
    phone: "",
    role: "DOCTOR"
  },
  {
    userId: "NURSE01",
    name: "Nurse Joy",
    email: "nurse1@gmail.com",
    phone: "",
    role: "NURSE"
  }
];

// Check if MongoDB is connected
const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const createNurse = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    if (isDbConnected()) {
      const User = (await import("../models/user.model.js")).default;
      const nurse = await User.create({
        ...rest,
        password: hashedPassword,
        role: "NURSE"
      });
      
      res.status(201).json({
        success: true,
        data: nurse
      });
    } else {
      // In-memory mode
      const newNurse = {
        ...rest,
        password: hashedPassword,
        role: "NURSE",
        userId: `NURSE${Date.now().toString().slice(-4)}`
      };
      testUsers.push(newNurse);
      res.status(201).json({
        success: true,
        data: newNurse
      });
    }
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
};

export const getAllNurses = async (req, res) => {
  if (isDbConnected()) {
    const User = (await import("../models/user.model.js")).default;
    const nurses = await User.find({ role: "NURSE" });
    res.json(nurses);
  } else {
    // In-memory mode
    const nurses = testUsers.filter(u => u.role === "NURSE");
    res.json(nurses);
  }
};
