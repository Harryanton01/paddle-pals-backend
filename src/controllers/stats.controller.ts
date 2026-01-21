import { Context } from "hono";
import * as statsService from "../services/stats.service";
import { getStatsSchema } from "../middlewares/validate.middleware";
import { ValidatedContext, AppEnv } from "../types";

const getUserId = (c: Context<AppEnv>) => {
  const user = c.get("user");
  if (!user) throw new Error("User not found");
  return Number(user.id);
};

export const getGameStats = async (c: ValidatedContext<typeof getStatsSchema, "query">) => {
  const query = c.req.valid("query");

  console.log(query.gameId);

  const result = await statsService.getLeaderboard(Number(query.gameId));
  return c.json(result);
};

export const getMyGameStats = async (c: ValidatedContext<typeof getStatsSchema, "query">) => {
  const userId = getUserId(c);
  const query = c.req.valid("query");

  const result = await statsService.getPersonalStats(userId, Number(query.gameId));
  return c.json(result);
};