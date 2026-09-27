"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Menu, Search } from "lucide-react";
import { useProfile } from "@/lib/storage";
import { SessionScreen, useSession } from "@/components/SessionGate";
import { Avatar } from "@/components/shell/Avatar";
import { Sidebar } from "@/components/shell/Sidebar";
import { titleFor } from "@/components/shell/nav";
import { Toaster } from "@/components/Toaster";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (profile === null) router.replace("/onboarding");
  }, [profile, router]);

  if (!profile) return <SessionScreen status={session.status} retry={session.retry} />;

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 bg-bg md:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            >
              <Sidebar mobile onNavigate={() => setDrawer(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-4 sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink md:hidden"
            onClick={() => setDrawer(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <h1 className="font-display text-lg font-semibold tracking-tight">{titleFor(pathname)}</h1>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden h-9 w-64 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-sm text-faint lg:flex">
              <Search className="size-4" />
              <span className="flex-1">Search</span>
              <kbd className="rounded border border-line px-1.5 font-mono text-[10px]">⌘K</kbd>
            </div>
            <button type="button" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Notifications">
              <Bell className="size-[18px]" />
            </button>
            <Link
              href="/profile"
              className="rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-bg transition hover:ring-accent/60"
              aria-label="Your profile"
            >
              <Avatar profile={profile} size={34} />
            </Link>
          </div>
        </header>
        <main className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">{children}</main>
        <Toaster />
      </div>
    </div>
  );
}
