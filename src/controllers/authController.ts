import { Request, Response } from "express";
import * as authService from "../services/authService";
import { db } from "../config/db";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await authService.registerUser({ email, password, username });

    res.status(201).json(user);
  } catch (error: any) {
    if (error.message === "User already exists") {
      return res.status(409).json({ error: "User already exists" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Validate credentials using the service
    const user = await authService.validateUser(email, password);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 2. Set the Session (The Magic Moment)
    // This automatically writes to the DB and sets the Cookie header
    (req.session as any).userId = user.id;

    res.json({
      message: "Logged in successfully",
      user: { id: user.id, username: user.username },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;

    // Fetch fresh user data from DB (in case they changed their avatar/username)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, elo: true }, // Select only what we need
    });

    if (!user) return res.status(401).json({ error: "User not found" });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};

// 2. Logout
export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Could not log out" });

    res.clearCookie("connect.sid"); // clear the cookie from browser
    res.json({ message: "Logged out" });
  });
};
