"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Dumbbell, PersonStanding } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../ui";

const TABS = [
  { href: "/explorer", label: "Muscles", icon: PersonStanding },
  { href: "/explorer/exercises", label: "Exercises", icon: Dumbbell },
];

export function ExplorerTabs({ right }: { right?: ReactNode }) {
  const pathname = usePathname();
  return (
    <div data-tour="explorer-tabs" className="flex h-12 shrink-0 items-center gap-1 border-b border-line px-4 sm:px-6">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn("relative flex h-full items-center gap-2 px-3 text-sm transition", active ? "text-ink" : "text-muted hover:text-ink")}
          >
            <t.icon className={cn("size-4", active && "text-accent")} />
            {t.label}
            {active && <motion.span layoutId="explorer-tab" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
          </Link>
        );
      })}
      <div className="ml-auto">{right}</div>
    </div>
  );
}
