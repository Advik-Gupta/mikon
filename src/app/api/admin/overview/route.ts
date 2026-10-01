import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { handler, requireAdmin } from "@/lib/server/http";
import { cached, dayKeys, daysAgo } from "@/lib/server/admin";

async function overview() {
  const db = await getDb();
  const since30 = daysAgo(29);
  const since14 = daysAgo(13);
  const days30 = dayKeys(30);
  const today = days30.at(-1)!;
  const [
    users,
    admins,
    signups,
    activeDays,
    dau,
    wau,
    mau,
    logs,
    logsByDay,
    setsAgg,
    programs,
    activePrograms,
    measurements,
    friendships,
    shares,
    feedbackNew,
    pushSubs,
    sources,
    topExercises,
    reqByDay,
    routes,
    devices,
    retention,
  ] = await Promise.all([
    db.collection("users").countDocuments(),
    db.collection("users").countDocuments({ role: "admin" }),
    db.collection("users").aggregate([{ $match: { createdAt: { $gte: since30 } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } }]).toArray(),
    db.collection("user_days").aggregate([{ $match: { day: { $gte: days30[0] } } }, { $group: { _id: "$day", n: { $sum: 1 } } }]).toArray(),
    db.collection("user_days").countDocuments({ day: today }),
    db.collection("user_days").distinct("userId", { day: { $gte: days30[23] } }).then((x) => x.length),
    db.collection("user_days").distinct("userId", { day: { $gte: days30[0] } }).then((x) => x.length),
    db.collection("logs").countDocuments(),
    db.collection("logs").aggregate([{ $match: { date: { $gte: days30[0] } } }, { $group: { _id: "$date", n: { $sum: 1 } } }]).toArray(),
    db
      .collection("logs")
      .aggregate([{ $project: { s: { $sum: { $map: { input: "$data.exercises", as: "e", in: { $size: "$$e.sets" } } } } } }, { $group: { _id: null, n: { $sum: "$s" } } }])
      .toArray(),
    db.collection("programs").countDocuments(),
    db.collection("programs").countDocuments({ "data.activeFrom": { $nin: [null, ""] } }),
    db.collection("measurements").countDocuments(),
    db.collection("friendships").countDocuments({ status: "accepted" }),
    db.collection("shares").countDocuments(),
    db.collection("feedback").countDocuments({ status: "new" }),
    db.collection("push_subscriptions").countDocuments(),
    db.collection("logs").aggregate([{ $group: { _id: { $ifNull: ["$data.source", "mikon"] }, n: { $sum: 1 } } }]).toArray(),
    db.collection("logs").aggregate([{ $unwind: "$exerciseIds" }, { $group: { _id: "$exerciseIds", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 10 }]).toArray(),
    db
      .collection("request_logs")
      .aggregate([
        { $match: { ts: { $gte: since14 } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$ts" } }, n: { $sum: 1 }, errors: { $sum: { $cond: [{ $gte: ["$status", 500] }, 1, 0] } }, ms: { $avg: "$ms" } } },
      ])
      .toArray(),
    db
      .collection("request_logs")
      .aggregate([{ $match: { ts: { $gte: since14 } } }, { $group: { _id: "$path", n: { $sum: 1 }, ms: { $avg: "$ms" }, errors: { $sum: { $cond: [{ $gte: ["$status", 400] }, 1, 0] } } } }, { $sort: { n: -1 } }, { $limit: 12 }])
      .toArray(),
    db.collection("request_logs").aggregate([{ $match: { ts: { $gte: since14 } } }, { $group: { _id: "$device", n: { $sum: 1 } } }]).toArray(),
    db
      .collection("users")
      .aggregate([
        { $match: { createdAt: { $lte: daysAgo(7) } } },
        { $group: { _id: null, total: { $sum: 1 }, back: { $sum: { $cond: [{ $gte: ["$lastActiveAt", daysAgo(7)] }, 1, 0] } } } },
      ])
      .toArray(),
  ]);
  const map = (rows: { _id: string; n: number }[]) => new Map(rows.map((r) => [r._id, r.n]));
  const sMap = map(signups as never);
  const aMap = map(activeDays as never);
  const lMap = map(logsByDay as never);
  const rMap = new Map(reqByDay.map((r) => [r._id as string, r]));
  return {
    kpis: {
      users,
      admins,
      dau,
      wau,
      mau,
      logs,
      sets: setsAgg[0]?.n ?? 0,
      programs,
      activePrograms,
      measurements,
      friendships,
      shares,
      feedbackNew,
      pushSubs,
      newUsers7: days30.slice(-7).reduce((a, d) => a + (sMap.get(d) ?? 0), 0),
      retention7: retention[0]?.total ? Math.round((retention[0].back / retention[0].total) * 100) : null,
    },
    daily: days30.map((d) => ({ day: d.slice(5), signups: sMap.get(d) ?? 0, active: aMap.get(d) ?? 0, workouts: lMap.get(d) ?? 0 })),
    requests: dayKeys(14).map((d) => ({ day: d.slice(5), requests: rMap.get(d)?.n ?? 0, errors: rMap.get(d)?.errors ?? 0, ms: Math.round(rMap.get(d)?.ms ?? 0) })),
    sources: sources.map((s) => ({ name: s._id as string, value: s.n as number })),
    devices: devices.map((s) => ({ name: (s._id as string) ?? "unknown", value: s.n as number })),
    topExercises: topExercises.map((e) => ({ id: e._id as string, n: e.n as number })),
    routes: routes.map((r) => ({ path: r._id as string, n: r.n as number, ms: Math.round(r.ms as number), errors: r.errors as number })),
    generatedAt: new Date().toISOString(),
  };
}

export const GET = handler(async (req: NextRequest) => {
  await requireAdmin(req);
  const fresh = req.nextUrl.searchParams.get("fresh") === "1";
  const data = await cached(`overview${fresh ? `:${Date.now()}` : ""}`, 60_000, overview);
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
});
