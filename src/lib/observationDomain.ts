import type { ObservationEntry, ObservationDomain } from "@/types/observation"

export function getObservationDomain(entry: ObservationEntry): ObservationDomain {
  if (entry.observationDomain) return entry.observationDomain
  return entry.category === "Behavior" ? "behavior" : "health"
}

export function observationDomainFromCategory(
  category: ObservationEntry["category"]
): ObservationDomain {
  return category === "Behavior" ? "behavior" : "health"
}
