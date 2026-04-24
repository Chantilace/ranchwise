/**
 * Shared layout for log-observation surfaces (home dialog, horse modal, horse drawer,
 * cattle embedded log, cattle detail header).
 *
 * Use literal class strings so Tailwind can detect utilities.
 */

/** Profile row with name block + status badges on the right. */
export const LOG_OBSERVATION_IDENTITY_ROW =
  "flex shrink-0 items-start justify-between gap-3 px-4 py-4 md:px-6" as const

/** Profile row without a trailing badge column (e.g. analyzing state). */
export const LOG_OBSERVATION_IDENTITY_ROW_STACK =
  "flex shrink-0 items-start gap-3 px-4 py-4 md:px-6" as const
