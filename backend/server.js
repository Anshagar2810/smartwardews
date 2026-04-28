// server.js
console.log("🔥🔥 SERVER FILE EXECUTED 🔥🔥");

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Explicitly load .env from the backend directory (works on both localhost & Render)
dotenv.config({ path: resolve(__dirname, ".env") });

console.log("✅ ENV loaded:", {
  PORT: process.env.PORT,
  MONGO_URI: process.env.MONGO_URI ? "SET" : "MISSING ❌",
  JWT_SECRET: process.env.JWT_SECRET ? "SET" : "MISSING ❌",
});

import express from "express";
import cors from "cors";

import connectDB from "./src/config/db.js";

// ROUTES
import authRoutes from "./src/routes/auth.routes.js";
import patientRoutes from "./src/routes/patient.routes.js";
import nurseRoutes from "./src/routes/nurse.routes.js";
import doctorRoutes from "./src/routes/doctor.routes.js";
import vitalsRoutes from "./src/routes/vitals.routes.js";
import thingSpeakRoutes from "./src/routes/thingspeak.js";

import { fetchFromThingSpeak } from "./src/config/cloud.js";

const app = express();

// ================== MIDDLEWARE ==================
app.use(cors({ origin: '*' }));
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }
  next();
});
app.use(express.json());

// ================== DATABASE ==================
connectDB();

// ================== ROUTES ==================
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/nurse", nurseRoutes);     // ✅ FIXED
app.use("/api/doctor", doctorRoutes);   // ✅ FIXED
app.use("/api/vitals", vitalsRoutes);   // ✅ FIXED
app.use("/api", thingSpeakRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "✅ Server is alive" });
});

// ================== IOT POLLING ==================
setInterval(fetchFromThingSpeak, 10000);

// ================== SERVER ==================
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Health log
setInterval(() => {
  console.log("🟢 server alive");
}, 3000);