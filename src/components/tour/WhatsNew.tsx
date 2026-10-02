"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { setTutorial, useProfile, useSessionUser } from "@/lib/storage";
import { TOUR_VERSION } from "@/lib/tour-version";
import { WHATS_NEW, type NewFeature } from "@/lib/whats-new";
import { Sheet } from "../tracker/Sheet";
import { Button } from "../ui";
import { onboardingDone } from "./Guide";

export function WhatsNew() {
  const user = useSessionUser();
  const profile = useProfile();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const seen = user?.tutorial.version ?? 0;
  const fresh = WHATS_NEW.filter((f) => f.version > seen);
  const open = ready && !!user && !!profile && onboardingDone(user) && fresh.length > 0;

  const done = (f?: NewFeature) => {
    if (!user) return;
    setTutorial({ ...user.tutorial, version: TOUR_VERSION });
    const a = f?.action;
    if (a?.href) router.push(a.href);
    if (a?.event) setTimeout(() => window.dispatchEvent(new Event(a.event!)), 350);
  };

  return (
    <Sheet open={open} onClose={() => done()}>
      <div className="px-5 pb-6 pt-2">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Sparkles className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">New since you were last here</h2>
        <ul className="mt-4 space-y-2">
          {fresh.map((f) => (
            <li key={f.id} className="rounded-2xl border border-line bg-surface-2/50 p-3.5">
              <p className="text-[15px] font-semibold">{f.title}</p>
              <p className="mt-0.5 text-sm leading-snug text-muted">{f.body}</p>
              {f.action && (
                <button type="button" onClick={() => done(f)} className="mt-2 flex items-center gap-1 text-sm font-medium text-accent">
                  {f.action.label} <ArrowRight className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <Button className="mt-5 h-12 w-full rounded-full text-[15px]" onClick={() => done()}>
          Got it
        </Button>
      </div>
    </Sheet>
  );
}
