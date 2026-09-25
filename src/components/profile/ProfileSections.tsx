"use client";

import type { LucideIcon } from "lucide-react";
import { Bandage, CalendarDays, Dumbbell, Gauge, MapPin, Pencil, Ruler, Target, User } from "lucide-react";
import { age, fmtClock, formatHeight, formatLength, formatWeight, round1 } from "@/lib/body";
import {
  ACTIVITY_LEVELS,
  BODY_FAT_METHODS,
  CONDITIONS,
  EXPERIENCE_LEVELS,
  INJURY_STATUS,
  MODALITIES,
  GOALS,
  RECORDS,
  busyCategory,
  SEX_OPTIONS,
  TIMEFRAMES,
  labelOf,
  regionLabel,
} from "@/lib/options";
import type { Profile } from "@/lib/types";
import { SEVERITY_COLOR } from "../graphics/BodyMap";
import { WeekMini } from "../schedule/WeekMini";
import { daysLabel, fmtDuration, fmtRange, fmtTime } from "@/lib/schedule";
import type { ReactNode } from "react";

export type StepId =
  | "personal"
  | "address"
  | "body"
  | "composition"
  | "health"
  | "experience"
  | "training"
  | "goals"
  | "schedule";

function Card({
  icon: Icon,
  title,
  onEdit,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  onEdit?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-5 ${className ?? ""}`}>
      <header className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2.5 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-surface-3 text-accent">
            <Icon className="size-3.5" />
          </span>
          {title}
        </h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <Pencil className="size-3" /> Edit
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right text-ink">{v || <span className="text-faint">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

function Pills({ items, empty = "None" }: { items: string[]; empty?: string }) {
  if (!items.length) return <p className="text-sm text-faint">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((i) => (
        <span key={i} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-xs text-ink/90">
          {i}
        </span>
      ))}
    </div>
  );
}

export function ProfileSections({ profile: p, onEdit }: { profile: Profile; onEdit?: (step: StepId) => void }) {
  const edit = (s: StepId) => (onEdit ? () => onEdit(s) : undefined);
  const u = p.body.units;
  const a = age(p.personal.dob);
  const addr = [p.address.line1, p.address.line2, p.address.city, p.address.region, p.address.postalCode, p.address.country].filter(Boolean);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card icon={User} title="Personal" onEdit={edit("personal")}>
        <Rows
          rows={[
            ["Name", [p.personal.firstName, p.personal.lastName].filter(Boolean).join(" ")],
            ["Goes by", p.personal.preferredName],
            ["Email", p.personal.email],
            ["Phone", p.personal.phone],
            ["Age", a != null ? `${a}` : ""],
            ["Sex", p.personal.sex ? labelOf(SEX_OPTIONS, p.personal.sex) : ""],
          ]}
        />
      </Card>

      <Card icon={MapPin} title="Address" onEdit={edit("address")}>
        {addr.length ? (
          <address className="text-sm not-italic leading-relaxed text-ink/90">
            {p.address.line1 && <div>{p.address.line1}</div>}
            {p.address.line2 && <div>{p.address.line2}</div>}
            <div>{[p.address.city, p.address.region, p.address.postalCode].filter(Boolean).join(", ")}</div>
            {p.address.country && <div className="text-muted">{p.address.country}</div>}
          </address>
        ) : (
          <p className="text-sm text-faint">No address added</p>
        )}
      </Card>

      <Card icon={Ruler} title="Body" onEdit={edit("body")}>
        <Rows
          rows={[
            ["Height", formatHeight(p.body.heightCm, u)],
            ["Weight", formatWeight(p.body.weightKg, u)],
            [
              "Body fat",
              p.body.bodyFat != null ? (
                <span>
                  {round1(p.body.bodyFat)}%{" "}
                  <span className="text-faint">· {labelOf(BODY_FAT_METHODS, p.body.bodyFatMethod).toLowerCase()}</span>
                </span>
              ) : (
                ""
              ),
            ],
            ...(p.body.waistCm ? ([["Waist", formatLength(p.body.waistCm, u)]] as [string, string][]) : []),
            ["Units", u === "metric" ? "Metric" : "Imperial"],
          ]}
        />
      </Card>

      <Card icon={Bandage} title="Health & injuries" onEdit={edit("health")}>
        {p.health.injuries.length ? (
          <ul className="space-y-2">
            {p.health.injuries.map((i) => (
              <li key={i.id} className="flex items-start gap-2.5 text-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: SEVERITY_COLOR[i.severity] }} />
                <span className="min-w-0">
                  <span className="text-ink">{regionLabel(i.area)}</span>
                  <span className="text-faint">
                    {" "}
                    · {i.severity} · {labelOf(INJURY_STATUS, i.status).toLowerCase()}
                  </span>
                  {i.note && <span className="block truncate text-xs text-muted">{i.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-faint">No injuries reported</p>
        )}
        {p.health.conditions.length > 0 && (
          <div className="mt-4">
            <Pills items={p.health.conditions.map((c) => labelOf(CONDITIONS, c))} />
          </div>
        )}
      </Card>

      <Card icon={Gauge} title="Experience" onEdit={edit("experience")}>
        <Rows
          rows={[
            ["Level", p.experience.level ? labelOf(EXPERIENCE_LEVELS, p.experience.level) : ""],
            ["Training for", `${p.experience.yearsTraining >= 20 ? "20+" : p.experience.yearsTraining} yrs`],
            ["Daily activity", p.experience.activityLevel ? labelOf(ACTIVITY_LEVELS, p.experience.activityLevel) : ""],
          ]}
        />
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 sm:grid-cols-4 md:grid-cols-2 xl:grid-cols-4">
          {RECORDS.map((r) => {
            const rec = p.experience.records[r.id];
            return (
              <div key={r.id} className="rounded-xl bg-surface-2 px-3 py-2">
                <p className="text-[11px] text-muted">{r.short}</p>
                <p className={`font-display text-sm font-semibold tabular-nums ${rec?.value == null ? "text-faint" : ""}`}>
                  {rec?.never ? "Never" : rec?.value == null ? "—" : r.kind === "lift" ? formatWeight(rec.value, u) : fmtClock(rec.value)}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card icon={Dumbbell} title="Training disciplines" onEdit={edit("training")}>
        <Pills items={p.training.modalities.map((m) => labelOf(MODALITIES, m))} />
        {p.training.sports.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-muted">Sports</p>
            <Pills items={p.training.sports} />
          </div>
        )}
      </Card>

      <Card icon={Target} title="Goals" onEdit={edit("goals")}>
        {p.goals.ranked.length ? (
          <ol className="space-y-1.5">
            {p.goals.ranked.map((g, i) => (
              <li key={g} className="flex items-center gap-2.5 text-sm">
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-bold ${
                    i === 0 ? "bg-accent text-accent-ink" : "bg-surface-3 text-ink"
                  }`}
                >
                  {i + 1}
                </span>
                {labelOf(GOALS, g)}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-faint">No goals set</p>
        )}
        <div className="mt-4">
          <Rows
            rows={[
              ["Timeframe", labelOf(TIMEFRAMES, p.goals.timeframe)],
              ...(p.goals.targetWeightKg ? ([["Target weight", formatWeight(p.goals.targetWeightKg, u)]] as [string, string][]) : []),
            ]}
          />
        </div>
        {p.goals.motivation && (
          <blockquote className="mt-4 border-l-2 border-accent pl-3 text-sm italic text-muted">{p.goals.motivation}</blockquote>
        )}
      </Card>

      <Card icon={CalendarDays} title="Weekly schedule" onEdit={edit("schedule")} className="md:col-span-2">
        <div className="grid gap-6 md:grid-cols-[1fr_260px]">
          <WeekMini schedule={p.schedule} />
          <div>
            <Rows
              rows={[
                ["Sessions", `${p.schedule.daysPerWeek}× per week`],
                ["Length", fmtDuration(p.schedule.sessionMinutes)],
                ["Awake", `${fmtTime(p.schedule.wakeMin, true)} – ${fmtTime(p.schedule.sleepMin, true)}`],
              ]}
            />
            {p.schedule.blocks.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
                {p.schedule.blocks.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 text-xs">
                    <span className="size-2 shrink-0 rounded-full" style={{ background: busyCategory(b.category).color }} />
                    <span className="flex-1 truncate text-ink">{b.label || busyCategory(b.category).label}</span>
                    <span className="text-faint">
                      {daysLabel(b.days)} · {fmtRange(b)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
