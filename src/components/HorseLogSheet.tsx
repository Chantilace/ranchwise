import { Check, Sparkle, X } from "lucide-react"
import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { useResultPhaseScroll } from "@/hooks/useResultPhaseScroll"
import { Drawer } from "vaul"
import { AiAnnotationMark } from "@/components/ai/ai-annotation-mark"
import type { HorseTableRow } from "@/components/RanchWiseHorseRoster"
import { horseRowKey } from "@/components/RanchWiseHorseRoster"
import { ObservationFormFields } from "@/components/ObservationFormFields"
import { SmartSuggestionsPanel } from "@/components/SmartSuggestionsPanel"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { useRanchData } from "@/contexts/RanchDataContext"
import { getAiRiskLevelFromObservations, getLatestObservationWithAi } from "@/lib/animalUtils"
import { formatObservationDate } from "@/lib/initialObservations"
import { LOG_OBSERVATION_IDENTITY_ROW, LOG_OBSERVATION_IDENTITY_ROW_STACK } from "@/lib/logObservationLayout"
import { mockAnalyze } from "@/lib/observationAnalyze"
import { entriesToRecentSnapshots, type EntityContext } from "@/lib/observationAnalyzeContext"
import { showObservationDiscardedToast } from "@/lib/observationDiscardToast"
import { getObservationDomain, observationDomainFromCategory } from "@/lib/observationDomain"
import { useScrollShadow } from "@/hooks/useScrollShadow"
import { cn } from "@/lib/utils"
import { useOverlayRegistration } from "@/contexts/OverlayRegistryContext"
import type { AIResult, Category, ObservationEntry, RiskLevel } from "@/types/observation"

export type HorseLogSheetProps = {
  horse: HorseTableRow
  onClose: () => void
}

type HorseLogView = "input" | "analyzing" | "result"

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function horseRowStatusToBadge(status: HorseTableRow["healthStatus"]): "good" | "monitor" | "flag" {
  if (status === "flag") return "flag"
  if (status === "monitor") return "monitor"
  return "good"
}

function horseStatusFromAiRiskLevel(level: RiskLevel | null): HorseTableRow["healthStatus"] {
  if (level === "flag") return "flag"
  if (level === "monitor") return "monitor"
  return "good"
}

function riskLevelToHorseStatus(r: RiskLevel): HorseTableRow["healthStatus"] {
  if (r === "flag") return "flag"
  if (r === "monitor") return "monitor"
  return "good"
}

function syncHorseProfileFromObservations(
  horseKey: string,
  nextObservations: ObservationEntry[],
  updateHerdHorse: (key: string, patch: Partial<HorseTableRow>) => void
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

type HorseLogSheetInnerProps = HorseLogSheetProps & {
  view: HorseLogView
  setView: Dispatch<SetStateAction<HorseLogView>>
}

function HorseLogSheetInner({ horse, onClose, view, setView }: HorseLogSheetInnerProps) {
  const {
    appendObservation,
    setObservationsForHorse,
    observationsByHorse,
    updateHerdHorse,
    removeHorseObservation,
  } = useRanchData()
  const [category, setCategory] = useState<Category>("Health")
  const [notes, setNotes] = useState("")
  const [loggedBy, setLoggedBy] = useState("")
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [confirmedRiskLevel, setConfirmedRiskLevel] = useState<RiskLevel>("good")

  const committedObsIdRef = useRef<string | null>(null)
  const horseKey = horseRowKey(horse)

  const { scrollRef, isScrolled } = useScrollShadow()
  const scrollBodyElRef = useRef<HTMLDivElement | null>(null)
  useResultPhaseScroll(view, scrollBodyElRef)

  const canAnalyze = notes.trim().length > 0 && loggedBy.trim().length > 0

  async function handleSaveAndAnalyze() {
    if (!canAnalyze) return
    setView("analyzing")
    try {
      const provisional: AIResult = {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: [],
        patternNote: null,
      }
      const entry: ObservationEntry = {
        id: crypto.randomUUID(),
        date: formatObservationDate(new Date()),
        category,
        observationDomain: observationDomainFromCategory(category),
        notes: notes.trim(),
        loggedBy: loggedBy.trim(),
        aiResult: provisional,
      }
      committedObsIdRef.current = entry.id
      appendObservation(horseKey, entry)
      const nextAfterAppend = [entry, ...(observationsByHorse[horseKey] ?? [])]
      syncHorseProfileFromObservations(horseKey, nextAfterAppend, updateHerdHorse)

      const priorOnly = observationsByHorse[horseKey] ?? []
      const analyzeContext: EntityContext = {
        entityKind: "horse",
        entityId: String(horse.id),
        entityName: horse.name,
        recentObservations: entriesToRecentSnapshots(priorOnly),
      }
      const merged = await mockAnalyze(category, notes.trim(), horse.name, analyzeContext)
      setAiResult(merged)
      setConfirmedRiskLevel(merged.riskLevel)

      const oid = committedObsIdRef.current
      if (oid) {
        const prevList = observationsByHorse[horseKey] ?? []
        const base = prevList.some((o) => o.id === entry.id) ? prevList : [entry, ...prevList]
        const next = base.map((o) => (o.id === oid ? { ...o, aiResult: merged } : o))
        setObservationsForHorse(horseKey, next)
        syncHorseProfileFromObservations(horseKey, next, updateHerdHorse)
      }

      setView("result")
    } catch {
      if (committedObsIdRef.current) {
        const oid = committedObsIdRef.current
        removeHorseObservation(horseKey, oid)
        const rest = (observationsByHorse[horseKey] ?? []).filter((o) => o.id !== oid)
        syncHorseProfileFromObservations(horseKey, rest, updateHerdHorse)
        committedObsIdRef.current = null
      }
      setView("input")
    }
  }

  function handleFinalize() {
    if (!aiResult || !committedObsIdRef.current) return
    const oid = committedObsIdRef.current
    const finalAiResult: AIResult = {
      ...aiResult,
      riskLevel: confirmedRiskLevel,
      riskLabel:
        confirmedRiskLevel === "flag"
          ? "Flag"
          : confirmedRiskLevel === "monitor"
            ? "Monitor"
            : "Good",
    }
    const next = (observationsByHorse[horseKey] ?? []).map((o) =>
      o.id === oid
        ? {
            ...o,
            category,
            observationDomain: observationDomainFromCategory(category),
            notes: notes.trim(),
            loggedBy: loggedBy.trim(),
            aiResult: finalAiResult,
          }
        : o
    )
    setObservationsForHorse(horseKey, next)
    syncHorseProfileFromObservations(horseKey, next, updateHerdHorse)
    const summary =
      finalAiResult.patternNote?.trim() ||
      (finalAiResult.recommendations[0] ? finalAiResult.recommendations[0].trim() : "")
    const patch: Partial<HorseTableRow> = {
      ...(category === "Health"
        ? { healthStatus: riskLevelToHorseStatus(confirmedRiskLevel) }
        : { behaviorStatus: riskLevelToHorseStatus(confirmedRiskLevel) }),
      ...(summary ? { aiSummary: summary } : { aiSummary: undefined }),
    }
    updateHerdHorse(horseKey, patch)
    committedObsIdRef.current = null
    onClose()
  }

  function handleDiscard() {
    const oid = committedObsIdRef.current
    if (!oid || !aiResult) return
    const list = observationsByHorse[horseKey] ?? []
    const snap = list.find((o) => o.id === oid)
    if (!snap) {
      committedObsIdRef.current = null
      onClose()
      return
    }
    const postRemove = list.filter((o) => o.id !== oid)
    removeHorseObservation(horseKey, oid)
    syncHorseProfileFromObservations(horseKey, postRemove, updateHerdHorse)
    committedObsIdRef.current = null
    onClose()
    showObservationDiscardedToast(() => {
      setObservationsForHorse(horseKey, [snap, ...postRemove])
      syncHorseProfileFromObservations(horseKey, [snap, ...postRemove], updateHerdHorse)
    })
  }

  function goBackToInput() {
    setView("input")
  }

  const identityRow = (
    <div className={LOG_OBSERVATION_IDENTITY_ROW}>
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
          {horse.photoUrl ? (
            <img src={horse.photoUrl} alt="" className="size-full object-cover object-center" />
          ) : (
            <span className="text-[13px] font-semibold text-muted-foreground" aria-hidden>
              {initialsFromName(horse.name)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium text-foreground">{horse.name}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {horse.sex} · {horse.age} · {horse.pasture}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-end justify-end gap-1.5">
        <StatusBadge status={horseRowStatusToBadge(horse.healthStatus)} />
        {horse.behaviorStatus !== "good" ? (
          <StatusBadge status={horseRowStatusToBadge(horse.behaviorStatus)} />
        ) : null}
      </div>
    </div>
  )

  const header =
    view === "input" ? (
      <>
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 pb-3 pt-3">
          <span className="min-w-0" aria-hidden />
          <p className="text-center text-base font-medium text-foreground">Log observation</p>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="icon"
              size="iconGhost"
              className="shrink-0"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
        {identityRow}
      </>
    ) : view === "analyzing" ? (
      <>
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 pb-3 pt-3">
          <span className="min-w-0" aria-hidden />
          <p className="text-center text-base font-medium text-foreground">Log observation</p>
          <span className="min-w-0" aria-hidden />
        </div>
        <div className={LOG_OBSERVATION_IDENTITY_ROW_STACK}>
          <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
            {horse.photoUrl ? (
              <img src={horse.photoUrl} alt="" className="size-full object-cover object-center" />
            ) : (
              <span className="text-[13px] font-semibold text-muted-foreground" aria-hidden>
                {initialsFromName(horse.name)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-foreground">{horse.name}</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Analyzing observation…</p>
          </div>
        </div>
      </>
    ) : view === "result" && aiResult ? (
      <>
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 pb-3 pt-3">
          <span className="min-w-0" aria-hidden />
          <p className="text-center text-base font-medium text-foreground">Log observation</p>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="icon"
              size="iconGhost"
              className="shrink-0"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="size-3.5" aria-hidden />
            </Button>
          </div>
        </div>
        {identityRow}
      </>
    ) : null

  const fieldsLocked = view !== "input"
  const textLocked = view === "result"

  const scrollBody = (
    <div className="flex flex-col gap-4">
      <ObservationFormFields
        variant="pills"
        animalName={horse.name}
        category={category}
        onCategoryChange={setCategory}
        notes={notes}
        onNotesChange={setNotes}
        loggedBy={loggedBy}
        onLoggedByChange={setLoggedBy}
        disabled={fieldsLocked}
        readOnlyText={textLocked}
      />

      {view === "analyzing" ? (
        <div className="flex flex-col gap-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-16 animate-pulse rounded-lg bg-muted" />
          <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
      ) : null}

      {view === "result" && aiResult ? (
        <>
          <div className="flex items-center gap-2 rounded-lg bg-status-good-bg px-3 py-2">
            <Check className="size-3.5 shrink-0 text-status-good-text" aria-hidden />
            <span className="text-[13px] font-medium text-status-good-text">Observation successfully logged</span>
          </div>
          <SmartSuggestionsPanel
            mode="modal"
            labelGlyphStyle="section"
            suggestions={aiResult.recommendations}
            contextNote={aiResult.patternNote}
          />
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground opacity-70">
                Confirm status
              </p>
              <p className="mt-0.5 text-[13px] text-foreground">
                <AiAnnotationMark /> AI assessed:{" "}
                <span className="text-foreground">
                  {aiResult.riskLevel === "flag" ? "Flag" : aiResult.riskLevel === "monitor" ? "Monitor" : "Good"}
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              {(
                [
                  { id: "good" as const, label: "Good", active: "bg-status-good-bg border-status-good-bg text-status-good-text" },
                  { id: "monitor" as const, label: "Monitor", active: "bg-status-monitor-bg border-status-monitor-bg text-status-monitor-text" },
                  { id: "flag" as const, label: "Flag", active: "bg-status-flag-bg border-status-flag-bg text-status-flag-text" },
                ] as const
              ).map((opt) => {
                const isSelected = confirmedRiskLevel === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setConfirmedRiskLevel(opt.id)}
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                      isSelected ? opt.active : "border-border bg-background text-foreground hover:bg-muted/60"
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )

  const footer =
    view === "input" ? (
      <div className="mt-auto flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
        <Button type="button" variant="secondary" className="min-h-0 shrink-0" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          className="min-h-0 shrink-0 gap-2"
          disabled={!canAnalyze}
          onClick={() => void handleSaveAndAnalyze()}
        >
          <Sparkle className="size-5 text-action-foreground" strokeWidth={1.5} aria-hidden />
          Save & analyze
        </Button>
      </div>
    ) : view === "analyzing" ? (
      <div className="mt-auto flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
        <Button type="button" variant="secondary" className="min-h-0 shrink-0" disabled>
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          className="min-h-0 shrink-0 gap-2 disabled:opacity-60"
          disabled
          aria-busy
        >
          <Sparkle className="size-5 text-action-foreground" strokeWidth={1.5} aria-hidden />
          Analyzing…
        </Button>
      </div>
    ) : view === "result" && aiResult ? (
      <div className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
        <Button type="button" variant="ghost" size="lg" className="shrink-0" onClick={handleDiscard}>
          Discard
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="secondary" size="lg" className="shrink-0" onClick={goBackToInput}>
            Edit
          </Button>
          <Button type="button" variant="primary" size="lg" className="shrink-0" onClick={handleFinalize}>
            Finalize
          </Button>
        </div>
      </div>
    ) : null

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        className="scroll-shadow-header shrink-0 bg-background"
        data-scrolled={isScrolled ? "true" : undefined}
      >
        {header}
      </div>
      <div ref={(node) => { scrollRef(node); scrollBodyElRef.current = node }} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {scrollBody}
      </div>
      {footer}
    </div>
  )
}

export function HorseLogSheet({ horse, onClose }: HorseLogSheetProps) {
  useOverlayRegistration(true)
  const [view, setView] = useState<HorseLogView>("input")

  return (
    <Drawer.Root
      open
      dismissible={view !== "analyzing"}
      onOpenChange={(open) => !open && view !== "analyzing" && onClose()}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-[1px]" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 z-[121] flex max-h-[min(90dvh,880px)] flex-col rounded-t-2xl bg-background outline-none">
          <Drawer.Title className="sr-only">Log observation — {horse.name}</Drawer.Title>
          <Drawer.Handle className="mx-auto mt-2.5 mb-2 block h-1 w-8 shrink-0 rounded-full bg-border" />
          <HorseLogSheetInner horse={horse} onClose={onClose} view={view} setView={setView} />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
