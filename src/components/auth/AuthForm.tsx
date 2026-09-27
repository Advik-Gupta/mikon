"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Figure } from "../graphics/Figure";
import { Logo } from "../graphics/Logo";
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

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  const s = strength(password);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signup ? { name, email, password } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.replace(signup ? "/onboarding" : next);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

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

          <div className="mt-8 space-y-4">
            {signup && (
              <Field label="Name">
                <Input icon={User} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Alex Morgan" required maxLength={60} autoFocus />
              </Field>
            )}
            <Field label="Email">
              <Input icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" required autoFocus={!signup} />
            </Field>
            <Field label="Password">
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

          {error && <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={busy} className={cn("mt-6 h-11 w-full")}>
            {busy ? "Please wait…" : signup ? "Create account" : "Sign in"} {!busy && <ArrowRight className="size-4" />}
          </Button>

          <p className="mt-6 text-center text-sm text-muted">
            {signup ? "Already have an account? " : "New to Mikon? "}
            <Link href={signup ? "/login" : "/signup"} className="font-medium text-accent hover:underline">
              {signup ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
