import {
  Activity,
  Anchor,
  BedDouble,
  ArrowUpToLine,
  BicepsFlexed,
  Brain,
  Briefcase,
  CalendarCheck,
  Car,
  CircleDot,
  Flame,
  Dumbbell,
  Footprints,
  Gauge,
  Goal,
  GraduationCap,
  Hand,
  Heart,
  HeartPulse,
  Leaf,
  Medal,
  Mountain,
  PersonStanding,
  Repeat,
  Scale,
  Swords,
  Target,
  Trophy,
  Users,
  Weight,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface Option {
  id: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

export const SEX_OPTIONS: Option[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
  { id: "other", label: "Other" },
  { id: "na", label: "Prefer not to say" },
];

export const BODY_FAT_METHODS: Option[] = [
  { id: "visual", label: "Visual estimate", description: "Drag the slider until it looks right" },
  { id: "navy", label: "Tape measure", description: "US Navy method from a few measurements" },
  { id: "measured", label: "I know it", description: "DEXA, BodPod, calipers, smart scale" },
  { id: "unknown", label: "Skip for now" },
];

export interface BodyRegion {
  id: string;
  label: string;
  view: "front" | "back";
  x: number;
  y: number;
}

export const BODY_REGIONS: BodyRegion[] = [
  { id: "neck", label: "Neck", view: "front", x: 100, y: 78 },
  { id: "shoulder-l", label: "Left shoulder", view: "front", x: 138, y: 98 },
  { id: "shoulder-r", label: "Right shoulder", view: "front", x: 62, y: 98 },
  { id: "chest", label: "Chest", view: "front", x: 100, y: 118 },
  { id: "elbow-l", label: "Left elbow", view: "front", x: 150, y: 160 },
  { id: "elbow-r", label: "Right elbow", view: "front", x: 50, y: 160 },
  { id: "wrist-l", label: "Left wrist / hand", view: "front", x: 158, y: 212 },
  { id: "wrist-r", label: "Right wrist / hand", view: "front", x: 42, y: 212 },
  { id: "core", label: "Abdomen / core", view: "front", x: 100, y: 165 },
  { id: "hip-l", label: "Left hip / groin", view: "front", x: 120, y: 205 },
  { id: "hip-r", label: "Right hip / groin", view: "front", x: 80, y: 205 },
  { id: "quad-l", label: "Left quad", view: "front", x: 118, y: 245 },
  { id: "quad-r", label: "Right quad", view: "front", x: 82, y: 245 },
  { id: "knee-l", label: "Left knee", view: "front", x: 116, y: 290 },
  { id: "knee-r", label: "Right knee", view: "front", x: 84, y: 290 },
  { id: "ankle-l", label: "Left ankle / foot", view: "front", x: 114, y: 372 },
  { id: "ankle-r", label: "Right ankle / foot", view: "front", x: 86, y: 372 },
  { id: "upper-back", label: "Upper back", view: "back", x: 100, y: 118 },
  { id: "rotator-l", label: "Left rotator cuff", view: "back", x: 62, y: 104 },
  { id: "rotator-r", label: "Right rotator cuff", view: "back", x: 138, y: 104 },
  { id: "lower-back", label: "Lower back", view: "back", x: 100, y: 172 },
  { id: "glute-l", label: "Left glute", view: "back", x: 84, y: 205 },
  { id: "glute-r", label: "Right glute", view: "back", x: 116, y: 205 },
  { id: "hamstring-l", label: "Left hamstring", view: "back", x: 82, y: 250 },
  { id: "hamstring-r", label: "Right hamstring", view: "back", x: 118, y: 250 },
  { id: "calf-l", label: "Left calf / achilles", view: "back", x: 84, y: 330 },
  { id: "calf-r", label: "Right calf / achilles", view: "back", x: 116, y: 330 },
];

export const regionLabel = (id: string) =>
  BODY_REGIONS.find((r) => r.id === id)?.label ?? id;

export const INJURY_SEVERITY: Option[] = [
  { id: "mild", label: "Mild", description: "Noticeable, doesn't limit training" },
  { id: "moderate", label: "Moderate", description: "Limits some movements" },
  { id: "severe", label: "Severe", description: "Avoid loading this area" },
];

export const INJURY_STATUS: Option[] = [
  { id: "current", label: "Current" },
  { id: "recovering", label: "Recovering" },
  { id: "chronic", label: "Chronic" },
  { id: "past", label: "Past / healed" },
];

export const CONDITIONS: Option[] = [
  { id: "asthma", label: "Asthma" },
  { id: "hypertension", label: "High blood pressure" },
  { id: "heart", label: "Heart condition" },
  { id: "diabetes", label: "Diabetes" },
  { id: "joint", label: "Arthritis / joint issues" },
  { id: "pregnancy", label: "Pregnant / postpartum" },
  { id: "osteoporosis", label: "Low bone density" },
  { id: "dizziness", label: "Dizziness / fainting" },
];

export const EXPERIENCE_LEVELS: (Option & { bars: number })[] = [
  { id: "beginner", label: "Beginner", description: "New to structured training", bars: 1 },
  { id: "novice", label: "Novice", description: "Under a year, learning the lifts", bars: 2 },
  { id: "intermediate", label: "Intermediate", description: "1–3 years, consistent progress", bars: 3 },
  { id: "advanced", label: "Advanced", description: "3+ years, progress needs planning", bars: 4 },
  { id: "elite", label: "Elite", description: "Competitive athlete", bars: 5 },
];

export const ACTIVITY_LEVELS: Option[] = [
  { id: "sedentary", label: "Sedentary", description: "Desk job, little movement" },
  { id: "light", label: "Lightly active", description: "On your feet some of the day" },
  { id: "moderate", label: "Moderately active", description: "Active job or daily walks" },
  { id: "very", label: "Very active", description: "Physical job or training daily" },
];

export const MODALITIES: Option[] = [
  { id: "strength", label: "Strength training", icon: Weight, description: "Powerlifting, Olympic lifting, heavy compounds" },
  { id: "hypertrophy", label: "Bodybuilding", icon: BicepsFlexed, description: "Building muscle size and shape" },
  { id: "calisthenics", label: "Calisthenics", icon: PersonStanding, description: "Bodyweight strength and skills" },
  { id: "cardio", label: "Cardio", icon: HeartPulse, description: "Running, cycling, swimming, rowing, marathons" },
  { id: "hiit", label: "HIIT & conditioning", icon: Flame, description: "Intervals, circuits, metcons" },
  { id: "functional", label: "Functional fitness", icon: Anchor, description: "CrossFit, Hyrox, mixed-modal" },
  { id: "plyometrics", label: "Plyometrics", icon: Zap, description: "Jumps, sprints, explosive power" },
  { id: "mobility", label: "Mobility & flexibility", icon: Wind, description: "Stretching, yoga, pilates" },
  { id: "combat", label: "Combat sports", icon: Swords, description: "Boxing, martial arts, wrestling" },
  { id: "outdoor", label: "Outdoor & adventure", icon: Mountain, description: "Hiking, climbing, trail" },
  { id: "sports", label: "Sports", icon: Trophy, description: "Train for a sport you play" },
];

export const LEGACY_MODALITIES: Record<string, string> = {
  powerlifting: "strength",
  olympic: "strength",
  running: "cardio",
  cycling: "cardio",
  endurance: "cardio",
  yoga: "mobility",
};

export const SPORTS = [
  "Football (soccer)",
  "American football",
  "Basketball",
  "Tennis",
  "Cricket",
  "Rugby",
  "Baseball",
  "Volleyball",
  "Swimming",
  "Track & field",
  "Hockey",
  "Badminton",
  "Golf",
  "Climbing",
  "Skiing / snowboarding",
  "Rowing",
  "Squash",
  "Surfing",
];

export const GOALS: Option[] = [
  { id: "build-muscle", label: "Build muscle", icon: BicepsFlexed },
  { id: "get-stronger", label: "Get stronger", icon: Weight },
  { id: "lose-fat", label: "Lose fat", icon: Flame },
  { id: "endurance", label: "Improve cardio", icon: HeartPulse },
  { id: "athletic", label: "Athletic performance", icon: Medal },
  { id: "recomp", label: "Body recomposition", icon: Scale },
  { id: "power", label: "Power & explosiveness", icon: Zap },
  { id: "speed", label: "Speed", icon: Gauge },
  { id: "vertical", label: "Jump higher", icon: ArrowUpToLine },
  { id: "mobility", label: "Better mobility", icon: Wind },
  { id: "skills", label: "Learn skills", icon: Target },
  { id: "compete", label: "Prepare for competition", icon: Trophy },
  { id: "rehab", label: "Rehab from injury", icon: Goal },
  { id: "posture", label: "Improve posture", icon: PersonStanding },
  { id: "health", label: "General health", icon: Activity },
  { id: "longevity", label: "Longevity", icon: Leaf },
  { id: "work-capacity", label: "Work capacity", icon: Repeat },
  { id: "balance", label: "Balance & stability", icon: Footprints },
  { id: "grip", label: "Grip strength", icon: Hand },
  { id: "stress", label: "Stress relief", icon: Brain },
  { id: "consistency", label: "Build a habit", icon: CalendarCheck },
];

export const WEIGHT_GOALS = ["build-muscle", "lose-fat", "recomp", "compete"];

export const TIMEFRAMES: Option[] = [
  { id: "4w", label: "4 weeks" },
  { id: "8w", label: "8 weeks" },
  { id: "12w", label: "12 weeks" },
  { id: "6m", label: "6 months" },
  { id: "1y", label: "1 year" },
  { id: "ongoing", label: "Ongoing" },
];

export const BUSY_CATEGORIES: (Option & { color: string })[] = [
  { id: "work", label: "Work", icon: Briefcase, color: "#5aaeff" },
  { id: "school", label: "Study", icon: GraduationCap, color: "#a78bfa" },
  { id: "commute", label: "Commute", icon: Car, color: "#8a919c" },
  { id: "family", label: "Family", icon: Heart, color: "#ff8fab" },
  { id: "social", label: "Social", icon: Users, color: "#ffb547" },
  { id: "other", label: "Other", icon: CircleDot, color: "#5ed1a0" },
];

export const busyCategory = (id: string) => BUSY_CATEGORIES.find((c) => c.id === id) ?? BUSY_CATEGORIES[BUSY_CATEGORIES.length - 1];

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const labelOf = (list: Option[], id: string) =>
  list.find((o) => o.id === id)?.label ?? id;

export interface RecordDef {
  id: string;
  label: string;
  kind: "lift" | "run";
  short: string;
}

export const RECORDS: RecordDef[] = [
  { id: "bench", label: "Bench press", short: "Bench", kind: "lift" },
  { id: "squat", label: "Back squat", short: "Squat", kind: "lift" },
  { id: "deadlift", label: "Deadlift", short: "Deadlift", kind: "lift" },
  { id: "5k", label: "5K", short: "5K", kind: "run" },
  { id: "10k", label: "10K", short: "10K", kind: "run" },
  { id: "half", label: "Half marathon", short: "Half", kind: "run" },
  { id: "marathon", label: "Marathon", short: "Marathon", kind: "run" },
];

export const BLOCK_TYPES: (Option & { color: string })[] = [
  { id: "weightlifting", label: "Weightlifting", icon: Dumbbell, color: "#c6f432", description: "Strength, power & hypertrophy" },
  { id: "calisthenics", label: "Calisthenics", icon: PersonStanding, color: "#5ed1a0", description: "Bodyweight strength & skills" },
  { id: "plyometrics", label: "Plyometrics", icon: Zap, color: "#ffd447", description: "Jumps, bounds, sprints" },
  { id: "cardio", label: "Cardio", icon: HeartPulse, color: "#ff6b8a", description: "Runs, rides, swims, rows" },
  { id: "hiit", label: "HIIT", icon: Flame, color: "#ff9a3c", description: "Intervals & conditioning" },
  { id: "functional", label: "Functional", icon: Anchor, color: "#5aaeff", description: "CrossFit, Hyrox-style work" },
  { id: "mobility", label: "Mobility", icon: Wind, color: "#a78bfa", description: "Stretching, yoga, pilates" },
  { id: "combat", label: "Combat", icon: Swords, color: "#ff5c5c", description: "Striking, grappling" },
  { id: "sport", label: "Sport practice", icon: Trophy, color: "#3dd6d0", description: "Skills & game time" },
  { id: "outdoor", label: "Outdoor", icon: Mountain, color: "#8be04e", description: "Hikes, climbs, trails" },
  { id: "recovery", label: "Recovery", icon: BedDouble, color: "#8a919c", description: "Active recovery & rest" },
];

export const blockType = (id: string) => BLOCK_TYPES.find((b) => b.id === id) ?? BLOCK_TYPES[BLOCK_TYPES.length - 1];

export const MODALITY_TO_BLOCK: Record<string, string> = {
  strength: "weightlifting",
  hypertrophy: "weightlifting",
  calisthenics: "calisthenics",
  cardio: "cardio",
  hiit: "hiit",
  functional: "functional",
  plyometrics: "plyometrics",
  mobility: "mobility",
  combat: "combat",
  outdoor: "outdoor",
  sports: "sport",
};

export interface TargetMetric {
  id: string;
  label: string;
  kind: "weight" | "time" | "percent";
  record?: string;
  goals: string[];
}

export const TARGET_METRICS: TargetMetric[] = [
  { id: "bench", label: "Bench press 1RM", kind: "weight", record: "bench", goals: ["get-stronger", "build-muscle", "compete"] },
  { id: "squat", label: "Squat 1RM", kind: "weight", record: "squat", goals: ["get-stronger", "athletic", "compete", "vertical"] },
  { id: "deadlift", label: "Deadlift 1RM", kind: "weight", record: "deadlift", goals: ["get-stronger", "compete", "grip"] },
  { id: "5k", label: "5K time", kind: "time", record: "5k", goals: ["endurance", "speed", "lose-fat"] },
  { id: "10k", label: "10K time", kind: "time", record: "10k", goals: ["endurance"] },
  { id: "half", label: "Half marathon time", kind: "time", record: "half", goals: ["endurance", "compete"] },
  { id: "marathon", label: "Marathon time", kind: "time", record: "marathon", goals: ["endurance", "compete"] },
  { id: "bodyweight", label: "Body weight", kind: "weight", goals: ["lose-fat", "build-muscle", "recomp"] },
  { id: "bodyfat", label: "Body fat", kind: "percent", goals: ["lose-fat", "recomp"] },
];
