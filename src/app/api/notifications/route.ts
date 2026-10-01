import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { assertSameOrigin, handler, requireUser } from "@/lib/server/http";
import { cardsFor } from "@/lib/server/social";

export const GET = handler(async (req: NextRequest) => {
  const me = await requireUser(req);
  const db = await getDb();
  const [list, unread] = await Promise.all([
    db.collection("notifications").find({ userId: me }).sort({ createdAt: -1 }).limit(50).toArray(),
    db.collection("notifications").countDocuments({ userId: me, read: false }),
  ]);
  const cards = await cardsFor([...new Set(list.map((n) => n.actorId))]);
  return Response.json(
    {
      unread,
      items: list.map((n) => ({ id: n._id.toHexString(), type: n.type, title: n.title, body: n.body, url: n.url, read: n.read, createdAt: n.createdAt, actor: cards.get(n.actorId) ?? null })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});

export const PATCH = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const me = await requireUser(req);
  await (await getDb()).collection("notifications").updateMany({ userId: me, read: false }, { $set: { read: true } });
  return Response.json({ ok: true });
});
