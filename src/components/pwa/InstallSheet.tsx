"use client";

import { Download, EllipsisVertical, Share, SquarePlus } from "lucide-react";
import { isIOS, promptInstall, useInstallEvent, useNeedsInstall } from "@/lib/pwa";
import { setTutorial, useProfile, useSessionUser } from "@/lib/storage";
import { LogoMark } from "../graphics/Logo";
import { Sheet } from "../tracker/Sheet";
import { Button } from "../ui";

export const INSTALL_ASKED = "install-asked";

function Step({ icon: Icon, children }: { icon: typeof Share; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-3">
        <Icon className="size-4.5 text-info" />
      </span>
      <span className="text-sm">{children}</span>
    </li>
  );
}

export function InstallSheet() {
  const user = useSessionUser();
  const profile = useProfile();
  const needs = useNeedsInstall();
  const event = useInstallEvent();
  const guides = user?.tutorial.guides ?? [];
  const open = !!user && !!profile && needs && !guides.includes(INSTALL_ASKED);
  const ios = needs && isIOS();

  const done = () => user && setTutorial({ ...user.tutorial, guides: [...guides, INSTALL_ASKED] });
  const install = async () => {
    if (await promptInstall()) done();
  };

  return (
    <Sheet open={open} onClose={done}>
      <div className="px-5 pb-6 pt-2">
        <LogoMark size={56} />
        <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">Put Mikon on your home screen</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          It opens full screen like a real app, keeps your rest timers running and can send you notifications. Takes ten seconds.
        </p>
        {event ? (
          <Button className="mt-5 h-12 w-full rounded-full text-[15px]" onClick={install}>
            <Download className="size-4" /> Install Mikon
          </Button>
        ) : (
          <ol className="mt-5 space-y-3 rounded-2xl border border-line bg-surface-2/50 p-4">
            {ios ? (
              <>
                <Step icon={Share}>
                  Tap <span className="font-semibold">Share</span> in your browser bar
                </Step>
                <Step icon={SquarePlus}>
                  Choose <span className="font-semibold">Add to Home Screen</span>
                </Step>
              </>
            ) : (
              <>
                <Step icon={EllipsisVertical}>
                  Open your browser&apos;s <span className="font-semibold">menu</span>
                </Step>
                <Step icon={SquarePlus}>
                  Tap <span className="font-semibold">Install app</span> or <span className="font-semibold">Add to Home screen</span>
                </Step>
              </>
            )}
            <li className="pl-12 text-xs text-muted">Then open Mikon from your home screen{ios ? " and sign in once" : ""}. Everything you&apos;ve set up comes with you.</li>
          </ol>
        )}
        <Button variant="ghost" className="mt-2 h-11 w-full" onClick={done}>
          {event ? "Maybe later" : "I'll do it later"}
        </Button>
      </div>
    </Sheet>
  );
}
