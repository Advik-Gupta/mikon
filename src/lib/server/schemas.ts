import "server-only";
import { z } from "zod";
import { ID } from "./http";

const email = z.string().trim().toLowerCase().email("Enter a valid email").max(254);

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60),
  email,
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").max(128),
});

export const profileSchema = z.looseObject({ version: z.literal(1) });

export const draftSchema = z.looseObject({ step: z.number().int().min(0).max(50), profile: profileSchema }).nullable();

export const programSchema = z.looseObject({
  id: z.string().regex(ID),
  name: z.string().max(120),
  days: z.array(z.unknown()).max(60),
});

const MUSCLE_KEYS = [
  "abdominals", "abductors", "adductors", "biceps", "calves", "chest", "forearms", "glutes", "hamstrings",
  "lats", "lower back", "middle back", "neck", "quadriceps", "shoulders", "traps", "triceps",
] as const;

export const customExerciseSchema = z.looseObject({
  id: z.string().regex(/^cx-[A-Za-z0-9_-]{1,40}$/),
  name: z.string().trim().min(1).max(120),
  source: z.literal("custom"),
  primary: z.array(z.enum(MUSCLE_KEYS)).min(1).max(17),
  secondary: z.array(z.enum(MUSCLE_KEYS)).max(17),
  instructions: z.array(z.string().max(1000)).max(40),
});

export const tutorialSchema = z.object({ step: z.number().int().min(0).max(100), done: z.boolean() });
