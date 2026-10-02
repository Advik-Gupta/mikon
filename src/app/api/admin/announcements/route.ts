import { after, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/server/db";
import { assertSameOrigin, handler, readJson, requireAdmin } from "@/lib/server/http";
import { clearCache, paging } from "@/lib/server/admin";
import { sendPush } from "@/lib/server/push";

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(1000).default(""),
  tone: z.enum(["info", "success", "warn"]).default("info"),
  link: z.string().trim().max(300).regex(/^(\/|https:\/\/)/, "Links must start with / or https://").nullable().default(null),
  until: z.string().datetime().nullable().default(null),
  push: z.boolean().default(true),
});

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const { page, pageSize } = paging(req);
  const col = (await getDb()).collection("announcements");
  const [total, rows] = await Promise.all([col.countDocuments(), col.find().sort({ createdAt: -1 }).skip(page * pageSize).limit(pageSize).toArray()]);
  return Response.json({ total, rows: rows.map(({ _id, ...r }) => ({ id: _id.toHexString(), ...r })) });
});

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const me = await requireAdmin(req);
  const a = await readJson(req, schema);
  const db = await getDb();
  await db.collection("announcements").insertOne({
    title: a.title,
    body: a.body,
    tone: a.tone,
    link: a.link,
    until: a.until ? new Date(a.until) : null,
    active: true,
    createdBy: me,
    createdAt: new Date(),
  });
  clearCache("announcements");
  let pushed = 0;
  if (a.push) {
    const ids = (await db.collection("push_subscriptions").distinct("userId")) as string[];
    const payload = { title: a.title, body: a.body || "Open Mikon to see what's new.", url: a.link ?? "/", tag: "announcement" };
    after(async () => {
      for (let i = 0; i < ids.length; i += 20) await Promise.all(ids.slice(i, i + 20).map((id) => sendPush(id, payload).catch(() => null)));
    });
    pushed = ids.length;
  }
  return Response.json({ ok: true, pushed });
});
