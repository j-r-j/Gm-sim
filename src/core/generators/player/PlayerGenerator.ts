import { Player } from '../../models/player/Player';
import {
  Position,
  OFFENSIVE_POSITIONS,
  DEFENSIVE_POSITIONS,
  SPECIAL_TEAMS_POSITIONS,
} from '../../models/player/Position';
import { createHealthyStatus } from '../../models/player/InjuryStatus';
import { generateUUID, randomElement, randomInt } from '../utils/RandomUtils';
import { generateFullName } from './NameGenerator';
import { generatePhysicalAttributes } from './PhysicalGenerator';
import { generateSkillsForPosition } from './SkillGenerator';
import { generateHiddenTraits } from './TraitGenerator';
import { generateItFactor, generateItFactorForSkillTier } from './ItFactorGenerator';
import { generateConsistencyProfile } from './ConsistencyGenerator';
import { generateSchemeFits } from './SchemeFitGenerator';
import { generateRoleFit, generateRoleFitForTier } from './RoleFitGenerator';

/**
 * Options for generating a player.
 */
export interface PlayerGenerationOptions {
  /** Specific position to generate, or random if not specified */
  position?: Position;
  /** Age range for the player */
  ageRange?: { min: number; max: number };
  /** Skill tier to bias generation toward */
  skillTier?: 'elite' | 'starter' | 'backup' | 'fringe' | 'random';
  /** Whether this is a draft prospect */
  forDraft?: boolean;
  /** College ID if applicable */
  collegeId?: string;
  /** Team ID to assign (optional) */
  teamId?: string;
}

/**
 * Default age ranges by context.
 */
const DEFAULT_AGE_RANGES = {
  draft: { min: 21, max: 24 },
  veteran: { min: 25, max: 35 },
  full: { min: 21, max: 38 },
};

/**
 * Generates a complete player.
 * @param options - Generation options
 * @returns A fully generated Player object
 */
export function generatePlayer(options: PlayerGenerationOptions = {}): Player {
  // Determine position
  const position = options.position ?? getRandomPosition();

  // Determine age range
  let ageRange: { min: number; max: number };
  if (options.ageRange) {
    ageRange = options.ageRange;
  } else if (options.forDraft) {
    ageRange = DEFAULT_AGE_RANGES.draft;
  } else {
    ageRange = DEFAULT_AGE_RANGES.full;
  }

  const age = randomInt(ageRange.min, ageRange.max);

  // Calculate experience based on age (rookies enter at ~22)
  const experience = options.forDraft ? 0 : Math.max(0, age - 22);

  // Generate name
  const { firstName, lastName } = generateFullName();

  // Generate physical attributes
  const physical = generatePhysicalAttributes(position);

  // Generate skills
  const skillTier = options.skillTier ?? 'random';
  const skills = generateSkillsForPosition(position, age, skillTier);

  // Generate hidden traits
  const hiddenTraits = generateHiddenTraits(position);

  // Generate "It" factor
  const itFactor =
    skillTier === 'random' ? generateItFactor() : generateItFactorForSkillTier(skillTier);

  // Generate consistency profile
  const consistency = generateConsistencyProfile(position, itFactor.value);

  // Generate scheme fits
  const schemeFits = generateSchemeFits(position, physical, skills);

  // Generate role fit
  const roleFit =
    skillTier === 'random'
      ? generateRoleFit(skills, itFactor.value, consistency.tier)
      : generateRoleFitForTier(skillTier, itFactor.value, consistency.tier);

  // Calculate draft metadata
  let draftYear = new Date().getFullYear() - experience;
  let draftRound = 0;
  let draftPick = 0;

  if (!options.forDraft && experience > 0) {
    // Generate plausible draft position based on role ceiling
    const draftInfo = generateDraftInfo(roleFit.ceiling);
    draftRound = draftInfo.round;
    draftPick = draftInfo.pick;
  } else if (options.forDraft) {
    draftYear = new Date().getFullYear();
  }

  return {
    id: generateUUID(),
    firstName,
    lastName,
    position,
    age,
    experience,
    physical,
    skills,
    hiddenTraits,
    itFactor,
    consistency,
    schemeFits,
    roleFit,
    contractId: null,
    injuryStatus: createHealthyStatus(),
    fatigue: 0,
    morale: 75, // Start with decent morale
    collegeId: options.collegeId ?? generateUUID(),
    draftYear,
    draftRound,
    draftPick,
  };
}

/**
 * Gets a random position from all positions.
 */
function getRandomPosition(): Position {
  const allPositions = [...OFFENSIVE_POSITIONS, ...DEFENSIVE_POSITIONS, ...SPECIAL_TEAMS_POSITIONS];
  return randomElement(allPositions);
}

/**
 * Generates draft information based on role ceiling.
 */
function generateDraftInfo(ceiling: string): { round: number; pick: number } {
  const ceilingToDraftRange: Record<string, { minRound: number; maxRound: number }> = {
    franchiseCornerstone: { minRound: 1, maxRound: 1 },
    highEndStarter: { minRound: 1, maxRound: 2 },
    solidStarter: { minRound: 2, maxRound: 4 },
    qualityRotational: { minRound: 3, maxRound: 5 },
    specialist: { minRound: 4, maxRound: 7 },
    depth: { minRound: 5, maxRound: 7 },
    practiceSquad: { minRound: 0, maxRound: 0 }, // Undrafted
  };

  const range = ceilingToDraftRange[ceiling] ?? { minRound: 0, maxRound: 0 };

  if (range.minRound === 0) {
    return { round: 0, pick: 0 };
  }

  const round = randomInt(range.minRound, range.maxRound);
  const pickInRound = randomInt(1, 32);
  const pick = (round - 1) * 32 + pickInRound;

  return { round, pick };
}

/**
 * NFL roster composition by position.
 * This defines how many players at each position should be on a 53-man roster.
 */
const ROSTER_COMPOSITION: Record<Position, number> = {
  [Position.QB]: 3,
  [Position.RB]: 4,
  [Position.WR]: 6,
  [Position.TE]: 3,
  [Position.LT]: 2,
  [Position.LG]: 2,
  [Position.C]: 2,
  [Position.RG]: 2,
  [Position.RT]: 2,
  [Position.DE]: 4,
  [Position.DT]: 4,
  [Position.OLB]: 4,
  [Position.ILB]: 3,
  [Position.CB]: 6, // Increased from 5 to 6 for total of 53
  [Position.FS]: 2,
  [Position.SS]: 2,
  [Position.K]: 1,
  [Position.P]: 1,
};

/**
 * Skill tier distribution for roster generation.
 */
const ROSTER_SKILL_DISTRIBUTION = {
  starters: {
    elite: 0.15,
    starter: 0.6,
    backup: 0.2,
    fringe: 0.05,
  },
  backups: {
    elite: 0.02,
    starter: 0.18,
    backup: 0.5,
    fringe: 0.3,
  },
};

/**
 * Generates a full roster for a team.
 * @param teamId - The team ID to assign to players
 * @returns Array of 53 players forming a complete roster
 */
export function generateRoster(teamId: string): Player[] {
  const roster: Player[] = [];

  for (const [position, count] of Object.entries(ROSTER_COMPOSITION)) {
    for (let i = 0; i < count; i++) {
      // First player at each position is a starter, rest are backups
      const isStarter = i === 0;
      const distribution = isStarter
        ? ROSTER_SKILL_DISTRIBUTION.starters
        : ROSTER_SKILL_DISTRIBUTION.backups;

      // Determine skill tier based on distribution
      const roll = Math.random();
      let skillTier: 'elite' | 'starter' | 'backup' | 'fringe';
      if (roll < distribution.elite) {
        skillTier = 'elite';
      } else if (roll < distribution.elite + distribution.starter) {
        skillTier = 'starter';
      } else if (roll < distribution.elite + distribution.starter + distribution.backup) {
        skillTier = 'backup';
      } else {
        skillTier = 'fringe';
      }

      const player = generatePlayer({
        position: position as Position,
        skillTier,
        teamId,
        ageRange: isStarter ? { min: 24, max: 32 } : { min: 22, max: 30 },
      });

      roster.push(player);
    }
  }

  return roster;
}

/**
 * Generates players for all 32 NFL teams.
 * @returns Array of all players in the league
 */
export function generateLeaguePlayers(): Player[] {
  const allPlayers: Player[] = [];

  // Generate 32 teams
  for (let teamNum = 1; teamNum <= 32; teamNum++) {
    const teamId = `team-${teamNum}`;
    const teamRoster = generateRoster(teamId);
    allPlayers.push(...teamRoster);
  }

  return allPlayers;
}

/**
 * Generates a simple draft class (pool of prospects) - basic version.
 * For full draft class with college programs, combine data, etc., use the draft module.
 * @param size - Number of prospects to generate (default 300)
 * @returns Array of draft-eligible players
 * @deprecated Use generateDraftClass from the draft module for full features
 */
export function generateSimpleDraftClass(size: number = 300): Player[] {
  const prospects: Player[] = [];

  // Distribution of skill tiers in a draft class
  const tierDistribution: { tier: 'elite' | 'starter' | 'backup' | 'fringe'; weight: number }[] = [
    { tier: 'elite', weight: 0.05 }, // 5% elite
    { tier: 'starter', weight: 0.2 }, // 20% starter-quality
    { tier: 'backup', weight: 0.35 }, // 35% backup-quality
    { tier: 'fringe', weight: 0.4 }, // 40% fringe/UDFA
  ];

  for (let i = 0; i < size; i++) {
    // Determine skill tier
    const roll = Math.random();
    let skillTier: 'elite' | 'starter' | 'backup' | 'fringe' = 'fringe';
    let cumulative = 0;

    for (const { tier, weight } of tierDistribution) {
      cumulative += weight;
      if (roll < cumulative) {
        skillTier = tier;
        break;
      }
    }

    const prospect = generatePlayer({
      forDraft: true,
      skillTier,
    });

    prospects.push(prospect);
  }

  return prospects;
}
