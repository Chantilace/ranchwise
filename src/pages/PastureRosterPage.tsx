import { format } from "date-fns"
import { ArrowDownWideNarrow, ArrowLeft, NotebookPen } from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { AddAnimalModal } from "@/components/AddAnimalModal"
import { CattleRosterTable } from "@/components/CattleRosterTable"
import { CattleDetailPanel } from "@/components/CattleDetailPanel"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { Tabs, type TabItem } from "@/components/ui/tabs"
import { WorkspaceFilterButton, WorkspaceMenuTrigger } from "@/components/WorkspaceFilterButton"
import { SearchField } from "@/components/ui/search-field"
import { Button, buttonVariants } from "@/components/ui/button"
import { CattleFilterPanel } from "@/components/workspace/CattleFilterPanel"
import { workspaceFilterPanelClass } from "@/components/workspace/filterPanelStyles"
import { EntityFilterPanel, type EntityFilterDimension } from "@/components/workspace/EntityFilterPanel"
import { EntityFilterToolbar } from "@/components/workspace/EntityFilterToolbar"
import { PastureCheckSortPanel } from "@/components/workspace/PastureCheckSortPanel"
import { useRanchData } from "@/contexts/RanchDataContext"
import { resetCattleToolbarFilters } from "@/lib/cattleFilterReset"
import { CATEGORY_METADATA_BADGE_CLASS } from "@/lib/categoryBadgeClass"
import { PASTURE_CHECK_CATEGORY_LABELS } from "@/lib/pastureCheckTypes"
import { createDefaultCalvingFilterSet, type EffectiveCalvingStatus } from "@/lib/calvingStatus"
import { filterCattleList, sortCattleList } from "@/lib/cattleRosterQuery"
import type { Breed, Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"
import { useCloseOnOutsidePointerDown } from "@/hooks/useCloseOnOutsidePointerDown"
import { StatusBadge } from "@/components/StatusBadge"
import { WORKSPACE_PAGE_ROSTER_FILL_CLASS } from "@/lib/workspacePageCard"
import { cn } from "@/lib/utils"

type PastureRosterTab = "animals" | "checks"

const PASTURE_CHECK_OUTCOME_OPTIONS = [
  { id: "stable", label: "Stable" },
  { id: "attention", label: "Needs attention" },
] as const

function PastureChecksPanel({ pastureId }: { pastureId: string }) {
  const { pastureChecks } = useRanchData()
  const [checksFilterOpen, setChecksFilterOpen] = useState(false)
  const [checkSearch, setCheckSearch] = useState("")
  const [outcomeFilters, setOutcomeFilters] = useState<Set<string>>(() => new Set())
  const [dateSortDir, setDateSortDir] = useState<"desc" | "asc">("desc")
  const [sortOpen, setSortOpen] = useState(false)
  const checksFilterRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  useCloseOnOutsidePointerDown({
    open: checksFilterOpen,
    setOpen: setChecksFilterOpen,
    ref: checksFilterRef,
  })

  useCloseOnOutsidePointerDown({
    open: sortOpen,
    setOpen: setSortOpen,
    ref: sortRef,
  })

  const checksForPasture = useMemo(
    () => pastureChecks.filter((c) => c.pastureId === pastureId),
    [pastureChecks, pastureId]
  )

  const checkOutcomeActiveCount = useMemo(() => {
    return outcomeFilters.size > 0 && outcomeFilters.size < PASTURE_CHECK_OUTCOME_OPTIONS.length
      ? outcomeFilters.size
      : 0
  }, [outcomeFilters])

  const checkOutcomeDimensions = useMemo((): EntityFilterDimension[] => {
    return [
      {
        kind: "multi",
        id: "outcome",
        label: "Check outcome",
        options: [...PASTURE_CHECK_OUTCOME_OPTIONS],
        selectedIds: outcomeFilters,
        allSelectedLabel: "All",
        placeholder: "All",
        "aria-label": "Pasture check outcome filters",
      },
    ]
  }, [outcomeFilters])

  const onCheckOutcomeMultiChange = useCallback((_id: string, next: Set<string>) => {
    setOutcomeFilters(next)
  }, [])

  const onCheckOutcomeRadioChange = useCallback(() => {}, [])

  const clearCheckOutcomeFilters = useCallback(() => {
    setOutcomeFilters(new Set())
  }, [])

  const entries = useMemo(() => {
    let list = checksForPasture.slice()
    if (outcomeFilters.size > 0 && outcomeFilters.size < PASTURE_CHECK_OUTCOME_OPTIONS.length) {
      if (outcomeFilters.has("stable")) {
        list = list.filter((c) => c.status === "stable")
      } else {
        list = list.filter((c) => c.status === "concern" || c.status === "action_needed")
      }
    }
    const q = checkSearch.trim().toLowerCase()
    if (q) {
      list = list.filter((c) => {
        const by = (c.author ?? "").toLowerCase()
        const body = (c.body ?? "").toLowerCase()
        return by.includes(q) || body.includes(q)
      })
    }
    list.sort((a, b) => {
      const ta = a.date
      const tb = b.date
      return dateSortDir === "desc" ? tb - ta : ta - tb
    })
    return list
  }, [checksForPasture, outcomeFilters, checkSearch, dateSortDir])

  if (checksForPasture.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground">
        No pasture checks logged yet.
        <br />
        <span className="text-[13px]">Use &quot;Log pasture check&quot; to record your first check.</span>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-2.5 py-2">
        <div className="relative shrink-0" ref={checksFilterRef}>
          <EntityFilterToolbar
            open={checksFilterOpen}
            onToggleOpen={() => setChecksFilterOpen((o) => !o)}
            activeCategoryCount={checkOutcomeActiveCount}
            onClearAll={clearCheckOutcomeFilters}
            filterButtonAriaLabel="Filter pasture checks"
          />
          {checksFilterOpen ? (
            <div className={workspaceFilterPanelClass}>
              <EntityFilterPanel
                dimensions={checkOutcomeDimensions}
                onMultiChange={onCheckOutcomeMultiChange}
                onRadioChange={onCheckOutcomeRadioChange}
              />
            </div>
          ) : null}
        </div>
        <SearchField
          size="sm"
          value={checkSearch}
          onChange={setCheckSearch}
          placeholder="Search notes or author"
          ariaLabel="Search pasture checks by notes or author"
          variant="inline"
          fullWidth
          className="min-w-0 flex-1 max-w-none md:max-w-[194px] md:flex-none md:shrink-0"
        />
        <div ref={sortRef} className="relative w-full min-w-0 shrink-0 sm:w-auto">
          <WorkspaceMenuTrigger
            type="button"
            icon={ArrowDownWideNarrow}
            aria-expanded={sortOpen}
            aria-haspopup="true"
            className="w-full min-w-0 sm:w-auto"
            onClick={() => setSortOpen((o) => !o)}
          >
            <span className="min-w-0 truncate">
              {dateSortDir === "desc" ? "Date · Newest first" : "Date · Oldest first"}
            </span>
          </WorkspaceMenuTrigger>
          {sortOpen ? (
            <div className={workspaceFilterPanelClass}>
              <PastureCheckSortPanel
                dateSortDir={dateSortDir}
                setDateSortDir={(v) => {
                  setDateSortDir(v)
                  setSortOpen(false)
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="shrink-0 py-6 text-center text-sm text-muted-foreground">
          No checks match your filters.
        </p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-2 rounded-lg border border-border bg-white p-3"
            >
              <div className="mt-0.5 shrink-0">
                {entry.status ? (
                  <StatusBadge status={entry.status} size="sm" />
                ) : (
                  <span className="inline-flex rounded-md bg-muted px-1.5 py-px text-[13px] font-medium text-muted-foreground">
                    —
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-foreground">
                    {format(entry.date, "MMM d, yyyy")} · {format(entry.date, "h:mm a")}
                  </p>
                  <span className={CATEGORY_METADATA_BADGE_CLASS}>
                    {PASTURE_CHECK_CATEGORY_LABELS[entry.category]}
                  </span>
                </div>
                <p className="mt-0.5 mb-1 text-[13px] text-muted-foreground">{entry.author}</p>
                {entry.body ? (
                  <p className="text-[13px] leading-relaxed text-foreground">{entry.body}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function PastureRosterPage() {
  const { pastureId } = useParams<{ pastureId: string }>()
  const [searchParams] = useSearchParams()
  const {
    pastures,
    cattle,
    pastureChecks,
    openPastureCheckModal,
    observationsByCattleId,
  } = useRanchData()

  const [search, setSearch] = useState("")
  const [breedFilter, setBreedFilter] = useState<"all" | Breed>("all")
  const [filterOpen, setFilterOpen] = useState(false)
  const [calvingFilters, setCalvingFilters] = useState<Set<EffectiveCalvingStatus>>(
    () => createDefaultCalvingFilterSet()
  )
  const [healthFilters, setHealthFilters] = useState<Set<"Flag" | "Monitor" | "Good">>(
    () => new Set(["Flag", "Monitor", "Good"])
  )
  const filterRef = useRef<HTMLDivElement>(null)
  const [pastureTab, setPastureTab] = useState<PastureRosterTab>("animals")
  const [slideCattleId, setSlideCattleId] = useState<string | null>(null)
  const [slideLogOpen, setSlideLogOpen] = useState<{
    nonce: number
    initialObservation: ObservationEntry | null
  } | null>(null)
  const [addAnimalOpen, setAddAnimalOpen] = useState(false)

  const pasture = pastures.find((p) => p.id === pastureId)

  const pastureChecksCount = useMemo(
    () => pastureChecks.filter((c) => c.pastureId === pastureId).length,
    [pastureChecks, pastureId]
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
  useCloseOnOutsidePointerDown({
    open: filterOpen,
    setOpen: setFilterOpen,
    ref: filterRef,
  })
  const calvingSoonParam = searchParams.get("filter") === "calving-soon"

  const roster = useMemo(() => {
    const filtered = filterCattleList(cattle, {
      pastureId,
      searchTrimmed: search.trim(),
      breed: breedFilter,
      calvingFilters,
      healthFilters,
      dueWeekOnly: calvingSoonParam,
      observationsByCattleId,
    })
    return sortCattleList(filtered, { column: "tag", direction: "asc" }, {}, observationsByCattleId)
  }, [
    cattle,
    pastureId,
    search,
    breedFilter,
    calvingFilters,
    healthFilters,
    calvingSoonParam,
    observationsByCattleId,
  ])

  const pastureTabItems = useMemo(
    (): TabItem[] => [
      { id: "animals", label: "Animals", count: roster.length },
      { id: "checks", label: "Pasture Check", count: pastureChecksCount },
    ],
    [roster.length, pastureChecksCount],
  )

  if (!pastureId || !pasture) {
    return (
      <RanchWorkspaceShell
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder="Search"
        searchAriaLabel="Search"
      >
        <p className="text-muted-foreground">Pasture not found.</p>
        <Link className={cn(buttonVariants({ variant: "secondary" }), "mt-4")} to="/pastures">
          Back to pastures
        </Link>
      </RanchWorkspaceShell>
    )
  }

  return (
    <RanchWorkspaceShell
      contentClassName={cn(WORKSPACE_PAGE_ROSTER_FILL_CLASS, "pt-0")}
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search"
      searchAriaLabel="Search"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
        <header className="flex shrink-0 flex-col gap-2">
          <Link
            to="/pastures"
            className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Pastures
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
              <div className="min-w-0 shrink-0">
                <Link
                  to={`/pastures/${pasture.id}`}
                  className="inline-block text-xl font-semibold tracking-normal text-foreground underline-offset-4 hover:underline"
                >
                  {pasture.name}
                </Link>
              </div>
              <div className="flex min-w-0 shrink-0 flex-wrap items-center">
                <Tabs
                  items={pastureTabItems}
                  activeTab={pastureTab}
                  onChange={(id) => setPastureTab(id as PastureRosterTab)}
                  ariaLabel="Pasture roster sections"
                  className="inline-flex min-w-0 max-w-full shrink-0 gap-0 border-b border-border"
                  tabClassName="text-sm font-medium"
                />
              </div>
            </div>
            <div className="hidden shrink-0 flex-wrap items-center justify-end gap-2 sm:flex">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 min-h-9 gap-1.5 px-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                aria-label="Log pasture check"
                onClick={() =>
                  openPastureCheckModal({ pastureId: pasture.id, pastureName: pasture.name })
                }
              >
                <NotebookPen className="size-4 shrink-0" aria-hidden />
                <span className="hidden md:inline">Log pasture check</span>
                <span className="md:hidden">Log</span>
              </Button>
              <Button type="button" variant="primary" className="h-9 min-h-9 px-4" onClick={() => setAddAnimalOpen(true)}>
                Add cattle
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:hidden">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-9 min-h-9 w-full justify-center gap-1.5 px-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              aria-label="Log pasture check"
              onClick={() =>
                openPastureCheckModal({ pastureId: pasture.id, pastureName: pasture.name })
              }
            >
              <NotebookPen className="size-4 shrink-0" aria-hidden />
              <span className="hidden md:inline">Log pasture check</span>
              <span className="md:hidden">Log</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              className="h-9 min-h-9 w-full justify-center px-4"
              onClick={() => setAddAnimalOpen(true)}
            >
              Add cattle
            </Button>
          </div>
        </header>

        {pastureTab === "animals" ? (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-hidden">
            <div className="flex shrink-0 flex-wrap items-center gap-2.5 py-2">
              <div className="relative shrink-0" ref={filterRef}>
              <WorkspaceFilterButton
                type="button"
                aria-expanded={filterOpen}
                aria-haspopup="true"
                onClick={() => setFilterOpen((o) => !o)}
              />
              {filterOpen ? (
                <div className={workspaceFilterPanelClass}>
                  <CattleFilterPanel
                    showSearch={false}
                    searchValue=""
                    onSearchChange={() => {}}
                    calvingFilters={calvingFilters}
                    setCalvingFilters={setCalvingFilters}
                    healthFilters={healthFilters}
                    setHealthFilters={setHealthFilters}
                    breedFilter={breedFilter}
                    setBreedFilter={setBreedFilter}
                    showBreedSection
                    onReset={() =>
                      resetCattleToolbarFilters({
                        setSearch: () => {},
                        setCalvingFilters,
                        setHealthFilters,
                        setBreedFilter,
                      })
                    }
                    onApply={() => setFilterOpen(false)}
                  />
                </div>
              ) : null}
              </div>
              <SearchField
                size="sm"
                value={search}
                onChange={setSearch}
                placeholder="Search"
                ariaLabel="Search by tag number"
                variant="inline"
                className="w-full max-w-[194px] shrink-0"
              />
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-hidden md:flex-row md:items-stretch md:gap-6">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <CattleRosterTable
                  rows={roster}
                  showPastureColumn={false}
                  pastureNames={{}}
                  observationsByCattleId={observationsByCattleId}
                  onRowClick={openCattleSlide}
                  selectedCattleId={slideCattleId}
                  onOpenObservationLog={openCattleSlideToObservationLog}
                />
              </div>
              <CattleDetailPanel
                cattle={selectedSlideCattle}
                pastureName={pasture.name}
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
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <PastureChecksPanel pastureId={pasture.id} />
          </div>
        )}
      </div>
      <AddAnimalModal
        open={addAnimalOpen}
        onOpenChange={setAddAnimalOpen}
        defaultPastureId={pasture.id}
      />
    </RanchWorkspaceShell>
  )
}
