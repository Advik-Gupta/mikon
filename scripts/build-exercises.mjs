/**
 * Builds public/data/exercises.json from free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db). That dataset is released under the
 * Unlicense (public domain), including its instructions and photos.
 *
 * Pinned to a commit so the data and image URLs stay stable. When exercises move into
 * Mikon's own database, re-host the images and swap IMAGE_BASE.
 *
 * Run: node scripts/build-exercises.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";

const COMMIT = "a859101d633a01c4a1a920d6a8ce41dabba0705f";
const SRC = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/dist/exercises.json`;
export const IMAGE_BASE = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${COMMIT}/exercises/`;

const raw = await (await fetch(SRC)).json();

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
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../public/data/exercises.json", import.meta.url),
  JSON.stringify({ source: `free-exercise-db@${COMMIT} (Unlicense)`, imageBase: IMAGE_BASE, exercises }),
);
console.log(`wrote ${exercises.length} exercises`);
