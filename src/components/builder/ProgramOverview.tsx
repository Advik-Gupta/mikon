"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Activity, ArrowLeft, Check, ChevronRight, Maximize2, Plus, Target, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { groupById, MUSCLE_GROUPS, muscleById } from "@/data/muscles";
import { useExerciseDB, type Sex } from "@/lib/explorer";
import { cycleColor, cycleLoads, frequency, muscleUsage, perWeek, type Usage } from "@/lib/load";
import { blockType } from "@/lib/options";
import { dayLabel, updateProgram } from "@/lib/programs";
import { useProfile } from "@/lib/storage";
import type { Program, VolumeTarget } from "@/lib/types";
import { BodyFigure } from "../explorer/BodyFigure";
import { cn } from "../ui";

const INDIRECT = 0.35;
const round = (n: number) => Math.round(n);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

interface GroupStat {
  direct: number;
  indirect: number;
  byDay: number[];
}

function useOverviewData(program: Program, filter: string | null) {
  const { db } = useExerciseDB();
  const exercises = useMemo(() => new Map((db?.exercises ?? []).map((e) => [e.id, e])), [db]);
  return useMemo(() => {
    const days = cycleLoads(program, exercises, filter);
    const groups = new Map<string, GroupStat>();
    days.forEach((d, i) =>
      d.forEach((g, id) => {
        const s = groups.get(id) ?? { direct: 0, indirect: 0, byDay: Array(program.days.length).fill(0) };
        s.direct += g.direct;
        s.indirect += g.indirect;
        s.byDay[i] += g.direct;
        groups.set(id, s);
      }),
    );
    return { groups, muscles: muscleUsage(program, exercises, filter), ready: !!db };
  }, [program, exercises, filter, db]);
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</p>
      <p className="mt-0.5 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}

function DayStrip({ program, byDay }: { program: Program; byDay: number[] }) {
  return (
    <div className="flex gap-1">
      {byDay.map((v, i) => (
        <div key={i} className="min-w-0 flex-1 text-center">
          <div
            className={cn("flex h-9 items-center justify-center rounded-md font-display text-xs font-semibold tabular-nums", v >= 1 ? "text-accent-ink" : "bg-surface-2 text-faint")}
            style={v >= 1 ? { background: cycleColor(v * 2) ?? undefined } : undefined}
            title={`${dayLabel(program, i)}: ${round(v)} sets`}
          >
            {v >= 1 ? round(v) : "·"}
          </div>
          <span className="mt-0.5 block truncate text-[10px] text-faint">{dayLabel(program, i)}</span>
        </div>
      ))}
    </div>
  );
}

function Row({ name, sets, freq, color, onClick, muted }: { name: string; sets: number; freq: number; color: string | null; onClick: () => void; muted?: string }) {
  return (
    <button type="button" onClick={onClick} className="group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-surface-2">
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: color ?? "#3a4049" }} />
      <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
      {muted ? (
        <span className="text-xs text-faint">{muted}</span>
      ) : (
        <>
          <span className="w-16 text-right text-xs tabular-nums text-ink">{plural(round(sets), "set")}</span>
          <span className="w-10 text-right text-xs tabular-nums text-muted">{freq}×</span>
        </>
      )}
      <ChevronRight className="size-3.5 text-faint group-hover:text-ink" />
    </button>
  );
}

function Sources({ program, u }: { program: Program; u: Usage }) {
  const rows = [...u.sources].sort((a, b) => a.dayIndex - b.dayIndex || b.direct - a.direct);
  return (
    <div className="overflow-hidden rounded-xl border border-line">
      <table className="w-full text-xs">
        <thead className="bg-surface-2/60 text-[10px] uppercase tracking-[0.12em] text-faint">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Day</th>
            <th className="px-3 py-2 text-left font-semibold">From</th>
            <th className="px-3 py-2 text-right font-semibold">Sets</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={i} className="border-t border-line">
              <td className="whitespace-nowrap px-3 py-2 text-muted">{dayLabel(program, s.dayIndex)}</td>
              <td className="px-3 py-2">
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: blockType(s.type).color }} />
                  <span className="truncate">{s.label}</span>
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{s.direct >= 0.5 ? round(s.direct) : <span className="text-faint">indirect</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ targets */

/** "+3 sets over", "2 days under" or "on target". */
function Diff({ d, unit }: { d: number | null; unit: string }) {
  if (d == null) return <span className="text-faint">—</span>;
  if (d === 0)
    return (
      <span className="flex items-center justify-end gap-1 text-accent">
        <Check className="size-3.5" /> on target
      </span>
    );
  if (d > 0)
    return (
      <span className="flex items-center justify-end gap-1 text-accent">
        <TrendingUp className="size-3.5" /> {d} {unit} over
      </span>
    );
  return (
    <span className="flex items-center justify-end gap-1 text-danger">
      <TrendingDown className="size-3.5" /> {-d} {unit} under
    </span>
  );
}

function TargetRow({
  t,
  current,
  onChange,
  onDelete,
  onFocus,
}: {
  t: VolumeTarget;
  current: { sets: number; freq: number };
  onChange: (p: Partial<VolumeTarget>) => void;
  onDelete: () => void;
  onFocus: () => void;
}) {
  const setsDiff = t.minSets != null ? round(current.sets) - t.minSets : null;
  const freqDiff = t.minFreq != null ? current.freq - t.minFreq : null;
  const met = (setsDiff == null || setsDiff >= 0) && (freqDiff == null || freqDiff >= 0);
  const input = "h-9 rounded-lg border border-line bg-surface-2 px-2.5 text-sm tabular-nums outline-none hover:border-line-strong focus:border-accent/60";
  const value = t.kind === "group" ? t.ref : `m:${t.ref}`;

  return (
    <tr className="border-t border-line align-middle">
      <td className="py-2 pl-3 pr-2">
        <div className="flex items-center gap-2">
          <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", met ? "bg-accent/15 text-accent" : "bg-danger/15 text-danger")}>
            {met ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
          </span>
          <select
            aria-label="Muscle or group"
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v.startsWith("m:") ? { kind: "muscle", ref: v.slice(2) } : { kind: "group", ref: v });
            }}
            className={cn(input, "w-full min-w-40 cursor-pointer")}
          >
            {MUSCLE_GROUPS.map((g) => (
              <optgroup key={g.id} label={g.name}>
                <option value={g.id}>{g.name} (whole group)</option>
                {g.muscles.map((m) => (
                  <option key={m} value={`m:${m}`}>
                    {muscleById(m)?.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button type="button" onClick={onFocus} className="rounded-md p-1 text-faint hover:bg-surface-2 hover:text-ink" title="Show on the figure" aria-label="Show on the figure">
            <Maximize2 className="size-3.5" />
          </button>
        </div>
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={0}
          aria-label="Minimum sets per week"
          value={t.minSets ?? ""}
          placeholder="—"
          onChange={(e) => onChange({ minSets: e.target.value === "" ? null : Math.max(0, Math.round(Number(e.target.value))) })}
          className={cn(input, "w-20")}
        />
      </td>
      <td className="px-2 py-2 text-right text-sm tabular-nums">{round(current.sets)}</td>
      <td className="px-2 py-2 text-right text-xs">
        <Diff d={setsDiff} unit={setsDiff != null && Math.abs(setsDiff) === 1 ? "set" : "sets"} />
      </td>
      <td className="px-2 py-2">
        <input
          type="number"
          min={0}
          max={7}
          aria-label="Minimum sessions per week"
          value={t.minFreq ?? ""}
          placeholder="—"
          onChange={(e) => onChange({ minFreq: e.target.value === "" ? null : Math.max(0, Math.min(14, Math.round(Number(e.target.value)))) })}
          className={cn(input, "w-16")}
        />
      </td>
      <td className="px-2 py-2 text-right text-sm tabular-nums">{current.freq}×</td>
      <td className="px-2 py-2 text-right text-xs">
        <Diff d={freqDiff} unit={freqDiff != null && Math.abs(freqDiff) === 1 ? "day" : "days"} />
      </td>
      <td className="py-2 pl-2 pr-3 text-right">
        <button type="button" onClick={onDelete} className="rounded-md p-1.5 text-faint hover:bg-danger/10 hover:text-danger" aria-label="Remove target">
          <Trash2 className="size-3.5" />
        </button>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ main */

export function ProgramOverview({ program }: { program: Program }) {
  const profile = useProfile();
  const sex: Sex = profile?.personal.sex === "female" ? "female" : "male";
  const [filter, setFilter] = useState<string>("all");
  const [group, setGroup] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);

  const types = [...new Set(program.days.flatMap((d) => d.blocks.map((b) => b.type)))].filter((t) => t !== "recovery" && t !== "mobility");
  const active = filter === "all" || types.includes(filter) ? filter : "all";
  const { groups, muscles, ready } = useOverviewData(program, active === "all" ? null : active);
  const all = useOverviewData(program, null);

  const n = program.days.length;
  const weekly = n !== 7;
  const wk = (v: number) => perWeek(v, n);
  const wkFreq = (byDay: number[]) => Math.round(perWeek(frequency(byDay), n));
  const scope = weekly ? "per week (averaged over the cycle)" : "per week";

  const groupColor = (id: string) => {
    const g = groups.get(id);
    return g ? cycleColor(wk(g.direct + INDIRECT * g.indirect)) : null;
  };
  const muscleColor = (id: string) => {
    const u = muscles.get(id);
    return u ? cycleColor(wk(u.direct + INDIRECT * u.indirect)) : null;
  };

  const openGroup = (id: string) => {
    setGroup(id);
    setMuscle(null);
  };
  const openMuscle = (id: string) => {
    setGroup(muscleById(id)?.group ?? null);
    setMuscle(id);
  };

  /* targets */
  const targets = program.volumeTargets ?? [];
  const setTargets = (fn: (t: VolumeTarget[]) => VolumeTarget[]) => updateProgram(program.id, (p) => ({ ...p, volumeTargets: fn(p.volumeTargets ?? []) }));
  const currentFor = (t: VolumeTarget) => {
    if (t.kind === "group") {
      const g = all.groups.get(t.ref);
      return { sets: g ? wk(g.direct) : 0, freq: g ? wkFreq(g.byDay) : 0 };
    }
    const u = all.muscles.get(t.ref);
    return { sets: u ? wk(u.direct) : 0, freq: u ? wkFreq(u.byDay) : 0 };
  };
  const metCount = targets.filter((t) => {
    const c = currentFor(t);
    return (t.minSets == null || round(c.sets) >= t.minSets) && (t.minFreq == null || c.freq >= t.minFreq);
  }).length;
  const addTarget = () => {
    const used = new Set(targets.filter((t) => t.kind === "group").map((t) => t.ref));
    const next = MUSCLE_GROUPS.find((g) => !used.has(g.id)) ?? MUSCLE_GROUPS[0];
    setTargets((ts) => [...ts, { id: crypto.randomUUID(), kind: "group", ref: next.id, minSets: 10, minFreq: 2 }]);
  };
  const addAllMajor = () => {
    const used = new Set(targets.filter((t) => t.kind === "group").map((t) => t.ref));
    const major = ["chest", "lats", "traps", "shoulders", "biceps", "triceps", "quads", "hamstrings", "glutes", "calves", "core"].filter((g) => !used.has(g));
    setTargets((ts) => [...ts, ...major.map((ref) => ({ id: crypto.randomUUID(), kind: "group" as const, ref, minSets: 10, minFreq: 2 }))]);
  };

  /* info panel */
  const g = group ? groups.get(group) : null;
  const m = muscle ? muscleById(muscle) : null;
  const u = muscle ? muscles.get(muscle) : null;
  const trained = [...groups.entries()].filter(([, s]) => s.direct >= 0.5 || s.indirect > 0).sort((a, b) => b[1].direct - a[1].direct);
  const untrained = MUSCLE_GROUPS.filter((x) => !groups.has(x.id));

  const panel = (() => {
    if (m && group) {
      const beneath = m.deep && m.beneath ? muscleById(m.beneath) : null;
      return (
        <>
          <button type="button" onClick={() => setMuscle(null)} className="mb-3 flex items-center gap-1.5 text-xs text-muted hover:text-ink">
            <ArrowLeft className="size-3.5" /> {groupById(group)?.name}
          </button>
          <h3 className="font-display text-2xl font-semibold tracking-tight">{m.name}</h3>
          {beneath && <p className="mt-1 text-xs text-muted">Deep muscle, beneath the {beneath.name}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="Sets" value={u ? round(wk(u.direct)) : 0} sub={scope} />
            <Stat label="Frequency" value={`${u ? wkFreq(u.byDay) : 0}×`} sub="sessions per week" />
          </div>
          {u && u.direct < 0.5 && u.indirect > 0 && <p className="mt-3 text-xs text-muted">Only worked indirectly, as a helper in other movements.</p>}
          {u && (
            <>
              <p className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">By day</p>
              <DayStrip program={program} byDay={u.byDay} />
              <p className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Where it comes from</p>
              <Sources program={program} u={u} />
            </>
          )}
          {!u && <p className="mt-5 text-sm text-faint">Nothing in this program trains it yet.</p>}
        </>
      );
    }
    if (group) {
      const gm = groupById(group)!;
      return (
        <>
          <button type="button" onClick={() => setGroup(null)} className="mb-3 flex items-center gap-1.5 text-xs text-muted hover:text-ink">
            <ArrowLeft className="size-3.5" /> Whole body
          </button>
          <h3 className="font-display text-2xl font-semibold tracking-tight">{gm.name}</h3>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Stat label="Sets" value={g ? round(wk(g.direct)) : 0} sub={scope} />
            <Stat label="Frequency" value={`${g ? wkFreq(g.byDay) : 0}×`} sub="sessions per week" />
          </div>
          {g && (
            <>
              <p className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">By day</p>
              <DayStrip program={program} byDay={g.byDay} />
            </>
          )}
          <p className="mb-1 mt-5 flex justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            Muscles <span className="normal-case tracking-normal">sets · freq</span>
          </p>
          <div className="-mx-2">
            {gm.muscles.map((id) => {
              const mu = muscles.get(id);
              return (
                <Row
                  key={id}
                  name={muscleById(id)!.name}
                  sets={mu ? wk(mu.direct) : 0}
                  freq={mu ? wkFreq(mu.byDay) : 0}
                  color={muscleColor(id)}
                  onClick={() => openMuscle(id)}
                  muted={!mu ? "not trained" : mu.direct < 0.5 ? "indirect only" : undefined}
                />
              );
            })}
          </div>
        </>
      );
    }
    return (
      <>
        <h3 className="font-display text-2xl font-semibold tracking-tight">Whole body</h3>
        <p className="mt-1 text-sm text-muted">Every activity in the cycle, {scope}. Click a group to see its muscles.</p>
        <p className="mb-1 mt-5 flex justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
          Trained <span className="normal-case tracking-normal">sets · freq</span>
        </p>
        {trained.length === 0 ? (
          <p className="py-4 text-sm text-faint">{ready ? "Nothing programmed yet. Build a day above and it shows up here." : "Loading…"}</p>
        ) : (
          <div className="-mx-2">
            {trained.map(([id, s]) => (
              <Row
                key={id}
                name={groupById(id)?.name ?? id}
                sets={wk(s.direct)}
                freq={wkFreq(s.byDay)}
                color={groupColor(id)}
                onClick={() => openGroup(id)}
                muted={s.direct < 0.5 ? "indirect only" : undefined}
              />
            ))}
          </div>
        )}
        {untrained.length > 0 && trained.length > 0 && (
          <p className="mt-4 text-xs leading-relaxed text-faint">
            <span className="text-muted">Not trained at all:</span> {untrained.map((x) => x.name).join(", ")}
          </p>
        )}
      </>
    );
  })();

  return (
    <div className="space-y-6 px-4 pb-16 pt-8 sm:px-6">
      {/* Body overview */}
      <section className="rounded-3xl border border-line bg-surface">
        <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Your body this cycle</h2>
            <p className="text-xs text-muted">Everything you&apos;re doing, added up per muscle.</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-1">
            {["all", ...types].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilter(t)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                  active === t ? "border-ink bg-ink text-bg" : "border-line text-muted hover:text-ink",
                )}
              >
                {t === "all" ? <Activity className="size-3" /> : <span className="size-1.5 rounded-full" style={{ background: blockType(t).color }} />}
                {t === "all" ? "All activities" : blockType(t).label}
              </button>
            ))}
          </div>
        </header>
        <div className="grid lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,1fr)]">
          <div className="board-grid relative h-[640px] border-b border-line lg:border-b-0 lg:border-r">
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
              {group ? (
                <button
                  type="button"
                  onClick={() => (setGroup(null), setMuscle(null))}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-surface/90 px-2.5 py-1.5 text-xs font-medium backdrop-blur hover:border-line-strong"
                >
                  <Maximize2 className="size-3.5" /> Whole body
                </button>
              ) : (
                <span className="rounded-lg bg-surface/80 px-2.5 py-1.5 text-xs text-muted backdrop-blur">Click a group to zoom in</span>
              )}
            </div>
            <div className="absolute inset-0 px-3 pb-12 pt-12">
              <BodyFigure
                sex={sex}
                focusGroup={group}
                selectedMuscle={muscle}
                onGroup={openGroup}
                onMuscle={openMuscle}
                heatFor={(id, zoomed) => (zoomed ? muscleColor(id) : groupColor(muscleById(id)?.group ?? ""))}
                tipFor={(id, zoomed) => {
                  if (zoomed) {
                    const mu = muscles.get(id);
                    return mu ? (mu.direct >= 0.5 ? `${plural(round(wk(mu.direct)), "set")} · ${wkFreq(mu.byDay)}× a week` : "Indirect only") : "Not trained";
                  }
                  const gs = groups.get(muscleById(id)?.group ?? "");
                  return gs ? (gs.direct >= 0.5 ? `${plural(round(wk(gs.direct)), "set")} · ${wkFreq(gs.byDay)}× a week` : "Indirect only") : "Not trained";
                }}
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-4 pb-3 text-[10px] text-faint">
              <span>0</span>
              <span className="h-1.5 flex-1 rounded-full" style={{ background: `linear-gradient(to right, #3a4049, ${[1, 5, 10, 15, 20, 30].map((v) => cycleColor(v)).join(", ")})` }} />
              <span>30+ sets/wk</span>
            </div>
          </div>
          <div className="scrollbar-thin max-h-[640px] overflow-y-auto p-5">{panel}</div>
        </div>
      </section>

      {/* Targets */}
      <section className="rounded-3xl border border-line bg-surface">
        <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-accent/12 text-accent">
            <Target className="size-4.5" />
          </span>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Volume targets</h2>
            <p className="text-xs text-muted">Set the minimum sets and sessions per week you want for any muscle or group.</p>
          </div>
          {targets.length > 0 && (
            <span className={cn("ml-auto rounded-full px-3 py-1 text-xs font-medium", metCount === targets.length ? "bg-accent/15 text-accent" : "bg-warn/15 text-warn")}>
              {metCount} of {targets.length} met
            </span>
          )}
        </header>
        {targets.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-[10px] uppercase tracking-[0.12em] text-faint">
                <tr>
                  <th className="py-2.5 pl-3 pr-2 text-left font-semibold">Muscle / group</th>
                  <th className="px-2 py-2.5 text-left font-semibold">Min sets</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Now</th>
                  <th className="px-2 py-2.5 text-right font-semibold" />
                  <th className="px-2 py-2.5 text-left font-semibold">Min ×/wk</th>
                  <th className="px-2 py-2.5 text-right font-semibold">Now</th>
                  <th className="px-2 py-2.5 text-right font-semibold" />
                  <th />
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => (
                  <TargetRow
                    key={t.id}
                    t={t}
                    current={currentFor(t)}
                    onChange={(p) => setTargets((ts) => ts.map((x) => (x.id === t.id ? { ...x, ...p } : x)))}
                    onDelete={() => setTargets((ts) => ts.filter((x) => x.id !== t.id))}
                    onFocus={() => (t.kind === "group" ? openGroup(t.ref) : openMuscle(t.ref))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 px-5 py-4">
          <button
            type="button"
            onClick={addTarget}
            className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm font-medium transition hover:border-line-strong"
          >
            <Plus className="size-4" /> Add target
          </button>
          <button type="button" onClick={addAllMajor} className="rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink">
            Add all major groups (10 sets · 2×/wk)
          </button>
          {weekly && <p className="ml-auto text-[11px] text-faint">Your cycle is {n} days, so numbers are converted to a 7-day week.</p>}
        </div>
      </section>
    </div>
  );
}
