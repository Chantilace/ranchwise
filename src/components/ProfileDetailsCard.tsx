import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ProfileDetailsRow = {
  label: string;
  value: ReactNode;
};

export type ProfileDetailsSection = {
  title: string;
  /** Optional right slot in the section header row (e.g. “View herd” action). */
  headerRight?: ReactNode;
  rows: ProfileDetailsRow[];
};

export function ProfileDetailsCard({
  sections,
  className,
}: {
  sections: ProfileDetailsSection[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[16px] border-[0.5px] border-[rgba(0,0,0,0.08)] bg-card px-7 py-6",
        className,
      )}
    >
      {sections.map((section, si) => (
        <div
          key={section.title}
          className={cn(
            si > 0 && "mt-6 border-t-[0.5px] border-[rgba(0,0,0,0.06)] pt-6",
          )}
        >
          <div className="mb-[14px] flex min-w-0 items-center justify-between gap-3">
            <p className="min-w-0 text-[11px] font-medium uppercase tracking-[0.1em] text-[#888]">
              {section.title}
            </p>
            {section.headerRight ? (
              <div className="shrink-0">{section.headerRight}</div>
            ) : null}
          </div>
          {section.rows.map((row, ri) => (
            <div
              key={`${section.title}-${row.label}`}
              className={cn(
                "flex min-w-0 items-baseline justify-between gap-4",
                ri < section.rows.length - 1 && "mb-[14px]",
              )}
            >
              <span className="shrink-0 text-[14px] font-normal text-[#5C5868]">
                {row.label}
              </span>
              <div className="min-w-0 flex-1 text-right text-[16px] font-medium text-foreground">
                {row.value}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
