import { FormLabel } from "@/components/ui/form-label"
import { cn } from "@/lib/utils"
import {
  CALVING_CALF_OPTIONS,
  CALVING_COMPLICATION_OPTIONS,
  CALVING_DELIVERY_OPTIONS,
  CALVING_STAGE_OPTIONS,
  type CalvingEventDraft,
} from "@/lib/cattleCalvingEvent"
import type { CalvingComplication } from "@/types/cattle"

function Pill({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
        selected
          ? "border-action bg-action text-action-foreground"
          : "border-border bg-background text-foreground hover:bg-muted/60"
      )}
    >
      {children}
    </button>
  )
}

export function CattleCalvingEventFields({
  value,
  onChange,
  disabled,
}: {
  value: CalvingEventDraft
  onChange: (next: CalvingEventDraft) => void
  disabled?: boolean
}) {
  const set = (patch: Partial<CalvingEventDraft>) => onChange({ ...value, ...patch })

  const toggleComplication = (id: CalvingComplication) => {
    if (id === "none") {
      set({ complications: ["none"] })
      return
    }
    const without = value.complications.filter((c) => c !== "none" && c !== id)
    const next = value.complications.includes(id) ? without : [...without, id]
    set({ complications: next.length > 0 ? next : ["none"] })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <FormLabel variant="default">Record calving event</FormLabel>
        <button
          type="button"
          role="switch"
          aria-checked={value.enabled}
          aria-label="Record calving event"
          disabled={disabled}
          onClick={() => set({ enabled: !value.enabled })}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
            value.enabled ? "bg-action" : "bg-surface-sunken"
          )}
        >
          <span
            className={cn(
              "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
              value.enabled ? "translate-x-[18px]" : "translate-x-0.5"
            )}
          />
        </button>
      </div>

      {value.enabled ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <FormLabel variant="default">Stage</FormLabel>
            <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
              {CALVING_STAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => set({ stage: opt.id })}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                    value.stage === opt.id
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {value.stage === "calved" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <FormLabel variant="default">Delivery</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {CALVING_DELIVERY_OPTIONS.map((opt) => (
                    <Pill
                      key={opt.id}
                      selected={value.deliveryType === opt.id}
                      disabled={disabled}
                      onClick={() => set({ deliveryType: opt.id })}
                    >
                      {opt.label}
                    </Pill>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <FormLabel variant="default">Calf</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {CALVING_CALF_OPTIONS.map((opt) => (
                    <Pill
                      key={opt.id}
                      selected={value.calfStatus === opt.id}
                      disabled={disabled}
                      onClick={() => set({ calfStatus: opt.id })}
                    >
                      {opt.label}
                    </Pill>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <FormLabel variant="default">Complications</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {CALVING_COMPLICATION_OPTIONS.map((opt) => (
                    <Pill
                      key={opt.id}
                      selected={value.complications.includes(opt.id)}
                      disabled={disabled}
                      onClick={() => toggleComplication(opt.id)}
                    >
                      {opt.label}
                    </Pill>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
