import { strFromU8, unzipSync } from "fflate";
import { hashId } from "../measurements";

export type AppId = "strong" | "hevy" | "lyfta" | "macrofactor";
export type SetKind = "warmup" | "working" | "failure" | "drop";

export interface ImportSet {
  weight: number | null;
  reps: number | null;
  seconds: number | null;
  distanceKm: number | null;
  kind: SetKind;
  rir: number | null;
}

export interface ImportExercise {
  name: string;
  note: string;
  sets: ImportSet[];
}

export interface ImportWorkout {
  key: string;
  app: AppId;
  name: string;
  start: string;
  durationSec: number | null;
  notes: string;
  exercises: ImportExercise[];
}

export interface ImportMeasurement {
  key: string;
  metric: string;
  date: string;
  value: number;
}

export interface ParsedFile {
  file: string;
  app: AppId;
  kind: "workouts" | "measurements";
  workouts: ImportWorkout[];
  measurements: ImportMeasurement[];
  weightUnitKnown: boolean;
}

export interface ParseOptions {
  weightUnit: "kg" | "lb";
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}

const records = (rows: string[][]) => {
  const head = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
};

const num = (v: string | undefined) => {
  if (v == null) return null;
  const t = v.replace(/;/g, "").replace(/\s/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const pos = (v: number | null) => (v != null && v > 0 ? v : null);

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function parseDate(v: string): Date | null {
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 12), +(m[5] ?? 0), +(m[6] ?? 0));
  m = s.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4}),? ?(\d{1,2})?:?(\d{2})?/);
  if (m) {
    const mon = MONTHS.indexOf(m[2].toLowerCase());
    if (mon >= 0) return new Date(+m[3], mon, +m[1], +(m[4] ?? 12), +(m[5] ?? 0));
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[1] - 1, +m[2], 12);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const excelDate = (serial: number) => {
  const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial * 86400000));
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12);
};

function clockSeconds(v: string) {
  const parts = v.split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p))) return null;
  return parts.reduce((a, p) => a * 60 + p, 0);
}

function strongDuration(v: string) {
  const h = Number(v.match(/(\d+)\s*h/)?.[1] ?? 0);
  const m = Number(v.match(/(\d+)\s*m(?!s)/)?.[1] ?? 0);
  const s = Number(v.match(/(\d+)\s*s/)?.[1] ?? 0);
  const total = h * 3600 + m * 60 + s;
  return total || null;
}

const rirFromRpe = (rpe: number | null) => (rpe == null || rpe <= 0 ? null : Math.max(0, Math.min(10, Math.round(10 - rpe))));
const iso = (d: Date) => d.toISOString();

function builder(app: AppId) {
  const workouts = new Map<string, ImportWorkout>();
  return {
    add(name: string, start: Date, durationSec: number | null, notes: string, exercise: string, note: string, set: ImportSet | null) {
      const key = `${app}|${iso(start)}|${name}`;
      let w = workouts.get(key);
      if (!w) workouts.set(key, (w = { key: hashId(key), app, name: name || "Workout", start: iso(start), durationSec, notes, exercises: [] }));
      if (notes && !w.notes) w.notes = notes;
      if (!exercise) return;
      let x = w.exercises.find((e) => e.name === exercise);
      if (!x) w.exercises.push((x = { name: exercise, note: "", sets: [] }));
      if (note && !x.note) x.note = note.replace(/\\n/g, "\n").trim();
      if (set) x.sets.push(set);
    },
    done: () => [...workouts.values()].filter((w) => w.exercises.some((x) => x.sets.length)),
  };
}

function strongWorkouts(rows: Record<string, string>[], factor: number) {
  const b = builder("strong");
  for (const r of rows) {
    const start = parseDate(r["Date"]);
    if (!start) continue;
    const order = r["Set Order"];
    if (/rest/i.test(order)) continue;
    const kind: SetKind = order === "W" ? "warmup" : order === "F" ? "failure" : order === "D" ? "drop" : "working";
    const rpe = num(r["RPE"]);
    const w = num(r["Weight"]);
    b.add(r["Workout Name"], start, strongDuration(r["Duration"] ?? ""), r["Workout Notes"] ?? "", r["Exercise Name"], r["Notes"] ?? "", {
      weight: w != null && w > 0 ? w * factor : null,
      reps: pos(num(r["Reps"])),
      seconds: pos(num(r["Seconds"])),
      distanceKm: pos(num(r["Distance"])),
      kind,
      rir: kind === "failure" ? 0 : rirFromRpe(rpe),
    });
  }
  return b.done();
}

const HEVY_KIND: Record<string, SetKind> = { warmup: "warmup", normal: "working", failure: "failure", dropset: "drop" };

function hevyWorkouts(rows: Record<string, string>[]) {
  const b = builder("hevy");
  for (const r of rows) {
    const start = parseDate(r["start_time"]);
    if (!start) continue;
    const end = parseDate(r["end_time"] ?? "");
    const kind = HEVY_KIND[r["set_type"]] ?? "working";
    const kg = num(r["weight_kg"]);
    const lbs = num(r["weight_lbs"]);
    const km = num(r["distance_km"]);
    const miles = num(r["distance_miles"]);
    b.add(r["title"], start, end ? Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000)) : null, r["description"] ?? "", r["exercise_title"], r["exercise_notes"] ?? "", {
      weight: kg && kg > 0 ? kg : lbs && lbs > 0 ? lbs / 2.20462 : null,
      reps: pos(num(r["reps"])),
      seconds: pos(num(r["duration_seconds"])),
      distanceKm: km && km > 0 ? km : miles && miles > 0 ? miles * 1.60934 : null,
      kind,
      rir: kind === "failure" ? 0 : rirFromRpe(num(r["rpe"])),
    });
  }
  return b.done();
}

function lyftaWorkouts(rows: Record<string, string>[], factor: number) {
  const b = builder("lyfta");
  for (const r of rows) {
    const start = parseDate(r["Date"]);
    if (!start) continue;
    const t = (r["Set Type"] ?? "").toUpperCase();
    const kind: SetKind = t.includes("WARM") ? "warmup" : t.includes("FAIL") ? "failure" : t.includes("DROP") ? "drop" : "working";
    const w = num(r["Weight"]);
    b.add(r["Title"], start, r["Duration"] ? clockSeconds(r["Duration"]) : null, "", r["Exercise"], "", {
      weight: w != null && w > 0 ? w * factor : null,
      reps: pos(num(r["Reps"])),
      seconds: r["Time"] ? pos(clockSeconds(r["Time"])) : null,
      distanceKm: pos(num(r["Distance"])),
      kind,
      rir: kind === "failure" ? 0 : null,
    });
  }
  return b.done();
}

function macroFactorWorkouts(rows: Record<string, string>[]) {
  const b = builder("macrofactor");
  for (const r of rows) {
    const raw = r["Date"];
    const start = /^\d+(\.\d+)?$/.test(raw) ? excelDate(Number(raw)) : parseDate(raw);
    if (!start) continue;
    const t = (r["Set Type"] ?? "").toLowerCase();
    const kind: SetKind = t.includes("warm") ? "warmup" : t.includes("fail") ? "failure" : t.includes("drop") ? "drop" : "working";
    const yd = num(r["Distance short (Yd)"]);
    const mi = num(r["Distance long (Mi)"]);
    const dur = r["Duration"] ?? "";
    b.add(r["Workout"], start, pos(num(r["Workout Duration"])), "", r["Exercise"], "", {
      weight: pos(num(r["Weight (kg)"])) ?? (num(r["Weight (lbs)"]) ? num(r["Weight (lbs)"])! / 2.20462 : null),
      reps: pos(num(r["Reps"])),
      seconds: dur.includes(":") ? pos(clockSeconds(dur)) : pos(num(dur)),
      distanceKm: mi ? mi * 1.60934 : yd ? yd * 0.0009144 : null,
      kind,
      rir: num(r["RIR"]),
    });
  }
  return b.done();
}

const STRONG_METRIC: Record<string, string> = {
  weight: "weight",
  "body fat": "bodyFat",
  "caloric intake": "calories",
  neck: "neck",
  shoulders: "shoulders",
  chest: "chest",
  "left bicep": "leftBicep",
  "right bicep": "rightBicep",
  "left forearm": "leftForearm",
  "right forearm": "rightForearm",
  "upper abs": "upperAbs",
  waist: "waist",
  "lower abs": "lowerAbs",
  hips: "hips",
  "left thigh": "leftThigh",
  "right thigh": "rightThigh",
  "left calf": "leftCalf",
  "right calf": "rightCalf",
};

function canonical(metric: string, value: number, unit: string) {
  const u = unit.toLowerCase();
  if (metric === "bodyFat") return value <= 1 ? value * 100 : value;
  if (u === "lb" || u === "lbs") return value / 2.20462;
  if (u === "in") return value * 2.54;
  if (u === "mm") return value / 10;
  return value;
}

const measurement = (app: AppId, metric: string, date: Date, value: number): ImportMeasurement => ({
  key: hashId(`${app}|${metric}|${iso(date)}`),
  metric,
  date: iso(date),
  value: Math.round(value * 100) / 100,
});

function strongMeasurements(rows: Record<string, string>[]) {
  return rows.flatMap((r) => {
    const metric = STRONG_METRIC[(r["Measurement Type"] ?? "").toLowerCase()];
    const date = parseDate(r["Date"]);
    const v = num(r["Value"]);
    return metric && date && v != null ? [measurement("strong", metric, date, canonical(metric, v, r["Unit"] ?? ""))] : [];
  });
}

const HEVY_METRIC: Record<string, string> = {
  weight_kg: "weight",
  weight_lbs: "weight",
  fat_percent: "bodyFat",
  neck_cm: "neck",
  shoulder_cm: "shoulders",
  chest_cm: "chest",
  left_bicep_cm: "leftBicep",
  right_bicep_cm: "rightBicep",
  left_forearm_cm: "leftForearm",
  right_forearm_cm: "rightForearm",
  abdomen_cm: "abdomen",
  waist_cm: "waist",
  hips_cm: "hips",
  left_thigh_cm: "leftThigh",
  right_thigh_cm: "rightThigh",
  left_calf_cm: "leftCalf",
  right_calf_cm: "rightCalf",
};

function hevyMeasurements(rows: Record<string, string>[]) {
  return rows.flatMap((r) => {
    const date = parseDate(r["date"]);
    if (!date) return [];
    return Object.entries(HEVY_METRIC).flatMap(([col, metric]) => {
      const v = num(r[col]);
      if (v == null || v <= 0) return [];
      return [measurement("hevy", metric, date, col.endsWith("_lbs") ? v / 2.20462 : col.endsWith("_in") ? v * 2.54 : v)];
    });
  });
}

function readXlsx(bytes: Uint8Array) {
  const files = unzipSync(bytes, { filter: (f) => f.name.startsWith("xl/") });
  const text = (p: string) => (files[p] ? strFromU8(files[p]) : "");
  const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
  const shared = [...text("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")));
  const names = [...text("xl/workbook.xml").matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map((m) => ({ name: decode(m[1]), rid: m[2] }));
  const rels = Object.fromEntries([...text("xl/_rels/workbook.xml.rels").matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  const colIndex = (ref: string) => ref.replace(/\d+/g, "").split("").reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;
  return names.map(({ name, rid }) => {
    const target = (rels[rid] ?? "").replace(/^\/?(xl\/)?/, "");
    const xml = text(`xl/${target}`);
    const rows = [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((rm) => {
      const out: string[] = [];
      for (const c of rm[1].matchAll(/<c ([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1] ?? "";
        const type = attrs.match(/t="([^"]+)"/)?.[1];
        const body = c[2] ?? "";
        const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        const inline = [...body.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("");
        out[colIndex(ref)] = type === "s" && v != null ? (shared[Number(v)] ?? "") : type === "inlineStr" ? decode(inline) : decode(v ?? "");
      }
      return Array.from(out, (x) => x ?? "");
    });
    return { name, rows };
  });
}

export function parseFile(name: string, bytes: Uint8Array, opts: ParseOptions): ParsedFile | null {
  const factor = opts.weightUnit === "lb" ? 1 / 2.20462 : 1;
  const base = { file: name, workouts: [] as ImportWorkout[], measurements: [] as ImportMeasurement[] };

  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    const sheets = readXlsx(bytes);
    const log = sheets.find((s) => /workout log/i.test(s.name)) ?? sheets.find((s) => s.rows[0]?.includes("Exercise") && s.rows[0]?.includes("Set Type"));
    if (!log || log.rows.length < 2) return null;
    return { ...base, app: "macrofactor", kind: "workouts", workouts: macroFactorWorkouts(records(log.rows)), weightUnitKnown: true };
  }

  const rows = parseCsv(new TextDecoder().decode(bytes));
  if (rows.length < 2) return null;
  const head = rows[0].map((h) => h.trim());
  const has = (...cols: string[]) => cols.every((c) => head.includes(c));
  const recs = records(rows);

  if (has("Workout Name", "Exercise Name", "Set Order")) return { ...base, app: "strong", kind: "workouts", workouts: strongWorkouts(recs, factor), weightUnitKnown: false };
  if (has("Measurement Type", "Value", "Unit")) return { ...base, app: "strong", kind: "measurements", measurements: strongMeasurements(recs), weightUnitKnown: true };
  if (has("exercise_title", "set_type")) return { ...base, app: "hevy", kind: "workouts", workouts: hevyWorkouts(recs), weightUnitKnown: true };
  if (head.includes("date") && head.some((h) => h in HEVY_METRIC)) return { ...base, app: "hevy", kind: "measurements", measurements: hevyMeasurements(recs), weightUnitKnown: true };
  if (has("Title", "Exercise", "Set Type")) return { ...base, app: "lyfta", kind: "workouts", workouts: lyftaWorkouts(recs, factor), weightUnitKnown: false };
  if (has("Date", "Workout", "Exercise", "Set Type")) return { ...base, app: "macrofactor", kind: "workouts", workouts: macroFactorWorkouts(recs), weightUnitKnown: true };
  return null;
}
