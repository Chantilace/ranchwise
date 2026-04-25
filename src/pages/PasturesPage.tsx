import { Dialog } from "@base-ui/react/dialog"
import { ArrowDown, ArrowUp, ArrowUpDown, X } from "lucide-react"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { PageTitleStrip } from "@/components/PageTitleStrip"
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell"
import { SmartSuggestionsPanel } from "@/components/SmartSuggestionsPanel"
import { WorkspaceSearchField } from "@/components/WorkspaceSearchField"
import { AiSparkleDisclosureButton } from "@/components/ui/ai-sparkle-disclosure-button"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRanchData } from "@/contexts/RanchDataContext"
import { getPastureSignalCounts } from "@/lib/cattleUi"
import { countPastureHerdComposition, getPastureSuggestion } from "@/lib/pastureSuggestion"
import { pastureSignalBadgeFill } from "@/lib/statusTagTokens"
import { WORKSPACE_PAGE_CARD_CLASS, WORKSPACE_PAGE_SCROLL_CLASS } from "@/lib/workspacePageCard"
import { cn } from "@/lib/utils"
import type { Cattle, Pasture } from "@/types/cattle"
import type { ObservationEntry } from "@/types/observation"

type SortKey = "name" | "lastCheck"
type SortDir = "asc" | "desc"

function pastureSignalPills(
  pastureId: string,
  cattle: Cattle[],
  observationsByCattleId: Record<string, ObservationEntry[]>
) {
  const s = getPastureSignalCounts(pastureId, cattle, observationsByCattleId)
  const pills: { key: string; className: string; label: string }[] = []

  if (s.calvingSoon > 0) {
    pills.push({
      key: "calving-soon",
      className: pastureSignalBadgeFill.calvingSoon,
      label: `${s.calvingSoon} calving soon`,
    })
  }
  if (s.flagged > 0) {
    pills.push({
      key: "flagged",
      className: pastureSignalBadgeFill.flagged,
      label: `${s.flagged} flagged`,
    })
  }
  if (s.monitored > 0) {
    pills.push({
      key: "monitored",
      className: pastureSignalBadgeFill.monitored,
      label: `${s.monitored} monitor`,
    })
  }
  if (pills.length === 0) {
    pills.push({
      key: "clear",
      className: pastureSignalBadgeFill.clear,
      label: "Clear",
    })
  }

  const pillBase =
    "inline-flex shrink-0 items-center justify-center rounded-lg border-none px-2 py-0.5 text-xs font-semibold"

  return (
    <div className="flex flex-wrap justify-start gap-2">
      {pills.map((p) => (
        <span key={p.key} className={cn(pillBase, p.className)}>
          {p.label}
        </span>
      ))}
    </div>
  )
}

function stockMeta(hc: ReturnType<typeof countPastureHerdComposition>): string {
  const total = hc.heiferCount + hc.cowCount + hc.bullCount
  const parts: Array<{ key: "H" | "C" | "B"; count: number; full: string }> = [
    { key: "H", count: hc.heiferCount, full: "heifers" },
    { key: "C", count: hc.cowCount, full: "cows" },
    { key: "B", count: hc.bullCount, full: "bulls" },
  ].filter((p) => p.count > 0)

  if (parts.length === 0) return `${total} animals`
  if (parts.length === 1) return `${total} animals · ${parts[0]!.count} ${parts[0]!.full}`
  return `${total} animals · ${parts.map((p) => `${p.count}${p.key}`).join("/")}`
}

function lastCheckSortKey(p: Pasture): number {
  if (!p.lastCheckDate) return -Infinity
  const t = Date.parse(p.lastCheckDate)
  return Number.isFinite(t) ? t : -Infinity
}

function pastureAiSuggestion(p: Pasture, cattle: Cattle[]): string | null {
  const hc = countPastureHerdComposition(cattle, p.id)
  return hc.heiferCount > 0 ? getPastureSuggestion(hc.heiferCount, hc.cowCount) : null
}

export function PasturesPage() {
  const navigate = useNavigate()
  const { pastures, cattle, observationsByCattleId, openPastureCheckModal } = useRanchData()
  const [search, setSearch] = useState("")

  const [sortKey, setSortKey] = useState<SortKey>("lastCheck")
  const [sortDir, setSortDir] = useState<SortDir>("asc") // oldest first

  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiPastureId, setAiPastureId] = useState<string | null>(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = q
      ? pastures.filter((p) => p.name.toLowerCase().includes(q))
      : [...pastures]
    list.sort((a, b) => {
      if (sortKey === "name") {
        const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        return sortDir === "asc" ? cmp : -cmp
      }
      const aT = lastCheckSortKey(a)
      const bT = lastCheckSortKey(b)
      if (aT === bT) return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      return sortDir === "asc" ? aT - bT : bT - aT
    })
    return list
  }, [pastures, search, sortKey, sortDir])

  const selectedPasture = useMemo(() => {
    if (!aiPastureId) return null
    return pastures.find((p) => p.id === aiPastureId) ?? null
  }, [aiPastureId, pastures])

  const selectedSuggestion = useMemo(() => {
    if (!selectedPasture) return null
    return pastureAiSuggestion(selectedPasture, cattle)
  }, [selectedPasture, cattle])

  const addPastureCta = (
    <Button
      type="button"
      variant="primary"
      className="h-9 min-h-9 w-full px-4 sm:w-auto"
      onClick={() => {
        // TODO: Wire to add-pasture flow when it exists.
        console.log("Add pasture")
      }}
    >
      Add pasture
    </Button>
  )

  return (
    <RanchWorkspaceShell
      searchValue=""
      onSearchChange={() => {}}
      searchPlaceholder="Search everything (coming soon)"
      searchAriaLabel="Search everything"
      contentClassName={WORKSPACE_PAGE_SCROLL_CLASS}
    >
      <div className={WORKSPACE_PAGE_CARD_CLASS}>
        <PageTitleStrip
          className="border-b-0 pb-0"
          title="Pastures"
          titleClassName="text-xl font-bold tracking-normal text-foreground lg:font-semibold lg:text-foreground"
          actions={addPastureCta}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <WorkspaceSearchField
            variant="inline"
            value={search}
            onChange={setSearch}
            placeholder="Search pastures..."
            ariaLabel="Search pastures by name"
            className="w-full sm:w-[320px] sm:max-w-none"
          />
        </div>

        {pastures.length === 0 ? (
          <div className="mt-6 rounded-lg border border-border bg-card p-6">
            <p className="text-sm font-medium text-foreground">No pastures yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first pasture to get started.
            </p>
            <div className="mt-4">{addPastureCta}</div>
          </div>
        ) : (
          <div className="mt-4">
            <Table className="border-separate border-spacing-0">
              <TableHeader>
                <TableRow className="border-neutral-200 hover:bg-transparent">
                  <TableHead className="h-14 border-b border-neutral-200 bg-[var(--muted)]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5"
                      onClick={() => {
                        setSortKey("name")
                        setSortDir((d) => (sortKey === "name" ? (d === "asc" ? "desc" : "asc") : "asc"))
                      }}
                    >
                      <span>Pasture</span>
                      {sortKey === "name" ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="size-4 shrink-0 text-foreground" aria-hidden />
                        ) : (
                          <ArrowDown className="size-4 shrink-0 text-foreground" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="h-14 border-b border-neutral-200 bg-[var(--muted)]">
                    Status
                  </TableHead>
                  <TableHead className="h-14 border-b border-neutral-200 bg-[var(--muted)]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5"
                      onClick={() => {
                        setSortKey("lastCheck")
                        setSortDir((d) => (sortKey === "lastCheck" ? (d === "asc" ? "desc" : "asc") : "asc"))
                      }}
                    >
                      <span>Last Check</span>
                      {sortKey === "lastCheck" ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="size-4 shrink-0 text-foreground" aria-hidden />
                        ) : (
                          <ArrowDown className="size-4 shrink-0 text-foreground" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="h-14 border-b border-neutral-200 bg-[var(--muted)] text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.length === 0 ? (
                  <TableRow className="border-neutral-200 hover:bg-transparent">
                    <TableCell colSpan={4} className="h-32 border-b-0 bg-white text-center align-middle">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm font-medium text-foreground">No pastures match your search</p>
                        <p className="text-sm text-muted-foreground">Try a different search term.</p>
                        <Button type="button" variant="tertiary" onClick={() => setSearch("")}>
                          Clear search
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
                {rows.map((p) => {
                  const hc = countPastureHerdComposition(cattle, p.id)
                  const suggestion = pastureAiSuggestion(p, cattle)
                  const sparkleExpanded = aiPanelOpen && aiPastureId === p.id
                  const cellBg =
                    "border-b border-neutral-200 bg-white group-hover:bg-muted/50"

                  return (
                    <TableRow
                      key={p.id}
                      className="group cursor-pointer border-neutral-200"
                      onClick={() => navigate(`/pastures/${p.id}`)}
                    >
                      <TableCell className={`${cellBg} whitespace-normal`}>
                        <p className="text-sm font-medium text-foreground">{p.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{stockMeta(hc)}</p>
                      </TableCell>

                      <TableCell className={`${cellBg} whitespace-normal`}>
                        {pastureSignalPills(p.id, cattle, observationsByCattleId)}
                      </TableCell>

                      <TableCell className={`${cellBg} text-sm text-muted-foreground`}>
                        {p.lastObservation ?? "—"}
                      </TableCell>

                      <TableCell className={`${cellBg} text-right`}>
                        <div className="flex items-center justify-end gap-2">
                          {suggestion ? (
                            <AiSparkleDisclosureButton
                              ariaLabel={sparkleExpanded ? "Hide AI suggestion" : "Show AI suggestion"}
                              expanded={sparkleExpanded}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                const isSelected = aiPastureId === p.id
                                setAiPastureId(p.id)
                                setAiPanelOpen(isSelected ? !aiPanelOpen : true)
                              }}
                            />
                          ) : null}

                          <Button
                            type="button"
                            variant="tertiary"
                            size="sm"
                            className="shrink-0 text-xs"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              openPastureCheckModal({ pastureId: p.id, pastureName: p.name })
                            }}
                          >
                            Log check
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog.Root
        open={aiPanelOpen && selectedPasture != null && selectedSuggestion != null}
        onOpenChange={(open) => {
          if (!open) setAiPanelOpen(false)
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[1px]" />
          <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col bg-background shadow-xl outline-none">
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="min-w-0">
                <Dialog.Title className="text-base font-medium text-foreground">AI suggestion</Dialog.Title>
                {selectedPasture ? (
                  <Dialog.Description className="mt-0.5 text-sm text-muted-foreground">
                    {selectedPasture.name}
                  </Dialog.Description>
                ) : null}
              </div>
              <Dialog.Close asChild>
                <Button type="button" variant="icon" size="iconGhost" aria-label="Close">
                  <X className="size-4" aria-hidden />
                </Button>
              </Dialog.Close>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {selectedSuggestion ? (
                <SmartSuggestionsPanel mode="modal" suggestions={[selectedSuggestion]} />
              ) : null}
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </RanchWorkspaceShell>
  )
}

