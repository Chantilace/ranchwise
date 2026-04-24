import { Menu } from "@base-ui/react/menu"
import type { ComponentProps, ReactNode } from "react"
import {
  appMenuItemClass,
  appMenuItemDestructiveClass,
  appMenuOverflowTriggerClass,
  appMenuPopupClass,
} from "@/lib/appDropdownTokens"
import { cn } from "@/lib/utils"

/**
 * Ranch Co-Pilot overflow menus — Base UI `Menu` with shared tokens (Figma-aligned).
 * Compose: `AppOverflowMenu` → `AppOverflowMenuTrigger` + `AppOverflowMenuContent` → `AppOverflowMenuItem`.
 */
export function AppOverflowMenu({ children }: { children: ReactNode }) {
  return <Menu.Root modal={false}>{children}</Menu.Root>
}

export type AppOverflowMenuTriggerProps = ComponentProps<typeof Menu.Trigger>

export function AppOverflowMenuTrigger({ className, ...props }: AppOverflowMenuTriggerProps) {
  return <Menu.Trigger className={cn(appMenuOverflowTriggerClass, className)} {...props} />
}

export type AppOverflowMenuContentProps = Omit<ComponentProps<typeof Menu.Positioner>, "children"> & {
  children: React.ReactNode
}

export function AppOverflowMenuContent({
  align = "start",
  side = "bottom",
  sideOffset = 4,
  className,
  children,
  ...positionerProps
}: AppOverflowMenuContentProps) {
  return (
    <Menu.Portal>
      <Menu.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={cn("z-[100] outline-none", className)}
        {...positionerProps}
      >
        <Menu.Popup className={appMenuPopupClass}>{children}</Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )
}

export type AppOverflowMenuItemProps = ComponentProps<typeof Menu.Item> & {
  destructive?: boolean
}

export function AppOverflowMenuItem({
  destructive,
  className,
  ...props
}: AppOverflowMenuItemProps) {
  return (
    <Menu.Item
      className={cn(destructive ? appMenuItemDestructiveClass : appMenuItemClass, className)}
      {...props}
    />
  )
}
