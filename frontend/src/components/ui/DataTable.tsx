"use client";

import { useState, type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/formatters";
import { SkeletonTableRows } from "./Skeleton";

export interface Column<T> {
  key: string;
  header: string;
  accessor?: keyof T;
  cell?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  keyExtractor: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  className?: string;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No data found",
  emptyIcon,
  keyExtractor,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((prev) =>
        prev === null ? "asc" : prev === "asc" ? "desc" : null
      );
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey || sortDir === null) return 0;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.accessor) return 0;
    const aVal = a[col.accessor];
    const bVal = b[col.accessor];
    if (aVal === bVal) return 0;
    const cmp = aVal < bVal ? -1 : 1;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const alignClass = (align: Column<T>["align"]) => {
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-left";
  };

  return (
    <div className={cn("overflow-x-auto rounded-xl border border-neutral-200", className)}>
      <table className="min-w-full divide-y divide-neutral-100">
        <thead>
          <tr className="bg-neutral-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wide whitespace-nowrap",
                  alignClass(col.align),
                  col.sortable && "cursor-pointer select-none hover:text-neutral-700",
                  col.headerClassName
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <span className="text-neutral-400">
                      {sortKey === col.key && sortDir === "asc" ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : sortKey === col.key && sortDir === "desc" ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3" />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 bg-white">
          {isLoading ? (
            <SkeletonTableRows rows={8} cols={columns.length} />
          ) : sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-16 text-center"
              >
                <div className="flex flex-col items-center gap-2 text-neutral-400">
                  {emptyIcon && <div className="mb-2">{emptyIcon}</div>}
                  <p className="text-sm font-medium text-neutral-500">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            sortedData.map((row, idx) => (
              <tr
                key={keyExtractor(row, idx)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-neutral-50"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-sm text-neutral-700 whitespace-nowrap",
                      alignClass(col.align),
                      col.className
                    )}
                  >
                    {col.cell
                      ? col.cell(row, idx)
                      : col.accessor
                      ? String(row[col.accessor] ?? "—")
                      : "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
