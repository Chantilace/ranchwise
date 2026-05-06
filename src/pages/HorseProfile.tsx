import { Dialog } from "@base-ui/react/dialog";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { ArrowDownWideNarrow, ChevronLeft, NotebookPen, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
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
import {
  ProfileDetailsCard,
  type ProfileDetailsSection,
} from "@/components/ProfileDetailsCard";
import { ObservationTimelineEntryCard } from "@/components/ObservationTimelineEntryCard";
import { RanchWorkspaceShell } from "@/components/RanchWorkspaceShell";
import { useRanchData } from "@/contexts/RanchDataContext";
import { useCloseOnOutsidePointerDown } from "@/hooks/useCloseOnOutsidePointerDown";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { AppMenuSelect } from "@/components/ui/app-menu-select";
import { EntityFilterPanel, type EntityFilterDimension } from "@/components/workspace/EntityFilterPanel";
import { EntityFilterToolbar } from "@/components/workspace/EntityFilterToolbar";
import { workspaceFilterPanelClass } from "@/components/workspace/filterPanelStyles";
import { FilteredCountDisplay } from "@/components/workspace/FilteredCountDisplay";
import { MobileRosterFilterSheet } from "@/components/workspace/MobileRosterFilterSheet";
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
  "details",
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

function horseCareDateWithHint(iso: string | null): ReactNode {
  if (!iso?.trim()) return "—";
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return "—";
    return (
      <span className="inline-flex max-w-full flex-wrap items-baseline justify-end gap-2">
        <span>{format(d, "MMM d, yyyy")}</span>
        <span className="text-[12px] font-normal leading-none text-muted-foreground">
          {formatDistanceToNow(d, { addSuffix: true })}
        </span>
      </span>
    );
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
  /** Log observation + observation filters: bottom sheet below `md`, modal / popover at `md+`. */
  const isMdUp = useMediaQuery("(min-width: 768px)");
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
  const mobileProfileRootRef = useRef<HTMLDivElement>(null);
  const mobileHeroExpandSectionRef = useRef<HTMLDivElement>(null);
  const mobileHeroCollapsedRef = useRef(false);
  const [mobileHeroCollapsed, setMobileHeroCollapsed] = useState(false);
  const prevHorseIdForMobileHeroRef = useRef<string | undefined>(undefined);

  useCloseOnOutsidePointerDown({
    open: horseObsFilterOpen && isMdUp,
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
      mobileHeroCollapsedRef.current = false;
      setMobileHeroCollapsed(false);
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

  useEffect(() => {
    if (prevHorseIdForMobileHeroRef.current !== horseId) {
      prevHorseIdForMobileHeroRef.current = horseId;
      mobileHeroCollapsedRef.current = false;
      setMobileHeroCollapsed(false);
    }
    if (!horseId || !horse) return;
    if (isMdUp) {
      mobileHeroCollapsedRef.current = false;
      setMobileHeroCollapsed(false);
      return;
    }

    const findScrollParent = (from: HTMLElement): HTMLElement | null => {
      let p: HTMLElement | null = from.parentElement;
      while (p) {
        const { overflowY } = getComputedStyle(p);
        if (overflowY === "auto" || overflowY === "scroll") return p;
        p = p.parentElement;
      }
      return null;
    };

    const rootEl = mobileProfileRootRef.current;
    if (!rootEl) return;
    const scrollRoot = findScrollParent(rootEl);
    if (!scrollRoot) return;

    let io: IntersectionObserver | undefined;

    const onScrollExpand = () => {
      if (!mobileHeroCollapsedRef.current) return;
      if (scrollRoot.scrollTop < 48) {
        mobileHeroCollapsedRef.current = false;
        setMobileHeroCollapsed(false);
      }
    };

    scrollRoot.addEventListener("scroll", onScrollExpand, { passive: true });

    const attachIo = () => {
      const section = mobileHeroExpandSectionRef.current;
      if (!section) return;
      io?.disconnect();
      io = new IntersectionObserver(
        ([entry]) => {
          if (!entry) return;
          if (!entry.isIntersecting) {
            mobileHeroCollapsedRef.current = true;
            setMobileHeroCollapsed(true);
          }
        },
        { root: scrollRoot, threshold: 0 },
      );
      io.observe(section);
    };

    const t = window.setTimeout(attachIo, 0);

    return () => {
      window.clearTimeout(t);
      io?.disconnect();
      scrollRoot.removeEventListener("scroll", onScrollExpand);
    };
  }, [isMdUp, horseId, horse, mobileHeroCollapsed]);

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
    if (!isMdUp) setLogSheetOpen(true);
    else openLogModal(profileHorse);
  }

  const profileTabItems: TabItem[] = useMemo(
    () => [
      { id: "observations", label: "Observations" },
      { id: "details", label: "Details" },
      { id: "vet", label: "Vet records" },
      { id: "breeding", label: "Breeding" },
      { id: "photos", label: "Photos" },
    ],
    [],
  );

  const hasCareDetailsData = useMemo(() => {
    const feedText = profileHorse.feed.filter(Boolean).join(", ");
    if (feedText.trim().length > 0) return true;
    const farrierVal = formatCareDateShort(farrierDateIso);
    const dentalVal = formatCareDateShort(dentalDateIso);
    if (farrierVal.trim() !== "" && farrierVal !== "—") return true;
    if (dentalVal.trim() !== "" && dentalVal !== "—") return true;
    const bcs = profileHorse.bodyConditionScore;
    return bcs != null && bcs >= 1 && bcs <= 9;
  }, [profileHorse, farrierDateIso, dentalDateIso]);

  const horseDetailsSections = useMemo((): ProfileDetailsSection[] => {
    const feedText = profileHorse.feed.filter(Boolean).join(", ");
    const healthRows: ProfileDetailsSection["rows"] = [
      { label: "Last farrier", value: horseCareDateWithHint(farrierDateIso) },
      { label: "Last dental", value: horseCareDateWithHint(dentalDateIso) },
    ];
    const bcs = profileHorse.bodyConditionScore;
    if (bcs != null && bcs >= 1 && bcs <= 9) {
      healthRows.push({ label: "Body condition", value: `${bcs} / 9` });
    }
    return [
      { title: "Nutrition", rows: [{ label: "Feed", value: feedText || "—" }] },
      { title: "Health care", rows: healthRows },
    ];
  }, [profileHorse, farrierDateIso, dentalDateIso]);

  const horseObsFilterPanelInner = (
    <EntityFilterPanel
      dimensions={horseObsFilterDimensions}
      onMultiChange={onHorseObsMultiChange}
      onRadioChange={onHorseObsRadioChange}
    />
  );

  const horseObsFilterControl = (
    <div className="relative shrink-0" ref={horseObsFilterRef}>
      <EntityFilterToolbar
        open={horseObsFilterOpen}
        onToggleOpen={() => setHorseObsFilterOpen((o) => !o)}
        activeCategoryCount={horseObsActiveFilterCount}
        onClearAll={clearHorseObsFilters}
        filterButtonAriaLabel="Filter observation log"
      />
      {horseObsFilterOpen && isMdUp ? (
        <div className={workspaceFilterPanelClass}>{horseObsFilterPanelInner}</div>
      ) : null}
    </div>
  );

  const horsePageLogLabel = `Log ${profileHorse.name}`;
  const horsePageLogAriaLabel = `Log observation for ${profileHorse.name}`;

  const observationListSection = (
    <div>
      {allObservationsForHorse.length === 0 ? (
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          No observations logged yet. Tap &quot;{horsePageLogLabel}&quot; above to add the first entry.
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

  const profileHeroBadgeStatus = horseProfileOverallBadgeStatus(profileHorse);

  const healthSummaryEl = healthSummaryProse ? (
    <SmartSuggestionsPanel
      mode="modal"
      className="mt-0 min-w-0"
      modalContentClassName="rounded-[16px] px-5 py-[18px]"
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
      columnFill
      className="mt-0 flex h-full min-h-0 min-w-0 flex-1 flex-col"
      modalContentClassName="rounded-[16px] px-5 py-[18px]"
      proseBodyClassName="text-[14px] leading-[1.45]"
      labelPillClassName="rounded-full px-2 py-[3px]"
      label="Health summary"
      labelGlyphStyle="section"
      bodyVariant="prose"
      body={healthSummaryProse}
      contextNote={healthSummaryContextNote ?? undefined}
    />
  ) : null;

  const healthSummaryElDesktop = healthSummaryProse ? (
    <SmartSuggestionsPanel
      mode="modal"
      columnFill
      className="mt-0 flex h-full min-h-0 min-w-0 flex-1 flex-col"
      modalContentClassName="rounded-[16px] px-5 py-[18px]"
      proseBodyClassName="text-[16px] leading-[1.45]"
      label="Health summary"
      labelGlyphStyle="section"
      bodyVariant="prose"
      body={healthSummaryProse}
      contextNote={healthSummaryContextNote ?? undefined}
    />
  ) : null;

  const defaultHorseProfileTabClassName =
    "-mb-px px-4 py-2 text-[13px] font-normal leading-snug md:text-[14px]";

  function renderHorseProfileTabs(
    tabClassName: string = defaultHorseProfileTabClassName,
  ) {
    return (
      <Tabs
        items={profileTabItems}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as HorseProfileTabId)}
        ariaLabel="Horse profile sections"
        className="flex min-w-0 max-w-full gap-0 border-b border-border"
        tabClassName={tabClassName}
      />
    );
  }

  function renderHorseProfileTabPanel() {
    return (
      <div className="min-w-0 pt-4">
        {activeTab === "observations" ? (
          observationListSection
        ) : activeTab === "details" ? (
          hasCareDetailsData ? (
            <div className="pb-9">
              <ProfileDetailsCard
                sections={horseDetailsSections}
                className="min-w-0 max-w-xl"
              />
            </div>
          ) : (
            <div className="flex max-w-lg flex-col gap-4 pb-9">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                No care details added yet. Edit profile to add feed, farrier, or dental
                information.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="w-fit shrink-0"
                onClick={openEditProfile}
              >
                Edit profile
              </Button>
            </div>
          )
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
    );
  }

  function renderProfileTabsAndContent(options?: {
    tabClassName?: string;
  }) {
    return (
      <div className="min-w-0">
        {renderHorseProfileTabs(
          options?.tabClassName ?? defaultHorseProfileTabClassName,
        )}
        {renderHorseProfileTabPanel()}
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
          <header className="hidden md:flex flex-wrap items-center justify-between gap-3 bg-background py-3 md:py-5">
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
                className="h-9 min-h-9 max-w-full gap-1.5 rounded-full px-4"
                aria-label={horsePageLogAriaLabel}
                onClick={openHorseLog}
              >
                <NotebookPen className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 truncate">{horsePageLogLabel}</span>
              </Button>
            </div>
          </header>

          {/* Mobile &lt; md — top bar + hero; collapsed sticky header + tabs + FAB */}
          <div
            ref={mobileProfileRootRef}
            data-mobile-profile-root
            className="flex min-w-0 flex-col md:hidden"
          >
            {mobileHeroCollapsed ? (
              <div className="sticky top-0 z-40 -mx-4 w-[calc(100%+2rem)] max-w-none shrink-0 sm:-mx-6 sm:w-[calc(100%+3rem)]">
                <div className="border-b-[0.5px] border-[rgba(0,0,0,0.08)] bg-[rgba(253,253,253,0.96)] shadow-[var(--shadow-sticky-scroll)] backdrop-blur-[12px] [-webkit-backdrop-filter:blur(12px)]">
                  <div className="flex min-w-0 items-center gap-2 px-4 py-3 sm:px-6">
                    <Link
                      to="/horses"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40"
                      aria-label="Back to horses"
                    >
                      <ChevronLeft className="size-5 shrink-0" strokeWidth={2} aria-hidden />
                    </Link>
                    <div className="size-11 shrink-0 overflow-hidden rounded-[10px] border-[0.5px] border-border bg-muted">
                      {profileImageSrc ? (
                        <img
                          src={profileImageSrc}
                          alt={profileHorse.name}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-[13px] font-semibold leading-none text-muted-foreground">
                          {initials(profileHorse.name)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="min-w-0 truncate text-[16px] font-medium text-foreground">
                          {profileHorse.name}
                        </span>
                        <StatusBadge
                          status={profileHeroBadgeStatus}
                          size="md"
                          emphasis="primary"
                          className="shrink-0 !px-2 !py-[3px] !text-[13px]"
                        />
                      </div>
                      <p className="mt-0.5 min-w-0 truncate text-[13px] leading-snug text-muted-foreground">
                        {metadataOneLine}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 min-h-9 shrink-0 rounded-full px-4 text-[13px] transition-transform active:scale-95"
                      onClick={openEditProfile}
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="px-4 sm:px-6">{renderHorseProfileTabs()}</div>
                </div>
              </div>
            ) : null}

            {!mobileHeroCollapsed ? (
              <div ref={mobileHeroExpandSectionRef} className="shrink-0">
                <div className="-mx-4 w-[calc(100%+2rem)] max-w-none shrink-0 sm:-mx-6 sm:w-[calc(100%+3rem)]">
                  <div className="border-b-[0.5px] border-[rgba(0,0,0,0.08)] bg-background">
                    <div className="flex min-w-0 items-center justify-between gap-3 px-4 py-[10px] sm:px-6">
                      <Link
                        to="/horses"
                        className="inline-flex min-w-0 items-center gap-1 text-[13px] text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
                      >
                        <ChevronLeft className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                        <span>Horses</span>
                      </Link>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 min-h-9 shrink-0 rounded-full px-4 text-[13px]"
                          onClick={openEditProfile}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          className="h-9 min-h-9 max-w-[min(100%,11rem)] gap-1.5 rounded-full px-3 text-[13px] sm:max-w-none sm:px-4"
                          aria-label={horsePageLogAriaLabel}
                          onClick={openHorseLog}
                        >
                          <NotebookPen className="size-4 shrink-0" aria-hidden />
                          <span className="min-w-0 truncate">{horsePageLogLabel}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative -mx-4 h-[280px] w-[calc(100%+2rem)] max-w-none shrink-0 overflow-hidden sm:-mx-6 sm:w-[calc(100%+3rem)]">
                  {profileImageSrc ? (
                    <img
                      src={profileImageSrc}
                      alt={profileHorse.name}
                      className="absolute inset-0 size-full object-cover"
                      loading="eager"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted">
                      <HorseshoeMark
                        className="size-16 shrink-0 text-[var(--color-text-tertiary)] opacity-50"
                        aria-hidden
                      />
                    </div>
                  )}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[65%] bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.4)_40%,rgba(0,0,0,0.7)_100%)]"
                    aria-hidden
                  />
                  <div className="absolute bottom-0 left-0 z-10 flex w-full min-w-0 flex-col items-start gap-1.5 px-4 pb-3.5 sm:px-6">
                    <StatusBadge
                      status={profileHeroBadgeStatus}
                      size="md"
                      emphasis="primary"
                      className="shrink-0"
                    />
                    <h2 className="min-w-0 text-[22px] font-medium leading-[1.1] text-white">{profileHorse.name}</h2>
                    <p className="min-w-0 text-[13px] leading-snug text-[rgba(255,255,255,0.92)]">
                      {metadataOneLine}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div
              className={cn(
                "flex min-w-0 flex-col gap-3",
                healthSummaryEl && "mb-8",
                mobileHeroCollapsed ? "mt-0 pt-2" : "mt-4",
              )}
            >
              {healthSummaryEl}
            </div>

            {!mobileHeroCollapsed ? (
              <div className="min-w-0">
                {renderHorseProfileTabs()}
                {renderHorseProfileTabPanel()}
              </div>
            ) : (
              renderHorseProfileTabPanel()
            )}
          </div>

          {/* Mode A: ≥ md — tablet (md–lg) vs desktop (lg+) */}
          <div className="hidden min-w-0 md:block">
            {/* Tablet: md–lg — fixed-width square photo column + HS / Care */}
            <div className="min-w-0 lg:hidden">
              <div className="mb-4 grid min-h-0 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-stretch gap-6">
                <div className="relative aspect-square h-full min-h-0 max-h-[240px] min-w-[180px] max-w-[240px] shrink-0 self-end overflow-hidden rounded-[var(--radius-2xl)]">
                  {profileImageSrc ? (
                    <img
                      src={profileImageSrc}
                      alt={profileHorse.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted text-xl font-semibold text-muted-foreground">
                      {initials(profileHorse.name)}
                    </div>
                  )}
                </div>

                <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 pt-[2px]">
                  <div className="min-w-0 shrink-0">
                    <div className="mb-1.5 flex min-w-0 items-center gap-2.5">
                      <h2 className="min-w-0 truncate text-[28px] font-medium leading-[1.1] tracking-[-0.01em] text-foreground">
                        {profileHorse.name}
                      </h2>
                      <StatusBadge
                        status={profileHeroBadgeStatus}
                        size="md"
                        emphasis="primary"
                        className="shrink-0"
                      />
                    </div>
                    <p className="min-w-0 text-[13px] leading-snug text-muted-foreground">
                      {metadataOneLine}
                    </p>
                  </div>
                  {healthSummaryElTablet ? (
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col">{healthSummaryElTablet}</div>
                  ) : null}
                </div>
              </div>

              {renderProfileTabsAndContent({
                tabClassName:
                  "-mb-px px-4 py-2 text-[14px] font-normal leading-snug",
              })}
            </div>

            {/* Desktop: lg+ — magazine: identity + inline Care, full-width Health Summary, tabs */}
            <div className="hidden min-w-0 flex-col lg:flex">
              <div className="mb-6 grid min-h-0 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-stretch gap-8">
                <div className="relative aspect-square h-full min-h-0 max-h-[360px] min-w-[200px] max-w-[360px] shrink-0 self-end overflow-hidden rounded-[var(--radius-3xl)]">
                  {profileImageSrc ? (
                    <img
                      src={profileImageSrc}
                      alt={profileHorse.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted text-2xl font-semibold text-muted-foreground">
                      {initials(profileHorse.name)}
                    </div>
                  )}
                </div>
                <div className="flex h-full min-h-[240px] min-w-0 flex-col gap-4 pt-[4px]">
                  <div className="min-w-0 shrink-0">
                    <div className="mb-1.5 flex min-w-0 flex-wrap items-center gap-3">
                      <h1 className="min-w-0 truncate text-[30px] font-medium leading-[1.1] tracking-[-0.01em] text-foreground">
                        {profileHorse.name}
                      </h1>
                      <StatusBadge
                        status={profileHeroBadgeStatus}
                        size="md"
                        emphasis="primary"
                        className="shrink-0"
                      />
                    </div>
                    <p className="min-w-0 truncate text-[16px] text-muted-foreground">{metadataOneLine}</p>
                  </div>
                  {healthSummaryElDesktop ? (
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col">{healthSummaryElDesktop}</div>
                  ) : null}
                </div>
              </div>
              <div className="min-w-0">{renderProfileTabsAndContent()}</div>
            </div>
          </div>
        </div>
      </RanchWorkspaceShell>

      {mobileHeroCollapsed && !isMdUp ? (
        <button
          type="button"
          className="fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] right-[calc(24px+env(safe-area-inset-right,0px))] z-[60] flex size-14 shrink-0 items-center justify-center rounded-full bg-action text-action-foreground shadow-[0_8px_20px_rgba(91,76,174,0.45),0_2px_6px_rgba(91,76,174,0.3)] outline-none transition-all hover:bg-action-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label={horsePageLogAriaLabel}
          onClick={openHorseLog}
        >
          <NotebookPen className="size-6 shrink-0 text-action-foreground" aria-hidden />
        </button>
      ) : null}

      <Dialog.Root
        open={editProfileOpen}
        onOpenChange={(open) => !open && setEditProfileOpen(false)}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-[1px] transition-opacity data-[ending-style]:opacity-0" />
          <Dialog.Viewport className="fixed inset-0 z-[120] flex items-end justify-center p-0 md:items-center md:p-4">
            <Dialog.Popup
              className={cn(
                "flex w-full max-w-full min-h-0 flex-col overflow-hidden border-[0.5px] border-border bg-background text-foreground shadow-xl outline-none",
                "max-h-[90dvh] rounded-t-2xl md:max-h-[min(90dvh,680px)] md:max-w-[480px] md:rounded-[14px]",
                "translate-y-0 transition-transform duration-200 ease-out data-[starting-style]:translate-y-full md:data-[starting-style]:translate-y-0 md:data-[starting-style]:scale-95",
              )}
            >
              <div className="flex shrink-0 flex-col md:hidden">
                <div className="mx-auto mt-3 h-1 w-8 shrink-0 rounded-full bg-muted" aria-hidden />
              </div>
              <div className="flex shrink-0 items-start justify-between gap-3 px-6 pb-4 pt-2 md:pb-6 md:pt-6">
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
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pr-5">
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
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-6">
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

      {!isMdUp && logSheetOpen ? (
        <HorseLogSheet
          key={profileHorseId}
          horse={profileHorse}
          onClose={() => setLogSheetOpen(false)}
        />
      ) : null}

      <MobileRosterFilterSheet
        open={horseObsFilterOpen && !isMdUp}
        title="Filters"
        onClose={() => setHorseObsFilterOpen(false)}
      >
        {horseObsFilterPanelInner}
      </MobileRosterFilterSheet>
    </>
  );
}
