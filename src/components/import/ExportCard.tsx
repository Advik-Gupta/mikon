"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useExerciseMap } from "@/lib/analysis";
import { buildExport, downloadFiles } from "@/lib/import/export";
import type { AppId } from "@/lib/import/parse";
import { useLogs, useMeasurements } from "@/lib/storage";
import { toast } from "../Toaster";
import { Button, cn } from "../ui";
import { APPS, AppLogo } from "./ImportFlow";

const NOTE: Record<AppId, string> = {
  strong: "A zip with strong_workouts.csv plus one CSV per measurement, exactly like Strong exports.",
  hevy: "hevy_workout_data.csv and hevy_measurement_data.csv, in Hevy's export format.",
  lyfta: "A single CSV in Lyfta's export format. Lyfta doesn't export measurements.",
  macrofactor: "An .xlsx with a Workout Log sheet, matching MacroFactor Workouts.",
};

export function ExportCard() {
  const logs = useLogs() ?? [];
  const measurements = useMeasurements() ?? [];
  const exercises = useExerciseMap();
  const [app, setApp] = useState<AppId>("strong");
  const [busy, setBusy] = useState(false);
  const count = logs.filter((l) => l.completedAt).length;

  const run = () => {
    setBusy(true);
    try {
      downloadFiles(app, buildExport(app, logs, measurements, exercises));
      toast({ tone: "success", title: "Export ready", message: `Saved in ${APPS.find((a) => a.id === app)?.label} format.` });
    } catch (e) {
      toast({ tone: "warn", title: "Couldn't export", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-auto mt-10 w-full max-w-xl rounded-3xl border border-line bg-surface p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Download className="size-4 text-accent" /> Export your history
      </h3>
      <p className="mt-1 text-xs text-muted">Your data is yours. Pick the app you&apos;re moving to and we&apos;ll create files in exactly its format.</p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {APPS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setApp(a.id)}
            className={cn("flex flex-col items-center gap-2 rounded-2xl border p-3 text-xs font-medium transition", app === a.id ? "border-accent/60 bg-accent/10" : "border-line bg-surface-2/50 text-muted")}
          >
            <AppLogo app={a} className="size-10" />
            {a.label.replace(" Workouts", "")}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">{NOTE[app]}</p>
      <Button onClick={run} disabled={busy || (!count && !measurements.length) || !exercises.size} className="mt-4 h-11 w-full rounded-full">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Export {count} workouts
        {measurements.length && app !== "lyfta" && app !== "macrofactor" ? ` and ${measurements.length} measurements` : ""}
      </Button>
    </section>
  );
}
