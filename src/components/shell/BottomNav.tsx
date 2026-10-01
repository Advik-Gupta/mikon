"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { openFeedback } from "../feedback/Feedback";
import { Bell, MessageSquareHeart, ShieldCheck, Compass, Download, Dumbbell, Ellipsis, History, Layers, LayoutGrid, LogOut, Ruler, User, Users } from "lucide-react";
import { useApi } from "@/lib/api";
import { logout, useSessionUser } from "@/lib/storage";
import { openStartSheet, updateWorkout, useActiveWorkout } from "@/lib/tracker";
import { Sheet } from "../tracker/Sheet";
import { cn } from "../ui";

const TABS = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/history", label: "History", icon: History },
  { href: "#train", label: "Train", icon: Dumbbell },
  { href: "/body", label: "Body", icon: Ruler },
];

const MORE = [
  { href: "/programs", label: "Programs", icon: Layers, hint: "Build and run your training" },
  { href: "/explorer", label: "Explorer", icon: Compass, hint: "Muscles and exercises" },
  { href: "/friends", label: "Friends", icon: Users, hint: "Train together and compare" },
  { href: "/notifications", label: "Notifications", icon: Bell, hint: "Requests and shares" },
  { href: "/profile", label: "Profile", icon: User, hint: "Account, privacy and photo" },
  { href: "/import", label: "Import & export", icon: Download, hint: "Move your history in or out" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [more, setMore] = useState(false);
  const requests = useApi<{ incoming: unknown[] }>("/api/friends", 60_000).data?.incoming.length ?? 0;
  const unread = useApi<{ unread: number }>("/api/notifications", 30_000).data?.unread ?? 0;
  const workout = useActiveWorkout();
  const user = useSessionUser();
  const items = user?.role === "admin" ? [...MORE, { href: "/admin", label: "Admin", icon: ShieldCheck, hint: "Stats and announcements" }] : MORE;
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const moreActive = MORE.some((m) => active(m.href)) || pathname.startsWith("/u/") || pathname.startsWith("/exercises/");
  const badge = requests + unread;

  const tab = (on: boolean, icon: typeof LayoutGrid, label: string, extra?: number) => {
    const Icon = icon;
    return (
      <>
        {on && <motion.span layoutId="tab-active" className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />}
        <span className="relative">
          <Icon className={cn("size-[23px]", on && "text-accent")} strokeWidth={on ? 2.3 : 1.9} />
          {!!extra && <span className="absolute -right-2 -top-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-4 text-accent-ink">{extra > 9 ? "9+" : extra}</span>}
        </span>
        {label}
      </>
    );
  };

  return (
    <>
      <nav
        data-tour="nav"
        className="tab-bar shrink-0 border-t border-line bg-bg/95 pb-[max(calc(env(safe-area-inset-bottom)-12px),4px)] backdrop-blur-xl md:hidden"
        aria-label="Main"
      >
        <div className="grid h-[54px] grid-cols-5">
          {TABS.map((t) =>
            t.href === "#train" ? (
              <button
                key={t.href}
                type="button"
                data-tour="train"
                onClick={() => (workout ? updateWorkout((w) => ({ ...w, minimized: false })) : openStartSheet())}
                className="flex items-center justify-center"
                aria-label={workout ? "Resume workout" : "Start workout"}
              >
                <span className="relative -mt-3 flex size-[52px] items-center justify-center rounded-2xl bg-accent text-accent-ink shadow-[0_8px_24px_-8px_rgb(198_244_50/0.7)] transition active:scale-90">
                  <t.icon className="size-6" strokeWidth={2.4} />
                  {workout && <span className="absolute -right-1 -top-1 size-3 animate-pulse rounded-full bg-danger ring-2 ring-bg" />}
                </span>
              </button>
            ) : (
              <Link key={t.href} href={t.href} className={cn("relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition", active(t.href) ? "text-ink" : "text-faint")}>
                {tab(active(t.href), t.icon, t.label)}
              </Link>
            ),
          )}
          <button type="button" onClick={() => setMore(true)} className={cn("relative flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium", moreActive ? "text-ink" : "text-faint")}>
            {tab(moreActive, Ellipsis, "More", badge)}
          </button>
        </div>
      </nav>
      <Sheet open={more} onClose={() => setMore(false)} title="More">
        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
          {items.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              onClick={() => setMore(false)}
              className={cn("relative flex flex-col gap-2 rounded-2xl border p-4 transition active:scale-[0.98]", active(m.href) ? "border-accent/50 bg-accent/10" : "border-line bg-surface-2/50")}
            >
              <m.icon className="size-6 text-accent" />
              <span className="text-[15px] font-semibold leading-tight">{m.label}</span>
              <span className="text-[11px] leading-snug text-muted">{m.hint}</span>
              {m.href === "/friends" && requests > 0 && <span className="absolute right-3 top-3 rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">{requests}</span>}
              {m.href === "/notifications" && unread > 0 && <span className="absolute right-3 top-3 rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">{unread}</span>}
            </Link>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            setMore(false);
            openFeedback();
          }}
          className="mx-4 mb-2 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-2xl border border-line py-3 text-sm font-medium active:bg-surface-2"
        >
          <MessageSquareHeart className="size-4 text-accent" /> Report a bug or suggest a feature
        </button>
        <button type="button" onClick={logout} className="mx-4 mb-5 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-2xl py-3 text-sm text-muted active:bg-surface-2">
          <LogOut className="size-4" /> Log out
        </button>
      </Sheet>
    </>
  );
}
