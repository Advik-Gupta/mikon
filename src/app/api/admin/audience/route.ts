import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/server/db";
import { handler, requireAdmin } from "@/lib/server/http";
import { cached, daysAgo } from "@/lib/server/admin";
import { CARD_FIELDS, userCard, users } from "@/lib/server/users";

const FIELDS = ["browser", "os", "device", "standalone", "screen", "lang", "tz", "push"] as const;

async function audience() {
  const db = await getDb();
  const col = db.collection("users");
  const facet = Object.fromEntries(FIELDS.map((f) => [f, [{ $group: { _id: `$client.${f}`, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 10 }]]));
  const [[breakdown], reported, total, referred, top] = await Promise.all([
    col.aggregate([{ $match: { client: { $exists: true } } }, { $facet: facet }]).toArray(),
    col.countDocuments({ client: { $exists: true } }),
    col.countDocuments(),
    col.countDocuments({ referredBy: { $exists: true } }),
    col
      .aggregate([
        { $match: { referredBy: { $exists: true } } },
        {
          $group: {
            _id: "$referredBy",
            invited: { $sum: 1 },
            friends: { $sum: { $cond: [{ $eq: ["$invite.status", "accepted"] }, 1, 0] } },
            active: { $sum: { $cond: [{ $gte: ["$lastActiveAt", daysAgo(29)] }, 1, 0] } },
            last: { $max: "$createdAt" },
          },
        },
        { $sort: { invited: -1, last: -1 } },
        { $limit: 15 },
      ])
      .toArray(),
  ]);
  const ids = top.map((t) => new ObjectId(t._id as string));
  const cards = new Map((await (await users()).find({ _id: { $in: ids } }, { projection: CARD_FIELDS }).toArray()).map((u) => [u._id.toHexString(), userCard(u)]));
  const rows = (f: string) =>
    ((breakdown?.[f] ?? []) as { _id: unknown; n: number }[]).map((r) => ({
      name: f === "standalone" ? (r._id ? "Installed app" : "Browser tab") : String(r._id ?? "unknown"),
      value: r.n,
    }));
  return {
    reported,
    total,
    referred,
    breakdown: Object.fromEntries(FIELDS.map((f) => [f, rows(f)])),
    referrers: top.flatMap((t) => {
      const user = cards.get(t._id as string);
      return user ? [{ user, invited: t.invited as number, friends: t.friends as number, active: t.active as number, last: t.last as Date }] : [];
    }),
    generatedAt: new Date().toISOString(),
  };
}

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  return Response.json(await cached(`audience${fresh ? `:${Date.now()}` : ""}`, 5 * 60_000, audience), { headers: { "Cache-Control": "no-store" } });
});
