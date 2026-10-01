import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { handler, requireAdmin } from "@/lib/server/http";
import { escapeRegex, paging } from "@/lib/server/admin";

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const { page, pageSize, dir, q } = paging(req);
  const sp = req.nextUrl.searchParams;
  const filter: Record<string, unknown> = {};
  const status = sp.get("status");
  if (status === "error") filter.status = { $gte: 500 };
  else if (status === "client") filter.status = { $gte: 400, $lt: 500 };
  else if (status === "ok") filter.status = { $lt: 400 };
  const method = sp.get("method");
  if (method && /^(GET|POST|PUT|PATCH|DELETE)$/.test(method)) filter.method = method;
  const user = sp.get("userId");
  if (user && /^[a-f0-9]{24}$/.test(user)) filter.userId = user;
  if (q) filter.rawPath = { $regex: escapeRegex(q), $options: "i" };
  const col = (await getDb()).collection("request_logs");
  const [total, rows] = await Promise.all([
    col.countDocuments(filter),
    col.find(filter).sort({ ts: dir === "asc" ? 1 : -1 }).skip(page * pageSize).limit(pageSize).toArray(),
  ]);
  return Response.json({ total, rows: rows.map(({ _id, ...r }) => ({ id: _id.toHexString(), ...r })) });
});
