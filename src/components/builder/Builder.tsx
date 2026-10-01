"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CalendarCheck, Check, ChevronDown, ChevronLeft, CloudCheck, CloudOff, Loader2 } from "lucide-react";
import { useSaveStatus } from "@/lib/storage";
import { ProgramOverview } from "./ProgramOverview";
import { useProgramAdvice } from "@/lib/advice";
import { activateProgram, activeProgram, resizeDays, STEP_ORDER, targetDayCount, updateProgram } from "@/lib/programs";
import { usePrograms } from "@/lib/storage";
import { Modal } from "../Modal";
import { toast } from "../Toaster";
import type { BuilderStep, Program } from "@/lib/types";
import { Button, cn } from "../ui";
import { Board } from "./Board";
import { GoalsStep } from "./GoalsStep";
import { StructureStep } from "./StructureStep";
import { TargetsStep } from "./TargetsStep";
import { TrainingStep } from "./TrainingStep";
import { BlockEditor } from "./workout/BlockEditor";

export type ProgramUpdate = (fn: (p: Program) => Program) => void;
export interface BuilderStepProps {
  program: Program;
  update: ProgramUpdate;
  goTo: (s: BuilderStep) => void;
}

const STEPS: { id: BuilderStep; label: string; Comp: ComponentType<BuilderStepProps>; blocker?: (p: Program) => string | null }[] = [
  {
    id: "goals",
    label: "Goals",
    Comp: GoalsStep,
    blocker: (p) => (p.goals.some((g) => g.tier === "major") ? null : "Choose at least one major focus"),
  },
  { id: "targets", label: "Targets", Comp: TargetsStep },
  {
    id: "training",
    label: "Training",
    Comp: TrainingStep,
    blocker: (p) => (p.blockTypes.length ? null : "Pick at least one type of training"),
  },
  { id: "structure", label: "Structure", Comp: StructureStep },
  { id: "board", label: "Build", Comp: Board },
];

function timeAgo(iso: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function SavedIndicator({ updatedAt }: { updatedAt: string }) {
  const status = useSaveStatus();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);
  if (status === "saving") {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
        <Loader2 className="size-4 animate-spin" /> Saving…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-warn sm:flex" title="Changes are kept and will retry">
        <CloudOff className="size-4" /> Offline, retrying
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex" title="Saved to your account">
      <CloudCheck className="size-4 text-accent" /> Saved {timeAgo(updatedAt, Math.max(now, new Date(updatedAt).getTime()))}
    </span>
  );
}

function DoneModal({ program, open, onClose }: { program: Program; open: boolean; onClose: () => void }) {
  const router = useRouter();
  const current = activeProgram(usePrograms());
  const [start, setStart] = useState(!current);
  const [date, setDate] = useState(program.structure.startDate);
  const empty = !program.days.some((d) => d.blocks.length);

  const save = () => {
    if (start && date) activateProgram(program.id, date);
    else updateProgram(program.id, (p) => ({ ...p, status: "ready" }));
    toast({ tone: "success", title: start ? "Program saved and scheduled" : "Program saved", message: "You can edit it any time from its page." });
    router.push(`/programs/${program.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Happy with it for now?"
      subtitle="Nothing is locked in. You can come back and change any part of this program later."
      className="max-w-lg"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Keep editing
          </Button>
          <Button onClick={save} className="px-6">
            <Check className="size-4" strokeWidth={2.5} /> Save program
          </Button>
        </div>
      }
    >
      {empty && <p className="mb-4 rounded-xl border border-warn/30 bg-warn/10 px-3.5 py-2.5 text-sm text-warn">Your board is still empty. You can save it anyway and fill it in later.</p>}
      <label className={cn("flex cursor-pointer gap-3 rounded-2xl border p-4 transition", start ? "border-accent/60 bg-accent/[0.06]" : "border-line hover:border-line-strong")}>
        <input type="checkbox" checked={start} onChange={(e) => setStart(e.target.checked)} className="mt-1 size-4 accent-[#c6f432]" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-sm font-medium">
            <CalendarCheck className="size-4 text-accent" /> Start this program
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Your home page will show each day&apos;s training from this date.
            {current && current.id !== program.id && ` This replaces "${current.name}" as your active program.`}
          </span>
          {start && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-3 h-10 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm outline-none focus:border-accent/60 sm:w-56"
            />
          )}
        </span>
      </label>
    </Modal>
  );
}

export function Builder({ program }: { program: Program }) {
  useProgramAdvice(program);
  const update: ProgramUpdate = (fn) => updateProgram(program.id, fn);
  const idx = STEP_ORDER.indexOf(program.step);
  const current = STEPS[idx];
  const firstBlocked = STEPS.findIndex((s) => s.blocker?.(program));
  const blocker = current.blocker?.(program) ?? null;
  const isBoard = current.id === "board";
  const blockParam = useSearchParams().get("block");
  const editingDay = blockParam ? program.days.find((d) => d.blocks.some((b) => b.id === blockParam && b.type !== "recovery")) : undefined;
  const scrollRef = useRef<HTMLDivElement>(null);
  const overviewRef = useRef<HTMLDivElement>(null);
  const [dir, setDir] = useState(1);
  const [doneOpen, setDoneOpen] = useState(false);
  const router = useRouter();
  const draft = program.status === "draft";
  const finish = () => {
    if (draft) return setDoneOpen(true);
    toast({ tone: "success", title: "Changes saved" });
    router.push(`/programs/${program.id}`);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [program.step]);

  const goTo = (step: BuilderStep) => {
    const to = STEP_ORDER.indexOf(step);
    if (firstBlocked !== -1 && to > firstBlocked) return;
    if (step === "board") {
      const n = targetDayCount(program);
      const dropped = program.days.slice(n).filter((d) => d.blocks.length).length;
      if (dropped && !window.confirm(`The new structure has ${n} days. ${dropped} day(s) at the end with blocks on them will be removed. Continue?`)) return;
      setDir(1);
      update((p) => ({ ...p, step, days: resizeDays(p.days, n) }));
      return;
    }
    setDir(to > idx ? 1 : -1);
    update((p) => ({ ...p, step }));
  };

  const Comp = current.Comp;

  return (
    <div className="flex h-full flex-col">
      <DoneModal key={String(doneOpen)} program={program} open={doneOpen} onClose={() => setDoneOpen(false)} />
      <div className={cn("border-b border-line px-4 pt-4 sm:px-8", editingDay && "pb-4")}>
        <div className="flex items-center gap-3">
          <Link href={draft ? "/programs" : `/programs/${program.id}`} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Back">
            <ChevronLeft className="size-5" />
          </Link>
          <input
            value={program.name}
            onChange={(e) => update((p) => ({ ...p, name: e.target.value }))}
            onBlur={(e) => !e.target.value.trim() && update((p) => ({ ...p, name: "Untitled program" }))}
            className="min-w-0 flex-1 rounded-lg bg-transparent px-1.5 py-1 font-display text-xl font-semibold tracking-tight outline-none hover:bg-surface-2 focus:bg-surface-2 sm:text-2xl"
            aria-label="Program name"
          />
          {draft ? (
            <span className="hidden rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 text-[11px] font-medium text-warn sm:inline">Draft</span>
          ) : (
            <span className="hidden rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent sm:inline">Editing</span>
          )}
          <SavedIndicator updatedAt={program.updatedAt} />
          {(isBoard || !draft) && (
            <Button onClick={finish} className="h-9 px-3 sm:px-4">
              <Check className="size-4" strokeWidth={2.5} /> {draft ? "Done" : "Save"}
            </Button>
          )}
        </div>

        <nav hidden={!!editingDay} className="scrollbar-thin -mb-px mt-4 flex gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const active = i === idx;
            const done = i < idx;
            const reachable = firstBlocked === -1 || i <= firstBlocked;
            return (
              <button
                key={s.id}
                type="button"
                disabled={!reachable}
                onClick={() => goTo(s.id)}
                className={cn(
                  "relative flex items-center gap-2 whitespace-nowrap px-3 pb-3 pt-1 text-sm transition",
                  active ? "text-ink" : reachable ? "text-muted hover:text-ink" : "text-faint",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                    active ? "bg-accent text-accent-ink" : done ? "bg-accent/20 text-accent" : "bg-surface-3 text-muted",
                  )}
                >
                  {done ? <Check className="size-3" strokeWidth={3.5} /> : i + 1}
                </span>
                {s.label}
                {active && <motion.span layoutId="builder-step" className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
              </button>
            );
          })}
        </nav>
      </div>

      {editingDay && blockParam ? (
        <BlockEditor key={blockParam} program={program} dayId={editingDay.id} blockId={blockParam} />
      ) : isBoard ? (
        <div className="scroll-left scrollbar-thin min-h-0 flex-1 overflow-y-auto">
          <div>
            <div className="flex h-[max(520px,calc(100dvh-250px))] flex-col">
              <Board program={program} update={update} goTo={goTo} />
            </div>
            <button
              type="button"
              onClick={() => overviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="flex w-full items-center justify-center gap-2 border-y border-line bg-surface/60 py-2 text-xs text-muted transition hover:text-ink"
            >
              <ChevronDown className="size-3.5" /> Body overview & volume targets
            </button>
            <div ref={overviewRef}>
              <ProgramOverview program={program} />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: dir * 28 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -28 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <Comp program={program} update={update} goTo={goTo} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          <footer className="border-t border-line bg-bg/80 px-4 py-3.5 backdrop-blur sm:px-8">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => goTo(STEP_ORDER[idx - 1])} className={cn(idx === 0 && "invisible")}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <div className="flex items-center gap-3">
                {blocker && <span className="hidden text-sm text-muted sm:block">{blocker}</span>}
                <Button onClick={() => goTo(STEP_ORDER[idx + 1])} disabled={!!blocker} className="px-6">
                  {STEP_ORDER[idx + 1] === "board" ? "Open the board" : "Continue"} <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
