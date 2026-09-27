/**
 * Builds scripts/data/exercises.json from free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db). That dataset is released under the
 * Unlicense (public domain), including its instructions and photos.
 *
 * Pinned to a commit so the data and image URLs stay stable. When exercises move into
 * Mikon's own database, re-host the images and swap IMAGE_BASE.
 *
 * Every exercise gets a `discipline` (weights / calisthenics / plyometrics / cardio / mobility),
 * a `measure` (reps or time), and plyometrics get an `intensity`. Mikon's curated calisthenics
 * progressions and plyometric drills (scripts/data/curated-exercises.mjs) are merged in.
 *
 * Run: node scripts/build-exercises.mjs, then npm run db:seed
 */
import { mkdir, writeFile } from "node:fs/promises";
import { CURATED } from "./data/curated-exercises.mjs";

const COMMIT = "a859101d633a01c4a1a920d6a8ce41dabba0705f";
const SRC = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/dist/exercises.json`;
export const IMAGE_BASE = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${COMMIT}/exercises/`;

const raw = await (await fetch(SRC)).json();

const TIMED = /\b(plank|hold|isometric|wall sit|side bridge|static|dead hang)\b/i;
const PLYO_HIGH = /depth|drop|hurdle|bound|single.?leg|one.?leg|tuck|leap|rocket|push.?up|clap|scissors|stride jump/i;
const PLYO_LOW = /skip|carioca|butt kick|arm drill|claw|quick step|shuffle|wall drill|technique|squeeze|swing|mountain/i;

function classify(e) {
  const out = { measure: TIMED.test(e.name) ? "time" : "reps" };
  if (e.category === "stretching") return { ...out, discipline: "mobility", measure: "time" };
  if (e.category === "cardio") return { ...out, discipline: "cardio", measure: "time" };
  if (e.category === "plyometrics") {
    const intensity = PLYO_HIGH.test(e.name) ? "high" : PLYO_LOW.test(e.name) ? "low" : "moderate";
    return { ...out, discipline: "plyometrics", intensity };
  }
  if (e.equipment === "body only") return { ...out, discipline: "calisthenics" };
  return { ...out, discipline: "weights" };
}

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const seen = new Set();
const exercises = raw
  .map((e) => {
    let id = slug(e.name);
    while (seen.has(id)) id += "-2";
    seen.add(id);
    return {
      id,
      name: e.name.trim(),
      category: e.category,
      level: e.level,
      equipment: e.equipment ?? "none",
      mechanic: e.mechanic ?? null,
      force: e.force ?? null,
      primary: e.primaryMuscles,
      secondary: e.secondaryMuscles,
      instructions: e.instructions.map((s) => s.trim()).filter(Boolean),
      images: e.images,
      source: "free-exercise-db",
      ...classify(e),
    };
  })
  .concat(CURATED)
  .sort((a, b) => a.name.localeCompare(b.name));

await mkdir(new URL("./data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("./data/exercises.json", import.meta.url),
  JSON.stringify({ source: `free-exercise-db@${COMMIT} (Unlicense)`, imageBase: IMAGE_BASE, exercises }),
);
console.log(`wrote ${exercises.length} exercises`);
