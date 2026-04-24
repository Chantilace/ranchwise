import { format } from "date-fns"
import { useState } from "react"
import { HomeTodoSection } from "@/components/home/HomeTodoSection"
import { HomeCattleSummaryCard } from "@/components/home/HomeCattleSummaryCard"
import { HomeHorseSummaryCard } from "@/components/home/HomeHorseSummaryCard"
import { HomeSmartSuggestionsCard } from "@/components/home/HomeSmartSuggestionsCard"
import { LogObservationSheet } from "@/components/home/LogObservationSheet"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const HOME_SMART_SUGGESTIONS = [
  "Review flagged horses before the next rotation.",
  "Log overdue pasture checks this week.",
  "Confirm May branding dates with your crew.",
] as const

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
  const [logObservationSheetOpen, setLogObservationSheetOpen] = useState(false)
  const firstName = "Chantale"
  const today = new Date()
  const formattedDate = format(today, "EEEE, MMMM d, yyyy")

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86400000,
  )
  const currentQuote = RANCH_QUOTES[dayOfYear % RANCH_QUOTES.length]!

  const openLogObservationSheet = () => setLogObservationSheetOpen(true)

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
        {/* Banner — Log observation CTA top-right, hug contents */}
        <div className="relative min-w-0 w-full">
          <div
            className="relative h-[160px] w-full overflow-hidden rounded-[14px] md:h-[150px]"
            style={{
              boxShadow: "0 2px 14px rgba(72,37,72,0.14)",
            }}
          >
            <img
              src="https://images.unsplash.com/photo-1650397306390-86caaefce1a3?q=80&w=2070&auto=format&fit=crop"
              alt="Ranch"
              className="h-full w-full object-cover object-center"
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ boxShadow: "inset 0 0 60px rgba(10,5,2,0.65)" }}
            />
            <div className="absolute inset-0 flex flex-col justify-between gap-3 p-[14px_16px]">
              <div className="flex items-start justify-between gap-3">
                <div
                  className="banner-glass self-start rounded-[9px] px-2.5 py-1.5 md:px-3 md:py-[7px]"
                  style={{
                    background: "rgba(20,10,5,0.55)",
                    border: "0.5px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <p className="mb-0.5 text-[17px] font-medium leading-tight tracking-[-0.01em] text-white">
                    Howdy, {firstName}.
                  </p>
                  <p className="text-[11px] text-[rgba(255,255,255,0.65)]">
                    {formattedDate}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="primary-dark"
                  className="hidden h-9 min-h-9 shrink-0 px-4 md:inline-flex"
                  onClick={openLogObservationSheet}
                >
                  Log observation
                </Button>
              </div>
              <div
                className="banner-glass flex max-w-full self-start items-center gap-3 rounded-[9px] px-3 py-2"
                style={{
                  background: "rgba(20,10,5,0.55)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                }}
              >
                <div className="flex shrink-0 items-center gap-2">
                  <p className="text-[22px] font-medium leading-none text-white">
                    52°
                  </p>
                  <div
                    className="pl-2"
                    style={{ borderLeft: "0.5px solid rgba(255,255,255,0.2)" }}
                  >
                    <p className="mb-0.5 text-[9px] font-medium uppercase tracking-[0.07em] text-[rgba(255,255,255,0.45)]">
                      Spring Creek, WY
                    </p>
                    <p className="text-[10px] text-[rgba(255,255,255,0.65)]">
                      Partly cloudy
                    </p>
                  </div>
                </div>
                <div
                  className="h-[28px] w-px shrink-0"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="mb-0.5 line-clamp-2 text-[12px] italic leading-[1.45] text-[rgba(255,255,255,0.88)] md:line-clamp-none md:whitespace-nowrap">
                    {'"'}{currentQuote.text}{'"'}
                  </p>
                  <p className="text-[10px] text-[rgba(255,255,255,0.35)]">
                    — {currentQuote.attribution}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <HomeTodoSection />

        <div className="lg:hidden">
          <HomeSmartSuggestionsCard suggestions={HOME_SMART_SUGGESTIONS} />
        </div>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium tracking-[-0.01em] text-foreground">Overview</h2>
          <div
            className={cn(
              "grid min-h-0 items-stretch gap-4",
              "grid-cols-1 md:grid-cols-2",
              /** Cattle + horse share 3/4; smart suggestions 1/4 (`3fr + 3fr + 2fr`). */
              "lg:grid-cols-[3fr_3fr_2fr]"
            )}
          >
            <HomeCattleSummaryCard />
            <HomeHorseSummaryCard />
            <div className="hidden min-w-0 self-start lg:block">
              <HomeSmartSuggestionsCard suggestions={HOME_SMART_SUGGESTIONS} />
            </div>
          </div>
        </section>
      </div>
    </RanchWorkspaceShell>
    <LogObservationSheet open={logObservationSheetOpen} onOpenChange={setLogObservationSheetOpen} />
    <Button
      type="button"
      variant="primary-dark"
      onClick={openLogObservationSheet}
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
