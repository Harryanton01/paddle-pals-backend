import { Context } from "hono";
import * as groupService from "../services/group.service";
import { 
  createGroupSchema,
  joinGroupSchema,
  createGameSchema,
  updateRoleSchema,
} from "../middlewares/validate.middleware";

import { ValidatedContext, AppEnv } from "../types";

const getUserId = (c: Context<AppEnv>) => {
  const user = c.get("user");

  if (!user) throw new Error("User not found");

  return Number(user.id);
};

export const createGroup = async (c: ValidatedContext<typeof createGroupSchema>) => {
  const userId = getUserId(c);

  const { name } = c.req.valid("json");

  const group = await groupService.createGroup(name, userId);
  return c.json(group, 201);
};

export const listGroups = async (c: Context<AppEnv>) => {
  const userId = getUserId(c);
  const groups = await groupService.getUserGroups(userId);
  return c.json(groups);
};

export const getGroup = async (c: Context<AppEnv>) => {
  const userId = getUserId(c);
  const groupId = parseInt(c.req.param("id"));

  const group = await groupService.getGroupById(groupId, userId);
  return c.json(group);
};

export const joinGroup = async (c: ValidatedContext<typeof joinGroupSchema>) => {
  const userId = getUserId(c);
  const { inviteCode } = c.req.valid("json");

  const member = await groupService.joinGroupByCode(inviteCode, userId);
  return c.json(member);
};

export const addGame = async (c: ValidatedContext<typeof createGameSchema>) => {
  const userId = getUserId(c);
  const { name, groupId } = c.req.valid("json");

  const game = await groupService.createGameInGroup(name, groupId, userId);
  return c.json(game);
};

export const listMatches = async (c: Context<AppEnv>) => {
  const userId = getUserId(c);
  const groupId = parseInt(c.req.param("id"));

  const gameId = c.req.query("gameId") ? parseInt(c.req.query("gameId")!) : undefined;
  const filter = c.req.query("filter") as "mine" | "all" | undefined;
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");

  const result = await groupService.getGroupMatches(groupId, userId, {
    gameId,
    filterType: filter,
    page,
    limit,
  });

  return c.json(result);
};

export const updateRole = async (c: ValidatedContext<typeof updateRoleSchema>) => {
  const actorId = getUserId(c);
  const groupId = parseInt(c.req.param("id"));
  const targetUserId = parseInt(c.req.param("userId"));

  const { role } = c.req.valid("json");

  const result = await groupService.updateMemberRole(
    actorId,
    groupId,
    targetUserId,
    role
  );
  return c.json(result);
};

export const kickMember = async (c: Context<AppEnv>) => {
  const actorId = getUserId(c);
  const groupId = parseInt(c.req.param("id"));
  const targetUserId = parseInt(c.req.param("userId"));

  await groupService.removeMember(actorId, groupId, targetUserId);
  return c.json({ message: "Member removed" });
};

export const getPendingMatches = async (c: Context<AppEnv>) => {
  const userId = getUserId(c);
  const groupId = parseInt(c.req.param("id"));

  const matches = await groupService.getPendingMatches(groupId, userId);

  return c.json(matches);
};