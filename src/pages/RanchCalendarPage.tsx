import { format } from "date-fns"
import { useState } from "react"
import { HomeCattleSummaryCard } from "@/components/home/HomeCattleSummaryCard"
import { HomeHorseSummaryCard } from "@/components/home/HomeHorseSummaryCard"
import { HomeRecentObservationsCard } from "@/components/home/HomeRecentObservationsCard"
import { HomeSmartSuggestionsSection } from "@/components/home/HomeSmartSuggestionsSection"
import { HomeWeatherCard } from "@/components/home/HomeWeatherQuotePill"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { CURRENT_USER } from "@/lib/workspaceIdentity"
import { homepageCardChromeClass } from "@/lib/homePageCardChrome"
import { cn } from "@/lib/utils"

export function RanchCalendarPage() {
  const [search, setSearch] = useState("")
  const firstName = CURRENT_USER.name
  const today = new Date()
  const weather = {
    temp: 52,
    condition: "Partly cloudy",
    location: "Spring Creek, WY",
    hi: 58,
    lo: 41,
    wind: "WSW 12 mph",
  }

  return (
    <RanchWorkspaceShell
      showGlobalFab
      contentClassName="min-w-0 bg-[#FDFDFB] pb-10"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search"
      searchAriaLabel="Search"
    >
      <div className="flex min-w-0 w-full max-w-full flex-col gap-4">
        <div className="mb-4 flex min-w-0 flex-nowrap items-center gap-4">
          <div className={cn("shrink-0 rounded-[var(--radius)] px-4 py-3", homepageCardChromeClass)}>
            <p className="mb-0.5 whitespace-nowrap text-[18px] font-medium leading-tight text-foreground xl:text-[22px]">
              Howdy, {firstName}
            </p>
            <p className="text-[13px] text-muted-foreground">
              <span className="xl:hidden">{format(today, "EEE, MMM d, yyyy")}</span>
              <span className="hidden xl:inline">{format(today, "EEEE, MMMM d, yyyy")}</span>
            </p>
          </div>
          <HomeWeatherCard weather={weather} className="ml-auto" />
        </div>

        <div className="grid min-h-0 grid-cols-1 gap-3 md:grid-cols-[1fr_1.4fr]">
          <div className="min-h-0 min-w-0 h-full">
            <HomeCattleSummaryCard />
          </div>
          <div className="min-h-0 min-w-0 h-full">
            <HomeHorseSummaryCard />
          </div>
        </div>

        <HomeSmartSuggestionsSection />

        <HomeRecentObservationsCard />
      </div>
    </RanchWorkspaceShell>
  )
}
