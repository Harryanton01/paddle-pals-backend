import { Hono } from "hono";
import { protect } from "../middlewares/auth.middleware";
import { 
  validate, 
  createGroupSchema, 
  joinGroupSchema, 
  createGameSchema, 
  updateRoleSchema,
  getStatsSchema
} from "../middlewares/validate.middleware";
import * as groupController from "../controllers/group.controller";
import * as statsController from "../controllers/stats.controller";

const groups = new Hono();

groups.use("*", protect);

groups.get("/", groupController.listGroups);

groups.post(
  "/", 
  validate("json", createGroupSchema), 
  groupController.createGroup
);

groups.get("/:id", groupController.getGroup);

groups.post(
  "/join", 
  validate("json", joinGroupSchema), 
  groupController.joinGroup
);


groups.post(
  "/game", 
  validate("json", createGameSchema), 
  groupController.addGame
);


groups.get("/:id/matches", groupController.listMatches);

groups.get("/:id/matches/pending", groupController.getPendingMatches);

groups.get(
    "/:id/stats", 
    validate("query", getStatsSchema), 
    statsController.getGameStats
  );

  groups.get(
    "/:id/stats/me", 
    validate("query", getStatsSchema), 
    statsController.getMyGameStats
  );

groups.patch(
  "/:id/members/:userId",
  validate("json", updateRoleSchema),
  groupController.updateRole
);

groups.delete(
  "/:id/members/:userId",
  groupController.kickMember
);

export default groups;