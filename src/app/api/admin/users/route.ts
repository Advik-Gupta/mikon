import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { handler, requireAdmin } from "@/lib/server/http";
import { escapeRegex, paging } from "@/lib/server/admin";

const SORTS = new Set(["createdAt", "lastActiveAt", "name", "email", "username", "role"]);

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const { page, pageSize, sort, dir, q } = paging(req);
  const role = req.nextUrl.searchParams.get("role");
  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (q) filter.$or = ["name", "email", "username"].map((f) => ({ [f]: { $regex: escapeRegex(q), $options: "i" } }));
  if (role === "admin" || role === "user") filter.role = role === "admin" ? "admin" : { $ne: "admin" };
  const col = db.collection("users");
  const [total, rows] = await Promise.all([
    col.countDocuments(filter),
    col
      .find(filter, { projection: { passwordHash: 0, tutorial: 0, privacy: 0 } })
      .sort({ [sort && SORTS.has(sort) ? sort : "createdAt"]: dir === "asc" ? 1 : -1 })
      .skip(page * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);
  const ids = rows.map((u) => u._id.toHexString());
  const count = (c: string) => db.collection(c).aggregate([{ $match: { userId: { $in: ids } } }, { $group: { _id: "$userId", n: { $sum: 1 } } }]).toArray();
  const [logs, programs, measurements] = await Promise.all([count("logs"), count("programs"), count("measurements")]);
  const m = (list: { _id: unknown; n: number }[]) => new Map(list.map((x) => [x._id as string, x.n]));
  const [lm, pm, mm] = [m(logs as never), m(programs as never), m(measurements as never)];
  return Response.json({
    total,
    rows: rows.map((u) => {
      const id = u._id.toHexString();
      return {
        id,
        name: u.name,
        email: u.email,
        username: u.username,
        avatarUrl: u.avatarUrl ?? null,
        role: u.role === "admin" ? "admin" : "user",
        createdAt: u.createdAt,
        lastActiveAt: u.lastActiveAt ?? null,
        workouts: lm.get(id) ?? 0,
        programs: pm.get(id) ?? 0,
        measurements: mm.get(id) ?? 0,
      };
    }),
  });
});
