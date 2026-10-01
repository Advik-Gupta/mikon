import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { endSession, handler, HttpError, requireUser } from "@/lib/server/http";
import { env } from "@/lib/server/env";
import { SESSION_COOKIE, sessionIssuedAt } from "@/lib/server/session";
import { ensureUsername, findUser, publicUser } from "@/lib/server/users";

export const GET = handler(async (req: NextRequest) => {
  const userId = await requireUser(req);
  const found = await findUser(userId);
  if (!found) throw new HttpError(401, "Not signed in");
  const issued = await sessionIssuedAt(req.cookies.get(SESSION_COOKIE)?.value, env.JWT_SECRET);
  if (found.passwordChangedAt && issued && issued * 1000 < found.passwordChangedAt.getTime() - 1000) {
    await endSession();
    throw new HttpError(401, "Your password was changed. Sign in again.");
  }
  const user = await ensureUsername(found);
  const db = await getDb();
  const [profile, programs, custom, logs, measurements] = await Promise.all([
    db.collection("profiles").findOne({ userId }),
    db.collection("programs").find({ userId }).sort({ updatedAt: -1 }).toArray(),
    db.collection("custom_exercises").find({ userId }).sort({ updatedAt: -1 }).toArray(),
    db.collection("logs").find({ userId }).sort({ date: -1 }).limit(3000).toArray(),
    db.collection("measurements").find({ userId }).sort({ date: -1 }).limit(5000).toArray(),
  ]);
  return Response.json(
    {
      user: publicUser(user),
      profile: profile?.profile ?? null,
      draft: profile?.draft ?? null,
      programs: programs.map((p) => p.data),
      customExercises: custom.map((c) => c.data),
      logs: logs.map((l) => l.data),
      measurements: measurements.map((m) => m.data),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
});
