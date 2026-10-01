"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, CircleStop, Pencil, SearchX, Share2 } from "lucide-react";
import { ShareModal } from "@/components/program/ShareModal";
import { visibilityOf } from "@/components/social/VisibilityPicker";
import { ProgramView } from "@/components/program/ProgramView";
import { StartModal } from "@/components/program/StartModal";
import { Button } from "@/components/ui";
import { deactivateProgram, programDayOn, useProgram } from "@/lib/programs";
import { setTutorial, useProfile, useSessionUser } from "@/lib/storage";
import { CongratsModal } from "@/components/program/CongratsModal";

function ProgramPageInner() {
  const { id } = useParams<{ id: string }>();
  const program = useProgram(id);
  const profile = useProfile();
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const welcome = useSearchParams().get("welcome") === "1";
  const user = useSessionUser();
  const closeWelcome = () => {
    if (user) setTutorial({ ...user.tutorial, guides: [...new Set([...(user.tutorial.guides ?? []), "first-program"])] });
    router.replace(`/programs/${id}`);
  };

  useEffect(() => {
    if (program?.status === "draft") router.replace(`/programs/${id}/edit`);
  }, [program?.status, id, router]);

  if (program === undefined || program?.status === "draft") return null;
  if (program === null) {
    return (
      <div className="board-grid flex min-h-full flex-col items-center justify-center p-8 text-center">
        <SearchX className="size-8 text-faint" />
        <p className="mt-4 font-display text-xl font-semibold">Program not found</p>
        <p className="mt-1 text-sm text-muted">It may have been deleted.</p>
        <Link href="/programs" className="mt-5 text-sm text-accent hover:underline">
          Back to programs
        </Link>
      </div>
    );
  }

  const state = programDayOn(program, new Date())?.state;
  const live = state === "running" || state === "upcoming";

  return (
    <>
      <ProgramView
        program={program}
        sex={profile?.personal.sex === "female" ? "female" : "male"}
        units={profile?.body.units ?? "metric"}
        actions={
          <>
            <Button variant="secondary" onClick={() => setSharing(true)} title={`Visible to: ${visibilityOf(program.visibility).label}`}>
              <Share2 className="size-4" /> Share
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/programs/${id}/edit`)}>
              <Pencil className="size-4" /> Edit
            </Button>
            {live ? (
              <Button variant="ghost" onClick={() => window.confirm(`Stop "${program.name}"? It stays saved and you can start it again.`) && deactivateProgram(id)}>
                <CircleStop className="size-4" /> Stop
              </Button>
            ) : (
              <Button onClick={() => setStarting(true)}>
                <CalendarCheck className="size-4" /> Start program
              </Button>
            )}
          </>
        }
      />
      <StartModal key={String(starting)} program={program} open={starting} onClose={() => setStarting(false)} />
      <ShareModal program={program} open={sharing} onClose={() => setSharing(false)} />
      <CongratsModal open={welcome} onClose={closeWelcome} name={program.name} />
    </>
  );
}

export default function ProgramPage() {
  return (
    <Suspense>
      <ProgramPageInner />
    </Suspense>
  );
}
