import { CloudSun } from "lucide-react"

import { homepageCardChromeClass } from "@/lib/homePageCardChrome"
import { cn } from "@/lib/utils"

export type HomeWeatherData = {
  temp: number
  condition: string
  location: string
  hi: number
  lo: number
  wind: string
}

type HomeWeatherCardProps = {
  weather: HomeWeatherData
  className?: string
}

/** Structured weather card — sits top-right beside the greeting on the dashboard. */
export function HomeWeatherCard({ weather, className }: HomeWeatherCardProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-nowrap items-center gap-4 rounded-[var(--radius)] px-4 py-3",
        homepageCardChromeClass,
        className,
      )}
    >
      {/* Icon + temp + condition (always visible) */}
      <div className="flex shrink-0 items-center gap-2.5">
        <CloudSun className="size-5 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden />
        <div className="flex items-baseline gap-1.5">
          <span className="text-[18px] font-semibold leading-none text-foreground">{weather.temp}°</span>
          <span className="text-[13px] text-muted-foreground">{weather.condition}</span>
        </div>
      </div>

      {/* Compact: just location, shown on small screens */}
      <span className="text-[13px] text-muted-foreground md:hidden">· {weather.location}</span>

      {/* Expanded: structured columns, shown md+ */}
      <div className="hidden md:flex md:items-center md:gap-5">
        <div className="h-4 w-px shrink-0 bg-border" aria-hidden />
        <div className="flex items-start gap-5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Hi / Lo</span>
            <span className="text-[13px] font-medium text-foreground">{weather.hi}° / {weather.lo}°</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Wind</span>
            <span className="text-[13px] font-medium text-foreground">{weather.wind}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Location</span>
            <span className="text-[13px] font-medium text-foreground">{weather.location}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
