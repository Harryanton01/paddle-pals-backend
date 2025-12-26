// server/src/controllers/matchController.ts
import { Request, Response } from "express";
import { db } from "../config/db";
import * as matchService from "../services/matchService";
import { isGroupMember } from "./groupController";

export const createMatch = async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { teamA, teamB, gameId, result } = req.body;

    if (!teamA || !teamB || !gameId || !result) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const game = await db.game.findUnique({
      where: { id: Number(gameId) },
      select: { groupId: true },
    });

    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    const isMember = await isGroupMember(userId, game.groupId);
    if (!isMember) {
      return res
        .status(403)
        .json({ error: "You must be a group member to record matches" });
    }

    await matchService.createMatch(teamA, teamB, gameId, result);

    res.status(201).json({ message: "Match recorded" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to record match" });
  }
};
