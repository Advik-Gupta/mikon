"use client";

import Link from "next/link";
import { ArrowRight, Layers, Plus, Trash2 } from "lucide-react";
import { deleteProgram } from "@/lib/programs";
import { usePrograms } from "@/lib/storage";
import { MiniBoard, programMeta } from "@/components/builder/ProgramPreview";

export default function ProgramsPage() {
  const programs = usePrograms() ?? [];

  return (
    <div className="board-grid min-h-full">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Programs</h2>
            <p className="mt-1 text-sm text-muted">Every training program you&apos;ve built. Drafts save automatically.</p>
          </div>
          <Link
            href="/programs/new"
            className="flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-ink transition hover:bg-[#d4ff4a]"
          >
            <Plus className="size-4" strokeWidth={2.5} /> New program
          </Link>
        </div>

        {programs.length === 0 ? (
          <Link
            href="/programs/new"
            className="group flex flex-col items-center justify-center rounded-3xl border border-dashed border-line-strong bg-bg/60 px-6 py-20 text-center transition hover:border-accent/60 hover:bg-accent/[0.03]"
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted transition group-hover:bg-accent group-hover:text-accent-ink">
              <Layers className="size-6" />
            </span>
            <p className="mt-5 font-display text-xl font-semibold">No programs yet</p>
            <p className="mt-1.5 max-w-sm text-sm text-muted">Build your first program. It will be tailored to the profile you just set up.</p>
          </Link>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => {
              const meta = programMeta(p);
              return (
                <div key={p.id} className="group relative flex flex-col rounded-2xl border border-line bg-surface p-5 transition hover:border-line-strong">
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-display text-lg font-semibold">{p.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{meta.major.join(" · ") || "No goals yet"}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[10px] font-medium text-warn">Draft</span>
                  </div>
                  <MiniBoard program={p} />
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>{meta.stepLabel}</span>
                      <span>{meta.cycle ?? ""}</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${meta.progress * 100}%` }} />
                    </div>
                  </div>
                  <div className="mt-5 flex items-center gap-2">
                    <Link
                      href={`/programs/${p.id}`}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-2 text-sm font-medium transition hover:border-line-strong hover:bg-surface-3"
                    >
                      Continue <ArrowRight className="size-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => window.confirm(`Delete "${p.name}"? This can't be undone.`) && deleteProgram(p.id)}
                      className="flex size-9 items-center justify-center rounded-xl text-faint transition hover:bg-danger/10 hover:text-danger"
                      aria-label={`Delete ${p.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <p className="mt-3 text-[11px] text-faint">Edited {new Date(p.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
