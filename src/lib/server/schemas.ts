import "server-only";
import { z } from "zod";
import { ID } from "./http";

const email = z.string().trim().toLowerCase().email("Enter a valid email").max(254);

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_.]{3,24}$/, "Usernames are 3 to 24 letters, numbers, dots or underscores"),
  email,
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
  ref: z.string().regex(/^[a-z0-9_.]{3,24}$/).optional(),
});

const newPassword = z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long");

export const forgotSchema = z.object({ email });

export const resetSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{40,60}$/, "This reset link is invalid"), password: newPassword });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Enter your email or username").max(254),
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

export const tutorialSchema = z.object({
  step: z.number().int().min(0).max(100),
  done: z.boolean(),
  version: z.number().int().min(0).max(1000).optional(),
  newStep: z.number().int().min(0).max(100).optional(),
  guides: z.array(z.string().regex(/^[a-z-]{1,40}$/)).max(50).optional(),
});

const num = z.number().finite().min(0).max(100000).nullable();

export const logSchema = z.object({
  id: z.string().regex(ID),
  programId: z.union([z.string().regex(ID), z.literal("")]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayIndex: z.number().int().min(-1).max(100),
  name: z.string().max(120).optional(),
  startedAt: z.string().max(40).optional(),
  durationSec: z.number().int().min(0).max(86400).optional(),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().regex(/^[A-Za-z0-9_-]{1,120}$/),
        note: z.string().max(1000).optional(),
        sets: z
          .array(
            z.object({
              weight: num,
              reps: num,
              holdSec: num,
              done: z.boolean(),
              rir: z.number().int().min(0).max(10).nullable().optional(),
              kind: z.enum(["warmup", "working", "backoff"]).optional(),
            }),
          )
          .max(40),
      }),
    )
    .max(60),
  notes: z.string().max(2000),
  completedAt: z.string().max(40).nullable(),
});

const visibility = z.enum(["private", "friends", "public"]);

export const meSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_.]{3,24}$/, "Usernames are 3 to 24 letters, numbers, dots or underscores"),
    bio: z.string().trim().max(240),
    privacy: z.object({ profile: visibility, activeProgram: visibility, progress: visibility }),
  })
  .partial();

export const usernameSchema = meSchema.shape.username.unwrap();
