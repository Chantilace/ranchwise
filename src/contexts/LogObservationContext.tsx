import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { LogObservationSheet } from "@/components/home/LogObservationSheet"

type LogObservationContextValue = {
  open: () => void
}

const LogObservationContext = createContext<LogObservationContextValue>({
  open: () => {},
})

export function LogObservationProvider({ children }: { children: ReactNode }) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const open = useCallback(() => setSheetOpen(true), [])

  return (
    <LogObservationContext.Provider value={{ open }}>
      {children}
      <LogObservationSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </LogObservationContext.Provider>
  )
}

export function useLogObservation() {
  return useContext(LogObservationContext)
}
