import express from "express";
import { createPatient, getPatients, assignPatientToDoctor, resetPatientsAssignment, deletePatient } from "../controllers/patient.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Static routes MUST come before parameterized routes
// POST reset all patient assignments (FOR TESTING/CLEANUP)
router.post("/reset-assignments", protect, resetPatientsAssignment);

// GET patients requires auth
router.get("/", protect, getPatients);

// POST patient now requires auth
router.post("/", protect, createPatient);

// Parameterized routes come LAST
// DELETE patient
router.delete("/:id", protect, deletePatient);

// PUT assign patient to doctor
router.put("/:patientId/assign-doctor", protect, assignPatientToDoctor);

export default router;
