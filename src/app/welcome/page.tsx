import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, Compass, Dumbbell, Layers, Share2, Smartphone, Timer, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/graphics/Logo";
import { InstallCard } from "@/components/landing/InstallCard";
import builder from "../../../public/landing/builder.jpg";
import explorer from "../../../public/landing/explorer.jpg";
import history from "../../../public/landing/history.jpg";
import home from "../../../public/landing/home.jpg";
import tracker from "../../../public/landing/tracker.jpg";
import weight from "../../../public/landing/weight.jpg";

export const metadata: Metadata = {
  title: "Mikon · Plan it. Lift it. See it change.",
  description: "Build training programs around your goals, log every set, and watch your progress. Free, and it lives on your home screen.",
};

function Phone({ src, alt, className, priority }: { src: StaticImageData; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={`relative w-[220px] shrink-0 overflow-hidden rounded-[2.2rem] border-[6px] border-[#1d2127] bg-black shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] sm:w-[250px] ${className ?? ""}`}>
      <Image src={src} alt={alt} sizes="250px" placeholder="blur" priority={priority} className="h-auto w-full" />
    </div>
  );
}

function Pin({ color = "var(--color-accent)" }: { color?: string }) {
  return (
    <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
      <span className="block size-4 rounded-full shadow-[0_2px_6px_rgb(0_0_0/0.6)]" style={{ background: color }} />
    </span>
  );
}

function Feature({ icon: Icon, title, body, children, tilt = 0, color }: { icon: typeof Layers; title: string; body: string; children?: ReactNode; tilt?: number; color?: string }) {
  return (
    <div className="relative pt-2" style={{ transform: `rotate(${tilt}deg)` }}>
      <Pin color={color} />
      <div className="h-full rounded-3xl border border-line bg-surface p-5 shadow-[0_12px_30px_-12px_rgb(0_0_0/0.7)]">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Icon className="size-5" />
        </span>
        <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
        {children}
      </div>
    </div>
  );
}

const APPS = [
  ["Strong", "/logos/strong.png"],
  ["Hevy", "/logos/hevy.png"],
  ["Lyfta", "/logos/lyfta.png"],
  ["MacroFactor", "/logos/macrofactor.png"],
];

export default function Welcome() {
  return (
    <div className="board-grid min-h-dvh overflow-x-hidden">
      <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium text-muted hover:text-ink">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-[#d4ff4a]">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-14 text-center sm:px-8 sm:pt-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted">
            <span className="size-1.5 animate-pulse rounded-full bg-accent" /> Free while we&apos;re new
          </p>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Plan it. Lift it. <span className="text-accent">See it change.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Mikon builds your training around your goals, schedule and injuries, then tracks every set so you can see exactly what&apos;s working.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="flex h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-ink transition hover:bg-[#d4ff4a] active:scale-[0.98]">
              Create your free account <ArrowRight className="size-4" />
            </Link>
            <Link href="/login" className="flex h-12 items-center rounded-full border border-line-strong px-6 text-[15px] font-medium hover:bg-surface">
              I have an account
            </Link>
          </div>
          <InstallCard />

          <div className="relative mt-14 flex items-end justify-center">
            <Phone src={tracker} alt="Logging a workout in Mikon" className="relative z-0 -mr-14 hidden translate-y-6 -rotate-6 opacity-90 sm:block" />
            <Phone src={home} alt="Mikon home with streak and insights" className="relative z-10" priority />
            <Phone src={weight} alt="Body weight trend in Mikon" className="relative z-0 -ml-14 hidden translate-y-6 rotate-6 opacity-90 sm:block" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Everything on one board</h2>
          <p className="mt-2 max-w-xl text-muted">From planning your block to the last set of the day.</p>
          <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Feature icon={Layers} title="Build real programs" body="Drag training blocks onto days, set weeks and cycles, and see weekly volume and fatigue per muscle as you build." tilt={-0.8} />
            <Feature icon={Timer} title="A tracker that keeps up" body="Big tap targets, a custom keypad with RIR, supersets, rest timers that keep running when you leave the app." tilt={0.9} color="#5aaeff" />
            <Feature icon={BarChart3} title="Progress you can see" body="Streaks, PRs, volume, and smoothed body weight and measurement trends." tilt={-0.5} color="#a78bfa" />
            <Feature icon={Compass} title="Know your muscles" body="Tap any muscle on the body map to learn what it does and find the exercises that train it. Over 900 to pick from." tilt={0.6} color="#5ed1a0" />
            <Feature icon={Users} title="Train with friends" body="Add friends, compare lifts on any exercise, and share programs they can copy in one tap." tilt={-0.9} color="#ffb547" />
            <Feature icon={Share2} title="Share your wins" body="Turn any workout or your profile into a clean image for stories and posts." tilt={0.7} color="#ff6b8a" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
          <div className="relative pt-2">
            <Pin />
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[0_24px_60px_-24px_rgb(0_0_0/0.9)]">
              <div className="flex items-center gap-2 border-b border-line px-5 py-3 text-xs text-muted">
                <Dumbbell className="size-3.5 text-accent" /> The program builder
              </div>
              <Image src={builder} alt="Mikon program builder with a weekly board" sizes="(min-width: 1152px) 1100px, 100vw" placeholder="blur" className="h-auto w-full" />
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Bring your history with you</h2>
            <p className="mt-3 max-w-md leading-relaxed text-muted">
              Coming from another app? Import every workout, PR and body measurement in a minute. And if you ever leave, export it all back in their exact format.
            </p>
            <div className="mt-6 grid max-w-md grid-cols-4 gap-3">
              {APPS.map(([name, src]) => (
                <div key={name} className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-3">
                  <Image src={src} alt="" width={44} height={44} className="rounded-xl" />
                  <span className="text-[11px] text-muted">{name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center gap-4">
            <Phone src={explorer} alt="Muscle explorer body map" className="-rotate-3" />
            <Phone src={history} alt="Workout history" className="mt-12 hidden rotate-3 sm:block" />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-8">
          <div className="rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/15 via-surface to-surface p-8 text-center sm:p-12">
            <Smartphone className="mx-auto size-8 text-accent" />
            <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight">Ready when you are</h2>
            <p className="mx-auto mt-2 max-w-md text-muted">No app store needed. Sign up, add it to your home screen, and start your first workout.</p>
            <Link href="/signup" className="mx-auto mt-6 flex h-12 w-fit items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-semibold text-accent-ink hover:bg-[#d4ff4a]">
              Get started free <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center text-xs text-faint">
        <div className="flex justify-center">
          <Logo size={20} />
        </div>
        <p className="mt-3">Made for people who like to train with a plan.</p>
      </footer>
    </div>
  );
}
