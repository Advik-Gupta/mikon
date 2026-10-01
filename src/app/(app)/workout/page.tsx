"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { openStartSheet, readWorkout, updateWorkout } from "@/lib/tracker";

export default function WorkoutPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
    const t = setTimeout(() => (readWorkout() ? updateWorkout((w) => ({ ...w, minimized: false })) : openStartSheet()), 300);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}
