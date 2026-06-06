import { FormLabel } from "@/components/ui/form-label"
import { summarizeCalvingDraft, type CalvingEventDraft } from "@/lib/cattleCalvingEvent"

/** Read-only review of a recorded calving event, shown in the result/review step. Renders nothing when disabled. */
export function CattleCalvingEventSummary({ value }: { value: CalvingEventDraft }) {
  const rows = summarizeCalvingDraft(value)
  if (!rows) return null
  return (
    <div className="flex flex-col gap-1.5">
      <FormLabel variant="default">Calving event</FormLabel>
      <dl className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[13px] text-muted-foreground">{row.label}</dt>
            <dd className="text-[13px] font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
