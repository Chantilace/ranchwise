import { Camera, ChevronDown, ChevronRight } from "lucide-react"
import { useId, type ChangeEvent, type RefObject } from "react"
import { FeedMultiSelect } from "@/components/FeedMultiSelect"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { NewHorseData } from "@/lib/addHorseForm"
import { AppMenuSelect } from "@/components/ui/app-menu-select"
import { FormLabel } from "@/components/ui/form-label"
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

const profileEditInputClass =
  "min-h-0 w-full rounded-lg border-[0.5px] border-border bg-secondary px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-action/25"

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
  const formFieldVariant = isProfileEdit ? ("profileEdit" as const) : ("default" as const)
  const formFieldLabelClassName = isProfileEdit ? "mb-[5px]" : undefined

  const sheetFieldId = useId()
  const sheetNameId = `${sheetFieldId}-name`
  const sheetAgeId = `${sheetFieldId}-age`
  const sheetPastureId = `${sheetFieldId}-pasture`
  const sheetPhotoInputId = `${sheetFieldId}-photo`
  const sheetNotesId = `${sheetFieldId}-notes`
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
            <FormLabel variant={formFieldVariant} className={formFieldLabelClassName}>
              Name *
            </FormLabel>
            <Input
              placeholder="Horse name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className={isProfileEdit ? profileEditInputClass : undefined}
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col">
              <FormLabel variant={formFieldVariant} className={formFieldLabelClassName}>
                Sex *
              </FormLabel>
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
              <FormLabel variant={formFieldVariant} className={formFieldLabelClassName}>
                Age *
              </FormLabel>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="Years"
                value={ageRaw}
                onChange={(e) => onAgeRawChange(e.target.value)}
                className={isProfileEdit ? profileEditInputClass : undefined}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col">
              <FormLabel variant={formFieldVariant} className={formFieldLabelClassName}>
                Role *
              </FormLabel>
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
              <FormLabel variant={formFieldVariant} className={formFieldLabelClassName}>
                Pasture *
              </FormLabel>
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
              <FormLabel variant={formFieldVariant} className={isProfileEdit ? "mb-[5px]" : "mb-2"}>
                Photo
              </FormLabel>
              {photoPreviewUrl?.trim() ? (
                <div className="mb-3 flex justify-center">
                  <img
                    src={photoPreviewUrl}
                    alt=""
                    className="size-20 rounded-xl border border-border object-cover object-center"
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
                <span className="text-[13px] text-muted-foreground">JPG or PNG, up to 5MB</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <FormLabel variant={formFieldVariant} className={formFieldLabelClassName}>
                Feed
              </FormLabel>
              <FeedMultiSelect value={feed} onChange={onFeedChange} placeholder="Select feed types" />
            </div>

            <label className="flex flex-col gap-1.5">
              <FormLabel variant={formFieldVariant} className={formFieldLabelClassName}>
                Notes
              </FormLabel>
              <Textarea
                rows={3}
                placeholder="Any additional notes"
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                className={
                  isProfileEdit
                    ? cn(profileEditInputClass, "min-h-[4.5rem] resize-y")
                    : "min-h-[4.5rem]"
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
                  <FormLabel variant={formFieldVariant} className={formFieldLabelClassName}>
                    Body condition (1–9)
                  </FormLabel>
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
                  <FormLabel variant={formFieldVariant} className={formFieldLabelClassName}>
                    Last farrier
                  </FormLabel>
                  <Input
                    type="date"
                    value={lastFarrierIso}
                    onChange={(e) => onLastFarrierIsoChange(e.target.value)}
                    className={profileEditInputClass}
                  />
                </label>
                <label className="flex flex-col">
                  <FormLabel variant={formFieldVariant} className={formFieldLabelClassName}>
                    Last dental
                  </FormLabel>
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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <FormLabel variant="sheet" className="mb-2" htmlFor={sheetNameId}>
          Name
        </FormLabel>
        <Input
          id={sheetNameId}
          placeholder="Horse name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </div>

      <div>
        <FormLabel variant="sheet" className="mb-2">
          Sex
        </FormLabel>
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
        <FormLabel variant="sheet" className="mb-2" htmlFor={sheetAgeId}>
          Age
        </FormLabel>
        <Input
          id={sheetAgeId}
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="e.g. 4"
          value={ageRaw}
          onChange={(e) => onAgeRawChange(e.target.value)}
        />
      </div>

      <div>
        <FormLabel variant="sheet" className="mb-2">
          Role
        </FormLabel>
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
        <FormLabel variant="sheet" className="mb-2" htmlFor={sheetPastureId}>
          Pasture
        </FormLabel>
        <AppMenuSelect
          id={sheetPastureId}
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
            <FormLabel variant="sheet" className="mb-2" htmlFor={sheetPhotoInputId}>
              Photo{" "}
              <span className="font-normal normal-case tracking-normal text-muted-foreground">(optional)</span>
            </FormLabel>
            <input
              id={sheetPhotoInputId}
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
            <FormLabel variant="sheet" className="mb-2">
              Feed{" "}
              <span className="font-normal normal-case tracking-normal text-muted-foreground">(optional)</span>
            </FormLabel>
            <FeedMultiSelect value={feed} onChange={onFeedChange} placeholder="Select feed types" />
          </div>

          <div>
            <FormLabel variant="sheet" className="mb-2" htmlFor={sheetNotesId}>
              Notes{" "}
              <span className="font-normal normal-case tracking-normal text-muted-foreground">(optional)</span>
            </FormLabel>
            <Textarea
              id={sheetNotesId}
              rows={3}
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="min-h-[4.5rem] resize-none"
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
