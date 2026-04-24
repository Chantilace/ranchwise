import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ObservationTableActionsCell,
  rosterObservationColumnWidthClass,
} from "@/components/ObservationTableActionsCell"
import { RosterCareDateCell } from "@/components/RosterCareDateCell"
import { useRanchData } from "@/contexts/RanchDataContext"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { FeedOption } from "@/lib/constants"
import { parseObservationDate } from "@/lib/initialObservations"
import { compareNullableIsoDates } from "@/lib/rosterCareDate"
import { getStatusBadgeClass } from "@/lib/statusUtils"
import { cn } from "@/lib/utils"

export type LogCategory = "health" | "behavior"

export type ActivityLogEntry = {
  id: string
  date: string
  category: LogCategory
  notes: string
  loggedBy: string
  /** Optional AI-generated summary for the observation */
  aiRecommendation?: string
  /** Optional actionable follow-ups from AI */
  aiNextSteps?: string[]
}

export type HorseTableRow = {
  id?: number | string
  name: string
  age: string
  sex: string
  role: string
  pasture: string
  feed: FeedOption[]
  health: string
  dental: string
  healthStatus: "flag" | "good" | "monitor"
  behaviorStatus: "flag" | "good" | "monitor"
  /** AI-generated health summary text (profile sidebar); derived from latest observation with AI. */
  aiSummary?: string
  /** Circular avatar — demo uses stock photos */
  photoUrl?: string
  logs?: ActivityLogEntry[]
  /** Henneke body condition score 1–9 */
  bodyConditionScore?: number | null
  /** ISO date string (yyyy-mm-dd) — last farrier visit */
  lastFarrier?: string | null
  /** Same meaning as `lastFarrier`; when set, keep both in sync on write */
  lastFarrierDate?: string | null
  /** ISO date string (yyyy-mm-dd) — last dental visit (also mirror display in `dental` for roster) */
  lastDentalDate?: string | null
  /** Optional profile notes (edit profile modal). */
  notes?: string
}

/** Four sample observations — matches activity log design (Minnie). */
const minnieLogs: ActivityLogEntry[] = [
  {
    id: "1",
    date: "3/26/26",
    category: "health",
    notes: "Appetite fair, skin dry.",
    loggedBy: "Chantale",
    aiRecommendation:
      "Mild dehydration or seasonal dry coat may explain reduced appetite and skin condition. No acute distress signals from this note alone.",
    aiNextSteps: [
      "Offer fresh water in multiple locations and log intake for 48 hours.",
      "Add a light equine skin/coat supplement or increase omega-3s if vet approves.",
      "Schedule a quick vet check if appetite drops further or skin becomes flaky or hot.",
    ],
  },
  {
    id: "2",
    date: "3/26/26",
    category: "behavior",
    notes:
      "Ponies are messing with Minnie. She is lethargic and running away. She is not defending herself.",
    loggedBy: "Chantale",
    aiRecommendation:
      "Pattern suggests herd stress or bullying with withdrawal. Lethargy warrants ruling out pain or illness alongside social dynamics.",
    aiNextSteps: [
      "Temporarily separate or rotate pasture groups so Minnie has a safe buddy.",
      "Observe body language at feed time; note who approaches first.",
      "Call the vet if lethargy persists beyond 24–48h or if she stops eating.",
    ],
  },
  {
    id: "3",
    date: "2/16/26",
    category: "health",
    notes: "Dental performed. NSF",
    loggedBy: "Joe",
    aiRecommendation:
      "Post-dental NSF (no significant findings) usually means smooth recovery expected; soft tissue should be monitored short term.",
    aiNextSteps: [
      "Feed soaked hay or chop for several days if chewing seems hesitant.",
      "Recheck in 1–2 weeks if quidding or weight loss appears.",
      "Log any odor or discharge from the mouth.",
    ],
  },
  {
    id: "4",
    date: "1/8/26",
    category: "health",
    notes: "Switched to senior feed with probiotics; intake normal.",
    loggedBy: "Maria",
    aiRecommendation:
      "Diet change appears tolerated with normal intake. Probiotics may help transition; watch for loose manure during the first week.",
    aiNextSteps: [
      "Weigh or body-condition score weekly for two weeks.",
      "Keep hay consistent while the concentrate change stabilizes.",
      "Note any cribbing or urgency at feeding — share with your nutritionist or vet.",
    ],
  },
  {
    id: "5",
    date: "2/10/26",
    category: "health",
    notes:
      "Left shoulder wound first noticed — small laceration, possibly wire. Cleaned, no stitches needed. Monitoring.",
    loggedBy: "Jake",
    aiRecommendation: "Early wound management reduces infection risk significantly.",
    aiNextSteps: [
      "Clean twice daily with dilute betadine.",
      "Apply wound ointment and monitor for heat or swelling.",
      "Log daily until scabbing begins.",
    ],
  },
  {
    id: "6",
    date: "1/28/26",
    category: "behavior",
    notes:
      "Good session in the arena today. Responsive, no resistance. Energy appropriate for the cold weather.",
    loggedBy: "Chantale",
    aiNextSteps: ["Continue regular arena work.", "Note any behavioral changes after herd movement."],
  },
  {
    id: "7",
    date: "1/12/26",
    category: "health",
    notes:
      "Slight dry skin along topline. Feed includes probiotics — may add omega supplement. Eating and moving well.",
    loggedBy: "Maria",
    aiRecommendation: "Dry skin in winter often responds to omega-3 supplementation.",
    aiNextSteps: ["Trial omega supplement for 30 days.", "Reassess coat and skin condition in February."],
  },
  {
    id: "8",
    date: "12/3/25",
    category: "behavior",
    notes:
      "Minnie pinning ears at feeding — low-level tension with the two younger mares. Not escalating.",
    loggedBy: "Jake",
    aiRecommendation: "Ear pinning at feeding is common herd hierarchy behavior. Watch for escalation.",
    aiNextSteps: ["Spread feed stations to reduce competition.", "Monitor for any biting or kicking."],
  },
  {
    id: "9",
    date: "11/11/25",
    category: "health",
    notes:
      "Farrier visit — hooves in good shape. Some minor flaring on front left, addressed. No thrush.",
    loggedBy: "Joe",
    aiNextSteps: ["Next farrier in 8 weeks.", "Keep hooves dry through wet season."],
  },
  {
    id: "10",
    date: "10/22/25",
    category: "health",
    notes:
      "Annual vaccines administered by vet. Good overall health. Vet noted she's in excellent condition for 13.",
    loggedBy: "Chantale",
    aiRecommendation: "Vaccines current. No acute concerns noted at annual exam.",
    aiNextSteps: ["Schedule dental float for early 2026.", "Continue senior monitoring protocol."],
  },
]

const peteLogs: ActivityLogEntry[] = [
  {
    id: "pete-0",
    date: "4/20/26",
    category: "health",
    notes:
      "Pete moving well today — stiffness from earlier in the month fully resolved. Ate full ration. Good energy for his age.",
    loggedBy: "Maria",
    aiNextSteps: ["Continue daily morning walk routine.", "Next vet check scheduled for May."],
  },
  {
    id: "pete-1",
    date: "4/7/26",
    category: "health",
    notes:
      "Moving stiffly this morning, especially in left hind. Warmed up after 10 min walk. Ate full grain ration.",
    loggedBy: "Maria",
    aiRecommendation:
      "Stiffness in older horses often improves with consistent light movement. Monitor for worsening or heat in the joint.",
    aiNextSteps: [
      "Walk Pete for 10–15 minutes each morning before turnout.",
      "Check for heat or swelling in left hind fetlock daily.",
      "Note if cold overnight temperatures correlate with stiffness episodes.",
    ],
  },
  {
    id: "pete-2",
    date: "3/28/26",
    category: "health",
    notes:
      "Weight looking good after senior feed increase last month. Coat dull but expected for this time of year.",
    loggedBy: "Chantale",
    aiRecommendation:
      "Weight stabilization is a positive sign. Dull coat in late winter is normal — should improve with spring grass.",
    aiNextSteps: ["Continue current senior feed ration.", "Add omega supplement if coat doesn't improve by May."],
  },
  {
    id: "pete-3",
    date: "3/12/26",
    category: "health",
    notes:
      "Teeth floated by vet today. Some significant hooks on upper molars — vet said typical for his age. Should be more comfortable eating now.",
    loggedBy: "Maria",
    aiRecommendation: "Post-float recovery usually takes 24–48 hours. Soft feed short-term reduces discomfort.",
    aiNextSteps: [
      "Offer soaked hay or mash for 2–3 days post-float.",
      "Monitor grain intake — improvement should be visible within a week.",
      "Schedule next float in 6 months given his age.",
    ],
  },
  {
    id: "pete-4",
    date: "2/18/26",
    category: "behavior",
    notes:
      "Pete staying back from herd at feeding. Not aggressive, just slow to approach. Ate once others cleared out.",
    loggedBy: "Jake",
    aiRecommendation:
      "Feeding order changes in older horses can signal discomfort, low herd status, or early pain response. Worth monitoring.",
    aiNextSteps: [
      "Feed Pete separately for a week and observe whether intake improves.",
      "Check for any new herd dynamics — new horses or dominance shifts.",
    ],
  },
  {
    id: "pete-5",
    date: "2/4/26",
    category: "health",
    notes: "Minor wound above right knee — looks like fence scrape. Cleaned and applied ointment. Superficial.",
    loggedBy: "Joe",
    aiRecommendation: "Superficial scrapes in healthy horses heal quickly with basic wound care.",
    aiNextSteps: ["Clean and re-apply ointment daily for 3–5 days.", "Watch for heat, swelling, or discharge."],
  },
  {
    id: "pete-6",
    date: "1/22/26",
    category: "health",
    notes:
      "Stiffness worse after cold snap last week. Moving better now that temps are up. Eating well.",
    loggedBy: "Maria",
    aiRecommendation:
      "Temperature-correlated stiffness is common in horses with arthritis. Management focus should be on consistent warmth and movement.",
    aiNextSteps: [
      "Consider a light blanket on nights below 35°F.",
      "Maintain daily walk routine through winter months.",
    ],
  },
  {
    id: "pete-7",
    date: "1/6/26",
    category: "health",
    notes:
      "Senior feed increased to 8lb AM/PM per vet recommendation. Pete underweight going into winter — ribs slightly visible.",
    loggedBy: "Chantale",
    aiRecommendation:
      "Older horses lose condition faster in winter. Feed increase is appropriate. Recheck weight in 3–4 weeks.",
    aiNextSteps: [
      "Weigh or body condition score Pete in 3 weeks.",
      "Add alfalfa flakes if weight doesn't improve within a month.",
    ],
  },
  {
    id: "pete-8",
    date: "12/14/25",
    category: "behavior",
    notes:
      "Good spirits today — followed Maria around the pen. Engaged and curious, no signs of depression.",
    loggedBy: "Maria",
    aiRecommendation:
      "Positive engagement and curiosity in older horses is a good quality of life indicator.",
    aiNextSteps: ["Continue daily interaction routine.", "Note any withdrawal or change in sociability."],
  },
  {
    id: "pete-9",
    date: "11/20/25",
    category: "health",
    notes:
      "Annual vet visit. Vaccinations current, teeth flagged for float in 3 months, joints show mild arthritis consistent with age. Overall healthy for 23.",
    loggedBy: "Chantale",
    aiRecommendation:
      "Vet assessment confirms age-appropriate management plan. Dental and joint monitoring are the two active items.",
    aiNextSteps: ["Schedule teeth float for mid-March.", "Discuss joint supplement options with vet at next visit."],
  },
  {
    id: "pete-10",
    date: "10/30/25",
    category: "health",
    notes:
      "Farrier visit. Hooves in good shape considering age. No cracks or thrush. Trimmed, no shoes needed.",
    loggedBy: "Joe",
    aiNextSteps: ["Schedule next farrier trim in 8 weeks.", "Check hooves weekly for any new cracks."],
  },
]

const ciscoLogs: ActivityLogEntry[] = [
  {
    id: "cisco-1",
    date: "4/5/26",
    category: "health",
    notes: "Routine check — good weight, coat coming in nicely for spring. Moving well. No concerns.",
    loggedBy: "Maria",
    aiNextSteps: ["Continue current feed and turnout schedule."],
  },
  {
    id: "cisco-2",
    date: "3/18/26",
    category: "behavior",
    notes:
      "Cisco unsettled for two days when new horses arrived in adjacent pasture. Settled back to normal by day 3.",
    loggedBy: "Jake",
    aiRecommendation:
      "Temporary anxiety during herd changes is normal. No intervention needed if horse returns to baseline quickly.",
    aiNextSteps: ["Monitor for 5 days after any herd changes.", "Note if anxiety recurs or escalates."],
  },
  {
    id: "cisco-3",
    date: "2/25/26",
    category: "health",
    notes:
      "Minor scrape on right shoulder — cleaned and treated. Likely from fence or gate. Healed within a week.",
    loggedBy: "Joe",
    aiNextSteps: ["Daily ointment for 5 days.", "Watch for infection signs."],
  },
  {
    id: "cisco-4",
    date: "2/8/26",
    category: "health",
    notes:
      "Farrier visit. Good hoof quality. Trimmed all four. Vet noted healthy sole depth for a working horse.",
    loggedBy: "Maria",
    aiNextSteps: ["Next farrier in 8 weeks.", "Continue regular hoof picks after work."],
  },
  {
    id: "cisco-5",
    date: "1/15/26",
    category: "health",
    notes:
      "Teeth floated. Some minor points but nothing severe. Eating normally, no quidding observed.",
    loggedBy: "Chantale",
    aiNextSteps: ["Schedule next float in 12 months.", "Monitor chewing and grain intake."],
  },
  {
    id: "cisco-6",
    date: "12/20/25",
    category: "behavior",
    notes:
      "Calm and reliable during cattle work today. Good energy, no resistance. One of the better days.",
    loggedBy: "Jake",
    aiNextSteps: ["Note any change in energy or willingness after extended work periods."],
  },
  {
    id: "cisco-7",
    date: "11/28/25",
    category: "health",
    notes:
      "Annual vet exam. Vaccinations current. Heart, lungs clear. Vet says Cisco is in excellent working condition.",
    loggedBy: "Chantale",
    aiRecommendation: "Clean bill of health. Continue current management.",
    aiNextSteps: ["Dental float due in January.", "Schedule farrier for February."],
  },
  {
    id: "cisco-8",
    date: "10/15/25",
    category: "health",
    notes:
      "Mild cough noted over two days — resolved on its own. Likely dust from dry conditions. No fever.",
    loggedBy: "Maria",
    aiRecommendation:
      "Short-duration cough without fever is usually environmental. Monitor closely for 48 hours.",
    aiNextSteps: [
      "Soak hay to reduce dust exposure.",
      "Monitor for fever, nasal discharge, or worsening cough.",
      "Log any recurrence.",
    ],
  },
]

const dustyLogs: ActivityLogEntry[] = [
  {
    id: "dusty-1",
    date: "4/3/26",
    category: "behavior",
    notes:
      "Dusty much calmer around the tractor today — 4 weeks of gradual exposure working. No spooking.",
    loggedBy: "Jake",
    aiRecommendation:
      "Desensitization progress is holding. Continue gradual exposure to maintain comfort.",
    aiNextSteps: ["Introduce other machinery sounds gradually.", "Log any regression."],
  },
  {
    id: "dusty-2",
    date: "3/14/26",
    category: "behavior",
    notes: "Spooky near tractor again but recovering faster — 5 seconds vs last month's 30+. Progress.",
    loggedBy: "Jake",
    aiNextSteps: ["Continue daily short exposure sessions.", "End each session on a calm moment."],
  },
  {
    id: "dusty-3",
    date: "2/28/26",
    category: "health",
    notes:
      "Good weight, clean eyes, responsive. Farrier noted hooves are excellent quality for a working horse.",
    loggedBy: "Maria",
    aiNextSteps: ["Next farrier in 8 weeks.", "Continue current feed regimen."],
  },
  {
    id: "dusty-4",
    date: "2/10/26",
    category: "behavior",
    notes:
      "Significant spook response to tractor starting nearby. Bolted 20 feet, settled after 2 minutes. Starting desensitization protocol.",
    loggedBy: "Jake",
    aiRecommendation:
      "Machinery fear in working horses can be addressed with systematic desensitization. Consistent daily work usually shows results in 3–6 weeks.",
    aiNextSteps: [
      "Begin systematic desensitization — start with tractor stationary and at distance.",
      "Reward calm behavior immediately.",
      "Log each session with a 1–10 anxiety rating.",
    ],
  },
  {
    id: "dusty-5",
    date: "1/20/26",
    category: "health",
    notes:
      "Teeth floated by vet. Minimal points — good dental health for his age. Back on full grain same day.",
    loggedBy: "Chantale",
    aiNextSteps: ["Next float in 12 months."],
  },
  {
    id: "dusty-6",
    date: "12/18/25",
    category: "health",
    notes:
      "Annual vaccines done. Vet happy with overall condition. Weight 1,150 lbs, appropriate for frame.",
    loggedBy: "Chantale",
    aiNextSteps: ["Dental float due January.", "Continue current management protocol."],
  },
  {
    id: "dusty-7",
    date: "11/5/25",
    category: "health",
    notes:
      "Mild skin irritation along girth area — saddle fit checked, no pressure sores. Treated with antifungal wash.",
    loggedBy: "Maria",
    aiRecommendation:
      "Girth-area irritation often responds quickly to antifungal treatment and improved airflow.",
    aiNextSteps: [
      "Apply antifungal wash for 5 days.",
      "Air dry thoroughly after each ride.",
      "Have saddle fit re-evaluated if irritation recurs.",
    ],
  },
  {
    id: "dusty-8",
    date: "10/12/25",
    category: "health",
    notes: "Farrier visit. Clean feet, good angles. Dusty was cooperative throughout.",
    loggedBy: "Joe",
    aiNextSteps: ["Next farrier in 8 weeks."],
  },
]

const amigoLogs: ActivityLogEntry[] = [
  {
    id: "amigo-1",
    date: "4/6/26",
    category: "health",
    notes:
      "Good check this morning — bright eyes, full water bucket drained overnight. Energetic at turnout.",
    loggedBy: "Maria",
    aiNextSteps: ["Continue monitoring water intake during warmer weather."],
  },
  {
    id: "amigo-2",
    date: "3/20/26",
    category: "behavior",
    notes:
      "High energy day — bucking at turnout, running fence line. No signs of distress, just fresh after two days off.",
    loggedBy: "Jake",
    aiRecommendation:
      "Exuberant behavior after rest days is normal for energetic horses. Not a welfare concern.",
    aiNextSteps: ["Longe before riding after rest days.", "Note if energy level is consistently elevated."],
  },
  {
    id: "amigo-3",
    date: "3/2/26",
    category: "health",
    notes:
      "Colic scare this morning — pawing, looking at flank. Gut sounds present both sides. Hand-walked 30 min, passed manure, resolved.",
    loggedBy: "Maria",
    aiRecommendation:
      "Gas colic that resolves with walking and normal gut sounds is low risk. Monitor closely for 24 hours.",
    aiNextSteps: [
      "Withhold grain for 12 hours.",
      "Check gut sounds every 2 hours for the rest of the day.",
      "Call vet immediately if symptoms return or worsen.",
      "Review hay quality and recent diet changes.",
    ],
  },
  {
    id: "amigo-4",
    date: "2/12/26",
    category: "health",
    notes:
      "Farrier visit. Front feet showing some chipping — likely from rocky terrain in west pasture. Trimmed and balanced.",
    loggedBy: "Joe",
    aiNextSteps: [
      "Consider hoof hardener if chipping continues.",
      "Next farrier in 7 weeks given current wear rate.",
    ],
  },
  {
    id: "amigo-5",
    date: "1/25/26",
    category: "behavior",
    notes:
      "Amigo challenging Bosco at the water trough — ears back, moving him off. Watched for 10 min, no escalation.",
    loggedBy: "Jake",
    aiRecommendation:
      "Resource guarding at water is common. Adding a second trough reduces competition pressure.",
    aiNextSteps: ["Add second water source in the pasture.", "Monitor for escalation over next week."],
  },
  {
    id: "amigo-6",
    date: "1/8/26",
    category: "health",
    notes: "Dental float done. Good teeth for age — minor hooks only. Eating well.",
    loggedBy: "Chantale",
    aiNextSteps: ["Next float in 12 months."],
  },
  {
    id: "amigo-7",
    date: "12/5/25",
    category: "health",
    notes:
      "Annual vet exam. All vaccines current. Healthy weight at 1,100 lbs. Vet noted very clean lungs.",
    loggedBy: "Chantale",
    aiNextSteps: ["Dental float due January.", "Farrier due February."],
  },
  {
    id: "amigo-8",
    date: "10/18/25",
    category: "behavior",
    notes:
      "Settled well after moving pastures — adjusted to new herd dynamic faster than expected. Eating normally by day 2.",
    loggedBy: "Maria",
    aiNextSteps: ["Monitor for a full week after any pasture changes."],
  },
]

const boscoLogs: ActivityLogEntry[] = [
  {
    id: "bosco-1",
    date: "4/2/26",
    category: "health",
    notes:
      "Looking much better — weight back to normal after winter feed increase. Coat starting to shed nicely.",
    loggedBy: "Maria",
    aiNextSteps: ["Taper back to standard feed ration by May.", "Continue monitoring body condition weekly."],
  },
  {
    id: "bosco-2",
    date: "3/10/26",
    category: "health",
    notes:
      "Fence post scrape on left hip — superficial but about 4 inches long. Cleaned and bandaged. No lameness.",
    loggedBy: "Joe",
    aiRecommendation:
      "Long superficial lacerations heal well with consistent wound care. Watch for proud flesh.",
    aiNextSteps: [
      "Clean and re-bandage daily for 5 days.",
      "Apply wound ointment to minimize scarring.",
      "Monitor for proud flesh formation after day 7.",
    ],
  },
  {
    id: "bosco-3",
    date: "2/20/26",
    category: "health",
    notes:
      "Weight still low — adding 2 extra pounds of hay per day. Ribs slightly visible. No other concerns.",
    loggedBy: "Chantale",
    aiRecommendation:
      "Winter weight loss in working horses is common. Increased forage is the right approach.",
    aiNextSteps: ["Recheck body condition in 3 weeks.", "Consider senior feed if weight doesn't improve."],
  },
  {
    id: "bosco-4",
    date: "1/30/26",
    category: "behavior",
    notes:
      "Calm and consistent at work today. Bosco is the quietest horse in the pen — easy to handle.",
    loggedBy: "Jake",
    aiNextSteps: ["No concerns. Continue current routine."],
  },
  {
    id: "bosco-5",
    date: "1/14/26",
    category: "health",
    notes:
      "Farrier visit. Good hooves, slightly dry from winter conditions. Applied hoof conditioner.",
    loggedBy: "Joe",
    aiNextSteps: ["Apply hoof conditioner weekly through winter.", "Next farrier in 8 weeks."],
  },
  {
    id: "bosco-6",
    date: "12/22/25",
    category: "health",
    notes:
      "Weight trending down since November — increasing hay ration. Not dropping fast but worth watching.",
    loggedBy: "Maria",
    aiRecommendation:
      "Gradual winter weight loss warrants early intervention with increased forage before muscle loss occurs.",
    aiNextSteps: ["Increase hay by 2 lbs per day.", "Body condition score weekly through January."],
  },
  {
    id: "bosco-7",
    date: "11/30/25",
    category: "health",
    notes:
      "Annual vaccines administered. Vet noted good muscle tone and clean respiratory. Weight at lower end of normal.",
    loggedBy: "Chantale",
    aiNextSteps: ["Monitor winter weight. Increase feed if BCS drops below 4.", "Dental float due February."],
  },
  {
    id: "bosco-8",
    date: "10/25/25",
    category: "health",
    notes:
      "Teeth floated. Good dental health — vet said one of the easier floats of the day. Back on grain same evening.",
    loggedBy: "Joe",
    aiNextSteps: ["Next float in 12 months."],
  },
]

const redLogs: ActivityLogEntry[] = [
  {
    id: "red-1",
    date: "4/4/26",
    category: "health",
    notes: "Spring check — good weight, bright eyes, shedding well. No issues.",
    loggedBy: "Maria",
    aiNextSteps: ["Continue current management."],
  },
  {
    id: "red-2",
    date: "3/8/26",
    category: "behavior",
    notes: "Red pinning ears at new horse in adjacent pasture. No fence contact. Monitoring.",
    loggedBy: "Jake",
    aiNextSteps: [
      "Give horses 2 weeks to adjust to visual proximity.",
      "Log if escalates to fence-charging.",
    ],
  },
  {
    id: "red-3",
    date: "2/5/26",
    category: "health",
    notes: "Farrier visit. Hooves in excellent shape. Red was cooperative throughout.",
    loggedBy: "Joe",
    aiNextSteps: ["Next farrier in 8 weeks."],
  },
  {
    id: "red-4",
    date: "12/10/25",
    category: "health",
    notes: "Annual vet exam and vaccines. Clean bill of health. Weight appropriate at 1,080 lbs.",
    loggedBy: "Chantale",
    aiNextSteps: ["Dental float due February.", "Farrier due early March."],
  },
]

const hollywoodLogs: ActivityLogEntry[] = [
  {
    id: "hollywood-1",
    date: "4/1/26",
    category: "behavior",
    notes: "Hollywood showing off at turnout — high-stepping, tail flagged. Good energy, no anxiety.",
    loggedBy: "Maria",
    aiNextSteps: ["Normal expressive behavior. No action needed."],
  },
  {
    id: "hollywood-2",
    date: "3/5/26",
    category: "health",
    notes:
      "Minor eye discharge noted — left eye slightly runny. No swelling or cloudiness. Monitoring.",
    loggedBy: "Chantale",
    aiRecommendation:
      "Mild eye discharge without swelling or cloudiness is often environmental (dust, pollen).",
    aiNextSteps: [
      "Flush eye with saline once daily for 3 days.",
      "Call vet if discharge thickens or eye swells.",
    ],
  },
  {
    id: "hollywood-3",
    date: "2/1/26",
    category: "health",
    notes:
      "Farrier and dental float same day. Good hooves, minor dental points addressed. Hollywood handled it well.",
    loggedBy: "Joe",
    aiNextSteps: ["Next farrier in 8 weeks.", "Next float in 12 months."],
  },
]

const blueberryLogs: ActivityLogEntry[] = [
  {
    id: "blueberry-1",
    date: "3/28/26",
    category: "health",
    notes: "Routine check — good weight, clean feet, alert. Spring shedding underway.",
    loggedBy: "Maria",
    aiNextSteps: ["Continue current management."],
  },
  {
    id: "blueberry-2",
    date: "2/14/26",
    category: "behavior",
    notes: "Blueberry bonded with Jazzy — always grazing nearby. Positive herd integration.",
    loggedBy: "Jake",
    aiNextSteps: ["No action needed. Healthy social bond."],
  },
  {
    id: "blueberry-3",
    date: "1/5/26",
    category: "health",
    notes: "Farrier visit. Good hooves for a younger horse. No issues.",
    loggedBy: "Joe",
    aiNextSteps: ["Next farrier in 8 weeks."],
  },
]

const coyoteLogs: ActivityLogEntry[] = [
  {
    id: "coyote-1",
    date: "4/2/26",
    category: "behavior",
    notes: "Coyote leading well on both sides today. Consistent improvement over the past month.",
    loggedBy: "Jake",
    aiNextSteps: ["Introduce trailer loading next month.", "Continue daily handling sessions."],
  },
  {
    id: "coyote-2",
    date: "3/5/26",
    category: "behavior",
    notes: "Good groundwork session — yielding hindquarters, backing on cue. Curious and engaged.",
    loggedBy: "Jake",
    aiNextSteps: ["Introduce tying for short periods.", "Add saddle pad to desensitization routine."],
  },
  {
    id: "coyote-3",
    date: "2/8/26",
    category: "health",
    notes: "Vet visit — vaccines and first dental check. Vet says teeth look great. Healthy young horse.",
    loggedBy: "Chantale",
    aiNextSteps: ["Next vaccines in 12 months.", "First float likely needed at age 5."],
  },
]

const copperetteLogs: ActivityLogEntry[] = [
  {
    id: "copperette-1",
    date: "3/20/26",
    category: "health",
    notes:
      "Growing well — gaining height and weight on schedule. Good coat, bright eyes. Easy to handle.",
    loggedBy: "Maria",
    aiNextSteps: ["Continue foal/juvenile feed ration.", "Schedule first dental check at age 3."],
  },
  {
    id: "copperette-2",
    date: "1/15/26",
    category: "behavior",
    notes:
      "Copperette curious and friendly with handlers. Following lead rope well for her age.",
    loggedBy: "Jake",
    aiNextSteps: ["Continue daily handling and halter work.", "Introduce hoof picking routine."],
  },
]

/**
 * Demo herd — Figma node 2:3004
 *
 * `photoUrl` must be a direct image URL (e.g. `https://images.unsplash.com/photo-…?q=80&w=1600&auto=format`).
 * Page links like `https://unsplash.com/photos/…` are HTML, not images — `<img>` will not show them.
 * On Unsplash: open the photo → right‑click the image → “Copy image address”.
 */
export const SAMPLE_HORSE_ROWS: HorseTableRow[] = [
  {
    id: "minnie",
    name: "Minnie",
    age: "13 yrs",
    sex: "Mare",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Senior Feed", "Probiotics"],
    health: "04/04/26",
    dental: "03/12/26",
    healthStatus: "flag",
    behaviorStatus: "good",
    photoUrl:
      "https://images.pexels.com/photos/15505335/pexels-photo-15505335.jpeg?auto=compress&cs=tinysrgb&w=1600",
    logs: minnieLogs,
    bodyConditionScore: 7,
    lastFarrier: "2026-01-20",
    lastDentalDate: "2025-05-10",
  },
  {
    id: "blondie",
    name: "Blondie",
    age: "4 yrs",
    sex: "Mare",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfafa", "Hay", "Pasture Graze"],
    health: "01/24/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl:
      "https://images.unsplash.com/photo-1553284965-fa61e9ad4795?q=80&w=1600&auto=format",
    lastFarrier: "2026-02-10",
    lastDentalDate: "2025-10-15",
    logs: [
      {
        id: "b1",
        date: "3/1/26",
        category: "health",
        notes: "Cleaned bucket, full water.",
        loggedBy: "Maria",
        aiRecommendation:
          "Hydration access looks good. Routine bucket hygiene reduces algae and encourages drinking.",
        aiNextSteps: [
          "Scrub buckets on the same schedule each week.",
          "Confirm automatic waterer flow rate in summer heat.",
        ],
      },
      {
        id: "b2",
        date: "2/10/26",
        category: "behavior",
        notes:
          "Blondie spooking at the tarp in the arena corner. Worked through it slowly — touching by end of session.",
        loggedBy: "Jake",
        aiRecommendation: "Systematic desensitization to novel objects is core training work at this age.",
        aiNextSteps: ["Leave tarp in corner for a week.", "Reward any voluntary approach."],
      },
      {
        id: "b3",
        date: "1/14/26",
        category: "health",
        notes:
          "First farrier visit. Blondie nervous but no pulling. Vet tech helped hold. All four feet done.",
        loggedBy: "Joe",
        aiNextSteps: ["Desensitize to hoof handling daily.", "Next farrier in 8 weeks."],
      },
    ],
  },
  {
    id: "coyote",
    name: "Coyote",
    age: "3 yrs",
    sex: "Gelding",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfafa", "Hay", "Pasture Graze"],
    health: "01/24/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl:
      "https://images.unsplash.com/photo-1450052590821-8bf91254a353?q=80&w=1600&auto=format",
    lastFarrier: "2026-02-10",
    lastDentalDate: "2025-10-15",
    logs: coyoteLogs,
  },
  {
    id: "wilbur",
    name: "Wilbur",
    age: "4 yrs",
    sex: "Gelding",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfafa", "Hay", "Pasture Graze"],
    health: "01/24/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl:
      "https://images.pexels.com/photos/6640887/pexels-photo-6640887.jpeg?auto=compress&cs=tinysrgb&w=1600",
    lastFarrier: "2026-02-10",
    lastDentalDate: "2025-10-15",
    logs: [
      {
        id: "w1",
        date: "3/20/26",
        category: "health",
        notes: "Cough noted at turnout — vet aware.",
        loggedBy: "Jake",
      },
      {
        id: "w2",
        date: "2/22/26",
        category: "behavior",
        notes: "Wilbur accepting the saddle pad without moving off. Big progress from last month.",
        loggedBy: "Jake",
        aiNextSteps: ["Introduce saddle weight next session.", "Keep sessions under 20 minutes."],
      },
      {
        id: "w3",
        date: "1/28/26",
        category: "behavior",
        notes:
          "First session with halter pressure — resisting but not panicking. Expected for this stage.",
        loggedBy: "Jake",
        aiNextSteps: ["End each session on a moment of softness.", "Keep pressure-release timing consistent."],
      },
    ],
  },
  {
    id: "dusty",
    name: "Dusty",
    age: "8 yrs",
    sex: "Mare",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfafa", "Hay", "Pasture Graze"],
    health: "01/24/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl:
      "https://images.unsplash.com/photo-1722176621528-e767e740bd89?q=80&w=1600&auto=format",
    lastFarrier: "2026-01-20",
    lastDentalDate: "2025-05-10",
    logs: dustyLogs,
  },
  {
    id: "amigo",
    name: "Amigo",
    age: "8 yrs",
    sex: "Gelding",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfafa", "Hay", "Pasture Graze"],
    health: "01/24/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl:
      "https://images.pexels.com/photos/2633040/pexels-photo-2633040.jpeg?auto=compress&cs=tinysrgb&w=1600",
    lastFarrier: "2026-01-21",
    lastDentalDate: "2025-05-10",
    logs: amigoLogs,
  },
  {
    id: "pete",
    name: "Pete",
    age: "23 yrs",
    sex: "Gelding",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfafa", "Hay", "Pasture Graze"],
    health: "01/24/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl:
      "https://images.pexels.com/photos/33721282/pexels-photo-33721282.jpeg?auto=compress&cs=tinysrgb&w=1600",
    lastFarrier: "2026-01-20",
    lastDentalDate: "2025-05-10",
    logs: peteLogs,
  },
  {
    id: "copperette",
    name: "Copperette",
    age: "2 yrs",
    sex: "Gelding",
    role: "Juvenile",
    pasture: "Juvenile Corral",
    feed: ["Alfafa", "Hay", "Pasture Graze"],
    health: "01/24/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl:
      "https://images.unsplash.com/photo-1604350479626-e38725bf7889?q=80&w=1600&auto=format",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
    logs: copperetteLogs,
  },
  {
    id: "hollywood",
    name: "Hollywood",
    age: "7 yrs",
    sex: "Gelding",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/15/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1595804414543-3e8841fe31f0?q=80&w=1600&auto=format",
    lastFarrier: "2026-01-21",
    lastDentalDate: "2025-05-10",
    logs: hollywoodLogs,
  },
  {
    id: "jazzy",
    name: "Jazzy",
    age: "6 yrs",
    sex: "Mare",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/10/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1707024263297-c13f83ffc41c?q=80&w=1600&auto=format",
    lastFarrier: "2026-01-21",
    lastDentalDate: "2025-05-10",
    logs: [
      {
        id: "jazzy-0",
        date: "4/20/26",
        category: "health",
        notes: "Right hind fully sound — no stiffness observed during morning work. Moving freely and willingly.",
        loggedBy: "Chantale",
        aiNextSteps: ["Continue current workload.", "Note if stiffness returns after heavy sessions."],
      },
      {
        id: "jazzy-1",
        date: "4/10/26",
        category: "health",
        notes: "Slight stiffness in right hind leg after morning work. Not lame but moving cautiously.",
        loggedBy: "Chantale",
        aiRecommendation: "Early signs of muscle fatigue or mild strain. Rest and monitor.",
        aiNextSteps: [
          "Reduce workload for 3-5 days.",
          "Apply cold therapy to right hind leg after exercise.",
          "Schedule vet evaluation if stiffness persists beyond one week.",
        ],
      },
      {
        id: "jazzy-2",
        date: "4/14/26",
        category: "health",
        notes: "Stiffness still present, slightly improved. Eating well.",
        loggedBy: "Chantale",
        aiRecommendation: "Improvement noted but not resolved. Continue restricted activity.",
        aiNextSteps: [
          "Continue reduced workload.",
          "Consider adding joint supplement to feed.",
          "Reassess in 5 days — escalate to vet if no further improvement.",
        ],
      },
      {
        id: "jazzy-3",
        date: "1/18/26",
        category: "health",
        notes: "Farrier visit. Hooves clean and well-shaped. Jazzy was fidgety but manageable.",
        loggedBy: "Joe",
        aiNextSteps: ["Practice standing tied before next farrier visit.", "Next farrier in 8 weeks."],
      },
      {
        id: "jazzy-4",
        date: "12/8/25",
        category: "health",
        notes:
          "Annual vet exam. Vaccines current. Vet noted Jazzy is in excellent condition — strong and well-muscled.",
        loggedBy: "Chantale",
        aiNextSteps: ["Dental float due March.", "Continue current training and feed schedule."],
      },
    ],
  },
  {
    id: "red",
    name: "Red",
    age: "9 yrs",
    sex: "Gelding",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "02/28/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1603391282846-48b4a3219205?q=80&w=1600&auto=format",
    lastFarrier: "2026-01-20",
    lastDentalDate: "2025-05-10",
    logs: redLogs,
  },
  {
    id: "xinder",
    name: "Xinder",
    age: "5 yrs",
    sex: "Gelding",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "04/01/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "flag",
    photoUrl: "https://images.unsplash.com/photo-1774517106087-542cb1418116?q=80&w=1600&auto=format",
    lastFarrier: "2026-02-10",
    lastDentalDate: "2025-10-15",
    logs: [
      {
        id: "xinder-1",
        date: "4/1/26",
        category: "health",
        notes: "Xinder is limping on front left. Hoof feels warm to the touch. Won't bear weight fully.",
        loggedBy: "Chantale",
        aiRecommendation: "Symptoms consistent with hoof abscess. Requires immediate veterinary attention.",
        aiNextSteps: [
          "Contact veterinarian today — do not delay.",
          "Remove from work immediately and restrict movement.",
          "Soak hoof in warm Epsom salt solution twice daily until vet arrives.",
        ],
      },
      {
        id: "xinder-2",
        date: "4/5/26",
        category: "health",
        notes: "Vet confirmed abscess. Draining and bandaged. Still uncomfortable but bearing some weight.",
        loggedBy: "Chantale",
        aiRecommendation: "Abscess confirmed and draining — recovery on track. Strict stall rest required.",
        aiNextSteps: [
          "Keep bandage clean and dry — change daily.",
          "Administer prescribed antibiotics on schedule.",
          "No turnout until vet clears for light activity.",
        ],
      },
      {
        id: "xinder-3",
        date: "4/12/26",
        category: "health",
        notes: "Moving better. Still some sensitivity but bearing full weight. Bandage removed by vet.",
        loggedBy: "Chantale",
        aiRecommendation: "Recovery progressing well. Gradual return to light activity appropriate.",
        aiNextSteps: [
          "Begin short hand-walking sessions — 10 minutes twice daily.",
          "Monitor for any return of heat or swelling.",
          "Schedule follow-up farrier visit within 2 weeks.",
        ],
      },
      {
        id: "xinder-4",
        date: "11/20/25",
        category: "behavior",
        notes:
          "Good session today — responsive and willing. No resistance noted. Best he's worked in weeks.",
        loggedBy: "Jake",
        aiNextSteps: ["Build on positive sessions. Log what conditions led to success."],
      },
    ],
  },
  {
    id: "bosco",
    name: "Bosco",
    age: "8 yrs",
    sex: "Gelding",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/20/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1710014336765-e496227eea4c?q=80&w=1600&auto=format",
    lastFarrier: "2026-02-10",
    lastDentalDate: "2025-10-15",
    logs: boscoLogs,
  },
  {
    id: "blueberry",
    name: "Blueberry",
    age: "6 yrs",
    sex: "Mare",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/18/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1606107869722-d5cbadabe2f0?q=80&w=1600&auto=format",
    lastFarrier: "2026-02-10",
    lastDentalDate: "2025-10-15",
    logs: blueberryLogs,
  },
  {
    id: "ranger",
    name: "Ranger",
    age: "10 yrs",
    sex: "Gelding",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/05/26",
    dental: "03/12/26",
    healthStatus: "monitor",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1648991138204-5af092ff044a?q=80&w=1600&auto=format",
    lastFarrier: "2026-02-10",
    lastDentalDate: "2025-10-15",
    logs: [
      {
        id: "ranger-0",
        date: "4/20/26",
        category: "health",
        notes: "Weight improving after feed increase — ribs less visible, coat looking better. On track.",
        loggedBy: "Maria",
        aiNextSteps: [
          "Continue increased hay ration through end of month.",
          "Recheck body condition in two weeks.",
        ],
      },
      {
        id: "ranger-1",
        date: "4/8/26",
        category: "health",
        notes: "Weight looks slightly low for this time of year. Ribs more visible than usual.",
        loggedBy: "Joe",
        aiRecommendation: "Possible weight loss — increase feed and monitor body condition score.",
        aiNextSteps: [
          "Add senior feed supplement to daily ration.",
          "Schedule dental check — poor dentition may affect feed absorption.",
          "Weigh or score body condition in 2 weeks.",
        ],
      },
      {
        id: "ranger-2",
        date: "3/22/26",
        category: "health",
        notes: "Farrier visit today. Hooves clean and well-shaped. No issues. Ranger stood well for the trim.",
        loggedBy: "Joe",
        aiNextSteps: ["Next farrier in 8 weeks."],
      },
      {
        id: "ranger-3",
        date: "3/5/26",
        category: "health",
        notes:
          "Slight lameness in left front after morning work. Checked hoof — small stone lodged. Removed, sound by afternoon.",
        loggedBy: "Maria",
        aiRecommendation: "Stone bruises resolve quickly after removal. Monitor for residual sensitivity.",
        aiNextSteps: [
          "Check all hooves before and after work this week.",
          "Give a rest day tomorrow.",
          "Note if any recurring sensitivity in left front.",
        ],
      },
      {
        id: "ranger-4",
        date: "2/16/26",
        category: "behavior",
        notes:
          "Ranger leading the herd to the water trough at dusk — good energy, dominant but not aggressive.",
        loggedBy: "Jake",
        aiNextSteps: ["No action needed. Positive herd leadership noted."],
      },
      {
        id: "ranger-5",
        date: "1/30/26",
        category: "health",
        notes:
          "Teeth floated. Minor points corrected. Eating well before and after — no significant discomfort noted.",
        loggedBy: "Chantale",
        aiNextSteps: ["Next float in 12 months.", "Continue monitoring grain intake."],
      },
      {
        id: "ranger-6",
        date: "1/8/26",
        category: "health",
        notes:
          "Weight and coat in good shape going into winter. Senior feed not needed — holding condition well on current ration.",
        loggedBy: "Maria",
        aiNextSteps: ["Reassess condition score in March.", "Increase hay if temperatures drop below 20°F."],
      },
      {
        id: "ranger-7",
        date: "12/1/25",
        category: "health",
        notes:
          "Annual vet visit. Vaccinations current. Clean exam — vet said Ranger is one of the healthiest 10-year-olds she's seen.",
        loggedBy: "Chantale",
        aiRecommendation:
          "Excellent health baseline. Maintain current management and annual exam schedule.",
        aiNextSteps: ["Dental float due January.", "Farrier due in March."],
      },
      {
        id: "ranger-8",
        date: "10/28/25",
        category: "health",
        notes:
          "Minor cut above right eye — likely from brush or branch. Cleaned and applied ointment. Superficial.",
        loggedBy: "Joe",
        aiNextSteps: ["Clean daily for 3 days.", "Watch for swelling near eye or discharge."],
      },
    ],
  },
  {
    id: "cisco",
    name: "Cisco",
    age: "11 yrs",
    sex: "Gelding",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "02/15/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1636496769033-bc2cc530275a?q=80&w=1600&auto=format",
    lastFarrier: "2026-01-21",
    lastDentalDate: "2025-05-10",
    logs: ciscoLogs,
  },
  {
    id: "maverick",
    name: "Maverick",
    age: "7 yrs",
    sex: "Gelding",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/25/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1682636110245-9368615a7cb9?q=80&w=1600&auto=format",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
    logs: [
      {
        id: "maverick-1",
        date: "4/15/26",
        category: "behavior",
        notes: "Maverick has been pinning ears and nipping at neighboring horses during feeding. Unusual for him.",
        loggedBy: "Maria",
        aiRecommendation: "Behavioral change during feeding may indicate pain, stress, or social tension.",
        aiNextSteps: [
          "Separate feeding stations to reduce competition pressure.",
          "Observe for other pain indicators — reluctance to move, guarding posture.",
          "Schedule health check if behavior continues beyond one week.",
        ],
      },
    ],
  },
  {
    id: "ace",
    name: "Ace",
    age: "9 yrs",
    sex: "Gelding",
    role: "Working",
    pasture: "Main Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "04/02/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1770405991336-66ae24d7a334?q=80&w=1600&auto=format",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
    logs: [
      {
        id: "ace-1",
        date: "4/2/26",
        category: "health",
        notes: "Wound on left shoulder — looks like a wire cut. About 3 inches, not deep but bleeding.",
        loggedBy: "Joe",
        aiRecommendation: "Laceration requires prompt cleaning and assessment for sutures.",
        aiNextSteps: [
          "Clean wound with diluted betadine — do not use hydrogen peroxide.",
          "Contact vet to assess suture need.",
          "Apply wound dressing and keep area clean and dry.",
        ],
      },
      {
        id: "ace-2",
        date: "4/7/26",
        category: "health",
        notes: "Wound healing well. No sutures needed per vet. Slight scabbing, no sign of infection.",
        loggedBy: "Chantale",
        aiRecommendation: "Healing progressing normally. Continue monitoring for infection signs.",
        aiNextSteps: [
          "Apply wound ointment once daily.",
          "Keep out of dusty conditions where possible.",
          "Re-evaluate in one week — should be mostly closed.",
        ],
      },
    ],
  },
  {
    id: "luna",
    name: "Luna",
    age: "4 yrs",
    sex: "Mare",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/10/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1682636111034-4c1be44c1f8e?q=80&w=1600&auto=format",
    lastFarrier: "2026-01-20",
    lastDentalDate: "2025-05-10",
  },
  {
    id: "rio",
    name: "Rio",
    age: "3 yrs",
    sex: "Gelding",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/15/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1709629107742-ea055e8b24d0?q=80&w=1600&auto=format",
    lastFarrier: "2026-01-21",
    lastDentalDate: "2025-05-10",
  },
  {
    id: "storm",
    name: "Storm",
    age: "4 yrs",
    sex: "Gelding",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/20/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1593262206164-ea7772aa4a3b?q=80&w=1600&auto=format",
    lastFarrier: "2026-02-10",
    lastDentalDate: "2025-10-15",
    logs: [
      {
        id: "storm-1",
        date: "4/11/26",
        category: "behavior",
        notes: "Storm is spooking more than usual during ground work. Very reactive to noise.",
        loggedBy: "Maria",
        aiRecommendation: "Heightened reactivity may indicate anxiety, discomfort, or a training gap.",
        aiNextSteps: [
          "Reduce session intensity and increase desensitization work.",
          "Rule out pain — check back, mouth, and saddle fit.",
          "Document specific triggers to build a desensitization plan.",
        ],
      },
    ],
  },
  {
    id: "arrow",
    name: "Arrow",
    age: "3 yrs",
    sex: "Gelding",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "02/20/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1450052590821-8bf91254a353?q=80&w=1600&auto=format",
    lastFarrier: "2026-02-10",
    lastDentalDate: "2025-10-15",
  },
  {
    id: "cactus",
    name: "Cactus",
    age: "5 yrs",
    sex: "Gelding",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/01/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1611545760699-a13f20f50248?q=80&w=1600&auto=format",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
  },
  {
    id: "pepper",
    name: "Pepper",
    age: "4 yrs",
    sex: "Mare",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/08/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1568298481708-26aab4bf1fdb?q=80&w=1600&auto=format",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
  },
  {
    id: "scout",
    name: "Scout",
    age: "3 yrs",
    sex: "Gelding",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/22/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1565979567354-9e5f44b2b499?q=80&w=1600&auto=format",
    lastFarrier: "2026-02-10",
    lastDentalDate: "2025-10-15",
    logs: [
      {
        id: "scout-1",
        date: "4/13/26",
        category: "health",
        notes: "Runny nose noted — clear discharge, no fever. Eating normally.",
        loggedBy: "Jake",
        aiRecommendation: "Mild upper respiratory signs. Monitor closely — unlikely to be serious if no fever.",
        aiNextSteps: [
          "Take temperature twice daily for the next 3 days.",
          "Isolate from other horses as a precaution.",
          "Contact vet if discharge becomes yellow or green, or if fever develops.",
        ],
      },
    ],
  },
  {
    id: "bandit",
    name: "Bandit",
    age: "5 yrs",
    sex: "Gelding",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "02/10/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1501781663893-b51a57d21cfc?q=80&w=1600&auto=format",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
  },
  {
    id: "ember",
    name: "Ember",
    age: "4 yrs",
    sex: "Mare",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "04/05/26",
    dental: "03/12/26",
    healthStatus: "monitor",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1546894239-c9865f479ad0?q=80&w=2069&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
    logs: [
      {
        id: "ember-1",
        date: "4/5/26",
        category: "health",
        notes: "Ember looks thin. Ribs visible, topline dropped. Not eating full ration.",
        loggedBy: "Chantale",
        aiRecommendation: "Significant weight loss indicators. Requires immediate veterinary assessment.",
        aiNextSteps: [
          "Contact vet today — possible underlying illness or dental issue.",
          "Offer highly palatable feed — soaked hay cubes or senior feed.",
          "Record daily feed intake and body condition score.",
        ],
      },
      {
        id: "ember-2",
        date: "4/10/26",
        category: "health",
        notes: "Vet visit completed. Dental hooks found and floated. Starting appetite stimulant.",
        loggedBy: "Chantale",
        aiRecommendation: "Root cause identified — dental pain was limiting feed intake. Recovery expected.",
        aiNextSteps: [
          "Feed soaked hay and senior feed for 2-3 weeks post-float.",
          "Weigh weekly — target 0.5-1 lb gain per day.",
          "Schedule follow-up dental in 6 months.",
        ],
      },
    ],
  },
  {
    id: "sunny",
    name: "Sunny",
    age: "4 yrs",
    sex: "Gelding",
    role: "Training",
    pasture: "Training Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/12/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.pexels.com/photos/10059324/pexels-photo-10059324.jpeg?auto=compress&cs=tinysrgb&w=1600",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
  },
  {
    id: "duke",
    name: "Duke",
    age: "6 yrs",
    sex: "Stallion",
    role: "Stud",
    pasture: "Breeding Corral",
    feed: ["Alfalfa", "Hay", "Grain", "Pasture Graze"],
    health: "03/01/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1634589695121-8472b252bd5b?q=80&w=1600&auto=format",
    lastFarrier: "2026-01-20",
    lastDentalDate: "2025-05-10",
  },
  {
    id: "rex",
    name: "Rex",
    age: "8 yrs",
    sex: "Stallion",
    role: "Stud",
    pasture: "Breeding Corral",
    feed: ["Alfalfa", "Hay", "Grain", "Pasture Graze"],
    health: "02/20/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1508598891962-ad31d5c5296a?q=80&w=1600&auto=format",
    lastFarrier: "2026-01-21",
    lastDentalDate: "2025-05-10",
  },
  {
    id: "stella",
    name: "Stella",
    age: "7 yrs",
    sex: "Mare",
    role: "Mare",
    pasture: "Breeding Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/10/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1543821414-3fe7ea7d931b?q=80&w=1600&auto=format",
    lastFarrier: "2026-02-10",
    lastDentalDate: "2025-10-15",
  },
  {
    id: "bonnie",
    name: "Bonnie",
    age: "9 yrs",
    sex: "Mare",
    role: "Mare",
    pasture: "Breeding Corral",
    feed: ["Alfalfa", "Hay", "Pasture Graze"],
    health: "03/15/26",
    dental: "03/12/26",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1553284965-fa61e9ad4795?q=80&w=1600&auto=format",
    lastFarrier: "2026-02-10",
    lastDentalDate: "2025-10-15",
    logs: [
      {
        id: "bonnie-1",
        date: "4/9/26",
        category: "health",
        notes: "Bonnie showing mild signs of discomfort — pawing ground, looking at flank. Passed manure normally.",
        loggedBy: "Chantale",
        aiRecommendation: "Mild colic signs noted. Monitor closely — most mild colic resolves with movement.",
        aiNextSteps: [
          "Hand walk for 20 minutes and monitor for improvement.",
          "Ensure fresh water is available — dehydration is a colic trigger.",
          "Contact vet immediately if symptoms worsen or no manure in 4 hours.",
        ],
      },
    ],
  },
  {
    id: "chip",
    name: "Chip",
    age: "1 yr",
    sex: "Colt",
    role: "Juvenile",
    pasture: "Juvenile Corral",
    feed: ["Hay", "Pasture Graze"],
    health: "03/01/26",
    dental: "MM/DD/YY",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1609275988494-78a89e91be80?q=80&w=1600&auto=format",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
  },
  {
    id: "clover",
    name: "Clover",
    age: "1 yr",
    sex: "Filly",
    role: "Juvenile",
    pasture: "Juvenile Corral",
    feed: ["Hay", "Pasture Graze"],
    health: "03/01/26",
    dental: "MM/DD/YY",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.pexels.com/photos/13911448/pexels-photo-13911448.jpeg?auto=compress&cs=tinysrgb&w=1600",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
  },
  {
    id: "dash",
    name: "Dash",
    age: "1 yr",
    sex: "Colt",
    role: "Juvenile",
    pasture: "Juvenile Corral",
    feed: ["Hay", "Pasture Graze"],
    health: "03/01/26",
    dental: "MM/DD/YY",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.pexels.com/photos/17226795/pexels-photo-17226795.jpeg?auto=compress&cs=tinysrgb&w=1600",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
  },
  {
    id: "fern",
    name: "Fern",
    age: "1 yr",
    sex: "Filly",
    role: "Juvenile",
    pasture: "Juvenile Corral",
    feed: ["Hay", "Pasture Graze"],
    health: "03/20/26",
    dental: "MM/DD/YY",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.unsplash.com/photo-1759040758849-b1411cf6288b?q=80&w=1600&auto=format",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
    logs: [
      {
        id: "fern-1",
        date: "4/16/26",
        category: "health",
        notes: "Fern has a small swelling on left knee. No heat, not lame, still active.",
        loggedBy: "Jake",
        aiRecommendation: "Swelling without heat or lameness is low urgency but worth monitoring in a young horse.",
        aiNextSteps: [
          "Measure and photograph swelling — document for comparison.",
          "Recheck in 48 hours for changes in size or temperature.",
          "Contact vet if swelling increases or lameness develops.",
        ],
      },
    ],
  },
  {
    id: "grit",
    name: "Grit",
    age: "1 yr",
    sex: "Colt",
    role: "Juvenile",
    pasture: "Juvenile Corral",
    feed: ["Hay", "Pasture Graze"],
    health: "03/01/26",
    dental: "MM/DD/YY",
    healthStatus: "good",
    behaviorStatus: "good",
    photoUrl: "https://images.pexels.com/photos/14024326/pexels-photo-14024326.jpeg?auto=compress&cs=tinysrgb&w=1600",
    lastFarrier: "2026-03-01",
    lastDentalDate: "2026-02-20",
  },
]

/** Stable key for merging session logs in the parent */
export function horseRowKey(row: HorseTableRow) {
  return String(row.id ?? row.name)
}

function horseDisplayInitials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function HorseRosterAvatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  const [imgFailed, setImgFailed] = useState(false)
  const trimmed = photoUrl?.trim()
  const showImg = Boolean(trimmed) && !imgFailed

  useEffect(() => {
    setImgFailed(false)
  }, [trimmed])

  return (
    <div className="flex min-w-0 max-w-[min(280px,40vw)] items-center gap-2.5">
      {showImg ? (
        <img
          src={trimmed}
          alt=""
          className="size-9 shrink-0 rounded-lg object-cover object-center"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-neutral-200 text-xs font-semibold text-neutral-700"
          aria-hidden
        >
          {horseDisplayInitials(name)}
        </div>
      )}
      <span className="min-w-0 truncate">{name}</span>
    </div>
  )
}

export type HorseSortKey =
  | "name"
  | "healthStatus"
  | "behaviorStatus"
  | "age"
  | "sex"
  | "role"
  | "feed"
  | "health"
  | "dental"
  | "farrier"
  | "pasture"

function parseAgeYears(age: string): number {
  const m = age.trim().match(/^(\d+)/)
  return m ? Number(m[1]) : 0
}

const HERD_STATUS_SORT_ORDER: Record<HorseTableRow["healthStatus"], number> = {
  flag: 0,
  monitor: 1,
  good: 2,
}

const HORSE_CARE_DATE_SORT_KEYS = new Set<HorseSortKey>(["farrier", "dental"])

function sortHorseRows(rows: HorseTableRow[], key: HorseSortKey, dir: "asc" | "desc"): HorseTableRow[] {
  const mult = dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    let cmp = 0
    switch (key) {
      case "name":
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        break
      case "healthStatus":
        cmp = HERD_STATUS_SORT_ORDER[a.healthStatus] - HERD_STATUS_SORT_ORDER[b.healthStatus]
        break
      case "behaviorStatus":
        cmp = HERD_STATUS_SORT_ORDER[a.behaviorStatus] - HERD_STATUS_SORT_ORDER[b.behaviorStatus]
        break
      case "age":
        cmp = parseAgeYears(a.age) - parseAgeYears(b.age)
        break
      case "sex":
        cmp = a.sex.localeCompare(b.sex, undefined, { sensitivity: "base" })
        break
      case "role":
        cmp = a.role.localeCompare(b.role, undefined, { sensitivity: "base" })
        break
      case "feed": {
        const fa = a.feed.join(" / ")
        const fb = b.feed.join(" / ")
        cmp = fa.localeCompare(fb, undefined, { sensitivity: "base" })
        break
      }
      case "health":
        cmp = parseObservationDate(a.health) - parseObservationDate(b.health)
        break
      case "dental":
        cmp = compareNullableIsoDates(a.lastDentalDate, b.lastDentalDate, dir)
        break
      case "farrier":
        cmp = compareNullableIsoDates(
          a.lastFarrier ?? a.lastFarrierDate,
          b.lastFarrier ?? b.lastFarrierDate,
          dir
        )
        break
      case "pasture":
        cmp = a.pasture.localeCompare(b.pasture, undefined, { sensitivity: "base" })
        break
      default:
        break
    }
    if (cmp !== 0) return HORSE_CARE_DATE_SORT_KEYS.has(key) ? cmp : mult * cmp
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  })
}

function SortHeader({
  children,
  className,
  column,
  sortKey,
  sortDir,
  onSort,
}: {
  children: ReactNode
  className?: string
  column: HorseSortKey
  sortKey: HorseSortKey
  sortDir: "asc" | "desc"
  onSort: (column: HorseSortKey) => void
}) {
  const active = sortKey === column
  return (
    <TableHead
      scope="col"
      className={cn(
        "h-14 border-b border-neutral-200 bg-[var(--muted)] px-2 text-left text-sm font-medium whitespace-nowrap text-foreground",
        className
      )}
    >
      <button
        type="button"
        className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md py-2 pr-1 text-left outline-none hover:bg-neutral-100/80 focus-visible:ring-2 focus-visible:ring-neutral-300"
        onClick={(e) => {
          e.stopPropagation()
          onSort(column)
        }}
        aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
      >
        <span>{children}</span>
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="size-4 shrink-0 text-foreground" aria-hidden />
          ) : (
            <ArrowDown className="size-4 shrink-0 text-foreground" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="size-4 shrink-0 text-neutral-500 opacity-50" aria-hidden />
        )}
      </button>
    </TableHead>
  )
}

export function RoleBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-medium text-foreground">
      {children}
    </span>
  )
}

/** Roster health or behavior status badge — `getStatusBadgeClass`. */
function HorseRosterStatusCell({ status }: { status: HorseTableRow["healthStatus"] }) {
  const label = status === "flag" ? "Flag" : status === "monitor" ? "Monitor" : "Good"
  if (status === "good") return null
  return <span className={getStatusBadgeClass(status)}>{label}</span>
}

function HorseRosterObservationCell({
  row,
  onAddViaParent,
}: {
  row: HorseTableRow
  /** e.g. mobile sheet for new log; falls back to `openLogModal` */
  onAddViaParent?: (row: HorseTableRow) => void
}) {
  const { openLogModal } = useRanchData()

  return (
    <ObservationTableActionsCell
      onAddClick={(e) => {
        e.stopPropagation()
        if (onAddViaParent) onAddViaParent(row)
        else openLogModal(row)
      }}
    />
  )
}

type HeguyRanchCoPilotProps = {
  horseRows?: HorseTableRow[]
  onHorseRowNavigate?: (row: HorseTableRow) => void
  onHorseLog?: (row: HorseTableRow) => void
  filterSlot?: ReactNode
}

export function HeguyRanchCoPilot({
  horseRows = SAMPLE_HORSE_ROWS,
  onHorseRowNavigate,
  onHorseLog,
  filterSlot,
}: HeguyRanchCoPilotProps) {
  const [sortKey, setSortKey] = useState<HorseSortKey>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const sortedHorseRows = useMemo(
    () => sortHorseRows(horseRows, sortKey, sortDir),
    [horseRows, sortKey, sortDir]
  )

  function handleSort(column: HorseSortKey) {
    if (column === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(column)
      setSortDir("asc")
    }
  }

  return (
    <>
      {filterSlot != null ? (
        <div className="flex w-full flex-wrap items-center gap-4 pt-0 pb-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 sm:gap-4">{filterSlot}</div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-xl pb-16">
        <Table className="border-separate border-spacing-0">
            <TableHeader>
              <TableRow className="border-neutral-200 hover:bg-transparent">
                <SortHeader
                            className="min-w-[160px]"
                            column="name"
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          >
                            Name
                          </SortHeader>
                          <SortHeader
                            className="w-[100px]"
                            column="healthStatus"
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          >
                            Health
                          </SortHeader>
                          <SortHeader
                            className="w-[100px]"
                            column="behaviorStatus"
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          >
                            Behavior
                          </SortHeader>
                          <SortHeader
                            className="w-[66px]"
                            column="age"
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          >
                            Age
                          </SortHeader>
                          <SortHeader
                            className="w-[66px]"
                            column="sex"
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          >
                            Sex
                          </SortHeader>
                          <SortHeader
                            className="min-w-[100px]"
                            column="role"
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          >
                            Role
                          </SortHeader>
                          <SortHeader
                            className="min-w-[140px]"
                            column="feed"
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          >
                            Feed
                          </SortHeader>
                          <SortHeader
                            className="min-w-[120px]"
                            column="health"
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          >
                            Last log
                          </SortHeader>
                          <SortHeader
                            className="min-w-[110px]"
                            column="dental"
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          >
                            Last dental
                          </SortHeader>
                          <SortHeader
                            className="min-w-[110px]"
                            column="farrier"
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          >
                            Last farrier
                          </SortHeader>
                          <SortHeader
                            className="w-[91px]"
                            column="pasture"
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                          >
                            Pasture
                          </SortHeader>
                          <TableHead
                            scope="col"
                            className={cn(
                              "sticky right-0 z-20 h-14 min-w-[96px] border-b border-l border-neutral-200 bg-[var(--muted)] px-2 text-left text-sm font-medium whitespace-nowrap text-foreground opacity-100 shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.12)]"
                            )}
                          >
                            Observation
                          </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="[&_tr:last-child_td]:border-b-0 [&_tr:last-child]:!border-b-0">
              {sortedHorseRows.map((row) => (
                <TableRow
                  key={row.id ?? row.name}
                  className={cn(
                    "group border-neutral-200",
                    onHorseRowNavigate && "cursor-pointer"
                  )}
                  onClick={() => onHorseRowNavigate?.(row)}
                >
                  <TableCell className="h-16 border-b border-neutral-200 bg-white p-2 font-normal text-foreground group-hover:bg-neutral-50/80">
                    <HorseRosterAvatar name={row.name} photoUrl={row.photoUrl} />
                  </TableCell>
                  <TableCell className="h-16 border-b border-neutral-200 bg-white p-2 group-hover:bg-neutral-50/80">
                    <HorseRosterStatusCell status={row.healthStatus} />
                  </TableCell>
                  <TableCell className="h-16 border-b border-neutral-200 bg-white p-2 group-hover:bg-neutral-50/80">
                    <HorseRosterStatusCell status={row.behaviorStatus} />
                  </TableCell>
                  <TableCell className="h-16 border-b border-neutral-200 bg-white p-2 text-foreground group-hover:bg-neutral-50/80">
                    {row.age}
                  </TableCell>
                  <TableCell className="h-16 border-b border-neutral-200 bg-white p-2 text-foreground group-hover:bg-neutral-50/80">
                    {row.sex}
                  </TableCell>
                  <TableCell className="h-16 border-b border-neutral-200 bg-white p-2 group-hover:bg-neutral-50/80">
                    <RoleBadge>{row.role}</RoleBadge>
                  </TableCell>
                  <TableCell className="h-16 max-w-[200px] border-b border-neutral-200 bg-white p-2 text-foreground group-hover:bg-neutral-50/80">
                    <span className="line-clamp-2">
                      {row.feed.length > 0 ? row.feed.join(" / ") : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="h-16 border-b border-neutral-200 bg-white p-2 text-foreground group-hover:bg-neutral-50/80">
                    {row.health}
                  </TableCell>
                  <TableCell className="h-16 border-b border-neutral-200 bg-white p-2 group-hover:bg-neutral-50/80">
                    <RosterCareDateCell iso={row.lastDentalDate} />
                  </TableCell>
                  <TableCell className="h-16 border-b border-neutral-200 bg-white p-2 group-hover:bg-neutral-50/80">
                    <RosterCareDateCell iso={row.lastFarrier ?? row.lastFarrierDate} />
                  </TableCell>
                  <TableCell className="h-16 border-b border-neutral-200 bg-white p-2 text-foreground group-hover:bg-neutral-50/80">
                    {row.pasture}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "sticky right-0 z-10 h-16 border-b border-l border-neutral-200 bg-white p-0 opacity-100 shadow-[-8px_0_16px_-8px_rgba(0,0,0,0.12)] group-hover:bg-[var(--muted)]",
                      rosterObservationColumnWidthClass
                    )}
                  >
                    <HorseRosterObservationCell row={row} onAddViaParent={onHorseLog} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
        </Table>
      </div>
    </>
  )
}
