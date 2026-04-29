import { Dialog } from "@base-ui/react/dialog";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { ArrowDownWideNarrow, ChevronLeft, NotebookPen, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ADD_HORSE_MAX_PHOTO_BYTES,
  AddHorseFormFields,
  addHorseFormRequiredOk,
} from "@/components/AddHorseFormFields";
import type { HorseTableRow } from "@/components/RanchWiseHorseRoster";
import { horseRowKey } from "@/components/RanchWiseHorseRoster";
import { HorseshoeMark } from "@/components/icons/HorseshoeMark";
import { HorseLogSheet } from "@/components/HorseLogSheet";
import { ObservationTimelineEntryCard } from "@/components/ObservationTimelineEntryCard";
import { ProfilePhotoLetterbox } from "@/components/ProfilePhotoLetterbox";
import { horseProfileLetterboxColor } from "@/data/seedHorses";
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell";
import { useRanchData } from "@/contexts/RanchDataContext";
import { useCloseOnOutsidePointerDown } from "@/hooks/useCloseOnOutsidePointerDown";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { AppMenuSelect } from "@/components/ui/app-menu-select";
import { EntityFilterPanel, type EntityFilterDimension } from "@/components/workspace/EntityFilterPanel";
import { EntityFilterToolbar } from "@/components/workspace/EntityFilterToolbar";
import { workspaceFilterPanelClass } from "@/components/workspace/filterPanelStyles";
import { FilteredCountDisplay } from "@/components/workspace/FilteredCountDisplay";
import { StatusBadge, type StatusBadgeStatus } from "@/components/StatusBadge";
import {
  getHorseEffectiveLastDentalIso,
  getHorseEffectiveLastFarrierIso,
} from "@/lib/horseCareObservationSelectors";
import { formatFarrierDateDisplay } from "@/lib/horseUtils";
import { parseObservationDate } from "@/lib/initialObservations";
import { computeLatestObservationEntryIdsByCategory } from "@/lib/observationTimelineDisplay";
import {
  WORKSPACE_PAGE_SCROLL_CLASS,
  WORKSPACE_PAGE_SHELL_FLUSH_TOP_CLASS,
} from "@/lib/workspacePageCard";
import { HORSE_OBSERVATION_CATEGORIES } from "@/lib/observationCategories";
import { getObservationDomain } from "@/lib/observationDomain";
import type { ObservationEntry } from "@/types/observation";
import { Button, buttonVariants } from "@/components/ui/button";
import { SmartSuggestionsPanel } from "@/components/SmartSuggestionsPanel";
import { Tabs, type TabItem } from "@/components/ui/tabs";
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

const HORSE_PROFILE_TAB_IDS = [
  "observations",
  "vet",
  "breeding",
  "photos",
] as const;

type HorseProfileTabId = (typeof HORSE_PROFILE_TAB_IDS)[number];

const OBSERVATION_STATUS_IDS = ["good", "monitor", "flag"] as const;

function createDefaultObservationStatusFilterSet(): Set<string> {
  return new Set();
}

function isFullObservationStatusFilterSet(s: ReadonlySet<string>): boolean {
  return OBSERVATION_STATUS_IDS.every((id) => s.has(id));
}

function observationEntryMatchesStatusFilters(
  entry: ObservationEntry,
  filters: ReadonlySet<string>,
): boolean {
  if (filters.size === 0 || isFullObservationStatusFilterSet(filters)) return true;
  const r = entry.aiResult?.riskLevel;
  if (!r) return false;
  return filters.has(r);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  if (status === "flag") return "flag";
  if (status === "monitor") return "monitor";
  return "good";
}

/** Single badge priority: flag over monitor over good (health then behavior). */
function horseProfileOverallBadgeStatus(horse: HorseTableRow): StatusBadgeStatus {
  const order: Record<"flag" | "monitor" | "good", number> = {
    flag: 0,
    monitor: 1,
    good: 2,
  };
  const h = order[horse.healthStatus];
  const b = order[horse.behaviorStatus];
  const worst = h <= b ? horse.healthStatus : horse.behaviorStatus;
  return horseTableStatusToBadge(worst);
}

function HorseProfileCareCard({
  careRows,
  compact,
  className,
}: {
  careRows: { label: string; value: string }[];
  compact: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border-[0.5px] border-border bg-card",
        compact ? "p-3" : "px-4 py-3.5",
        className,
      )}
    >
      <p className={cn("mb-2.5 font-medium text-foreground", compact ? "text-[13px]" : "text-sm")}>Care</p>
      <div>
        {careRows.map((row, i) => (
          <div
            key={row.label}
            className={cn(
              "flex py-1.5",
              compact ? "items-start justify-between gap-2" : "items-center justify-between gap-3",
              i < careRows.length - 1 && "border-b-[0.5px] border-border",
            )}
          >
            <span className={cn("shrink-0 text-muted-foreground", compact ? "text-[13px]" : "text-sm")}>
              {row.label}
            </span>
            <span
              className={cn(
                "min-w-0 break-words text-right font-medium text-foreground",
                compact ? "text-[13px]" : "text-sm",
              )}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<HorseProfileTabId>("observations");
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
  const [obsCategoryFilters, setObsCategoryFilters] = useState<Set<string>>(() => new Set());
  const [obsStatusFilters, setObsStatusFilters] = useState(() =>
    createDefaultObservationStatusFilterSet(),
  );
  const [obsTimeRange, setObsTimeRange] = useState<"all" | "7" | "30">("all");
  const [horseObsFilterOpen, setHorseObsFilterOpen] = useState(false);
  const horseObsFilterRef = useRef<HTMLDivElement>(null);

  useCloseOnOutsidePointerDown({
    open: horseObsFilterOpen,
    setOpen: setHorseObsFilterOpen,
    ref: horseObsFilterRef,
  });

  useEffect(() => {
    const t = window.setTimeout(() => {
      setEditProfileOpen(false);
      setObsSort("desc");
      setObsCategoryFilters(new Set());
      setObsStatusFilters(createDefaultObservationStatusFilterSet());
      setObsTimeRange("all");
      setHorseObsFilterOpen(false);
      setLogSheetOpen(false);
      setActiveTab("observations");
    }, 0);
    return () => window.clearTimeout(t);
  }, [horseId]);

  const horse = useMemo(
    () => herdRows.find((r) => horseRowKey(r) === horseId),
    [herdRows, horseId],
  );

  const allObservationsForHorse = useMemo(() => {
    if (!horse) return [];
    return observationsByHorse[horseRowKey(horse)] ?? [];
  }, [horse, observationsByHorse]);

  const healthObservationsForHorse = useMemo(
    () => allObservationsForHorse.filter((o) => getObservationDomain(o) === "health"),
    [allObservationsForHorse],
  );

  const obsSortMenuOptions = useMemo(
    () => [
      { value: "desc", label: "Newest first" },
      { value: "asc", label: "Oldest first" },
    ],
    [],
  );

  const filteredSortedObservations = useMemo(() => {
    let list = [...allObservationsForHorse];
    if (obsCategoryFilters.size > 0 && obsCategoryFilters.size < HORSE_OBSERVATION_CATEGORIES.length) {
      list = list.filter((o) => obsCategoryFilters.has(o.category));
    }
    list = list.filter((o) =>
      observationEntryMatchesStatusFilters(o, obsStatusFilters),
    );
    if (obsTimeRange !== "all") {
      const windowMs = obsTimeRange === "7" ? 7 * 86_400_000 : 30 * 86_400_000;
      const cutoff = Date.now() - windowMs;
      list = list.filter((o) => parseObservationDate(o.date) >= cutoff);
    }
    const cmp = (a: ObservationEntry, b: ObservationEntry) =>
      parseObservationDate(a.date) - parseObservationDate(b.date);
    list.sort((a, b) => (obsSort === "desc" ? -1 : 1) * cmp(a, b));
    return list;
  }, [allObservationsForHorse, obsSort, obsCategoryFilters, obsStatusFilters, obsTimeRange]);

  const horseObsActiveFilterCount = useMemo(() => {
    let n = 0;
    if (obsCategoryFilters.size > 0 && obsCategoryFilters.size < HORSE_OBSERVATION_CATEGORIES.length) {
      n += obsCategoryFilters.size;
    }
    if (obsStatusFilters.size > 0 && obsStatusFilters.size < OBSERVATION_STATUS_IDS.length) {
      n += obsStatusFilters.size;
    }
    if (obsTimeRange !== "all") n += 1;
    return n;
  }, [obsCategoryFilters, obsStatusFilters, obsTimeRange]);

  const horseObsFilterDimensions = useMemo((): EntityFilterDimension[] => {
    const categoryOptions = HORSE_OBSERVATION_CATEGORIES.map((c) => ({ id: c, label: c }));
    const statusOptions = [
      { id: "good", label: "Good" },
      { id: "monitor", label: "Monitor" },
      { id: "flag", label: "Flag" },
    ];
    return [
      {
        kind: "multi",
        id: "category",
        label: "Category",
        options: categoryOptions,
        selectedIds: obsCategoryFilters,
        allSelectedLabel: "All",
        placeholder: "All",
        "aria-label": "Observation category filters",
      },
      {
        kind: "multi",
        id: "status",
        label: "Status",
        options: statusOptions,
        selectedIds: obsStatusFilters,
        allSelectedLabel: "All",
        placeholder: "All",
        "aria-label": "Observation status filters",
      },
      {
        kind: "radio",
        id: "time",
        label: "Time range",
        options: [
          { id: "all", label: "All time" },
          { id: "7", label: "Last 7 days" },
          { id: "30", label: "Last 30 days" },
        ],
        value: obsTimeRange,
        clearValueId: "all",
        placeholder: "All time",
        "aria-label": "Observation time range",
      },
    ];
  }, [obsCategoryFilters, obsStatusFilters, obsTimeRange]);

  const onHorseObsMultiChange = useCallback((id: string, next: Set<string>) => {
    if (id === "category") setObsCategoryFilters(next);
    else if (id === "status") setObsStatusFilters(next);
  }, []);

  const onHorseObsRadioChange = useCallback((id: string, value: string) => {
    if (id === "time" && (value === "all" || value === "7" || value === "30")) {
      setObsTimeRange(value);
    }
  }, []);

  const clearHorseObsFilters = useCallback(() => {
    setObsCategoryFilters(new Set());
    setObsStatusFilters(createDefaultObservationStatusFilterSet());
    setObsTimeRange("all");
  }, []);

  const observationLatestInCategoryIds = useMemo(
    () => computeLatestObservationEntryIdsByCategory(allObservationsForHorse),
    [allObservationsForHorse],
  );

  if (!horseId || !horse) {
    return (
      <RanchWorkspaceShell
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder="Search"
        searchAriaLabel="Search horses by name"
        contentClassName={WORKSPACE_PAGE_SCROLL_CLASS}
      >
        <div className="flex min-w-0 flex-col">
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-12">
            <p className="text-muted-foreground">Horse not found.</p>
            <Link
              className={cn(buttonVariants({ variant: "secondary" }))}
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

  const healthSummaryUpdatedRelative = useMemo(() => {
    let best = -Infinity;
    for (const o of healthObservationsForHorse) {
      const t = parseObservationDate(o.date);
      if (Number.isFinite(t) && t > best) best = t;
    }
    if (!Number.isFinite(best) || best < 0) return "recently";
    return formatDistanceToNow(new Date(best), { addSuffix: true });
  }, [healthObservationsForHorse]);

  const healthSummaryProse = useMemo(() => {
    if (allObservationsForHorse.length === 0) return null;
    const trimmed = profileHorse.aiSummary?.trim();
    if (trimmed) return trimmed;
    return "Health summary copy is not seeded for this horse yet. Logging additional observations will refine the narrative once summaries are wired.";
  }, [profileHorse.aiSummary, allObservationsForHorse.length]);

  const healthSummaryContextNote = useMemo(() => {
    if (healthObservationsForHorse.length === 0) return null;
    const n = healthObservationsForHorse.length;
    return `Based on ${n} health observation${n === 1 ? "" : "s"} · updated ${healthSummaryUpdatedRelative}`;
  }, [healthObservationsForHorse.length, healthSummaryUpdatedRelative]);

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
    setFarrierDraft(
      getHorseEffectiveLastFarrierIso(profileHorseId, observationsByHorse, profileHorse) ??
        farrierIso(profileHorse) ??
        "",
    );
    setRoleDraft(profileHorse.role);
    setDentalDraft(
      getHorseEffectiveLastDentalIso(profileHorseId, observationsByHorse, profileHorse) ??
        dentalIso(profileHorse) ??
        "",
    );
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

  const farrierDateIso =
    getHorseEffectiveLastFarrierIso(profileHorseId, observationsByHorse, profileHorse) ??
    farrierIso(profileHorse);
  const dentalDateIso =
    getHorseEffectiveLastDentalIso(profileHorseId, observationsByHorse, profileHorse) ??
    dentalIso(profileHorse);
  const subtitleAge = /\byr/i.test(profileHorse.age)
    ? profileHorse.age
    : `${profileHorse.age} yrs`;
  const profileImageSrc =
    (profileHorse as { imageUrl?: string }).imageUrl?.trim() ||
    profileHorse.photoUrl?.trim() ||
    "";

  function openHorseLog() {
    if (isNarrowMobile) setLogSheetOpen(true);
    else openLogModal(profileHorse);
  }

  const profileTabItems: TabItem[] = useMemo(
    () => [
      { id: "observations", label: "Observations" },
      { id: "vet", label: "Vet records" },
      { id: "breeding", label: "Breeding" },
      { id: "photos", label: "Photos" },
    ],
    [],
  );

  const careRows = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    const feedText = profileHorse.feed.filter(Boolean).join(", ");
    if (feedText) rows.push({ label: "Feed", value: feedText });
    rows.push({ label: "Last farrier", value: formatCareDateShort(farrierDateIso) });
    rows.push({ label: "Last dental", value: formatCareDateShort(dentalDateIso) });
    const bcs = profileHorse.bodyConditionScore;
    if (bcs != null && bcs >= 1 && bcs <= 9) {
      rows.push({ label: "Body condition", value: `${bcs} / 9` });
    }
    return rows;
  }, [profileHorse, farrierDateIso, dentalDateIso, observationsByHorse, profileHorseId]);

  const horseObsFilterControl = (
    <div className="relative shrink-0" ref={horseObsFilterRef}>
      <EntityFilterToolbar
        open={horseObsFilterOpen}
        onToggleOpen={() => setHorseObsFilterOpen((o) => !o)}
        activeCategoryCount={horseObsActiveFilterCount}
        onClearAll={clearHorseObsFilters}
        filterButtonAriaLabel="Filter observation log"
      />
      {horseObsFilterOpen ? (
        <div className={workspaceFilterPanelClass}>
          <EntityFilterPanel
            dimensions={horseObsFilterDimensions}
            onMultiChange={onHorseObsMultiChange}
            onRadioChange={onHorseObsRadioChange}
          />
        </div>
      ) : null}
    </div>
  );

  const observationListSection = (
    <div>
      {allObservationsForHorse.length === 0 ? (
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          No observations logged yet. Tap &quot;Log observation&quot; above to add the first entry.
        </p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <AppMenuSelect
              variant="toolbar"
              leadingIcon={ArrowDownWideNarrow}
              className="min-w-[132px] shrink-0"
              value={obsSort}
              onValueChange={(v) => setObsSort(v as "desc" | "asc")}
              options={obsSortMenuOptions}
              aria-label="Sort observations"
            />
            {horseObsFilterControl}
          </div>

          <FilteredCountDisplay
            visible={horseObsActiveFilterCount > 0}
            filteredCount={filteredSortedObservations.length}
            totalCount={allObservationsForHorse.length}
            entityName="observations"
            className="mb-3"
          />

          {filteredSortedObservations.length === 0 ? (
            <p className="max-w-lg pb-9 text-sm leading-relaxed text-muted-foreground">
              No observations match your filters.
            </p>
          ) : (
            <ul className="flex flex-col gap-3 pb-9">
              {filteredSortedObservations.map((entry) => (
                <ObservationTimelineEntryCard
                  key={entry.id}
                  entry={entry}
                  isLatestOfCategory={observationLatestInCategoryIds.has(entry.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );

  const metadataOneLine = `${subtitleAge} · ${profileHorse.sex} · ${(profileHorse.role ?? "").trim() || "—"} · ${profileHorse.pasture}`;

  const healthSummaryEl = healthSummaryProse ? (
    <SmartSuggestionsPanel
      mode="modal"
      className="mt-0"
      label="Health summary"
      labelGlyphStyle="section"
      bodyVariant="prose"
      body={healthSummaryProse}
      contextNote={healthSummaryContextNote ?? undefined}
    />
  ) : null;

  const healthSummaryElTablet = healthSummaryProse ? (
    <SmartSuggestionsPanel
      mode="modal"
      className="mt-0 flex h-full min-h-0 min-w-0 flex-col"
      columnFill
      label="Health summary"
      labelGlyphStyle="section"
      bodyVariant="prose"
      body={healthSummaryProse}
      contextNote={healthSummaryContextNote ?? undefined}
    />
  ) : null;

  function renderProfileTabsAndContent() {
    return (
      <div className="min-w-0">
        <Tabs
          items={profileTabItems}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as HorseProfileTabId)}
          ariaLabel="Horse profile sections"
          className="flex min-w-0 max-w-full gap-0 border-b border-border"
          tabClassName="-mb-px px-4 py-2 text-base font-medium"
        />
        <div className="min-w-0 pt-4">
          {activeTab === "observations" ? (
            observationListSection
          ) : activeTab === "vet" ? (
            <p className="max-w-lg pb-9 text-sm leading-relaxed text-muted-foreground">
              Vet records coming soon.
            </p>
          ) : activeTab === "breeding" ? (
            <p className="max-w-lg pb-9 text-sm leading-relaxed text-muted-foreground">
              Breeding coming soon.
            </p>
          ) : activeTab === "photos" ? (
            <p className="max-w-lg pb-9 text-sm leading-relaxed text-muted-foreground">
              Photos coming soon.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      <RanchWorkspaceShell
        searchValue=""
        onSearchChange={() => {}}
        searchPlaceholder="Search"
        searchAriaLabel="Search horses by name"
        contentClassName={cn(
          WORKSPACE_PAGE_SCROLL_CLASS,
          WORKSPACE_PAGE_SHELL_FLUSH_TOP_CLASS,
          "pb-9",
        )}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <header
            className="flex flex-wrap items-center justify-between gap-3 bg-background py-3 md:py-5 max-md:sticky max-md:top-0 max-md:z-30 max-md:-mx-4 max-md:border-b max-md:border-border max-md:px-4 sm:max-md:-mx-6 sm:max-md:px-6"
          >
            <nav
              className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-muted-foreground"
              aria-label="Breadcrumb"
            >
              <Link
                to="/horses"
                className="inline-flex items-center gap-1 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <ChevronLeft className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                Horses
              </Link>
              <span className="text-muted-foreground" aria-hidden>
                /
              </span>
              <span className="min-w-0 truncate font-medium text-foreground">{profileHorse.name}</span>
            </nav>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-9 min-h-9 shrink-0 rounded-full px-4"
                onClick={openEditProfile}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="default"
                className="h-9 min-h-9 gap-1.5 rounded-full px-4"
                aria-label="Log observation"
                onClick={openHorseLog}
              >
                <NotebookPen className="size-4 shrink-0" aria-hidden />
                <span className="hidden md:inline">Log observation</span>
                <span className="md:hidden">Log</span>
              </Button>
            </div>
          </header>

          {/* Mode B: &lt; md — letterbox hero + floating name card; Health summary + Care; tabs */}
          <div className="flex min-w-0 flex-col md:hidden">
            <div className="mb-4 w-full min-w-0">
              <div className="relative w-full min-w-0">
                <ProfilePhotoLetterbox
                  src={profileImageSrc}
                  alt={profileHorse.name}
                  ambientColor={horseProfileLetterboxColor(profileHorseId)}
                  outerAspectRatio="16 / 9"
                  placeholder={
                    <HorseshoeMark
                      className="size-16 shrink-0 text-[var(--color-text-tertiary)] opacity-50"
                      aria-hidden
                    />
                  }
                />
                <div className="absolute -bottom-8 left-3 right-3 z-10 rounded-[var(--border-radius-md)] bg-white p-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[22px] font-medium leading-tight tracking-[-0.01em] text-foreground">
                        {profileHorse.name}
                      </h2>
                      <p className="mt-0.5 text-[13px] leading-snug text-[var(--color-text-tertiary)]">
                        {metadataOneLine}
                      </p>
                    </div>
                    <StatusBadge
                      status={horseProfileOverallBadgeStatus(profileHorse)}
                      size="md"
                      emphasis="secondary"
                      className="shrink-0"
                    />
                  </div>
                </div>
              </div>
              {/* Clears the card sitting ~32px below the letterbox bottom */}
              <div className="h-10 shrink-0" aria-hidden />
            </div>

            <div className="mb-4 flex min-w-0 flex-col gap-3">
              {healthSummaryEl}
              <HorseProfileCareCard careRows={careRows} compact={false} />
            </div>

            {renderProfileTabsAndContent()}
          </div>

          {/* Mode A: ≥ md — tablet (md–lg) + desktop (lg+) unchanged inside */}
          <div className="hidden min-w-0 md:block">
            {/* Tablet: md–lg — fixed-width square photo column + HS / Care */}
            <div className="min-w-0 lg:hidden">
            <div className="mb-4 grid min-h-0 min-w-0 grid-cols-1 items-stretch gap-4 md:grid-cols-[280px_minmax(0,1fr)] md:gap-5">
              <div className="relative aspect-square min-h-0 w-full min-w-0 overflow-hidden rounded-xl">
                {profileImageSrc ? (
                  <img
                    src={profileImageSrc}
                    alt={profileHorse.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <HorseshoeMark
                      className="size-12 shrink-0 text-[var(--color-text-tertiary)] opacity-50"
                      aria-hidden
                    />
                  </div>
                )}
                <div className="absolute bottom-3 left-3 right-3 z-10 rounded-[var(--border-radius-md)] bg-white p-3 shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[22px] font-medium leading-tight tracking-[-0.01em] text-foreground">
                        {profileHorse.name}
                      </h2>
                      <p className="mt-0.5 text-[13px] leading-snug text-[var(--color-text-tertiary)]">
                        {metadataOneLine}
                      </p>
                    </div>
                    <StatusBadge
                      status={horseProfileOverallBadgeStatus(profileHorse)}
                      size="md"
                      emphasis="secondary"
                      className="shrink-0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
                {healthSummaryElTablet ? (
                  <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col">{healthSummaryElTablet}</div>
                ) : null}
                <HorseProfileCareCard
                  careRows={careRows}
                  compact={false}
                  className="h-full min-h-0 flex-1 basis-0 flex-col"
                />
              </div>
            </div>

            {renderProfileTabsAndContent()}
            </div>

            {/* Desktop: lg+ — pasture-style two column */}
            <div className="hidden min-w-0 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-5 lg:min-h-0 lg:flex-1 lg:overflow-hidden xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-6">
            <aside className="flex flex-col gap-3 lg:sticky lg:top-0 lg:self-start">
              <div className="aspect-square min-h-0 w-full overflow-hidden rounded-xl">
                {profileImageSrc ? (
                  <img
                    src={profileImageSrc}
                    alt={profileHorse.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full min-h-0 w-full items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
                    {initials(profileHorse.name)}
                  </div>
                )}
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="text-[24px] font-medium tracking-[-0.01em] text-foreground">{profileHorse.name}</h2>
                  <StatusBadge
                    status={horseProfileOverallBadgeStatus(profileHorse)}
                    size="md"
                    emphasis="secondary"
                  />
                </div>
                <p className="text-[13px] text-[var(--color-text-tertiary)]">{metadataOneLine}</p>
              </div>
              {healthSummaryEl}
              <HorseProfileCareCard careRows={careRows} compact={false} />
            </aside>
            <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto">{renderProfileTabsAndContent()}</div>
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
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
                <Button type="button" variant="destructive" className="text-sm" onClick={handleDeleteHorse}>
                  Delete horse
                </Button>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-sm"
                    onClick={() => setEditProfileOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="button" variant="primary" className="text-sm" onClick={saveProfileEdit}>
                    Save changes
                  </Button>
                </div>
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
