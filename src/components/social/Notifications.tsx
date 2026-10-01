"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Share2, UserCheck, UserPlus } from "lucide-react";
import { apiSend, revalidate, useApi, type UserCard } from "@/lib/api";
import { UserAvatar } from "../shell/Avatar";
import { toast } from "../Toaster";
import { cn } from "../ui";

export interface Notice {
  id: string;
  type: "friend_request" | "friend_accept" | "program_shared";
  title: string;
  body: string;
  url: string;
  read: boolean;
  createdAt: string;
  actor: UserCard | null;
}

const URL_ = "/api/notifications";
const ICON = { friend_request: UserPlus, friend_accept: UserCheck, program_shared: Share2 };

export function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useNotifications() {
  const q = useApi<{ unread: number; items: Notice[] }>(URL_, 30_000);
  const last = useRef<string | null>(null);

  useEffect(() => {
    const refresh = () => document.visibilityState === "visible" && revalidate(URL_);
    const t = setInterval(refresh, 45_000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const newest = q.data?.items[0];
  useEffect(() => {
    if (!newest) return;
    if (last.current && newest.id !== last.current && !newest.read) toast({ tone: "info", title: newest.title, message: newest.body });
    last.current = newest.id;
  }, [newest]);

  const markRead = () => {
    if (!q.data?.unread) return;
    apiSend("PATCH", URL_).then(() => revalidate(URL_));
  };
  return { ...q, markRead };
}

export function NoticeList({ items, onPick }: { items: Notice[]; onPick?: () => void }) {
  if (!items.length) return <p className="px-4 py-10 text-center text-sm text-muted">You&apos;re all caught up.</p>;
  return (
    <ul className="divide-y divide-line">
      {items.map((n) => {
        const Icon = ICON[n.type] ?? Bell;
        return (
          <li key={n.id}>
            <Link href={n.url} onClick={onPick} className={cn("flex gap-3 px-4 py-3 transition hover:bg-surface-2", !n.read && "bg-accent/[0.04]")}>
              <span className="relative shrink-0">
                {n.actor ? <UserAvatar name={n.actor.name} src={n.actor.avatarUrl} size={40} /> : <span className="flex size-10 rounded-full bg-surface-3" />}
                <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-surface bg-accent text-accent-ink">
                  <Icon className="size-2.5" strokeWidth={3} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm leading-snug">{n.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">{n.body}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-[11px] text-faint">{timeAgo(n.createdAt)}</span>
                {!n.read && <span className="size-2 rounded-full bg-accent" />}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function NotificationBell() {
  const { data, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const unread = data?.unread ?? 0;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  const toggle = () => {
    if (window.innerWidth < 768) return router.push("/notifications");
    setOpen((o) => !o);
    if (!open) setTimeout(markRead, 1200);
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggle} className="relative rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
        <Bell className="size-[18px]" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-4 text-accent-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-50 w-96 overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)]"
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs text-muted hover:text-ink">
                See all
              </Link>
            </div>
            <div className="scrollbar-thin max-h-[420px] overflow-y-auto">
              <NoticeList items={data?.items.slice(0, 12) ?? []} onPick={() => setOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
