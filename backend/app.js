import express from "express";
import cors from "cors";

import authRoutes from "./src/routes/auth.routes.js";
import patientRoutes from "./src/routes/patient.routes.js";
import deviceRoutes from "./src/routes/device.routes.js";
import vitalsRoutes from "./src/routes/vitals.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/device", deviceRoutes);
app.use("/api/vitals", vitalsRoutes);

export default app;