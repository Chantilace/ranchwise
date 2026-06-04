import { format } from "date-fns"
import { useState } from "react"
import { HomeCattleSummaryCard } from "@/components/home/HomeCattleSummaryCard"
import { HomeHorseSummaryCard } from "@/components/home/HomeHorseSummaryCard"
import { HomeRecentObservationsCard } from "@/components/home/HomeRecentObservationsCard"
import { HomeSmartSuggestionsSection } from "@/components/home/HomeSmartSuggestionsSection"
import { HomeWeatherQuotePill } from "@/components/home/HomeWeatherQuotePill"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { CURRENT_USER } from "@/lib/workspaceIdentity"

const RANCH_QUOTES = [
  {
    text: "Take care of your land and your land will take care of you.",
    attribution: "Ranch proverb",
  },
  {
    text: "The best view comes after the hardest climb.",
    attribution: "Ranch proverb",
  },
  {
    text: "A good rancher knows every animal by name.",
    attribution: "Ranch proverb",
  },
  {
    text: "The morning belongs to those who rise with the sun.",
    attribution: "Ranch proverb",
  },
  {
    text: "Slow is smooth, smooth is fast.",
    attribution: "Ranch proverb",
  },
] as const

export function RanchCalendarPage() {
  const [search, setSearch] = useState("")
  const firstName = CURRENT_USER.name
  const today = new Date()
  const weather = { temp: 52, condition: "Partly cloudy", location: "Spring Creek, WY" }

  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      86400000,
  )
  const currentQuote = RANCH_QUOTES[dayOfYear % RANCH_QUOTES.length]!

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
        <div className="mb-4 flex min-w-0 flex-nowrap items-start gap-4">
          <div className="min-w-0 shrink-0">
            <p className="mb-0.5 whitespace-nowrap text-[18px] font-medium leading-tight text-foreground xl:text-[22px]">
              Howdy, {firstName}
            </p>
            <p className="text-[13px] text-muted-foreground">
              <span className="xl:hidden">{format(today, "EEE, MMM d, yyyy")}</span>
              <span className="hidden xl:inline">{format(today, "EEEE, MMMM d, yyyy")}</span>
            </p>
          </div>
          <HomeWeatherQuotePill weather={weather} quoteText={currentQuote.text} className="ml-auto shrink min-w-0" />
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
