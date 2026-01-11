/**
 * Draft Class Generator
 * Generates 250-300 prospects per year with variable class strength
 * and position distribution matching NFL needs.
 */

import {
  Position,
  OFFENSIVE_POSITIONS,
  DEFENSIVE_POSITIONS,
  SPECIAL_TEAMS_POSITIONS,
} from '../models/player/Position';
import { generatePlayer } from '../generators/player/PlayerGenerator';
import {
  generateUUID,
  randomInt,
  randomElement,
  weightedRandom,
  clampedNormal,
  chance,
} from '../generators/utils/RandomUtils';
import {
  CollegeProgram,
  generateAllCollegePrograms,
  getRandomProgramByPrestige,
  PrestigeTier,
} from './CollegeProgramGenerator';
import {
  ClassStrength,
  DraftClassMeta,
  createDraftClassMeta,
  createDraftClassMetaWithStrength,
  getProspectTier,
} from './ClassStrengthSystem';
import {
  Prospect,
  CollegeStats,
  CollegeAward,
  CollegeInjury,
  PositionCollegeStats,
  createProspect,
  COLLEGE_AWARDS,
} from './Prospect';

/**
 * Position distribution for draft class (reflects NFL needs)
 * Weights are relative and will be normalized
 */
export const POSITION_WEIGHTS: Record<Position, number> = {
  // Offense - High demand
  [Position.QB]: 8,
  [Position.RB]: 12,
  [Position.WR]: 18,
  [Position.TE]: 10,
  [Position.LT]: 8,
  [Position.LG]: 6,
  [Position.C]: 5,
  [Position.RG]: 6,
  [Position.RT]: 8,

  // Defense - High demand
  [Position.DE]: 14,
  [Position.DT]: 10,
  [Position.OLB]: 12,
  [Position.ILB]: 10,
  [Position.CB]: 16,
  [Position.FS]: 8,
  [Position.SS]: 8,

  // Special Teams - Low demand
  [Position.K]: 3,
  [Position.P]: 3,
};

/**
 * Configuration for draft class generation
 */
export interface DraftClassConfig {
  /** Minimum number of prospects */
  minProspects: number;
  /** Maximum number of prospects */
  maxProspects: number;
  /** Draft year */
  year: number;
  /** Optional fixed class strength */
  strength?: ClassStrength;
  /** Whether to use pre-generated college programs */
  collegePrograms?: CollegeProgram[];
}

/**
 * Default configuration
 */
export const DEFAULT_DRAFT_CLASS_CONFIG: DraftClassConfig = {
  minProspects: 250,
  maxProspects: 300,
  year: new Date().getFullYear(),
};

/**
 * Generated draft class
 */
export interface DraftClass {
  /** Unique ID */
  id: string;
  /** Draft year */
  year: number;
  /** Class metadata including strength */
  meta: DraftClassMeta;
  /** All prospects in the class */
  prospects: Prospect[];
  /** College programs used */
  collegePrograms: CollegeProgram[];
  /** Timestamp of generation */
  generatedAt: number;
}

/**
 * Gets a weighted random position based on NFL demand
 */
function getWeightedPosition(positionModifiers?: {
  strongPositions: string[];
  weakPositions: string[];
}): Position {
  const allPositions = [...OFFENSIVE_POSITIONS, ...DEFENSIVE_POSITIONS, ...SPECIAL_TEAMS_POSITIONS];

  const weightedPositions = allPositions.map((pos) => {
    let weight = POSITION_WEIGHTS[pos];

    // Apply position modifiers if provided
    if (positionModifiers) {
      if (positionModifiers.strongPositions.includes(pos)) {
        weight *= 1.3;
      } else if (positionModifiers.weakPositions.includes(pos)) {
        weight *= 0.7;
      }
    }

    return { value: pos, weight };
  });

  return weightedRandom(weightedPositions);
}

/**
 * Generates college statistics for a prospect
 */
function generateCollegeStats(
  position: Position,
  college: CollegeProgram,
  tier: 'elite' | 'starter' | 'backup' | 'fringe'
): CollegeStats {
  // Base seasons (elite players often declare early)
  const baseSeasonsPlayed =
    tier === 'elite' ? randomInt(2, 3) : tier === 'starter' ? randomInt(3, 4) : randomInt(3, 4);

  // Games calculation
  const gamesPerSeason = randomInt(11, 14);
  const totalGames = baseSeasonsPlayed * gamesPerSeason;
  const startPercentage =
    tier === 'elite' ? 0.9 : tier === 'starter' ? 0.75 : tier === 'backup' ? 0.5 : 0.3;
  const gamesStarted = Math.floor(totalGames * startPercentage);

  // Generate position-specific stats
  const positionStats = generatePositionStats(position, tier, totalGames, gamesStarted);

  // Generate awards
  const awards = generateCollegeAwards(tier, college.prestigeTier, baseSeasonsPlayed);

  // Generate injury history
  const injuryHistory = generateInjuryHistory(baseSeasonsPlayed);

  return {
    seasonsPlayed: baseSeasonsPlayed,
    gamesStarted,
    gamesPlayed: totalGames,
    positionStats,
    awards,
    injuryHistory,
  };
}

/**
 * Generates position-specific statistics
 */
function generatePositionStats(
  position: Position,
  tier: 'elite' | 'starter' | 'backup' | 'fringe',
  gamesPlayed: number,
  gamesStarted: number
): PositionCollegeStats {
  // Tier multipliers for stat production
  const tierMultiplier =
    tier === 'elite' ? 1.3 : tier === 'starter' ? 1.0 : tier === 'backup' ? 0.7 : 0.4;

  switch (position) {
    case Position.QB: {
      const passAttempts = Math.floor(gamesStarted * clampedNormal(30, 8, 15, 50) * tierMultiplier);
      const completionRate = clampedNormal(0.62, 0.08, 0.45, 0.78);
      return {
        type: 'QB',
        passAttempts,
        passCompletions: Math.floor(passAttempts * completionRate),
        passYards: Math.floor(passAttempts * clampedNormal(7.5, 1.5, 5, 11) * tierMultiplier),
        passTouchdowns: Math.floor(passAttempts * 0.05 * tierMultiplier),
        interceptions: Math.floor(passAttempts * clampedNormal(0.025, 0.01, 0.01, 0.05)),
        rushAttempts: Math.floor(gamesStarted * clampedNormal(5, 3, 0, 15)),
        rushYards: Math.floor(gamesStarted * clampedNormal(15, 20, -10, 60)),
        rushTouchdowns: Math.floor(gamesStarted * clampedNormal(0.3, 0.2, 0, 1)),
        sacksTaken: Math.floor(gamesStarted * clampedNormal(2, 0.8, 0.5, 4)),
      };
    }

    case Position.RB: {
      const rushAttempts = Math.floor(gamesStarted * clampedNormal(15, 5, 5, 25) * tierMultiplier);
      return {
        type: 'RB',
        rushAttempts,
        rushYards: Math.floor(rushAttempts * clampedNormal(5.0, 1.2, 3, 8) * tierMultiplier),
        rushTouchdowns: Math.floor(rushAttempts * 0.06 * tierMultiplier),
        receptions: Math.floor(gamesStarted * clampedNormal(2.5, 1.5, 0, 6) * tierMultiplier),
        receivingYards: Math.floor(gamesStarted * clampedNormal(20, 15, 0, 60) * tierMultiplier),
        receivingTouchdowns: Math.floor(gamesStarted * 0.15 * tierMultiplier),
        fumbles: Math.floor(rushAttempts * clampedNormal(0.01, 0.005, 0, 0.03)),
      };
    }

    case Position.WR: {
      const receptions = Math.floor(gamesStarted * clampedNormal(4, 2, 1, 10) * tierMultiplier);
      return {
        type: 'WR',
        receptions,
        receivingYards: Math.floor(receptions * clampedNormal(13, 3, 8, 20) * tierMultiplier),
        receivingTouchdowns: Math.floor(receptions * 0.1 * tierMultiplier),
        rushAttempts: Math.floor(gamesStarted * clampedNormal(0.3, 0.3, 0, 1)),
        rushYards: Math.floor(gamesStarted * clampedNormal(2, 3, 0, 10)),
        drops: Math.floor(receptions * clampedNormal(0.06, 0.03, 0, 0.15)),
      };
    }

    case Position.TE: {
      const receptions = Math.floor(
        gamesStarted * clampedNormal(2.5, 1.5, 0.5, 6) * tierMultiplier
      );
      return {
        type: 'TE',
        receptions,
        receivingYards: Math.floor(receptions * clampedNormal(11, 3, 6, 18) * tierMultiplier),
        receivingTouchdowns: Math.floor(receptions * 0.12 * tierMultiplier),
        blocksGraded: gamesStarted * 30,
        blockingGrade: clampedNormal(70, 12, 40, 95) * tierMultiplier,
      };
    }

    case Position.LT:
    case Position.LG:
    case Position.C:
    case Position.RG:
    case Position.RT: {
      return {
        type: 'OL',
        gamesAtPosition: { [position]: gamesStarted },
        sacksAllowed: Math.floor((gamesStarted * clampedNormal(0.3, 0.2, 0, 1)) / tierMultiplier),
        penaltiesCommitted: Math.floor(gamesStarted * clampedNormal(0.2, 0.1, 0, 0.5)),
        passBlockGrade: clampedNormal(72, 10, 50, 95) * tierMultiplier,
        runBlockGrade: clampedNormal(70, 12, 48, 95) * tierMultiplier,
      };
    }

    case Position.DE:
    case Position.DT: {
      return {
        type: 'DL',
        totalTackles: Math.floor(gamesStarted * clampedNormal(3.5, 1.5, 1, 7) * tierMultiplier),
        tacklesForLoss: Math.floor(gamesStarted * clampedNormal(0.8, 0.4, 0, 2) * tierMultiplier),
        sacks: Math.floor(gamesStarted * clampedNormal(0.5, 0.3, 0, 1.2) * tierMultiplier),
        forcedFumbles: Math.floor(gamesPlayed * 0.02 * tierMultiplier),
        passesDefended: Math.floor(gamesPlayed * 0.05 * tierMultiplier),
      };
    }

    case Position.OLB:
    case Position.ILB: {
      return {
        type: 'LB',
        totalTackles: Math.floor(gamesStarted * clampedNormal(7, 2.5, 3, 12) * tierMultiplier),
        tacklesForLoss: Math.floor(gamesStarted * clampedNormal(0.6, 0.3, 0, 1.5) * tierMultiplier),
        sacks: Math.floor(gamesStarted * clampedNormal(0.25, 0.2, 0, 0.8) * tierMultiplier),
        interceptions: Math.floor(gamesPlayed * 0.03 * tierMultiplier),
        passesDefended: Math.floor(gamesStarted * clampedNormal(0.3, 0.2, 0, 0.8) * tierMultiplier),
        forcedFumbles: Math.floor(gamesPlayed * 0.02 * tierMultiplier),
      };
    }

    case Position.CB:
    case Position.FS:
    case Position.SS: {
      return {
        type: 'DB',
        totalTackles: Math.floor(gamesStarted * clampedNormal(4, 2, 1, 8) * tierMultiplier),
        interceptions: Math.floor(gamesPlayed * clampedNormal(0.15, 0.1, 0, 0.4) * tierMultiplier),
        passesDefended: Math.floor(gamesStarted * clampedNormal(0.8, 0.4, 0.2, 2) * tierMultiplier),
        forcedFumbles: Math.floor(gamesPlayed * 0.015 * tierMultiplier),
        touchdowns: Math.floor(gamesPlayed * 0.01 * tierMultiplier),
      };
    }

    case Position.K: {
      const fgAttempts = Math.floor(gamesPlayed * clampedNormal(2, 0.8, 0.5, 4));
      const fgPct = clampedNormal(0.78, 0.1, 0.55, 0.95) * tierMultiplier;
      return {
        type: 'KP',
        fieldGoalAttempts: fgAttempts,
        fieldGoalsMade: Math.floor(fgAttempts * fgPct),
        longFieldGoal: randomInt(45, 58),
        extraPointAttempts: Math.floor(gamesPlayed * clampedNormal(4, 1.5, 1, 7)),
        extraPointsMade: Math.floor(gamesPlayed * clampedNormal(3.8, 1.4, 1, 7)),
        punts: 0,
        puntYards: 0,
        puntAverage: 0,
        touchbacks: 0,
      };
    }

    case Position.P: {
      const punts = Math.floor(gamesPlayed * clampedNormal(5, 1.5, 2, 8));
      const avgYards = clampedNormal(43, 4, 35, 50) * tierMultiplier;
      return {
        type: 'KP',
        fieldGoalAttempts: 0,
        fieldGoalsMade: 0,
        longFieldGoal: 0,
        extraPointAttempts: 0,
        extraPointsMade: 0,
        punts,
        puntYards: Math.floor(punts * avgYards),
        puntAverage: avgYards,
        touchbacks: Math.floor(punts * clampedNormal(0.2, 0.1, 0.05, 0.4)),
      };
    }
  }
}

/**
 * Generates college awards based on tier and prestige
 */
function generateCollegeAwards(
  tier: 'elite' | 'starter' | 'backup' | 'fringe',
  prestige: PrestigeTier,
  seasons: number
): CollegeAward[] {
  const awards: CollegeAward[] = [];
  const currentYear = new Date().getFullYear();

  // Award probabilities by tier
  const awardChances = {
    elite: { national: 0.15, conference: 0.6, team: 0.8 },
    starter: { national: 0.02, conference: 0.25, team: 0.5 },
    backup: { national: 0, conference: 0.05, team: 0.2 },
    fringe: { national: 0, conference: 0.01, team: 0.1 },
  };

  const chances = awardChances[tier];

  for (let year = currentYear - seasons; year <= currentYear; year++) {
    // National awards (only for elite at high prestige schools)
    if (prestige === PrestigeTier.ELITE && tier === 'elite' && chance(chances.national)) {
      awards.push({
        name: randomElement(COLLEGE_AWARDS.national),
        year,
        prestige: 'national',
      });
    }

    // Conference awards
    if (chance(chances.conference)) {
      awards.push({
        name: randomElement(COLLEGE_AWARDS.conference),
        year,
        prestige: 'conference',
      });
    }

    // Team awards
    if (chance(chances.team)) {
      awards.push({
        name: randomElement(COLLEGE_AWARDS.team),
        year,
        prestige: 'team',
      });
    }
  }

  return awards;
}

/**
 * Generates college injury history
 */
function generateInjuryHistory(seasons: number): CollegeInjury[] {
  const injuries: CollegeInjury[] = [];
  const currentYear = new Date().getFullYear();

  const injuryTypes = [
    'Ankle sprain',
    'Hamstring strain',
    'Knee sprain',
    'Shoulder injury',
    'Concussion',
    'Foot injury',
    'Hip flexor strain',
    'Wrist injury',
    'Back strain',
    'ACL tear',
    'Torn labrum',
    'Torn meniscus',
  ];

  // 20% chance of injury per season
  for (let i = 0; i < seasons; i++) {
    if (chance(0.2)) {
      const type = randomElement(injuryTypes);
      const isSevere = type.includes('ACL') || type.includes('Torn');

      injuries.push({
        type,
        year: currentYear - seasons + i,
        gamesMissed: isSevere ? randomInt(6, 13) : randomInt(1, 4),
        surgeryRequired: isSevere || chance(0.1),
      });
    }
  }

  return injuries;
}

/**
 * Generates a single prospect
 */
function generateProspect(collegePrograms: CollegeProgram[], classMeta: DraftClassMeta): Prospect {
  // Get weighted position
  const position = getWeightedPosition(classMeta.positionModifiers);

  // Get tier based on class strength
  const tier = getProspectTier(classMeta.strength);

  // Select college program (higher tier prospects more likely from prestigious schools)
  const college =
    tier === 'elite' || tier === 'starter'
      ? getRandomProgramByPrestige(collegePrograms)
      : randomElement(collegePrograms);

  // Generate base player
  const player = generatePlayer({
    position,
    forDraft: true,
    skillTier: tier,
    collegeId: college.id,
    ageRange: { min: 20, max: 24 },
  });

  // Generate college stats
  const collegeStats = generateCollegeStats(position, college, tier);

  // Create prospect
  return createProspect(player, college, collegeStats, classMeta.year);
}

/**
 * Ensures all positions are represented in the draft class
 */
function ensurePositionCoverage(
  prospects: Prospect[],
  collegePrograms: CollegeProgram[],
  classMeta: DraftClassMeta
): Prospect[] {
  const allPositions = [...OFFENSIVE_POSITIONS, ...DEFENSIVE_POSITIONS, ...SPECIAL_TEAMS_POSITIONS];

  // Count prospects by position
  const positionCounts = new Map<Position, number>();
  for (const prospect of prospects) {
    const pos = prospect.player.position;
    positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1);
  }

  // Minimum required for each position
  const minPerPosition = {
    // Core positions need more
    [Position.QB]: 8,
    [Position.RB]: 10,
    [Position.WR]: 15,
    [Position.TE]: 8,
    [Position.LT]: 6,
    [Position.LG]: 5,
    [Position.C]: 4,
    [Position.RG]: 5,
    [Position.RT]: 6,
    [Position.DE]: 10,
    [Position.DT]: 8,
    [Position.OLB]: 10,
    [Position.ILB]: 8,
    [Position.CB]: 12,
    [Position.FS]: 6,
    [Position.SS]: 6,
    [Position.K]: 2,
    [Position.P]: 2,
  };

  const additionalProspects: Prospect[] = [];

  for (const position of allPositions) {
    const current = positionCounts.get(position) || 0;
    const min = minPerPosition[position] || 2;

    if (current < min) {
      const needed = min - current;
      for (let i = 0; i < needed; i++) {
        const tier = getProspectTier(classMeta.strength);
        const college =
          tier === 'elite' || tier === 'starter'
            ? getRandomProgramByPrestige(collegePrograms)
            : randomElement(collegePrograms);

        const player = generatePlayer({
          position,
          forDraft: true,
          skillTier: tier,
          collegeId: college.id,
          ageRange: { min: 20, max: 24 },
        });

        const collegeStats = generateCollegeStats(position, college, tier);
        additionalProspects.push(createProspect(player, college, collegeStats, classMeta.year));
      }
    }
  }

  return [...prospects, ...additionalProspects];
}

/**
 * Generates a complete draft class
 */
export function generateDraftClass(config: Partial<DraftClassConfig> = {}): DraftClass {
  const fullConfig: DraftClassConfig = { ...DEFAULT_DRAFT_CLASS_CONFIG, ...config };

  // Generate or use provided college programs
  const collegePrograms = fullConfig.collegePrograms || generateAllCollegePrograms();

  // Get all positions for meta generation
  const allPositions = [
    ...OFFENSIVE_POSITIONS,
    ...DEFENSIVE_POSITIONS,
    ...SPECIAL_TEAMS_POSITIONS,
  ].map((p) => p.toString());

  // Create class metadata
  const classMeta = fullConfig.strength
    ? createDraftClassMetaWithStrength(fullConfig.year, allPositions, fullConfig.strength)
    : createDraftClassMeta(fullConfig.year, allPositions);

  // Determine class size
  const classSize = randomInt(fullConfig.minProspects, fullConfig.maxProspects);

  // Generate initial prospects
  let prospects: Prospect[] = [];
  for (let i = 0; i < classSize; i++) {
    prospects.push(generateProspect(collegePrograms, classMeta));
  }

  // Ensure all positions are represented
  prospects = ensurePositionCoverage(prospects, collegePrograms, classMeta);

  return {
    id: generateUUID(),
    year: fullConfig.year,
    meta: classMeta,
    prospects,
    collegePrograms,
    generatedAt: Date.now(),
  };
}

/**
 * Gets draft class summary statistics
 */
export interface DraftClassSummary {
  year: number;
  strength: ClassStrength;
  totalProspects: number;
  prospectsByPosition: Record<Position, number>;
  prospectsByTier: Record<string, number>;
  strongPositions: string[];
  weakPositions: string[];
}

/**
 * Creates a summary of a draft class
 */
export function getDraftClassSummary(draftClass: DraftClass): DraftClassSummary {
  const prospectsByPosition: Partial<Record<Position, number>> = {};
  const prospectsByTier: Record<string, number> = {
    elite: 0,
    starter: 0,
    backup: 0,
    fringe: 0,
  };

  for (const prospect of draftClass.prospects) {
    // Count by position
    const pos = prospect.player.position;
    prospectsByPosition[pos] = (prospectsByPosition[pos] || 0) + 1;

    // Count by tier (based on role ceiling)
    const ceiling = prospect.player.roleFit.ceiling;
    if (ceiling === 'franchiseCornerstone' || ceiling === 'highEndStarter') {
      prospectsByTier.elite++;
    } else if (ceiling === 'solidStarter') {
      prospectsByTier.starter++;
    } else if (ceiling === 'qualityRotational' || ceiling === 'specialist') {
      prospectsByTier.backup++;
    } else {
      prospectsByTier.fringe++;
    }
  }

  return {
    year: draftClass.year,
    strength: draftClass.meta.strength,
    totalProspects: draftClass.prospects.length,
    prospectsByPosition: prospectsByPosition as Record<Position, number>,
    prospectsByTier,
    strongPositions: draftClass.meta.positionModifiers.strongPositions,
    weakPositions: draftClass.meta.positionModifiers.weakPositions,
  };
}

/**
 * Gets prospects by position from a draft class
 */
export function getProspectsByPosition(draftClass: DraftClass, position: Position): Prospect[] {
  return draftClass.prospects.filter((p) => p.player.position === position);
}

/**
 * Gets top prospects by a simplified ranking
 */
export function getTopProspects(draftClass: DraftClass, count: number = 50): Prospect[] {
  // Sort by role ceiling and it factor as a simple ranking
  return [...draftClass.prospects]
    .sort((a, b) => {
      const ceilingOrder = [
        'franchiseCornerstone',
        'highEndStarter',
        'solidStarter',
        'qualityRotational',
        'specialist',
        'depth',
        'practiceSquad',
      ];
      const aCeilingIndex = ceilingOrder.indexOf(a.player.roleFit.ceiling);
      const bCeilingIndex = ceilingOrder.indexOf(b.player.roleFit.ceiling);

      if (aCeilingIndex !== bCeilingIndex) {
        return aCeilingIndex - bCeilingIndex;
      }

      // Secondary sort by it factor
      return b.player.itFactor.value - a.player.itFactor.value;
    })
    .slice(0, count);
}

/**
 * Validates a draft class
 */
export function validateDraftClass(draftClass: DraftClass): boolean {
  if (!draftClass.id || typeof draftClass.id !== 'string') return false;
  if (!draftClass.year || draftClass.year < 2000 || draftClass.year > 2100) return false;
  if (!draftClass.meta) return false;
  if (!Array.isArray(draftClass.prospects)) return false;
  if (draftClass.prospects.length < 250) return false;
  if (!Array.isArray(draftClass.collegePrograms)) return false;

  return true;
}
