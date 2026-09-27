"use client";

import { Ruler, Scale, Timer } from "lucide-react";
import { cmToIn, inToCm, kgToLb, lbToKg, round1 } from "@/lib/body";
import type { Units } from "@/lib/types";
import { cn, NumberInput } from "./ui";

export function HeightInput({ cm, units, onChange }: { cm: number | null; units: Units; onChange: (cm: number | null) => void }) {
  if (units === "metric") {
    return <NumberInput icon={Ruler} suffix="cm" value={cm} onChange={onChange} placeholder="178" min={100} max={250} />;
  }
  const total = cm != null ? Math.round(cmToIn(cm)) : null;
  const ft = total != null ? Math.floor(total / 12) : null;
  const inch = total != null ? total % 12 : null;
  const commit = (f: number | null, i: number | null) =>
    onChange(f == null && i == null ? null : round1(inToCm((f ?? 0) * 12 + (i ?? 0))));
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumberInput icon={Ruler} suffix="ft" value={ft} onChange={(f) => commit(f, inch)} placeholder="5" />
      <NumberInput suffix="in" value={inch} onChange={(i) => commit(ft, i)} placeholder="10" />
    </div>
  );
}

export function LengthInput({ cm, units, onChange, placeholder }: { cm: number | null; units: Units; onChange: (cm: number | null) => void; placeholder?: string }) {
  return units === "metric" ? (
    <NumberInput suffix="cm" value={cm} onChange={onChange} placeholder={placeholder} />
  ) : (
    <NumberInput
      suffix="in"
      value={cm != null ? round1(cmToIn(cm)) : null}
      onChange={(v) => onChange(v == null ? null : inToCm(v))}
    />
  );
}

export function WeightInput({ kg, units, onChange, disabled }: { kg: number | null; units: Units; onChange: (kg: number | null) => void; disabled?: boolean }) {
  return units === "metric" ? (
    <NumberInput icon={Scale} suffix="kg" value={kg} onChange={onChange} placeholder="75" disabled={disabled} />
  ) : (
    <NumberInput
      icon={Scale}
      suffix="lb"
      value={kg != null ? round1(kgToLb(kg)) : null}
      onChange={(v) => onChange(v == null ? null : lbToKg(v))}
      placeholder="165"
      disabled={disabled}
    />
  );
}

export function DurationInput({
  seconds,
  onChange,
  disabled,
  showHours = true,
}: {
  seconds: number | null;
  onChange: (s: number | null) => void;
  disabled?: boolean;
  showHours?: boolean;
}) {
  const h = seconds != null ? Math.floor(seconds / 3600) : null;
  const m = seconds != null ? Math.floor((seconds % 3600) / 60) : null;
  const s = seconds != null ? seconds % 60 : null;
  const commit = (nh: number | null, nm: number | null, ns: number | null) =>
    onChange(nh == null && nm == null && ns == null ? null : (nh ?? 0) * 3600 + Math.min(59, nm ?? 0) * 60 + Math.min(59, ns ?? 0));
  const box = "h-10 px-2 text-center text-sm";
  return (
    <div className={cn("flex items-center gap-1", disabled && "pointer-events-none opacity-40")}>
      <Timer className="mr-1 size-4 shrink-0 text-faint" />
      {showHours && (
        <>
          <NumberInput className={box} aria-label="Hours" placeholder="h" value={h} onChange={(v) => commit(v, m, s)} disabled={disabled} />
          <span className="text-faint">:</span>
        </>
      )}
      <NumberInput className={box} aria-label="Minutes" placeholder="mm" value={m} onChange={(v) => commit(h, v, s)} disabled={disabled} />
      <span className="text-faint">:</span>
      <NumberInput className={box} aria-label="Seconds" placeholder="ss" value={s} onChange={(v) => commit(h, m, v)} disabled={disabled} />
    </div>
  );
}
