import { Dialog } from "@base-ui/react/dialog"
import { X, Sparkles } from "lucide-react"
import { useState, type ReactNode } from "react"
import { SmartSuggestionsPanel } from "@/components/SmartSuggestionsPanel"
import { ObservationFormFields } from "@/components/ObservationFormFields"
import { StatusBadge } from "@/components/StatusBadge"
import { Button, buttonVariants } from "@/components/ui/button"
import { LOG_OBSERVATION_IDENTITY_ROW } from "@/lib/logObservationLayout"
import { mockAnalyze } from "@/lib/observationAnalyze"
import type { AIResult, Category, ObservationEntry, RiskLevel } from "@/types/observation"
import { cn } from "@/lib/utils"

export interface LogObservationModalProps {
  open: boolean
  /** Display name or tag (e.g. horse name or `#4821`). */
  animalName?: string
  animalPhoto?: string
  /** @deprecated Use `animalName` */
  horseName?: string
  /** @deprecated Use `animalPhoto` */
  horsePhoto?: string
  statusBadge?: "Flag" | "Monitor" | "Good"
  /** Horse: behavior badge when not Good (matches home log sheet). */
  behaviorStatusBadge?: "Flag" | "Monitor" | "Good"
  /** One line under name — e.g. `Gelding · 4 yrs · Main Corral` or cattle breed · age · pasture. */
  animalSubtitle?: string
  /** Category options in the form (e.g. horse: Health + Behavior only). */
  categories?: Category[]
  /** When set, modal opens in edit mode for this observation. */
  editingEntry?: ObservationEntry
  onClose: () => void
  onSave: (
    data: { category: Category; notes: string; loggedBy: string; aiResult: AIResult },
    meta?: { stage: "commit" | "done" }
  ) => void | boolean | Promise<void | boolean>
}

type Phase = "input" | "saving" | "result"

function statusFromModalBadge(badge?: "Flag" | "Monitor" | "Good") {
  if (badge === "Flag") return "call-vet" as const
  if (badge === "Monitor") return "monitor" as const
  if (badge === "Good") return "good" as const
  return "good" as const
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function AnalyzingSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4" aria-busy aria-label="Analyzing observation">
      <div className="h-3 w-full max-w-[90%] animate-pulse rounded bg-muted" />
      <div className="h-3 w-full max-w-[75%] animate-pulse rounded bg-muted" />
      <div className="h-3 w-full max-w-[85%] animate-pulse rounded bg-muted" />
      <div className="h-3 w-full max-w-[55%] animate-pulse rounded bg-muted" />
    </div>
  )
}

export type LogObservationFormFooterApi = {
  phase: Phase
  canSave: boolean
  /** Same as `canSave` — AI analyze / save CTA. */
  canAnalyze: boolean
  isSaving: boolean
  save: () => void | Promise<void>
  /** Same as `save` — persist then run analysis. */
  handleAnalyze: () => void | Promise<void>
  done: () => void | Promise<void>
  edit: () => void
  /** Close / back without persisting (modal close or sheet → detail). */
  dismiss: () => void
}

export type LogObservationFormProps = {
  animalName: string
  header: ReactNode
  /** Middle section (fields + analyzing + result block) */
  contentClassName?: string
  categories?: Category[]
  footer: (api: LogObservationFormFooterApi) => ReactNode
  onSave: LogObservationModalProps["onSave"]
  onDismiss: () => void
  /** Prefill / edit an existing observation (sheet or modal). */
  initialObservation?: ObservationEntry | null
}

/** Shared observation flow; use inside modal or mobile sheet. */
export function LogObservationForm({
  animalName,
  header,
  contentClassName,
  categories,
  footer,
  onSave,
  onDismiss,
  initialObservation = null,
}: LogObservationFormProps) {
  const [phase, setPhase] = useState<Phase>("input")
  const [category, setCategory] = useState<Category>(
    () => initialObservation?.category ?? "Health"
  )
  const [notes, setNotes] = useState(() => initialObservation?.notes ?? "")
  const [loggedBy, setLoggedBy] = useState(() => initialObservation?.loggedBy ?? "")
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(
    () => initialObservation?.aiResult?.riskLevel ?? "good"
  )
  const [confirmedRiskLevel, setConfirmedRiskLevel] = useState<RiskLevel>(
    () => initialObservation?.aiResult?.riskLevel ?? "good"
  )
  const [aiResult, setAiResult] = useState<AIResult | null>(
    () => initialObservation?.aiResult ?? null
  )
  const [committed, setCommitted] = useState(false)

  const canSave = notes.trim().length > 0 && loggedBy.trim().length > 0

  function riskLabel(level: RiskLevel) {
    if (level === "call-vet") return "Flag"
    if (level === "monitor") return "Monitor"
    return "Good"
  }

  function edit() {
    setPhase("input")
    setCommitted(false)
  }

  async function save() {
    if (!canSave) return

    // Step 1: persist the observation (without closing the modal/sheet), then generate AI.
    setPhase("saving")
    try {
      const provisional: AIResult =
        aiResult ??
        ({
          riskLevel,
          riskLabel: riskLabel(riskLevel),
          recommendations: [],
          patternNote: null,
        } satisfies AIResult)

      await onSave({ category, notes, loggedBy, aiResult: provisional }, { stage: "commit" })
      setCommitted(true)

      const result = await mockAnalyze(category, notes, animalName)
      const merged: AIResult = {
        ...result,
      }
      setAiResult(merged)
      setRiskLevel(merged.riskLevel)
      setConfirmedRiskLevel(merged.riskLevel)
      setPhase("result")
    } catch {
      setCommitted(false)
      setPhase("input")
    }
  }

  async function done() {
    if (!aiResult) return
    const finalAiResult: AIResult = {
      ...aiResult,
      riskLevel: confirmedRiskLevel,
      riskLabel: riskLabel(confirmedRiskLevel),
    }
    const skipDismiss =
      (await onSave({ category, notes, loggedBy, aiResult: finalAiResult }, { stage: "done" })) === true
    if (!skipDismiss) onDismiss()
  }

  const fieldsLocked = phase === "saving" || phase === "result" || committed
  const textLocked = phase === "result" || committed
  const showResultBlock = phase === "result" && aiResult

  const footerApi: LogObservationFormFooterApi = {
    phase,
    canSave,
    canAnalyze: canSave,
    isSaving: phase === "saving",
    save,
    handleAnalyze: save,
    done,
    edit,
    dismiss: onDismiss,
  }

  return (
    <>
      {header}
      <div className={cn("flex flex-col gap-4", contentClassName)}>
        {(() => {
          const sectionTitle =
            phase === "result"
              ? initialObservation
                ? "Review changes"
                : "Observation logged"
              : phase === "saving"
                ? null
                : initialObservation
                  ? "Edit observation"
                  : null
          if (!sectionTitle) return null
          return (
            <p
              className={cn(
                "pt-4 text-sm",
                phase === "result" ? "text-muted-foreground" : "font-semibold text-foreground"
              )}
            >
              {sectionTitle}
            </p>
          )
        })()}

        <div className="flex flex-col gap-4">
          <ObservationFormFields
            variant="select"
            animalName={animalName}
            category={category}
            onCategoryChange={setCategory}
            notes={notes}
            onNotesChange={setNotes}
            loggedBy={loggedBy}
            onLoggedByChange={setLoggedBy}
            disabled={fieldsLocked}
            readOnlyText={textLocked}
            categories={categories}
            hideNotes={Boolean(showResultBlock)}
          />
        </div>

        {phase === "saving" ? <AnalyzingSkeleton /> : null}
        {showResultBlock && aiResult ? (
          <>
            <SmartSuggestionsPanel
              mode="modal"
              suggestions={aiResult.recommendations}
              contextNote={aiResult.patternNote}
              className="mt-3"
            />
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground opacity-70">
                  Confirm status
                </p>
                <p className="mt-0.5 text-xs">
                  <span className="text-ai-accent">✦ AI assessed:</span>{" "}
                  <span className="text-foreground">{riskLabel(aiResult.riskLevel)}</span>
                </p>
              </div>
              <div className="flex gap-2">
                {(
                  [
                    {
                      id: "good" as const,
                      label: "Good",
                      active: "bg-status-good-bg border-status-good-bg text-status-good-text",
                    },
                    {
                      id: "monitor" as const,
                      label: "Monitor",
                      active: "bg-status-monitor-bg border-status-monitor-bg text-status-monitor-text",
                    },
                    {
                      id: "call-vet" as const,
                      label: "Flag",
                      active: "bg-status-flag-bg border-status-flag-bg text-status-flag-text",
                    },
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
                        isSelected
                          ? opt.active
                          : "border-border bg-background text-foreground hover:bg-muted/60"
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-5 rounded-lg border border-border p-3">
                <p className="mb-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  Your observation
                </p>
                <p className="text-sm leading-relaxed text-foreground">{notes}</p>
              </div>
            </div>
          </>
        ) : null}
      </div>
      {footer(footerApi)}
    </>
  )
}

function LogObservationModalInner({
  animalName,
  animalPhoto,
  animalSubtitle,
  statusBadge,
  behaviorStatusBadge,
  categories,
  editingEntry,
  onClose,
  onSave,
}: {
  animalName: string
  animalPhoto?: string
  animalSubtitle?: string
  statusBadge?: "Flag" | "Monitor" | "Good"
  behaviorStatusBadge?: "Flag" | "Monitor" | "Good"
  categories?: Category[]
  editingEntry?: ObservationEntry
  onClose: () => void
  onSave: LogObservationModalProps["onSave"]
}) {
  const isEdit = !!editingEntry
  const avatarRadius = categories != null ? "rounded-lg" : "rounded-full"
  return (
    <>
      <Dialog.Title className="sr-only">
        {isEdit ? "Edit observation" : "Log observation"} — {animalName}
      </Dialog.Title>
      <LogObservationForm
        animalName={animalName}
        categories={categories}
        initialObservation={editingEntry ?? null}
        onDismiss={onClose}
        header={
          <>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 pb-3 pt-4 md:px-6 md:pt-5 md:pb-3">
              <span className="min-w-0" aria-hidden />
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
            <div className={LOG_OBSERVATION_IDENTITY_ROW}>
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <div
                  className={cn(
                    "relative flex size-12 shrink-0 items-center justify-center overflow-hidden bg-muted",
                    avatarRadius
                  )}
                >
                  {animalPhoto ? (
                    <img src={animalPhoto} alt="" className="size-full object-cover object-center" />
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground" aria-hidden>
                      {initials(animalName)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-medium text-foreground">{animalName}</span>
                  </div>
                  {animalSubtitle ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{animalSubtitle}</p>
                  ) : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-end justify-end gap-1.5">
                {statusBadge ? <StatusBadge status={statusFromModalBadge(statusBadge)} /> : null}
                {behaviorStatusBadge ? (
                  <StatusBadge status={statusFromModalBadge(behaviorStatusBadge)} />
                ) : null}
              </div>
            </div>
          </>
        }
        contentClassName="max-h-[min(60dvh,520px)] overflow-y-auto px-4 pb-4 pt-0 md:px-6 md:pb-5 md:pt-0"
        footer={({ phase, canAnalyze, isSaving, handleAnalyze, done, edit, dismiss }) => (
          <div className="border-t border-border px-4 py-4 md:px-6">
            <div className="flex justify-end gap-2">
              {phase === "input" || phase === "saving" ? (
                <Button
                  type="button"
                  variant="tertiary"
                  className="h-9 min-h-9 px-4 py-0"
                  onClick={dismiss}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              ) : null}

              {phase === "result" ? (
                <Button type="button" variant="secondary" onClick={edit}>
                  Edit
                </Button>
              ) : null}

              {phase === "input" || phase === "saving" ? (
                <Button
                  type="button"
                  variant="default"
                  className="min-h-0 shrink-0 gap-2 disabled:opacity-60"
                  disabled={!canAnalyze || isSaving}
                  onClick={() => void handleAnalyze()}
                >
                  <Sparkles className="size-5 text-[var(--ai-mark)]" aria-hidden />
                  {isSaving ? "Analyzing…" : "Save observation"}
                </Button>
              ) : null}

              {phase === "result" ? (
                <Button type="button" variant="primary" size="lg" className="px-6" onClick={() => void done()}>
                  Done
                </Button>
              ) : null}
            </div>
            {phase === "input" || phase === "saving" ? (
              <p className="mt-2 text-right text-xs text-muted-foreground">
                AI will analyze and suggest next steps after saving
              </p>
            ) : null}
          </div>
        )}
        onSave={onSave}
      />
    </>
  )
}

export function LogObservationModal({
  open,
  animalName: animalNameProp,
  animalPhoto: animalPhotoProp,
  horseName,
  horsePhoto,
  animalSubtitle,
  statusBadge,
  behaviorStatusBadge,
  categories,
  editingEntry,
  onClose,
  onSave,
}: LogObservationModalProps) {
  const animalName = animalNameProp || horseName || ""
  const animalPhoto = animalPhotoProp ?? horsePhoto

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="flex w-full min-w-0 max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-xl outline-none">
            {open ? (
              <LogObservationModalInner
                key={editingEntry?.id ?? "new"}
                animalName={animalName}
                animalPhoto={animalPhoto}
                animalSubtitle={animalSubtitle}
                statusBadge={statusBadge}
                behaviorStatusBadge={behaviorStatusBadge}
                categories={categories}
                editingEntry={editingEntry}
                onClose={onClose}
                onSave={onSave}
              />
            ) : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
