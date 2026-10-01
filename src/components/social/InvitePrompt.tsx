"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { apiSend, revalidate } from "@/lib/api";
import { setSessionUser, setTutorial, useProfile, useSessionUser } from "@/lib/storage";
import { UserAvatar } from "../shell/Avatar";
import { toast } from "../Toaster";
import { Sheet } from "../tracker/Sheet";
import { Button } from "../ui";

export const INVITE_ASKED = "invite-asked";

export function InvitePrompt() {
  const user = useSessionUser();
  const profile = useProfile();
  const [busy, setBusy] = useState(false);
  const guides = user?.tutorial.guides ?? [];
  const inviter = user?.invite;
  const open = !!user && !!profile && !!inviter && guides.includes("early-days") && !guides.includes(INVITE_ASKED);

  const answer = async (accept: boolean) => {
    if (!user || !inviter || busy) return;
    setBusy(true);
    try {
      await apiSend("POST", "/api/me/invite", { accept });
      if (accept) {
        revalidate("/api/friends");
        toast({ tone: "success", title: `You and ${inviter.name} are now friends` });
      }
    } catch {
      if (accept) toast({ tone: "warn", title: "Couldn't add them right now", message: "You can send a request from their profile." });
    }
    setSessionUser({ invite: null });
    setTutorial({ ...user.tutorial, guides: [...guides, INVITE_ASKED] });
    setBusy(false);
  };

  return (
    <Sheet open={open} onClose={() => answer(false)}>
      {inviter && (
        <div className="flex flex-col items-center px-5 pb-6 pt-4 text-center">
          <div className="relative">
            <UserAvatar name={inviter.name} src={inviter.avatarUrl} size={88} className="ring-4 ring-accent/30" />
            <span className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-4 border-surface bg-accent text-accent-ink">
              <UserPlus className="size-4" />
            </span>
          </div>
          <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">{inviter.name} invited you</h2>
          <p className="mt-1 text-sm text-faint">@{inviter.username}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">Add them as a friend to see each other&apos;s training, compare lifts and share programs.</p>
          <div className="mt-6 grid w-full gap-2">
            <Button className="h-12 rounded-full text-[15px]" disabled={busy} onClick={() => answer(true)}>
              <UserPlus className="size-4" /> Add {inviter.name.split(" ")[0]} as a friend
            </Button>
            <Button variant="ghost" className="h-11" disabled={busy} onClick={() => answer(false)}>
              Not now
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
