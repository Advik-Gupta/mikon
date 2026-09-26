"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Crosshair,
  Layers,
  Link2,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { groupById, MUSCLE_GROUPS, MUSCLES, muscleById, REGIONS } from "@/data/muscles";
import {
  DRAWN,
  exercisesForGroup,
  exercisesForMuscle,
  musclesForExercise,
  searchExercises,
  searchGroups,
  searchMuscles,
  stretchesForMuscle,
  titleCase,
  useExerciseDB,
  type Exercise,
} from "@/lib/explorer";
import { cn } from "../ui";
import { ExerciseImages, ExerciseList, LevelDot } from "./ExerciseBits";
import type { ExplorerNav } from "./useExplorerNav";

/* ------------------------------------------------------------------ shared bits */

function Crumbs({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3 text-faint" />}
          {it.onClick ? (
            <button type="button" onClick={it.onClick} className="rounded px-1 py-0.5 hover:bg-surface-2 hover:text-ink">
              {it.label}
            </button>
          ) : (
            <span className="px-1 text-ink">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function Section({ title, icon: Icon, children, aside }: { title: string; icon?: typeof Layers; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">
          {Icon && <Icon className="size-3.5 text-accent" />}
          {title}
        </h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Loading() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-[74px] animate-pulse rounded-xl bg-surface-2" />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ overview */

export function OverviewPanel({ nav }: { nav: ExplorerNav }) {
  const { db } = useExerciseDB();
  const [q, setQ] = useState("");
  const all = useMemo(() => db?.exercises ?? [], [db]);
  const groups = searchGroups(q);
  const muscles = searchMuscles(q);
  const exercises = useMemo(() => searchExercises(q, all), [q, all]);
  const searching = q.trim().length > 0;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">Explorer</p>
      <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">Muscles & exercises</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
        Tap a muscle group on the body to zoom in, then pick any muscle for its anatomy and the exercises that train it.
      </p>
      <div className="mt-4 flex gap-4 text-xs text-muted">
        <span>
          <span className="font-display text-base font-semibold text-ink">{MUSCLE_GROUPS.length}</span> groups
        </span>
        <span>
          <span className="font-display text-base font-semibold text-ink">{MUSCLES.length}</span> muscles
        </span>
        <span>
          <span className="font-display text-base font-semibold text-ink">{all.length || "…"}</span> exercises
        </span>
      </div>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search muscles or exercises…"
          className="h-11 w-full rounded-xl border border-line bg-surface-2 pl-10 pr-3.5 text-[15px] outline-none transition placeholder:text-faint hover:border-line-strong focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
        />
      </div>

      {searching ? (
        <>
          {(groups.length > 0 || muscles.length > 0) && (
            <Section title="Muscles" icon={Crosshair}>
              <div className="space-y-1.5">
                {groups.map((g) => (
                  <MuscleLink key={g.id} title={g.name} sub="Muscle group" onClick={() => nav.openGroup(g.id)} />
                ))}
                {muscles.map((m) => (
                  <MuscleLink key={m.id} title={m.name} sub={groupById(m.group)?.name} deep={m.deep} onClick={() => nav.openMuscle(m.id)} />
                ))}
              </div>
            </Section>
          )}
          <Section title={`Exercises${db ? ` · ${exercises.length}` : ""}`} icon={Zap}>
            {db ? <ExerciseList exercises={exercises} onOpen={nav.openExercise} empty={`No exercises match "${q}".`} /> : <Loading />}
          </Section>
        </>
      ) : (
        REGIONS.map((r) => (
          <Section key={r.id} title={r.name}>
            <div className="grid grid-cols-2 gap-2">
              {MUSCLE_GROUPS.filter((g) => g.region === r.id).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => nav.openGroup(g.id)}
                  className="group flex items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-3 text-left transition hover:border-accent/50 hover:bg-surface-2"
                >
                  <span>
                    <span className="block text-sm font-medium">{g.name}</span>
                    <span className="text-[11px] text-muted">
                      {g.muscles.length} muscles
                      {db && ` · ${exercisesForGroup(g.id, all).length} exercises`}
                    </span>
                  </span>
                  <ChevronRight className="size-4 text-faint transition group-hover:text-accent" />
                </button>
              ))}
            </div>
          </Section>
        ))
      )}
    </div>
  );
}

function MuscleLink({ title, sub, deep, onClick }: { title: string; sub?: string; deep?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left transition hover:border-line-strong hover:bg-surface-2"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        {sub && <span className="text-[11px] text-muted">{sub}</span>}
      </span>
      {deep && <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-muted">Deep</span>}
      <ChevronRight className="size-4 text-faint group-hover:text-ink" />
    </button>
  );
}

/* ------------------------------------------------------------------ group */

export function GroupPanel({ nav, groupId }: { nav: ExplorerNav; groupId: string }) {
  const g = groupById(groupId);
  const { db } = useExerciseDB();
  const exercises = useMemo(() => (db ? exercisesForGroup(groupId, db.exercises) : []), [db, groupId]);
  if (!g) return null;
  const muscles = g.muscles.map((id) => muscleById(id)!).filter(Boolean);

  return (
    <div>
      <Crumbs items={[{ label: "Explorer", onClick: nav.home }, { label: g.name }]} />
      <h2 className="font-display text-3xl font-semibold tracking-tight">{g.name}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{g.summary}</p>

      <Section title={`Muscles · ${muscles.length}`} icon={Layers}>
        <div className="space-y-1.5">
          {muscles.map((m) => (
            <MuscleLink key={m.id} title={m.name} sub={m.aka?.join(" · ")} deep={m.deep} onClick={() => nav.openMuscle(m.id)} />
          ))}
        </div>
      </Section>

      <Section title={`Exercises${db ? ` · ${exercises.length}` : ""}`} icon={Zap}>
        {db ? <ExerciseList exercises={exercises} onOpen={nav.openExercise} /> : <Loading />}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ muscle */

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-ink/90">{children}</p>
    </div>
  );
}

type Tab = "emphasis" | "general" | "stretch";

export function MusclePanel({ nav, muscleId }: { nav: ExplorerNav; muscleId: string }) {
  const m = muscleById(muscleId);
  const { db } = useExerciseDB();
  const [tab, setTab] = useState<Tab>("emphasis");
  const lists = useMemo(() => {
    if (!db || !m) return null;
    return { ...exercisesForMuscle(m, db.exercises), stretch: stretchesForMuscle(m, db.exercises) };
  }, [db, m]);
  if (!m) return null;
  const g = groupById(m.group)!;
  // Only mention the stand-in shape when this figure doesn't draw the muscle itself.
  const beneath = m.beneath && !DRAWN[nav.sex].has(m.id) ? muscleById(m.beneath) : null;
  const siblings = g.muscles.filter((id) => id !== m.id);

  const tabs: { id: Tab; label: string; n?: number }[] = [
    { id: "emphasis", label: "Targets it most", n: lists?.emphasis.length },
    { id: "general", label: "Also works it", n: lists?.general.length },
    { id: "stretch", label: "Stretches", n: lists?.stretch.length },
  ];

  return (
    <div>
      <Crumbs items={[{ label: "Explorer", onClick: nav.home }, { label: g.name, onClick: () => nav.openGroup(g.id) }, { label: m.name }]} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-accent/12 px-2.5 py-0.5 text-[11px] font-medium text-accent">{g.name}</span>
        {m.deep && <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] text-muted">Deep muscle</span>}
      </div>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">{m.name}</h2>
      {m.aka && <p className="mt-1 text-sm text-muted">Also called {m.aka.join(", ")}</p>}
      <p className="mt-4 text-[15px] leading-relaxed text-ink/90">{m.description}</p>
      {beneath && (
        <button
          type="button"
          onClick={() => nav.openMuscle(beneath.id)}
          className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-accent/40 bg-accent/[0.04] px-3 py-2 text-xs text-muted hover:text-ink"
        >
          <span className="size-3 rounded-sm bg-[repeating-linear-gradient(45deg,var(--color-accent)_0_2px,transparent_2px_4px)]" />
          {m.deep ? "Lies beneath the" : "Sits beside the"} <span className="text-ink">{beneath.name}</span>, shown hatched on the figure
        </button>
      )}

      {m.parts && (
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {m.parts.map((p) => (
            <div key={p.name} className="rounded-xl border border-line bg-surface-2 p-3">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{p.note}</p>
            </div>
          ))}
        </div>
      )}

      <Section title="Anatomy" icon={BookOpen}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Fact label="Origin">{m.origin}</Fact>
          <Fact label="Insertion">{m.insertion}</Fact>
          <div className="sm:col-span-2">
            <Fact label="Innervation">{m.innervation}</Fact>
          </div>
        </div>
      </Section>

      <Section title="What it does" icon={Crosshair}>
        <ul className="space-y-2">
          {m.actions.map((a) => (
            <li key={a} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <ArrowRight className="mt-1 size-3.5 shrink-0 text-accent" />
              {a}
            </li>
          ))}
        </ul>
      </Section>

      <div className="mt-6 flex gap-3 rounded-xl border border-accent/25 bg-accent/[0.05] p-4">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-accent" />
        <p className="text-sm leading-relaxed text-ink/90">{m.training}</p>
      </div>

      <Section title="Exercises" icon={Zap}>
        <div className="mb-3 flex gap-1 rounded-xl border border-line bg-surface-2 p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition",
                tab === t.id ? "bg-ink text-bg" : "text-muted hover:text-ink",
              )}
            >
              {t.label}
              {t.n != null && <span className="ml-1 opacity-60">{t.n}</span>}
            </button>
          ))}
        </div>
        {lists ? (
          <ExerciseList
            key={`${m.id}-${tab}`}
            exercises={lists[tab]}
            onOpen={nav.openExercise}
            empty={
              tab === "emphasis"
                ? "No exercises in the library specifically bias this muscle. Check “Also works it”."
                : tab === "stretch"
                  ? "No stretches listed for this area yet."
                  : "No other exercises."
            }
          />
        ) : (
          <Loading />
        )}
      </Section>

      {siblings.length > 0 && (
        <Section title={`More in ${g.name}`} icon={Link2}>
          <div className="flex flex-wrap gap-1.5">
            {siblings.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => nav.openMuscle(id)}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-ink/85 transition hover:border-line-strong hover:text-ink"
              >
                {muscleById(id)?.name}
              </button>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ exercise */

function MuscleChips({ ids, nav, strong }: { ids: string[]; nav: ExplorerNav; strong?: boolean }) {
  if (!ids.length) return <p className="text-sm text-faint">None listed</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => nav.openMuscle(id)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
            strong ? "border-accent/50 bg-accent/10 text-accent hover:bg-accent/15" : "border-line bg-surface text-ink/85 hover:border-line-strong",
          )}
        >
          <span className={cn("size-1.5 rounded-full", strong ? "bg-accent" : "bg-accent/45")} />
          {muscleById(id)?.name}
        </button>
      ))}
    </div>
  );
}

export function ExercisePanel({ nav, exercise }: { nav: ExplorerNav; exercise: Exercise }) {
  const worked = musclesForExercise(exercise);
  const { db } = useExerciseDB();
  const ladder = exercise.family ? (db?.exercises ?? []).filter((e) => e.family === exercise.family).sort((a, b) => (a.step ?? 0) - (b.step ?? 0)) : [];
  const meta = [
    { label: "Discipline", value: exercise.discipline },
    ...(exercise.intensity ? [{ label: "Intensity", value: exercise.intensity }] : []),
    { label: "Level", value: exercise.level, dot: true },
    { label: "Equipment", value: exercise.equipment },
    { label: "Type", value: exercise.category },
    { label: "Mechanics", value: exercise.mechanic },
    { label: "Force", value: exercise.force },
  ].filter((x) => x.value);

  return (
    <div>
      <button type="button" onClick={nav.closeExercise} className="mb-4 flex items-center gap-1.5 text-xs text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" /> Back
      </button>
      <h2 className="font-display text-3xl font-semibold tracking-tight">{exercise.name}</h2>

      {exercise.images.length ? (
        <>
          <ExerciseImages exercise={exercise} className="mt-5 aspect-[4/3] w-full rounded-2xl border border-line" />
          <p className="mt-2 text-[11px] text-faint">Start and end positions, alternating.</p>
        </>
      ) : (
        <ExerciseImages exercise={exercise} className="mt-5 h-36 w-full rounded-2xl border border-line" />
      )}

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {meta.map((x) => (
          <div key={x.label} className="rounded-xl border border-line bg-surface px-3 py-2.5">
            <p className="text-[11px] text-muted">{x.label}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
              {x.dot && <LevelDot level={x.value!} />}
              {titleCase(x.value!)}
            </p>
          </div>
        ))}
      </div>

      {ladder.length > 1 && (
        <Section title={`${exercise.family} progression`} icon={Layers}>
          <ol className="space-y-1">
            {ladder.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => nav.openExercise(e.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition",
                    e.id === exercise.id ? "border-violet/50 bg-violet/10 text-ink" : "border-line text-muted hover:border-line-strong hover:text-ink",
                  )}
                >
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold", e.id === exercise.id ? "bg-violet text-accent-ink" : "bg-surface-3")}>
                    {e.step}
                  </span>
                  <span className="flex-1">{e.name}</span>
                  <LevelDot level={e.level} />
                </button>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section title="Primary muscles" icon={Crosshair}>
        <MuscleChips ids={worked.primary} nav={nav} strong />
      </Section>
      {worked.secondary.length > 0 && (
        <Section title="Secondary muscles">
          <MuscleChips ids={worked.secondary} nav={nav} />
        </Section>
      )}

      <Section title="How to do it" icon={BookOpen}>
        <ol className="space-y-3">
          {exercise.instructions.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-3 font-display text-[11px] font-bold">{i + 1}</span>
              <span className="pt-0.5 text-ink/90">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <p className="mt-8 border-t border-line pt-4 text-[11px] text-faint">
        {exercise.source === "mikon" ? "Written for Mikon." : "Photos and instructions: free-exercise-db (public domain)."}
      </p>
    </div>
  );
}
