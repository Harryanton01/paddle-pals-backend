import { db } from "../config/db";
import { MatchResult } from "../../generated/prisma/client";

export const getLeaderboard = async (gameId: number) => {
  const ratings = await db.gameRating.findMany({
    where: { gameId },
    include: {
      user: { select: { id: true, username: true } },
    },
    orderBy: { elo: "desc" },
  });

  const totalMatches = await db.match.count({
    where: { gameId },
  });

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

  return {
    overview: {
      totalMatches,
      totalPlayers: leaderboard.length,
    },
    leaderboard,
  };
};

const getResultForUser = (match: any, userId: number): "W" | "L" | "D" => {
  if (match.result === MatchResult.DRAW) return "D";
  
  const isTeamA = match.teamA.some((u: any) => u.id === userId);
  
  if (match.result === MatchResult.TEAM_A_WIN) return isTeamA ? "W" : "L";
  if (match.result === MatchResult.TEAM_B_WIN) return isTeamA ? "L" : "W";
  
  return "D";
};

export const getPersonalStats = async (userId: number, gameId: number) => {
  const allRatings = await db.gameRating.findMany({
    where: { gameId },
    orderBy: { elo: "desc" },
  });

  const myRankIndex = allRatings.findIndex((r) => r.userId === userId);
  const myRating = allRatings[myRankIndex];

  if (!myRating) return { hasPlayed: false };

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
      result: getResultForUser(match, userId),
      opponents: isTeamA ? match.teamB : match.teamA,
      playedAt: match.playedAt,
    };
  });

  const lastFive = history.slice(0, 5).map((h) => h.result);

  let streakCount = 0;
  const currentResult = history[0]?.result;
  
  if (currentResult) {
    for (const match of history) {
      if (match.result === currentResult) streakCount++;
      else break;
    }
  }

  const streak = {
    type: currentResult === "W" ? "win" : currentResult === "L" ? "loss" : "draw",
    count: streakCount,
  };

  const interactions = history.flatMap((h) =>
    h.opponents.map((opp) => ({
      id: opp.id,
      username: opp.username,
      outcome: h.result,
    }))
  );

  const statsByOpponent = new Map<number, { username: string; wins: number; total: number }>();

  interactions.forEach((i) => {
    const existing = statsByOpponent.get(i.id) || { username: i.username, wins: 0, total: 0 };
    existing.total++;
    if (i.outcome === "W") existing.wins++;
    statsByOpponent.set(i.id, existing);
  });

  const rivalStats = Array.from(statsByOpponent.values())
    .map((s) => ({
      ...s,
      winRate: (s.wins / s.total) * 100,
    }))
    .filter((s) => s.total >= 3)
    .sort((a, b) => a.winRate - b.winRate);

  const nemesis = rivalStats[0] || null;
  const bunny = rivalStats[rivalStats.length - 1] || null;

  const totalPlayed = myRating.wins + myRating.losses + myRating.draws;
  const winRate = totalPlayed > 0 ? Math.round((myRating.wins / totalPlayed) * 100) : 0;

  return {
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
    form: lastFive,
    rivals: {
      nemesis: nemesis === bunny ? null : nemesis,
      bunny,
    },
  };
};