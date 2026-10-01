"use client";

import { useState } from "react";
import { Check, Clock, Loader2, UserCheck, UserMinus, UserPlus, X } from "lucide-react";
import { apiSend, revalidate, type Relation } from "@/lib/api";
import { toast } from "../Toaster";
import { Button, cn } from "../ui";

export function FriendButton({ userId, name, relation, onChange, compact }: { userId: string; name: string; relation: Relation; onChange?: (r: Relation) => void; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [rel, setRel] = useState(relation);
  const [prevRelation, setPrevRelation] = useState(relation);
  if (relation !== prevRelation) {
    setPrevRelation(relation);
    setRel(relation);
  }

  const run = async (fn: () => Promise<{ relation: Relation }>, done?: string) => {
    setBusy(true);
    try {
      const { relation: next } = await fn();
      setRel(next);
      onChange?.(next);
      revalidate("/api/friends");
      revalidate("/api/users");
      if (done) toast({ tone: "success", title: done });
    } catch (e) {
      toast({ tone: "warn", title: "Something went wrong", message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const add = () => run(() => apiSend("POST", "/api/friends", { userId }), `Friend request sent to ${name}`);
  const remove = () => run(() => apiSend("DELETE", `/api/friends/${userId}`));
  const respond = (action: "accept" | "decline") =>
    run(() => apiSend("PATCH", `/api/friends/${userId}`, { action }), action === "accept" ? `You and ${name} are now friends` : undefined);
  const size = compact ? "h-9 px-3 text-[13px]" : "";

  if (rel === "self") return null;
  if (busy)
    return (
      <Button variant="secondary" disabled className={size}>
        <Loader2 className="size-4 animate-spin" />
      </Button>
    );
  if (rel === "incoming")
    return (
      <div className="flex gap-1.5">
        <Button onClick={() => respond("accept")} className={size}>
          <Check className="size-4" strokeWidth={2.5} /> Accept
        </Button>
        <Button variant="secondary" onClick={() => respond("decline")} className={cn(size, "px-2.5")} aria-label="Decline">
          <X className="size-4" />
        </Button>
      </div>
    );
  if (rel === "outgoing")
    return (
      <Button variant="secondary" onClick={remove} className={cn(size, "group")} title="Cancel request">
        <Clock className="size-4 group-hover:hidden" />
        <X className="hidden size-4 group-hover:block" />
        <span className="group-hover:hidden">Requested</span>
        <span className="hidden group-hover:inline">Cancel</span>
      </Button>
    );
  if (rel === "friends")
    return (
      <Button
        variant="secondary"
        onClick={() => window.confirm(`Remove ${name} from your friends?`) && remove()}
        className={cn(size, "group hover:border-danger/40 hover:text-danger")}
      >
        <UserCheck className="size-4 group-hover:hidden" />
        <UserMinus className="hidden size-4 group-hover:block" />
        <span className="group-hover:hidden">Friends</span>
        <span className="hidden group-hover:inline">Remove</span>
      </Button>
    );
  return (
    <Button onClick={add} className={size}>
      <UserPlus className="size-4" /> Add friend
    </Button>
  );
}
