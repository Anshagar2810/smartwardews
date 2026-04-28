import Device from "../models/device.model.js";

// REGISTER DEVICE
export const registerDevice = async (req, res) => {
  try {
    const { deviceId, patientId, type } = req.body;

    if (!deviceId || !patientId) {
      return res.status(400).json({ message: "Device ID and Patient ID required" });
    }

    const existing = await Device.findOne({ deviceId });
    if (existing) {
      return res.status(400).json({ message: "Device already registered" });
    }

    const device = await Device.create({
      deviceId,
      patientId,
      type,
      status: "active",
    });

    res.status(201).json({
      message: "Device registered successfully",
      device,
    });
  } catch (error) {
    console.error("Device register error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL DEVICES
export const getDevices = async (req, res) => {
  try {
    const devices = await Device.find();
    res.status(200).json(devices);
  } catch (error) {
    console.error("Get devices error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
