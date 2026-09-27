import "server-only";
import { z } from "zod";

const schema = z.object({
  MONGODB_URI: z.string().startsWith("mongodb"),
  MONGODB_DB: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  SESSION_TTL_DAYS: z.coerce.number().int().positive(),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_SIGNUP_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_AUTH_WINDOW_SEC: z.coerce.number().int().positive(),
  RATE_LIMIT_API_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_API_WINDOW_SEC: z.coerce.number().int().positive(),
  MAX_BODY_KB: z.coerce.number().int().positive(),
  NEXT_PUBLIC_EXERCISE_IMAGE_BASE: z.string().url(),
});

export const env = schema.parse(process.env);
