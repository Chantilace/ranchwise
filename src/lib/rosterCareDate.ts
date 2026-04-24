import { format, isValid, parseISO } from "date-fns"

/** Display string for roster care columns (`MMM d, yyyy`), or `null` if missing/invalid. */
export function formatRosterCareIsoDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const day = iso.includes("T") ? iso.slice(0, 10) : iso
  try {
    const d = parseISO(day)
    if (!isValid(d)) return null
    return format(d, "MMM d, yyyy")
  } catch {
    return null
  }
}

/** Null / empty dates sort last; direction applies to non-null values only. */
export function compareNullableIsoDates(
  a: string | null | undefined,
  b: string | null | undefined,
  dir: "asc" | "desc"
): number {
  const hasA = Boolean(a)
  const hasB = Boolean(b)
  if (!hasA && !hasB) return 0
  if (!hasA) return 1
  if (!hasB) return -1
  const dayA = a!.includes("T") ? a!.slice(0, 10) : a!
  const dayB = b!.includes("T") ? b!.slice(0, 10) : b!
  const at = parseISO(dayA).getTime()
  const bt = parseISO(dayB).getTime()
  const diff = at - bt
  return dir === "asc" ? diff : -diff
}
