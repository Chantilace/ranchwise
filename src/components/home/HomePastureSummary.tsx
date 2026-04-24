import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useRanchData } from "@/contexts/RanchDataContext"
import { getPastureSignalCounts } from "@/lib/cattleUi"
import { pastureSignalBadgeFill } from "@/lib/statusTagTokens"
import type { ObservationEntry } from "@/types/observation"
import { cn } from "@/lib/utils"

const SECTION_LABEL = "text-xs font-medium uppercase tracking-widest text-muted-foreground"

function summaryBadge(
  pastureId: string,
  cattle: Parameters<typeof getPastureSignalCounts>[1],
  observationsByCattleId: Record<string, ObservationEntry[]>
): { label: string; className: string } {
  const s = getPastureSignalCounts(pastureId, cattle, observationsByCattleId)
  if (s.calvingSoon > 0) {
    return { label: "Calving soon", className: pastureSignalBadgeFill.calvingSoon }
  }
  return { label: "Clear", className: pastureSignalBadgeFill.clear }
}

export function HomePastureSummary() {
  const { pastures, cattle, observationsByCattleId } = useRanchData()

  const rows = useMemo(
    () =>
      pastures.map((p) => {
        const inPasture = cattle.filter((c) => c.pastureId === p.id)
        const heifers = inPasture.filter((c) => (c.sexLabel ?? "").toLowerCase() === "heifer").length
        const badge = summaryBadge(p.id, cattle, observationsByCattleId)
        return { pasture: p, total: inPasture.length, heifers, badge }
      }),
    [pastures, cattle, observationsByCattleId]
  )

  return (
    <section>
      <p className={cn(SECTION_LABEL, "mb-3")}>Pasture summary</p>
      <div className="rounded-xl border-[0.5px] border-neutral-200 bg-white shadow-sm">
        {rows.map((r, i) => (
          <div key={r.pasture.id}>
            {i > 0 ? <div className="mx-3 border-t border-neutral-100" /> : null}
            <Link
              to={`/cattle/${r.pasture.id}`}
              className="flex items-start justify-between gap-3 px-4 py-3 outline-none transition-colors hover:bg-neutral-50/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{r.pasture.name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.total} head{r.heifers > 0 ? ` · ${r.heifers} heifers` : ""}
                </p>
              </div>
              <span className={cn("inline-flex shrink-0 items-center justify-center", r.badge.className)}>
                {r.badge.label}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
