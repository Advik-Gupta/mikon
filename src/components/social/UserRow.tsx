"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { UserCard } from "@/lib/api";
import { UserAvatar } from "../shell/Avatar";

export function UserRow({ user, sub, right }: { user: UserCard; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition hover:border-line-strong">
      <Link href={`/u/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar name={user.name} src={user.avatarUrl} size={44} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{user.name}</span>
          <span className="block truncate text-xs text-muted">@{user.username}</span>
          {sub && <span className="mt-0.5 block truncate text-[11px] text-faint">{sub}</span>}
        </span>
      </Link>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
