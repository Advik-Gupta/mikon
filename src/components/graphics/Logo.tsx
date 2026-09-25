export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--color-accent)" />
      <path
        d="M8 22V11.5l5 6 3-3.6 3 3.6 5-6V22"
        fill="none"
        stroke="var(--color-accent-ink)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="font-display text-lg font-semibold tracking-tight">mikon</span>
    </span>
  );
}
