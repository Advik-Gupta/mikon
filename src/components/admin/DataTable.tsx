"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "../ui";

export function DataTable<T>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPage,
  onPageSize,
  sorting,
  onSorting,
  loading,
  onRow,
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize?: (n: number) => void;
  sorting?: SortingState;
  onSorting?: (s: SortingState) => void;
  loading?: boolean;
  onRow?: (row: T) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: pages,
    state: { sorting: sorting ?? [] },
    onSortingChange: (u) => onSorting?.(typeof u === "function" ? u(sorting ?? []) : u),
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line bg-surface-2/50 text-left text-[11px] uppercase tracking-[0.1em] text-faint">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sort = h.column.getIsSorted();
                  return (
                    <th key={h.id} className="whitespace-nowrap px-4 py-3 font-semibold">
                      {h.column.getCanSort() && onSorting ? (
                        <button type="button" onClick={h.column.getToggleSortingHandler()} className="flex items-center gap-1 hover:text-ink">
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          {sort === "asc" ? <ArrowUp className="size-3" /> : sort === "desc" ? <ArrowDown className="size-3" /> : null}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className={cn("divide-y divide-line transition", loading && "opacity-50")}>
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} onClick={() => onRow?.(r.original)} className={cn(onRow && "cursor-pointer hover:bg-surface-2/60")}>
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="whitespace-nowrap px-4 py-2.5 align-middle">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!data.length && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-muted">
                  {loading ? <Loader2 className="mx-auto size-5 animate-spin" /> : "Nothing here yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-xs text-muted">
        <span>
          {total ? `${(page * pageSize + 1).toLocaleString()}–${Math.min(total, (page + 1) * pageSize).toLocaleString()} of ${total.toLocaleString()}` : "0 results"}
        </span>
        <div className="flex items-center gap-2">
          {onPageSize && (
            <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="h-8 rounded-lg border border-line bg-surface-2 px-2 outline-none">
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
          )}
          <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} className="flex size-8 items-center justify-center rounded-lg border border-line disabled:opacity-30" aria-label="Previous page">
            <ChevronLeft className="size-4" />
          </button>
          <span className="tabular-nums">
            {page + 1} / {pages}
          </span>
          <button type="button" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} className="flex size-8 items-center justify-center rounded-lg border border-line disabled:opacity-30" aria-label="Next page">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
