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
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

type Env = z.infer<typeof schema>;
let parsed: Env | null = null;

export const env = new Proxy({} as Env, {
  get: (_, key) => (parsed ??= schema.parse(process.env))[key as keyof Env],
});
