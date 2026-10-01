export type Units = "metric" | "imperial";
export type Sex = "male" | "female" | "other" | "na" | "";
export type BodyFatMethod = "visual" | "navy" | "measured" | "unknown";

export type InjurySeverity = "mild" | "moderate" | "severe";
export type InjuryStatus = "current" | "recovering" | "chronic" | "past";

export interface Injury {
  id: string;
  area: string;
  severity: InjurySeverity;
  status: InjuryStatus;
  note: string;
}

export interface PersonalRecord {
  value: number | null;
  never: boolean;
}

export interface BusyBlock {
  id: string;
  category: string;
  label: string;
  days: number[];
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
    records: Record<string, PersonalRecord>;
  };
  training: {
    modalities: string[];
    sports: string[];
  };
  goals: {
    ranked: string[];
    timeframe: string;
    targetWeightKg: number | null;
    motivation: string;
  };
  schedule: {
    daysPerWeek: number;
    sessionMinutes: number;
    wakeMin: number;
    sleepMin: number;
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
  metric: string;
  label: string;
  unit: string;
  current: number | null;
  target: number | null;
}

export type SetKind = "warmup" | "working" | "backoff";

export interface WorkoutSet {
  id: string;
  kind: SetKind;
  weight: number | null;
  reps: number | null;
  holdSec?: number | null;
  rpe: number | null;
  modifiers: string[];
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: WorkoutSet[];
  notes: string;
}

export interface WorkoutEntry {
  id: string;
  exercises: WorkoutExercise[];
  restSec: number | null;
}

export interface CardioSegment {
  id: string;
  modality: string;
  type: string;
  kind: "steady" | "intervals";
  zone: number;
  durationMin: number | null;
  distanceKm: number | null;
  reps: number | null;
  workSec: number | null;
  workDistanceM: number | null;
  restSec: number | null;
  notes: string;
}

export interface SessionDetail {
  activity: string;
  durationMin: number | null;
  rpe: number;
  notes: string;
}

export interface ProgramBlock {
  id: string;
  type: string;
  entries?: WorkoutEntry[];
  cardio?: CardioSegment[];
  session?: SessionDetail;
}

export interface ProgramDay {
  id: string;
  title: string;
  blocks: ProgramBlock[];
}

export interface VolumeTarget {
  id: string;
  kind: "group" | "muscle";
  ref: string;
  minSets: number | null;
  minFreq: number | null;
}

export type Visibility = "private" | "friends" | "public";

export interface Program {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "ready";
  activeFrom?: string | null;
  visibility?: Visibility;
  step: BuilderStep;
  goals: ProgramGoal[];
  targets: ProgramTarget[];
  blockTypes: string[];
  structure: {
    cycle: CycleType;
    cycleDays: number;
    lengthWeeks: number | null;
    startDate: string;
  };
  days: ProgramDay[];
  volumeTargets?: VolumeTarget[];
}

export interface LoggedSet {
  weight: number | null;
  reps: number | null;
  holdSec: number | null;
  done: boolean;
  rir?: number | null;
  kind?: SetKind;
}

export interface LoggedExercise {
  exerciseId: string;
  note?: string;
  sets: LoggedSet[];
}

export interface WorkoutLog {
  id: string;
  programId: string;
  date: string;
  dayIndex: number;
  name?: string;
  startedAt?: string;
  durationSec?: number;
  exercises: LoggedExercise[];
  notes: string;
  completedAt: string | null;
}
