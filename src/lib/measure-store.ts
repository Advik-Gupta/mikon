"use client";

import { useMemo } from "react";
import { hashId, type Measurement } from "./measurements";
import { toISODate } from "./programs";
import { KEYS, readStored, saveProfile, useMeasurements, writeStored } from "./storage";
import type { Profile } from "./types";

export const dayOf = (iso: string) => toISODate(new Date(iso));
export const measurementId = (metric: string, day: string) => `m-${hashId(`${metric}|${day}`)}`;

export function useSeries(metric: string) {
  const all = useMeasurements();
  return useMemo(
    () => (all ?? []).filter((m) => m.metric === metric).sort((a, b) => a.date.localeCompare(b.date)),
    [all, metric],
  );
}

export function latestByMetric(all: Measurement[] | null | undefined) {
  const out = new Map<string, { last: Measurement; prev: Measurement | null; count: number }>();
  const sorted = [...(all ?? [])].sort((a, b) => b.date.localeCompare(a.date));
  for (const m of sorted) {
    const hit = out.get(m.metric);
    if (!hit) out.set(m.metric, { last: m, prev: null, count: 1 });
    else {
      if (!hit.prev) hit.prev = m;
      hit.count++;
    }
  }
  return out;
}

function syncProfile(metric: string) {
  if (metric !== "weight" && metric !== "bodyFat") return;
  const list = (readStored<Measurement[]>(KEYS.measurements) ?? []).filter((m) => m.metric === metric).sort((a, b) => b.date.localeCompare(a.date));
  const p = readStored<Profile>(KEYS.profile);
  if (!p || !list[0]) return;
  saveProfile({ ...p, body: { ...p.body, ...(metric === "weight" ? { weightKg: list[0].value } : { bodyFat: list[0].value }) } });
}

export function saveMeasurement(metric: string, day: string, value: number) {
  const id = measurementId(metric, day);
  const [y, mo, d] = day.split("-").map(Number);
  const now = new Date();
  const date = new Date(y, mo - 1, d, now.getHours(), now.getMinutes()).toISOString();
  const list = readStored<Measurement[]>(KEYS.measurements) ?? [];
  const entry: Measurement = { id, metric, date, value: Math.round(value * 100) / 100 };
  writeStored(KEYS.measurements, [entry, ...list.filter((m) => m.id !== id)]);
  syncProfile(metric);
}

export function deleteMeasurement(id: string) {
  const list = readStored<Measurement[]>(KEYS.measurements) ?? [];
  const gone = list.find((m) => m.id === id);
  writeStored(
    KEYS.measurements,
    list.filter((m) => m.id !== id),
  );
  if (gone) syncProfile(gone.metric);
}

export function movingAverage(points: { date: string; value: number }[], window = 7) {
  return points.map((p, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1);
    return { date: p.date, value: Math.round((slice.reduce((a, x) => a + x.value, 0) / slice.length) * 100) / 100 };
  });
}
