import type { ComponentPropsWithoutRef } from "react"

import { cn } from "@/lib/utils"

type CareDuePillProps = {
  label: string
  count: number
} & ComponentPropsWithoutRef<"button">

/** Home summary care-due chips: muted pill + accent count (design spec). */
export function CareDuePill({ label, count, className, type = "button", ...props }: CareDuePillProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex cursor-pointer border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-[10px]",
        className
      )}
      {...props}
    >
      <span className="rounded-[10px] bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {label}{" "}
        <span className="font-medium text-[var(--sidebar-accent-foreground)]">{count}</span>
      </span>
    </button>
  )
}
