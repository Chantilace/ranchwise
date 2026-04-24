import {
  Bell,
  Menu,
  MoreHorizontal,
  PanelLeft,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { FaCow } from "react-icons/fa6";
import { LiaHorseSolid } from "react-icons/lia";
import { PiFarm } from "react-icons/pi";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type UIEvent,
} from "react";
import { HorseshoeMark } from "@/components/icons/HorseshoeMark";
import { NavItem } from "@/components/NavItem";
import { Button } from "@/components/ui/button";
import { WorkspaceSearchField } from "@/components/WorkspaceSearchField";
import { useRanchData } from "@/contexts/RanchDataContext";
import { useLogObservation } from "@/contexts/LogObservationContext";
import { cn } from "@/lib/utils";

/** Matches home smart-suggestions list length until wired to real data. */
const SMART_SUGGESTIONS_SIDEBAR_COUNT = 3;

function SidebarHorseshoeMark() {
  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-[var(--sidebar-mark-bg)] p-1.5"
      aria-hidden
    >
      <HorseshoeMark className="size-2.5 scale-y-[-1] text-[var(--sidebar-mark-fg)]" />
    </div>
  );
}

function RanchWiseWordmark({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "min-w-0 truncate text-base font-semibold leading-normal tracking-[-0.01em] text-white",
        className,
      )}
    >
      <span>Ranch</span>
      <span>Wise</span>
    </p>
  );
}

type DesktopSidebarNavLinkProps = {
  to: string;
  end?: boolean;
  title: string;
  sidebarOpen: boolean;
  label: string;
  icon: ReactNode;
};

function DesktopSidebarNavLink({
  to,
  end,
  title,
  sidebarOpen,
  label,
  icon,
}: DesktopSidebarNavLinkProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={title}
      className={({ isActive }) =>
        cn(
          "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/35",
          sidebarOpen
            ? cn(
                "group flex cursor-pointer items-center gap-2 py-2 pr-3 text-base transition-colors duration-100 mr-2 [&_svg]:shrink-0",
                isActive
                  ? "ml-2 rounded-[10px] pl-3 bg-[var(--sidebar-active-bg)] font-medium text-white [&_svg]:text-white"
                  : "ml-2 rounded-[10px] pl-3 text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover-bg)] hover:text-white [&_svg]:text-[var(--sidebar-foreground)] hover:[&_svg]:text-white",
              )
            : cn(
                "flex h-9 min-h-9 shrink-0 cursor-pointer items-center justify-center px-0 py-0 transition-colors duration-100",
                !isActive &&
                  "text-[var(--sidebar-foreground)] hover:text-white [&_svg]:text-[var(--sidebar-foreground)] hover:[&_svg]:text-white",
                isActive && "font-medium text-white",
              ),
        )
      }
    >
      {({ isActive }) => (
        <>
          {!sidebarOpen ? (
            <span
              className={cn(
                "flex h-9 shrink-0 items-center justify-center transition-colors duration-100",
                isActive
                  ? "w-9 rounded-[10px] bg-[var(--sidebar-active-bg)] [&_svg]:text-white"
                  : "w-9 rounded-[10px] hover:bg-[var(--sidebar-hover-bg)]",
              )}
            >
              {icon}
            </span>
          ) : (
            icon
          )}
          {sidebarOpen ? <span>{label}</span> : null}
        </>
      )}
    </NavLink>
  );
}

type MobileNavItemProps = {
  to: string;
  end?: boolean;
  icon: ReactNode;
  label: string;
  onNavigate: () => void;
  /** Dark drawer (matches desktop `bg-sidebar`). */
  theme?: "light" | "dark";
  count?: number;
};

function MobileNavItem({
  to,
  end,
  icon,
  label,
  onNavigate,
  theme = "light",
  count,
}: MobileNavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 outline-none transition-colors duration-100 focus-visible:ring-2",
          theme === "dark"
            ? cn(
                "group py-3 pr-4 text-[15px] focus-visible:ring-sidebar-ring/35",
                isActive
                  ? "mx-2 rounded-[10px] pl-4 bg-[var(--sidebar-active-bg)] font-medium text-white [&_svg]:text-white"
                  : "mx-2 rounded-[10px] pl-4 text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-hover-bg)] hover:text-white [&_svg]:text-[var(--sidebar-foreground)] hover:[&_svg]:text-white",
              )
            : cn(
                "rounded-lg px-3 py-3 text-base focus-visible:ring-ring/50",
                isActive
                  ? "bg-primary/10 font-medium text-primary [&_svg]:text-primary"
                  : "text-muted-foreground hover:bg-muted",
              ),
        )
      }
    >
      {({ isActive }) => (
        <>
          {icon}
          {count !== undefined ? (
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span>{label}</span>
              <span
                className={cn(
                  "shrink-0 tabular-nums font-medium",
                  theme === "dark"
                    ? cn(
                        "text-[15px]",
                        isActive
                          ? "text-[rgba(255,255,255,0.7)]"
                          : "text-[rgba(255,255,255,0.3)] group-hover:text-[rgba(255,255,255,0.5)]",
                      )
                    : isActive
                      ? "text-base text-primary"
                      : "text-base text-muted-foreground",
                )}
              >
                {count}
              </span>
            </span>
          ) : (
            label
          )}
        </>
      )}
    </NavLink>
  );
}

type RanchWorkspaceShellProps = {
  children: ReactNode;
  /** Optional row above main content (e.g. pasture actions). */
  tabActions?: ReactNode;
  /** Merged onto the main scrollable content wrapper (e.g. `gap-3` for tighter drill-in pages). */
  contentClassName?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  /** When false, hides the header search field (e.g. pasture roster uses inline toolbar search). */
  showHeaderSearch?: boolean;
};

export function RanchWorkspaceShell({
  children,
  tabActions,
  contentClassName,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search",
  searchAriaLabel = "Search",
  showHeaderSearch = true,
}: RanchWorkspaceShellProps) {
  const handleSearchChange = onSearchChange ?? (() => {});
  const { sidebarOpen, setSidebarOpen, cattle, herdRows } = useRanchData();
  const { open: openLogObservation } = useLogObservation();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const handleMainScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    setHeaderScrolled(e.currentTarget.scrollTop > 2);
  }, []);

  const dismissMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  const openMobileNav = useCallback(() => {
    setMobileNavOpen(true);
  }, []);

  /** Close on route change — avoids manual pushState (conflicts with React Router history). */
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    setHeaderScrolled(false);
    const el = mainScrollRef.current;
    if (el) el.scrollTop = 0;
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <div className="box-border flex h-[100dvh] max-h-[100dvh] min-h-0 w-full overflow-hidden bg-background">
      <div className="hidden min-h-0 shrink-0 self-stretch py-2 px-2 lg:flex">
        <aside
          className={cn(
            "flex h-full min-h-0 shrink-0 flex-col overflow-x-hidden overflow-y-auto rounded-[10px] bg-sidebar transition-[width] duration-200 ease-out",
            sidebarOpen ? "w-64 p-2" : "w-14 p-1.5",
          )}
        >
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-1",
              sidebarOpen ? "min-w-[240px]" : "min-w-[44px]",
            )}
          >
            <Link
              to="/"
              title="Home"
              className={cn(
                "flex items-center gap-2 rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring/35",
                sidebarOpen
                  ? "px-4 py-3"
                  : "h-9 min-h-9 shrink-0 justify-center px-0 py-0",
              )}
              aria-label="RanchWise home"
            >
              <SidebarHorseshoeMark />
              {sidebarOpen ? <RanchWiseWordmark className="flex-1" /> : null}
            </Link>

            <nav
              className="flex min-h-0 flex-1 flex-col gap-0.5"
              aria-label="Main navigation"
            >
              <DesktopSidebarNavLink
                to="/"
                end
                title="Home"
                sidebarOpen={sidebarOpen}
                label="Home"
                icon={<PiFarm className="size-5 shrink-0" aria-hidden />}
              />

              <NavItem
                href="/cattle"
                icon={FaCow}
                label="Cattle"
                count={cattle.length}
                sidebarOpen={sidebarOpen}
              />
              <NavItem
                href="/horses"
                icon={LiaHorseSolid}
                label="Horses"
                count={herdRows.length}
                sidebarOpen={sidebarOpen}
              />

              <div className="min-h-0 flex-1" aria-hidden />

              {sidebarOpen ? (
                <div className="mx-1 mb-1 flex items-center gap-2 rounded-md border border-ai-accent bg-[var(--ai-accent-bg)] px-[10px] py-[7px]">
                  <Sparkles
                    className="size-[20px] shrink-0 stroke-[var(--ai-accent)] text-[var(--ai-accent)]"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--ai-accent)]">
                    Smart suggestions
                  </span>
                  <span className="ml-auto rounded-full bg-[var(--ai-accent)] px-[5px] py-[1px] text-[10px] font-medium text-white">
                    {SMART_SUGGESTIONS_SIDEBAR_COUNT}
                  </span>
                </div>
              ) : (
                <div
                  className="mx-1 mb-1 flex h-9 min-h-9 shrink-0 items-center justify-center rounded-md border border-ai-accent bg-[var(--ai-accent-bg)] px-2 py-1"
                  title={`Smart suggestions (${SMART_SUGGESTIONS_SIDEBAR_COUNT})`}
                  role="status"
                  aria-label={`${SMART_SUGGESTIONS_SIDEBAR_COUNT} smart suggestions`}
                >
                  <span className="rounded-full bg-[var(--ai-accent)] px-[5px] py-[1px] text-[10px] font-medium text-white">
                    {SMART_SUGGESTIONS_SIDEBAR_COUNT}
                  </span>
                </div>
              )}

              <span
                className={cn(
                  "flex cursor-not-allowed items-center gap-2 rounded-md text-base text-[var(--sidebar-foreground-disabled)] [&_svg]:text-[var(--sidebar-foreground-disabled)] pointer-events-none",
                  sidebarOpen
                    ? "px-3 py-2"
                    : "h-9 min-h-9 shrink-0 justify-center px-0 py-0",
                )}
                title="Settings"
                aria-disabled
              >
                {sidebarOpen ? (
                  <Settings className="size-4 shrink-0" aria-hidden />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                    <Settings className="size-4 shrink-0" aria-hidden />
                  </span>
                )}
                {sidebarOpen ? <span>Settings</span> : null}
              </span>
            </nav>
          </div>
        </aside>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <main className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden bg-background">
          <header
            className={cn(
              "relative z-10 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-12 transition-shadow",
              headerScrolled && "shadow-[0_1px_8px_rgba(0,0,0,0.06)]",
            )}
          >
            <Button
              type="button"
              variant="icon"
              size="iconGhost"
              className={cn(
                "border border-border lg:hidden",
                "rounded-[7px] p-1.5 text-foreground transition-colors duration-150",
                "hover:bg-[var(--action-tint)] hover:text-[var(--action)] active:bg-[var(--sidebar-accent)]",
              )}
              aria-label="Open menu"
              onClick={openMobileNav}
            >
              <Menu className="size-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="icon"
              size="iconGhost"
              className={cn(
                "hidden lg:flex",
                "rounded-[7px] p-1.5 text-foreground transition-colors duration-150",
                "hover:bg-[var(--action-tint)] hover:text-[var(--action)] active:bg-[var(--sidebar-accent)]",
              )}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={sidebarOpen}
              onClick={() => setSidebarOpen((o) => !o)}
            >
              <PanelLeft className="size-4" aria-hidden />
            </Button>
            <Link
              to="/"
              className="flex shrink-0 items-center gap-2 rounded-sm no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="RanchWise home"
            >
              <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] bg-[var(--primary-pressed)] lg:hidden">
                <HorseshoeMark className="h-[13px] w-[13px] text-white" />
              </span>
              <span className="hidden text-base font-semibold tracking-[-0.01em] text-[var(--primary-pressed)] lg:inline">
                <span>Ranch</span>
                <span>Wise</span>
              </span>
            </Link>
            <div className="min-w-0 flex-1" aria-hidden />
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
              {showHeaderSearch ? (
                <WorkspaceSearchField
                  variant="header"
                  value={searchValue}
                  onChange={handleSearchChange}
                  placeholder={searchPlaceholder}
                  ariaLabel={searchAriaLabel}
                />
              ) : null}
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="hidden md:inline-flex"
                onClick={openLogObservation}
              >
                Log observation
              </Button>
              <Button
                type="button"
                variant="icon"
                size="iconGhost"
                aria-label="Notifications"
              >
                <Bell className="size-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="icon"
                size="iconSecondary"
                className="h-[26px] w-[26px] min-h-[26px] min-w-[26px] shrink-0 overflow-hidden rounded-full border-none p-0"
                aria-label="Account"
              >
                <img
                  src="https://images.unsplash.com/photo-1555019685-686f4f67aa19?q=80&w=64&auto=format&fit=crop"
                  alt="Chantale"
                  className="h-[26px] w-[26px] shrink-0 rounded-full object-cover object-center"
                />
              </Button>
              <Button
                type="button"
                variant="icon"
                size="iconGhost"
                aria-label="More options"
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </Button>
            </div>
          </header>

          <div
            ref={mainScrollRef}
            onScroll={handleMainScroll}
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-12 pt-0 pb-10",
              contentClassName,
            )}
          >
            {tabActions ? (
              <div className="flex shrink-0 justify-end">{tabActions}</div>
            ) : null}
            {children}
          </div>
        </main>
      </div>

      {mobileNavOpen
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex flex-col bg-sidebar lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
            >
              <div className="flex items-center justify-between px-4 py-3">
                <Link
                  to="/"
                  onClick={dismissMobileNav}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg pr-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring/35"
                  aria-label="RanchWise home"
                >
                  <SidebarHorseshoeMark />
                  <RanchWiseWordmark className="flex-1" />
                </Link>
                <button
                  type="button"
                  className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--sidebar-hover-bg)] transition-colors hover:bg-[var(--sidebar-border)]"
                  aria-label="Close menu"
                  onClick={dismissMobileNav}
                >
                  <X
                    className="h-4 w-4 text-white"
                    strokeWidth={1.7}
                    aria-hidden
                  />
                </button>
              </div>

              <nav
                className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
                aria-label="Main navigation"
              >
                <MobileNavItem
                  to="/"
                  end
                  theme="dark"
                  icon={<PiFarm className="size-5 shrink-0" aria-hidden />}
                  label="Home"
                  onNavigate={dismissMobileNav}
                />
                <MobileNavItem
                  to="/cattle"
                  theme="dark"
                  icon={<FaCow className="size-5 shrink-0" aria-hidden />}
                  label="Cattle"
                  count={cattle.length}
                  onNavigate={dismissMobileNav}
                />
                <MobileNavItem
                  to="/horses"
                  theme="dark"
                  icon={
                    <LiaHorseSolid className="size-5 shrink-0" aria-hidden />
                  }
                  label="Horses"
                  count={herdRows.length}
                  onNavigate={dismissMobileNav}
                />
              </nav>

              <div className="px-3 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                <span
                  className={cn(
                    "flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-3 text-base text-[#888888]/60 opacity-60 pointer-events-none",
                  )}
                  aria-disabled
                >
                  <Settings className="size-5 shrink-0" aria-hidden />
                  Settings
                </span>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
