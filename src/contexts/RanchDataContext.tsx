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
import { LogObservationModal, type LogObservationSavePayload } from "@/components/LogObservationModal"
import { LogPastureCheckSheet } from "@/components/LogPastureCheckSheet"
import {
  RecordCalvingModal,
  type FinalizeCalvingObservationPayload,
  type PersistCalvingAiPayload,
} from "@/components/RecordCalvingModal"
import type { HorseTableRow } from "@/components/RanchWiseHorseRoster"
import { SAMPLE_HORSE_ROWS, horseRowKey } from "@/components/RanchWiseHorseRoster"
import { getCattleEffectiveHealthRisk } from "@/lib/cattleSelectors"
import { formatCattleTagDisplay } from "@/lib/cattleUi"
import { PASTURES_SEED, SAMPLE_CATTLE } from "@/lib/cattleSeed"
import { buildInitialCattleObservationsMap } from "@/lib/cattleObservationsSeed"
import { getAiRiskLevelFromObservations, getLatestObservationWithAi } from "@/lib/animalUtils"
import { riskLevelToModalStatusBadge } from "@/lib/horseUtils"
import { getObservationDomain, observationDomainFromCategory } from "@/lib/observationDomain"
import { buildInitialPastureChecksByPastureId } from "@/lib/pastureCheckSeed"
import { riskLevelToPastureStatus, type PastureCheckEntry } from "@/lib/pastureCheckTypes"
import { buildInitialObservationsMap, formatObservationDate } from "@/lib/initialObservations"
import type { LogObservationCommitAnalyzeMeta } from "@/lib/observationAnalyzeContext"
import { HORSE_OBSERVATION_CATEGORIES } from "@/lib/observationCategories"
import { calvingOutcomeConfirmationLabel } from "@/lib/calvingAnalyze"
import { buildCalvingObservationNotes } from "@/lib/calvingStatus"
import { showObservationDiscardedToast } from "@/lib/observationDiscardToast"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import type { CalvingRecord, Cattle, Pasture } from "@/types/cattle"
import type { AIResult, Category, ObservationEntry, RiskLevel } from "@/types/observation"

function horseStatusFromAiRiskLevel(level: RiskLevel | null): HorseTableRow["healthStatus"] {
  if (level === "flag") return "flag"
  if (level === "monitor") return "monitor"
  return "good"
}

function cattleHealthStatusFromRiskLevel(level: RiskLevel): "Flag" | "Monitor" | "Good" {
  if (level === "flag") return "Flag"
  if (level === "monitor") return "Monitor"
  return "Good"
}

function buildFinalCalvingObservationAi(base: AIResult | null | undefined, confirmed: RiskLevel): AIResult {
  const suggestedRiskLevel = base?.suggestedRiskLevel ?? base?.riskLevel ?? "good"
  const suggestedRiskLabel =
    base?.suggestedRiskLabel ??
    base?.riskLabel ??
    calvingOutcomeConfirmationLabel(suggestedRiskLevel)
  const mergedBase: AIResult =
    base ??
    ({
      riskLevel: "good",
      riskLabel: "Good",
      recommendations: [],
      patternNote: null,
    } satisfies AIResult)
  return {
    ...mergedBase,
    suggestedRiskLevel,
    suggestedRiskLabel,
    riskLevel: confirmed,
    riskLabel: calvingOutcomeConfirmationLabel(confirmed),
  }
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
  | { kind: "pasture"; pastureId: string; pastureName: string }

export type PastureCheckModalTarget = { pastureId: string; pastureName: string }

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
  /** Merge demo edits from the profile Edit modal (in-memory). */
  updatePasture: (pastureId: string, patch: Partial<Pasture>) => void
  /** Remove a pasture (demo): reassigns cattle and horses to another seed pasture. */
  removePasture: (pastureId: string) => void
  cattle: Cattle[]
  pastureChecks: PastureCheckEntry[]
  pastureChecksByPastureId: Record<string, PastureCheckEntry[]>
  appendPastureCheck: (pastureId: string, entry: PastureCheckEntry) => void
  setPastureChecksForPasture: (pastureId: string, entries: PastureCheckEntry[]) => void
  observationsByCattleId: Record<string, ObservationEntry[]>
  appendCattleObservation: (cattleId: string, entry: ObservationEntry) => void
  removeCattleObservation: (cattleId: string, observationId: string) => void

  pastureCheckModal: PastureCheckModalTarget | null
  openPastureCheckModal: (target: PastureCheckModalTarget) => void
  /** Alias for closing the unified log modal when the active target is a pasture (same as `closeLogModal`). */
  closePastureCheckModal: () => void

  recordCalvingModal: RecordCalvingModalTarget | null
  openRecordCalvingModal: (target: RecordCalvingModalTarget) => void
  closeRecordCalvingModal: () => void
  /** Persist calving record without touching modal state (e.g. mobile sheet). Returns the new Calving observation id. */
  commitCattleCalvingRecord: (record: CalvingRecord) => string
  /** Attach AI analysis to the calving observation row and the cattle record (after analyze completes). */
  persistCalvingObservationAi: (payload: PersistCalvingAiPayload) => void
  /** Apply user-confirmed Stable / Concern / Action needed after the calving result step. */
  finalizeCalvingObservation: (payload: FinalizeCalvingObservationPayload) => void
  /** Persist cattle observation from sheet/panel (or modal via handleLogSave). Optional `editingEntry` updates in place. */
  saveCattleObservationLog: (
    cattleId: string,
    data: { category: Category; notes: string; loggedBy: string; aiResult: AIResult },
    editingEntry?: ObservationEntry
  ) => string | void
  /** Re-run calving commit fields + observation row when user saves again from the calving editor. */
  updateCattleCalvingRecord: (record: CalvingRecord, observationId: string) => void
  /**
   * Removes calving observation, reverts cattle fields, shows undo toast.
   * `cattleRestore` is the post-commit cattle patch (including calving AI) used when undo runs.
   */
  discardCalvingObservation: (payload: {
    cattleId: string
    observationId: string
    observation: ObservationEntry
    cattleRevert: Partial<Cattle>
    cattleRestore: Partial<Cattle>
  }) => void
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
  const isMdUp = useMediaQuery("(min-width: 768px)")
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
  const lastPastureCheckCommitIdRef = useRef<string | null>(null)

  const [cattle, setCattle] = useState<Cattle[]>(SAMPLE_CATTLE)
  const [pastureFieldOverrides, setPastureFieldOverrides] = useState<Record<string, Partial<Pasture>>>({})
  const [removedPastureIds, setRemovedPastureIds] = useState<Set<string>>(() => new Set())
  const [pastureChecksByPastureId, setPastureChecksByPastureId] = useState<
    Record<string, PastureCheckEntry[]>
  >(() => buildInitialPastureChecksByPastureId())
  const [observationsByCattleId, setObservationsByCattleId] = useState<
    Record<string, ObservationEntry[]>
  >(buildInitialCattleObservationsMap)
  const [recordCalvingModal, setRecordCalvingModal] = useState<RecordCalvingModalTarget | null>(null)

  const pastureChecks = useMemo(
    () =>
      Object.values(pastureChecksByPastureId)
        .flat()
        .sort((a, b) => b.date - a.date),
    [pastureChecksByPastureId]
  )

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
      const rest = { ...prev }
      delete rest[horseKey]
      return rest
    })
    setObservationsByHorse((prev) => {
      const rest = { ...prev }
      delete rest[horseKey]
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

  const updatePasture = useCallback((pastureId: string, patch: Partial<Pasture>) => {
    setPastureFieldOverrides((prev) => ({
      ...prev,
      [pastureId]: { ...prev[pastureId], ...patch },
    }))
  }, [])

  const pastures = useMemo((): Pasture[] => {
    return PASTURES_SEED.filter((p) => !removedPastureIds.has(p.id)).map((p) => {
      const merged = { ...p, ...(pastureFieldOverrides[p.id] ?? {}) }
      const count = cattle.filter((c) => c.pastureId === merged.id).length
      const checks = (pastureChecksByPastureId[merged.id] ?? [])
        .slice()
        .sort((a, b) => b.date - a.date)
      const last = checks[0]
      const lastObservation = last
        ? formatDistanceToNow(last.date, { addSuffix: true })
        : merged.lastObservation
      return {
        ...merged,
        animalCount: count,
        lastObservation,
        lastCheckDate: last ? formatISO(last.date) : undefined,
      }
    })
  }, [cattle, pastureChecksByPastureId, pastureFieldOverrides, removedPastureIds])

  const appendHerdHorse = useCallback((row: HorseTableRow) => {
    setAddedHorses((prev) => [...prev, row])
  }, [])

  const updateHerdHorse = useCallback((horseKey: string, patch: Partial<HorseTableRow>) => {
    setHorseOverrides((prev) => ({
      ...prev,
      [horseKey]: { ...prev[horseKey], ...patch },
    }))
  }, [])

  const removePasture = useCallback(
    (pastureId: string) => {
      let nextRemoved = new Set<string>()
      setRemovedPastureIds((prev) => {
        nextRemoved = new Set(prev)
        nextRemoved.add(pastureId)
        return nextRemoved
      })
      const fallback = PASTURES_SEED.find((p) => !nextRemoved.has(p.id))
      if (!fallback) {
        setRemovedPastureIds((prev) => {
          const r = new Set(prev)
          r.delete(pastureId)
          return r
        })
        return
      }

      const seedPasture = PASTURES_SEED.find((p) => p.id === pastureId)
      const deletedName =
        (pastureFieldOverrides[pastureId]?.name ?? seedPasture?.name) ?? ""

      setCattle((prev) =>
        prev.map((c) => (c.pastureId === pastureId ? { ...c, pastureId: fallback.id } : c)),
      )

      setPastureChecksByPastureId((prev) => {
        const { [pastureId]: _, ...rest } = prev
        return rest
      })

      setPastureFieldOverrides((prev) => {
        const { [pastureId]: _, ...rest } = prev
        return rest
      })

      setLogObservationTarget((t) =>
        t?.kind === "pasture" && t.pastureId === pastureId ? null : t,
      )

      for (const row of herdRows) {
        if (row.pasture === deletedName) {
          updateHerdHorse(horseRowKey(row), { pasture: fallback.name })
        }
      }
    },
    [herdRows, pastureFieldOverrides, updateHerdHorse],
  )

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

  const appendPastureCheck = useCallback((pastureId: string, entry: PastureCheckEntry) => {
    setPastureChecksByPastureId((prev) => ({
      ...prev,
      [pastureId]: [entry, ...(prev[pastureId] ?? [])],
    }))
  }, [])

  const setPastureChecksForPasture = useCallback((pastureId: string, entries: PastureCheckEntry[]) => {
    setPastureChecksByPastureId((prev) => ({ ...prev, [pastureId]: entries }))
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
    lastPastureCheckCommitIdRef.current = null
    setLogObservationTarget({ kind: "horse", row, editingEntry })
  }, [])

  const openCattleLogModal = useCallback((c: Cattle, editingEntry?: ObservationEntry) => {
    lastHorseObservationCommitIdRef.current = null
    lastCattleObservationCommitIdRef.current = null
    lastPastureCheckCommitIdRef.current = null
    setLogObservationTarget({ kind: "cattle", cattle: c, editingEntry })
  }, [])

  const closeLogModal = useCallback(() => {
    lastHorseObservationCommitIdRef.current = null
    lastCattleObservationCommitIdRef.current = null
    lastPastureCheckCommitIdRef.current = null
    setLogObservationTarget(null)
  }, [])

  const openPastureCheckModal = useCallback((target: PastureCheckModalTarget) => {
    lastHorseObservationCommitIdRef.current = null
    lastCattleObservationCommitIdRef.current = null
    lastPastureCheckCommitIdRef.current = null
    setLogObservationTarget({
      kind: "pasture",
      pastureId: target.pastureId,
      pastureName: target.pastureName,
    })
  }, [])

  const closePastureCheckModal = useCallback(() => {
    closeLogModal()
  }, [closeLogModal])

  const openRecordCalvingModal = useCallback((target: RecordCalvingModalTarget) => {
    setRecordCalvingModal(target)
  }, [])

  const closeRecordCalvingModal = useCallback(() => setRecordCalvingModal(null), [])

  const commitCattleCalvingRecord = useCallback(
    (record: CalvingRecord): string => {
      const realComps = record.complications.filter((c) => c !== "none")
      const dateOnly = formatISO(parseISO(record.date), { representation: "date" })
      updateCattle(record.cattleId, {
        calvingStatus: "calved",
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
        observationDomain: "health",
      })
      return observationId
    },
    [appendCattleObservation, updateCattle]
  )

  const updateCattleCalvingRecord = useCallback(
    (record: CalvingRecord, observationId: string) => {
      const realComps = record.complications.filter((c) => c !== "none")
      const dateOnly = formatISO(parseISO(record.date), { representation: "date" })
      updateCattle(record.cattleId, {
        calvingStatus: "calved",
        calvingDate: dateOnly,
        dueDate: null,
        deliveryType: record.deliveryType,
        calfStatus: record.calfStatus,
        calvingComplications: realComps.length > 0 ? realComps : [],
        inLaborTimestamp: null,
      })
      const obsNotes = buildCalvingObservationNotes({
        ...record,
        complications: realComps.length > 0 ? realComps : [],
      })
      setObservationsByCattleId((prev) => ({
        ...prev,
        [record.cattleId]: (prev[record.cattleId] ?? []).map((o) =>
          o.id === observationId
            ? {
                ...o,
                date: formatObservationDate(new Date(record.date)),
                notes: obsNotes,
                loggedBy: record.loggedBy,
              }
            : o
        ),
      }))
    },
    [updateCattle]
  )

  const discardCalvingObservation = useCallback(
    (payload: {
      cattleId: string
      observationId: string
      observation: ObservationEntry
      cattleRevert: Partial<Cattle>
      cattleRestore: Partial<Cattle>
    }) => {
      const { cattleId, observationId, observation, cattleRevert, cattleRestore } = payload
      removeCattleObservation(cattleId, observationId)
      updateCattle(cattleId, cattleRevert)
      showObservationDiscardedToast(() => {
        appendCattleObservation(cattleId, observation)
        updateCattle(cattleId, cattleRestore)
      }, { message: "Calving record discarded" })
    },
    [appendCattleObservation, removeCattleObservation, updateCattle]
  )

  const persistCalvingObservationAi = useCallback((payload: PersistCalvingAiPayload) => {
    const { cattleId, observationId, aiResult } = payload
    const enriched: AIResult = {
      ...aiResult,
      suggestedRiskLevel: aiResult.suggestedRiskLevel ?? aiResult.riskLevel,
      suggestedRiskLabel: aiResult.suggestedRiskLabel ?? aiResult.riskLabel,
    }
    setObservationsByCattleId((prev) => ({
      ...prev,
      [cattleId]: (prev[cattleId] ?? []).map((o) =>
        o.id === observationId ? { ...o, aiResult: enriched } : o
      ),
    }))
    updateCattle(cattleId, { calvingAiResult: enriched })
  }, [updateCattle])

  const finalizeCalvingObservation = useCallback(
    (payload: FinalizeCalvingObservationPayload) => {
      const { cattleId, observationId, confirmedRisk } = payload
      const list = observationsByCattleId[cattleId] ?? []
      const o = list.find((x) => x.id === observationId)
      const finalAi = buildFinalCalvingObservationAi(o?.aiResult, confirmedRisk)

      setObservationsByCattleId((prev) => ({
        ...prev,
        [cattleId]: (prev[cattleId] ?? []).map((ob) =>
          ob.id === observationId ? { ...ob, aiResult: finalAi } : ob
        ),
      }))

      updateCattle(cattleId, {
        calvingAiResult: finalAi,
        calvingStatus: "calved",
        healthStatus: cattleHealthStatusFromRiskLevel(confirmedRisk),
      })
    },
    [observationsByCattleId, updateCattle]
  )

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
      data: LogObservationSavePayload,
      meta?: { stage: "commit" | "done" | "discard" }
    ): Promise<void | boolean | LogObservationCommitAnalyzeMeta> => {
      if (!logObservationTarget) return
      const stage = meta?.stage ?? "done"

      if (logObservationTarget.kind === "pasture") {
        if (data.kind !== "pasture") return
        const pastureId = logObservationTarget.pastureId
        const list = pastureChecksByPastureId[pastureId] ?? []

        if (stage === "discard") {
          const targetId = lastPastureCheckCommitIdRef.current
          lastPastureCheckCommitIdRef.current = null
          const snap = targetId ? list.find((e) => e.id === targetId) : undefined
          if (snap && targetId) {
            const postRemove = list.filter((e) => e.id !== targetId)
            setPastureChecksForPasture(pastureId, postRemove)
            showObservationDiscardedToast(
              () => {
                setPastureChecksForPasture(pastureId, [snap, ...postRemove])
              },
              { message: "Pasture check discarded" }
            )
          }
          setLogObservationTarget(null)
          return
        }

        if (stage === "commit") {
          const priorChecks = [...list]
          const entry: PastureCheckEntry = {
            id: crypto.randomUUID(),
            pastureId,
            date: Date.now(),
            category: data.category,
            status: riskLevelToPastureStatus(data.aiResult.riskLevel),
            body: data.notes,
            author: data.loggedBy,
            aiResult: data.aiResult,
          }
          lastPastureCheckCommitIdRef.current = entry.id
          appendPastureCheck(pastureId, entry)
          const meta: LogObservationCommitAnalyzeMeta = {
            kind: "pasture",
            pastureId,
            pastureName: logObservationTarget.pastureName,
            priorChecks,
          }
          return meta
        }

        const targetId = lastPastureCheckCommitIdRef.current
        lastPastureCheckCommitIdRef.current = null
        if (targetId) {
          const nextList = list.map((e) =>
            e.id === targetId
              ? {
                  ...e,
                  category: data.category,
                  body: data.notes,
                  author: data.loggedBy,
                  aiResult: data.aiResult,
                  status: riskLevelToPastureStatus(data.aiResult.riskLevel),
                }
              : e
          )
          setPastureChecksForPasture(pastureId, nextList)
        }
        setLogObservationTarget(null)
        return
      }

      if (data.kind !== "animal") return
      const animalData = {
        category: data.category,
        notes: data.notes,
        loggedBy: data.loggedBy,
        aiResult: data.aiResult,
      }

      if (stage === "discard") {
        if (logObservationTarget.kind === "horse") {
          const key = horseRowKey(logObservationTarget.row)
          const editing = logObservationTarget.editingEntry
          const targetId = editing?.id ?? lastHorseObservationCommitIdRef.current
          lastHorseObservationCommitIdRef.current = null
          const list = observationsByHorse[key] ?? []
          const snap = targetId ? list.find((o) => o.id === targetId) : undefined
          if (snap && targetId) {
            const postRemove = list.filter((o) => o.id !== targetId)
            removeHorseObservation(key, targetId)
            syncHorseProfileFromObservations(key, postRemove, updateHerdHorse)
            showObservationDiscardedToast(() => {
              setObservationsForHorse(key, [snap, ...postRemove])
              syncHorseProfileFromObservations(key, [snap, ...postRemove], updateHerdHorse)
            })
          }
        } else {
          const c = logObservationTarget.cattle
          const editing = logObservationTarget.editingEntry
          const targetId = editing?.id ?? lastCattleObservationCommitIdRef.current
          lastCattleObservationCommitIdRef.current = null
          const list = observationsByCattleId[c.id] ?? []
          const snap = targetId ? list.find((o) => o.id === targetId) : undefined
          if (snap && targetId) {
            const postRemove = list.filter((o) => o.id !== targetId)
            removeCattleObservation(c.id, targetId)
            const lvl = getAiRiskLevelFromObservations(postRemove)
            updateCattle(c.id, {
              healthStatus: lvl ? cattleHealthStatusFromRiskLevel(lvl) : "Good",
            })
            showObservationDiscardedToast(() => {
              appendCattleObservation(c.id, snap)
              const merged = [snap, ...postRemove]
              const restoreLvl = getAiRiskLevelFromObservations(merged)
              updateCattle(c.id, {
                healthStatus: restoreLvl
                  ? cattleHealthStatusFromRiskLevel(restoreLvl)
                  : cattleHealthStatusFromRiskLevel(snap.aiResult?.riskLevel ?? "good"),
                lastObservation: formatDistanceToNow(new Date(), { addSuffix: true }),
              })
            })
          }
        }
        setLogObservationTarget(null)
        return
      }

      if (logObservationTarget.kind === "horse") {
        const key = horseRowKey(logObservationTarget.row)
        const editing = logObservationTarget.editingEntry

        if (stage === "commit") {
          const row = logObservationTarget.row
          if (editing) {
            lastHorseObservationCommitIdRef.current = editing.id
            const priorForAi = (observationsByHorse[key] ?? []).filter((o) => o.id !== editing.id)
            const nextHorseObs = (observationsByHorse[key] ?? []).map((o) =>
              o.id === editing.id
                ? {
                    ...o,
                    category: animalData.category,
                    observationDomain: observationDomainFromCategory(animalData.category),
                    notes: animalData.notes,
                    loggedBy: animalData.loggedBy,
                    aiResult: animalData.aiResult,
                  }
                : o
            )
            setObservationsForHorse(key, nextHorseObs)
            syncHorseProfileFromObservations(key, nextHorseObs, updateHerdHorse)
            const meta: LogObservationCommitAnalyzeMeta = {
              kind: "horse",
              horseKey: key,
              horseId: String(row.id),
              entityName: row.name,
              priorObservations: priorForAi,
            }
            return meta
          }
          const priorForAi = [...(observationsByHorse[key] ?? [])]
          const entry: ObservationEntry = {
            id: crypto.randomUUID(),
            date: formatObservationDate(new Date()),
            category: animalData.category,
            observationDomain: observationDomainFromCategory(animalData.category),
            notes: animalData.notes,
            loggedBy: animalData.loggedBy,
            aiResult: animalData.aiResult,
          }
          lastHorseObservationCommitIdRef.current = entry.id
          appendObservation(key, entry)
          const nextHorseObs = [entry, ...(observationsByHorse[key] ?? [])]
          syncHorseProfileFromObservations(key, nextHorseObs, updateHerdHorse)
          const meta: LogObservationCommitAnalyzeMeta = {
            kind: "horse",
            horseKey: key,
            horseId: String(row.id),
            entityName: row.name,
            priorObservations: priorForAi,
          }
          return meta
        }

        // stage === "done": refresh AI payload on the committed entry, then close.
        const targetId = editing?.id ?? lastHorseObservationCommitIdRef.current
        lastHorseObservationCommitIdRef.current = null
        if (targetId) {
          const nextHorseObs = (observationsByHorse[key] ?? []).map((o) =>
            o.id === targetId
              ? {
                  ...o,
                  category: animalData.category,
                  observationDomain: observationDomainFromCategory(animalData.category),
                  notes: animalData.notes,
                  loggedBy: animalData.loggedBy,
                  aiResult: animalData.aiResult,
                }
              : o
          )
          setObservationsForHorse(key, nextHorseObs)
          syncHorseProfileFromObservations(key, nextHorseObs, updateHerdHorse)
        }
      } else {
        const c = logObservationTarget.cattle
        if (stage === "commit") {
          const editingEntry = logObservationTarget.editingEntry
          const priorForAi = (observationsByCattleId[c.id] ?? []).filter((o) =>
            editingEntry ? o.id !== editingEntry.id : true
          )
          lastCattleObservationCommitIdRef.current = saveCattleObservationLog(
            c.id,
            animalData,
            editingEntry
          )
          const meta: LogObservationCommitAnalyzeMeta = {
            kind: "cattle",
            cattleId: c.id,
            entityName: formatCattleTagDisplay(c.tagNumber),
            priorObservations: priorForAi,
            calvingStatus: c.calvingStatus,
            cattleCalvingSnapshot: {
              calvingDate: c.calvingDate,
              deliveryType: c.deliveryType ?? null,
              calvingComplications: c.calvingComplications ?? null,
              calvingStatus: c.calvingStatus,
            },
          }
          return meta
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
                    category: animalData.category,
                    notes: animalData.notes,
                    loggedBy: animalData.loggedBy,
                    aiResult: animalData.aiResult,
                  }
                : o
            ),
          }))
          updateCattle(c.id, {
            healthStatus: cattleHealthStatusFromRiskLevel(animalData.aiResult.riskLevel),
            lastObservation: formatDistanceToNow(new Date(), { addSuffix: true }),
          })
        }
      }

      setLogObservationTarget(null)
    },
    [
      appendCattleObservation,
      appendObservation,
      appendPastureCheck,
      logObservationTarget,
      observationsByCattleId,
      observationsByHorse,
      pastureChecksByPastureId,
      removeCattleObservation,
      removeHorseObservation,
      saveCattleObservationLog,
      setObservationsForHorse,
      setObservationsByCattleId,
      setPastureChecksForPasture,
      updateCattle,
      updateHerdHorse,
    ]
  )

  const logModalAnimalName =
    logObservationTarget?.kind === "horse"
      ? logObservationTarget.row.name
      : logObservationTarget?.kind === "cattle"
        ? formatCattleTagDisplay(logObservationTarget.cattle.tagNumber)
        : logObservationTarget?.kind === "pasture"
          ? logObservationTarget.pastureName
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
    if (logObservationTarget?.kind === "pasture") {
      const meta = pastures.find((p) => p.id === logObservationTarget.pastureId)
      const typeLabel = meta?.type.replace("-", " ") ?? "pasture"
      return `Pasture · ${typeLabel}`
    }
    return undefined
  }, [logObservationTarget, pastures])

  const logModalStatusBadge = useMemo(() => {
    if (logObservationTarget?.kind === "horse") {
      return herdFieldToModalStatusBadge(logObservationTarget.row.healthStatus)
    }
    if (logObservationTarget?.kind === "cattle") {
      return riskLevelToModalStatusBadge(
        getCattleEffectiveHealthRisk(logObservationTarget.cattle, observationsByCattleId)
      )
    }
    return undefined
  }, [logObservationTarget, observationsByCattleId])

  const logModalBehaviorStatusBadge = useMemo(() => {
    if (logObservationTarget?.kind !== "horse") return undefined
    if (logObservationTarget.row.behaviorStatus === "good") return undefined
    return herdFieldToModalStatusBadge(logObservationTarget.row.behaviorStatus)
  }, [logObservationTarget])

  const pastureCheckModal = useMemo((): PastureCheckModalTarget | null => {
    if (logObservationTarget?.kind === "pasture") {
      return {
        pastureId: logObservationTarget.pastureId,
        pastureName: logObservationTarget.pastureName,
      }
    }
    return null
  }, [logObservationTarget])

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
      updatePasture,
      removePasture,
      cattle,
      pastureChecks,
      pastureChecksByPastureId,
      appendPastureCheck,
      setPastureChecksForPasture,
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
      updateCattleCalvingRecord,
      discardCalvingObservation,
      persistCalvingObservationAi,
      finalizeCalvingObservation,
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
      updatePasture,
      removePasture,
      cattle,
      pastureChecks,
      pastureChecksByPastureId,
      appendPastureCheck,
      setPastureChecksForPasture,
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
      updateCattleCalvingRecord,
      discardCalvingObservation,
      persistCalvingObservationAi,
      finalizeCalvingObservation,
      saveCattleObservationLog,
      updateCattle,
      markCattleInLabor,
      appendCattle,
    ]
  )

  return (
    <RanchDataContext.Provider value={value}>
      {children}
      <LogPastureCheckSheet
        open={logObservationTarget?.kind === "pasture" && !isMdUp}
        pastureId={logObservationTarget?.kind === "pasture" ? logObservationTarget.pastureId : ""}
        pastureName={logObservationTarget?.kind === "pasture" ? logObservationTarget.pastureName : ""}
        pastureSubtitle={logObservationTarget?.kind === "pasture" ? logModalAnimalSubtitle : undefined}
        onClose={closeLogModal}
        onSave={handleLogSave}
      />
      <LogObservationModal
        open={!!logObservationTarget && (logObservationTarget?.kind !== "pasture" || isMdUp)}
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
        hideCategoryField={logObservationTarget?.kind === "cattle"}
        logMode={logObservationTarget?.kind === "pasture" ? "pasture" : "animal"}
        modalHeading="Log observation"
        stableKey={logObservationTarget?.kind === "pasture" ? logObservationTarget.pastureId : undefined}
        onClose={closeLogModal}
        onSave={handleLogSave}
      />
      <RecordCalvingModal
        open={!!recordCalvingModal}
        cattle={recordCalvingModal?.cattle ?? null}
        pastureName={recordCalvingModal?.pastureName ?? ""}
        onClose={closeRecordCalvingModal}
        onSave={handleRecordCalvingSave}
        onPersistCalvingAi={persistCalvingObservationAi}
        onFinalizeCalvingObservation={finalizeCalvingObservation}
        onUpdateCalvingRecord={updateCattleCalvingRecord}
        onDiscardCalving={discardCalvingObservation}
        onCalvingDone={recordCalvingModal?.onCalvingDone}
      />
    </RanchDataContext.Provider>
  )
}
