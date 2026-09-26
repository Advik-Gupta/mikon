import {
  Bike,
  Dumbbell,
  Footprints,
  Mountain,
  PersonStanding,
  Ship,
  Snowflake,
  Swords,
  Trophy,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Load coefficients turn non-lifting work into "set equivalents" per muscle group, so a long
 * run and a leg day can be compared on the same scale. They are deliberately simple
 * heuristics, tuned so that e.g. a 90-minute easy run ≈ 6 hard leg sets.
 */

/* ------------------------------------------------------------------ editors */

export type EditorKind = "strength" | "calisthenics" | "plyo" | "mobility" | "cardio" | "session";

export const EDITOR_KIND: Record<string, EditorKind | undefined> = {
  weightlifting: "strength",
  hiit: "strength",
  functional: "strength",
  calisthenics: "calisthenics",
  plyometrics: "plyo",
  mobility: "mobility",
  cardio: "cardio",
  sport: "session",
  combat: "session",
  outdoor: "session",
};

export type Discipline = "weights" | "calisthenics" | "plyometrics" | "cardio" | "mobility";

export const DISCIPLINES: { id: Discipline; label: string; icon: LucideIcon }[] = [
  { id: "weights", label: "Weights", icon: Dumbbell },
  { id: "calisthenics", label: "Calisthenics", icon: PersonStanding },
  { id: "plyometrics", label: "Plyometrics", icon: Zap },
  { id: "cardio", label: "Cardio", icon: Footprints },
  { id: "mobility", label: "Mobility", icon: Wind },
];

/** Which exercise disciplines each block type draws from in the library. */
export const BLOCK_DISCIPLINES: Record<string, Discipline[]> = {
  weightlifting: ["weights"],
  calisthenics: ["calisthenics"],
  plyometrics: ["plyometrics"],
  mobility: ["mobility"],
  hiit: ["weights", "calisthenics", "plyometrics", "cardio"],
  functional: ["weights", "calisthenics", "plyometrics"],
};

/* ------------------------------------------------------------------ plyometrics */

export const PLYO_INTENSITY: Record<string, { label: string; factor: number; color: string }> = {
  low: { label: "Low", factor: 0.35, color: "#5ed1a0" },
  moderate: { label: "Moderate", factor: 0.6, color: "#ffb547" },
  high: { label: "High", factor: 0.9, color: "#ff6b6b" },
};

/** Ground contacts per session, by training age (common coaching guidance). */
export const CONTACT_GUIDE = [
  { level: "Beginner", range: [80, 100] },
  { level: "Intermediate", range: [100, 120] },
  { level: "Advanced", range: [120, 140] },
];

/* ------------------------------------------------------------------ cardio */

export interface CardioModality {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Set equivalents per minute at zone factor 1 */
  rate: number;
  /** Mikon muscle group → share of the load. ≥ 0.6 counts as direct work. */
  muscles: Record<string, number>;
  /** km per minute at zones 1–5, used to fill in distance, time and pace */
  speed: [number, number, number, number, number];
  /** How pace is shown */
  pace: "per-km" | "kmh" | "per-500m" | "per-100m";
}

const kmh = (...v: number[]) => v.map((x) => x / 60) as CardioModality["speed"];

export const CARDIO_MODALITIES: CardioModality[] = [
  { id: "run", label: "Running", icon: Footprints, rate: 0.1, muscles: { calves: 1, quads: 0.9, hamstrings: 0.7, glutes: 0.7, core: 0.2 }, speed: kmh(8.5, 9.7, 11.3, 12.5, 14.3), pace: "per-km" },
  { id: "cycle", label: "Cycling", icon: Bike, rate: 0.07, muscles: { quads: 1, glutes: 0.7, calves: 0.4, hamstrings: 0.4 }, speed: kmh(20, 25, 29, 33, 38), pace: "kmh" },
  { id: "row", label: "Rowing", icon: Ship, rate: 0.08, muscles: { quads: 0.8, lats: 0.8, traps: 0.6, glutes: 0.6, hamstrings: 0.5, biceps: 0.3, core: 0.3 }, speed: kmh(10, 11.5, 12.8, 14, 15.5), pace: "per-500m" },
  { id: "swim", label: "Swimming", icon: Waves, rate: 0.07, muscles: { lats: 1, shoulders: 0.9, triceps: 0.5, chest: 0.4, core: 0.3 }, speed: kmh(2.2, 2.6, 3, 3.4, 3.8), pace: "per-100m" },
  { id: "walk", label: "Walking / hiking", icon: Mountain, rate: 0.035, muscles: { calves: 0.8, quads: 0.6, glutes: 0.6, hamstrings: 0.3 }, speed: kmh(4.5, 5.5, 6.2, 6.8, 7.2), pace: "per-km" },
  { id: "elliptical", label: "Elliptical", icon: Footprints, rate: 0.05, muscles: { quads: 1, glutes: 0.7, calves: 0.4 }, speed: kmh(7, 8.5, 10, 11.5, 13), pace: "kmh" },
  { id: "stairs", label: "Stair climber", icon: Mountain, rate: 0.08, muscles: { quads: 1, glutes: 1, calves: 0.6 }, speed: kmh(2, 2.5, 3, 3.5, 4), pace: "kmh" },
  { id: "skierg", label: "Ski erg", icon: Snowflake, rate: 0.08, muscles: { lats: 1, triceps: 0.6, core: 0.6, shoulders: 0.4 }, speed: kmh(9, 10.5, 12, 13.5, 15), pace: "per-500m" },
  { id: "airbike", label: "Air bike", icon: Bike, rate: 0.09, muscles: { quads: 0.9, glutes: 0.5, shoulders: 0.4, chest: 0.3 }, speed: kmh(18, 22, 26, 30, 34), pace: "kmh" },
  { id: "rope", label: "Jump rope", icon: Zap, rate: 0.09, muscles: { calves: 1, shoulders: 0.2, forearms: 0.2 }, speed: kmh(0, 0, 0, 0, 0), pace: "kmh" },
];

export const cardioModality = (id: string) => CARDIO_MODALITIES.find((m) => m.id === id) ?? CARDIO_MODALITIES[0];

export const ZONES = [
  { zone: 1, label: "Z1", name: "Recovery", factor: 0.5, color: "#8a919c", rpe: "2–3" },
  { zone: 2, label: "Z2", name: "Easy aerobic", factor: 0.7, color: "#5aaeff", rpe: "3–4" },
  { zone: 3, label: "Z3", name: "Tempo", factor: 1, color: "#5ed1a0", rpe: "5–6" },
  { zone: 4, label: "Z4", name: "Threshold", factor: 1.3, color: "#ffb547", rpe: "7–8" },
  { zone: 5, label: "Z5", name: "VO₂ max / sprint", factor: 1.7, color: "#ff6b6b", rpe: "9–10" },
];

export const CARDIO_TYPES: { id: string; label: string; kind: "steady" | "intervals"; zone: number; hint: string }[] = [
  { id: "easy", label: "Easy", kind: "steady", zone: 2, hint: "Conversational pace" },
  { id: "long", label: "Long", kind: "steady", zone: 2, hint: "Extended aerobic effort" },
  { id: "recovery", label: "Recovery", kind: "steady", zone: 1, hint: "Very easy, promotes blood flow" },
  { id: "tempo", label: "Tempo", kind: "steady", zone: 3, hint: "Comfortably hard, sustained" },
  { id: "threshold", label: "Threshold", kind: "intervals", zone: 4, hint: "Repeats near lactate threshold" },
  { id: "intervals", label: "VO₂ intervals", kind: "intervals", zone: 5, hint: "Hard repeats, 2–5 min" },
  { id: "sprints", label: "Sprints", kind: "intervals", zone: 5, hint: "Short all-out efforts" },
  { id: "hills", label: "Hill repeats", kind: "intervals", zone: 5, hint: "Uphill efforts, walk or jog down" },
];

export const cardioType = (id: string) => CARDIO_TYPES.find((t) => t.id === id) ?? CARDIO_TYPES[0];

/** Ready-made sessions for the cardio library. */
export const CARDIO_TEMPLATES: { label: string; detail: string; segments: Partial<import("@/lib/types").CardioSegment>[] }[] = [
  { label: "Easy run", detail: "40 min · Z2", segments: [{ modality: "run", type: "easy", kind: "steady", zone: 2, durationMin: 40 }] },
  { label: "Long run", detail: "90 min · Z2", segments: [{ modality: "run", type: "long", kind: "steady", zone: 2, durationMin: 90 }] },
  { label: "Tempo run", detail: "WU 10' · 20' tempo · CD 10'", segments: [
    { modality: "run", type: "easy", kind: "steady", zone: 2, durationMin: 10, notes: "Warm-up" },
    { modality: "run", type: "tempo", kind: "steady", zone: 3, durationMin: 20 },
    { modality: "run", type: "recovery", kind: "steady", zone: 1, durationMin: 10, notes: "Cool-down" },
  ] },
  { label: "5 × 1 km intervals", detail: "Z5 · 2 min rest", segments: [
    { modality: "run", type: "easy", kind: "steady", zone: 2, durationMin: 12, notes: "Warm-up" },
    { modality: "run", type: "intervals", kind: "intervals", zone: 5, reps: 5, workDistanceM: 1000, restSec: 120 },
  ] },
  { label: "Hill sprints", detail: "8 × 30 s", segments: [{ modality: "run", type: "hills", kind: "intervals", zone: 5, reps: 8, workSec: 30, restSec: 90 }] },
  { label: "Zone 2 ride", detail: "90 min · Z2", segments: [{ modality: "cycle", type: "long", kind: "steady", zone: 2, durationMin: 90 }] },
  { label: "Recovery spin", detail: "30 min · Z1", segments: [{ modality: "cycle", type: "recovery", kind: "steady", zone: 1, durationMin: 30 }] },
  { label: "Row 5 km", detail: "Steady · Z3", segments: [{ modality: "row", type: "tempo", kind: "steady", zone: 3, distanceKm: 5 }] },
  { label: "Swim 1500 m", detail: "Z2", segments: [{ modality: "swim", type: "easy", kind: "steady", zone: 2, distanceKm: 1.5 }] },
  { label: "Air bike sprints", detail: "10 × 20 s", segments: [{ modality: "airbike", type: "sprints", kind: "intervals", zone: 5, reps: 10, workSec: 20, restSec: 40 }] },
];

/* ------------------------------------------------------------------ sessions */

export interface SessionActivity {
  id: string;
  label: string;
  block: "sport" | "combat" | "outdoor";
  /** Set equivalents per minute at RPE 7 */
  rate: number;
  muscles: Record<string, number>;
}

export const SESSION_ACTIVITIES: SessionActivity[] = [
  { id: "football", label: "Football (soccer)", block: "sport", rate: 0.09, muscles: { quads: 0.9, hamstrings: 0.9, calves: 0.8, glutes: 0.7, adductors: 0.6 } },
  { id: "basketball", label: "Basketball", block: "sport", rate: 0.09, muscles: { calves: 0.9, quads: 0.8, glutes: 0.6, shoulders: 0.3 } },
  { id: "tennis", label: "Tennis / racket", block: "sport", rate: 0.07, muscles: { calves: 0.7, quads: 0.6, shoulders: 0.6, forearms: 0.5, core: 0.5 } },
  { id: "rugby", label: "Rugby / American football", block: "sport", rate: 0.1, muscles: { quads: 0.8, glutes: 0.7, traps: 0.6, shoulders: 0.6, neck: 0.5, hamstrings: 0.6 } },
  { id: "volleyball", label: "Volleyball", block: "sport", rate: 0.07, muscles: { calves: 0.8, quads: 0.8, shoulders: 0.6 } },
  { id: "cricket", label: "Cricket", block: "sport", rate: 0.05, muscles: { shoulders: 0.6, core: 0.5, quads: 0.5, forearms: 0.4 } },
  { id: "hockey", label: "Hockey", block: "sport", rate: 0.09, muscles: { quads: 0.9, glutes: 0.8, adductors: 0.7, core: 0.5 } },
  { id: "swimming-sport", label: "Swim training", block: "sport", rate: 0.07, muscles: { lats: 1, shoulders: 0.9, triceps: 0.5 } },
  { id: "sport-other", label: "Other sport", block: "sport", rate: 0.07, muscles: { quads: 0.6, calves: 0.6, glutes: 0.5, shoulders: 0.4 } },
  { id: "boxing", label: "Boxing / kickboxing", block: "combat", rate: 0.09, muscles: { shoulders: 0.9, core: 0.6, calves: 0.6, triceps: 0.4 } },
  { id: "muay-thai", label: "Muay Thai", block: "combat", rate: 0.1, muscles: { shoulders: 0.8, core: 0.7, quads: 0.6, calves: 0.6, glutes: 0.5 } },
  { id: "bjj", label: "BJJ / grappling", block: "combat", rate: 0.1, muscles: { forearms: 0.9, core: 0.7, lats: 0.6, adductors: 0.6, neck: 0.5, biceps: 0.4 } },
  { id: "wrestling", label: "Wrestling", block: "combat", rate: 0.11, muscles: { quads: 0.7, lats: 0.7, forearms: 0.7, neck: 0.7, core: 0.7 } },
  { id: "mma", label: "MMA", block: "combat", rate: 0.11, muscles: { shoulders: 0.7, core: 0.7, forearms: 0.6, quads: 0.6, neck: 0.5 } },
  { id: "hiking", label: "Hiking", block: "outdoor", rate: 0.05, muscles: { quads: 0.8, glutes: 0.7, calves: 0.7, hamstrings: 0.4 } },
  { id: "climbing", label: "Climbing / bouldering", block: "outdoor", rate: 0.1, muscles: { forearms: 1, lats: 0.9, biceps: 0.7, shoulders: 0.4, core: 0.4 } },
  { id: "trail", label: "Trail running", block: "outdoor", rate: 0.11, muscles: { calves: 1, quads: 1, glutes: 0.8, hamstrings: 0.6 } },
  { id: "paddling", label: "Kayak / paddle", block: "outdoor", rate: 0.07, muscles: { lats: 0.9, shoulders: 0.8, core: 0.6, biceps: 0.4 } },
  { id: "snow", label: "Skiing / snowboarding", block: "outdoor", rate: 0.08, muscles: { quads: 1, glutes: 0.7, core: 0.5, calves: 0.4 } },
  { id: "surf", label: "Surfing", block: "outdoor", rate: 0.06, muscles: { lats: 0.8, shoulders: 0.8, core: 0.5, quads: 0.4 } },
];

export const sessionActivity = (id: string) => SESSION_ACTIVITIES.find((a) => a.id === id) ?? SESSION_ACTIVITIES[0];

export const SESSION_ICON: Record<string, LucideIcon> = { sport: Trophy, combat: Swords, outdoor: Mountain };

/** Share of a muscle's load that counts as direct work (shown as sets); the rest is indirect. */
export const DIRECT_SHARE = 0.6;
