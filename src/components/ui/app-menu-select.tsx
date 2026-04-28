import { Menu } from "@base-ui/react/menu"
import { ChevronDown, type LucideIcon } from "lucide-react"
import { appMenuItemClass, appMenuPopupClass, appMenuSelectTriggerClass, appMenuSelectTriggerCompactClass } from "@/lib/appDropdownTokens"
import { WORKSPACE_TOOLBAR_DROPDOWN_TRIGGER_CLASS } from "@/lib/workspaceToolbarDropdownTrigger"
import { cn } from "@/lib/utils"

export type AppMenuSelectOption = { value: string; label: string }

export type AppMenuSelectProps = {
  value: string
  onValueChange: (next: string) => void
  options: AppMenuSelectOption[]
  /** Shown in the trigger when `value` is empty or not found in `options`. */
  placeholder?: string
  disabled?: boolean
  id?: string
  "aria-label"?: string
  className?: string
  /** `compact` matches small inline selects (e.g. activity log category). `toolbar` matches {@link EntityFilterToolbar}. */
  variant?: "default" | "compact" | "toolbar"
  /** Leading icon for `variant="toolbar"` (e.g. sort icon). */
  leadingIcon?: LucideIcon
  /** Max height for long lists inside the menu popup. */
  popupMaxHeightClassName?: string
  /** Merged onto the chevron icon (e.g. `size-3.5` for compact toolbar triggers). */
  chevronClassName?: string
  /** When set, shown as the trigger label instead of resolving from `options` + `value`. */
  triggerLabel?: string
}

/**
 * Single-select field using the same Base UI `Menu` + popup tokens as overflow menus.
 */
export function AppMenuSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  disabled,
  id,
  "aria-label": ariaLabel,
  className,
  variant = "default",
  leadingIcon: LeadingIcon,
  popupMaxHeightClassName = "max-h-60 overflow-y-auto",
  chevronClassName,
  triggerLabel: triggerLabelOverride,
}: AppMenuSelectProps) {
  const selected = options.find((o) => o.value === value)
  const triggerLabel =
    triggerLabelOverride ??
    selected?.label ??
    (value !== "" ? value : placeholder)
  const muted = !selected && value === "" && triggerLabelOverride == null

  const triggerClass =
    variant === "toolbar"
      ? WORKSPACE_TOOLBAR_DROPDOWN_TRIGGER_CLASS
      : variant === "compact"
        ? appMenuSelectTriggerCompactClass
        : appMenuSelectTriggerClass

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        type="button"
        disabled={disabled}
        id={id}
        aria-label={ariaLabel}
        className={cn(triggerClass, variant === "toolbar" && "w-auto min-w-0", className)}
      >
        {variant === "toolbar" && LeadingIcon ? (
          <LeadingIcon className="size-3 shrink-0 text-muted-foreground" strokeWidth={2} aria-hidden />
        ) : null}
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            muted && variant !== "toolbar" && "text-muted-foreground",
            variant === "toolbar" && "text-[var(--color-text-primary)]",
          )}
        >
          {triggerLabel}
        </span>
        <ChevronDown
          className={cn(
            variant === "toolbar" ? "size-3 shrink-0 text-muted-foreground" : "size-4 shrink-0 text-muted-foreground",
            chevronClassName,
          )}
          strokeWidth={variant === "toolbar" ? 2 : undefined}
          aria-hidden
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={4} className="z-[100] outline-none">
          <Menu.Popup
            className={cn(
              appMenuPopupClass,
              "min-w-[var(--anchor-width)] w-[var(--anchor-width)]",
              popupMaxHeightClassName
            )}
          >
            {options.map((o) => (
              <Menu.Item
                key={o.value === "" ? "__empty__" : o.value}
                className={appMenuItemClass}
                onClick={() => onValueChange(o.value)}
              >
                {o.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
