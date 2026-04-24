import { ChevronLeft, Sparkles, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Drawer } from "vaul"
import { LogObservationForm } from "@/components/LogObservationModal"
import { ObservationTimeline } from "@/components/ObservationTimeline"
import { StatusBadge } from "@/components/StatusBadge"
import { RecordCalvingEditor } from "@/components/RecordCalvingModal"
import { SheetBackCenterTitleHeader } from "@/components/SheetBackCenterTitleHeader"
import { CattleLoggingStatusSection } from "@/components/CattleLoggingStatusSection"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { LOG_OBSERVATION_IDENTITY_ROW } from "@/lib/logObservationLayout"
import { useRanchData } from "@/contexts/RanchDataContext"
import type { Cattle } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"
import { cn } from "@/lib/utils"

/** Parent bumps `nonce` when the roster opens the embedded log flow (add or edit). */
export type CattleSlideLogOpenRequest = {
  nonce: number
  initialObservation: ObservationEntry | null
}

export type CattleDetailPanelProps = {
  cattle: Cattle | null
  pastureName: string
  observations: ObservationEntry[]
  onClose: () => void
  slideLogOpen?: CattleSlideLogOpenRequest | null
  onSlideLogOpenConsumed?: () => void
  /** Bumped when the roster + opens the panel so we return to detail (same animal may be in log subview). */
  slideDetailFocusNonce?: number
}

type SheetView = "detail" | "record-calving" | "log-observation"

function cattleHealthToStatusBadge(health?: Cattle["healthStatus"]): "good" | "monitor" | "call-vet" {
  if (health === "Flag") return "call-vet"
  if (health === "Monitor") return "monitor"
  return "good"
}

function CattleDetailHeader({
  cattle,
  pastureName,
  onClose,
}: {
  cattle: Cattle
  pastureName: string
  onClose: () => void
}) {
  return (
    <>
      <div className="shrink-0 border-b border-border px-4 pb-3 pt-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <span className="min-w-0" aria-hidden />
          <p className="text-center text-base font-medium text-foreground">
            {cattle.displayName?.trim() || "Cattle detail"}
          </p>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="icon"
              size="iconGhost"
              className="shrink-0"
              aria-label="Close panel"
              onClick={onClose}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
      <div className={LOG_OBSERVATION_IDENTITY_ROW}>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {cattle.displayName?.trim() ? (
              <>
                <span className="text-base font-medium text-foreground">{cattle.displayName.trim()}</span>
                <span className="text-sm text-muted-foreground">{cattle.tagNumber}</span>
              </>
            ) : (
              <span className="text-base font-medium text-foreground">{cattle.tagNumber}</span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {cattle.breed} · {cattle.age} yrs · {pastureName}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-start justify-end gap-1.5">
          <StatusBadge status={cattleHealthToStatusBadge(cattle.healthStatus)} />
        </div>
      </div>
    </>
  )
}

function CattleDetailBody({
  cattle,
  pastureName,
  observations,
  onLogObservation,
  detailCTAMode = "modals",
  onSheetRecordCalving,
  onSheetLogObservation,
}: {
  cattle: Cattle
  pastureName: string
  observations: ObservationEntry[]
  /** Required when `detailCTAMode` is `modals` (desktop). */
  onLogObservation?: (cattleId: string) => void
  detailCTAMode?: "modals" | "sheet-subviews"
  onSheetRecordCalving?: () => void
  onSheetLogObservation?: () => void
}) {
  const { openRecordCalvingModal } = useRanchData()

  const openRecord = () => {
    if (detailCTAMode === "sheet-subviews") onSheetRecordCalving?.()
    else openRecordCalvingModal({ cattle, pastureName })
  }

  const openLog = () => {
    if (detailCTAMode === "sheet-subviews") onSheetLogObservation?.()
    else onLogObservation?.(cattle.id)
  }

  return (
    <>
      <CattleLoggingStatusSection
        cattle={cattle}
        pastureName={pastureName}
        onRecordCalving={openRecord}
        onLogObservation={openLog}
        usePanelPadding
      />

      <div className="mx-4 my-4 h-px bg-border" aria-hidden />

      <ObservationTimeline observations={observations} contentClassName="px-4" />
    </>
  )
}

/** Log / record flows embedded in mobile sheet and desktop side panel (not the global modal). */
function CattleDetailSubviewSwitcher({
  cattle,
  pastureName,
  observations,
  onClosePanel,
  rootClassName,
  slideLogOpen,
  onSlideLogOpenConsumed,
  slideDetailFocusNonce = 0,
}: {
  cattle: Cattle
  pastureName: string
  observations: ObservationEntry[]
  onClosePanel: () => void
  rootClassName?: string
  slideLogOpen?: CattleSlideLogOpenRequest | null
  onSlideLogOpenConsumed?: () => void
  slideDetailFocusNonce?: number
}) {
  const { commitCattleCalvingRecord, persistCalvingObservationAi, saveCattleObservationLog } = useRanchData()
  const [sheetView, setSheetView] = useState<SheetView>("detail")
  const [embeddedLogInitial, setEmbeddedLogInitial] = useState<ObservationEntry | null>(null)
  const [logFormNonce, setLogFormNonce] = useState(0)
  const embeddedLogCommitIdRef = useRef<string | null>(null)
  const cattleIdRef = useRef(cattle.id)
  const slideLogOpenRef = useRef(slideLogOpen)
  slideLogOpenRef.current = slideLogOpen

  useEffect(() => {
    if (cattleIdRef.current === cattle.id) return
    cattleIdRef.current = cattle.id
    if (slideLogOpenRef.current) {
      return
    }
    const t = window.setTimeout(() => {
      embeddedLogCommitIdRef.current = null
      setSheetView("detail")
      setEmbeddedLogInitial(null)
    }, 0)
    return () => window.clearTimeout(t)
  }, [cattle.id])

  useEffect(() => {
    if (!slideLogOpen) return
    embeddedLogCommitIdRef.current = null
    setEmbeddedLogInitial(slideLogOpen.initialObservation)
    setLogFormNonce((n) => n + 1)
    setSheetView("log-observation")
    queueMicrotask(() => onSlideLogOpenConsumed?.())
  }, [slideLogOpen, onSlideLogOpenConsumed])

  const prevDetailNonce = useRef<number | undefined>(undefined)
  useEffect(() => {
    const was = prevDetailNonce.current
    if (was === slideDetailFocusNonce) return
    prevDetailNonce.current = slideDetailFocusNonce
    if (was === undefined && slideDetailFocusNonce === 0) return
    embeddedLogCommitIdRef.current = null
    setSheetView("detail")
    setEmbeddedLogInitial(null)
  }, [slideDetailFocusNonce])

  const goDetail = useCallback(() => {
    embeddedLogCommitIdRef.current = null
    setEmbeddedLogInitial(null)
    setSheetView("detail")
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      if (sheetView !== "detail") {
        e.preventDefault()
        goDetail()
        return
      }
      onClosePanel()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [sheetView, goDetail, onClosePanel])

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", rootClassName)}>
      {sheetView === "detail" ? (
        <>
          <CattleDetailHeader cattle={cattle} pastureName={pastureName} onClose={onClosePanel} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CattleDetailBody
              cattle={cattle}
              pastureName={pastureName}
              observations={observations}
              detailCTAMode="sheet-subviews"
              onSheetRecordCalving={() => setSheetView("record-calving")}
              onSheetLogObservation={() => {
                setEmbeddedLogInitial(null)
                setLogFormNonce((n) => n + 1)
                setSheetView("log-observation")
              }}
            />
          </div>
        </>
      ) : null}

      {sheetView === "record-calving" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <RecordCalvingEditor
            key={cattle.id}
            cattle={cattle}
            pastureName={pastureName}
            header={
              <SheetBackCenterTitleHeader
                title={`Record calving — ${cattle.tagNumber}`}
                onBack={goDetail}
              />
            }
            contentClassName="min-h-0 flex-1 overflow-y-auto px-4 py-3"
            footer={({ phase, canSave, save, complete }) => (
              <div className="mt-auto shrink-0 border-t border-border px-4 py-3">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="lg"
                    className="min-h-0 shrink-0"
                    onClick={goDetail}
                    disabled={phase === "saving" || phase === "analyzing"}
                  >
                    {phase === "result" ? "Close" : "Cancel"}
                  </Button>
                  {phase !== "result" ? (
                    <Button
                      type="button"
                      variant="default"
                      size="lg"
                      className="min-h-0 shrink-0 gap-2 disabled:opacity-60"
                      disabled={!canSave || phase === "saving" || phase === "analyzing"}
                      onClick={() => void save()}
                    >
                      <Sparkles className="size-5 text-[var(--ai-mark)]" strokeWidth={1.5} aria-hidden />
                      {phase === "saving" ? "Saving…" : phase === "analyzing" ? "Analyzing…" : "Save calving record"}
                    </Button>
                  ) : (
                    <Button type="button" variant="primary" size="lg" className="min-h-0 shrink-0" onClick={complete}>
                      Done
                    </Button>
                  )}
                </div>
                <p className="mt-2 text-right text-xs text-muted-foreground">
                  AI will review calving details and suggest follow-up steps after saving.
                </p>
              </div>
            )}
            onSave={(record) => commitCattleCalvingRecord(record)}
            onPersistCalvingAi={persistCalvingObservationAi}
            onFlowFinished={() => setSheetView("detail")}
          />
        </div>
      ) : null}

      {sheetView === "log-observation" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <LogObservationForm
            key={`${cattle.id}-log-${logFormNonce}`}
            animalName={cattle.tagNumber}
            initialObservation={embeddedLogInitial}
            onDismiss={goDetail}
            header={
              <>
                <div className="shrink-0 border-b border-border px-4 pb-3 pt-4">
                  <div className="relative flex min-h-[2.75rem] items-center justify-center">
                    <button
                      type="button"
                      onClick={goDetail}
                      className="absolute top-1/2 left-0 flex -translate-y-1/2 items-center gap-1 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <ChevronLeft className="size-3 shrink-0" aria-hidden />
                      Back
                    </button>
                    <p className="px-14 text-center text-base font-medium text-foreground">Log observation</p>
                  </div>
                </div>
                <div className={LOG_OBSERVATION_IDENTITY_ROW}>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {cattle.displayName?.trim() ? (
                        <>
                          <span className="text-base font-medium text-foreground">{cattle.displayName.trim()}</span>
                          <span className="text-sm text-muted-foreground">{cattle.tagNumber}</span>
                        </>
                      ) : (
                        <span className="text-base font-medium text-foreground">{cattle.tagNumber}</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {cattle.breed} · {cattle.age} yrs · {pastureName}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-end justify-end gap-1.5">
                    <StatusBadge status={cattleHealthToStatusBadge(cattle.healthStatus)} />
                  </div>
                </div>
              </>
            }
            contentClassName="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-0"
            footer={({ phase, canSave, isSaving, save, done, edit, dismiss }) => (
              <div className="mt-auto shrink-0 border-t border-border px-4 py-3">
                <div className="flex flex-wrap justify-end gap-2">
                  {phase === "input" || phase === "saving" ? (
                    <Button type="button" variant="tertiary" size="lg" className="min-h-0 shrink-0" onClick={dismiss} disabled={isSaving}>
                      Cancel
                    </Button>
                  ) : null}

                  {phase === "result" ? (
                    <Button type="button" variant="secondary" size="lg" className="min-h-0 shrink-0" onClick={edit}>
                      Edit
                    </Button>
                  ) : null}

                  {phase === "input" || phase === "saving" ? (
                    <Button
                      type="button"
                      variant="default"
                      size="lg"
                      className="min-h-0 shrink-0 gap-2 disabled:opacity-60"
                      disabled={!canSave || isSaving}
                      onClick={() => void save()}
                    >
                      <Sparkles className="size-5 text-[var(--ai-mark)]" strokeWidth={1.5} aria-hidden />
                      {isSaving ? "Analyzing…" : "Save observation"}
                    </Button>
                  ) : null}

                  {phase === "result" ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      className="min-h-0 shrink-0 px-6"
                      onClick={() => void done()}
                    >
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
            onSave={async (data, meta) => {
              const stage = meta?.stage ?? "done"
              if (stage === "commit") {
                const committedId = saveCattleObservationLog(
                  cattle.id,
                  data,
                  embeddedLogInitial ?? undefined
                )
                embeddedLogCommitIdRef.current =
                  (typeof committedId === "string" ? committedId : null) ??
                  embeddedLogInitial?.id ??
                  null
                return
              }

              const targetId = embeddedLogInitial?.id ?? embeddedLogCommitIdRef.current
              embeddedLogCommitIdRef.current = null
              if (targetId) {
                saveCattleObservationLog(cattle.id, data, { id: targetId } as ObservationEntry)
              }

              setEmbeddedLogInitial(null)
              onClosePanel()
              return true
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

function CattleBottomSheet({
  cattle,
  pastureName,
  observations,
  onClose,
  slideLogOpen,
  onSlideLogOpenConsumed,
  slideDetailFocusNonce,
}: {
  cattle: Cattle
  pastureName: string
  observations: ObservationEntry[]
  onClose: () => void
  slideLogOpen?: CattleSlideLogOpenRequest | null
  onSlideLogOpenConsumed?: () => void
  slideDetailFocusNonce?: number
}) {
  return (
    <Drawer.Root open onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[1px]" />
        <Drawer.Content className="fixed right-0 bottom-0 left-0 z-50 flex max-h-[72vh] flex-col rounded-t-2xl bg-background outline-none">
          <Drawer.Title className="sr-only">Cattle details — {cattle.tagNumber}</Drawer.Title>
          <Drawer.Handle className="mx-auto mt-2.5 mb-2 block h-1 w-8 shrink-0 rounded-full bg-border" />
          <CattleDetailSubviewSwitcher
            cattle={cattle}
            pastureName={pastureName}
            observations={observations}
            onClosePanel={onClose}
            slideLogOpen={slideLogOpen}
            onSlideLogOpenConsumed={onSlideLogOpenConsumed}
            slideDetailFocusNonce={slideDetailFocusNonce}
          />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

function CattleSidePanel({
  cattle,
  pastureName,
  observations,
  onClose,
  slideLogOpen,
  onSlideLogOpenConsumed,
  slideDetailFocusNonce,
}: {
  cattle: Cattle
  pastureName: string
  observations: ObservationEntry[]
  onClose: () => void
  slideLogOpen?: CattleSlideLogOpenRequest | null
  onSlideLogOpenConsumed?: () => void
  slideDetailFocusNonce?: number
}) {
  return (
    <aside
      className={cn(
        "flex min-h-0 w-[480px] shrink-0 flex-col overflow-hidden rounded-[12px] border-[0.5px] border-border bg-background md:h-[calc(100vh-180px)]"
      )}
      aria-label={`Details for ${cattle.tagNumber}`}
    >
      <CattleDetailSubviewSwitcher
        cattle={cattle}
        pastureName={pastureName}
        observations={observations}
        onClosePanel={onClose}
        slideLogOpen={slideLogOpen}
        onSlideLogOpenConsumed={onSlideLogOpenConsumed}
        slideDetailFocusNonce={slideDetailFocusNonce}
        rootClassName="min-h-0 flex-1"
      />
    </aside>
  )
}

/**
 * Responsive cattle detail UI: vaul bottom sheet below 768px, fixed-height side column at ≥768px.
 * Parent should wrap the table + this component in a flex row with min-h-[calc(100vh-180px)].
 */
export function CattleDetailPanel({
  cattle,
  pastureName,
  observations,
  onClose,
  slideLogOpen = null,
  onSlideLogOpenConsumed,
  slideDetailFocusNonce = 0,
}: CattleDetailPanelProps) {
  const isMobile = useMediaQuery("(max-width: 767px)")

  if (!cattle) return null

  if (isMobile) {
    return (
      <CattleBottomSheet
        cattle={cattle}
        pastureName={pastureName}
        observations={observations}
        onClose={onClose}
        slideLogOpen={slideLogOpen}
        onSlideLogOpenConsumed={onSlideLogOpenConsumed}
        slideDetailFocusNonce={slideDetailFocusNonce}
      />
    )
  }

  return (
    <CattleSidePanel
      cattle={cattle}
      pastureName={pastureName}
      observations={observations}
      onClose={onClose}
      slideLogOpen={slideLogOpen}
      onSlideLogOpenConsumed={onSlideLogOpenConsumed}
      slideDetailFocusNonce={slideDetailFocusNonce}
    />
  )
}
