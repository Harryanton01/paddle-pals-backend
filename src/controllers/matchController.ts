// server/src/controllers/matchController.ts
import { Request, Response } from "express";
import { db } from "../config/db";
import * as matchService from "../services/matchService";

export const getMyMatches = async (
  req: Request<
    {},
    {},
    {},
    {
      limit?: string;
    }
  >,
  res: Response
) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    const matches = await db.match.findMany({
      where: {
        OR: [{ winnerId: userId }, { loserId: userId }],
      },
      include: {
        winner: { select: { id: true, username: true, avatarUrl: true } },
        loser: { select: { id: true, username: true, avatarUrl: true } },
      },
      orderBy: { playedAt: "desc" },
      take: limit,
    });

    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch matches" });
  }
};

export const createMatch = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;
    const { opponentId, myScore, opponentScore } = req.body;

    if (!opponentId || myScore === undefined || opponentScore === undefined) {
      return res.status(400).json({ error: "Missing fields" });
    }

    if (userId === opponentId) {
      return res
        .status(400)
        .json({ error: "You cannot play against yourself" });
    }

    await matchService.createMatch(
      userId,
      parseInt(opponentId),
      myScore,
      opponentScore
    );

    res.status(201).json({ message: "Match recorded" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to record match" });
  }
};

// Returns a list of all users EXCEPT the current one
export const getOpponents = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;

    const opponents = await db.user.findMany({
      where: {
        id: { not: userId }, // Don't show myself in the list
      },
      select: { id: true, username: true },
    });

    res.json(opponents);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch opponents" });
  }
};

export const deleteMatch = async (
  req: Request<{ id: string }>,
  res: Response
) => {
  try {
    const matchId = parseInt(req.params.id);
    const userId = (req.session as any).userId;

    // Check if match exists and if user was part of it (Security)
    const match = await db.match.findUnique({ where: { id: matchId } });
    if (!match) return res.status(404).json({ error: "Match not found" });

    if (match.winnerId !== userId && match.loserId !== userId) {
      return res
        .status(403)
        .json({ error: "You can only delete your own matches" });
    }

    await matchService.deleteMatch(matchId);
    res.json({ message: "Match deleted and ELO reverted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete match" });
  }
};
