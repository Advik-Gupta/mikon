"use client";

import Link from "next/link";
import { useState } from "react";
import { Lock, Search, UserPlus } from "lucide-react";
import { useApi, type UserCard } from "@/lib/api";
import { UserAvatar } from "../shell/Avatar";
import { Sheet } from "../tracker/Sheet";

type Friend = UserCard & { mutual?: boolean; self?: boolean };

export function FriendsSheet({ username, name, own, open, onClose }: { username: string; name: string; own?: boolean; open: boolean; onClose: () => void }) {
  const mine = useApi<{ friends: Friend[] }>(open && own ? "/api/friends" : null, 30_000);
  const theirs = useApi<{ locked: boolean; friends: Friend[] }>(open && !own ? `/api/users/${username}/friends` : null, 30_000);
  const [q, setQ] = useState("");
  const data = own ? mine.data : theirs.data;
  const loading = !data;
  const locked = !own && theirs.data?.locked;
  const needle = q.trim().toLowerCase();
  const list = (data?.friends ?? []).filter((f) => !needle || f.name.toLowerCase().includes(needle) || f.username.includes(needle));

  return (
    <Sheet open={open} onClose={onClose} title={own ? "Your friends" : `${name.split(" ")[0]}'s friends`}>
      <div className="px-4 pb-6">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-surface-2" />
            ))}
          </div>
        ) : locked ? (
          <p className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted">
            <Lock className="size-5" /> This profile is private.
          </p>
        ) : (data?.friends.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="text-sm text-muted">{own ? "You haven't added anyone yet." : "No friends to show yet."}</p>
            {own && (
              <Link href="/friends?tab=find" onClick={onClose} className="mt-4 flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink">
                <UserPlus className="size-4" /> Find people
              </Link>
            )}
          </div>
        ) : (
          <>
            {(data?.friends.length ?? 0) > 6 && (
              <label className="mb-3 flex h-11 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
                <Search className="size-4 text-faint" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-faint" />
              </label>
            )}
            <ul className="space-y-1.5">
              {list.map((f) => (
                <li key={f.id}>
                  <Link href={`/u/${f.username}`} onClick={onClose} className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2/40 p-2.5 transition active:scale-[0.99] hover:border-line-strong">
                    <UserAvatar name={f.name} src={f.avatarUrl} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{f.self ? "You" : f.name}</span>
                      <span className="block truncate text-xs text-muted">@{f.username}</span>
                    </span>
                    {f.mutual && <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">Mutual</span>}
                  </Link>
                </li>
              ))}
              {list.length === 0 && <li className="py-6 text-center text-sm text-muted">No one matches &ldquo;{q}&rdquo;.</li>}
            </ul>
            {own && (
              <Link href="/friends" onClick={onClose} className="mt-4 flex h-11 items-center justify-center rounded-full border border-line text-sm font-medium text-muted hover:text-ink">
                Manage friends and requests
              </Link>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}
