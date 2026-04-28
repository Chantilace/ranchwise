import { cva, type VariantProps } from "class-variance-authority"
import type { HTMLAttributes, ReactNode } from "react"

import { cn } from "@/lib/utils"

// eslint-disable-next-line react-refresh/only-export-components -- variant map (see buttonVariants)
export const formLabelVariants = cva("block text-[13px] uppercase", {
  variants: {
    variant: {
      default: "font-medium tracking-wide text-muted-foreground",
      sheet: "font-semibold tracking-widest text-foreground",
      profileEdit: "font-normal tracking-[0.07em] text-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export type FormLabelProps = Omit<HTMLAttributes<HTMLElement>, "color"> &
  VariantProps<typeof formLabelVariants> & {
    /** When set, renders `<label htmlFor={htmlFor}>`. Otherwise `<span>` (e.g. nested under an outer `<label>`). */
    htmlFor?: string
    children: ReactNode
  }

export function FormLabel({
  variant,
  className,
  htmlFor,
  children,
  ...props
}: FormLabelProps) {
  const classes = cn(formLabelVariants({ variant }), className)

  if (htmlFor != null && htmlFor !== "") {
    return (
      <label htmlFor={htmlFor} className={classes} {...props}>
        {children}
      </label>
    )
  }

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  )
}
