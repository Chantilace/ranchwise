import { observationDomainFromCategory } from "@/lib/observationDomain"
import { seedDaysAgo } from "@/lib/observationSeedDates"
import type { AIResult, Category, ObservationEntry, RiskLevel } from "@/types/observation"

function ai(riskLevel: RiskLevel, recommendations: string[], patternNote: string | null = null): AIResult {
  return {
    riskLevel,
    riskLabel: riskLevel === "call-vet" ? "Call vet" : riskLevel === "monitor" ? "Monitor" : "No action needed",
    recommendations,
    patternNote,
  }
}

function obs(
  id: string,
  daysAgo: number,
  category: Category,
  notes: string,
  loggedBy: string,
  risk: RiskLevel,
  recs: string[],
  patternNote: string | null = null
): ObservationEntry {
  return {
    id,
    date: seedDaysAgo(daysAgo),
    category,
    observationDomain: observationDomainFromCategory(category),
    notes,
    loggedBy,
    aiResult: ai(risk, recs, patternNote),
  }
}

/** Ace: shoulder scrape fully outside the home 7-day acute window. */
function aceRecoveredNotes(): ObservationEntry[] {
  return [
    obs(
      "sup-ace-1",
      12,
      "Health",
      "Wire scrape on left shoulder — hair growing back flat, no heat, sound at trot in hand. Vet cleared light riding.",
      "Joe",
      "good",
      ["Resume normal work week.", "Note any rub on blanket seam."]
    ),
    obs(
      "sup-ace-2",
      9,
      "Behavior",
      "Hand-grazed along barn aisle — relaxed at grass, head level when trailer passed on county road.",
      "Jake",
      "good",
      ["Repeat once more before first ride back in arena.", "End on slack in the rope."]
    ),
  ]
}

/** Luna: no acute rows inside the weekly rollup window. */
function lunaRoutineNotes(): ObservationEntry[] {
  return [
    obs(
      "sup-luna-1",
      10,
      "Health",
      "Bright check after light week — temp normal, appetite ahead of pen average, gut sounds both sides.",
      "Chantale",
      "good",
      ["Hold current hay ration.", "Log workload after each arena session."]
    ),
    obs(
      "sup-luna-2",
      8,
      "Behavior",
      "Round pen at trot — smooth inside turns, ears soft when asked for whoa.",
      "Maria",
      "good",
      ["Add one figure-eight next session.", "Quit while transitions stay quiet."]
    ),
  ]
}

function rioRoutineNotes(): ObservationEntry[] {
  return [
    obs(
      "sup-rio-1",
      11,
      "Health",
      "Pastern bump from two weeks ago — cold hosed, vet cleared; no heat today at pick-up.",
      "Jake",
      "good",
      ["Keep turnout on soft footing two more days.", "Trot in hand before saddling."]
    ),
    obs(
      "sup-rio-2",
      9,
      "Behavior",
      "Walk-trot longe — relaxed frame, no head toss on downward transitions.",
      "Maria",
      "good",
      ["Same warm-up before next ride.", "Note if he guards the near hind when grooming."]
    ),
  ]
}

function peteTrainingThisWeek(): ObservationEntry[] {
  return [
    obs(
      "sup-pete-beh-1",
      1,
      "Behavior",
      "Worked Pete on flying lead changes — smoother today than last week.",
      "Jake",
      "monitor",
      [
        "Repeat same grid tomorrow with one fewer pole.",
        "Note if hip hikes on the tough direction.",
      ],
      "Training progression — keep sessions short while motor pattern sets."
    ),
  ]
}

function junieJuvenileThisWeek(): ObservationEntry[] {
  return [
    obs(
      "sup-junie-beh-1",
      2,
      "Behavior",
      "Caught Junie easily in pasture for first time without grain bait.",
      "Maria",
      "monitor",
      [
        "Reward catch with quiet release to graze.",
        "Add second handler only if she breaks away twice.",
      ],
      "Early handling win — stack two short sessions this week."
    ),
  ]
}

/** Horses that only receive synthetic bulk rows (no Ace/Luna/Rio arc, no embedded log arcs to edit here). */
const BULK_HORSE_KEYS = [
  "blondie",
  "coyote",
  "wilbur",
  "dusty",
  "amigo",
  "pete",
  "copperette",
  "hollywood",
  "jazzy",
  "red",
  "bosco",
  "blueberry",
  "ranger",
  "cisco",
  "maverick",
  "storm",
  "arrow",
  "cactus",
  "pepper",
  "bandit",
  "sunny",
  "duke",
  "rex",
  "stella",
  "junie",
  "clover",
  "dash",
] as const

type BulkKey = (typeof BULK_HORSE_KEYS)[number]

const OBS = ["Maria", "Joe", "Jake", "Chantale"] as const

function author(seed: number, offset = 0): string {
  return OBS[(seed + offset) % 4]!
}

/** Stable per-horse offset so bulk snippets rotate independently (avoids duplicate bodies across the herd). */
function snippetKeyOffset(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0
  return h >>> 0
}

/** ~60% health / ~40% behavior across “this week” rows for all-good horses. Every `notes` string is unique. */
const HEALTH_GOOD_SNIPPETS: readonly { notes: string; recs: string[] }[] = [
  {
    notes: "Mild stiffness post-ride in hamstrings — cold-hosed, sound at walk-trot in hand next morning.",
    recs: ["Light ride today.", "Recheck after warm-up tomorrow."],
  },
  {
    notes: "Off-loaded sweet feed slowly today, finished but unenthusiastic. Watching for off-tomorrow signs.",
    recs: ["Offer grass hay first tomorrow.", "Note any leftover grain at evening check."],
  },
  {
    notes: "Walked off slow after morning ride, loosened up by mid-afternoon. Possibly stocked up overnight.",
    recs: ["Hand-walk before turnout.", "Cold hose legs if heat returns."],
  },
  {
    notes: "Slight head-bob on right rein at trot, evens out at canter. Recheck Monday.",
    recs: ["Log which circle direction is harder.", "Hold from hard collection until recheck."],
  },
  {
    notes: "Small heat in left hind below hock — icing twice daily, no swelling visible.",
    recs: ["Continue ice schedule.", "Photo with ruler if heat spreads."],
  },
  {
    notes: "Watching after yesterday's harder school — appetite strong, no heat in legs.",
    recs: ["Hand-walk if arena is deep.", "Log any short stride on circle."],
  },
  {
    notes: "Cleaned bowl, drinking well. Coat smooth at brushing, no rubs.",
    recs: ["Same turnout group.", "Note water intake if heat spikes tomorrow."],
  },
  {
    notes: "Trot work easy in both directions, no head bob on the long diagonal.",
    recs: ["Log footing after rain.", "Cool out 10 min extra if humid."],
  },
  {
    notes: "Gut sounds strong both sides post-feed; manure formed, normal color.",
    recs: ["Keep hay net height as-is.", "Weight tape next week."],
  },
  {
    notes: "Skin check at girth — dry, no galls. Sweat dried evenly after ride.",
    recs: ["Wash pad mid-week.", "Tighten girth in three small steps as usual."],
  },
  {
    notes: "Farrier prep: stood on cross-ties through rasp noise without dancing.",
    recs: ["Repeat sound pairing before reset.", "Pick feet before every ride."],
  },
  {
    notes: "Post-vaccine check — no heat at neck site, appetite normal at evening hay.",
    recs: ["Hand-walk light tomorrow.", "Note any hives at morning feed."],
  },
  {
    notes: "Hay-stretch chew session — even pressure, no quid on the mat afterward.",
    recs: ["Keep hay coarse.", "Occlusal visit on schedule next spring."],
  },
  {
    notes: "Hoof pick all four — no thrush smell in grooves, frogs firm.",
    recs: ["Dust paddock gate if mud packs.", "Boot if trailering this weekend."],
  },
  {
    notes: "Respiratory quiet at rest; nostrils clean after arena work.",
    recs: ["Dust arena before next hard school.", "Skip work if AQI spikes."],
  },
  {
    notes: "Weight tape steady vs last month — ribs covered, crest cool to touch.",
    recs: ["Hold current ration.", "Photo BCS card for file."],
  },
  {
    notes: "Eye corners clear, no weeping after dusty ride — flushed with saline at tie rail.",
    recs: ["Repeat flush after next windy day.", "Note any rub on fly mask strap."],
  },
  {
    notes: "Pulse and resp back to normal 20 minutes post-work — no cough at cool-out.",
    recs: ["Same cool-out routine.", "Skip arena if AQI spikes above yellow."],
  },
  {
    notes: "Slight fill in right front pastern overnight, gone after hand-walk and turnout.",
    recs: ["Cold hose if it returns.", "Log footing hardness at gate."],
  },
  {
    notes: "Manure a touch loose after pasture change — appetite still aggressive at hay.",
    recs: ["Hold grain one meal.", "Probiotic scoop with evening hay."],
  },
  {
    notes: "Neck sweat even; no soreness on palpation along topline after hill work.",
    recs: ["Keep hill day spacing at 48h.", "Stretch neck both sides before tacking."],
  },
  {
    notes: "Water intake up slightly in heat — buckets refilled twice, urination normal.",
    recs: ["Electrolyte pinch in evening feed if heat holds.", "Shade check at noon."],
  },
  {
    notes: "No cough at feed despite dusty delivery truck — stood relaxed on tie line.",
    recs: ["Wet hay if truck returns same day.", "Note any nasal drip at night check."],
  },
  {
    notes: "Skin along jaw dry but not flaky — coat oil brushed in, no rub on halter.",
    recs: ["Repeat light oil weekly.", "Check halter fit at cheek."],
  },
  {
    notes: "Heart rate normal at 10 min post-trot set — recovery line matches last month.",
    recs: ["Keep interval work as written.", "Add one walk break if humidity jumps."],
  },
]

const BEHAVIOR_GOOD_SNIPPETS: readonly { notes: string; recs: string[] }[] = [
  {
    notes: "Whole herd grazing peacefully in main pasture, no fence walking.",
    recs: ["Same route tomorrow.", "Note wind if it switches to west."],
  },
  {
    notes: "Group caught up on round bale, no sparring — good spacing at hay ring.",
    recs: ["Leave tubs as-is.", "Spread one more tub if count jumps next week."],
  },
  {
    notes: "Came up to the gate at evening feed without prompting. Calm during halter.",
    recs: ["Reward quiet stand.", "Repeat from farther back tomorrow."],
  },
  {
    notes: "Third quiet trailer load this week — stepped on at the ramp with less hesitation than last session.",
    recs: ["Quiet release at ramp.", "Same shipper next trip."],
  },
  {
    notes: "Solo lunge in the round pen, holding canter departures cleanly.",
    recs: ["Add one transition each way next session.", "Quit while departures stay straight."],
  },
  {
    notes: "Ground driving from behind — calm, responsive to voice cues and light line pressure.",
    recs: ["Keep lines soft.", "End when tracking stays straight for half a pass."],
  },
  {
    notes: "Sent through the round pen, asking for inside turn — soft change both ways.",
    recs: ["Repeat tomorrow with one less circle.", "Note if hip hikes on tough side."],
  },
  {
    notes: "Stood tied at the wash rack fifteen minutes without pawing the mat.",
    recs: ["Add five minutes twice this week.", "Pair with brushing at the end."],
  },
  {
    notes: "Halter on in the stall — accepted face brushing along cheeks without flinching.",
    recs: ["Introduce mane side next.", "Keep sessions under 12 minutes."],
  },
  {
    notes: "Picked up all four feet in the aisle, square over own feet without leaning on the handler.",
    recs: ["Same order of feet next time.", "Reward square stand before pick-up."],
  },
  {
    notes: "First saddle pad in cross-ties — stood square on the rail, no sidestep when pad settled.",
    recs: ["Add girth snug next session.", "Keep handler voice low and steady."],
  },
  {
    notes: "Settled into new turnout group within an hour. Eating with the others at the second hay drop.",
    recs: ["Watch first 20 min at tomorrow turnout.", "Note who he pairs with at water."],
  },
  {
    notes: "Ground tie while tractor idled two stalls down — head level, cocked a hind to rest.",
    recs: ["Add 5 min to tie time twice this week.", "End on slack in the rope."],
  },
  {
    notes: "Opened gate to pasture — waited for soft cue, no shoulder through the gap.",
    recs: ["Same release word every time.", "Back a step if he crowds the latch."],
  },
  {
    notes: "Herd spacing at hay ring — took outer spot, no squeal when another horse joined.",
    recs: ["Positive social note.", "Spread tubs if crowding returns."],
  },
  {
    notes: "First ride after two days off — forward but listening, no rooting at the bit.",
    recs: ["Keep warm-up walk 10 min.", "Stretch long rein before collection."],
  },
  {
    notes: "Trailered to neighbor arena — loaded on second quiet ask, unloaded square.",
    recs: ["Practice step-up without moving off three times.", "Same shipper next trip."],
  },
  {
    notes: "Stood for fly spray — one step back on first mist, then dropped head for the rest.",
    recs: ["Pair spray with rub on neck.", "Shorter trigger next session."],
  },
  {
    notes: "Backed three steps off halter pressure, straight down the barn aisle.",
    recs: ["Quit while backing stays rhythmical.", "Add a turn cue next session."],
  },
  {
    notes: "Sidepass along open gate without rushing the latch — hips followed shoulders.",
    recs: ["Repeat from both reins.", "Reward when poll drops an inch."],
  },
  {
    notes: "Walked over ground poles on a loose rein — even rhythm, no rush into the last pole.",
    recs: ["Raise poles one notch next week.", "Note footing if irrigation runs."],
  },
]

/** Flag episode fully outside the home card’s 7-day window; only good rows fall inside it. */
const RECOVERED_FLAG: readonly { notes: string; recs: string[] }[] = [
  {
    notes: "Temp spike to 102.8°F at evening check. Sweat patches, slow gut sounds. Vet contacted.",
    recs: ["Walk until vet arrives.", "No concentrate until cleared.", "Water in shade."],
  },
  {
    notes: "Hard stumble off a slick rock on trail — scraped right knee, small bleed. Sound at trot in hand afterward.",
    recs: ["Cold hose 10 min.", "Photo for text thread.", "Hold from group gallop three days."],
  },
]

function pick<T>(arr: readonly T[], i: number): T {
  return arr[Math.abs(i) % arr.length]!
}

/**
 * Bulk herd: 26 all-good (no actionable in last 7d), 2 “flag then recovered” (acute outside the week).
 * Monitor-level bulk rows were removed so scripted arcs + roster gap rows land near the 5–7 watch target.
 * Recency for all-good: ~50% primary in 0–2d, ~30% in 3–5d, ~20% in 6–7d.
 */
function bulkForHorse(key: BulkKey, globalIndex: number): ObservationEntry[] {
  const out: ObservationEntry[] = []

  if (globalIndex < 26) {
    const ho = snippetKeyOffset(key)
    const hi = globalIndex % HEALTH_GOOD_SNIPPETS.length
    const bi = globalIndex % BEHAVIOR_GOOD_SNIPPETS.length
    let d0: number
    let d1: number
    if (globalIndex < 11) {
      d0 = globalIndex % 3
      d1 = Math.min(6, d0 + 3 + (globalIndex % 2))
    } else if (globalIndex < 18) {
      d0 = 3 + (globalIndex % 3)
      d1 = Math.min(6, d0 + 2)
    } else {
      d0 = 5 + (globalIndex % 3)
      d1 = Math.min(6, d0 + 1)
    }
    const healthFirst = globalIndex % 5 < 3
    if (healthFirst) {
      const h = pick(HEALTH_GOOD_SNIPPETS, hi + globalIndex + ho)
      out.push(obs(`sup-${key}-a`, d0, "Health", h.notes, author(globalIndex), "good", [...h.recs]))
      const b = pick(BEHAVIOR_GOOD_SNIPPETS, bi + globalIndex * 7 + ho)
      out.push(obs(`sup-${key}-b`, d1, "Behavior", b.notes, author(globalIndex, 1), "good", [...b.recs]))
    } else {
      const b = pick(BEHAVIOR_GOOD_SNIPPETS, bi + globalIndex + ho)
      out.push(obs(`sup-${key}-a`, d0, "Behavior", b.notes, author(globalIndex), "good", [...b.recs]))
      const h = pick(HEALTH_GOOD_SNIPPETS, hi + globalIndex * 7 + ho)
      out.push(obs(`sup-${key}-b`, d1, "Health", h.notes, author(globalIndex, 1), "good", [...h.recs]))
    }
    if (globalIndex % 4 === 0) {
      const hx = pick(HEALTH_GOOD_SNIPPETS, hi + globalIndex + 50 + ho)
      out.push(obs(`sup-${key}-c`, 2, "Health", hx.notes, author(globalIndex, 2), "good", [...hx.recs]))
    }
    return out
  }

  const flagStory = pick(RECOVERED_FLAG, globalIndex)
  out.push(obs(`sup-${key}-f0`, 12, "Health", flagStory.notes, author(globalIndex), "call-vet", [...flagStory.recs]))
  out.push(
    obs(
      `sup-${key}-f1`,
      8,
      "Health",
      "Temp normal this morning, gut sounds back on both sides. Appetite returning — vet says monitor another 24h.",
      author(globalIndex, 1),
      "monitor",
      ["Small hay meals every 4h.", "Page vet line if temp bumps again."]
    )
  )
  const ho = snippetKeyOffset(key)
  const ok = pick(HEALTH_GOOD_SNIPPETS, globalIndex + 20 + ho)
  out.push(
    obs(
      `sup-${key}-f2`,
      3,
      "Health",
      "Back to full feed, normal energy at turnout. Cleared by vet for light riding.",
      author(globalIndex, 2),
      "good",
      [...ok.recs]
    )
  )
  const bok = pick(BEHAVIOR_GOOD_SNIPPETS, globalIndex + 31 + ho)
  out.push(obs(`sup-${key}-f3`, 0, "Behavior", bok.notes, author(globalIndex, 3), "good", [...bok.recs]))
  return out
}

/**
 * Extra horse observations with dates anchored to "today" so home + roster stay lively.
 * Merged in `buildInitialObservationsMap` (sorted newest-first with embedded logs).
 */
export function buildSupplementalHorseObservations(): Record<string, ObservationEntry[]> {
  const out: Record<string, ObservationEntry[]> = {
    ace: aceRecoveredNotes(),
    luna: lunaRoutineNotes(),
    rio: rioRoutineNotes(),
    pete: peteTrainingThisWeek(),
    junie: junieJuvenileThisWeek(),
  }
  for (let i = 0; i < BULK_HORSE_KEYS.length; i++) {
    const key = BULK_HORSE_KEYS[i]!
    out[key] = bulkForHorse(key, i)
  }
  return out
}
