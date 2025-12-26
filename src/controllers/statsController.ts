import { Request, Response } from "express";
import { db } from "../config/db";
import _ from "lodash";

export const getGameStats = async (req: Request, res: Response) => {
  try {
    const groupId = parseInt(req.params.id);
    const gameId = req.query.gameId
      ? parseInt(req.query.gameId as string)
      : null;

    if (!groupId || !gameId) {
      return res
        .status(400)
        .json({ error: "Group ID and Game ID are required" });
    }

    // 1. Fetch Ratings (The Leaderboard)
    // We sort by ELO descending to get the ranks
    const ratings = await db.gameRating.findMany({
      where: { gameId },
      include: {
        user: { select: { id: true, username: true } },
      },
      orderBy: { elo: "desc" },
    });

    // 2. Fetch Aggregate Stats (Overview)
    const totalMatches = await db.match.count({
      where: { gameId },
    });

    // 3. Process Leaderboard Data
    // We calculate win rates and map it to a clean format
    const leaderboard = ratings.map((r, index) => {
      const totalPlayed = r.wins + r.losses + r.draws;
      const winRate =
        totalPlayed > 0 ? Math.round((r.wins / totalPlayed) * 100) : 0;

      return {
        rank: index + 1,
        userId: r.userId,
        username: r.user.username,
        elo: r.elo,
        wins: r.wins,
        losses: r.losses,
        draws: r.draws,
        totalPlayed,
        winRate,
      };
    });

    res.json({
      overview: {
        totalMatches,
        totalPlayers: leaderboard.length,
      },
      leaderboard,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};

const getMatchResult = (match: any, userId: number): "W" | "L" | "D" => {
  if (match.result === "DRAW") return "D";
  const isTeamA = match.teamA.some((u: any) => u.id === userId);
  if (match.result === "TEAM_A_WIN") return isTeamA ? "W" : "L";
  return isTeamA ? "L" : "W"; // TEAM_B_WIN
};

export const getMyGameStats = async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const gameId = req.query.gameId
      ? parseInt(req.query.gameId as string)
      : null;

    if (!userId || !gameId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const allRatings = await db.gameRating.findMany({
      where: { gameId },
      orderBy: { elo: "desc" },
    });

    const myRankIndex = allRatings.findIndex((r) => r.userId === userId);
    const myRating = allRatings[myRankIndex];

    if (!myRating) return res.json({ hasPlayed: false });

    const rawMatches = await db.match.findMany({
      where: {
        gameId,
        OR: [
          { teamA: { some: { id: userId } } },
          { teamB: { some: { id: userId } } },
        ],
      },
      include: {
        teamA: { select: { id: true, username: true } },
        teamB: { select: { id: true, username: true } },
      },
      orderBy: { playedAt: "desc" },
    });

    const history = rawMatches.map((match) => {
      const isTeamA = match.teamA.some((u) => u.id === userId);
      return {
        result: getMatchResult(match, userId),
        opponents: isTeamA ? match.teamB : match.teamA,
        playedAt: match.playedAt,
      };
    });

    const lastFive = _.take(history, 5).map((h) => h.result);

    const mostRecent = _.head(history);
    const currentStreakMatches = mostRecent
      ? _.takeWhile(history, (h) => h.result === mostRecent.result)
      : [];

    const streak = {
      type: mostRecent
        ? mostRecent.result === "W"
          ? "win"
          : mostRecent.result === "L"
          ? "loss"
          : "draw"
        : null,
      count: currentStreakMatches.length,
    };

    // Step D: Rivals & Nemesis (The "Map/Reduce" Step)
    // 1. Flatten all interactions into a single list of { opponent, result }
    const allInteractions = history.flatMap((h) =>
      h.opponents.map((opp) => ({
        id: opp.id,
        username: opp.username,
        outcome: h.result,
      }))
    );

    // 2. Group by Opponent ID and Aggregate
    const opponentStats = _(allInteractions)
      .groupBy("id")
      .map((interactions, oppId) => {
        const total = interactions.length;
        const wins = interactions.filter((i) => i.outcome === "W").length;
        return {
          id: parseInt(oppId),
          username: interactions[0].username,
          total,
          wins,
          winRate: (wins / total) * 100,
        };
      })
      .filter((stat) => stat.total >= 3) // Minimum 3 games to be a "Rival"
      .orderBy(["winRate"], ["asc"]) // Sort by WinRate (Lowest first)
      .value();

    const nemesis = _.head(opponentStats) || null; // Lowest WinRate
    const bunny = _.last(opponentStats) || null; // Highest WinRate

    // Step E: Final Calculations
    const totalPlayed = myRating.wins + myRating.losses + myRating.draws;
    const winRate =
      totalPlayed > 0 ? Math.round((myRating.wins / totalPlayed) * 100) : 0;

    res.json({
      hasPlayed: true,
      rank: myRankIndex + 1,
      stats: {
        elo: myRating.elo,
        wins: myRating.wins,
        losses: myRating.losses,
        draws: myRating.draws,
        winRate,
        totalPlayed,
      },
      streak,
      form: lastFive, // ["W", "L", "L", "W", "W"] (Newest -> Oldest)
      rivals: {
        nemesis,
        bunny,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch personal stats" });
  }
};
