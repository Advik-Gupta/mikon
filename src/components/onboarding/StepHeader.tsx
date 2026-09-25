import type { LucideIcon } from "lucide-react";

export function StepHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-8">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent/12 text-accent">
          <Icon className="size-4" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{eyebrow}</span>
      </div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-[2.1rem]">{title}</h1>
      {subtitle && <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">{subtitle}</p>}
    </header>
  );
}
