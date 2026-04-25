import { Dialog } from "@base-ui/react/dialog";
import { format, isValid, parseISO } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ADD_HORSE_MAX_PHOTO_BYTES,
  AddHorseFormFields,
  addHorseFormRequiredOk,
} from "@/components/AddHorseFormFields";
import type { HorseTableRow } from "@/components/HeguyRanchCoPilot";
import { horseRowKey } from "@/components/HeguyRanchCoPilot";
import { IdentityChip } from "@/components/IdentityChip";
import { HorseLogSheet } from "@/components/HorseLogSheet";
import { ObservationCategoryBadge } from "@/components/ObservationCategoryBadge";
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell";
import { useRanchData } from "@/contexts/RanchDataContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  AppOverflowMenu,
  AppOverflowMenuContent,
  AppOverflowMenuItem,
  AppOverflowMenuTrigger,
} from "@/components/ui/app-menu";
import { AppMenuSelect } from "@/components/ui/app-menu-select";
import {
  HorseObservationCombinedFilter,
  type ProfileObsCategoryFilter,
} from "@/components/workspace/HorseObservationCombinedFilter";
import { StatusBadge, type StatusBadgeStatus } from "@/components/StatusBadge";
import { formatFarrierDateDisplay } from "@/lib/horseUtils";
import { parseObservationDate } from "@/lib/initialObservations";
import { getStatusDotClass } from "@/lib/statusUtils";
import { WORKSPACE_PAGE_SCROLL_CLASS } from "@/lib/workspacePageCard";
import type { ObservationEntry, RiskLevel } from "@/types/observation";
import { Button, buttonVariants } from "@/components/ui/button";
import { AiSparkleDisclosureButton } from "@/components/ui/ai-sparkle-disclosure-button";
import { cn } from "@/lib/utils";

function farrierIso(horse: HorseTableRow): string | null {
  const v = horse.lastFarrierDate?.trim() || horse.lastFarrier?.trim();
  return v || null;
}

function parseMdYToIso(dateStr: string | undefined | null): string | null {
  if (!dateStr?.trim() || dateStr.trim() === "—") return null;
  const m = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const mo = Number(m[1]);
  const day = Number(m[2]);
  let y = Number(m[3]);
  if (m[3].length === 2) y += 2000;
  if (!Number.isFinite(mo) || !Number.isFinite(day) || !Number.isFinite(y))
    return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dentalIso(horse: HorseTableRow): string | null {
  const iso = horse.lastDentalDate?.trim();
  if (iso) return iso;
  return parseMdYToIso(horse.dental);
}

function parseAgeYears(ageDisplay: string): string {
  const m = ageDisplay.match(/\d+/);
  return m ? m[0] : "";
}

const PROFILE_TABS = [
  "Observations",
  "Vet records",
  "Breeding",
  "Photos",
] as const;

const OBSERVATION_STATUS_IDS = ["good", "monitor", "flag"] as const;

function createDefaultObservationStatusFilterSet(): Set<string> {
  return new Set(OBSERVATION_STATUS_IDS);
}

function isFullObservationStatusFilterSet(s: ReadonlySet<string>): boolean {
  return OBSERVATION_STATUS_IDS.every((id) => s.has(id));
}

function observationEntryMatchesStatusFilters(
  entry: ObservationEntry,
  filters: ReadonlySet<string>,
): boolean {
  if (filters.size === 0) return false;
  if (isFullObservationStatusFilterSet(filters)) return true;
  const r = entry.aiResult?.riskLevel;
  if (!r) return false;
  const id = r === "call-vet" ? "flag" : r;
  return filters.has(id);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function observationRiskLevel(entry: ObservationEntry): RiskLevel | null {
  return entry.aiResult?.riskLevel ?? null;
}

function observationLogDotClass(level: RiskLevel | null): string {
  if (!level) return "bg-muted";
  if (level === "good") return getStatusDotClass("Good");
  if (level === "monitor") return getStatusDotClass("Monitor");
  if (level === "call-vet") return getStatusDotClass("Flag");
  return "bg-muted";
}

function horseStatusDisplayLabel(
  status: HorseTableRow["healthStatus"],
): "Good" | "Monitor" | "Flag" {
  if (status === "flag") return "Flag";
  if (status === "monitor") return "Monitor";
  return "Good";
}

function horseDualStatusSummary(horse: HorseTableRow): string {
  if (horse.healthStatus === "good" && horse.behaviorStatus === "good")
    return "All good";
  return `${horseStatusDisplayLabel(horse.healthStatus)} health · ${horseStatusDisplayLabel(horse.behaviorStatus)} behavior`;
}

function observationAiSuggestionText(entry: ObservationEntry): string | null {
  const ai = entry.aiResult;
  if (!ai) return null;
  const note = ai.patternNote?.trim();
  if (note) return note;
  const recs = ai.recommendations?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (recs.length) return recs.join(" ");
  return null;
}

function formatCareDateShort(iso: string | null): string {
  if (!iso?.trim()) return "—";
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return "—";
    return format(d, "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function horseTableStatusToBadge(
  status: HorseTableRow["healthStatus"],
): StatusBadgeStatus {
  if (status === "flag") return "call-vet";
  if (status === "monitor") return "monitor";
  return "good";
}

function HorseProfileHealthSummary({ horse }: { horse: HorseTableRow }) {
  return horse.aiSummary?.trim() ? (
    <div className="rounded-xl bg-muted p-4">
      <div className="mb-3">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-ai-accent bg-ai-accent-bg px-2 py-1">
          <Sparkles
            className="size-3.5 text-ai-accent"
            strokeWidth={1.5}
            aria-hidden
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-ai-accent">
            Health summary
          </span>
        </span>
      </div>
      <p className="mb-2 text-sm leading-relaxed text-foreground">
        {horse.aiSummary.trim()}
      </p>
      <p className="text-xs text-muted-foreground">
        {horseDualStatusSummary(horse)} · based on most recent observation
      </p>
    </div>
  ) : (
    <div className="rounded-xl bg-muted p-4">
      <div className="mb-3">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-ai-accent bg-ai-accent-bg px-2 py-1">
          <Sparkles
            className="size-3.5 text-ai-accent"
            strokeWidth={1.5}
            aria-hidden
          />
          <span className="text-xs font-semibold uppercase tracking-wide text-ai-accent">
            Health summary
          </span>
        </span>
      </div>
      <p className="text-sm italic text-muted-foreground">
        Log an observation to generate a health summary.
      </p>
    </div>
  );
}

// Smart suggestions interaction now uses shared collapsible panel component.

export function HorseProfile() {
  const { horseId } = useParams<{ horseId: string }>();
  const navigate = useNavigate();
  const {
    observationsByHorse,
    openLogModal,
    herdRows,
    updateHerdHorse,
    removeHerdHorse,
    pastureOptions,
  } = useRanchData();
  /** Log observation as bottom sheet at &lt;768px — matches profile layout: stacked shell only below `md`. */
  const isNarrowMobile = useMediaQuery("(max-width: 767px)");
  const [logSheetOpen, setLogSheetOpen] = useState(false);
  const [activeTab, setActiveTab] =
    useState<(typeof PROFILE_TABS)[number]>("Observations");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editDetailsExpanded, setEditDetailsExpanded] = useState(true);
  const [nameDraft, setNameDraft] = useState("");
  const [sexDraft, setSexDraft] = useState("");
  const [ageDraft, setAgeDraft] = useState("");
  const [feedDraft, setFeedDraft] = useState<HorseTableRow["feed"]>(() => []);
  const [bodyDraft, setBodyDraft] = useState("");
  const [pastureDraft, setPastureDraft] = useState("");
  const [farrierDraft, setFarrierDraft] = useState("");
  const [roleDraft, setRoleDraft] = useState("");
  const [dentalDraft, setDentalDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [photoDataUrlDraft, setPhotoDataUrlDraft] = useState<
    string | undefined
  >(undefined);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  const [obsSort, setObsSort] = useState<"desc" | "asc">("desc");
  const [obsCategoryFilter, setObsCategoryFilter] =
    useState<ProfileObsCategoryFilter>("all");
  const [obsStatusFilters, setObsStatusFilters] = useState(() =>
    createDefaultObservationStatusFilterSet(),
  );
  const [aiExpandedIds, setAiExpandedIds] = useState<Record<string, boolean>>(
    {},
  );
  const sentinelRef = useRef<HTMLDivElement>(null);
  const tabSentinelRef = useRef<HTMLDivElement>(null);
  const tabSentinelTabletRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [tabsScrolledPast, setTabsScrolledPast] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setEditProfileOpen(false);
      setIsSticky(false);
      setTabsScrolledPast(false);
      setObsSort("desc");
      setObsCategoryFilter("all");
      setObsStatusFilters(createDefaultObservationStatusFilterSet());
      setAiExpandedIds({});
      setLogSheetOpen(false);
    }, 0);
    return () => window.clearTimeout(t);
  }, [horseId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      {
        threshold: 0,
      },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [horseId]);

  useEffect(() => {
    let observer: IntersectionObserver | null = null;

    const bindTabSentinelObserver = () => {
      observer?.disconnect();
      observer = null;
      if (window.matchMedia("(min-width: 1024px)").matches) {
        setTabsScrolledPast(false);
        return;
      }
      const el = window.matchMedia("(min-width: 768px)").matches
        ? tabSentinelTabletRef.current
        : tabSentinelRef.current;
      if (!el) return;
      observer = new IntersectionObserver(
        ([entry]) => setTabsScrolledPast(!entry.isIntersecting),
        {
          threshold: 0,
        },
      );
      observer.observe(el);
    };

    bindTabSentinelObserver();
    window.addEventListener("resize", bindTabSentinelObserver);
    return () => {
      window.removeEventListener("resize", bindTabSentinelObserver);
      observer?.disconnect();
    };
  }, [horseId]);

  const horse = useMemo(
    () => herdRows.find((r) => horseRowKey(r) === horseId),
    [herdRows, horseId],
  );

  const allObservationsForHorse = useMemo(() => {
    if (!horse) return [];
    return observationsByHorse[horseRowKey(horse)] ?? [];
  }, [horse, observationsByHorse]);

  const obsSortMenuOptions = useMemo(
    () => [
      { value: "desc", label: "Newest first" },
      { value: "asc", label: "Oldest first" },
    ],
    [],
  );

  const filteredSortedObservations = useMemo(() => {
    let list = [...allObservationsForHorse];
    if (obsCategoryFilter === "none") {
      list = [];
    } else if (obsCategoryFilter !== "all") {
      list = list.filter((o) => o.category === obsCategoryFilter);
    }
    list = list.filter((o) =>
      observationEntryMatchesStatusFilters(o, obsStatusFilters),
    );
    const cmp = (a: ObservationEntry, b: ObservationEntry) =>
      parseObservationDate(a.date) - parseObservationDate(b.date);
    list.sort((a, b) => (obsSort === "desc" ? -1 : 1) * cmp(a, b));
    return list;
  }, [allObservationsForHorse, obsSort, obsCategoryFilter, obsStatusFilters]);

  if (!horseId || !horse) {
    return (
      <RanchWorkspaceShell
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder="Search"
        searchAriaLabel="Search horses by name"
        contentClassName={WORKSPACE_PAGE_SCROLL_CLASS}
      >
        <div className="flex min-w-0 flex-col px-12 py-6">
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-12">
            <p className="text-muted-foreground">Horse not found.</p>
            <Link
              className={cn(buttonVariants({ variant: "tertiary" }))}
              to="/horses"
            >
              Back to horses
            </Link>
          </div>
        </div>
      </RanchWorkspaceShell>
    );
  }

  const profileHorse = horse;
  const profileHorseId = horseId;

  const pastureSelectOptions = (() => {
    const set = new Set(pastureOptions);
    if (profileHorse.pasture) set.add(profileHorse.pasture);
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  })();

  function openEditProfile() {
    setNameDraft(profileHorse.name);
    setSexDraft(profileHorse.sex);
    setAgeDraft(parseAgeYears(profileHorse.age));
    setFeedDraft([...profileHorse.feed]);
    setBodyDraft(
      profileHorse.bodyConditionScore != null &&
        profileHorse.bodyConditionScore >= 1 &&
        profileHorse.bodyConditionScore <= 9
        ? String(profileHorse.bodyConditionScore)
        : "",
    );
    setPastureDraft(profileHorse.pasture);
    setFarrierDraft(farrierIso(profileHorse) ?? "");
    setRoleDraft(profileHorse.role);
    setDentalDraft(dentalIso(profileHorse) ?? "");
    setNotesDraft(profileHorse.notes ?? "");
    setPhotoDataUrlDraft(undefined);
    setEditDetailsExpanded(true);
    setEditProfileOpen(true);
  }

  function handleEditPhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoDataUrlDraft(undefined);
      return;
    }
    if (!file.type.startsWith("image/")) {
      e.target.value = "";
      return;
    }
    if (file.size > ADD_HORSE_MAX_PHOTO_BYTES) {
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string")
        setPhotoDataUrlDraft(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function saveProfileEdit() {
    if (
      !addHorseFormRequiredOk({
        name: nameDraft,
        sex: sexDraft,
        ageRaw: ageDraft,
        role: roleDraft,
        pasture: pastureDraft,
      })
    ) {
      return;
    }
    let bodyConditionScore: number | null = null;
    if (bodyDraft.trim()) {
      const n = Number.parseInt(bodyDraft, 10);
      if (Number.isFinite(n)) {
        bodyConditionScore = Math.min(9, Math.max(1, n));
      }
    }
    const ageNum = Number.parseInt(ageDraft, 10);
    const ageDisplay = Number.isFinite(ageNum)
      ? `${ageNum} yrs`
      : profileHorse.age;
    const farrierIsoVal = farrierDraft.trim() || null;
    const dentalIsoVal = dentalDraft.trim() || null;
    updateHerdHorse(profileHorseId, {
      name: nameDraft.trim(),
      sex: sexDraft,
      age: ageDisplay,
      feed: feedDraft,
      bodyConditionScore,
      pasture: pastureDraft.trim() || profileHorse.pasture,
      role: roleDraft.trim() || profileHorse.role,
      lastFarrier: farrierIsoVal,
      lastFarrierDate: farrierIsoVal,
      lastDentalDate: dentalIsoVal,
      dental: dentalIsoVal ? formatFarrierDateDisplay(dentalIsoVal) : "—",
      notes: notesDraft.trim() || undefined,
      photoUrl: photoDataUrlDraft ?? profileHorse.photoUrl,
    });
    setEditProfileOpen(false);
  }

  function handleDeleteHorse() {
    if (
      !window.confirm(
        `Remove ${profileHorse.name} from the herd? This cannot be undone.`,
      )
    )
      return;
    removeHerdHorse(profileHorseId);
    navigate("/horses");
  }

  const farrierDateIso = farrierIso(profileHorse);
  const dentalDateIso = dentalIso(profileHorse);
  const subtitleAge = /\byr/i.test(profileHorse.age)
    ? profileHorse.age
    : `${profileHorse.age} yrs`;
  const breedChipText = profileHorse.health.trim() || "—";

  function openHorseLog() {
    if (isNarrowMobile) setLogSheetOpen(true);
    else openLogModal(profileHorse);
  }

  function renderTabs(wrapClassName: string, tabButtonClassName: string) {
    return (
      <div className={wrapClassName} role="tablist">
        {PROFILE_TABS.map((t) => {
          const isActive = t === activeTab;
          const isSoon = t !== "Observations";
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => !isSoon && setActiveTab(t)}
              className={cn(
                tabButtonClassName,
                "-mb-px border-b-2",
                isSoon && "pointer-events-none opacity-40",
                isActive
                  ? "border-action font-medium text-action"
                  : "border-transparent text-muted-foreground",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
    );
  }

  const profileOverflowMenu = (
    <AppOverflowMenu>
      <AppOverflowMenuTrigger
        type="button"
        aria-label="More options"
        className="flex size-8 shrink-0 items-center justify-center rounded-full border-none bg-action-tint p-0 text-action outline-none transition-colors hover:bg-action-tint-strong focus-visible:ring-2 focus-visible:ring-ring/40 [&_svg]:size-[14px] [&_svg]:shrink-0"
      >
        <MoreHorizontal
          className="size-[14px] text-action"
          strokeWidth={1.7}
          aria-hidden
        />
      </AppOverflowMenuTrigger>
      <AppOverflowMenuContent side="bottom" align="end" sideOffset={4}>
        <AppOverflowMenuItem onClick={() => openEditProfile()}>
          Edit profile
        </AppOverflowMenuItem>
        <AppOverflowMenuItem destructive onClick={handleDeleteHorse}>
          Delete horse
        </AppOverflowMenuItem>
      </AppOverflowMenuContent>
    </AppOverflowMenu>
  );

  const careDateTiles = (layout: "horizontal" | "vertical") => (
    <div
      className={
        layout === "horizontal"
          ? "grid grid-cols-2 gap-2"
          : "flex flex-col gap-2"
      }
    >
      <div className="rounded-[10px] bg-muted p-[10px_12px]">
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Last farrier
        </p>
        <p className="text-[14px] font-medium text-foreground">
          {formatCareDateShort(farrierDateIso)}
        </p>
      </div>
      <div className="rounded-[10px] bg-muted p-[10px_12px]">
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          Last dental
        </p>
        <p className="text-[14px] font-medium text-foreground">
          {formatCareDateShort(dentalDateIso)}
        </p>
      </div>
    </div>
  );

  const observationListSection =
    activeTab === "Observations" ? (
      <div>
        {allObservationsForHorse.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No observations logged yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tap Log observation to add the first entry.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              <AppMenuSelect
                variant="compact"
                className="inline-flex h-auto min-h-0 w-auto min-w-[132px] shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-normal text-muted-foreground shadow-none outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/35 [&>span]:text-muted-foreground"
                chevronClassName="size-3.5"
                value={obsSort}
                onValueChange={(v) => setObsSort(v as "desc" | "asc")}
                options={obsSortMenuOptions}
                aria-label="Sort observations"
              />
              <HorseObservationCombinedFilter
                categoryFilter={obsCategoryFilter}
                onCategoryFilterChange={setObsCategoryFilter}
                statusFilters={obsStatusFilters}
                onStatusFiltersChange={setObsStatusFilters}
              />
            </div>

            {filteredSortedObservations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No observations match your filters.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredSortedObservations.map((entry) => {
                  const level = observationRiskLevel(entry);
                  const aiSuggestion = observationAiSuggestionText(entry);
                  const expanded = Boolean(aiExpandedIds[entry.id]);
                  return (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-border px-4 py-3"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <div
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              observationLogDotClass(level),
                            )}
                            aria-hidden
                          />
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs">
                            <span className="font-medium text-foreground">
                              {entry.date}
                            </span>
                            <ObservationCategoryBadge
                              category={entry.category}
                            />
                            <span className="text-muted-foreground">
                              {entry.loggedBy}
                            </span>
                          </div>
                        </div>
                        {aiSuggestion ? (
                          <AiSparkleDisclosureButton
                            ariaLabel={
                              expanded
                                ? "Hide AI suggestion"
                                : "Show AI suggestion"
                            }
                            expanded={expanded}
                            onClick={(e) => {
                              e.stopPropagation();
                              setAiExpandedIds((prev) => ({
                                ...prev,
                                [entry.id]: !prev[entry.id],
                              }));
                            }}
                          />
                        ) : null}
                      </div>
                      <p className="text-sm font-normal text-foreground">
                        {entry.notes}
                      </p>

                      {aiSuggestion ? (
                        <div
                          className={cn(
                            "overflow-hidden transition-all duration-300 ease-out",
                            expanded ? "mt-3 max-h-[500px] opacity-100" : "mt-0 max-h-0 opacity-0",
                          )}
                        >
                          <div className="rounded-lg bg-muted px-3 py-2 text-xs leading-relaxed text-foreground">
                            {aiSuggestion}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    ) : null;

  return (
    <>
      <RanchWorkspaceShell
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder="Search"
        searchAriaLabel="Search horses by name"
        contentClassName={WORKSPACE_PAGE_SCROLL_CLASS}
      >
        <div className="flex min-w-0 flex-col pt-[24px]">
          <nav
            className="flex min-w-0 items-center gap-2 bg-background px-12 pt-0 pb-1.5 text-base text-muted-foreground"
            aria-label="Breadcrumb"
          >
            <Link
              to="/horses"
              className="shrink-0 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              Horses
            </Link>
            <ChevronRight className="size-4 shrink-0 opacity-70" aria-hidden />
            <span className="min-w-0 truncate font-medium text-foreground">
              {profileHorse.name}
            </span>
          </nav>

          <div className="px-12 pt-2">
            <div className="relative h-[240px] w-full shrink-0 overflow-hidden rounded-[14px] md:h-[220px] lg:h-[280px]">
              {profileHorse.photoUrl ? (
                <img
                  src={profileHorse.photoUrl}
                  alt={profileHorse.name}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
                  {initials(profileHorse.name)}
                </div>
              )}
              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-[120px]"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.55), transparent)",
                }}
                aria-hidden
              />
              <div className="absolute bottom-4 left-4 z-[2] flex flex-wrap gap-1.5">
                {profileHorse.healthStatus !== "good" && (
                  <StatusBadge
                    status={horseTableStatusToBadge(profileHorse.healthStatus)}
                    label="Health"
                    size="md"
                  />
                )}
                {profileHorse.behaviorStatus !== "good" && (
                  <StatusBadge
                    status={horseTableStatusToBadge(
                      profileHorse.behaviorStatus,
                    )}
                    label="Behavior"
                    size="md"
                  />
                )}
                {profileHorse.healthStatus === "good" &&
                  profileHorse.behaviorStatus === "good" && (
                    <StatusBadge status="good" size="md" />
                  )}
              </div>
              <div
                ref={sentinelRef}
                className="pointer-events-none absolute bottom-0 left-0 h-px w-full"
                aria-hidden
              />
            </div>
          </div>

          <div
            className={cn(
              "sticky top-[-1px] z-40 border-b border-border bg-background/95 backdrop-blur-sm transition-opacity duration-200 lg:hidden",
              isSticky
                ? "pointer-events-auto opacity-100 shadow-card"
                : "pointer-events-none max-h-0 overflow-hidden border-transparent opacity-0",
            )}
          >
            <div className="flex items-center gap-2.5 px-12 py-2.5">
              <button
                type="button"
                aria-label="Back"
                onClick={() => navigate(-1)}
                className="flex shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <ChevronLeft
                  className="size-4 text-sidebar-accent-foreground"
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
              {profileHorse.photoUrl ? (
                <div
                  className="h-8 w-8 shrink-0 rounded-lg bg-cover bg-center"
                  style={{ backgroundImage: `url(${profileHorse.photoUrl})` }}
                  aria-hidden
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[10px] font-semibold text-muted-foreground">
                  {initials(profileHorse.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate text-[14px] font-medium leading-tight text-foreground">
                    {profileHorse.name}
                  </p>
                  <div className="flex min-w-0 flex-nowrap items-center gap-1">
                    {profileHorse.healthStatus !== "good" && (
                      <StatusBadge
                        status={horseTableStatusToBadge(
                          profileHorse.healthStatus,
                        )}
                        label="Health"
                        compactLabel
                        size="sm"
                        className="shrink-0 px-1.5 text-[9px]"
                      />
                    )}
                    {profileHorse.behaviorStatus !== "good" && (
                      <StatusBadge
                        status={horseTableStatusToBadge(
                          profileHorse.behaviorStatus,
                        )}
                        label="Behavior"
                        compactLabel
                        size="sm"
                        className="shrink-0 px-1.5 text-[9px]"
                      />
                    )}
                    {profileHorse.healthStatus === "good" &&
                      profileHorse.behaviorStatus === "good" && (
                        <StatusBadge
                          status="good"
                          size="sm"
                          className="shrink-0 px-1.5 text-[9px]"
                        />
                      )}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="primary-dark"
                className="h-9 min-h-9 shrink-0 whitespace-nowrap px-3 text-[12px]"
                onClick={openHorseLog}
              >
                Log obs
              </Button>
            </div>
            <div
              className={cn(
                "overflow-x-auto border-t border-border transition-all duration-200",
                tabsScrolledPast
                  ? "pointer-events-auto max-h-[44px] opacity-100 md:max-h-[56px]"
                  : "pointer-events-none max-h-0 overflow-hidden opacity-0",
              )}
            >
              <div className="flex gap-0 px-12" role="tablist">
                {PROFILE_TABS.map((t) => {
                  const isActive = t === activeTab;
                  const isSoon = t !== "Observations";
                  return (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => !isSoon && setActiveTab(t)}
                      className={cn(
                        "-mb-px shrink-0 whitespace-nowrap border-b-2 px-2.5 py-2.5 text-[12px] sm:px-4 md:text-base",
                        isSoon && "pointer-events-none opacity-40",
                        isActive
                          ? "border-action font-medium text-action"
                          : "border-transparent text-muted-foreground",
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-12 pb-8 pt-0">
            <div className="mt-4 mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h1 className="mb-2 text-[20px] font-medium tracking-[-0.01em] text-foreground md:text-[22px]">
                  {profileHorse.name}
                </h1>
                <div className="flex flex-wrap gap-1.5">
                  <IdentityChip>{profileHorse.role}</IdentityChip>
                  <IdentityChip>{profileHorse.sex}</IdentityChip>
                  <IdentityChip>{subtitleAge}</IdentityChip>
                  <IdentityChip>{breedChipText}</IdentityChip>
                  <IdentityChip>{profileHorse.pasture}</IdentityChip>
                </div>
              </div>
              <div className="flex w-full shrink-0 items-center gap-2 md:mt-1 md:w-auto">
                <Button
                  type="button"
                  variant="primary-dark"
                  className="h-9 min-h-9 w-full min-w-0 flex-1 px-4 md:w-auto md:flex-none md:shrink-0"
                  onClick={openHorseLog}
                >
                  Log observation
                </Button>
                {profileOverflowMenu}
              </div>
            </div>

            <div className="md:hidden">
              <div className="mb-4">{careDateTiles("horizontal")}</div>
              <div className="mb-4">
                <HorseProfileHealthSummary horse={profileHorse} />
              </div>
              {renderTabs(
                "mb-4 flex gap-0 overflow-x-auto border-b border-border",
                "px-2.5 py-2 text-base sm:px-4",
              )}
              {/* Sentinel for Stage 2 sticky — place immediately after tab bar */}
              <div ref={tabSentinelRef} className="h-px w-full" aria-hidden />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
              <aside className="hidden min-w-0 lg:block">
                <div className="sticky top-[56px] flex flex-col gap-4">
                  {careDateTiles("vertical")}
                  <HorseProfileHealthSummary horse={profileHorse} />
                </div>
              </aside>
              <div className="min-w-0">
                <div className="mb-4 hidden md:block lg:hidden">
                  <div className="mb-4">{careDateTiles("horizontal")}</div>
                  <HorseProfileHealthSummary horse={profileHorse} />
                </div>
                {renderTabs(
                  "mb-4 hidden gap-0 border-b border-border md:flex",
                  "px-2.5 py-2 text-base sm:px-4",
                )}
                {/* Stage 2 sentinel for tablet — in-page tabs are md:flex (mobile uses tabSentinelRef above) */}
                <div
                  ref={tabSentinelTabletRef}
                  className="hidden h-px w-full md:block lg:hidden"
                  aria-hidden
                />
                {observationListSection}
              </div>
            </div>
          </div>
        </div>
      </RanchWorkspaceShell>

      <Dialog.Root
        open={editProfileOpen}
        onOpenChange={(open) => !open && setEditProfileOpen(false)}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0" />
          <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Dialog.Popup className="flex max-h-[min(90dvh,680px)] w-full max-w-[480px] flex-col overflow-hidden rounded-[14px] border-[0.5px] border-border bg-background p-6 shadow-xl outline-none">
              <div className="mb-6 flex items-start justify-between gap-3">
                <Dialog.Title className="text-base font-medium text-foreground">
                  Edit profile
                </Dialog.Title>
                <Dialog.Close
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "icon", size: "iconGhost" }),
                    "shrink-0",
                  )}
                  aria-label="Close"
                >
                  <X className="size-4" />
                </Dialog.Close>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                <AddHorseFormFields
                  variant="modal"
                  appearance="profileEdit"
                  pastures={pastureSelectOptions}
                  name={nameDraft}
                  onNameChange={setNameDraft}
                  sex={sexDraft}
                  onSexChange={setSexDraft}
                  ageRaw={ageDraft}
                  onAgeRawChange={setAgeDraft}
                  role={roleDraft}
                  onRoleChange={setRoleDraft}
                  pasture={pastureDraft}
                  onPastureChange={setPastureDraft}
                  feed={feedDraft}
                  onFeedChange={setFeedDraft}
                  notes={notesDraft}
                  onNotesChange={setNotesDraft}
                  fileInputRef={editPhotoInputRef}
                  onPhotoFileChange={handleEditPhotoChange}
                  expanded={editDetailsExpanded}
                  onExpandedChange={setEditDetailsExpanded}
                  photoPreviewUrl={
                    photoDataUrlDraft ?? profileHorse.photoUrl ?? null
                  }
                  bodyConditionRaw={bodyDraft}
                  onBodyConditionRawChange={setBodyDraft}
                  lastFarrierIso={farrierDraft}
                  onLastFarrierIsoChange={setFarrierDraft}
                  lastDentalIso={dentalDraft}
                  onLastDentalIsoChange={setDentalDraft}
                />
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-6">
                <Button
                  type="button"
                  variant="tertiary"
                  className="text-sm"
                  onClick={() => setEditProfileOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  className="text-sm"
                  onClick={saveProfileEdit}
                >
                  Save changes
                </Button>
              </div>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>

      {isNarrowMobile && logSheetOpen ? (
        <HorseLogSheet
          key={profileHorseId}
          horse={profileHorse}
          onClose={() => setLogSheetOpen(false)}
        />
      ) : null}
    </>
  );
}
