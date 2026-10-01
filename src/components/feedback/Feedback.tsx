"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Bug, Hammer, Lightbulb, Loader2, Send } from "lucide-react";
import { apiSend } from "@/lib/api";
import { Sheet } from "../tracker/Sheet";
import { toast } from "../Toaster";
import { Button, cn } from "../ui";

export const ROADMAP = ["Mobile optimisations", "Client support for coaches", "Group workouts", "Workout sharing", "Leaderboards"];

let isOpen = false;
const listeners = new Set<() => void>();
const set = (v: boolean) => {
  isOpen = v;
  listeners.forEach((l) => l());
};
export const openFeedback = () => set(true);

export function FeedbackSheet() {
  const open = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => isOpen,
    () => false,
  );
  const pathname = usePathname();
  const [type, setType] = useState<"bug" | "idea">("idea");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    try {
      await apiSend("POST", "/api/feedback", { type, message, page: pathname });
      toast({ tone: "success", title: "Thanks! We got it", message: type === "bug" ? "We'll look into it soon." : "Your idea is on our list." });
      setMessage("");
      set(false);
    } catch (e) {
      toast({ tone: "warn", title: "Couldn't send", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={() => set(false)} title="Feedback">
      <div className="px-5 pb-6">
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["idea", "Suggest a feature", Lightbulb],
              ["bug", "Report a bug", Bug],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setType(id)}
              className={cn("flex items-center gap-2 rounded-2xl border p-3.5 text-left text-sm font-medium transition", type === id ? "border-accent/60 bg-accent/10" : "border-line bg-surface-2/50 text-muted")}
            >
              <Icon className={cn("size-5", type === id ? "text-accent" : "")} /> {label}
            </button>
          ))}
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 3000))}
          placeholder={type === "bug" ? "What happened, and what did you expect instead?" : "What would make Mikon better for you?"}
          className="mt-3 min-h-36 w-full rounded-2xl border border-line bg-surface-2 p-4 text-[15px] outline-none focus:border-accent/60"
        />
        <Button onClick={send} disabled={busy || message.trim().length < 5} className="mt-3 h-12 w-full rounded-full">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send
        </Button>
        <div className="mt-6 rounded-2xl border border-line bg-surface-2/40 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-faint">
            <Hammer className="size-3.5 text-accent" /> Currently working on
          </p>
          <ul className="mt-3 space-y-2">
            {ROADMAP.map((r) => (
              <li key={r} className="flex items-center gap-2.5 text-sm">
                <span className="size-1.5 animate-pulse rounded-full bg-accent" /> {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Sheet>
  );
}
