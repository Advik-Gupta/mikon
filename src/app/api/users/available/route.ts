import type { NextRequest } from "next/server";
import { clientIp, handler, rateLimit } from "@/lib/server/http";
import { usernameSchema } from "@/lib/server/schemas";
import { usernameTaken } from "@/lib/server/users";

export const GET = handler(async (req: NextRequest) => {
  await rateLimit(`available:${clientIp(req)}`, 60, 60);
  const parsed = usernameSchema.safeParse(req.nextUrl.searchParams.get("u") ?? "");
  if (!parsed.success) return Response.json({ available: false, error: parsed.error.issues[0]?.message });
  return Response.json({ available: !(await usernameTaken(parsed.data)) });
});
