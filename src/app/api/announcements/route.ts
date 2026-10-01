import type { NextRequest } from "next/server";
import { handler, requireUser } from "@/lib/server/http";
import { activeAnnouncements } from "@/lib/server/announcements";

export const GET = handler(async (req: NextRequest) => {
  await requireUser(req);
  return Response.json({ items: await activeAnnouncements() }, { headers: { "Cache-Control": "private, max-age=60" } });
});
