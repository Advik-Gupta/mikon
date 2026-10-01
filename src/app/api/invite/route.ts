import type { NextRequest } from "next/server";
import { handler, HttpError } from "@/lib/server/http";
import { CARD_FIELDS, userCard, users } from "@/lib/server/users";

export const GET = handler(async (req: NextRequest) => {
  const u = req.nextUrl.searchParams.get("u")?.toLowerCase() ?? "";
  if (!/^[a-z0-9_.]{3,24}$/.test(u)) throw new HttpError(404, "Not found");
  const inviter = await (await users()).findOne({ username: u }, { projection: CARD_FIELDS });
  if (!inviter) throw new HttpError(404, "Not found");
  return Response.json({ inviter: userCard(inviter) }, { headers: { "Cache-Control": "public, max-age=300" } });
});
