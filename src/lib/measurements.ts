export type MetricKind = "mass" | "percent" | "energy" | "length";

export interface MetricDef {
  id: string;
  label: string;
  kind: MetricKind;
  group: "core" | "body";
}

export const METRICS: MetricDef[] = [
  { id: "weight", label: "Weight", kind: "mass", group: "core" },
  { id: "bodyFat", label: "Body fat", kind: "percent", group: "core" },
  { id: "calories", label: "Caloric intake", kind: "energy", group: "core" },
  { id: "neck", label: "Neck", kind: "length", group: "body" },
  { id: "shoulders", label: "Shoulders", kind: "length", group: "body" },
  { id: "chest", label: "Chest", kind: "length", group: "body" },
  { id: "leftBicep", label: "Left bicep", kind: "length", group: "body" },
  { id: "rightBicep", label: "Right bicep", kind: "length", group: "body" },
  { id: "leftForearm", label: "Left forearm", kind: "length", group: "body" },
  { id: "rightForearm", label: "Right forearm", kind: "length", group: "body" },
  { id: "upperAbs", label: "Upper abs", kind: "length", group: "body" },
  { id: "waist", label: "Waist", kind: "length", group: "body" },
  { id: "abdomen", label: "Abdomen", kind: "length", group: "body" },
  { id: "lowerAbs", label: "Lower abs", kind: "length", group: "body" },
  { id: "hips", label: "Hips", kind: "length", group: "body" },
  { id: "leftThigh", label: "Left thigh", kind: "length", group: "body" },
  { id: "rightThigh", label: "Right thigh", kind: "length", group: "body" },
  { id: "leftCalf", label: "Left calf", kind: "length", group: "body" },
  { id: "rightCalf", label: "Right calf", kind: "length", group: "body" },
];

export const METRIC_IDS = METRICS.map((m) => m.id);
export const metricById = (id: string) => METRICS.find((m) => m.id === id);

export interface Measurement {
  id: string;
  metric: string;
  date: string;
  value: number;
  source?: string;
}

export function unitFor(kind: MetricKind, units: "metric" | "imperial") {
  if (kind === "mass") return units === "metric" ? "kg" : "lb";
  if (kind === "length") return units === "metric" ? "cm" : "in";
  if (kind === "percent") return "%";
  return "kcal";
}

export function toDisplay(kind: MetricKind, value: number, units: "metric" | "imperial") {
  if (kind === "mass" && units === "imperial") return value * 2.20462;
  if (kind === "length" && units === "imperial") return value / 2.54;
  return value;
}

export function fromDisplay(kind: MetricKind, value: number, units: "metric" | "imperial") {
  if (kind === "mass" && units === "imperial") return value / 2.20462;
  if (kind === "length" && units === "imperial") return value * 2.54;
  return value;
}

export function fmtMetric(kind: MetricKind, value: number, units: "metric" | "imperial") {
  const v = toDisplay(kind, value, units);
  const digits = kind === "energy" ? 0 : 1;
  return `${Number(v.toFixed(digits)).toLocaleString()} ${unitFor(kind, units)}`;
}

export function hashId(s: string) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}
