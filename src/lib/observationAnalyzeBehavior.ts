import type { AIResult } from "@/types/observation"
import {
  daysSince,
  extractHandlingContext,
  type EntityContext,
  type RecentObservationForAnalyze,
} from "@/lib/observationAnalyzeContext"

const MS_DAY = 86_400_000

function withinLastDays(obs: RecentObservationForAnalyze, days: number, now: Date): boolean {
  return now.getTime() - obs.loggedAt.getTime() <= days * MS_DAY
}

function lower(s: string) {
  return s.toLowerCase()
}

function hasAcceptanceMarkers(l: string): boolean {
  return (
    l.includes("accepted") ||
    l.includes("without flinching") ||
    l.includes("without head-tossing") ||
    l.includes("without head tossing") ||
    l.includes("calm") ||
    l.includes("relaxed") ||
    l.includes("quietly") ||
    l.includes("stood quietly") ||
    l.includes("no resistance")
  )
}

function hasResistanceMarkers(l: string): boolean {
  return (
    l.includes("raised head") ||
    l.includes("pulled back") ||
    l.includes("refused") ||
    l.includes("tense throughout") ||
    l.includes("resistance") ||
    l.includes("wouldn't pick") ||
    l.includes("didn't want to pick") ||
    l.includes("would not pick")
  )
}

function hasAggressionMarkers(l: string): boolean {
  return (
    l.includes("bit handler") ||
    l.includes("attempted to bite") ||
    l.includes("kicked at") ||
    l.includes("kicked handler") ||
    l.includes("charged") ||
    l.includes("struck out") ||
    l.includes("lunged at handler") ||
    l.includes("lunged at")
  )
}

function hasTensionMarker(l: string): boolean {
  return (
    l.includes("brief tension") ||
    l.includes("tensed briefly") ||
    l.includes("ear tension") ||
    l.includes("stiffened") ||
    (l.includes("tension") && (l.includes("ear") || l.includes("poll") || l.includes("jaw")))
  )
}

function hasResolutionMarker(l: string): boolean {
  return (
    l.includes("relaxed within") ||
    l.includes("released within") ||
    l.includes("softened") ||
    l.includes("settled within") ||
    l.includes("relaxed") && l.includes("within") && l.includes("second")
  )
}

function hasEscalationMarker(l: string): boolean {
  return (
    l.includes("got worse") ||
    l.includes("increased") ||
    l.includes("escalated") ||
    l.includes("had to stop") ||
    l.includes("couldn't continue") ||
    l.includes("could not continue") ||
    l.includes("started to bolt") ||
    l.includes("built throughout")
  )
}

function extractDurationRough(l: string): string {
  const m = l.match(/within\s+(\d+)\s*(second|sec|minute|min)/i)
  return m ? `${m[1]} ${m[2]!.toLowerCase().startsWith("sec") ? "seconds" : "minutes"}` : "a short window"
}

function extractTensionType(l: string): string {
  if (l.includes("ear")) return "ear tension"
  if (l.includes("poll")) return "poll tension"
  return "tension"
}

function priorBehaviorEntries(ctx: EntityContext | undefined, now: Date): RecentObservationForAnalyze[] {
  if (!ctx?.recentObservations?.length) return []
  return ctx.recentObservations.filter(
    (o) => String(o.category).toLowerCase() === "behavior" && withinLastDays(o, 14, now)
  )
}

function findPriorRecheckPartner(
  priorList: RecentObservationForAnalyze[],
  currentLower: string,
  currentContext: string | null,
  now: Date
): RecentObservationForAnalyze | null {
  const curAccept = hasAcceptanceMarkers(currentLower)
  if (!curAccept || !currentContext) return null
  for (const o of priorList) {
    const pl = lower(o.notes)
    if (!hasAcceptanceMarkers(pl)) continue
    const priorCtx = extractHandlingContext(o.notes)
    if (!priorCtx || priorCtx === currentContext) continue
    if (!withinLastDays(o, 14, now)) continue
    return o
  }
  return null
}

function notesMentionHalterWork(l: string): boolean {
  return (
    l.includes("halter") ||
    l.includes("haltered") ||
    l.includes("groom") ||
    l.includes("feet") ||
    l.includes("foot") ||
    l.includes("cross-tie") ||
    l.includes("cross tie")
  )
}

function priorHadCleanHalterSession(l: string): boolean {
  return (
    (l.includes("halter") || l.includes("haltered")) &&
    (l.includes("without resistance") || l.includes("calm") || l.includes("quietly")) &&
    (l.includes("groom") || l.includes("feet") || l.includes("led"))
  )
}

export async function mockAnalyzeBehavior(
  notes: string,
  animalName: string,
  context?: EntityContext
): Promise<AIResult> {
  const l = lower(notes)
  const now = new Date()
  const priorBehaviors = priorBehaviorEntries(context, now)

  // Pattern F — directed aggression
  if (hasAggressionMarkers(l)) {
    return {
      riskLevel: "flag",
      riskLabel: "Flag",
      patternNote: `Directed aggression on ${animalName} — this is the pattern that needs handling pause and honest assessment before the next session. Fear-aggression and learned aggression need different responses, so the trigger context matters more than the act.`,
      recommendations: [
        "Pause active handling work until you've done the rule-out. This isn't a \"work through it\" pattern — pushing past aggression usually reinforces it.",
        "Document the trigger context exactly: what the handler was doing, where on the body, what the horse did before the strike/bite/kick. Fear-aggression typically has a clear trigger and follows a warning pattern (pinned ears, raised head, tense body) — learned aggression skips warnings.",
        "Physical rule-out as Step 1 even more than usual — sudden aggression in a horse without history of it is more often pain than personality. Same Tier 1/Tier 2 sequence: feet, back, mouth, then poll, ulcers, hocks.",
        "If the rule-out is clear and the pattern continues, that's where a behaviorist consultation becomes worth the call.",
      ],
    }
  }

  // Pattern E — regression (prior good + current resistance on same work)
  if (priorBehaviors.length > 0 && hasResistanceMarkers(l) && notesMentionHalterWork(l)) {
    const priorGood = priorBehaviors.find((o) => o.riskLevel === "good" && priorHadCleanHalterSession(lower(o.notes)))
    if (priorGood) {
      const daysAgo = daysSince(priorGood.loggedAt, now)
      const pl = lower(priorGood.notes)
      const priorSnippet = pl.includes("haltered")
        ? "haltered cleanly with calm grooming and feet"
        : "a calm handling baseline"
      const rhCue =
        l.includes("right hind") ||
        (l.includes("right") && l.includes("hind")) ||
        l.includes("that foot") ||
        l.includes("same side")

      if (rhCue && (l.includes("weight") || l.includes("foot") || l.includes("pick"))) {
        return {
          riskLevel: "flag",
          riskLabel: "Flag",
          patternNote: `${animalName} is showing resistance on activities that read clean ${daysAgo} days ago — and the right-hind weight-shifting plus reluctance to pick that foot up is worth treating as a likely cue. When resistance and a localized physical signal show up in the same session, the physical signal usually points where to look first.`,
          recommendations: [
            "Step 1 — what changed since the last session? Recent farrier? New turnout? Anything that could have caused a right hind injury (rough ground, kick from herdmate, abscess developing).",
            "Step 2 — physical first, right hind specifically. Check the foot for heat, swelling, abscess softness, stone bruise. Run your hand up the leg looking for heat or tenderness. Compare to the left hind for reference.",
            "Step 3 — if the foot's clear, broaden: back palpation (compensatory soreness shows up here when a hind hurts), stifle, hock.",
            "Hold off on the breaking work until you've cleared this. Behavior that regressed alongside a localized physical cue almost always resolves when the physical does — and pushing through risks teaching resistance as the only way to communicate pain.",
          ],
        }
      }

      return {
        riskLevel: "flag",
        riskLabel: "Flag",
        patternNote: `${animalName} is showing resistance on handling that wasn't there ${daysAgo} days ago — that session you logged ${priorSnippet}. When something the horse had ends up contested again, the cause is rarely training first.`,
        recommendations: [
          "Step 1 — what changed since the last good session? Recent farrier, vet visit, feed change, new turnout, weather shift, handler change. Walk through the recent days and see if anything lines up.",
          "Step 2 — physical rule-out before treating it as a training issue. Tier 1: feet (recent trim? abscess? bruise?), back and saddle area (palpate topline, wither, loins), mouth and dental (sharp points, hooks, wolf teeth — relevant for breaking-age horses).",
          "Step 3 — Tier 2 if Tier 1 is clear: poll/TMJ pressure, gastric ulcers (girthiness or irritability around feeding is the cue), hocks/stifles especially in young horses growing through.",
          "Hold off on retraining until physical's ruled out. By the time resistance shows up as a behavior change, the physical cause is often weeks in. Ground manners and de-escalation work is fine in the meantime; pushing the original exercise isn't.",
        ],
      }
    }
  }

  // Pattern B — generalization / recheck across contexts
  const currentCtx = extractHandlingContext(notes)
  const partner = findPriorRecheckPartner(priorBehaviors, l, currentCtx, now)
  if (partner && hasAcceptanceMarkers(l) && currentCtx) {
    const daysAgo = daysSince(partner.loggedAt, now)
    const priorCtx = extractHandlingContext(partner.notes) ?? "prior spot"
    const earNote =
      l.includes("ear") && (l.includes("tension") || l.includes("brief"))
        ? "The right-ear tension is worth noting but the quick recovery reads as habituation, not pain response."
        : ""
    return {
      riskLevel: "good",
      riskLabel: "Good",
      patternNote: `Second handling note for ${animalName} this week. Prior check ${daysAgo} days ago was in the ${priorCtx} — same acceptance of face contact, both times. Tolerance is showing across two contexts, which is the test that matters.${earNote ? ` ${earNote}` : ""}`,
      recommendations: [
        "Vary it again next session — try the offside, or the paddock instead of the stall. Keep stacking different contexts until calm reads as the baseline, not the situation.",
        "If the ear tension comes back, rule out physical first (dental, poll soreness) before treating it as a behavior thing — usually that kind of localized response has a physical reason underneath.",
        "Once you've got three positive contexts on file, this horse is solid for groundwork progression.",
      ],
    }
  }

  // Pattern D — escalating tension
  if (hasTensionMarker(l) && hasEscalationMarker(l)) {
    return {
      riskLevel: "monitor",
      riskLabel: "Monitor",
      patternNote: `${animalName}'s tension didn't resolve in this session — it built. That's a different read from a brief reaction that settles. Worth pausing the work and running through what changed.`,
      recommendations: [
        "Step 1 — what changed since last session? Recent farrier or vet visit, feed change, new turnout, weather, handler shift. Often the answer's there.",
        "If nothing's changed recently, physical rule-out before assuming training: feet, back/saddle area, mouth/dental are the Tier 1 checks. Poll, ulcers, hocks are Tier 2 if Tier 1's clear.",
        "Don't push through escalating tension — that's how you teach a horse to brace harder. Reset, ground exercise, end on something easy.",
      ],
    }
  }

  // Pattern D — resolving tension
  if (hasTensionMarker(l) && hasResolutionMarker(l)) {
    const dur = extractDurationRough(l)
    const ttype = extractTensionType(l)
    return {
      riskLevel: "good",
      riskLabel: "Good",
      patternNote: `${animalName} showed brief ${ttype} but worked through it within ${dur}. That's habituation reading, not pain reading — the quick recovery is the signal that matters.`,
      recommendations: [
        "Note the trigger location specifically — if the same spot tenses again next session, that's worth tracking.",
        "Don't avoid the area next time — work through it again. Avoiding it teaches the horse the tension worked.",
        "If the duration of recovery shortens across sessions, you're genuinely habituating; if it stays the same or lengthens, that's when to look at it.",
      ],
    }
  }

  // Pattern C — first-time milestone
  const firstPhrases =
    l.includes("first time") ||
    l.includes("first try") ||
    l.includes("for the first time") ||
    l.includes("first halter") ||
    l.includes("first saddle")
  const recentNoteBlob = (context?.recentObservations ?? []).map((o) => lower(o.notes)).join(" | ")
  const blanketFirst =
    (l.includes("saddle blanket") || l.includes("first blanket")) &&
    !recentNoteBlob.includes("blanket") &&
    !recentNoteBlob.includes("pad")
  if (firstPhrases || blanketFirst) {
    let activity = "This"
    if (l.includes("blanket")) activity = "Blanket / pad"
    else if (l.includes("halter")) activity = "Haltering"
    else if (l.includes("mount")) activity = "Mount block"
    return {
      riskLevel: "good",
      riskLabel: "Good",
      patternNote: `${activity} acceptance is a first for ${animalName} in the recent log. That's a marker worth keeping — establishes the baseline you'll be testing against next session.`,
      recommendations: [
        "Try the same thing tomorrow — first acceptance and second acceptance aren't the same thing. The horse remembering it carries the gain.",
        "Vary one variable next time — different handler, different context, or one step further. Don't change everything at once.",
        "Document anything that helped (specific approach, equipment, time of day) so it's reproducible.",
      ],
    }
  }

  // Pattern A — progression within session (stacked steps)
  const progressionPairs: { test: (s: string) => boolean; start: string; end: string; next: string; ctx: string }[] = [
    {
      test: (s) => s.includes("cheek") && s.includes("forehead"),
      start: "cheeks",
      end: "forehead",
      next: "ears or poll",
      ctx: "stall or paddock",
    },
    {
      test: (s) => (s.includes("halter") && s.includes("lead")) || (s.includes("haltered") && s.includes("led")),
      start: "haltering",
      end: "leading",
      next: "lead with direction changes or lead through a narrow",
      ctx: "aisle or pasture gate",
    },
    {
      test: (s) => s.includes("blanket") && (s.includes("surcingle") || s.includes("girth")),
      start: "blanket",
      end: "surcingle / girth",
      next: "surcingle with movement or first saddle",
      ctx: "cross-ties or stall",
    },
  ]
  for (const p of progressionPairs) {
    if (p.test(l) && (l.includes("then") || l.includes("progressed") || l.includes("into"))) {
      return {
        riskLevel: "good",
        riskLabel: "Good",
        patternNote: `Solid session for ${animalName} — you stacked ${p.start} into ${p.end} in one go without losing the calm baseline. That kind of layering only holds when the earlier step is genuinely accepted, not just tolerated.`,
        recommendations: [
          `Next session, try ${p.next} — natural progression from where you ended today.`,
          `Worth varying context too — same sequence somewhere else (${p.ctx}) tests whether this is generalizing or stall-specific.`,
          "Note the exact stopping point so you know where to pick up next time.",
        ],
      }
    }
  }

  // Fallback tiers — err quiet on risk
  const flagKw =
    l.includes("kicked") ||
    l.includes("bite") ||
    l.includes("striking") ||
    l.includes("rearing") ||
    l.includes("bolted")
  const monitorKw =
    l.includes("pinned ears") ||
    l.includes("head toss") ||
    l.includes("refused") ||
    l.includes("tense") ||
    l.includes("anxious")

  if (flagKw && !hasAggressionMarkers(l)) {
    return {
      riskLevel: "flag",
      riskLabel: "Flag",
      patternNote: `Clear safety signal on ${animalName}. Pause and document context before the next session.`,
      recommendations: [
        "Note exactly what triggered it and what came before — warning signs or sudden.",
        "Physical rule-out before assuming behavioral cause.",
        "If the pattern continues after physical's clear, a behaviorist consultation is an option worth considering.",
      ],
    }
  }

  if (monitorKw) {
    return {
      riskLevel: "monitor",
      riskLabel: "Monitor",
      patternNote: `Tension or resistance signal on ${animalName}. Behavior reads are contextual — you know this horse's baseline better than any keyword match. Same signal means different things in feed, handling, or social settings.`,
      recommendations: [
        "Note the specific context (handler, time of day, what was happening before) so the next observation has something to compare against.",
        "Sudden behavior shifts often have a physical cause underneath — dental, ulcer, saddle fit — worth ruling out before treating it as a pure behavior thing.",
        "If the same signal shows up across contexts, that's when to start the rule-out: environmental changes first, then physical.",
      ],
    }
  }

  if (l.includes("calm") || l.includes("accepted") || l.includes("relaxed") || l.includes("responsive")) {
    return {
      riskLevel: "good",
      riskLabel: "Good",
      patternNote: `Positive baseline reading for ${animalName}. Worth noting as a reference point — easier to catch a shift later if you've got the calm baseline documented.`,
      recommendations: [
        "Continue current handling approach.",
        "Vary one variable next session to keep extending the tolerance map.",
      ],
    }
  }

  return {
    riskLevel: "good",
    riskLabel: "Good",
    patternNote: null,
    recommendations: ["Continue routine observation; log any shifts in tolerance, context, or response."],
  }
}
