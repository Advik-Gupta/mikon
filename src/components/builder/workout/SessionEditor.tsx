"use client";

import { Check } from "lucide-react";
import { DIRECT_SHARE, SESSION_ACTIVITIES, SESSION_ICON, sessionActivity } from "@/data/activities";
import { groupById } from "@/data/muscles";
import { shownSets } from "@/lib/load";
import type { SessionDetail } from "@/lib/types";
import { cn } from "../../ui";

const RPE_LABEL = ["", "Very easy", "Easy", "Easy", "Moderate", "Moderate", "Somewhat hard", "Hard", "Very hard", "Extremely hard", "Max effort"];

export function defaultSession(block: string): SessionDetail {
  const first = SESSION_ACTIVITIES.find((a) => a.block === block) ?? SESSION_ACTIVITIES[0];
  return { activity: first.id, durationMin: 60, rpe: 6, notes: "" };
}

export function SessionEditor({ block, session, onChange }: { block: string; session: SessionDetail; onChange: (s: SessionDetail) => void }) {
  const act = sessionActivity(session.activity);
  const se = (session.durationMin ?? 0) * act.rate * (session.rpe / 7);
  const loads = Object.entries(act.muscles)
    .map(([g, w]) => ({ g, sets: se * w, direct: w >= DIRECT_SHARE }))
    .sort((a, b) => b.sets - a.sets);
  const Icon = SESSION_ICON[block] ?? SESSION_ICON.sport;

  return (
    <div className="space-y-4 pb-16">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#3dd6d0]/15 text-[#3dd6d0]">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">{act.label}</p>
            <p className="text-xs text-muted">Choose the activity from the list on the right</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Duration</span>
            <span className="relative block">
              <input
                type="number"
                value={session.durationMin ?? ""}
                onChange={(e) => onChange({ ...session, durationMin: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })}
                className="h-10 w-full rounded-lg border border-line bg-surface-2 px-3 pr-12 text-sm tabular-nums outline-none hover:border-line-strong focus:border-accent/60"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">min</span>
            </span>
          </label>
          <div>
            <span className="mb-1.5 flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
              Intensity (RPE)
              <span className="normal-case tracking-normal text-muted">
                <span className="font-display text-sm font-semibold text-ink">{session.rpe}</span> · {RPE_LABEL[session.rpe]}
              </span>
            </span>
            <input
              type="range"
              className="range"
              min={1}
              max={10}
              value={session.rpe}
              style={{ ["--fill" as string]: `${((session.rpe - 1) / 9) * 100}%` }}
              onChange={(e) => onChange({ ...session, rpe: Number(e.target.value) })}
              aria-label="Session intensity"
            />
          </div>
        </div>

        <textarea
          value={session.notes}
          onChange={(e) => onChange({ ...session, notes: e.target.value })}
          placeholder="Focus for this session: drills, sparring rounds, route, positions…"
          className="mt-4 min-h-20 w-full resize-y rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none placeholder:text-faint hover:border-line-strong focus:border-accent/60"
        />
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Estimated load on the body</p>
        <div className="space-y-2">
          {loads.map((l) => (
            <div key={l.g} className="flex items-center gap-3 text-xs">
              <span className="w-32 truncate">{groupById(l.g)?.name}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                <span className="block h-full rounded-full bg-[#3dd6d0]" style={{ width: `${Math.min(100, (l.sets / 10) * 100)}%`, opacity: l.direct ? 1 : 0.45 }} />
              </span>
              <span className="w-16 text-right tabular-nums text-muted">{l.direct ? `≈ ${shownSets(l.sets)} sets` : "indirect"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SessionLibrary({ block, value, onPick }: { block: string; value: string; onPick: (id: string) => void }) {
  const list = SESSION_ACTIVITIES.filter((a) => a.block === block);
  return (
    <div className="scrollbar-thin h-full space-y-1.5 overflow-y-auto p-3">
      {list.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onPick(a.id)}
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
            a.id === value ? "border-accent/60 bg-accent/[0.06]" : "border-line bg-surface hover:border-line-strong hover:bg-surface-2",
          )}
        >
          {a.label}
          {a.id === value && <Check className="size-4 text-accent" />}
        </button>
      ))}
    </div>
  );
}
