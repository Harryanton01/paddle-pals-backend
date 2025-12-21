import { db } from "../config/db";

export const createMatch = async (
  playerAId: number,
  playerBId: number,
  scoreA: number,
  scoreB: number
) => {
  // 1. Determine Winner/Loser
  const isAWinner = scoreA > scoreB;
  const winnerId = isAWinner ? playerAId : playerBId;
  const loserId = isAWinner ? playerBId : playerAId;
  const winnerScore = isAWinner ? scoreA : scoreB;
  const loserScore = isAWinner ? scoreB : scoreA;

  // 2. Calculate ELO Change (Simple version: Winner +10, Loser -10)
  // (We can make this complex later with real math if you want)
  const eloChange = 10;

  // 3. Database Transaction (All or Nothing)
  // We use $transaction to ensure the match is saved AND elo is updated together.
  await db.$transaction([
    // Create Match Record
    db.match.create({
      data: {
        winnerId,
        loserId,
        winnerScore,
        loserScore,
      },
    }),
    // Update Winner ELO
    db.user.update({
      where: { id: winnerId },
      data: { elo: { increment: eloChange } },
    }),
    // Update Loser ELO
    db.user.update({
      where: { id: loserId },
      data: { elo: { decrement: eloChange } },
    }),
  ]);

  return { message: "Match recorded" };
};

export const deleteMatch = async (matchId: number) => {
  // 1. Find the match first (we need to know who played)
  const match = await db.match.findUnique({
    where: { id: matchId },
  });

  if (!match) throw new Error("Match not found");

  // 2. Define the reversal (undo the +10/-10)
  const eloReversal = 10;

  // 3. Transaction: Revert ELO -> Delete Match
  await db.$transaction([
    // Take points back from the winner
    db.user.update({
      where: { id: match.winnerId },
      data: { elo: { decrement: eloReversal } },
    }),
    // Give points back to the loser
    db.user.update({
      where: { id: match.loserId },
      data: { elo: { increment: eloReversal } },
    }),
    // Finally, delete the record
    db.match.delete({
      where: { id: matchId },
    }),
  ]);
};
