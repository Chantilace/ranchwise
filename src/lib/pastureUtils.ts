import type { PastureCheckEntry } from "@/lib/pastureCheckTypes"

/** Display label for roster / breadcrumb: "West Pasture" → "West". Seed keeps full canonical names. */
export function getPastureShortName(fullName: string): string {
  return fullName.replace(/\s+Pasture$/i, "").trim()
}

/**
 * Latest pasture check AI copy for roster cell + drawer.
 * Display line prefers `recommendations[0]`, then pattern note, then risk label (full text, no truncation).
 */
export function getLatestPastureCheckAiInsight(checks: PastureCheckEntry[] | undefined): {
  preview: string | null
  drawerSuggestions: readonly string[] | null
} {
  if (!checks?.length) return { preview: null, drawerSuggestions: null }
  const latest = [...checks].sort((a, b) => b.date - a.date)[0]
  const ai = latest?.aiResult
  if (!ai) return { preview: null, drawerSuggestions: null }

  const recs = ai.recommendations?.map((s) => s.trim()).filter(Boolean) ?? []
  if (recs.length > 0) {
    return { preview: recs[0]!, drawerSuggestions: recs }
  }
  const note = ai.patternNote?.trim()
  if (note) {
    return { preview: note, drawerSuggestions: [note] }
  }
  const risk = ai.riskLabel?.trim()
  if (risk) {
    return { preview: risk, drawerSuggestions: [risk] }
  }
  return { preview: null, drawerSuggestions: null }
}
