"use client";

import { useState } from "react";
import { AtSign, Check, Lightbulb, Loader2 } from "lucide-react";
import { apiSend } from "@/lib/api";
import { setSessionUser, setTutorial, type Privacy, type SessionUser } from "@/lib/storage";
import { toast } from "../Toaster";
import { VisibilityPicker } from "../social/VisibilityPicker";
import { Button, Field, Input, Textarea } from "../ui";
import { PushToggle } from "../pwa/PushToggle";

const PRIVACY_ROWS: { key: keyof Privacy; label: string; hint: string }[] = [
  { key: "profile", label: "Profile", hint: "Your bio, friends count and shared programs" },
  { key: "activeProgram", label: "Active program", hint: "The program you're currently running" },
  { key: "progress", label: "Exercise progress", hint: "Your logged lifts on exercise pages and comparisons" },
];

const KEEP = ["early-days", "import-asked", "start-hub"];

export function AccountSettings({ user }: { user: SessionUser }) {
  const replayTips = () => {
    setTutorial({ ...user.tutorial, guides: (user.tutorial.guides ?? []).filter((g) => KEEP.includes(g)) });
    toast({ tone: "success", title: "Tips will show again as you move around" });
  };
  const [form, setForm] = useState({ name: user.name, username: user.username, bio: user.bio });
  const [busy, setBusy] = useState(false);
  const dirty = form.name !== user.name || form.username !== user.username || form.bio !== user.bio;

  const save = async () => {
    setBusy(true);
    try {
      const { user: next } = await apiSend<{ user: SessionUser }>("PATCH", "/api/me", form);
      setSessionUser(next);
      toast({ tone: "success", title: "Account updated" });
    } catch (e) {
      toast({ tone: "warn", title: "Couldn't save", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const setPrivacy = async (key: keyof Privacy, value: Privacy[keyof Privacy]) => {
    const privacy = { ...user.privacy, [key]: value };
    setSessionUser({ privacy });
    await apiSend("PATCH", "/api/me", { privacy }).catch((e: Error) => toast({ tone: "warn", title: "Couldn't save", message: e.message }));
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="text-sm font-semibold">Account</h3>
        <p className="mt-0.5 text-xs text-muted">How friends find and see you.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <Input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Username">
            <Input
              icon={AtSign}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 24) })}
            />
          </Field>
          <Field label="Bio" optional className="sm:col-span-2">
            <Textarea value={form.bio} maxLength={240} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Powerlifter in training, chasing a 200 kg deadlift." className="min-h-20" />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={!dirty || busy || form.username.length < 3 || !form.name.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save changes
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="text-sm font-semibold">Privacy</h3>
        <p className="mt-0.5 text-xs text-muted">Choose who can see each part of your training. Friend requests are always allowed.</p>
        <div className="mt-4 divide-y divide-line">
          {PRIVACY_ROWS.map((r) => (
            <div key={r.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted">{r.hint}</p>
              </div>
              <VisibilityPicker value={user.privacy[r.key]} onChange={(v) => setPrivacy(r.key, v)} size="sm" />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="text-sm font-semibold">Notifications</h3>
        <p className="mt-0.5 text-xs text-muted">Get a push notification for friend requests and programs shared with you.</p>
        <div className="mt-4">
          <PushToggle />
        </div>
      </section>
      <section className="rounded-2xl border border-line bg-surface p-5">
        <h3 className="text-sm font-semibold">Tips</h3>
        <p className="mt-0.5 text-xs text-muted">Show the page tips and the getting started list again.</p>
        <Button variant="secondary" className="mt-4" onClick={replayTips}>
          <Lightbulb className="size-4" /> Replay tips
        </Button>
      </section>
    </div>
  );
}
