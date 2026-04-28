import express from "express";
import { doctorDashboard, getAllDoctors } from "../controllers/doctor.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/", protect, allowRoles("ADMIN"), getAllDoctors);
router.get("/dashboard", protect, allowRoles("DOCTOR"), doctorDashboard);

export default router;
