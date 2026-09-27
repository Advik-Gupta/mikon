import { blockType, GOALS, labelOf } from "@/lib/options";
import { cycleSummary, STEP_ORDER } from "@/lib/programs";
import type { Program } from "@/lib/types";

const STEP_LABEL: Record<Program["step"], string> = {
  goals: "Setting goals",
  targets: "Setting targets",
  training: "Choosing training",
  structure: "Choosing structure",
  board: "Building the board",
};

export function MiniBoard({ program }: { program: Program }) {
  const days = program.days.length ? program.days : Array.from({ length: 7 }, (_, i) => ({ id: String(i), title: "", blocks: [] }));
  return (
    <div className="flex h-14 gap-1">
      {days.slice(0, 14).map((d) => (
        <div key={d.id} className="flex flex-1 flex-col gap-0.5 rounded-md bg-surface-2 p-0.5">
          {d.blocks.slice(0, 4).map((b) => (
            <span key={b.id} className="h-2.5 rounded-sm" style={{ background: blockType(b.type).color }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function programMeta(p: Program) {
  const major = p.goals.filter((g) => g.tier === "major").map((g) => labelOf(GOALS, g.id));
  const progress = (STEP_ORDER.indexOf(p.step) + 1) / (STEP_ORDER.length + 1);
  return { major, progress, stepLabel: STEP_LABEL[p.step], cycle: p.days.length ? cycleSummary(p) : null };
}
