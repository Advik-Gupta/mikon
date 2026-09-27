import type { NextRequest } from "next/server";
import { env } from "@/lib/server/env";
import { assertSameOrigin, clientIp, handler, HttpError, rateLimit, readJson, startSession } from "@/lib/server/http";
import { signupSchema } from "@/lib/server/schemas";
import { createUser, publicUser, users } from "@/lib/server/users";

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  await rateLimit(`signup:${clientIp(req)}`, env.RATE_LIMIT_SIGNUP_MAX, env.RATE_LIMIT_AUTH_WINDOW_SEC);
  const { name, email, password } = await readJson(req, signupSchema);
  if (await (await users()).findOne({ email }, { projection: { _id: 1 } })) {
    throw new HttpError(409, "An account with this email already exists");
  }
  const user = await createUser(name, email, password);
  await startSession(user._id.toHexString());
  return Response.json({ user: publicUser(user) }, { status: 201 });
});
