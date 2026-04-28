import { useEffect } from "react"

/**
 * Close a popover/panel when pointerdown happens outside `ref`.
 * Supports ignoring clicks that originate from portalled/nested popovers via selectors.
 * `[role="menu"]` covers Base UI `Menu.Portal` popups (e.g. filter dropdowns) that render outside the anchor ref.
 */
export function useCloseOnOutsidePointerDown({
  open,
  setOpen,
  ref,
  ignoreClosestSelectors = ["[data-ranch-filter-popover]", '[role="menu"]'],
}: {
  open: boolean
  setOpen: (next: boolean) => void
  ref: React.RefObject<HTMLElement | null>
  ignoreClosestSelectors?: readonly string[]
}) {
  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      const el = e.target as Element | null
      if (el && ignoreClosestSelectors.some((sel) => el.closest(sel))) return
      const t = e.target as Node
      if (ref.current && ref.current.contains(t)) return
      setOpen(false)
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [open, ref, setOpen, ignoreClosestSelectors])
}

