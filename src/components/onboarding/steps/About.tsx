"use client";

import { Cake, Mail, MapPin, Phone, User } from "lucide-react";
import { age } from "@/lib/body";
import { SEX_OPTIONS } from "@/lib/options";
import type { Sex } from "@/lib/types";
import { Field, Input, Segmented } from "@/components/ui";
import { StepHeader } from "../StepHeader";
import type { StepProps } from "../defaults";

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export function PersonalStep({ draft, update }: StepProps) {
  const p = draft.personal;
  const set = (patch: Partial<typeof p>) => update("personal", patch);
  const a = age(p.dob);
  const emailBad = p.email.length > 3 && !isEmail(p.email);

  return (
    <>
      <StepHeader
        icon={User}
        eyebrow="About you · Contact"
        title="Let's start with the basics"
        subtitle="Who you are and how to reach you. Only your first name and email are required."
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name">
          <Input autoFocus value={p.firstName} onChange={(e) => set({ firstName: e.target.value })} placeholder="Alex" autoComplete="given-name" />
        </Field>
        <Field label="Last name" optional>
          <Input value={p.lastName} onChange={(e) => set({ lastName: e.target.value })} placeholder="Morgan" autoComplete="family-name" />
        </Field>
        <Field label="What should we call you?" optional hint="Shown around the app instead of your first name.">
          <Input value={p.preferredName} onChange={(e) => set({ preferredName: e.target.value })} placeholder={p.firstName || "Nickname"} />
        </Field>
        <Field label="Date of birth" optional hint={a != null ? `${a} years old` : "Used for age-based recovery and heart-rate zones."}>
          <Input type="date" icon={Cake} value={p.dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set({ dob: e.target.value })} />
        </Field>
        <Field label="Email" hint={emailBad ? "That doesn't look like a valid email." : undefined}>
          <Input
            type="email"
            icon={Mail}
            value={p.email}
            onChange={(e) => set({ email: e.target.value })}
            placeholder="you@example.com"
            autoComplete="email"
            className={emailBad ? "border-danger/60" : undefined}
          />
        </Field>
        <Field label="Phone" optional>
          <Input type="tel" icon={Phone} value={p.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+1 555 000 0000" autoComplete="tel" />
        </Field>
      </div>
      <div className="mt-6">
        <span className="mb-2 block text-sm font-medium text-ink/90">Sex</span>
        <p className="mb-3 text-xs text-muted">Used for body-fat estimates and physiological norms.</p>
        <Segmented options={SEX_OPTIONS as { id: Sex; label: string }[]} value={p.sex} onChange={(sex) => set({ sex })} />
      </div>
    </>
  );
}

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "India", "Ireland", "New Zealand",
  "Germany", "France", "Spain", "Italy", "Netherlands", "Sweden", "Norway", "Brazil", "Mexico",
  "Japan", "Singapore", "South Africa", "United Arab Emirates",
];
const IMPERIAL = ["United States", "Liberia", "Myanmar"];

export function AddressStep({ draft, update }: StepProps) {
  const a = draft.address;
  const set = (patch: Partial<typeof a>) => update("address", patch);
  const preview = [a.line1, a.city, a.region, a.postalCode, a.country].filter(Boolean);

  return (
    <>
      <StepHeader
        icon={MapPin}
        eyebrow="About you · Address"
        title="Where are you based?"
        subtitle="Sets your default units and will later power local gym, event and time-zone features. All optional."
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Street address" optional className="sm:col-span-2">
            <Input value={a.line1} onChange={(e) => set({ line1: e.target.value })} placeholder="123 Main St" autoComplete="address-line1" />
          </Field>
          <Field label="Apartment, suite, etc." optional className="sm:col-span-2">
            <Input value={a.line2} onChange={(e) => set({ line2: e.target.value })} autoComplete="address-line2" />
          </Field>
          <Field label="City" optional>
            <Input value={a.city} onChange={(e) => set({ city: e.target.value })} autoComplete="address-level2" />
          </Field>
          <Field label="State / region" optional>
            <Input value={a.region} onChange={(e) => set({ region: e.target.value })} autoComplete="address-level1" />
          </Field>
          <Field label="Postal code" optional>
            <Input value={a.postalCode} onChange={(e) => set({ postalCode: e.target.value })} autoComplete="postal-code" />
          </Field>
          <Field label="Country" optional>
            <Input
              list="mikon-countries"
              value={a.country}
              autoComplete="country-name"
              onChange={(e) => {
                const country = e.target.value;
                set({ country });
                if (COUNTRIES.includes(country) || IMPERIAL.includes(country)) {
                  update("body", { units: IMPERIAL.includes(country) ? "imperial" : "metric" });
                }
              }}
            />
            <datalist id="mikon-countries">
              {COUNTRIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>

        <div className="relative hidden overflow-hidden rounded-2xl border border-line bg-surface lg:block">
          <svg viewBox="0 0 260 200" className="absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--color-line)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="260" height="200" fill="url(#grid)" />
            <path d="M -10 140 C 60 120, 90 170, 150 130 S 230 80, 280 100" stroke="var(--color-line-strong)" strokeWidth="10" fill="none" />
            <path d="M 90 -10 C 100 60, 70 120, 120 210" stroke="var(--color-line-strong)" strokeWidth="6" fill="none" />
          </svg>
          <div className="relative flex h-full min-h-56 flex-col items-center justify-center p-5 text-center">
            <span className="relative flex size-12 items-center justify-center">
              <span className="absolute size-12 animate-ping rounded-full bg-accent/25" />
              <MapPin className="relative size-8 fill-accent text-accent-ink" />
            </span>
            <p className="mt-3 text-sm font-medium">{a.city || "Your city"}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {preview.length ? preview.join(", ") : "Start typing to see your address"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
