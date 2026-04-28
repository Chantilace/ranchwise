import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormLabel } from "@/components/ui/form-label"
import type { PastureCheckCategory } from "@/lib/pastureCheckTypes"
import { cn } from "@/lib/utils"

export type PastureLogFormFieldsProps = {
  category: PastureCheckCategory
  onCategoryChange: (c: PastureCheckCategory) => void
  notes: string
  onNotesChange: (v: string) => void
  loggedBy: string
  onLoggedByChange: (v: string) => void
  disabled?: boolean
  readOnlyText?: boolean
  hideNotes?: boolean
  /** Hide logged-by row when replaying in analyze–review summary (`LogReviewFilledField`). */
  hideLoggedBy?: boolean
  className?: string
}

export function PastureLogFormFields({
  category: _category,
  onCategoryChange: _onCategoryChange,
  notes,
  onNotesChange,
  loggedBy,
  onLoggedByChange,
  disabled = false,
  readOnlyText = false,
  hideNotes = false,
  hideLoggedBy = false,
  className,
}: PastureLogFormFieldsProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        disabled && !readOnlyText && "pointer-events-none opacity-60",
        className
      )}
    >
      {hideNotes ? null : (
        <label className="flex flex-col gap-1.5">
          <FormLabel variant="default">Check details</FormLabel>
          <Textarea
            rows={4}
            placeholder="Fencing, water, footing, erosion, herd distribution…"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            readOnly={readOnlyText}
            disabled={disabled && !readOnlyText}
            className={cn(readOnlyText && "border-transparent bg-transparent px-0")}
          />
        </label>
      )}

      {hideLoggedBy ? null : (
        <label className="flex flex-col gap-1.5">
          <FormLabel variant="default">Logged by</FormLabel>
          <Input
            value={loggedBy}
            onChange={(e) => onLoggedByChange(e.target.value)}
            placeholder="Your name"
            disabled={disabled && !readOnlyText}
            readOnly={readOnlyText}
            className={cn(readOnlyText && "border-transparent bg-transparent px-0")}
          />
        </label>
      )}
    </div>
  )
}
