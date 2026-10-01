"use client";

import { Activity, Bell, Dumbbell, Flame, HeartHandshake, Layers, MessageSquareWarning, RefreshCw, Ruler, Share2, UserPlus, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApi } from "@/lib/api";
import { useExerciseMap } from "@/lib/analysis";
import { CHART, Kpi, PALETTE, Panel, tooltipStyle } from "./bits";

export interface OverviewData {
  kpis: Record<string, number | null>;
  daily: { day: string; signups: number; active: number; workouts: number }[];
  requests: { day: string; requests: number; errors: number; ms: number }[];
  sources: { name: string; value: number }[];
  devices: { name: string; value: number }[];
  topExercises: { id: string; n: number }[];
  routes: { path: string; n: number; ms: number; errors: number }[];
  generatedAt: string;
}

const axis = { stroke: CHART.text, fontSize: 11, tickLine: false, axisLine: false };

export function useOverview() {
  return useApi<OverviewData>("/api/admin/overview", 60_000);
}

export function KpiGrid({ k }: { k: OverviewData["kpis"] }) {
  const n = (v: number | null | undefined) => (v == null ? "-" : v.toLocaleString());
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
      <Kpi icon={Users} label="Users" value={n(k.users)} sub={`${n(k.newUsers7)} new this week`} />
      <Kpi icon={Activity} label="Active today" value={n(k.dau)} sub={`${n(k.wau)} this week · ${n(k.mau)} this month`} tone="blue" />
      <Kpi icon={Flame} label="Week 1 retention" value={k.retention7 == null ? "-" : `${k.retention7}%`} sub="Users older than 7 days active this week" tone="orange" />
      <Kpi icon={Dumbbell} label="Workouts logged" value={n(k.logs)} sub={`${n(k.sets)} sets`} tone="violet" />
      <Kpi icon={Layers} label="Programs" value={n(k.programs)} sub={`${n(k.activePrograms)} running`} tone="teal" />
      <Kpi icon={Ruler} label="Measurements" value={n(k.measurements)} tone="pink" />
      <Kpi icon={HeartHandshake} label="Friendships" value={n(k.friendships)} tone="blue" />
      <Kpi icon={Share2} label="Programs shared" value={n(k.shares)} tone="teal" />
      <Kpi icon={Bell} label="Push devices" value={n(k.pushSubs)} tone="violet" />
      <Kpi icon={MessageSquareWarning} label="New feedback" value={n(k.feedbackNew)} tone="orange" />
      <Kpi icon={UserPlus} label="Admins" value={n(k.admins)} tone="pink" />
    </div>
  );
}

export function Overview() {
  const { data, loading, reload } = useOverview();
  const exercises = useExerciseMap();
  if (loading || !data) return <div className="h-96 animate-pulse rounded-2xl bg-surface" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Updated {new Date(data.generatedAt).toLocaleTimeString()} · cached for a minute to keep the database light</span>
        <button type="button" onClick={() => reload()} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 hover:text-ink">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>
      <KpiGrid k={data.kpis} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Daily active users" sub="Last 30 days">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data.daily}>
              <defs>
                <linearGradient id="g-active" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.blue} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={CHART.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="day" {...axis} interval={4} />
              <YAxis {...axis} allowDecimals={false} width={30} />
              <Tooltip {...tooltipStyle} />
              <Area type="monotone" dataKey="active" name="Active users" stroke={CHART.blue} fill="url(#g-active)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Signups and workouts" sub="Last 30 days">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.daily}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="day" {...axis} interval={4} />
              <YAxis {...axis} allowDecimals={false} width={30} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="workouts" name="Workouts" fill={CHART.violet} radius={[4, 4, 0, 0]} />
              <Bar dataKey="signups" name="Signups" fill={CHART.lime} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="API traffic" sub="Requests, server errors and average response time, last 14 days">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.requests}>
              <CartesianGrid stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="day" {...axis} />
              <YAxis yAxisId="l" {...axis} width={40} />
              <YAxis yAxisId="r" orientation="right" {...axis} width={40} unit="ms" />
              <Tooltip {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="l" dataKey="requests" name="Requests" stroke={CHART.lime} strokeWidth={2} dot={false} />
              <Line yAxisId="l" dataKey="errors" name="5xx errors" stroke={CHART.pink} strokeWidth={2} dot={false} />
              <Line yAxisId="r" dataKey="ms" name="Avg ms" stroke={CHART.orange} strokeWidth={2} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { title: "Where workouts come from", rows: data.sources },
            { title: "Devices", rows: data.devices },
          ].map((p) => (
            <Panel key={p.title} title={p.title}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={p.rows} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} stroke="none">
                    {p.rows.map((_, i) => (
                      <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Most logged exercises">
          <ResponsiveContainer width="100%" height={Math.max(160, data.topExercises.length * 30)}>
            <BarChart data={data.topExercises.map((e) => ({ name: exercises.get(e.id)?.name ?? e.id, n: e.n }))} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" {...axis} allowDecimals={false} />
              <YAxis type="category" dataKey="name" {...axis} width={170} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="n" name="Workouts" fill={CHART.teal} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Busiest API routes" sub="Last 14 days">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-faint">
                <tr>
                  <th className="py-1.5 font-medium">Route</th>
                  <th className="py-1.5 text-right font-medium">Calls</th>
                  <th className="py-1.5 text-right font-medium">Avg ms</th>
                  <th className="py-1.5 text-right font-medium">4xx/5xx</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.routes.map((r) => (
                  <tr key={r.path}>
                    <td className="py-1.5 font-mono">{r.path}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.n.toLocaleString()}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.ms}</td>
                    <td className={`py-1.5 text-right tabular-nums ${r.errors ? "text-danger" : "text-muted"}`}>{r.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
