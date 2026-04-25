import { cn } from "@/lib/utils"
import type { SVGProps } from "react"

export type RanchWiseMarkSize = "sm" | "md" | "lg"

const CONFIG = {
  sm: {
    dim: 22,
    stroke: 1.5,
    rx: 4,
    bar: { x: 6.5, y: 3, w: 9, h: 1.5 },
    text: { x: 11, y: 13, fontSize: 11 },
  },
  md: {
    dim: 32,
    stroke: 2,
    rx: 6,
    bar: { x: 9, y: 5, w: 14, h: 1.5 },
    text: { x: 16, y: 19, fontSize: 16 },
  },
  lg: {
    dim: 56,
    stroke: 2.5,
    rx: 10,
    bar: { x: 17, y: 9, w: 22, h: 2 },
    text: { x: 28, y: 33, fontSize: 26 },
  },
} as const

export type RanchWiseMarkProps = Omit<SVGProps<SVGSVGElement>, "width" | "height" | "viewBox"> & {
  size?: RanchWiseMarkSize
  className?: string
}

/** Bar R outlined brand mark: rounded square, horizontal bar, bold Inter "R". Uses `currentColor` for border, bar, and letter. */
export function RanchWiseMark({ size = "md", className, ...props }: RanchWiseMarkProps) {
  const c = CONFIG[size]
  const sw = c.stroke
  const inset = sw / 2
  const innerW = c.dim - sw
  const innerH = c.dim - sw

  return (
    <svg
      width={c.dim}
      height={c.dim}
      viewBox={`0 0 ${c.dim} ${c.dim}`}
      className={cn("shrink-0 text-foreground", className)}
      {...props}
    >
      <rect
        x={inset}
        y={inset}
        width={innerW}
        height={innerH}
        rx={c.rx}
        ry={c.rx}
        fill="none"
        stroke="currentColor"
        strokeWidth={sw}
        vectorEffect="non-scaling-stroke"
      />
      <rect x={c.bar.x} y={c.bar.y} width={c.bar.w} height={c.bar.h} fill="currentColor" />
      <text
        x={c.text.x}
        y={c.text.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        fontSize={c.text.fontSize}
        fontWeight={700}
      >
        R
      </text>
    </svg>
  )
}
