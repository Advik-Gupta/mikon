"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Megaphone, X } from "lucide-react";
import { useApi } from "@/lib/api";
import { cn } from "../ui";

interface Item {
  id: string;
  title: string;
  body: string;
  tone: "info" | "success" | "warn";
  link: string | null;
}

const KEY = "mikon.dismissed-announcements";
const read = () => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
  } catch {
    return new Set<string>();
  }
};

const TONE = { info: "border-info/40 bg-info/10", success: "border-accent/40 bg-accent/10", warn: "border-warn/40 bg-warn/10" };

export function AnnouncementBar() {
  const { data } = useApi<{ items: Item[] }>("/api/announcements", 120_000);
  const [dismissed, setDismissed] = useState<Set<string>>(() => (typeof window === "undefined" ? new Set() : read()));
  const item = data?.items.find((a) => !dismissed.has(a.id));
  const close = (id: string) => {
    const next = new Set(dismissed).add(id);
    setDismissed(next);
    try {
      localStorage.setItem(KEY, JSON.stringify([...next].slice(-50)));
    } catch {}
  };
  return (
    <AnimatePresence>
      {item && (
        <motion.div key={item.id} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="shrink-0 overflow-hidden">
          <div className={cn("mx-3 mt-2 flex items-start gap-3 rounded-2xl border px-3.5 py-2.5 text-sm md:mx-6", TONE[item.tone])}>
            <Megaphone className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.title}</p>
              {item.body && <p className="mt-0.5 text-xs text-ink/80">{item.body}</p>}
              {item.link && (
                <Link href={item.link} className="mt-1 inline-block text-xs font-medium underline">
                  Learn more
                </Link>
              )}
            </div>
            <button type="button" onClick={() => close(item.id)} className="rounded-lg p-1 text-muted hover:text-ink" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
