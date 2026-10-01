"use client";

import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, AtSign, Check, Eye, EyeOff, Lock, Mail, User, X } from "lucide-react";
import { Figure } from "../graphics/Figure";
import { Logo } from "../graphics/Logo";
import { UserAvatar } from "../shell/Avatar";
import { Button, cn, Field, Input } from "../ui";

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const STRENGTH = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["#ff5c5c", "#ff9a3c", "#ffb547", "#8be04e", "#c6f432"];

const safeNext = (next: string | null) => (next && next.startsWith("/") && !next.startsWith("//") ? next : "/");

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="board-grid relative hidden overflow-hidden border-r border-line bg-surface/40 p-10 lg:flex lg:flex-col">
        <Logo />
        <div className="relative my-auto">
          <div className="absolute left-1/2 top-1/3 size-80 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative mx-auto w-52">
            <Figure className="w-full" fill="var(--color-surface-2)" stroke="var(--color-accent-dim)" />
          </motion.div>
        </div>
        <div>
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight">
            Plan training that fits
            <br />
            <span className="text-accent">your body and your week.</span>
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Build programs across lifting, calisthenics, plyometrics, cardio and sport, with fatigue tracked on every muscle.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
{children}
      </div>
    </div>
  );
}

const HANDLE = /^[a-z0-9_.]{3,24}$/;

const readRefCookie = () => {
  const m = document.cookie.match(/(?:^|;\s*)mikon_ref=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

function useInviteRef(param: string | null) {
  const cookie = useSyncExternalStore(() => () => {}, readRefCookie, () => null);
  const v = (param ?? cookie)?.toLowerCase();
  return v && HANDLE.test(v) ? v : null;
}

function useInviter(ref: string | null) {
  const [inviter, setInviter] = useState<{ name: string; username: string; avatarUrl: string | null } | null>(null);
  useEffect(() => {
    if (!ref) return;
    let live = true;
    fetch(`/api/invite?u=${encodeURIComponent(ref)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && d && setInviter(d.inviter))
      .catch(() => null);
    return () => {
      live = false;
    };
  }, [ref]);
  return ref && inviter?.username === ref ? inviter : null;
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const ref = useInviteRef(params.get("ref"));
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [touchedUsername, setTouchedUsername] = useState(false);
  const [available, setAvailable] = useState<{ name: string; ok: boolean } | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wrongCredentials, setWrongCredentials] = useState(false);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  const inviter = useInviter(ref);
  const s = strength(password);
  const handle = touchedUsername ? username : name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 24);
  const validHandle = /^[a-z0-9_.]{3,24}$/.test(handle);

  useEffect(() => {
    if (!signup || !validHandle) return;
    const t = setTimeout(async () => {
      const res = await fetch(`/api/users/available?u=${encodeURIComponent(handle)}`).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (data) setAvailable({ name: handle, ok: data.available });
    }, 350);
    return () => clearTimeout(t);
  }, [handle, signup, validHandle]);
  const handleState = !handle ? null : !validHandle ? "invalid" : available?.name !== handle ? "checking" : available.ok ? "ok" : "taken";

  const check = () => {
    if (signup && !name.trim()) return "Enter your name.";
    if (signup && !validHandle) return "Pick a username of 3 to 24 letters, numbers, dots or underscores.";
    if (!email.trim()) return signup ? "Enter your email." : "Enter your email or username.";
    if (signup && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "That email doesn't look right.";
    if (!password) return "Enter your password.";
    if (signup && password.length < 8) return "Your password needs at least 8 characters.";
    return null;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const invalid = check();
    setError(invalid);
    setWrongCredentials(false);
    if (invalid) return;
    setBusy(true);
    let res: Response;
    try {
      res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup ? { name, username: handle, email, password, ...(ref ? { ref } : {}) } : { email, password }),
      });
    } catch {
      setError("Can't reach Mikon. Check your connection and try again.");
      setBusy(false);
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (res.ok) return router.replace(signup ? "/onboarding" : next);
    setBusy(false);
    if (res.status === 401) {
      setWrongCredentials(true);
      return setError("Your email or password is incorrect.");
    }
    if (res.status >= 500) return setError(data.error && res.status === 503 ? data.error : "We couldn't sign you in right now. Please try again in a minute.");
    setError(data.error ?? "Something went wrong. Please try again.");
  };

  return (
    <AuthShell>
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
          noValidate
        >
          <div className="lg:hidden">
            <Logo />
          </div>
          <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight lg:mt-0">{signup ? "Create your account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-muted">{signup ? "It takes a minute. Then we'll get to know you." : "Sign in to keep building."}</p>
          {!signup && inviter && (
            <Link href="/signup" className="mt-5 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/[0.08] p-3 transition hover:border-accent/60">
              <UserAvatar name={inviter.name} src={inviter.avatarUrl} size={44} />
              <p className="flex-1 text-sm leading-snug">
                <span className="font-semibold">{inviter.name}</span> invited you
                <span className="block text-xs text-muted">New to Mikon? Create an account</span>
              </p>
              <ArrowRight className="size-4 text-accent" />
            </Link>
          )}
          {signup && inviter && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/[0.08] p-3">
              <UserAvatar name={inviter.name} src={inviter.avatarUrl} size={44} />
              <p className="text-sm leading-snug">
                <span className="font-semibold">{inviter.name}</span> invited you to Mikon
                <span className="block text-xs text-muted">Sign up and you can add them as a friend straight away.</span>
              </p>
            </div>
          )}

          <div className="mt-8 space-y-4">
            {signup && (
              <Field label="Name">
                <Input icon={User} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Alex Morgan" required maxLength={60} autoFocus />
              </Field>
            )}
            {signup && (
              <Field label="Username" hint={handleState === "invalid" ? "3 to 24 letters, numbers, dots or underscores" : "Friends find you with this"}>
                <div className="relative">
                  <Input
                    icon={AtSign}
                    value={handle}
                    onChange={(e) => {
                      setTouchedUsername(true);
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 24));
                    }}
                    autoComplete="username"
                    placeholder="alexmorgan"
                    required
                    className="pr-28"
                  />
                  {handleState && handleState !== "invalid" && (
                    <span
                      className={cn(
                        "pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs",
                        handleState === "ok" ? "text-accent" : handleState === "taken" ? "text-danger" : "text-faint",
                      )}
                    >
                      {handleState === "ok" && <Check className="size-3.5" />}
                      {handleState === "taken" && <X className="size-3.5" />}
                      {handleState === "ok" ? "Available" : handleState === "taken" ? "Taken" : "Checking"}
                    </span>
                  )}
                </div>
              </Field>
            )}
            <Field label={signup ? "Email" : "Email or username"}>
              <Input
                icon={Mail}
                type={signup ? "email" : "text"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete={signup ? "email" : "username"}
                placeholder={signup ? "you@example.com" : "you@example.com or alexmorgan"}
                required
                autoFocus={!signup}
              />
            </Field>
            <Field label="Password">
              {!signup && (
                <Link href="/forgot-password" className="float-right -mt-6 text-xs font-medium text-muted hover:text-accent">
                  Forgot password?
                </Link>
              )}
              <div className="relative">
                <Input
                  icon={Lock}
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={signup ? "new-password" : "current-password"}
                  placeholder={signup ? "At least 8 characters" : "Your password"}
                  required
                  maxLength={128}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-faint hover:text-ink"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {signup && password && (
                <span className="mt-2 flex items-center gap-2">
                  <span className="flex flex-1 gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className="h-1 flex-1 rounded-full bg-surface-3" style={i < s ? { background: STRENGTH_COLOR[s] } : undefined} />
                    ))}
                  </span>
                  <span className="text-[11px]" style={{ color: STRENGTH_COLOR[s] }}>
                    {password.length < 8 ? STRENGTH[0] : STRENGTH[s]}
                  </span>
                </span>
              )}
            </Field>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
              {wrongCredentials && (
                <>
                  {" "}
                  <Link href={`/forgot-password${email.includes("@") ? `?email=${encodeURIComponent(email.trim())}` : ""}`} className="font-medium underline">
                    Reset your password
                  </Link>
                </>
              )}
            </p>
          )}

          <Button type="submit" disabled={busy || (signup && handleState === "taken")} aria-busy={busy} className={cn("mt-6 h-11 w-full")}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"} {!busy && <ArrowRight className="size-4" />}
          </Button>

          <p className="mt-6 text-center text-sm text-muted">
            {signup ? "Already have an account? " : "New to Mikon? "}
            <Link href={signup ? "/login" : "/signup"} className="font-medium text-accent hover:underline">
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </motion.form>
    </AuthShell>
  );
}
