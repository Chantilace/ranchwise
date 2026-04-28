import { format, formatDistanceToNow } from "date-fns"
import { ChevronLeft, NotebookPen } from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { EditPastureModal } from "@/components/EditPastureModal"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { SmartSuggestionsPanel } from "@/components/SmartSuggestionsPanel"
import { StatusBadge } from "@/components/StatusBadge"
import { AiActionButton } from "@/components/ai/ai-action-button"
import { Button, buttonVariants } from "@/components/ui/button"
import { Tabs, type TabItem } from "@/components/ui/tabs"
import { EntityFilterPanel, type EntityFilterDimension } from "@/components/workspace/EntityFilterPanel"
import { EntityFilterToolbar } from "@/components/workspace/EntityFilterToolbar"
import { workspaceFilterPanelClass } from "@/components/workspace/filterPanelStyles"
import { FilteredCountDisplay } from "@/components/workspace/FilteredCountDisplay"
import { useRanchData } from "@/contexts/RanchDataContext"
import { useCloseOnOutsidePointerDown } from "@/hooks/useCloseOnOutsidePointerDown"
import { getCattleEffectiveHealthRisk } from "@/lib/cattleSelectors"
import { CATEGORY_METADATA_BADGE_CLASS } from "@/lib/categoryBadgeClass"
import { getPastureDerivedStatus } from "@/lib/pastureDerivedStatus"
import {
  PASTURE_CHECK_CATEGORIES,
  PASTURE_CHECK_CATEGORY_LABELS,
  type PastureCheckCategory,
  type PastureCheckEntry,
} from "@/lib/pastureCheckTypes"
import { PASTURE_PROFILE_AI_SUMMARY } from "@/lib/pastureProfileSummarySeed"
import { PASTURE_SEED_MEDIA } from "@/lib/pastureSeedMedia"
import { getPastureShortName } from "@/lib/pastureUtils"
import {
  WORKSPACE_PAGE_SCROLL_CLASS,
  WORKSPACE_PAGE_SHELL_FLUSH_TOP_CLASS,
} from "@/lib/workspacePageCard"
import type { PastureStatus } from "@/lib/statusUtils"
import { cn } from "@/lib/utils"
import type { Pasture } from "@/types/cattle"
import type { AIResult } from "@/types/observation"

type ProfileTab = "checks" | "maintenance" | "notes"

const CHECK_LOG_STATUS_IDS = ["stable", "concern", "action_needed"] as const

function pastureCheckAiBodyText(ai: AIResult | null | undefined): string {
  if (!ai) return ""
  const note = ai.patternNote?.trim()
  if (note) return note
  const recs = ai.recommendations?.map((s) => s.trim()).filter(Boolean) ?? []
  if (recs.length) return recs.join(" ")
  return ai.riskLabel?.trim() ?? ""
}

function PastureCheckCard({
  entry,
  showStatusBadge,
}: {
  entry: PastureCheckEntry
  showStatusBadge: boolean
}) {
  const [aiExpanded, setAiExpanded] = useState(false)
  const hasAi = entry.aiResult != null
  const aiBody = pastureCheckAiBodyText(entry.aiResult)
  const dateLine = format(entry.date, "MMM d, yyyy")
  const status = entry.status

  return (
    <li className="relative rounded-lg border-[0.5px] border-border bg-white px-4 py-[14px]">
      {hasAi ? (
        <div className="absolute top-[14px] right-4 z-[1]" title="View AI analysis">
          <AiActionButton
            ariaLabel={aiExpanded ? "Hide AI suggestion" : "Show AI suggestion"}
            expanded={aiExpanded}
            className="rounded-md"
            onClick={(e) => {
              e.stopPropagation()
              setAiExpanded((o) => !o)
            }}
          />
        </div>
      ) : null}

      <p className={cn("mb-3 text-sm leading-[1.5] text-foreground", hasAi && "pr-8")}>{entry.body}</p>

      {hasAi && aiExpanded ? (
        <div className="mb-3 overflow-hidden">
          <div className="rounded-lg bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">{aiBody}</div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
        <span>{dateLine}</span>
        <span aria-hidden>·</span>
        <span className={CATEGORY_METADATA_BADGE_CLASS}>
          {PASTURE_CHECK_CATEGORY_LABELS[entry.category]}
        </span>
        {status ? (
          <>
            <span aria-hidden>·</span>
            {showStatusBadge ? (
              <StatusBadge status={status} size="sm" emphasis="secondary" />
            ) : (
              <span className="text-[13px] font-normal text-muted-foreground">
                {status === "stable"
                  ? "Stable"
                  : status === "concern"
                    ? "Concern"
                    : "Action needed"}
              </span>
            )}
          </>
        ) : null}
        <span aria-hidden>·</span>
        <span className="text-[13px] text-muted-foreground">{entry.author}</span>
      </div>
    </li>
  )
}

export function PastureProfilePage() {
  const { pastureId } = useParams<{ pastureId: string }>()
  const {
    pastures,
    cattle,
    pastureChecksByPastureId,
    openPastureCheckModal,
    updatePasture,
    observationsByCattleId,
  } = useRanchData()

  const [activeTab, setActiveTab] = useState<ProfileTab>("checks")
  const [editOpen, setEditOpen] = useState(false)
  const [checkLogFilterOpen, setCheckLogFilterOpen] = useState(false)
  const [checkCategoryFilters, setCheckCategoryFilters] = useState<Set<string>>(() => new Set())
  const [checkStatusFilters, setCheckStatusFilters] = useState<Set<string>>(() => new Set())
  const [checkTimeRange, setCheckTimeRange] = useState<"all" | "7" | "30">("all")
  const checkLogFilterRef = useRef<HTMLDivElement>(null)

  useCloseOnOutsidePointerDown({
    open: checkLogFilterOpen,
    setOpen: setCheckLogFilterOpen,
    ref: checkLogFilterRef,
  })

  const pasture = useMemo(
    () => (pastureId ? pastures.find((p) => p.id === pastureId) ?? null : null),
    [pastures, pastureId]
  )

  const checksSorted = useMemo(() => {
    if (!pastureId) return []
    const list = [...(pastureChecksByPastureId[pastureId] ?? [])]
    list.sort((a, b) => b.date - a.date)
    return list
  }, [pastureId, pastureChecksByPastureId])

  const checksFiltered = useMemo(() => {
    let list = [...checksSorted]
    if (checkCategoryFilters.size > 0 && checkCategoryFilters.size < PASTURE_CHECK_CATEGORIES.length) {
      list = list.filter((e) => checkCategoryFilters.has(e.category))
    }
    if (checkStatusFilters.size > 0 && checkStatusFilters.size < CHECK_LOG_STATUS_IDS.length) {
      list = list.filter((e) => e.status != null && checkStatusFilters.has(e.status))
    }
    if (checkTimeRange !== "all") {
      const windowMs = checkTimeRange === "7" ? 7 * 86_400_000 : 30 * 86_400_000
      const cutoff = Date.now() - windowMs
      list = list.filter((e) => e.date >= cutoff)
    }
    return list
  }, [checksSorted, checkCategoryFilters, checkStatusFilters, checkTimeRange])

  const checkLogActiveFilterCount = useMemo(() => {
    let n = 0
    if (checkCategoryFilters.size > 0 && checkCategoryFilters.size < PASTURE_CHECK_CATEGORIES.length) {
      n += checkCategoryFilters.size
    }
    if (checkStatusFilters.size > 0 && checkStatusFilters.size < CHECK_LOG_STATUS_IDS.length) {
      n += checkStatusFilters.size
    }
    if (checkTimeRange !== "all") n += 1
    return n
  }, [checkCategoryFilters, checkStatusFilters, checkTimeRange])

  const checkLogFilterDimensions = useMemo((): EntityFilterDimension[] => {
    const categoryOptions = PASTURE_CHECK_CATEGORIES.map((c: PastureCheckCategory) => ({
      id: c,
      label: PASTURE_CHECK_CATEGORY_LABELS[c],
    }))
    const statusOptions = [
      { id: "stable", label: "Stable" },
      { id: "concern", label: "Concern" },
      { id: "action_needed", label: "Action needed" },
    ]
    return [
      {
        kind: "multi",
        id: "category",
        label: "Category",
        options: categoryOptions,
        selectedIds: checkCategoryFilters,
        allSelectedLabel: "All",
        placeholder: "All",
        "aria-label": "Pasture check category filters",
      },
      {
        kind: "multi",
        id: "status",
        label: "Status",
        options: statusOptions,
        selectedIds: checkStatusFilters,
        allSelectedLabel: "All",
        placeholder: "All",
        "aria-label": "Pasture check status filters",
      },
      {
        kind: "radio",
        id: "time",
        label: "Time range",
        options: [
          { id: "all", label: "All time" },
          { id: "7", label: "Last 7 days" },
          { id: "30", label: "Last 30 days" },
        ],
        value: checkTimeRange,
        clearValueId: "all",
        placeholder: "All time",
        "aria-label": "Pasture check time range",
      },
    ]
  }, [checkCategoryFilters, checkStatusFilters, checkTimeRange])

  const onCheckLogMultiChange = useCallback((id: string, next: Set<string>) => {
    if (id === "category") setCheckCategoryFilters(next)
    else if (id === "status") setCheckStatusFilters(next)
  }, [])

  const onCheckLogRadioChange = useCallback((id: string, value: string) => {
    if (id === "time" && (value === "all" || value === "7" || value === "30")) {
      setCheckTimeRange(value)
    }
  }, [])

  const clearCheckLogFilters = useCallback(() => {
    setCheckCategoryFilters(new Set())
    setCheckStatusFilters(new Set())
    setCheckTimeRange("all")
  }, [])

  const checkLogFilterControl = (
    <div className="relative shrink-0" ref={checkLogFilterRef}>
      <EntityFilterToolbar
        open={checkLogFilterOpen}
        onToggleOpen={() => setCheckLogFilterOpen((o) => !o)}
        activeCategoryCount={checkLogActiveFilterCount}
        onClearAll={clearCheckLogFilters}
        filterButtonAriaLabel="Filter pasture check log"
      />
      {checkLogFilterOpen ? (
        <div className={workspaceFilterPanelClass}>
          <EntityFilterPanel
            dimensions={checkLogFilterDimensions}
            onMultiChange={onCheckLogMultiChange}
            onRadioChange={onCheckLogRadioChange}
          />
        </div>
      ) : null}
    </div>
  )

  const derivedStatus: PastureStatus = useMemo(() => {
    if (!pastureId) return "stable"
    return getPastureDerivedStatus(pastureId, pastureChecksByPastureId)
  }, [pastureId, pastureChecksByPastureId])

  const latestCheckId = checksSorted[0]?.id ?? null

  const cattleOnPasture = useMemo(
    () => (pastureId ? cattle.filter((c) => c.pastureId === pastureId) : []),
    [cattle, pastureId]
  )

  const flagged = useMemo(() => {
    let n = 0
    for (const c of cattleOnPasture) {
      const r = getCattleEffectiveHealthRisk(c, observationsByCattleId)
      if (r === "call-vet") n += 1
    }
    return n
  }, [cattleOnPasture, observationsByCattleId])

  const stockedValue = useMemo(() => {
    const n = cattleOnPasture.length
    const suffix = flagged > 0 ? ` · ${flagged} flagged` : ""
    return `${n} cattle${suffix}`
  }, [cattleOnPasture.length, flagged])

  const densityLabel = useMemo(() => {
    if (!pasture || cattleOnPasture.length === 0) return "—"
    const v = pasture.acreage / cattleOnPasture.length
    return `${v.toFixed(1)} ac/head`
  }, [pasture, cattleOnPasture.length])

  const lastCheckLabel = useMemo(() => {
    if (checksSorted.length === 0) return "Never"
    return formatDistanceToNow(checksSorted[0].date, { addSuffix: true })
  }, [checksSorted])

  const profileImageSrc = useMemo(() => {
    if (!pasture) return null
    return (
      pasture.profileImageUrl?.trim() ||
      PASTURE_SEED_MEDIA[pasture.name]?.imageUrl ||
      null
    )
  }, [pasture])

  const aiSummaryBody = pastureId ? PASTURE_PROFILE_AI_SUMMARY[pastureId] ?? null : null
  const aiContextNote = useMemo(() => {
    if (checksSorted.length === 0) return null
    const n = checksSorted.length
    const rel = formatDistanceToNow(checksSorted[0].date, { addSuffix: true })
    return `Based on ${n} check${n === 1 ? "" : "s"} · updated ${rel}`
  }, [checksSorted])

  const aiSummaryProse =
    aiSummaryBody?.trim() ||
    (checksSorted.length > 0
      ? "Pasture summary copy is not seeded for this pasture yet. Logging additional checks will refine the narrative once summaries are wired."
      : null)

  const detailRows = useMemo(() => {
    if (!pasture) return []
    return [
      { label: "Stocked", value: stockedValue },
      { label: "Density", value: densityLabel },
      { label: "Last check", value: lastCheckLabel },
      { label: "Water", value: pasture.waterSource },
      { label: "Fence", value: pasture.fenceStatus },
    ]
  }, [pasture, stockedValue, densityLabel, lastCheckLabel])

  const tabItems = useMemo(
    (): TabItem[] => [
      { id: "checks", label: "Pasture checks", count: checksSorted.length },
      { id: "maintenance", label: "Maintenance" },
      { id: "notes", label: "Notes" },
    ],
    [checksSorted.length]
  )

  if (!pastureId || !pasture) {
    return (
      <RanchWorkspaceShell showHeaderSearch={false}>
        <p className="text-muted-foreground">Pasture not found.</p>
        <Link className={cn(buttonVariants({ variant: "secondary" }), "mt-4")} to="/pastures">
          Back to pastures
        </Link>
      </RanchWorkspaceShell>
    )
  }

  return (
    <RanchWorkspaceShell
      showHeaderSearch={false}
      contentClassName={cn(
        WORKSPACE_PAGE_SCROLL_CLASS,
        WORKSPACE_PAGE_SHELL_FLUSH_TOP_CLASS,
        "pb-9",
      )}
      searchValue=""
      onSearchChange={() => {}}
    >
      <div className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 bg-background py-3 md:py-5 max-md:sticky max-md:top-0 max-md:z-30 max-md:-mx-4 max-md:border-b max-md:border-border max-md:px-4 sm:max-md:-mx-6 sm:max-md:px-6">
          <nav
            className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground"
            aria-label="Breadcrumb"
          >
            <Link
              to="/pastures"
              className="inline-flex items-center gap-1 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <ChevronLeft className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              Pastures
            </Link>
            <span className="text-muted-foreground" aria-hidden>
              /
            </span>
            <span className="min-w-0 truncate font-medium text-foreground">
              {getPastureShortName(pasture.name)}
            </span>
          </nav>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-9 min-h-9 shrink-0 rounded-full px-4"
              onClick={() => setEditOpen(true)}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="default"
              className="h-9 min-h-9 gap-1.5 rounded-full px-4"
              aria-label="Log pasture check"
              onClick={() => openPastureCheckModal({ pastureId: pasture.id, pastureName: pasture.name })}
            >
              <NotebookPen className="size-4 shrink-0" aria-hidden />
              <span className="hidden md:inline">Log pasture check</span>
              <span className="md:hidden">Log</span>
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 md:min-h-0 md:flex-1 md:grid-cols-[300px_minmax(0,1fr)] md:gap-5 md:overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6">
          <aside className="flex flex-col gap-4 md:sticky md:top-0 md:self-start">
            <div>
              {profileImageSrc ? (
                <img
                  src={profileImageSrc}
                  alt=""
                  className="h-40 w-full rounded-xl object-cover sm:h-48 md:aspect-square md:h-auto md:min-h-0"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-xl bg-muted text-2xl font-semibold text-muted-foreground sm:h-48 md:aspect-square md:h-auto md:min-h-0">
                  {pasture.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-medium tracking-[-0.01em] text-foreground">{pasture.name}</h1>
                <StatusBadge status={derivedStatus} size="md" emphasis="secondary" />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {pasture.terrain} · {pasture.acreage} acres
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1">
              {checksSorted.length > 0 && aiSummaryProse ? (
                <SmartSuggestionsPanel
                  mode="modal"
                  className="mt-0"
                  label="Pasture summary"
                  labelGlyphStyle="section"
                  bodyVariant="prose"
                  body={aiSummaryProse}
                  contextNote={aiContextNote}
                />
              ) : null}

              <div className="rounded-lg border-[0.5px] border-border bg-card px-4 py-3.5">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">Details</p>
                  <Link
                    to={`/cattle?pasture=${pasture.id}`}
                    className="shrink-0 text-[13px] font-medium text-action hover:underline"
                  >
                    View herd →
                  </Link>
                </div>
                <div>
                  {detailRows.map((row, i) => (
                    <div
                      key={row.label}
                      className={cn(
                        "flex items-center justify-between gap-3 py-1.5 text-sm",
                        i < detailRows.length - 1 && "border-b-[0.5px] border-border",
                      )}
                    >
                      <span className="shrink-0 text-muted-foreground">{row.label}</span>
                      <span className="min-w-0 text-right font-medium text-foreground">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 md:min-h-0 md:overflow-y-auto">
            <Tabs
              items={tabItems}
              activeTab={activeTab}
              onChange={(id) => setActiveTab(id as ProfileTab)}
              ariaLabel="Pasture profile sections"
              className="flex min-w-0 max-w-full gap-0 border-b border-border"
              tabClassName="-mb-px px-4 py-2 text-base font-medium"
            />
            <div className="min-w-0 pt-4">
              {activeTab === "checks" ? (
                checksSorted.length === 0 ? (
                  <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                    No pasture checks logged yet. Tap &quot;Log pasture check&quot; above to record your first
                    inspection.
                  </p>
                ) : (
                  <>
                    <div className="mb-3 flex flex-wrap items-center gap-2">{checkLogFilterControl}</div>
                    <FilteredCountDisplay
                      visible={checkLogActiveFilterCount > 0}
                      filteredCount={checksFiltered.length}
                      totalCount={checksSorted.length}
                      entityName="checks"
                      className="mb-3"
                    />
                    {checksFiltered.length === 0 ? (
                      <p className="max-w-lg pb-9 text-sm leading-relaxed text-muted-foreground">
                        No checks match your filters.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-3 pb-9">
                        {checksFiltered.map((entry) => (
                          <PastureCheckCard
                            key={entry.id}
                            entry={entry}
                            showStatusBadge={entry.id === latestCheckId}
                          />
                        ))}
                      </ul>
                    )}
                  </>
                )
              ) : null}

              {activeTab === "maintenance" ? (
                <p className="max-w-lg pb-9 text-sm leading-relaxed text-muted-foreground">
                  No maintenance records yet — start tracking fence repairs, water systems, and supplementation
                  here.
                </p>
              ) : null}

              {activeTab === "notes" ? (
                <p className="max-w-lg pb-9 text-sm leading-relaxed text-muted-foreground">
                  No notes yet — keep general observations about this pasture here.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <EditPastureModal
        open={editOpen}
        pasture={pasture as Pasture}
        onClose={() => setEditOpen(false)}
        onSave={(id, patch) => updatePasture(id, patch)}
      />
    </RanchWorkspaceShell>
  )
}
