export type SidebarPortfolioCreditProps = {
  portfolioUrl: string
}

const demoBadgeClass =
  "inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border-[0.5px] border-[rgba(15,157,110,0.4)] bg-[rgba(15,157,110,0.15)] px-[9px] py-1"

const DESIGNER_AVATAR_URL =
  "https://images.squarespace-cdn.com/content/v1/6234ef74d2fd58352520b185/e828f12b-0f90-4cd5-a944-8acbf0241c4d/Chantale.jpeg?format=2500w"

/**
 * Portfolio credit for the sidebar: whole card links to portfolio; pine demo pill, eyebrow,
 * designer photo + name + role; corner ↗ on hover with credit surface lift.
 */
export function SidebarPortfolioCredit({ portfolioUrl }: SidebarPortfolioCreditProps) {
  return (
    <a
      href={portfolioUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View Chantale Dore's portfolio"
      className="group relative flex cursor-pointer flex-col gap-3.5 rounded-md bg-[var(--sidebar-active-bg)] p-3.5 pr-10 no-underline transition-colors hover:bg-[var(--sidebar-credit-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-active-bg)]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-3 text-xs text-white/50 transition-colors group-hover:text-white"
      >
        ↗
      </span>

      <div className={demoBadgeClass}>
        <span aria-hidden="true" className="size-[5px] shrink-0 rounded-full bg-[var(--good)]" />
        <span className="text-[13px] font-medium uppercase tracking-wider text-[var(--good-mark)]">
          Portfolio demo
        </span>
      </div>

      <div className="flex min-w-0 flex-col">
        <p
          className="mb-2 text-[9px] font-medium uppercase leading-none tracking-[0.1em]"
          style={{ color: "rgba(255, 255, 255, 0.7)" }}
        >
          Designed & built by
        </p>
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={DESIGNER_AVATAR_URL}
            alt="Chantale Dore"
            className="size-[38px] shrink-0 rounded-full object-cover"
            loading="lazy"
          />
          <div className="min-w-0 flex flex-col gap-0.5">
            <p className="text-[14px] font-medium leading-[1.25] text-white">Chantale Doré</p>
            <p
              className="text-[10px] leading-[1.3]"
              style={{ color: "rgba(255, 255, 255, 0.7)" }}
            >
              Senior Product Designer
            </p>
          </div>
        </div>
      </div>
    </a>
  )
}
