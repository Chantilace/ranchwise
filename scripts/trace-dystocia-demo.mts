/**
 * One-off trace for Demo 2 dystocia note.
 * Run: npx tsx --tsconfig tsconfig.trace.json scripts/trace-dystocia-demo.mts
 */
import {
  detectCowDistress,
  detectDystocia,
  detectMalpresentation,
  detectProlongedLabor,
  matchesCattleDystociaObservationScenario,
} from "../src/lib/cattleDystociaObservationAi.ts"

const notes =
  "In active labor 90+ minutes. Front legs visible but no nose presenting. Cow straining hard, brief rests, no progression in last 30 minutes. She's down and getting tired."

console.log("notes:", notes)
console.log("detectMalpresentation:", detectMalpresentation(notes))
console.log("detectProlongedLabor:", detectProlongedLabor(notes))
console.log("detectCowDistress:", detectCowDistress(notes))
console.log("detectDystocia:", detectDystocia(notes))
console.log("matchesCattleDystociaObservationScenario:", matchesCattleDystociaObservationScenario(notes))
