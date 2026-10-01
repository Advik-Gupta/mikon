"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { isIOS, isStandalone, promptInstall, useInstallEvent } from "@/lib/pwa";
import { useSessionUser } from "@/lib/storage";
import { LogoMark } from "../graphics/Logo";
import { Button } from "../ui";

const KEY = "mikon.install-prompt-dismissed";

export function InstallPrompt() {
  const user = useSessionUser();
  const event = useInstallEvent();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      let seen = false;
      try {
        seen = !!localStorage.getItem(KEY);
      } catch {
        seen = false;
      }
      setDismissed(seen || isStandalone());
      setIos(isIOS());
      setReady(true);
    }, 2500);
    return () => clearTimeout(t);
  }, []);

  const tourRunning = !!user && !user.tutorial.done;
  const show = ready && !dismissed && !tourRunning && (!!event || ios);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };

  const install = async () => {
    await promptInstall();
    dismiss();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-[65] mx-auto max-w-md rounded-3xl border border-line-strong bg-surface/95 p-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur md:bottom-6 md:left-auto md:right-6 md:mx-0"
          role="dialog"
          aria-label="Install Mikon"
        >
          <button type="button" onClick={dismiss} className="absolute right-3 top-3 rounded-lg p-1 text-faint hover:bg-surface-2 hover:text-ink" aria-label="Dismiss">
            <X className="size-4" />
          </button>
          <div className="flex gap-3.5 pr-6">
            <LogoMark size={44} />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold">Get the Mikon app</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted">
                Install it on your {ios ? "home screen" : "device"} for a full screen experience, quick access to today&apos;s workout and push notifications.
              </p>
            </div>
          </div>
          {ios && !event ? (
            <ol className="mt-4 space-y-2 rounded-2xl bg-surface-2 p-3 text-[13px]">
              <li className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg bg-surface-3">
                  <Share className="size-4 text-info" />
                </span>
                Tap the Share button in Safari
              </li>
              <li className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg bg-surface-3">
                  <SquarePlus className="size-4" />
                </span>
                Choose &ldquo;Add to Home Screen&rdquo;
              </li>
            </ol>
          ) : (
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" onClick={dismiss} className="flex-1">
                Not now
              </Button>
              <Button onClick={install} className="flex-1">
                <Download className="size-4" /> Install
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
