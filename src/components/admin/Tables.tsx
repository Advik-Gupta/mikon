"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Check, Database, HardDrive, Loader2, Megaphone, RefreshCw, Search, Shield, Trash2 } from "lucide-react";
import { apiSend, revalidate, useApi } from "@/lib/api";
import { useSessionUser } from "@/lib/storage";
import { UserAvatar } from "../shell/Avatar";
import { toast } from "../Toaster";
import { Button, cn } from "../ui";
import { ago, bytes, CHART, Kpi, Panel, tooltipStyle } from "./bits";
import { DataTable } from "./DataTable";

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 w-full rounded-xl border border-line bg-surface-2 pl-9 pr-3 text-sm outline-none focus:border-accent/60" />
    </div>
  );
}

const select = "h-9 rounded-xl border border-line bg-surface-2 px-2.5 text-sm outline-none";
const qs = (o: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== "") as [string, string][]).toString();

interface UserRowData {
  id: string;
  name: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  createdAt: string;
  lastActiveAt: string | null;
  workouts: number;
  programs: number;
  measurements: number;
}

export function UsersPanel() {
  const me = useSessionUser();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const dq = useDebounced(q);
  const url = `/api/admin/users?${qs({ q: dq, role, page, pageSize, sort: sorting[0]?.id, dir: sorting[0]?.desc ? "desc" : "asc" })}`;
  const { data, loading } = useApi<{ total: number; rows: UserRowData[] }>(url, 5000);

  const setRoleFor = async (u: UserRowData, next: "user" | "admin") => {
    if (!window.confirm(`Make ${u.name} ${next === "admin" ? "an admin" : "a regular user"}?`)) return;
    try {
      await apiSend("PATCH", `/api/admin/users/${u.id}`, { role: next });
      toast({ tone: "success", title: `${u.name} is now ${next === "admin" ? "an admin" : "a user"}` });
      revalidate("/api/admin/users");
    } catch (e) {
      toast({ tone: "warn", title: "Couldn't change role", message: (e as Error).message });
    }
  };
  const remove = async (u: UserRowData) => {
    if (window.prompt(`This permanently deletes ${u.name} and all their data. Type their username (${u.username}) to confirm.`) !== u.username) return;
    try {
      await apiSend("DELETE", `/api/admin/users/${u.id}`);
      toast({ tone: "success", title: "User deleted" });
      revalidate("/api/admin/users");
    } catch (e) {
      toast({ tone: "warn", title: "Couldn't delete", message: (e as Error).message });
    }
  };

  const columns = useMemo<ColumnDef<UserRowData, unknown>[]>(
    () => [
      {
        id: "name",
        header: "User",
        cell: ({ row: { original: u } }) => (
          <Link href={`/u/${u.username}`} className="flex items-center gap-2.5 hover:underline">
            <UserAvatar name={u.name} src={u.avatarUrl} size={30} />
            <span>
              <span className="block font-medium">{u.name}</span>
              <span className="block text-[11px] text-muted">@{u.username}</span>
            </span>
          </Link>
        ),
      },
      { id: "email", header: "Email", cell: ({ row }) => <span className="text-muted">{row.original.email}</span> },
      {
        id: "role",
        header: "Role",
        cell: ({ row }) => (
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", row.original.role === "admin" ? "bg-accent/15 text-accent" : "bg-surface-3 text-muted")}>{row.original.role}</span>
        ),
      },
      { id: "workouts", header: "Workouts", enableSorting: false, cell: ({ row }) => <span className="tabular-nums">{row.original.workouts}</span> },
      { id: "programs", header: "Programs", enableSorting: false, cell: ({ row }) => <span className="tabular-nums">{row.original.programs}</span> },
      { id: "createdAt", header: "Joined", cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString() },
      { id: "lastActiveAt", header: "Last active", cell: ({ row }) => <span className="text-muted">{ago(row.original.lastActiveAt)}</span> },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row: { original: u } }) => (
          <div className="flex justify-end gap-1">
            <button
              type="button"
              onClick={() => setRoleFor(u, u.role === "admin" ? "user" : "admin")}
              className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs hover:border-accent/50"
              title={u.role === "admin" ? "Remove admin" : "Make admin"}
            >
              <Shield className="size-3.5" /> {u.role === "admin" ? "Revoke" : "Make admin"}
            </button>
            {u.id !== me?.id && (
              <button type="button" onClick={() => remove(u)} className="rounded-lg p-1.5 text-faint hover:bg-danger/10 hover:text-danger" aria-label="Delete user">
                <Trash2 className="size-3.5" />
              </button>
            )}
          </div>
        ),
      },
    ],
    [me?.id],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={(v) => (setQ(v), setPage(0))} placeholder="Search name, email or username" />
        <select value={role} onChange={(e) => (setRole(e.target.value), setPage(0))} className={select}>
          <option value="">All roles</option>
          <option value="admin">Admins</option>
          <option value="user">Users</option>
        </select>
      </div>
      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(n) => (setPageSize(n), setPage(0))}
        sorting={sorting}
        onSorting={(s) => (setSorting(s), setPage(0))}
        loading={loading}
      />
    </div>
  );
}

interface LogRow {
  id: string;
  ts: string;
  method: string;
  rawPath: string;
  path: string;
  status: number;
  ms: number;
  userId: string | null;
  device: string;
  error?: string;
}

export function LogsPanel() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const dq = useDebounced(q);
  const { data, loading, reload } = useApi<{ total: number; rows: LogRow[] }>(`/api/admin/logs?${qs({ q: dq, status, method, page, pageSize })}`, 5000);
  const columns = useMemo<ColumnDef<LogRow, unknown>[]>(
    () => [
      { id: "ts", header: "Time", cell: ({ row }) => <span className="tabular-nums text-muted">{new Date(row.original.ts).toLocaleString()}</span> },
      { id: "method", header: "Method", cell: ({ row }) => <span className="font-mono text-xs">{row.original.method}</span> },
      {
        id: "path",
        header: "Path",
        cell: ({ row }) => (
          <span className="font-mono text-xs" title={row.original.error ?? ""}>
            {row.original.rawPath}
            {row.original.error && <span className="ml-2 text-danger">{row.original.error.slice(0, 60)}</span>}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original.status;
          return <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-xs", s >= 500 ? "bg-danger/15 text-danger" : s >= 400 ? "bg-warn/15 text-warn" : "bg-accent/10 text-accent")}>{s}</span>;
        },
      },
      { id: "ms", header: "ms", cell: ({ row }) => <span className={cn("tabular-nums", row.original.ms > 1000 && "text-warn")}>{row.original.ms}</span> },
      { id: "device", header: "Device", cell: ({ row }) => <span className="text-muted">{row.original.device}</span> },
      { id: "user", header: "User", cell: ({ row }) => <span className="font-mono text-[11px] text-faint">{row.original.userId?.slice(-6) ?? "-"}</span> },
    ],
    [],
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBox value={q} onChange={(v) => (setQ(v), setPage(0))} placeholder="Filter by path" />
        <select value={status} onChange={(e) => (setStatus(e.target.value), setPage(0))} className={select}>
          <option value="">Any status</option>
          <option value="ok">Success</option>
          <option value="client">4xx</option>
          <option value="error">5xx</option>
        </select>
        <select value={method} onChange={(e) => (setMethod(e.target.value), setPage(0))} className={select}>
          <option value="">Any method</option>
          {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <button type="button" onClick={() => reload()} className="flex h-9 items-center gap-1.5 rounded-xl border border-line px-3 text-sm text-muted hover:text-ink">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
        <span className="text-xs text-faint">Kept for 14 days. Frequent background polls are skipped to save database writes.</span>
      </div>
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={pageSize} onPage={setPage} onPageSize={(n) => (setPageSize(n), setPage(0))} loading={loading} />
    </div>
  );
}

interface FeedbackRow {
  id: string;
  type: "bug" | "idea";
  message: string;
  page?: string;
  status: string;
  createdAt: string;
  user: { name: string; username: string } | null;
}

export function FeedbackPanel() {
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const url = `/api/admin/feedback?${qs({ type, status, page, pageSize: 25 })}`;
  const { data, loading } = useApi<{ total: number; rows: FeedbackRow[] }>(url, 5000);
  const setTo = async (id: string, s: string) => {
    await apiSend("PATCH", `/api/admin/feedback/${id}`, { status: s }).catch(() => null);
    revalidate("/api/admin/feedback");
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select value={type} onChange={(e) => (setType(e.target.value), setPage(0))} className={select}>
          <option value="">Bugs and ideas</option>
          <option value="bug">Bugs</option>
          <option value="idea">Ideas</option>
        </select>
        <select value={status} onChange={(e) => (setStatus(e.target.value), setPage(0))} className={select}>
          <option value="">Any status</option>
          {["new", "planned", "done", "dismissed"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      {loading && !data ? (
        <Loader2 className="size-5 animate-spin text-muted" />
      ) : (
        <div className="space-y-2">
          {data?.rows.map((f) => (
            <div key={f.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={cn("rounded-full px-2 py-0.5 font-semibold", f.type === "bug" ? "bg-danger/15 text-danger" : "bg-info/15 text-info")}>{f.type}</span>
                <span className="text-muted">{f.user ? `${f.user.name} (@${f.user.username})` : "Deleted user"}</span>
                <span className="text-faint">{new Date(f.createdAt).toLocaleString()}</span>
                {f.page && <span className="font-mono text-faint">{f.page}</span>}
                <select value={f.status} onChange={(e) => setTo(f.id, e.target.value)} className="ml-auto h-8 rounded-lg border border-line bg-surface-2 px-2">
                  {["new", "planned", "done", "dismissed"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{f.message}</p>
            </div>
          ))}
          {!data?.rows.length && <p className="py-10 text-center text-sm text-muted">No feedback yet.</p>}
          {(data?.total ?? 0) > 25 && (
            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <Button variant="secondary" disabled={(page + 1) * 25 >= (data?.total ?? 0)} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  tone: string;
  link: string | null;
  active: boolean;
  until: string | null;
  createdAt: string;
}

export function AnnouncementsPanel() {
  const { data } = useApi<{ total: number; rows: AnnouncementRow[] }>("/api/admin/announcements?pageSize=50", 5000);
  const [form, setForm] = useState({ title: "", body: "", tone: "info", link: "", push: true });
  const [busy, setBusy] = useState(false);
  const post = async () => {
    setBusy(true);
    try {
      const r = await apiSend<{ pushed: number }>("POST", "/api/admin/announcements", { ...form, link: form.link.trim() || null });
      toast({ tone: "success", title: "Announcement live", message: form.push ? `Push sent to ${r.pushed} users` : undefined });
      setForm({ title: "", body: "", tone: "info", link: "", push: true });
      revalidate("/api/admin/announcements");
      revalidate("/api/announcements");
    } catch (e) {
      toast({ tone: "warn", title: "Couldn't post", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const act = async (id: string, method: "PATCH" | "DELETE", body?: unknown) => {
    await apiSend(method, `/api/admin/announcements/${id}`, body).catch(() => null);
    revalidate("/api/admin/announcements");
    revalidate("/api/announcements");
  };
  const input = "w-full rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent/60";
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <Panel title="New announcement" sub="Shows as a banner at the top of the app for everyone.">
        <div className="space-y-2.5">
          <input className={input} placeholder="Title" value={form.title} maxLength={120} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className={cn(input, "min-h-24")} placeholder="Message (optional)" value={form.body} maxLength={1000} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <input className={input} placeholder="Link, like /history (optional)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
          <div className="flex flex-wrap items-center gap-2">
            {["info", "success", "warn"].map((t) => (
              <button key={t} type="button" onClick={() => setForm({ ...form, tone: t })} className={cn("rounded-full border px-3 py-1 text-xs capitalize", form.tone === t ? "border-ink bg-ink text-bg" : "border-line text-muted")}>
                {t}
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={form.push} onChange={(e) => setForm({ ...form, push: e.target.checked })} className="accent-[#c6f432]" /> Send a push notification to everyone with notifications on
            </label>
          </div>
          <Button onClick={post} disabled={busy || !form.title.trim()} className="w-full">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Megaphone className="size-4" />} Publish
          </Button>
        </div>
      </Panel>
      <div className="space-y-2">
        {data?.rows.map((a) => (
          <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
            <span className={cn("mt-1 size-2 shrink-0 rounded-full", a.active ? "bg-accent" : "bg-surface-3")} />
            <div className="min-w-0 flex-1">
              <p className="font-medium">{a.title}</p>
              {a.body && <p className="text-sm text-muted">{a.body}</p>}
              <p className="mt-1 text-[11px] text-faint">
                {new Date(a.createdAt).toLocaleString()} · {a.tone}
                {a.link ? ` · ${a.link}` : ""}
              </p>
            </div>
            <Button variant="secondary" className="h-8 px-3 text-xs" onClick={() => act(a.id, "PATCH", { active: !a.active })}>
              {a.active ? "Hide" : "Show"}
            </Button>
            <button type="button" onClick={() => window.confirm("Delete this announcement?") && act(a.id, "DELETE")} className="rounded-lg p-1.5 text-faint hover:text-danger" aria-label="Delete">
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {!data?.rows.length && <p className="py-10 text-center text-sm text-muted">No announcements yet.</p>}
      </div>
    </div>
  );
}

interface StorageData {
  uploadthing: { usedBytes: number; limitBytes: number; files: number; orphanFiles: number; orphanBytes: number } | null;
  mongo: { dataBytes: number; storageBytes: number; indexBytes: number; limitBytes: number; objects: number } | null;
  users: { id: string; name: string; username: string; email: string; mongoBytes: number; docs: number; avatarBytes: number; byCollection: Record<string, number> }[];
  generatedAt: string;
}

function Meter({ used, limit, color }: { used: number; limit: number; color: string }) {
  const pct = Math.min(100, (used / Math.max(1, limit)) * 100);
  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct > 85 ? CHART.pink : color }} />
      </div>
      <p className="mt-1.5 text-xs text-muted">
        {bytes(used)} of {bytes(limit)} · {pct.toFixed(1)}%
      </p>
    </div>
  );
}

export function StoragePanel() {
  const [fresh, setFresh] = useState(0);
  const { data, loading } = useApi<StorageData>(`/api/admin/storage${fresh ? `?fresh=1&n=${fresh}` : ""}`, 10 * 60_000);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const rows = (data?.users ?? []).filter((u) => !q || `${u.name} ${u.email} ${u.username}`.toLowerCase().includes(q.toLowerCase()));
  const columns = useMemo<ColumnDef<StorageData["users"][number], unknown>[]>(
    () => [
      { id: "name", header: "User", cell: ({ row }) => <span className="font-medium">{row.original.name} <span className="text-muted">@{row.original.username}</span></span> },
      { id: "total", header: "Total", cell: ({ row }) => <span className="tabular-nums">{bytes(row.original.mongoBytes + row.original.avatarBytes)}</span> },
      { id: "mongo", header: "Database", cell: ({ row }) => <span className="tabular-nums text-muted">{bytes(row.original.mongoBytes)}</span> },
      { id: "avatar", header: "Photo", cell: ({ row }) => <span className="tabular-nums text-muted">{row.original.avatarBytes ? bytes(row.original.avatarBytes) : "-"}</span> },
      { id: "docs", header: "Documents", cell: ({ row }) => <span className="tabular-nums text-muted">{row.original.docs.toLocaleString()}</span> },
      {
        id: "logs",
        header: "Workouts data",
        cell: ({ row }) => <span className="tabular-nums text-muted">{bytes(row.original.byCollection.logs ?? 0)}</span>,
      },
    ],
    [],
  );
  if (loading && !data) return <div className="h-64 animate-pulse rounded-2xl bg-surface" />;
  const top = rows.slice(0, 10).map((u) => ({ name: u.username, mb: Math.round(((u.mongoBytes + u.avatarBytes) / 1024) * 10) / 10 }));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Calculated {data ? new Date(data.generatedAt).toLocaleTimeString() : ""} · cached for 10 minutes</span>
        <button type="button" onClick={() => setFresh(Date.now())} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 hover:text-ink">
          <RefreshCw className="size-3.5" /> Recalculate
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="UploadThing" sub="Profile photos">
          {data?.uploadthing ? (
            <>
              <Meter used={data.uploadthing.usedBytes} limit={data.uploadthing.limitBytes} color={CHART.violet} />
              <p className="mt-3 text-xs text-muted">
                {data.uploadthing.files} files
                {data.uploadthing.orphanFiles ? ` · ${data.uploadthing.orphanFiles} not linked to any user (${bytes(data.uploadthing.orphanBytes)})` : ""}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Couldn&apos;t reach UploadThing. Check UPLOADTHING_TOKEN.</p>
          )}
        </Panel>
        <Panel title="MongoDB" sub="Free tier limit is 512 MB">
          {data?.mongo ? (
            <>
              <Meter used={data.mongo.storageBytes + data.mongo.indexBytes} limit={data.mongo.limitBytes} color={CHART.lime} />
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Kpi icon={Database} label="Data" value={bytes(data.mongo.dataBytes)} />
                <Kpi icon={HardDrive} label="Indexes" value={bytes(data.mongo.indexBytes)} tone="blue" />
                <Kpi icon={Check} label="Documents" value={data.mongo.objects.toLocaleString()} tone="violet" />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Database stats unavailable.</p>
          )}
        </Panel>
      </div>
      {top.length > 0 && (
        <Panel title="Heaviest users" sub="KB of storage">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top}>
              <XAxis dataKey="name" stroke={CHART.text} fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke={CHART.text} fontSize={11} tickLine={false} axisLine={false} width={40} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="mb" name="KB" fill={CHART.lime} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      )}
      <SearchBox value={q} onChange={(v) => (setQ(v), setPage(0))} placeholder="Find a user" />
      <DataTable columns={columns} data={rows.slice(page * 25, page * 25 + 25)} total={rows.length} page={page} pageSize={25} onPage={setPage} />
    </div>
  );
}
