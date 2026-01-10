import { Position } from './Position';
import { PhysicalAttributes } from './PhysicalAttributes';
import { Player, getPlayerFullName } from './Player';
import { getRevealedTraits } from './HiddenTraits';
import { getSchemeFitDescription, OffensiveScheme, DefensiveScheme } from './SchemeFit';
import { getRoleFitDescription } from './RoleFit';
import { getInjuryDisplayString } from './InjuryStatus';

/**
 * Skill range as shown to the user.
 * NEVER contains true values - only min/max bounds.
 */
export interface SkillRange {
  min: number;
  max: number;
}

/**
 * Player View Model - the ONLY player data exposed to the UI.
 *
 * This interface strictly excludes:
 * - trueValue for any skill
 * - itFactor value
 * - consistency tier
 * - unrevealed traits
 * - any aggregate/overall ratings
 *
 * The UI must work with incomplete information, just like a real GM.
 */
export interface PlayerViewModel {
  /** Unique identifier */
  id: string;

  /** Full display name */
  name: string;

  /** Player's position */
  position: Position;

  /** Player's age */
  age: number;

  /** NFL seasons played */
  experience: number;

  /** Physical attributes (public information) */
  physical: PhysicalAttributes;

  /** Skills as ranges only - no true values */
  skillRanges: Record<string, SkillRange>;

  /** Only traits that have been revealed through gameplay */
  knownTraits: string[];

  /** Qualitative scheme fit description (not the actual fit level) */
  schemeFitDescription: string;

  /** Qualitative role fit description (not the actual effectiveness number) */
  roleFitDescription: string;

  /** Injury status display string */
  injuryDisplay: string;

  /** Draft information */
  draftInfo: {
    year: number;
    round: number;
    pick: number;
  };
}

/**
 * Converts a full Player entity to a PlayerViewModel.
 * This is the ONLY approved way to create a PlayerViewModel.
 * It ensures no hidden data leaks to the UI.
 */
export function createPlayerViewModel(
  player: Player,
  currentScheme?: OffensiveScheme | DefensiveScheme
): PlayerViewModel {
  // Extract skill ranges WITHOUT true values
  const skillRanges: Record<string, SkillRange> = {};
  for (const [skillName, skillValue] of Object.entries(player.skills)) {
    skillRanges[skillName] = {
      min: skillValue.perceivedMin,
      max: skillValue.perceivedMax,
    };
  }

  // Get scheme fit description (vague, not precise)
  let schemeFitDescription = 'Unknown fit';
  if (currentScheme) {
    schemeFitDescription = getSchemeFitDescription(
      player.schemeFits,
      currentScheme
    );
  }

  return {
    id: player.id,
    name: getPlayerFullName(player),
    position: player.position,
    age: player.age,
    experience: player.experience,
    physical: { ...player.physical }, // Copy to prevent mutation
    skillRanges,
    knownTraits: getRevealedTraits(player.hiddenTraits),
    schemeFitDescription,
    roleFitDescription: getRoleFitDescription(player.roleFit),
    injuryDisplay: getInjuryDisplayString(player.injuryStatus),
    draftInfo: {
      year: player.draftYear,
      round: player.draftRound,
      pick: player.draftPick,
    },
  };
}

/**
 * Validates that a PlayerViewModel doesn't contain any hidden data.
 * Used in tests to ensure privacy compliance.
 */
export function validateViewModelPrivacy(viewModel: PlayerViewModel): boolean {
  const json = JSON.stringify(viewModel);

  // These terms should NEVER appear in a serialized ViewModel
  const forbiddenTerms = [
    'trueValue',
    'itFactor',
    'consistencyTier',
    'consistency',
    'hiddenTraits',
    'positive:',
    'negative:',
    'schemeFits',
    'roleEffectiveness',
  ];

  for (const term of forbiddenTerms) {
    if (json.includes(term)) {
      return false;
    }
  }

  return true;
}

/**
 * Gets display text for experience level
 */
export function getExperienceDisplay(viewModel: PlayerViewModel): string {
  if (viewModel.experience === 0) {
    return 'Rookie';
  } else if (viewModel.experience === 1) {
    return '1 year';
  } else if (viewModel.experience >= 10) {
    return 'Veteran';
  } else {
    return `${viewModel.experience} years`;
  }
}

/**
 * Gets the average of a skill range (for rough comparisons)
 */
export function getSkillRangeMidpoint(range: SkillRange): number {
  return Math.round((range.min + range.max) / 2);
}

/**
 * Gets a confidence level based on how narrow the skill range is
 */
export function getSkillConfidence(
  range: SkillRange
): 'high' | 'medium' | 'low' {
  const spread = range.max - range.min;
  if (spread <= 5) return 'high';
  if (spread <= 15) return 'medium';
  return 'low';
}
