import { initials } from "@/lib/body";
import type { Profile } from "@/lib/types";
import { cn } from "../ui";

export function Avatar({ profile, size = 36, className }: { profile: Profile; size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-[#5ed1a0] font-display font-semibold text-accent-ink",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(profile)}
    </span>
  );
}
