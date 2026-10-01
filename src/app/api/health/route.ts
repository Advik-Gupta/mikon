import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { envProblems } from "@/lib/server/env";
import { clientIp, rateLimit } from "@/lib/server/http";

export async function GET(req: NextRequest) {
  const env = envProblems();
  let db = "skipped";
  if (!env.length) {
    try {
      await rateLimit(`health:${clientIp(req)}`, 20, 60);
      await (await getDb()).command({ ping: 1 });
      db = "ok";
    } catch (e) {
      db = (e as Error).name === "MongoServerSelectionError" ? "unreachable (check Atlas network access)" : "error";
    }
  }
  const ok = !env.length && db === "ok";
  return Response.json({ ok, env: env.length ? env : "ok", db }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
