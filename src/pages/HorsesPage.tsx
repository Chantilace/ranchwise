import { ChevronRight } from "lucide-react"
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { AddHorseModal } from "@/components/AddHorseModal"
import { AddHorseSheet } from "@/components/AddHorseSheet"
import type { NewHorseData } from "@/lib/addHorseForm"
import type { HorseTableRow } from "@/components/RanchWiseHorseRoster"
import { RanchWiseHorseRoster, horseRowKey } from "@/components/RanchWiseHorseRoster"
import type { HorseSortKey } from "@/lib/horseRosterSort"
import {
  applyHorseRosterSortToSearchParams,
  horseRosterSortFromSearchParams,
  horseRosterSortTriggerLabel,
  nextHorseRosterSort,
  sortHorseRowsUnified,
} from "@/lib/horseRosterSort"
import { HorseLogSheet } from "@/components/HorseLogSheet"
import { PageTitleStrip } from "@/components/PageTitleStrip"
import { RosterMobileHeader } from "@/components/roster/RosterMobileHeader"
import { RosterMobileLogIconButton } from "@/components/roster/RosterMobileLogIconButton"
import { StatusBadge } from "@/components/StatusBadge"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { Button } from "@/components/ui/button"
import { SearchField } from "@/components/ui/search-field"
import { EntityFilterPanel, type EntityFilterDimension } from "@/components/workspace/EntityFilterPanel"
import { RosterLastActivitySortSelect } from "@/components/workspace/RosterLastActivitySortSelect"
import { EntityFilterToolbar } from "@/components/workspace/EntityFilterToolbar"
import { FilteredCountDisplay } from "@/components/workspace/FilteredCountDisplay"
import { workspaceFilterPanelClass } from "@/components/workspace/filterPanelStyles"
import { RosterPageAddButton } from "@/components/workspace/RosterPageAddButton"
import { useRanchData } from "@/contexts/RanchDataContext"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useCloseOnOutsidePointerDown } from "@/hooks/useCloseOnOutsidePointerDown"
import { resetHorseToolbarFilters } from "@/lib/horseFilterReset"
import {
  filterHorseList,
  HORSE_CORRAL_FILTER_IDS,
  HORSE_ROSTER_FIT_FOR_WORK_FILTER_PARAM,
  HORSE_ROLE_FILTER_IDS,
} from "@/lib/horseListFilter"
import { getDentalStatusForHorse, getFarrierStatusForHorse } from "@/lib/horseCareUtils"
import {
  isBehaviorRecheckHorse,
  isJuvenileNeedingFirstBehavior,
  isNewBehaviorFlagHorse,
  isTrainingRegressionHorse,
} from "@/lib/todoDerivation"
import { ROSTER_LAST_ACTIVITY_URL_KEY } from "@/lib/rosterLastActivitySort"
import { ROSTER_SORT_COLUMN_URL_KEY, ROSTER_SORT_DIR_URL_KEY } from "@/lib/rosterSortUrl"
import { WORKSPACE_PAGE_ROSTER_FILL_CLASS } from "@/lib/workspacePageCard"

type HorseStatusFilterId = "flag" | "monitor" | "good"

const HORSE_STATUS_PARAM_VALUES = new Set<HorseStatusFilterId>(["flag", "monitor", "good"])

const HEALTH_FILTER_OPTIONS: { id: HorseStatusFilterId; label: string }[] = [
  { id: "good", label: "Good" },
  { id: "monitor", label: "Monitor" },
  { id: "flag", label: "Flag" },
]

const ROLE_FILTER_OPTIONS = HORSE_ROLE_FILTER_IDS.map((id) => ({ id, label: id }))

const CORRAL_FILTER_OPTIONS = HORSE_CORRAL_FILTER_IDS.map((id) => ({ id, label: id }))

function parseHorseStatusParamList(raw: string | null): HorseStatusFilterId[] {
  if (!raw?.trim()) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is HorseStatusFilterId => HORSE_STATUS_PARAM_VALUES.has(s as HorseStatusFilterId))
}

function horseStatusFiltersFromSearch(search: string): Set<HorseStatusFilterId> {
  const params = new URLSearchParams(search)
  const healthList = parseHorseStatusParamList(params.get("healthStatus"))
  if (healthList.length > 0) return new Set(healthList)
  const statusList = parseHorseStatusParamList(params.get("status"))
  if (statusList.length > 0) return new Set(statusList)
  return new Set()
}

function horseBehaviorStatusFiltersFromSearch(search: string): Set<HorseStatusFilterId> {
  const list = parseHorseStatusParamList(new URLSearchParams(search).get("behaviorStatus"))
  return list.length > 0 ? new Set(list) : new Set()
}

function horseMobileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase() || "?"
}

function newHorseDataToRow(data: NewHorseData): HorseTableRow {
  return {
    id: crypto.randomUUID(),
    name: data.name,
    age: `${data.age} yrs`,
    sex: data.sex,
    role: data.role,
    pasture: data.pasture,
    feed: data.feed ?? [],
    health: "—",
    dental: "—",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: data.photo,
  }
}

export function HorsesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { openLogModal, herdRows, pastureOptions, appendHerdHorse, observationsByHorse } = useRanchData()
  const isMobile = useMediaQuery("(max-width: 767px)")
  const [search, setSearch] = useState("")
  const [addHorseOpen, setAddHorseOpen] = useState(false)
  const [logSheetHorse, setLogSheetHorse] = useState<HorseTableRow | null>(null)
  const [horseFilterOpen, setHorseFilterOpen] = useState(false)
  const [statusFilters, setStatusFilters] = useState<Set<HorseStatusFilterId>>(() =>
    typeof window !== "undefined" ? horseStatusFiltersFromSearch(window.location.search) : new Set()
  )
  const [behaviorStatusFilters, setBehaviorStatusFilters] = useState<Set<HorseStatusFilterId>>(() =>
    typeof window !== "undefined" ? horseBehaviorStatusFiltersFromSearch(window.location.search) : new Set()
  )
  const [roleFilters, setRoleFilters] = useState<Set<string>>(() => new Set())
  const [corralFilters, setCorralFilters] = useState<Set<string>>(() => new Set())
  const horseFilterRef = useRef<HTMLDivElement>(null)
  const fitForWorkPresetAppliedRef = useRef(false)

  const statusFromQuery = searchParams.get("status")
  const healthStatusFromQuery = searchParams.get("healthStatus")
  const behaviorStatusFromQuery = searchParams.get("behaviorStatus")
  const farrierDueFromQuery = searchParams.get("farrierDue") === "true"
  const dentalDueFromQuery = searchParams.get("dentalDue") === "true"

  useEffect(() => {
    if (!statusFromQuery) return
    const list = parseHorseStatusParamList(statusFromQuery)
    if (list.length === 0) return
    startTransition(() => {
      setStatusFilters(new Set(list))
    })
  }, [statusFromQuery])

  useEffect(() => {
    if (!healthStatusFromQuery) return
    const list = parseHorseStatusParamList(healthStatusFromQuery)
    if (list.length === 0) return
    startTransition(() => {
      setStatusFilters(new Set(list))
    })
  }, [healthStatusFromQuery])

  useEffect(() => {
    if (!behaviorStatusFromQuery) return
    const list = parseHorseStatusParamList(behaviorStatusFromQuery)
    if (list.length === 0) return
    startTransition(() => {
      setBehaviorStatusFilters(new Set(list))
    })
  }, [behaviorStatusFromQuery])

  useEffect(() => {
    const wantsFitForWork = searchParams.get("filter") === HORSE_ROSTER_FIT_FOR_WORK_FILTER_PARAM
    if (!wantsFitForWork) {
      fitForWorkPresetAppliedRef.current = false
      return
    }
    if (fitForWorkPresetAppliedRef.current) return
    fitForWorkPresetAppliedRef.current = true
    startTransition(() => {
      setStatusFilters(new Set(["good"]))
      setBehaviorStatusFilters(new Set(["good"]))
      setRoleFilters(new Set(["Working"]))
    })
  }, [searchParams])

  useCloseOnOutsidePointerDown({
    open: horseFilterOpen,
    setOpen: setHorseFilterOpen,
    ref: horseFilterRef,
  })

  const roleCatalog = HORSE_ROLE_FILTER_IDS as unknown as readonly string[]
  const corralCatalog = HORSE_CORRAL_FILTER_IDS as unknown as readonly string[]

  const activeCategoryFilterCount = useMemo(() => {
    let n = 0
    const hp = statusFilters.size > 0 && statusFilters.size < HEALTH_FILTER_OPTIONS.length
    if (hp) n += statusFilters.size
    const bp =
      behaviorStatusFilters.size > 0 && behaviorStatusFilters.size < HEALTH_FILTER_OPTIONS.length
    if (bp) n += behaviorStatusFilters.size
    const rp = roleFilters.size > 0 && roleFilters.size < roleCatalog.length
    if (rp) n += roleFilters.size
    const cp = corralFilters.size > 0 && corralFilters.size < corralCatalog.length
    if (cp) n += corralFilters.size
    return n
  }, [statusFilters, behaviorStatusFilters, roleFilters, corralFilters, roleCatalog.length, corralCatalog.length])

  const horseFilterDimensions = useMemo((): EntityFilterDimension[] => {
    return [
      {
        kind: "multi",
        id: "health",
        label: "Health status",
        options: HEALTH_FILTER_OPTIONS,
        selectedIds: statusFilters,
        allSelectedLabel: "All",
        placeholder: "All",
        "aria-label": "Horse health status filters",
      },
      {
        kind: "multi",
        id: "behavior",
        label: "Behavior status",
        options: HEALTH_FILTER_OPTIONS,
        selectedIds: behaviorStatusFilters,
        allSelectedLabel: "All",
        placeholder: "All",
        "aria-label": "Horse behavior status filters",
      },
      {
        kind: "multi",
        id: "role",
        label: "Role",
        options: ROLE_FILTER_OPTIONS,
        selectedIds: roleFilters,
        allSelectedLabel: "All",
        placeholder: "All",
        "aria-label": "Horse role filters",
      },
      {
        kind: "multi",
        id: "corral",
        label: "Corral",
        options: CORRAL_FILTER_OPTIONS,
        selectedIds: corralFilters,
        allSelectedLabel: "All",
        placeholder: "All",
        "aria-label": "Horse corral filters",
      },
    ]
  }, [statusFilters, behaviorStatusFilters, roleFilters, corralFilters])

  const onHorseFilterMultiChange = useCallback((id: string, next: Set<string>) => {
    if (id === "health") setStatusFilters(new Set([...next] as HorseStatusFilterId[]))
    else if (id === "behavior") setBehaviorStatusFilters(new Set([...next] as HorseStatusFilterId[]))
    else if (id === "role") setRoleFilters(next)
    else if (id === "corral") setCorralFilters(next)
  }, [])

  const onHorseFilterRadioChange = useCallback(() => {}, [])

  const horseSort = horseRosterSortFromSearchParams(searchParams)
  const horseSortQueryKey = searchParams.toString()

  const setRosterLastActivitySort = useCallback(
    (next: "desc" | "asc") => {
      setSearchParams(
        (prev) =>
          applyHorseRosterSortToSearchParams(prev, { column: "lastObservation", direction: next }),
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const onHorseColumnSort = useCallback(
    (key: HorseSortKey) => {
      setSearchParams(
        (prev) =>
          applyHorseRosterSortToSearchParams(
            prev,
            nextHorseRosterSort(horseRosterSortFromSearchParams(prev), key),
          ),
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const clearAllHorseRosterFilters = useCallback(() => {
    resetHorseToolbarFilters({
      setSearch,
      setStatusFilters,
      setBehaviorStatusFilters,
      setRoleFilters,
      setCorralFilters,
    })
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete(ROSTER_LAST_ACTIVITY_URL_KEY)
        p.delete(ROSTER_SORT_COLUMN_URL_KEY)
        p.delete(ROSTER_SORT_DIR_URL_KEY)
        p.delete("filter")
        return p
      },
      { replace: true },
    )
  }, [setSearchParams])

  const horseHealthBarCounts = useMemo(() => {
    let good = 0
    let monitor = 0
    let flag = 0
    for (const h of herdRows) {
      if (h.healthStatus === "good") good += 1
      else if (h.healthStatus === "monitor") monitor += 1
      else if (h.healthStatus === "flag") flag += 1
    }
    return { good, monitor, flag }
  }, [herdRows])

  const filteredRows = useMemo(() => {
    let list = filterHorseList(herdRows, {
      searchTrimmed: search,
      statusFilters,
      behaviorStatusFilters,
      roleFilters,
      corralFilters,
      roleCatalog,
      corralCatalog,
    })

    list = list.filter((h) => {
      if (!farrierDueFromQuery && !dentalDueFromQuery) return true
      const farrier = getFarrierStatusForHorse(h, new Date(), observationsByHorse)
      const dental = getDentalStatusForHorse(h, new Date(), observationsByHorse)
      const farrierMatches = farrier.status === "overdue" || farrier.status === "due_soon"
      const dentalMatches = dental.status === "overdue" || dental.status === "due_soon"
      if (farrierDueFromQuery && !farrierMatches) return false
      if (dentalDueFromQuery && !dentalMatches) return false
      return true
    })

    const obsFor = (h: HorseTableRow) => observationsByHorse[horseRowKey(h)]

    if (searchParams.get("regression") === "true") {
      list = list.filter((h) => isTrainingRegressionHorse(h, obsFor(h)))
    }
    if (searchParams.get("new") === "true") {
      list = list.filter((h) => isNewBehaviorFlagHorse(h, obsFor(h)))
    }
    if (searchParams.get("recheck") === "true") {
      list = list.filter((h) => isBehaviorRecheckHorse(h, obsFor(h)))
    }
    if (searchParams.get("needsBehaviorObservation") === "true") {
      list = list.filter((h) => isJuvenileNeedingFirstBehavior(h, obsFor(h)))
    } else if (searchParams.get("role") === "Juvenile") {
      list = list.filter((h) => h.role.trim() === "Juvenile")
    }

    return list
  }, [
    herdRows,
    search,
    statusFilters,
    behaviorStatusFilters,
    roleFilters,
    corralFilters,
    roleCatalog,
    corralCatalog,
    farrierDueFromQuery,
    dentalDueFromQuery,
    observationsByHorse,
    searchParams,
  ])

  const sortedHorseRows = useMemo(() => {
    const sort = horseRosterSortFromSearchParams(new URLSearchParams(horseSortQueryKey))
    return sortHorseRowsUnified(filteredRows, sort, observationsByHorse)
  }, [filteredRows, horseSortQueryKey, observationsByHorse])

  const horseFilterControl = (
    <div className="relative shrink-0" ref={horseFilterRef}>
      <EntityFilterToolbar
        open={horseFilterOpen}
        onToggleOpen={() => setHorseFilterOpen((o) => !o)}
        activeCategoryCount={activeCategoryFilterCount}
        onClearAll={clearAllHorseRosterFilters}
        filterButtonAriaLabel="Filter horses roster"
      />
      {horseFilterOpen ? (
        <div className={workspaceFilterPanelClass}>
          <EntityFilterPanel
            dimensions={horseFilterDimensions}
            onMultiChange={onHorseFilterMultiChange}
            onRadioChange={onHorseFilterRadioChange}
          />
        </div>
      ) : null}
    </div>
  )

  const hasAnyHorses = herdRows.length > 0

  const horseTitleInlineMetadata = hasAnyHorses ? (
    <div
      className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-2 text-[13px] leading-snug"
      aria-label="Herd health summary"
    >
      <span className="inline-flex shrink-0 items-center rounded-md bg-muted px-2.5 py-1 text-[13px] font-normal tabular-nums text-muted-foreground">
        {herdRows.length} horses
      </span>
      <span className="shrink-0 select-none text-muted-foreground/70" aria-hidden>
        ·
      </span>
      <span className="inline-flex min-w-0 items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-badge-good-mid-bg" aria-hidden />
        <span className="text-foreground">Good</span>
        <span className="tabular-nums text-muted-foreground">{horseHealthBarCounts.good}</span>
      </span>
      <span className="inline-flex min-w-0 items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-badge-monitor-mid-bg" aria-hidden />
        <span className="text-foreground">Monitor</span>
        <span className="tabular-nums text-muted-foreground">{horseHealthBarCounts.monitor}</span>
      </span>
      <span className="inline-flex min-w-0 items-center gap-2">
        <span className="size-2 shrink-0 rounded-full bg-badge-flag-bg" aria-hidden />
        <span className="text-foreground">Flag</span>
        <span className="tabular-nums text-muted-foreground">{horseHealthBarCounts.flag}</span>
      </span>
    </div>
  ) : null

  const horseToolbarQueryHasFilters = useMemo(() => {
    const p = new URLSearchParams(searchParams)
    p.delete(ROSTER_LAST_ACTIVITY_URL_KEY)
    p.delete(ROSTER_SORT_COLUMN_URL_KEY)
    p.delete(ROSTER_SORT_DIR_URL_KEY)
    return p.toString() !== ""
  }, [searchParams])

  const isUnfiltered =
    search.trim() === "" &&
    !horseToolbarQueryHasFilters &&
    statusFilters.size === 0 &&
    behaviorStatusFilters.size === 0 &&
    roleFilters.size === 0 &&
    corralFilters.size === 0

  const horseRosterCountVisible = !isUnfiltered && hasAnyHorses

  return (
    <>
      <RanchWorkspaceShell
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder="Search everything (coming soon)"
        searchAriaLabel="Search everything"
        contentClassName={WORKSPACE_PAGE_ROSTER_FILL_CLASS}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col md:hidden">
            <RosterMobileHeader
              title="Horses"
              count={herdRows.length}
              entityLabel="horses"
              statusItems={[
                { label: "Good", count: horseHealthBarCounts.good, dotClassName: "bg-badge-good-mid-bg" },
                { label: "Monitor", count: horseHealthBarCounts.monitor, dotClassName: "bg-badge-monitor-mid-bg" },
                { label: "Flag", count: horseHealthBarCounts.flag, dotClassName: "bg-badge-flag-bg" },
              ]}
              addCta={<RosterPageAddButton onClick={() => setAddHorseOpen(true)}>Add horse</RosterPageAddButton>}
            />
            <div className="mb-3 flex w-full min-w-0 flex-nowrap items-center gap-2">
              <div className="min-w-0 max-w-full flex-1">
                <SearchField
                  variant="inline"
                  size="md"
                  fullWidth
                  value={search}
                  onChange={setSearch}
                  placeholder="Search horses..."
                  ariaLabel="Search horses by name"
                  className="w-full"
                />
              </div>
              <RosterLastActivitySortSelect
                value={horseSort.column === "lastObservation" ? horseSort.direction : "custom"}
                triggerLabel={
                  horseSort.column === "lastObservation" ? undefined : horseRosterSortTriggerLabel(horseSort)
                }
                onValueChange={setRosterLastActivitySort}
                aria-label="Sort horses by last observation"
              />
              {horseFilterControl}
            </div>
            <FilteredCountDisplay
              visible={horseRosterCountVisible}
              filteredCount={filteredRows.length}
              totalCount={herdRows.length}
              entityName="horses"
              className="mb-2 shrink-0"
            />
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border-[0.5px] border-border bg-card">
              {filteredRows.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {isUnfiltered && !hasAnyHorses ? "No horses yet" : "No horses match your filters"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isUnfiltered && !hasAnyHorses
                      ? "Add your first horse to get started."
                      : "Try adjusting search or filters."}
                  </p>
                  {isUnfiltered && !hasAnyHorses ? (
                    <Button type="button" variant="primary" onClick={() => setAddHorseOpen(true)}>
                      Add horse
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        clearAllHorseRosterFilters()
                        navigate("/horses")
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              ) : (
                sortedHorseRows.map((row) => {
                  const to = `/horses/${encodeURIComponent(horseRowKey(row))}`
                  const photo = row.photoUrl?.trim()
                  const onLog = (e: MouseEvent<HTMLButtonElement>) => {
                    e.stopPropagation()
                    if (isMobile) setLogSheetHorse(row)
                    else openLogModal(row)
                  }
                  return (
                    <div
                      key={String(row.id ?? row.name)}
                      className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 last:border-b-0"
                    >
                      <Link
                        to={to}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm -mx-3.5 -my-2.5 px-3.5 py-2.5 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-muted">
                          {photo ? (
                            <img src={photo} alt="" className="size-full object-cover object-center" loading="lazy" />
                          ) : (
                            <div
                              className="flex size-full items-center justify-center text-[13px] font-semibold text-muted-foreground"
                              aria-hidden
                            >
                              {horseMobileInitials(row.name)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                            <p className="text-[14px] font-medium text-foreground">{row.name}</p>
                            {row.healthStatus !== "good" ? (
                              <StatusBadge
                                status={row.healthStatus === "flag" ? "call-vet" : "monitor"}
                                size="sm"
                                emphasis="secondary"
                              />
                            ) : null}
                            {row.behaviorStatus !== "good" ? (
                              <StatusBadge
                                status={row.behaviorStatus === "flag" ? "call-vet" : "monitor"}
                                label="Behavior"
                                compactLabel
                                size="sm"
                                emphasis="secondary"
                              />
                            ) : null}
                          </div>
                          <p className="truncate text-[13px] text-muted-foreground">
                            {row.age} · {row.role} · {row.pasture}
                          </p>
                        </div>
                      </Link>
                      <RosterMobileLogIconButton
                        ariaLabel={`Log observation for ${row.name}`}
                        onClick={onLog}
                      />
                      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="hidden min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden md:flex md:min-h-0">
            <PageTitleStrip
              className="shrink-0 border-b-0 pb-0 mb-4"
              title="Horses"
              titleClassName="text-[24px] font-medium tracking-normal text-foreground"
              inlineAfterTitle={horseTitleInlineMetadata}
              actions={
                <RosterPageAddButton onClick={() => setAddHorseOpen(true)}>Add horse</RosterPageAddButton>
              }
            />

            <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2">
              <div className="min-w-0 max-w-full flex-1 sm:max-w-[320px]">
                <SearchField
                  variant="inline"
                  size="md"
                  fullWidth
                  value={search}
                  onChange={setSearch}
                  placeholder="Search horses by name..."
                  ariaLabel="Search horses by name"
                  className="w-full"
                />
              </div>
              <RosterLastActivitySortSelect
                value={horseSort.column === "lastObservation" ? horseSort.direction : "custom"}
                triggerLabel={
                  horseSort.column === "lastObservation" ? undefined : horseRosterSortTriggerLabel(horseSort)
                }
                onValueChange={setRosterLastActivitySort}
                aria-label="Sort horses by last observation"
              />
              {horseFilterControl}
            </div>
            <FilteredCountDisplay
              visible={horseRosterCountVisible}
              filteredCount={filteredRows.length}
              totalCount={herdRows.length}
              entityName="horses"
              className="mt-3 shrink-0"
            />
            <div className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <RanchWiseHorseRoster
                horseRows={sortedHorseRows}
                sortColumn={horseSort.column}
                sortDirection={horseSort.direction}
                onColumnSort={onHorseColumnSort}
                onHorseRowNavigate={(row) => navigate(`/horses/${encodeURIComponent(horseRowKey(row))}`)}
                onHorseLog={(row) => {
                  if (isMobile) setLogSheetHorse(row)
                  else openLogModal(row)
                }}
                emptyState={
                  filteredRows.length === 0
                    ? isUnfiltered && !hasAnyHorses
                      ? {
                          title: "No horses yet",
                          description: "Add your first horse to get started.",
                          action: (
                            <Button type="button" variant="primary" onClick={() => setAddHorseOpen(true)}>
                              Add horse
                            </Button>
                          ),
                        }
                      : {
                          title: "No horses match your filters",
                          description: "Try adjusting search or filters.",
                          action: (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                clearAllHorseRosterFilters()
                                navigate("/horses")
                              }}
                            >
                              Clear filters
                            </Button>
                          ),
                        }
                    : undefined
                }
              />
            </div>
          </div>
        </div>
      </RanchWorkspaceShell>
      {!isMobile ? (
        <AddHorseModal
          open={addHorseOpen}
          pastures={pastureOptions}
          onClose={() => setAddHorseOpen(false)}
          onSave={(data) => {
            appendHerdHorse(newHorseDataToRow(data))
            setAddHorseOpen(false)
          }}
        />
      ) : null}
      {isMobile && addHorseOpen ? (
        <AddHorseSheet
          pastures={pastureOptions}
          onClose={() => setAddHorseOpen(false)}
          onSave={(data) => {
            appendHerdHorse(newHorseDataToRow(data))
          }}
        />
      ) : null}
      {isMobile && logSheetHorse ? (
        <HorseLogSheet
          key={horseRowKey(logSheetHorse)}
          horse={logSheetHorse}
          onClose={() => setLogSheetHorse(null)}
        />
      ) : null}
    </>
  )
}
