import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { assertSameOrigin, handler, rateLimit, readJson, requireUser } from "@/lib/server/http";
import { importSchema } from "@/lib/server/schemas";

export const POST = handler(async (req: NextRequest) => {
  assertSameOrigin(req);
  const userId = await requireUser(req);
  await rateLimit(`import:${userId}`, 300, 3600);
  const { logs, measurements, customExercises } = await readJson(req, importSchema);
  const db = await getDb();
  const now = new Date();
  await Promise.all([
    logs.length &&
      db.collection("logs").bulkWrite(
        logs.map((data) => ({
          updateOne: {
            filter: { userId, id: data.id },
            update: { $set: { data, date: data.date, exerciseIds: data.exercises.map((e) => e.exerciseId), updatedAt: now } },
            upsert: true,
          },
        })),
        { ordered: false },
      ),
    measurements.length &&
      db.collection("measurements").bulkWrite(
        measurements.map((data) => ({
          updateOne: { filter: { userId, id: data.id }, update: { $set: { data, metric: data.metric, date: data.date, updatedAt: now } }, upsert: true },
        })),
        { ordered: false },
      ),
    customExercises.length &&
      db.collection("custom_exercises").bulkWrite(
        customExercises.map((data) => ({ updateOne: { filter: { userId, id: data.id }, update: { $set: { data, updatedAt: now } }, upsert: true } })),
        { ordered: false },
      ),
  ]);
  return Response.json({ logs: logs.length, measurements: measurements.length, customExercises: customExercises.length });
});
