import { cn } from "@/lib/utils"

export function Separator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      className={cn("h-0.5 w-full shrink-0 rounded-full bg-muted", className)}
    />
  )
}
