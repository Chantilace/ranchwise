import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "field-sizing-content min-h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.05)] outline-none transition-[color,box-shadow] placeholder:text-neutral-500 focus-visible:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)

export { Textarea }
