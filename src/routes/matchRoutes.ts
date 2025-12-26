import { Router } from "express";
import * as matchController from "../controllers/matchController";
import { isAuthenticated } from "../middlewares/authMiddleware";

const router = Router();

router.post("/", isAuthenticated, matchController.createMatch);

export default router;
