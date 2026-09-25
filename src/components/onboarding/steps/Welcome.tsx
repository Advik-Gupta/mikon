"use client";

import { motion } from "motion/react";
import { Activity, ClipboardList, Target, User } from "lucide-react";
import { Figure } from "@/components/graphics/Figure";
import { LogoMark } from "@/components/graphics/Logo";

const PHASES = [
  { icon: User, title: "About you", text: "Contact and address details" },
  { icon: Activity, title: "Your body", text: "Measurements, composition, injuries" },
  { icon: Target, title: "Training", text: "Experience, disciplines, goals, schedule" },
  { icon: ClipboardList, title: "Review", text: "Check everything before you start" },
];

export function WelcomeStep() {
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
      <div>
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.4 }}>
          <LogoMark size={52} />
        </motion.div>
        <h1 className="mt-8 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          Training built around <span className="text-accent">you</span>.
        </h1>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
          Before we build anything, Mikon needs to understand your body, your history and what you want
          out of training. It takes about five minutes, and you can change any of it later from your profile.
        </p>
        <ol className="mt-8 grid gap-3 sm:grid-cols-2">
          {PHASES.map((p, i) => (
            <motion.li
              key={p.title}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-accent">
                <p.icon className="size-4.5" />
              </span>
              <span>
                <span className="block text-sm font-medium">
                  <span className="mr-1.5 font-mono text-faint">0{i + 1}</span>
                  {p.title}
                </span>
                <span className="text-[13px] text-muted">{p.text}</span>
              </span>
            </motion.li>
          ))}
        </ol>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="relative mx-auto hidden w-56 lg:block"
      >
        <div className="absolute inset-x-0 top-1/3 mx-auto size-56 rounded-full bg-accent/10 blur-3xl" />
        <Figure className="relative w-full" fill="var(--color-surface-2)" stroke="var(--color-accent-dim)" />
      </motion.div>
    </div>
  );
}
