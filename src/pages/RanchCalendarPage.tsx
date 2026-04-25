import { useState } from "react"
import { HomeCattleSummaryCard } from "@/components/home/HomeCattleSummaryCard"
import { HomeHorseSummaryCard } from "@/components/home/HomeHorseSummaryCard"
import { HomeSmartSuggestionsCard, type SmartSuggestion } from "@/components/home/HomeSmartSuggestionsCard"
import { GreetingStrip } from "@/components/home/GreetingStrip"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { useLogObservation } from "@/contexts/LogObservationContext"
import { Button } from "@/components/ui/button"

const HOME_SMART_SUGGESTIONS: SmartSuggestion[] = [
  {
    id: "review-flagged-horses",
    title: "Review flagged horses before the next rotation.",
    reasoning:
      "2 horses have flag-level observations in the past 5 days. Cross-check their pasture assignments before the next rotation.",
    action: { label: "Review horses", href: "/horses?healthStatus=flag" },
  },
  {
    id: "log-overdue-pasture-checks",
    title: "Log overdue pasture checks this week.",
    reasoning:
      "3 pastures haven't been checked in over 10 days. Regular cadence catches emerging issues before they escalate.",
    action: { label: "Open pastures", href: "/cattle" },
  },
  {
    id: "ace-wound-stalled",
    title: "Ace's wound healing has stalled",
    reasoning:
      "No improvement noted in the last 3 observations — typically 5-day recovery.",
    action: { label: "Review Ace", href: "/horses/ace" },
  },
]

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
  const { open: openLogObservation } = useLogObservation()
  const firstName = "Chantale"
  const today = new Date()
  const weather = { temp: 52, condition: "Partly cloudy", location: "Spring Creek, WY" }

  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      86400000,
  )
  const currentQuote = RANCH_QUOTES[dayOfYear % RANCH_QUOTES.length]!

  return (
    <>
    <RanchWorkspaceShell
      contentClassName="min-w-0 bg-background px-0 pb-10 pt-6"
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search"
      searchAriaLabel="Search"
    >
      <div className="flex min-w-0 w-full max-w-full flex-col gap-4 px-12">
        <GreetingStrip firstName={firstName} date={today} weather={weather} quote={currentQuote} />

        <div className="grid grid-cols-1 gap-[14px] lg:grid-cols-[1fr_minmax(380px,_460px)] lg:items-start lg:gap-5">
          <div className="flex min-w-0 flex-col gap-[14px]">
            <HomeCattleSummaryCard />
            <HomeHorseSummaryCard />
          </div>
          <aside className="min-w-0 w-full">
            <HomeSmartSuggestionsCard suggestions={HOME_SMART_SUGGESTIONS} />
          </aside>
        </div>
      </div>
    </RanchWorkspaceShell>
    <Button
      type="button"
      variant="primary"
      onClick={openLogObservation}
      className="fixed right-6 z-[60] h-auto min-h-0 px-5 py-[10px] text-[13px] font-medium md:hidden"
      style={{
        boxShadow: "0 4px 14px rgba(72,37,72,0.4)",
        bottom: "max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px))",
      }}
    >
      Log observation
    </Button>
    </>
  )
}
