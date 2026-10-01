"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, UserPlus, Users } from "lucide-react";
import { useApi, type Relation, type UserCard } from "@/lib/api";
import { FriendButton } from "@/components/social/FriendButton";
import { UserRow } from "@/components/social/UserRow";
import { cn } from "@/components/ui";

type Friend = UserCard & { since: string };
interface FriendsData {
  friends: Friend[];
  incoming: Friend[];
  outgoing: Friend[];
}

const TABS = [
  { id: "friends", label: "Friends" },
  { id: "requests", label: "Requests" },
  { id: "find", label: "Find people" },
] as const;

function Empty({ icon: Icon, title, body }: { icon: typeof Users; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <Icon className="size-5" />
      </span>
      <p className="mt-4 font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted">{body}</p>
    </div>
  );
}

function FindPeople() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const { data, loading } = useApi<{ results: (UserCard & { relation: Relation })[] }>(term.length >= 2 ? `/api/users/search?q=${encodeURIComponent(term)}` : null, 5000);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          placeholder="Search by name, username or exact email"
          className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-4 text-[15px] outline-none transition placeholder:text-faint focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
        />
        {loading && term.length >= 2 && <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted" />}
      </div>
      <div className="mt-4 space-y-2">
        {term.length < 2 ? (
          <p className="px-1 text-sm text-faint">Type at least two characters. Emails only match exactly, so people can&apos;t be found by guessing.</p>
        ) : data?.results.length === 0 ? (
          <p className="px-1 text-sm text-muted">Nobody matches &ldquo;{term}&rdquo;.</p>
        ) : (
          data?.results.map((u) => <UserRow key={u.id} user={u} right={<FriendButton userId={u.id} name={u.name} relation={u.relation} compact />} />)
        )}
      </div>
    </div>
  );
}

function Friends() {
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get("tab") as (typeof TABS)[number]["id"]) ?? "friends";
  const { data, loading } = useApi<FriendsData>("/api/friends", 5000);
  const requests = data?.incoming.length ?? 0;

  return (
    <div className="board-grid min-h-full">
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-8 sm:pt-8">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Friends</h2>
            <p className="mt-1 text-sm text-muted">Train alongside friends, see their programs and compare progress.</p>
          </div>
        </div>
        <div data-tour="friends-tabs" className="mb-5 flex gap-1 rounded-2xl border border-line bg-surface p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => router.replace(`/friends?tab=${t.id}`)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-sm font-medium transition",
                tab === t.id ? "bg-ink text-bg" : "text-muted hover:text-ink",
              )}
            >
              {t.label}
              {t.id === "requests" && requests > 0 && (
                <span className={cn("rounded-full px-1.5 text-[11px] font-bold", tab === t.id ? "bg-accent text-accent-ink" : "bg-accent/20 text-accent")}>{requests}</span>
              )}
            </button>
          ))}
        </div>

        {tab === "find" ? (
          <FindPeople />
        ) : loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[70px] animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : tab === "requests" ? (
          <div className="space-y-6">
            <section>
              <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Waiting for you</h3>
              {data?.incoming.length ? (
                <div className="space-y-2">
                  {data.incoming.map((u) => (
                    <UserRow key={u.id} user={u} sub={`Sent ${new Date(u.since).toLocaleDateString()}`} right={<FriendButton userId={u.id} name={u.name} relation="incoming" compact />} />
                  ))}
                </div>
              ) : (
                <p className="px-1 text-sm text-muted">No new requests.</p>
              )}
            </section>
            {!!data?.outgoing.length && (
              <section>
                <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-faint">Sent</h3>
                <div className="space-y-2">
                  {data.outgoing.map((u) => (
                    <UserRow key={u.id} user={u} right={<FriendButton userId={u.id} name={u.name} relation="outgoing" compact />} />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : data?.friends.length ? (
          <div className="space-y-2">
            {data.friends.map((u) => (
              <UserRow key={u.id} user={u} sub={`Friends since ${new Date(u.since).toLocaleDateString(undefined, { month: "short", year: "numeric" })}`} />
            ))}
          </div>
        ) : (
          <div>
            <Empty icon={Users} title="No friends yet" body="Find people by their username and send a request. Once they accept you can see each other's training." />
            <button
              type="button"
              onClick={() => router.replace("/friends?tab=find")}
              className="mx-auto mt-4 flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink"
            >
              <UserPlus className="size-4" /> Find people
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FriendsPage() {
  return (
    <Suspense>
      <Friends />
    </Suspense>
  );
}
