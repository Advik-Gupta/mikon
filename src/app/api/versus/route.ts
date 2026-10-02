import type { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { cached } from "@/lib/server/admin";
import { handler, requireUser } from "@/lib/server/http";
import { canSee, cardsFor, friendIds } from "@/lib/server/social";
import { DEFAULT_PRIVACY, users } from "@/lib/server/users";
import { bestAndGain, exerciseCounts, exerciseMetric, recentLogs, totals } from "@/lib/server/versus";

async function versus(me: string) {
  const friends = await friendIds(me);
  const docs = await (await users()).find({ _id: { $in: friends.map((id) => new ObjectId(id)) } }, { projection: { privacy: 1 } }).toArray();
  const open = docs.filter((u) => canSee({ ...DEFAULT_PRIVACY, ...u.privacy }.progress, "friends")).map((u) => u._id.toHexString()).slice(0, 30);
  const ids = [me, ...open];
  const [byUser, cards] = await Promise.all([recentLogs(ids), cardsFor(ids)]);
  const logsOf = (id: string) => byUser.get(id) ?? [];

  const players = ids.flatMap((id) => {
    const user = cards.get(id);
    return user ? [{ user, self: id === me, ...totals(logsOf(id)) }] : [];
  });

  const mine = exerciseCounts(logsOf(me));
  const counts = new Map(open.map((id) => [id, exerciseCounts(logsOf(id))]));
  const shared = [...mine.keys()]
    .map((exerciseId) => ({ exerciseId, rivals: open.filter((id) => counts.get(id)!.has(exerciseId)).length, n: mine.get(exerciseId)! }))
    .filter((x) => x.rivals > 0)
    .sort((a, b) => b.rivals - a.rivals || b.n - a.n)
    .slice(0, 12);

  const lifts = shared.map(({ exerciseId }) => {
    const metric = exerciseMetric(ids.map(logsOf), exerciseId);
    const ranks = ids
      .flatMap((id) => {
        const r = bestAndGain(logsOf(id), exerciseId, metric);
        return r ? [{ userId: id, ...r }] : [];
      })
      .sort((a, b) => b.best - a.best);
    return { exerciseId, metric, ranks };
  });

  const gains = lifts
    .flatMap((l) => l.ranks.filter((r) => r.sessions >= 3 && r.first > 0 && r.last > r.first).map((r) => ({ userId: r.userId, exerciseId: l.exerciseId, metric: l.metric, from: r.first, to: r.last, pct: Math.round(((r.last - r.first) / r.first) * 100) })))
    .sort((a, b) => b.pct - a.pct);
  const seen = new Set<string>();
  const improved = gains.filter((g) => !seen.has(g.userId) && seen.add(g.userId)).slice(0, 5);

  return { players, lifts: lifts.slice(0, 4), improved, hidden: friends.length - open.length, friends: friends.length };
}

export const GET = handler(async (req: NextRequest) => {
  const me = await requireUser(req);
  return Response.json(await cached(`versus:${me}`, 2 * 60_000, () => versus(me)), { headers: { "Cache-Control": "no-store" } });
});
