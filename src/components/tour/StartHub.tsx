"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Compass, Dumbbell, Layers, Sparkles, User } from "lucide-react";
import { displayName } from "@/lib/body";
import { setTutorial, useProfile, useSessionUser } from "@/lib/storage";
import { openStartSheet } from "@/lib/tracker";
import { Sheet } from "../tracker/Sheet";
import { cn } from "../ui";

const CHOICES = [
  { id: "program", icon: Layers, title: "Build a training program", body: "Plan your weeks around your goals. Mikon tracks volume and fatigue as you go.", recommended: true },
  { id: "workout", icon: Dumbbell, title: "Start a workout now", body: "Jump straight in with an empty workout and log as you train." },
  { id: "explore", icon: Compass, title: "Explore muscles and exercises", body: "Tap through the body map and a library of 900+ exercises." },
  { id: "profile", icon: User, title: "Set up my profile", body: "Add a photo, pick a username and choose what friends can see." },
] as const;

export function StartHub() {
  const user = useSessionUser();
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const g = user?.tutorial.guides ?? [];
  const open = !!user && !!profile && !user.tutorial.done && g.includes("early-days") && g.includes("import-asked") && !g.includes("start-hub") && pathname !== "/import";

  const pick = (id?: (typeof CHOICES)[number]["id"]) => {
    if (!user) return;
    setTutorial({ ...user.tutorial, done: true, guides: [...g, "start-hub"] });
    if (id === "program") router.push("/programs/new");
    if (id === "workout") setTimeout(openStartSheet, 350);
    if (id === "explore") router.push("/explorer");
    if (id === "profile") router.push("/profile");
  };

  return (
    <Sheet open={open} onClose={() => pick()}>
      <div className="px-5 pb-6 pt-2">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <Sparkles className="size-6" />
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">Where do you want to start{profile ? `, ${displayName(profile)}` : ""}?</h2>
        <p className="mt-1.5 text-sm text-muted">Pick whatever feels right. We&apos;ll show you around wherever you go, and you can do the rest later.</p>
        <div className="mt-5 space-y-2">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              className={cn(
                "flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition active:scale-[0.99]",
                "recommended" in c && c.recommended ? "border-accent/50 bg-accent/[0.07]" : "border-line bg-surface-2/50 hover:border-line-strong",
              )}
            >
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", "recommended" in c && c.recommended ? "bg-accent text-accent-ink" : "bg-surface-3")}>
                <c.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[15px] font-semibold">
                  {c.title}
                  {"recommended" in c && c.recommended && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent-ink">Recommended</span>}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">{c.body}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-faint" />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => pick()} className="mt-3 w-full rounded-2xl py-3 text-sm font-medium text-muted hover:text-ink">
          I&apos;ll look around myself
        </button>
      </div>
    </Sheet>
  );
}
