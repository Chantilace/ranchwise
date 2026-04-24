export type PrepTask = {
  id: string
  label: string
}

/** Prep checklist items per season id (`RANCH_SEASONS`). Key includes calendar year in storage for yearly reset. */
export const SEASON_PREP_TASKS: Record<string, PrepTask[]> = {
  winter: [
    { id: "wf-1", label: "Check hay inventory and order if needed." },
    { id: "wf-2", label: "Inspect water heaters and freeze protection." },
    { id: "wf-3", label: "Review supplemental feed plan for cold months." },
  ],
  calving: [
    { id: "ca-1", label: "Set up calving pen and supplies." },
    { id: "ca-2", label: "Review first-timer heifer due dates." },
    { id: "ca-3", label: "Confirm vet on-call schedule." },
  ],
  branding: [
    { id: "br-1", label: "Book crew and freeze-brand / iron readiness." },
    { id: "br-2", label: "Pre-sort calves by pasture for efficient runs." },
    { id: "br-3", label: "Verify Coggins and health paperwork for haul-outs." },
  ],
  turnout: [
    { id: "to-1", label: "Fence and water tank checks on summer leases." },
    { id: "to-2", label: "Rotate pastures to avoid overgrazing early growth." },
    { id: "to-3", label: "Fly control and mineral placement on hot days." },
  ],
  gathering: [
    { id: "ga-1", label: "Schedule sorting and weigh days." },
    { id: "ga-2", label: "Arrange transport and confirm buyer contacts." },
    { id: "ga-3", label: "Complete pre-movement health checks." },
  ],
}

function storageKey(seasonId: string, year: number): string {
  return `season_tasks_${seasonId}_${year}`
}

export function getSeasonTasksStorageKey(seasonId: string, year: number = new Date().getFullYear()): string {
  return storageKey(seasonId, year)
}

export function getCompletedSeasonTaskIds(seasonId: string): string[] {
  try {
    const raw = localStorage.getItem(getSeasonTasksStorageKey(seasonId))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

/** Toggle task completion; returns the new completed id list. */
export function persistToggleSeasonTask(seasonId: string, taskId: string): string[] {
  const key = getSeasonTasksStorageKey(seasonId)
  const completed = getCompletedSeasonTaskIds(seasonId)
  const updated = completed.includes(taskId) ? completed.filter((id) => id !== taskId) : [...completed, taskId]
  try {
    localStorage.setItem(key, JSON.stringify(updated))
  } catch {
    /* quota / private mode */
  }
  return updated
}

export function prepTasksForSeason(seasonId: string): PrepTask[] {
  return SEASON_PREP_TASKS[seasonId] ?? SEASON_PREP_TASKS.calving
}
