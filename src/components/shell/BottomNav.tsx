"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Compass, Dumbbell, Layers, LayoutGrid, Users } from "lucide-react";
import { useApi } from "@/lib/api";
import { openStartSheet, updateWorkout, useActiveWorkout } from "@/lib/tracker";
import { cn } from "../ui";

const TABS = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/programs", label: "Programs", icon: Layers },
  { href: "/workout", label: "Train", icon: Dumbbell, center: true },
  { href: "/explorer", label: "Explore", icon: Compass },
  { href: "/friends", label: "Friends", icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();
  const requests = useApi<{ incoming: unknown[] }>("/api/friends", 60_000).data?.incoming.length ?? 0;
  const workout = useActiveWorkout();
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav data-tour="nav" className="shrink-0 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Main">
      <div className="grid h-16 grid-cols-5">
        {TABS.map((t) => {
          const on = active(t.href);
          if (t.center)
            return (
              <button
                key={t.href}
                type="button"
                data-tour="train"
                onClick={() => (workout ? updateWorkout((w) => ({ ...w, minimized: false })) : openStartSheet())}
                className="flex flex-col items-center justify-center"
                aria-label={workout ? "Resume workout" : "Start workout"}
              >
                <span className="relative flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-ink shadow-[0_8px_20px_-8px_rgb(198_244_50/0.6)] transition active:scale-90">
                  <t.icon className="size-5" strokeWidth={2.4} />
                  {workout && <span className="absolute -right-1 -top-1 size-3 animate-pulse rounded-full bg-danger ring-2 ring-bg" />}
                </span>
              </button>
            );
          return (
            <Link key={t.href} href={t.href} className={cn("relative flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition", on ? "text-ink" : "text-faint")}>
              {on && <motion.span layoutId="tab-active" className="absolute top-0 h-0.5 w-8 rounded-full bg-accent" />}
              <span className="relative">
                <t.icon className={cn("size-[22px]", on && "text-accent")} strokeWidth={on ? 2.3 : 1.9} />
                {t.href === "/friends" && requests > 0 && (
                  <span className="absolute -right-2 -top-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold leading-4 text-accent-ink">{requests}</span>
                )}
              </span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
