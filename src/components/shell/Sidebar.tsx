"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Dumbbell, Folder, LogOut, MessageSquareHeart, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { openFeedback } from "../feedback/Feedback";
import { openStartSheet, updateWorkout, useActiveWorkout } from "@/lib/tracker";
import { programHref } from "@/lib/programs";
import { KEYS, logout, usePrograms, useStored, writeStored } from "@/lib/storage";
import { Logo, LogoMark } from "../graphics/Logo";
import { cn } from "../ui";
import { FOOTER_NAV, MAIN_NAV, type NavItem } from "./nav";

function NavLink({ item, active, collapsed, onNavigate }: { item: NavItem; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition",
        active ? "bg-surface-3 text-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
        collapsed && "justify-center px-0",
      )}
    >
      {active && <motion.span layoutId="nav-active" className="absolute -left-3 h-5 w-[3px] rounded-r-full bg-accent" />}
      <item.icon className={cn("size-[18px] shrink-0", active && "text-accent")} />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.soon && <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-faint">Soon</span>}
        </>
      )}
    </Link>
  );
}

function StartButton({ collapsed }: { collapsed: boolean }) {
  const workout = useActiveWorkout();
  return (
    <button
      type="button"
      data-tour="train"
      onClick={() => (workout ? updateWorkout((w) => ({ ...w, minimized: false })) : openStartSheet())}
      title={collapsed ? (workout ? "Resume workout" : "Start workout") : undefined}
      className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-sm font-semibold transition hover:border-accent/50 active:scale-[0.98]"
    >
      <span className="relative">
        <Dumbbell className="size-4 text-accent" />
        {workout && <span className="absolute -right-1.5 -top-1 size-2 animate-pulse rounded-full bg-danger" />}
      </span>
      {!collapsed && (workout ? "Resume workout" : "Start workout")}
    </button>
  );
}

export function Sidebar({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const programs = usePrograms() ?? [];
  const stored = useStored<boolean>(KEYS.sidebar);
  const collapsed = !mobile && !!stored;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-line bg-surface/60 transition-[width] duration-200",
        collapsed ? "w-[68px] px-3" : "w-64 px-4",
      )}
    >
      <div className={cn("flex h-16 items-center", collapsed ? "justify-center" : "justify-between")}>
        {collapsed ? (
          <LogoMark />
        ) : (
          <Link href="/" onClick={onNavigate}>
            <Logo />
          </Link>
        )}
        {!mobile && !collapsed && (
          <button
            type="button"
            onClick={() => writeStored(KEYS.sidebar, true)}
            className="rounded-lg p-1.5 text-faint transition hover:bg-surface-2 hover:text-ink"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      <Link
        href="/programs/new"
        onClick={onNavigate}
        data-tour="new-program"
        title={collapsed ? "New program" : undefined}
        className={cn(
          "mt-2 flex h-10 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-ink transition hover:bg-[#d4ff4a] active:scale-[0.98]",
        )}
      >
        <Plus className="size-4" strokeWidth={2.5} />
        {!collapsed && "New program"}
      </Link>

      <StartButton collapsed={collapsed} />

      <nav data-tour="nav" className="mt-6 space-y-0.5">
        {!collapsed && <p className="mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Main</p>}
        {MAIN_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="mt-8 min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        {!collapsed && (
          <>
            <p className="mb-2 flex items-center justify-between px-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
              My programs
              <Link href="/programs/new" onClick={onNavigate} className="rounded p-0.5 hover:bg-surface-2 hover:text-ink" aria-label="New program">
                <Plus className="size-3.5" />
              </Link>
            </p>
            {programs.length === 0 ? (
              <p className="px-2.5 text-[13px] leading-relaxed text-faint">No programs yet. Your programs will show up here.</p>
            ) : (
              <ul className="space-y-0.5">
                {programs.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={programHref(p)}
                      onClick={onNavigate}
                      className={cn(
                        "flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition",
                        pathname.startsWith(`/programs/${p.id}`) ? "bg-surface-3 text-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      <Folder className="size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      {p.status === "draft" ? (
                        <span className="size-1.5 shrink-0 rounded-full bg-warn" title="Draft" />
                      ) : (
                        p.activeFrom && <span className="size-1.5 shrink-0 rounded-full bg-accent" title="Active" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="space-y-0.5 border-t border-line py-3">
        {FOOTER_NAV.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} onNavigate={onNavigate} />
        ))}
        <button
          type="button"
          onClick={openFeedback}
          title={collapsed ? "Feedback" : undefined}
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-muted transition hover:bg-surface-2 hover:text-ink",
            collapsed && "justify-center px-0",
          )}
        >
          <MessageSquareHeart className="size-[18px] shrink-0" />
          {!collapsed && "Feedback"}
        </button>
        <button
          type="button"
          onClick={logout}
          title={collapsed ? "Log out" : undefined}
          className={cn(
            "flex h-9 w-full items-center gap-3 rounded-lg px-2.5 text-sm text-muted transition hover:bg-surface-2 hover:text-ink",
            collapsed && "justify-center px-0",
          )}
        >
          <LogOut className="size-[18px] shrink-0" />
          {!collapsed && "Log out"}
        </button>
        {collapsed && (
          <button
            type="button"
            onClick={() => writeStored(KEYS.sidebar, null)}
            className="flex h-9 w-full items-center justify-center rounded-lg text-faint transition hover:bg-surface-2 hover:text-ink"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="size-[18px]" />
          </button>
        )}
      </div>
    </aside>
  );
}
