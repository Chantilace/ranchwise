import { Sparkles } from "lucide-react"
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { CattleRosterTable } from "@/components/CattleRosterTable"
import { CattleDetailPanel } from "@/components/CattleDetailPanel"
import { PageTitleStrip } from "@/components/PageTitleStrip"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { SegmentedControl } from "@/components/SegmentedControl"
import { WorkspaceFilterButton } from "@/components/WorkspaceFilterButton"
import { CattleFilterPanel } from "@/components/workspace/CattleFilterPanel"
import { workspaceFilterPanelClass } from "@/components/workspace/filterPanelStyles"
import { AddAnimalModal } from "@/components/AddAnimalModal"
import { Button } from "@/components/ui/button"
import { useRanchData } from "@/contexts/RanchDataContext"
import { parseCattleCareDueParam, type CattleCareDueKind } from "@/lib/cattleCareDue"
import { filterCattleList, sortCattleList, type CattleSortKey } from "@/lib/cattleRosterQuery"
import { getPastureSignalCounts } from "@/lib/cattleUi"
import { countPastureHerdComposition, getPastureSuggestion } from "@/lib/pastureSuggestion"
import { pastureSignalBadgeFill } from "@/lib/statusTagTokens"
import { PASTURE_TYPE_ORDER } from "@/lib/cattleSeed"
import { resetCattleToolbarFilters } from "@/lib/cattleFilterReset"
import { WORKSPACE_PAGE_CARD_CLASS, WORKSPACE_PAGE_SCROLL_CLASS } from "@/lib/workspacePageCard"
import {
  CALVING_FILTER_OPTIONS,
  createDefaultCalvingFilterSet,
  type EffectiveCalvingStatus,
} from "@/lib/calvingStatus"
import type { Breed, Cattle, CattleGroupBy, Pasture } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useCloseOnOutsidePointerDown } from "@/hooks/useCloseOnOutsidePointerDown"
import { cn } from "@/lib/utils"

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
  return createDefaultCalvingFilterSet()
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
  return new Set(["Flag", "Monitor", "Good"])
}

function herdCareDueFromSearch(search: string): CattleCareDueKind | null {
  return parseCattleCareDueParam(new URLSearchParams(search).get("careDue"))
}

/** Pasture summary badges — Figma 62:4904 (rounded-lg, filled). */
function pastureSignalPills(
  pastureId: string,
  cattle: Cattle[],
  observationsByCattleId: Record<string, ObservationEntry[]>
) {
  const s = getPastureSignalCounts(pastureId, cattle, observationsByCattleId)
  const pills: { key: string; className: string; label: string }[] = []

  if (s.calvingSoon > 0) {
    pills.push({
      key: "calving-soon",
      className: pastureSignalBadgeFill.calvingSoon,
      label: `${s.calvingSoon} calving soon`,
    })
  }
  if (s.flagged > 0) {
    pills.push({
      key: "flagged",
      className: pastureSignalBadgeFill.flagged,
      label: `${s.flagged} flagged`,
    })
  }
  if (s.monitored > 0) {
    pills.push({
      key: "monitored",
      className: pastureSignalBadgeFill.monitored,
      label: `${s.monitored} monitor`,
    })
  }
  if (pills.length === 0) {
    pills.push({
      key: "clear",
      className: pastureSignalBadgeFill.clear,
      label: "Clear",
    })
  }

  const pillBase =
    "inline-flex shrink-0 items-center justify-center rounded-lg border-none px-2 py-0.5 text-xs font-semibold"

  return (
    <>
      {pills.map((p) => (
        <span key={p.key} className={cn(pillBase, p.className)}>
          {p.label}
        </span>
      ))}
    </>
  )
}

function PastureCard({
  pasture,
  cattle,
  observationsByCattleId,
  onNavigatePasture,
  onLogCheck,
}: {
  pasture: Pasture
  cattle: Cattle[]
  observationsByCattleId: Record<string, ObservationEntry[]>
  onNavigatePasture: () => void
  onLogCheck: (e: React.MouseEvent) => void
}) {
  const assignedCount = cattle.filter((c) => {
    const inv = c.inventoryStatus ?? "active"
    return c.pastureId === pasture.id && inv !== "deceased" && inv !== "sold"
  }).length
  const headWord = assignedCount === 1 ? "animal" : "animals"
  const subline = `${assignedCount} ${headWord}`
  const hc = countPastureHerdComposition(cattle, pasture.id)
  const pastureAiSuggestion =
    hc.heiferCount > 0 ? getPastureSuggestion(hc.heiferCount, hc.cowCount) : null
  const lastCheck = pasture.lastObservation ?? "—"
  const [aiExpanded, setAiExpanded] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigatePasture}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onNavigatePasture()
        }
      }}
      className="flex w-full cursor-pointer flex-col rounded-[10px] border border-border bg-card p-4 text-left outline-none transition-[colors,box-shadow] hover:bg-muted hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      {/* 1. Header row: Title + pills + CTA */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-medium text-foreground">{pasture.name}</p>
            <div className="flex flex-wrap gap-2">
              {pastureSignalPills(pasture.id, cattle, observationsByCattleId)}
            </div>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {subline} · {hc.heiferCount} heifers · {hc.cowCount} cows · {hc.bullCount} bulls
          </p>
        </div>
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          className="shrink-0 text-xs"
          onClick={(e) => {
            e.stopPropagation()
            onLogCheck(e)
          }}
        >
          Log pasture check
        </Button>
      </div>

      {/* 2. Last check + AI trigger */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Last check · <strong className="font-semibold text-foreground">{lastCheck}</strong>
        </span>
        {hc.heiferCount > 0 && pastureAiSuggestion ? (
          <button
            type="button"
            className="flex shrink-0 items-center justify-center rounded p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            aria-label={aiExpanded ? "Hide AI suggestion" : "Show AI suggestion"}
            aria-expanded={aiExpanded}
            onClick={(e) => {
              e.stopPropagation()
              setAiExpanded((o) => !o)
            }}
          >
            <Sparkles className="size-5 text-ai-accent" strokeWidth={1.5} aria-hidden />
          </button>
        ) : null}
      </div>

      {/* 3. AI suggestion expanded block */}
      {aiExpanded && pastureAiSuggestion ? (
        <div
          className="mt-2 rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-foreground"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {pastureAiSuggestion}
        </div>
      ) : null}
    </div>
  )
}

function CattleViewModeSegmented({
  value,
  onChange,
  herdCount,
  pastureCount,
}: {
  value: CattleGroupBy
  onChange: (g: CattleGroupBy) => void
  herdCount: number
  pastureCount: number
}) {
  return (
    <SegmentedControl
      items={[
        { id: "all", label: `All (${herdCount})` },
        { id: "pasture", label: `Pasture (${pastureCount})` },
      ]}
      value={value}
      onChange={onChange}
      ariaLabel="Cattle view: All or Pasture"
    />
  )
}

export function CattleOverviewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    pastures,
    cattle,
    cattleGroupBy,
    setCattleGroupBy,
    observationsByCattleId,
    openPastureCheckModal,
  } = useRanchData()

  const [herdSearch, setHerdSearch] = useState("")
  const [herdBreedFilter, setHerdBreedFilter] = useState<"all" | Breed>("all")
  const [herdFilterOpen, setHerdFilterOpen] = useState(false)
  const [addAnimalOpen, setAddAnimalOpen] = useState(false)
  const [herdCalvingFilters, setHerdCalvingFilters] = useState<Set<EffectiveCalvingStatus>>(() =>
    typeof window !== "undefined"
      ? herdCalvingFiltersFromSearch(window.location.search)
      : createDefaultCalvingFilterSet()
  )
  const [herdHealthFilters, setHerdHealthFilters] = useState<Set<HerdHealthFilterId>>(() =>
    typeof window !== "undefined"
      ? herdHealthFiltersFromSearch(window.location.search)
      : new Set(["Flag", "Monitor", "Good"])
  )
  const [herdCareDueKind, setHerdCareDueKind] = useState<CattleCareDueKind | null>(() =>
    typeof window !== "undefined" ? herdCareDueFromSearch(window.location.search) : null
  )

  const viewFromQuery = searchParams.get("view")

  const calvingFromQuery = searchParams.get("calving")
  const calvingStatusFromQuery = searchParams.get("calvingStatus")
  const filterFromQuery = searchParams.get("filter")

  useEffect(() => {
    if (!calvingFromQuery) return
    if (!CALVING_PARAM_VALUES.has(calvingFromQuery as EffectiveCalvingStatus)) return
    startTransition(() => {
      setHerdCalvingFilters(new Set([calvingFromQuery as EffectiveCalvingStatus]))
      if (viewFromQuery !== "pasture") setCattleGroupBy("all")
    })
  }, [calvingFromQuery, viewFromQuery, setCattleGroupBy])

  useEffect(() => {
    if (!calvingStatusFromQuery) return
    if (!CALVING_PARAM_VALUES.has(calvingStatusFromQuery as EffectiveCalvingStatus)) return
    startTransition(() => {
      setHerdCalvingFilters(new Set([calvingStatusFromQuery as EffectiveCalvingStatus]))
      if (viewFromQuery !== "pasture") setCattleGroupBy("all")
    })
  }, [calvingStatusFromQuery, viewFromQuery, setCattleGroupBy])

  /** Home alert deep link: `/cattle?filter=in-labor` matches roster calving filter. */
  useEffect(() => {
    if (filterFromQuery !== "in-labor") return
    startTransition(() => {
      setHerdCalvingFilters(new Set(["in-labor"]))
      if (viewFromQuery !== "pasture") setCattleGroupBy("all")
    })
  }, [filterFromQuery, viewFromQuery, setCattleGroupBy])

  const healthFromQuery = searchParams.get("health")
  const healthStatusFromQuery = searchParams.get("healthStatus")
  const careDueFromQuery = searchParams.get("careDue")
  useEffect(() => {
    startTransition(() => setHerdCareDueKind(parseCattleCareDueParam(careDueFromQuery)))
  }, [careDueFromQuery])

  useEffect(() => {
    if (!healthFromQuery) return
    if (!HEALTH_PARAM_VALUES.has(healthFromQuery as HerdHealthFilterId)) return
    startTransition(() => {
      setHerdHealthFilters(new Set([healthFromQuery as HerdHealthFilterId]))
      if (viewFromQuery !== "pasture") setCattleGroupBy("all")
    })
  }, [healthFromQuery, viewFromQuery, setCattleGroupBy])

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
      if (viewFromQuery !== "pasture") setCattleGroupBy("all")
    })
  }, [healthStatusFromQuery, viewFromQuery, setCattleGroupBy])

  useEffect(() => {
    if (viewFromQuery === "pasture") {
      startTransition(() => setCattleGroupBy("pasture"))
    } else if (viewFromQuery === "all") {
      startTransition(() => setCattleGroupBy("all"))
    }
  }, [viewFromQuery, setCattleGroupBy])

  const [herdSortKey, setHerdSortKey] = useState<CattleSortKey>("tag")
  const [herdSortDir, setHerdSortDir] = useState<"asc" | "desc">("asc")
  const herdFilterRef = useRef<HTMLDivElement>(null)
  const [slideCattleId, setSlideCattleId] = useState<string | null>(null)
  const [slideLogOpen, setSlideLogOpen] = useState<{
    nonce: number
    initialObservation: ObservationEntry | null
  } | null>(null)
  const isLg = useMediaQuery("(min-width: 1024px)")

  useEffect(() => {
    startTransition(() => {
      setSlideCattleId(null)
      setSlideLogOpen(null)
    })
  }, [cattleGroupBy])

  useCloseOnOutsidePointerDown({
    open: herdFilterOpen,
    setOpen: setHerdFilterOpen,
    ref: herdFilterRef,
  })

  const pastureNameById = useMemo(
    () => Object.fromEntries(pastures.map((p) => [p.id, p.name])),
    [pastures]
  )

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
    if (initial) {
      setSlideLogOpen({ nonce: Date.now(), initialObservation: initial })
    } else {
      setSlideLogOpen(null)
    }
  }, [])
  const closeCattleSlide = useCallback(() => {
    setSlideCattleId(null)
    setSlideLogOpen(null)
  }, [])
  const consumeSlideLogOpen = useCallback(() => setSlideLogOpen(null), [])

  const allHerdRows = useMemo(() => {
    const filtered = filterCattleList(cattle, {
      searchTrimmed: herdSearch.trim(),
      breed: herdBreedFilter,
      calvingFilters: herdCalvingFilters,
      healthFilters: herdHealthFilters,
      careDueKind: herdCareDueKind,
    })
    return sortCattleList(filtered, herdSortKey, herdSortDir, pastureNameById)
  }, [
    cattle,
    herdSearch,
    herdBreedFilter,
    herdCalvingFilters,
    herdHealthFilters,
    herdCareDueKind,
    herdSortKey,
    herdSortDir,
    pastureNameById,
  ])

  function handleHerdSort(column: CattleSortKey) {
    if (column === herdSortKey) {
      setHerdSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setHerdSortKey(column)
      setHerdSortDir("asc")
    }
  }

  const sortedPastures = useMemo(
    () => [...pastures].sort((a, b) => PASTURE_TYPE_ORDER[a.type] - PASTURE_TYPE_ORDER[b.type]),
    [pastures]
  )

  const pastureSearchFiltered = useMemo(() => {
    const q = herdSearch.trim().toLowerCase()
    if (!q) return sortedPastures
    return sortedPastures.filter(
      (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    )
  }, [sortedPastures, herdSearch])

  const herdFilterControl = (
    <div className="relative shrink-0" ref={herdFilterRef}>
      <WorkspaceFilterButton
        type="button"
        aria-expanded={herdFilterOpen}
        aria-haspopup="true"
        onClick={() => setHerdFilterOpen((o) => !o)}
      />
      {herdFilterOpen ? (
        <div className={workspaceFilterPanelClass}>
          <CattleFilterPanel
            showSearch
            searchValue={herdSearch}
            onSearchChange={setHerdSearch}
            calvingFilters={herdCalvingFilters}
            setCalvingFilters={setHerdCalvingFilters}
            healthFilters={herdHealthFilters}
            setHealthFilters={setHerdHealthFilters}
            breedFilter={herdBreedFilter}
            setBreedFilter={setHerdBreedFilter}
            showBreedSection={!isLg}
            onReset={() =>
              resetCattleToolbarFilters({
                setSearch: setHerdSearch,
                setCalvingFilters: setHerdCalvingFilters,
                setHealthFilters: setHerdHealthFilters,
                setBreedFilter: setHerdBreedFilter,
                setCareDueKind: setHerdCareDueKind,
              })
            }
            onApply={() => setHerdFilterOpen(false)}
          />
        </div>
      ) : null}
    </div>
  )

  function renderPastureCards(list: Pasture[]) {
    return (
      <>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {list.map((p) => (
            <PastureCard
              key={p.id}
              pasture={p}
              cattle={cattle}
              observationsByCattleId={observationsByCattleId}
              onNavigatePasture={() => navigate(`/cattle/${p.id}`)}
              onLogCheck={() =>
                openPastureCheckModal({ pastureId: p.id, pastureName: p.name })
              }
            />
          ))}
        </div>
      </>
    )
  }

  let groupedBody: ReactNode
  if (cattleGroupBy === "all") {
    groupedBody = (
      <div className="flex flex-col gap-4">
        <div className="flex min-h-[calc(100vh-180px)] min-w-0 flex-col gap-4 md:flex-row md:items-start md:gap-4">
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <CattleRosterTable
              rows={allHerdRows}
              showPastureColumn
              pastureNames={pastureNameById}
              sortKey={herdSortKey}
              sortDir={herdSortDir}
              onSort={handleHerdSort}
              onRowClick={openCattleSlide}
              selectedCattleId={slideCattleId}
              onOpenObservationLog={openCattleSlideToObservationLog}
              emphasizeObservationColumn={Boolean(selectedSlideCattle)}
            />
          </div>
          <CattleDetailPanel
            cattle={selectedSlideCattle}
            pastureName={
              selectedSlideCattle
                ? pastureNameById[selectedSlideCattle.pastureId] ?? selectedSlideCattle.pastureId
                : ""
            }
            observations={
              selectedSlideCattle
                ? observationsByCattleId[selectedSlideCattle.id] ?? []
                : []
            }
            onClose={closeCattleSlide}
            slideLogOpen={slideLogOpen}
            onSlideLogOpenConsumed={consumeSlideLogOpen}
          />
        </div>
      </div>
    )
  } else {
    groupedBody = (
      <div className="flex flex-col gap-4">
        {renderPastureCards(pastureSearchFiltered)}
      </div>
    )
  }

  return (
    <RanchWorkspaceShell
      searchValue={herdSearch}
      onSearchChange={setHerdSearch}
      searchPlaceholder="Search"
      searchAriaLabel="Search"
      contentClassName={WORKSPACE_PAGE_SCROLL_CLASS}
    >
      <div className={WORKSPACE_PAGE_CARD_CLASS}>
        <PageTitleStrip
          className="border-b-0 pb-0"
          title="Cattle"
          titleClassName="text-xl font-bold tracking-normal text-foreground lg:font-semibold lg:text-foreground"
          inlineAfterTitle={
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <CattleViewModeSegmented
                value={cattleGroupBy}
                onChange={setCattleGroupBy}
                herdCount={allHerdRows.length}
                pastureCount={sortedPastures.length}
              />
              {herdFilterControl}
            </div>
          }
          actions={
            <div className="hidden shrink-0 sm:flex">
              <Button type="button" variant="primary-dark" className="h-9 min-h-9 px-4" onClick={() => setAddAnimalOpen(true)}>
                Add cattle
              </Button>
            </div>
          }
        />
        <Button
          type="button"
          variant="primary-dark"
          className="h-9 w-full px-4 sm:hidden"
          onClick={() => setAddAnimalOpen(true)}
        >
          Add cattle
        </Button>

        {groupedBody}
      </div>
      <AddAnimalModal open={addAnimalOpen} onOpenChange={setAddAnimalOpen} />
    </RanchWorkspaceShell>
  )
}
