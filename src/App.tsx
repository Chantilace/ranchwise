import { BrowserRouter, Route, Routes } from "react-router-dom"
import { RanchDataProvider } from "@/contexts/RanchDataContext"
import { LogObservationProvider } from "@/contexts/LogObservationContext"
import { CattleOverviewPage } from "@/pages/CattleOverviewPage"
import { CattleProfileStubPage } from "@/pages/CattleProfileStubPage"
import { HorseProfile } from "@/pages/HorseProfile"
import { HorsesPage } from "@/pages/HorsesPage"
import { PasturesPage } from "@/pages/PasturesPage"
import { PastureRosterPage } from "@/pages/PastureRosterPage"
import { RanchCalendarPage } from "@/pages/RanchCalendarPage"

export default function App() {
  return (
    <BrowserRouter>
      <RanchDataProvider>
        <LogObservationProvider>
          <Routes>
            <Route path="/" element={<RanchCalendarPage />} />
            <Route path="/horses" element={<HorsesPage />} />
            <Route path="/horses/:horseId" element={<HorseProfile />} />
            <Route path="/cattle" element={<CattleOverviewPage />} />
            <Route path="/cattle/animal/:cattleId" element={<CattleProfileStubPage />} />
            <Route path="/pastures" element={<PasturesPage />} />
            <Route path="/pastures/:pastureId" element={<PastureRosterPage />} />
            <Route path="/pastures/:pastureId/:cattleId" element={<CattleProfileStubPage />} />
          </Routes>
        </LogObservationProvider>
      </RanchDataProvider>
    </BrowserRouter>
  )
}
