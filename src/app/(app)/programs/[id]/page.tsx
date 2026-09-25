"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SearchX } from "lucide-react";
import { Builder } from "@/components/builder/Builder";
import { useProgram } from "@/lib/programs";

export default function ProgramPage() {
  const { id } = useParams<{ id: string }>();
  const program = useProgram(id);

  if (program === undefined) return null;
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
  return <Builder program={program} />;
}
