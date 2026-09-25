"use client";

import { AnimatePresence, motion } from "motion/react";
import { Bandage, MousePointerClick, Trash2 } from "lucide-react";
import { CONDITIONS, INJURY_SEVERITY, INJURY_STATUS, regionLabel } from "@/lib/options";
import type { Injury, InjurySeverity, InjuryStatus } from "@/lib/types";
import { BodyMap, SEVERITY_COLOR } from "@/components/graphics/BodyMap";
import { Chip, cn, Input, SectionLabel, Textarea, toggle } from "@/components/ui";
import { StepHeader } from "../StepHeader";
import type { StepProps } from "../defaults";

export function HealthStep({ draft, update }: StepProps) {
  const h = draft.health;
  const set = (patch: Partial<typeof h>) => update("health", patch);
  const marked = Object.fromEntries(h.injuries.map((i) => [i.area, i.severity]));

  const toggleArea = (area: string) => {
    if (h.injuries.some((i) => i.area === area)) {
      set({ injuries: h.injuries.filter((i) => i.area !== area) });
    } else {
      const injury: Injury = { id: crypto.randomUUID(), area, severity: "moderate", status: "current", note: "" };
      set({ injuries: [...h.injuries, injury] });
    }
  };
  const patchInjury = (id: string, patch: Partial<Injury>) =>
    set({ injuries: h.injuries.map((i) => (i.id === id ? { ...i, ...patch } : i)) });

  return (
    <>
      <StepHeader
        icon={Bandage}
        eyebrow="Your body · Health"
        title="Any injuries or limitations?"
        subtitle="Tap areas on the body that hurt, are healing, or have given you trouble before. Programs will work around them."
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-3xl border border-line bg-surface p-5">
          <BodyMap marked={marked} onToggle={toggleArea} />
          <div className="mt-4 flex justify-center gap-4 text-[11px] text-muted">
            {(Object.keys(SEVERITY_COLOR) as InjurySeverity[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5 capitalize">
                <span className="size-2 rounded-full" style={{ background: SEVERITY_COLOR[s] }} />
                {s}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          {h.injuries.length === 0 ? (
            <div className="flex h-full min-h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-line p-8 text-center">
              <MousePointerClick className="size-7 text-faint" />
              <p className="mt-3 text-sm font-medium">No injuries marked</p>
              <p className="mt-1 max-w-xs text-[13px] text-muted">
                Tap a point on the figure to add one. Flip to the back view for your spine, glutes, hamstrings and calves.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              <AnimatePresence initial={false}>
                {h.injuries.map((inj) => (
                  <motion.li
                    key={inj.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="rounded-2xl border border-line bg-surface p-4"
                    style={{ borderLeft: `3px solid ${SEVERITY_COLOR[inj.severity]}` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{regionLabel(inj.area)}</span>
                      <button
                        type="button"
                        onClick={() => toggleArea(inj.area)}
                        className="rounded-lg p-1.5 text-faint transition hover:bg-danger/10 hover:text-danger"
                        aria-label="Remove injury"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <span className="mb-1.5 block text-xs text-muted">Severity</span>
                        <div className="flex gap-1.5">
                          {INJURY_SEVERITY.map((s) => {
                            const active = inj.severity === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                title={s.description}
                                onClick={() => patchInjury(inj.id, { severity: s.id as InjurySeverity })}
                                className={cn(
                                  "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition",
                                  active ? "text-accent-ink" : "border-line text-muted hover:text-ink",
                                )}
                                style={active ? { background: SEVERITY_COLOR[s.id as InjurySeverity], borderColor: "transparent" } : undefined}
                              >
                                {s.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <span className="mb-1.5 block text-xs text-muted">Status</span>
                        <div className="flex flex-wrap gap-1.5">
                          {INJURY_STATUS.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => patchInjury(inj.id, { status: s.id as InjuryStatus })}
                              className={cn(
                                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                                inj.status === s.id ? "border-ink bg-ink text-bg" : "border-line text-muted hover:text-ink",
                              )}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Input
                      className="mt-3 h-9 text-sm"
                      placeholder="Details, e.g. 'hurts on overhead press', 'ACL reconstruction 2023'"
                      value={inj.note}
                      onChange={(e) => patchInjury(inj.id, { note: e.target.value })}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </div>

      <div className="mt-10">
        <SectionLabel>Medical conditions</SectionLabel>
        <div className="flex flex-wrap gap-2">
          <Chip selected={h.conditions.length === 0} onClick={() => set({ conditions: [] })}>
            None
          </Chip>
          {CONDITIONS.map((c) => (
            <Chip key={c.id} selected={h.conditions.includes(c.id)} onClick={() => set({ conditions: toggle(h.conditions, c.id) })}>
              {c.label}
            </Chip>
          ))}
        </div>
        <Textarea
          className="mt-4"
          placeholder="Anything else a coach should know? Medications, surgeries, doctor's restrictions…"
          value={h.notes}
          onChange={(e) => set({ notes: e.target.value })}
        />
        <p className="mt-2 text-xs text-faint">Mikon isn&apos;t medical advice. Check with a doctor before training around a serious condition.</p>
      </div>
    </>
  );
}
