import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { handler, requireUser } from "@/lib/server/http";
import { friendships, pairKey } from "@/lib/server/social";
import { CARD_FIELDS, userCard, users } from "@/lib/server/users";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const GET = handler(async (req: NextRequest) => {
  const me = await requireUser(req);
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase().replace(/^@/, "").slice(0, 254);
  if (q.length < 2) return Response.json({ results: [] });
  const filter = q.includes("@")
    ? { email: q }
    : { $or: [{ username: { $regex: `^${escape(q)}` } }, { name: { $regex: escape(q), $options: "i" } }] };
  const found = await (await users())
    .find({ ...filter, _id: { $ne: new ObjectId(me) } }, { projection: CARD_FIELDS })
    .limit(20)
    .toArray();
  const links = await (await friendships()).find({ pair: { $in: found.map((u) => pairKey(me, u._id.toHexString())) } }).toArray();
  const byPair = new Map(links.map((f) => [f.pair, f]));
  const results = found.map((u) => {
    const f = byPair.get(pairKey(me, u._id.toHexString()));
    const relation = !f ? "none" : f.status === "accepted" ? "friends" : f.from === me ? "outgoing" : "incoming";
    return { ...userCard(u), relation };
  });
  return Response.json({ results });
});
