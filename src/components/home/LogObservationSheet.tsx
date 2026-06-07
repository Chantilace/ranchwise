import { Dialog } from "@base-ui/react/dialog"
import { formatDistanceToNow } from "date-fns"
import { X } from "lucide-react"
import { LiaHorseSolid } from "react-icons/lia"
import { FaCow } from "react-icons/fa6"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { StatusBadge } from "@/components/StatusBadge"
import { CattleAvatar } from "@/components/CattleAvatar"
import { CattleCalvingEventFields } from "@/components/CattleCalvingEventFields"
import { CattleCalvingStatusRow } from "@/components/CattleCalvingStatusRow"
import { getCalvingStatus } from "@/lib/calvingStatus"
import {
  calvingEventCattleUpdate,
  emptyCalvingEventDraft,
  isCattleCalvingEligible,
} from "@/lib/cattleCalvingEvent"
import { SearchField } from "@/components/ui/search-field"
import { buttonVariants } from "@/components/ui/button"
import { Tabs, type TabItem } from "@/components/ui/tabs"
import type { HorseTableRow } from "@/components/RanchWiseHorseRoster"
import { horseRowKey } from "@/components/RanchWiseHorseRoster"
import { getAiRiskLevelFromObservations, getLatestObservationWithAi } from "@/lib/animalUtils"
import { formatObservationDate } from "@/lib/initialObservations"
import { showObservationDiscardedToast } from "@/lib/observationDiscardToast"
import { getObservationDomain, observationDomainFromCategory } from "@/lib/observationDomain"
import { HORSE_OBSERVATION_CATEGORIES } from "@/lib/observationCategories"
import { LOG_OBSERVATION_IDENTITY_ROW } from "@/lib/logObservationLayout"
import { CattleLoggingStatusSection } from "@/components/CattleLoggingStatusSection"
import { ObservationTimeline } from "@/components/ObservationTimeline"
import {
  LogObservationFormFooter,
  useLogObservationFormController,
  type LogObservationFormController,
  type UseLogObservationFormControllerArgs,
} from "@/components/LogObservationModal"
import type { LogObservationCommitAnalyzeMeta } from "@/lib/observationAnalyzeContext"
import { useRanchData } from "@/contexts/RanchDataContext"
import { getCattleEffectiveHealthRisk } from "@/lib/cattleSelectors"
import { cattleTagBare, formatCattleTagDisplay } from "@/lib/cattleUi"
import { useScrollShadow } from "@/hooks/useScrollShadow"
import type { Cattle, Pasture } from "@/types/cattle"
import type { ObservationEntry, RiskLevel } from "@/types/observation"
import { cn } from "@/lib/utils"
import { useOverlayRegistration } from "@/contexts/OverlayRegistryContext"

type SheetState = "search" | "cattle-prep" | "form"
type Species = "cattle" | "horse" | "pasture"
type ConfirmStatus = "good" | "monitor" | "flag"

type UnifiedAnimal =
  | (Cattle & {
      species: "cattle"
      displayTag: string
      displayName?: string
      breedLabel: string
      ageDisplay: string
      pastureLabel: string
    })
  | (HorseTableRow & {
      species: "horse"
      displayTag: string
      breedLabel: string
      ageDisplay: string
      pastureLabel: string
    })

type UnifiedPasture = Pick<Pasture, "id" | "name" | "terrain" | "profileImageUrl"> & {
  species: "pasture"
}

type SheetItem = UnifiedAnimal | UnifiedPasture

function horseStatusFromAiRiskLevel(level: RiskLevel | null): HorseTableRow["healthStatus"] {
  if (level === "flag") return "flag"
  if (level === "monitor") return "monitor"
  return "good"
}

function syncHorseProfileFromObservations(
  horseKey: string,
  nextObservations: ObservationEntry[],
  updateHerdHorse: (horseKey: string, patch: Partial<HorseTableRow>) => void
) {
  const healthSubset = nextObservations.filter((o) => getObservationDomain(o) === "health")
  const behaviorSubset = nextObservations.filter((o) => getObservationDomain(o) === "behavior")
  const healthLevel = getAiRiskLevelFromObservations(healthSubset)
  const behaviorLevel = getAiRiskLevelFromObservations(behaviorSubset)
  const latestWithAi = getLatestObservationWithAi(nextObservations)
  const ai = latestWithAi?.aiResult ?? null
  const note = ai?.patternNote?.trim()
  const first = ai?.recommendations?.[0]?.trim()
  const summary = note || first || undefined
  updateHerdHorse(horseKey, {
    healthStatus: horseStatusFromAiRiskLevel(healthLevel),
    behaviorStatus: horseStatusFromAiRiskLevel(behaviorLevel),
    ...(summary ? { aiSummary: summary } : { aiSummary: undefined }),
  })
}

function cattleHealthFromRiskLevel(level: RiskLevel): NonNullable<Cattle["healthStatus"]> {
  if (level === "flag") return "Flag"
  if (level === "monitor") return "Monitor"
  return "Good"
}

function riskLevelToConfirmStatus(r: RiskLevel): ConfirmStatus {
  if (r === "flag") return "flag"
  if (r === "monitor") return "monitor"
  return "good"
}

function healthBadgeStatus(
  species: Species,
  row: UnifiedAnimal,
  observationsByCattleId?: Record<string, ObservationEntry[]>
): "good" | "monitor" | "flag" {
  if (species === "cattle") {
    if (observationsByCattleId) {
      const r = getCattleEffectiveHealthRisk(row as Cattle, observationsByCattleId)
      if (r === "flag") return "flag"
      if (r === "monitor") return "monitor"
      return "good"
    }
    const h = (row as Cattle).healthStatus ?? "Good"
    if (h === "Flag") return "flag"
    if (h === "Monitor") return "monitor"
    return "good"
  }
  if (row.healthStatus === "flag") return "flag"
  if (row.healthStatus === "monitor") return "monitor"
  return "good"
}

function behaviorBadgeStatus(row: HorseTableRow): "good" | "monitor" | "flag" {
  if (row.behaviorStatus === "flag") return "flag"
  if (row.behaviorStatus === "monitor") return "monitor"
  return "good"
}

function buildUnifiedCattle(c: Cattle, pastureName: string): UnifiedAnimal {
  return {
    ...c,
    species: "cattle",
    displayTag: formatCattleTagDisplay(c.tagNumber),
    displayName: c.displayName,
    breedLabel: c.breed,
    ageDisplay: `${c.age}`,
    pastureLabel: pastureName,
  }
}

function buildUnifiedHorse(h: HorseTableRow): UnifiedAnimal {
  return {
    ...h,
    species: "horse",
    /** Internal / search only — not shown as a second title next to the horse name in the sheet UI. */
    displayTag: h.id != null ? String(h.id) : h.name,
    breedLabel: h.sex || h.role || "—",
    ageDisplay: h.age.replace(/\s*yrs?$/i, "").trim() || h.age,
    pastureLabel: h.pasture,
  }
}

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function ResultScrollTrigger({
  phase,
  scrollRef,
}: {
  phase: string
  scrollRef: React.MutableRefObject<HTMLDivElement | null>
}) {
  useEffect(() => {
    if (phase !== "result") return
    const el = scrollRef.current
    if (!el) return
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    })
    return () => cancelAnimationFrame(raf)
  }, [phase, scrollRef])
  return null
}

function LogSheetObservationLogBridge({
  children,
  ...hookArgs
}: Omit<UseLogObservationFormControllerArgs, "mode"> & {
  children: (c: LogObservationFormController) => ReactNode
}) {
  const c = useLogObservationFormController({ ...hookArgs, mode: "sheet" })
  return <>{children(c)}</>
}

function LogObservationSheetTabsStrip({
  items,
  activeTab,
  onChange,
  sheetHeaderScrolled,
}: {
  items: TabItem[]
  activeTab: "log" | "history"
  onChange: (id: "log" | "history") => void
  sheetHeaderScrolled: boolean
}) {
  return (
    <div
      className="sticky top-0 z-10 mb-2 scroll-shadow-header bg-card"
      data-scrolled={sheetHeaderScrolled ? "true" : undefined}
    >
      <Tabs
        items={items}
        activeTab={activeTab}
        onChange={(id) => onChange(id as "log" | "history")}
        ariaLabel="Log observation views"
        className="flex w-full min-w-0 gap-0 border-b border-border"
        tabClassName="-mb-px flex min-w-0 flex-1 items-center justify-center px-2.5 py-2 text-base sm:px-4"
      />
    </div>
  )
}

export type LogObservationSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogObservationSheet({ open, onOpenChange }: LogObservationSheetProps) {
  useOverlayRegistration(open)
  const {
    cattle,
    herdRows,
    pastures,
    observationsByHorse,
    observationsByCattleId,
    appendObservation,
    appendCattleObservation,
    setObservationsForHorse,
    saveCattleObservationLog,
    removeHorseObservation,
    removeCattleObservation,
    updateCattle,
    updateHerdHorse,
    closeRecordCalvingModal,
    recordCalvingModal,
    openPastureCheckModal,
  } = useRanchData()

  const [sheetState, setSheetState] = useState<SheetState>("search")
  const [query, setQuery] = useState("")
  const [selectedAnimal, setSelectedAnimal] = useState<UnifiedAnimal | null>(null)
  const [, setObserverName] = useState(() => {
    try {
      return localStorage.getItem("observerName") ?? ""
    } catch {
      return ""
    }
  })
  const [activeTab, setActiveTab] = useState<"log" | "history">("log")
  const [calvingDraft, setCalvingDraft] = useState(emptyCalvingEventDraft)

  const committedHorseKeyRef = useRef<string | null>(null)
  const committedHorseObsIdRef = useRef<string | null>(null)
  const committedCattleIdRef = useRef<string | null>(null)
  const committedCattleObsIdRef = useRef<string | null>(null)

  const searchInputRef = useRef<HTMLDivElement>(null)
  const { scrollRef: sheetBodyScrollRef, isScrolled: sheetHeaderScrolled } = useScrollShadow()
  const tabContentRef = useRef<HTMLDivElement>(null)
  const logTabMeasureRef = useRef<HTMLDivElement>(null)
  const [lockedTabHeight, setLockedTabHeight] = useState<number | null>(null)
  const scrollBodyElRef = useRef<HTMLDivElement | null>(null)

  const pastureNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pastures) m.set(p.id, p.name)
    return m
  }, [pastures])

  const searchResults = useMemo((): SheetItem[] => {
    if (!query.trim()) return []
    const q = cattleTagBare(query).toLowerCase()
    const cattleResults: SheetItem[] = cattle
      .filter(
        (c) =>
          cattleTagBare(c.tagNumber).toLowerCase().includes(q) ||
          (c.displayName?.toLowerCase().includes(q) ?? false)
      )
      .map((c) => buildUnifiedCattle(c, pastureNameById.get(c.pastureId) ?? "Pasture"))
    const horseResults: SheetItem[] = herdRows
      .filter((h) => {
        const idStr = h.id != null ? String(h.id).toLowerCase() : ""
        return idStr.includes(q) || h.name.toLowerCase().includes(q)
      })
      .map((h) => buildUnifiedHorse(h))
    const pastureResults: SheetItem[] = pastures
      .filter((p) => p.name.toLowerCase().includes(q))
      .map((p) => ({
        species: "pasture" as const,
        id: p.id,
        name: p.name,
        terrain: p.terrain,
        profileImageUrl: p.profileImageUrl,
      }))
    return [...cattleResults, ...horseResults, ...pastureResults].slice(0, 12)
  }, [query, cattle, herdRows, pastures, pastureNameById])

  const sheetObservationEntries = useMemo((): ObservationEntry[] => {
    if (!selectedAnimal || sheetState === "search") return []
    if (selectedAnimal.species === "cattle") {
      return observationsByCattleId[selectedAnimal.id] ?? []
    }
    return observationsByHorse[horseRowKey(selectedAnimal)] ?? []
  }, [selectedAnimal, sheetState, observationsByCattleId, observationsByHorse])

  const resetOpen = useCallback(() => {
    setSheetState("search")
    setSelectedAnimal(null)
    setQuery("")
    committedHorseKeyRef.current = null
    committedHorseObsIdRef.current = null
    committedCattleIdRef.current = null
    committedCattleObsIdRef.current = null
    try {
      setObserverName(localStorage.getItem("observerName") ?? "")
    } catch {
      setObserverName("")
    }
  }, [])

  useEffect(() => {
    if (open) {
      resetOpen()
    }
  }, [open, resetOpen])

  const prevSheetOpenRef = useRef(open)
  useEffect(() => {
    const wasOpen = prevSheetOpenRef.current
    prevSheetOpenRef.current = open
    if (wasOpen && !open) {
      closeRecordCalvingModal()
    }
  }, [open, closeRecordCalvingModal])

  /** After global Record calving closes, herd `cattle` is updated but `selectedAnimal` was a search snapshot — resync so cattle-prep / form match calving + health state. */
  const prevRecordCalvingRef = useRef<typeof recordCalvingModal | undefined>(undefined)
  useEffect(() => {
    const prev = prevRecordCalvingRef.current
    prevRecordCalvingRef.current = recordCalvingModal
    if (prev === undefined) return
    const calvingJustClosed = prev !== null && recordCalvingModal === null
    if (!calvingJustClosed || !open) return
    setSelectedAnimal((current) => {
      if (!current || current.species !== "cattle") return current
      const row = cattle.find((c) => c.id === current.id)
      if (!row) return current
      return buildUnifiedCattle(row, pastureNameById.get(row.pastureId) ?? "Pasture")
    })
  }, [recordCalvingModal, open, cattle, pastureNameById])

  useEffect(() => {
    if (open && sheetState === "search") {
      const t = window.setTimeout(() => {
        searchInputRef.current?.querySelector("input")?.focus()
      }, 50)
      return () => window.clearTimeout(t)
    }
  }, [open, sheetState])

  // Lock the Log/History content height to the Log tab's first-paint height
  // so tab switches do not resize the sheet (History scrolls internally when needed).
  useLayoutEffect(() => {
    if (!open) return
    if (lockedTabHeight != null) return
    if (sheetState !== "form") return
    if (activeTab !== "log") return
    const el = logTabMeasureRef.current
    if (!el) return
    setLockedTabHeight(el.getBoundingClientRect().height)
  }, [open, sheetState, activeTab, lockedTabHeight])

  useEffect(() => {
    if (!open) setLockedTabHeight(null)
  }, [open])

  useEffect(() => {
    if (open) setActiveTab("log")
  }, [open])

  const observationCount = sheetObservationEntries.length

  const logSheetTabItems = useMemo((): TabItem[] => {
    const history: TabItem = {
      id: "history",
      label: "History",
      ...(observationCount > 0
        ? {
            count: observationCount,
            countClassName: "ml-1 text-sm font-normal text-muted-foreground",
          }
        : {}),
    }
    return [{ id: "log", label: "Log" }, history]
  }, [observationCount])

  const selectItem = (item: SheetItem) => {
    if (item.species === "pasture") {
      openPastureCheckModal({ pastureId: item.id, pastureName: item.name })
      onOpenChange(false)
      return
    }
    setSelectedAnimal(item)
    setActiveTab("log")
    setCalvingDraft(emptyCalvingEventDraft())
    if (item.species === "cattle") {
      setSheetState("cattle-prep")
    } else {
      setSheetState("form")
    }
  }

  const displayNameForAnimal = (a: UnifiedAnimal) =>
    a.species === "cattle" ? (a.displayName?.trim() ? a.displayName : undefined) : a.name

  /** Primary headline in the sheet — horses use the friendly name only (no stable id slug). */
  const identityTitle = (a: UnifiedAnimal) =>
    a.species === "horse" ? a.name : displayNameForAnimal(a) ?? a.displayTag

  const handleSheetSave: UseLogObservationFormControllerArgs["onSave"] = async (data, meta) => {
    if (!selectedAnimal || data.kind !== "animal") return
    const stage = meta?.stage ?? "done"

    if (stage === "done" || stage === "discard") {
      try {
        localStorage.setItem("observerName", data.loggedBy.trim())
      } catch {
        /* ignore */
      }
    }

    if (stage === "commit") {
      if (selectedAnimal.species === "horse") {
        const key = horseRowKey(selectedAnimal)
        const priorForAi = [...(observationsByHorse[key] ?? [])]
        const entry: ObservationEntry = {
          id: crypto.randomUUID(),
          date: formatObservationDate(new Date()),
          category: data.category,
          observationDomain: observationDomainFromCategory(data.category),
          notes: data.notes.trim(),
          loggedBy: data.loggedBy.trim(),
          aiResult: data.aiResult,
        }
        committedHorseKeyRef.current = key
        committedHorseObsIdRef.current = entry.id
        appendObservation(key, entry)
        const nextHorseObs = [entry, ...(observationsByHorse[key] ?? [])]
        syncHorseProfileFromObservations(key, nextHorseObs, updateHerdHorse)
        const metaOut: LogObservationCommitAnalyzeMeta = {
          kind: "horse",
          horseKey: key,
          horseId: String(selectedAnimal.id),
          entityName: identityTitle(selectedAnimal),
          priorObservations: priorForAi,
        }
        return metaOut
      }
      const cid = selectedAnimal.id
      const priorForAi = [...(observationsByCattleId[cid] ?? [])]
      committedCattleIdRef.current = cid
      const returned = saveCattleObservationLog(
        cid,
        {
          category: calvingDraft.enabled ? "Calving" : data.category,
          notes: data.notes.trim(),
          loggedBy: data.loggedBy.trim(),
          aiResult: data.aiResult,
        },
        undefined
      )
      committedCattleObsIdRef.current = typeof returned === "string" ? returned : null
      const c = selectedAnimal as Cattle
      const metaOut: LogObservationCommitAnalyzeMeta = {
        kind: "cattle",
        cattleId: cid,
        entityName: identityTitle(selectedAnimal),
        priorObservations: priorForAi,
        calvingStatus: c.calvingStatus,
        cattleCalvingSnapshot: {
          calvingDate: c.calvingDate,
          deliveryType: c.deliveryType ?? null,
          calvingComplications: c.calvingComplications ?? null,
          calvingStatus: c.calvingStatus,
        },
      }
      return metaOut
    }

    if (stage === "discard") {
      if (selectedAnimal.species === "horse") {
        const key = committedHorseKeyRef.current
        const oid = committedHorseObsIdRef.current
        if (!key || !oid) return true
        const list = observationsByHorse[key] ?? []
        const snap = list.find((o) => o.id === oid)
        if (!snap) return true
        const postRemove = list.filter((o) => o.id !== oid)
        removeHorseObservation(key, oid)
        syncHorseProfileFromObservations(key, postRemove, updateHerdHorse)
        committedHorseKeyRef.current = null
        committedHorseObsIdRef.current = null
        onOpenChange(false)
        showObservationDiscardedToast(() => {
          setObservationsForHorse(key, [snap, ...postRemove])
          syncHorseProfileFromObservations(key, [snap, ...postRemove], updateHerdHorse)
        })
        return true
      }

      const cid = committedCattleIdRef.current
      const oid = committedCattleObsIdRef.current
      if (!cid || !oid) return true
      const list = observationsByCattleId[cid] ?? []
      const snap = list.find((o) => o.id === oid)
      if (!snap) return true
      const postRemove = list.filter((o) => o.id !== oid)
      removeCattleObservation(cid, oid)
      const lvl = getAiRiskLevelFromObservations(postRemove)
      updateCattle(cid, { healthStatus: lvl ? cattleHealthFromRiskLevel(lvl) : "Good" })
      committedCattleIdRef.current = null
      committedCattleObsIdRef.current = null
      onOpenChange(false)
      showObservationDiscardedToast(() => {
        appendCattleObservation(cid, snap)
        const merged = [snap, ...postRemove]
        const restoreLvl = getAiRiskLevelFromObservations(merged)
        updateCattle(cid, {
          healthStatus: restoreLvl
            ? cattleHealthFromRiskLevel(restoreLvl)
            : cattleHealthFromRiskLevel(snap.aiResult?.riskLevel ?? "good"),
          lastObservation: formatDistanceToNow(new Date(), { addSuffix: true }),
        })
      })
      return true
    }

    // done
    if (selectedAnimal.species === "horse" && committedHorseKeyRef.current && committedHorseObsIdRef.current) {
      const key = committedHorseKeyRef.current
      const oid = committedHorseObsIdRef.current
      const next = (observationsByHorse[key] ?? []).map((o) =>
        o.id === oid
          ? {
              ...o,
              category: data.category,
              observationDomain: observationDomainFromCategory(data.category),
              notes: data.notes.trim(),
              loggedBy: data.loggedBy.trim(),
              aiResult: data.aiResult,
            }
          : o
      )
      setObservationsForHorse(key, next)
      const summary =
        data.aiResult.patternNote?.trim() ||
        (data.aiResult.recommendations[0] ? data.aiResult.recommendations[0].trim() : "")
      const nextStatus = riskLevelToConfirmStatus(data.aiResult.riskLevel)
      const patch: Partial<HorseTableRow> = {
        ...(data.category === "Health" ? { healthStatus: nextStatus } : { behaviorStatus: nextStatus }),
        ...(summary ? { aiSummary: summary } : { aiSummary: undefined }),
      }
      updateHerdHorse(key, patch)
    } else if (selectedAnimal.species === "cattle" && committedCattleIdRef.current && committedCattleObsIdRef.current) {
      const cid = committedCattleIdRef.current
      const oid = committedCattleObsIdRef.current
      const prev = observationsByCattleId[cid] ?? []
      const editing = prev.find((o) => o.id === oid)
      if (editing) {
        saveCattleObservationLog(
          cid,
          { category: data.category, notes: data.notes.trim(), loggedBy: data.loggedBy.trim(), aiResult: data.aiResult },
          { ...editing, category: data.category, notes: data.notes.trim(), loggedBy: data.loggedBy.trim(), aiResult: data.aiResult }
        )
      }
      updateCattle(cid, { healthStatus: cattleHealthFromRiskLevel(data.aiResult.riskLevel) })
      const calvingUpdate = calvingEventCattleUpdate(calvingDraft)
      if (calvingUpdate) updateCattle(cid, calvingUpdate)
    }

    onOpenChange(false)
    return true
  }

  const goChangeAnimal = () => {
    setSheetState("search")
    setActiveTab("log")
    setSelectedAnimal(null)
    setLockedTabHeight(null)
    committedHorseKeyRef.current = null
    committedHorseObsIdRef.current = null
    committedCattleIdRef.current = null
    committedCattleObsIdRef.current = null
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-[120] flex items-end justify-center p-0 md:items-center md:p-4">
          <Dialog.Popup
            className={cn(
              "flex w-full max-w-full flex-col border-[0.5px] border-border bg-card text-foreground shadow-xl outline-none",
              "min-h-[44dvh] max-h-[min(90dvh,880px)] rounded-t-2xl md:min-h-0 md:max-w-2xl md:rounded-2xl",
              "translate-y-0 transition-transform duration-200 ease-out data-[starting-style]:translate-y-full md:data-[starting-style]:translate-y-0 md:data-[starting-style]:scale-95"
            )}
          >
            <div className="flex shrink-0 flex-col md:hidden">
              <div className="mx-auto mt-3 h-1 w-8 shrink-0 rounded-full bg-muted" aria-hidden />
            </div>

            <Dialog.Title className="sr-only">Log observation</Dialog.Title>

            <div
              className="scroll-shadow-header shrink-0 rounded-t-2xl bg-card"
              data-scrolled={sheetHeaderScrolled ? "true" : undefined}
            >
              <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 pb-3 pt-4 md:px-6 md:pt-5 md:pb-3">
                <div className="flex min-w-0 justify-start">
                  {sheetState !== "search" ? (
                    <button
                      type="button"
                      onClick={goChangeAnimal}
                      className="cursor-pointer text-left text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      ← Back
                    </button>
                  ) : null}
                </div>
                <p className="text-center text-base font-medium text-foreground">Log observation</p>
                <div className="flex justify-end">
                  <Dialog.Close
                    type="button"
                    className={cn(buttonVariants({ variant: "icon", size: "iconGhost" }))}
                    aria-label="Close"
                  >
                    <X className="size-4" aria-hidden />
                  </Dialog.Close>
                </div>
              </div>

              {selectedAnimal && sheetState !== "search" ? (
                <>
                <div className={LOG_OBSERVATION_IDENTITY_ROW}>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {selectedAnimal.species === "horse" ? (
                      <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                        {selectedAnimal.photoUrl ? (
                          <img
                            src={selectedAnimal.photoUrl}
                            alt=""
                            className="size-full object-cover object-center"
                          />
                        ) : (
                          <span className="text-[13px] font-semibold text-muted-foreground" aria-hidden>
                            {initialsFromName(selectedAnimal.name)}
                          </span>
                        )}
                      </div>
                    ) : selectedAnimal.species === "cattle" ? (
                      <CattleAvatar />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-medium text-foreground">
                          {identityTitle(selectedAnimal)}
                        </span>
                        {selectedAnimal.species === "cattle" && displayNameForAnimal(selectedAnimal) ? (
                          <span className="text-sm text-muted-foreground">{selectedAnimal.displayTag}</span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {selectedAnimal.species === "cattle"
                          ? `${selectedAnimal.breedLabel} · ${selectedAnimal.ageDisplay}y · ${selectedAnimal.pastureLabel}`
                          : `${selectedAnimal.breedLabel} · ${selectedAnimal.age} · ${selectedAnimal.pastureLabel}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-end justify-end gap-1.5">
                    <StatusBadge
                      status={healthBadgeStatus(
                        selectedAnimal.species,
                        selectedAnimal,
                        observationsByCattleId
                      )}
                    />
                    {selectedAnimal.species === "horse" && selectedAnimal.behaviorStatus !== "good" ? (
                      <StatusBadge status={behaviorBadgeStatus(selectedAnimal)} />
                    ) : null}
                  </div>
                </div>
                {selectedAnimal.species === "cattle" &&
                getCalvingStatus(selectedAnimal as Cattle) !== "none" ? (
                  <div className="-mt-1 px-4 pb-4 md:px-6">
                    <CattleCalvingStatusRow cattle={selectedAnimal as Cattle} />
                  </div>
                ) : null}
                </>
              ) : null}
            </div>

            {sheetState === "search" ? (
              <div
                ref={sheetBodyScrollRef}
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto overflow-x-visible",
                  "pt-4 md:pt-5"
                )}
              >
                <div className="px-5 pb-[var(--scroll-area-bottom-pad)] md:px-7">
                  <div ref={searchInputRef} className="w-full">
                    <SearchField
                      variant="inline"
                      size="md"
                      value={query}
                      onChange={setQuery}
                      placeholder="Search by tag #, name, or pasture..."
                      ariaLabel="Search animals by tag number or name, or search pastures"
                      className="w-full"
                      autoComplete="off"
                      fullWidth
                    />
                  </div>
                  {query.trim().length > 0 ? (
                    searchResults.length > 0 ? (
                      <ul
                        className="shadow-card mt-3 max-h-[320px] min-h-0 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-muted/30"
                        role="listbox"
                        aria-label="Search results"
                      >
                        {searchResults.map((item) => {
                          if (item.species === "pasture") {
                            return (
                              <li key={`pasture-${item.id}`}>
                                <button
                                  type="button"
                                  onClick={() => selectItem(item)}
                                  className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                                    {item.profileImageUrl ? (
                                      <img src={item.profileImageUrl} alt="" className="size-full object-cover object-center" />
                                    ) : (
                                      <span className="text-[13px] font-semibold text-muted-foreground" aria-hidden>
                                        {item.name.slice(0, 2).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="truncate text-sm font-medium text-foreground">{item.name}</span>
                                    <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                                      Pasture · {item.terrain}
                                    </p>
                                  </div>
                                </button>
                              </li>
                            )
                          }
                          const animal = item
                          const isCattle = animal.species === "cattle"
                          return (
                            <li key={`${animal.species}-${isCattle ? animal.id : horseRowKey(animal)}`}>
                              <button
                                type="button"
                                onClick={() => selectItem(animal)}
                                className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                              >
                                {isCattle ? (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                                    <FaCow className="size-4 text-muted-foreground" aria-hidden />
                                  </div>
                                ) : (
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                                    {animal.photoUrl ? (
                                      <img
                                        src={animal.photoUrl}
                                        alt=""
                                        className="size-full object-cover object-center"
                                      />
                                    ) : (
                                      <LiaHorseSolid className="size-4 text-muted-foreground" aria-hidden />
                                    )}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex min-w-0 items-center gap-2">
                                    {isCattle ? (
                                      <>
                                        {displayNameForAnimal(animal) ? (
                                          <>
                                            <span className="truncate text-sm font-medium text-foreground">
                                              {displayNameForAnimal(animal)}
                                            </span>
                                            <span className="shrink-0 truncate text-sm text-muted-foreground">
                                              {animal.displayTag}
                                            </span>
                                          </>
                                        ) : (
                                          <span className="truncate text-sm font-medium text-foreground">
                                            {animal.displayTag}
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="truncate text-sm font-medium text-foreground">
                                        {animal.name}
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                                    {animal.species === "cattle"
                                      ? `${animal.breedLabel} · ${animal.ageDisplay}y · ${animal.pastureLabel}`
                                      : `${animal.breedLabel} · ${animal.age} · ${animal.pastureLabel}`}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <StatusBadge
                                    status={healthBadgeStatus(
                                      animal.species,
                                      animal,
                                      observationsByCattleId
                                    )}
                                  />
                                  {animal.species === "horse" && animal.behaviorStatus !== "good" ? (
                                    <StatusBadge status={behaviorBadgeStatus(animal)} />
                                  ) : null}
                                </div>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="py-10 text-center text-sm text-muted-foreground">
                        No animals or pastures found for &quot;{query.trim()}&quot;
                      </p>
                    )
                  ) : null}
                </div>
              </div>
            ) : null}

            {sheetState !== "search" &&
            selectedAnimal &&
            sheetState === "cattle-prep" &&
            selectedAnimal.species === "cattle" ? (
              <div
                ref={sheetBodyScrollRef}
                className="min-h-0 flex-1 overflow-y-auto overflow-x-visible"
              >
                <div className="px-5 pb-[var(--scroll-area-bottom-pad)] md:px-7">
                  <div className="flex flex-col gap-2">
                  <CattleLoggingStatusSection
                    cattle={selectedAnimal as Cattle}
                    pastureName={selectedAnimal.pastureLabel}
                    onLogObservation={() => {
                      setActiveTab("log")
                      setSheetState("form")
                    }}
                    showActions
                    usePanelPadding={false}
                    hideStatusPill
                  />
                  <div className="h-px bg-border" aria-hidden />
                  <ObservationTimeline observations={sheetObservationEntries} />
                </div>
                </div>
              </div>
            ) : null}

            {sheetState !== "search" && selectedAnimal && sheetState === "form" ? (
              <LogSheetObservationLogBridge
                key={
                  selectedAnimal.species === "cattle"
                    ? `cattle-${selectedAnimal.id}`
                    : `horse-${horseRowKey(selectedAnimal)}`
                }
                animalName={identityTitle(selectedAnimal)}
                categories={selectedAnimal.species === "horse" ? HORSE_OBSERVATION_CATEGORIES : undefined}
                hideCategoryField={selectedAnimal.species === "cattle"}
                topSlot={
                  selectedAnimal.species === "cattle" &&
                  isCattleCalvingEligible(selectedAnimal as Cattle)
                    ? ({ disabled }) => (
                        <CattleCalvingEventFields
                          value={calvingDraft}
                          onChange={setCalvingDraft}
                          disabled={disabled}
                        />
                      )
                    : undefined
                }
                onDismiss={() => onOpenChange(false)}
                onSave={handleSheetSave}
              >
                {({ body, footerApi }) => (
                  <>
                    <div
                      ref={(node) => { sheetBodyScrollRef(node); scrollBodyElRef.current = node }}
                      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-visible"
                    >
                      <div className="px-5 pb-[var(--scroll-area-bottom-pad)] md:px-7">
                        <LogObservationSheetTabsStrip
                          items={logSheetTabItems}
                          activeTab={activeTab}
                          onChange={setActiveTab}
                          sheetHeaderScrolled={sheetHeaderScrolled}
                        />
                        <div
                          ref={tabContentRef}
                          className="min-h-0 flex-1 overflow-y-auto"
                          style={lockedTabHeight != null && footerApi.phase !== "result" ? { height: lockedTabHeight } : undefined}
                        >
                          {activeTab === "log" ? (
                            <div ref={logTabMeasureRef} className="pt-4">{body}</div>
                          ) : (
                            <ObservationTimeline observations={sheetObservationEntries} />
                          )}
                        </div>
                      </div>
                    </div>
                    <ResultScrollTrigger phase={footerApi.phase} scrollRef={scrollBodyElRef} />
                    <LogObservationFormFooter variant="sheet" api={footerApi} />
                  </>
                )}
              </LogSheetObservationLogBridge>
            ) : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
