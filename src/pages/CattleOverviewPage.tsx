import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useSearchParams } from "react-router-dom"
import { CattleRosterTable } from "@/components/CattleRosterTable"
import { CattleDetailPanel } from "@/components/CattleDetailPanel"
import { PageTitleStrip } from "@/components/PageTitleStrip"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { WorkspaceFilterButton } from "@/components/WorkspaceFilterButton"
import { WorkspaceSearchField } from "@/components/WorkspaceSearchField"
import { CattleFilterPanel } from "@/components/workspace/CattleFilterPanel"
import { workspaceFilterPanelClass } from "@/components/workspace/filterPanelStyles"
import { AddAnimalModal } from "@/components/AddAnimalModal"
import { Button } from "@/components/ui/button"
import { useRanchData } from "@/contexts/RanchDataContext"
import { parseCattleCareDueParam, type CattleCareDueKind } from "@/lib/cattleCareDue"
import { filterCattleList, sortCattleList, type CattleSortKey } from "@/lib/cattleRosterQuery"
import { resetCattleToolbarFilters } from "@/lib/cattleFilterReset"
import { WORKSPACE_PAGE_CARD_CLASS, WORKSPACE_PAGE_SCROLL_CLASS } from "@/lib/workspacePageCard"
import {
  CALVING_FILTER_OPTIONS,
  createDefaultCalvingFilterSet,
  type EffectiveCalvingStatus,
} from "@/lib/calvingStatus"
import type { Breed, Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useCloseOnOutsidePointerDown } from "@/hooks/useCloseOnOutsidePointerDown"

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

export function CattleOverviewPage() {
  const [searchParams] = useSearchParams()
  const {
    pastures,
    cattle,
    observationsByCattleId,
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

  const calvingFromQuery = searchParams.get("calving")
  const calvingStatusFromQuery = searchParams.get("calvingStatus")
  const filterFromQuery = searchParams.get("filter")

  useEffect(() => {
    if (!calvingFromQuery) return
    if (!CALVING_PARAM_VALUES.has(calvingFromQuery as EffectiveCalvingStatus)) return
    startTransition(() => {
      setHerdCalvingFilters(new Set([calvingFromQuery as EffectiveCalvingStatus]))
    })
  }, [calvingFromQuery])

  useEffect(() => {
    if (!calvingStatusFromQuery) return
    if (!CALVING_PARAM_VALUES.has(calvingStatusFromQuery as EffectiveCalvingStatus)) return
    startTransition(() => {
      setHerdCalvingFilters(new Set([calvingStatusFromQuery as EffectiveCalvingStatus]))
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

  const [herdSortKey, setHerdSortKey] = useState<CattleSortKey>("tag")
  const [herdSortDir, setHerdSortDir] = useState<"asc" | "desc">("asc")
  const herdFilterRef = useRef<HTMLDivElement>(null)
  const [slideCattleId, setSlideCattleId] = useState<string | null>(null)
  const [slideLogOpen, setSlideLogOpen] = useState<{
    nonce: number
    initialObservation: ObservationEntry | null
  } | null>(null)
  const isLg = useMediaQuery("(min-width: 1024px)")

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

  const hasAnyCattle = cattle.length > 0
  const defaultCalving = createDefaultCalvingFilterSet()
  const defaultHealth = new Set<HerdHealthFilterId>(["Flag", "Monitor", "Good"])
  const isUnfiltered =
    herdSearch.trim() === "" &&
    herdBreedFilter === "all" &&
    herdCareDueKind == null &&
    herdCalvingFilters.size === defaultCalving.size &&
    [...herdCalvingFilters].every((v) => defaultCalving.has(v)) &&
    herdHealthFilters.size === defaultHealth.size &&
    [...herdHealthFilters].every((v) => defaultHealth.has(v))

  return (
    <RanchWorkspaceShell
      searchValue=""
      onSearchChange={() => {}}
      searchPlaceholder="Search everything (coming soon)"
      searchAriaLabel="Search everything"
      contentClassName={WORKSPACE_PAGE_SCROLL_CLASS}
    >
      <div className={WORKSPACE_PAGE_CARD_CLASS}>
        <PageTitleStrip
          className="border-b-0 pb-0"
          title="Cattle"
          titleClassName="text-xl font-bold tracking-normal text-foreground lg:font-semibold lg:text-foreground"
          actions={
            <div className="hidden shrink-0 sm:flex">
              <Button type="button" variant="primary" className="h-9 min-h-9 px-4" onClick={() => setAddAnimalOpen(true)}>
                Add cattle
              </Button>
            </div>
          }
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <WorkspaceSearchField
            variant="inline"
            value={herdSearch}
            onChange={setHerdSearch}
            placeholder="Search cattle by tag #..."
            ariaLabel="Search cattle by tag number"
            className="w-full sm:w-[320px] sm:max-w-none"
          />
          {herdFilterControl}
        </div>
        <Button
          type="button"
          variant="primary"
          className="h-9 w-full px-4 sm:hidden"
          onClick={() => setAddAnimalOpen(true)}
        >
          Add cattle
        </Button>

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
                            <Button
                              type="button"
                              variant="tertiary"
                              onClick={() =>
                                resetCattleToolbarFilters({
                                  setSearch: setHerdSearch,
                                  setCalvingFilters: setHerdCalvingFilters,
                                  setHealthFilters: setHerdHealthFilters,
                                  setBreedFilter: setHerdBreedFilter,
                                  setCareDueKind: setHerdCareDueKind,
                                })
                              }
                            >
                              Clear filters
                            </Button>
                          ),
                        }
                    : undefined
                }
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
      </div>
      <AddAnimalModal open={addAnimalOpen} onOpenChange={setAddAnimalOpen} />
    </RanchWorkspaceShell>
  )
}
