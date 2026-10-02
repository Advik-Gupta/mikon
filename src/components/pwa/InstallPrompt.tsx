"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BellRing, Download, EllipsisVertical, Loader2, Share, SquarePlus } from "lucide-react";
import { isIOS, isPhone, isStandalone, promptInstall, useInstallEvent, usePush } from "@/lib/pwa";
import { useOverlayCount } from "@/lib/overlay";
import { useSessionUser } from "@/lib/storage";
import { LogoMark } from "../graphics/Logo";
import { toast } from "../Toaster";
import { onboardingDone } from "../tour/Guide";
import { Button } from "../ui";

const OFF = "mikon.nudge-off";
const SNOOZE = "mikon.nudge-snooze";
const SNOOZE_MS = 20 * 3600 * 1000;

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

export function InstallPrompt() {
  const user = useSessionUser();
  const event = useInstallEvent();
  const overlays = useOverlayCount();
  const push = usePush();
  const [env, setEnv] = useState<{ quiet: boolean; ios: boolean; phone: boolean; standalone: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(
      () => setEnv({ quiet: read(OFF) === "1" || Number(read(SNOOZE) ?? 0) > Date.now(), ios: isIOS(), phone: isPhone(), standalone: isStandalone() }),
      3500,
    );
    return () => clearTimeout(t);
  }, []);

  const canPush = !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && push.state === "off";
  const mode = !env || env.quiet ? null : !env.standalone && (event || env.phone) ? "install" : canPush ? "push" : null;
  const show = !!mode && !!user && onboardingDone(user) && overlays === 0;

  const later = () => {
    write(SNOOZE, String(Date.now() + SNOOZE_MS));
    setEnv((e) => e && { ...e, quiet: true });
  };
  const never = () => {
    write(OFF, "1");
    setEnv((e) => e && { ...e, quiet: true });
  };
  const install = async () => {
    if (await promptInstall()) setEnv((e) => e && { ...e, standalone: true });
  };
  const enable = async () => {
    setBusy(true);
    try {
      await push.enable();
      toast({ tone: "success", title: "Notifications are on" });
    } catch (e) {
      toast({ tone: "warn", title: "Couldn't turn on notifications", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const step = (Icon: typeof Share, text: string) => (
    <li className="flex items-center gap-2.5">
      <span className="flex size-7 items-center justify-center rounded-lg bg-surface-3">
        <Icon className="size-4 text-info" />
      </span>
      {text}
    </li>
  );

  return (
    <AnimatePresence>
      {show && env && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
          className="fixed inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom)_-_12px,4px)_+_62px)] z-[65] mx-auto max-w-md rounded-3xl border border-line-strong bg-surface p-4 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)] md:bottom-6 md:left-auto md:right-6 md:mx-0"
          role="dialog"
          aria-label={mode === "install" ? "Install Mikon" : "Turn on notifications"}
        >
          <div className="flex gap-3.5">
            {mode === "install" ? (
              <LogoMark size={44} />
            ) : (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <BellRing className="size-5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="font-display text-base font-semibold">{mode === "install" ? "Get the Mikon app" : "Turn on notifications"}</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted">
                {mode === "install"
                  ? `Add it to your ${env.phone ? "home screen" : "device"}. It opens full screen, keeps rest timers running and unlocks notifications.`
                  : "Hear about friend requests, shared programs and new features. Nothing else."}
              </p>
            </div>
          </div>
          {mode === "install" && !event && (
            <ol className="mt-3 space-y-2 rounded-2xl bg-surface-2 p-3 text-[13px]">
              {env.ios ? (
                <>
                  {step(Share, "Tap Share in your browser bar")}
                  {step(SquarePlus, "Choose Add to Home Screen")}
                </>
              ) : (
                <>
                  {step(EllipsisVertical, "Open your browser menu")}
                  {step(SquarePlus, "Tap Install app or Add to Home screen")}
                </>
              )}
            </ol>
          )}
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" onClick={later} className="flex-1">
              Later
            </Button>
            {mode === "install" && event && (
              <Button onClick={install} className="flex-1">
                <Download className="size-4" /> Install
              </Button>
            )}
            {mode === "push" && (
              <Button onClick={enable} disabled={busy} className="flex-1">
                {busy ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />} Turn on
              </Button>
            )}
          </div>
          <button type="button" onClick={never} className="mt-2 w-full text-center text-xs text-faint underline-offset-2 hover:text-muted hover:underline">
            Don&apos;t remind me again
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
