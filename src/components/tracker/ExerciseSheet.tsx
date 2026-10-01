"use client";

import { useMemo, useState } from "react";
import { Check, History, Plus, Search, Sparkles } from "lucide-react";
import { MUSCLE_GROUPS } from "@/data/muscles";
import { groupsForKeys, searchExercises, useExerciseDB, type Exercise } from "@/lib/explorer";
import { useLogs } from "@/lib/storage";
import { CreateExerciseModal } from "../explorer/CreateExerciseModal";
import { ExerciseThumb } from "../explorer/ExerciseBits";
import { Button, cn } from "../ui";
import { Sheet } from "./Sheet";

const GROUPS = ["chest", "lats", "traps", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core", "forearms"];

function Row({ e, picked, onPick }: { e: Exercise; picked: boolean; onPick: () => void }) {
  const groups = groupsForKeys(e.primary)
    .map((g) => MUSCLE_GROUPS.find((x) => x.id === g)?.name)
    .filter(Boolean);
  return (
    <button type="button" onClick={onPick} className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition active:bg-surface-2">
      <ExerciseThumb exercise={e} className="size-12 shrink-0 rounded-xl" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{e.name}</span>
        <span className="block truncate text-xs text-muted">{groups.join(" · ") || e.discipline}</span>
      </span>
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full transition",
          picked ? "bg-accent text-accent-ink" : "bg-surface-2 text-muted",
        )}
      >
        {picked ? <Check className="size-4" strokeWidth={3} /> : <Plus className="size-4" />}
      </span>
    </button>
  );
}

export function ExerciseSheet({
  open,
  onClose,
  mode,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  mode: "add" | "swap";
  onDone: (ids: string[]) => void;
}) {
  const { db } = useExerciseDB();
  const logs = useLogs();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const all = useMemo(() => db?.exercises ?? [], [db]);
  const byId = useMemo(() => new Map(all.map((e) => [e.id, e])), [all]);

  const recent = useMemo(() => {
    const seen = new Set<string>();
    for (const l of [...(logs ?? [])].sort((a, b) => b.date.localeCompare(a.date))) for (const x of l.exercises) seen.add(x.exerciseId);
    return [...seen].map((id) => byId.get(id)).filter((e): e is Exercise => !!e).slice(0, 8);
  }, [logs, byId]);

  const results = useMemo(() => {
    let list = q.trim() ? searchExercises(q, all) : all;
    if (group) list = list.filter((e) => groupsForKeys(e.primary).includes(group));
    return list.filter((e) => q.trim() || (e.discipline !== "cardio" && e.discipline !== "mobility")).slice(0, 80);
  }, [all, q, group]);

  const pick = (id: string) => {
    if (mode === "swap") {
      onDone([id]);
      reset();
      return;
    }
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const reset = () => {
    setPicked([]);
    setQ("");
    setGroup(null);
  };
  const close = () => {
    reset();
    onClose();
  };
  const browsing = !q.trim() && !group;

  return (
    <>
      <Sheet open={open} onClose={close} title={mode === "swap" ? "Swap exercise" : "Add exercises"} full>
        <div className="sticky top-0 z-10 space-y-3 bg-surface px-5 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for an exercise"
              className="h-12 w-full rounded-full border-2 border-line-strong bg-surface-2 pl-12 pr-4 text-[15px] outline-none transition focus:border-ink"
            />
          </div>
          <div className="scrollbar-thin -mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
            {GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGroup(group === g ? null : g)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                  group === g ? "border-ink bg-ink text-bg" : "border-line bg-surface-2 text-muted",
                )}
              >
                {MUSCLE_GROUPS.find((x) => x.id === g)?.name}
              </button>
            ))}
          </div>
        </div>

        {!db ? (
          <div className="space-y-2 px-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        ) : (
          <div className="pb-28">
            {browsing && recent.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 px-5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
                  <History className="size-3.5" /> Recent
                </p>
                {recent.map((e) => (
                  <Row key={`r-${e.id}`} e={e} picked={picked.includes(e.id)} onPick={() => pick(e.id)} />
                ))}
                <p className="px-5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">All exercises</p>
              </>
            )}
            {results.map((e) => (
              <Row key={e.id} e={e} picked={picked.includes(e.id)} onPick={() => pick(e.id)} />
            ))}
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mx-5 mt-4 flex w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-3.5 text-left"
            >
              <Sparkles className="size-5 text-accent" />
              <span>
                <span className="block text-sm font-medium">Can&apos;t find it? Create your own</span>
                <span className="block text-xs text-muted">{q.trim() ? `Add "${q.trim()}" to your library` : "Saved to your library for next time"}</span>
              </span>
            </button>
          </div>
        )}

        {mode === "add" && picked.length > 0 && (
          <div className="pointer-events-none sticky bottom-0 px-5 pb-4 pt-6">
            <Button
              onClick={() => {
                onDone(picked);
                close();
              }}
              className="pointer-events-auto h-12 w-full rounded-full text-[15px] shadow-[0_10px_30px_-10px_rgb(198_244_50/0.6)]"
            >
              Add {picked.length} exercise{picked.length === 1 ? "" : "s"}
            </Button>
          </div>
        )}
      </Sheet>
      <CreateExerciseModal
        open={creating}
        onClose={() => setCreating(false)}
        all={all}
        initialName={q.trim()}
        onSaved={(ex) => {
          setCreating(false);
          pick(ex.id);
        }}
        onUseExisting={(ex) => {
          setCreating(false);
          pick(ex.id);
        }}
        useExistingLabel="Use that one"
      />
    </>
  );
}
