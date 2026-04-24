import { Menu } from "@base-ui/react/menu"
import { Check, ChevronDown } from "lucide-react"
import { useCallback } from "react"
import { appMenuItemClass, appMenuPopupClass, appNativeSelectSurfaceClass } from "@/lib/appDropdownTokens"
import { cn } from "@/lib/utils"

export type MenuMultiSelectOption = { id: string; label: string }

export interface MenuMultiSelectFieldProps {
  options: readonly MenuMultiSelectOption[]
  selectedIds: ReadonlySet<string>
  onChange: (next: Set<string>) => void
  placeholder?: string
  disabled?: boolean
  "aria-label"?: string
  /** Uppercase micro-label above the trigger (e.g. FEED, Calving status). */
  sectionLabel?: string
  /** Merged onto the outer wrapper. */
  className?: string
  /** Merged onto `Menu.Trigger` (e.g. `w-auto` for inline toolbars). */
  triggerClassName?: string
  /** When every option is selected, show this label instead of one chip per option. */
  allSelectedLabel?: string
  /** `compact` matches small inline controls (e.g. `AppMenuSelect` compact). */
  density?: "default" | "compact"
}

export function MenuMultiSelectField({
  options,
  selectedIds,
  onChange,
  placeholder = "Select…",
  disabled = false,
  "aria-label": ariaLabel,
  sectionLabel,
  className,
  triggerClassName,
  allSelectedLabel,
  density = "default",
}: MenuMultiSelectFieldProps) {
  const orderedSelected = options.filter((o) => selectedIds.has(o.id))
  const compact = density === "compact"
  const everyOptionSelected =
    options.length > 0 && options.every((o) => selectedIds.has(o.id))
  const showAllSelectedSummary = Boolean(allSelectedLabel && everyOptionSelected)

  const toggle = useCallback(
    (id: string) => {
      const n = new Set(selectedIds)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      onChange(n)
    },
    [onChange, selectedIds]
  )

  const remove = useCallback(
    (id: string) => {
      const n = new Set(selectedIds)
      n.delete(id)
      onChange(n)
    },
    [onChange, selectedIds]
  )

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {sectionLabel ? (
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {sectionLabel}
        </p>
      ) : null}
      <Menu.Root modal={false}>
        <Menu.Trigger
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          className={cn(
            "flex w-full cursor-pointer items-stretch gap-2 text-left text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            compact ? "min-h-8 h-8 text-xs" : "min-h-10 text-sm",
            appNativeSelectSurfaceClass,
            triggerClassName
          )}
        >
          <div
            className={cn(
              "flex min-w-0 flex-1 flex-wrap items-center",
              compact ? "gap-1 px-2 py-1" : "gap-1.5 px-3 py-2"
            )}
          >
            {showAllSelectedSummary ? (
              <span className="min-w-0 truncate font-normal text-foreground">{allSelectedLabel}</span>
            ) : orderedSelected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              orderedSelected.map((opt) => (
                <div
                  key={opt.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span className="min-w-0 truncate">{opt.label}</span>
                  <button
                    type="button"
                    className="shrink-0 rounded p-0.5 leading-none text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                    aria-label={`Remove ${opt.label}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      remove(opt.id)
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="flex shrink-0 items-center border-l border-neutral-200/90 px-2">
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </div>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={4} className="z-[100] outline-none">
            <Menu.Popup
              className={cn(
                appMenuPopupClass,
                "max-h-60 min-w-[var(--anchor-width)] w-[var(--anchor-width)] overflow-y-auto"
              )}
            >
              {options.map((opt) => (
                <Menu.CheckboxItem
                  key={opt.id}
                  checked={selectedIds.has(opt.id)}
                  closeOnClick={false}
                  onCheckedChange={() => toggle(opt.id)}
                  className={cn(
                    appMenuItemClass,
                    "flex cursor-pointer items-center gap-2 data-[highlighted]:bg-neutral-100"
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center text-action">
                    <Menu.CheckboxItemIndicator keepMounted className="flex size-4 items-center justify-center">
                      <Check className="size-4" strokeWidth={2.5} aria-hidden />
                    </Menu.CheckboxItemIndicator>
                  </span>
                  {opt.label}
                </Menu.CheckboxItem>
              ))}
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}

export interface MenuRadioSelectFieldProps {
  options: readonly MenuMultiSelectOption[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
  disabled?: boolean
  "aria-label"?: string
  sectionLabel?: string
  /** When set, chip shows × to reset to this id (e.g. "all"). */
  clearValueId?: string
}

export function MenuRadioSelectField({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  "aria-label": ariaLabel,
  sectionLabel,
  clearValueId = "all",
}: MenuRadioSelectFieldProps) {
  const selected = options.find((o) => o.id === value)
  const showChip = selected && value !== clearValueId

  return (
    <div className="flex flex-col gap-1.5">
      {sectionLabel ? (
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {sectionLabel}
        </p>
      ) : null}
      <Menu.Root modal={false}>
        <Menu.Trigger
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          className={cn(
            "flex min-h-10 w-full cursor-pointer items-stretch gap-2 text-left text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            appNativeSelectSurfaceClass
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 px-3 py-2">
            {showChip && selected ? (
              <div
                className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="min-w-0 truncate">{selected.label}</span>
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 leading-none text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  aria-label={`Clear ${selected.label}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onChange(clearValueId)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  ×
                </button>
              </div>
            ) : (
              <span className="text-muted-foreground">{selected?.label ?? placeholder}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center border-l border-neutral-200/90 px-2">
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </div>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner side="bottom" align="start" sideOffset={4} className="z-[100] outline-none">
            <Menu.Popup
              className={cn(
                appMenuPopupClass,
                "max-h-60 min-w-[var(--anchor-width)] w-[var(--anchor-width)] overflow-y-auto"
              )}
            >
              <Menu.RadioGroup value={value} onValueChange={(v) => onChange(String(v))}>
                {options.map((opt) => (
                  <Menu.RadioItem
                    key={opt.id}
                    value={opt.id}
                    closeOnClick
                    className={cn(
                      appMenuItemClass,
                      "flex cursor-pointer items-center gap-2 data-[highlighted]:bg-neutral-100"
                    )}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center text-action">
                      <Menu.RadioItemIndicator keepMounted className="flex size-4 items-center justify-center">
                        <Check className="size-4" strokeWidth={2.5} aria-hidden />
                      </Menu.RadioItemIndicator>
                    </span>
                    {opt.label}
                  </Menu.RadioItem>
                ))}
              </Menu.RadioGroup>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  )
}
