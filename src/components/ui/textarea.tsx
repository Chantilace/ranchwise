/**
 * Form control chrome is unified with `input.tsx` (Option C in the design audit):
 *
 * - Same rationale as `input.tsx`: one vocabulary for border, fill, radius, placeholder, focus, invalid,
 *   and disabled so stacked single-line and multiline fields read as siblings.
 * - Only intentional differences vs `Input`: `min-h-20`, `field-sizing-content`, and `py-2` for multiline
 *   vertical rhythm (single-line keeps `h-9` + `py-1`).
 *
 * If you change this file’s default classes, update `input.tsx` in the same PR so the pair stays aligned.
 */
import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "field-sizing-content min-h-20 w-full rounded-lg border border-border bg-muted px-3 py-2 text-base text-foreground outline-none transition-[color,box-shadow,background-color,border-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-action/25 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-inset aria-invalid:ring-2 aria-invalid:ring-destructive/25 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className
        )}
        {...props}
      />
    )
  }
)

export { Textarea }
