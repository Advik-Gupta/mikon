import type { NextRequest } from "next/server";
import { assertSameOrigin, endSession, handler } from "@/lib/server/http";

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  await endSession();
  return Response.json({ ok: true });
});
