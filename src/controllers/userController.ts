import { Request, Response } from "express";
import { db } from "../config/db";

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const leaderboard = await db.user.findMany({
      orderBy: {
        elo: "desc",
      },
      take: 20,
      select: {
        id: true,
        username: true,
        elo: true,
        avatarUrl: true,
        _count: {
          select: { matchesWon: true, matchesLost: true },
        },
      },
    });

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};

export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;

    // 1. Get current user's ELO and basic stats
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        elo: true,
        _count: { select: { matchesWon: true, matchesLost: true } },
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // 2. Run Ranking Queries in Parallel (Faster)
    const [betterPlayersCount, totalPlayersCount] = await Promise.all([
      // Count how many users have STRICTLY MORE ELO than the current user
      db.user.count({
        where: { elo: { gt: user.elo } },
      }),
      // Count total users
      db.user.count(),
    ]);

    // 3. Calculate Derived Stats
    const rank = betterPlayersCount + 1; // If 0 people are better, you are Rank 1
    const totalMatches = user._count.matchesWon + user._count.matchesLost;
    const winRate =
      totalMatches > 0
        ? Math.round((user._count.matchesWon / totalMatches) * 100)
        : 0;

    // Percentile (e.g., "Top 5%")
    const topPercent = Math.max(
      1,
      Math.round((rank / totalPlayersCount) * 100)
    );

    res.json({
      elo: user.elo,
      rank,
      totalPlayers: totalPlayersCount,
      totalMatches,
      topPercent,
      wins: user._count.matchesWon,
      losses: user._count.matchesLost,
      winRate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

// server/src/controllers/userController.ts

// ... existing imports & functions

export const getOpponentStats = async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;

    // 1. Fetch all matches involving the user
    const matches = await db.match.findMany({
      where: {
        OR: [{ winnerId: userId }, { loserId: userId }],
      },
      include: {
        winner: { select: { id: true, username: true, avatarUrl: true } },
        loser: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    // 2. Group by Opponent
    const statsMap = new Map<
      number,
      {
        username: string;
        avatarUrl: string | null;
        wins: number;
        total: number;
      }
    >();

    matches.forEach((match) => {
      const isWinner = match.winnerId === userId;
      const opponent = isWinner ? match.loser : match.winner;

      const entry = statsMap.get(opponent.id) || {
        username: opponent.username,
        avatarUrl: opponent.avatarUrl,
        wins: 0,
        total: 0,
      };

      entry.total += 1;
      if (isWinner) entry.wins += 1;

      statsMap.set(opponent.id, entry);
    });

    // 3. Convert to Array, Sort by Most Played, and Calculate Win Rate
    const breakdown = Array.from(statsMap.values())
      .map((stat) => ({
        ...stat,
        winRate: Math.round((stat.wins / stat.total) * 100),
        losses: stat.total - stat.wins,
      }))
      .sort((a, b) => b.total - a.total); // Sort by most matches played

    res.json(breakdown);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch opponent stats" });
  }
};
