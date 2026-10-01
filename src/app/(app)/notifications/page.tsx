"use client";

import { useEffect } from "react";
import { NoticeList, useNotifications } from "@/components/social/Notifications";
import { PushToggle } from "@/components/pwa/PushToggle";

export default function NotificationsPage() {
  const { data, loading, markRead } = useNotifications();
  const unread = data?.unread ?? 0;

  useEffect(() => {
    if (!unread) return;
    const t = setTimeout(markRead, 1500);
    return () => clearTimeout(t);
  }, [unread, markRead]);

  return (
    <div className="board-grid min-h-full">
      <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 sm:px-8 sm:pt-8">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Notifications</h2>
        <p className="mt-1 text-sm text-muted">Friend requests and programs shared with you.</p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-line bg-surface">
          {loading ? <div className="h-40 animate-pulse" /> : <NoticeList items={data?.items ?? []} />}
        </div>
        <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <PushToggle />
        </div>
      </div>
    </div>
  );
}
