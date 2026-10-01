import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/server/db";
import { handler, requireAdmin } from "@/lib/server/http";
import { paging } from "@/lib/server/admin";

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const { page, pageSize } = paging(req);
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  const type = sp.get("type");
  if (type === "bug" || type === "idea") filter.type = type;
  const status = sp.get("status");
  if (status && ["new", "planned", "done", "dismissed"].includes(status)) filter.status = status;
  const db = await getDb();
  const col = db.collection("feedback");
  const [total, rows] = await Promise.all([col.countDocuments(filter), col.find(filter).sort({ createdAt: -1 }).skip(page * pageSize).limit(pageSize).toArray()]);
  const ids = [...new Set(rows.map((r) => r.userId as string))].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const users = await db.collection("users").find({ _id: { $in: ids } }, { projection: { name: 1, username: 1 } }).toArray();
  const byId = new Map(users.map((u) => [u._id.toHexString(), u]));
  return Response.json({
    total,
    rows: rows.map(({ _id, ...r }) => ({ id: _id.toHexString(), ...r, user: byId.get(r.userId) ? { name: byId.get(r.userId)!.name, username: byId.get(r.userId)!.username } : null })),
  });
});
