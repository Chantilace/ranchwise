import type { PastureCheckCategory, PastureCheckEntry } from "@/lib/pastureCheckTypes"
import type { ApprovedLogAuthor } from "@/lib/ranchCrewAuthors"
import type { PastureStatus } from "@/lib/statusUtils"
import type { AIResult } from "@/types/observation"

const MS_DAY = 86_400_000

function daysAgo(days: number): number {
  return Date.now() - days * MS_DAY
}

type SeedRow = Omit<PastureCheckEntry, "id" | "pastureId" | "date"> & {
  daysAgo: number
  id: string
}

function row(
  id: string,
  daysAgo: number,
  category: PastureCheckCategory,
  status: PastureStatus,
  body: string,
  author: ApprovedLogAuthor,
  aiResult?: AIResult | null
): SeedRow {
  return { id, daysAgo, category, status, body, author, aiResult: aiResult ?? null }
}

/**
 * Demo checks per pasture (6–8 each, ~30 days).
 * Latest checks: four pastures within ~5–7d; Northwest includes demo progression pair (18d / 11d) plus a recent drive-by.
 */
const SEED_ROWS: Record<string, SeedRow[]> = {
  east: [
    row(
      "pc-east-1",
      5,
      "horseback",
      "stable",
      "Walked full perimeter — hot wire singing, no shorts. East troughs full, float on north tank quiet. Herd spread from gate to mid-slope, calves on clean green strip.",
      "Juniper",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Hold current perimeter cadence; next full walk in 5–7 days."],
        patternNote: "Hot wire, troughs, and herd spread all reading clean together.",
      }
    ),
    row(
      "pc-east-2",
      5,
      "drive_by",
      "stable",
      "Drive-by at lunch: no fence lean, salt tubs visible, cattle heads up chewing.",
      "Wyatt",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["No follow-up needed; resume normal drive-by rotation."],
        patternNote: null,
      }
    ),
    row(
      "pc-east-3",
      9,
      "maintenance",
      "concern",
      "Targeted look at low gate corner after rain — rutting 6 inches deep, water not ponding yet but getting soft.",
      "Lou",
      {
        riskLevel: "monitor",
        riskLabel: "Monitor",
        patternNote: "Six-inch rutting at the low gate corner is the first sign the corner will pond if traffic continues through wet spells.",
        recommendations: [
          "Recheck the gate corner after the next rain to see if water starts standing.",
          "Stage 2–3 yards of gravel so the corner can be capped before it softens further.",
        ],
      }
    ),
    row(
      "pc-east-4",
      14,
      "horseback",
      "stable",
      "Fence brush cleared off bottom wire for 200 yards. Creek branch running clear, no cattle belly-deep.",
      "Wes",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Bottom wire is clear; recheck the cleared run on the next horseback pass."],
        patternNote: "Brush cleared and creek running clear keeps the bottom wire grounded and effective.",
      }
    ),
    row(
      "pc-east-5",
      21,
      "maintenance",
      "stable",
      "Replaced two fiberglass posts west knoll; tamped cold mix in post holes, tension reset next morning.",
      "Juniper",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Re-check tension on the two west knoll posts once the cold mix has fully cured."],
        patternNote: null,
      }
    ),
    row(
      "pc-east-6",
      28,
      "horseback",
      "concern",
      "Wild rose runners grabbing bottom wire in draw — trimmed by hand, flagged east end for mower when dry.",
      "Wyatt",
      {
        riskLevel: "monitor",
        riskLabel: "Monitor",
        patternNote: "Wild rose runners reaching the bottom wire in the draw will keep regrowing and leaking voltage until the east end is mowed.",
        recommendations: [
          "Mow the flagged east end once the draw dries enough to get equipment in.",
          "Voltage-test the bottom wire in the draw to confirm the trim restored the ground.",
        ],
      }
    ),
  ],
  northeast: [
    row(
      "pc-ne-1",
      6,
      "horseback",
      "concern",
      "Full walk — pond ring firm but cattle have carved a deep path on north bank. Salt low in second tub.",
      "Lou",
      {
        riskLevel: "monitor",
        riskLabel: "Monitor",
        patternNote: "A deepening cattle path on the north pond bank is early erosion that can undercut the ring if traffic stays concentrated there.",
        recommendations: [
          "Top off the second salt tub to help pull grazing pressure off the north bank.",
          "Recheck the north bank path in 7–10 days for further cut-in.",
        ],
      }
    ),
    row(
      "pc-ne-2",
      15,
      "drive_by",
      "stable",
      "Evening drive-by: hay ring has hay, no fence pressure at feed.",
      "Wyatt",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Feed area reading clean; continue evening drive-by checks."],
        patternNote: null,
      }
    ),
    row(
      "pc-ne-3",
      18,
      "maintenance",
      "action_needed",
      "Checked pond overflow — pipe mouth partly blocked with debris after wind. Cleared by hand; want gravel on spill path.",
      "Juniper",
      {
        riskLevel: "flag",
        riskLabel: "Flag",
        patternNote: "A debris-prone overflow pipe mouth can re-block and back the pond up over the spill path during the next wind or storm.",
        recommendations: [
          "Haul and lay gravel on the spill path now so the overflow can pass debris without choking.",
          "Re-clear the pipe mouth after the next windstorm until the gravel is in.",
        ],
      }
    ),
    row(
      "pc-ne-4",
      22,
      "horseback",
      "stable",
      "Counted waterers at dusk, all four cycling. Heifers calm, no buller activity noted.",
      "Wes",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["All four waterers cycling; keep the dusk waterer count on the next walk."],
        patternNote: "Full waterer cycling plus calm heifers with no buller activity is a healthy baseline.",
      }
    ),
    row(
      "pc-ne-5",
      26,
      "maintenance",
      "stable",
      "Greased north gate hinges and replaced bent latch pin — swings one-handed again.",
      "Lou",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["North gate swings clean; re-grease hinges at the next maintenance pass."],
        patternNote: null,
      }
    ),
    row(
      "pc-ne-6",
      29,
      "drive_by",
      "concern",
      "Quick pass: dust trail tight on fence line — cattle walking wire; note for walk-through soon.",
      "Juniper",
      {
        riskLevel: "monitor",
        riskLabel: "Monitor",
        patternNote: "Cattle walking tight to the wire is often the first cue they are testing or being pushed against the fence line.",
        recommendations: [
          "Schedule the noted walk-through soon to inspect that fence line up close.",
          "Voltage-test the line during the walk to rule out a weak charge drawing them to it.",
        ],
      }
    ),
  ],
  southeast: [
    row("pc-se-1", 4, "drive_by", "stable", "Morning drive-by — pairs up on feed, no limping visible from road.", "Wyatt", {
      riskLevel: "good",
      riskLabel: "Good",
      recommendations: ["Pairs up and sound; continue morning drive-by checks."],
      patternNote: null,
    }),
    row(
      "pc-se-2",
      4,
      "horseback",
      "stable",
      "Creek crossing boards solid, gravel apron holding. Fence tension even both sides of dip.",
      "Juniper",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Crossing and apron holding; re-check boards after the next high water."],
        patternNote: "Solid boards, a holding gravel apron, and even fence tension across the dip all read sound.",
      }
    ),
    row(
      "pc-se-3",
      8,
      "maintenance",
      "stable",
      "Investigated south gate creep — latch was backing off; tightened bolts, added second pin.",
      "Lou",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["South gate latch secured; re-check the bolts hold on the next maintenance pass."],
        patternNote: null,
      }
    ),
    row(
      "pc-se-4",
      13,
      "horseback",
      "concern",
      "Muddy pull-up at gate deeper after truck traffic — want 2 yards gravel on schedule.",
      "Wes",
      {
        riskLevel: "monitor",
        riskLabel: "Monitor",
        patternNote: "The gate pull-up is deepening with each truck pass and will turn into a stuck-vehicle spot if it is not capped.",
        recommendations: [
          "Get the 2 yards of gravel scheduled before the pull-up gets deeper.",
          "Route truck traffic to the firmer approach until the gravel is laid.",
        ],
      }
    ),
    row(
      "pc-se-5",
      19,
      "drive_by",
      "stable",
      "Dusk pass — herd on hay ring, no bellowing at water.",
      "Wyatt",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Herd settled at feed and water; continue dusk passes."],
        patternNote: null,
      }
    ),
    row(
      "pc-se-6",
      24,
      "maintenance",
      "stable",
      "Trimmed willow limbs drooping into hot wire along south fence; hauled brush out.",
      "Juniper",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Willow cleared off the hot wire; watch south fence for regrowth next pass."],
        patternNote: "Trimming the willow limbs off the hot wire restores the south fence charge.",
      }
    ),
    row(
      "pc-se-7",
      27,
      "horseback",
      "stable",
      "Salt blocks at two stations, both half gone — normal use for group size.",
      "Lou",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Salt consumption normal; plan to restock both stations before they run out."],
        patternNote: null,
      }
    ),
  ],
  west: [
    row(
      "pc-w-1",
      6,
      "horseback",
      "concern",
      "Bull pasture walk — dominant bull visible, fence hot OK, but tank float chattering — valve may be worn.",
      "Lou",
      {
        riskLevel: "monitor",
        riskLabel: "Monitor",
        patternNote: "A chattering tank float points to a wearing valve that can stick open or shut and leave the bull tank dry.",
        recommendations: [
          "Watch the bull tank level over the next few days for any drop or overflow.",
          "Have a replacement float valve on hand so it can be swapped before it fails.",
        ],
      }
    ),
    row(
      "pc-w-2",
      18,
      "drive_by",
      "stable",
      "Drive-by only — bulls loafing in shade, no pushing at gate.",
      "Wyatt",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Bulls settled with no gate pressure; continue drive-by checks."],
        patternNote: null,
      }
    ),
    row(
      "pc-w-3",
      21,
      "maintenance",
      "action_needed",
      "Opened solar pump box — connection tight, but pressure switch cycling fast; temp bypass until parts.",
      "Juniper",
      {
        riskLevel: "flag",
        riskLabel: "Flag",
        patternNote: "A fast-cycling pressure switch will short-cycle the solar pump and can burn it out, leaving the pasture without water.",
        recommendations: [
          "Order the replacement pressure switch now and swap it before the temp bypass fails.",
          "Check water levels daily while running on bypass.",
        ],
      }
    ),
    row(
      "pc-w-4",
      24,
      "horseback",
      "stable",
      "H-brace temp wire still holding; marked post for permanent brace kit next haul.",
      "Wes",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Temp brace wire holding; bring the permanent brace kit on the next haul as marked."],
        patternNote: null,
      }
    ),
    row(
      "pc-w-5",
      27,
      "maintenance",
      "concern",
      "Replaced 40 feet of worn poly along creek bend; old wire had UV cracks — hot tested 6.2 kv after.",
      "Lou",
      {
        riskLevel: "monitor",
        riskLabel: "Monitor",
        patternNote: "UV cracking on the old creek-bend poly suggests other sun-exposed runs may be aging the same way even though this stretch now tests 6.2 kv.",
        recommendations: [
          "Spot-check the rest of the sun-exposed poly along the creek bend for similar UV cracks.",
          "Re-test voltage on the new 40-foot run on the next walk to confirm it holds.",
        ],
      }
    ),
    row(
      "pc-w-6",
      30,
      "horseback",
      "stable",
      "Water tank level good after repair; no algae film on walls.",
      "Juniper",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Tank holding level and clean post-repair; check level again next pass."],
        patternNote: "Good level with no algae film confirms the repair is holding.",
      }
    ),
  ],
  northwest: [
    row(
      "pc-nw-demo-1",
      18,
      "horseback",
      "stable",
      "Good cover overall on sage flats. Minimal bare patches. Fence intact, water levels strong. Cattle distributed evenly.",
      "Juniper",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Continue rotation schedule as planned."],
        patternNote: null,
      }
    ),
    row(
      "pc-nw-demo-2",
      11,
      "horseback",
      "concern",
      "Sage flats grazed evenly. Scattered bare patches starting at south end. Water levels good, fence intact.",
      "Lou",
      {
        riskLevel: "monitor",
        riskLabel: "Monitor",
        patternNote:
          "Bare patch development on south end is early — not yet at recovery threshold but worth tracking on next check.",
        recommendations: [
          "Recheck within 7–10 days to confirm whether bare patches are progressing or holding.",
          "Note grazing pressure and recent rainfall in next observation.",
        ],
      }
    ),
    row(
      "pc-nw-recent-1",
      5,
      "drive_by",
      "stable",
      "Drive-by mid-day: four waterers visible, cattle not bunched on sage flats.",
      "Wyatt",
      {
        riskLevel: "good",
        riskLabel: "Good",
        recommendations: ["Cattle well distributed on the sage flats; continue mid-day drive-bys."],
        patternNote: "Four waterers in use with no bunching means grazing pressure is spread across the flats.",
      }
    ),
  ],
}

export function buildInitialPastureChecksByPastureId(): Record<string, PastureCheckEntry[]> {
  const out: Record<string, PastureCheckEntry[]> = {}
  for (const [pastureId, rows] of Object.entries(SEED_ROWS)) {
    out[pastureId] = rows.map((r) => {
      const { daysAgo: d, ...rest } = r
      return {
        ...rest,
        pastureId,
        date: daysAgo(d),
      }
    })
  }
  return out
}
