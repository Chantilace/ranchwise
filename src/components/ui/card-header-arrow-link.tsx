import { Link, type LinkProps } from "react-router-dom"
import { cn } from "@/lib/utils"

const arrowMotionClass =
  "shrink-0 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"

/** Trailing ↗ for card headers; expects a `group` ancestor (e.g. {@link CardHeaderArrowLink}) for hover motion. */
export function CardHeaderArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(arrowMotionClass, "size-[18px]", className)}
      aria-hidden
    >
      <path
        d="M7 17L17 7M7 7h10v10"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export type CardHeaderArrowLinkProps = LinkProps & {
  "aria-label": string
}

/** Icon-only link for card headers. Tertiary → AI accent on hover; 18px arrow, 2px up-right nudge. */
export function CardHeaderArrowLink({
  className,
  "aria-label": ariaLabel,
  ...props
}: CardHeaderArrowLinkProps) {
  return (
    <Link
      {...props}
      aria-label={ariaLabel}
      className={cn(
        "group inline-flex size-10 shrink-0 items-center justify-center rounded-md text-[var(--color-text-tertiary)] transition-colors duration-200 ease-out hover:text-[var(--ai-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
    >
      <CardHeaderArrowIcon className="text-current" />
    </Link>
  )
}
