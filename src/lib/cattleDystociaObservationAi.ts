import type { CalvingComplication, Cattle } from "@/types/cattle"
import type { AIResult } from "@/types/observation"

export type CattleCalvingHistoryInput = Partial<
  Pick<Cattle, "calvingDate" | "calvingStatus" | "deliveryType">
> & {
  calvingComplications?: CalvingComplication[] | null
}

function complicationLabel(c: CalvingComplication): string {
  if (c === "retained-placenta") return "retained placenta"
  if (c === "prolapse") return "prolapse"
  if (c === "hemorrhage") return "hemorrhage"
  return c
}

/** Prior-calving sentence for dystocia pattern notes (cattle log + record calving). */
export function buildCowPriorHistoryStringFromFields(c: CattleCalvingHistoryInput): string {
  const hadPriorCalving = Boolean(c.calvingDate)
  const comps = (c.calvingComplications ?? []).filter((x) => x !== "none")
  const delivery = c.deliveryType
  const status = c.calvingStatus

  if (!hadPriorCalving && (status === "pregnant" || status === "in-labor")) {
    return "First calving for this cow."
  }

  if (hadPriorCalving && comps.length === 0 && (delivery === "normal" || delivery === null || delivery === undefined)) {
    return "Prior calving for this cow was unassisted with no complications, so this is a presentation issue, not a structural pattern."
  }

  if (hadPriorCalving && comps.length > 0) {
    const summary = comps.map(complicationLabel).join(", ")
    const y = c.calvingDate?.slice(0, 4) ?? "a prior season"
    return `Prior calving (${y}) had ${summary}. Worth noting if the pattern continues after this one.`
  }

  return ""
}

export function buildCowPriorHistoryString(cattle: Cattle): string {
  return buildCowPriorHistoryStringFromFields(cattle)
}

function t(notes: string) {
  return notes.toLowerCase()
}

/** Explicit dystocia wording (structured calving notes or rancher shorthand). */
export function detectDystocia(notes: string): boolean {
  return t(notes).includes("dystocia")
}

export function detectProlongedLabor(notes: string): boolean {
  const s = t(notes)
  return (
    s.includes("90+") ||
    s.includes("90 +") ||
    s.includes("over an hour") ||
    s.includes("extended labor") ||
    s.includes("no progression") ||
    s.includes("no progress") ||
    s.includes("still straining") ||
    s.includes("straining hard") ||
    (s.includes("straining") && s.includes("hard")) ||
    s.includes("hours of labor") ||
    s.includes("90 minutes") ||
    s.includes("90 min")
  )
}

export function detectMalpresentation(notes: string): boolean {
  const s = t(notes)
  return (
    s.includes("no nose") ||
    s.includes("nose not visible") ||
    s.includes("head back") ||
    s.includes("head turned back") ||
    s.includes("leg back") ||
    s.includes("breech") ||
    s.includes("abnormal position") ||
    (s.includes("front legs") && s.includes("visible") && !s.includes("nose"))
  )
}

export function detectCowDistress(notes: string): boolean {
  const s = t(notes)
  return (
    s.includes("down") ||
    s.includes("tired") ||
    s.includes("exhausted") ||
    s.includes("weak straining") ||
    s.includes("losing strength")
  )
}

/** Avoid flagging when the note clearly describes reassuring progression. */
function hasReassuringLaborProgress(notes: string): boolean {
  const s = t(notes)
  /** Do not treat "no nose presenting" / malpresentation as reassuring. */
  const nosePresentingPositive =
    s.includes("nose") &&
    s.includes("presenting") &&
    !s.includes("no nose") &&
    !s.includes("nose not visible") &&
    !s.includes("nose not presenting")
  return (
    s.includes("progress visible") ||
    s.includes("steady progress") ||
    s.includes("making progress") ||
    nosePresentingPositive ||
    (s.includes("calf") && s.includes("moving") && s.includes("normal"))
  )
}

/**
 * Cattle observation / free-text labor note: malpresentation plus labor stress,
 * optionally triggered by explicit "dystocia" with malpresentation.
 * Used by both `analyzeCalvingRecord` and `mockAnalyzeHealth` (cattle context).
 */
export function matchesCattleDystociaObservationScenario(notes: string): boolean {
  if (hasReassuringLaborProgress(notes)) return false
  const mal = detectMalpresentation(notes)
  if (!mal) return false
  const laborStress = detectProlongedLabor(notes) || detectCowDistress(notes)
  const explicit = detectDystocia(notes)
  return laborStress || explicit
}

/** Identical dystocia AI block for Record Calving and cattle observation logs. */
export function generateDystociaObservationAiResult(_animalName: string, cowPriorHistoryString: string): AIResult {
  const prior = cowPriorHistoryString.trim()
  const priorSentence = prior ? ` ${prior}` : ""
  return {
    riskLevel: "flag",
    riskLabel: "Flag",
    patternNote: `Front legs visible without nose usually means head-back malpresentation — the head's turned back along the body. Common enough, recoverable in most cases through repositioning.${priorSentence}`,
    recommendations: [
      "Repositioning's the play here. You'll typically need to repel the calf slightly to create room before bringing the head around. If she's losing strength or you can't get purchase after a few tries, that's when a vet call earns its keep — this isn't c-section territory unless repositioning fails.",
      "Note the start time of active labor and time since last progression. Useful for breeding records, and useful to have on hand if you do end up needing the vet.",
      "Have OB lube, chains, and a second person on standby regardless of how you're handling it.",
      "Once the calf is out, watch for retained placenta in the next 6–12 hours and check suckle reflex on the calf in the first 30 minutes. Both are handle-it issues if they come up — vet's a phone call if you need NSAIDs or a feeding tube and aren't stocked.",
    ],
  }
}

/** Alias for spec naming (`generateDystociaOutput`). */
export const generateDystociaOutput = generateDystociaObservationAiResult
