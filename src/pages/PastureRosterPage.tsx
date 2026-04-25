import { format, parseISO } from "date-fns"
import { AlertCircle, ArrowDownWideNarrow, ArrowLeft, Check } from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { AddAnimalModal } from "@/components/AddAnimalModal"
import { CattleRosterTable } from "@/components/CattleRosterTable"
import { CattleDetailPanel } from "@/components/CattleDetailPanel"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { SegmentedControl } from "@/components/SegmentedControl"
import { WorkspaceFilterButton, WorkspaceMenuTrigger } from "@/components/WorkspaceFilterButton"
import { WorkspaceSearchField } from "@/components/WorkspaceSearchField"
import { Button, buttonVariants } from "@/components/ui/button"
import { CattleFilterPanel } from "@/components/workspace/CattleFilterPanel"
import { workspaceFilterPanelClass } from "@/components/workspace/filterPanelStyles"
import {
  PastureCheckFilterPanel,
  type PastureCheckStatusFilter,
} from "@/components/workspace/PastureCheckFilterPanel"
import { PastureCheckSortPanel } from "@/components/workspace/PastureCheckSortPanel"
import { useRanchData } from "@/contexts/RanchDataContext"
import { resetCattleToolbarFilters } from "@/lib/cattleFilterReset"
import { pastureSignalBadgeFill } from "@/lib/statusTagTokens"
import { createDefaultCalvingFilterSet, type EffectiveCalvingStatus } from "@/lib/calvingStatus"
import { filterCattleList, sortCattleList, type CattleSortKey } from "@/lib/cattleRosterQuery"
import type { Breed, Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"
import { useCloseOnOutsidePointerDown } from "@/hooks/useCloseOnOutsidePointerDown"
import { cn } from "@/lib/utils"

type PastureRosterTab = "animals" | "checks"

function PastureChecksPanel({ pastureId }: { pastureId: string }) {
  const { pastureChecks } = useRanchData()
  const [checksFilterOpen, setChecksFilterOpen] = useState(false)
  const [checkSearch, setCheckSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<PastureCheckStatusFilter>("all")
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

  const entries = useMemo(() => {
    let list = checksForPasture.slice()
    if (statusFilter === "clear") list = list.filter((c) => c.allClear)
    if (statusFilter === "attention") list = list.filter((c) => !c.allClear)
    const q = checkSearch.trim().toLowerCase()
    if (q) {
      list = list.filter((c) => {
        const by = (c.loggedBy ?? "").toLowerCase()
        const notes = (c.notes ?? "").toLowerCase()
        return by.includes(q) || notes.includes(q)
      })
    }
    list.sort((a, b) => {
      const ta = parseISO(a.date).getTime()
      const tb = parseISO(b.date).getTime()
      return dateSortDir === "desc" ? tb - ta : ta - tb
    })
    return list
  }, [checksForPasture, statusFilter, checkSearch, dateSortDir])

  if (checksForPasture.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No pasture checks logged yet.
        <br />
        <span className="text-xs">Use &quot;Log pasture check&quot; to record your first check.</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5 py-2">
        <div className="relative shrink-0" ref={checksFilterRef}>
          <WorkspaceFilterButton
            type="button"
            aria-expanded={checksFilterOpen}
            aria-haspopup="true"
            onClick={() => setChecksFilterOpen((o) => !o)}
          />
          {checksFilterOpen ? (
            <div className={workspaceFilterPanelClass}>
              <PastureCheckFilterPanel
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                onReset={() => setStatusFilter("all")}
                onApply={() => setChecksFilterOpen(false)}
              />
            </div>
          ) : null}
        </div>
        <WorkspaceSearchField
          value={checkSearch}
          onChange={setCheckSearch}
          placeholder="Search notes or name"
          ariaLabel="Search pasture checks by notes or logged by"
          variant="inline"
          className="h-8 min-h-8 min-w-0 flex-1 max-w-none shadow-[0_1px_2px_rgba(0,0,0,0.05)] md:max-w-[194px] md:flex-none md:shrink-0"
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
        <p className="py-6 text-center text-sm text-muted-foreground">No checks match your filters.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-2 rounded-lg border border-border bg-white p-3"
            >
              <div
                className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                  entry.allClear ? "bg-status-good-bg" : "bg-status-monitor-bg"
                )}
              >
                {entry.allClear ? (
                  <Check className="h-3 w-3 text-status-good-text" aria-hidden />
                ) : (
                  <AlertCircle className="h-3 w-3 text-status-monitor-text" aria-hidden />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">
                    {format(parseISO(entry.date), "MMM d, yyyy")} · {format(parseISO(entry.date), "h:mm a")}
                  </p>
                  <span
                    className={cn(
                      "inline-flex shrink-0 text-xs font-semibold",
                      entry.allClear ? pastureSignalBadgeFill.clear : pastureSignalBadgeFill.flagged
                    )}
                  >
                    {entry.allClear ? "All clear" : "Needs attention"}
                  </span>
                </div>
                <p className="mt-0.5 mb-1 text-xs text-muted-foreground">{entry.loggedBy}</p>
                {entry.notes ? (
                  <p className="text-xs leading-relaxed text-foreground">{entry.notes}</p>
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
  const [sortKey, setSortKey] = useState<CattleSortKey>("tag")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
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
    })
    return sortCattleList(filtered, sortKey, sortDir, {})
  }, [
    cattle,
    pastureId,
    search,
    breedFilter,
    calvingFilters,
    healthFilters,
    sortKey,
    sortDir,
    calvingSoonParam,
  ])

  function handleSort(column: CattleSortKey) {
    if (column === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(column)
      setSortDir("asc")
    }
  }

  if (!pastureId || !pasture) {
    return (
      <RanchWorkspaceShell
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder="Search"
        searchAriaLabel="Search"
      >
        <p className="text-muted-foreground">Pasture not found.</p>
        <Link className={cn(buttonVariants({ variant: "tertiary" }), "mt-4")} to="/pastures">
          Back to pastures
        </Link>
      </RanchWorkspaceShell>
    )
  }

  return (
    <RanchWorkspaceShell
      contentClassName="pt-6"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search"
      searchAriaLabel="Search"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-col gap-2">
          <Link
            to="/pastures"
            className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            Pastures
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
              <div className="min-w-0 shrink-0">
                <h1 className="text-xl font-semibold tracking-normal text-foreground">{pasture.name}</h1>
              </div>
              <div className="flex min-w-0 shrink-0 flex-wrap items-center">
                <SegmentedControl
                  items={[
                    { id: "animals", label: `Animals (${roster.length})` },
                    { id: "checks", label: `Pasture Check (${pastureChecksCount})` },
                  ]}
                  value={pastureTab}
                  onChange={setPastureTab}
                  ariaLabel="Pasture roster sections"
                />
              </div>
            </div>
            <div className="hidden shrink-0 flex-wrap items-center justify-end gap-2 sm:flex">
              <Button
                type="button"
                variant="tertiary"
                size="sm"
                className="h-9 min-h-9 px-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                onClick={() =>
                  openPastureCheckModal({ pastureId: pasture.id, pastureName: pasture.name })
                }
              >
                Log pasture check
              </Button>
              <Button type="button" variant="primary" className="h-9 min-h-9 px-4" onClick={() => setAddAnimalOpen(true)}>
                Add cattle
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:hidden">
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              className="h-9 min-h-9 w-full justify-center px-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              onClick={() =>
                openPastureCheckModal({ pastureId: pasture.id, pastureName: pasture.name })
              }
            >
              Log pasture check
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
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2.5 py-2">
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
              <WorkspaceSearchField
                value={search}
                onChange={setSearch}
                placeholder="Search"
                ariaLabel="Search by tag number"
                variant="inline"
                className="h-8 min-h-8 w-full max-w-[194px] shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              />
            </div>
            <div className="flex min-h-[calc(100vh-180px)] min-w-0 flex-col gap-6 md:flex-row md:items-start md:gap-6">
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
                <CattleRosterTable
                  rows={roster}
                  showPastureColumn={false}
                  pastureNames={{}}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  onRowClick={openCattleSlide}
                  selectedCattleId={slideCattleId}
                  onOpenObservationLog={openCattleSlideToObservationLog}
                  emphasizeObservationColumn={Boolean(selectedSlideCattle)}
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
          <PastureChecksPanel pastureId={pasture.id} />
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
