"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "./graphics/Logo";
import { hydrate } from "@/lib/storage";

export function useSession() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    hydrate().then((r) => {
      if (!live) return;
      if (r === "unauthorized") router.replace("/login");
      else setStatus(r === "ok" ? "ready" : "error");
    });
    return () => {
      live = false;
    };
  }, [router, attempt]);

  return { status, retry: () => (setStatus("loading"), setAttempt((a) => a + 1)) };
}

export function SessionScreen({ status, retry }: { status: "loading" | "ready" | "error"; retry: () => void }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4">
      <div className={status === "loading" ? "animate-pulse" : undefined}>
        <LogoMark size={40} />
      </div>
      {status === "error" && (
        <div className="text-center">
          <p className="text-sm text-muted">Couldn&apos;t reach the server.</p>
          <button type="button" onClick={retry} className="mt-2 text-sm font-medium text-accent hover:underline">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
