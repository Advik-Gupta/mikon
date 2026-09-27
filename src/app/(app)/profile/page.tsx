"use client";

import { useRouter } from "next/navigation";
import { CalendarCheck, LogOut, Mail, MapPin, Pencil, RotateCcw } from "lucide-react";
import { age, bmi, bmiLabel, displayName, fatBand, formatHeight, formatWeight, round1 } from "@/lib/body";
import type { InjurySeverity } from "@/lib/types";
import { logout, resetAll, useProfile } from "@/lib/storage";
import { BodyMap, SEVERITY_COLOR } from "@/components/graphics/BodyMap";
import { ProfileSections } from "@/components/profile/ProfileSections";
import { Avatar } from "@/components/shell/Avatar";
import { Button } from "@/components/ui";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-faint">{sub}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const profile = useProfile()!;
  const router = useRouter();
  const p = profile;
  const u = p.body.units;
  const a = age(p.personal.dob);
  const b = bmi(p.body.heightCm, p.body.weightKg);
  const band = p.body.bodyFat != null ? fatBand(p.personal.sex, p.body.bodyFat) : null;
  const marked = Object.fromEntries(p.health.injuries.map((i) => [i.area, i.severity]));
  const location = [p.address.city, p.address.country].filter(Boolean).join(", ");

  const reset = () => {
    if (window.confirm("Reset all your data? Your profile, programs and custom exercises will be deleted and you'll start onboarding again. Your account stays.")) {
      resetAll();
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
      {/* Header */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-surface">
        <div className="board-grid h-28 bg-gradient-to-br from-accent/20 via-surface-2 to-info/10" />
        <div className="flex flex-wrap items-end justify-between gap-4 px-6 pb-6">
          <div className="-mt-10 flex items-end gap-4">
            <Avatar profile={p} size={88} className="ring-4 ring-surface" />
            <div className="pb-1">
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                {[p.personal.firstName, p.personal.lastName].filter(Boolean).join(" ")}
              </h2>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                {p.personal.preferredName && <span>“{displayName(p)}”</span>}
                <span className="flex items-center gap-1.5">
                  <Mail className="size-3.5" /> {p.personal.email}
                </span>
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" /> {location}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <CalendarCheck className="size-3.5" /> Joined{" "}
                  {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.push("/onboarding?edit=personal")}>
              <Pencil className="size-4" /> Edit profile
            </Button>
            <Button variant="ghost" onClick={reset} title="Reset my data">
              <RotateCcw className="size-4" />
            </Button>
            <Button variant="ghost" onClick={logout} title="Log out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Age" value={a != null ? `${a}` : "—"} />
        <Stat label="Height" value={formatHeight(p.body.heightCm, u)} />
        <Stat label="Weight" value={formatWeight(p.body.weightKg, u)} />
        <Stat label="BMI" value={b != null ? `${b}` : "—"} sub={b != null ? bmiLabel(b) : undefined} />
        <Stat
          label="Body fat"
          value={p.body.bodyFat != null ? `${round1(p.body.bodyFat)}%` : "—"}
          sub={band?.label}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <section className="h-fit rounded-2xl border border-line bg-surface p-5 lg:sticky lg:top-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Injury map</h3>
            <span className="text-xs text-muted">
              {p.health.injuries.length ? `${p.health.injuries.length} reported` : "Nothing reported"}
            </span>
          </div>
          <BodyMap marked={marked} />
          <div className="mt-4 flex justify-center gap-4 text-[11px] text-muted">
            {(Object.keys(SEVERITY_COLOR) as InjurySeverity[]).map((sev) => (
              <span key={sev} className="flex items-center gap-1.5 capitalize">
                <span className="size-2 rounded-full" style={{ background: SEVERITY_COLOR[sev] }} />
                {sev}
              </span>
            ))}
          </div>
        </section>
        <ProfileSections profile={p} onEdit={(step) => router.push(`/onboarding?edit=${step}`)} />
      </div>
    </div>
  );
}
