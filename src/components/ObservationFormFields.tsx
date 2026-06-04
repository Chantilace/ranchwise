import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { AppMenuSelect } from "@/components/ui/app-menu-select"
import { FormLabel } from "@/components/ui/form-label"
import { ALL_OBSERVATION_CATEGORIES, HORSE_OBSERVATION_CATEGORIES } from "@/lib/observationCategories"
import type { Category } from "@/types/observation"
import { cn } from "@/lib/utils"

export type ObservationFormFieldsProps = {
  category: Category
  onCategoryChange: (c: Category) => void
  notes: string
  onNotesChange: (v: string) => void
  loggedBy: string
  onLoggedByChange: (v: string) => void
  animalName: string
  disabled?: boolean
  /** Non-interactive text fields without the full "disabled" grey styling (e.g. post-save review). */
  readOnlyText?: boolean
  /** Desktop modal uses select when many categories; horse (2 options) uses pill buttons. Sheet uses `pills`. */
  variant?: "select" | "pills"
  /** Defaults: all categories for `select`, horse-only for `pills`. */
  categories?: Category[]
  className?: string
  /** Hide the notes / observation field (e.g. summary shown elsewhere in result step). */
  hideNotes?: boolean
  /** Hide logged-by row (e.g. shown in `LogReviewFilledField` in analyze–review step). */
  hideLoggedBy?: boolean
  /** When true, omit category UI (parent still persists `category` on save, e.g. cattle defaults to Health). */
  hideCategory?: boolean
}

export function ObservationFormFields({
  category,
  onCategoryChange,
  notes,
  onNotesChange,
  loggedBy,
  onLoggedByChange,
  animalName,
  disabled = false,
  readOnlyText = false,
  variant = "select",
  categories: categoriesProp,
  className,
  hideNotes = false,
  hideLoggedBy = false,
  hideCategory = false,
}: ObservationFormFieldsProps) {
  const categories =
    categoriesProp ?? (variant === "pills" ? HORSE_OBSERVATION_CATEGORIES : ALL_OBSERVATION_CATEGORIES)

  /** Binary choice: use pill buttons instead of a dropdown (modal + sheet). */
  const categoryAsButtons =
    variant === "pills" || (variant === "select" && categories.length === 2)

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        disabled && !readOnlyText && "pointer-events-none opacity-60",
        className
      )}
    >
      {hideCategory ? null : (
        <div className="flex flex-col gap-1.5">
          <FormLabel variant="default">Category</FormLabel>
          {categoryAsButtons ? (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  disabled={disabled || readOnlyText}
                  onClick={() => onCategoryChange(cat)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40",
                    category === cat
                      ? "border-action bg-action text-action-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted/60"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : (
            <AppMenuSelect
              value={category}
              onValueChange={(v) => onCategoryChange(v as Category)}
              options={categories.map((c) => ({ value: c, label: c }))}
              placeholder="Select category"
              disabled={disabled || readOnlyText}
              aria-label="Observation category"
            />
          )}
        </div>
      )}

      {hideNotes ? null : (
        <label className="flex flex-col gap-1.5">
          <FormLabel variant="default">
            {variant === "pills" ? "Notes" : "Your observation"}
          </FormLabel>
          <Textarea
            rows={variant === "pills" ? 4 : 4}
            placeholder={
              variant === "pills"
                ? "What did you observe?"
                : `What did you observe about ${animalName}?`
            }
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            disabled={disabled && !readOnlyText}
            readOnly={readOnlyText}
            className={cn(
              "resize-none",
              variant === "pills" ? "min-h-24 p-2.5 text-sm" : "min-h-24"
            )}
          />
        </label>
      )}

      {hideLoggedBy ? null : (
        <label className="flex flex-col gap-1.5">
          <FormLabel variant="default">Logged by</FormLabel>
          <Input
            placeholder="Your name"
            value={loggedBy}
            onChange={(e) => onLoggedByChange(e.target.value)}
            disabled={disabled && !readOnlyText}
            readOnly={readOnlyText}
            className={cn(variant === "pills" && "p-2.5 text-sm")}
          />
        </label>
      )}
    </div>
  )
}
