"use client";

import { Reorder } from "motion/react";
import { Check, ChevronsDown, ChevronsUp, Flag, GripVertical, Sparkles, TriangleAlert, X } from "lucide-react";
import { GOALS, labelOf } from "@/lib/options";
import { TIERS } from "@/lib/programs";
import { useProfile } from "@/lib/storage";
import type { GoalTier, ProgramGoal } from "@/lib/types";
import { StepHeader } from "../onboarding/StepHeader";
import { cn } from "../ui";
import type { BuilderStepProps } from "./Builder";

const TIER_ORDER: GoalTier[] = ["major", "secondary", "minor"];
const TIER_STYLE: Record<GoalTier, { ring: string; badge: string }> = {
  major: { ring: "border-accent/60", badge: "bg-accent text-accent-ink" },
  secondary: { ring: "border-info/50", badge: "bg-info text-accent-ink" },
  minor: { ring: "border-line-strong", badge: "bg-surface-3 text-ink" },
};

/** Keep goals grouped by tier (major → secondary → minor), preserving order within each tier. */
const sortByTier = (goals: ProgramGoal[]) =>
  TIER_ORDER.flatMap((t) => goals.filter((g) => g.tier === t));

export function GoalsStep({ program, update }: BuilderStepProps) {
  const profile = useProfile();
  const goals = program.goals;
  const setGoals = (next: ProgramGoal[]) => update((p) => ({ ...p, goals: sortByTier(next) }));
  const majors = goals.filter((g) => g.tier === "major").length;
  const profileGoals = profile?.goals.ranked ?? [];
  const missingFromProfile = profileGoals.filter((id) => !goals.some((g) => g.id === id));

  const toggle = (id: string) => {
    if (goals.some((g) => g.id === id)) setGoals(goals.filter((g) => g.id !== id));
    else setGoals([...goals, { id, tier: majors < 2 ? "major" : "secondary" }]);
  };

  const shift = (id: string, by: -1 | 1) =>
    setGoals(
      goals.map((g) => (g.id === id ? { ...g, tier: TIER_ORDER[Math.min(2, Math.max(0, TIER_ORDER.indexOf(g.tier) + by))] } : g)),
    );

  const reorderTier = (tier: GoalTier, ids: string[]) =>
    setGoals(TIER_ORDER.flatMap((t) => (t === tier ? ids.map((id) => ({ id, tier })) : goals.filter((g) => g.tier === t))));

  return (
    <>
      <StepHeader
        icon={Flag}
        eyebrow="Program · Goals"
        title="What should this program achieve?"
        subtitle="Shortlist your goals, then sort them into major focuses, secondary priorities and things to maintain. Order within each group sets the priority."
      />

      {missingFromProfile.length > 0 && (
        <button
          type="button"
          onClick={() => setGoals([...goals, ...missingFromProfile.map((id) => ({ id, tier: "secondary" as const }))])}
          className="mb-6 flex w-full items-center gap-3 rounded-2xl border border-dashed border-accent/40 bg-accent/[0.04] px-4 py-3 text-left text-sm transition hover:bg-accent/[0.08]"
        >
          <Sparkles className="size-4 shrink-0 text-accent" />
          <span className="flex-1 text-muted">
            Add from your profile: <span className="text-ink">{missingFromProfile.map((id) => labelOf(GOALS, id)).join(", ")}</span>
          </span>
          <span className="text-xs font-medium text-accent">Add all</span>
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        {GOALS.map((o) => {
          const g = goals.find((x) => x.id === o.id);
          const Icon = o.icon!;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              aria-pressed={!!g}
              className={cn(
                "flex items-center gap-2 rounded-full border py-1.5 pl-2 pr-3.5 text-sm transition",
                g ? cn("bg-surface-2 text-ink", TIER_STYLE[g.tier].ring) : "border-line bg-surface text-ink/80 hover:border-line-strong hover:text-ink",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full",
                  g ? TIER_STYLE[g.tier].badge : "bg-surface-3 text-muted",
                )}
              >
                {g ? <Check className="size-3.5" strokeWidth={3} /> : <Icon className="size-3.5" />}
              </span>
              {o.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {TIERS.map((tier) => {
          const items = goals.filter((g) => g.tier === tier.id);
          return (
            <section
              key={tier.id}
              className={cn(
                "rounded-2xl border bg-surface p-4",
                tier.id === "major" ? "border-accent/40 shadow-[0_0_0_4px_rgb(198_244_50/0.05)]" : "border-line",
              )}
            >
              <header className="mb-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <span className={cn("size-2 rounded-full", TIER_STYLE[tier.id].badge.split(" ")[0])} />
                    {tier.label}
                  </h3>
                  <span className="text-xs text-faint">{items.length}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted">{tier.hint}</p>
              </header>

              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-faint">
                  {tier.id === "major" ? "Pick a goal above to start" : "Move goals here with the arrows"}
                </p>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={items.map((g) => g.id)}
                  onReorder={(ids) => reorderTier(tier.id, ids)}
                  className="space-y-1.5"
                >
                  {items.map((g) => {
                    const rank = goals.indexOf(g) + 1;
                    const tierIdx = TIER_ORDER.indexOf(g.tier);
                    return (
                      <Reorder.Item
                        key={g.id}
                        value={g.id}
                        className="group flex cursor-grab items-center gap-2 rounded-xl border border-line bg-surface-2 py-2 pl-2 pr-1.5 active:cursor-grabbing"
                      >
                        <GripVertical className="size-3.5 shrink-0 text-faint" />
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold",
                            TIER_STYLE[g.tier].badge,
                          )}
                        >
                          {rank}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{labelOf(GOALS, g.id)}</span>
                        <span className="flex" onPointerDown={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            disabled={tierIdx === 0}
                            onClick={() => shift(g.id, -1)}
                            className="rounded p-1 text-faint hover:text-ink disabled:opacity-20"
                            title="Promote"
                            aria-label={`Promote ${labelOf(GOALS, g.id)}`}
                          >
                            <ChevronsUp className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={tierIdx === 2}
                            onClick={() => shift(g.id, 1)}
                            className="rounded p-1 text-faint hover:text-ink disabled:opacity-20"
                            title="Demote"
                            aria-label={`Demote ${labelOf(GOALS, g.id)}`}
                          >
                            <ChevronsDown className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggle(g.id)}
                            className="rounded p-1 text-faint hover:text-danger"
                            aria-label={`Remove ${labelOf(GOALS, g.id)}`}
                          >
                            <X className="size-3.5" />
                          </button>
                        </span>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              )}

              {tier.id === "major" && items.length > 3 && (
                <p className="mt-3 flex items-start gap-1.5 text-xs text-warn">
                  <TriangleAlert className="mt-px size-3.5 shrink-0" />
                  More than three major focuses tends to dilute a program. Consider demoting some.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
