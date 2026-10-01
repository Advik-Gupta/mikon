"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Copy, SearchX } from "lucide-react";
import type { UserCard } from "@/lib/api";
import { copyProgram } from "@/lib/programs";
import { useProfile } from "@/lib/storage";
import type { Program } from "@/lib/types";
import { UserAvatar } from "../shell/Avatar";
import { toast } from "../Toaster";
import { Button } from "../ui";
import { ProgramView } from "./ProgramView";

export function ProgramMissing({ text }: { text: string }) {
  return (
    <div className="board-grid flex min-h-full flex-col items-center justify-center p-8 text-center">
      <SearchX className="size-8 text-faint" />
      <p className="mt-4 font-display text-xl font-semibold">Program not available</p>
      <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>
      <Link href="/" className="mt-5 text-sm text-accent hover:underline">
        Back home
      </Link>
    </div>
  );
}

export function ForeignProgram({ program, owner, note }: { program: Program; owner: UserCard; note?: ReactNode }) {
  const profile = useProfile();
  const router = useRouter();
  const save = () => {
    const copy = copyProgram(program);
    toast({ tone: "success", title: "Saved to your programs", message: "It's yours now. Edit it however you like." });
    router.push(`/programs/${copy.id}`);
  };
  return (
    <ProgramView
      program={{ ...program, activeFrom: program.activeFrom ?? null }}
      sex={profile?.personal.sex === "female" ? "female" : "male"}
      units={profile?.body.units ?? "metric"}
      byline={
        <div className="mt-2">
          <Link href={`/u/${owner.username}`} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
            <UserAvatar name={owner.name} src={owner.avatarUrl} size={22} />
            by <span className="font-medium text-ink">{owner.name}</span>
          </Link>
          {note}
        </div>
      }
      actions={
        <Button onClick={save}>
          <Copy className="size-4" /> Save a copy
        </Button>
      }
    />
  );
}
