import * as React from "react"

import { cn } from "@/lib/utils"

/** Outer shell for all app tables — single border, rounded corners, clip; corner radii on corner cells. */
export const RANCH_TABLE_SHELL_CLASS =
  "rounded-[12px] border-[0.5px] border-border overflow-hidden " +
  "[&_thead_tr_th:first-child]:rounded-tl-[12px] [&_thead_tr_th:first-child]:!pl-[20px] " +
  "[&_thead_tr_th:last-child]:rounded-tr-[12px] " +
  "[&_tbody_tr:last-child_td:first-child]:rounded-bl-[12px] [&_tbody_tr_td:first-child]:!pl-[20px] " +
  "[&_tbody_tr:last-child_td:last-child]:rounded-br-[12px] " +
  "[&_tbody_tr:last-child_td]:border-b-0"

type TableProps = React.ComponentProps<"table"> & {
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
  containerClassName,
  shellClassName,
  dimScrollportExceptRightPx,
  ...props
}: TableProps) {
  const dimRight = dimScrollportExceptRightPx
  const tableEl = (
    <table
      data-slot="table"
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  )

  return (
    <div data-slot="table-shell" className={cn(RANCH_TABLE_SHELL_CLASS, shellClassName)}>
      <div
        data-slot="table-container"
        className={cn("relative w-full overflow-x-auto", containerClassName)}
      >
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
