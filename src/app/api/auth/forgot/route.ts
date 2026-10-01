import type { NextRequest } from "next/server";
import { env } from "@/lib/server/env";
import { assertSameOrigin, clientIp, handler, rateLimit, readJson } from "@/lib/server/http";
import { sendResetEmail } from "@/lib/server/mail";
import { createReset } from "@/lib/server/resets";
import { forgotSchema } from "@/lib/server/schemas";
import { users } from "@/lib/server/users";

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  await rateLimit(`forgot-ip:${clientIp(req)}`, 10, 3600);
  const { email } = await readJson(req, forgotSchema);
  await rateLimit(`forgot-email:${email}`, 3, 3600);
  const user = await (await users()).findOne({ email });
  if (user) {
    const token = await createReset(user._id);
    const base = env.APP_URL ?? req.nextUrl.origin;
    await sendResetEmail(user.email, user.name, `${base.replace(/\/$/, "")}/reset-password?token=${token}`);
  }
  return Response.json({ ok: true });
});
