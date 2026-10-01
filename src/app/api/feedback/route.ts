import type { NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/server/db";
import { assertSameOrigin, handler, rateLimit, readJson, requireUser } from "@/lib/server/http";

const schema = z.object({
  type: z.enum(["bug", "idea"]),
  message: z.string().trim().min(5, "Tell us a little more").max(3000),
  page: z.string().max(200).optional(),
});

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  await rateLimit(`feedback:${userId}`, 10, 3600);
  const body = await readJson(req, schema);
  await (await getDb()).collection("feedback").insertOne({
    userId,
    ...body,
    userAgent: (req.headers.get("user-agent") ?? "").slice(0, 300),
    status: "new",
    createdAt: new Date(),
  });
  return Response.json({ ok: true });
});
