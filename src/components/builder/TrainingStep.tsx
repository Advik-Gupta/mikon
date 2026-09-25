"use client";

import { Blocks, Check } from "lucide-react";
import { BLOCK_TYPES } from "@/lib/options";
import { StepHeader } from "../onboarding/StepHeader";
import { cn, toggle } from "../ui";
import type { BuilderStepProps } from "./Builder";

export function TrainingStep({ program, update }: BuilderStepProps) {
  const selected = program.blockTypes;

  return (
    <>
      <StepHeader
        icon={Blocks}
        eyebrow="Program · Training"
        title="What goes into this program?"
        subtitle="Each type becomes a block you can drag onto days. We've preselected the training from your profile."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {BLOCK_TYPES.map((b) => {
          const on = selected.includes(b.id);
          const Icon = b.icon!;
          return (
            <button
              key={b.id}
              type="button"
              aria-pressed={on}
              onClick={() => update((p) => ({ ...p, blockTypes: toggle(p.blockTypes, b.id) }))}
              className={cn(
                "group relative flex flex-col items-start gap-3 overflow-hidden rounded-2xl border p-4 text-left transition",
                on ? "bg-surface-2" : "border-line bg-surface hover:border-line-strong",
              )}
              style={on ? { borderColor: `color-mix(in srgb, ${b.color} 60%, transparent)` } : undefined}
            >
              <span className="absolute inset-y-0 left-0 w-1 transition" style={{ background: on ? b.color : "transparent" }} />
              <span
                className={cn(
                  "absolute right-3 top-3 flex size-5 items-center justify-center rounded-md border transition",
                  on ? "border-transparent text-accent-ink" : "border-line-strong text-transparent",
                )}
                style={on ? { background: b.color } : undefined}
              >
                <Check className="size-3" strokeWidth={3.5} />
              </span>
              <span
                className="flex size-10 items-center justify-center rounded-xl"
                style={{ background: `color-mix(in srgb, ${b.color} ${on ? 22 : 10}%, transparent)`, color: b.color }}
              >
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block text-[15px] font-medium">{b.label}</span>
                <span className="mt-0.5 block text-[13px] leading-snug text-muted">{b.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
