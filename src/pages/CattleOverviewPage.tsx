import { ChevronRight } from "lucide-react"
import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useSearchParams } from "react-router-dom"
import { CattleRosterTable } from "@/components/CattleRosterTable"
import { CattleDetailPanel } from "@/components/CattleDetailPanel"
import { PageTitleStrip } from "@/components/PageTitleStrip"
import { RosterMobileHeader } from "@/components/roster/RosterMobileHeader"
import { RosterMobileLogIconButton } from "@/components/roster/RosterMobileLogIconButton"
import { CattleAvatar } from "@/components/CattleAvatar"
import { StatusBadge } from "@/components/StatusBadge"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { SearchField } from "@/components/ui/search-field"
import { CattleFilterPanel } from "@/components/workspace/CattleFilterPanel"
import { RosterLastActivitySortSelect } from "@/components/workspace/RosterLastActivitySortSelect"
import { EntityFilterToolbar } from "@/components/workspace/EntityFilterToolbar"
import { FilteredCountDisplay } from "@/components/workspace/FilteredCountDisplay"
import type { RanchFilterOption } from "@/components/workspace/RanchFilterCategoryField"
import { MobileRosterFilterSheet } from "@/components/workspace/MobileRosterFilterSheet"
import { workspaceFilterPanelClass } from "@/components/workspace/filterPanelStyles"
import { RosterPageAddButton } from "@/components/workspace/RosterPageAddButton"
import { AddAnimalModal } from "@/components/AddAnimalModal"
import { Button } from "@/components/ui/button"
import { useRanchData } from "@/contexts/RanchDataContext"
import { ROSTER_HEADCOUNT_BADGE_CLASS } from "@/lib/categoryBadgeClass"
import { parseCattleCareDueParam, type CattleCareDueKind } from "@/lib/cattleCareDue"
import {
  applyCattleHerdRosterSortToSearchParams,
  cattleHerdRosterSortFromSearchParams,
  cattleRosterSortTriggerLabel,
  filterCattleList,
  nextCattleRosterSort,
  sortCattleList,
  type CattleRosterSortColumn,
} from "@/lib/cattleRosterQuery"
import { resetCattleToolbarFilters } from "@/lib/cattleFilterReset"
import { ROSTER_LAST_ACTIVITY_URL_KEY } from "@/lib/rosterLastActivitySort"
import { ROSTER_SORT_COLUMN_URL_KEY, ROSTER_SORT_DIR_URL_KEY } from "@/lib/rosterSortUrl"
import { WORKSPACE_PAGE_ROSTER_FILL_CLASS } from "@/lib/workspacePageCard"
import {
  cattleDaysUntilDue,
  partitionCattleForMobileRoster,
  sortCattleMobilePartitionByLastObservation,
} from "@/lib/cattleMobileRosterGroups"
import { getCattleLastObservationLabel } from "@/lib/cattleSelectors"
import { countCattleHerdHealthForBar, formatCattleTagDisplay } from "@/lib/cattleUi"
import { cn } from "@/lib/utils"
import {
  CALVING_FILTER_OPTIONS,
  type EffectiveCalvingStatus,
} from "@/lib/calvingStatus"
import type { Breed, Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"
import { useCloseOnOutsidePointerDown } from "@/hooks/useCloseOnOutsidePointerDown"
import { useMediaQuery } from "@/hooks/useMediaQuery"

const CALVING_PARAM_VALUES = new Set<EffectiveCalvingStatus>(
  CALVING_FILTER_OPTIONS.map((o) => o.id)
)

function herdCalvingFiltersFromSearch(search: string): Set<EffectiveCalvingStatus> {
  const params = new URLSearchParams(search)
  const filter = params.get("filter")
  if (filter === "in-labor") {
    return new Set(["in-labor"])
  }
  const calvingStatus = params.get("calvingStatus")
  if (calvingStatus && CALVING_PARAM_VALUES.has(calvingStatus as EffectiveCalvingStatus)) {
    return new Set([calvingStatus as EffectiveCalvingStatus])
  }
  const raw = params.get("calving")
  if (raw && CALVING_PARAM_VALUES.has(raw as EffectiveCalvingStatus)) {
    return new Set([raw as EffectiveCalvingStatus])
  }
  // Empty = no filter applied.
  return new Set()
}

type HerdHealthFilterId = "Flag" | "Monitor" | "Good"

const HEALTH_PARAM_VALUES = new Set<HerdHealthFilterId>(["Flag", "Monitor", "Good"])

function herdHealthFiltersFromSearch(search: string): Set<HerdHealthFilterId> {
  const params = new URLSearchParams(search)
  const healthStatus = params.get("healthStatus")
  if (healthStatus) {
    const mapped = healthStatus === "flag" ? "Flag" : healthStatus === "monitor" ? "Monitor" : healthStatus === "good" ? "Good" : null
    if (mapped) return new Set([mapped])
  }
  const raw = params.get("health")
  if (raw && HEALTH_PARAM_VALUES.has(raw as HerdHealthFilterId)) {
    return new Set([raw as HerdHealthFilterId])
  }
  // Empty = no filter applied.
  return new Set()
}

function herdCareDueFromSearch(search: string): CattleCareDueKind | null {
  return parseCattleCareDueParam(new URLSearchParams(search).get("careDue"))
}

function parsePastureTokensFromParam(param: string | null, catalog: readonly string[]): Set<string> {
  if (!param?.trim() || catalog.length === 0) return new Set()
  const idByLower = new Map(catalog.map((id) => [id.toLowerCase(), id] as const))
  const out = new Set<string>()
  for (const raw of param.split(",")) {
    const token = raw.trim().toLowerCase()
    if (!token) continue
    const direct = idByLower.get(token) ?? idByLower.get(token.replace(/pasture$/, ""))
    if (direct) out.add(direct)
  }
  return out
}

function normalizeHerdPastureFilters(set: ReadonlySet<string>, catalog: readonly string[]): Set<string> {
  if (catalog.length === 0) return new Set()
  if (catalog.every((id) => set.has(id))) return new Set()
  return new Set(set)
}

function serializeHerdPastureParam(set: ReadonlySet<string>, catalog: readonly string[]): string | null {
  if (catalog.length === 0) return null
  const full = catalog.every((id) => set.has(id))
  const active = set.size > 0 && !full
  if (!active) return null
  return catalog.filter((id) => set.has(id)).join(",")
}

function herdPastureFiltersEquivalent(
  a: ReadonlySet<string>,
  b: ReadonlySet<string>,
  catalog: readonly string[]
): boolean {
  return serializeHerdPastureParam(a, catalog) === serializeHerdPastureParam(b, catalog)
}

function CattleMobileSectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between border-y border-border bg-muted px-3.5 py-2">
      <p className="text-[13px] font-medium tracking-wider text-muted-foreground uppercase">{label} · {count}</p>
    </div>
  )
}

function CattleMobileRosterRow({
  cow,
  tagLabel,
  contextLine,
  healthBadge,
  onOpenDetail,
  onLogObservation,
}: {
  cow: Cattle
  tagLabel: string
  contextLine: string
  /** When set, shows a compact health status chip (e.g. Flagged section). */
  healthBadge: "flag" | "monitor" | null
  /** Row body click: open the cattle detail panel. */
  onOpenDetail: () => void
  /** Log CTA only: open observation log for this animal. */
  onLogObservation: () => void
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 last:border-b-0">
      <button
        type="button"
        onClick={onOpenDetail}
        className="-mx-3.5 -my-2.5 flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-sm px-3.5 py-2.5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <CattleAvatar className="size-11" />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
            <p className="text-[14px] font-medium text-foreground">{tagLabel}</p>
            {healthBadge ? (
              <StatusBadge status={healthBadge} size="sm" emphasis="secondary" />
            ) : null}
            <span className="text-[13px] text-muted-foreground">
              {cow.breed} · {cow.age} yrs
            </span>
          </div>
          <p className="truncate text-[13px] text-muted-foreground">{contextLine}</p>
        </div>
      </button>
      <RosterMobileLogIconButton
        ariaLabel={`Log observation for ${tagLabel}`}
        onClick={onLogObservation}
      />
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
    </div>
  )
}

export function CattleOverviewPage() {
  const isMdUp = useMediaQuery("(min-width: 768px)")
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    pastures,
    cattle,
    observationsByCattleId,
  } = useRanchData()

  const [herdSearch, setHerdSearch] = useState("")
  const [herdBreedFilter, setHerdBreedFilter] = useState<"all" | Breed>("all")
  const [herdSexFilters, setHerdSexFilters] = useState<Set<string>>(() => new Set())
  const [herdFilterOpen, setHerdFilterOpen] = useState(false)
  const [addAnimalOpen, setAddAnimalOpen] = useState(false)
  const [herdCalvingFilters, setHerdCalvingFilters] = useState<Set<EffectiveCalvingStatus>>(() =>
    typeof window !== "undefined"
      ? herdCalvingFiltersFromSearch(window.location.search)
      : new Set()
  )
  const [herdHealthFilters, setHerdHealthFilters] = useState<Set<HerdHealthFilterId>>(() =>
    typeof window !== "undefined"
      ? herdHealthFiltersFromSearch(window.location.search)
      : new Set()
  )
  const [herdCareDueKind, setHerdCareDueKind] = useState<CattleCareDueKind | null>(() =>
    typeof window !== "undefined" ? herdCareDueFromSearch(window.location.search) : null
  )

  const herdPastureCatalog = useMemo(() => pastures.map((p) => p.id), [pastures])
  const [herdPastureFilters, setHerdPastureFilters] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    const param = new URLSearchParams(window.location.search).get("pasture")
    // On deep-links (e.g. Pasture profile → "View herd →"), the URL param is already a pasture id.
    // Initialize synchronously so the first paint is filtered and does not flash "all cattle".
    return param ? new Set([param]) : new Set()
  })

  const calvingFromQuery = searchParams.get("calving")
  const calvingStatusFromQuery = searchParams.get("calvingStatus")
  const filterFromQuery = searchParams.get("filter")

  useEffect(() => {
    if (!calvingFromQuery) return
    if (!CALVING_PARAM_VALUES.has(calvingFromQuery as EffectiveCalvingStatus)) return
    startTransition(() => {
      const id = calvingFromQuery as EffectiveCalvingStatus
      setHerdCalvingFilters(new Set([id]))
    })
  }, [calvingFromQuery])

  useEffect(() => {
    if (!calvingStatusFromQuery) return
    if (!CALVING_PARAM_VALUES.has(calvingStatusFromQuery as EffectiveCalvingStatus)) return
    startTransition(() => {
      const id = calvingStatusFromQuery as EffectiveCalvingStatus
      setHerdCalvingFilters(new Set([id]))
    })
  }, [calvingStatusFromQuery])

  /** Home alert deep link: `/cattle?filter=in-labor` matches roster calving filter. */
  useEffect(() => {
    if (filterFromQuery !== "in-labor") return
    startTransition(() => {
      setHerdCalvingFilters(new Set(["in-labor"]))
    })
  }, [filterFromQuery])

  const healthFromQuery = searchParams.get("health")
  const healthStatusFromQuery = searchParams.get("healthStatus")
  const careDueFromQuery = searchParams.get("careDue")
  const pastureParam = searchParams.get("pasture") ?? ""

  useLayoutEffect(() => {
    if (herdPastureCatalog.length === 0) return
    const parsed = parsePastureTokensFromParam(pastureParam || null, herdPastureCatalog)
    const normalized = normalizeHerdPastureFilters(parsed, herdPastureCatalog)
    setHerdPastureFilters((prev) =>
      herdPastureFiltersEquivalent(prev, normalized, herdPastureCatalog) ? prev : normalized
    )
  }, [pastureParam, herdPastureCatalog])

  useEffect(() => {
    if (herdPastureCatalog.length === 0) return
    const next = serializeHerdPastureParam(herdPastureFilters, herdPastureCatalog) ?? ""
    if (next === pastureParam) return
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (!next) p.delete("pasture")
        else p.set("pasture", next)
        return p
      },
      { replace: true }
    )
  }, [herdPastureFilters, herdPastureCatalog, pastureParam, setSearchParams])

  useEffect(() => {
    startTransition(() => setHerdCareDueKind(parseCattleCareDueParam(careDueFromQuery)))
  }, [careDueFromQuery])

  useEffect(() => {
    if (!healthFromQuery) return
    if (!HEALTH_PARAM_VALUES.has(healthFromQuery as HerdHealthFilterId)) return
    startTransition(() => {
      setHerdHealthFilters(new Set([healthFromQuery as HerdHealthFilterId]))
    })
  }, [healthFromQuery])

  useEffect(() => {
    if (!healthStatusFromQuery) return
    const mapped =
      healthStatusFromQuery === "flag"
        ? "Flag"
        : healthStatusFromQuery === "monitor"
          ? "Monitor"
          : healthStatusFromQuery === "good"
            ? "Good"
            : null
    if (!mapped) return
    startTransition(() => {
      setHerdHealthFilters(new Set([mapped]))
    })
  }, [healthStatusFromQuery])

  const herdFilterRef = useRef<HTMLDivElement>(null)
  const [slideCattleId, setSlideCattleId] = useState<string | null>(null)
  const [slideLogOpen, setSlideLogOpen] = useState<{
    nonce: number
    initialObservation: ObservationEntry | null
  } | null>(null)
  const [healthyMobileExpanded, setHealthyMobileExpanded] = useState(false)
  const isDetailPanelOpen = slideCattleId != null

  useEffect(() => {
    if (slideCattleId) setHerdFilterOpen(false)
  }, [slideCattleId])

  useCloseOnOutsidePointerDown({
    open: herdFilterOpen && isMdUp,
    setOpen: setHerdFilterOpen,
    ref: herdFilterRef,
  })

  const pastureNameById = useMemo(
    () => Object.fromEntries(pastures.map((p) => [p.id, p.name])),
    [pastures]
  )

  const herdPastureFilterOptions = useMemo((): RanchFilterOption[] => {
    const counts = new Map<string, number>()
    for (const c of cattle) {
      counts.set(c.pastureId, (counts.get(c.pastureId) ?? 0) + 1)
    }
    return herdPastureCatalog.map((id) => ({
      id,
      label: `${pastureNameById[id] ?? id} (${counts.get(id) ?? 0})`,
    }))
  }, [cattle, herdPastureCatalog, pastureNameById])

  const selectedSlideCattle = useMemo(
    () => (slideCattleId ? (cattle.find((c) => c.id === slideCattleId) ?? null) : null),
    [slideCattleId, cattle]
  )

  const openCattleSlide = useCallback((row: Cattle) => {
    setSlideLogOpen(null)
    setSlideCattleId(row.id)
  }, [])
  /** + opens detail panel; edit opens embedded log with that entry. */
  const openCattleSlideToObservationLog = useCallback((row: Cattle, initial: ObservationEntry | null) => {
    setSlideCattleId(row.id)
    setSlideLogOpen({ nonce: Date.now(), initialObservation: initial })
  }, [])
  const closeCattleSlide = useCallback(() => {
    setSlideCattleId(null)
    setSlideLogOpen(null)
  }, [])
  const consumeSlideLogOpen = useCallback(() => setSlideLogOpen(null), [])

  const herdHealthBarCounts = useMemo(
    () => countCattleHerdHealthForBar(cattle, observationsByCattleId),
    [cattle, observationsByCattleId]
  )

  const cattleSort = cattleHerdRosterSortFromSearchParams(searchParams)
  const cattleSortQueryKey = searchParams.toString()

  const filteredHerdOnly = useMemo(() => {
    return filterCattleList(cattle, {
      herdPastureIds: herdPastureFilters,
      herdPastureCatalog,
      searchTrimmed: herdSearch.trim(),
      breed: herdBreedFilter,
      sexFilters: herdSexFilters,
      calvingFilters: herdCalvingFilters,
      healthFilters: herdHealthFilters,
      careDueKind: herdCareDueKind,
      observationsByCattleId,
    })
  }, [
    cattle,
    herdPastureCatalog,
    herdPastureFilters,
    herdSearch,
    herdBreedFilter,
    herdSexFilters,
    herdCalvingFilters,
    herdHealthFilters,
    herdCareDueKind,
    observationsByCattleId,
  ])

  const allHerdRows = useMemo(() => {
    const sort = cattleHerdRosterSortFromSearchParams(new URLSearchParams(cattleSortQueryKey))
    return sortCattleList(filteredHerdOnly, sort, pastureNameById, observationsByCattleId)
  }, [filteredHerdOnly, cattleSortQueryKey, pastureNameById, observationsByCattleId])

  const mobileCattlePartition = useMemo(() => {
    const raw = partitionCattleForMobileRoster(filteredHerdOnly, observationsByCattleId)
    const dir =
      cattleSort.column === "lastObservation" ? cattleSort.direction : ("desc" as const)
    return sortCattleMobilePartitionByLastObservation(raw, dir, observationsByCattleId)
  }, [filteredHerdOnly, cattleSort.column, cattleSort.direction, observationsByCattleId])

  const setRosterLastActivitySort = useCallback(
    (next: "desc" | "asc") => {
      setSearchParams(
        (prev) =>
          applyCattleHerdRosterSortToSearchParams(prev, { column: "lastObservation", direction: next }),
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const onCattleColumnSort = useCallback(
    (column: CattleRosterSortColumn) => {
      setSearchParams(
        (prev) =>
          applyCattleHerdRosterSortToSearchParams(
            prev,
            nextCattleRosterSort(cattleHerdRosterSortFromSearchParams(prev), column),
          ),
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const clearAllRosterFilters = useCallback(() => {
    resetCattleToolbarFilters({
      setSearch: setHerdSearch,
      setCalvingFilters: setHerdCalvingFilters,
      setHealthFilters: setHerdHealthFilters,
      setBreedFilter: setHerdBreedFilter,
      setCareDueKind: setHerdCareDueKind,
      setPastureFilters: setHerdPastureFilters,
    })
    setHerdSexFilters(new Set())
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        p.delete(ROSTER_LAST_ACTIVITY_URL_KEY)
        p.delete(ROSTER_SORT_COLUMN_URL_KEY)
        p.delete(ROSTER_SORT_DIR_URL_KEY)
        return p
      },
      { replace: true },
    )
  }, [setSearchParams])

  const pastureFilterInactive =
    herdPastureCatalog.length === 0 ||
    serializeHerdPastureParam(herdPastureFilters, herdPastureCatalog) == null
  const calvingPanelIsDefault =
    herdCalvingFilters.size === 0 ||
    (herdCalvingFilters.size === CALVING_FILTER_OPTIONS.length &&
      CALVING_FILTER_OPTIONS.every((o) => herdCalvingFilters.has(o.id)))

  const healthIsDefault =
    herdHealthFilters.size === 0 ||
    (herdHealthFilters.size === 3 && ["Flag", "Monitor", "Good"].every((v) => herdHealthFilters.has(v as HerdHealthFilterId)))

  const activeCategoryFilterCount = useMemo(() => {
    let n = 0
    const healthPartial = herdHealthFilters.size > 0 && herdHealthFilters.size < 3
    const calvingPartial =
      herdCalvingFilters.size > 0 && herdCalvingFilters.size < CALVING_FILTER_OPTIONS.length
    const pasturePartial =
      herdPastureCatalog.length > 0 &&
      herdPastureFilters.size > 0 &&
      herdPastureFilters.size < herdPastureCatalog.length

    if (healthPartial) n += herdHealthFilters.size
    if (calvingPartial) n += herdCalvingFilters.size
    if (pasturePartial) n += herdPastureFilters.size
    if (herdBreedFilter !== "all") n += 1
    if (herdSexFilters.size > 0) n += herdSexFilters.size
    if (herdCareDueKind != null) n += 1
    return n
  }, [
    herdPastureCatalog.length,
    herdPastureFilters,
    herdBreedFilter,
    herdSexFilters,
    herdCareDueKind,
    herdHealthFilters,
    herdCalvingFilters,
  ])

  const herdFilterPanelInner = (
    <CattleFilterPanel
      showSearch={false}
      searchValue={herdSearch}
      onSearchChange={setHerdSearch}
      calvingFilters={herdCalvingFilters}
      setCalvingFilters={setHerdCalvingFilters}
      healthFilters={herdHealthFilters}
      setHealthFilters={setHerdHealthFilters}
      breedFilter={herdBreedFilter}
      setBreedFilter={setHerdBreedFilter}
      showBreedSection
      sexFilters={herdSexFilters}
      setSexFilters={setHerdSexFilters}
      showSexSection
      showCalvingStatusSection
      pastureFilterOptions={herdPastureFilterOptions}
      pastureFilters={herdPastureFilters}
      setPastureFilters={setHerdPastureFilters}
      showFooter={false}
    />
  )

  const herdFilterControl = (
    <div className="relative shrink-0" ref={herdFilterRef}>
      <EntityFilterToolbar
        open={herdFilterOpen}
        onToggleOpen={() => setHerdFilterOpen((o) => !o)}
        activeCategoryCount={activeCategoryFilterCount}
        onClearAll={clearAllRosterFilters}
        filterButtonAriaLabel="Filter cattle roster"
      />
      {herdFilterOpen && isMdUp ? (
        <div className={workspaceFilterPanelClass}>{herdFilterPanelInner}</div>
      ) : null}
    </div>
  )

  const hasAnyCattle = cattle.length > 0

  const isUnfiltered =
    herdSearch.trim() === "" &&
    herdBreedFilter === "all" &&
    herdSexFilters.size === 0 &&
    herdCareDueKind == null &&
    pastureFilterInactive &&
    calvingPanelIsDefault &&
    healthIsDefault

  const herdTitleInlineMetadata = hasAnyCattle ? (
      <div
        className="flex min-w-0 flex-wrap items-center gap-x-3.5 gap-y-2 text-[13px] leading-snug"
        aria-label="Herd health summary"
      >
        <span className={ROSTER_HEADCOUNT_BADGE_CLASS}>{cattle.length} cattle</span>
        <span className="shrink-0 select-none text-muted-foreground/70" aria-hidden>
          ·
        </span>
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-badge-good-mid-bg" aria-hidden />
          <span className="text-foreground">Good</span>
          <span className="tabular-nums text-muted-foreground">{herdHealthBarCounts.good}</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-badge-monitor-mid-bg" aria-hidden />
          <span className="text-foreground">Monitor</span>
          <span className="tabular-nums text-muted-foreground">{herdHealthBarCounts.monitor}</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-2">
          <span className="size-2 shrink-0 rounded-full bg-badge-flag-bg" aria-hidden />
          <span className="text-foreground">Flagged</span>
          <span className="tabular-nums text-muted-foreground">{herdHealthBarCounts.flagged}</span>
        </span>
      </div>
    ) : null

  return (
    <>
    <RanchWorkspaceShell
      searchValue=""
      onSearchChange={() => {}}
      searchPlaceholder="Search everything (coming soon)"
      searchAriaLabel="Search everything"
      // Roster + panel fill the shell; table column and panel each own vertical scroll.
      contentClassName={WORKSPACE_PAGE_ROSTER_FILL_CLASS}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:hidden">
          <RosterMobileHeader
            title="Cattle"
            count={cattle.length}
            entityLabel="cattle"
            statusItems={[
              { label: "Good", count: herdHealthBarCounts.good, dotClassName: "bg-badge-good-mid-bg" },
              { label: "Monitor", count: herdHealthBarCounts.monitor, dotClassName: "bg-badge-monitor-mid-bg" },
              { label: "Flagged", count: herdHealthBarCounts.flagged, dotClassName: "bg-badge-flag-bg" },
            ]}
            addCta={<RosterPageAddButton onClick={() => setAddAnimalOpen(true)}>Add cattle</RosterPageAddButton>}
          />
          <div className="mb-3 flex w-full min-w-0 flex-nowrap items-center gap-2">
            <div className="min-w-0 max-w-full flex-1 sm:max-w-[320px]">
              <SearchField
                variant="inline"
                size="md"
                fullWidth
                value={herdSearch}
                onChange={setHerdSearch}
                placeholder="Search cattle by tag #..."
                ariaLabel="Search cattle by tag number"
                className="w-full"
              />
            </div>
            <RosterLastActivitySortSelect
              value={cattleSort.column === "lastObservation" ? cattleSort.direction : "custom"}
              triggerLabel={
                cattleSort.column === "lastObservation" ? undefined : cattleRosterSortTriggerLabel(cattleSort)
              }
              onValueChange={setRosterLastActivitySort}
              aria-label="Sort cattle by last observation"
            />
            {herdFilterControl}
          </div>
          <FilteredCountDisplay
            visible={!isUnfiltered}
            filteredCount={allHerdRows.length}
            totalCount={cattle.length}
            entityName="cattle"
            className="mb-2 shrink-0"
          />
          <div className="rounded-xl border-[0.5px] border-border bg-card overflow-x-auto">
            {allHerdRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <p className="text-sm font-medium text-foreground">
                  {isUnfiltered && !hasAnyCattle ? "No cattle yet" : "No cattle match your filters"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isUnfiltered && !hasAnyCattle
                    ? "Add your first cattle to get started."
                    : "Try adjusting search or filters."}
                </p>
                {isUnfiltered && !hasAnyCattle ? (
                  <Button type="button" variant="primary" onClick={() => setAddAnimalOpen(true)}>
                    Add cattle
                  </Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={clearAllRosterFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                {mobileCattlePartition.calvingSoon.length > 0 ? (
                  <>
                    <CattleMobileSectionHeader
                      label="Calving soon"
                      count={mobileCattlePartition.calvingSoon.length}
                    />
                    {mobileCattlePartition.calvingSoon.map((cow) => {
                      const pasture = pastureNameById[cow.pastureId] ?? cow.pastureId
                      const days = cattleDaysUntilDue(cow)
                      const ctx =
                        days !== null && days >= 0
                          ? `${pasture} · Calving in ${days} day${days === 1 ? "" : "s"}`
                          : `${pasture} · Calving soon`
                      return (
                        <CattleMobileRosterRow
                          key={cow.id}
                          cow={cow}
                          contextLine={ctx}
                          healthBadge={null}
                          onOpenDetail={() => openCattleSlide(cow)}
                          onLogObservation={() => openCattleSlideToObservationLog(cow, null)}
                          tagLabel={formatCattleTagDisplay(cow.tagNumber)}
                        />
                      )
                    })}
                  </>
                ) : null}
                {mobileCattlePartition.inLabor.length > 0 ? (
                  <>
                    <CattleMobileSectionHeader label="In labor" count={mobileCattlePartition.inLabor.length} />
                    {mobileCattlePartition.inLabor.map((cow) => {
                      const pasture = pastureNameById[cow.pastureId] ?? cow.pastureId
                      return (
                        <CattleMobileRosterRow
                          key={cow.id}
                          cow={cow}
                          contextLine={`${pasture} · In labor`}
                          healthBadge={null}
                          onOpenDetail={() => openCattleSlide(cow)}
                          onLogObservation={() => openCattleSlideToObservationLog(cow, null)}
                          tagLabel={formatCattleTagDisplay(cow.tagNumber)}
                        />
                      )
                    })}
                  </>
                ) : null}
                {mobileCattlePartition.flagged.length > 0 ? (
                  <>
                    <CattleMobileSectionHeader label="Flagged" count={mobileCattlePartition.flagged.length} />
                    {mobileCattlePartition.flagged.map((cow) => {
                      const pasture = pastureNameById[cow.pastureId] ?? cow.pastureId
                      const obs = getCattleLastObservationLabel(cow.id, observationsByCattleId)
                      return (
                        <CattleMobileRosterRow
                          key={cow.id}
                          cow={cow}
                          contextLine={`${pasture} · ${obs}`}
                          healthBadge="flag"
                          onOpenDetail={() => openCattleSlide(cow)}
                          onLogObservation={() => openCattleSlideToObservationLog(cow, null)}
                          tagLabel={formatCattleTagDisplay(cow.tagNumber)}
                        />
                      )
                    })}
                  </>
                ) : null}
                {mobileCattlePartition.healthy.length > 0 ? (
                  <>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between border-y border-border bg-muted px-3.5 py-2 text-left outline-none transition-colors hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring/40"
                      onClick={() => setHealthyMobileExpanded((v) => !v)}
                      aria-expanded={healthyMobileExpanded}
                    >
                      <p className="text-[13px] font-medium tracking-wider text-muted-foreground uppercase">
                        Healthy · {mobileCattlePartition.healthy.length}
                      </p>
                      <ChevronRight
                        className={cn(
                          "size-3.5 shrink-0 text-muted-foreground transition-transform",
                          healthyMobileExpanded && "rotate-90",
                        )}
                        aria-hidden
                      />
                    </button>
                    {healthyMobileExpanded
                      ? mobileCattlePartition.healthy.map((cow) => {
                          const pasture = pastureNameById[cow.pastureId] ?? cow.pastureId
                          return (
                            <CattleMobileRosterRow
                              key={cow.id}
                              cow={cow}
                              contextLine={pasture}
                              healthBadge={null}
                              onOpenDetail={() => openCattleSlide(cow)}
                              onLogObservation={() => openCattleSlideToObservationLog(cow, null)}
                              tagLabel={formatCattleTagDisplay(cow.tagNumber)}
                            />
                          )
                        })
                      : null}
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="hidden min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden md:flex">
          <PageTitleStrip
            className="shrink-0 border-b-0 pb-0 mb-4"
            title="Cattle"
            titleClassName="text-[24px] font-medium tracking-normal text-foreground"
            inlineAfterTitle={herdTitleInlineMetadata}
            actions={
              <RosterPageAddButton onClick={() => setAddAnimalOpen(true)}>Add cattle</RosterPageAddButton>
            }
          />

          {isDetailPanelOpen ? (
            <>
              <div className="mt-3 flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 sm:gap-3">
                <div className="min-w-0 max-w-full flex-1 lg:max-w-md">
                  <SearchField
                    variant="inline"
                    size="md"
                    fullWidth
                    value={herdSearch}
                    onChange={setHerdSearch}
                    placeholder="Search cattle by tag #..."
                    ariaLabel="Search cattle by tag number"
                    className="w-full"
                  />
                </div>
                <RosterLastActivitySortSelect
                  value={cattleSort.column === "lastObservation" ? cattleSort.direction : "custom"}
                  triggerLabel={
                    cattleSort.column === "lastObservation" ? undefined : cattleRosterSortTriggerLabel(cattleSort)
                  }
                  onValueChange={setRosterLastActivitySort}
                  aria-label="Sort cattle by last observation"
                />
                {herdFilterControl}
              </div>
              <FilteredCountDisplay
                visible={!isUnfiltered}
                filteredCount={allHerdRows.length}
                totalCount={cattle.length}
                entityName="cattle"
                className="mt-3 shrink-0"
              />
            </>
          ) : (
            <>
              <div className="mt-3 flex shrink-0 flex-col gap-3">
                <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:gap-3">
                  <div className="min-w-0 max-w-full flex-1 sm:max-w-[320px]">
                    <SearchField
                      variant="inline"
                      size="md"
                      fullWidth
                      value={herdSearch}
                      onChange={setHerdSearch}
                      placeholder="Search cattle by tag #..."
                      ariaLabel="Search cattle by tag number"
                      className="w-full"
                    />
                  </div>
                  <RosterLastActivitySortSelect
                    value={cattleSort.column === "lastObservation" ? cattleSort.direction : "custom"}
                    triggerLabel={
                      cattleSort.column === "lastObservation" ? undefined : cattleRosterSortTriggerLabel(cattleSort)
                    }
                    onValueChange={setRosterLastActivitySort}
                    aria-label="Sort cattle by last observation"
                  />
                  {herdFilterControl}
                </div>
              </div>

              <FilteredCountDisplay
                visible={!isUnfiltered}
                filteredCount={allHerdRows.length}
                totalCount={cattle.length}
                entityName="cattle"
                className="mt-4 shrink-0"
              />
            </>
          )}

          <div className="mt-2 flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden md:flex-row md:items-stretch md:gap-4">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-auto">
                <CattleRosterTable
                  rows={allHerdRows}
                  shellClassName="flex-none max-h-full"
                  showPastureColumn
                  pastureNames={pastureNameById}
                  observationsByCattleId={observationsByCattleId}
                  sortColumn={cattleSort.column}
                  sortDirection={cattleSort.direction}
                  onColumnSort={onCattleColumnSort}
                  onRowClick={openCattleSlide}
                  selectedCattleId={slideCattleId}
                  onOpenObservationLog={openCattleSlideToObservationLog}
                  emptyState={
                    allHerdRows.length === 0
                      ? isUnfiltered && !hasAnyCattle
                        ? {
                            title: "No cattle yet",
                            description: "Add your first cattle to get started.",
                            action: (
                              <Button type="button" variant="primary" onClick={() => setAddAnimalOpen(true)}>
                                Add cattle
                              </Button>
                            ),
                          }
                        : {
                            title: "No cattle match your filters",
                            description: "Try adjusting search or filters.",
                            action: (
                              <Button type="button" variant="secondary" onClick={clearAllRosterFilters}>
                                Clear filters
                              </Button>
                            ),
                          }
                      : undefined
                  }
                />
              </div>
              {isMdUp && selectedSlideCattle ? (
                <div className="flex min-h-0 w-[480px] shrink-0 self-stretch flex-col overflow-hidden">
                  <CattleDetailPanel
                    cattle={selectedSlideCattle}
                    pastureName={
                      pastureNameById[selectedSlideCattle.pastureId] ?? selectedSlideCattle.pastureId
                    }
                    observations={observationsByCattleId[selectedSlideCattle.id] ?? []}
                    onClose={closeCattleSlide}
                    slideLogOpen={slideLogOpen}
                    onSlideLogOpenConsumed={consumeSlideLogOpen}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {!isMdUp ? (
          <CattleDetailPanel
            cattle={selectedSlideCattle}
            pastureName={
              selectedSlideCattle
                ? pastureNameById[selectedSlideCattle.pastureId] ?? selectedSlideCattle.pastureId
                : ""
            }
            observations={
              selectedSlideCattle ? observationsByCattleId[selectedSlideCattle.id] ?? [] : []
            }
            onClose={closeCattleSlide}
            slideLogOpen={slideLogOpen}
            onSlideLogOpenConsumed={consumeSlideLogOpen}
          />
        ) : null}
      </div>
      <AddAnimalModal open={addAnimalOpen} onOpenChange={setAddAnimalOpen} />
    </RanchWorkspaceShell>
    <MobileRosterFilterSheet
      open={herdFilterOpen && !isMdUp}
      title="Filters"
      onClose={() => setHerdFilterOpen(false)}
    >
      {herdFilterPanelInner}
    </MobileRosterFilterSheet>
    </>
  )
}
