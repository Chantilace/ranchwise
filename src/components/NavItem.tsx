import { NavLink } from "react-router-dom";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";

export type NavItemProps = {
  href: string;
  end?: boolean;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | true }>;
  label: string;
  count: number;
  sidebarOpen: boolean;
};

/** Desktop sidebar row with optional expanded label + count (collapsed = icon only). */
export function NavItem({
  href,
  end,
  icon: Icon,
  label,
  count,
  sidebarOpen,
}: NavItemProps) {
  const title = sidebarOpen ? label : `${label} (${count})`;

  return (
    <NavLink
      to={href}
      end={end}
      title={title}
      className={({ isActive }) =>
        cn(
          "outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/35",
          sidebarOpen
            ? cn(
                "group flex cursor-pointer items-center gap-2 py-2 pr-3 text-base transition-colors duration-100 mr-2",
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
              <Icon className="size-5 shrink-0" aria-hidden />
            </span>
          ) : (
            <Icon className="size-5 shrink-0" aria-hidden />
          )}
          {sidebarOpen ? (
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="min-w-0 truncate">{label}</span>
              <span
                className={cn(
                  "ml-auto shrink-0 tabular-nums text-sm font-medium",
                  isActive
                    ? "text-[rgba(255,255,255,0.7)]"
                    : "text-[rgba(255,255,255,0.3)] group-hover:text-[rgba(255,255,255,0.5)]",
                )}
              >
                {count}
              </span>
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}
