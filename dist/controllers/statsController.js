"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyGameStats = exports.getGameStats = void 0;
const db_1 = require("../config/db");
const lodash_1 = __importDefault(require("lodash"));
const getGameStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const groupId = parseInt(req.params.id);
        const gameId = req.query.gameId
            ? parseInt(req.query.gameId)
            : null;
        if (!groupId || !gameId) {
            return res
                .status(400)
                .json({ error: "Group ID and Game ID are required" });
        }
        // 1. Fetch Ratings (The Leaderboard)
        // We sort by ELO descending to get the ranks
        const ratings = yield db_1.db.gameRating.findMany({
            where: { gameId },
            include: {
                user: { select: { id: true, username: true } },
            },
            orderBy: { elo: "desc" },
        });
        // 2. Fetch Aggregate Stats (Overview)
        const totalMatches = yield db_1.db.match.count({
            where: { gameId },
        });
        // 3. Process Leaderboard Data
        // We calculate win rates and map it to a clean format
        const leaderboard = ratings.map((r, index) => {
            const totalPlayed = r.wins + r.losses + r.draws;
            const winRate = totalPlayed > 0 ? Math.round((r.wins / totalPlayed) * 100) : 0;
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});
exports.getGameStats = getGameStats;
const getMatchResult = (match, userId) => {
    if (match.result === "DRAW")
        return "D";
    const isTeamA = match.teamA.some((u) => u.id === userId);
    if (match.result === "TEAM_A_WIN")
        return isTeamA ? "W" : "L";
    return isTeamA ? "L" : "W"; // TEAM_B_WIN
};
const getMyGameStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.session.userId;
        const gameId = req.query.gameId
            ? parseInt(req.query.gameId)
            : null;
        if (!userId || !gameId) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const allRatings = yield db_1.db.gameRating.findMany({
            where: { gameId },
            orderBy: { elo: "desc" },
        });
        const myRankIndex = allRatings.findIndex((r) => r.userId === userId);
        const myRating = allRatings[myRankIndex];
        if (!myRating)
            return res.json({ hasPlayed: false });
        const rawMatches = yield db_1.db.match.findMany({
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
        const lastFive = lodash_1.default.take(history, 5).map((h) => h.result);
        const mostRecent = lodash_1.default.head(history);
        const currentStreakMatches = mostRecent
            ? lodash_1.default.takeWhile(history, (h) => h.result === mostRecent.result)
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
        const allInteractions = history.flatMap((h) => h.opponents.map((opp) => ({
            id: opp.id,
            username: opp.username,
            outcome: h.result,
        })));
        // 2. Group by Opponent ID and Aggregate
        const opponentStats = (0, lodash_1.default)(allInteractions)
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
        const nemesis = lodash_1.default.head(opponentStats) || null; // Lowest WinRate
        const bunny = lodash_1.default.last(opponentStats) || null; // Highest WinRate
        // Step E: Final Calculations
        const totalPlayed = myRating.wins + myRating.losses + myRating.draws;
        const winRate = totalPlayed > 0 ? Math.round((myRating.wins / totalPlayed) * 100) : 0;
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch personal stats" });
    }
});
exports.getMyGameStats = getMyGameStats;
