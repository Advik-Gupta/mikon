"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, MailCheck } from "lucide-react";
import { Logo } from "../graphics/Logo";
import { Button, Field, Input } from "../ui";
import { AuthShell } from "./AuthForm";

async function post(url: string, body: unknown) {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return null;
    if (res.status >= 500 && res.status !== 503) return "Something went wrong on our side. Please try again in a minute.";
    return (data.error as string) ?? "Something went wrong. Please try again.";
  } catch {
    return "Can't reach Mikon. Check your connection and try again.";
  }
}

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
      <div className="lg:hidden">
        <Logo />
      </div>
      <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight lg:mt-0">{title}</h1>
      <p className="mt-2 text-sm text-muted">{sub}</p>
      {children}
    </motion.div>
  );
}

const ErrorNote = ({ text }: { text: string | null }) =>
  text ? (
    <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
      {text}
    </p>
  ) : null;

export function ForgotForm() {
  const [email, setEmail] = useState(useSearchParams().get("email") ?? "");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter the email you signed up with.");
    setBusy(true);
    setError(null);
    const err = await post("/api/auth/forgot", { email: email.trim() });
    setBusy(false);
    if (err) return setError(err);
    setSent(true);
  };

  return (
    <AuthShell>
      {sent ? (
        <Card title="Check your inbox" sub={`If an account exists for ${email.trim()}, we've sent a link to reset your password. It expires in 30 minutes.`}>
          <div className="mt-8 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm">
            <MailCheck className="size-5 shrink-0 text-accent" />
            <span>Don&apos;t see it? Check your spam folder or try again in a minute.</span>
          </div>
          <Button variant="secondary" className="mt-6 h-11 w-full" onClick={() => setSent(false)}>
            Use a different email
          </Button>
          <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> Back to sign in
          </Link>
        </Card>
      ) : (
        <Card title="Forgot your password?" sub="Enter your email and we'll send you a link to choose a new one.">
          <form onSubmit={submit} noValidate className="mt-8">
            <Field label="Email">
              <Input icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" autoFocus />
            </Field>
            <ErrorNote text={error} />
            <Button type="submit" disabled={busy} className="mt-6 h-11 w-full">
              {busy ? "Sending…" : "Send reset link"} {!busy && <ArrowRight className="size-4" />}
            </Button>
          </form>
          <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> Back to sign in
          </Link>
        </Card>
      )}
    </AuthShell>
  );
}

export function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const router = useRouter();
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/auth/reset?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => setValid(!!d.valid))
      .catch(() => setValid(false));
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("Your password needs at least 8 characters.");
    if (password !== confirm) return setError("Those passwords don't match.");
    setBusy(true);
    setError(null);
    const err = await post("/api/auth/reset", { token, password });
    if (err) {
      setBusy(false);
      return setError(err);
    }
    router.replace("/");
  };

  if (valid === false) {
    return (
      <AuthShell>
        <Card title="This link has expired" sub="Reset links work once and only for 30 minutes. Request a fresh one and use the newest email.">
          <Link href="/forgot-password" className="mt-8 flex h-11 items-center justify-center gap-2 rounded-xl bg-accent text-sm font-semibold text-accent-ink">
            Send a new link <ArrowRight className="size-4" />
          </Link>
          <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted hover:text-ink">
            <ArrowLeft className="size-4" /> Back to sign in
          </Link>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card title="Choose a new password" sub="Pick something you haven't used before. You'll be signed in straight after.">
        <form onSubmit={submit} noValidate className="mt-8 space-y-4">
          {[
            ["New password", password, setPassword, "At least 8 characters"],
            ["Confirm password", confirm, setConfirm, "Type it again"],
          ].map(([label, value, set, placeholder]) => (
            <Field key={label as string} label={label as string}>
              <div className="relative">
                <Input
                  icon={Lock}
                  type={show ? "text" : "password"}
                  value={value as string}
                  onChange={(e) => (set as (v: string) => void)(e.target.value)}
                  autoComplete="new-password"
                  placeholder={placeholder as string}
                  maxLength={128}
                  className="pr-11"
                  disabled={valid === null}
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
            </Field>
          ))}
          <ErrorNote text={error} />
          <Button type="submit" disabled={busy || valid === null} className="h-11 w-full">
            {busy ? "Saving…" : "Save and sign in"} {!busy && <ArrowRight className="size-4" />}
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}
