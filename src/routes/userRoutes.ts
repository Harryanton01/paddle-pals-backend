// server/src/routes/userRoutes.ts
import { Router } from "express";
import * as userController from "../controllers/userController";
import { isAuthenticated } from "../middlewares/authMiddleware";

const router = Router();

router.get("/leaderboard", isAuthenticated, userController.getLeaderboard);
router.get("/stats", isAuthenticated, userController.getUserStats);
router.get(
  "/stats/opponents",
  isAuthenticated,
  userController.getOpponentStats
);

export default router;
