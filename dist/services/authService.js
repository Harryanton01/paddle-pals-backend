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
exports.validateUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../config/db");
const registerUser = (data) => __awaiter(void 0, void 0, void 0, function* () {
    const { password, username } = data;
    // 1. Check if user already exists
    const existingUser = yield db_1.db.user.findUnique({
        where: { username },
    });
    if (existingUser) {
        throw new Error("User already exists");
    }
    // 2. Hash the password
    const salt = yield bcryptjs_1.default.genSalt(10);
    const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
    // 3. Save to Database
    const newUser = yield db_1.db.user.create({
        data: {
            username,
            password_hash: hashedPassword,
        },
    });
    // 4. Return user info (excluding password)
    return {
        id: newUser.id,
        username: newUser.username,
    };
});
exports.registerUser = registerUser;
const validateUser = (username, password) => __awaiter(void 0, void 0, void 0, function* () {
    // 1. Find the user
    const user = yield db_1.db.user.findUnique({
        where: { username },
    });
    if (!user)
        return null;
    // 2. Check Password
    const isValid = yield bcryptjs_1.default.compare(password, user.password_hash);
    if (!isValid)
        return null;
    return user;
});
exports.validateUser = validateUser;
