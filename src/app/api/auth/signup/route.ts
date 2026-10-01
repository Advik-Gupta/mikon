import type { NextRequest } from "next/server";
import { env } from "@/lib/server/env";
import { assertSameOrigin, clientIp, handler, HttpError, rateLimit, readJson, startSession } from "@/lib/server/http";
import { signupSchema } from "@/lib/server/schemas";
import { createUser, publicUser, usernameTaken, users } from "@/lib/server/users";
import { acceptInvite } from "@/lib/server/social";

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  await rateLimit(`signup:${clientIp(req)}`, env.RATE_LIMIT_SIGNUP_MAX, env.RATE_LIMIT_AUTH_WINDOW_SEC);
  const { name, username, email, password, ref } = await readJson(req, signupSchema);
  if (await (await users()).findOne({ email }, { projection: { _id: 1 } })) {
    throw new HttpError(409, "An account with this email already exists");
  }
  if (await usernameTaken(username)) throw new HttpError(409, "That username is taken");
  const user = await createUser(name, username, email, password);
  await startSession(user._id.toHexString());
  if (ref) await acceptInvite(user, ref).catch(() => null);
  return Response.json({ user: publicUser(user) }, { status: 201 });
});
