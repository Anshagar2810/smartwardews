import express from "express";
import { register, login, deleteUser } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.delete("/user/:userId", protect, allowRoles("ADMIN"), deleteUser);

export default router;