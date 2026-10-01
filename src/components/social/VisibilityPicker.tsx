"use client";

import { Globe, Lock, Users } from "lucide-react";
import type { Visibility } from "@/lib/types";
import { cn } from "../ui";

export const VISIBILITY: { id: Visibility; label: string; icon: typeof Globe; hint: string }[] = [
  { id: "public", label: "Everyone", icon: Globe, hint: "Anyone on Mikon" },
  { id: "friends", label: "Friends", icon: Users, hint: "Only your friends" },
  { id: "private", label: "Only me", icon: Lock, hint: "Nobody else" },
];

export const visibilityOf = (v: Visibility | undefined) => VISIBILITY.find((x) => x.id === (v ?? "private"))!;

export function VisibilityPicker({ value, onChange, size = "md" }: { value: Visibility; onChange: (v: Visibility) => void; size?: "sm" | "md" }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1" role="radiogroup">
      {VISIBILITY.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          title={o.hint}
          className={cn(
            "flex items-center gap-1.5 rounded-lg font-medium transition",
            size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
            value === o.id ? "bg-ink text-bg shadow" : "text-muted hover:text-ink",
          )}
        >
          <o.icon className="size-3.5" />
          {o.label}
        </button>
      ))}
    </div>
  );
}
