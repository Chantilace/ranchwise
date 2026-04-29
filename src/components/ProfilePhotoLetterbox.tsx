import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type ProfilePhotoLetterboxProps = {
  src: string | null | undefined
  alt: string
  /**
   * Optional; retained for callers / seed data. The layered blur treatment does not use this
   * (tones come from the photo itself).
   */
  ambientColor?: string
  /** Outer frame aspect ratio (CSS `aspect-ratio` value). */
  outerAspectRatio?: string
  /** Inner sharp image aspect ratio (CSS `aspect-ratio` value). */
  innerAspectRatio?: string
  /** Shown when `src` is missing or empty. */
  placeholder: ReactNode
  className?: string
}

const sharpPhotoMask =
  "linear-gradient(to right, transparent 0%, black 35%, black 65%, transparent 100%)"

const edgeSubtleOverlay = `linear-gradient(to right,
  rgba(0,0,0,0.3) 0%,
  transparent 20%,
  transparent 80%,
  rgba(0,0,0,0.3) 100%
)`

/**
 * Mobile letterbox: blurred fill + subtle left/right edge dim + fully sharp masked foreground.
 * Intended only inside `md:hidden` regions.
 */
export function ProfilePhotoLetterbox({
  src,
  alt,
  outerAspectRatio = "16 / 9",
  innerAspectRatio = "3 / 2",
  placeholder,
  className,
}: ProfilePhotoLetterboxProps) {
  const trimmed = src?.trim() ?? ""

  if (!trimmed) {
    return (
      <div
        className={cn(
          "relative flex w-full min-w-0 items-center justify-center overflow-hidden rounded-xl bg-secondary",
          className,
        )}
        style={{ aspectRatio: outerAspectRatio }}
      >
        {placeholder}
      </div>
    )
  }

  return (
    <div
      className={cn("relative w-full min-w-0 overflow-hidden rounded-xl bg-black", className)}
      style={{ aspectRatio: outerAspectRatio }}
    >
      {/* Layer 1: blurred background — scale past edges so falloff meets bg-black naturally */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <img
          src={trimmed}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          style={{
            filter: "blur(60px)",
            transform: "scale(1.4)",
            transformOrigin: "center",
          }}
        />
      </div>

      {/* Layer 2: subtle edge vignette on blur (cinematic, light touch) */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: edgeSubtleOverlay }}
        aria-hidden
      />

      {/* Layer 3: sharp photo — mask-only edge fade into layers below */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 z-[2] h-full max-h-full -translate-x-1/2 -translate-y-1/2 overflow-hidden"
        style={{
          aspectRatio: innerAspectRatio,
          maskImage: sharpPhotoMask,
          WebkitMaskImage: sharpPhotoMask,
        }}
      >
        <img src={trimmed} alt={alt} className="h-full w-full object-cover" loading="lazy" />
      </div>
    </div>
  )
}
