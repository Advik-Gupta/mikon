import type { NextRequest } from "next/server";
import { env } from "@/lib/server/env";
import { assertSameOrigin, clientIp, handler, HttpError, rateLimit, readJson, startSession } from "@/lib/server/http";
import { loginSchema } from "@/lib/server/schemas";
import { checkCredentials, publicUser } from "@/lib/server/users";

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  await rateLimit(`login-ip:${clientIp(req)}`, env.RATE_LIMIT_LOGIN_MAX * 3, env.RATE_LIMIT_AUTH_WINDOW_SEC);
  const { email, password } = await readJson(req, loginSchema);
  await rateLimit(`login-email:${email}`, env.RATE_LIMIT_LOGIN_MAX, env.RATE_LIMIT_AUTH_WINDOW_SEC);
  const user = await checkCredentials(email, password);
  if (!user) throw new HttpError(401, "Incorrect email, username or password");
  await startSession(user._id.toHexString(), user.role === "admin" ? "admin" : "user");
  return Response.json({ user: publicUser(user) });
});
