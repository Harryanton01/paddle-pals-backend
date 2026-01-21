import { Context } from "hono";
import { sign } from "hono/jwt";
import * as authService from "../services/auth.service";
import { db } from "../config/db";
import { ValidatedContext } from "../types";
import { registerSchema, loginSchema } from "../middlewares/validate.middleware";

const generateToken = async (userId: number, username: string) => {
  const secret = process.env.JWT_SECRET || "fallback_secret";
  const payload = {
    id: userId,
    username: username,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, 
  };

  return await sign(payload, secret, "HS256"); 
};


export const register = async (c: ValidatedContext<typeof registerSchema>) => {
  const { username, password } = c.req.valid("json");

  const user = await authService.registerUser({ username, password });

  const token = await generateToken(user.id, user.username);

  return c.json({ user, token }, 201);
};


export const login = async (c: ValidatedContext<typeof loginSchema>) => {
  const { username, password } = c.req.valid("json");
  // 1. Validate Credentials
  const user = await authService.validateUser( username, password );

  if (!user) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await generateToken(user.id, user.username);

  return c.json({ user: { id: user.id, username: user.username }, token });
};


export const getMe = async (c: Context) => {
  const currentUser = c.get("user");
  
  if (!currentUser) return c.json({ error: "Unauthorized" }, 401);

  const userDetails = await db.user.findUnique({
    where: { id: Number(currentUser.id) },
    select: {
      id: true,
      username: true,
      gameRatings: true,
      memberships: {
        include: { group: { select: { id: true, name: true } } }
      },
    },
  });

  if (!userDetails) return c.json({ error: "User not found" }, 404);

  return c.json(userDetails);
};


export const logout = async (c: Context) => {
  return c.json({ message: "Logged out successfully. Please clear token from client." });
};