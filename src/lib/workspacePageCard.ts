/** Scroll area behind list/profile workspace pages (page background). */
export const WORKSPACE_PAGE_SCROLL_CLASS =
  "min-h-0 flex-1 gap-0 bg-background pb-[var(--scroll-area-bottom-pad)]"

/**
 * Cancels `RanchWorkspaceShell` scroll column top padding (`pt-3` / `sm:pt-5` / `lg:pt-6`) so
 * profile breadcrumb headers sit flush under the global header. Merge with `contentClassName`.
 */
export const WORKSPACE_PAGE_SHELL_FLUSH_TOP_CLASS = "pt-0 sm:pt-0 lg:pt-0"

/**
 * Roster + side panel: fill the shell content column (no outer vertical scroll).
 * Shell already applies horizontal padding and bottom safe-area padding.
 */
export const WORKSPACE_PAGE_ROSTER_FILL_CLASS =
  "min-h-0 flex-1 flex-col gap-0 overflow-hidden bg-background"

/** Primary content wrapper — flush on page background (no card chrome). `gap-6` matches home vertical rhythm between title and body. */
export const WORKSPACE_PAGE_CARD_CLASS =
  "flex min-w-0 flex-col gap-6 px-4 pt-4 sm:px-6 sm:pt-5 lg:px-12 lg:pt-6"
