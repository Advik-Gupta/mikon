import type { NextRequest } from "next/server";
import { UTApi } from "uploadthing/server";
import { getDb } from "@/lib/server/db";
import { handler, requireAdmin } from "@/lib/server/http";
import { cached } from "@/lib/server/admin";

const COLLECTIONS = ["profiles", "programs", "custom_exercises", "logs", "measurements", "notifications"];

async function storage() {
  const db = await getDb();
  const ut = new UTApi();
  const [usage, files, stats, perCollection] = await Promise.all([
    ut.getUsageInfo().catch(() => null),
    ut.listFiles({ limit: 500 }).catch(() => null),
    db.command({ dbStats: 1, scale: 1 }).catch(() => null),
    Promise.all(
      COLLECTIONS.map((c) =>
        db
          .collection(c)
          .aggregate([{ $group: { _id: "$userId", bytes: { $sum: { $bsonSize: "$$ROOT" } }, docs: { $sum: 1 } } }])
          .toArray()
          .then((rows) => rows.map((r) => ({ c, userId: r._id as string, bytes: r.bytes as number, docs: r.docs as number })))
          .catch(() => []),
      ),
    ),
  ]);
  const users = await db.collection("users").find({}, { projection: { name: 1, username: 1, email: 1, avatarKey: 1 } }).toArray();
  const fileSize = new Map((files?.files ?? []).map((f) => [f.key, f.size]));
  const per = new Map<string, { mongo: number; docs: number; avatar: number; byCollection: Record<string, number> }>();
  for (const row of perCollection.flat()) {
    const e = per.get(row.userId) ?? { mongo: 0, docs: 0, avatar: 0, byCollection: {} };
    e.mongo += row.bytes;
    e.docs += row.docs;
    e.byCollection[row.c] = row.bytes;
    per.set(row.userId, e);
  }
  const rows = users
    .map((u) => {
      const id = u._id.toHexString();
      const e = per.get(id) ?? { mongo: 0, docs: 0, avatar: 0, byCollection: {} };
      return { id, name: u.name, username: u.username, email: u.email, mongoBytes: e.mongo, docs: e.docs, avatarBytes: u.avatarKey ? (fileSize.get(u.avatarKey) ?? 0) : 0, byCollection: e.byCollection };
    })
    .sort((a, b) => b.mongoBytes + b.avatarBytes - (a.mongoBytes + a.avatarBytes));
  const known = new Set(users.map((u) => u.avatarKey).filter(Boolean));
  const orphans = (files?.files ?? []).filter((f) => !known.has(f.key));
  return {
    uploadthing: usage
      ? { usedBytes: usage.appTotalBytes, limitBytes: usage.limitBytes, files: usage.filesUploaded, orphanFiles: orphans.length, orphanBytes: orphans.reduce((a, f) => a + f.size, 0) }
      : null,
    mongo: stats ? { dataBytes: stats.dataSize, storageBytes: stats.storageSize, indexBytes: stats.indexSize, limitBytes: 512 * 1024 * 1024, objects: stats.objects } : null,
    users: rows,
    generatedAt: new Date().toISOString(),
  };
}

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  return Response.json(await cached(`storage${fresh ? `:${Date.now()}` : ""}`, 10 * 60_000, storage), { headers: { "Cache-Control": "no-store" } });
});
