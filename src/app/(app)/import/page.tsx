"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImportFlow } from "@/components/import/ImportFlow";
import { ExportCard } from "@/components/import/ExportCard";
import type { AppId } from "@/lib/import/parse";

const APPS: AppId[] = ["strong", "hevy", "lyfta", "macrofactor"];

function Page() {
  const router = useRouter();
  const app = useSearchParams().get("app") as AppId | null;
  return (
    <div className="board-grid min-h-full px-4 pb-10 pt-6 sm:px-8 sm:pt-8">
      <ImportFlow initialApp={app && APPS.includes(app) ? app : null} onExit={() => router.push("/")} />
      <ExportCard />
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
