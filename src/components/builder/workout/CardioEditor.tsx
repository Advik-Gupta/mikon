"use client";

import { ArrowDown, ArrowUp, Copy, Plus, Repeat, Timer, Trash2 } from "lucide-react";
import { CARDIO_MODALITIES, CARDIO_TEMPLATES, CARDIO_TYPES, cardioModality, cardioType, DIRECT_SHARE, ZONES } from "@/data/activities";
import { groupById } from "@/data/muscles";
import { segmentDistanceKm, segmentLoad, segmentMinutes, shownSets } from "@/lib/load";
import type { CardioSegment, Units } from "@/lib/types";
import { cn } from "../../ui";

const KM_PER_MI = 1.609344;

export function newSegment(from: Partial<CardioSegment> = {}): CardioSegment {
  const type = cardioType(from.type ?? "easy");
  return {
    id: crypto.randomUUID(),
    modality: "run",
    type: type.id,
    kind: type.kind,
    zone: type.zone,
    durationMin: type.kind === "steady" ? 30 : null,
    distanceKm: null,
    reps: type.kind === "intervals" ? 6 : null,
    workSec: type.kind === "intervals" ? 60 : null,
    workDistanceM: null,
    restSec: type.kind === "intervals" ? 90 : null,
    notes: "",
    ...from,
  };
}

export function fmtDuration(min: number) {
  const total = Math.round(min * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  return s ? `${m}:${String(s).padStart(2, "0")}` : `${m} min`;
}

function fmtPace(seg: CardioSegment, units: Units) {
  const mod = cardioModality(seg.modality);
  const min = segmentMinutes(seg);
  const km = segmentDistanceKm(seg);
  if (!min || !km) return null;
  const mmss = (m: number) => `${Math.floor(m)}:${String(Math.round((m % 1) * 60)).padStart(2, "0")}`;
  if (mod.pace === "kmh") return units === "metric" ? `${(km / (min / 60)).toFixed(1)} km/h` : `${(km / KM_PER_MI / (min / 60)).toFixed(1)} mph`;
  if (mod.pace === "per-500m") return `${mmss(min / (km * 2))} /500m`;
  if (mod.pace === "per-100m") return `${mmss(min / (km * 10))} /100m`;
  return units === "metric" ? `${mmss(min / km)} /km` : `${mmss((min / km) * KM_PER_MI)} /mi`;
}

function Field({ label, value, onChange, suffix, placeholder, step = 1 }: { label: string; value: number | null; onChange: (v: number | null) => void; suffix?: string; placeholder?: string; step?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</span>
      <span className="relative block">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
          className="h-9 w-full rounded-lg border border-line bg-surface-2 px-2.5 pr-10 text-sm tabular-nums outline-none placeholder:text-faint hover:border-line-strong focus:border-accent/60"
        />
        {suffix && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-faint">{suffix}</span>}
      </span>
    </label>
  );
}

function SegmentCard({
  seg,
  index,
  count,
  units,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}: {
  seg: CardioSegment;
  index: number;
  count: number;
  units: Units;
  onChange: (p: Partial<CardioSegment>) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const mod = cardioModality(seg.modality);
  const Icon = mod.icon;
  const zone = ZONES[seg.zone - 1];
  const load = segmentLoad(seg);
  const distUnit = seg.modality === "swim" ? "m" : units === "metric" ? "km" : "mi";
  const toDist = (km: number | null) => (km == null ? null : seg.modality === "swim" ? Math.round(km * 1000) : units === "metric" ? km : Math.round((km / KM_PER_MI) * 100) / 100);
  const fromDist = (v: number | null) => (v == null ? null : seg.modality === "swim" ? v / 1000 : units === "metric" ? v : v * KM_PER_MI);
  const legs = Object.entries(mod.muscles)
    .filter(([, w]) => w >= DIRECT_SHARE)
    .map(([g, w]) => ({ g, sets: shownSets(load * w) }))
    .filter((x) => x.sets > 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <span className="block h-1" style={{ background: zone.color }} />
      <div className="p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-surface-2 text-[#ff6b8a]">
            <Icon className="size-4" />
          </span>
          <select
            aria-label="Modality"
            value={seg.modality}
            onChange={(e) => onChange({ modality: e.target.value })}
            className="h-9 cursor-pointer rounded-lg border border-line bg-surface-2 px-2 text-sm outline-none hover:border-line-strong"
          >
            {CARDIO_MODALITIES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1">
            {CARDIO_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                title={t.hint}
                onClick={() =>
                  onChange({
                    type: t.id,
                    kind: t.kind,
                    zone: t.zone,
                    ...(t.kind === "intervals" && seg.kind !== "intervals" && { reps: 6, workSec: 60, workDistanceM: null, restSec: 90 }),
                    ...(t.kind === "steady" && seg.kind !== "steady" && { durationMin: 30, distanceKm: null }),
                  })
                }
                className={cn(
                  "rounded-lg border px-2 py-1 text-[11px] font-medium transition",
                  seg.type === t.id ? "border-ink bg-ink text-bg" : "border-line text-muted hover:text-ink",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex">
            <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="rounded-md p-1.5 text-faint hover:bg-surface-2 hover:text-ink disabled:opacity-25" aria-label="Move up">
              <ArrowUp className="size-3.5" />
            </button>
            <button type="button" disabled={index === count - 1} onClick={() => onMove(1)} className="rounded-md p-1.5 text-faint hover:bg-surface-2 hover:text-ink disabled:opacity-25" aria-label="Move down">
              <ArrowDown className="size-3.5" />
            </button>
            <button type="button" onClick={onDuplicate} className="rounded-md p-1.5 text-faint hover:bg-surface-2 hover:text-ink" aria-label="Duplicate segment">
              <Copy className="size-3.5" />
            </button>
            <button type="button" onClick={onDelete} className="rounded-md p-1.5 text-faint hover:bg-danger/10 hover:text-danger" aria-label="Delete segment">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {seg.kind === "steady" ? (
            <>
              <Field label="Duration" value={seg.durationMin} onChange={(durationMin) => onChange({ durationMin })} suffix="min" placeholder="—" />
              <Field
                label="Distance"
                value={toDist(seg.distanceKm)}
                onChange={(v) => onChange({ distanceKm: fromDist(v) })}
                suffix={distUnit}
                placeholder={seg.durationMin ? `≈${toDist(segmentDistanceKm(seg))?.toFixed(seg.modality === "swim" ? 0 : 1)}` : "—"}
                step={0.1}
              />
            </>
          ) : (
            <>
              <Field label="Reps" value={seg.reps} onChange={(reps) => onChange({ reps })} suffix="×" />
              <Field
                label={seg.workDistanceM != null ? "Work distance" : "Work time"}
                value={seg.workDistanceM ?? seg.workSec}
                onChange={(v) => onChange(seg.workDistanceM != null ? { workDistanceM: v } : { workSec: v })}
                suffix={seg.workDistanceM != null ? "m" : "s"}
              />
            </>
          )}
          {seg.kind === "intervals" && <Field label="Rest" value={seg.restSec} onChange={(restSec) => onChange({ restSec })} suffix="s" />}
          {seg.kind === "intervals" && (
            <label className="block">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Work by</span>
              <span className="flex h-9 rounded-lg border border-line bg-surface-2 p-0.5 text-[11px]">
                {(["time", "distance"] as const).map((k) => {
                  const on = k === "distance" ? seg.workDistanceM != null : seg.workDistanceM == null;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onChange(k === "distance" ? { workDistanceM: seg.workDistanceM ?? 400, workSec: null } : { workSec: seg.workSec ?? 60, workDistanceM: null })}
                      className={cn("flex-1 rounded-md capitalize", on ? "bg-ink text-bg" : "text-muted hover:text-ink")}
                    >
                      {k}
                    </button>
                  );
                })}
              </span>
            </label>
          )}
          {seg.kind === "steady" && (
            <div className="col-span-2">
              <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Pace</span>
              <p className="flex h-9 items-center rounded-lg border border-dashed border-line px-2.5 text-sm tabular-nums text-muted">{fmtPace(seg, units) ?? "Add duration + distance"}</p>
            </div>
          )}
        </div>

        <div className="mt-3">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">Effort zone</span>
          <div className="grid grid-cols-5 gap-1">
            {ZONES.map((z) => (
              <button
                key={z.zone}
                type="button"
                onClick={() => onChange({ zone: z.zone })}
                className={cn("rounded-lg border px-1 py-1.5 text-center transition", seg.zone === z.zone ? "border-transparent text-accent-ink" : "border-line text-muted hover:text-ink")}
                style={seg.zone === z.zone ? { background: z.color } : undefined}
                title={`${z.name} · RPE ${z.rpe}`}
              >
                <span className="block font-display text-xs font-bold">{z.label}</span>
                <span className="block truncate text-[9px]">{z.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line pt-2.5 text-xs text-muted">
          <span className="flex items-center gap-1">
            <Timer className="size-3.5" /> {fmtDuration(segmentMinutes(seg))}
          </span>
          {segmentDistanceKm(seg) > 0 && (
            <span>
              {seg.modality === "swim" ? `${Math.round(segmentDistanceKm(seg) * 1000)} m` : units === "metric" ? `${segmentDistanceKm(seg).toFixed(1)} km` : `${(segmentDistanceKm(seg) / KM_PER_MI).toFixed(1)} mi`}
            </span>
          )}
          {legs.length > 0 && (
            <span className="ml-auto flex flex-wrap gap-1">
              {legs.map((l) => (
                <span key={l.g} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px]">
                  {groupById(l.g)?.name} ≈ {l.sets}
                </span>
              ))}
            </span>
          )}
        </div>
        <input
          value={seg.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Notes: route, cues, target HR…"
          className="mt-2.5 h-8 w-full rounded-lg border border-line bg-surface-2 px-2.5 text-xs outline-none placeholder:text-faint hover:border-line-strong focus:border-accent/60"
        />
      </div>
    </div>
  );
}

export function CardioEditor({ segments, units, onChange }: { segments: CardioSegment[]; units: Units; onChange: (s: CardioSegment[]) => void }) {
  const patch = (id: string, p: Partial<CardioSegment>) => onChange(segments.map((s) => (s.id === id ? { ...s, ...p } : s)));
  return (
    <div className="space-y-2.5 pb-16">
      {segments.map((seg, i) => (
        <SegmentCard
          key={seg.id}
          seg={seg}
          index={i}
          count={segments.length}
          units={units}
          onChange={(p) => patch(seg.id, p)}
          onMove={(dir) => {
            const next = [...segments];
            [next[i], next[i + dir]] = [next[i + dir], next[i]];
            onChange(next);
          }}
          onDuplicate={() => onChange([...segments.slice(0, i + 1), { ...seg, id: crypto.randomUUID() }, ...segments.slice(i + 1)])}
          onDelete={() => onChange(segments.filter((s) => s.id !== seg.id))}
        />
      ))}
      {segments.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line px-6 py-16 text-center text-faint">
          <Repeat className="size-7" />
          <p className="mt-3 text-sm font-medium text-ink/80">No cardio yet</p>
          <p className="mt-1 max-w-xs text-xs">Pick a ready-made session or a modality from the library on the right.</p>
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange([...segments, newSegment(segments.length ? { modality: segments[segments.length - 1].modality } : {})])}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong py-2.5 text-sm text-muted transition hover:border-accent/60 hover:text-accent"
      >
        <Plus className="size-4" /> Add segment
      </button>
    </div>
  );
}

export function CardioLibrary({ onAdd }: { onAdd: (segs: CardioSegment[]) => void }) {
  return (
    <div className="scrollbar-thin h-full overflow-y-auto p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Ready-made sessions</p>
      <div className="space-y-1.5">
        {CARDIO_TEMPLATES.map((t) => {
          const mod = cardioModality(t.segments[t.segments.length - 1].modality ?? "run");
          const Icon = mod.icon;
          return (
            <button
              key={t.label}
              type="button"
              onClick={() => onAdd(t.segments.map((s) => newSegment(s)))}
              className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-2.5 text-left transition hover:border-accent/50 hover:bg-surface-2"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#ff6b8a]/15 text-[#ff6b8a]">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="block text-[11px] text-muted">{t.detail}</span>
              </span>
              <Plus className="size-4 text-faint group-hover:text-accent" />
            </button>
          );
        })}
      </div>
      <p className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Modalities</p>
      <div className="grid grid-cols-2 gap-1.5">
        {CARDIO_MODALITIES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onAdd([newSegment({ modality: m.id })])}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-2 text-left text-xs transition hover:border-accent/50 hover:bg-surface-2"
          >
            <m.icon className="size-3.5 text-[#ff6b8a]" />
            {m.label}
          </button>
        ))}
      </div>
      <p className="mt-5 text-[11px] leading-relaxed text-faint">
        Leg load estimates convert running, riding and rowing into set equivalents, so a long run next to a leg session shows up on the fatigue map.
      </p>
    </div>
  );
}
