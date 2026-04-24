import { Dialog } from "@base-ui/react/dialog"
import { Sparkles, X } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { SmartSuggestionsPanel } from "@/components/SmartSuggestionsPanel"
import { analyzeCalvingRecord } from "@/lib/calvingAnalyze"
import { formatDueDateLabel } from "@/lib/cattleUi"
import type {
  CalfStatus,
  CalvingComplication,
  CalvingRecord,
  Cattle,
  DeliveryType,
} from "@/types/cattle"
import type { AIResult } from "@/types/observation"
import { cn } from "@/lib/utils"

export type PersistCalvingAiPayload = {
  cattleId: string
  observationId: string
  aiResult: AIResult
}

export interface RecordCalvingModalProps {
  open: boolean
  cattle: Cattle | null
  pastureName: string
  onClose: () => void
  /** Return the new Calving timeline observation id (used to attach AI after analyze). */
  onSave: (data: CalvingRecord) => string | void | Promise<string | void>
  onPersistCalvingAi?: (payload: PersistCalvingAiPayload) => void | Promise<void>
  /** Fires after user taps Done on the calving result step (e.g. close home quick-log sheet). */
  onCalvingDone?: () => void
}

const labelClass = "text-xs font-medium tracking-wide text-muted-foreground uppercase"

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
  complete: () => void
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
    onFlowFinished,
    onCalvingDone,
  } = props
  const [phase, setPhase] = useState<CalvingFlowPhase>("input")
  const [aiResult, setAiResult] = useState<AIResult | null>(null)

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
    setDateTimeLocal(toDatetimeLocalValue(new Date()))
    setDeliveryType("normal")
    setCalfStatus("live")
    setComplications(new Set(["none"]))
    setNotes("")
    setLoggedBy("")
  }, [cattle.id])

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

    setPhase("saving")
    let observationId: string | undefined
    try {
      const idOrVoid = await onSave(record)
      observationId = typeof idOrVoid === "string" ? idOrVoid : undefined
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
      setPhase("result")
    } catch {
      // Still committed — allow user to exit without blocking on AI.
      setAiResult(null)
      setPhase("result")
    }
  }

  function complete() {
    onFlowFinished?.()
    onCalvingDone?.()
  }

  const fieldsLocked = phase !== "input"

  return (
    <>
      {header}
      <div className={cn(contentClassName)}>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Date &amp; time</span>
            <Input
              type="datetime-local"
              value={dateTimeLocal}
              onChange={(e) => setDateTimeLocal(e.target.value)}
              className="rounded-lg"
              disabled={fieldsLocked}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className={labelClass}>Delivery type</span>
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
            <span className={labelClass}>Calf status</span>
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
            <span className={labelClass}>Complications (multi)</span>
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

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Notes (optional)</span>
            <Textarea
              rows={3}
              placeholder="Any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20 rounded-lg border-border"
              disabled={fieldsLocked}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={labelClass}>Logged by</span>
            <Input
              placeholder="Your name"
              value={loggedBy}
              onChange={(e) => setLoggedBy(e.target.value)}
              className="rounded-lg"
              disabled={fieldsLocked}
            />
          </label>
        </div>

        {phase === "analyzing" ? <CalvingAnalyzingSkeleton /> : null}
        {phase === "result" && aiResult ? (
          <SmartSuggestionsPanel
            mode="modal"
            suggestions={aiResult.recommendations}
            contextNote={aiResult.patternNote}
            className="mt-3"
          />
        ) : null}
      </div>
      {footer({
        phase,
        canSave,
        save,
        complete,
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
  onCalvingDone,
}: {
  cattle: Cattle
  pastureName: string
  onClose: () => void
  onSave: RecordCalvingModalProps["onSave"]
  onPersistCalvingAi?: RecordCalvingModalProps["onPersistCalvingAi"]
  onCalvingDone?: RecordCalvingModalProps["onCalvingDone"]
}) {
  const dueLine =
    cattle.dueDate && cattle.calvingStatus !== "calved" && cattle.calvingStatus !== "complications"
      ? `Due ${formatDueDateLabel(cattle.dueDate)}`
      : null

  return (
    <>
      <Dialog.Title className="sr-only">Record calving — {cattle.tagNumber}</Dialog.Title>
      <RecordCalvingEditor
        key={cattle.id}
        cattle={cattle}
        pastureName={pastureName}
        header={
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">
                Record calving — {cattle.tagNumber}
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
        footer={({ phase, canSave, save, complete }) => (
          <div className="border-t border-border px-6 py-4">
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="tertiary"
                className="h-9 min-h-9 px-4 py-0"
                onClick={onClose}
                disabled={phase === "saving" || phase === "analyzing"}
              >
                {phase === "result" ? "Close" : "Cancel"}
              </Button>

              {phase !== "result" ? (
                <Button
                  type="button"
                  variant="default"
                  className="h-9 min-h-9 gap-2 px-4 py-0 disabled:opacity-60"
                  disabled={!canSave || phase === "saving" || phase === "analyzing"}
                  onClick={() => void save()}
                >
                  <Sparkles className="size-5 text-[var(--ai-mark)]" strokeWidth={1.5} aria-hidden />
                  {phase === "saving" ? "Saving…" : phase === "analyzing" ? "Analyzing…" : "Save calving record"}
                </Button>
              ) : (
                <Button type="button" variant="primary" onClick={complete}>
                  Done
                </Button>
              )}
            </div>
            <p className="mt-2 text-right text-xs text-muted-foreground">
              AI will review calving details and suggest follow-up steps after saving.
            </p>
          </div>
        )}
        onSave={onSave}
        onPersistCalvingAi={onPersistCalvingAi}
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
                onCalvingDone={onCalvingDone}
              />
            ) : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
