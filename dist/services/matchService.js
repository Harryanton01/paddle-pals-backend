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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMatch = exports.createMatch = void 0;
const db_1 = require("../config/db");
const createMatch = (playerAId, playerBId, scoreA, scoreB) => __awaiter(void 0, void 0, void 0, function* () {
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
    yield db_1.db.$transaction([
        // Create Match Record
        db_1.db.match.create({
            data: {
                winnerId,
                loserId,
                winnerScore,
                loserScore,
            },
        }),
        // Update Winner ELO
        db_1.db.user.update({
            where: { id: winnerId },
            data: { elo: { increment: eloChange } },
        }),
        // Update Loser ELO
        db_1.db.user.update({
            where: { id: loserId },
            data: { elo: { decrement: eloChange } },
        }),
    ]);
    return { message: "Match recorded" };
});
exports.createMatch = createMatch;
const deleteMatch = (matchId) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Find the match first (we need to know who played)
    const match = yield db_1.db.match.findUnique({
        where: { id: matchId },
    });
    if (!match)
        throw new Error("Match not found");
    // 2. Define the reversal (undo the +10/-10)
    const eloReversal = 10;
    // 3. Transaction: Revert ELO -> Delete Match
    yield db_1.db.$transaction([
        // Take points back from the winner
        db_1.db.user.update({
            where: { id: match.winnerId },
            data: { elo: { decrement: eloReversal } },
        }),
        // Give points back to the loser
        db_1.db.user.update({
            where: { id: match.loserId },
            data: { elo: { increment: eloReversal } },
        }),
        // Finally, delete the record
        db_1.db.match.delete({
            where: { id: matchId },
        }),
    ]);
});
exports.deleteMatch = deleteMatch;
