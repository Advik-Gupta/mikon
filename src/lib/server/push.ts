import "server-only";
import webpush from "web-push";
import { getDb } from "./db";
import { env } from "./env";

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
}

const enabled = !!(env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);
if (enabled) webpush.setVapidDetails(env.VAPID_SUBJECT ?? "mailto:admin@example.com", env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!);

export async function sendPush(userId: string, payload: PushPayload) {
  if (!enabled) return;
  const db = await getDb();
  const subs = await db.collection("push_subscriptions").find({ userId }).toArray();
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.collection("push_subscriptions").deleteOne({ endpoint: s.endpoint });
      }
    }),
  );
}
