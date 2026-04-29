/**
 * Blue Sage Ranch — approved names for observation and pasture-check log authors (demo seeds).
 * Do not use names outside this list in seeded `loggedBy` / `author` fields.
 *
 * Note: Sidebar portfolio credit uses the designer line (“Chantale Dore”); that is not a log author.
 */
export const APPROVED_LOG_AUTHORS = [
  "Juniper",
  "Wyatt",
  "Lou",
  "Wes",
  "Oliver",
  "Frankie",
] as const

export type ApprovedLogAuthor = (typeof APPROVED_LOG_AUTHORS)[number]
