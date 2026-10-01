"use client";

import { useState } from "react";
import { CalendarCheck } from "lucide-react";
import { activateProgram, activeProgram, toISODate } from "@/lib/programs";
import { usePrograms } from "@/lib/storage";
import type { Program } from "@/lib/types";
import { Modal } from "../Modal";
import { toast } from "../Toaster";
import { Button } from "../ui";

export function StartModal({ program, open, onClose }: { program: Program; open: boolean; onClose: () => void }) {
  const current = activeProgram(usePrograms());
  const today = toISODate(new Date());
  const [date, setDate] = useState(program.structure.startDate < today ? today : program.structure.startDate);

  const start = () => {
    activateProgram(program.id, date);
    toast({ tone: "success", title: `${program.name} is scheduled`, message: "Each day's training will show up on your home page." });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Start this program"
      subtitle="Pick the day you want day one to land on."
      className="max-w-md"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={start} disabled={!date}>
            <CalendarCheck className="size-4" /> Start program
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap gap-2">
        {[0, 1, 7].map((offset) => {
          const d = new Date();
          d.setDate(d.getDate() + offset);
          const iso = toISODate(d);
          return (
            <button
              key={offset}
              type="button"
              onClick={() => setDate(iso)}
              className={`rounded-xl border px-3 py-1.5 text-sm transition ${date === iso ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-ink"}`}
            >
              {offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : "In a week"}
            </button>
          );
        })}
      </div>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mt-3 h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-sm outline-none focus:border-accent/60"
      />
      {current && current.id !== program.id && (
        <p className="mt-4 rounded-xl border border-warn/30 bg-warn/10 px-3.5 py-2.5 text-sm text-warn">This replaces &ldquo;{current.name}&rdquo; as your active program.</p>
      )}
    </Modal>
  );
}
