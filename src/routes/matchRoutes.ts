import { Router } from "express";
import * as matchController from "../controllers/matchController";
import { isAuthenticated } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", isAuthenticated, matchController.getMyMatches);
router.post("/", isAuthenticated, matchController.createMatch);
router.get("/opponents", isAuthenticated, matchController.getOpponents);
router.delete("/:id", isAuthenticated, matchController.deleteMatch);

export default router;
