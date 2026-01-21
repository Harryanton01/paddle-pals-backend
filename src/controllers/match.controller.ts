import { Context } from "hono";
import * as matchService from "../services/match.service";
import { ValidatedContext } from "../types";
import { createMatchSchema } from "../middlewares/validate.middleware";

const getUserId = (c: Context) => {
  const user = c.get("user");
  if (!user) throw new Error("User not found");
  return Number(user.id);
};

export const createMatch = async (c: ValidatedContext<typeof createMatchSchema>) => {
  const userId = getUserId(c);
  
  const { gameId, teamA, teamB, outcome, playedAt } = c.req.valid("json");

  const match = await matchService.createMatch({
    gameId,
    teamA,
    teamB,
    outcome,
    playedAt,
    creatorId: userId,
  });

  return c.json(match, 201);
};

export const confirmMatch = async (c: Context) => {
  const userId = getUserId(c);
  const matchId = parseInt(c.req.param("id"));

  const match = await matchService.confirmMatch(matchId, userId);
  return c.json({ message: "Match confirmed", match });
};

export const rejectMatch = async (c: Context) => {
  const userId = getUserId(c);
  const matchId = parseInt(c.req.param("id"));

  await matchService.rejectMatch(matchId, userId);
  return c.json({ message: "Match rejected" });
};