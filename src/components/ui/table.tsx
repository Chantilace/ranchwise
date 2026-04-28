import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Outer shell: border, radius, `overflow-hidden` clips paint to rounded bounds.
 * Scroll lives on the inner `[data-slot=table-container]` (`overflow-auto`); sticky
 * `thead`/`th` stick to that inner scrollport, not the shell (see MDN: nearest scrollport).
 */
const RANCH_TABLE_SHELL_BASE =
  "flex flex-col overflow-hidden rounded-[12px] border-[0.5px] border-border bg-card " +
  "[&_thead_tr_th:first-child]:!pl-[20px] " +
  "[&_tbody_tr_td:first-child]:!pl-[20px] " +
  "[&_tbody_tr:last-child_td]:border-b-0"

/** Default: table fills flex parent and scrolls inside the shell (rosters). */
export const RANCH_TABLE_SHELL_CLASS = cn(RANCH_TABLE_SHELL_BASE, "min-h-0 flex-1")

type TableProps = React.ComponentProps<"table"> & {
  /**
   * `fill` (default): shell and scrollport use `flex-1` / `min-h-0` so the table fills a roster column.
   * `intrinsic`: height follows table rows; horizontal scroll only (e.g. pastures index).
   */
  tableLayout?: "fill" | "intrinsic"
  /** Classes for the scroll wrapper directly around `<table>` (e.g. flex-1 + overflow-y). */
  containerClassName?: string
  /** Optional override on the outer bordered shell (rare). */
  shellClassName?: string
  /**
   * When set (desktop `md+` only), a very light wash covers all table width except the right
   * `px` strip (sticky Observation column). Sized to the table’s intrinsic width so it scrolls
   * with horizontal overflow, not only the initially visible viewport.
   */
  dimScrollportExceptRightPx?: number
}

function Table({
  className,
  tableLayout = "fill",
  containerClassName,
  shellClassName,
  dimScrollportExceptRightPx,
  ...props
}: TableProps) {
  const dimRight = dimScrollportExceptRightPx
  const shellClass =
    tableLayout === "intrinsic" ? RANCH_TABLE_SHELL_BASE : RANCH_TABLE_SHELL_CLASS
  const containerBase =
    tableLayout === "intrinsic"
      ? "relative w-full overflow-x-auto"
      : "relative min-h-0 w-full flex-1 overflow-auto"
  const tableEl = (
    <table
      data-slot="table"
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  )

  return (
    <div data-slot="table-shell" className={cn(shellClass, shellClassName)}>
      <div data-slot="table-container" className={cn(containerBase, containerClassName)}>
        {dimRight != null ? (
          <div
            data-slot="table-intrinsic-wrap"
            className="relative inline-block min-w-full w-max align-top"
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-[1] hidden bg-foreground/[0.045] md:block"
              style={{ right: dimRight }}
              aria-hidden
            />
            {tableEl}
          </div>
        ) : (
          tableEl
        )}
      </div>
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-12 px-3 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "box-border h-16 max-h-16 px-2 py-0 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell }
