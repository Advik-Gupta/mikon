import type { NextRequest } from "next/server";
import { assertSameOrigin, clientIp, handler, HttpError, rateLimit, readJson, startSession } from "@/lib/server/http";
import { consumeReset, resetIsValid } from "@/lib/server/resets";
import { resetSchema } from "@/lib/server/schemas";
import { findUser, setPassword } from "@/lib/server/users";

export const GET = handler(async (req: NextRequest) => {
  await rateLimit(`reset-check:${clientIp(req)}`, 30, 3600);
  const token = req.nextUrl.searchParams.get("token") ?? "";
  return Response.json({ valid: /^[A-Za-z0-9_-]{40,60}$/.test(token) && (await resetIsValid(token)) });
});

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  await rateLimit(`reset:${clientIp(req)}`, 10, 3600);
  const { token, password } = await readJson(req, resetSchema);
  const userId = await consumeReset(token);
  if (!userId) throw new HttpError(400, "This reset link has expired or was already used. Request a new one.");
  await setPassword(userId, password);
  const u = await findUser(userId.toHexString());
  await startSession(userId.toHexString(), u?.role === "admin" ? "admin" : "user");
  return Response.json({ ok: true });
});
