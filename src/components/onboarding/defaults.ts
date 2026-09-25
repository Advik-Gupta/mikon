import type { Profile } from "@/lib/types";

export function emptyProfile(): Profile {
  const now = new Date().toISOString();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    personal: { firstName: "", lastName: "", preferredName: "", email: "", phone: "", dob: "", sex: "" },
    address: { line1: "", line2: "", city: "", region: "", postalCode: "", country: "" },
    body: {
      units: "metric",
      heightCm: null,
      weightKg: null,
      bodyFat: null,
      bodyFatMethod: "visual",
      waistCm: null,
      neckCm: null,
      hipCm: null,
    },
    health: { injuries: [], conditions: [], notes: "" },
    experience: { level: "", yearsTraining: 0, activityLevel: "", records: {} },
    training: { modalities: [], sports: [] },
    goals: { ranked: [], timeframe: "12w", targetWeightKg: null, motivation: "" },
    schedule: {
      daysPerWeek: 4,
      sessionMinutes: 60,
      wakeMin: 7 * 60,
      sleepMin: 23 * 60,
      blocks: [],
    },
  };
}

export type Section = Exclude<keyof Profile, "version" | "createdAt" | "updatedAt">;
export type Update = <K extends Section>(section: K, patch: Partial<Profile[K]>) => void;

export interface StepProps {
  draft: Profile;
  update: Update;
}
