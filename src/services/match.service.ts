import { MatchResult, MatchStatus } from "../../generated/prisma/client";
import { HTTPException } from "hono/http-exception";
import { isFuture, parseISO, isValid } from "date-fns";
import { db } from "../config/db";

export type TeamInput = {
  memberIds: number[];
  score?: number;
};

export interface CreateMatchDTO {
  gameId: number;
  creatorId: number;
  teamA: TeamInput;
  teamB: TeamInput;
  outcome: "teamA" | "teamB" | "draw";
  playedAt: string | Date;
}

const getExpectedScore = (ratingA: number, ratingB: number) => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

export const createMatch = async (data: CreateMatchDTO) => {
  const { teamA, teamB, gameId, outcome, creatorId, playedAt } = data;

  const game = await db.game.findUnique({ where: { id: gameId } });
  if (!game) throw new HTTPException(404, { message: "Game not found" });

  let finalDate = new Date();

  if (playedAt) {
    const parsed =
      typeof data.playedAt === "string"
        ? parseISO(data.playedAt)
        : data.playedAt;

    if (!isValid(parsed)) {
      throw new HTTPException(400, { message: "Invalid date format" });
    }

    if (isFuture(parsed)) {
      throw new HTTPException(400, {
        message: "Cannot record matches in the future",
      });
    }

    finalDate = parsed;
  }

  let resultEnum: MatchResult;
  if (outcome === "teamA") resultEnum = MatchResult.TEAM_A_WIN;
  else if (outcome === "teamB") resultEnum = MatchResult.TEAM_B_WIN;
  else resultEnum = MatchResult.DRAW;

  const match = await db.match.create({
    data: {
      gameId,
      createdById: creatorId,
      status: MatchStatus.PENDING,
      result: resultEnum,
      scoreA: teamA.score,
      scoreB: teamB.score,
      teamA: { connect: teamA.memberIds.map((id) => ({ id })) },
      teamB: { connect: teamB.memberIds.map((id) => ({ id })) },
      playedAt: finalDate,
    },
    include: {
      teamA: { select: { username: true } },
      teamB: { select: { username: true } },
    },
  });

  return match;
};

export const confirmMatch = async (matchId: number, userId: number) => {
  const K = 32;

  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { select: { id: true } },
      teamB: { select: { id: true } },
      game: { include: { group: { include: { members: true } } } },
    },
  });

  if (!match) throw new HTTPException(404, { message: "Match not found" });

  const userMember = match.game.group.members.find((m) => m.userId === userId);
  const isAdmin = userMember?.role === "ADMIN";

  if (match.status === MatchStatus.ACCEPTED) {
    throw new HTTPException(400, { message: "Match is already accepted" });
  }

  if (match.status === MatchStatus.REJECTED && !isAdmin) {
    throw new HTTPException(400, { message: "Match has been rejected" });
  }

  if (!isAdmin) {
    const creatorInTeamA = match.teamA.some((u) => u.id === match.createdById);
    const userInTeamA = match.teamA.some((u) => u.id === userId);
    const userInTeamB = match.teamB.some((u) => u.id === userId);

    let isAuthorized = false;

    // Standard Opponent Check
    if (creatorInTeamA && userInTeamB) isAuthorized = true;
    if (!creatorInTeamA && userInTeamA) isAuthorized = true;

    // Draw Exception: Any participant (except creator) can confirm
    if (match.result === MatchResult.DRAW) {
      const isParticipant = userInTeamA || userInTeamB;
      const isCreator = match.createdById === userId;
      if (isParticipant && !isCreator) isAuthorized = true;
    }

    if (!isAuthorized) {
      throw new HTTPException(403, {
        message: "Only an opponent or group admin can confirm this match",
      });
    }
  }

  return await db.$transaction(async (tx) => {
    const allUserIds = [
      ...match.teamA.map((u) => u.id),
      ...match.teamB.map((u) => u.id),
    ];

    const currentRatings = await tx.gameRating.findMany({
      where: { gameId: match.gameId, userId: { in: allUserIds } },
    });

    const getElo = (uid: number) =>
      currentRatings.find((r) => r.userId === uid)?.elo ?? 1200;

    const teamAEloSum = match.teamA.reduce((sum, u) => sum + getElo(u.id), 0);
    const teamBEloSum = match.teamB.reduce((sum, u) => sum + getElo(u.id), 0);

    const avgEloA = teamAEloSum / match.teamA.length;
    const avgEloB = teamBEloSum / match.teamB.length;

    const expectedScoreA = getExpectedScore(avgEloA, avgEloB);

    let actualScoreA = 0.5;
    if (match.result === MatchResult.TEAM_A_WIN) actualScoreA = 1;
    if (match.result === MatchResult.TEAM_B_WIN) actualScoreA = 0;

    const ratingChange = Math.round(K * (actualScoreA - expectedScoreA));

    // Update Team A
    for (const user of match.teamA) {
      await tx.gameRating.upsert({
        where: { userId_gameId: { userId: user.id, gameId: match.gameId } },
        create: {
          userId: user.id,
          gameId: match.gameId,
          elo: 1200 + ratingChange,
          wins: match.result === MatchResult.TEAM_A_WIN ? 1 : 0,
          losses: match.result === MatchResult.TEAM_B_WIN ? 1 : 0,
          draws: match.result === MatchResult.DRAW ? 1 : 0,
        },
        update: {
          elo: { increment: ratingChange },
          wins: { increment: match.result === MatchResult.TEAM_A_WIN ? 1 : 0 },
          losses: {
            increment: match.result === MatchResult.TEAM_B_WIN ? 1 : 0,
          },
          draws: { increment: match.result === MatchResult.DRAW ? 1 : 0 },
        },
      });
    }

    // Update Team B
    for (const user of match.teamB) {
      await tx.gameRating.upsert({
        where: { userId_gameId: { userId: user.id, gameId: match.gameId } },
        create: {
          userId: user.id,
          gameId: match.gameId,
          elo: 1200 - ratingChange,
          wins: match.result === MatchResult.TEAM_B_WIN ? 1 : 0,
          losses: match.result === MatchResult.TEAM_A_WIN ? 1 : 0,
          draws: match.result === MatchResult.DRAW ? 1 : 0,
        },
        update: {
          elo: { decrement: ratingChange },
          wins: { increment: match.result === MatchResult.TEAM_B_WIN ? 1 : 0 },
          losses: {
            increment: match.result === MatchResult.TEAM_A_WIN ? 1 : 0,
          },
          draws: { increment: match.result === MatchResult.DRAW ? 1 : 0 },
        },
      });
    }

    return await tx.match.update({
      where: { id: matchId },
      data: { status: MatchStatus.ACCEPTED },
    });
  });
};

export const rejectMatch = async (matchId: number, userId: number) => {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { select: { id: true } }, // Need these to check if user played
      teamB: { select: { id: true } },
      game: { include: { group: { include: { members: true } } } },
    },
  });

  if (!match) throw new HTTPException(404, { message: "Match not found" });

  if (match.status !== MatchStatus.PENDING) {
    throw new HTTPException(400, { message: "Match is already resolved" });
  }

  // --- Authorization Logic ---
  const userMember = match.game.group.members.find((m) => m.userId === userId);
  const isAdmin = userMember?.role === "ADMIN";
  const isCreator = match.createdById === userId;

  // Check if user is a participant (Team A or Team B)
  const isParticipant = [...match.teamA, ...match.teamB].some(
    (u) => u.id === userId
  );

  // LOGIC: Who can reject?
  // 1. Admin (Always)
  // 2. Creator (Can cancel their own mistake)
  // 3. Any Participant who is NOT the creator (Can reject a fake result)
  const canReject = isAdmin || isCreator || (isParticipant && !isCreator);

  if (!canReject) {
    // FIX: actually throw the error!
    throw new HTTPException(403, {
      message: "You are not authorized to reject this match",
    });
  }

  return await db.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.REJECTED },
  });
};
