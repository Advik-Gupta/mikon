"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { Crown, Flame, RotateCcw, Share2, Swords, UserPlus, Volume2, VolumeX, X } from "lucide-react";
import { useApi, type UserCard } from "@/lib/api";
import { useExerciseMap } from "@/lib/analysis";
import { metricFormat, type Metric } from "@/lib/metrics";
import { useOverlay } from "@/lib/overlay";
import { useProfile, useSessionUser } from "@/lib/storage";
import { isMuted, setMuted, startMusic, stopMusic } from "@/lib/versus-music";
import { ShareStudio, type ShareContent } from "../share/ShareStudio";
import { UserAvatar } from "../shell/Avatar";
import { cn } from "../ui";

interface Player {
  user: UserCard;
  self: boolean;
  workouts: number;
  sets: number;
  volume: number;
  minutes: number;
  streak: number;
  days: number;
}

interface VersusData {
  players: Player[];
  lifts: { exerciseId: string; metric: Metric; ranks: { userId: string; best: number; first: number; last: number; sessions: number }[] }[];
  improved: { userId: string; exerciseId: string; metric: Metric; from: number; to: number; pct: number }[];
  hidden: number;
  friends: number;
}

const SLIDE_MS = 6500;
const THEMES = [
  { bg: "from-[#1b2a05] via-[#0c0f0a] to-[#07080a]", blob: "#c6f432", ink: "text-accent" },
  { bg: "from-[#26104f] via-[#0f0a1c] to-[#07080a]", blob: "#a78bfa", ink: "text-[#c4b0ff]" },
  { bg: "from-[#4a1d08] via-[#170d08] to-[#07080a]", blob: "#ff9a3c", ink: "text-[#ffb56e]" },
  { bg: "from-[#06304a] via-[#08131c] to-[#07080a]", blob: "#5aaeff", ink: "text-info" },
  { bg: "from-[#4a0a26] via-[#180911] to-[#07080a]", blob: "#ff6b8a", ink: "text-[#ff9db2]" },
  { bg: "from-[#063f3c] via-[#081514] to-[#07080a]", blob: "#3dd6d0", ink: "text-[#7be8e3]" },
];
type Theme = (typeof THEMES)[number];

const firstName = (p: { user: UserCard; self?: boolean }) => (p.self ? "You" : p.user.name.split(" ")[0]);
const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4]}`;

function Count({ to, format }: { to: number; format: (n: number) => string }) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    const c = animate(mv, to, { duration: 1.3, delay: 0.35, ease: "easeOut" });
    return () => c.stop();
  }, [mv, to]);
  return <motion.span>{text}</motion.span>;
}

function Title({ kicker, children, theme }: { kicker: string; children: ReactNode; theme: Theme }) {
  return (
    <div>
      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("text-xs font-semibold uppercase tracking-[0.2em]", theme.ink)}>
        {kicker}
      </motion.p>
      <motion.h2 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: "spring", bounce: 0.3 }} className="mt-2 font-display text-[2rem] font-semibold leading-[1.08] tracking-tight sm:text-4xl">
        {children}
      </motion.h2>
    </div>
  );
}

function BarRace({ rows, format, theme }: { rows: { player: Player; value: number }[]; format: (n: number) => string; theme: Theme }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="mt-8 space-y-3">
      {rows.slice(0, 6).map((r, i) => (
        <motion.li key={r.player.user.id} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.12 }} className="flex items-center gap-3">
          <span className="w-4 shrink-0 text-center font-display text-sm font-bold text-white/50">{i + 1}</span>
          <UserAvatar name={r.player.user.name} src={r.player.user.avatarUrl} size={40} className={cn(r.player.self && "ring-2 ring-white")} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className={cn("truncate text-sm font-semibold", r.player.self && theme.ink)}>{firstName(r.player)}</span>
              <span className="shrink-0 font-display text-base font-semibold tabular-nums">
                <Count to={r.value} format={format} />
              </span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(3, (r.value / max) * 100)}%` }}
                transition={{ delay: 0.35 + i * 0.12, duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
                className="h-full rounded-full"
                style={{ background: r.player.self ? "#ffffff" : theme.blob, opacity: r.player.self ? 1 : 0.75 }}
              />
            </div>
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

function Podium({ ranks, theme, format }: { ranks: { player: Player; value: number }[]; theme: Theme; format: (n: number) => string }) {
  const order = [ranks[1], ranks[0], ranks[2]];
  const heights = [120, 170, 90];
  return (
    <div className="mt-10 flex items-end justify-center gap-3">
      {order.map((r, i) =>
        r ? (
          <div key={r.player.user.id} className="flex w-[30%] max-w-[120px] flex-col items-center">
            <motion.div initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 + i * 0.15, type: "spring", bounce: 0.5 }} className="relative mb-2">
              {i === 1 && <Crown className="absolute -top-6 left-1/2 size-6 -translate-x-1/2 text-warn" />}
              <UserAvatar name={r.player.user.name} src={r.player.user.avatarUrl} size={i === 1 ? 64 : 52} className={cn(r.player.self && "ring-2 ring-white")} />
            </motion.div>
            <p className={cn("w-full truncate text-center text-sm font-semibold", r.player.self && theme.ink)}>{firstName(r.player)}</p>
            <p className="font-display text-sm font-semibold tabular-nums text-white/80">{format(r.value)}</p>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: heights[i] }}
              transition={{ delay: 0.3 + i * 0.15, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              className="mt-2 flex w-full items-start justify-center rounded-t-2xl pt-3 font-display text-2xl font-bold text-black/70"
              style={{ background: i === 1 ? theme.blob : "rgba(255,255,255,0.22)" }}
            >
              {[2, 1, 3][i]}
            </motion.div>
          </div>
        ) : (
          <div key={i} className="w-[30%] max-w-[120px]" />
        ),
      )}
    </div>
  );
}

interface Slide {
  key: string;
  node: (theme: Theme) => ReactNode;
}

export function Versus({ open, onClose, onShare }: { open: boolean; onClose: () => void; onShare?: (c: ShareContent) => void }) {
  useOverlay(open);
  const session = useSessionUser();
  const [muted, setMutedState] = useState(false);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => setMutedState(isMuted()), 0);
    return () => {
      clearTimeout(t);
      stopMusic();
    };
  }, [open]);
  const { data } = useApi<VersusData>(open ? "/api/versus" : null, 60_000);
  const profile = useProfile();
  const units = profile?.body.units ?? "metric";
  const exercises = useExerciseMap();
  const [{ index, elapsed }, setPos] = useState({ index: 0, elapsed: 0 });
  const [paused, setPaused] = useState(false);

  const slides = useMemo<Slide[]>(() => {
    if (!data) return [];
    const players = data.players;
    const me = players.find((p) => p.self);
    const rivals = players.filter((p) => !p.self);
    const byId = new Map(players.map((p) => [p.user.id, p]));
    const whole = (n: number) => Math.round(n).toLocaleString();
    const mass = (kg: number) => {
      const v = units === "metric" ? kg : kg * 2.20462;
      return `${v >= 10000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toLocaleString()} ${units === "metric" ? "kg" : "lb"}`;
    };

    if (!me || rivals.length === 0) {
      return [
        {
          key: "empty",
          node: (t) => (
            <div className="my-auto">
              <Title kicker="VS friends" theme={t}>
                {data.friends ? "Your friends keep their progress private" : "It takes two to compete"}
              </Title>
              <p className="mt-4 max-w-sm text-white/70">{data.friends ? "Once a friend shares their progress with friends, your head to head shows up here." : "Add a friend and this turns into a full breakdown of who trains more, lifts more and keeps the longer streak."}</p>
              <Link href="/friends?tab=find" onClick={onClose} data-stop className="mt-8 flex h-12 w-fit items-center gap-2 rounded-full bg-white px-6 text-[15px] font-semibold text-black">
                <UserPlus className="size-4" /> Find friends
              </Link>
            </div>
          ),
        },
      ];
    }

    const list: Slide[] = [];
    const wins: string[] = [];
    const rank = (key: keyof Pick<Player, "workouts" | "volume" | "streak" | "minutes">) => [...players].sort((a, b) => b[key] - a[key]).map((player) => ({ player, value: player[key] }));
    const place = (rows: { player: Player }[]) => rows.findIndex((r) => r.player.self) + 1;
    const headline = (rows: { player: Player; value: number }[], won: string, lost: (leader: string) => string, label: string) => {
      if (rows[0].value > 0 && rows[0].player.self) wins.push(label);
      return rows[0].player.self ? won : lost(firstName(rows[0].player));
    };

    list.push({
      key: "intro",
      node: (t) => (
        <div className="my-auto">
          <div className="mb-10 flex">
            {players.slice(0, 6).map((p, i) => (
              <motion.div key={p.user.id} initial={{ opacity: 0, scale: 0, x: -30 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12, type: "spring", bounce: 0.55 }} className="-mr-3">
                <UserAvatar name={p.user.name} src={p.user.avatarUrl} size={68} className="ring-4 ring-black/60" />
              </motion.div>
            ))}
          </div>
          <Title kicker="Last 30 days" theme={t}>
            You vs {rivals.length === 1 ? firstName(rivals[0]) : `${rivals.length} friends`}
          </Title>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-4 text-white/70">
            Who trained more, lifted more and kept it going. Tap to move on.
          </motion.p>
        </div>
      ),
    });

    const workouts = rank("workouts");
    if (workouts[0].value > 0) {
      const title = headline(workouts, "Nobody showed up more than you", (l) => `${l} showed up the most`, "Workouts");
      list.push({
        key: "workouts",
        node: (t) => (
          <>
            <Title kicker="Workouts" theme={t}>
              {title}
            </Title>
            <p className="mt-3 text-white/70">
              You logged {me.workouts} workout{me.workouts === 1 ? "" : "s"} on {me.days} day{me.days === 1 ? "" : "s"}. That puts you {ordinal(place(workouts))}.
            </p>
            <BarRace rows={workouts} format={whole} theme={t} />
          </>
        ),
      });
    }

    const volume = rank("volume");
    if (volume[0].value > 0) {
      const title = headline(volume, "You moved the most weight", (l) => `${l} moved the most weight`, "Volume");
      const cars = Math.round(me.volume / 1300);
      list.push({
        key: "volume",
        node: (t) => (
          <>
            <Title kicker="Total volume" theme={t}>
              {title}
            </Title>
            <p className="mt-3 text-white/70">{cars >= 1 ? `Your ${mass(me.volume)} is about ${cars} car${cars === 1 ? "" : "s"} lifted off the ground.` : `You moved ${mass(me.volume)} this month.`}</p>
            <BarRace rows={volume} format={mass} theme={t} />
          </>
        ),
      });
    }

    const streak = rank("streak");
    if (streak[0].value > 0) {
      const title = headline(streak, "Your streak is the one to beat", (l) => `${l} has the longest streak`, "Streak");
      list.push({
        key: "streak",
        node: (t) => (
          <>
            <Title kicker="Weeks in a row" theme={t}>
              {title}
            </Title>
            <p className="mt-3 flex items-center gap-2 text-white/70">
              <Flame className="size-4" /> {me.streak ? `You're on ${me.streak} week${me.streak === 1 ? "" : "s"} straight.` : "Train this week to start yours."}
            </p>
            <BarRace rows={streak} format={(n) => `${Math.round(n)} wk`} theme={t} />
          </>
        ),
      });
    }

    const minutes = rank("minutes");
    if (minutes[0].value >= 30) {
      const title = headline(minutes, "You put in the most time", (l) => `${l} put in the most time`, "Time");
      const hours = (n: number) => (n >= 60 ? `${(n / 60).toFixed(1)} h` : `${Math.round(n)} min`);
      list.push({
        key: "time",
        node: (t) => (
          <>
            <Title kicker="Time training" theme={t}>
              {title}
            </Title>
            <p className="mt-3 text-white/70">{me.workouts ? `Your average session ran ${Math.round(me.minutes / me.workouts)} minutes.` : "No sessions from you yet this month."}</p>
            <BarRace rows={minutes} format={hours} theme={t} />
          </>
        ),
      });
    }

    data.lifts.slice(0, 3).forEach((lift) => {
      const fmt = metricFormat(lift.metric, units);
      const ranks = lift.ranks.flatMap((r) => (byId.get(r.userId) ? [{ player: byId.get(r.userId)!, value: r.best }] : []));
      if (ranks.length < 2) return;
      const name = exercises.get(lift.exerciseId)?.name ?? "Exercise";
      const pos = place(ranks);
      if (pos === 1) wins.push(name);
      list.push({
        key: `lift-${lift.exerciseId}`,
        node: (t) => (
          <>
            <Title kicker={lift.metric === "e1rm" ? "Strongest lift" : lift.metric === "reps" ? "Most reps" : "Longest hold"} theme={t}>
              {name}
            </Title>
            <p className="mt-3 text-white/70">
              {pos === 1 ? `You own this one with ${fmt(ranks[0].value)}.` : `${firstName(ranks[0].player)} leads with ${fmt(ranks[0].value)}. You're ${ordinal(pos)}, ${fmt(ranks[0].value - ranks[pos - 1].value)} behind.`}
            </p>
            <Podium ranks={ranks} theme={t} format={fmt} />
          </>
        ),
      });
    });

    const improved = data.improved.flatMap((g) => (byId.get(g.userId) ? [{ ...g, player: byId.get(g.userId)! }] : []));
    if (improved.length) {
      if (improved[0].player.self) wins.push("Most improved");
      list.push({
        key: "improved",
        node: (t) => (
          <>
            <Title kicker="Most improved" theme={t}>
              {improved[0].player.self ? "You made the biggest jump" : `${firstName(improved[0].player)} made the biggest jump`}
            </Title>
            <ul className="mt-8 space-y-3">
              {improved.map((g, i) => {
                const fmt = metricFormat(g.metric, units);
                return (
                  <motion.li key={g.userId} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.14 }} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] p-3">
                    <UserAvatar name={g.player.user.name} src={g.player.user.avatarUrl} size={40} className={cn(g.player.self && "ring-2 ring-white")} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-semibold", g.player.self && t.ink)}>{firstName(g.player)}</p>
                      <p className="truncate text-xs text-white/60">
                        {exercises.get(g.exerciseId)?.name ?? "Exercise"} · {fmt(g.from)} to {fmt(g.to)}
                      </p>
                    </div>
                    <span className="shrink-0 font-display text-xl font-semibold tabular-nums">
                      +<Count to={g.pct} format={(n) => `${Math.round(n)}%`} />
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </>
        ),
      });
    }

    if (list.length === 1) {
      list.push({
        key: "nothing",
        node: (t) => (
          <div className="my-auto">
            <Title kicker="Nothing yet" theme={t}>
              No one has logged a workout this month
            </Title>
            <p className="mt-4 text-white/70">Be the first. Log a session and you take every category.</p>
          </div>
        ),
      });
      return list;
    }

    const rounds = list.length - 1;
    const share: ShareContent | null = session
      ? {
          kind: "profile",
          eyebrow: `VS friends · ${new Date().toLocaleDateString(undefined, { month: "short", year: "numeric" })}`,
          title: wins.length ? `${wins.length} of ${rounds} rounds won` : `${ordinal(place(workouts))} of ${players.length} this month`,
          subtitle: `${session.name} vs ${rivals.length} friend${rivals.length === 1 ? "" : "s"}, last 30 days`,
          stats: [
            { label: "Workouts", value: String(me.workouts) },
            { label: "Week streak", value: String(me.streak) },
            { label: "Lifted", value: mass(me.volume) },
          ],
          blocks: [
            { title: "Rounds won", star: true, items: wins.slice(0, 5).map((w) => ({ left: w, right: "1st" })) },
            { title: "Most workouts", items: workouts.slice(0, 5).map((r, i) => ({ left: `${i + 1}. ${r.player.self ? session.name.split(" ")[0] : firstName(r.player)}`, right: `${r.value} workouts` })) },
            { title: "Most volume", items: volume.slice(0, 5).map((r, i) => ({ left: `${i + 1}. ${r.player.self ? session.name.split(" ")[0] : firstName(r.player)}`, right: mass(r.value) })) },
          ],
          avatarUrl: session.avatarUrl,
          initials: session.name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase(),
          cta: "Think you can beat me? Join me on Mikon",
          url: `${window.location.origin}/signup?ref=${session.username}`,
          fileName: "mikon-vs-friends.png",
        }
      : null;
    list.push({
      key: "outro",
      node: (t) => (
        <div className="my-auto">
          <Title kicker="Final score" theme={t}>
            {wins.length ? `You took ${wins.length} of ${rounds} round${rounds === 1 ? "" : "s"}` : "No wins this time"}
          </Title>
          {wins.length ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {wins.map((w, i) => (
                <motion.span key={w} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.1, type: "spring", bounce: 0.5 }} className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium">
                  <Crown className="size-3.5 text-warn" /> {w}
                </motion.span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-white/70">Every round is up for grabs next month. One more session a week changes this page.</p>
          )}
          {share && onShare && (
            <motion.button
              type="button"
              data-stop
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              onClick={() => {
                onClose();
                onShare(share);
              }}
              className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-black"
            >
              <Share2 className="size-4" /> Share my summary
            </motion.button>
          )}
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">Go one on one</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {rivals.slice(0, 8).map((p) => (
              <Link key={p.user.id} href={`/u/${p.user.username}`} onClick={onClose} data-stop className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-sm font-medium hover:bg-white/20">
                <UserAvatar name={p.user.name} src={p.user.avatarUrl} size={28} /> {firstName(p)}
              </Link>
            ))}
          </div>
          {data.hidden > 0 && (
            <p className="mt-6 text-xs text-white/40">
              {data.hidden} friend{data.hidden === 1 ? " keeps" : "s keep"} their progress private and {data.hidden === 1 ? "isn't" : "aren't"} included.
            </p>
          )}
        </div>
      ),
    });
    return list;
  }, [data, units, exercises, onClose, onShare, session]);

  const count = slides.length;
  const go = (step: number) => setPos((p) => ({ index: Math.max(0, Math.min(count - 1, p.index + step)), elapsed: 0 }));

  useEffect(() => {
    if (!open || !count || paused || index >= count - 1) return;
    const t = setInterval(() => setPos((p) => (p.elapsed + 100 < SLIDE_MS ? { ...p, elapsed: p.elapsed + 100 } : { index: Math.min(count - 1, p.index + 1), elapsed: 0 })), 100);
    return () => clearInterval(t);
  }, [open, count, paused, index]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (step) setPos((p) => ({ index: Math.max(0, Math.min(count - 1, p.index + step)), elapsed: 0 }));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, count, onClose]);

  if (typeof document === "undefined") return null;
  const current = slides[Math.min(index, count - 1)];
  const theme = THEMES[index % THEMES.length];
  const close = () => {
    onClose();
    setPos({ index: 0, elapsed: 0 });
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[96] flex justify-center bg-black" role="dialog" aria-label="You versus your friends">
          <div
            className={cn("relative flex h-full w-full max-w-md flex-col overflow-hidden bg-gradient-to-b text-white transition-colors duration-500 select-none", theme.bg)}
            onPointerDown={() => {
              setPaused(true);
              startMusic();
            }}
            onPointerUp={() => setPaused(false)}
            onPointerLeave={() => setPaused(false)}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[data-stop]")) return;
              const r = e.currentTarget.getBoundingClientRect();
              go(e.clientX - r.left < r.width * 0.3 ? -1 : 1);
            }}
          >
            <motion.div key={`a${index}`} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [0.8, 1.15, 1], opacity: 0.35 }} transition={{ duration: 1.6 }} className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full blur-3xl" style={{ background: theme.blob }} />
            <motion.div key={`b${index}`} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [0.7, 1.1, 1], opacity: 0.18 }} transition={{ duration: 2, delay: 0.2 }} className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full blur-3xl" style={{ background: theme.blob }} />

            <div className="relative z-10 px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
              <div className="flex gap-1">
                {(count ? slides : [null]).map((_, i) => (
                  <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
                    <span className="block h-full rounded-full bg-white" style={{ width: i < index ? "100%" : i === index ? `${index >= count - 1 ? 100 : (elapsed / SLIDE_MS) * 100}%` : "0%" }} />
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Swords className="size-4" /> VS friends
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    data-stop
                    onClick={() => {
                      setMuted(!muted);
                      setMutedState(!muted);
                    }}
                    className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
                    aria-label={muted ? "Turn music on" : "Turn music off"}
                  >
                    {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                  </button>
                  {index > 0 && (
                    <button type="button" data-stop onClick={() => setPos({ index: 0, elapsed: 0 })} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Replay">
                      <RotateCcw className="size-4" />
                    </button>
                  )}
                  <button type="button" data-stop onClick={close} className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close">
                    <X className="size-5" />
                  </button>
                </span>
              </div>
            </div>

            <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-8">
              {current ? (
                <AnimatePresence mode="wait">
                  <motion.div key={current.key} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.28 }} className="flex min-h-full flex-col">
                    {current.node(theme)}
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="flex h-full flex-col justify-center gap-3">
                  <div className="h-8 w-2/3 animate-pulse rounded-xl bg-white/10" />
                  <div className="h-8 w-1/2 animate-pulse rounded-xl bg-white/10" />
                  <div className="mt-6 h-40 animate-pulse rounded-2xl bg-white/10" />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

const EVENT = "mikon:versus";
export const openVersus = () => {
  startMusic();
  window.dispatchEvent(new Event(EVENT));
};

export function VersusHost() {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<ShareContent | null>(null);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return (
    <>
      <Versus open={open} onClose={() => setOpen(false)} onShare={setShare} />
      <ShareStudio open={!!share} content={share} onClose={() => setShare(null)} />
    </>
  );
}
