/**
 * Dominant / ambient hex for mobile pasture profile letterbox (`ProfilePhotoLetterbox`).
 * Keys match `Pasture.id` in `PASTURES_SEED`.
 */
export const PASTURE_PROFILE_LETTERBOX_COLOR: Record<string, string> = {
  east: "#6B7C62",
  northeast: "#4A5C56",
  southeast: "#7A8456",
  west: "#8B7A5C",
  northwest: "#6D7268",
}

export const PASTURE_PROFILE_LETTERBOX_FALLBACK = "#4A5548"

export function pastureProfileLetterboxColor(pastureId: string): string {
  return PASTURE_PROFILE_LETTERBOX_COLOR[pastureId] ?? PASTURE_PROFILE_LETTERBOX_FALLBACK
}
