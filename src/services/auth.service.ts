import bcrypt from "bcryptjs";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { db } from "../config/db";
import { registerSchema } from "../middlewares/validate.middleware";

type RegisterInput = z.infer<typeof registerSchema>;

export interface UserResponse {
  id: number;
  username: string;
}

export const registerUser = async (
  data: RegisterInput
): Promise<UserResponse> => {
  const { password, username } = data;

  const existingUser = await db.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    throw new HTTPException(409, { message: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await db.user.create({
    data: {
      username,
      password_hash: hashedPassword,
    },
    select: {
      id: true,
      username: true,
    },
  });

  return newUser;
};

export const validateUser = async (
  username: string, 
  password: string
): Promise<UserResponse | null> => {
  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) return null;

  return {
    id: user.id,
    username: user.username,
  };
};