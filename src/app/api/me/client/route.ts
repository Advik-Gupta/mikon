import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { assertSameOrigin, handler, readJson, requireUser } from "@/lib/server/http";
import { parseUa } from "@/lib/server/ua";
import { users } from "@/lib/server/users";

const schema = z.object({
  standalone: z.boolean(),
  width: z.number().int().min(0).max(20000),
  height: z.number().int().min(0).max(20000),
  lang: z.string().max(20),
  tz: z.string().max(60),
  push: z.enum(["granted", "denied", "default", "unsupported"]),
});

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  const b = await readJson(req, schema);
  const client = {
    ...parseUa(req.headers.get("user-agent") ?? ""),
    standalone: b.standalone,
    screen: `${b.width}x${b.height}`,
    lang: b.lang,
    tz: b.tz,
    push: b.push,
    at: new Date(),
  };
  await (await users()).updateOne({ _id: new ObjectId(userId) }, { $set: { client } });
  return Response.json({ ok: true });
});
