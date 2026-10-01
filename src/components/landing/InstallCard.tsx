"use client";

import { Download, EllipsisVertical, Share, SquarePlus } from "lucide-react";
import { isIOS, promptInstall, useInstallEvent, useNeedsInstall } from "@/lib/pwa";

export function InstallCard() {
  const needs = useNeedsInstall();
  const event = useInstallEvent();
  if (!needs) return null;
  const ios = isIOS();
  return (
    <div className="mx-auto mt-8 max-w-md rounded-3xl border border-accent/40 bg-accent/[0.07] p-4 text-left">
      <p className="font-display text-base font-semibold">Best on your home screen</p>
      <p className="mt-0.5 text-sm text-muted">Install Mikon first so it opens full screen like a real app, then sign up inside it.</p>
      {event ? (
        <button type="button" onClick={() => promptInstall()} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-semibold text-accent-ink">
          <Download className="size-4" /> Install Mikon
        </button>
      ) : (
        <ol className="mt-3 space-y-2 text-sm">
          <li className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-surface-3">{ios ? <Share className="size-4 text-info" /> : <EllipsisVertical className="size-4 text-info" />}</span>
            {ios ? "Tap Share in your browser bar" : "Open your browser menu"}
          </li>
          <li className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-surface-3">
              <SquarePlus className="size-4 text-info" />
            </span>
            {ios ? "Choose Add to Home Screen" : "Tap Install app or Add to Home screen"}
          </li>
        </ol>
      )}
    </div>
  );
}
