import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Tier 1 — primary CTAs */
        default:
          "rounded-full border-none bg-action text-action-foreground hover:bg-action-hover [&_svg:not([class*='size-'])]:size-4",
        primary:
          "rounded-full border-none bg-action text-action-foreground hover:bg-action-hover [&_svg:not([class*='size-'])]:size-4",
        /** Tier 1b — high-emphasis CTAs for page chrome (modals keep `primary`). */
        "primary-dark":
          "rounded-full border-none bg-action-pressed text-white transition-colors duration-150 hover:bg-action-pressed active:bg-action-pressed [&_svg:not([class*='size-'])]:size-4",
        /** Tier 2 — outline primary (Cancel, secondary log CTAs) */
        secondary:
          "rounded-full border border-action bg-transparent text-action hover:bg-action-tint [&_svg:not([class*='size-'])]:size-4",
        /** Tier 3 — soft primary (Edit, tint toolbars) */
        tertiary:
          "rounded-full border border-border bg-muted text-foreground hover:bg-muted-deeper [&_svg:not([class*='size-'])]:size-4",
        /** Category pill selector — used in HorseLogSheet and similar forms */
        pills:
          "rounded-full border border-action/20 bg-action-tint/50 text-action hover:bg-action-tint hover:border-action/40 data-[state=active]:border-action data-[state=active]:bg-action data-[state=active]:text-action-foreground transition-colors duration-150 [&_svg:not([class*='size-'])]:size-4",
        /** Tier 4 — muted text */
        ghost:
          "rounded-full border-none bg-transparent text-muted-foreground hover:text-foreground [&_svg:not([class*='size-'])]:size-4",
        /** Roster log — indigo on soft wash, pill shape */
        "ghost-tinted":
          "rounded-full border-none bg-action-bg-soft text-action hover:bg-action-tint hover:text-action [&_svg:not([class*='size-'])]:size-3",
        /** Icon-only: pair with `size` icon-* (no text-tier colors). */
        icon: "",
        surface:
          "rounded-full border-none bg-secondary text-secondary-foreground hover:bg-secondary/80 [&_svg:not([class*='size-'])]:size-4",
        destructive:
          "rounded-full border-none bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20 [&_svg:not([class*='size-'])]:size-4",
        link: "rounded-full border-none bg-transparent text-action underline-offset-4 hover:underline",
        ai:
          "rounded-full border border-ai-accent bg-ai-accent-bg text-ai-accent-text hover:bg-ai-accent-bg/90 focus-visible:ring-ai-accent/25 [&_svg:not([class*='size-'])]:size-4",
      },
      size: {
        default: "px-4 py-2",
        lg: "px-5 py-2.5 text-base",
        sm: "px-3 py-1.5 text-[13px]",
        /** Tier 2 icon — w-8 h-8 rounded-lg */
        iconSecondary:
          "size-8 min-h-0 min-w-0 rounded-lg border border-border bg-muted p-0 text-foreground hover:bg-muted-deeper gap-0 [&_svg]:size-4",
        /** Roster / table + observation */
        iconTertiary:
          "size-7 min-h-0 min-w-0 rounded-full border border-action bg-transparent p-0 text-action hover:bg-action-tint gap-0 [&_svg]:size-3.5",
        /** Header / dismiss icon */
        iconGhost:
          "size-7 min-h-0 min-w-0 rounded-md border-none bg-transparent p-0 text-muted-foreground hover:text-foreground gap-0 [&_svg]:size-4",
        icon: "size-9 rounded-full p-0 gap-0 [&_svg]:size-4",
        "icon-xs": "size-6 rounded-md p-0 gap-0 [&_svg]:size-3",
        "icon-sm": "size-8 rounded-lg p-0 gap-0 [&_svg]:size-4",
        "icon-lg": "size-10 rounded-lg p-0 gap-0 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
