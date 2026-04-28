/**
 * Form control chrome is unified with `textarea.tsx` (Option C in the design audit):
 *
 * - We avoid pure Input defaults (pill + transparent border) next to Textarea defaults (card + neutral ring),
 *   which made paired fields in modals and observation flows look like two different products.
 * - We avoid stretching `rounded-3xl` onto multiline bodies; that reads as ornamental, not structural.
 * - Canonical vocabulary: `rounded-lg`, `border-border`, `bg-muted`, `placeholder:text-muted-foreground`,
 *   and `focus-visible:border-ring` + `ring-2 ring-action/25` so focus matches the Indigo interactive rule.
 * - No elevation shadow; invalid state uses the same ring width as focus (`ring-2`) for a consistent scale.
 *
 * If you change this file’s default classes, update `textarea.tsx` in the same PR so the pair stays aligned.
 */
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full max-w-full !min-w-0 rounded-lg border border-border bg-muted px-3 py-1 text-base text-foreground outline-none transition-[color,box-shadow,background-color,border-color] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-action/25 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-inset aria-invalid:ring-2 aria-invalid:ring-destructive/25 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
