import { Dialog } from "@base-ui/react/dialog"
import {
  ArrowUpDown,
  ChevronDown,
  ListFilter,
  MoreVertical,
  X,
} from "lucide-react"
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  AppOverflowMenu,
  AppOverflowMenuContent,
  AppOverflowMenuItem,
  AppOverflowMenuTrigger,
} from "@/components/ui/app-menu"
import { AppMenuSelect } from "@/components/ui/app-menu-select"
import { getStatusBadgeClass } from "@/lib/statusUtils"
import { cn } from "@/lib/utils"
import { ObservationCategoryBadge } from "@/components/ObservationCategoryBadge"
import type { ActivityLogEntry, HorseTableRow, LogCategory } from "@/components/HeguyRanchCoPilot"

type ActivityLogTab = "all" | LogCategory

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  horse: HorseTableRow | null
  logs: ActivityLogEntry[]
  onLogsChange: (logs: ActivityLogEntry[]) => void
}

/** Tab row — All, Health, Behavior (horse activity log). */
const TABS: { id: ActivityLogTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "health", label: "Health" },
  { id: "behavior", label: "Behavior" },
]

/** New-log category combobox (not tied to table filter tab). */
const LOG_CATEGORY_OPTIONS: { id: LogCategory; label: string }[] = [
  { id: "health", label: "Health" },
  { id: "behavior", label: "Behavior" },
]

/** Placeholder AI output until a real model is wired — matches `ActivityLogEntry` shape */
const DUMMY_AI_BY_CATEGORY: Record<
  LogCategory,
  { aiRecommendation: string; aiNextSteps: string[] }
> = {
  health: {
    aiRecommendation:
      "Demo analysis: this reads like a routine health note. Nothing here suggests an emergency from text alone; use your judgment and call a vet for anything acute.",
    aiNextSteps: [
      "Log appetite, water intake, and manure quality for the next 24–48 hours.",
      "Note any fever, lameness, or behavior change in a follow-up entry.",
      "Share this log with your vet if symptoms worsen or new ones appear.",
    ],
  },
  behavior: {
    aiRecommendation:
      "Demo analysis: herd dynamics and stress often show up as changes in movement, feeding order, or withdrawal. Patterns across several days matter more than a single snapshot.",
    aiNextSteps: [
      "Observe at the same time of day for a few days to see if the pattern repeats.",
      "Consider whether feed, turnout, or companions changed recently.",
      "Add a short follow-up note after any management change.",
    ],
  },
}

const ANALYZE_DELAY_MS = 800

/** Percent widths for `table-fixed` — sums to 100% so the grid fits the modal */
const TABLE_COL_WIDTHS = {
  withActions: {
    date: "w-[10%] min-w-0",
    category: "w-[11%] min-w-0",
    notes: "min-w-0 w-[44%]",
    ai: "w-[13%] min-w-0",
    loggedBy: "w-[12%] min-w-0",
    actions: "w-[10%] min-w-0",
  },
  noActions: {
    date: "w-[11%] min-w-0",
    category: "w-[12%] min-w-0",
    notes: "min-w-0 w-[49%]",
    ai: "w-[14%] min-w-0",
    loggedBy: "w-[14%] min-w-0",
  },
} as const

function parseActivityDate(dateStr: string): number {
  const m = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (!m) return 0
  const mo = Number(m[1])
  const day = Number(m[2])
  let y = Number(m[3])
  if (m[3].length === 2) y += 2000
  return new Date(y, mo - 1, day).getTime()
}

function statusPill(status: HorseTableRow["healthStatus"]) {
  const label = { flag: "Flag", good: "Good", monitor: "Monitor" }[status]
  return {
    className: getStatusBadgeClass(status),
    label,
  }
}

function MiniSortHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TableHead
      className={cn(
        "relative min-h-10 border-b border-neutral-200 bg-muted px-3 py-2.5 text-left text-xs font-normal text-foreground",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>{children}</span>
        <ArrowUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
      </div>
    </TableHead>
  )
}

function AiAnalysisPanel({ row }: { row: ActivityLogEntry }) {
  const hasAi =
    Boolean(row.aiRecommendation?.trim()) || (row.aiNextSteps && row.aiNextSteps.length > 0)
  if (!hasAi) {
    return (
      <p className="text-xs leading-relaxed whitespace-normal break-words text-neutral-600">
        No AI analysis for this entry yet. When analysis is available, it will appear here.
      </p>
    )
  }
  return (
    <div className="min-w-0 w-full space-y-3 text-left text-xs leading-relaxed text-foreground">
      {row.aiRecommendation?.trim() ? (
        <div className="min-w-0">
          <p className="text-xs font-normal tracking-wide text-neutral-500 uppercase">
            AI recommendation
          </p>
          <p className="mt-1 whitespace-normal break-words">{row.aiRecommendation}</p>
        </div>
      ) : null}
      {row.aiNextSteps && row.aiNextSteps.length > 0 ? (
        <div className="min-w-0">
          <p className="text-xs font-normal tracking-wide text-neutral-500 uppercase">
            Next steps
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 marker:text-neutral-400">
            {row.aiNextSteps.map((step, i) => (
              <li key={i} className="whitespace-normal break-words pl-0.5">
                {step}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function HorseActivityLogModal({ open, onOpenChange, horse, logs, onLogsChange }: Props) {
  const [tab, setTab] = useState<ActivityLogTab>("all")
  const [newNote, setNewNote] = useState("")
  const [loggedBy, setLoggedBy] = useState("")
  const [newLogCategory, setNewLogCategory] = useState<LogCategory>("health")
  const [newObservationOpen, setNewObservationOpen] = useState(false)
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const noteFieldRef = useRef<HTMLTextAreaElement>(null)
  const logsRef = useRef(logs)
  const tabRef = useRef(tab)
  const analyzeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  logsRef.current = logs
  tabRef.current = tab

  useEffect(() => {
    return () => {
      if (analyzeTimeoutRef.current) {
        clearTimeout(analyzeTimeoutRef.current)
        analyzeTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!open && analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current)
      analyzeTimeoutRef.current = null
      setIsAnalyzing(false)
    }
  }, [open])

  useEffect(() => {
    if (open && horse) {
      setTab("all")
      setNewNote("")
      setLoggedBy("")
      setNewLogCategory("health")
      setNewObservationOpen(false)
      setExpandedLogId(null)
      setIsAnalyzing(false)
    }
  }, [open, horse?.id, horse?.name])

  const filtered = useMemo(() => {
    if (tab === "all") {
      const order = new Map(logs.map((l, i) => [l.id, i]))
      return [...logs].sort((a, b) => {
        const byDate = parseActivityDate(b.date) - parseActivityDate(a.date)
        if (byDate !== 0) return byDate
        return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
      })
    }
    return logs.filter((l) => l.category === tab)
  }, [logs, tab])

  const col =
    tab === "behavior" ? TABLE_COL_WIDTHS.withActions : TABLE_COL_WIDTHS.noActions

  function handleDeleteLog(id: string) {
    onLogsChange(logs.filter((l) => l.id !== id))
    setExpandedLogId((openId) => (openId === id ? null : openId))
  }

  function handleAddLog() {
    const text = newNote.trim()
    if (!text || !horse || isAnalyzing) return

    const categorySnapshot = newLogCategory
    const loggedBySnapshot = loggedBy.trim() || "You"
    const notesSnapshot = text
    const entryId = `log-${Date.now()}`
    const dummy = DUMMY_AI_BY_CATEGORY[categorySnapshot]

    if (analyzeTimeoutRef.current) {
      clearTimeout(analyzeTimeoutRef.current)
      analyzeTimeoutRef.current = null
    }

    setIsAnalyzing(true)

    analyzeTimeoutRef.current = window.setTimeout(() => {
      analyzeTimeoutRef.current = null
      const dateStr = new Date().toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "2-digit",
      })
      const entry: ActivityLogEntry = {
        id: entryId,
        date: dateStr,
        category: categorySnapshot,
        notes: notesSnapshot,
        loggedBy: loggedBySnapshot,
        aiRecommendation: dummy.aiRecommendation,
        aiNextSteps: dummy.aiNextSteps,
      }
      onLogsChange([entry, ...logsRef.current])
      setNewNote("")
      setLoggedBy("")
      setNewLogCategory("health")
      setNewObservationOpen(false)
      if (tabRef.current !== "all" && tabRef.current !== categorySnapshot) {
        setTab(categorySnapshot)
      }
      setExpandedLogId(entry.id)
      setIsAnalyzing(false)
    }, ANALYZE_DELAY_MS)
  }

  function toggleNewObservation() {
    setNewObservationOpen((openForm) => {
      if (!openForm) {
        requestAnimationFrame(() => noteFieldRef.current?.focus())
      }
      return !openForm
    })
  }

  function closeLoggingForm() {
    setNewObservationOpen(false)
  }

  function cancelLoggingForm() {
    setNewObservationOpen(false)
    setNewNote("")
    setLoggedBy("")
    setNewLogCategory("health")
  }

  if (!horse) return null

  const status = statusPill(horse.healthStatus)
  const emptyTableMessage =
    tab === "all"
      ? "No observations yet."
      : `No ${TABS.find((t) => t.id === tab)?.label.toLowerCase()} entries yet.`

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="flex max-h-[min(92dvh,780px)] w-full min-w-0 max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl outline-none">
            <Dialog.Title className="sr-only">{horse.name} — activity log</Dialog.Title>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden px-4 pt-4 pb-6">
              <div className="flex h-4 shrink-0 items-center justify-end">
                <Dialog.Close
                  type="button"
                  className={cn(buttonVariants({ variant: "icon", size: "iconGhost" }))}
                  aria-label="Close"
                >
                  <X className="size-4" />
                </Dialog.Close>
              </div>

              {/* Figma 22:652 / 22:826 — profile row + global “Log new observation” in header */}
              <div className="flex shrink-0 gap-3">
                <div className="relative size-[81px] shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  <img
                    src={horse.photoUrl ?? "https://images.unsplash.com/photo-1553284965-83fd3e82fa5e?w=200&h=200&fit=crop&q=80"}
                    alt=""
                    className="size-full object-cover object-center"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
                  <div className="flex h-[51px] items-center gap-2.5">
                    <p className="shrink-0 whitespace-nowrap text-2xl font-semibold tracking-tight text-foreground">
                      {horse.name}
                    </p>
                    <span className={cn("shrink-0 text-center", status.className)}>
                      {status.label}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col items-end justify-center">
                      <Button
                        type="button"
                        size="sm"
                        variant={newObservationOpen ? "secondary" : "primary"}
                        onClick={toggleNewObservation}
                        aria-expanded={newObservationOpen}
                      >
                        Log new observation
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Figma 22:826 — global log card above tabs */}
              {newObservationOpen ? (
                <div className="shrink-0 rounded-xl border border-neutral-400 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                  <div
                    id="new-observation-panel"
                    role="region"
                    aria-label="Log new observation"
                    aria-busy={isAnalyzing}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <p className="text-sm font-normal text-foreground">Log new observation</p>
                        <div>
                          <label htmlFor="new-log-category" className="sr-only">
                            Observation category
                          </label>
                          <AppMenuSelect
                            id="new-log-category"
                            variant="compact"
                            className="w-[128px]"
                            value={newLogCategory}
                            onValueChange={(v) => setNewLogCategory(v as LogCategory)}
                            options={LOG_CATEGORY_OPTIONS.map((opt) => ({
                              value: opt.id,
                              label: opt.label,
                            }))}
                            aria-label="Observation category"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="icon"
                        size="iconGhost"
                        onClick={closeLoggingForm}
                        aria-label="Close log form"
                      >
                        <X className="size-4" aria-hidden />
                      </Button>
                    </div>
                    <Textarea
                      ref={noteFieldRef}
                      id="activity-note"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder={`What did you observe about ${horse.name}?`}
                      rows={3}
                      className="min-h-[76px] resize-y rounded-lg"
                    />
                    <input
                      id="activity-by"
                      type="text"
                      value={loggedBy}
                      onChange={(e) => setLoggedBy(e.target.value)}
                      placeholder="Name"
                      className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none placeholder:text-neutral-500 focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200"
                    />
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <Button
                        type="button"
                        variant="tertiary"
                        size="lg"
                        onClick={cancelLoggingForm}
                        disabled={isAnalyzing}
                        className="h-10 min-h-10 justify-center px-6"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="ai"
                        size="lg"
                        onClick={handleAddLog}
                        disabled={!newNote.trim() || isAnalyzing}
                        className="h-10 min-h-10 justify-center rounded-full px-6 text-sm font-medium disabled:opacity-50"
                      >
                        {isAnalyzing ? "Analyzing…" : "Analyze"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-col gap-3">
                  <div className="w-full border-b border-neutral-200">
                    <div className="flex">
                      {TABS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTab(t.id)}
                          className={cn(
                            "min-w-[56px] shrink-0 px-4 pt-2 text-center text-sm whitespace-nowrap text-foreground",
                            tab === t.id
                              ? "border-b-2 border-foreground pb-3.5"
                              : "border-b-2 border-transparent pb-3"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex h-8 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-neutral-200 bg-white px-1.5 py-1 text-xs text-neutral-500 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                    >
                      <ListFilter className="size-4 text-neutral-500" aria-hidden />
                      Filter
                      <ChevronDown className="size-4 text-neutral-500" aria-hidden />
                    </button>
                    <span className="ml-auto text-xs tabular-nums text-neutral-500">
                      {logs.length} observation{logs.length === 1 ? "" : "s"} total
                    </span>
                  </div>
                </div>

                <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden">
                  <Table
                    className="w-full min-w-0 max-w-full table-fixed"
                    containerClassName="min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
                  >
                    <TableHeader className="sticky top-0 z-[1] bg-muted shadow-[inset_0_-1px_0_0_var(--border)]">
                      <TableRow className="border-0 hover:bg-transparent">
                          <MiniSortHeader className={col.date}>Date</MiniSortHeader>
                          <MiniSortHeader className={col.category}>Category</MiniSortHeader>
                          <MiniSortHeader className={col.notes}>Notes</MiniSortHeader>
                          <MiniSortHeader className={col.ai}>AI Analysis</MiniSortHeader>
                          <MiniSortHeader className={col.loggedBy}>Logged by</MiniSortHeader>
                          {tab === "behavior" ? (
                            <TableHead
                              className={cn(
                                "relative min-h-10 border-b border-neutral-200 bg-muted px-2 py-2.5 text-left text-xs font-normal text-foreground",
                                TABLE_COL_WIDTHS.withActions.actions
                              )}
                            >
                              <span className="sr-only">Actions</span>
                            </TableHead>
                          ) : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody className="[&_tr:last-child_td]:border-b-0 [&_tr:last-child]:!border-b-0">
                        {filtered.length === 0 ? (
                          <TableRow className="border-0 hover:bg-transparent">
                            <TableCell
                              colSpan={tab === "behavior" ? 6 : 5}
                              className="h-auto max-h-none min-h-20 max-w-none border-b-0 py-6 text-center text-sm whitespace-normal break-words text-neutral-500"
                            >
                              {emptyTableMessage}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filtered.map((row) => {
                            const colSpan = tab === "behavior" ? 6 : 5
                            const isOpen = expandedLogId === row.id
                            return (
                              <Fragment key={row.id}>
                                <TableRow className="border-neutral-200 hover:bg-neutral-50/80">
                                  <TableCell
                                    className={cn(
                                      "border-b border-neutral-200 align-top py-3 text-xs whitespace-normal break-words text-foreground",
                                      col.date
                                    )}
                                  >
                                    {row.date}
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "h-auto max-h-none border-b border-neutral-200 align-top py-3",
                                      col.category
                                    )}
                                  >
                                    <ObservationCategoryBadge category={row.category} />
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "h-auto max-h-none border-b border-neutral-200 align-top py-3 text-xs leading-relaxed whitespace-normal break-words text-foreground",
                                      col.notes
                                    )}
                                  >
                                    {row.notes}
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "border-b border-neutral-200 align-top py-3",
                                      col.ai
                                    )}
                                  >
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      aria-expanded={isOpen}
                                      onClick={() =>
                                        setExpandedLogId((id) => (id === row.id ? null : row.id))
                                      }
                                      className="h-8 max-w-full px-3"
                                    >
                                      {isOpen ? "Hide" : "View"}
                                    </Button>
                                  </TableCell>
                                  <TableCell
                                    className={cn(
                                      "h-auto max-h-none border-b border-neutral-200 align-top py-3 text-xs whitespace-normal break-words text-foreground",
                                      col.loggedBy
                                    )}
                                  >
                                    {row.loggedBy}
                                  </TableCell>
                                  {tab === "behavior" ? (
                                    <TableCell
                                      className={cn(
                                        "h-auto max-h-none border-b border-neutral-200 align-top p-1 pt-3",
                                        TABLE_COL_WIDTHS.withActions.actions
                                      )}
                                    >
                                      <div
                                        className="flex justify-center"
                                        onClick={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        role="presentation"
                                      >
                                        <AppOverflowMenu>
                                          <AppOverflowMenuTrigger
                                            type="button"
                                            aria-label={`Actions for behavior log from ${row.date}`}
                                          >
                                            <MoreVertical className="size-4" strokeWidth={2} aria-hidden />
                                          </AppOverflowMenuTrigger>
                                          <AppOverflowMenuContent align="end" sideOffset={4}>
                                            <AppOverflowMenuItem
                                              destructive
                                              onClick={() => handleDeleteLog(row.id)}
                                            >
                                              Delete
                                            </AppOverflowMenuItem>
                                          </AppOverflowMenuContent>
                                        </AppOverflowMenu>
                                      </div>
                                    </TableCell>
                                  ) : null}
                                </TableRow>
                                {isOpen ? (
                                  <TableRow className="border-neutral-200 hover:bg-transparent">
                                    <TableCell
                                      colSpan={colSpan}
                                      className="h-auto max-h-none w-full min-w-0 max-w-none border-b border-neutral-200 bg-neutral-50/90 px-4 py-4 align-top whitespace-normal"
                                    >
                                      <div className="min-w-0 w-full max-w-none rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                                        <AiAnalysisPanel row={row} />
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ) : null}
                              </Fragment>
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                </div>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
