import type { PastureCheckCategory, PastureCheckEntry } from "@/lib/pastureCheckTypes"
import type { PastureStatus } from "@/lib/statusUtils"

const MS_DAY = 86_400_000

function daysAgo(days: number): number {
  return Date.now() - days * MS_DAY
}

type SeedRow = Omit<PastureCheckEntry, "id" | "pastureId" | "date"> & {
  daysAgo: number
  id: string
}

const AUTHORS = ["Chantale", "Joe", "Maria", "Jake"] as const

function row(
  id: string,
  daysAgo: number,
  category: PastureCheckCategory,
  status: PastureStatus,
  body: string,
  author: (typeof AUTHORS)[number]
): SeedRow {
  return { id, daysAgo, category, status, body, author, aiResult: null }
}

/**
 * Demo checks per pasture (6–8 each, ~30 days).
 * Latest checks: four pastures within ~5–7d; Northwest ~11d (Watch on home, not High).
 */
const SEED_ROWS: Record<string, SeedRow[]> = {
  east: [
    row(
      "pc-east-1",
      5,
      "walk_through",
      "stable",
      "Walked full perimeter — hot wire singing, no shorts. East troughs full, float on north tank quiet. Herd spread from gate to mid-slope, calves on clean green strip.",
      "Chantale"
    ),
    row(
      "pc-east-2",
      5,
      "drive_by",
      "stable",
      "Drive-by at lunch: no fence lean, salt tubs visible, cattle heads up chewing.",
      "Joe"
    ),
    row(
      "pc-east-3",
      9,
      "targeted_check",
      "concern",
      "Targeted look at low gate corner after rain — rutting 6 inches deep, water not ponding yet but getting soft.",
      "Maria"
    ),
    row(
      "pc-east-4",
      14,
      "walk_through",
      "stable",
      "Fence brush cleared off bottom wire for 200 yards. Creek branch running clear, no cattle belly-deep.",
      "Jake"
    ),
    row(
      "pc-east-5",
      21,
      "maintenance",
      "stable",
      "Replaced two fiberglass posts west knoll; tamped cold mix in post holes, tension reset next morning.",
      "Chantale"
    ),
    row(
      "pc-east-6",
      28,
      "walk_through",
      "concern",
      "Wild rose runners grabbing bottom wire in draw — trimmed by hand, flagged east end for mower when dry.",
      "Joe"
    ),
  ],
  northeast: [
    row(
      "pc-ne-1",
      6,
      "walk_through",
      "concern",
      "Full walk — pond ring firm but cattle have carved a deep path on north bank. Salt low in second tub.",
      "Maria"
    ),
    row(
      "pc-ne-2",
      15,
      "drive_by",
      "stable",
      "Evening drive-by: hay ring has hay, no fence pressure at feed.",
      "Joe"
    ),
    row(
      "pc-ne-3",
      18,
      "targeted_check",
      "action_needed",
      "Checked pond overflow — pipe mouth partly blocked with debris after wind. Cleared by hand; want gravel on spill path.",
      "Chantale"
    ),
    row(
      "pc-ne-4",
      22,
      "walk_through",
      "stable",
      "Counted waterers at dusk, all four cycling. Heifers calm, no buller activity noted.",
      "Jake"
    ),
    row(
      "pc-ne-5",
      26,
      "maintenance",
      "stable",
      "Greased north gate hinges and replaced bent latch pin — swings one-handed again.",
      "Maria"
    ),
    row(
      "pc-ne-6",
      29,
      "drive_by",
      "concern",
      "Quick pass: dust trail tight on fence line — cattle walking wire; note for walk-through soon.",
      "Chantale"
    ),
  ],
  southeast: [
    row("pc-se-1", 4, "drive_by", "stable", "Morning drive-by — pairs up on feed, no limping visible from road.", "Joe"),
    row(
      "pc-se-2",
      4,
      "walk_through",
      "stable",
      "Creek crossing boards solid, gravel apron holding. Fence tension even both sides of dip.",
      "Chantale"
    ),
    row(
      "pc-se-3",
      8,
      "targeted_check",
      "stable",
      "Investigated south gate creep — latch was backing off; tightened bolts, added second pin.",
      "Maria"
    ),
    row(
      "pc-se-4",
      13,
      "walk_through",
      "concern",
      "Muddy pull-up at gate deeper after truck traffic — want 2 yards gravel on schedule.",
      "Jake"
    ),
    row(
      "pc-se-5",
      19,
      "drive_by",
      "stable",
      "Dusk pass — herd on hay ring, no bellowing at water.",
      "Joe"
    ),
    row(
      "pc-se-6",
      24,
      "maintenance",
      "stable",
      "Trimmed willow limbs drooping into hot wire along south fence; hauled brush out.",
      "Chantale"
    ),
    row(
      "pc-se-7",
      27,
      "walk_through",
      "stable",
      "Salt blocks at two stations, both half gone — normal use for group size.",
      "Maria"
    ),
  ],
  west: [
    row(
      "pc-w-1",
      6,
      "walk_through",
      "concern",
      "Bull pasture walk — dominant bull visible, fence hot OK, but tank float chattering — valve may be worn.",
      "Maria"
    ),
    row(
      "pc-w-2",
      18,
      "drive_by",
      "stable",
      "Drive-by only — bulls loafing in shade, no pushing at gate.",
      "Joe"
    ),
    row(
      "pc-w-3",
      21,
      "targeted_check",
      "action_needed",
      "Opened solar pump box — connection tight, but pressure switch cycling fast; temp bypass until parts.",
      "Chantale"
    ),
    row(
      "pc-w-4",
      24,
      "walk_through",
      "stable",
      "H-brace temp wire still holding; marked post for permanent brace kit next haul.",
      "Jake"
    ),
    row(
      "pc-w-5",
      27,
      "maintenance",
      "concern",
      "Replaced 40 feet of worn poly along creek bend; old wire had UV cracks — hot tested 6.2 kv after.",
      "Maria"
    ),
    row(
      "pc-w-6",
      30,
      "walk_through",
      "stable",
      "Water tank level good after repair; no algae film on walls.",
      "Chantale"
    ),
  ],
  northwest: [
    row(
      "pc-nw-1",
      11,
      "walk_through",
      "concern",
      "Heifer group calm but north fence line has fresh rub marks on T-post paint — watch for wire contact.",
      "Joe"
    ),
    row(
      "pc-nw-2",
      19,
      "drive_by",
      "stable",
      "Drive-by mid-day: four waterers visible, cattle not bunched.",
      "Chantale"
    ),
    row(
      "pc-nw-3",
      22,
      "targeted_check",
      "stable",
      "Checked automatic on hill — filter screen cleaned, flow strong.",
      "Maria"
    ),
    row(
      "pc-nw-4",
      25,
      "walk_through",
      "action_needed",
      "Found loose brace wire on corner H — retensioned and flagged for crew to reset post when equipment free.",
      "Jake"
    ),
    row(
      "pc-nw-5",
      28,
      "maintenance",
      "stable",
      "Oiled all gate latches on west haul road access; replaced one hinge bolt that was backing out.",
      "Joe"
    ),
    row(
      "pc-nw-6",
      30,
      "walk_through",
      "stable",
      "Creek bank stable, willow shade intact, no new cattle trails cutting bank.",
      "Maria"
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
