"use client";

import { useParams } from "next/navigation";
import { useApi, type UserCard } from "@/lib/api";
import type { Program } from "@/lib/types";
import { ForeignProgram, ProgramMissing } from "@/components/program/ForeignProgram";

export default function SharedProgramPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading } = useApi<{ from: UserCard; note: string; program: Program }>(`/api/shares/${id}`, 60_000);
  if (loading) return null;
  if (error || !data?.from) return <ProgramMissing text="This share link isn't for you or no longer exists." />;
  return (
    <ForeignProgram
      program={data.program}
      owner={data.from}
      note={data.note ? <p className="mt-2 max-w-xl rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-sm italic text-ink/85">&ldquo;{data.note}&rdquo;</p> : null}
    />
  );
}
