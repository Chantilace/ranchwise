export const FEED_OPTIONS = [
  "Alfafa",
  "Alfalfa",
  "Hay",
  "Pasture Graze",
  "Senior Feed",
  "Probiotics",
  "Grain",
] as const

export type FeedOption = (typeof FEED_OPTIONS)[number]
