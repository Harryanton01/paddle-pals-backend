import { Hono } from "hono";
import { protect } from "../middlewares/auth.middleware";
import {
  validate,
  createMatchSchema,
} from "../middlewares/validate.middleware";
import * as matchController from "../controllers/match.controller";

const matches = new Hono();

matches.use("*", protect);

matches.post(
  "/",
  validate("json", createMatchSchema),
  matchController.createMatch
);

matches.post("/:id/accept", matchController.confirmMatch);

matches.post("/:id/reject", matchController.rejectMatch);

export default matches;
