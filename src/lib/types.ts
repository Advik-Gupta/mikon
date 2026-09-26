export type Units = "metric" | "imperial";
export type Sex = "male" | "female" | "other" | "na" | "";
export type BodyFatMethod = "visual" | "navy" | "measured" | "unknown";

export type InjurySeverity = "mild" | "moderate" | "severe";
export type InjuryStatus = "current" | "recovering" | "chronic" | "past";

export interface Injury {
  id: string;
  /** Body region id from BODY_REGIONS */
  area: string;
  severity: InjurySeverity;
  status: InjuryStatus;
  note: string;
}

export interface PersonalRecord {
  value: number | null;
  /** Explicitly "never done this" (as opposed to just not filled in) */
  never: boolean;
}

export interface BusyBlock {
  id: string;
  category: string;
  label: string;
  /** 0 = Monday … 6 = Sunday */
  days: number[];
  /** Minutes from midnight, end exclusive */
  start: number;
  end: number;
}

export interface Profile {
  version: 1;
  createdAt: string;
  updatedAt: string;
  personal: {
    firstName: string;
    lastName: string;
    preferredName: string;
    email: string;
    phone: string;
    dob: string;
    sex: Sex;
  };
  address: {
    line1: string;
    line2: string;
    city: string;
    region: string;
    postalCode: string;
    country: string;
  };
  body: {
    units: Units;
    heightCm: number | null;
    weightKg: number | null;
    bodyFat: number | null;
    bodyFatMethod: BodyFatMethod;
    waistCm: number | null;
    neckCm: number | null;
    hipCm: number | null;
  };
  health: {
    injuries: Injury[];
    conditions: string[];
    notes: string;
  };
  experience: {
    level: string;
    yearsTraining: number;
    activityLevel: string;
    /** Personal records keyed by RECORDS id. Lifts in kg, runs in seconds. */
    records: Record<string, PersonalRecord>;
  };
  training: {
    modalities: string[];
    sports: string[];
  };
  goals: {
    /** Goal ids in priority order — index 0 is the top priority. */
    ranked: string[];
    timeframe: string;
    targetWeightKg: number | null;
    motivation: string;
  };
  schedule: {
    daysPerWeek: number;
    sessionMinutes: number;
    /** Minutes from midnight */
    wakeMin: number;
    sleepMin: number;
    /** Recurring commitments when the user can't train */
    blocks: BusyBlock[];
  };
}

export type GoalTier = "major" | "secondary" | "minor";
export type BuilderStep = "goals" | "targets" | "training" | "structure" | "board";
export type CycleType = "weekly" | "biweekly" | "custom" | "freeform";

export interface ProgramGoal {
  id: string;
  tier: GoalTier;
}

export interface ProgramTarget {
  id: string;
  /** TARGET_METRICS id, or "custom" */
  metric: string;
  /** Only used by custom targets */
  label: string;
  unit: string;
  /** Same storage units as the metric (kg, seconds, %) */
  current: number | null;
  /** To reach by the end of the program */
  target: number | null;
}

export type SetKind = "warmup" | "working" | "backoff";

export interface WorkoutSet {
  id: string;
  kind: SetKind;
  /** kg; null = bodyweight / not set */
  weight: number | null;
  reps: number | null;
  /** Rate of perceived exertion, 6–10 */
  rpe: number | null;
  /** SET_MODIFIERS ids, e.g. "dropset", "partials" */
  modifiers: string[];
}

export interface WorkoutExercise {
  id: string;
  /** Exercise database id */
  exerciseId: string;
  sets: WorkoutSet[];
  notes: string;
}

/** One slot in a workout. More than one exercise means a superset. */
export interface WorkoutEntry {
  id: string;
  exercises: WorkoutExercise[];
  /** Rest after the exercise (or superset round), seconds */
  restSec: number | null;
}

export interface ProgramBlock {
  id: string;
  /** BLOCK_TYPES id */
  type: string;
  entries?: WorkoutEntry[];
}

export interface ProgramDay {
  id: string;
  title: string;
  blocks: ProgramBlock[];
}

export interface Program {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "active";
  step: BuilderStep;
  /** In priority order: all majors first, then secondary, then minor */
  goals: ProgramGoal[];
  targets: ProgramTarget[];
  blockTypes: string[];
  structure: {
    cycle: CycleType;
    /** Length of one cycle in days */
    cycleDays: number;
    /** null = ongoing */
    lengthWeeks: number | null;
    startDate: string;
  };
  days: ProgramDay[];
}
