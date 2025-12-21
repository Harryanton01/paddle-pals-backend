"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAuthenticated = void 0;
const isAuthenticated = (req, res, next) => {
    // Check if session exists and has a userId
    if (req.session && req.session.userId) {
        return next();
    }
    return res.status(401).json({ error: "Unauthorized: Please log in" });
};
exports.isAuthenticated = isAuthenticated;
