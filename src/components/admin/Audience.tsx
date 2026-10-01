"use client";

import Link from "next/link";
import { Gift, MonitorSmartphone, RefreshCw, Smartphone, UserCheck } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApi } from "@/lib/api";
import { UserAvatar } from "../shell/Avatar";
import { ago, CHART, Kpi, PALETTE, Panel, tooltipStyle } from "./bits";

type Row = { name: string; value: number };

interface AudienceData {
  reported: number;
  total: number;
  referred: number;
  breakdown: Record<"browser" | "os" | "device" | "standalone" | "screen" | "lang" | "tz" | "push", Row[]>;
  referrers: { user: { id: string; name: string; username: string; avatarUrl: string | null }; invited: number; friends: number; active: number; last: string }[];
  generatedAt: string;
}

export function useAudience() {
  return useApi<AudienceData>("/api/admin/audience", 5 * 60_000);
}

function Donut({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <Panel title={title}>
      {rows.length ? (
        <ResponsiveContainer width="100%" height={190}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={2} stroke="none">
              {rows.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip {...tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="py-16 text-center text-xs text-faint">No data yet</p>
      )}
      <ul className="mt-2 space-y-1 text-xs">
        {rows.map((r, i) => (
          <li key={r.name} className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="flex-1 truncate text-muted">{r.name}</span>
            <span className="tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function Bars({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <Panel title={title}>
      <ResponsiveContainer width="100%" height={Math.max(120, rows.length * 28)}>
        <BarChart data={rows} layout="vertical" margin={{ left: 4 }}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="name" stroke={CHART.text} fontSize={11} tickLine={false} axisLine={false} width={130} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" name="Users" fill={CHART.blue} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Panel>
  );
}

export function Referrers({ data }: { data: AudienceData }) {
  return (
    <Panel title="Top referrers" sub="People who brought others to Mikon with their invite link">
      {data.referrers.length === 0 ? (
        <p className="py-8 text-center text-xs text-faint">No one has joined from an invite yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-faint">
            <tr>
              <th className="py-1.5 font-medium">#</th>
              <th className="py-1.5 font-medium">User</th>
              <th className="py-1.5 text-right font-medium">Joined</th>
              <th className="hidden py-1.5 text-right font-medium sm:table-cell">Became friends</th>
              <th className="hidden py-1.5 text-right font-medium sm:table-cell">Active 30d</th>
              <th className="hidden py-1.5 text-right font-medium md:table-cell">Latest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.referrers.map((r, i) => (
              <tr key={r.user.id}>
                <td className="py-2 text-faint tabular-nums">{i + 1}</td>
                <td className="py-2">
                  <Link href={`/u/${r.user.username}`} className="flex items-center gap-2.5 hover:underline">
                    <UserAvatar name={r.user.name} src={r.user.avatarUrl} size={28} />
                    <span className="min-w-0 truncate">
                      {r.user.name} <span className="text-xs text-faint">@{r.user.username}</span>
                    </span>
                  </Link>
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">{r.invited}</td>
                <td className="hidden py-2 text-right tabular-nums text-muted sm:table-cell">{r.friends}</td>
                <td className="hidden py-2 text-right tabular-nums text-muted sm:table-cell">{r.active}</td>
                <td className="hidden py-2 text-right text-xs text-muted md:table-cell">{ago(r.last)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

export function Audience() {
  const { data, loading, reload } = useAudience();
  if (loading || !data) return <div className="h-96 animate-pulse rounded-2xl bg-surface" />;
  const b = data.breakdown;
  const installed = b.standalone.find((r) => r.name === "Installed app")?.value ?? 0;
  const phones = b.device.find((r) => r.name === "Phone")?.value ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Device info from {data.reported} of {data.total} users, sent once a day by the app · updated {new Date(data.generatedAt).toLocaleTimeString()}
        </span>
        <button type="button" onClick={() => reload()} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 hover:text-ink">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Gift} label="Joined from invites" value={data.referred} sub={data.total ? `${Math.round((data.referred / data.total) * 100)}% of all users` : undefined} />
        <Kpi icon={UserCheck} label="Referrers" value={data.referrers.length} tone="teal" />
        <Kpi icon={MonitorSmartphone} label="Installed as app" value={installed} sub={data.reported ? `${Math.round((installed / data.reported) * 100)}% of reporting users` : undefined} tone="violet" />
        <Kpi icon={Smartphone} label="On phones" value={phones} sub={data.reported ? `${Math.round((phones / data.reported) * 100)}% of reporting users` : undefined} tone="blue" />
      </div>
      <Referrers data={data} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Donut title="Device" rows={b.device} />
        <Donut title="Operating system" rows={b.os} />
        <Donut title="Browser" rows={b.browser} />
        <Donut title="Installed or browser" rows={b.standalone} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Bars title="Screen sizes" rows={b.screen} />
        <Bars title="Time zones" rows={b.tz} />
        <Bars title="Languages" rows={b.lang} />
        <Donut title="Notification permission" rows={b.push} />
      </div>
    </div>
  );
}
