import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { errorHandler } from "./middlewares/error.middleware";
import { apiLimiter, authLimiter } from "./middlewares/ratelimit.middleware";

import authRoutes from "./routes/auth.routes";
import groupRoutes from "./routes/group.routes";
import matchRoutes from "./routes/match.routes";

const app = new Hono();


app.use("*", logger());         
app.use("*", secureHeaders());   
app.use("*", cors({              
  origin: [process.env.FRONTEND_URL || "http://localhost:5173"],
  allowMethods: ["POST", "GET", "OPTIONS", "PATCH", "DELETE"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));


app.use("/api/auth/*", authLimiter);

app.use("/api/*", apiLimiter);


app.route("/api/auth", authRoutes);
app.route("/api/groups", groupRoutes);
app.route("/api/matches", matchRoutes);


app.onError(errorHandler);

const PORT = process.env.PORT || 3000;
console.log(`🚀 Server running on http://localhost:${PORT}`);


export default {
  port: PORT,
  fetch: app.fetch,
};