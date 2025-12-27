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
exports.logout = exports.getMe = exports.login = exports.register = void 0;
const authService = __importStar(require("../services/authService"));
const db_1 = require("../config/db");
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { password, username } = req.body;
        if (!password || !username) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const user = yield authService.registerUser({ password, username });
        res.status(201).json(user);
    }
    catch (error) {
        if (error.message === "User already exists") {
            return res.status(409).json({ error: "User already exists" });
        }
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        const user = yield authService.validateUser(username, password);
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        req.session.userId = user.id;
        res.json({ id: user.id, username: user.username });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.login = login;
const getMe = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.session.userId;
        const user = yield db_1.db.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                gameRatings: true,
                memberships: true,
            },
        });
        if (!user)
            return res.status(401).json({ error: "User not found" });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ error: "Server Error" });
    }
});
exports.getMe = getMe;
const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err)
            return res.status(500).json({ error: "Could not log out" });
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
    });
};
exports.logout = logout;
