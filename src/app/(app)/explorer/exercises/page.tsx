"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { CreateExerciseModal } from "@/components/explorer/CreateExerciseModal";
import type { Discipline } from "@/data/activities";
import { MUSCLE_GROUPS } from "@/data/muscles";
import { groupsForKeys, searchExercises, titleCase, useExerciseDB, type Exercise } from "@/lib/explorer";
import { ExerciseThumb, LevelDot } from "@/components/explorer/ExerciseBits";
import { ExerciseBadge } from "@/components/builder/workout/ExercisePicker";
import { DISCIPLINES } from "@/data/activities";
import { ExplorerTabs } from "@/components/explorer/ExplorerTabs";
import { cn } from "@/components/ui";

const PAGE = 48;

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] | { id: string; label: string }[] }) {
  const opts = options.map((o) => (typeof o === "string" ? { id: o, label: titleCase(o) } : o));
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-10 cursor-pointer rounded-xl border bg-surface-2 px-3 text-sm outline-none transition hover:border-line-strong focus:border-accent/60",
        value ? "border-accent/50 text-ink" : "border-line text-muted",
      )}
    >
      <option value="">{label}</option>
      {opts.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Card({ e, onOpen }: { e: Exercise; onOpen: () => void }) {
  const groups = groupsForKeys(e.primary)
    .map((g) => MUSCLE_GROUPS.find((x) => x.id === g)?.name)
    .filter(Boolean);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-2xl border border-line bg-surface text-left transition hover:-translate-y-0.5 hover:border-line-strong"
    >
      <ExerciseThumb exercise={e} className="aspect-[4/3] w-full" />
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{e.name}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
          <LevelDot level={e.level} /> {titleCase(e.equipment)} <ExerciseBadge e={e} />
        </p>
        <p className="mt-1 truncate text-[11px] text-accent">{groups.join(" · ")}</p>
      </div>
    </button>
  );
}

export default function ExerciseLibraryPage() {
  const router = useRouter();
  const { db, error } = useExerciseDB();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [equipment, setEquipment] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [creating, setCreating] = useState<string | null>(null);

  const all = useMemo(() => db?.exercises ?? [], [db]);
  const facets = useMemo(
    () => ({
      equipment: [...new Set(all.map((e) => e.equipment))].sort(),
      level: ["beginner", "intermediate", "expert"],
      category: [...new Set(all.map((e) => e.category))].sort(),
    }),
    [all],
  );

  const results = useMemo(() => {
    let list = q.trim() ? searchExercises(q, all) : all;
    if (group) list = list.filter((e) => groupsForKeys(e.primary).includes(group));
    if (equipment) list = list.filter((e) => e.equipment === equipment);
    if (level) list = list.filter((e) => e.level === level);
    if (category) list = list.filter((e) => e.category === category);
    if (discipline) list = list.filter((e) => e.discipline === discipline);
    if (discipline === "calisthenics" && !q.trim()) list = [...list].sort((a, b) => (a.family ?? "~").localeCompare(b.family ?? "~") || (a.step ?? 0) - (b.step ?? 0));
    return list;
  }, [all, q, group, equipment, level, category, discipline]);

  const filtered = !!(group || equipment || level || category || discipline);
  const reset = () => {
    setDiscipline("");
    setGroup("");
    setEquipment("");
    setLevel("");
    setCategory("");
  };
  const update = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setShown(PAGE);
  };

  return (
    <div className="flex h-full flex-col">
      <ExplorerTabs />
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-60 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
              <input
                value={q}
                onChange={(e) => update(setQ)(e.target.value)}
                placeholder="Search exercises…"
                className="h-10 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-3.5 text-sm outline-none transition placeholder:text-faint hover:border-line-strong focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
              />
            </div>
            <SlidersHorizontal className="ml-1 hidden size-4 text-faint sm:block" />
            <Select label="All muscles" value={group} onChange={update(setGroup)} options={MUSCLE_GROUPS.map((g) => ({ id: g.id, label: g.name }))} />
            <Select label="Any equipment" value={equipment} onChange={update(setEquipment)} options={facets.equipment} />
            <Select label="Any level" value={level} onChange={update(setLevel)} options={facets.level} />
            <Select label="Any type" value={category} onChange={update(setCategory)} options={facets.category} />
            <button
              type="button"
              onClick={() => setCreating(q.trim())}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-accent px-3.5 text-sm font-semibold text-accent-ink transition hover:bg-[#d4ff4a]"
            >
              <Plus className="size-4" strokeWidth={2.5} /> Create exercise
            </button>
            {filtered && (
              <button type="button" onClick={reset} className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink">
                <X className="size-4" /> Clear
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {[{ id: "", label: "All", icon: null }, ...DISCIPLINES].map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => update(setDiscipline)(d.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  discipline === d.id ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-muted hover:text-ink",
                )}
              >
                {d.icon && <d.icon className="size-3.5" />}
                {d.label}
                <span className="opacity-60">{d.id ? all.filter((e) => e.discipline === d.id).length : all.length}</span>
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm text-muted">
            {db ? (
              <>
                <span className="text-ink">{results.length}</span> of {all.length} exercises
              </>
            ) : error ? (
              <span className="text-danger">{error}</span>
            ) : (
              "Loading exercises…"
            )}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {!db &&
              !error &&
              Array.from({ length: 10 }, (_, i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-surface-2" />)}
            {results.slice(0, shown).map((e) => (
              <Card key={e.id} e={e} onOpen={() => router.push(`/explorer?e=${e.id}`)} />
            ))}
          </div>

          {shown < results.length && (
            <button
              type="button"
              onClick={() => setShown((s) => s + PAGE)}
              className="mx-auto mt-6 block rounded-xl border border-line px-6 py-2.5 text-sm text-muted transition hover:border-line-strong hover:text-ink"
            >
              Show more · {results.length - shown} left
            </button>
          )}
          {db && results.length === 0 && (
            <div className="mt-10 text-center">
              <p className="text-sm text-muted">No exercises match these filters.</p>
              <button
                type="button"
                onClick={() => setCreating(q.trim())}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink"
              >
                <Plus className="size-3.5" /> Create {q.trim() ? `"${q.trim()}"` : "your own"}
              </button>
            </div>
          )}
          <CreateExerciseModal
            open={creating !== null}
            onClose={() => setCreating(null)}
            all={all}
            initialName={creating ?? ""}
            initialDiscipline={(discipline || "weights") as Discipline}
            onSaved={(ex) => router.push(`/explorer?e=${ex.id}`)}
            onUseExisting={(ex) => router.push(`/explorer?e=${ex.id}`)}
            useExistingLabel="Open it"
          />
          <p className="mt-10 text-center text-[11px] text-faint">Exercise photos and instructions: free-exercise-db (public domain).</p>
        </div>
      </div>
    </div>
  );
}
