// server/src/routes/authRoutes.ts
import { Router } from "express";
import * as authController from "../controllers/authController";
import { isAuthenticated } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", authController.register);
router.post("/login", authController.login);

// Protected Routes
router.get("/me", isAuthenticated, authController.getMe);
router.post("/logout", authController.logout);

export default router;
