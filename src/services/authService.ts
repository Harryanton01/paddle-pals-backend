import bcrypt from "bcryptjs";
import { User } from "@prisma/client";
import { db } from "../config/db";
import { CreateUserDTO, UserResponse } from "../types/user.types";

export const registerUser = async (
  data: CreateUserDTO
): Promise<UserResponse> => {
  const { password, username } = data;

  // 1. Check if user already exists
  const existingUser = await db.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  // 2. Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 3. Save to Database
  const newUser = await db.user.create({
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
};

export const validateUser = async (
  username: string,
  password: string
): Promise<User | null> => {
  // 1. Find the user
  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) return null;

  // 2. Check Password
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) return null;

  return user;
};
