import { useCallback, useMemo, useRef, type KeyboardEvent } from "react"

import { cn } from "@/lib/utils"

export type TabItem = {
  id: string
  label: string
  count?: number
  disabled?: boolean
  /** Shown after the label when disabled, e.g. `soon` renders as `(soon)` in quiet text. */
  disabledLabel?: string
  /** Applied to the count suffix span when `count` is set (e.g. muted History count). */
  countClassName?: string
}

export type TabsProps = {
  items: TabItem[]
  activeTab: string
  onChange: (id: string) => void
  className?: string
  tabClassName?: string
  ariaLabel?: string
}

function enabledItemIndices(items: TabItem[]): number[] {
  return items.reduce<number[]>((acc, item, i) => {
    if (!item.disabled) acc.push(i)
    return acc
  }, [])
}

export function Tabs({ items, activeTab, onChange, className, tabClassName, ariaLabel }: TabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const enabledIndices = useMemo(() => enabledItemIndices(items), [items])

  const focusTab = useCallback((index: number) => {
    queueMicrotask(() => {
      tabRefs.current[index]?.focus()
    })
  }, [])

  const activateIndex = useCallback(
    (index: number) => {
      const item = items[index]
      if (!item || item.disabled) return
      onChange(item.id)
      focusTab(index)
    },
    [items, onChange, focusTab],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (enabledIndices.length === 0) return

      const currentRaw = items.findIndex((it) => it.id === activeTab)
      let posInEnabled = enabledIndices.indexOf(currentRaw)
      if (posInEnabled < 0) posInEnabled = 0

      if (e.key === "ArrowRight") {
        e.preventDefault()
        const nextPos = (posInEnabled + 1) % enabledIndices.length
        activateIndex(enabledIndices[nextPos])
        return
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault()
        const nextPos = (posInEnabled - 1 + enabledIndices.length) % enabledIndices.length
        activateIndex(enabledIndices[nextPos])
        return
      }
      if (e.key === "Home") {
        e.preventDefault()
        activateIndex(enabledIndices[0])
        return
      }
      if (e.key === "End") {
        e.preventDefault()
        activateIndex(enabledIndices[enabledIndices.length - 1])
      }
    },
    [items, activeTab, activateIndex, enabledIndices],
  )

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn("flex gap-0 border-b border-border", className)}
    >
      {items.map((item, index) => {
        const isActive = item.id === activeTab
        const isDisabled = Boolean(item.disabled)
        const tabIndex = isActive ? 0 : -1

        return (
          <button
            key={item.id}
            ref={(el) => {
              tabRefs.current[index] = el
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={isDisabled}
            tabIndex={tabIndex}
            onClick={() => {
              if (!isDisabled) onChange(item.id)
            }}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-base outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0",
              tabClassName,
              isDisabled
                ? "cursor-not-allowed border-transparent opacity-60"
                : isActive
                  ? "cursor-pointer border-action font-medium text-action"
                  : "cursor-pointer border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {item.label}
            {item.count != null ? (
              <span className={cn("tabular-nums", item.countClassName)}> ({item.count})</span>
            ) : null}
            {isDisabled && item.disabledLabel ? (
              <span className="ml-1 text-[13px] text-muted-foreground">({item.disabledLabel})</span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
