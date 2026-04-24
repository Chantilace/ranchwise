import type { FeedOption } from "@/lib/constants"
import { FEED_OPTIONS } from "@/lib/constants"
import { MenuMultiSelectField } from "@/components/ui/menu-multi-select-field"

const FEED_MENU_OPTIONS = FEED_OPTIONS.map((o) => ({ id: o, label: o }))

export interface FeedMultiSelectProps {
  value: FeedOption[]
  onChange: (selected: FeedOption[]) => void
  placeholder?: string
  disabled?: boolean
}

export function FeedMultiSelect({
  value,
  onChange,
  placeholder = "Select feed types",
  disabled = false,
}: FeedMultiSelectProps) {
  const selectedIds = new Set<string>(value)
  return (
    <MenuMultiSelectField
      options={FEED_MENU_OPTIONS}
      selectedIds={selectedIds}
      onChange={(next) => {
        const ordered = FEED_OPTIONS.filter((id) => next.has(id))
        onChange(ordered as FeedOption[])
      }}
      placeholder={placeholder}
      disabled={disabled}
    />
  )
}
