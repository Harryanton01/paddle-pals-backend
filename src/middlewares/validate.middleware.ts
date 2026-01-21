import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Context } from "hono";
import { GroupRole } from "../../generated/prisma/client";

const RoleEnum = z.enum(GroupRole);
const MatchOutcomeEnum = z.enum(["teamA", "teamB", "draw"]);

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be under 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});


export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});


export const createGroupSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters").max(50),
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().length(8, "Invite code must be exactly 8 characters"),
});

export const updateRoleSchema = z.object({
  role: RoleEnum,
});

export const createGameSchema = z.object({
  name: z.string().min(2, "Game name must be at least 2 characters"),
  groupId: z.number().int().positive(),
});

const teamInputSchema = z.object({
  memberIds: z
    .array(z.number().int().positive())
    .min(1, "Team must have at least one player"),
  score: z.number().int().nonnegative().optional(),
});

export const createMatchSchema = z.object({
  gameId: z.number().int().positive(),
  teamA: teamInputSchema,
  teamB: teamInputSchema,
  outcome: MatchOutcomeEnum,
  playedAt: z.iso.datetime(), 
});

export const getStatsSchema = z.object({
  gameId: z.coerce.number().int().positive(),
});

export const validate = (target: "json" | "query" | "param", schema: z.ZodSchema) =>
  zValidator(target, schema, (result, c: Context) => {
    if (!result.success) {
      const issues = z.flattenError(result.error);
      
      return c.json(
        {
          error: "Validation Failed",
          fieldErrors: issues.fieldErrors,
          formErrors: issues.formErrors, 
        },
        400
      );
    }
  });
