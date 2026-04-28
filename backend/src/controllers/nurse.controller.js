// src/controllers/nurse.controller.js
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const createNurse = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const nurse = await User.create({
      ...rest,
      password: hashedPassword,
      role: "NURSE"
    });

    res.status(201).json({
      success: true,
      data: nurse
    });
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
};

export const getAllNurses = async (req, res) => {
  const nurses = await User.find({ role: "NURSE" });
  res.json(nurses);
};
