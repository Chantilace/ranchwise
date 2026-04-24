import { formatRosterCareIsoDate } from "@/lib/rosterCareDate"

export function RosterCareDateCell({ iso }: { iso: string | null | undefined }) {
  const label = formatRosterCareIsoDate(iso)
  if (!label) {
    return <span className="text-sm text-muted-foreground">—</span>
  }
  return <span className="text-sm text-foreground">{label}</span>
}
