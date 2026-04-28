import { ChevronLeft, Sparkle, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react"
import { Drawer } from "vaul"
import { useLogObservationFormController } from "@/components/LogObservationModal"
import { ObservationTimeline } from "@/components/ObservationTimeline"
import { StatusBadge } from "@/components/StatusBadge"
import { RecordCalvingEditor } from "@/components/RecordCalvingModal"
import { SheetBackCenterTitleHeader } from "@/components/SheetBackCenterTitleHeader"
import { CattleLoggingStatusSection } from "@/components/CattleLoggingStatusSection"
import { Button } from "@/components/ui/button"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { useScrollShadow } from "@/hooks/useScrollShadow"
import { LOG_OBSERVATION_IDENTITY_ROW } from "@/lib/logObservationLayout"
import { getAiRiskLevelFromObservations } from "@/lib/animalUtils"
import { getCattleEffectiveHealthRisk } from "@/lib/cattleSelectors"
import { formatDistanceToNow } from "date-fns"
import { formatCattleTagDisplay } from "@/lib/cattleUi"
import { showObservationDiscardedToast } from "@/lib/observationDiscardToast"
import { useRanchData } from "@/contexts/RanchDataContext"
import type { Cattle } from "@/types/cattle"
import type { ObservationEntry, RiskLevel } from "@/types/observation"
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

function cattleRiskLevelToBadgeStatus(level: RiskLevel): "good" | "monitor" | "call-vet" {
  if (level === "call-vet") return "call-vet"
  if (level === "monitor") return "monitor"
  return "good"
}

function cattleObsMap(cattleId: string, observations: readonly ObservationEntry[]) {
  return { [cattleId]: [...observations] } as Record<string, ObservationEntry[]>
}

function cattleHealthFromRiskLevel(level: RiskLevel): NonNullable<Cattle["healthStatus"]> {
  if (level === "call-vet") return "Flag"
  if (level === "monitor") return "Monitor"
  return "Good"
}

function CattleDetailHeader({
  cattle,
  pastureName,
  observations,
  onClose,
}: {
  cattle: Cattle
  pastureName: string
  observations: ObservationEntry[]
  onClose: () => void
}) {
  const healthRisk = getCattleEffectiveHealthRisk(cattle, cattleObsMap(cattle.id, observations))
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
                <span className="text-sm text-muted-foreground">{formatCattleTagDisplay(cattle.tagNumber)}</span>
              </>
            ) : (
              <span className="text-base font-medium text-foreground">{formatCattleTagDisplay(cattle.tagNumber)}</span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {cattle.breed} · {cattle.age} yrs · {pastureName}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-start justify-end gap-1.5">
          <StatusBadge status={cattleRiskLevelToBadgeStatus(healthRisk)} />
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

/** Embedded log form: own component so hooks are not called inside a conditional / IIFE in the parent switcher. */
function CattleEmbeddedLogObservationSubview({
  cattle,
  pastureName,
  observations,
  embeddedLogInitial,
  embeddedLogCommitIdRef,
  goDetail,
  onClosePanel,
  setEmbeddedLogInitial,
}: {
  cattle: Cattle
  pastureName: string
  observations: ObservationEntry[]
  embeddedLogInitial: ObservationEntry | null
  embeddedLogCommitIdRef: MutableRefObject<string | null>
  goDetail: () => void
  onClosePanel: () => void
  setEmbeddedLogInitial: (v: ObservationEntry | null) => void
}) {
  const { saveCattleObservationLog, removeCattleObservation, appendCattleObservation, updateCattle } =
    useRanchData()
  const { scrollRef, isScrolled } = useScrollShadow()
  const { body, footerApi } = useLogObservationFormController({
    mode: "modal",
    animalName: formatCattleTagDisplay(cattle.tagNumber),
    hideCategoryField: true,
    initialObservation: embeddedLogInitial,
    onDismiss: goDetail,
    onSave: async (data, meta) => {
      if (data.kind !== "animal") return
      const stage = meta?.stage ?? "done"
      if (stage === "commit") {
        const committedId = saveCattleObservationLog(
          cattle.id,
          {
            category: data.category,
            notes: data.notes,
            loggedBy: data.loggedBy,
            aiResult: data.aiResult,
          },
          embeddedLogInitial ?? undefined
        )
        embeddedLogCommitIdRef.current =
          (typeof committedId === "string" ? committedId : null) ??
          embeddedLogInitial?.id ??
          null
        return
      }

      if (stage === "discard") {
        const targetId = embeddedLogInitial?.id ?? embeddedLogCommitIdRef.current
        embeddedLogCommitIdRef.current = null
        const list = observations
        const snap = targetId ? list.find((o) => o.id === targetId) : undefined
        if (snap && targetId) {
          const postRemove = list.filter((o) => o.id !== targetId)
          removeCattleObservation(cattle.id, targetId)
          const lvl = getAiRiskLevelFromObservations(postRemove)
          updateCattle(cattle.id, {
            healthStatus: lvl ? cattleHealthFromRiskLevel(lvl) : "Good",
          })
          showObservationDiscardedToast(() => {
            appendCattleObservation(cattle.id, snap)
            const merged = [snap, ...postRemove]
            const restoreLvl = getAiRiskLevelFromObservations(merged)
            updateCattle(cattle.id, {
              healthStatus: restoreLvl
                ? cattleHealthFromRiskLevel(restoreLvl)
                : cattleHealthFromRiskLevel(snap.aiResult?.riskLevel ?? "good"),
              lastObservation: formatDistanceToNow(new Date(), { addSuffix: true }),
            })
          })
        }
        setEmbeddedLogInitial(null)
        goDetail()
        return true
      }

      const targetId = embeddedLogInitial?.id ?? embeddedLogCommitIdRef.current
      embeddedLogCommitIdRef.current = null
      if (targetId) {
        saveCattleObservationLog(
          cattle.id,
          {
            category: data.category,
            notes: data.notes,
            loggedBy: data.loggedBy,
            aiResult: data.aiResult,
          },
          { id: targetId } as ObservationEntry
        )
      }

      setEmbeddedLogInitial(null)
      onClosePanel()
      return true
    },
  })

  return (
    <>
      <div
        className="scroll-shadow-header shrink-0 bg-background"
        data-scrolled={isScrolled ? "true" : undefined}
      >
        <div className="shrink-0 border-b border-border px-4 pb-3 pt-4">
          <div className="relative flex min-h-[2.75rem] items-center justify-center">
            <button
              type="button"
              onClick={goDetail}
              className="absolute top-1/2 left-0 flex -translate-y-1/2 items-center gap-1 text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
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
                  <span className="text-sm text-muted-foreground">
                    {formatCattleTagDisplay(cattle.tagNumber)}
                  </span>
                </>
              ) : (
                <span className="text-base font-medium text-foreground">
                  {formatCattleTagDisplay(cattle.tagNumber)}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {cattle.breed} · {cattle.age} yrs · {pastureName}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-end justify-end gap-1.5">
            <StatusBadge
              status={cattleRiskLevelToBadgeStatus(
                getCattleEffectiveHealthRisk(cattle, cattleObsMap(cattle.id, observations))
              )}
            />
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 pt-0">
        {body}
      </div>

      <div className="shrink-0 border-t border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex shrink-0 items-center">
            {footerApi.phase === "result" ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="shrink-0"
                onClick={() => void footerApi.discard()}
              >
                Discard
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {footerApi.phase === "input" || footerApi.phase === "saving" ? (
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="min-h-0 shrink-0"
                onClick={footerApi.dismiss}
                disabled={footerApi.isSaving}
              >
                Cancel
              </Button>
            ) : null}

            {footerApi.phase === "result" ? (
              <Button type="button" variant="secondary" size="lg" className="shrink-0" onClick={footerApi.edit}>
                Edit
              </Button>
            ) : null}

            {footerApi.phase === "input" || footerApi.phase === "saving" ? (
              <Button
                type="button"
                variant="default"
                size="lg"
                className="min-h-0 shrink-0 gap-2 disabled:opacity-60"
                disabled={!footerApi.canSave || footerApi.isSaving}
                onClick={() => void footerApi.save()}
              >
                <Sparkle className="size-5 text-action-foreground" strokeWidth={1.5} aria-hidden />
                {footerApi.isSaving ? "Analyzing…" : "Save & analyze"}
              </Button>
            ) : null}

            {footerApi.phase === "result" ? (
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="shrink-0 px-6"
                onClick={() => void footerApi.finalize()}
              >
                Finalize
              </Button>
            ) : null}
          </div>
        </div>
        {footerApi.phase === "input" || footerApi.phase === "saving" ? (
          <p className="mt-2 text-right text-[13px] text-muted-foreground">
            AI will analyze and suggest next steps after saving
          </p>
        ) : null}
      </div>
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
  const {
    commitCattleCalvingRecord,
    persistCalvingObservationAi,
    finalizeCalvingObservation,
    updateCattleCalvingRecord,
    discardCalvingObservation,
  } = useRanchData()
  const { scrollRef: detailScrollRef, isScrolled: detailHeaderScrolled } = useScrollShadow()
  const [sheetView, setSheetView] = useState<SheetView>("detail")
  const [embeddedLogInitial, setEmbeddedLogInitial] = useState<ObservationEntry | null>(null)
  const [, setLogFormNonce] = useState(0)
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
          <div
            className="scroll-shadow-header shrink-0 bg-background"
            data-scrolled={detailHeaderScrolled ? "true" : undefined}
          >
            <CattleDetailHeader
              cattle={cattle}
              pastureName={pastureName}
              observations={observations}
              onClose={onClosePanel}
            />
          </div>
          <div
            ref={detailScrollRef}
            className="min-h-0 flex-1 overflow-y-auto pb-[var(--scroll-area-bottom-pad)]"
          >
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
                title={`Record calving — ${formatCattleTagDisplay(cattle.tagNumber)}`}
                onBack={goDetail}
              />
            }
            contentClassName="min-h-0 flex-1 overflow-y-auto px-4 py-3"
            footer={({ phase, canSave, save, finalize, edit, discard }) => (
              <div className="mt-auto shrink-0 border-t border-border px-4 py-3">
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
                        size="lg"
                        className="min-h-0 shrink-0"
                        onClick={goDetail}
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
                        size="lg"
                        className="min-h-0 shrink-0 gap-2 disabled:opacity-60"
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
            onSave={(record) => commitCattleCalvingRecord(record)}
            onPersistCalvingAi={persistCalvingObservationAi}
            onFinalizeCalvingObservation={finalizeCalvingObservation}
            onUpdateCalvingRecord={updateCattleCalvingRecord}
            onDiscardCalving={discardCalvingObservation}
            onFlowFinished={() => setSheetView("detail")}
          />
        </div>
      ) : null}

      {sheetView === "log-observation" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <CattleEmbeddedLogObservationSubview
            key={`${cattle.id}-${embeddedLogInitial?.id ?? "new"}`}
            cattle={cattle}
            pastureName={pastureName}
            observations={observations}
            embeddedLogInitial={embeddedLogInitial}
            embeddedLogCommitIdRef={embeddedLogCommitIdRef}
            goDetail={goDetail}
            onClosePanel={onClosePanel}
            setEmbeddedLogInitial={setEmbeddedLogInitial}
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
          <Drawer.Title className="sr-only">Cattle details — {formatCattleTagDisplay(cattle.tagNumber)}</Drawer.Title>
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
        "flex h-full min-h-0 w-[480px] shrink-0 flex-col overflow-hidden rounded-[12px] border-[0.5px] border-border bg-background",
      )}
      aria-label={`Details for ${formatCattleTagDisplay(cattle.tagNumber)}`}
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
 * Responsive cattle detail UI: vaul bottom sheet below 768px, side column at ≥768px.
 * Parent should use a flex row with `md:items-stretch` so this panel can `h-full min-h-0`.
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
