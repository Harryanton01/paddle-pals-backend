import { Request, Response } from "express";
import * as authService from "../services/authService";
import { db } from "../config/db";

export const register = async (req: Request, res: Response) => {
  try {
    const { password, username } = req.body;

    if (!password || !username) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await authService.registerUser({ password, username });

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
    const { username, password } = req.body;

    const user = await authService.validateUser(username, password);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user.id;

    res.json({ id: user.id, username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req.session as any).userId;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        gameRatings: true,
        memberships: true,
      },
    });

    if (!user) return res.status(401).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server Error" });
  }
};

export const logout = (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Could not log out" });

    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
};
