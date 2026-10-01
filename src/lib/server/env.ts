import "server-only";
import { z } from "zod";

const int = (fallback: number) => z.coerce.number().int().positive().default(fallback);

export const schema = z.object({
  MONGODB_URI: z.string().startsWith("mongodb"),
  MONGODB_DB: z.string().min(1).default("mikon"),
  JWT_SECRET: z.string().min(32),
  SESSION_TTL_DAYS: int(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  RATE_LIMIT_LOGIN_MAX: int(10),
  RATE_LIMIT_SIGNUP_MAX: int(5),
  RATE_LIMIT_AUTH_WINDOW_SEC: int(900),
  RATE_LIMIT_API_MAX: int(240),
  RATE_LIMIT_API_WINDOW_SEC: int(60),
  MAX_BODY_KB: int(512),
  NEXT_PUBLIC_EXERCISE_IMAGE_BASE: z.string().url().default("https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@a859101d633a01c4a1a920d6a8ce41dabba0705f/exercises/"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  APP_URL: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
});

type Env = z.infer<typeof schema>;
let parsed: Env | null = null;

const clean = () => Object.fromEntries(Object.entries(process.env).map(([k, v]) => [k, v?.trim() === "" ? undefined : v?.trim()]));

export const env = new Proxy({} as Env, {
  get: (_, key) => (parsed ??= schema.parse(clean()))[key as keyof Env],
});

export function envProblems() {
  const result = schema.safeParse(clean());
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}
