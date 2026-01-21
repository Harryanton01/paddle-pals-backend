import { rateLimiter } from "hono-rate-limiter";

export const apiLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, 
  limit: 100, 
  standardHeaders: "draft-6", 
  keyGenerator: (c) => c.req.header("x-forwarded-for") || "ip", 
});

export const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  message: { error: "Too many login attempts, please try again later." },
  keyGenerator: (c) => c.req.header("x-forwarded-for") || "ip", 
});