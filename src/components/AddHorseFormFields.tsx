import { Camera, ChevronDown, ChevronRight } from "lucide-react"
import type { ChangeEvent, RefObject } from "react"
import { FeedMultiSelect } from "@/components/FeedMultiSelect"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { NewHorseData } from "@/lib/addHorseForm"
import { AppMenuSelect } from "@/components/ui/app-menu-select"
import type { FeedOption } from "@/lib/constants"
import { cn } from "@/lib/utils"

export const ADD_HORSE_SEX_OPTIONS: NewHorseData["sex"][] = [
  "Mare",
  "Gelding",
  "Stallion",
  "Filly",
  "Colt",
]
export const ADD_HORSE_ROLE_OPTIONS: NewHorseData["role"][] = [
  "Working",
  "Training",
  "Breeding",
  "Retired",
]

export const ADD_HORSE_MAX_PHOTO_BYTES = 5 * 1024 * 1024

const PROFILE_EDIT_SEX_OPTIONS = ["Mare", "Gelding", "Stallion"] as const
const PROFILE_EDIT_ROLE_OPTIONS = ["Working", "Breeding", "Retired"] as const

const modalLabelClass = "text-xs font-medium tracking-wide text-muted-foreground uppercase"
const profileEditLabelClass =
  "mb-[5px] block text-xs font-normal uppercase tracking-[0.07em] text-muted-foreground"
const profileEditInputClass =
  "min-h-0 w-full rounded-lg border-[0.5px] border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-action/25"

const sheetLabelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-widest text-foreground"

function sheetToggleClass(active: boolean) {
  return cn(
    "rounded-full border px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "border-action/35 bg-action/10 text-action"
      : "border-border bg-transparent text-muted-foreground"
  )
}

export function addHorseFormRequiredOk(args: {
  name: string
  sex: string
  ageRaw: string
  role: string
  pasture: string
}): boolean {
  const ageNum = Number.parseInt(args.ageRaw, 10)
  const ageValid = Number.isFinite(ageNum) && ageNum > 0
  return (
    args.name.trim().length > 0 &&
    args.sex !== "" &&
    ageValid &&
    args.role !== "" &&
    args.pasture !== ""
  )
}

export function buildNewHorseDataFromForm(args: {
  name: string
  sex: string
  ageRaw: string
  role: string
  pasture: string
  feed: FeedOption[]
  notes: string
  photoDataUrl?: string
}): NewHorseData | null {
  if (!addHorseFormRequiredOk(args)) return null
  const ageNum = Number.parseInt(args.ageRaw, 10)
  return {
    name: args.name.trim(),
    sex: args.sex as NewHorseData["sex"],
    age: ageNum,
    role: args.role as NewHorseData["role"],
    pasture: args.pasture,
    photo: args.photoDataUrl,
    feed: args.feed.length > 0 ? args.feed : undefined,
    notes: args.notes.trim() || undefined,
  }
}

export type AddHorseFormFieldsProps = {
  variant: "modal" | "sheet"
  pastures: string[]
  name: string
  onNameChange: (v: string) => void
  sex: string
  onSexChange: (v: string) => void
  ageRaw: string
  onAgeRawChange: (v: string) => void
  role: string
  onRoleChange: (v: string) => void
  pasture: string
  onPastureChange: (v: string) => void
  feed: FeedOption[]
  onFeedChange: (v: FeedOption[]) => void
  notes: string
  onNotesChange: (v: string) => void
  fileInputRef: RefObject<HTMLInputElement | null>
  onPhotoFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  /** Profile edit modal — spec typography, Mare/Gelding/Stallion, Working/Breeding/Retired. */
  appearance?: "default" | "profileEdit"
  /** Shown above the photo upload when editing an existing horse. */
  photoPreviewUrl?: string | null
  /** Profile edit — optional fields inside Details (body, farrier, dental). */
  bodyConditionRaw?: string
  onBodyConditionRawChange?: (v: string) => void
  lastFarrierIso?: string
  onLastFarrierIsoChange?: (v: string) => void
  lastDentalIso?: string
  onLastDentalIsoChange?: (v: string) => void
}

export function AddHorseFormFields({
  variant,
  pastures,
  name,
  onNameChange,
  sex,
  onSexChange,
  ageRaw,
  onAgeRawChange,
  role,
  onRoleChange,
  pasture,
  onPastureChange,
  feed,
  onFeedChange,
  notes,
  onNotesChange,
  fileInputRef,
  onPhotoFileChange,
  expanded,
  onExpandedChange,
  appearance = "default",
  photoPreviewUrl,
  bodyConditionRaw,
  onBodyConditionRawChange,
  lastFarrierIso,
  onLastFarrierIsoChange,
  lastDentalIso,
  onLastDentalIsoChange,
}: AddHorseFormFieldsProps) {
  const isProfileEdit = appearance === "profileEdit"
  const labelClass = isProfileEdit ? profileEditLabelClass : modalLabelClass
  const sexOptionsList = isProfileEdit
    ? (() => {
        const list: string[] = [...PROFILE_EDIT_SEX_OPTIONS]
        if (sex.trim() && !list.includes(sex)) list.push(sex)
        return list
      })()
    : [...ADD_HORSE_SEX_OPTIONS]
  const roleOptionsForSelect = (() => {
    const base: string[] = isProfileEdit
      ? [...PROFILE_EDIT_ROLE_OPTIONS]
      : [...ADD_HORSE_ROLE_OPTIONS]
    const set = new Set(base)
    if (role.trim()) set.add(role)
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  })()

  if (variant === "modal") {
    return (
      <>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col">
            <span className={labelClass}>Name *</span>
            <Input
              placeholder="Horse name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className={isProfileEdit ? profileEditInputClass : "rounded-lg"}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col">
              <span className={labelClass}>Sex *</span>
              <AppMenuSelect
                value={sex}
                onValueChange={onSexChange}
                options={[
                  { value: "", label: "Select" },
                  ...sexOptionsList.map((s) => ({ value: s, label: s })),
                ]}
                placeholder="Select"
                aria-label="Sex"
                className={
                  isProfileEdit
                    ? cn(
                        "h-auto min-h-0 rounded-lg border-[0.5px] border-border bg-secondary px-3 py-2 text-sm shadow-none"
                      )
                    : undefined
                }
              />
            </label>
            <label className="flex flex-col">
              <span className={labelClass}>Age *</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="Years"
                value={ageRaw}
                onChange={(e) => onAgeRawChange(e.target.value)}
                className={isProfileEdit ? profileEditInputClass : "rounded-lg"}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col">
              <span className={labelClass}>Role *</span>
              <AppMenuSelect
                value={role}
                onValueChange={onRoleChange}
                options={[
                  { value: "", label: "Select" },
                  ...roleOptionsForSelect.map((r) => ({ value: r, label: r })),
                ]}
                placeholder="Select"
                aria-label="Role"
                className={
                  isProfileEdit
                    ? cn(
                        "h-auto min-h-0 rounded-lg border-[0.5px] border-border bg-secondary px-3 py-2 text-sm shadow-none"
                      )
                    : undefined
                }
              />
            </label>
            <label className="flex flex-col">
              <span className={labelClass}>Pasture *</span>
              <AppMenuSelect
                value={pasture}
                onValueChange={onPastureChange}
                options={[
                  { value: "", label: "Select" },
                  ...pastures.map((p) => ({ value: p, label: p })),
                ]}
                placeholder="Select"
                aria-label="Pasture"
                className={
                  isProfileEdit
                    ? cn(
                        "h-auto min-h-0 rounded-lg border-[0.5px] border-border bg-secondary px-3 py-2 text-sm shadow-none"
                      )
                    : undefined
                }
              />
            </label>
          </div>
        </div>

        <hr className={isProfileEdit ? "my-4 border-border" : "my-5 border-border"} />

        <button
          type="button"
          onClick={() => onExpandedChange(!expanded)}
          className="flex w-full items-center gap-2 rounded-lg py-2 text-left text-sm text-foreground outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          {expanded ? (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          {isProfileEdit ? (
            expanded ? (
              <span className="font-medium text-foreground">Details</span>
            ) : (
              <span>Details — photo, feed, notes</span>
            )
          ) : expanded ? (
            <span className="font-medium text-foreground">— Details</span>
          ) : (
            <span>Add details — photo, feed, notes</span>
          )}
        </button>

        {expanded ? (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <span className={cn(labelClass, isProfileEdit ? "mb-[5px]" : "mb-2", "block")}>Photo</span>
              {photoPreviewUrl?.trim() ? (
                <div className="mb-3 flex justify-center">
                  <img
                    src={photoPreviewUrl}
                    alt=""
                    className="size-20 rounded-lg border border-border object-cover object-center"
                  />
                </div>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                onChange={onPhotoFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-4 py-8 text-center outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <Camera className="size-8 text-muted-foreground" aria-hidden />
                <span className="text-sm font-medium text-foreground">Upload photo</span>
                <span className="text-xs text-muted-foreground">JPG or PNG, up to 5MB</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>Feed</span>
              <FeedMultiSelect value={feed} onChange={onFeedChange} placeholder="Select feed types" />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>Notes</span>
              <Textarea
                rows={3}
                placeholder="Any additional notes"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                className={
                  isProfileEdit
                    ? cn(profileEditInputClass, "min-h-[4.5rem] resize-y")
                    : "min-h-[4.5rem] rounded-lg border-border"
                }
              />
            </label>

            {isProfileEdit &&
            bodyConditionRaw !== undefined &&
            onBodyConditionRawChange &&
            lastFarrierIso !== undefined &&
            onLastFarrierIsoChange &&
            lastDentalIso !== undefined &&
            onLastDentalIsoChange ? (
              <>
                <label className="flex flex-col">
                  <span className={labelClass}>Body condition (1–9)</span>
                  <Input
                    type="number"
                    min={1}
                    max={9}
                    inputMode="numeric"
                    value={bodyConditionRaw}
                    onChange={(e) => onBodyConditionRawChange(e.target.value)}
                    className={profileEditInputClass}
                  />
                </label>
                <label className="flex flex-col">
                  <span className={labelClass}>Last farrier</span>
                  <Input
                    type="date"
                    value={lastFarrierIso}
                    onChange={(e) => onLastFarrierIsoChange(e.target.value)}
                    className={profileEditInputClass}
                  />
                </label>
                <label className="flex flex-col">
                  <span className={labelClass}>Last dental</span>
                  <Input
                    type="date"
                    value={lastDentalIso}
                    onChange={(e) => onLastDentalIsoChange(e.target.value)}
                    className={profileEditInputClass}
                  />
                </label>
              </>
            ) : null}
          </div>
        ) : null}
      </>
    )
  }

  const sheetInputClass =
    "w-full rounded-xl border border-border p-3 text-sm focus:border-action focus:outline-none"

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className={sheetLabelClass}>Name</label>
        <input
          placeholder="Horse name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className={sheetInputClass}
        />
      </div>

      <div>
        <label className={sheetLabelClass}>Sex</label>
        <div className="flex flex-wrap gap-2">
          {ADD_HORSE_SEX_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className={sheetToggleClass(sex === s)}
              onClick={() => onSexChange(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={sheetLabelClass}>Age</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="e.g. 4"
          value={ageRaw}
          onChange={(e) => onAgeRawChange(e.target.value)}
          className={sheetInputClass}
        />
      </div>

      <div>
        <label className={sheetLabelClass}>Role</label>
        <div className="flex flex-wrap gap-2">
          {ADD_HORSE_ROLE_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              className={sheetToggleClass(role === r)}
              onClick={() => onRoleChange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={sheetLabelClass}>Pasture</label>
        <AppMenuSelect
          value={pasture}
          onValueChange={onPastureChange}
          options={[
            { value: "", label: "Select pasture" },
            ...pastures.map((p) => ({ value: p, label: p })),
          ]}
          placeholder="Select pasture"
          aria-label="Pasture"
        />
      </div>

      {!expanded ? (
        <button
          type="button"
          className="text-left text-sm font-medium text-action"
          onClick={() => onExpandedChange(true)}
        >
          Add photo, feed & notes →
        </button>
      ) : null}

      {expanded ? (
        <>
          <div>
            <label className={sheetLabelClass}>
              Photo{" "}
              <span className="font-normal normal-case tracking-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="sr-only"
              onChange={onPhotoFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border border-dashed border-border p-3 text-center text-sm text-muted-foreground"
            >
              Upload photo
            </button>
          </div>

          <div>
            <label className={sheetLabelClass}>
              Feed{" "}
              <span className="font-normal normal-case tracking-normal text-muted-foreground">(optional)</span>
            </label>
            <FeedMultiSelect value={feed} onChange={onFeedChange} placeholder="Select feed types" />
          </div>

          <div>
            <label className={sheetLabelClass}>
              Notes{" "}
              <span className="font-normal normal-case tracking-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="h-20 w-full resize-none rounded-xl border border-border p-3 text-sm focus:border-action focus:outline-none"
            />
          </div>

          <button
            type="button"
            className="text-left text-sm text-muted-foreground"
            onClick={() => onExpandedChange(false)}
          >
            ↑ Show fewer fields
          </button>
        </>
      ) : null}
    </div>
  )
}
