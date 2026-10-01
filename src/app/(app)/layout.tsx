"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useProfile } from "@/lib/storage";
import { SessionScreen, useSession } from "@/components/SessionGate";
import { LogoMark } from "@/components/graphics/Logo";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Avatar } from "@/components/shell/Avatar";
import { BottomNav } from "@/components/shell/BottomNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { isImmersive, titleFor } from "@/components/shell/nav";
import { NotificationBell } from "@/components/social/Notifications";
import { Toaster } from "@/components/Toaster";
import { Tour } from "@/components/tour/Tour";
import { cn } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const profile = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const immersive = isImmersive(pathname);

  useEffect(() => {
    if (profile === null) router.replace("/onboarding");
  }, [profile, router]);

  if (!profile) return <SessionScreen status={session.status} retry={session.retry} />;

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "shrink-0 items-center gap-3 border-b border-line bg-bg/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl sm:px-6 md:flex md:h-16 md:pt-0",
            immersive ? "hidden" : "flex h-[calc(3.5rem+env(safe-area-inset-top))]",
          )}
        >
          <Link href="/" className="md:hidden" aria-label="Home">
            <LogoMark size={28} />
          </Link>
          <h1 className="truncate font-display text-lg font-semibold tracking-tight">{titleFor(pathname)}</h1>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              href="/explorer/exercises"
              className="hidden h-9 w-64 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-sm text-faint transition hover:border-line-strong lg:flex"
            >
              <Search className="size-4" />
              <span className="flex-1">Search exercises</span>
            </Link>
            <div data-tour="bell">
              <NotificationBell />
            </div>
            <Link
              href="/profile"
              data-tour="avatar"
              className="ml-1 rounded-full ring-2 ring-transparent ring-offset-2 ring-offset-bg transition hover:ring-accent/60"
              aria-label="Your profile"
            >
              <Avatar size={32} />
            </Link>
          </div>
        </header>
        <main className={cn("scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain", immersive && "pt-[env(safe-area-inset-top)] md:pt-0")}>{children}</main>
        {!immersive && <BottomNav />}
        <Toaster />
        <Tour />
        <InstallPrompt />
      </div>
    </div>
  );
}
