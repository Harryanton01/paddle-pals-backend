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
exports.getGroupMatches = exports.createGroup = exports.isGroupMember = void 0;
exports.fetchGroups = fetchGroups;
exports.fetchGroup = fetchGroup;
exports.joinGroup = joinGroup;
exports.createGame = createGame;
const db_1 = require("../config/db");
const crypto_1 = __importDefault(require("crypto"));
const isGroupMember = (userId, groupId) => __awaiter(void 0, void 0, void 0, function* () {
    const member = yield db_1.db.groupMember.findUnique({
        where: {
            userId_groupId: {
                userId,
                groupId,
            },
        },
    });
    return !!member;
});
exports.isGroupMember = isGroupMember;
const createGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const group = yield db_1.db.group.create({
            data: {
                name,
                inviteCode: crypto_1.default.randomUUID().split("-")[0].toUpperCase(),
                members: {
                    create: {
                        userId: userId,
                        role: "ADMIN",
                    },
                },
            },
            include: {
                members: true,
            },
        });
        res.status(201).json(group);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create group" });
    }
});
exports.createGroup = createGroup;
function fetchGroups(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.session.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const groups = yield db_1.db.group.findMany({
                where: {
                    members: {
                        some: { userId: userId },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    _count: {
                        select: { members: true, games: true },
                    },
                    games: {
                        select: {
                            _count: {
                                select: {
                                    matches: true,
                                },
                            },
                        },
                    },
                },
            });
            res.json(groups.map((group) => ({
                id: group.id,
                name: group.name,
                memberCount: group._count.members,
                gameCount: group._count.games,
                matchCount: group.games.reduce((acc, game) => acc + game._count.matches, 0),
            })));
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to fetch groups" });
        }
    });
}
function fetchGroup(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.session.userId;
            const groupId = parseInt(req.params.id);
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            if (!(yield (0, exports.isGroupMember)(userId, groupId))) {
                return res.status(403).json({ error: "Unauthorized" });
            }
            const group = yield db_1.db.group.findUnique({
                where: { id: groupId },
                include: {
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                },
                            },
                        },
                    },
                    games: true,
                },
            });
            if (!group) {
                return res.status(404).json({ error: "Group not found" });
            }
            res.json(group);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to fetch group" });
        }
    });
}
function joinGroup(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.session.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const { inviteCode } = req.body;
            if (!inviteCode) {
                return res.status(400).json({ error: "Missing required fields" });
            }
            const group = yield db_1.db.group.findUnique({
                where: { inviteCode: inviteCode },
            });
            if (!group) {
                return res.status(404).json({ error: "Group not found" });
            }
            const member = yield db_1.db.groupMember.create({
                data: {
                    userId: userId,
                    groupId: group.id,
                    role: "MEMBER",
                },
            });
            res.json(member);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to join group" });
        }
    });
}
function createGame(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const userId = req.session.userId;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const { name, groupId } = req.body;
            if (!name || !groupId) {
                return res.status(400).json({ error: "Missing required fields" });
            }
            const group = yield db_1.db.group.findUnique({
                where: { id: groupId },
            });
            if (!group) {
                return res.status(404).json({ error: "Group not found" });
            }
            if (!(yield (0, exports.isGroupMember)(userId, groupId))) {
                return res.status(403).json({ error: "Unauthorized" });
            }
            const game = yield db_1.db.game.create({
                data: {
                    name,
                    groupId,
                },
            });
            res.json(game);
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to create game" });
        }
    });
}
const getGroupMatches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const groupId = parseInt(req.params.id);
        const userId = req.session.userId;
        // 1. Extract Query Params with Defaults
        const gameId = req.query.gameId
            ? parseInt(req.query.gameId)
            : undefined;
        const filter = req.query.filter;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        if (!groupId) {
            return res.status(400).json({ error: "Group ID is required" });
        }
        const whereClause = {
            game: { groupId },
        };
        // Filter: Specific Game
        if (gameId) {
            whereClause.gameId = gameId;
        }
        // Filter: "My Matches"
        if (filter === "mine" && userId) {
            whereClause.OR = [
                { teamA: { some: { id: userId } } },
                { teamB: { some: { id: userId } } },
            ];
        }
        // 3. Run Two Queries (Count + Data) in Parallel
        const [totalMatches, matches] = yield db_1.db.$transaction([
            db_1.db.match.count({ where: whereClause }),
            db_1.db.match.findMany({
                where: whereClause,
                take: limit,
                skip: skip,
                orderBy: { playedAt: "desc" },
                include: {
                    game: { select: { id: true, name: true } },
                    teamA: { select: { id: true, username: true } },
                    teamB: { select: { id: true, username: true } },
                },
            }),
        ]);
        // 4. Return Data + Metadata
        res.json({
            data: matches,
            meta: {
                total: totalMatches,
                page,
                limit,
                totalPages: Math.ceil(totalMatches / limit),
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch matches" });
    }
});
exports.getGroupMatches = getGroupMatches;
