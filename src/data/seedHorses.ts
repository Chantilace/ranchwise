/**
 * Dominant / ambient hex for mobile profile letterbox backgrounds (`ProfilePhotoLetterbox`).
 * Keys match `HorseTableRow.id` in `SAMPLE_HORSE_ROWS`.
 */
export const HORSE_PROFILE_LETTERBOX_COLOR: Record<string, string> = {
  minnie: "#6B5344",
  blondie: "#C4A574",
  coyote: "#5C4F3F",
  wilbur: "#6B6D72",
  dusty: "#7A6B5A",
  amigo: "#8B5A2B",
  pete: "#6D6A68",
  copperette: "#9A5C3C",
  hollywood: "#5C4033",
  jazzy: "#4A3728",
  red: "#8B3A2A",
  xinder: "#3D2A22",
  bosco: "#4A352C",
  blueberry: "#3D4555",
  ranger: "#9A7B52",
  cisco: "#7D8085",
  maverick: "#4A3B32",
  ace: "#2A2320",
  luna: "#8A8D92",
  rio: "#5A6670",
  storm: "#4A5560",
  arrow: "#A08060",
  cactus: "#5A6B52",
  pepper: "#3A3430",
  scout: "#7D6E58",
  bandit: "#322A26",
  ember: "#8B5A3C",
  sunny: "#B8954A",
  duke: "#4A3528",
  rex: "#7A4030",
  stella: "#6B5548",
  bonnie: "#804040",
  junie: "#8B7355",
  clover: "#6B7C5A",
  dash: "#7A6E58",
  fern: "#5A6B52",
}

export const HORSE_PROFILE_LETTERBOX_FALLBACK = "#3A342C"

export function horseProfileLetterboxColor(horseId: string): string {
  return HORSE_PROFILE_LETTERBOX_COLOR[horseId] ?? HORSE_PROFILE_LETTERBOX_FALLBACK
}
