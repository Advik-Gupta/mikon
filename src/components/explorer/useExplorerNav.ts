"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { muscleById } from "@/data/muscles";
import { useProfile } from "@/lib/storage";
import type { Sex } from "@/lib/explorer";

/** Explorer state lives in the URL so it's shareable and works with the back button. */
export function useExplorerNav() {
  const router = useRouter();
  const params = useSearchParams();
  const profile = useProfile();

  const group = params.get("g");
  const muscle = params.get("m");
  const exercise = params.get("e");
  const sexParam = params.get("sex");
  const sex: Sex = sexParam === "female" || sexParam === "male" ? sexParam : profile?.personal.sex === "female" ? "female" : "male";

  const go = (next: Record<string, string | null>, replace = false) => {
    const p = new URLSearchParams();
    const merged = { g: group, m: muscle, e: exercise, sex: sexParam, ...next };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    const url = `/explorer${p.size ? `?${p}` : ""}`;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  };

  return {
    group,
    muscle,
    exercise,
    sex,
    home: () => go({ g: null, m: null, e: null }),
    openGroup: (g: string) => go({ g, m: null, e: null }),
    openMuscle: (m: string) => go({ g: muscleById(m)?.group ?? null, m, e: null }),
    openExercise: (e: string) => go({ e }),
    closeExercise: () => go({ e: null }),
    setSex: (s: Sex) => go({ sex: s }, true),
  };
}

export type ExplorerNav = ReturnType<typeof useExplorerNav>;
