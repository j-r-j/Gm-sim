import { ItFactor } from '../../models/player/ItFactor';
import { weightedRandom, randomInt } from '../utils/RandomUtils';

/**
 * Distribution of "It" factor values.
 * The "It" factor is NOT normally distributed - it's skewed toward the middle.
 * Most players are average; truly transcendent players are rare.
 */
export const IT_FACTOR_DISTRIBUTION: { range: { min: number; max: number }; weight: number }[] = [
  { range: { min: 90, max: 100 }, weight: 0.02 }, // 2% transcendent
  { range: { min: 75, max: 89 }, weight: 0.08 }, // 8% winners
  { range: { min: 60, max: 74 }, weight: 0.2 }, // 20% solid
  { range: { min: 40, max: 59 }, weight: 0.4 }, // 40% average
  { range: { min: 20, max: 39 }, weight: 0.2 }, // 20% soft
  { range: { min: 1, max: 19 }, weight: 0.1 }, // 10% liability
];

/**
 * Draft position modifiers for "It" factor.
 * Higher picks tend to have higher "It" factors (selection bias, not causation).
 * Values represent bonus percentage chance to bump up a tier.
 */
const DRAFT_POSITION_MODIFIERS: { maxPick: number; tierBumpChance: number }[] = [
  { maxPick: 5, tierBumpChance: 0.3 }, // Top 5 picks: 30% chance to bump up
  { maxPick: 15, tierBumpChance: 0.2 }, // Picks 6-15: 20% chance to bump up
  { maxPick: 32, tierBumpChance: 0.1 }, // First round: 10% chance to bump up
  { maxPick: 64, tierBumpChance: 0.05 }, // Second round: 5% chance to bump up
  { maxPick: 100, tierBumpChance: 0.02 }, // Third round: 2% chance to bump up
  { maxPick: 262, tierBumpChance: 0 }, // Later picks: no bonus
];

/**
 * Generates the "It" factor for a player.
 * The "It" factor represents intangible qualities that separate good players from great ones.
 * @param projectedDraftPosition - Optional projected draft position (affects distribution)
 * @returns An ItFactor object with the generated value
 */
export function generateItFactor(projectedDraftPosition?: number): ItFactor {
  // Select a tier based on distribution weights
  const tier = weightedRandom(
    IT_FACTOR_DISTRIBUTION.map((d) => ({
      value: d.range,
      weight: d.weight,
    }))
  );

  // Generate a value within the selected tier
  let value = randomInt(tier.min, tier.max);

  // Apply draft position modifier (selection bias)
  if (projectedDraftPosition !== undefined) {
    const modifier = DRAFT_POSITION_MODIFIERS.find((m) => projectedDraftPosition <= m.maxPick);

    if (modifier && Math.random() < modifier.tierBumpChance) {
      // Bump up within the current tier or to the next tier
      const bump = randomInt(5, 15);
      value = Math.min(100, value + bump);
    }
  }

  // Ensure value is within valid range
  value = Math.max(1, Math.min(100, value));

  return { value };
}

/**
 * Generates the "It" factor for a skill tier.
 * Elite players are more likely to have high "It" factors.
 * @param skillTier - The player's skill tier
 * @returns An ItFactor object with the generated value
 */
export function generateItFactorForSkillTier(
  skillTier: 'elite' | 'starter' | 'backup' | 'fringe' | 'random'
): ItFactor {
  // Skill tier affects the projected draft position
  const projectedPositions: Record<string, number | undefined> = {
    elite: 10, // Elite players projected in first round
    starter: 50, // Starters projected in second round
    backup: 150, // Backups projected in later rounds
    fringe: 250, // Fringe players likely undrafted
    random: undefined, // No modifier
  };

  return generateItFactor(projectedPositions[skillTier]);
}

/**
 * Gets the tier name for an "It" factor value.
 * FOR ENGINE USE ONLY - never expose to UI.
 */
export function getItFactorTierName(value: number): string {
  if (value >= 90) return 'Transcendent';
  if (value >= 75) return 'Winner';
  if (value >= 60) return 'Solid';
  if (value >= 40) return 'Average';
  if (value >= 20) return 'Soft';
  return 'Liability';
}
