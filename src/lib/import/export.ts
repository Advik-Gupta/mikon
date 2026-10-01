import { strToU8, zipSync } from "fflate";
import type { Exercise } from "../explorer";
import { metricById, type Measurement } from "../measurements";
import type { WorkoutLog } from "../types";
import type { AppId } from "./parse";

export interface ExportFile {
  name: string;
  data: Uint8Array;
  type: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const p2 = (n: number) => String(n).padStart(2, "0");
const local = (iso: string) => new Date(iso);
const ymdhms = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;
const ymd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const hevyDate = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${p2(d.getHours())}:${p2(d.getMinutes())}`;
const clock = (sec: number, hours = true) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return hours ? `${p2(h)}:${p2(m)}:${p2(s)}` : `${p2(m + h * 60)}:${p2(s)}`;
};
const strongDuration = (sec?: number) => {
  if (!sec) return "0m";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};
const fixed = (n: number | null | undefined, d: number) => (n == null ? "" : n.toFixed(d));

const csvCell = (v: string | number | null | undefined, forceQuote = false) => {
  if (v == null || v === "") return "";
  const s = String(v);
  return forceQuote || /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: (string | number | null | undefined)[][], quoteStrings = false) =>
  rows.map((r) => r.map((c) => csvCell(c, quoteStrings && typeof c === "string")).join(",")).join("\n") + "\n";

const done = (logs: WorkoutLog[]) =>
  [...logs].filter((l) => l.completedAt && l.exercises.some((x) => x.sets.some((s) => s.done))).sort((a, b) => (a.startedAt ?? a.date).localeCompare(b.startedAt ?? b.date));
const start = (l: WorkoutLog) => local(l.startedAt ?? `${l.date}T12:00:00`);
const nameOf = (exercises: Map<string, Exercise>, id: string) => exercises.get(id)?.name ?? id;
const rpe = (rir: number | null | undefined) => (rir == null ? null : Math.max(1, 10 - rir));

function strong(logs: WorkoutLog[], measurements: Measurement[], ex: Map<string, Exercise>): ExportFile[] {
  const rows: (string | number | null)[][] = [["Date", "Workout Name", "Duration", "Exercise Name", "Set Order", "Weight", "Reps", "Distance", "Seconds", "Notes", "Workout Notes", "RPE"]];
  for (const l of done(logs)) {
    let first = true;
    for (const x of l.exercises) {
      let n = 0;
      x.sets
        .filter((s) => s.done)
        .forEach((s, i) => {
          const order = s.kind === "warmup" ? "W" : s.rir === 0 ? "F" : String(++n);
          rows.push([
            ymdhms(start(l)),
            l.name || "Workout",
            strongDuration(l.durationSec),
            nameOf(ex, x.exerciseId),
            order,
            fixed(s.weight ?? 0, 1),
            fixed(s.reps ?? 0, 1),
            String(s.distanceKm ?? 0),
            fixed(s.holdSec ?? 0, 1),
            i === 0 ? (x.note ?? "").replace(/\n/g, "\\n") : "",
            first ? (l.notes || "").replace(/\n/g, "\\n") : "",
            s.rir != null && s.rir > 0 ? String(rpe(s.rir)) : "",
          ]);
          first = false;
        });
    }
  }
  const files: ExportFile[] = [{ name: "strong_workouts.csv", data: strToU8(csv(rows)), type: "text/csv" }];
  const byMetric = new Map<string, Measurement[]>();
  measurements.forEach((m) => byMetric.set(m.metric, [...(byMetric.get(m.metric) ?? []), m]));
  byMetric.forEach((list, metric) => {
    const def = metricById(metric);
    if (!def) return;
    const out: (string | number)[][] = [["Date", "Measurement Type", "Value", "Unit", "Source"]];
    for (const m of [...list].sort((a, b) => b.date.localeCompare(a.date))) {
      const value = def.kind === "percent" ? Math.round(m.value) / 100 : def.kind === "length" ? Math.round((m.value / 2.54) * 10) / 10 : m.value;
      const unit = def.kind === "mass" ? "kg" : def.kind === "percent" ? "%" : def.kind === "energy" ? "kcal" : "in";
      out.push([ymdhms(local(m.date)), def.label.replace(/\b\w/g, (c) => c.toUpperCase()).replace("Body Fat", "Body Fat").replace("Caloric Intake", "Caloric Intake"), value, unit, "Strong"]);
    }
    const file = def.label.toLowerCase().replace(/ /g, "_").replace("body_fat", "body_fat_percentage");
    files.push({ name: `strong_${file}.csv`, data: strToU8(csv(out)), type: "text/csv" });
  });
  return files;
}

const HEVY_COLS: [string, string][] = [
  ["weight_kg", "weight"],
  ["fat_percent", "bodyFat"],
  ["neck_cm", "neck"],
  ["shoulder_cm", "shoulders"],
  ["chest_cm", "chest"],
  ["left_bicep_cm", "leftBicep"],
  ["right_bicep_cm", "rightBicep"],
  ["left_forearm_cm", "leftForearm"],
  ["right_forearm_cm", "rightForearm"],
  ["abdomen_cm", "abdomen"],
  ["waist_cm", "waist"],
  ["hips_cm", "hips"],
  ["left_thigh_cm", "leftThigh"],
  ["right_thigh_cm", "rightThigh"],
  ["left_calf_cm", "leftCalf"],
  ["right_calf_cm", "rightCalf"],
];

function hevy(logs: WorkoutLog[], measurements: Measurement[], ex: Map<string, Exercise>): ExportFile[] {
  const head = ["title", "start_time", "end_time", "description", "exercise_title", "superset_id", "exercise_notes", "set_index", "set_type", "weight_kg", "reps", "distance_km", "duration_seconds", "rpe"];
  const lines = [head.map((h) => `"${h}"`).join(",")];
  for (const l of done(logs)) {
    const s0 = start(l);
    const end = new Date(s0.getTime() + (l.durationSec ?? 0) * 1000);
    for (const x of l.exercises) {
      x.sets
        .filter((s) => s.done)
        .forEach((s, i) => {
          const type = s.kind === "warmup" ? "warmup" : s.rir === 0 ? "failure" : "normal";
          lines.push(
            [
              csvCell(l.name || "Workout", true),
              csvCell(hevyDate(s0), true),
              csvCell(hevyDate(end), true),
              csvCell(l.notes || "", true) || '""',
              csvCell(nameOf(ex, x.exerciseId), true),
              "",
              csvCell(x.note ?? "", true) || '""',
              String(i),
              `"${type}"`,
              s.weight != null ? String(Math.round(s.weight * 100) / 100) : "",
              s.reps != null ? String(s.reps) : "",
              s.distanceKm ? String(s.distanceKm) : "",
              s.holdSec != null ? String(s.holdSec) : "",
              s.rir != null && type === "normal" && s.rir > 0 ? String(rpe(s.rir)) : "",
            ].join(","),
          );
        });
    }
  }
  const files: ExportFile[] = [{ name: "hevy_workout_data.csv", data: strToU8(lines.join("\n") + "\n"), type: "text/csv" }];
  if (measurements.length) {
    const byDay = new Map<string, Map<string, number>>();
    for (const m of measurements) {
      const day = ymd(local(m.date));
      const row = byDay.get(day) ?? new Map();
      row.set(m.metric, m.value);
      byDay.set(day, row);
    }
    const out = [["date", ...HEVY_COLS.map(([c]) => c)].map((h) => `"${h}"`).join(",")];
    for (const [day, row] of [...byDay.entries()].sort()) {
      const d = new Date(`${day}T00:00:00`);
      out.push([`"${hevyDate(d)}"`, ...HEVY_COLS.map(([, m]) => (row.has(m) ? String(Math.round(row.get(m)! * 100) / 100) : ""))].join(","));
    }
    files.push({ name: "hevy_measurement_data.csv", data: strToU8(out.join("\n") + "\n"), type: "text/csv" });
  }
  return files;
}

function lyfta(logs: WorkoutLog[], ex: Map<string, Exercise>): ExportFile[] {
  const lines = [' Title,Date,Duration,Exercise,"Superset id",Weight,Reps,Distance,Time,"Set Type"'];
  for (const l of done(logs)) {
    for (const x of l.exercises)
      for (const s of x.sets.filter((z) => z.done)) {
        const type = s.kind === "warmup" ? "WARMUP_SET" : s.rir === 0 ? "FAILURE_SET" : "NORMAL_SET";
        lines.push(
          [
            csvCell(l.name || "Workout", true),
            csvCell(ymdhms(start(l)), true),
            clock(l.durationSec ?? 0),
            csvCell(nameOf(ex, x.exerciseId), true),
            "",
            s.weight != null ? s.weight.toFixed(3) : "",
            s.reps != null ? String(s.reps) : "",
            s.distanceKm ? String(s.distanceKm) : "",
            s.holdSec != null ? clock(s.holdSec, false) : "",
            type,
          ].join(","),
        );
      }
  }
  return [{ name: "lyfta_data.csv", data: strToU8(lines.join("\n") + "\n"), type: "text/csv" }];
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const colName = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

function xlsx(sheetName: string, rows: (string | number | null)[][]): Uint8Array {
  const body = rows
    .map(
      (r, ri) =>
        `<row r="${ri + 1}">${r
          .map((v, ci) => {
            const ref = `${colName(ci)}${ri + 1}`;
            if (v == null || v === "") return "";
            return typeof v === "number" ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${xml(v)}</t></is></c>`;
          })
          .join("")}</row>`,
    )
    .join("");
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`,
  };
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
}

function macrofactor(logs: WorkoutLog[], ex: Map<string, Exercise>): ExportFile[] {
  const rows: (string | number | null)[][] = [
    ["Date", "Workout Duration", "Workout", "Exercise", "Exercise Base Weight (kg)", "Set Type", "Weight (kg)", "Reps", "RIR", "Duration", "Distance short (Yd)", "Distance long (Mi)"],
  ];
  for (const l of done(logs))
    for (const x of l.exercises)
      for (const s of x.sets.filter((z) => z.done))
        rows.push([
          ymd(start(l)),
          l.durationSec ?? null,
          l.name || "Workout",
          nameOf(ex, x.exerciseId),
          null,
          s.kind === "warmup" ? "Warm-Up Set" : "Standard Set",
          s.weight ?? null,
          s.reps ?? null,
          s.rir ?? null,
          s.holdSec ?? null,
          null,
          s.distanceKm ? Math.round((s.distanceKm / 1.60934) * 100) / 100 : null,
        ]);
  return [{ name: "MacroFactor-workouts_data.xlsx", data: xlsx("Workout Log", rows), type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }];
}

export function buildExport(app: AppId, logs: WorkoutLog[], measurements: Measurement[], exercises: Map<string, Exercise>) {
  if (app === "strong") return strong(logs, measurements, exercises);
  if (app === "hevy") return hevy(logs, measurements, exercises);
  if (app === "lyfta") return lyfta(logs, exercises);
  return macrofactor(logs, exercises);
}

export function downloadFiles(app: AppId, files: ExportFile[]) {
  const stamp = new Date().toISOString().slice(0, 10);
  const blob =
    files.length === 1
      ? new Blob([files[0].data as BlobPart], { type: files[0].type })
      : new Blob([zipSync(Object.fromEntries(files.map((f) => [f.name, f.data]))) as BlobPart], { type: "application/zip" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = files.length === 1 ? files[0].name : `mikon-${app}-export-${stamp}.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
