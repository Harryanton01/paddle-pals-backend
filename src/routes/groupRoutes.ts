import { Router } from "express";
import * as groupController from "../controllers/groupController";
import * as statsController from "../controllers/statsController";
import { isAuthenticated } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", isAuthenticated, groupController.fetchGroups);
router.post("/", isAuthenticated, groupController.createGroup);
router.get("/:id", isAuthenticated, groupController.fetchGroup);
router.post("/join", isAuthenticated, groupController.joinGroup);
router.post("/game", isAuthenticated, groupController.createGame);
router.get("/:id/matches", isAuthenticated, groupController.getGroupMatches);
router.get("/:id/stats", isAuthenticated, statsController.getGameStats);
router.get("/:id/stats/me", isAuthenticated, statsController.getMyGameStats);

export default router;
