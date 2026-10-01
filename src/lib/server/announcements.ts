import "server-only";
import { getDb } from "./db";
import { cached } from "./admin";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  tone: "info" | "success" | "warn";
  link: string | null;
  createdAt: string;
}

export const activeAnnouncements = () =>
  cached("announcements:active", 60_000, async () => {
    const now = new Date();
    const list = await (await getDb())
      .collection("announcements")
      .find({ active: true, $or: [{ until: null }, { until: { $gt: now } }] })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();
    return list.map((a): Announcement => ({ id: a._id.toHexString(), title: a.title, body: a.body, tone: a.tone, link: a.link ?? null, createdAt: a.createdAt.toISOString() }));
  });
