"use client";

import { useParams } from "next/navigation";
import { useApi, type UserCard } from "@/lib/api";
import type { Program } from "@/lib/types";
import { ForeignProgram, ProgramMissing } from "@/components/program/ForeignProgram";

export default function FriendProgramPage() {
  const { username, id } = useParams<{ username: string; id: string }>();
  const { data, error, loading } = useApi<{ owner: UserCard; program: Program }>(`/api/users/${username.toLowerCase()}/programs/${id}`);
  if (loading) return null;
  if (error || !data) return <ProgramMissing text="It may be private or no longer shared." />;
  return <ForeignProgram program={data.program} owner={data.owner} />;
}
