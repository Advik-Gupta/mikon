import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { handler, HttpError, requireUser } from "@/lib/server/http";
import { findUser, publicUser } from "@/lib/server/users";

export const GET = handler(async (req: NextRequest) => {
  const userId = await requireUser(req);
  const user = await findUser(userId);
  if (!user) throw new HttpError(401, "Not signed in");
  const db = await getDb();
  const [profile, programs, custom] = await Promise.all([
    db.collection("profiles").findOne({ userId }),
    db.collection("programs").find({ userId }).sort({ updatedAt: -1 }).toArray(),
    db.collection("custom_exercises").find({ userId }).sort({ updatedAt: -1 }).toArray(),
  ]);
  return Response.json(
    {
      user: publicUser(user),
      profile: profile?.profile ?? null,
      draft: profile?.draft ?? null,
      programs: programs.map((p) => p.data),
      customExercises: custom.map((c) => c.data),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
