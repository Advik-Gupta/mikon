"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Check, ChevronRight, X } from "lucide-react";
import { useApi } from "@/lib/api";
import { markGuide } from "@/components/tour/Guide";
import { useLogs, useMeasurements, usePrograms, useSessionUser } from "@/lib/storage";
import { openStartSheet } from "@/lib/tracker";
import { cn } from "../ui";

interface Item {
  id: string;
  title: string;
  body: string;
  done: boolean;
  href?: string;
  action?: () => void;
}

export function Checklist() {
  const user = useSessionUser();
  const programs = usePrograms() ?? [];
  const logs = useLogs() ?? [];
  const measurements = useMeasurements() ?? [];
  const [expanded, setExpanded] = useState(false);
  const friends = useApi<{ friends: unknown[] }>("/api/friends", 60_000).data?.friends;
  if (!user) return null;
  const g = user.tutorial.guides ?? [];
  if (g.includes("checklist-hidden")) return null;

  const items: Item[] = [
    { id: "program", title: "Build a program", body: "Plan your weeks around your goals", done: programs.some((p) => p.status !== "draft"), href: "/programs/new" },
    { id: "workout", title: "Log a workout", body: "Empty, from a program or repeated", done: logs.some((l) => !l.id.startsWith("imp-")), action: () => openStartSheet() },
    { id: "explore", title: "Explore the body map", body: "Tap muscles to find exercises", done: g.includes("explorer"), href: "/explorer" },
    { id: "weight", title: "Log your weight", body: "Track the trend over time", done: measurements.some((m) => m.metric === "weight"), href: "/body/weight" },
    { id: "photo", title: "Add a profile photo", body: "Friends see it on your profile", done: !!user.avatarUrl, href: "/profile" },
    { id: "friend", title: "Add a friend", body: "Compare lifts and share programs", done: (friends?.length ?? 0) > 0, href: "/friends?tab=find" },
  ];
  const count = items.filter((i) => i.done).length;
  if (count === items.length) return null;
  const ordered = [...items.filter((i) => !i.done), ...items.filter((i) => i.done)];
  const visible = expanded ? ordered : ordered.slice(0, 3);

  return (
    <motion.section data-tour="home-checklist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight">Getting started</h3>
          <p className="text-xs text-muted">{count} of {items.length} done · in any order you like</p>
        </div>
        <button type="button" onClick={() => markGuide(user, "checklist-hidden")} className="rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-ink" aria-label="Hide getting started">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <motion.div className="h-full rounded-full bg-accent" initial={false} animate={{ width: `${(count / items.length) * 100}%` }} />
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {visible.map((i) => {
          const inner = (
            <>
              <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full border", i.done ? "border-accent bg-accent text-accent-ink" : "border-line-strong")}>
                {i.done && <Check className="size-4" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block text-sm font-medium", i.done && "text-muted line-through")}>
                  {i.title}
                </span>
                {!i.done && <span className="block truncate text-xs text-muted">{i.body}</span>}
              </span>
              {!i.done && <ChevronRight className="size-4 shrink-0 text-faint" />}
            </>
          );
          const cls = cn("flex w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition", !i.done && "hover:bg-surface-2 active:scale-[0.99]");
          return (
            <li key={i.id}>
              {i.done ? (
                <div className={cls}>{inner}</div>
              ) : i.href ? (
                <Link href={i.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button type="button" onClick={i.action} className={cls}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => setExpanded(!expanded)} className="mt-1 w-full rounded-xl py-2 text-xs font-medium text-muted hover:text-ink">
        {expanded ? "Show less" : `Show all ${items.length}`}
      </button>
    </motion.section>
  );
}
