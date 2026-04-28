import express from "express";
import { registerDevice } from "../controllers/device.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, registerDevice);

export default router;
