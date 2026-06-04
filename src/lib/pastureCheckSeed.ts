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
      "Juniper"
    ),
    row(
      "pc-east-2",
      5,
      "drive_by",
      "stable",
      "Drive-by at lunch: no fence lean, salt tubs visible, cattle heads up chewing.",
      "Wyatt"
    ),
    row(
      "pc-east-3",
      9,
      "maintenance",
      "concern",
      "Targeted look at low gate corner after rain — rutting 6 inches deep, water not ponding yet but getting soft.",
      "Lou"
    ),
    row(
      "pc-east-4",
      14,
      "horseback",
      "stable",
      "Fence brush cleared off bottom wire for 200 yards. Creek branch running clear, no cattle belly-deep.",
      "Wes"
    ),
    row(
      "pc-east-5",
      21,
      "maintenance",
      "stable",
      "Replaced two fiberglass posts west knoll; tamped cold mix in post holes, tension reset next morning.",
      "Juniper"
    ),
    row(
      "pc-east-6",
      28,
      "horseback",
      "concern",
      "Wild rose runners grabbing bottom wire in draw — trimmed by hand, flagged east end for mower when dry.",
      "Wyatt"
    ),
  ],
  northeast: [
    row(
      "pc-ne-1",
      6,
      "horseback",
      "concern",
      "Full walk — pond ring firm but cattle have carved a deep path on north bank. Salt low in second tub.",
      "Lou"
    ),
    row(
      "pc-ne-2",
      15,
      "drive_by",
      "stable",
      "Evening drive-by: hay ring has hay, no fence pressure at feed.",
      "Wyatt"
    ),
    row(
      "pc-ne-3",
      18,
      "maintenance",
      "action_needed",
      "Checked pond overflow — pipe mouth partly blocked with debris after wind. Cleared by hand; want gravel on spill path.",
      "Juniper"
    ),
    row(
      "pc-ne-4",
      22,
      "horseback",
      "stable",
      "Counted waterers at dusk, all four cycling. Heifers calm, no buller activity noted.",
      "Wes"
    ),
    row(
      "pc-ne-5",
      26,
      "maintenance",
      "stable",
      "Greased north gate hinges and replaced bent latch pin — swings one-handed again.",
      "Lou"
    ),
    row(
      "pc-ne-6",
      29,
      "drive_by",
      "concern",
      "Quick pass: dust trail tight on fence line — cattle walking wire; note for walk-through soon.",
      "Juniper"
    ),
  ],
  southeast: [
    row("pc-se-1", 4, "drive_by", "stable", "Morning drive-by — pairs up on feed, no limping visible from road.", "Wyatt"),
    row(
      "pc-se-2",
      4,
      "horseback",
      "stable",
      "Creek crossing boards solid, gravel apron holding. Fence tension even both sides of dip.",
      "Juniper"
    ),
    row(
      "pc-se-3",
      8,
      "maintenance",
      "stable",
      "Investigated south gate creep — latch was backing off; tightened bolts, added second pin.",
      "Lou"
    ),
    row(
      "pc-se-4",
      13,
      "horseback",
      "concern",
      "Muddy pull-up at gate deeper after truck traffic — want 2 yards gravel on schedule.",
      "Wes"
    ),
    row(
      "pc-se-5",
      19,
      "drive_by",
      "stable",
      "Dusk pass — herd on hay ring, no bellowing at water.",
      "Wyatt"
    ),
    row(
      "pc-se-6",
      24,
      "maintenance",
      "stable",
      "Trimmed willow limbs drooping into hot wire along south fence; hauled brush out.",
      "Juniper"
    ),
    row(
      "pc-se-7",
      27,
      "horseback",
      "stable",
      "Salt blocks at two stations, both half gone — normal use for group size.",
      "Lou"
    ),
  ],
  west: [
    row(
      "pc-w-1",
      6,
      "horseback",
      "concern",
      "Bull pasture walk — dominant bull visible, fence hot OK, but tank float chattering — valve may be worn.",
      "Lou"
    ),
    row(
      "pc-w-2",
      18,
      "drive_by",
      "stable",
      "Drive-by only — bulls loafing in shade, no pushing at gate.",
      "Wyatt"
    ),
    row(
      "pc-w-3",
      21,
      "maintenance",
      "action_needed",
      "Opened solar pump box — connection tight, but pressure switch cycling fast; temp bypass until parts.",
      "Juniper"
    ),
    row(
      "pc-w-4",
      24,
      "horseback",
      "stable",
      "H-brace temp wire still holding; marked post for permanent brace kit next haul.",
      "Wes"
    ),
    row(
      "pc-w-5",
      27,
      "maintenance",
      "concern",
      "Replaced 40 feet of worn poly along creek bend; old wire had UV cracks — hot tested 6.2 kv after.",
      "Lou"
    ),
    row(
      "pc-w-6",
      30,
      "horseback",
      "stable",
      "Water tank level good after repair; no algae film on walls.",
      "Juniper"
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
        riskLabel: "Stable",
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
        riskLabel: "Concern",
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
      "Wyatt"
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
