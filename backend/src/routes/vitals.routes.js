import express from "express";
import {
  ingestVitals,
  getVitalsByPatient,
  getThingSpeakField,
  getThingSpeakStatus,
} from "../controllers/vitals.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// POST vitals (Postman / ThingSpeak)
router.post("/", ingestVitals);

// GET ThingSpeak field proxy (requires auth)
router.get("/thingspeak", protect, getThingSpeakField);

// GET ThingSpeak status (requires auth)
router.get("/thingspeak/status", protect, getThingSpeakStatus);

// GET vitals by patientId (requires auth)
router.get("/:patientId", protect, getVitalsByPatient);

export default router;