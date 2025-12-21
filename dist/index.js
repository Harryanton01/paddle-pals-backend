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
// server/src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const db_1 = require("./config/db");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const matchRoutes_1 = __importDefault(require("./routes/matchRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_URL];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(null, origin);
        }
        return callback(null, true);
    },
    credentials: true,
}));
app.use(express_1.default.json());
// Session Configuration
const Store = (0, connect_pg_simple_1.default)(express_session_1.default);
app.use((0, express_session_1.default)({
    store: new Store({
        conString: process.env.DATABASE_URL, // Connects to our DB
        createTableIfMissing: true, // Auto-creates the session table
    }),
    secret: process.env.SESSION_SECRET || "secret123", // Encrypts the cookie
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Days
        httpOnly: true, // Prevents JS from reading the cookie (Security)
        secure: false, // Set to TRUE if you use HTTPS (Production)
        sameSite: "lax", // Needed for localhost dev
    },
}));
// Routes
app.use("/api/auth", authRoutes_1.default);
app.use("/api/matches", matchRoutes_1.default);
app.use("/api/users", userRoutes_1.default);
app.get("/", (req, res) => {
    res.send("🏓 Ping Pong Tracker API is alive!");
});
const startServer = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield db_1.db.$connect();
        console.log("✅ Connected to Database (Supabase)");
        app.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("❌ Failed to connect to Database:", error);
        process.exit(1);
    }
});
startServer();
