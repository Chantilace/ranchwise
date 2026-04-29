import type { Cattle } from "@/types/cattle"
import type { AIResult, Category, ObservationEntry, RiskLevel } from "@/types/observation"
import { getCalvingStatus } from "@/lib/calvingStatus"
import { getObservationDomain, observationDomainFromCategory } from "@/lib/observationDomain"
import { getAiRiskLevelFromObservations } from "@/lib/animalUtils"
import { parseObservationDate } from "@/lib/initialObservations"
import { parseISO } from "date-fns"
import { formatSeedObservationDate, seedDaysAgo } from "@/lib/observationSeedDates"

const MS_DAY = 86_400_000

function isoToObsDate(iso: string): string {
  const d = parseISO(iso)
  if (Number.isNaN(d.getTime())) return seedDaysAgo(0)
  return formatSeedObservationDate(d)
}

function ai(riskLevel: RiskLevel, recommendations: string[], patternNote: string | null = null): AIResult {
  return {
    riskLevel,
    riskLabel:
      riskLevel === "flag" ? "Flag" : riskLevel === "monitor" ? "Monitor" : "Good",
    recommendations,
    patternNote,
  }
}

function entry(
  id: string,
  date: string,
  category: Category,
  notes: string,
  loggedBy: string,
  risk: RiskLevel,
  recs: string[],
  patternNote?: string | null
): ObservationEntry {
  return {
    id,
    date,
    category,
    observationDomain: observationDomainFromCategory(category),
    notes,
    loggedBy,
    aiResult: ai(risk, recs, patternNote ?? null),
  }
}

function derivedCattleHealthLabel(list: ObservationEntry[]): "Flag" | "Monitor" | "Good" {
  const lvl = getAiRiskLevelFromObservations(list)
  if (lvl === "flag") return "Flag"
  if (lvl === "monitor") return "Monitor"
  return "Good"
}

function hasCalvingCategoryObs(list: ObservationEntry[]): boolean {
  return list.some((o) => o.category === "Calving")
}

function hasRecentHealthFlag(list: ObservationEntry[], days: number): boolean {
  const t0 = Date.now() - days * MS_DAY
  return list.some(
    (o) =>
      getObservationDomain(o) === "health" &&
      o.aiResult?.riskLevel === "flag" &&
      parseObservationDate(o.date) >= t0
  )
}

function hasMonitorSupportingObs(list: ObservationEntry[]): boolean {
  return list.some(
    (o) =>
      (o.aiResult?.riskLevel === "monitor" || o.aiResult?.riskLevel === "flag") &&
      (getObservationDomain(o) === "health" || getObservationDomain(o) === "behavior")
  )
}

function effectiveCalvingExcusesMonitor(c: Cattle): boolean {
  const e = getCalvingStatus(c)
  return e === "calving-soon" || e === "in-labor" || e === "complications"
}

/**
 * Appends / prepends synthetic observations so roster health and calving states
 * always have a believable paper trail (demo integrity).
 */
export function fillCattleObservationGaps(
  map: Record<string, ObservationEntry[]>,
  cattle: readonly Cattle[]
): { appended: number; prepended: number } {
  let appended = 0
  let prepended = 0

  const push = (id: string, rows: ObservationEntry[]) => {
    const prev = map[id] ?? []
    map[id] = [...prev, ...rows]
    appended += rows.length
  }

  const unshift = (id: string, rows: ObservationEntry[]) => {
    const prev = map[id] ?? []
    map[id] = [...rows, ...prev]
    prepended += rows.length
  }

  for (const c of cattle) {
    const id = c.id
    let list = [...(map[id] ?? [])]

    const hs = c.healthStatus ?? "Good"
    const storedCalving = c.calvingStatus

    // ── Complications first (timeline + follow-up) ─────────────────────────
    if (storedCalving === "complications" && c.calvingDate) {
      list = map[id] ?? []
      const d0 = isoToObsDate(c.calvingDate)
      const comps = (c.calvingComplications ?? []).filter(Boolean).join(", ")
      if (!hasCalvingCategoryObs(list)) {
        push(id, [
          entry(
            `gap-${id}-comp-a`,
            d0,
            "Calving",
            `Delivery logged with complications (${comps || "see vet sheet"}). Vet on site; calf status ${c.calfStatus ?? "live"}. Dam stabilized before haul to pen.`,
            "Wyatt",
            "flag",
            [
              "IV protocol per vet orders.",
              "White blood card on gate for night check.",
              "Photos of presentation filed.",
            ],
            "High-risk calving — keep dam under intensive watch 72h."
          ),
        ])
      }
      list = map[id] ?? []
      const hasLaterThanCalving = list.some((o) => parseObservationDate(o.date) > parseObservationDate(d0))
      if (!hasLaterThanCalving) {
        const cd = parseISO(c.calvingDate)
        const follow = Number.isNaN(cd.getTime()) ? new Date() : new Date(cd)
        follow.setDate(follow.getDate() + 2)
        const followStr = formatSeedObservationDate(follow)
        push(id, [
          entry(
            `gap-${id}-comp-b`,
            followStr,
            "Health",
            `Post-complication recheck — ${comps || "uterine event"} per vet plan. Appetite at 70%, manure formed, temp normal this morning.`,
            "Lou",
            "monitor",
            [
              "Continue antibiotics through printed course.",
              "Recheck blood tomorrow if appetite lags again.",
            ]
          ),
        ])
      }
    }

    // ── In labor ───────────────────────────────────────────────────────────
    if (storedCalving === "in-labor") {
      list = map[id] ?? []
      const hasLaborNarrative = list.some(
        (o) =>
          o.category === "Calving" &&
          (o.notes.toLowerCase().includes("labor") ||
            o.notes.toLowerCase().includes("calving") ||
            o.notes.toLowerCase().includes("water bag"))
      )
      if (!hasLaborNarrative) {
        unshift(id, [
          entry(
            `gap-${id}-labor`,
            seedDaysAgo(0),
            "Calving",
            "Entered active labor on watch — tail switching, cow isolated in calving pen, feet not yet presented. Crew on radio.",
            "Juniper",
            "monitor",
            [
              "Check every 20 minutes until calf on ground.",
              "Vet on standby if no progress 90 minutes after water bag.",
            ]
          ),
        ])
      }
    }

    // ── Calved: calving narrative dated to calvingDate (risk aligns with row) ─
    if (storedCalving === "calved" && c.calvingDate) {
      list = map[id] ?? []
      if (!hasCalvingCategoryObs(list)) {
        const d = isoToObsDate(c.calvingDate)
        const delivery = c.deliveryType ?? "normal"
        const calf = c.calfStatus ?? "live"
        let postpartumRisk: RiskLevel = "good"
        if (calf === "stillborn") postpartumRisk = "flag"
        else if (hs === "Flag") postpartumRisk = "flag"
        else if (hs === "Monitor") postpartumRisk = "monitor"
        push(id, [
          entry(
            `gap-${id}-calved`,
            d,
            "Calving",
            `Calving logged ${d} — ${delivery === "normal" ? "unassisted" : delivery === "assisted" ? "assisted" : "c-section"} pull. Calf ${calf === "live" ? "live and nursing" : calf === "stillborn" ? "stillborn — dam attended by vet" : "status recorded on tag card"}. Dam up on all fours within 2h, placenta watched through next checks.`,
            "Oliver",
            postpartumRisk,
            postpartumRisk === "flag"
              ? ["Metritis watch 72h.", "Vet callback window on whiteboard.", "Hold from transport list."]
              : postpartumRisk === "monitor"
                ? ["Second weigh in 10 days.", "Note dam appetite vs pen average."]
                : ["Record calf tag match to dam.", "Electrolyte bucket at gate day 3 if hot."],
            postpartumRisk === "flag" ? "Postpartum watch — keep eyes on dam through first week." : null
          ),
        ])
      }
    }

    list = map[id] ?? []

    // ── Health: monitor (not excused by calving state alone) ────────────────
    if (
      hs === "Monitor" &&
      !effectiveCalvingExcusesMonitor(c) &&
      (!list.length || !hasMonitorSupportingObs(list))
    ) {
      unshift(id, [
        entry(
          `gap-${id}-mon`,
          seedDaysAgo(2),
          "Health",
          "Watch list from roster — soft manure this morning, otherwise bright at bunk. Temp not taken yet.",
          "Frankie",
          "monitor",
          [
            "Take temp before evening feed.",
            "Note appetite vs yesterday.",
            "Call vet if watery stool continues past 48h or she goes off water.",
          ]
        ),
      ])
      list = map[id] ?? []
    }

    // ── Health: flag + recency ──────────────────────────────────────────────
    if (hs === "Flag" && !hasRecentHealthFlag(list, 14)) {
      unshift(id, [
        entry(
          `gap-${id}-flg`,
          seedDaysAgo(1),
          "Health",
          "Urgent check — down once getting up from loafing shed, reluctant to weight left rear. Handler held for exam.",
          "Juniper",
          "flag",
          [
            "Vet line aware — photos sent.",
            "Keep on deep straw, limit pushing in alley.",
            "Do not force her onto truck until cleared.",
          ],
          "Acute lameness in a heavy bred female needs same-day rule-out before transport."
        ),
      ])
      list = map[id] ?? []
    }

    // ── Reconcile derived health vs row when row demands escalation ──────────
    const derived = derivedCattleHealthLabel(map[id] ?? [])
    if (hs === "Flag" && derived !== "Flag") {
      unshift(id, [
        entry(
          `gap-${id}-flg2`,
          seedDaysAgo(0),
          "Health",
          "Second look at lunch — nasal froth with exercise, lungs sound rough ventrally. Pulled from rotation list.",
          "Wyatt",
          "flag",
          [
            "Vet scheduled for late afternoon haul if fever spikes.",
            "Isolate air space as much as pens allow.",
          ]
        ),
      ])
    } else if (hs === "Monitor" && derived === "Good" && !effectiveCalvingExcusesMonitor(c)) {
      unshift(id, [
        entry(
          `gap-${id}-mon2`,
          seedDaysAgo(1),
          "Health",
          "Body condition slipped half a score since last weigh tape — ribs easier to read, still eating but slower at bunk.",
          "Wes",
          "monitor",
          [
            "Offer second cut hay overnight.",
            "Re-weigh in 7 days.",
            "Flag nutrition sheet for manager review.",
          ]
        ),
      ])
    }
  }

  return { appended, prepended }
}
