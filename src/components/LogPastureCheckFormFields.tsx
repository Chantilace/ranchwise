import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const modalLabelClass =
  "text-xs font-medium tracking-wide text-muted-foreground uppercase"

function allClearPillClass(selected: boolean) {
  return cn(
    "rounded-full border px-4 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
    selected
      ? "border-action bg-action text-action-foreground"
      : "border-border bg-transparent text-foreground"
  )
}

function AllClearYesNoRow({
  allClear,
  onAllClearChange,
}: {
  allClear: boolean
  onAllClearChange: (value: boolean) => void
}) {
  return (
    <div className="flex gap-2">
      <button type="button" className={allClearPillClass(allClear)} onClick={() => onAllClearChange(true)}>
        Yes
      </button>
      <button type="button" className={allClearPillClass(!allClear)} onClick={() => onAllClearChange(false)}>
        No
      </button>
    </div>
  )
}

export type LogPastureCheckFormFieldsProps = {
  variant: "modal" | "sheet"
  pastureName: string
  allClear: boolean
  onAllClearChange: (value: boolean) => void
  notes: string
  onNotesChange: (value: string) => void
  loggedBy: string
  onLoggedByChange: (value: string) => void
}

export function LogPastureCheckFormFields({
  variant,
  pastureName,
  allClear,
  onAllClearChange,
  notes,
  onNotesChange,
  loggedBy,
  onLoggedByChange,
}: LogPastureCheckFormFieldsProps) {
  if (variant === "modal") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className={modalLabelClass}>All clear</span>
          <AllClearYesNoRow allClear={allClear} onAllClearChange={onAllClearChange} />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={modalLabelClass}>
            Notes {!allClear ? "(required)" : "(optional)"}
          </span>
          <Textarea
            rows={4}
            placeholder={`Any observations for ${pastureName}?`}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-24 rounded-lg border-border"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={modalLabelClass}>Logged by</span>
          <Input
            placeholder="Your name"
            value={loggedBy}
            onChange={(e) => onLoggedByChange(e.target.value)}
            className="rounded-lg"
          />
        </label>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-foreground">
          All clear?
        </label>
        <AllClearYesNoRow allClear={allClear} onAllClearChange={onAllClearChange} />
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-foreground">
          Notes
          {allClear ? (
            <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground">
              (optional)
            </span>
          ) : null}
        </label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={`Any observations for ${pastureName}?`}
          required={!allClear}
          className="h-24 w-full resize-none rounded-xl border border-border p-3 text-sm focus:border-action focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-foreground">
          Logged by
        </label>
        <input
          value={loggedBy}
          onChange={(e) => onLoggedByChange(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl border border-border p-3 text-sm focus:border-action focus:outline-none"
        />
      </div>
    </div>
  )
}
