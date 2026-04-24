/* eslint-disable react-refresh/only-export-components -- hook + provider share context module */
import { formatDistanceToNow, formatISO, parseISO } from "date-fns"
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { LogObservationModal } from "@/components/LogObservationModal"
import { LogPastureCheckModal, type PastureCheckData } from "@/components/LogPastureCheckModal"
import { LogPastureCheckSheet } from "@/components/LogPastureCheckSheet"
import { RecordCalvingModal, type PersistCalvingAiPayload } from "@/components/RecordCalvingModal"
import type { HorseTableRow } from "@/components/HeguyRanchCoPilot"
import { SAMPLE_HORSE_ROWS, horseRowKey } from "@/components/HeguyRanchCoPilot"
import { PASTURES_SEED, SAMPLE_CATTLE } from "@/lib/cattleSeed"
import { buildInitialCattleObservationsMap } from "@/lib/cattleObservationsSeed"
import { getAiRiskLevelFromObservations, getLatestObservationWithAi } from "@/lib/animalUtils"
import { riskLevelToModalStatusBadge } from "@/lib/horseUtils"
import { getObservationDomain, observationDomainFromCategory } from "@/lib/observationDomain"
import { buildInitialObservationsMap, formatObservationDate } from "@/lib/initialObservations"
import { HORSE_OBSERVATION_CATEGORIES } from "@/lib/observationCategories"
import { buildCalvingObservationNotes } from "@/lib/calvingStatus"
import type { CalvingRecord, Cattle, CattleGroupBy, Pasture, PastureCheck } from "@/types/cattle"
import type { AIResult, Category, ObservationEntry, RiskLevel } from "@/types/observation"
import { useMediaQuery } from "@/hooks/useMediaQuery"

const CATTLE_GROUP_STORAGE_KEY = "ranchwise_cattle_groupby"
const CATTLE_GROUP_STORAGE_KEY_LEGACY = "ranchwise_cattle_group_by"

function readCattleGroupBy(): CattleGroupBy {
  try {
    let v = localStorage.getItem(CATTLE_GROUP_STORAGE_KEY)
    if (!v) v = localStorage.getItem(CATTLE_GROUP_STORAGE_KEY_LEGACY)
    if (v === "pasture" || v === "all") return v
    if (v === "type") return "all"
    if (v === "calving") return "pasture"
    return "all"
  } catch {
    return "all"
  }
}

function horseStatusFromAiRiskLevel(level: RiskLevel | null): HorseTableRow["healthStatus"] {
  if (level === "call-vet") return "flag"
  if (level === "monitor") return "monitor"
  return "good"
}

function cattleHealthStatusFromRiskLevel(level: RiskLevel): "Flag" | "Monitor" | "Good" {
  if (level === "call-vet") return "Flag"
  if (level === "monitor") return "Monitor"
  return "Good"
}

/** Map roster `healthStatus` / `behaviorStatus` to modal `StatusBadge` props (matches home log sheet). */
function herdFieldToModalStatusBadge(s: HorseTableRow["healthStatus"]): "Flag" | "Monitor" | "Good" {
  if (s === "flag") return "Flag"
  if (s === "monitor") return "Monitor"
  return "Good"
}

function aiSummaryTextFromResult(ai: AIResult | null | undefined): string | undefined {
  if (!ai) return undefined
  const note = ai.patternNote?.trim()
  if (note) return note
  const first = ai.recommendations?.[0]?.trim()
  if (first) return first
  return undefined
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
  const summary = aiSummaryTextFromResult(ai)
  updateHerdHorse(horseKey, {
    healthStatus: horseStatusFromAiRiskLevel(healthLevel),
    behaviorStatus: horseStatusFromAiRiskLevel(behaviorLevel),
    ...(summary ? { aiSummary: summary } : { aiSummary: undefined }),
  })
}

export type LogObservationTarget =
  | { kind: "horse"; row: HorseTableRow; editingEntry?: ObservationEntry }
  | { kind: "cattle"; cattle: Cattle; editingEntry?: ObservationEntry }

export type PastureCheckModalTarget = { pastureId: string; pastureName: string }

type PastureCheckUiState = {
  target: PastureCheckModalTarget
  variant: "modal" | "sheet"
}

export type RecordCalvingModalTarget = {
  cattle: Cattle
  pastureName: string
  /** Home quick-log: after calving result Done, dismiss the log sheet (roster uses modal-only flow). */
  onCalvingDone?: () => void
}

type RanchDataContextValue = {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void
  herdRows: HorseTableRow[]
  pastureOptions: string[]
  appendHerdHorse: (row: HorseTableRow) => void
  updateHerdHorse: (horseKey: string, patch: Partial<HorseTableRow>) => void
  removeHerdHorse: (horseKey: string) => void
  observationsByHorse: Record<string, ObservationEntry[]>
  setObservationsForHorse: (horseKey: string, entries: ObservationEntry[]) => void
  appendObservation: (horseKey: string, entry: ObservationEntry) => void
  removeHorseObservation: (horseKey: string, observationId: string) => void
  openLogModal: (row: HorseTableRow, editingEntry?: ObservationEntry) => void
  openCattleLogModal: (cattle: Cattle, editingEntry?: ObservationEntry) => void
  closeLogModal: () => void
  logObservationTarget: LogObservationTarget | null

  pastures: Pasture[]
  cattle: Cattle[]
  pastureChecks: PastureCheck[]
  appendPastureCheck: (check: PastureCheck) => void
  cattleGroupBy: CattleGroupBy
  setCattleGroupBy: (value: CattleGroupBy | ((prev: CattleGroupBy) => CattleGroupBy)) => void
  observationsByCattleId: Record<string, ObservationEntry[]>
  appendCattleObservation: (cattleId: string, entry: ObservationEntry) => void
  removeCattleObservation: (cattleId: string, observationId: string) => void

  pastureCheckModal: PastureCheckModalTarget | null
  openPastureCheckModal: (target: PastureCheckModalTarget) => void
  closePastureCheckModal: () => void

  recordCalvingModal: RecordCalvingModalTarget | null
  openRecordCalvingModal: (target: RecordCalvingModalTarget) => void
  closeRecordCalvingModal: () => void
  /** Persist calving record without touching modal state (e.g. mobile sheet). Returns the new Calving observation id. */
  commitCattleCalvingRecord: (record: CalvingRecord) => string
  /** Attach AI analysis to the calving observation row and the cattle record (after analyze completes). */
  persistCalvingObservationAi: (payload: PersistCalvingAiPayload) => void
  /** Persist cattle observation from sheet/panel (or modal via handleLogSave). Optional `editingEntry` updates in place. */
  saveCattleObservationLog: (
    cattleId: string,
    data: { category: Category; notes: string; loggedBy: string; aiResult: AIResult },
    editingEntry?: ObservationEntry
  ) => string | void
  updateCattle: (cattleId: string, patch: Partial<Cattle>) => void
  markCattleInLabor: (cattleId: string) => void
  appendCattle: (row: Cattle) => void
}

const RanchDataContext = createContext<RanchDataContextValue | null>(null)

export function useRanchData() {
  const ctx = useContext(RanchDataContext)
  if (!ctx) throw new Error("useRanchData must be used within RanchDataProvider")
  return ctx
}

export function RanchDataProvider({ children }: { children: ReactNode }) {
  const isPastureCheckMobile = useMediaQuery("(max-width: 767px)")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [addedHorses, setAddedHorses] = useState<HorseTableRow[]>([])
  const [horseOverrides, setHorseOverrides] = useState<Record<string, Partial<HorseTableRow>>>({})
  const [removedHorseKeys, setRemovedHorseKeys] = useState<Set<string>>(() => new Set())
  const [observationsByHorse, setObservationsByHorse] = useState<Record<string, ObservationEntry[]>>(
    buildInitialObservationsMap
  )
  const [logObservationTarget, setLogObservationTarget] = useState<LogObservationTarget | null>(null)
  const lastHorseObservationCommitIdRef = useRef<string | null>(null)
  const lastCattleObservationCommitIdRef = useRef<string | null>(null)

  const [cattle, setCattle] = useState<Cattle[]>(SAMPLE_CATTLE)
  const [pastureChecks, setPastureChecks] = useState<PastureCheck[]>([])
  const [observationsByCattleId, setObservationsByCattleId] = useState<
    Record<string, ObservationEntry[]>
  >(buildInitialCattleObservationsMap)
  const [cattleGroupBy, setCattleGroupByState] = useState<CattleGroupBy>(readCattleGroupBy)
  const [pastureCheckUi, setPastureCheckUi] = useState<PastureCheckUiState | null>(null)
  const [recordCalvingModal, setRecordCalvingModal] = useState<RecordCalvingModalTarget | null>(null)

  const setCattleGroupBy = useCallback((value: CattleGroupBy | ((prev: CattleGroupBy) => CattleGroupBy)) => {
    setCattleGroupByState((prev) => {
      const next = typeof value === "function" ? value(prev) : value
      try {
        localStorage.setItem(CATTLE_GROUP_STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const herdRows = useMemo(
    () =>
      [...SAMPLE_HORSE_ROWS, ...addedHorses]
        .filter((row) => !removedHorseKeys.has(horseRowKey(row)))
        .map((row) => {
          const key = horseRowKey(row)
          const patch = horseOverrides[key]
          return patch ? { ...row, ...patch } : row
        }),
    [addedHorses, horseOverrides, removedHorseKeys]
  )

  const removeHerdHorse = useCallback((horseKey: string) => {
    setAddedHorses((prev) => prev.filter((r) => horseRowKey(r) !== horseKey))
    setRemovedHorseKeys((prev) => {
      const next = new Set(prev)
      next.add(horseKey)
      return next
    })
    setHorseOverrides((prev) => {
      const { [horseKey]: _, ...rest } = prev
      return rest
    })
    setObservationsByHorse((prev) => {
      const { [horseKey]: _, ...rest } = prev
      return rest
    })
  }, [])

  const pastureOptions = useMemo(
    () =>
      [...new Set(herdRows.map((r) => r.pasture))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      ),
    [herdRows]
  )

  const pastures = useMemo((): Pasture[] => {
    return PASTURES_SEED.map((p) => {
      const count = cattle.filter((c) => c.pastureId === p.id).length
      const checks = pastureChecks
        .filter((c) => c.pastureId === p.id)
        .slice()
        .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
      const last = checks[0]
      const lastObservation = last
        ? formatDistanceToNow(parseISO(last.date), { addSuffix: true })
        : p.lastObservation
      return {
        ...p,
        animalCount: count,
        lastObservation,
        lastCheckDate: last?.date,
      }
    })
  }, [cattle, pastureChecks])

  const appendHerdHorse = useCallback((row: HorseTableRow) => {
    setAddedHorses((prev) => [...prev, row])
  }, [])

  const updateHerdHorse = useCallback((horseKey: string, patch: Partial<HorseTableRow>) => {
    setHorseOverrides((prev) => ({
      ...prev,
      [horseKey]: { ...prev[horseKey], ...patch },
    }))
  }, [])

  /** Seed `aiSummary` / status from demo observations (same path as post-save sync). */
  const didHydrateHorseAiFromSeedObsRef = useRef(false)
  useLayoutEffect(() => {
    if (didHydrateHorseAiFromSeedObsRef.current) return
    didHydrateHorseAiFromSeedObsRef.current = true
    const initial = buildInitialObservationsMap()
    for (const [key, entries] of Object.entries(initial)) {
      if (entries.some((e) => e.aiResult)) {
        syncHorseProfileFromObservations(key, entries, updateHerdHorse)
      }
    }
  }, [updateHerdHorse])

  const setObservationsForHorse = useCallback((horseKey: string, entries: ObservationEntry[]) => {
    setObservationsByHorse((prev) => ({ ...prev, [horseKey]: entries }))
  }, [])

  const appendObservation = useCallback((horseKey: string, entry: ObservationEntry) => {
    setObservationsByHorse((prev) => ({
      ...prev,
      [horseKey]: [entry, ...(prev[horseKey] ?? [])],
    }))
  }, [])

  const removeHorseObservation = useCallback((horseKey: string, observationId: string) => {
    setObservationsByHorse((prev) => ({
      ...prev,
      [horseKey]: (prev[horseKey] ?? []).filter((o) => o.id !== observationId),
    }))
  }, [])

  const removeCattleObservation = useCallback((cattleId: string, observationId: string) => {
    setObservationsByCattleId((prev) => ({
      ...prev,
      [cattleId]: (prev[cattleId] ?? []).filter((o) => o.id !== observationId),
    }))
  }, [])

  const appendCattleObservation = useCallback((cattleId: string, entry: ObservationEntry) => {
    setObservationsByCattleId((prev) => ({
      ...prev,
      [cattleId]: [entry, ...(prev[cattleId] ?? [])],
    }))
  }, [])

  const appendPastureCheck = useCallback((check: PastureCheck) => {
    setPastureChecks((prev) => [check, ...prev])
  }, [])

  const appendCattle = useCallback((row: Cattle) => {
    setCattle((prev) => [...prev, row])
  }, [])

  const updateCattle = useCallback((cattleId: string, patch: Partial<Cattle>) => {
    setCattle((prev) => prev.map((c) => (c.id === cattleId ? { ...c, ...patch } : c)))
  }, [])

  const markCattleInLabor = useCallback(
    (cattleId: string) => {
      updateCattle(cattleId, {
        calvingStatus: "in-labor",
        inLaborTimestamp: new Date().toISOString(),
      })
    },
    [updateCattle]
  )

  const openLogModal = useCallback((row: HorseTableRow, editingEntry?: ObservationEntry) => {
    lastHorseObservationCommitIdRef.current = null
    lastCattleObservationCommitIdRef.current = null
    setLogObservationTarget({ kind: "horse", row, editingEntry })
  }, [])

  const openCattleLogModal = useCallback((c: Cattle, editingEntry?: ObservationEntry) => {
    lastHorseObservationCommitIdRef.current = null
    lastCattleObservationCommitIdRef.current = null
    setLogObservationTarget({ kind: "cattle", cattle: c, editingEntry })
  }, [])

  const closeLogModal = useCallback(() => {
    lastHorseObservationCommitIdRef.current = null
    lastCattleObservationCommitIdRef.current = null
    setLogObservationTarget(null)
  }, [])

  /** Uses `(max-width: 767px)` — same breakpoint as horse/cattle sheets; opens vaul sheet on small viewports. */
  const openPastureCheckModal = useCallback(
    (target: PastureCheckModalTarget) => {
      setPastureCheckUi({
        target,
        variant: isPastureCheckMobile ? "sheet" : "modal",
      })
    },
    [isPastureCheckMobile]
  )

  const closePastureCheckModal = useCallback(() => setPastureCheckUi(null), [])

  const openRecordCalvingModal = useCallback((target: RecordCalvingModalTarget) => {
    setRecordCalvingModal(target)
  }, [])

  const closeRecordCalvingModal = useCallback(() => setRecordCalvingModal(null), [])

  const commitCattleCalvingRecord = useCallback(
    (record: CalvingRecord): string => {
      const realComps = record.complications.filter((c) => c !== "none")
      const nextStatus =
        record.forceComplicationsOutcome || realComps.length > 0 ? "complications" : "calved"
      const dateOnly = formatISO(parseISO(record.date), { representation: "date" })
      updateCattle(record.cattleId, {
        calvingStatus: nextStatus,
        calvingDate: dateOnly,
        dueDate: null,
        deliveryType: record.deliveryType,
        calfStatus: record.calfStatus,
        calvingComplications: realComps.length > 0 ? realComps : [],
        inLaborTimestamp: null,
        calvingAiResult: null,
      })
      const obsNotes = buildCalvingObservationNotes({
        ...record,
        complications: realComps.length > 0 ? realComps : [],
      })
      const observationId = crypto.randomUUID()
      appendCattleObservation(record.cattleId, {
        id: observationId,
        date: formatObservationDate(new Date(record.date)),
        category: "Calving",
        notes: obsNotes,
        loggedBy: record.loggedBy,
        aiResult: null,
      })
      return observationId
    },
    [appendCattleObservation, updateCattle]
  )

  const persistCalvingObservationAi = useCallback((payload: PersistCalvingAiPayload) => {
    const { cattleId, observationId, aiResult } = payload
    setObservationsByCattleId((prev) => ({
      ...prev,
      [cattleId]: (prev[cattleId] ?? []).map((o) =>
        o.id === observationId ? { ...o, aiResult } : o
      ),
    }))
    updateCattle(cattleId, { calvingAiResult: aiResult })
  }, [updateCattle])

  const handleRecordCalvingSave = useCallback(
    async (record: CalvingRecord) => {
      return commitCattleCalvingRecord(record)
    },
    [commitCattleCalvingRecord]
  )

  const saveCattleObservationLog = useCallback(
    (
      cattleId: string,
      data: { category: Category; notes: string; loggedBy: string; aiResult: AIResult },
      editingEntry?: ObservationEntry
    ) => {
      if (editingEntry) {
        setObservationsByCattleId((prev) => ({
          ...prev,
          [cattleId]: (prev[cattleId] ?? []).map((o) =>
            o.id === editingEntry.id
              ? {
                  ...o,
                  category: data.category,
                  notes: data.notes,
                  loggedBy: data.loggedBy,
                  aiResult: data.aiResult,
                }
              : o
          ),
        }))
        updateCattle(cattleId, {
          healthStatus: cattleHealthStatusFromRiskLevel(data.aiResult.riskLevel),
          lastObservation: formatDistanceToNow(new Date(), { addSuffix: true }),
        })
        return editingEntry.id
      }
      const entry: ObservationEntry = {
        id: crypto.randomUUID(),
        date: formatObservationDate(new Date()),
        category: data.category,
        notes: data.notes,
        loggedBy: data.loggedBy,
        aiResult: data.aiResult,
      }
      appendCattleObservation(cattleId, entry)
      updateCattle(cattleId, {
        healthStatus: cattleHealthStatusFromRiskLevel(data.aiResult.riskLevel),
        lastObservation: formatDistanceToNow(new Date(), { addSuffix: true }),
      })
      return entry.id
    },
    [appendCattleObservation, updateCattle]
  )

  const handleLogSave = useCallback(
    async (
      data: { category: Category; notes: string; loggedBy: string; aiResult: AIResult },
      meta?: { stage: "commit" | "done" }
    ) => {
      if (!logObservationTarget) return
      const stage = meta?.stage ?? "done"

      if (logObservationTarget.kind === "horse") {
        const key = horseRowKey(logObservationTarget.row)
        const editing = logObservationTarget.editingEntry

        if (stage === "commit") {
          if (editing) {
            lastHorseObservationCommitIdRef.current = editing.id
            const nextHorseObs = (observationsByHorse[key] ?? []).map((o) =>
              o.id === editing.id
                ? {
                    ...o,
                    category: data.category,
                    observationDomain: observationDomainFromCategory(data.category),
                    notes: data.notes,
                    loggedBy: data.loggedBy,
                    aiResult: data.aiResult,
                  }
                : o
            )
            setObservationsForHorse(key, nextHorseObs)
            syncHorseProfileFromObservations(key, nextHorseObs, updateHerdHorse)
          } else {
            const entry: ObservationEntry = {
              id: crypto.randomUUID(),
              date: formatObservationDate(new Date()),
              category: data.category,
              observationDomain: observationDomainFromCategory(data.category),
              notes: data.notes,
              loggedBy: data.loggedBy,
              aiResult: data.aiResult,
            }
            lastHorseObservationCommitIdRef.current = entry.id
            appendObservation(key, entry)
            const nextHorseObs = [entry, ...(observationsByHorse[key] ?? [])]
            syncHorseProfileFromObservations(key, nextHorseObs, updateHerdHorse)
          }
          return
        }

        // stage === "done": refresh AI payload on the committed entry, then close.
        const targetId = editing?.id ?? lastHorseObservationCommitIdRef.current
        lastHorseObservationCommitIdRef.current = null
        if (targetId) {
          const nextHorseObs = (observationsByHorse[key] ?? []).map((o) =>
            o.id === targetId
              ? {
                  ...o,
                  category: data.category,
                  observationDomain: observationDomainFromCategory(data.category),
                  notes: data.notes,
                  loggedBy: data.loggedBy,
                  aiResult: data.aiResult,
                }
              : o
          )
          setObservationsForHorse(key, nextHorseObs)
          syncHorseProfileFromObservations(key, nextHorseObs, updateHerdHorse)
        }
      } else {
        const c = logObservationTarget.cattle
        if (stage === "commit") {
          lastCattleObservationCommitIdRef.current = saveCattleObservationLog(
            c.id,
            data,
            logObservationTarget.editingEntry
          )
          return
        }

        // stage === "done": update the committed observation with final AI payload.
        const editing = logObservationTarget.editingEntry
        const targetId = editing?.id ?? lastCattleObservationCommitIdRef.current
        lastCattleObservationCommitIdRef.current = null
        if (targetId) {
          setObservationsByCattleId((prev) => ({
            ...prev,
            [c.id]: (prev[c.id] ?? []).map((o) =>
              o.id === targetId
                ? {
                    ...o,
                    category: data.category,
                    notes: data.notes,
                    loggedBy: data.loggedBy,
                    aiResult: data.aiResult,
                  }
                : o
            ),
          }))
          updateCattle(c.id, {
            healthStatus: cattleHealthStatusFromRiskLevel(data.aiResult.riskLevel),
            lastObservation: formatDistanceToNow(new Date(), { addSuffix: true }),
          })
        }
      }

      setLogObservationTarget(null)
    },
    [
      appendObservation,
      logObservationTarget,
      observationsByHorse,
      saveCattleObservationLog,
      setObservationsForHorse,
      setObservationsByCattleId,
      updateCattle,
      updateHerdHorse,
    ]
  )

  const commitPastureCheck = useCallback(
    (target: PastureCheckModalTarget, data: PastureCheckData) => {
      const notesTrim = data.notes.trim()
      const check: PastureCheck = {
        id: crypto.randomUUID(),
        pastureId: target.pastureId,
        date: new Date().toISOString(),
        loggedBy: data.loggedBy.trim(),
        allClear: data.allClear,
        notes: data.allClear && !notesTrim ? undefined : notesTrim,
      }
      appendPastureCheck(check)
    },
    [appendPastureCheck]
  )

  const handlePastureCheckModalSave = useCallback(
    (data: PastureCheckData) => {
      if (!pastureCheckUi || pastureCheckUi.variant !== "modal") return
      commitPastureCheck(pastureCheckUi.target, data)
      setPastureCheckUi(null)
    },
    [commitPastureCheck, pastureCheckUi]
  )

  const logModalAnimalName =
    logObservationTarget?.kind === "horse"
      ? logObservationTarget.row.name
      : logObservationTarget?.kind === "cattle"
        ? logObservationTarget.cattle.tagNumber
        : ""

  const logModalAnimalPhoto =
    logObservationTarget?.kind === "horse" ? logObservationTarget.row.photoUrl : undefined

  const logModalAnimalSubtitle = useMemo(() => {
    if (logObservationTarget?.kind === "horse") {
      const r = logObservationTarget.row
      return `${r.sex} · ${r.age} · ${r.pasture}`
    }
    if (logObservationTarget?.kind === "cattle") {
      const c = logObservationTarget.cattle
      const pastureName = pastures.find((p) => p.id === c.pastureId)?.name ?? "Pasture"
      return `${c.breed} · ${c.age}y · ${pastureName}`
    }
    return undefined
  }, [logObservationTarget, pastures])

  const logModalStatusBadge = useMemo(() => {
    if (logObservationTarget?.kind === "horse") {
      return herdFieldToModalStatusBadge(logObservationTarget.row.healthStatus)
    }
    if (logObservationTarget?.kind === "cattle") {
      return (
        riskLevelToModalStatusBadge(
          getAiRiskLevelFromObservations(observationsByCattleId[logObservationTarget.cattle.id])
        ) ?? logObservationTarget.cattle.healthStatus
      )
    }
    return undefined
  }, [logObservationTarget, observationsByCattleId])

  const logModalBehaviorStatusBadge = useMemo(() => {
    if (logObservationTarget?.kind !== "horse") return undefined
    if (logObservationTarget.row.behaviorStatus === "good") return undefined
    return herdFieldToModalStatusBadge(logObservationTarget.row.behaviorStatus)
  }, [logObservationTarget])

  const pastureCheckModal = pastureCheckUi?.target ?? null

  const value = useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      herdRows,
      pastureOptions,
      appendHerdHorse,
      updateHerdHorse,
      removeHerdHorse,
      observationsByHorse,
      setObservationsForHorse,
      appendObservation,
      removeHorseObservation,
      openLogModal,
      openCattleLogModal,
      closeLogModal,
      handleLogSave,
      logObservationTarget,
      pastures,
      cattle,
      pastureChecks,
      appendPastureCheck,
      cattleGroupBy,
      setCattleGroupBy,
      observationsByCattleId,
      appendCattleObservation,
      removeCattleObservation,
      pastureCheckModal,
      openPastureCheckModal,
      closePastureCheckModal,
      recordCalvingModal,
      openRecordCalvingModal,
      closeRecordCalvingModal,
      commitCattleCalvingRecord,
      persistCalvingObservationAi,
      saveCattleObservationLog,
      updateCattle,
      markCattleInLabor,
      appendCattle,
    }),
    [
      sidebarOpen,
      herdRows,
      pastureOptions,
      appendHerdHorse,
      updateHerdHorse,
      removeHerdHorse,
      observationsByHorse,
      setObservationsForHorse,
      appendObservation,
      removeHorseObservation,
      openLogModal,
      openCattleLogModal,
      closeLogModal,
      handleLogSave,
      logObservationTarget,
      pastures,
      cattle,
      pastureChecks,
      appendPastureCheck,
      cattleGroupBy,
      setCattleGroupBy,
      observationsByCattleId,
      appendCattleObservation,
      removeCattleObservation,
      pastureCheckModal,
      openPastureCheckModal,
      closePastureCheckModal,
      recordCalvingModal,
      openRecordCalvingModal,
      closeRecordCalvingModal,
      commitCattleCalvingRecord,
      persistCalvingObservationAi,
      saveCattleObservationLog,
      updateCattle,
      markCattleInLabor,
      appendCattle,
    ]
  )

  return (
    <RanchDataContext.Provider value={value}>
      {children}
      <LogObservationModal
        open={!!logObservationTarget}
        animalName={logModalAnimalName}
        animalPhoto={logModalAnimalPhoto}
        animalSubtitle={logModalAnimalSubtitle}
        statusBadge={logModalStatusBadge}
        behaviorStatusBadge={logModalBehaviorStatusBadge}
        editingEntry={
          logObservationTarget?.kind === "horse" || logObservationTarget?.kind === "cattle"
            ? logObservationTarget.editingEntry
            : undefined
        }
        categories={
          logObservationTarget?.kind === "horse" ? HORSE_OBSERVATION_CATEGORIES : undefined
        }
        onClose={closeLogModal}
        onSave={handleLogSave}
      />
      <LogPastureCheckModal
        open={pastureCheckUi?.variant === "modal"}
        pastureName={pastureCheckUi?.target.pastureName ?? ""}
        onClose={closePastureCheckModal}
        onSave={handlePastureCheckModalSave}
      />
      {pastureCheckUi?.variant === "sheet" ? (
        <LogPastureCheckSheet
          pastureName={pastureCheckUi.target.pastureName}
          onClose={closePastureCheckModal}
          onSave={(data) => {
            commitPastureCheck(pastureCheckUi.target, data)
          }}
        />
      ) : null}
      <RecordCalvingModal
        open={!!recordCalvingModal}
        cattle={recordCalvingModal?.cattle ?? null}
        pastureName={recordCalvingModal?.pastureName ?? ""}
        onClose={closeRecordCalvingModal}
        onSave={handleRecordCalvingSave}
        onPersistCalvingAi={persistCalvingObservationAi}
        onCalvingDone={recordCalvingModal?.onCalvingDone}
      />
    </RanchDataContext.Provider>
  )
}
