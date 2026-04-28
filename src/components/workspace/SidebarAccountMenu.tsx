import { Menu } from "@base-ui/react/menu"
import { ChevronDown, HelpCircle, LogOut, Settings, User } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import {
  appMenuItemClass,
  appMenuItemDestructiveClass,
  appMenuPopupClass,
} from "@/lib/appDropdownTokens"
import { CURRENT_USER } from "@/lib/workspaceIdentity"
import { cn } from "@/lib/utils"

const rowTriggerClass =
  "w-full rounded-lg bg-[rgba(0,0,0,0.15)] transition-colors outline-none hover:bg-[rgba(0,0,0,0.25)] focus-visible:ring-2 focus-visible:ring-sidebar-ring/35"

type SidebarAccountMenuProps = {
  /** Desktop sidebar expanded (wide) vs icon rail. */
  sidebarExpanded: boolean
  /** Dark slide-over drawer uses the same row treatment as expanded desktop. */
  variant: "sidebar" | "drawer"
  /** e.g. close mobile nav after choosing a destination. */
  onAfterNavigate?: () => void
}

export function SidebarAccountMenu({
  sidebarExpanded,
  variant,
  onAfterNavigate,
}: SidebarAccountMenuProps) {
  const navigate = useNavigate()
  const showLabels = variant === "drawer" || sidebarExpanded

  const handleSignOut = () => {
    onAfterNavigate?.()
    toast.message("Signed out (demo)")
  }

  const go = (path: string) => {
    navigate(path)
    onAfterNavigate?.()
  }

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        className={cn(
          rowTriggerClass,
          showLabels ? "flex items-center gap-2.5 p-3 text-left" : "flex flex-col items-center gap-1 px-2 py-2.5",
        )}
        aria-label={`Account menu for ${CURRENT_USER.name}`}
      >
        <span className="relative size-9 shrink-0 overflow-hidden rounded-xl">
          {CURRENT_USER.avatarUrl ? (
            <img
              src={CURRENT_USER.avatarUrl}
              alt={CURRENT_USER.name}
              className="size-full object-cover object-center"
            />
          ) : (
            <span className="flex size-full items-center justify-center bg-ai-accent text-[14px] font-medium text-white">
              {CURRENT_USER.initials}
            </span>
          )}
        </span>
        {showLabels ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight text-white">{CURRENT_USER.name}</p>
              <p className="truncate text-[13px] leading-tight text-white/60">{CURRENT_USER.email}</p>
            </div>
            <ChevronDown className="size-3.5 shrink-0 text-white/50" strokeWidth={2} aria-hidden />
          </>
        ) : (
          <ChevronDown className="size-3.5 shrink-0 text-white/50" strokeWidth={2} aria-hidden />
        )}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={8} className="z-[220] outline-none">
          <Menu.Popup className={cn(appMenuPopupClass, "min-w-[220px]")}>
            <Menu.Item
              className={cn(appMenuItemClass, "gap-2")}
              onClick={() => {
                go("/account")
              }}
            >
              <User className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              Account
            </Menu.Item>
            <Menu.Item
              className={cn(appMenuItemClass, "gap-2")}
              onClick={() => {
                go("/settings")
              }}
            >
              <Settings className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              Settings
            </Menu.Item>
            <Menu.Item
              className={cn(appMenuItemClass, "gap-2")}
              onClick={() => {
                go("/help")
              }}
            >
              <HelpCircle className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              {"Help & support"}
            </Menu.Item>
            <Menu.Separator className="mx-2 my-1.5 h-px shrink-0 border-0 bg-neutral-200" />
            <Menu.Item className={cn(appMenuItemDestructiveClass, "gap-2")} onClick={handleSignOut}>
              <LogOut className="size-4 shrink-0" aria-hidden />
              Sign out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
