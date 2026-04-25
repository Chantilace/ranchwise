/* eslint-disable react-refresh/only-export-components -- shared cells + helpers live with table */
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Info } from "lucide-react"
import type { ReactNode } from "react"
import { CattleRosterObservationCell } from "@/components/CattleRosterObservationCell"
import {
  rosterObservationColumnWidthClass,
  ROSTER_OBSERVATION_COLUMN_PX,
} from "@/components/ObservationTableActionsCell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RichText } from "@/components/RichText"
import { calvingStatusBadgeClassAndLabel, getCalvingStatus } from "@/lib/calvingStatus"
import { getDueDateVariant } from "@/lib/calvingRichTextVariants"
import { isCattlePregnancyCheckNA } from "@/lib/cattlePregnancyCheck"
import { formatDueDateLabel } from "@/lib/cattleUi"
import type { CattleSortKey } from "@/lib/cattleRosterQuery"
import type { Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"
import { RosterCareDateCell } from "@/components/RosterCareDateCell"
import { getStatusBadgeClass } from "@/lib/statusUtils"
import { cn } from "@/lib/utils"

/** Due date cell — shared by pasture roster and herd “All” table (Figma 45:1797). */
export function CattleDueDateCell({ row }: { row: Cattle }) {
  if (row.calvingStatus === "calved" && row.calvingDate) {
    return (
      <RichText variant="info" icon={Check} iconSide="left" className="text-sm">
        {formatDueDateLabel(row.calvingDate)}
      </RichText>
    )
  }
  if (row.calvingStatus === "calved" || row.calvingStatus === "complications" || !row.dueDate) {
    return <span className="text-sm text-muted-foreground">—</span>
  }
  const label = formatDueDateLabel(row.dueDate)
  const eff = getCalvingStatus(row)
  const dueVariant = getDueDateVariant(
    eff === "calving-soon" ? "Calving soon" : "muted"
  )
  return (
    <RichText variant={dueVariant} icon={Info} iconSide="left" className="text-sm">
      {label}
    </RichText>
  )
}

export function calvingStatusPill(c: Cattle) {
  const result = calvingStatusBadgeClassAndLabel(c)
  if (!result) return null
  return <span className={result.className}>{result.label}</span>
}

function CattleSortHeader({
  children,
  className,
  column,
  sortKey,
  sortDir,
  onSort,
  hidden,
}: {
  children: ReactNode
  className?: string
  column: CattleSortKey
  sortKey: CattleSortKey
  sortDir: "asc" | "desc"
  onSort: (column: CattleSortKey) => void
  hidden?: boolean
}) {
  if (hidden) {
    return (
      <TableHead
        scope="col"
        className={cn(
          "h-14 border-b border-neutral-200 bg-[var(--muted)] font-medium whitespace-nowrap text-foreground",
          className
        )}
      >
        {children}
      </TableHead>
    )
  }
  const active = sortKey === column
  return (
    <TableHead
      scope="col"
      className={cn(
        "h-14 border-b border-neutral-200 bg-[var(--muted)] font-medium whitespace-nowrap text-foreground",
        className
      )}
    >
      <button
        type="button"
        className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md py-1 pr-1 text-left outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40"
        onClick={(e) => {
          e.stopPropagation()
          onSort(column)
        }}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{children}</span>
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="size-4 shrink-0 text-foreground" aria-hidden />
          ) : (
            <ArrowDown className="size-4 shrink-0 text-foreground" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        )}
      </button>
    </TableHead>
  )
}

export type CattleRosterTableProps = {
  rows: Cattle[]
  /** When true, adds a sortable Pasture column after Age. */
  showPastureColumn: boolean
  pastureNames: Record<string, string>
  sortKey: CattleSortKey
  sortDir: "asc" | "desc"
  onSort: (column: CattleSortKey) => void
  onRowClick: (row: Cattle) => void
  /** Highlights the active row when a slide-over is open. */
  selectedCattleId?: string | null
  /** When set, + opens cattle panel on detail; ⋯ edit opens embedded log (global modal if unset). */
  onOpenObservationLog?: (row: Cattle, initialObservation: ObservationEntry | null) => void
  /** Desktop: light tint on scrollable columns so the sticky Observation column reads as the focus (e.g. panel open). */
  emphasizeObservationColumn?: boolean
  emptyState?: {
    title: string
    description: string
    action?: ReactNode
  }
}

export function CattleRosterTable({
  rows,
  showPastureColumn,
  pastureNames,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  selectedCattleId = null,
  onOpenObservationLog,
  emphasizeObservationColumn = false,
  emptyState,
}: CattleRosterTableProps) {
  const colSpan = showPastureColumn ? 13 : 12
  return (
    <Table
      className="border-separate border-spacing-0"
      dimScrollportExceptRightPx={
        emphasizeObservationColumn ? ROSTER_OBSERVATION_COLUMN_PX : undefined
      }
    >
      <TableHeader>
        <TableRow className="border-neutral-200 hover:bg-transparent">
            <CattleSortHeader column="tag" sortKey={sortKey} sortDir={sortDir} onSort={onSort}>
              Tag #
            </CattleSortHeader>
            <CattleSortHeader column="healthStatus" sortKey={sortKey} sortDir={sortDir} onSort={onSort}>
              Status
            </CattleSortHeader>
            <CattleSortHeader
              column="calvingStatus"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            >
              Calving status
            </CattleSortHeader>
            <CattleSortHeader column="dueDate" sortKey={sortKey} sortDir={sortDir} onSort={onSort}>
              Due date
            </CattleSortHeader>
            <CattleSortHeader column="breed" sortKey={sortKey} sortDir={sortDir} onSort={onSort}>
              Breed
            </CattleSortHeader>
            <CattleSortHeader column="age" sortKey={sortKey} sortDir={sortDir} onSort={onSort}>
              Age
            </CattleSortHeader>
            {showPastureColumn ? (
              <CattleSortHeader column="pasture" sortKey={sortKey} sortDir={sortDir} onSort={onSort}>
                Pasture
              </CattleSortHeader>
            ) : null}
            <CattleSortHeader column="lastObs" sortKey={sortKey} sortDir={sortDir} onSort={onSort}>
              Last obs
            </CattleSortHeader>
            <CattleSortHeader column="lastVax" sortKey={sortKey} sortDir={sortDir} onSort={onSort}>
              Last vax
            </CattleSortHeader>
            <CattleSortHeader column="lastDeworm" sortKey={sortKey} sortDir={sortDir} onSort={onSort}>
              Last deworm
            </CattleSortHeader>
            <CattleSortHeader column="lastPregCheck" sortKey={sortKey} sortDir={sortDir} onSort={onSort}>
              Last preg check
            </CattleSortHeader>
            <CattleSortHeader column="lastBranding" sortKey={sortKey} sortDir={sortDir} onSort={onSort}>
              Last branding
            </CattleSortHeader>
          <TableHead
            scope="col"
            className={cn(
              "sticky right-0 z-20 h-14 border-b border-l border-neutral-200 bg-background px-2 text-left text-sm font-medium whitespace-nowrap text-foreground shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.12)]",
              rosterObservationColumnWidthClass
            )}
          >
            Observation
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && emptyState ? (
          <TableRow className="border-neutral-200 hover:bg-transparent">
            <TableCell colSpan={colSpan} className="h-32 border-b-0 bg-white text-center align-middle">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium text-foreground">{emptyState.title}</p>
                <p className="text-sm text-muted-foreground">{emptyState.description}</p>
                {emptyState.action ? emptyState.action : null}
              </div>
            </TableCell>
          </TableRow>
        ) : null}
        {rows.map((row) => {
          const selected = selectedCattleId === row.id
          const cellBg = cn(
            "h-16 border-b border-neutral-200 group-hover:bg-muted/50",
            selected ? "bg-action/10 group-hover:bg-action/10" : "bg-white"
          )
          return (
            <TableRow
              key={row.id}
              className="group cursor-pointer border-neutral-200"
              onClick={() => onRowClick(row)}
            >
              <TableCell className={cn(cellBg, "font-medium tabular-nums text-foreground")}>
                {row.tagNumber}
              </TableCell>
              <TableCell className={cellBg}>
                {row.healthStatus === "Flag" ? (
                  <span className={getStatusBadgeClass("flag")}>Flag</span>
                ) : row.healthStatus === "Monitor" ? (
                  <span className={getStatusBadgeClass("monitor")}>Monitor</span>
                ) : null}
              </TableCell>
              <TableCell className={cellBg}>{calvingStatusPill(row)}</TableCell>
              <TableCell className={cellBg}>
                <CattleDueDateCell row={row} />
              </TableCell>
              <TableCell className={cn(cellBg, "text-sm text-muted-foreground")}>
                {row.breed}
              </TableCell>
              <TableCell className={cn(cellBg, "text-foreground")}>
                {row.age} yrs
              </TableCell>
              {showPastureColumn ? (
                <TableCell className={cn(cellBg, "text-sm text-foreground")}>
                  {pastureNames[row.pastureId] ?? row.pastureId}
                </TableCell>
              ) : null}
              <TableCell className={cn(cellBg, "text-sm text-muted-foreground")}>
                {row.lastObservation ?? "—"}
              </TableCell>
              <TableCell className={cellBg}>
                <RosterCareDateCell iso={row.lastVaccinationAt} />
              </TableCell>
              <TableCell className={cellBg}>
                <RosterCareDateCell iso={row.lastDewormingAt} />
              </TableCell>
              <TableCell className={cellBg}>
                <RosterCareDateCell
                  iso={isCattlePregnancyCheckNA(row) ? null : row.lastPregnancyCheckAt}
                />
              </TableCell>
              <TableCell className={cellBg}>
                <RosterCareDateCell iso={row.lastBrandingAt} />
              </TableCell>
              <TableCell
                className={cn(
                  "sticky right-0 z-10 h-16 border-b border-l border-neutral-200 bg-background p-0 shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.12)]",
                  rosterObservationColumnWidthClass
                )}
              >
                <CattleRosterObservationCell row={row} onOpenObservationLog={onOpenObservationLog} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
