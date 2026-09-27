"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ClipboardList, X } from "lucide-react";
import { defaultBodyFat, navyBodyFat } from "@/lib/body";
import { KEYS, readStored, saveProfile, useSessionUser, writeStored } from "@/lib/storage";
import type { Profile } from "@/lib/types";
import { Logo, LogoMark } from "../graphics/Logo";
import { ProfileSections, type StepId } from "../profile/ProfileSections";
import { Button, cn } from "../ui";
import { emptyProfile, type StepProps, type Update } from "./defaults";
import { StepHeader } from "./StepHeader";
import { AddressStep, isEmail, PersonalStep } from "./steps/About";
import { BodyMetricsStep, CompositionStep } from "./steps/Body";
import { GoalsStep } from "./steps/Goals";
import { HealthStep } from "./steps/Health";
import { ScheduleStep } from "./steps/Schedule";
import { ExperienceStep, ModalitiesStep } from "./steps/Training";
import { WelcomeStep } from "./steps/Welcome";

interface StepDef {
  id: "welcome" | StepId | "review";
  phase: number;
  title: string;
  Comp: ComponentType<StepProps & { goTo: (id: StepId) => void }>;
  /** Returns a message explaining what's missing, or null when the step can be continued. */
  blocker?: (d: Profile) => string | null;
}

const PHASES = ["About you", "Your body", "Training", "Finish"];

function ReviewStep({ draft, goTo }: StepProps & { goTo: (id: StepId) => void }) {
  return (
    <>
      <StepHeader
        icon={ClipboardList}
        eyebrow="Finish · Review"
        title="Does this look right?"
        subtitle="Check your details below. You can edit any section now, or later from your profile."
      />
      <ProfileSections profile={draft} onEdit={goTo} />
    </>
  );
}

const STEPS: StepDef[] = [
  { id: "welcome", phase: 0, title: "Welcome", Comp: WelcomeStep },
  {
    id: "personal",
    phase: 0,
    title: "Contact",
    Comp: PersonalStep,
    blocker: (d) =>
      !d.personal.firstName.trim() ? "Add your first name to continue" : !isEmail(d.personal.email) ? "Add a valid email to continue" : null,
  },
  { id: "address", phase: 0, title: "Address", Comp: AddressStep },
  {
    id: "body",
    phase: 1,
    title: "Measurements",
    Comp: BodyMetricsStep,
    blocker: (d) => (!d.body.heightCm || !d.body.weightKg ? "Add your height and weight to continue" : null),
  },
  { id: "composition", phase: 1, title: "Body fat", Comp: CompositionStep },
  { id: "health", phase: 1, title: "Injuries & health", Comp: HealthStep },
  {
    id: "experience",
    phase: 2,
    title: "Experience",
    Comp: ExperienceStep,
    blocker: (d) => (!d.experience.level ? "Choose your experience level" : null),
  },
  {
    id: "training",
    phase: 2,
    title: "Disciplines",
    Comp: ModalitiesStep,
    blocker: (d) => (d.training.modalities.length === 0 ? "Pick at least one discipline" : null),
  },
  {
    id: "goals",
    phase: 2,
    title: "Goals",
    Comp: GoalsStep,
    blocker: (d) => (d.goals.ranked.length === 0 ? "Pick at least one goal" : null),
  },
  { id: "schedule", phase: 2, title: "Schedule", Comp: ScheduleStep },
  { id: "review", phase: 3, title: "Review", Comp: ReviewStep },
];

interface Draft {
  step: number;
  furthest: number;
  profile: Profile;
}

function finalize(p: Profile): Profile {
  const b = p.body;
  const bodyFat =
    b.bodyFatMethod === "navy"
      ? navyBodyFat(p.personal.sex, b.heightCm, b.waistCm, b.neckCm, b.hipCm)
      : b.bodyFatMethod === "unknown"
        ? null
        : b.bodyFatMethod === "visual"
          ? (b.bodyFat ?? defaultBodyFat(p.personal.sex))
          : b.bodyFat;
  return { ...p, body: { ...b, bodyFat } };
}

export function Onboarding({ editProfile, editStep }: { editProfile?: Profile; editStep?: string }) {
  const router = useRouter();
  const account = useSessionUser();
  const editing = !!editProfile;

  const [state, setState] = useState<Draft>(() => {
    if (editProfile) {
      const idx = Math.max(1, STEPS.findIndex((s) => s.id === editStep));
      return { step: idx, furthest: STEPS.length - 1, profile: editProfile };
    }
    const fresh = emptyProfile();
    if (account) {
      const [first, ...rest] = account.name.split(" ");
      fresh.personal = { ...fresh.personal, firstName: first ?? "", lastName: rest.join(" "), email: account.email };
    }
    return readStored<Draft>(KEYS.draft) ?? { step: 0, furthest: 0, profile: fresh };
  });
  const [dir, setDir] = useState(1);
  const [done, setDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { step, furthest, profile: draft } = state;
  const current = STEPS[step];
  const blocker = current.blocker?.(draft) ?? null;
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    if (!editing) writeStored(KEYS.draft, state);
  }, [state, editing]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [step]);

  const update: Update = (section, patch) =>
    setState((s) => ({ ...s, profile: { ...s.profile, [section]: { ...s.profile[section], ...patch } } }));

  const go = (to: number) => {
    setDir(to > step ? 1 : -1);
    setState((s) => ({ ...s, step: to, furthest: Math.max(s.furthest, to) }));
  };

  const goTo = (id: StepId) => go(STEPS.findIndex((s) => s.id === id));

  // First step (in order) that still has a blocker — you can't jump past it.
  const firstBlocked = STEPS.findIndex((s) => s.blocker?.(draft));
  const canReach = (i: number) => i <= furthest && (firstBlocked === -1 || i <= firstBlocked);

  const finish = () => {
    if (editing) {
      saveProfile(finalize(draft));
      router.push("/profile");
      return;
    }
    // Save after the success overlay: the onboarding gate redirects as soon as a profile exists.
    setDone(true);
    setTimeout(() => {
      saveProfile(finalize({ ...draft, createdAt: new Date().toISOString() }));
      writeStored(KEYS.draft, null);
      router.replace("/");
    }, 1400);
  };

  const Comp = current.Comp;
  const phaseSteps = (ph: number) => STEPS.map((s, i) => ({ ...s, i })).filter((s) => s.phase === ph && s.id !== "welcome");

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      {/* Progress rail */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-line bg-surface/50 p-6 lg:flex">
        <Logo />
        <nav className="mt-12 flex-1 space-y-7">
          {PHASES.map((ph, pi) => {
            const steps = phaseSteps(pi);
            const phaseDone = steps.every((s) => s.i < step);
            const phaseActive = current.phase === pi && current.id !== "welcome";
            return (
              <div key={ph}>
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border text-[11px] font-semibold transition",
                      phaseDone ? "border-accent bg-accent text-accent-ink" : phaseActive ? "border-accent text-accent" : "border-line-strong text-faint",
                    )}
                  >
                    {phaseDone ? <Check className="size-3" strokeWidth={3.5} /> : pi + 1}
                  </span>
                  <span className={cn("text-sm font-semibold", phaseActive || phaseDone ? "text-ink" : "text-faint")}>{ph}</span>
                </div>
                <ul className="ml-3 space-y-0.5 border-l border-line pl-5">
                  {steps.map((s) => {
                    const active = s.i === step;
                    const reachable = canReach(s.i);
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          disabled={!reachable}
                          onClick={() => go(s.i)}
                          className={cn(
                            "relative -ml-px w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] transition",
                            active ? "bg-surface-3 font-medium text-ink" : reachable ? "text-muted hover:text-ink" : "text-faint/70",
                          )}
                        >
                          {active && <motion.span layoutId="rail-dot" className="absolute -left-[23.5px] top-1/2 size-2 -translate-y-1/2 rounded-full bg-accent" />}
                          {s.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
        <p className="text-xs leading-relaxed text-faint">
          {editing ? "Editing your profile." : "Progress saves automatically on this device."}
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header + progress */}
        <div className="border-b border-line px-5 py-3 lg:hidden">
          <div className="flex items-center justify-between">
            <LogoMark size={24} />
            <span className="text-xs text-muted">
              {PHASES[current.phase]} · {step + 1}/{STEPS.length}
            </span>
          </div>
        </div>
        <div className="h-0.5 bg-surface-2">
          <motion.div className="h-full bg-accent" animate={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} transition={{ type: "spring", bounce: 0 }} />
        </div>
        {editing && (
          <div className="flex justify-end px-5 pt-4 sm:px-10">
            <button type="button" onClick={() => router.push("/profile")} className="flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              <X className="size-4" /> Discard changes
            </button>
          </div>
        )}

        <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-10 sm:py-14">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={current.id}
                custom={dir}
                initial={{ opacity: 0, x: dir * 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -32 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <Comp draft={draft} update={update} goTo={goTo} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer nav */}
        <footer className="border-t border-line bg-bg/80 px-5 py-4 backdrop-blur sm:px-10">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => go(step - 1)} disabled={step === 0} className={cn(step === 0 && "invisible")}>
              <ArrowLeft className="size-4" /> Back
            </Button>
            <div className="flex items-center gap-3">
              {blocker && <span className="hidden text-sm text-muted sm:block">{blocker}</span>}
              {editing && !isLast && (
                <Button variant="secondary" onClick={finish} disabled={firstBlocked !== -1}>
                  Save<span className="hidden sm:inline"> changes</span>
                </Button>
              )}
              {isLast ? (
                <Button onClick={finish} className="px-6" disabled={firstBlocked !== -1}>
                  {editing ? "Save changes" : "Enter Mikon"} <Check className="size-4" />
                </Button>
              ) : (
                <Button onClick={() => go(step + 1)} disabled={!!blocker} className="px-6">
                  {step === 0 ? "Let's go" : "Continue"} <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
              className="flex size-20 items-center justify-center rounded-full bg-accent text-accent-ink"
            >
              <Check className="size-10" strokeWidth={3} />
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-6 font-display text-2xl font-semibold">
              You&apos;re all set, {draft.personal.preferredName || draft.personal.firstName}.
            </motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 text-sm text-muted">
              Setting up your board…
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
