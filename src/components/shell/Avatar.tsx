"use client";

import { useProfile, useSessionUser } from "@/lib/storage";
import { cn } from "../ui";

const fromName = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "M";

export function UserAvatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-[#5ed1a0] font-display font-semibold text-accent-ink",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 size-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        fromName(name)
      )}
    </span>
  );
}

export function Avatar({ size = 36, className }: { size?: number; className?: string }) {
  const user = useSessionUser();
  const profile = useProfile();
  return (
    <UserAvatar
      name={profile ? `${profile.personal.firstName} ${profile.personal.lastName}` : (user?.name ?? "")}
      src={user?.avatarUrl}
      size={size}
      className={className}
    />
  );
}
