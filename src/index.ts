// server/src/index.ts
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import session from "express-session";
import pgSession from "connect-pg-simple";
import { db } from "./config/db";
import authRoutes from "./routes/authRoutes";
import matchRoutes from "./routes/matchRoutes";
import userRoutes from "./routes/userRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_URL];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(null, origin);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());

// Session Configuration
const Store = pgSession(session);

app.use(
  session({
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
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/users", userRoutes);

app.get("/", (req, res) => {
  res.send("🏓 Ping Pong Tracker API is alive!");
});

const startServer = async () => {
  try {
    await db.$connect();
    console.log("✅ Connected to Database (Supabase)");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to Database:", error);
    process.exit(1);
  }
};

startServer();
