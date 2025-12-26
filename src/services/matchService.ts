import { db } from "../config/db";
import { MatchResult } from "@prisma/client";

type TeamInput = {
  memberIds: number[];
  score?: number;
};

// Helper: Standard ELO Expected Score Formula
// Returns a decimal between 0 and 1 (e.g., 0.75 means 75% chance to win)
const getExpectedScore = (ratingA: number, ratingB: number) => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

export const createMatch = async (
  teamA: TeamInput,
  teamB: TeamInput,
  gameId: number,
  outcome: "teamA" | "teamB" | "draw"
) => {
  const K = 32; // K-Factor (How volatile the ratings are)

  // 1. Determine Actual Scores (S_A)
  // Win = 1, Loss = 0, Draw = 0.5
  let actualScoreA: number;
  let resultEnum: MatchResult;

  if (outcome === "teamA") {
    actualScoreA = 1;
    resultEnum = MatchResult.TEAM_A_WIN;
  } else if (outcome === "teamB") {
    actualScoreA = 0;
    resultEnum = MatchResult.TEAM_B_WIN;
  } else {
    actualScoreA = 0.5;
    resultEnum = MatchResult.DRAW;
  }

  // 2. Transaction Start
  await db.$transaction(async (tx) => {
    // A. Fetch Current Ratings
    // We need to know who is "stronger" before we calculate points
    const allUserIds = [...teamA.memberIds, ...teamB.memberIds];
    const currentRatings = await tx.gameRating.findMany({
      where: {
        gameId,
        userId: { in: allUserIds },
      },
      select: { userId: true, elo: true },
    });

    // Helper to get a user's ELO (Default to 1200 if new)
    const getElo = (userId: number) =>
      currentRatings.find((r) => r.userId === userId)?.elo ?? 1200;

    // B. Calculate Team Averages
    const teamAEloSum = teamA.memberIds.reduce(
      (sum, id) => sum + getElo(id),
      0
    );
    const teamBEloSum = teamB.memberIds.reduce(
      (sum, id) => sum + getElo(id),
      0
    );

    const avgEloA = teamAEloSum / teamA.memberIds.length;
    const avgEloB = teamBEloSum / teamB.memberIds.length;

    // C. Calculate Expected Outcome & Delta
    // "Based on ratings, Team A has a X% chance to win"
    const expectedScoreA = getExpectedScore(avgEloA, avgEloB);

    // ELO Formula: NewRating = OldRating + K * (Actual - Expected)
    // We calculate the *change* here so we can apply it to everyone
    const ratingChange = Math.round(K * (actualScoreA - expectedScoreA));

    // D. Create the Match Record
    await tx.match.create({
      data: {
        gameId,
        result: resultEnum,
        scoreA: teamA.score,
        scoreB: teamB.score,
        teamA: { connect: teamA.memberIds.map((id) => ({ id })) },
        teamB: { connect: teamB.memberIds.map((id) => ({ id })) },
      },
    });

    for (const userId of teamA.memberIds) {
      await tx.gameRating.upsert({
        where: { userId_gameId: { userId, gameId } },
        create: {
          userId,
          gameId,
          elo: 1200 + ratingChange,
          wins: resultEnum === MatchResult.TEAM_A_WIN ? 1 : 0,
          losses: resultEnum === MatchResult.TEAM_B_WIN ? 1 : 0,
          draws: resultEnum === MatchResult.DRAW ? 1 : 0,
        },
        update: {
          elo: { increment: ratingChange },
          wins: { increment: resultEnum === MatchResult.TEAM_A_WIN ? 1 : 0 },
          losses: { increment: resultEnum === MatchResult.TEAM_B_WIN ? 1 : 0 },
          draws: { increment: resultEnum === MatchResult.DRAW ? 1 : 0 },
        },
      });
    }

    // F. Update Team B Members
    // Team B's change is always the inverse of Team A's
    // If A gains 20, B loses 20.
    for (const userId of teamB.memberIds) {
      await tx.gameRating.upsert({
        where: { userId_gameId: { userId, gameId } },
        create: {
          userId,
          gameId,
          elo: 1200 - ratingChange,
          wins: resultEnum === MatchResult.TEAM_B_WIN ? 1 : 0,
          losses: resultEnum === MatchResult.TEAM_A_WIN ? 1 : 0,
          draws: resultEnum === MatchResult.DRAW ? 1 : 0,
        },
        update: {
          elo: { decrement: ratingChange }, // Note: Decrement logic
          wins: { increment: resultEnum === MatchResult.TEAM_B_WIN ? 1 : 0 },
          losses: { increment: resultEnum === MatchResult.TEAM_A_WIN ? 1 : 0 },
          draws: { increment: resultEnum === MatchResult.DRAW ? 1 : 0 },
        },
      });
    }
  });

  return { message: "Match recorded" };
};

export async function deleteMatch(matchId: number) {
  // TODO: Handling deletion with ELO is complex because it disrupts history.
  // For V1, we might just delete the record but keep the ELO damage done.
  await db.$transaction(async (tx) => {
    await tx.match.delete({
      where: { id: matchId },
    });
  });
}
