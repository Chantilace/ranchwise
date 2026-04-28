/** Relative dates for demo seed data so "this week" / home stats stay current. */

export function formatSeedObservationDate(d: Date): string {
  const m = d.getMonth() + 1
  const day = d.getDate()
  const y = d.getFullYear() % 100
  return `${m}/${day}/${y.toString().padStart(2, "0")}`
}

/** Calendar day at local noon, `daysAgo` before today (0 = today). */
export function seedDaysAgo(daysAgo: number): string {
  const t = new Date()
  t.setHours(12, 0, 0, 0)
  t.setDate(t.getDate() - daysAgo)
  return formatSeedObservationDate(t)
}
