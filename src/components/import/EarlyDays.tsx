"use client";

import { Hammer, MessageSquareHeart, Sprout } from "lucide-react";
import { setTutorial, useProfile, useSessionUser } from "@/lib/storage";
import { openFeedback, ROADMAP } from "../feedback/Feedback";
import { Sheet } from "../tracker/Sheet";
import { Button } from "../ui";

export const EARLY_DAYS = "early-days";

export function EarlyDays() {
  const user = useSessionUser();
  const profile = useProfile();
  const open = !!user && !!profile && !user.tutorial.guides?.includes(EARLY_DAYS);
  const done = (feedback = false) => {
    if (!user) return;
    setTutorial({ ...user.tutorial, guides: [...(user.tutorial.guides ?? []), EARLY_DAYS] });
    if (feedback) setTimeout(openFeedback, 350);
  };

  return (
    <Sheet open={open} onClose={() => done()}>
      <div className="px-5 pb-6 pt-2">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Sprout className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">Mikon is brand new</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Apps like Strong, Hevy and MacroFactor have had years to polish. We&apos;re just getting started, so you might run into rough edges. We ship improvements every week, and a lot of
          what we build comes straight from people like you.
        </p>
        <div className="mt-5 rounded-2xl border border-line bg-surface-2/40 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">
            <Hammer className="size-3.5 text-accent" /> Working on right now
          </p>
          <ul className="mt-3 space-y-2">
            {ROADMAP.map((r) => (
              <li key={r} className="flex items-center gap-2.5 text-sm">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" /> {r}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/[0.07] p-4">
          <MessageSquareHeart className="mt-0.5 size-5 shrink-0 text-accent" />
          <p className="text-sm leading-relaxed">
            Spotted a bug or wish something worked differently? Tap <span className="font-semibold">Feedback</span> in the menu any time. We read every message.
          </p>
        </div>
        <div className="mt-5 grid gap-2">
          <Button className="h-12 rounded-full text-[15px]" onClick={() => done()}>
            Let&apos;s go
          </Button>
          <Button variant="ghost" className="h-11" onClick={() => done(true)}>
            I already have an idea
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
