import { CloudSun } from "lucide-react"

import { homepageMutedSurfaceChromeClass } from "@/lib/homePageCardChrome"
import { cn } from "@/lib/utils"

type HomeWeatherQuotePillProps = {
  weather: { temp: number; condition: string; location: string }
  quoteText: string
  className?: string
}

/** Weather + ranch proverb pill (sits top-right beside greeting on the dashboard). */
export function HomeWeatherQuotePill({ weather, quoteText, className }: HomeWeatherQuotePillProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-full flex-nowrap items-start gap-3 rounded-[var(--border-radius-md)] px-3 py-2.5",
        homepageMutedSurfaceChromeClass,
        className,
      )}
      style={{ background: "var(--color-background-secondary)" }}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-3">
        <CloudSun className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} aria-hidden />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[13px] font-medium leading-none text-foreground">{weather.temp}°</span>
          <span className="text-[13px] leading-snug text-[var(--color-text-secondary)]">
            {weather.condition} · {weather.location}
          </span>
        </div>
      </div>
      <div className="hidden min-w-0 shrink md:flex md:min-w-0 md:flex-1 md:items-center md:gap-2.5">
        <div className="h-3 w-px shrink-0 bg-[var(--color-border-tertiary)]" aria-hidden />
        <span className="min-w-0 flex-1 text-[13px] leading-snug italic text-[var(--color-text-tertiary)]">
          {quoteText}
        </span>
      </div>
    </div>
  )
}
