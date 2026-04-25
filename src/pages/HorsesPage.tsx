import { startTransition, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AddHorseModal } from "@/components/AddHorseModal"
import { AddHorseSheet } from "@/components/AddHorseSheet"
import type { NewHorseData } from "@/lib/addHorseForm"
import type { HorseTableRow } from "@/components/HeguyRanchCoPilot"
import { HeguyRanchCoPilot, horseRowKey } from "@/components/HeguyRanchCoPilot"
import { HorseLogSheet } from "@/components/HorseLogSheet"
import { PageTitleStrip } from "@/components/PageTitleStrip"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { Button } from "@/components/ui/button"
import { WorkspaceFilterButton } from "@/components/WorkspaceFilterButton"
import { HorseFilterPanel } from "@/components/workspace/HorseFilterPanel"
import { workspaceFilterPanelClass } from "@/components/workspace/filterPanelStyles"
import { useRanchData } from "@/contexts/RanchDataContext"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useCloseOnOutsidePointerDown } from "@/hooks/useCloseOnOutsidePointerDown"
import {
  resetHorseToolbarFilters,
  createDefaultHorseBehaviorStatusFilterSet,
  createDefaultHorsePastureFilterSet,
  createDefaultHorseSexFilterSet,
  createDefaultHorseStatusFilterSet,
} from "@/lib/horseFilterReset"
import { getDentalStatus, getFarrierStatus } from "@/lib/horseCareUtils"
import { filterHorseList } from "@/lib/horseListFilter"
import {
  isBehaviorRecheckHorse,
  isJuvenileNeedingFirstBehavior,
  isNewBehaviorFlagHorse,
  isTrainingRegressionHorse,
} from "@/lib/todoDerivation"
import { WORKSPACE_PAGE_CARD_CLASS, WORKSPACE_PAGE_SCROLL_CLASS } from "@/lib/workspacePageCard"

type HorseStatusFilterId = "flag" | "monitor" | "good"

const HORSE_STATUS_PARAM_VALUES = new Set<HorseStatusFilterId>(["flag", "monitor", "good"])

function horseStatusFiltersFromSearch(search: string): Set<HorseStatusFilterId> {
  const params = new URLSearchParams(search)
  const healthStatus = params.get("healthStatus")
  if (healthStatus && HORSE_STATUS_PARAM_VALUES.has(healthStatus as HorseStatusFilterId)) {
    return new Set([healthStatus as HorseStatusFilterId])
  }
  const raw = params.get("status")
  if (raw && HORSE_STATUS_PARAM_VALUES.has(raw as HorseStatusFilterId)) {
    return new Set([raw as HorseStatusFilterId])
  }
  return createDefaultHorseStatusFilterSet()
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
  const [searchParams] = useSearchParams()
  const { openLogModal, herdRows, pastureOptions, appendHerdHorse, observationsByHorse } = useRanchData()
  const isMobile = useMediaQuery("(max-width: 767px)")
  const [search, setSearch] = useState("")
  const [addHorseOpen, setAddHorseOpen] = useState(false)
  const [logSheetHorse, setLogSheetHorse] = useState<HorseTableRow | null>(null)
  const [horseFilterOpen, setHorseFilterOpen] = useState(false)
  const [statusFilters, setStatusFilters] = useState<Set<HorseStatusFilterId>>(() =>
    typeof window !== "undefined"
      ? horseStatusFiltersFromSearch(window.location.search)
      : createDefaultHorseStatusFilterSet()
  )
  const [behaviorStatusFilters, setBehaviorStatusFilters] = useState<Set<HorseStatusFilterId>>(
    () => createDefaultHorseBehaviorStatusFilterSet()
  )

  const statusFromQuery = searchParams.get("status")
  const healthStatusFromQuery = searchParams.get("healthStatus")
  const farrierDueFromQuery = searchParams.get("farrierDue") === "true"
  const dentalDueFromQuery = searchParams.get("dentalDue") === "true"

  useEffect(() => {
    if (!statusFromQuery) return
    if (!HORSE_STATUS_PARAM_VALUES.has(statusFromQuery as HorseStatusFilterId)) return
    startTransition(() => {
      setStatusFilters(new Set([statusFromQuery as HorseStatusFilterId]))
    })
  }, [statusFromQuery])

  useEffect(() => {
    if (!healthStatusFromQuery) return
    if (!HORSE_STATUS_PARAM_VALUES.has(healthStatusFromQuery as HorseStatusFilterId)) return
    startTransition(() => {
      setStatusFilters(new Set([healthStatusFromQuery as HorseStatusFilterId]))
    })
  }, [healthStatusFromQuery])
  const [pastureFilters, setPastureFilters] = useState<Set<string>>(new Set())
  const [sexFilters, setSexFilters] = useState<Set<string>>(() => createDefaultHorseSexFilterSet())
  const horseFilterRef = useRef<HTMLDivElement>(null)

  useCloseOnOutsidePointerDown({
    open: horseFilterOpen,
    setOpen: setHorseFilterOpen,
    ref: horseFilterRef,
  })

  const pastureNamesForFilter = useMemo(() => {
    const names = new Set<string>()
    for (const p of pastureOptions) {
      if (p.trim()) names.add(p.trim())
    }
    for (const r of herdRows) {
      if (r.pasture?.trim()) names.add(r.pasture.trim())
    }
    return [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  }, [herdRows, pastureOptions])

  useEffect(() => {
    setPastureFilters(createDefaultHorsePastureFilterSet(pastureNamesForFilter))
  }, [pastureNamesForFilter])

  const horseTodoQueryKey = searchParams.toString()

  const filteredRows = useMemo(() => {
    let list = filterHorseList(herdRows, {
      searchTrimmed: search,
      statusFilters,
      behaviorStatusFilters,
      pastureFilters,
      sexFilters,
      pastureNamesCatalog: pastureNamesForFilter,
    })

    list = list.filter((h) => {
      if (!farrierDueFromQuery && !dentalDueFromQuery) return true
      const farrier = getFarrierStatus(h.lastFarrier ?? h.lastFarrierDate)
      const dental = getDentalStatus(h.lastDentalDate)
      const farrierMatches = farrier.status === "overdue" || farrier.status === "due_soon"
      const dentalMatches = dental.status === "overdue" || dental.status === "due_soon"
      if (farrierDueFromQuery && !farrierMatches) return false
      if (dentalDueFromQuery && !dentalMatches) return false
      return true
    })

    const obsFor = (h: HorseTableRow) => observationsByHorse[horseRowKey(h)]

    const behaviorStatusParam = searchParams.get("behaviorStatus")
    if (behaviorStatusParam === "flag" || behaviorStatusParam === "monitor" || behaviorStatusParam === "good") {
      list = list.filter((h) => h.behaviorStatus === behaviorStatusParam)
    }

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
    pastureFilters,
    sexFilters,
    pastureNamesForFilter,
    farrierDueFromQuery,
    dentalDueFromQuery,
    observationsByHorse,
    horseTodoQueryKey,
  ])

  const horseFilterControl = (
    <div className="relative shrink-0" ref={horseFilterRef}>
      <WorkspaceFilterButton
        type="button"
        aria-expanded={horseFilterOpen}
        aria-haspopup="true"
        aria-label="Filter horses"
        onClick={() => setHorseFilterOpen((o) => !o)}
      />
      {horseFilterOpen ? (
        <div className={workspaceFilterPanelClass}>
          <HorseFilterPanel
            statusFilters={statusFilters}
            setStatusFilters={setStatusFilters}
            behaviorStatusFilters={behaviorStatusFilters}
            setBehaviorStatusFilters={setBehaviorStatusFilters}
            pastureFilters={pastureFilters}
            setPastureFilters={setPastureFilters}
            sexFilters={sexFilters}
            setSexFilters={setSexFilters}
            pastureNames={pastureNamesForFilter}
            onReset={() => {
              resetHorseToolbarFilters({
                setSearch,
                setStatusFilters,
                setPastureFilters,
                setSexFilters,
                pastureNames: pastureNamesForFilter,
              })
              setBehaviorStatusFilters(createDefaultHorseBehaviorStatusFilterSet())
            }}
            onApply={() => setHorseFilterOpen(false)}
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <>
      <RanchWorkspaceShell
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search"
        searchAriaLabel="Search horses by name"
        contentClassName={WORKSPACE_PAGE_SCROLL_CLASS}
      >
        <div className={WORKSPACE_PAGE_CARD_CLASS}>
          <PageTitleStrip
            className="border-b-0 pb-0"
            title="Horses"
            inlineAfterTitle={<div className="flex shrink-0 items-center">{horseFilterControl}</div>}
            actions={
              <div className="hidden shrink-0 sm:inline-flex">
                <Button type="button" variant="primary" onClick={() => setAddHorseOpen(true)}>
                  Add horse
                </Button>
              </div>
            }
          />
          <Button type="button" variant="primary" className="w-full sm:hidden" onClick={() => setAddHorseOpen(true)}>
            Add horse
          </Button>
          <HeguyRanchCoPilot
            horseRows={filteredRows}
            onHorseRowNavigate={(row) => navigate(`/horses/${encodeURIComponent(horseRowKey(row))}`)}
            onHorseLog={(row) => {
              if (isMobile) setLogSheetHorse(row)
              else openLogModal(row)
            }}
          />
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
