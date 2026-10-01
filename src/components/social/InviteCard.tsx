"use client";

import { useState } from "react";
import { Check, Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { useSessionUser } from "@/lib/storage";
import { toast } from "../Toaster";
import { cn } from "../ui";

export function useInviteLink() {
  const user = useSessionUser();
  if (typeof window === "undefined" || !user) return null;
  return `${window.location.origin}/signup?ref=${user.username}`;
}

const MESSAGE = "I'm planning my training on Mikon. Join me so we can see each other's programs and compare progress:";

export function InviteCard({ compact }: { compact?: boolean }) {
  const link = useInviteLink();
  const [copied, setCopied] = useState(false);
  if (!link) return null;
  const text = `${MESSAGE} ${link}`;
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  const copy = async () => {
    await navigator.clipboard.writeText(link).catch(() => null);
    setCopied(true);
    toast({ tone: "success", title: "Invite link copied" });
    setTimeout(() => setCopied(false), 2000);
  };
  const share = () => navigator.share({ title: "Join me on Mikon", text: MESSAGE, url: link }).catch(() => null);
  const btn = "flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium transition active:scale-[0.98]";

  return (
    <div className={cn(!compact && "rounded-2xl border border-line bg-surface p-4")}>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 py-1 pl-3 pr-1">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted">{link.replace(/^https?:\/\//, "")}</span>
        <button type="button" onClick={copy} className="flex h-8 items-center gap-1.5 rounded-lg bg-surface-3 px-2.5 text-xs font-medium hover:text-accent">
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className={cn("mt-3 grid gap-2", canShare ? "grid-cols-3" : "grid-cols-2")}>
        {canShare && (
          <button type="button" onClick={share} className={cn(btn, "bg-accent text-accent-ink")}>
            <Share2 className="size-4" /> Share
          </button>
        )}
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className={cn(btn, "bg-[#25d366] text-[#0a0b0d]")}>
          <MessageCircle className="size-4" /> WhatsApp
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent("Join me on Mikon")}&body=${encodeURIComponent(text)}`}
          className={cn(btn, "border border-line bg-surface-2 hover:border-line-strong")}
        >
          <Mail className="size-4" /> Email
        </a>
      </div>
      <p className="mt-3 text-[11px] text-faint">Anyone who joins with your link becomes your friend automatically.</p>
    </div>
  );
}
