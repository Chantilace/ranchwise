import { Dialog } from "@base-ui/react/dialog"
import { formatISO, parseISO } from "date-fns"
import { Sparkle, X } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useScrollShadow } from "@/hooks/useScrollShadow"
import { AiAnnotationMark } from "@/components/ai/ai-annotation-mark"
import { Button, buttonVariants } from "@/components/ui/button"
import { FormLabel } from "@/components/ui/form-label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LogReviewFilledField } from "@/components/LogReviewFilledField"
import { SmartSuggestionsPanel } from "@/components/SmartSuggestionsPanel"
import { analyzeCalvingRecord, calvingOutcomeConfirmationLabel } from "@/lib/calvingAnalyze"
import { buildCalvingObservationNotes } from "@/lib/calvingStatus"
import { formatObservationDate } from "@/lib/initialObservations"
import { formatCattleTagDisplay, formatDueDateLabel } from "@/lib/cattleUi"
import type {
  CalfStatus,
  CalvingComplication,
  CalvingRecord,
  Cattle,
  DeliveryType,
} from "@/types/cattle"
import type { AIResult, ObservationEntry, RiskLevel } from "@/types/observation"
import { cn } from "@/lib/utils"

export type PersistCalvingAiPayload = {
  cattleId: string
  observationId: string
  aiResult: AIResult
}

export type FinalizeCalvingObservationPayload = {
  cattleId: string
  observationId: string
  record: CalvingRecord
  confirmedRisk: RiskLevel
}

export interface RecordCalvingModalProps {
  open: boolean
  cattle: Cattle | null
  pastureName: string
  onClose: () => void
  /** Return the new Calving timeline observation id (used to attach AI after analyze). */
  onSave: (data: CalvingRecord) => string | void | Promise<string | void>
  onPersistCalvingAi?: (payload: PersistCalvingAiPayload) => void | Promise<void>
  /** After user confirms Stable / Concern / Action needed — updates observation AI + cattle health + calving status. */
  onFinalizeCalvingObservation: (payload: FinalizeCalvingObservationPayload) => void | Promise<void>
  onUpdateCalvingRecord?: (record: CalvingRecord, observationId: string) => void
  onDiscardCalving?: (payload: {
    cattleId: string
    observationId: string
    observation: ObservationEntry
    cattleRevert: Partial<Cattle>
    cattleRestore: Partial<Cattle>
  }) => void
  /** Fires after user taps Done on the calving result step (e.g. close home quick-log sheet). */
  onCalvingDone?: () => void
}

const DELIVERY_OPTIONS: { id: DeliveryType; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "assisted", label: "Assisted" },
  { id: "c-section", label: "C-section" },
]

const CALF_OPTIONS: { id: CalfStatus; label: string }[] = [
  { id: "live", label: "Live" },
  { id: "stillborn", label: "Stillborn" },
  { id: "unknown", label: "Unknown" },
]

const COMPLICATION_OPTIONS: { id: CalvingComplication; label: string }[] = [
  { id: "none", label: "None" },
  { id: "retained-placenta", label: "Retained placenta" },
  { id: "prolapse", label: "Prolapse" },
  { id: "hemorrhage", label: "Hemorrhage" },
]

/** Same pill styling as pasture check confirmation in `LogObservationModal`. */
const CALVING_CONFIRM_STATUS_OPTIONS = [
  {
    id: "good" as const,
    label: "Stable",
    active: "bg-status-good-bg border-status-good-bg text-status-good-text",
  },
  {
    id: "monitor" as const,
    label: "Concern",
    active: "bg-status-monitor-bg border-status-monitor-bg text-status-monitor-text",
  },
  {
    id: "call-vet" as const,
    label: "Action needed",
    active: "bg-status-flag-bg border-status-flag-bg text-status-flag-text",
  },
] as const

function pickCalvingRevertPatch(c: Cattle): Partial<Cattle> {
  return {
    calvingStatus: c.calvingStatus,
    calvingDate: c.calvingDate ?? null,
    dueDate: c.dueDate ?? null,
    deliveryType: c.deliveryType ?? null,
    calfStatus: c.calfStatus ?? null,
    calvingComplications: c.calvingComplications ?? [],
    inLaborTimestamp: c.inLaborTimestamp ?? null,
    calvingAiResult: c.calvingAiResult ?? null,
  }
}

function calvingRestorePatch(record: CalvingRecord, calvingAiResult: AIResult | null): Partial<Cattle> {
  const realComps = record.complications.filter((c) => c !== "none")
  const nextStatus =
    record.forceComplicationsOutcome || realComps.length > 0 ? "complications" : "calved"
  const dateOnly = formatISO(parseISO(record.date), { representation: "date" })
  return {
    calvingStatus: nextStatus,
    calvingDate: dateOnly,
    dueDate: null,
    deliveryType: record.deliveryType,
    calfStatus: record.calfStatus,
    calvingComplications: realComps.length > 0 ? realComps : [],
    inLaborTimestamp: null,
    calvingAiResult,
  }
}

function toDatetimeLocalValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type CalvingFlowPhase = "input" | "saving" | "analyzing" | "result"

function CalvingAnalyzingSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4" aria-busy aria-label="Analyzing calving record">
      <div className="h-3 w-full max-w-[90%] animate-pulse rounded bg-muted" />
      <div className="h-3 w-full max-w-[75%] animate-pulse rounded bg-muted" />
      <div className="h-3 w-full max-w-[85%] animate-pulse rounded bg-muted" />
      <div className="h-3 w-full max-w-[55%] animate-pulse rounded bg-muted" />
    </div>
  )
}

export type RecordCalvingEditorFooterApi = {
  phase: CalvingFlowPhase
  canSave: boolean
  save: () => void | Promise<void>
  finalize: () => void | Promise<void>
  edit: () => void
  discard: () => void
}

export type RecordCalvingEditorProps = {
  cattle: Cattle
  pastureName: string
  header: ReactNode
  /** Classes for the scrollable fields region */
  contentClassName?: string
  footer: (api: RecordCalvingEditorFooterApi) => ReactNode
  /** Return the new Calving timeline observation id (used to attach AI after analyze). */
  onSave: (data: CalvingRecord) => string | void | Promise<string | void>
  onPersistCalvingAi?: (payload: PersistCalvingAiPayload) => void | Promise<void>
  onFinalizeCalvingObservation: RecordCalvingModalProps["onFinalizeCalvingObservation"]
  onUpdateCalvingRecord?: (record: CalvingRecord, observationId: string) => void
  onDiscardCalving?: RecordCalvingModalProps["onDiscardCalving"]
  /** Called after AI suggestions are dismissed (modal close / sheet navigation). */
  onFlowFinished?: () => void
  /** Fires after `onFlowFinished` when user completes the result step (e.g. dismiss home quick-log). */
  onCalvingDone?: () => void
}

/** Shared form fields + state; compose with modal or mobile sheet chrome. */
export function RecordCalvingEditor(props: RecordCalvingEditorProps) {
  const {
    cattle,
    pastureName,
    header,
    contentClassName,
    footer,
    onSave,
    onPersistCalvingAi,
    onFinalizeCalvingObservation,
    onUpdateCalvingRecord,
    onDiscardCalving,
    onFlowFinished,
    onCalvingDone,
  } = props
  const [phase, setPhase] = useState<CalvingFlowPhase>("input")
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [committedObservationId, setCommittedObservationId] = useState<string | null>(null)
  const [confirmedCalvingRisk, setConfirmedCalvingRisk] = useState<RiskLevel>("good")
  const cattlePreCommitRef = useRef<Partial<Cattle> | null>(null)
  const cattlePostAiRef = useRef<Partial<Cattle> | null>(null)
  const lastRecordRef = useRef<CalvingRecord | null>(null)

  const [dateTimeLocal, setDateTimeLocal] = useState(() => toDatetimeLocalValue(new Date()))
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("normal")
  const [calfStatus, setCalfStatus] = useState<CalfStatus>("live")
  const [complications, setComplications] = useState<Set<CalvingComplication>>(
    () => new Set(["none"])
  )
  const [notes, setNotes] = useState("")
  const [loggedBy, setLoggedBy] = useState("")

  function toggleComplication(id: CalvingComplication) {
    setComplications((prev) => {
      const next = new Set(prev)
      if (id === "none") {
        return new Set(["none"])
      }
      next.delete("none")
      if (next.has(id)) next.delete(id)
      else next.add(id)
      if (next.size === 0) return new Set(["none"])
      return next
    })
  }

  const complicationsList = [...complications].filter((c) => c !== "none")
  const canSave = loggedBy.trim().length > 0

  useEffect(() => {
    setPhase("input")
    setAiResult(null)
    setCommittedObservationId(null)
    cattlePreCommitRef.current = null
    cattlePostAiRef.current = null
    setDateTimeLocal(toDatetimeLocalValue(new Date()))
    setDeliveryType("normal")
    setCalfStatus("live")
    setComplications(new Set(["none"]))
    setNotes("")
    setLoggedBy("")
    setConfirmedCalvingRisk("good")
  }, [cattle.id])

  useEffect(() => {
    if (phase !== "result") return
    setConfirmedCalvingRisk(aiResult?.riskLevel ?? "good")
  }, [phase, aiResult?.riskLevel])

  async function save() {
    if (!canSave) return
    if (phase === "result") return

    const parsed = new Date(dateTimeLocal)
    const finalDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed

    const record: CalvingRecord = {
      cattleId: cattle.id,
      date: finalDate.toISOString(),
      deliveryType,
      calfStatus,
      complications: complicationsList.length > 0 ? complicationsList : [],
      notes: notes.trim() || undefined,
      loggedBy: loggedBy.trim(),
      forceComplicationsOutcome: cattle.calvingStatus === "complications",
    }

    lastRecordRef.current = record

    const isUpdate = Boolean(committedObservationId)
    if (!isUpdate) {
      cattlePreCommitRef.current = pickCalvingRevertPatch(cattle)
    }

    setPhase("saving")
    let observationId: string | undefined = committedObservationId ?? undefined
    try {
      if (isUpdate && onUpdateCalvingRecord && committedObservationId) {
        onUpdateCalvingRecord(record, committedObservationId)
      } else {
        const idOrVoid = await onSave(record)
        observationId = typeof idOrVoid === "string" ? idOrVoid : undefined
        if (observationId) setCommittedObservationId(observationId)
      }
    } catch {
      setPhase("input")
      return
    }

    setPhase("analyzing")
    try {
      const ai = await analyzeCalvingRecord(cattle, pastureName, record)
      setAiResult(ai)
      if (observationId && onPersistCalvingAi) {
        await Promise.resolve(
          onPersistCalvingAi({ cattleId: record.cattleId, observationId, aiResult: ai })
        )
      }
      cattlePostAiRef.current = calvingRestorePatch(record, ai)
      setPhase("result")
    } catch {
      // Still committed — allow user to exit without blocking on AI.
      setAiResult(null)
      cattlePostAiRef.current = calvingRestorePatch(record, null)
      setPhase("result")
    }
  }

  async function finalize() {
    if (!committedObservationId || !lastRecordRef.current) return
    await Promise.resolve(
      onFinalizeCalvingObservation({
        cattleId: cattle.id,
        observationId: committedObservationId,
        record: lastRecordRef.current,
        confirmedRisk: confirmedCalvingRisk,
      })
    )
    onFlowFinished?.()
    onCalvingDone?.()
  }

  function editFromResult() {
    setPhase("input")
  }

  function discardFromResult() {
    if (!committedObservationId || !onDiscardCalving || !cattlePreCommitRef.current) return
    const parsed = new Date(dateTimeLocal)
    const finalDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed
    const record: CalvingRecord = {
      cattleId: cattle.id,
      date: finalDate.toISOString(),
      deliveryType,
      calfStatus,
      complications: complicationsList.length > 0 ? complicationsList : [],
      notes: notes.trim() || undefined,
      loggedBy: loggedBy.trim(),
      forceComplicationsOutcome: cattle.calvingStatus === "complications",
    }
    const realComps = record.complications.filter((c) => c !== "none")
    const obsNotes = buildCalvingObservationNotes({
      ...record,
      complications: realComps.length > 0 ? realComps : [],
    })
    const observation: ObservationEntry = {
      id: committedObservationId,
      date: formatObservationDate(finalDate),
      category: "Calving",
      notes: obsNotes,
      loggedBy: loggedBy.trim(),
      aiResult: aiResult ?? undefined,
      observationDomain: "health",
    }
    onDiscardCalving({
      cattleId: cattle.id,
      observationId: committedObservationId,
      observation,
      cattleRevert: cattlePreCommitRef.current,
      cattleRestore: cattlePostAiRef.current ?? calvingRestorePatch(record, aiResult),
    })
    setCommittedObservationId(null)
    cattlePreCommitRef.current = null
    cattlePostAiRef.current = null
    onFlowFinished?.()
  }

  const fieldsLocked = phase !== "input"

  const { scrollRef, isScrolled } = useScrollShadow()

  return (
    <>
      <div
        className="scroll-shadow-header shrink-0 bg-background"
        data-scrolled={isScrolled ? "true" : undefined}
      >
        {header}
      </div>
      <div ref={scrollRef} className={cn(contentClassName)}>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <FormLabel variant="default">Date &amp; time</FormLabel>
            <Input
              type="datetime-local"
              value={dateTimeLocal}
              onChange={(e) => setDateTimeLocal(e.target.value)}
              disabled={fieldsLocked}
            />
          </label>

          <div className="flex flex-col gap-2">
            <FormLabel variant="default">Delivery type</FormLabel>
            <div className="flex flex-wrap gap-2">
              {DELIVERY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDeliveryType(opt.id)}
                  disabled={fieldsLocked}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                    deliveryType === opt.id
                      ? "border-action bg-action text-action-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted/60"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FormLabel variant="default">Calf status</FormLabel>
            <div className="flex flex-wrap gap-2">
              {CALF_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCalfStatus(opt.id)}
                  disabled={fieldsLocked}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                    calfStatus === opt.id
                      ? "border-action bg-action text-action-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted/60"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <FormLabel variant="default">Complications (multi)</FormLabel>
            <div className="flex flex-wrap gap-2">
              {COMPLICATION_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleComplication(opt.id)}
                  disabled={fieldsLocked}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                    complications.has(opt.id)
                      ? "border-action bg-action text-action-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted/60"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {phase !== "result" ? (
            <>
              <label className="flex flex-col gap-1.5">
                <FormLabel variant="default">Notes (optional)</FormLabel>
                <Textarea
                  rows={3}
                  placeholder="Any additional details..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={fieldsLocked}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <FormLabel variant="default">Logged by</FormLabel>
                <Input
                  placeholder="Your name"
                  value={loggedBy}
                  onChange={(e) => setLoggedBy(e.target.value)}
                  disabled={fieldsLocked}
                />
              </label>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <LogReviewFilledField label="Logged by">{loggedBy.trim() || "—"}</LogReviewFilledField>
              {notes.trim() ? <LogReviewFilledField label="Notes">{notes.trim()}</LogReviewFilledField> : null}
            </div>
          )}
        </div>

        {phase === "analyzing" ? <CalvingAnalyzingSkeleton /> : null}
        {phase === "result" && aiResult ? (
          <SmartSuggestionsPanel
            mode="modal"
            labelGlyphStyle="section"
            suggestions={aiResult.recommendations}
            contextNote={aiResult.patternNote}
            className="mt-3"
          />
        ) : null}
        {phase === "result" ? (
          <div className="mt-4 flex flex-col gap-2">
            <div>
              <p className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground opacity-70">
                Confirm status
              </p>
              <p className="mt-0.5 text-[13px] text-foreground">
                <AiAnnotationMark /> AI assessed:{" "}
                <span className="font-medium text-foreground">
                  {calvingOutcomeConfirmationLabel(aiResult?.riskLevel ?? "good")}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CALVING_CONFIRM_STATUS_OPTIONS.map((opt) => {
                const isSelected = confirmedCalvingRisk === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setConfirmedCalvingRisk(opt.id)}
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                      isSelected ? opt.active : "border-border bg-background text-foreground hover:bg-muted/60",
                    )}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
      {/* Render-prop footer: discard/finalize read refs only in event handlers, not during this call. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {footer({
        phase,
        canSave,
        save,
        finalize,
        edit: editFromResult,
        discard: discardFromResult,
      })}
    </>
  )
}

function RecordCalvingModalInner({
  cattle,
  pastureName,
  onClose,
  onSave,
  onPersistCalvingAi,
  onFinalizeCalvingObservation,
  onUpdateCalvingRecord,
  onDiscardCalving,
  onCalvingDone,
}: {
  cattle: Cattle
  pastureName: string
  onClose: () => void
  onSave: RecordCalvingModalProps["onSave"]
  onPersistCalvingAi?: RecordCalvingModalProps["onPersistCalvingAi"]
  onFinalizeCalvingObservation: RecordCalvingModalProps["onFinalizeCalvingObservation"]
  onUpdateCalvingRecord?: RecordCalvingModalProps["onUpdateCalvingRecord"]
  onDiscardCalving?: RecordCalvingModalProps["onDiscardCalving"]
  onCalvingDone?: RecordCalvingModalProps["onCalvingDone"]
}) {
  const dueLine =
    cattle.dueDate && cattle.calvingStatus !== "calved" && cattle.calvingStatus !== "complications"
      ? `Due ${formatDueDateLabel(cattle.dueDate)}`
      : null

  return (
    <>
      <Dialog.Title className="sr-only">Record calving — {formatCattleTagDisplay(cattle.tagNumber)}</Dialog.Title>
      <RecordCalvingEditor
        key={cattle.id}
        cattle={cattle}
        pastureName={pastureName}
        header={
          <div className="flex items-center justify-between px-6 py-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">
                Record calving — {formatCattleTagDisplay(cattle.tagNumber)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {cattle.breed} · {cattle.age} yrs · {pastureName}
                {dueLine ? ` · ${dueLine}` : ""}
              </p>
            </div>
            <Dialog.Close
              type="button"
              className={cn(buttonVariants({ variant: "icon", size: "iconGhost" }), "shrink-0")}
              aria-label="Close"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
        }
        contentClassName="max-h-[min(70dvh,620px)] overflow-y-auto px-6 py-5"
        footer={({ phase, canSave, save, finalize, edit, discard }) => (
          <div className="border-t border-border px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex shrink-0 items-center">
                {phase === "result" ? (
                  <Button type="button" variant="ghost" size="lg" className="shrink-0" onClick={discard}>
                    Discard
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {phase !== "result" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 min-h-9 px-4 py-0"
                    onClick={onClose}
                    disabled={phase === "saving" || phase === "analyzing"}
                  >
                    Cancel
                  </Button>
                ) : null}

                {phase === "result" ? (
                  <Button type="button" variant="secondary" size="lg" className="shrink-0" onClick={edit}>
                    Edit
                  </Button>
                ) : null}

                {phase !== "result" ? (
                  <Button
                    type="button"
                    variant="default"
                    className="h-9 min-h-9 gap-2 px-4 py-0 disabled:opacity-60"
                    disabled={!canSave || phase === "saving" || phase === "analyzing"}
                    onClick={() => void save()}
                  >
                    <Sparkle className="size-5 text-action-foreground" strokeWidth={1.5} aria-hidden />
                    {phase === "saving" ? "Saving…" : phase === "analyzing" ? "Analyzing…" : "Save & analyze"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="shrink-0"
                    onClick={() => void finalize()}
                  >
                    Finalize
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-2 text-right text-[13px] text-muted-foreground">
              AI will review calving details and suggest follow-up steps after saving.
            </p>
          </div>
        )}
        onSave={onSave}
        onPersistCalvingAi={onPersistCalvingAi}
        onFinalizeCalvingObservation={onFinalizeCalvingObservation}
        onUpdateCalvingRecord={onUpdateCalvingRecord}
        onDiscardCalving={onDiscardCalving}
        onFlowFinished={onClose}
        onCalvingDone={onCalvingDone}
      />
    </>
  )
}

export function RecordCalvingModal({
  open,
  cattle,
  pastureName,
  onClose,
  onSave,
  onPersistCalvingAi,
  onFinalizeCalvingObservation,
  onUpdateCalvingRecord,
  onDiscardCalving,
  onCalvingDone,
}: RecordCalvingModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[140] bg-black/55 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <Dialog.Popup className="flex w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl outline-none">
            {open && cattle ? (
              <RecordCalvingModalInner
                cattle={cattle}
                pastureName={pastureName}
                onClose={onClose}
                onSave={onSave}
                onPersistCalvingAi={onPersistCalvingAi}
                onFinalizeCalvingObservation={onFinalizeCalvingObservation}
                onUpdateCalvingRecord={onUpdateCalvingRecord}
                onDiscardCalving={onDiscardCalving}
                onCalvingDone={onCalvingDone}
              />
            ) : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
