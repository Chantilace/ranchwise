import { ChevronDown } from "lucide-react"
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { appDropdownPanelClass } from "@/lib/appDropdownTokens"
import { CheckboxBox } from "@/components/ui/checkbox-box"

export type RanchFilterOption = {
  id: string
  label: string
  swatchClassName?: string
}

function sortedOptions(options: readonly RanchFilterOption[]) {
  return [...options].sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))
}

function computeChipDisplay(
  options: readonly RanchFilterOption[],
  selectedIds: ReadonlySet<string>,
  treatAllSelectedAsNoSelection?: boolean
): { kind: "empty" } | { kind: "chips"; chips: RanchFilterOption[]; overflow: number } {
  const sorted = sortedOptions(options)
  if (selectedIds.size === 0) return { kind: "empty" }
  const allSelected = options.length > 0 && options.every((o) => selectedIds.has(o.id))
  if (allSelected && treatAllSelectedAsNoSelection) return { kind: "empty" }
  const selectedSorted = sorted.filter((o) => selectedIds.has(o.id))

  if (allSelected) {
    return { kind: "chips", chips: sorted.slice(0, 2), overflow: Math.max(0, sorted.length - 2) }
  }
  if (selectedSorted.length <= 2) {
    return { kind: "chips", chips: selectedSorted, overflow: 0 }
  }
  return { kind: "chips", chips: selectedSorted.slice(0, 2), overflow: selectedSorted.length - 2 }
}

export type RanchFilterCategoryFieldProps = {
  sectionLabel: string
  options: readonly RanchFilterOption[]
  selectedIds: ReadonlySet<string>
  onChange: (next: Set<string>) => void
  expanded: boolean
  onToggleExpand: () => void
  "aria-label": string
  emptyPlaceholder?: string
  /** At most one option selected (radio-style); toggle-all still selects all ids. */
  selectionMode?: "multi" | "single"
  /**
   * When true (default), checklist is a detached floating card in a portal.
   * When false, checklist is absolutely positioned under the chips (nested panel).
   */
  usePortal?: boolean
  /**
   * When true, collapsed chips show the empty placeholder if every option is selected
   * (checklist stays fully checked). Use for optional dimensions where “all” means no filter.
   */
  treatAllSelectedAsNoSelection?: boolean
}

function checkboxStateToChecked(state: "empty" | "mixed" | "full"): boolean | "mixed" {
  if (state === "mixed") return "mixed"
  return state === "full"
}

function ChecklistBody({
  sorted,
  selectedIds,
  allSelected,
  noneSelected,
  toggleAllLabel,
  toggleAllCheckboxState,
  onToggleAll,
  toggleOne,
}: {
  sorted: RanchFilterOption[]
  selectedIds: ReadonlySet<string>
  allSelected: boolean
  noneSelected: boolean
  toggleAllLabel: string
  toggleAllCheckboxState: "empty" | "mixed" | "full"
  onToggleAll: () => void
  toggleOne: (id: string) => void
}) {
  return (
    <>
      <button
        type="button"
        role="checkbox"
        aria-checked={allSelected ? true : noneSelected ? false : "mixed"}
        onClick={(e) => {
          e.stopPropagation()
          onToggleAll()
        }}
        className="mb-1.5 flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left outline-none hover:bg-neutral-50/90 focus-visible:bg-neutral-50/90"
      >
        <CheckboxBox checked={checkboxStateToChecked(toggleAllCheckboxState)} />
        <span className="text-[13px] font-medium text-action">{toggleAllLabel}</span>
      </button>
      {sorted.map((opt) => {
        const checked = selectedIds.has(opt.id)
        return (
          <button
            key={opt.id}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={(e) => {
              e.stopPropagation()
              toggleOne(opt.id)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-foreground outline-none hover:bg-neutral-50/90 focus-visible:bg-neutral-50/90"
          >
            <CheckboxBox checked={checked} />
            <span className="min-w-0 flex-1">{opt.label}</span>
          </button>
        )
      })}
    </>
  )
}

/**
 * RanchWise shared filter category — standalone chips field + checklist
 * (detached popover by default; toggle-all + purple / mixed checkboxes).
 */
export function RanchFilterCategoryField({
  sectionLabel,
  options,
  selectedIds,
  onChange,
  expanded,
  onToggleExpand,
  "aria-label": ariaLabel,
  emptyPlaceholder = "Nothing selected",
  selectionMode = "multi",
  usePortal = true,
  treatAllSelectedAsNoSelection = false,
}: RanchFilterCategoryFieldProps) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({})

  const sorted = useMemo(() => sortedOptions(options), [options])
  const chipDisplay = useMemo(
    () => computeChipDisplay(options, selectedIds, treatAllSelectedAsNoSelection),
    [options, selectedIds, treatAllSelectedAsNoSelection]
  )

  const allSelected = options.length > 0 && options.every((o) => selectedIds.has(o.id))
  const noneSelected = selectedIds.size === 0
  const toggleAllLabel = allSelected ? "Deselect all" : "Select all"
  const toggleAllCheckboxState = allSelected ? "full" : noneSelected ? "empty" : "mixed"

  const reposition = useCallback(() => {
    if (!usePortal || !expanded || !anchorRef.current) return
    const el = anchorRef.current
    const rect = el.getBoundingClientRect()
    setPopoverStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 240),
      zIndex: 120,
    })
  }, [expanded, usePortal])

  useLayoutEffect(() => {
    reposition()
  }, [reposition, expanded, chipDisplay])

  useEffect(() => {
    if (!expanded || !usePortal) return
    const ro = () => reposition()
    window.addEventListener("scroll", ro, true)
    window.addEventListener("resize", ro)
    return () => {
      window.removeEventListener("scroll", ro, true)
      window.removeEventListener("resize", ro)
    }
  }, [expanded, reposition, usePortal])

  useEffect(() => {
    if (!expanded || !usePortal) return
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node
      if (anchorRef.current?.contains(t)) return
      if (popoverRef.current?.contains(t)) return
      onToggleExpand()
    }
    document.addEventListener("pointerdown", onPointerDown, true)
    return () => document.removeEventListener("pointerdown", onPointerDown, true)
  }, [expanded, onToggleExpand, usePortal])

  const onToggleAll = useCallback(() => {
    if (options.length === 0) return
    if (allSelected) {
      onChange(new Set())
    } else {
      onChange(new Set(options.map((o) => o.id)))
    }
  }, [allSelected, onChange, options])

  const toggleOne = useCallback(
    (id: string) => {
      if (selectionMode === "single") {
        if (selectedIds.size === 1 && selectedIds.has(id)) {
          onChange(new Set())
        } else {
          onChange(new Set([id]))
        }
        return
      }
      const n = new Set(selectedIds)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      onChange(n)
    },
    [onChange, selectedIds, selectionMode]
  )

  const removeChip = useCallback(
    (id: string) => {
      const n = new Set(selectedIds)
      n.delete(id)
      onChange(n)
    },
    [onChange, selectedIds]
  )

  const checklist = (
    <div
      ref={popoverRef}
      style={usePortal ? popoverStyle : undefined}
      data-ranch-filter-popover
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={cn(
        appDropdownPanelClass,
        "max-h-60 overflow-y-auto rounded-[10px] border border-border bg-white py-0 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.1),0_2px_10px_-4px_rgba(0,0,0,0.08)]"
      )}
    >
      <ChecklistBody
        sorted={sorted}
        selectedIds={selectedIds}
        allSelected={allSelected}
        noneSelected={noneSelected}
        toggleAllLabel={toggleAllLabel}
        toggleAllCheckboxState={toggleAllCheckboxState}
        onToggleAll={onToggleAll}
        toggleOne={toggleOne}
      />
    </div>
  )

  return (
    <div className={cn("flex flex-col gap-1.5", !usePortal && "relative")}>
      <p className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground">{sectionLabel}</p>

      <div ref={anchorRef} className={cn(!usePortal && "relative")}>
        <div
          tabIndex={0}
          aria-label={ariaLabel}
          aria-expanded={expanded}
          onClick={onToggleExpand}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onToggleExpand()
            }
          }}
          className="flex w-full min-h-0 cursor-pointer items-stretch gap-2 rounded-[10px] border border-border bg-white px-[10px] py-[7px] text-left text-[13px] text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none focus-visible:ring-2 focus-visible:ring-action/25 focus-visible:ring-offset-0"
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {chipDisplay.kind === "empty" ? (
              <span className="text-muted-foreground">{emptyPlaceholder}</span>
            ) : (
              <>
                {chipDisplay.chips.map((opt) => (
                  <div
                    key={opt.id}
                    className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-white px-2 py-[3px] text-[13px] text-foreground"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <span className="min-w-0 truncate">{opt.label}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded p-0.5 leading-none text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                      aria-label={`Remove ${opt.label}`}
                      data-chip-remove
                      onClick={(e) => {
                        e.stopPropagation()
                        removeChip(opt.id)
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {chipDisplay.overflow > 0 ? (
                  <span className="inline-flex shrink-0 rounded-lg bg-muted px-2 py-[3px] text-[13px] font-medium text-foreground">
                    +{chipDisplay.overflow} more
                  </span>
                ) : null}
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center self-center pl-1">
            <ChevronDown
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
              aria-hidden
            />
          </div>
        </div>

        {expanded && !usePortal ? <div className="mt-1">{checklist}</div> : null}
      </div>

      {expanded && usePortal ? createPortal(checklist, document.body) : null}
    </div>
  )
}
