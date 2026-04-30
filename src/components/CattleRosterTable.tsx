/* eslint-disable react-refresh/only-export-components -- shared cells + helpers live with table */
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Info, NotebookPen } from "lucide-react"
import type { ReactNode } from "react"
import { RichText } from "@/components/RichText"
import { RosterCareDateCell } from "@/components/RosterCareDateCell"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useRanchData } from "@/contexts/RanchDataContext"
import { calvingStatusBadgeClassAndLabel, getCalvingStatus } from "@/lib/calvingStatus"
import { getDueDateVariant } from "@/lib/calvingRichTextVariants"
import { isCattlePregnancyCheckNA } from "@/lib/cattlePregnancyCheck"
import { getCattleEffectiveHealthRisk, getCattleLastObservationLabel } from "@/lib/cattleSelectors"
import { formatCattleTagDisplay, formatDueDateLabel } from "@/lib/cattleUi"
import { StatusBadge } from "@/components/StatusBadge"
import type { CattleRosterSortColumn } from "@/lib/cattleRosterQuery"
import { cn } from "@/lib/utils"
import type { Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"

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

/** Opaque hover so scrolled columns do not show through sticky cells. */
const CATTLE_ROSTER_STICKY_HOVER = "group-hover:bg-[var(--table-sticky-hover-bg)]"

/** Opaque fill aligned with `bg-action/10` over white so scrolled row content does not show through the sticky identity column. */
const CATTLE_ROSTER_STICKY_SELECTED_BG =
  "bg-[color-mix(in_srgb,var(--action)_10%,#ffffff)] group-hover:bg-[color-mix(in_srgb,var(--action)_10%,#ffffff)]"

const CATTLE_ROSTER_STICKY_W = "w-[200px] min-w-[200px] max-w-[200px]"

const CATTLE_ROSTER_STICKY_TD =
  `sticky left-0 z-10 h-16 ${CATTLE_ROSTER_STICKY_W} border-b border-neutral-200 py-2 pl-4 pr-3 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)]`

/** Shared `<th>` shell (overrides `TableHead` defaults). Identity adds only `left` stick + width. */
const CATTLE_ROSTER_TH_LAYOUT =
  "h-14 box-border border-b border-[var(--color-border-tertiary)] bg-secondary px-0 py-0 text-left align-middle text-[13px] font-normal leading-tight whitespace-nowrap text-foreground"
const CATTLE_ROSTER_TH_STICKY_BODY = "sticky top-0 z-10 shadow-[var(--shadow-sticky-scroll)]"
const CATTLE_ROSTER_TH_STICKY_IDENTITY =
  "sticky left-0 top-0 z-30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08),var(--shadow-sticky-scroll)]"

const ROSTER_SORT_ICON_SM = "size-3.5 shrink-0 stroke-2"

function CattleRosterSortableColumnHeader({
  children,
  className,
  hidden,
  stickyIdentity,
  rosterSortKey,
  sortColumn,
  sortDirection,
  onColumnSort,
}: {
  children: ReactNode
  className?: string
  hidden?: boolean
  stickyIdentity?: boolean
  rosterSortKey: CattleRosterSortColumn
  sortColumn: CattleRosterSortColumn
  sortDirection: "asc" | "desc"
  onColumnSort?: (column: CattleRosterSortColumn) => void
}) {
  const interactive = Boolean(onColumnSort)
  const active = sortColumn === rosterSortKey
  const showStrongArrow = active
  const showFaintSortHint = interactive && !active

  if (hidden) {
    return (
      <TableHead
        scope="col"
        className={cn(CATTLE_ROSTER_TH_LAYOUT, CATTLE_ROSTER_TH_STICKY_BODY, className)}
      >
        <span className="flex h-14 items-center px-3.5 text-muted-foreground">{children}</span>
      </TableHead>
    )
  }
  return (
    <TableHead
      scope="col"
      className={cn(
        CATTLE_ROSTER_TH_LAYOUT,
        stickyIdentity ? cn(CATTLE_ROSTER_TH_STICKY_IDENTITY, CATTLE_ROSTER_STICKY_W) : CATTLE_ROSTER_TH_STICKY_BODY,
        className
      )}
      aria-sort={
        showStrongArrow
          ? sortDirection === "asc"
            ? "ascending"
            : "descending"
          : interactive
            ? "none"
            : undefined
      }
    >
      {interactive ? (
        <button
          type="button"
          className={cn(
            "group flex h-14 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-sm px-3.5 text-left text-[13px] transition-colors",
            "hover:bg-[var(--table-sticky-hover-bg)]",
            showStrongArrow
              ? "font-medium text-action"
              : "font-normal text-foreground hover:text-action",
          )}
          onClick={() => onColumnSort?.(rosterSortKey)}
        >
          <span className="min-w-0 shrink">{children}</span>
          {showStrongArrow ? (
            sortDirection === "asc" ? (
              <ArrowUp className={cn(ROSTER_SORT_ICON_SM, "text-action")} aria-hidden />
            ) : (
              <ArrowDown className={cn(ROSTER_SORT_ICON_SM, "text-action")} aria-hidden />
            )
          ) : showFaintSortHint ? (
            <ArrowUpDown
              className={cn(
                ROSTER_SORT_ICON_SM,
                "text-muted-foreground transition-colors group-hover:text-action",
              )}
              aria-hidden
            />
          ) : null}
        </button>
      ) : (
        <span className="flex h-14 items-center px-3.5 text-muted-foreground">{children}</span>
      )}
    </TableHead>
  )
}

export type CattleRosterTableProps = {
  rows: Cattle[]
  /** When true, adds a Pasture column after Age. */
  showPastureColumn: boolean
  pastureNames: Record<string, string>
  observationsByCattleId: Record<string, ObservationEntry[]>
  onRowClick: (row: Cattle) => void
  /** Highlights the active row when a slide-over is open. */
  selectedCattleId?: string | null
  /** When set, + opens cattle panel on detail; ⋯ edit opens embedded log (global modal if unset). */
  onOpenObservationLog?: (row: Cattle, initialObservation: ObservationEntry | null) => void
  emptyState?: {
    title: string
    description: string
    action?: ReactNode
  }
  sortColumn?: CattleRosterSortColumn
  sortDirection?: "asc" | "desc"
  onColumnSort?: (column: CattleRosterSortColumn) => void
}

export function CattleRosterTable({
  rows,
  showPastureColumn,
  pastureNames,
  observationsByCattleId,
  onRowClick,
  selectedCattleId = null,
  onOpenObservationLog,
  emptyState,
  sortColumn = "lastObservation",
  sortDirection = "desc",
  onColumnSort,
}: CattleRosterTableProps) {
  const { openCattleLogModal } = useRanchData()
  const colSpan = showPastureColumn ? 12 : 11
  return (
    <Table className="border-separate border-spacing-0" containerClassName="min-w-0 w-full">
      <TableHeader>
        <TableRow className="border-neutral-200 hover:bg-transparent">
          <CattleRosterSortableColumnHeader
            stickyIdentity
            rosterSortKey="tag"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onColumnSort={onColumnSort}
          >
            Tag #
          </CattleRosterSortableColumnHeader>
          <CattleRosterSortableColumnHeader
            rosterSortKey="healthStatus"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onColumnSort={onColumnSort}
            className="min-w-[96px]"
          >
            Status
          </CattleRosterSortableColumnHeader>
          <CattleRosterSortableColumnHeader
            rosterSortKey="calvingStatus"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onColumnSort={onColumnSort}
            className="min-w-[124px]"
          >
            Calving status
          </CattleRosterSortableColumnHeader>
          <CattleRosterSortableColumnHeader
            rosterSortKey="dueDate"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onColumnSort={onColumnSort}
          >
            Due date
          </CattleRosterSortableColumnHeader>
          <CattleRosterSortableColumnHeader
            rosterSortKey="breed"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onColumnSort={onColumnSort}
          >
            Breed
          </CattleRosterSortableColumnHeader>
          <CattleRosterSortableColumnHeader
            rosterSortKey="age"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onColumnSort={onColumnSort}
          >
            Age
          </CattleRosterSortableColumnHeader>
          {showPastureColumn ? (
            <CattleRosterSortableColumnHeader
              rosterSortKey="pasture"
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onColumnSort={onColumnSort}
            >
              Pasture
            </CattleRosterSortableColumnHeader>
          ) : null}
          <CattleRosterSortableColumnHeader
            rosterSortKey="lastObservation"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onColumnSort={onColumnSort}
          >
            Last obs
          </CattleRosterSortableColumnHeader>
          <CattleRosterSortableColumnHeader
            rosterSortKey="lastVax"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onColumnSort={onColumnSort}
          >
            Last vax
          </CattleRosterSortableColumnHeader>
          <CattleRosterSortableColumnHeader
            rosterSortKey="lastDeworm"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onColumnSort={onColumnSort}
          >
            Last deworm
          </CattleRosterSortableColumnHeader>
          <CattleRosterSortableColumnHeader
            rosterSortKey="lastPregCheck"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onColumnSort={onColumnSort}
          >
            Last preg check
          </CattleRosterSortableColumnHeader>
          <CattleRosterSortableColumnHeader
            rosterSortKey="lastBranding"
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onColumnSort={onColumnSort}
          >
            Last branding
          </CattleRosterSortableColumnHeader>
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
          const healthRisk = getCattleEffectiveHealthRisk(row, observationsByCattleId)
          const lastObsLabel = getCattleLastObservationLabel(row.id, observationsByCattleId)
          const selected = selectedCattleId === row.id
          const cellBg = cn(
            "h-16 border-b border-neutral-200 group-hover:bg-muted/50",
            selected ? "bg-action/10 group-hover:bg-action/10" : "bg-white"
          )
          const stickyCellBg = cn(
            "h-16",
            selected ? CATTLE_ROSTER_STICKY_SELECTED_BG : cn("bg-white", CATTLE_ROSTER_STICKY_HOVER)
          )
          return (
            <TableRow
              key={row.id}
              className="group cursor-pointer border-neutral-200"
              onClick={() => onRowClick(row)}
            >
              <TableCell
                className={cn(
                  CATTLE_ROSTER_STICKY_TD,
                  "align-middle",
                  stickyCellBg
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="shrink-0 whitespace-nowrap text-sm font-medium tabular-nums text-foreground">
                    {formatCattleTagDisplay(row.tagNumber)}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    title="Log observation"
                    aria-label="Log observation"
                    className={cn(
                      "h-7 shrink-0 gap-1.5 px-3 text-[13px] font-medium hover:border-ai-accent hover:bg-ai-accent hover:text-white hover:[&_svg]:text-white [&_svg]:shrink-0",
                      selected ? "bg-transparent" : "",
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onOpenObservationLog) onOpenObservationLog(row, null)
                      else openCattleLogModal(row)
                    }}
                  >
                    <NotebookPen className="size-3.5 shrink-0" aria-hidden />
                    Log
                  </Button>
                </div>
              </TableCell>
              <TableCell className={cn(cellBg, "min-w-[96px] whitespace-nowrap pl-4")}>
                {healthRisk === "flag" ? (
                  <StatusBadge status="flag" size="table" emphasis="secondary" />
                ) : healthRisk === "monitor" ? (
                  <StatusBadge status="monitor" size="table" emphasis="secondary" />
                ) : null}
              </TableCell>
              <TableCell className={cn(cellBg, "min-w-[124px] whitespace-nowrap")}>
                {calvingStatusPill(row)}
              </TableCell>
              <TableCell className={cellBg}>
                <CattleDueDateCell row={row} />
              </TableCell>
              <TableCell className={cn(cellBg, "text-sm text-foreground")}>
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
              <TableCell className={cn(cellBg, "text-sm text-foreground")}>
                {lastObsLabel}
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
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
