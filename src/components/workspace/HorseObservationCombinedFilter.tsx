import { ChevronDown, ListFilter } from "lucide-react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { appDropdownPanelClass } from "@/lib/appDropdownTokens"
import { observationStatusFilterSwatchById } from "@/lib/filterOptionSwatches"
import { HORSE_OBSERVATION_CATEGORIES } from "@/lib/observationCategories"
import type { Category } from "@/types/observation"
import { cn } from "@/lib/utils"
import {
  RanchFilterCategoryField,
  type RanchFilterOption,
} from "@/components/workspace/RanchFilterCategoryField"

export type ProfileObsCategoryFilter = "all" | "none" | Extract<Category, "Health" | "Behavior">

const CATEGORY_OPTIONS: RanchFilterOption[] = HORSE_OBSERVATION_CATEGORIES.map((c) => ({
  id: c,
  label: c,
}))

const STATUS_OPTIONS: RanchFilterOption[] = [
  { id: "good", label: "Good", swatchClassName: observationStatusFilterSwatchById.good },
  { id: "monitor", label: "Monitor", swatchClassName: observationStatusFilterSwatchById.monitor },
  { id: "flag", label: "Flag", swatchClassName: observationStatusFilterSwatchById.flag },
]

const STATUS_IDS = ["good", "monitor", "flag"] as const

function categoryToSet(mode: ProfileObsCategoryFilter): Set<string> {
  if (mode === "all") return new Set(HORSE_OBSERVATION_CATEGORIES)
  if (mode === "none") return new Set()
  return new Set([mode])
}

function setToCategoryMode(s: Set<string>): ProfileObsCategoryFilter {
  if (s.size === 0) return "none"
  const h = s.has("Health")
  const b = s.has("Behavior")
  if (h && b) return "all"
  if (h) return "Health"
  if (b) return "Behavior"
  return "none"
}

function isFullStatusSet(s: ReadonlySet<string>): boolean {
  return STATUS_IDS.every((id) => s.has(id))
}

export type HorseObservationCombinedFilterProps = {
  categoryFilter: ProfileObsCategoryFilter
  onCategoryFilterChange: (next: ProfileObsCategoryFilter) => void
  statusFilters: Set<string>
  onStatusFiltersChange: (next: Set<string>) => void
}

type InnerKey = "category" | "status"

type Chip = { key: string; label: string; onRemove: () => void }

/**
 * Single combined filter for horse profile observations — detached popover with
 * Category (single-select set) + Status (multi), live updates.
 */
export function HorseObservationCombinedFilter({
  categoryFilter,
  onCategoryFilterChange,
  statusFilters,
  onStatusFiltersChange,
}: HorseObservationCombinedFilterProps) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [innerExpanded, setInnerExpanded] = useState<InnerKey | null>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  const categorySet = useMemo(() => categoryToSet(categoryFilter), [categoryFilter])

  const reposition = useCallback(() => {
    if (!open || !anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPanelStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 280),
      zIndex: 120,
    })
  }, [open])

  useLayoutEffect(() => {
    reposition()
  }, [reposition, open, innerExpanded])

  useEffect(() => {
    if (!open) return
    const ro = () => reposition()
    window.addEventListener("scroll", ro, true)
    window.addEventListener("resize", ro)
    return () => {
      window.removeEventListener("scroll", ro, true)
      window.removeEventListener("resize", ro)
    }
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node
      if (anchorRef.current?.contains(t)) return
      if (panelRef.current?.contains(t)) return
      setOpen(false)
      setInnerExpanded(null)
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    return () => document.removeEventListener("pointerdown", onPointerDown, true)
  }, [open])

  const categoryDefault = categoryFilter === "all"
  const statusDefault = isFullStatusSet(statusFilters)
  const isAllFiltersDefault = categoryDefault && statusDefault

  const triggerChips = useMemo((): { kind: "all-filters" } | { kind: "chips"; chips: Chip[]; overflow: number } => {
    if (isAllFiltersDefault) return { kind: "all-filters" }

    const chips: Chip[] = []

    if (categoryFilter === "Health" || categoryFilter === "Behavior") {
      chips.push({
        key: "cat",
        label: categoryFilter,
        onRemove: () => onCategoryFilterChange("all"),
      })
    }

    if (!statusDefault) {
      const labels: Record<string, string> = { good: "Good", monitor: "Monitor", flag: "Flag" }
      for (const id of STATUS_IDS) {
        if (statusFilters.has(id)) {
          chips.push({
            key: `s-${id}`,
            label: labels[id] ?? id,
            onRemove: () => {
              const n = new Set(statusFilters)
              n.delete(id)
              onStatusFiltersChange(n)
            },
          })
        }
      }
    }

    chips.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))
    if (chips.length === 0) return { kind: "chips", chips: [], overflow: 0 }
    if (chips.length <= 2) return { kind: "chips", chips, overflow: 0 }
    return { kind: "chips", chips: chips.slice(0, 2), overflow: chips.length - 2 }
  }, [
    categoryFilter,
    isAllFiltersDefault,
    onCategoryFilterChange,
    onStatusFiltersChange,
    statusDefault,
    statusFilters,
  ])

  const toggleMain = useCallback(() => {
    setOpen((o) => {
      if (o) setInnerExpanded(null)
      return !o
    })
  }, [])

  const setCategoryFromSet = useCallback(
    (s: Set<string>) => {
      onCategoryFilterChange(setToCategoryMode(s))
    },
    [onCategoryFilterChange]
  )

  return (
    <div className="relative w-auto shrink-0">
      <div ref={anchorRef}>
        <div
          tabIndex={0}
          aria-expanded={open}
          aria-label="Filter observations by category and status"
          onClick={toggleMain}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              toggleMain()
            }
          }}
          className={cn(
            "inline-flex h-auto min-h-0 w-auto min-w-[132px] cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-left text-sm font-normal text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0"
          )}
        >
          <ListFilter className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {triggerChips.kind === "all-filters" ? (
              <span className="truncate">All filters</span>
            ) : triggerChips.kind === "chips" && triggerChips.chips.length === 0 ? (
              <span className="truncate text-muted-foreground">Nothing selected</span>
            ) : (
              <>
                {triggerChips.chips.map((c) => (
                  <div
                    key={c.key}
                    className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-background px-2 py-0.5 text-xs font-normal text-foreground"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <span className="min-w-0 truncate">{c.label}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded p-0.5 leading-none text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                      aria-label={`Remove ${c.label}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        c.onRemove()
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {triggerChips.overflow > 0 ? (
                  <span className="inline-flex shrink-0 rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                    +{triggerChips.overflow} more
                  </span>
                ) : null}
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center self-center pl-1">
            <ChevronDown
              className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
              aria-hidden
            />
          </div>
        </div>
      </div>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              style={panelStyle}
              className={cn(
                appDropdownPanelClass,
                "flex max-h-[min(70dvh,420px)] flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-white p-3 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.1),0_2px_10px_-4px_rgba(0,0,0,0.08)]"
              )}
            >
              <RanchFilterCategoryField
                sectionLabel="Category"
                options={CATEGORY_OPTIONS}
                selectedIds={categorySet}
                onChange={setCategoryFromSet}
                expanded={innerExpanded === "category"}
                onToggleExpand={() =>
                  setInnerExpanded((cur) => (cur === "category" ? null : "category"))
                }
                aria-label="Observation category filter"
                selectionMode="single"
                usePortal={false}
              />
              <RanchFilterCategoryField
                sectionLabel="Status"
                options={STATUS_OPTIONS}
                selectedIds={statusFilters}
                onChange={onStatusFiltersChange}
                expanded={innerExpanded === "status"}
                onToggleExpand={() => setInnerExpanded((cur) => (cur === "status" ? null : "status"))}
                aria-label="Observation AI status filter"
                usePortal={false}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
