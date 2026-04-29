import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"
import { RanchDataProvider } from "@/contexts/RanchDataContext"
import { OverlayRegistryProvider } from "@/contexts/OverlayRegistryContext"
import { LogObservationProvider } from "@/contexts/LogObservationContext"
import { CattleOverviewPage } from "@/pages/CattleOverviewPage"
import { CattleProfileStubPage } from "@/pages/CattleProfileStubPage"
import { HorseProfile } from "@/pages/HorseProfile"
import { HorsesPage } from "@/pages/HorsesPage"
import { PasturesPage } from "@/pages/PasturesPage"
import { PastureProfilePage } from "@/pages/PastureProfilePage"
import { PastureRosterPage } from "@/pages/PastureRosterPage"
import { RanchCalendarPage } from "@/pages/RanchCalendarPage"
import { WorkspacePlaceholderPage } from "@/pages/WorkspacePlaceholderPage"

export default function App() {
  return (
    <BrowserRouter>
      <div className="h-full min-h-0 overflow-hidden">
        <OverlayRegistryProvider>
          <RanchDataProvider>
            <LogObservationProvider>
              <Toaster
                position="bottom-center"
                closeButton={false}
                theme="light"
                duration={4000}
              />
              <Routes>
                <Route path="/" element={<RanchCalendarPage />} />
                <Route path="/horses" element={<HorsesPage />} />
                <Route path="/horses/:horseId" element={<HorseProfile />} />
                <Route path="/cattle" element={<CattleOverviewPage />} />
                <Route path="/cattle/animal/:cattleId" element={<CattleProfileStubPage />} />
                <Route path="/pastures" element={<PasturesPage />} />
                <Route path="/pastures/:pastureId/roster" element={<PastureRosterPage />} />
                <Route path="/pastures/:pastureId" element={<PastureProfilePage />} />
                <Route path="/pastures/:pastureId/:cattleId" element={<CattleProfileStubPage />} />
                <Route path="/account" element={<WorkspacePlaceholderPage title="Account" />} />
                <Route path="/settings" element={<WorkspacePlaceholderPage title="Settings" />} />
                <Route path="/help" element={<WorkspacePlaceholderPage title="Help & support" />} />
              </Routes>
            </LogObservationProvider>
          </RanchDataProvider>
        </OverlayRegistryProvider>
      </div>
    </BrowserRouter>
  )
}
