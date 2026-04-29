/* eslint-disable react-refresh/only-export-components -- provider + hooks share module */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type OverlayRegistryApi = {
  registerOverlay: (id: string) => void
  unregisterOverlay: (id: string) => void
  hasOpenOverlay: boolean
}

const OverlayRegistryContext = createContext<OverlayRegistryApi | null>(null)

export function OverlayRegistryProvider({ children }: { children: ReactNode }) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())

  const registerOverlay = useCallback((id: string) => {
    setOpenIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const unregisterOverlay = useCallback((id: string) => {
    setOpenIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const value = useMemo<OverlayRegistryApi>(
    () => ({
      registerOverlay,
      unregisterOverlay,
      hasOpenOverlay: openIds.size > 0,
    }),
    [openIds.size, registerOverlay, unregisterOverlay],
  )

  return <OverlayRegistryContext.Provider value={value}>{children}</OverlayRegistryContext.Provider>
}

export function useOverlayRegistry(): OverlayRegistryApi {
  const v = useContext(OverlayRegistryContext)
  if (!v) throw new Error("useOverlayRegistry must be used within OverlayRegistryProvider")
  return v
}

/**
 * Registers an overlay id while open, and reliably unregisters on close or unmount.
 * If `id` is omitted, a stable component id is generated via `useId()`.
 */
export function useOverlayRegistration(isOpen: boolean, id?: string) {
  const generatedId = useId()
  const overlayId = id ?? generatedId
  const { registerOverlay, unregisterOverlay } = useOverlayRegistry()

  useEffect(() => {
    if (!isOpen) return
    registerOverlay(overlayId)
    return () => unregisterOverlay(overlayId)
  }, [isOpen, overlayId, registerOverlay, unregisterOverlay])
}

