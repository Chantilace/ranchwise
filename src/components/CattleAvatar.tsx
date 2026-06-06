import { FaCow } from "react-icons/fa6"
import { cn } from "@/lib/utils"

/** Avatar for cattle surfaces: the sidebar cow icon on the grayscale muted surface (matches horse/pasture geometry). */
export function CattleAvatar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted",
        className
      )}
    >
      <FaCow className="size-6 text-muted-foreground" aria-hidden />
    </div>
  )
}
