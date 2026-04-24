import type { Category, ObservationEntry, RiskLevel } from "@/types/observation"

function obs(
  id: string,
  date: string,
  category: Category,
  notes: string,
  loggedBy: string,
  riskLevel: RiskLevel,
  recommendations: string[],
  patternNote?: string,
): ObservationEntry {
  return {
    id,
    date,
    category,
    notes,
    loggedBy,
    aiResult: {
      riskLevel,
      riskLabel:
        riskLevel === "call-vet"
          ? "Call vet"
          : riskLevel === "monitor"
            ? "Monitor"
            : "No action needed",
      recommendations,
      patternNote: patternNote ?? null,
    },
  }
}

export function buildInitialCattleObservationsMap(): Record<string, ObservationEntry[]> {
  const map: Record<string, ObservationEntry[]> = {}

  function set(id: string, entries: ObservationEntry[]) {
    map[id] = entries
  }

  // ─── HEIFERS (East Pasture, ct-east-N, n=1..48) ──────────────────────────

  set("ct-east-3", [
    obs(
      "ce3-1",
      "4/18/26",
      "Health",
      "Heifer off feed this morning — ate maybe half her grain. Standing at back of pen, not competing at bunk.",
      "Maria",
      "call-vet",
      [
        "Separate from herd and monitor closely for next 12 hours.",
        "Check rumen fill, gut sounds both sides, temperature.",
        "Call vet if no improvement by evening feed.",
      ],
      "This is the second reduced intake event in 10 days — pattern suggests underlying issue, not a one-off.",
    ),
    obs(
      "ce3-2",
      "4/9/26",
      "Health",
      "Reduced intake noted at morning feed. Slightly hunched posture. No fever on manual check.",
      "Jake",
      "monitor",
      [
        "Monitor intake at next two feedings.",
        "Watch for signs of respiratory or digestive distress.",
      ],
    ),
    obs(
      "ce3-3",
      "3/28/26",
      "Health",
      "Routine check — eating well, good coat, alert. No concerns.",
      "Maria",
      "good",
      ["Continue routine monitoring."],
    ),
  ])

  set("ct-east-12", [
    obs(
      "ce12-1",
      "4/19/26",
      "Health",
      "Limping on left front — noticed during morning turnout. No visible wound, possible sole bruise or early laminitis.",
      "Jake",
      "call-vet",
      [
        "Pull from pasture and confine to dry lot.",
        "Examine hoof closely for abscess, bruising, or foreign object.",
        "Call vet if lameness persists more than 24 hours.",
      ],
      "First lameness event observed on this animal. Monitor carefully given she is first-calf heifer.",
    ),
    obs(
      "ce12-2",
      "4/5/26",
      "Health",
      "Good check — weight appropriate for stage, moving well, eating normally.",
      "Maria",
      "good",
      ["No action needed. Continue routine monitoring."],
    ),
  ])

  set("ct-east-23", [
    obs(
      "ce23-1",
      "4/20/26",
      "Behavior",
      "Heifer aggressive at feed bunk — head butting and pushing two others off feed. Escalating over past week.",
      "Maria",
      "monitor",
      [
        "Separate feed station or increase bunk space.",
        "Monitor subordinate animals for weight loss due to feed displacement.",
        "Note if aggression extends beyond feeding time.",
      ],
      "Dominant feeding behavior has increased over the past 7 days — may be stress response to crowding or competition.",
    ),
    obs(
      "ce23-2",
      "4/10/26",
      "Behavior",
      "Some assertiveness at bunk but not alarming. First time noted.",
      "Jake",
      "monitor",
      ["Watch at feed time for next few days."],
    ),
    obs(
      "ce23-3",
      "3/30/26",
      "Health",
      "Routine check — healthy weight, good coat condition, alert and responsive.",
      "Maria",
      "good",
      ["No action needed."],
    ),
  ])

  set("ct-east-39", [
    obs(
      "ce39-1",
      "4/18/26",
      "Calving",
      "Calved overnight — normal delivery, live heifer calf. Calf nursing within 2 hours. Dam alert and attentive.",
      "Maria",
      "good",
      [
        "Confirm calf received adequate colostrum in first 6 hours.",
        "Weigh calf at 24 hours.",
        "Check dam's udder for engorgement over next 48 hours.",
      ],
    ),
    obs(
      "ce39-2",
      "4/19/26",
      "Health",
      "Dam and calf doing well 24 hours post-calving. Calf active and nursing regularly. Dam eating full ration.",
      "Jake",
      "good",
      ["Continue daily checks for first week.", "Calf weight check tomorrow."],
    ),
    obs(
      "ce39-3",
      "4/20/26",
      "Health",
      "Calf weighed 68 lbs — on target. Nursing strong. Dam in good condition.",
      "Maria",
      "good",
      ["No action needed. Normal post-calving progress."],
    ),
  ])

  set("ct-east-41", [
    obs(
      "ce41-1",
      "4/10/26",
      "Calving",
      "Assisted delivery — stillborn calf. Dam exhausted post-delivery but stable. Vet attended.",
      "Maria",
      "call-vet",
      [
        "Monitor dam closely for retained placenta over next 12 hours.",
        "Ensure dam is eating and drinking — offer fresh water and hay.",
        "Vet to follow up tomorrow.",
      ],
      "Stillbirth following prolonged labor. Dam requires close monitoring for secondary complications.",
    ),
    obs(
      "ce41-2",
      "4/11/26",
      "Health",
      "Placenta passed normally within 8 hours. Dam eating well, no fever. Vet cleared her.",
      "Jake",
      "monitor",
      [
        "Continue monitoring for uterine infection signs — discharge, fever, off feed.",
        "Recheck in 3 days.",
      ],
    ),
    obs(
      "ce41-3",
      "4/14/26",
      "Health",
      "Dam fully recovered — eating well, good coat, no signs of infection. Weight holding.",
      "Maria",
      "good",
      ["Clear for return to herd. Continue routine monitoring."],
    ),
  ])

  set("ct-east-45", [
    obs(
      "ce45-1",
      "4/16/26",
      "Calving",
      "Assisted delivery, live calf. Placenta retained at 12 hours post-calving. Vet called.",
      "Maria",
      "call-vet",
      [
        "Do not manually remove placenta — allow natural expulsion or vet intervention.",
        "Administer antibiotics per vet instruction to prevent metritis.",
        "Monitor temperature twice daily.",
      ],
      "Retained placenta is the primary concern. Risk of metritis increases significantly after 24 hours.",
    ),
    obs(
      "ce45-2",
      "4/17/26",
      "Health",
      "Placenta still retained at 24 hours. Vet administered oxytocin and antibiotics. Dam alert, eating.",
      "Jake",
      "call-vet",
      [
        "Continue antibiotics course as prescribed.",
        "Temperature check morning and evening.",
        "Vet recheck in 48 hours.",
      ],
    ),
    obs(
      "ce45-3",
      "4/19/26",
      "Health",
      "Placenta passed at 36 hours. No signs of infection — temperature normal, eating full ration. Vet satisfied with progress.",
      "Maria",
      "monitor",
      [
        "Complete full antibiotic course.",
        "Monitor for any vaginal discharge over next 5 days.",
      ],
    ),
  ])

  set("ct-east-47", [
    obs(
      "ce47-1",
      "4/12/26",
      "Calving",
      "Uterine prolapse immediately post-calving. Vet emergency call. Calf live and healthy.",
      "Maria",
      "call-vet",
      [
        "Vet on site — do not attempt manual replacement without vet.",
        "Keep prolapsed tissue moist and clean.",
        "Isolate from herd immediately.",
      ],
      "Uterine prolapse is a life-threatening emergency. Immediate vet intervention is critical.",
    ),
    obs(
      "ce47-2",
      "4/12/26",
      "Health",
      "Vet successfully replaced and sutured uterus. Dam sedated during procedure. Stable post-op.",
      "Jake",
      "call-vet",
      [
        "Strict confinement for minimum 7 days.",
        "Administer anti-inflammatories and antibiotics per vet prescription.",
        "Monitor sutures daily for swelling or discharge.",
      ],
    ),
    obs(
      "ce47-3",
      "4/16/26",
      "Health",
      "Healing well — sutures intact, no swelling. Dam eating and drinking normally. Calf nursing from bottle.",
      "Maria",
      "monitor",
      ["Continue confinement for 3 more days.", "Suture removal scheduled for day 10."],
    ),
    obs(
      "ce47-4",
      "4/20/26",
      "Health",
      "Sutures removed. Full recovery confirmed by vet. Dam can return to pasture in 48 hours.",
      "Maria",
      "good",
      ["Gradual reintroduction to herd.", "Monitor social reintegration for 3 days."],
    ),
  ])

  // ─── NE COWS (ct-ne-N, n=1..60) ──────────────────────────────────────────

  set("ct-ne-1", [
    obs(
      "cne1-1",
      "4/21/26",
      "Calving",
      "Stage 1 labor confirmed — restless, off feed, tail raised. Water bag visible. Monitoring closely.",
      "Maria",
      "monitor",
      [
        "Check every 15 minutes.",
        "If no progress in 2 hours of active labor, call vet.",
        "Prepare calving supplies — chains, lubricant, towels.",
      ],
    ),
    obs(
      "cne1-2",
      "4/18/26",
      "Health",
      "Pre-calving check — udder filling well, ligaments relaxed, showing signs of imminent labor.",
      "Jake",
      "monitor",
      ["Move to calving pen.", "Increase monitoring frequency to every 2 hours."],
    ),
    obs(
      "cne1-3",
      "4/10/26",
      "Health",
      "Routine pregnancy check — good body condition, calf movement visible. On track.",
      "Maria",
      "good",
      ["Continue routine monitoring."],
    ),
  ])

  set("ct-ne-2", [
    obs(
      "cne2-1",
      "4/21/26",
      "Calving",
      "Active labor — feet presenting correctly. 45 minutes into active stage. Progress normal so far.",
      "Maria",
      "monitor",
      [
        "Allow natural progression for now.",
        "Assist if no delivery within 30 more minutes.",
        "Vet on standby.",
      ],
    ),
    obs(
      "cne2-2",
      "4/15/26",
      "Health",
      "Pre-calving check — bag and ligaments indicate calving within 24-48 hours.",
      "Jake",
      "monitor",
      ["Move to calving pen.", "Check every 2 hours."],
    ),
  ])

  set("ct-ne-4", [
    obs(
      "cne4-1",
      "4/19/26",
      "Health",
      "Nasal discharge — thick and yellow. Elevated temperature 104.2°F. Off feed.",
      "Maria",
      "call-vet",
      [
        "Isolate immediately to prevent respiratory spread.",
        "Call vet — likely bacterial respiratory infection.",
        "Do not delay treatment — respiratory illness spreads rapidly in confined cattle.",
      ],
      "Temperature elevation combined with nasal discharge pattern matches BRD. Early intervention is critical.",
    ),
    obs(
      "cne4-2",
      "4/14/26",
      "Health",
      "Mild nasal discharge noted — clear and watery. Eating normally, no temperature. Monitoring.",
      "Jake",
      "monitor",
      [
        "Watch for progression to yellow or green discharge.",
        "Check temperature morning and evening.",
      ],
    ),
    obs(
      "cne4-3",
      "4/5/26",
      "Health",
      "Routine check — healthy weight, clear eyes, no respiratory concerns.",
      "Maria",
      "good",
      ["No action needed."],
    ),
  ])

  set("ct-ne-15", [
    obs(
      "cne15-1",
      "4/20/26",
      "Behavior",
      "Isolating from herd consistently for 3 days. Standing at fence line alone, not grazing with group.",
      "Jake",
      "call-vet",
      [
        "Isolation behavior in cattle is a strong pain or illness indicator.",
        "Perform full health check — temperature, gut sounds, hydration.",
        "Call vet if no obvious cause found.",
      ],
      "Three consecutive days of isolation behavior is concerning — this pattern typically indicates systemic illness or significant pain.",
    ),
    obs(
      "cne15-2",
      "4/17/26",
      "Behavior",
      "First noticed standing apart from herd at evening check. Not alarming yet.",
      "Maria",
      "monitor",
      ["Watch closely over next 24-48 hours.", "Check feed intake."],
    ),
  ])

  set("ct-ne-45", [
    obs(
      "cne45-1",
      "3/31/26",
      "Calving",
      "Normal unassisted delivery — live bull calf. Cow calm and attentive. Calf standing within 1 hour.",
      "Maria",
      "good",
      [
        "Confirm nursing by 4 hours.",
        "Tag calf and record birth weight.",
        "Check cow's udder for mastitis over next 3 days.",
      ],
    ),
    obs(
      "cne45-2",
      "4/2/26",
      "Health",
      "Dam and calf thriving. Calf nursing 4-6 times daily. Dam eating full ration.",
      "Jake",
      "good",
      ["No action needed. Normal progress."],
    ),
    obs(
      "cne45-3",
      "4/8/26",
      "Health",
      "Calf weighed 85 lbs at 7 days — excellent growth. Dam in good body condition.",
      "Maria",
      "good",
      ["Continue routine monitoring.", "Schedule calf vaccination at 3 weeks."],
    ),
  ])

  set("ct-ne-57", [
    obs(
      "cne57-1",
      "3/20/26",
      "Calving",
      "Prolonged labor — assisted delivery required. Stillborn calf after 4 hours of labor. Cow exhausted.",
      "Maria",
      "call-vet",
      [
        "Monitor cow for retained placenta.",
        "Vet to assess for internal trauma.",
        "Offer fresh water and quality hay — energy replenishment critical.",
      ],
      "Extended labor duration significantly increases risk of retained placenta and secondary infection.",
    ),
    obs(
      "cne57-2",
      "3/21/26",
      "Health",
      "Cow stable. Placenta passed naturally at 10 hours. Eating and drinking. Vet cleared.",
      "Jake",
      "monitor",
      [
        "Monitor for signs of uterine infection over next 2 weeks.",
        "Watch for reduced appetite, discharge, or depression.",
      ],
    ),
    obs(
      "cne57-3",
      "3/28/26",
      "Health",
      "Full recovery — no signs of infection. Weight holding, eating well. Good condition.",
      "Maria",
      "good",
      ["Cleared for return to main herd."],
    ),
  ])

  set("ct-ne-59", [
    obs(
      "cne59-1",
      "3/16/26",
      "Calving",
      "Assisted delivery — live calf but significant hemorrhage during delivery. Vet on site.",
      "Maria",
      "call-vet",
      [
        "Vet managing hemorrhage — keep cow calm and confined.",
        "Monitor mucous membranes for pallor indicating blood loss.",
        "IV fluids administered by vet.",
      ],
      "Post-partum hemorrhage is life-threatening. Vet intervention is active.",
    ),
    obs(
      "cne59-2",
      "3/17/26",
      "Health",
      "Hemorrhage controlled. Cow weak but stable — standing and drinking. Appetite reduced.",
      "Jake",
      "call-vet",
      [
        "Continue IV fluid support per vet.",
        "Calf being bottle fed — dam too weak to allow nursing.",
        "Recheck in 24 hours.",
      ],
    ),
    obs(
      "cne59-3",
      "3/20/26",
      "Health",
      "Cow recovering well — color improved, eating hay. Calf introduced and nursing.",
      "Maria",
      "monitor",
      [
        "Monitor for anemia signs over next 2 weeks.",
        "Ensure adequate iron-rich forage.",
      ],
    ),
    obs(
      "cne59-4",
      "4/5/26",
      "Health",
      "Full recovery confirmed. Good body condition, calf thriving. Back in herd.",
      "Maria",
      "good",
      ["No further action needed."],
    ),
  ])

  // ─── SE COWS (ct-se-N, n=1..60) ──────────────────────────────────────────

  set("ct-se-1", [
    obs(
      "cse1-1",
      "4/21/26",
      "Calving",
      "Early stage labor — pacing, not eating, mild contractions visible. First-time observation in calving pen.",
      "Jake",
      "monitor",
      [
        "Check every 20 minutes.",
        "Call vet if no progress after 2 hours of active labor.",
      ],
    ),
    obs(
      "cse1-2",
      "4/20/26",
      "Health",
      "Pre-calving signs — ligaments fully relaxed, udder tight. Moved to calving pen.",
      "Maria",
      "monitor",
      ["Increase monitoring to every hour overnight."],
    ),
  ])

  set("ct-se-8", [
    obs(
      "cse8-1",
      "4/18/26",
      "Health",
      "Cow down in pasture — unable to rise. No obvious injury. Temperature 102.8°F.",
      "Maria",
      "call-vet",
      [
        "Do not force cow to rise — risk of injury.",
        "Call vet immediately — downer cow can deteriorate rapidly.",
        "Keep cow comfortable — bedding, water within reach.",
      ],
      "Downer cow status without obvious injury may indicate milk fever, nerve damage, or systemic illness. Requires immediate vet assessment.",
    ),
    obs(
      "cse8-2",
      "4/18/26",
      "Health",
      "Vet on site — calcium deficiency (hypocalcemia) diagnosed. IV calcium administered.",
      "Jake",
      "call-vet",
      [
        "Vet administered IV calcium — monitor for response within 30 minutes.",
        "If cow rises, offer free-choice hay and water.",
        "Do not leave unattended for next 4 hours.",
      ],
    ),
    obs(
      "cse8-3",
      "4/19/26",
      "Health",
      "Cow up and walking 2 hours after calcium treatment. Eating and drinking well.",
      "Maria",
      "monitor",
      [
        "Oral calcium supplement for 3 days.",
        "Watch for recurrence — hypocalcemia can repeat.",
      ],
    ),
    obs(
      "cse8-4",
      "4/21/26",
      "Health",
      "Fully recovered — moving well, eating full ration. No recurrence of hypocalcemia.",
      "Maria",
      "good",
      ["No further action needed. Clear for return to herd."],
    ),
  ])

  set("ct-se-19", [
    obs(
      "cse19-1",
      "4/20/26",
      "Health",
      "Eye discharge and swelling — pinkeye suspected. Left eye weeping and partially closed.",
      "Jake",
      "monitor",
      [
        "Separate from herd — pinkeye is highly contagious.",
        "Apply antibiotic eye ointment twice daily.",
        "Provide shade — UV exposure worsens pinkeye.",
      ],
      "Pinkeye (IBK) spreads rapidly in warm weather. Isolation and prompt treatment prevents herd spread.",
    ),
    obs(
      "cse19-2",
      "4/16/26",
      "Health",
      "Mild eye irritation noted — squinting occasionally. No discharge yet.",
      "Maria",
      "monitor",
      ["Monitor closely — early pinkeye can progress quickly."],
    ),
  ])

  set("ct-se-44", [
    obs(
      "cse44-1",
      "4/8/26",
      "Calving",
      "Normal delivery, assisted for final repositioning. Live heifer calf. Cow calm post-calving.",
      "Maria",
      "good",
      [
        "Confirm nursing within 4 hours.",
        "Check for retained placenta at 12 hours.",
        "Tag and record birth weight.",
      ],
    ),
    obs(
      "cse44-2",
      "4/9/26",
      "Health",
      "Placenta passed at 6 hours. Calf nursing well. Dam eating normally.",
      "Jake",
      "good",
      ["Normal post-calving progress. Routine monitoring."],
    ),
    obs(
      "cse44-3",
      "4/15/26",
      "Health",
      "Calf healthy at 7 days — 72 lbs. Dam in excellent condition.",
      "Maria",
      "good",
      ["Continue routine monitoring."],
    ),
  ])

  set("ct-se-57", [
    obs(
      "cse57-1",
      "3/8/26",
      "Calving",
      "Emergency c-section performed by vet — malpresentation, calf unable to be repositioned. Live calf. Dam stable post-surgery.",
      "Maria",
      "call-vet",
      [
        "Strict post-surgical confinement — minimum 10 days.",
        "Antibiotics and anti-inflammatories as prescribed.",
        "Monitor incision site twice daily.",
        "Retained placenta — do not manually remove.",
      ],
      "C-section recovery requires strict management. Both retained placenta and surgical wound increase infection risk significantly.",
    ),
    obs(
      "cse57-2",
      "3/10/26",
      "Health",
      "Placenta passed naturally at 48 hours. Incision site clean, no swelling. Eating hay.",
      "Jake",
      "call-vet",
      [
        "Continue full antibiotic course.",
        "Incision check daily.",
        "Calf bottle-feeding — dam too sore for nursing.",
      ],
    ),
    obs(
      "cse57-3",
      "3/18/26",
      "Health",
      "Incision healing well at 10 days. Sutures intact. Dam walking normally. Appetite normal.",
      "Maria",
      "monitor",
      ["Suture removal scheduled for day 14.", "Gradual reintroduction to herd."],
    ),
    obs(
      "cse57-4",
      "3/25/26",
      "Health",
      "Full surgical recovery. Calf introduced — nursing accepted. Dam in good condition.",
      "Maria",
      "good",
      ["Clear for return to herd. Monitor social reintegration."],
    ),
  ])

  // ─── BULLS (ct-west-N, n=1..30) ──────────────────────────────────────────

  set("ct-west-5", [
    obs(
      "cw5-1",
      "4/19/26",
      "Health",
      "Bull limping significantly on right rear. Swelling above hoof — possible footrot.",
      "Jake",
      "call-vet",
      [
        "Foot examination required — do not delay footrot treatment.",
        "Separate from herd to reduce spread risk.",
        "Call vet for antibiotic prescription.",
      ],
      "Footrot left untreated spreads rapidly and can lead to permanent lameness. Early intervention is critical.",
    ),
    obs(
      "cw5-2",
      "4/12/26",
      "Health",
      "Minor hoof wear noted — nothing alarming. Weight and appetite normal.",
      "Maria",
      "good",
      ["Schedule farrier/hoof trim at next routine visit."],
    ),
    obs(
      "cw5-3",
      "3/30/26",
      "Health",
      "Annual breeding soundness evaluation — passed. Good semen quality, motility 75%.",
      "Maria",
      "good",
      ["No action needed. Clear for breeding season."],
    ),
  ])

  set("ct-west-18", [
    obs(
      "cw18-1",
      "4/20/26",
      "Behavior",
      "Aggressive toward handlers during routine check — charging and head-pressing. Unusually agitated.",
      "Jake",
      "call-vet",
      [
        "Do not approach without proper handling facilities.",
        "Assess for pain source triggering aggression.",
        "Vet assessment recommended if behavior persists.",
      ],
      "Sudden aggression in previously manageable bulls can indicate pain, neurological issues, or hormonal stress. Safety is the priority.",
    ),
    obs(
      "cw18-2",
      "4/8/26",
      "Behavior",
      "Some restlessness noted — pacing fence line. Mild, not alarming.",
      "Maria",
      "monitor",
      ["Watch for escalation.", "Ensure adequate space and enrichment."],
    ),
    obs(
      "cw18-3",
      "3/20/26",
      "Health",
      "Breeding soundness exam — excellent result. Weight 1,850 lbs, good condition.",
      "Maria",
      "good",
      ["No concerns. Clear for breeding season."],
    ),
  ])

  // ─── JUVENILES (ct-nw-N, n=1..60) ────────────────────────────────────────

  set("ct-nw-14", [
    obs(
      "cnw14-1",
      "4/18/26",
      "Health",
      "Calf scouring — watery diarrhea, mild dehydration. Estimated 6-8 months old.",
      "Maria",
      "call-vet",
      [
        "Oral electrolytes immediately — 2 liters every 6 hours.",
        "Separate from pen to prevent spread.",
        "Call vet if not improving within 24 hours or if calf becomes weak.",
      ],
      "Calf scours is the leading cause of death in young cattle. Dehydration can become fatal within 24-48 hours if untreated.",
    ),
    obs(
      "cnw14-2",
      "4/19/26",
      "Health",
      "Responding to electrolytes — less watery stool, slightly more alert. Still monitoring closely.",
      "Jake",
      "monitor",
      [
        "Continue electrolytes every 6 hours.",
        "Introduce small amount of milk or creep feed if alert.",
        "Weigh daily to track hydration status.",
      ],
    ),
    obs(
      "cnw14-3",
      "4/21/26",
      "Health",
      "Scours resolved — normal stool, eating creep feed. Good energy levels. Weight stable.",
      "Maria",
      "good",
      [
        "Complete electrolyte course for one more day.",
        "Monitor for relapse over next 5 days.",
      ],
    ),
  ])

  set("ct-east-40", [
    obs(
      "ce40-1",
      "4/14/26",
      "Calving",
      "Unassisted normal delivery — live heifer calf. Dam and calf doing well.",
      "Maria",
      "good",
      ["Tag calf, confirm colostrum intake, routine monitoring."],
    ),
    obs(
      "ce40-2",
      "4/18/26",
      "Health",
      "Calf 4 days old — healthy and active. Dam in good condition.",
      "Jake",
      "good",
      ["Continue routine monitoring."],
    ),
  ])

  set("ct-ne-48", [
    obs(
      "cne48-1",
      "3/24/26",
      "Calving",
      "Normal delivery — live bull calf. Cow experienced, calved without assistance.",
      "Jake",
      "good",
      ["Tag and weigh calf. Confirm nursing."],
    ),
    obs(
      "cne48-2",
      "3/28/26",
      "Health",
      "Calf 4 days — 80 lbs, nursing well. Dam eating full ration, good condition.",
      "Maria",
      "good",
      ["Routine monitoring. Schedule calf vaccination at 3 weeks."],
    ),
    obs(
      "cne48-3",
      "4/10/26",
      "Health",
      "Calf 17 days — thriving, gaining weight consistently. Dam excellent condition.",
      "Maria",
      "good",
      ["No action needed."],
    ),
  ])

  set("ct-se-50", [
    obs(
      "cse50-1",
      "3/18/26",
      "Calving",
      "Unassisted delivery — live heifer calf, 74 lbs. Cow attentive and calm.",
      "Maria",
      "good",
      ["Confirm nursing, tag calf, routine post-calving check."],
    ),
    obs(
      "cse50-2",
      "3/25/26",
      "Health",
      "Dam and calf thriving at one week. Calf gaining well.",
      "Jake",
      "good",
      ["Continue routine monitoring."],
    ),
  ])

  return map
}
