import { LEGACY_MODALITIES, MODALITIES } from "./options";
import type { Profile } from "./types";

type Legacy = Profile & {
  goals: Profile["goals"] & { primary?: string; secondary?: string[] };
  schedule: Partial<Profile["schedule"]>;
};

export function migrateProfile(raw: Profile): Profile {
  const p = raw as Legacy;
  const goals = p.goals ?? {};
  const schedule = p.schedule ?? {};
  const validModality = new Set(MODALITIES.map((m) => m.id));
  const modalities = [
    ...new Set((p.training?.modalities ?? []).map((m) => LEGACY_MODALITIES[m] ?? m).filter((m) => validModality.has(m))),
  ];

  return {
    ...p,
    experience: { ...p.experience, records: p.experience?.records ?? {} },
    training: { sports: p.training?.sports ?? [], modalities },
    goals: {
      ranked: goals.ranked ?? [goals.primary, ...(goals.secondary ?? [])].filter((g): g is string => !!g),
      timeframe: goals.timeframe ?? "12w",
      targetWeightKg: goals.targetWeightKg ?? null,
      motivation: goals.motivation ?? "",
    },
    schedule: {
      daysPerWeek: schedule.daysPerWeek ?? 4,
      sessionMinutes: schedule.sessionMinutes ?? 60,
      wakeMin: schedule.wakeMin ?? 7 * 60,
      sleepMin: schedule.sleepMin ?? 23 * 60,
      blocks: schedule.blocks ?? [],
    },
  };
}
