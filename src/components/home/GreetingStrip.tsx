import { CloudSun } from "lucide-react"
import { format } from "date-fns"

type GreetingStripProps = {
  firstName: string
  date: Date
  // TODO: derive icon from weather.condition once weather is dynamic.
  weather: { temp: number; condition: string; location: string }
  quote: { text: string; attribution: string }
}

export function GreetingStrip({ firstName, date, weather, quote }: GreetingStripProps) {
  const formattedDate = format(date, "EEEE, MMMM d, yyyy")

  return (
    <section
      aria-label="Daily greeting"
      className="flex min-h-[54px] items-center gap-4 rounded-lg bg-muted px-4 py-2"
    >
      <div className="flex min-w-0 shrink-0 flex-col">
        <p className="text-base font-medium leading-tight text-foreground">
          Howdy, {firstName}
        </p>
        <p className="text-[13px] leading-tight text-muted-foreground">
          {formattedDate}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <CloudSun className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium leading-none text-foreground">
          {weather.temp}°
        </span>
        <span className="text-[13px] text-muted-foreground">
          {weather.condition} · {weather.location}
        </span>
      </div>

      <span aria-hidden className="h-6 w-px shrink-0 bg-border" />

      <p className="min-w-0 shrink truncate text-[13px] italic text-muted-foreground">
        "{quote.text}" — {quote.attribution}
      </p>
    </section>
  )
}
