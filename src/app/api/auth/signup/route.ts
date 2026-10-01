import type { NextRequest } from "next/server";
import { env } from "@/lib/server/env";
import { assertSameOrigin, clientIp, handler, HttpError, rateLimit, readJson, startSession } from "@/lib/server/http";
import { signupSchema } from "@/lib/server/schemas";
import { createUser, publicUser, usernameTaken, users } from "@/lib/server/users";
import { after } from "next/server";
import { notify } from "@/lib/server/social";
import { REF_COOKIE } from "@/lib/server/session";

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  await rateLimit(`signup:${clientIp(req)}`, env.RATE_LIMIT_SIGNUP_MAX, env.RATE_LIMIT_AUTH_WINDOW_SEC);
  const { name, username, email, password, ref } = await readJson(req, signupSchema);
  if (await (await users()).findOne({ email }, { projection: { _id: 1 } })) {
    throw new HttpError(409, "An account with this email already exists");
  }
  if (await usernameTaken(username)) throw new HttpError(409, "That username is taken");
  const refName = ref ?? req.cookies.get(REF_COOKIE)?.value?.toLowerCase();
  const inviter = refName ? await (await users()).findOne({ username: refName }) : null;
  const user = await createUser(name, username, email, password, inviter);
  await startSession(user._id.toHexString());
  if (inviter) {
    after(() =>
      notify(inviter._id.toHexString(), user, "invite_joined", { title: `${user.name} joined Mikon from your invite`, body: "They'll get the option to add you as a friend.", url: `/u/${user.username}` }).catch(() => null),
    );
  }
  const res = Response.json({ user: publicUser(user) }, { status: 201 });
  res.headers.append("Set-Cookie", `${REF_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`);
  return res;
});
