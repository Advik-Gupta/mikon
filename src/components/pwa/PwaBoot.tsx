"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa";

export function PwaBoot() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
