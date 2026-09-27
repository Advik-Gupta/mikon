"use client";

import { MuscleShape } from "@/components/graphics/MuscleShape";
import { useId, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Check, Info, Plus } from "lucide-react";
import { DISCIPLINES, type Discipline } from "@/data/activities";
import { FEDB_TO_GROUP, MUSCLE_GROUPS, muscleById } from "@/data/muscles";
import { BODY, DRAWN, findSimilar, saveCustomExercise, titleCase, type Exercise, type Sex, type View } from "@/lib/explorer";
import { useProfile } from "@/lib/storage";
import { Modal } from "../Modal";
import { Button, Chip, cn, Input, Segmented, Textarea } from "../ui";

/** Canonical exercise-db muscle key for each Mikon group, so custom exercises plug into all the maths. */
const GROUP_TO_FEDB: Record<string, string> = {
  core: "abdominals",
  glutes: "glutes",
  adductors: "adductors",
  biceps: "biceps",
  calves: "calves",
  chest: "chest",
  forearms: "forearms",
  hamstrings: "hamstrings",
  lats: "lats",
  "lower-back": "lower back",
  traps: "traps",
  neck: "neck",
  quads: "quadriceps",
  shoulders: "shoulders",
  triceps: "triceps",
};

const EQUIPMENT = ["body only", "barbell", "dumbbell", "cable", "machine", "kettlebells", "bands", "e-z curl bar", "medicine ball", "exercise ball", "pull-up bar", "foam roll", "other"];

type Role = "primary" | "secondary";

function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink/90">
      {children}
      {hint && <span className="text-xs font-normal text-faint">{hint}</span>}
    </span>
  );
}

/** Click a muscle group once for primary, again for secondary, again to clear. */
function MusclePicker({ roles, onToggle, sex }: { roles: Record<string, Role>; onToggle: (group: string) => void; sex: Sex }) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div>
      <div className="flex h-[26rem] gap-2 rounded-2xl border border-line bg-surface-2/40 p-2">
        {(["front", "back"] as View[]).map((v) => {
          const view = BODY[sex][v];
          return (
            <svg key={v} viewBox={view.viewBox.join(" ")} className="h-full min-w-0 flex-1" preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Muscle picker, ${v}`}>
              {view.silhouette.map((d, i) => (
                <path key={i} d={d} fill="#15171b" stroke="#d9dde3" strokeOpacity={0.5} strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}
              {view.shapes.map((s, i) => {
                const g = muscleById(s.m)?.group ?? "";
                const role = roles[g];
                return (
                  <MuscleShape
                    key={i}
                    shape={s}
                    clipKey={`${uid}-${v}-${i}`}
                    fill={role ? "#c6f432" : hover === g ? "#5b6470" : "#3a4049"}
                    fillOpacity={role === "secondary" ? 0.4 : 1}
                    stroke="#d9dde3"
                    strokeOpacity={0.8}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                    className="cursor-pointer transition-[fill] duration-150"
                    onClick={() => onToggle(g)}
                    onMouseEnter={() => setHover(g)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <title>{MUSCLE_GROUPS.find((x) => x.id === g)?.name}</title>
                  </MuscleShape>
                );
              })}
            </svg>
          );
        })}
      </div>
      <p className="mt-1.5 flex items-center justify-center gap-3 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-accent" /> Primary (click once)
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-accent/40" /> Secondary (click twice)
        </span>
        <span className="text-faint">{hover ? MUSCLE_GROUPS.find((x) => x.id === hover)?.name : ""}</span>
      </p>
    </div>
  );
}

export function CreateExerciseModal({
  open,
  onClose,
  all,
  initialName = "",
  initialDiscipline = "weights",
  editing,
  onSaved,
  onUseExisting,
  useExistingLabel = "Use it",
}: {
  open: boolean;
  onClose: () => void;
  all: Exercise[];
  initialName?: string;
  initialDiscipline?: Discipline;
  editing?: Exercise | null;
  onSaved: (ex: Exercise) => void;
  /** Offered when the name already exists in the library */
  onUseExisting?: (ex: Exercise) => void;
  useExistingLabel?: string;
}) {
  if (!open) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;
  return (
    <CreateExerciseForm
      key={editing?.id ?? "new"}
      onClose={onClose}
      all={all}
      initialName={initialName}
      initialDiscipline={initialDiscipline}
      editing={editing}
      onSaved={onSaved}
      onUseExisting={onUseExisting}
      useExistingLabel={useExistingLabel}
    />
  );
}

function CreateExerciseForm({
  onClose,
  all,
  initialName,
  initialDiscipline,
  editing,
  onSaved,
  onUseExisting,
  useExistingLabel,
}: {
  onClose: () => void;
  all: Exercise[];
  initialName: string;
  initialDiscipline: Discipline;
  editing?: Exercise | null;
  onSaved: (ex: Exercise) => void;
  onUseExisting?: (ex: Exercise) => void;
  useExistingLabel: string;
}) {
  const profile = useProfile();
  const sex: Sex = profile?.personal.sex === "female" ? "female" : "male";

  const [name, setName] = useState(editing?.name ?? initialName);
  const [discipline, setDiscipline] = useState<Discipline>(editing?.discipline ?? initialDiscipline);
  const [equipment, setEquipment] = useState(editing?.equipment ?? (initialDiscipline === "calisthenics" ? "body only" : "dumbbell"));
  const [level, setLevel] = useState(editing?.level ?? "intermediate");
  const [measure, setMeasure] = useState<"reps" | "time">(editing?.measure ?? "reps");
  const [mechanic, setMechanic] = useState(editing?.mechanic ?? "compound");
  const [force, setForce] = useState(editing?.force ?? "push");
  const [intensity, setIntensity] = useState<"low" | "moderate" | "high">(editing?.intensity ?? "moderate");
  const [roles, setRoles] = useState<Record<string, Role>>(() => {
    const r: Record<string, Role> = {};
    editing?.secondary.forEach((k) => FEDB_TO_GROUP[k] && (r[FEDB_TO_GROUP[k]] = "secondary"));
    editing?.primary.forEach((k) => FEDB_TO_GROUP[k] && (r[FEDB_TO_GROUP[k]] = "primary"));
    return r;
  });
  const [targets, setTargets] = useState<string[]>(editing?.targets ?? []);
  const [instructions, setInstructions] = useState(editing?.instructions.join("\n") ?? "");
  const [tried, setTried] = useState(false);

  const { exact, similar } = useMemo(() => findSimilar(name, all, editing?.id), [name, all, editing?.id]);
  const primaryGroups = Object.keys(roles).filter((g) => roles[g] === "primary");
  const secondaryGroups = Object.keys(roles).filter((g) => roles[g] === "secondary");
  const errors = [!name.trim() && "Give it a name", exact && "An exercise with this name already exists", !primaryGroups.length && "Pick at least one primary muscle group"].filter(Boolean) as string[];

  const toggleGroup = (g: string) =>
    setRoles((r) => {
      const next = { ...r };
      if (!r[g]) next[g] = "primary";
      else if (r[g] === "primary") next[g] = "secondary";
      else delete next[g];
      // Specific muscles only make sense within primary groups.
      setTargets((t) => t.filter((id) => next[muscleById(id)?.group ?? ""] === "primary"));
      return next;
    });

  const save = () => {
    setTried(true);
    if (errors.length) return;
    const ex: Exercise = {
      id: editing?.id ?? `cx-${crypto.randomUUID().slice(0, 8)}`,
      name: name.trim(),
      category: discipline === "mobility" ? "stretching" : discipline === "plyometrics" ? "plyometrics" : discipline === "cardio" ? "cardio" : "strength",
      discipline,
      level,
      equipment,
      mechanic,
      force,
      measure: discipline === "mobility" || discipline === "cardio" ? "time" : measure,
      ...(discipline === "plyometrics" && { intensity }),
      primary: primaryGroups.map((g) => GROUP_TO_FEDB[g]),
      secondary: secondaryGroups.map((g) => GROUP_TO_FEDB[g]),
      targets: targets.length ? targets : undefined,
      instructions: instructions.split("\n").map((s) => s.trim()).filter(Boolean),
      images: [],
      source: "custom",
      createdAt: editing?.createdAt ?? new Date().toISOString(),
    };
    saveCustomExercise(ex);
    onSaved(ex);
  };

  return (
    <Modal
      open
      onClose={onClose}
      className="max-w-3xl"
      title={editing ? "Edit exercise" : "Create an exercise"}
      subtitle="It's saved to your library and works everywhere: the Explorer, the builder and the fatigue map."
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-xs text-danger">{tried && errors[0]}</p>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={save} disabled={tried && errors.length > 0}>
              {editing ? <Check className="size-4" /> : <Plus className="size-4" />} {editing ? "Save changes" : "Create exercise"}
            </Button>
          </div>
        </div>
      }
    >
      <label className="block">
        <Label>Name</Label>
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Landmine Rotation Press" className={cn(exact && "border-danger/60")} />
      </label>
      {exact && (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm">
          <AlertTriangle className="size-4 shrink-0 text-danger" />
          <span className="flex-1 text-ink/90">
            <span className="font-medium">{exact.name}</span> is already in the library.
          </span>
          {onUseExisting && (
            <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => onUseExisting(exact)}>
              {useExistingLabel}
            </Button>
          )}
        </div>
      )}
      {!exact && similar.length > 0 && (
        <div className="mt-2 rounded-xl border border-line bg-surface-2/50 px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Info className="size-3.5" /> Similar exercises already exist. Is it one of these?
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {similar.map((s) =>
              onUseExisting ? (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onUseExisting(s)}
                  className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink/85 hover:border-accent/50 hover:text-ink"
                >
                  {s.name}
                </button>
              ) : (
                <span key={s.id} className="rounded-full border border-line px-2.5 py-1 text-xs text-muted">
                  {s.name}
                </span>
              ),
            )}
          </div>
        </div>
      )}

      <div className="mt-5">
        <Label>Type of training</Label>
        <div className="flex flex-wrap gap-1.5">
          {DISCIPLINES.map((d) => (
            <Chip key={d.id} selected={discipline === d.id} onClick={() => setDiscipline(d.id)}>
              <d.icon className="size-3.5" />
              {d.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_240px]">
        <div>
          <Label hint={primaryGroups.length ? `${primaryGroups.length} primary · ${secondaryGroups.length} secondary` : undefined}>Muscles worked</Label>
          <MusclePicker roles={roles} onToggle={toggleGroup} sex={sex} />
        </div>
        <div className="space-y-2">
          <Label>Or pick from the list</Label>
          <div className="scrollbar-thin max-h-[26rem] space-y-1 overflow-y-auto pr-1">
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGroup(g.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs transition",
                  roles[g.id] === "primary" ? "border-accent/60 bg-accent/10 text-ink" : roles[g.id] === "secondary" ? "border-accent/30 text-ink/85" : "border-line text-muted hover:text-ink",
                )}
              >
                {g.name}
                {roles[g.id] && <span className={cn("text-[10px] font-medium", roles[g.id] === "primary" ? "text-accent" : "text-accent/70")}>{roles[g.id]}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {primaryGroups.length > 0 && (
        <div className="mt-4">
          <Label hint="Optional">Specific muscles it targets</Label>
          <div className="flex flex-wrap gap-1.5">
            {primaryGroups.flatMap((g) =>
              (MUSCLE_GROUPS.find((x) => x.id === g)?.muscles ?? [])
                .filter((id) => DRAWN[sex].has(id) || muscleById(id)?.deep)
                .map((id) => (
                  <Chip key={id} selected={targets.includes(id)} onClick={() => setTargets((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]))}>
                    {muscleById(id)?.short ?? muscleById(id)?.name}
                  </Chip>
                )),
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-faint">Leave empty to count it for the whole group.</p>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <Label>Equipment</Label>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="h-11 w-full cursor-pointer rounded-xl border border-line bg-surface-2 px-3 text-sm outline-none hover:border-line-strong focus:border-accent/60"
          >
            {EQUIPMENT.map((e) => (
              <option key={e} value={e}>
                {titleCase(e)}
              </option>
            ))}
          </select>
        </label>
        <div>
          <Label>Level</Label>
          <Segmented
            value={level}
            onChange={setLevel}
            options={[
              { id: "beginner", label: "Beginner" },
              { id: "intermediate", label: "Intermediate" },
              { id: "expert", label: "Expert" },
            ]}
          />
        </div>
        {discipline !== "mobility" && discipline !== "cardio" && (
          <div>
            <Label>Measured in</Label>
            <Segmented
              value={measure}
              onChange={setMeasure}
              options={[
                { id: "reps", label: "Reps" },
                { id: "time", label: "Hold time" },
              ]}
            />
          </div>
        )}
        {discipline === "plyometrics" ? (
          <div>
            <Label>Intensity</Label>
            <Segmented
              value={intensity}
              onChange={setIntensity}
              options={[
                { id: "low", label: "Low" },
                { id: "moderate", label: "Moderate" },
                { id: "high", label: "High" },
              ]}
            />
          </div>
        ) : (
          <div className="flex gap-4">
            <div>
              <Label>Mechanics</Label>
              <Segmented
                size="sm"
                value={mechanic ?? "compound"}
                onChange={setMechanic}
                options={[
                  { id: "compound", label: "Compound" },
                  { id: "isolation", label: "Isolation" },
                ]}
              />
            </div>
            <div>
              <Label>Force</Label>
              <Segmented
                size="sm"
                value={force ?? "push"}
                onChange={setForce}
                options={[
                  { id: "push", label: "Push" },
                  { id: "pull", label: "Pull" },
                  { id: "static", label: "Static" },
                ]}
              />
            </div>
          </div>
        )}
      </div>

      <label className="mt-5 block">
        <Label hint="Optional · one step per line">How to do it</Label>
        <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder={"Set up…\nPerform…\nReturn…"} />
      </label>
    </Modal>
  );
}
