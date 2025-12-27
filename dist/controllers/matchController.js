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
exports.createMatch = void 0;
const db_1 = require("../config/db");
const matchService = __importStar(require("../services/matchService"));
const groupController_1 = require("./groupController");
const createMatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        const { teamA, teamB, gameId, result } = req.body;
        if (!teamA || !teamB || !gameId || !result) {
            return res.status(400).json({ error: "Missing fields" });
        }
        const game = yield db_1.db.game.findUnique({
            where: { id: Number(gameId) },
            select: { groupId: true },
        });
        if (!game) {
            return res.status(404).json({ error: "Game not found" });
        }
        const isMember = yield (0, groupController_1.isGroupMember)(userId, game.groupId);
        if (!isMember) {
            return res
                .status(403)
                .json({ error: "You must be a group member to record matches" });
        }
        yield matchService.createMatch(teamA, teamB, gameId, result);
        res.status(201).json({ message: "Match recorded" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to record match" });
    }
});
exports.createMatch = createMatch;
