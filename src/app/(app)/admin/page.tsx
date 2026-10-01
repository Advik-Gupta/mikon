"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, BarChart3, HardDrive, Megaphone, MessageSquareWarning, ShieldAlert, Users } from "lucide-react";
import { useSessionUser } from "@/lib/storage";
import { KpiGrid, Overview, useOverview } from "@/components/admin/Overview";
import { AnnouncementsPanel, FeedbackPanel, LogsPanel, StoragePanel, UsersPanel } from "@/components/admin/Tables";
import { cn } from "@/components/ui";

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "activity", label: "Activity log", icon: Activity },
  { id: "feedback", label: "Feedback", icon: MessageSquareWarning },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "storage", label: "Storage", icon: HardDrive },
] as const;

function MobileAdmin() {
  const { data } = useOverview();
  return (
    <div className="space-y-5 md:hidden">
      {data ? <KpiGrid k={data.kpis} /> : <div className="h-64 animate-pulse rounded-2xl bg-surface" />}
      <AnnouncementsPanel />
      <p className="text-center text-xs text-muted">Open the admin panel on a computer for users, logs, feedback and storage.</p>
    </div>
  );
}

export default function AdminPage() {
  const user = useSessionUser();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  const overview = useOverview();
  const fresh = overview.data?.kpis.feedbackNew ?? 0;

  if (user?.role !== "admin") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center p-8 text-center">
        <ShieldAlert className="size-8 text-faint" />
        <p className="mt-4 font-display text-xl font-semibold">Page not found</p>
        <Link href="/" className="mt-4 text-sm text-accent hover:underline">
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-6 sm:px-8">
      <div className="mb-5">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Admin</h2>
        <p className="text-sm text-muted">Everything happening across Mikon.</p>
      </div>
      <MobileAdmin />
      <div className="hidden md:block">
        <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn("relative flex items-center gap-2 whitespace-nowrap px-3 pb-3 pt-1 text-sm transition", tab === t.id ? "text-ink" : "text-muted hover:text-ink")}
            >
              <t.icon className="size-4" /> {t.label}
              {t.id === "feedback" && fresh > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-ink">{fresh}</span>}
              {tab === t.id && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />}
            </button>
          ))}
        </div>
        {tab === "overview" && <Overview />}
        {tab === "users" && <UsersPanel />}
        {tab === "activity" && <LogsPanel />}
        {tab === "feedback" && <FeedbackPanel />}
        {tab === "announcements" && <AnnouncementsPanel />}
        {tab === "storage" && <StoragePanel />}
      </div>
    </div>
  );
}
