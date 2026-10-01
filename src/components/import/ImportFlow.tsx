"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Check, ChevronRight, FileSpreadsheet, FileWarning, Loader2, PartyPopper, Sparkles, Upload, X } from "lucide-react";
import { useExerciseDB } from "@/lib/explorer";
import { APP_LABEL, buildImport, collectNames } from "@/lib/import/build";
import { makeMatcher } from "@/lib/import/match";
import { parseFile, type AppId, type ParsedFile } from "@/lib/import/parse";
import { readStored, rehydrate, saveProfile, useProfile, KEYS } from "@/lib/storage";
import type { Profile } from "@/lib/types";
import { ExerciseThumb } from "../explorer/ExerciseBits";
import { ExerciseSheet } from "../tracker/ExerciseSheet";
import { Button, cn } from "../ui";

export const APPS: { id: AppId; label: string; logo: string; color: string; files: string; steps: string[] }[] = [
  {
    id: "strong",
    logo: "/logos/strong.png",
    label: "Strong",
    color: "#3b82f6",
    files: "strong_workouts.csv and any measurement CSVs",
    steps: ["Open Strong and go to your Profile", "Tap the settings gear, then Export Data", "Export your workouts, plus any measurements you track", "Save the CSV files to your phone or computer"],
  },
  {
    id: "hevy",
    logo: "/logos/hevy.png",
    label: "Hevy",
    color: "#2563eb",
    files: "hevy workout data and measurement data CSVs",
    steps: ["Open Hevy and go to your Profile", "Tap Settings, then Export & Import Data", "Export workouts, and measurements if you log them", "Save the CSV files"],
  },
  {
    id: "lyfta",
    logo: "/logos/lyfta.png",
    label: "Lyfta",
    color: "#f97316",
    files: "your Lyfta CSV export",
    steps: ["Open Lyfta and go to your Profile", "Open Settings, then Export data", "Choose CSV and save the file"],
  },
  {
    id: "macrofactor",
    logo: "/logos/macrofactor.png",
    label: "MacroFactor Workouts",
    color: "#ef4444",
    files: "the workouts .xlsx export",
    steps: ["Open MacroFactor Workouts and tap More", "Go to Settings, then Data Management, then Export", "Export your workout data and save the file"],
  },
];

export function AppLogo({ app, className }: { app: { logo: string; label: string }; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={app.logo} alt={`${app.label} logo`} className={cn("shrink-0 rounded-[28%] object-cover", className)} />
  );
}

type Step = "pick" | "upload" | "review" | "importing" | "done";
interface RawFile {
  name: string;
  bytes: Uint8Array;
}

const CHUNK = 40;

export function ImportFlow({ initialApp, onExit }: { initialApp?: AppId | null; onExit?: () => void }) {
  const profile = useProfile();
  const { db } = useExerciseDB();
  const [step, setStep] = useState<Step>(initialApp ? "upload" : "pick");
  const [app, setApp] = useState<AppId | null>(initialApp ?? null);
  const [raw, setRaw] = useState<RawFile[]>([]);
  const [unit, setUnit] = useState<"kg" | "lb">(profile?.body.units === "imperial" ? "lb" : "kg");
  const [overrides, setOverrides] = useState<Map<string, string | null>>(new Map());
  const [swapping, setSwapping] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ logs: number; measurements: number; customs: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const parsed = useMemo(() => raw.map((f) => ({ name: f.name, out: safeParse(f, unit) })), [raw, unit]);
  const good = parsed.map((p) => p.out).filter((p): p is ParsedFile => !!p);
  const needsUnit = good.some((p) => !p.weightUnitKnown);
  const names = useMemo(() => collectNames(good), [good]);
  const matcher = useMemo(() => (db ? makeMatcher(db.exercises) : null), [db]);
  const byId = useMemo(() => new Map((db?.exercises ?? []).map((e) => [e.id, e])), [db]);
  const auto = useMemo(() => new Map(names.map((n) => [n.key, matcher?.(n.name).id ?? null])), [names, matcher]);
  const choice = useMemo(() => {
    const m = new Map(auto);
    overrides.forEach((v, k) => m.set(k, v));
    return m;
  }, [auto, overrides]);

  const workouts = good.reduce((a, f) => a + f.workouts.length, 0);
  const sets = good.reduce((a, f) => a + f.workouts.reduce((b, w) => b + w.exercises.reduce((c, x) => c + x.sets.length, 0), 0), 0);
  const measurements = good.reduce((a, f) => a + f.measurements.length, 0);
  const dates = good.flatMap((f) => f.workouts.map((w) => w.start)).sort();
  const matched = names.filter((n) => choice.get(n.key)).length;

  const addFiles = async (list: FileList | File[]) => {
    const files = await Promise.all([...list].map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
    setRaw((r) => [...r.filter((x) => !files.some((f) => f.name === x.name)), ...files]);
  };

  const run = async () => {
    setStep("importing");
    setError(null);
    const payload = buildImport(good, choice);
    const total = payload.logs.length + 1;
    let sent = 0;
    try {
      const post = async (body: unknown) => {
        const res = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `Import failed (${res.status})`);
      };
      for (let i = 0; i < payload.measurements.length || i === 0; i += 1500) {
        await post({ logs: [], measurements: payload.measurements.slice(i, i + 1500), customExercises: i === 0 ? payload.customExercises : [] });
      }
      sent = 1;
      setProgress(sent / total);
      for (let i = 0; i < payload.logs.length; i += CHUNK) {
        await post({ logs: payload.logs.slice(i, i + CHUNK), measurements: [], customExercises: [] });
        sent += Math.min(CHUNK, payload.logs.length - i);
        setProgress(sent / total);
      }
      await rehydrate();
      const p = readStored<Profile>(KEYS.profile);
      const latest = (metric: string) => [...payload.measurements].filter((m) => m.metric === metric).sort((a, b) => b.date.localeCompare(a.date))[0];
      const w = latest("weight");
      const bf = latest("bodyFat");
      if (p && (w || bf)) saveProfile({ ...p, body: { ...p.body, weightKg: w ? w.value : p.body.weightKg, bodyFat: bf ? bf.value : p.body.bodyFat } });
      setResult({ logs: payload.logs.length, measurements: payload.measurements.length, customs: payload.customExercises.length });
      setStep("done");
    } catch (e) {
      setError((e as Error).message);
      setStep("review");
    }
  };

  const info = APPS.find((a) => a.id === app);

  return (
    <div className="mx-auto w-full max-w-xl">
      <AnimatePresence mode="wait">
        {step === "pick" && (
          <motion.div key="pick" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Bring your training history</h2>
            <p className="mt-1.5 text-sm text-muted">Which app have you been tracking your workouts in? We&apos;ll move every workout, set and measurement into Mikon.</p>
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              {APPS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => (setApp(a.id), setStep("upload"))}
                  className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition active:scale-[0.98] hover:border-line-strong"
                >
                  <AppLogo app={a} className="size-11" />
                  <span className="text-[15px] font-semibold leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onExit}
              className="mt-3 flex w-full items-center justify-between rounded-2xl border border-dashed border-line-strong px-4 py-4 text-left text-sm transition hover:border-line-strong"
            >
              <span>
                <span className="block font-semibold">I&apos;m new to tracking</span>
                <span className="block text-xs text-muted">Start fresh in Mikon</span>
              </span>
              <ChevronRight className="size-4 text-muted" />
            </button>
          </motion.div>
        )}

        {step === "upload" && info && (
          <motion.div key="upload" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <button type="button" onClick={() => (setStep("pick"), setRaw([]))} className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              <ArrowLeft className="size-4" /> Choose another app
            </button>
            <div className="flex items-center gap-3">
              <AppLogo app={info} className="size-12" />
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight">Export from {info.label}</h2>
                <p className="text-xs text-muted">Takes about a minute</p>
              </div>
            </div>
            <ol className="mt-5 space-y-2.5">
              {info.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3 rounded-2xl bg-surface px-4 py-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent font-display text-xs font-bold text-accent-ink">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>

            <label
              onDragOver={(e) => (e.preventDefault(), setDragging(true))}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                addFiles(e.dataTransfer.files);
              }}
              className={cn(
                "mt-5 flex cursor-pointer flex-col items-center rounded-3xl border-2 border-dashed px-6 py-8 text-center transition",
                dragging ? "border-accent bg-accent/10" : "border-line-strong bg-surface/60 hover:border-accent/60",
              )}
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                <Upload className="size-5" />
              </span>
              <span className="mt-3 text-[15px] font-semibold">Upload your export</span>
              <span className="mt-1 text-xs text-muted">Select {info.files}. You can pick several files at once.</span>
              <input type="file" multiple accept=".csv,.xlsx,text/csv" className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
            </label>

            {parsed.length > 0 && (
              <ul className="mt-4 space-y-2">
                {parsed.map((p) => (
                  <li key={p.name} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-3.5 py-3 text-sm">
                    {p.out ? <FileSpreadsheet className="size-5 shrink-0 text-accent" /> : <FileWarning className="size-5 shrink-0 text-warn" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block text-xs text-muted">
                        {p.out
                          ? p.out.kind === "workouts"
                            ? `${APP_LABEL[p.out.app]} · ${p.out.workouts.length} workouts`
                            : `${APP_LABEL[p.out.app]} · ${p.out.measurements.length} measurements`
                          : "We couldn't read this file"}
                      </span>
                    </span>
                    <button type="button" onClick={() => setRaw((r) => r.filter((x) => x.name !== p.name))} className="rounded-lg p-1.5 text-faint hover:text-danger" aria-label={`Remove ${p.name}`}>
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {needsUnit && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
                <span className="text-sm">Weights in this export are in</span>
                <div className="flex rounded-xl bg-surface-2 p-1">
                  {(["kg", "lb"] as const).map((u) => (
                    <button key={u} type="button" onClick={() => setUnit(u)} className={cn("rounded-lg px-4 py-1.5 text-sm font-medium", unit === u ? "bg-ink text-bg" : "text-muted")}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button className="mt-5 h-12 w-full rounded-full text-[15px]" disabled={!good.length || !db} onClick={() => setStep("review")}>
              {!db && good.length ? <Loader2 className="size-4 animate-spin" /> : null} Review import <ChevronRight className="size-4" />
            </Button>
          </motion.div>
        )}

        {step === "review" && (
          <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <button type="button" onClick={() => setStep("upload")} className="mb-4 flex items-center gap-1.5 text-sm text-muted hover:text-ink">
              <ArrowLeft className="size-4" /> Back
            </button>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Ready to import</h2>
            {dates.length > 0 && (
              <p className="mt-1 text-sm text-muted">
                {new Date(dates[0]).toLocaleDateString(undefined, { month: "short", year: "numeric" })} to{" "}
                {new Date(dates.at(-1)!).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
              </p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["Workouts", workouts],
                ["Sets", sets],
                ["Measurements", measurements],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-surface px-3 py-3 text-center">
                  <p className="font-display text-xl font-semibold tabular-nums">{Number(v).toLocaleString()}</p>
                  <p className="text-[11px] text-muted">{k}</p>
                </div>
              ))}
            </div>

            {names.length > 0 && (
              <section className="mt-6">
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold">Exercises</h3>
                  <span className="text-xs text-muted">
                    {matched} matched · {names.length - matched} new
                  </span>
                </div>
                <p className="mb-3 text-xs text-muted">We matched these to Mikon&apos;s library. Tap any to change it. Unmatched ones become your own exercises, tagged with where they came from.</p>
                <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                  {names.map((n) => {
                    const id = choice.get(n.key);
                    const ex = id ? byId.get(id) : undefined;
                    return (
                      <li key={n.key}>
                        <button type="button" onClick={() => setSwapping(n.key)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition active:bg-surface-2">
                          {ex ? <ExerciseThumb exercise={ex} className="size-10 shrink-0 rounded-lg" /> : <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-info/15 text-info"><Sparkles className="size-4" /></span>}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{n.name}</span>
                            <span className={cn("block truncate text-xs", ex ? "text-muted" : "text-info")}>{ex ? `→ ${ex.name}` : `New exercise · from ${APP_LABEL[n.app]}`}</span>
                          </span>
                          <span className="shrink-0 text-[11px] tabular-nums text-faint">{n.sets} sets</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {error && <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <div className="sticky bottom-0 -mx-4 mt-6 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-4 pt-6">
              <Button className="h-12 w-full rounded-full text-[15px]" onClick={run}>
                <Check className="size-4" strokeWidth={2.5} /> Import {workouts.toLocaleString()} workouts
              </Button>
            </div>
          </motion.div>
        )}

        {step === "importing" && (
          <motion.div key="importing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-16 text-center">
            <Loader2 className="size-8 animate-spin text-accent" />
            <p className="mt-5 font-display text-xl font-semibold">Importing your history</p>
            <p className="mt-1 text-sm text-muted">Keep this screen open for a moment.</p>
            <div className="mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-surface-3">
              <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${Math.max(4, progress * 100)}%` }} />
            </div>
          </motion.div>
        )}

        {step === "done" && result && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-10 text-center">
            <span className="flex size-16 items-center justify-center rounded-3xl bg-accent text-accent-ink">
              <PartyPopper className="size-8" />
            </span>
            <p className="mt-5 font-display text-2xl font-semibold">Your history is in</p>
            <p className="mt-1.5 text-sm text-muted">
              {result.logs.toLocaleString()} workouts and {result.measurements.toLocaleString()} measurements imported
              {result.customs ? `, plus ${result.customs} new exercises` : ""}.
            </p>
            <div className="mt-6 grid w-full max-w-xs gap-2">
              <Link href="/history" onClick={onExit} className="flex h-12 items-center justify-center rounded-full bg-accent text-[15px] font-semibold text-accent-ink">
                See your history
              </Link>
              <Link href="/" onClick={onExit} className="flex h-11 items-center justify-center text-sm text-muted hover:text-ink">
                Go to dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ExerciseSheet
        open={!!swapping}
        mode="swap"
        onClose={() => setSwapping(null)}
        onDone={(ids) => {
          if (swapping) setOverrides((o) => new Map(o).set(swapping, ids[0]));
          setSwapping(null);
        }}
      />
      {swapping && choice.get(swapping) && (
        <div className="fixed inset-x-0 bottom-0 z-[96] flex justify-center p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <Button
            variant="secondary"
            className="h-11 rounded-full px-5 shadow-2xl"
            onClick={() => {
              setOverrides((o) => new Map(o).set(swapping, null));
              setSwapping(null);
            }}
          >
            <Sparkles className="size-4 text-info" /> Keep it as my own exercise
          </Button>
        </div>
      )}
    </div>
  );
}

function safeParse(f: RawFile, unit: "kg" | "lb") {
  try {
    return parseFile(f.name, f.bytes, { weightUnit: unit });
  } catch {
    return null;
  }
}
