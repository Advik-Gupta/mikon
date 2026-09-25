import type { Profile, Sex, Units } from "./types";

export const cmToIn = (cm: number) => cm / 2.54;
export const inToCm = (inch: number) => inch * 2.54;
export const kgToLb = (kg: number) => kg * 2.20462;
export const lbToKg = (lb: number) => lb / 2.20462;

export function formatHeight(cm: number | null, units: Units) {
  if (cm == null) return "—";
  if (units === "metric") return `${Math.round(cm)} cm`;
  const total = Math.round(cmToIn(cm));
  return `${Math.floor(total / 12)}′ ${total % 12}″`;
}

export function formatWeight(kg: number | null, units: Units) {
  if (kg == null) return "—";
  return units === "metric" ? `${round1(kg)} kg` : `${Math.round(kgToLb(kg))} lb`;
}

export function formatLength(cm: number | null, units: Units) {
  if (cm == null) return "—";
  return units === "metric" ? `${round1(cm)} cm` : `${round1(cmToIn(cm))} in`;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

export function bmi(heightCm: number | null, weightKg: number | null) {
  if (!heightCm || !weightKg) return null;
  const m = heightCm / 100;
  return round1(weightKg / (m * m));
}

export function bmiLabel(v: number) {
  if (v < 18.5) return "Underweight";
  if (v < 25) return "Healthy range";
  if (v < 30) return "Overweight";
  return "Obese range";
}

/** US Navy circumference method. Returns null when inputs are insufficient or nonsensical. */
export function navyBodyFat(
  sex: Sex,
  heightCm: number | null,
  waistCm: number | null,
  neckCm: number | null,
  hipCm: number | null,
) {
  if (!heightCm || !waistCm || !neckCm) return null;
  let bf: number;
  if (sex === "female") {
    if (!hipCm || waistCm + hipCm - neckCm <= 0) return null;
    bf =
      495 /
        (1.29579 -
          0.35004 * Math.log10(waistCm + hipCm - neckCm) +
          0.221 * Math.log10(heightCm)) -
      450;
  } else {
    if (waistCm - neckCm <= 0) return null;
    bf =
      495 /
        (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) -
      450;
  }
  if (!isFinite(bf) || bf < 2 || bf > 60) return null;
  return round1(bf);
}

export interface FatBand {
  max: number;
  label: string;
  color: string;
}

export function bodyFatBands(sex: Sex): FatBand[] {
  if (sex === "female") {
    return [
      { max: 13, label: "Essential", color: "#5aaeff" },
      { max: 20, label: "Athletic", color: "#c6f432" },
      { max: 24, label: "Fit", color: "#8be04e" },
      { max: 31, label: "Average", color: "#ffb547" },
      { max: 100, label: "Above average", color: "#ff7a5c" },
    ];
  }
  return [
    { max: 5, label: "Essential", color: "#5aaeff" },
    { max: 13, label: "Athletic", color: "#c6f432" },
    { max: 17, label: "Fit", color: "#8be04e" },
    { max: 24, label: "Average", color: "#ffb547" },
    { max: 100, label: "Above average", color: "#ff7a5c" },
  ];
}

export const defaultBodyFat = (sex: Sex) => (sex === "female" ? 25 : 18);

export const fatBand = (sex: Sex, bf: number) =>
  bodyFatBands(sex).find((b) => bf <= b.max)!;

export function age(dob: string) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}

export function displayName(p: Profile) {
  return p.personal.preferredName || p.personal.firstName || "Athlete";
}

export function initials(p: Profile) {
  const a = p.personal.firstName?.[0] ?? "";
  const b = p.personal.lastName?.[0] ?? "";
  return (a + b).toUpperCase() || "M";
}

/** Seconds → "1:42:05" or "24:30" */
export function fmtClock(sec: number | null) {
  if (sec == null) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}
