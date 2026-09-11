"use client";

import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
  headClassName?: string;
}

/**
 * Presentational table shell. Horizontal overflow is scoped to the wrapper so a
 * wide table never widens the page on small screens.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  selectable,
  selectedIds,
  onToggle,
  onToggleAll,
  empty,
  rowClassName,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  selectable?: boolean;
  selectedIds?: string[];
  onToggle?: (id: string) => void;
  onToggleAll?: (ids: string[], next: boolean) => void;
  empty?: React.ReactNode;
  rowClassName?: (row: T) => string | undefined;
}) {
  const ids = rows.map(rowKey);
  const allSelected = Boolean(selectable && ids.length > 0 && ids.every((id) => selectedIds?.includes(id)));

  if (rows.length === 0 && empty) {
    return <div>{empty}</div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-200 bg-ink-50/70 text-left">
            {selectable && (
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  aria-label="Select all rows"
                  className="h-4 w-4 accent-teal-900"
                  checked={allSelected}
                  onChange={(e) => onToggleAll?.(ids, e.target.checked)}
                />
              </th>
            )}
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn(
                  "whitespace-nowrap px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500",
                  c.headClassName
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const id = rowKey(row);
            const selected = Boolean(selectedIds?.includes(id));
            return (
              <tr
                key={id}
                className={cn(
                  "border-b border-ink-100 transition-colors last:border-0 hover:bg-ink-50/60",
                  selected && "bg-teal-50/50",
                  rowClassName?.(row)
                )}
              >
                {selectable && (
                  <td className="px-3 py-3 align-middle">
                    <input
                      type="checkbox"
                      aria-label="Select row"
                      className="h-4 w-4 accent-teal-900"
                      checked={selected}
                      onChange={() => onToggle?.(id)}
                    />
                  </td>
                )}
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-3 py-3 align-middle text-ink-800", c.className)}>
                    {c.cell(row, i)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
