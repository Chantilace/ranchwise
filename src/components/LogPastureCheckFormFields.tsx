import { useId } from "react"
import { FormLabel } from "@/components/ui/form-label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

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
  const pastureSheetFieldId = useId()
  const sheetNotesId = `${pastureSheetFieldId}-notes`
  const sheetLoggedById = `${pastureSheetFieldId}-logged-by`

  if (variant === "modal") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <FormLabel variant="default">All clear</FormLabel>
          <AllClearYesNoRow allClear={allClear} onAllClearChange={onAllClearChange} />
        </div>

        <label className="flex flex-col gap-1.5">
          <FormLabel variant="default">
            Notes {!allClear ? "(required)" : "(optional)"}
          </FormLabel>
          <Textarea
            rows={4}
            placeholder={`Any observations for ${pastureName}?`}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-24 rounded-lg border-border"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <FormLabel variant="default">Logged by</FormLabel>
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
        <FormLabel variant="sheet" className="mb-2">
          All clear?
        </FormLabel>
        <AllClearYesNoRow allClear={allClear} onAllClearChange={onAllClearChange} />
      </div>

      <div>
        <FormLabel variant="sheet" className="mb-2" htmlFor={sheetNotesId}>
          Notes
          {allClear ? (
            <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground">
              (optional)
            </span>
          ) : null}
        </FormLabel>
        <textarea
          id={sheetNotesId}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={`Any observations for ${pastureName}?`}
          required={!allClear}
          className="h-24 w-full resize-none rounded-xl border border-border p-3 text-sm focus:border-action focus:outline-none"
        />
      </div>

      <div>
        <FormLabel variant="sheet" className="mb-2" htmlFor={sheetLoggedById}>
          Logged by
        </FormLabel>
        <input
          id={sheetLoggedById}
          value={loggedBy}
          onChange={(e) => onLoggedByChange(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl border border-border p-3 text-sm focus:border-action focus:outline-none"
        />
      </div>
    </div>
  )
}
