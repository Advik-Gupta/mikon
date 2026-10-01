"use client";

import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "motion/react";
import { GripVertical, Plus, Search } from "lucide-react";
import { MUSCLE_GROUPS } from "@/data/muscles";
import { PLYO_INTENSITY, type Discipline } from "@/data/activities";
import { groupsForKeys, searchExercises, titleCase, type Exercise } from "@/lib/explorer";
import { ExerciseImages, ExerciseThumb, LevelDot } from "../../explorer/ExerciseBits";
import { cn } from "../../ui";

export const LIB = "lib:";

const IMPORT_LABEL: Record<string, string> = { strong: "Strong", hevy: "Hevy", lyfta: "Lyfta", macrofactor: "MacroFactor" };

export function ExerciseBadge({ e }: { e: Exercise }) {
  if (e.source === "custom")
    return (
      <span className="rounded bg-info/15 px-1 py-px text-[10px] font-medium text-info">
        {e.importedFrom ? `${IMPORT_LABEL[e.importedFrom] ?? "Imported"} import` : "Custom"}
      </span>
    );
  if (e.discipline === "plyometrics" && e.intensity) {
    const i = PLYO_INTENSITY[e.intensity];
    return (
      <span className="rounded px-1 py-px text-[10px] font-medium" style={{ background: `color-mix(in srgb, ${i.color} 18%, transparent)`, color: i.color }}>
        {i.label}
      </span>
    );
  }
  if (e.family && e.step) {
    return <span className="rounded bg-violet/15 px-1 py-px text-[10px] font-medium text-violet">{e.family} · {e.step}</span>;
  }
  if (e.measure === "time") return <span className="rounded bg-surface-3 px-1 py-px text-[10px] text-muted">Hold</span>;
  return null;
}

function PickerRow({ e, onAdd, open, onToggle }: { e: Exercise; onAdd: () => void; open: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: LIB + e.id, data: { exerciseId: e.id } });
  const groups = groupsForKeys(e.primary).map((g) => MUSCLE_GROUPS.find((x) => x.id === g)?.name);
  return (
    <div className={cn("rounded-xl border border-line bg-surface transition", isDragging && "opacity-40", open && "border-line-strong")}>
      <div className="flex items-center gap-2 p-1.5 pr-2">
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          className="flex min-w-0 flex-1 cursor-grab touch-none select-none items-center gap-2.5 active:cursor-grabbing"
          onClick={onToggle}
        >
          <ExerciseThumb exercise={e} className="size-11 shrink-0 rounded-lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{e.name}</span>
            <span className="flex items-center gap-1.5 truncate text-[11px] text-muted">
              <LevelDot level={e.level} />
              <ExerciseBadge e={e} />
              <span className="truncate">{groups.join(", ")}</span>
            </span>
          </span>
          <GripVertical className="size-4 shrink-0 text-faint" />
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2 text-muted transition hover:border-accent/60 hover:bg-accent hover:text-accent-ink"
          aria-label={`Add ${e.name}`}
          title="Add to workout"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-2 pb-2.5">
              <ExerciseImages exercise={e} className="aspect-[4/3] w-full rounded-lg" />
              <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                {[e.equipment, e.mechanic, e.force, e.level].filter(Boolean).map((t) => (
                  <span key={t} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-muted">
                    {titleCase(t!)}
                  </span>
                ))}
              </div>
              {e.instructions[0] && <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-muted">{e.instructions[0]}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExercisePicker({
  all,
  disciplines,
  blockLabel,
  onAdd,
  onCreate,
}: {
  all: Exercise[];
  disciplines: Discipline[];
  blockLabel: string;
  onAdd: (id: string) => void;
  onCreate?: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [equipment, setEquipment] = useState("");
  const [family, setFamily] = useState("");
  const [suitedOnly, setSuitedOnly] = useState(true);
  const [shown, setShown] = useState(40);
  const [open, setOpen] = useState<string | null>(null);

  const pool = useMemo(() => (suitedOnly ? all.filter((e) => disciplines.includes(e.discipline)) : all), [all, disciplines, suitedOnly]);
  const equipmentList = useMemo(() => [...new Set(pool.map((e) => e.equipment))].sort(), [pool]);
  const families = useMemo(() => [...new Set(pool.map((e) => e.family).filter(Boolean))] as string[], [pool]);
  const results = useMemo(() => {
    let list = q.trim() ? searchExercises(q, pool) : pool;
    if (group) list = list.filter((e) => groupsForKeys(e.primary).includes(group));
    if (equipment) list = list.filter((e) => e.equipment === equipment);
    if (family) list = list.filter((e) => e.family === family).sort((a, b) => (a.step ?? 0) - (b.step ?? 0));
    else if (disciplines.includes("calisthenics") && !q.trim()) {
      list = [...list].sort((a, b) => (a.family ?? "~").localeCompare(b.family ?? "~") || (a.step ?? 0) - (b.step ?? 0));
    }
    return list;
  }, [pool, q, group, equipment, family, disciplines]);

  const select = "h-9 min-w-0 flex-1 cursor-pointer rounded-lg border border-line bg-surface-2 px-2 text-xs outline-none hover:border-line-strong focus:border-accent/60";

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b border-line p-3">
        <div className="flex gap-2">
        <div data-tour="builder-search" className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShown(40);
            }}
            placeholder="Search exercises…"
            className="h-9 w-full rounded-lg border border-line bg-surface-2 pl-9 pr-3 text-sm outline-none placeholder:text-faint hover:border-line-strong focus:border-accent/60"
          />
        </div>
        {onCreate && (
          <button
            type="button"
            onClick={() => onCreate(q.trim())}
            data-tour="builder-create"
            className="flex h-9 shrink-0 items-center gap-1 rounded-lg border border-line bg-surface-2 px-2.5 text-xs font-medium text-muted transition hover:border-accent/60 hover:text-accent"
            title="Create your own exercise"
          >
            <Plus className="size-3.5" /> New
          </button>
        )}
        </div>
        <div className="flex gap-2">
          <select aria-label="Muscle group" value={group} onChange={(e) => setGroup(e.target.value)} className={cn(select, group ? "text-ink" : "text-muted")}>
            <option value="">All muscles</option>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select aria-label="Equipment" value={equipment} onChange={(e) => setEquipment(e.target.value)} className={cn(select, equipment ? "text-ink" : "text-muted")}>
            <option value="">Any equipment</option>
            {equipmentList.map((x) => (
              <option key={x} value={x}>
                {titleCase(x)}
              </option>
            ))}
          </select>
        </div>
        {families.length > 0 && (
          <select aria-label="Progression" value={family} onChange={(e) => setFamily(e.target.value)} className={cn(select, "w-full", family ? "text-ink" : "text-muted")}>
            <option value="">All progressions</option>
            {families.map((f) => (
              <option key={f} value={f}>
                {f} progression
              </option>
            ))}
          </select>
        )}
        <label className="flex cursor-pointer items-center justify-between text-xs text-muted">
          <span>
            Only exercises suited to <span className="text-ink">{blockLabel}</span>
          </span>
          <input type="checkbox" checked={suitedOnly} onChange={(e) => setSuitedOnly(e.target.checked)} className="accent-[#c6f432]" />
        </label>
      </div>
      <p className="px-3 pt-2 text-[11px] text-faint">
        {results.length} exercises · drag into the workout or tap +
      </p>
      <div className="scrollbar-thin min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3 pt-2">
        {results.slice(0, shown).map((e) => (
          <PickerRow key={e.id} e={e} onAdd={() => onAdd(e.id)} open={open === e.id} onToggle={() => setOpen(open === e.id ? null : e.id)} />
        ))}
        {results.length === 0 && (
          <div className="rounded-xl border border-dashed border-line px-3 py-6 text-center">
            <p className="text-sm text-muted">No exercises match{q.trim() ? ` "${q.trim()}"` : ""}.</p>
            {onCreate && (
              <button
                type="button"
                onClick={() => onCreate(q.trim())}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink"
              >
                <Plus className="size-3.5" /> Create {q.trim() ? `"${q.trim()}"` : "an exercise"}
              </button>
            )}
          </div>
        )}
        {shown < results.length && (
          <button type="button" onClick={() => setShown((s) => s + 60)} className="w-full rounded-lg border border-line py-2 text-xs text-muted hover:text-ink">
            Show more · {results.length - shown} left
          </button>
        )}
      </div>
    </div>
  );
}
