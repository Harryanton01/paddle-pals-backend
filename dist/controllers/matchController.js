"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.deleteMatch = exports.getOpponents = exports.createMatch = exports.getMyMatches = void 0;
const db_1 = require("../config/db");
const matchService = __importStar(require("../services/matchService"));
const getMyMatches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const matches = yield db_1.db.match.findMany({
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
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch matches" });
    }
});
exports.getMyMatches = getMyMatches;
const createMatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.session.userId;
        const { opponentId, myScore, opponentScore } = req.body;
        if (!opponentId || myScore === undefined || opponentScore === undefined) {
            return res.status(400).json({ error: "Missing fields" });
        }
        if (userId === opponentId) {
            return res
                .status(400)
                .json({ error: "You cannot play against yourself" });
        }
        yield matchService.createMatch(userId, parseInt(opponentId), myScore, opponentScore);
        res.status(201).json({ message: "Match recorded" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to record match" });
    }
});
exports.createMatch = createMatch;
// Returns a list of all users EXCEPT the current one
const getOpponents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.session.userId;
        const opponents = yield db_1.db.user.findMany({
            where: {
                id: { not: userId }, // Don't show myself in the list
            },
            select: { id: true, username: true },
        });
        res.json(opponents);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch opponents" });
    }
});
exports.getOpponents = getOpponents;
const deleteMatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const matchId = parseInt(req.params.id);
        const userId = req.session.userId;
        // Check if match exists and if user was part of it (Security)
        const match = yield db_1.db.match.findUnique({ where: { id: matchId } });
        if (!match)
            return res.status(404).json({ error: "Match not found" });
        if (match.winnerId !== userId && match.loserId !== userId) {
            return res
                .status(403)
                .json({ error: "You can only delete your own matches" });
        }
        yield matchService.deleteMatch(matchId);
        res.json({ message: "Match deleted and ELO reverted" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to delete match" });
    }
});
exports.deleteMatch = deleteMatch;
