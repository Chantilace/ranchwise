import { ArrowDown, ArrowUp, ArrowUpDown, NotebookPen } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { PageTitleStrip } from "@/components/PageTitleStrip"
import { RosterMobileHeader } from "@/components/roster/RosterMobileHeader"
import { RosterMobileLogIconButton } from "@/components/roster/RosterMobileLogIconButton"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { SearchField } from "@/components/ui/search-field"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/StatusBadge"
import { EntityFilterPanel, type EntityFilterDimension } from "@/components/workspace/EntityFilterPanel"
import { RosterLastActivitySortSelect } from "@/components/workspace/RosterLastActivitySortSelect"
import { EntityFilterToolbar } from "@/components/workspace/EntityFilterToolbar"
import { FilteredCountDisplay } from "@/components/workspace/FilteredCountDisplay"
import { MobileRosterFilterSheet } from "@/components/workspace/MobileRosterFilterSheet"
import { workspaceFilterPanelClass } from "@/components/workspace/filterPanelStyles"
import { RosterPageAddButton } from "@/components/workspace/RosterPageAddButton"
import { useRanchData } from "@/contexts/RanchDataContext"
import { ROSTER_HEADCOUNT_BADGE_CLASS } from "@/lib/categoryBadgeClass"
import { useCloseOnOutsidePointerDown } from "@/hooks/useCloseOnOutsidePointerDown"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { getPastureDerivedStatus } from "@/lib/pastureDerivedStatus"
import {
  isPastureCheckOverdue,
  pastureDaysSinceLastCheck,
  pastureRosterCheckSummaryTier,
} from "@/lib/pastureCheckRecency"
import {
  compareRosterLastActivityMs,
  pastureLastCheckTimeMs,
  ROSTER_LAST_ACTIVITY_URL_KEY,
  rosterLastActivityFromSearchParam,
  rosterLastActivityToSearchParam,
} from "@/lib/rosterLastActivitySort"
import { WORKSPACE_PAGE_ROSTER_FILL_CLASS } from "@/lib/workspacePageCard"
import { cn } from "@/lib/utils"
import { PASTURE_SEED_MEDIA } from "@/lib/pastureSeedMedia"
import { getPastureShortName } from "@/lib/pastureUtils"
import { pastureStatusToCanonical, type PastureStatus } from "@/lib/statusUtils"
import type { Pasture } from "@/types/cattle"

type PastureSortColumn = "name" | "status" | "lastCheck" | "headCount" | "acreage"
type SortDir = "asc" | "desc"

const PASTURE_ROSTER_TH_BASE =
  "h-14 box-border border-b border-[var(--color-border-tertiary)] bg-secondary px-0 py-0 text-left align-middle text-[13px] font-normal leading-tight whitespace-nowrap text-foreground"
const PASTURE_ROSTER_TH_STICKY_TOP = "sticky top-0 z-10 shadow-[var(--shadow-sticky-scroll)]"
const PASTURE_ROSTER_TH_STICKY_IDENTITY =
  "sticky left-0 top-0 z-30 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08),var(--shadow-sticky-scroll)]"
const PASTURE_SORT_ICON_SM = "size-3.5 shrink-0 stroke-2"

/** Derived-status sort rank: Action needed (flag) → Concern (monitor) → Stable (good). */
const PASTURE_STATUS_SORT_RANK: Record<PastureStatus, number> = {
  action_needed: 0,
  concern: 1,
  stable: 2,
}

function pastureRosterSortTriggerLabel(column: PastureSortColumn, dir: SortDir): string {
  switch (column) {
    case "name":
      return dir === "asc" ? "Pasture (A–Z)" : "Pasture (Z–A)"
    case "status":
      return dir === "asc" ? "Status (Flag first)" : "Status (Good first)"
    case "headCount":
      return dir === "asc" ? "Head count (low → high)" : "Head count (high → low)"
    case "acreage":
      return dir === "asc" ? "Acreage (small → large)" : "Acreage (large → small)"
    default:
      return "Custom sort"
  }
}

function PastureRosterSortableHeader({
  column,
  sortColumn,
  sortDir,
  lastActivityDir,
  onColumnSort,
  className,
  stickyIdentity,
  children,
}: {
  column: PastureSortColumn
  sortColumn: PastureSortColumn
  sortDir: SortDir
  lastActivityDir: "desc" | "asc"
  onColumnSort: (column: PastureSortColumn) => void
  className?: string
  stickyIdentity?: boolean
  children: ReactNode
}) {
  const active = sortColumn === column
  const isLastCheck = column === "lastCheck"
  const showStrongArrow = active
  const showFaintHint = !active

  return (
    <TableHead
      scope="col"
      className={cn(
        PASTURE_ROSTER_TH_BASE,
        stickyIdentity
          ? cn(
              PASTURE_ROSTER_TH_STICKY_IDENTITY,
              "w-[min(280px,36vw)] min-w-[220px] max-w-[300px]",
            )
          : PASTURE_ROSTER_TH_STICKY_TOP,
        className,
      )}
      aria-sort={
        showStrongArrow
          ? isLastCheck
            ? lastActivityDir === "asc"
              ? "ascending"
              : "descending"
            : sortDir === "asc"
              ? "ascending"
              : "descending"
          : "none"
      }
    >
      <button
        type="button"
        className={cn(
          "group flex h-14 w-full min-w-0 cursor-pointer items-center gap-1.5 rounded-sm px-3.5 text-left text-[13px] transition-colors",
          "hover:bg-[var(--table-sticky-hover-bg)]",
          showStrongArrow
            ? "font-medium text-action"
            : "font-normal text-foreground hover:text-action",
        )}
        onClick={() => onColumnSort(column)}
      >
        <span className="min-w-0 shrink">{children}</span>
        {showStrongArrow ? (
          isLastCheck ? (
            lastActivityDir === "asc" ? (
              <ArrowUp className={cn(PASTURE_SORT_ICON_SM, "text-action")} aria-hidden />
            ) : (
              <ArrowDown className={cn(PASTURE_SORT_ICON_SM, "text-action")} aria-hidden />
            )
          ) : sortDir === "asc" ? (
            <ArrowUp className={cn(PASTURE_SORT_ICON_SM, "text-action")} aria-hidden />
          ) : (
            <ArrowDown className={cn(PASTURE_SORT_ICON_SM, "text-action")} aria-hidden />
          )
        ) : showFaintHint ? (
          <ArrowUpDown
            className={cn(
              PASTURE_SORT_ICON_SM,
              "text-muted-foreground transition-colors group-hover:text-action",
            )}
            aria-hidden
          />
        ) : null}
      </button>
    </TableHead>
  )
}

const PASTURE_RECENCY_OPTIONS = [
  { id: "recent", label: "Recently checked" },
  { id: "borderline", label: "Due soon" },
  { id: "overdue", label: "Overdue" },
] as const

const PASTURE_CONDITION_OPTIONS: { id: PastureStatus; label: string }[] = [
  { id: "stable", label: "Stable" },
  { id: "concern", label: "Concern" },
  { id: "action_needed", label: "Action needed" },
]

function pastureCheckRecencyFilterId(p: Pasture): "recent" | "borderline" | "overdue" {
  if (isPastureCheckOverdue(p, 10)) return "overdue"
  const d = pastureDaysSinceLastCheck(p)
  if (d === null) return "overdue"
  if (d <= 3) return "recent"
  if (d <= 10) return "borderline"
  return "overdue"
}

export function PasturesPage() {
  const isMobile = useMediaQuery("(max-width: 767px)")
  const isMdUp = useMediaQuery("(min-width: 768px)")
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const overdueChecksOnly = searchParams.get("overdueChecks") === "true"
  const { pastures, pastureChecksByPastureId, openPastureCheckModal } = useRanchData()
  const [search, setSearch] = useState("")
  const [pastureFilterOpen, setPastureFilterOpen] = useState(false)
  const [recencyFilters, setRecencyFilters] = useState<Set<string>>(() => new Set())
  const [pastureConditionFilters, setPastureConditionFilters] = useState<Set<string>>(() => new Set())
  const pastureFilterRef = useRef<HTMLDivElement>(null)

  // Default surfaces Action needed (flag) then Concern (monitor) pastures first,
  // unless a "last activity" deep-link asks for the recency sort instead.
  const [sortKey, setSortKey] = useState<PastureSortColumn>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get(ROSTER_LAST_ACTIVITY_URL_KEY)) return "lastCheck"
    }
    return "status"
  })
  const [sortDir, setSortDir] = useState<SortDir>("asc")


  useEffect(() => {
    if (overdueChecksOnly && recencyFilters.size === 0) {
      setRecencyFilters(new Set(["overdue"]))
    }
  }, [overdueChecksOnly, recencyFilters.size])

  const lastActivityPrimarySort = rosterLastActivityFromSearchParam(
    searchParams.get(ROSTER_LAST_ACTIVITY_URL_KEY),
  )

  const applyPastureLastActivitySort = useCallback(
    (next: "desc" | "asc") => {
      setSortKey("lastCheck")
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          const urlVal = rosterLastActivityToSearchParam(next)
          if (urlVal) p.set(ROSTER_LAST_ACTIVITY_URL_KEY, urlVal)
          else p.delete(ROSTER_LAST_ACTIVITY_URL_KEY)
          return p
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const onPastureColumnSort = useCallback(
    (column: PastureSortColumn) => {
      if (column === "lastCheck") {
        if (sortKey !== "lastCheck") {
          setSortKey("lastCheck")
          return
        }
        applyPastureLastActivitySort(lastActivityPrimarySort === "desc" ? "asc" : "desc")
        return
      }
      if (sortKey === column) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
      } else {
        setSortKey(column)
        setSortDir("asc")
      }
    },
    [sortKey, lastActivityPrimarySort, applyPastureLastActivitySort],
  )

  useCloseOnOutsidePointerDown({
    open: pastureFilterOpen && isMdUp,
    setOpen: setPastureFilterOpen,
    ref: pastureFilterRef,
  })

  const activePastureFilterCount = useMemo(() => {
    let n = 0
    const rp = recencyFilters.size > 0 && recencyFilters.size < PASTURE_RECENCY_OPTIONS.length
    if (rp) n += recencyFilters.size
    const cp =
      pastureConditionFilters.size > 0 && pastureConditionFilters.size < PASTURE_CONDITION_OPTIONS.length
    if (cp) n += pastureConditionFilters.size
    return n
  }, [recencyFilters, pastureConditionFilters])

  const pastureFilterDimensions = useMemo((): EntityFilterDimension[] => {
    return [
      {
        kind: "multi",
        id: "recency",
        label: "Check status",
        options: [...PASTURE_RECENCY_OPTIONS],
        selectedIds: recencyFilters,
        allSelectedLabel: "All",
        placeholder: "All",
        "aria-label": "Pasture check recency filters",
      },
      {
        kind: "multi",
        id: "condition",
        label: "Pasture status",
        options: PASTURE_CONDITION_OPTIONS,
        selectedIds: pastureConditionFilters,
        allSelectedLabel: "All",
        placeholder: "All",
        "aria-label": "Pasture condition status filters",
      },
    ]
  }, [recencyFilters, pastureConditionFilters])

  const onPastureFilterMultiChange = useCallback((id: string, next: Set<string>) => {
    if (id === "recency") {
      setRecencyFilters(next)
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev)
        if (next.size === 1 && next.has("overdue")) p.set("overdueChecks", "true")
        else p.delete("overdueChecks")
        return p
      }, { replace: true })
    } else if (id === "condition") {
      setPastureConditionFilters(next)
    }
  }, [setSearchParams])

  const onPastureFilterRadioChange = useCallback(() => {}, [])

  const clearAllPastureRosterFilters = useCallback(() => {
    setRecencyFilters(new Set())
    setPastureConditionFilters(new Set())
    setSortKey("status")
    setSortDir("asc")
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev)
      p.delete("overdueChecks")
      p.delete(ROSTER_LAST_ACTIVITY_URL_KEY)
      return p
    }, { replace: true })
  }, [setSearchParams])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = q
      ? pastures.filter((p) => p.name.toLowerCase().includes(q))
      : [...pastures]
    const rf = recencyFilters
    if (rf.size > 0 && rf.size < PASTURE_RECENCY_OPTIONS.length) {
      list = list.filter((p) => rf.has(pastureCheckRecencyFilterId(p)))
    }
    const cf = pastureConditionFilters
    if (cf.size > 0 && cf.size < PASTURE_CONDITION_OPTIONS.length) {
      list = list.filter((p) => cf.has(getPastureDerivedStatus(p.id, pastureChecksByPastureId)))
    }
    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "lastCheck":
          cmp = compareRosterLastActivityMs(
            pastureLastCheckTimeMs(a),
            pastureLastCheckTimeMs(b),
            lastActivityPrimarySort,
          )
          break
        case "name": {
          const v = a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          cmp = sortDir === "asc" ? v : -v
          break
        }
        case "status": {
          const ar = PASTURE_STATUS_SORT_RANK[getPastureDerivedStatus(a.id, pastureChecksByPastureId)]
          const br = PASTURE_STATUS_SORT_RANK[getPastureDerivedStatus(b.id, pastureChecksByPastureId)]
          cmp = sortDir === "asc" ? ar - br : br - ar
          break
        }
        case "headCount":
          cmp = sortDir === "asc" ? a.animalCount - b.animalCount : b.animalCount - a.animalCount
          break
        case "acreage":
          cmp = sortDir === "asc" ? a.acreage - b.acreage : b.acreage - a.acreage
          break
        default:
          break
      }
      if (cmp !== 0) return cmp
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    })
    return list
  }, [
    pastures,
    search,
    sortKey,
    sortDir,
    recencyFilters,
    pastureConditionFilters,
    pastureChecksByPastureId,
    lastActivityPrimarySort,
  ])

  const pastureRosterCountVisible =
    pastures.length > 0 && (search.trim() !== "" || activePastureFilterCount > 0)

  const pastureCheckSummaryCounts = useMemo(() => {
    let recent = 0
    let borderline = 0
    let overdue = 0
    for (const p of pastures) {
      const tier = pastureRosterCheckSummaryTier(p)
      if (tier === "recent") recent += 1
      else if (tier === "borderline") borderline += 1
      else overdue += 1
    }
    return { recent, borderline, overdue }
  }, [pastures])

  const pastureTitleInlineMetadata =
    pastures.length > 0 ? (
      <div
        className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-2 text-[13px] leading-snug"
        aria-label="Pasture check summary"
      >
        <span className={ROSTER_HEADCOUNT_BADGE_CLASS}>{pastures.length} pastures</span>
        <span className="shrink-0 select-none text-muted-foreground/70" aria-hidden>
          ·
        </span>
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-badge-good-mid-bg" aria-hidden />
          <span className="text-foreground">Recently checked</span>
          <span className="tabular-nums text-muted-foreground">{pastureCheckSummaryCounts.recent}</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-badge-monitor-mid-bg" aria-hidden />
          <span className="text-foreground">Due soon</span>
          <span className="tabular-nums text-muted-foreground">{pastureCheckSummaryCounts.borderline}</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-badge-flag-bg" aria-hidden />
          <span className="text-foreground">Overdue</span>
          <span className="tabular-nums text-muted-foreground">{pastureCheckSummaryCounts.overdue}</span>
        </span>
      </div>
    ) : null

  const pastureFilterPanelInner = (
    <EntityFilterPanel
      dimensions={pastureFilterDimensions}
      onMultiChange={onPastureFilterMultiChange}
      onRadioChange={onPastureFilterRadioChange}
    />
  )

  const pastureFilterControl = (
    <div className="relative shrink-0" ref={pastureFilterRef}>
      <EntityFilterToolbar
        open={pastureFilterOpen}
        onToggleOpen={() => setPastureFilterOpen((o) => !o)}
        activeCategoryCount={activePastureFilterCount}
        onClearAll={clearAllPastureRosterFilters}
        filterButtonAriaLabel="Filter pastures roster"
      />
      {pastureFilterOpen && !isMobile ? (
        <div className={workspaceFilterPanelClass}>{pastureFilterPanelInner}</div>
      ) : null}
    </div>
  )

  const addPastureCta = (
    <RosterPageAddButton
      onClick={() => {
        // TODO: Wire to add-pasture flow when it exists.
        console.log("Add pasture")
      }}
    >
      Add pasture
    </RosterPageAddButton>
  )

  return (
    <>
    <RanchWorkspaceShell
      searchValue=""
      onSearchChange={() => {}}
      searchPlaceholder="Search everything (coming soon)"
      searchAriaLabel="Search everything"
      contentClassName={WORKSPACE_PAGE_ROSTER_FILL_CLASS}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:hidden">
          <RosterMobileHeader
            title="Pastures"
            count={pastures.length}
            entityLabel="pastures"
            statusItems={[
              {
                label: "Recently checked",
                count: pastureCheckSummaryCounts.recent,
                dotClassName: "bg-badge-good-mid-bg",
              },
              {
                label: "Due soon",
                count: pastureCheckSummaryCounts.borderline,
                dotClassName: "bg-badge-monitor-mid-bg",
              },
              {
                label: "Overdue",
                count: pastureCheckSummaryCounts.overdue,
                dotClassName: "bg-badge-flag-bg",
              },
            ]}
            addCta={addPastureCta}
          />
          <div className="mb-3 flex w-full min-w-0 flex-nowrap items-center gap-2">
            <div className="min-w-0 max-w-full flex-1">
              <SearchField
                variant="inline"
                size="md"
                fullWidth
                value={search}
                onChange={setSearch}
                placeholder="Search pastures..."
                ariaLabel="Search pastures by name"
                className="w-full"
              />
            </div>
            <RosterLastActivitySortSelect
              value={sortKey === "lastCheck" ? lastActivityPrimarySort : "custom"}
              triggerLabel={sortKey === "lastCheck" ? undefined : pastureRosterSortTriggerLabel(sortKey, sortDir)}
              onValueChange={applyPastureLastActivitySort}
              aria-label="Sort pastures by last check"
            />
            {pastureFilterControl}
          </div>
          <FilteredCountDisplay
            visible={pastureRosterCountVisible}
            filteredCount={rows.length}
            totalCount={pastures.length}
            entityName="pastures"
            className="mb-2 shrink-0"
          />
          {pastures.length === 0 ? (
            <div className="mt-2 shrink-0 rounded-lg border border-border bg-card p-6">
              <p className="text-sm font-medium text-foreground">No pastures yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first pasture to get started.
              </p>
              <div className="mt-4">{addPastureCta}</div>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">No pastures match your filters</p>
              <p className="mt-1 text-sm text-muted-foreground">Try adjusting search or filters.</p>
              <Button type="button" variant="secondary" className="mt-4" onClick={clearAllPastureRosterFilters}>
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
              <div className="flex flex-col gap-2.5 px-1">
                {rows.map((p) => {
                  const d = pastureDaysSinceLastCheck(p)
                  const lastCheckLabel =
                    d === null ? "No check logged" : d === 0 ? "Today" : `${d}d ago`
                  const mediaUrl = p.profileImageUrl ?? PASTURE_SEED_MEDIA[p.name]?.imageUrl
                  const derived = getPastureDerivedStatus(p.id, pastureChecksByPastureId)
                  const shortName = getPastureShortName(p.name)
                  return (
                    <div
                      key={p.id}
                      className="relative overflow-hidden rounded-xl border-[0.5px] border-border bg-card"
                    >
                      <Link
                        to={`/pastures/${p.id}`}
                        className="block w-full cursor-pointer outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <div className="aspect-[16/7] w-full overflow-hidden bg-muted">
                          {mediaUrl ? (
                            <img
                              src={mediaUrl}
                              alt=""
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="size-full bg-gradient-to-br from-muted to-muted-foreground/15"
                              aria-hidden
                            />
                          )}
                        </div>
                        <div className="p-2.5 pr-12">
                          <div className="mb-0.5 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                              <p className="text-[14px] font-medium text-foreground">{shortName}</p>
                              <StatusBadge status={pastureStatusToCanonical(derived)} size="sm" emphasis="secondary" />
                            </div>
                            <span className="shrink-0 text-[13px] text-muted-foreground">{lastCheckLabel}</span>
                          </div>
                          <p className="truncate text-[13px] text-muted-foreground">
                            {p.animalCount} head · {p.acreage} acres · {p.terrain}
                          </p>
                        </div>
                      </Link>
                      <RosterMobileLogIconButton
                        ariaLabel={`Log pasture check for ${shortName}`}
                        className="absolute bottom-2.5 right-2.5 z-10"
                        onClick={() => {
                          openPastureCheckModal({ pastureId: p.id, pastureName: p.name })
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="hidden min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden md:flex">
          <PageTitleStrip
            className="shrink-0 border-b-0 pb-0 mb-4"
            title="Pastures"
            titleClassName="text-[24px] font-medium tracking-normal text-foreground"
            inlineAfterTitle={pastureTitleInlineMetadata}
            actions={addPastureCta}
          />

          <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2">
            <div className="min-w-0 max-w-full flex-1 sm:max-w-[320px]">
              <SearchField
                variant="inline"
                size="md"
                fullWidth
                value={search}
                onChange={setSearch}
                placeholder="Search pastures..."
                ariaLabel="Search pastures by name"
                className="w-full"
              />
            </div>
            <RosterLastActivitySortSelect
              value={sortKey === "lastCheck" ? lastActivityPrimarySort : "custom"}
              triggerLabel={sortKey === "lastCheck" ? undefined : pastureRosterSortTriggerLabel(sortKey, sortDir)}
              onValueChange={applyPastureLastActivitySort}
              aria-label="Sort pastures by last check"
            />
            {pastureFilterControl}
          </div>

          <FilteredCountDisplay
            visible={pastureRosterCountVisible}
            filteredCount={rows.length}
            totalCount={pastures.length}
            entityName="pastures"
            className="mt-3 shrink-0"
          />

          {pastures.length === 0 ? (
            <div className="mt-6 shrink-0 rounded-lg border border-border bg-card p-6">
              <p className="text-sm font-medium text-foreground">No pastures yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add your first pasture to get started.
              </p>
              <div className="mt-4">{addPastureCta}</div>
            </div>
          ) : (
            <div className="mt-2 min-w-0 shrink-0">
              <Table
                tableLayout="intrinsic"
                className="min-w-[800px] border-separate border-spacing-0"
              >
              <TableHeader>
                <TableRow className="border-neutral-200 hover:bg-transparent">
                  <PastureRosterSortableHeader
                    column="name"
                    sortColumn={sortKey}
                    sortDir={sortDir}
                    lastActivityDir={lastActivityPrimarySort}
                    onColumnSort={onPastureColumnSort}
                    stickyIdentity
                  >
                    Pasture
                  </PastureRosterSortableHeader>
                  <PastureRosterSortableHeader
                    column="status"
                    sortColumn={sortKey}
                    sortDir={sortDir}
                    lastActivityDir={lastActivityPrimarySort}
                    onColumnSort={onPastureColumnSort}
                    className="w-[120px] min-w-[100px]"
                  >
                    Status
                  </PastureRosterSortableHeader>
                  <PastureRosterSortableHeader
                    column="lastCheck"
                    sortColumn={sortKey}
                    sortDir={sortDir}
                    lastActivityDir={lastActivityPrimarySort}
                    onColumnSort={onPastureColumnSort}
                    className="w-[124px] min-w-[104px]"
                  >
                    Last check
                  </PastureRosterSortableHeader>
                  <PastureRosterSortableHeader
                    column="headCount"
                    sortColumn={sortKey}
                    sortDir={sortDir}
                    lastActivityDir={lastActivityPrimarySort}
                    onColumnSort={onPastureColumnSort}
                    className="w-[96px] min-w-[80px]"
                  >
                    Head count
                  </PastureRosterSortableHeader>
                  <PastureRosterSortableHeader
                    column="acreage"
                    sortColumn={sortKey}
                    sortDir={sortDir}
                    lastActivityDir={lastActivityPrimarySort}
                    onColumnSort={onPastureColumnSort}
                    className="w-[96px] min-w-[80px]"
                  >
                    Acreage
                  </PastureRosterSortableHeader>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.length === 0 ? (
                  <TableRow className="border-neutral-200 hover:bg-transparent">
                    <TableCell colSpan={5} className="h-32 border-b-0 bg-white text-center align-middle">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm font-medium text-foreground">No pastures match your search</p>
                        <p className="text-sm text-muted-foreground">Try a different search term.</p>
                        <Button type="button" variant="secondary" onClick={() => setSearch("")}>
                          Clear search
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
                {rows.map((p) => {
                  const cellBg =
                    "border-b border-neutral-200 bg-white group-hover:bg-muted/50"
                  const media = PASTURE_SEED_MEDIA[p.name] ?? null
                  return (
                    <TableRow
                      key={p.id}
                      className="group cursor-pointer border-neutral-200"
                      onClick={() => navigate(`/pastures/${p.id}`)}
                    >
                      <TableCell
                        className={`sticky left-0 z-10 w-[min(280px,36vw)] min-w-[220px] max-w-[300px] border-b border-neutral-200 bg-white py-3.5 pl-4 pr-5 align-middle shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] group-hover:bg-[var(--table-sticky-hover-bg)]`}
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          {media ? (
                            <img
                              src={media.imageUrl}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-xl object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-[13px] font-semibold text-muted-foreground"
                              aria-hidden
                            >
                              {p.name.trim().slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-foreground">{getPastureShortName(p.name)}</p>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            title="Log observation"
                            aria-label="Log observation"
                            className="h-7 shrink-0 gap-1.5 px-3 text-[13px] font-medium hover:border-ai-accent hover:bg-ai-accent hover:text-white hover:[&_svg]:text-white [&_svg]:shrink-0"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openPastureCheckModal({ pastureId: p.id, pastureName: p.name })
                            }}
                          >
                            <NotebookPen className="size-3.5 shrink-0" aria-hidden />
                            Log
                          </Button>
                        </div>
                      </TableCell>

                      <TableCell
                        className={cn(
                          cellBg,
                          "w-[120px] whitespace-nowrap align-middle pl-4 pr-3",
                        )}
                      >
                        <StatusBadge
                          status={pastureStatusToCanonical(getPastureDerivedStatus(p.id, pastureChecksByPastureId))}
                          size="table"
                          emphasis="secondary"
                        />
                      </TableCell>

                      <TableCell className={cn(cellBg, "px-3.5 text-sm text-muted-foreground")}>
                        {p.lastObservation ?? "—"}
                      </TableCell>

                      <TableCell className={cn(cellBg, "px-3.5 text-sm tabular-nums text-foreground")}>
                        {p.animalCount}
                      </TableCell>

                      <TableCell className={cn(cellBg, "px-3.5 text-sm tabular-nums text-foreground")}>
                        {p.acreage}
                      </TableCell>

                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
        </div>
      </div>

    </RanchWorkspaceShell>
    <MobileRosterFilterSheet
      open={pastureFilterOpen && isMobile}
      title="Filters"
      onClose={() => setPastureFilterOpen(false)}
    >
      {pastureFilterPanelInner}
    </MobileRosterFilterSheet>
    </>
  )
}
