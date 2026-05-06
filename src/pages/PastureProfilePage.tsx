import { format, formatDistanceToNow } from "date-fns"
import { ArrowRight, ChevronLeft, NotebookPen } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { EditPastureModal } from "@/components/EditPastureModal"
import {
  ProfileDetailsCard,
  type ProfileDetailsSection,
} from "@/components/ProfileDetailsCard"
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
import { MobileRosterFilterSheet } from "@/components/workspace/MobileRosterFilterSheet"
import { useRanchData } from "@/contexts/RanchDataContext"
import { useCloseOnOutsidePointerDown } from "@/hooks/useCloseOnOutsidePointerDown"
import { useMediaQuery } from "@/hooks/useMediaQuery"
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

type ProfileTab = "checks" | "details" | "maintenance" | "notes"

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
  const navigate = useNavigate()
  const {
    pastures,
    cattle,
    pastureChecksByPastureId,
    openPastureCheckModal,
    updatePasture,
    removePasture,
    observationsByCattleId,
  } = useRanchData()

  const [activeTab, setActiveTab] = useState<ProfileTab>("checks")
  const [editOpen, setEditOpen] = useState(false)
  const [checkLogFilterOpen, setCheckLogFilterOpen] = useState(false)
  const [checkCategoryFilters, setCheckCategoryFilters] = useState<Set<string>>(() => new Set())
  const [checkStatusFilters, setCheckStatusFilters] = useState<Set<string>>(() => new Set())
  const [checkTimeRange, setCheckTimeRange] = useState<"all" | "7" | "30">("all")
  const checkLogFilterRef = useRef<HTMLDivElement>(null)
  const isMdUp = useMediaQuery("(min-width: 768px)")
  const mobileProfileRootRef = useRef<HTMLDivElement>(null)
  const mobileHeroExpandSectionRef = useRef<HTMLDivElement>(null)
  const mobileHeroCollapsedRef = useRef(false)
  const [mobileHeroCollapsed, setMobileHeroCollapsed] = useState(false)
  const prevPastureIdForMobileHeroRef = useRef<string | undefined>(undefined)

  useCloseOnOutsidePointerDown({
    open: checkLogFilterOpen && isMdUp,
    setOpen: setCheckLogFilterOpen,
    ref: checkLogFilterRef,
  })

  const pasture = useMemo(
    () => (pastureId ? pastures.find((p) => p.id === pastureId) ?? null : null),
    [pastures, pastureId]
  )

  const handleDeletePasture = useCallback(() => {
    if (!pasture) return
    removePasture(pasture.id)
    navigate("/pastures")
  }, [pasture, navigate, removePasture])

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

  useEffect(() => {
    const t = window.setTimeout(() => {
      setEditOpen(false)
      setCheckCategoryFilters(new Set())
      setCheckStatusFilters(new Set())
      setCheckTimeRange("all")
      setCheckLogFilterOpen(false)
      mobileHeroCollapsedRef.current = false
      setMobileHeroCollapsed(false)
      setActiveTab("checks")
    }, 0)
    return () => window.clearTimeout(t)
  }, [pastureId])

  useEffect(() => {
    if (prevPastureIdForMobileHeroRef.current !== pastureId) {
      prevPastureIdForMobileHeroRef.current = pastureId
      mobileHeroCollapsedRef.current = false
      setMobileHeroCollapsed(false)
    }
    if (!pastureId || !pasture) return
    if (isMdUp) {
      mobileHeroCollapsedRef.current = false
      setMobileHeroCollapsed(false)
      return
    }

    const findScrollParent = (from: HTMLElement): HTMLElement | null => {
      let p: HTMLElement | null = from.parentElement
      while (p) {
        const { overflowY } = getComputedStyle(p)
        if (overflowY === "auto" || overflowY === "scroll") return p
        p = p.parentElement
      }
      return null
    }

    const rootEl = mobileProfileRootRef.current
    if (!rootEl) return
    const scrollRoot = findScrollParent(rootEl)
    if (!scrollRoot) return

    let io: IntersectionObserver | undefined

    const onScrollExpand = () => {
      if (!mobileHeroCollapsedRef.current) return
      if (scrollRoot.scrollTop < 48) {
        mobileHeroCollapsedRef.current = false
        setMobileHeroCollapsed(false)
      }
    }

    scrollRoot.addEventListener("scroll", onScrollExpand, { passive: true })

    const attachIo = () => {
      const section = mobileHeroExpandSectionRef.current
      if (!section) return
      io?.disconnect()
      io = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return
          if (!entry.isIntersecting) {
            mobileHeroCollapsedRef.current = true
            setMobileHeroCollapsed(true)
          }
        },
        { root: scrollRoot, threshold: 0 },
      )
      io.observe(section)
    }

    const t = window.setTimeout(attachIo, 0)

    return () => {
      window.clearTimeout(t)
      io?.disconnect()
      scrollRoot.removeEventListener("scroll", onScrollExpand)
    }
  }, [isMdUp, pastureId, pasture, mobileHeroCollapsed])

  const checkLogFilterPanelInner = (
    <EntityFilterPanel
      dimensions={checkLogFilterDimensions}
      onMultiChange={onCheckLogMultiChange}
      onRadioChange={onCheckLogRadioChange}
    />
  )

  const checkLogFilterControl = (
    <div className="relative shrink-0" ref={checkLogFilterRef}>
      <EntityFilterToolbar
        open={checkLogFilterOpen}
        onToggleOpen={() => setCheckLogFilterOpen((o) => !o)}
        activeCategoryCount={checkLogActiveFilterCount}
        onClearAll={clearCheckLogFilters}
        filterButtonAriaLabel="Filter pasture check log"
      />
      {checkLogFilterOpen && isMdUp ? (
        <div className={workspaceFilterPanelClass}>{checkLogFilterPanelInner}</div>
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
      if (r === "flag") n += 1
    }
    return n
  }, [cattleOnPasture, observationsByCattleId])

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

  const hasPastureDetailsData = useMemo(() => {
    if (!pasture) return false
    if (cattleOnPasture.length > 0) return true
    if (checksSorted.length > 0) return true
    const w = pasture.waterSource?.trim() ?? ""
    const f = pasture.fenceStatus?.trim() ?? ""
    if (w.length > 0 && w !== "—") return true
    if (f.length > 0 && f !== "—") return true
    return false
  }, [pasture, cattleOnPasture.length, checksSorted.length])

  const tabItems = useMemo(
    (): TabItem[] => [
      { id: "checks", label: "Pasture checks", count: checksSorted.length },
      { id: "details", label: "Details" },
      { id: "maintenance", label: "Maintenance" },
      { id: "notes", label: "Notes" },
    ],
    [checksSorted.length],
  )

  const metadataOneLine = useMemo(() => {
    if (!pasture) return ""
    return `${pasture.terrain} · ${pasture.acreage} acres`
  }, [pasture])

  const pasturePageLogLabel = useMemo(
    () => (pasture ? `Log ${pasture.name}` : "Log"),
    [pasture],
  )
  const pasturePageLogAriaLabel = useMemo(
    () => (pasture ? `Log observation for ${pasture.name}` : "Log observation"),
    [pasture],
  )
  const herdHref = useMemo(() => (pasture ? `/cattle?pasture=${pasture.id}` : "/cattle"), [pasture])

  const grazingDisplay = useMemo((): ReactNode => {
    const n = cattleOnPasture.length
    return (
      <span className="inline-flex flex-wrap items-baseline justify-end">
        <span>{`${n} cattle`}</span>
        {flagged > 0 ? (
          <span className="text-[12px] font-normal text-[var(--status-monitor-text)]">
            {" "}
            · {flagged} flagged
          </span>
        ) : null}
      </span>
    )
  }, [cattleOnPasture.length, flagged])

  const pastureDetailsSections = useMemo((): ProfileDetailsSection[] => {
    if (!pasture) return []
    return [
      {
        title: "Stocking",
        headerRight: (
          <Link
            to={herdHref}
            className="inline-flex shrink-0 items-center gap-[5px] rounded-full border border-action bg-transparent px-[14px] py-1.5 text-[13px] font-medium text-action outline-none transition-colors hover:bg-action/5 focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            View herd
            <ArrowRight className="size-3 shrink-0" aria-hidden />
          </Link>
        ),
        rows: [
          { label: "Currently grazing", value: grazingDisplay },
          { label: "Density", value: densityLabel },
        ],
      },
      {
        title: "Maintenance",
        rows: [
          { label: "Last check", value: lastCheckLabel },
          { label: "Water", value: pasture.waterSource?.trim() || "—" },
          { label: "Fence", value: pasture.fenceStatus?.trim() || "—" },
        ],
      },
    ]
  }, [pasture, herdHref, grazingDisplay, densityLabel, lastCheckLabel])

  const pastureSummaryEl = aiSummaryProse ? (
    <SmartSuggestionsPanel
      mode="modal"
      className="mt-0 min-w-0"
      modalContentClassName="rounded-[16px] px-5 py-[18px]"
      proseBodyClassName="text-[14px] leading-[1.45]"
      label="Pasture summary"
      labelGlyphStyle="section"
      bodyVariant="prose"
      body={aiSummaryProse}
      contextNote={aiContextNote ?? undefined}
    />
  ) : null

  const pastureSummaryElTablet = aiSummaryProse ? (
    <SmartSuggestionsPanel
      mode="modal"
      columnFill
      className="mt-0 flex h-full min-h-0 min-w-0 flex-1 flex-col"
      modalContentClassName="rounded-[16px] px-5 py-[18px]"
      proseBodyClassName="text-[14px] leading-[1.45]"
      labelPillClassName="rounded-full px-2 py-[3px]"
      label="Pasture summary"
      labelGlyphStyle="section"
      bodyVariant="prose"
      body={aiSummaryProse}
      contextNote={aiContextNote ?? undefined}
    />
  ) : null

  const pastureSummaryElDesktop = aiSummaryProse ? (
    <SmartSuggestionsPanel
      mode="modal"
      columnFill
      className="mt-0 flex h-full min-h-0 min-w-0 flex-1 flex-col"
      modalContentClassName="rounded-[16px] px-5 py-[18px]"
      proseBodyClassName="text-[16px] leading-[1.45]"
      label="Pasture summary"
      labelGlyphStyle="section"
      bodyVariant="prose"
      body={aiSummaryProse}
      contextNote={aiContextNote ?? undefined}
    />
  ) : null

  const defaultPastureTabClassName =
    "-mb-px px-4 py-2 text-[13px] font-normal leading-snug md:text-[14px]"

  function renderPastureTabs(tabClassName: string = defaultPastureTabClassName) {
    return (
      <Tabs
        items={tabItems}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as ProfileTab)}
        ariaLabel="Pasture profile sections"
        className="flex min-w-0 max-w-full gap-0 border-b border-border"
        tabClassName={tabClassName}
      />
    )
  }

  function renderPastureTabPanel() {
    return (
      <div className="min-w-0 pt-4">
        {activeTab === "checks" ? (
          checksSorted.length === 0 ? (
            <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
              No pasture checks logged yet. Tap &quot;{pasturePageLogLabel}&quot; above to record your first
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

        {activeTab === "details" ? (
          hasPastureDetailsData ? (
            <div className="pb-9">
              <ProfileDetailsCard sections={pastureDetailsSections} className="min-w-0 max-w-xl" />
            </div>
          ) : (
            <div className="flex max-w-lg flex-col gap-4 pb-9">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                No pasture details added yet. Edit the pasture to add stocking, density, water, or fence
                information.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-fit shrink-0"
                onClick={() => setEditOpen(true)}
              >
                Edit pasture
              </Button>
            </div>
          )
        ) : null}

        {activeTab === "maintenance" ? (
          <p className="max-w-lg pb-9 text-sm leading-relaxed text-muted-foreground">
            No maintenance records yet — start tracking fence repairs, water systems, and supplementation here.
          </p>
        ) : null}

        {activeTab === "notes" ? (
          <p className="max-w-lg pb-9 text-sm leading-relaxed text-muted-foreground">
            No notes yet — keep general observations about this pasture here.
          </p>
        ) : null}
      </div>
    )
  }

  function renderProfileTabsAndContent(options?: { tabClassName?: string }) {
    return (
      <div className="min-w-0">
        {renderPastureTabs(options?.tabClassName ?? defaultPastureTabClassName)}
        {renderPastureTabPanel()}
      </div>
    )
  }

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
    <>
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
        <header className="hidden md:flex flex-wrap items-center justify-between gap-3 bg-background py-3 md:py-5">
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
              className="h-9 min-h-9 max-w-full gap-1.5 rounded-full px-4"
              aria-label={pasturePageLogAriaLabel}
              onClick={() => openPastureCheckModal({ pastureId: pasture.id, pastureName: pasture.name })}
            >
              <NotebookPen className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">{pasturePageLogLabel}</span>
            </Button>
          </div>
        </header>

        <div
          ref={mobileProfileRootRef}
          data-mobile-profile-root
          className="flex min-w-0 flex-col md:hidden"
        >
          {mobileHeroCollapsed ? (
            <div className="sticky top-0 z-40 -mx-4 w-[calc(100%+2rem)] max-w-none shrink-0 sm:-mx-6 sm:w-[calc(100%+3rem)]">
              <div className="border-b-[0.5px] border-[rgba(0,0,0,0.08)] bg-[rgba(253,253,253,0.96)] shadow-[var(--shadow-sticky-scroll)] backdrop-blur-[12px] [-webkit-backdrop-filter:blur(12px)]">
                <div className="flex min-w-0 items-center gap-2 px-4 py-3 sm:px-6">
                  <Link
                    to="/pastures"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40"
                    aria-label="Back to pastures"
                  >
                    <ChevronLeft className="size-5 shrink-0" strokeWidth={2} aria-hidden />
                  </Link>
                  <div className="size-11 shrink-0 overflow-hidden rounded-[10px] border-[0.5px] border-border bg-muted">
                    {profileImageSrc ? (
                      <img
                        src={profileImageSrc}
                        alt={pasture.name}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[13px] font-semibold leading-none text-muted-foreground">
                        {pasture.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate text-[16px] font-medium text-foreground">
                        {pasture.name}
                      </span>
                      <StatusBadge
                        status={derivedStatus}
                        size="md"
                        emphasis="primary"
                        className="shrink-0 !px-2 !py-[3px] !text-[13px]"
                      />
                    </div>
                    <p className="mt-0.5 min-w-0 truncate text-[13px] leading-snug text-muted-foreground">
                      {metadataOneLine}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 min-h-9 shrink-0 rounded-full px-4 text-[13px] transition-transform active:scale-95"
                    onClick={() => setEditOpen(true)}
                  >
                    Edit
                  </Button>
                </div>
                <div className="px-4 sm:px-6">{renderPastureTabs()}</div>
              </div>
            </div>
          ) : null}

          {!mobileHeroCollapsed ? (
            <div ref={mobileHeroExpandSectionRef} className="shrink-0">
              <div className="-mx-4 w-[calc(100%+2rem)] max-w-none shrink-0 sm:-mx-6 sm:w-[calc(100%+3rem)]">
                <div className="border-b-[0.5px] border-[rgba(0,0,0,0.08)] bg-background">
                  <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-[10px] sm:px-6">
                    <Link
                      to="/pastures"
                      className="inline-flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                    >
                      <ChevronLeft className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                      <span>Pastures</span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 min-h-9 shrink-0 rounded-full px-4 text-[13px]"
                        onClick={() => setEditOpen(true)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        className="h-9 min-h-9 max-w-[min(100%,11rem)] gap-1.5 rounded-full px-3 text-[13px] sm:max-w-none sm:px-4"
                        aria-label={pasturePageLogAriaLabel}
                        onClick={() => openPastureCheckModal({ pastureId: pasture.id, pastureName: pasture.name })}
                      >
                        <NotebookPen className="size-4 shrink-0" aria-hidden />
                        <span className="min-w-0 truncate">{pasturePageLogLabel}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative -mx-4 h-[280px] w-[calc(100%+2rem)] max-w-none shrink-0 overflow-hidden sm:-mx-6 sm:w-[calc(100%+3rem)]">
                {profileImageSrc ? (
                  <img
                    src={profileImageSrc}
                    alt={pasture.name}
                    className="absolute inset-0 size-full object-cover"
                    loading="eager"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
                    {pasture.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[65%] bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.4)_40%,rgba(0,0,0,0.7)_100%)]"
                  aria-hidden
                />
                <div className="absolute bottom-0 left-0 z-10 flex w-full min-w-0 flex-col items-start gap-1.5 px-4 pb-3.5 sm:px-6">
                  <StatusBadge
                    status={derivedStatus}
                    size="md"
                    emphasis="primary"
                    className="shrink-0"
                  />
                  <h2 className="min-w-0 text-[22px] font-medium leading-[1.1] text-white">{pasture.name}</h2>
                  <p className="min-w-0 text-[13px] leading-snug text-[rgba(255,255,255,0.92)]">
                    {metadataOneLine}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "flex min-w-0 flex-col gap-3",
              pastureSummaryEl && "mb-8",
              mobileHeroCollapsed ? "mt-0 pt-2" : "mt-4",
            )}
          >
            {pastureSummaryEl}
          </div>

          {!mobileHeroCollapsed ? (
            <div className="min-w-0">
              {renderPastureTabs()}
              {renderPastureTabPanel()}
            </div>
          ) : (
            renderPastureTabPanel()
          )}
        </div>

        <div className="hidden min-w-0 md:block">
          <div className="min-w-0 lg:hidden">
            <div className="mb-4 grid min-h-0 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-stretch gap-6">
              <div className="relative aspect-square h-full min-h-0 max-h-[240px] min-w-[180px] max-w-[240px] shrink-0 self-end overflow-hidden rounded-[var(--radius-2xl)]">
                {profileImageSrc ? (
                  <img
                    src={profileImageSrc}
                    alt={pasture.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted text-xl font-semibold text-muted-foreground">
                    {pasture.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 pt-[2px]">
                <div className="min-w-0 shrink-0">
                  <div className="mb-1.5 flex min-w-0 items-center gap-2.5">
                    <h2 className="min-w-0 truncate text-[28px] font-medium leading-[1.1] tracking-[-0.01em] text-foreground">
                      {pasture.name}
                    </h2>
                    <StatusBadge
                      status={derivedStatus}
                      size="md"
                      emphasis="primary"
                      className="shrink-0"
                    />
                  </div>
                  <p className="min-w-0 text-[13px] leading-snug text-muted-foreground">{metadataOneLine}</p>
                </div>
                {pastureSummaryElTablet ? (
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col">{pastureSummaryElTablet}</div>
                ) : null}
              </div>
            </div>

            {renderProfileTabsAndContent({
              tabClassName: "-mb-px px-4 py-2 text-[14px] font-normal leading-snug",
            })}
          </div>

          <div className="hidden min-w-0 flex-col lg:flex">
            <div className="mb-6 grid min-h-0 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-stretch gap-8">
              <div className="relative aspect-square h-full min-h-0 max-h-[360px] min-w-[280px] max-w-[360px] shrink-0 self-end overflow-hidden rounded-[var(--radius-3xl)]">
                {profileImageSrc ? (
                  <img
                    src={profileImageSrc}
                    alt={pasture.name}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
                    {pasture.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex h-full min-h-[240px] min-w-0 flex-col gap-4 pt-[4px]">
                <div className="min-w-0 shrink-0">
                  <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-3">
                    <h1 className="min-w-0 truncate text-[30px] font-medium leading-[1.1] tracking-[-0.01em] text-foreground">
                      {pasture.name}
                    </h1>
                    <StatusBadge
                      status={derivedStatus}
                      size="md"
                      emphasis="primary"
                      className="shrink-0"
                    />
                  </div>
                  <p className="min-w-0 truncate text-[16px] text-muted-foreground">{metadataOneLine}</p>
                </div>
                {pastureSummaryElDesktop ? (
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col">{pastureSummaryElDesktop}</div>
                ) : null}
              </div>
            </div>
            <div className="min-w-0">{renderProfileTabsAndContent()}</div>
          </div>
        </div>
      </div>

      <EditPastureModal
        open={editOpen}
        pasture={pasture as Pasture}
        onClose={() => setEditOpen(false)}
        onSave={(id, patch) => updatePasture(id, patch)}
        onDelete={handleDeletePasture}
      />
      </RanchWorkspaceShell>

      {mobileHeroCollapsed && !isMdUp ? (
        <button
          type="button"
          className="fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] right-[calc(24px+env(safe-area-inset-right,0px))] z-[60] flex size-14 shrink-0 items-center justify-center rounded-full bg-action text-action-foreground shadow-[0_8px_20px_rgba(91,76,174,0.45),0_2px_6px_rgba(91,76,174,0.3)] outline-none transition-all hover:bg-action-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label={pasturePageLogAriaLabel}
          onClick={() => openPastureCheckModal({ pastureId: pasture.id, pastureName: pasture.name })}
        >
          <NotebookPen className="size-6 shrink-0 text-action-foreground" aria-hidden />
        </button>
      ) : null}

    <MobileRosterFilterSheet
      open={checkLogFilterOpen && !isMdUp}
      title="Filters"
      onClose={() => setCheckLogFilterOpen(false)}
    >
      {checkLogFilterPanelInner}
    </MobileRosterFilterSheet>
    </>
  )
}
