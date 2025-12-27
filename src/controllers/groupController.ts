import { Request, Response } from "express";
import { db } from "../config/db";
import crypto from "crypto";

export const isGroupMember = async (
  userId: number,
  groupId: number
): Promise<boolean> => {
  const member = await db.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });

  return !!member;
};

export const createGroup = async (
  req: Request<{}, {}, { name: string }>,
  res: Response
) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

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
      include: {
        members: true,
      },
    });

    res.status(201).json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create group" });
  }
};

export async function fetchGroups(req: Request, res: Response) {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const groups = await db.group.findMany({
      where: {
        members: {
          some: { userId: userId },
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: { members: true, games: true },
        },
        games: {
          select: {
            _count: {
              select: {
                matches: true,
              },
            },
          },
        },
      },
    });

    res.json(
      groups.map((group) => ({
        id: group.id,
        name: group.name,
        memberCount: group._count.members,
        gameCount: group._count.games,
        matchCount: group.games.reduce(
          (acc, game) => acc + game._count.matches,
          0
        ),
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
}

export async function fetchGroup(req: Request, res: Response) {
  try {
    const userId = req.session.userId;
    const groupId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        games: true,
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!(await isGroupMember(userId, groupId))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch group" });
  }
}

export async function joinGroup(req: Request, res: Response) {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const group = await db.group.findUnique({
      where: { inviteCode: inviteCode },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const member = await db.groupMember.create({
      data: {
        userId: userId,
        groupId: group.id,
        role: "MEMBER",
      },
    });

    res.json(member);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to join group" });
  }
}

export async function createGame(req: Request, res: Response) {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, groupId } = req.body;

    if (!name || !groupId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const group = await db.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    if (!(await isGroupMember(userId, groupId))) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const game = await db.game.create({
      data: {
        name,
        groupId,
      },
    });

    res.json(game);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create game" });
  }
}

export const getGroupMatches = async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = req.session.userId;

    // 1. Extract Query Params with Defaults
    const gameId = req.query.gameId
      ? parseInt(req.query.gameId as string)
      : undefined;
    const filter = req.query.filter as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    if (!groupId) {
      return res.status(400).json({ error: "Group ID is required" });
    }

    const whereClause: any = {
      game: { groupId },
    };

    // Filter: Specific Game
    if (gameId) {
      whereClause.gameId = gameId;
    }

    // Filter: "My Matches"
    if (filter === "mine" && userId) {
      whereClause.OR = [
        { teamA: { some: { id: userId } } },
        { teamB: { some: { id: userId } } },
      ];
    }

    // 3. Run Two Queries (Count + Data) in Parallel
    const [totalMatches, matches] = await db.$transaction([
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
        },
      }),
    ]);

    // 4. Return Data + Metadata
    res.json({
      data: matches,
      meta: {
        total: totalMatches,
        page,
        limit,
        totalPages: Math.ceil(totalMatches / limit),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
};
