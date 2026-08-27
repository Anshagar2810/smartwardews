import mongoose from 'mongoose';

// In-memory patients
let inMemoryPatients = [
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

// Check if MongoDB is connected
const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const createPatient = async (req, res) => {
  try {
    const { patientId, name, age, phone, deviceId, doctorId } = req.body;

    console.log("📝 Creating patient - Auth user:", req.user);

    // Validate required fields - doctorId is optional for unassigned patients
    if (!patientId || !name || !deviceId) {
      return res.status(400).json({ 
        error: "patientId, name, and deviceId are required",
        received: { patientId, name, deviceId }
      });
    }

    if (isDbConnected()) {
      const Patient = (await import("../models/patient.model.js")).default;
      const patient = await Patient.create({
        patientId,
        name,
        age: age || 0,
        phone: phone || '',
        doctorId: doctorId || '', // Allow empty doctorId for unassigned patients
        deviceId
      });

      console.log("✅ Patient created:", patient);
      res.status(201).json({ data: patient, message: "Patient created successfully" });
    } else {
      // In-memory mode
      const newPatient = {
        _id: Date.now().toString(),
        patientId,
        name,
        age: age || 0,
        phone: phone || '',
        doctorId: doctorId || '',
        deviceId
      };
      inMemoryPatients.push(newPatient);
      console.log("✅ In-memory patient created:", newPatient);
      res.status(201).json({ data: newPatient, message: "Patient created successfully" });
    }
  } catch (err) {
    console.error("❌ Patient creation error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getPatients = async (req, res) => {
  try {
    let patients = [];

    if (isDbConnected()) {
      const Patient = (await import("../models/patient.model.js")).default;
      // Admin sees all patients, doctor/nurse sees only assigned
      if (req.user.role === "ADMIN" || req.user.role === "admin") {
        patients = await Patient.find();
      } else if (req.user.role === "DOCTOR" || req.user.role === "doctor") {
        patients = await Patient.find({ doctorId: req.user.userId || req.user.id });
      } else if (req.user.role === "NURSE" || req.user.role === "nurse") {
        patients = await Patient.find({ doctorId: { $exists: true, $ne: "" } });
      }
    } else {
      // In-memory mode
      if (req.user.role === "ADMIN" || req.user.role === "admin") {
        patients = [...inMemoryPatients];
      } else if (req.user.role === "DOCTOR" || req.user.role === "doctor") {
        patients = inMemoryPatients.filter(p => p.doctorId === req.user.userId);
      } else if (req.user.role === "NURSE" || req.user.role === "nurse") {
        patients = inMemoryPatients.filter(p => p.doctorId && p.doctorId !== "");
      }
    }

    // Add default vitals to each patient
    const patientsWithDefaults = patients.map(p => {
      const obj = p.toObject ? p.toObject() : p;
      if (!obj.vitals) {
        obj.vitals = {
          spo2: 95,
          heartRate: 70,
          temp: 36.5,
          bp: '120/80',
          timestamp: new Date()
        };
      }
      return obj;
    });

    console.log(`✅ Fetched ${patientsWithDefaults.length} patients for ${req.user.role}`);
    res.json(patientsWithDefaults || []);
  } catch (err) {
    console.error("❌ Get patients error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const assignPatientToDoctor = async (req, res) => {
  try {
    const { patientId, doctorId } = req.body;

    console.log("📋 Assigning patient to doctor:", { patientId, doctorId });

    // Validate required fields
    if (!patientId || doctorId === undefined) {
      return res.status(400).json({ 
        error: "patientId and doctorId are required",
        received: { patientId, doctorId }
      });
    }

    let patient;
    if (isDbConnected()) {
      const Patient = (await import("../models/patient.model.js")).default;
      // Find patient by _id or patientId
      patient = await Patient.findOne({ 
        $or: [{ _id: patientId }, { patientId: patientId }] 
      });

      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }

      // Update doctorId
      patient.doctorId = doctorId || '';
      await patient.save();
    } else {
      // In-memory mode
      patient = inMemoryPatients.find(p => p._id === patientId || p.patientId === patientId);
      if (!patient) {
        return res.status(404).json({ error: "Patient not found" });
      }
      patient.doctorId = doctorId || '';
    }

    console.log("✅ Patient assigned to doctor:", patient);
    res.status(200).json({ data: patient, message: "Patient assigned successfully" });
  } catch (err) {
    console.error("❌ Assign patient error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const resetPatientsAssignment = async (req, res) => {
  try {
    console.log("🔄 Resetting all patient assignments...");
    
    if (isDbConnected()) {
      const Patient = (await import("../models/patient.model.js")).default;
      // Clear doctorId for all patients
      const result = await Patient.updateMany({}, { doctorId: '' });
      
      console.log(`✅ Reset ${result.modifiedCount} patients`);
      res.status(200).json({ 
        message: "All patient assignments cleared",
        modifiedCount: result.modifiedCount
      });
    } else {
      // In-memory mode
      inMemoryPatients.forEach(p => {
        p.doctorId = '';
      });
      console.log(`✅ Reset ${inMemoryPatients.length} in-memory patients`);
      res.status(200).json({ 
        message: "All patient assignments cleared",
        modifiedCount: inMemoryPatients.length
      });
    }
  } catch (err) {
    console.error("❌ Reset error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

export const deletePatient = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (isDbConnected()) {
      const Patient = (await import("../models/patient.model.js")).default;
      const result = await Patient.findByIdAndDelete(id);
      if (!result) {
        return res.status(404).json({ error: "Patient not found" });
      }
    } else {
      // In-memory mode
      const index = inMemoryPatients.findIndex(p => p._id === id || p.patientId === id);
      if (index === -1) {
        return res.status(404).json({ error: "Patient not found" });
      }
      inMemoryPatients.splice(index, 1);
    }
    
    res.json({ message: "Patient deleted successfully" });
  } catch (err) {
    console.error("❌ Delete patient error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
