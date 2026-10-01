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
      const err = e as Error & { codeName?: string; code?: number | string };
      db =
        err.name === "MongoServerSelectionError"
          ? "unreachable (check Atlas network access)"
          : err.codeName === "AtlasError" || err.code === 8000 || err.code === 18
            ? "authentication failed (check the user and password in MONGODB_URI)"
            : `${err.name}${err.codeName ? ` ${err.codeName}` : ""}: ${err.message.replace(/mongodb(\+srv)?:\/\/\S+/g, "<uri>").replace(/[\w.-]+\.mongodb\.net/g, "<host>").slice(0, 160)}`;
    }
  }
  const ok = !env.length && db === "ok";
  return Response.json({ ok, env: env.length ? env : "ok", db }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
