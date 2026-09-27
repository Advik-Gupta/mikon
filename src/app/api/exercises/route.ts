import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { env } from "@/lib/server/env";
import { handler, requireUser } from "@/lib/server/http";

export const GET = handler(async (req: NextRequest) => {
  await requireUser(req);
  const exercises = await (await getDb()).collection("exercises").find({}, { projection: { _id: 0 } }).sort({ name: 1 }).toArray();
  return Response.json(
    { imageBase: env.NEXT_PUBLIC_EXERCISE_IMAGE_BASE, exercises },
    { headers: { "Cache-Control": "private, max-age=300" } },
  );
});
