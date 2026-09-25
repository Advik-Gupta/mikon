import type { LucideIcon } from "lucide-react";

export function ComingSoon({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="board-grid flex min-h-full items-center justify-center p-8">
      <div className="max-w-sm text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-line bg-surface text-accent">
          <Icon className="size-6" />
        </span>
        <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
        <span className="mt-5 inline-block rounded-full border border-line px-3 py-1 text-xs text-faint">Coming soon</span>
      </div>
    </div>
  );
}
