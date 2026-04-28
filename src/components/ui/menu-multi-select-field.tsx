import { Menu } from "@base-ui/react/menu"
import type { MenuRoot } from "@base-ui/react/menu"
import { Check, ChevronDown } from "lucide-react"
import { useCallback } from "react"
import { appMenuItemClass, appMenuPopupClass, appNativeSelectSurfaceClass } from "@/lib/appDropdownTokens"
import { CheckboxBox } from "@/components/ui/checkbox-box"
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
  /** Controlled open (e.g. one menu at a time inside a filter panel). */
  open?: boolean
  onOpenChange?: (open: boolean, eventDetails: MenuRoot.ChangeEventDetails) => void
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
  open: openControlled,
  onOpenChange,
}: MenuMultiSelectFieldProps) {
  const orderedSelected = options.filter((o) => selectedIds.has(o.id))
  const compact = density === "compact"
  const everyOptionSelected =
    options.length > 0 && options.every((o) => selectedIds.has(o.id))
  const showAllSelectedSummary = Boolean(allSelectedLabel && everyOptionSelected)
  const selectedCount = selectedIds.size
  const hasAnySelected = selectedCount > 0
  const headerLabel = !hasAnySelected ? "Select all" : everyOptionSelected ? "Deselect all" : "Clear selection"
  const headerCheckboxState: boolean | "mixed" = !hasAnySelected
    ? false
    : everyOptionSelected
      ? true
      : "mixed"

  const onHeaderToggle = useCallback(() => {
    if (options.length === 0) return
    if (!hasAnySelected) {
      onChange(new Set(options.map((o) => o.id)))
      return
    }
    // Partial or full selection: clear.
    onChange(new Set())
  }, [hasAnySelected, onChange, options])

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
        <p className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
          {sectionLabel}
        </p>
      ) : null}
      <Menu.Root modal={false} open={openControlled} onOpenChange={onOpenChange}>
        <Menu.Trigger
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          className={cn(
            "flex w-full cursor-pointer items-stretch gap-2 text-left text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            compact ? "min-h-8 h-8 text-[13px]" : "min-h-10 text-sm",
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
              <span className="min-w-0 truncate font-normal text-muted-foreground">{allSelectedLabel}</span>
            ) : orderedSelected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : orderedSelected.length === 1 ? (
              <div
                className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-lg border border-border bg-muted px-2 py-0.5 text-[13px] text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="min-w-0 truncate">{orderedSelected[0]!.label}</span>
                <button
                  type="button"
                  className="shrink-0 rounded p-0.5 leading-none text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                  aria-label={`Remove ${orderedSelected[0]!.label}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(orderedSelected[0]!.id)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  ×
                </button>
              </div>
            ) : (
              <span className="min-w-0 flex-1 truncate text-left text-foreground">
                {orderedSelected.map((o) => o.label).join(", ")}
              </span>
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
              <Menu.Item
                closeOnClick={false}
                onClick={(e) => {
                  e.stopPropagation()
                  onHeaderToggle()
                }}
                className={cn(
                  appMenuItemClass,
                  "mb-1 flex cursor-pointer items-center gap-2 border-b-[0.5px] border-border/60 pb-1 data-[highlighted]:bg-neutral-100"
                )}
              >
                <CheckboxBox checked={headerCheckboxState} />
                <span className="text-sm text-foreground">{headerLabel}</span>
              </Menu.Item>
              {options.map((opt) => (
                <Menu.CheckboxItem
                  key={opt.id}
                  checked={selectedIds.has(opt.id)}
                  closeOnClick={false}
                  onCheckedChange={(checked) => {
                    const n = new Set(selectedIds)
                    if (checked) n.add(opt.id)
                    else n.delete(opt.id)
                    onChange(n)
                  }}
                  className={cn(
                    appMenuItemClass,
                    "flex cursor-pointer items-center gap-2 data-[highlighted]:bg-neutral-100"
                  )}
                >
                  <CheckboxBox checked={selectedIds.has(opt.id)} />
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
  open?: boolean
  onOpenChange?: (open: boolean, eventDetails: MenuRoot.ChangeEventDetails) => void
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
  open: openControlled,
  onOpenChange,
}: MenuRadioSelectFieldProps) {
  const selected = options.find((o) => o.id === value)
  const showChip = selected && value !== clearValueId

  return (
    <div className="flex flex-col gap-1.5">
      {sectionLabel ? (
        <p className="text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
          {sectionLabel}
        </p>
      ) : null}
      <Menu.Root modal={false} open={openControlled} onOpenChange={onOpenChange}>
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
                className="inline-flex max-w-full items-center gap-1 rounded-lg border border-border bg-muted px-2 py-0.5 text-[13px] text-muted-foreground"
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
