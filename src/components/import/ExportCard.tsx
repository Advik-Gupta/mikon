"use client";

import { Download } from "lucide-react";
import { useExerciseMap } from "@/lib/analysis";
import { downloadText, measurementsCsv, workoutsCsv } from "@/lib/import/export";
import { useLogs, useMeasurements } from "@/lib/storage";
import { Button } from "../ui";

export function ExportCard() {
  const logs = useLogs() ?? [];
  const measurements = useMeasurements() ?? [];
  const exercises = useExerciseMap();
  const day = new Date().toISOString().slice(0, 10);
  return (
    <section className="mx-auto mt-10 w-full max-w-xl rounded-3xl border border-line bg-surface p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Download className="size-4 text-accent" /> Export your history
      </h3>
      <p className="mt-1 text-xs text-muted">Your data is yours. Download it as CSV in the same format Strong uses, so you can open it anywhere.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" disabled={!logs.length || !exercises.size} onClick={() => downloadText(`mikon-workouts-${day}.csv`, workoutsCsv(logs, exercises))}>
          Workouts ({logs.filter((l) => l.completedAt).length})
        </Button>
        <Button variant="secondary" disabled={!measurements.length} onClick={() => downloadText(`mikon-measurements-${day}.csv`, measurementsCsv(measurements))}>
          Measurements ({measurements.length})
        </Button>
      </div>
    </section>
  );
}
