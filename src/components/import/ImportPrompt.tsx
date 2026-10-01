"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { setTutorial, useProfile, useSessionUser } from "@/lib/storage";
import { Sheet } from "../tracker/Sheet";
import { APPS, AppLogo } from "./ImportFlow";

export const IMPORT_ASKED = "import-asked";

export function ImportPrompt() {
  const user = useSessionUser();
  const profile = useProfile();
  const router = useRouter();
  const open = !!user && !!profile && !user.tutorial.guides?.includes(IMPORT_ASKED);
  const answer = (to?: string) => {
    if (!user) return;
    setTutorial({ ...user.tutorial, guides: [...(user.tutorial.guides ?? []), IMPORT_ASKED] });
    if (to) router.push(to);
  };

  return (
    <Sheet open={open} onClose={() => answer()}>
      <div className="px-5 pb-6 pt-2">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Sparkles className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">Do you already track your workouts?</h2>
        <p className="mt-1.5 text-sm text-muted">Bring your whole history across. Every workout, PR and body measurement shows up in Mikon straight away.</p>
        <div className="mt-5 space-y-2">
          {APPS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => answer(`/import?app=${a.id}`)}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-line bg-surface-2/50 px-3.5 py-3 text-left transition active:scale-[0.99] hover:border-line-strong"
            >
              <AppLogo app={a} className="size-10" />
              <span className="flex-1 text-[15px] font-medium">{a.label}</span>
              <ChevronRight className="size-4 text-faint" />
            </button>
          ))}
          <button type="button" onClick={() => answer()} className="flex w-full items-center justify-center rounded-2xl px-4 py-3.5 text-sm font-medium text-muted hover:text-ink">
            I&apos;m new to tracking
          </button>
        </div>
      </div>
    </Sheet>
  );
}
