import mongoose from 'mongoose';

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

export const doctorDashboard = async (req, res) => {
  if (isDbConnected()) {
    const Patient = (await import("../models/patient.model.js")).default;
    const patients = await Patient.find({ doctorId: req.user.userId || req.user.id });
    res.json(patients);
  } else {
    // In-memory mode
    const inMemoryPatients = [
      {
        _id: '1',
        patientId: 'PAT001',
        name: 'John Smith',
        age: 45,
        phone: '555-0101',
        doctorId: 'DOC004',
        deviceId: 'ESP32_001'
      }
    ];
    const patients = inMemoryPatients.filter(p => p.doctorId === req.user.userId);
    res.json(patients);
  }
};

export const getAllDoctors = async (req, res) => {
  try {
    if (isDbConnected()) {
      const User = (await import("../models/user.model.js")).default;
      const doctors = await User.find({ role: "DOCTOR" });
      res.json(doctors);
    } else {
      // In-memory mode
      const doctors = testUsers.filter(u => u.role === "DOCTOR");
      res.json(doctors);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
