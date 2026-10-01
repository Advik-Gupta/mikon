"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Loader2, Send } from "lucide-react";
import { apiSend, useApi, type UserCard } from "@/lib/api";
import { updateProgram } from "@/lib/programs";
import type { Program } from "@/lib/types";
import { Modal } from "../Modal";
import { UserAvatar } from "../shell/Avatar";
import { VisibilityPicker } from "../social/VisibilityPicker";
import { toast } from "../Toaster";
import { Button, cn, Textarea } from "../ui";

export function ShareModal({ program, open, onClose }: { program: Program; open: boolean; onClose: () => void }) {
  const { data } = useApi<{ friends: UserCard[] }>(open ? "/api/friends" : null);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const friends = data?.friends ?? [];

  const send = async () => {
    setBusy(true);
    try {
      const { sent } = await apiSend<{ sent: number }>("POST", "/api/shares", { programId: program.id, to: picked, note });
      toast({ tone: "success", title: `Sent to ${sent} friend${sent === 1 ? "" : "s"}` });
      setPicked([]);
      setNote("");
      onClose();
    } catch (e) {
      toast({ tone: "warn", title: "Couldn't share", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share program" subtitle={program.name} className="max-w-lg">
      <section>
        <h3 className="text-sm font-semibold">On your profile</h3>
        <p className="mb-3 text-xs text-muted">Who can find this program on your public profile.</p>
        <VisibilityPicker value={program.visibility ?? "private"} onChange={(visibility) => updateProgram(program.id, (p) => ({ ...p, visibility }))} />
      </section>

      <section className="mt-6 border-t border-line pt-5">
        <h3 className="text-sm font-semibold">Send to friends</h3>
        <p className="mb-3 text-xs text-muted">They get a notification and can save their own copy.</p>
        {!data ? (
          <Loader2 className="size-4 animate-spin text-muted" />
        ) : friends.length === 0 ? (
          <p className="text-sm text-muted">
            No friends yet.{" "}
            <Link href="/friends?tab=find" className="text-accent hover:underline">
              Find people
            </Link>
          </p>
        ) : (
          <>
            <div className="scrollbar-thin max-h-56 space-y-1 overflow-y-auto">
              {friends.map((f) => {
                const on = picked.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPicked((p) => (on ? p.filter((x) => x !== f.id) : [...p, f.id]))}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition", on ? "bg-accent/10" : "hover:bg-surface-2")}
                  >
                    <UserAvatar name={f.name} src={f.avatarUrl} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{f.name}</span>
                      <span className="block truncate text-xs text-muted">@{f.username}</span>
                    </span>
                    <span className={cn("flex size-5 items-center justify-center rounded-md border", on ? "border-accent bg-accent text-accent-ink" : "border-line-strong")}>
                      {on && <Check className="size-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            <Textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, 280))} placeholder="Add a note (optional)" className="mt-3 min-h-16" />
            <Button onClick={send} disabled={!picked.length || busy} className="mt-3 w-full">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send{picked.length ? ` to ${picked.length}` : ""}
            </Button>
          </>
        )}
      </section>
    </Modal>
  );
}
