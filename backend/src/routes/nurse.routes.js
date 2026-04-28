// src/routes/nurse.routes.js
import express from "express";
import { createNurse, getAllNurses } from "../controllers/nurse.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", createNurse);
router.get("/", protect, getAllNurses);

export default router;