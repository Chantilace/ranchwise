import { ChevronLeft, Sparkles, X } from "lucide-react"
import { useState } from "react"
import { Drawer } from "vaul"
import type { HorseTableRow } from "@/components/HeguyRanchCoPilot"
import { horseRowKey } from "@/components/HeguyRanchCoPilot"
import { ObservationFormFields } from "@/components/ObservationFormFields"
import { SmartSuggestionsPanel } from "@/components/SmartSuggestionsPanel"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { useRanchData } from "@/contexts/RanchDataContext"
import { formatObservationDate } from "@/lib/initialObservations"
import { LOG_OBSERVATION_IDENTITY_ROW, LOG_OBSERVATION_IDENTITY_ROW_STACK } from "@/lib/logObservationLayout"
import { mockAnalyze } from "@/lib/observationAnalyze"
import { cn } from "@/lib/utils"
import type { AIResult, Category, RiskLevel } from "@/types/observation"

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

function horseRowStatusToBadge(status: HorseTableRow["healthStatus"]): "good" | "monitor" | "call-vet" {
  if (status === "flag") return "call-vet"
  if (status === "monitor") return "monitor"
  return "good"
}

export function HorseLogSheet({ horse, onClose }: HorseLogSheetProps) {
  const { appendObservation } = useRanchData()
  const [view, setView] = useState<HorseLogView>("input")
  const [category, setCategory] = useState<Category>("Health")
  const [notes, setNotes] = useState("")
  const [loggedBy, setLoggedBy] = useState("")
  const [aiResult, setAiResult] = useState<AIResult | null>(null)
  const [confirmedRiskLevel, setConfirmedRiskLevel] = useState<RiskLevel>("good")

  const canAnalyze = notes.trim().length > 0 && loggedBy.trim().length > 0

  async function handleAnalyze() {
    if (!canAnalyze) return
    setView("analyzing")
    try {
      const result = await mockAnalyze(category, notes, horse.name)
      setAiResult(result)
      setConfirmedRiskLevel(result.riskLevel)
      setView("result")
    } catch {
      setView("input")
    }
  }

  function handleSave() {
    if (!aiResult) return
    const finalAiResult: AIResult = {
      ...aiResult,
      riskLevel: confirmedRiskLevel,
      riskLabel:
        confirmedRiskLevel === "call-vet"
          ? "Flag"
          : confirmedRiskLevel === "monitor"
            ? "Monitor"
            : "Good",
    }
    appendObservation(horseRowKey(horse), {
      id: crypto.randomUUID(),
      date: formatObservationDate(new Date()),
      category,
      notes,
      loggedBy,
      aiResult: finalAiResult,
    })
    onClose()
  }

  function goBackToInput() {
    setView("input")
  }

  return (
    <Drawer.Root
      open
      dismissible={view !== "analyzing"}
      onOpenChange={(open) => !open && view !== "analyzing" && onClose()}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px]" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[80vh] flex-col rounded-t-2xl bg-background outline-none">
          <Drawer.Title className="sr-only">Log observation — {horse.name}</Drawer.Title>
          <Drawer.Handle className="mx-auto mt-2.5 mb-2 block h-1 w-8 shrink-0 rounded-full bg-border" />

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {view === "input" ? (
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
                <div className={LOG_OBSERVATION_IDENTITY_ROW}>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {horse.photoUrl ? (
                        <img src={horse.photoUrl} alt="" className="size-full object-cover object-center" />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground" aria-hidden>
                          {initialsFromName(horse.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium text-foreground">{horse.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
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
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  <ObservationFormFields
                    variant="pills"
                    animalName={horse.name}
                    category={category}
                    onCategoryChange={setCategory}
                    notes={notes}
                    onNotesChange={setNotes}
                    loggedBy={loggedBy}
                    onLoggedByChange={setLoggedBy}
                  />
                </div>
                <div className="mt-auto flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
                  <Button type="button" variant="tertiary" className="min-h-0 shrink-0" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="min-h-0 shrink-0 gap-2"
                    disabled={!canAnalyze}
                    onClick={() => void handleAnalyze()}
                  >
                    <Sparkles className="size-5 text-[var(--ai-mark)]" aria-hidden />
                    Save observation
                  </Button>
                </div>
              </>
            ) : null}

            {view === "analyzing" ? (
              <>
                <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4 pb-3 pt-3">
                  <span className="min-w-0" aria-hidden />
                  <p className="text-center text-base font-medium text-foreground">Log observation</p>
                  <span className="min-w-0" aria-hidden />
                </div>
                <div className={LOG_OBSERVATION_IDENTITY_ROW_STACK}>
                  <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                    {horse.photoUrl ? (
                      <img src={horse.photoUrl} alt="" className="size-full object-cover object-center" />
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground" aria-hidden>
                        {initialsFromName(horse.name)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-medium text-foreground">{horse.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Analyzing observation…</p>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  <div className="flex flex-col gap-3">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="mt-2 h-16 animate-pulse rounded-lg bg-muted" />
                    <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-muted" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="mt-auto flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
                  <Button type="button" variant="tertiary" className="min-h-0 shrink-0" disabled>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="min-h-0 shrink-0 gap-2 disabled:opacity-60"
                    disabled
                    aria-busy
                  >
                    <Sparkles className="size-5 text-[var(--ai-mark)]" aria-hidden />
                    Analyzing…
                  </Button>
                </div>
              </>
            ) : null}

            {view === "result" && aiResult ? (
              <>
                <div className="shrink-0 border-b border-border px-4 pb-3 pt-3">
                  <div className="relative flex min-h-[2.75rem] items-center justify-center">
                    <button
                      type="button"
                      onClick={goBackToInput}
                      className="absolute top-1/2 left-0 flex -translate-y-1/2 items-center gap-1 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <ChevronLeft className="size-3 shrink-0" aria-hidden />
                      Back
                    </button>
                    <p className="px-14 text-center text-base font-medium text-foreground">Log observation</p>
                  </div>
                </div>
                <div className={LOG_OBSERVATION_IDENTITY_ROW}>
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {horse.photoUrl ? (
                        <img src={horse.photoUrl} alt="" className="size-full object-cover object-center" />
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground" aria-hidden>
                          {initialsFromName(horse.name)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-medium text-foreground">{horse.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
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
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                  <SmartSuggestionsPanel
                    mode="modal"
                    suggestions={aiResult.recommendations}
                    contextNote={aiResult.patternNote}
                    className="mb-4"
                  />
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground opacity-70">
                        Confirm status
                      </p>
                      <p className="mt-0.5 text-xs text-ai-accent-text">
                        ✦ AI assessed:{" "}
                        {aiResult.riskLevel === "call-vet"
                          ? "Flag"
                          : aiResult.riskLevel === "monitor"
                            ? "Monitor"
                            : "Good"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {(
                        [
                          {
                            id: "good" as const,
                            label: "Good",
                            active:
                              "bg-status-good-bg border-status-good-bg text-status-good-text",
                          },
                          {
                            id: "monitor" as const,
                            label: "Monitor",
                            active:
                              "bg-status-monitor-bg border-status-monitor-bg text-status-monitor-text",
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
                  </div>
                  <div className="mt-5 rounded-lg border border-border p-3">
                    <p className="mb-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                      Your observation
                    </p>
                    <p className="text-xs leading-relaxed text-foreground">{notes}</p>
                  </div>
                </div>
                <div className="mt-auto flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-4 py-3">
                  <Button type="button" variant="secondary" className="min-h-0 shrink-0" onClick={goBackToInput}>
                    Edit
                  </Button>
                  <Button type="button" variant="primary" className="min-h-0 shrink-0" onClick={handleSave}>
                    Done
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
