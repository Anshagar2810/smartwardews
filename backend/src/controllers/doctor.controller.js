import Patient from "../models/patient.model.js";
import User from "../models/user.model.js";

export const doctorDashboard = async (req, res) => {
  const patients = await Patient.find({ doctorId: req.user.id });
  res.json(patients);
};

export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await User.find({ role: "DOCTOR" });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
