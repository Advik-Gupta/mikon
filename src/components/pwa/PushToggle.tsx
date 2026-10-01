"use client";

import { useState } from "react";
import { BellOff, BellRing, Loader2 } from "lucide-react";
import { usePush } from "@/lib/pwa";
import { toast } from "../Toaster";
import { Button } from "../ui";

const NOTE: Record<string, string> = {
  unsupported: "This browser doesn't support push notifications.",
  "needs-install": "On iPhone and iPad, add Mikon to your home screen first, then turn notifications on from the app.",
  denied: "Notifications are blocked. Allow them for this site in your browser settings.",
};

export function PushToggle() {
  const { state, enable, disable } = usePush();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast({ tone: "warn", title: "Couldn't change notifications", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading") return <Loader2 className="size-4 animate-spin text-muted" />;
  if (NOTE[state]) return <p className="text-sm text-muted">{NOTE[state]}</p>;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm">
        {state === "on" ? <BellRing className="size-4 text-accent" /> : <BellOff className="size-4 text-muted" />}
        {state === "on" ? "Push notifications are on for this device" : "Push notifications are off"}
      </span>
      <Button variant={state === "on" ? "secondary" : "primary"} disabled={busy} onClick={() => run(state === "on" ? disable : enable)}>
        {busy && <Loader2 className="size-4 animate-spin" />}
        {state === "on" ? "Turn off" : "Turn on"}
      </Button>
    </div>
  );
}
