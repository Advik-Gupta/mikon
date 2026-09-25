"use client";

import { Check, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex h-10 shrink-0 items-center whitespace-nowrap justify-center gap-2 rounded-xl px-4 text-sm font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        variant === "primary" && "bg-accent text-accent-ink hover:bg-[#d4ff4a]",
        variant === "secondary" && "border border-line bg-surface-2 text-ink hover:border-line-strong hover:bg-surface-3",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-ink",
        variant === "danger" && "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  optional,
  children,
  className,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink/90">
        {label}
        {optional && <span className="text-xs font-normal text-faint">Optional</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input({
  className,
  icon: Icon,
  suffix,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon; suffix?: string }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
      )}
      <input
        className={cn(
          "h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-[15px] text-ink outline-none transition placeholder:text-faint hover:border-line-strong focus:border-accent/60 focus:ring-4 focus:ring-accent/10",
          Icon && "pl-10",
          suffix && "pr-12",
          className,
        )}
        {...rest}
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-faint">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function NumberInput({
  value,
  onChange,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | null;
  onChange: (v: number | null) => void;
  icon?: LucideIcon;
  suffix?: string;
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : Number(v));
      }}
      {...rest}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "min-h-24 w-full resize-y rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[15px] text-ink outline-none transition placeholder:text-faint hover:border-line-strong focus:border-accent/60 focus:ring-4 focus:ring-accent/10",
        props.className,
      )}
    />
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-lg font-medium transition",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
            value === o.id ? "bg-ink text-bg shadow" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition",
        selected
          ? "border-accent bg-accent/12 text-accent"
          : "border-line bg-surface-2 text-ink/80 hover:border-line-strong hover:text-ink",
      )}
    >
      {selected && <Check className="size-3.5" strokeWidth={3} />}
      {children}
    </button>
  );
}

export function OptionCard({
  selected,
  onClick,
  icon: Icon,
  label,
  description,
  multi,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  label: string;
  description?: string;
  multi?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full flex-col items-start gap-2 rounded-2xl border p-4 text-left transition",
        selected
          ? "border-accent/70 bg-accent/[0.07] shadow-[0_0_0_4px_rgb(198_244_50/0.08)]"
          : "border-line bg-surface hover:border-line-strong hover:bg-surface-2",
        className,
      )}
    >
      <span
        className={cn(
          "absolute right-3 top-3 flex size-5 items-center justify-center border transition",
          multi ? "rounded-md" : "rounded-full",
          selected ? "border-accent bg-accent text-accent-ink" : "border-line-strong text-transparent",
        )}
      >
        <Check className="size-3" strokeWidth={3.5} />
      </span>
      {children}
      {Icon && (
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl transition",
            selected ? "bg-accent text-accent-ink" : "bg-surface-3 text-ink/80 group-hover:text-ink",
          )}
        >
          <Icon className="size-5" />
        </span>
      )}
      <span className="pr-6">
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{description}</span>}
      </span>
    </button>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-faint", className)}>{children}</h3>;
}

export function toggle<T>(list: T[], item: T) {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}
