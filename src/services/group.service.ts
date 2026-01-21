import { HTTPException } from "hono/http-exception";
import {
  GroupRole,
  MatchStatus,
  MatchResult,
} from "../../generated/prisma/client";
import { db } from "../config/db";

const isGroupMember = async (userId: number, groupId: number) => {
  const member = await db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  return !!member;
};

export const getMembership = async (userId: number, groupId: number) => {
  return await db.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
};

export const createGroup = async (name: string, userId: number) => {
  const group = await db.group.create({
    data: {
      name,
      inviteCode: crypto.randomUUID().split("-")[0].toUpperCase(),
      members: {
        create: {
          userId: userId,
          role: "ADMIN",
        },
      },
    },
    include: { members: true },
  });
  return group;
};

export const getUserGroups = async (userId: number) => {
  const groups = await db.group.findMany({
    where: {
      members: { some: { userId } },
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: { members: true, games: true },
      },
      games: {
        select: {
          _count: { select: { matches: true } },
        },
      },
    },
  });

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    memberCount: group._count.members,
    gameCount: group._count.games,
    matchCount: group.games.reduce((acc, game) => acc + game._count.matches, 0),
  }));
};

export const getGroupById = async (groupId: number, userId: number) => {
  const group = await db.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: { select: { id: true, username: true } },
        },
      },
      games: true,
    },
  });

  if (!group) throw new HTTPException(404, { message: "Group not found" });

  const isMember = group.members.some((m) => m.userId === userId);
  if (!isMember) throw new HTTPException(403, { message: "Unauthorized" });

  return group;
};

export const joinGroupByCode = async (inviteCode: string, userId: number) => {
  const group = await db.group.findUnique({
    where: { inviteCode },
  });

  if (!group) throw new HTTPException(404, { message: "Group not found" });

  const existing = await isGroupMember(userId, group.id);
  if (existing) throw new HTTPException(409, { message: "Already a member" });

  const member = await db.groupMember.create({
    data: {
      userId,
      groupId: group.id,
      role: "MEMBER",
    },
  });
  return member;
};

export const createGameInGroup = async (
  name: string,
  groupId: number,
  userId: number
) => {
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) throw new HTTPException(404, { message: "Group not found" });

  const isMember = await isGroupMember(userId, groupId);
  if (!isMember) throw new HTTPException(403, { message: "Unauthorized" });

  const game = await db.game.create({
    data: { name, groupId },
  });
  return game;
};

export type MatchFilter = {
  gameId?: number;
  filterType?: "mine" | "all";
  page?: number;
  limit?: number;
};

export const getGroupMatches = async (
  groupId: number,
  userId: number,
  options: MatchFilter
) => {
  const { gameId, filterType, page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;

  const isMember = await isGroupMember(userId, groupId);
  if (!isMember) throw new HTTPException(403, { message: "Unauthorized" });

  const whereClause: any = {
    game: { groupId },
  };

  if (gameId) whereClause.gameId = gameId;

  if (filterType === "mine") {
    whereClause.OR = [
      { teamA: { some: { id: userId } } },
      { teamB: { some: { id: userId } } },
    ];
  }

  const [total, matches] = await db.$transaction([
    db.match.count({ where: whereClause }),
    db.match.findMany({
      where: whereClause,
      take: limit,
      skip: skip,
      orderBy: { playedAt: "desc" },
      include: {
        game: { select: { id: true, name: true } },
        teamA: { select: { id: true, username: true } },
        teamB: { select: { id: true, username: true } },
        createdBy: { select: { id: true, username: true } },
      },
    }),
  ]);

  return {
    data: matches,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getPendingMatches = async (groupId: number, userId: number) => {
  const isMember = await isGroupMember(userId, groupId);
  if (!isMember) throw new HTTPException(403, { message: "Unauthorized" });

  return await db.match.findMany({
    where: {
      game: { groupId },
      status: MatchStatus.PENDING,
      createdById: { not: userId },
      OR: [
        { teamA: { some: { id: userId } } },
        { teamB: { some: { id: userId } } },
      ],
    },
    include: {
      game: { select: { id: true, name: true } },
      teamA: { select: { id: true, username: true } },
      teamB: { select: { id: true, username: true } },
      createdBy: { select: { id: true, username: true } },
    },
    orderBy: {
      playedAt: "desc",
    },
  });
};

export const updateMemberRole = async (
  actorId: number,
  groupId: number,
  targetUserId: number,
  newRole: GroupRole
) => {
  const actorMembership = await getMembership(actorId, groupId);

  if (actorMembership?.role !== "ADMIN") {
    throw new HTTPException(403, { message: "Only Admins can manage roles" });
  }

  const targetMembership = await getMembership(targetUserId, groupId);
  if (!targetMembership) {
    throw new HTTPException(404, { message: "User is not in this group" });
  }

  if (newRole === "MEMBER" && targetMembership.role === "ADMIN") {
    const adminCount = await db.groupMember.count({
      where: { groupId, role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new HTTPException(400, { message: "Cannot demote the last Admin" });
    }
  }

  return await db.groupMember.update({
    where: { userId_groupId: { userId: targetUserId, groupId } },
    data: { role: newRole },
  });
};

export const removeMember = async (
  actorId: number,
  groupId: number,
  targetUserId: number
) => {
  const actorMembership = await getMembership(actorId, groupId);

  const isSelf = actorId === targetUserId;
  const isAdmin = actorMembership?.role === "ADMIN";

  if (!isSelf && !isAdmin) {
    throw new HTTPException(403, { message: "Unauthorized to remove member" });
  }

  const targetMembership = await getMembership(targetUserId, groupId);
  if (!targetMembership) {
    throw new HTTPException(404, { message: "User is not in this group" });
  }

  return await db.groupMember.delete({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });
};
