"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createProgram } from "@/lib/programs";
import { readStored, KEYS } from "@/lib/storage";
import type { Profile } from "@/lib/types";

/** Creates a draft program and hands off to the builder. */
export default function NewProgramPage() {
  const router = useRouter();
  const created = useRef(false);

  useEffect(() => {
    if (created.current) return;
    created.current = true;
    const program = createProgram(readStored<Profile>(KEYS.profile));
    router.replace(`/programs/${program.id}`);
  }, [router]);

  return null;
}
