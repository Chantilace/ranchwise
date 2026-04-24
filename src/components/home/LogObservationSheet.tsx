import { Dialog } from "@base-ui/react/dialog"
import { Sparkles, X } from "lucide-react"
import { LiaHorseSolid } from "react-icons/lia"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { SmartSuggestionsPanel } from "@/components/SmartSuggestionsPanel"
import { StatusBadge } from "@/components/StatusBadge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button, buttonVariants } from "@/components/ui/button"
import type { HorseTableRow } from "@/components/HeguyRanchCoPilot"
import { horseRowKey } from "@/components/HeguyRanchCoPilot"
import { getAiRiskLevelFromObservations, getLatestObservationWithAi } from "@/lib/animalUtils"
import { formatObservationDate } from "@/lib/initialObservations"
import { mockAnalyze } from "@/lib/observationAnalyze"
import { getObservationDomain, observationDomainFromCategory } from "@/lib/observationDomain"
import { HORSE_OBSERVATION_CATEGORIES } from "@/lib/observationCategories"
import { LOG_OBSERVATION_IDENTITY_ROW } from "@/lib/logObservationLayout"
import { CattleLoggingStatusSection } from "@/components/CattleLoggingStatusSection"
import { ObservationTimeline } from "@/components/ObservationTimeline"
import { useRanchData } from "@/contexts/RanchDataContext"
import type { Cattle } from "@/types/cattle"
import type { AIResult, Category, ObservationEntry, RiskLevel } from "@/types/observation"
import { cn } from "@/lib/utils"

type SheetState = "search" | "cattle-prep" | "form" | "result"
type Species = "cattle" | "horse"
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

function horseStatusFromAiRiskLevel(level: RiskLevel | null): HorseTableRow["healthStatus"] {
  if (level === "call-vet") return "flag"
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

function cattleHealthFromConfirm(s: ConfirmStatus): NonNullable<Cattle["healthStatus"]> {
  if (s === "flag") return "Flag"
  if (s === "monitor") return "Monitor"
  return "Good"
}

function riskLevelToConfirmStatus(r: RiskLevel): ConfirmStatus {
  if (r === "call-vet") return "flag"
  if (r === "monitor") return "monitor"
  return "good"
}

function confirmStatusToRiskLevel(s: ConfirmStatus): RiskLevel {
  if (s === "flag") return "call-vet"
  if (s === "monitor") return "monitor"
  return "good"
}

function riskLabelFromRisk(level: RiskLevel): string {
  if (level === "call-vet") return "Flag"
  if (level === "monitor") return "Monitor"
  return "Good"
}

function healthBadgeStatus(
  species: Species,
  row: UnifiedAnimal
): "good" | "monitor" | "call-vet" {
  if (species === "cattle") {
    const h = row.healthStatus ?? "Good"
    if (h === "Flag") return "call-vet"
    if (h === "Monitor") return "monitor"
    return "good"
  }
  if (row.healthStatus === "flag") return "call-vet"
  if (row.healthStatus === "monitor") return "monitor"
  return "good"
}

function behaviorBadgeStatus(row: HorseTableRow): "good" | "monitor" | "call-vet" {
  if (row.behaviorStatus === "flag") return "call-vet"
  if (row.behaviorStatus === "monitor") return "monitor"
  return "good"
}

function buildUnifiedCattle(c: Cattle, pastureName: string): UnifiedAnimal {
  return {
    ...c,
    species: "cattle",
    displayTag: c.tagNumber,
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

export type LogObservationSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogObservationSheet({ open, onOpenChange }: LogObservationSheetProps) {
  const {
    cattle,
    herdRows,
    pastures,
    observationsByHorse,
    observationsByCattleId,
    appendObservation,
    setObservationsForHorse,
    saveCattleObservationLog,
    updateCattle,
    updateHerdHorse,
    openRecordCalvingModal,
    closeRecordCalvingModal,
    recordCalvingModal,
  } = useRanchData()

  const [sheetState, setSheetState] = useState<SheetState>("search")
  const [query, setQuery] = useState("")
  const [selectedAnimal, setSelectedAnimal] = useState<UnifiedAnimal | null>(null)
  const [category, setCategory] = useState<Category>("Health")
  const [observation, setObservation] = useState("")
  const [observerName, setObserverName] = useState(() => {
    try {
      return localStorage.getItem("observerName") ?? ""
    } catch {
      return ""
    }
  })
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [confirmedStatus, setConfirmedStatus] = useState<ConfirmStatus | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"log" | "history">("log")

  const committedHorseKeyRef = useRef<string | null>(null)
  const committedHorseObsIdRef = useRef<string | null>(null)
  const committedCattleIdRef = useRef<string | null>(null)
  const committedCattleObsIdRef = useRef<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const observationTextareaRef = useRef<HTMLTextAreaElement>(null)

  const pastureNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pastures) m.set(p.id, p.name)
    return m
  }, [pastures])

  const searchResults = useMemo(() => {
    if (!query.trim()) return [] as UnifiedAnimal[]
    const q = query.replace(/^#/, "").toLowerCase()
    const cattleResults = cattle
      .filter(
        (c) =>
          c.tagNumber.toLowerCase().includes(q) ||
          (c.displayName?.toLowerCase().includes(q) ?? false)
      )
      .map((c) => buildUnifiedCattle(c, pastureNameById.get(c.pastureId) ?? "Pasture"))
    const horseResults = herdRows
      .filter((h) => {
        const idStr = h.id != null ? String(h.id).toLowerCase() : ""
        return idStr.includes(q) || h.name.toLowerCase().includes(q)
      })
      .map((h) => buildUnifiedHorse(h))
    return [...cattleResults, ...horseResults].slice(0, 12)
  }, [query, cattle, herdRows, pastureNameById])

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
    setObservation("")
    setAiResult(null)
    setConfirmedStatus(null)
    setCategory("Health")
    setIsSaving(false)
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
      const t = window.setTimeout(() => searchInputRef.current?.focus(), 50)
      return () => window.clearTimeout(t)
    }
  }, [open, sheetState])

  useEffect(() => {
    if (open) setActiveTab("log")
  }, [open])

  const observationCount = sheetObservationEntries.length

  const selectAnimal = (animal: UnifiedAnimal) => {
    setSelectedAnimal(animal)
    setActiveTab("log")
    if (animal.species === "cattle") {
      setCategory("Health")
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

  const handleSaveObservation = async () => {
    if (!selectedAnimal || !observation.trim() || !observerName.trim()) return
    setIsSaving(true)
    try {
      const animalLabel = identityTitle(selectedAnimal)
      const provisional: AIResult = {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: [],
        patternNote: null,
      }

      if (selectedAnimal.species === "horse") {
        const key = horseRowKey(selectedAnimal)
        const entry: ObservationEntry = {
          id: crypto.randomUUID(),
          date: formatObservationDate(new Date()),
          category,
          observationDomain: observationDomainFromCategory(category),
          notes: observation.trim(),
          loggedBy: observerName.trim(),
          aiResult: provisional,
        }
        committedHorseKeyRef.current = key
        committedHorseObsIdRef.current = entry.id
        appendObservation(key, entry)
        const nextHorseObs = [entry, ...(observationsByHorse[key] ?? [])]
        syncHorseProfileFromObservations(key, nextHorseObs, updateHerdHorse)
      } else {
        const id = selectedAnimal.id
        committedCattleIdRef.current = id
        const returned = saveCattleObservationLog(
          id,
          {
            category,
            notes: observation.trim(),
            loggedBy: observerName.trim(),
            aiResult: provisional,
          },
          undefined
        )
        committedCattleObsIdRef.current = typeof returned === "string" ? returned : null
      }

      const merged = await mockAnalyze(category, observation.trim(), animalLabel)
      setAiResult(merged)
      setConfirmedStatus(riskLevelToConfirmStatus(merged.riskLevel))

      if (selectedAnimal.species === "horse" && committedHorseKeyRef.current && committedHorseObsIdRef.current) {
        const key = committedHorseKeyRef.current
        const oid = committedHorseObsIdRef.current
        const next = (observationsByHorse[key] ?? []).map((o) =>
          o.id === oid ? { ...o, aiResult: merged } : o
        )
        setObservationsForHorse(key, next)
        syncHorseProfileFromObservations(key, next, updateHerdHorse)
      } else if (
        selectedAnimal.species === "cattle" &&
        committedCattleIdRef.current &&
        committedCattleObsIdRef.current
      ) {
        const cid = committedCattleIdRef.current
        const oid = committedCattleObsIdRef.current
        const prev = observationsByCattleId[cid] ?? []
        const editing = prev.find((o) => o.id === oid)
        if (editing) {
          saveCattleObservationLog(
            cid,
            {
              category,
              notes: observation.trim(),
              loggedBy: observerName.trim(),
              aiResult: merged,
            },
            { ...editing, aiResult: merged }
          )
        }
      }

      setSheetState("result")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDone = () => {
    if (!selectedAnimal || !confirmedStatus || !aiResult) {
      onOpenChange(false)
      return
    }
    try {
      try {
        localStorage.setItem("observerName", observerName.trim())
      } catch {
        /* ignore */
      }

      const finalRisk = confirmStatusToRiskLevel(confirmedStatus)
      const finalAi: AIResult = {
        ...aiResult,
        riskLevel: finalRisk,
        riskLabel: riskLabelFromRisk(finalRisk),
      }

      if (selectedAnimal.species === "horse" && committedHorseKeyRef.current && committedHorseObsIdRef.current) {
        const key = committedHorseKeyRef.current
        const oid = committedHorseObsIdRef.current
        const next = (observationsByHorse[key] ?? []).map((o) =>
          o.id === oid
            ? {
                ...o,
                category,
                observationDomain: observationDomainFromCategory(category),
                notes: observation.trim(),
                loggedBy: observerName.trim(),
                aiResult: finalAi,
              }
            : o
        )
        setObservationsForHorse(key, next)
        const summary =
          finalAi.patternNote?.trim() ||
          (finalAi.recommendations[0] ? finalAi.recommendations[0].trim() : "")
        const patch: Partial<HorseTableRow> = {
          ...(category === "Health" ? { healthStatus: confirmedStatus } : { behaviorStatus: confirmedStatus }),
          ...(summary ? { aiSummary: summary } : { aiSummary: undefined }),
        }
        updateHerdHorse(key, patch)
      } else if (
        selectedAnimal.species === "cattle" &&
        committedCattleIdRef.current &&
        committedCattleObsIdRef.current
      ) {
        const cid = committedCattleIdRef.current
        const oid = committedCattleObsIdRef.current
        const prev = observationsByCattleId[cid] ?? []
        const editing = prev.find((o) => o.id === oid)
        if (editing) {
          saveCattleObservationLog(
            cid,
            {
              category,
              notes: observation.trim(),
              loggedBy: observerName.trim(),
              aiResult: finalAi,
            },
            { ...editing, category, notes: observation.trim(), loggedBy: observerName.trim(), aiResult: finalAi }
          )
        }
        updateCattle(cid, { healthStatus: cattleHealthFromConfirm(confirmedStatus) })
      }
    } finally {
      onOpenChange(false)
    }
  }

  const aiAssessedLabel = aiResult ? riskLabelFromRisk(aiResult.riskLevel) : ""

  const canSaveObservation =
    observation.trim().length > 0 && observerName.trim().length > 0

  const goChangeAnimal = () => {
    setSheetState("search")
    setActiveTab("log")
    setSelectedAnimal(null)
    setObservation("")
    setAiResult(null)
    setConfirmedStatus(null)
    setCategory("Health")
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
              "min-h-[44dvh] max-h-[90vh] rounded-t-2xl md:min-h-0 md:max-h-[min(90dvh,680px)] md:max-w-lg md:rounded-2xl",
              "translate-y-0 transition-transform duration-200 ease-out data-[starting-style]:translate-y-full md:data-[starting-style]:translate-y-0 md:data-[starting-style]:scale-95"
            )}
          >
            <div className="flex shrink-0 flex-col md:hidden">
              <div className="mx-auto mt-3 h-1 w-8 shrink-0 rounded-full bg-muted" aria-hidden />
            </div>

            <Dialog.Title className="sr-only">Log observation</Dialog.Title>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 pb-3 pt-4 md:px-6 md:pt-5 md:pb-3">
                <div className="flex min-w-0 justify-start">
                  {sheetState !== "search" ? (
                    <button
                      type="button"
                      onClick={goChangeAnimal}
                      className="cursor-pointer text-left text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      ← Change animal
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
                <div className={LOG_OBSERVATION_IDENTITY_ROW}>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {selectedAnimal.species === "horse" ? (
                      <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                        {selectedAnimal.photoUrl ? (
                          <img
                            src={selectedAnimal.photoUrl}
                            alt=""
                            className="size-full object-cover object-center"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground" aria-hidden>
                            {initialsFromName(selectedAnimal.name)}
                          </span>
                        )}
                      </div>
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
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {selectedAnimal.species === "cattle"
                          ? `${selectedAnimal.breedLabel} · ${selectedAnimal.ageDisplay}y · ${selectedAnimal.pastureLabel}`
                          : `${selectedAnimal.breedLabel} · ${selectedAnimal.age} · ${selectedAnimal.pastureLabel}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-end justify-end gap-1.5">
                    <StatusBadge status={healthBadgeStatus(selectedAnimal.species, selectedAnimal)} />
                    {selectedAnimal.species === "horse" && selectedAnimal.behaviorStatus !== "good" ? (
                      <StatusBadge status={behaviorBadgeStatus(selectedAnimal)} />
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto px-4 md:px-6",
                  sheetState === "search" ? "py-4 md:py-5" : "pb-4 pt-0 md:pb-5 md:pt-0"
                )}
              >
                {sheetState === "search" ? (
                  <>
                    <Input
                      ref={searchInputRef}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by tag # or name..."
                      className="w-full rounded-lg"
                      autoComplete="off"
                    />
                    {query.trim().length > 0 ? (
                      searchResults.length > 0 ? (
                        <ul
                          className="shadow-card mt-3 max-h-[320px] min-h-0 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-muted/30"
                          role="listbox"
                          aria-label="Search results"
                        >
                          {searchResults.map((animal) => {
                            const isCattle = animal.species === "cattle"
                            return (
                              <li key={`${animal.species}-${isCattle ? animal.id : horseRowKey(animal)}`}>
                                <button
                                  type="button"
                                  onClick={() => selectAnimal(animal)}
                                  className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                                >
                                  {!isCattle ? (
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
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
                                  ) : null}
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
                                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                      {animal.species === "cattle"
                                        ? `${animal.breedLabel} · ${animal.ageDisplay}y · ${animal.pastureLabel}`
                                        : `${animal.breedLabel} · ${animal.age} · ${animal.pastureLabel}`}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 items-center gap-1">
                                    <StatusBadge status={healthBadgeStatus(animal.species, animal)} />
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
                          No animals found for &quot;{query.trim()}&quot;
                        </p>
                      )
                    ) : null}
                  </>
                ) : null}

                {sheetState !== "search" &&
                selectedAnimal &&
                sheetState === "cattle-prep" &&
                selectedAnimal.species === "cattle" ? (
                  <div className="flex flex-col gap-2 pt-3 md:pt-4">
                    <CattleLoggingStatusSection
                      cattle={selectedAnimal as Cattle}
                      pastureName={selectedAnimal.pastureLabel}
                      onRecordCalving={() =>
                        openRecordCalvingModal({
                          cattle: selectedAnimal as Cattle,
                          pastureName: selectedAnimal.pastureLabel,
                          onCalvingDone: () => onOpenChange(false),
                        })
                      }
                      onLogObservation={() => {
                        setActiveTab("log")
                        setSheetState("form")
                        window.setTimeout(() => observationTextareaRef.current?.focus(), 0)
                      }}
                      showActions
                      usePanelPadding={false}
                    />
                    <div className="h-px bg-border" aria-hidden />
                    <ObservationTimeline observations={sheetObservationEntries} />
                  </div>
                ) : null}

                {sheetState !== "search" && selectedAnimal && (sheetState === "form" || sheetState === "result") ? (
                  <div className="flex flex-col gap-2">
                    <div className="sticky top-0 z-10 -mx-4 mb-2 border-b border-border bg-card px-4 md:-mx-6 md:px-6">
                      <div className="grid w-full grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("log")}
                          className={cn(
                            "flex min-h-12 w-full min-w-0 items-center justify-center border-b-2 px-2 py-2.5 text-base transition-colors -mb-px",
                            activeTab === "log"
                              ? "border-sidebar-accent-foreground font-semibold text-sidebar-accent-foreground"
                              : "border-transparent font-medium text-muted-foreground hover:text-foreground"
                          )}
                        >
                          Log
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("history")}
                          className={cn(
                            "flex min-h-12 w-full min-w-0 items-center justify-center border-b-2 px-2 py-2.5 text-base transition-colors -mb-px",
                            activeTab === "history"
                              ? "border-sidebar-accent-foreground font-semibold text-sidebar-accent-foreground"
                              : "border-transparent font-medium text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <span className="truncate text-center">
                            History
                            {observationCount > 0 ? (
                              <span className="ml-1 text-sm font-normal text-muted-foreground">
                                ({observationCount})
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </div>
                    </div>

                    {activeTab === "log" ? (
                      <div className="flex flex-col gap-4">
                        {sheetState === "result" && selectedAnimal.species === "cattle" ? (
                          <CattleLoggingStatusSection
                            cattle={selectedAnimal as Cattle}
                            pastureName={selectedAnimal.pastureLabel}
                            showActions={false}
                            usePanelPadding={false}
                          />
                        ) : null}

                        {sheetState === "result" ? (
                          <p className="pt-3 text-base font-medium text-foreground md:pt-4">Observation logged</p>
                        ) : null}

                        {selectedAnimal.species === "horse" ? (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-sm text-muted-foreground">Category</span>
                            <div className="flex flex-wrap gap-2">
                              {HORSE_OBSERVATION_CATEGORIES.map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  disabled={sheetState === "result"}
                                  onClick={() => setCategory(cat)}
                                  className={cn(
                                    "rounded-full border px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                                    sheetState === "result" ? "cursor-not-allowed" : "cursor-pointer",
                                    category === cat
                                      ? "border-action bg-action text-action-foreground"
                                      : "border-border bg-transparent text-foreground hover:bg-muted/60"
                                  )}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {!(sheetState === "result" && aiResult) ? (
                          <label className="flex flex-col gap-1.5">
                            <span className="text-sm text-muted-foreground">Observation</span>
                            <Textarea
                              ref={observationTextareaRef}
                              value={observation}
                              onChange={(e) => setObservation(e.target.value)}
                              disabled={sheetState === "result"}
                              readOnly={sheetState === "result"}
                              placeholder={`What did you observe about ${identityTitle(selectedAnimal)}?`}
                              className={cn(
                                "min-h-[100px] resize-none rounded-lg border-border",
                                sheetState === "result" && "bg-muted/40"
                              )}
                            />
                          </label>
                        ) : null}

                        <label className="flex flex-col gap-1.5">
                          <span className="text-sm text-muted-foreground">Your name</span>
                          <Input
                            value={observerName}
                            onChange={(e) => setObserverName(e.target.value)}
                            disabled={sheetState === "result"}
                            readOnly={sheetState === "result"}
                            placeholder="Your name"
                            className={cn("rounded-lg", sheetState === "result" && "bg-muted/40")}
                          />
                        </label>

                        {sheetState === "form" ? (
                          <div className="mt-2 border-t border-border pt-4">
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="tertiary"
                                className="min-h-10 shrink-0 rounded-full px-4"
                                onClick={() => onOpenChange(false)}
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="default"
                                disabled={!canSaveObservation || isSaving}
                                onClick={() => void handleSaveObservation()}
                                className="min-h-10 shrink-0 rounded-full px-4"
                              >
                                <Sparkles className="size-5 shrink-0 text-[var(--ai-mark)]" strokeWidth={2} aria-hidden />
                                {isSaving ? "Analyzing…" : "Save observation"}
                              </Button>
                            </div>
                            <p className="mt-2 text-right text-xs text-muted-foreground">
                              AI will analyze and suggest next steps after saving
                            </p>
                          </div>
                        ) : null}

                        {sheetState === "result" && aiResult ? (
                          <>
                            <SmartSuggestionsPanel
                              mode="modal"
                              suggestions={aiResult.recommendations}
                              contextNote={aiResult.patternNote}
                              className="mt-3"
                            />

                            <div className="mt-5">
                              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                                Confirm status
                              </p>
                              <div className="mb-3 flex items-center gap-1.5">
                                <span className="text-[12px]">
                                  <span className="text-ai-accent">✦ AI assessed:</span>{" "}
                                  <span className="text-foreground">{aiAssessedLabel}</span>
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(["good", "monitor", "flag"] as const).map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => setConfirmedStatus(s)}
                                    className={cn(
                                      "cursor-pointer rounded-full border px-4 py-1.5 text-[13px] font-medium capitalize transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                                      confirmedStatus === s
                                        ? s === "good"
                                          ? "bg-status-good-bg border-status-good-bg text-status-good-text"
                                          : s === "monitor"
                                            ? "bg-status-monitor-bg border-status-monitor-bg text-status-monitor-text"
                                            : "bg-status-flag-bg border-status-flag-bg text-status-flag-text"
                                        : "border-border bg-transparent text-muted-foreground hover:bg-muted/50"
                                    )}
                                  >
                                    {s === "good" ? "Good" : s === "monitor" ? "Monitor" : "Flag"}
                                  </button>
                                ))}
                              </div>
                              <div className="mt-5 rounded-lg border border-border p-3">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                                  Your observation
                                </p>
                                <p className="text-sm leading-relaxed text-foreground">{observation}</p>
                              </div>
                            </div>

                            <div className="mt-6 flex flex-wrap justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSheetState("form")}
                                className={cn(buttonVariants({ variant: "tertiary" }), "shrink-0 cursor-pointer")}
                              >
                                Edit
                              </button>
                              <Button
                                type="button"
                                variant="primary"
                                size="lg"
                                disabled={!confirmedStatus}
                                onClick={handleDone}
                                className="shrink-0 px-6"
                              >
                                Done
                              </Button>
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    {activeTab === "history" ? (
                      <div>
                        <ObservationTimeline observations={sheetObservationEntries} />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
