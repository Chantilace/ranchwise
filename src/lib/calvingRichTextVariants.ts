/** Maps calving outcome labels to semantic text tint variants (see `RichText`). */
export function getComplicationVariant(status: string): "warning" | "attention" | "muted" {
  if (status === "Complications") return "warning"
  if (status === "Assisted") return "attention"
  return "muted"
}

/** Maps due-date urgency labels to semantic text tint variants (see `RichText`). */
export function getDueDateVariant(status: string): "warning" | "attention" | "muted" {
  if (status === "Calving soon" || status === "calving-soon") return "warning"
  return "muted"
}
