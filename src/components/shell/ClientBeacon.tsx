"use client";

import { useEffect } from "react";
import { useSessionUser } from "@/lib/storage";

const KEY = "mikon.client-sent";

export function ClientBeacon() {
  const user = useSessionUser();
  const id = user?.id;
  useEffect(() => {
    if (!id) return;
    const today = new Date().toISOString().slice(0, 10);
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const stamp = `${id}:${today}:${standalone ? 1 : 0}`;
    try {
      if (localStorage.getItem(KEY) === stamp) return;
    } catch {}
    const t = setTimeout(() => {
      fetch("/api/me/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          standalone,
          width: Math.round(screen.width),
          height: Math.round(screen.height),
          lang: navigator.language.slice(0, 20),
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone?.slice(0, 60) ?? "",
          push: "Notification" in window ? Notification.permission : "unsupported",
        }),
      })
        .then((r) => {
          if (r.ok) localStorage.setItem(KEY, stamp);
        })
        .catch(() => null);
    }, 4000);
    return () => clearTimeout(t);
  }, [id]);
  return null;
}
