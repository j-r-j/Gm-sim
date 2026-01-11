/**
 * Coach Evaluation System
 * Calculates coach impact on player development, chemistry, and scheme teaching
 */

import { Coach } from '../models/staff/Coach';
import { Player } from '../models/player/Player';
import { Position } from '../models/player/Position';
import { CoachRole } from '../models/staff/StaffSalary';
import { CoachAttributes } from '../models/staff/CoachAttributes';
import { OffensiveScheme, DefensiveScheme, FitLevel } from '../models/player/SchemeFit';
import { isOffensiveScheme, OFFENSIVE_SCHEME_DEFINITIONS, DEFENSIVE_SCHEME_DEFINITIONS } from './SchemeDefinitions';

/**
 * Development impact result (HIDDEN from UI)
 */
export interface DevelopmentImpact {
  playerId: string;
  coachId: string;
  baseImpact: number; // -5 to +10 rating points per year
  chemistryModifier: number; // -2 to +3
  schemeBonus: number; // 0 to +2
  totalImpact: number;
  impactAreas: string[]; // Skills most affected
}

/**
 * Development impact view model (qualitative)
 */
export interface DevelopmentImpactViewModel {
  playerName: string;
  coachName: string;
  impactDescription: string;
  relationship: 'excellent' | 'good' | 'neutral' | 'strained' | 'poor';
  developmentOutlook: string;
}

/**
 * Scheme teaching result (HIDDEN from UI)
 */
export interface SchemeTeachingResult {
  coachId: string;
  scheme: OffensiveScheme | DefensiveScheme;
  teachingEffectiveness: number; // 0-100
  yearlySchemeProgress: number; // How much scheme fit improves per year
  maxSchemeMastery: number; // Maximum scheme fit achievable with this coach
}

/**
 * Scheme teaching view model (qualitative)
 */
export interface SchemeTeachingViewModel {
  coachName: string;
  schemeName: string;
  teachingQuality: 'elite' | 'excellent' | 'good' | 'average' | 'poor';
  progressDescription: string;
}

/**
 * Player-coach chemistry (HIDDEN from UI)
 */
export interface PlayerCoachChemistry {
  playerId: string;
  coachId: string;
  chemistry: number; // -10 to +10
  sources: ChemistrySource[];
  yearsTogether: number;
}

/**
 * Chemistry source breakdown
 */
export interface ChemistrySource {
  type: 'personality' | 'scheme_fit' | 'development' | 'tenure' | 'success';
  contribution: number;
}

/**
 * Coach role to positions mapping
 */
const COACH_ROLE_POSITIONS: Record<CoachRole, Position[]> = {
  headCoach: [], // Affects all players
  offensiveCoordinator: [
    Position.QB,
    Position.RB,
    Position.WR,
    Position.TE,
    Position.LT,
    Position.LG,
    Position.C,
    Position.RG,
    Position.RT,
  ],
  defensiveCoordinator: [
    Position.DE,
    Position.DT,
    Position.OLB,
    Position.ILB,
    Position.CB,
    Position.FS,
    Position.SS,
  ],
  specialTeamsCoordinator: [Position.K, Position.P],
  qbCoach: [Position.QB],
  rbCoach: [Position.RB],
  wrCoach: [Position.WR],
  teCoach: [Position.TE],
  olCoach: [Position.LT, Position.LG, Position.C, Position.RG, Position.RT],
  dlCoach: [Position.DE, Position.DT],
  lbCoach: [Position.OLB, Position.ILB],
  dbCoach: [Position.CB, Position.FS, Position.SS],
  stCoach: [Position.K, Position.P],
};

/**
 * Checks if a coach's role affects a player's position
 */
export function coachAffectsPlayer(coach: Coach, player: Player): boolean {
  // Head coach affects everyone with reduced impact
  if (coach.role === 'headCoach') {
    return true;
  }

  const positions = COACH_ROLE_POSITIONS[coach.role];
  return positions.includes(player.position);
}

/**
 * Calculates base development impact from coach attributes
 * FOR ENGINE USE ONLY
 */
function calculateBaseDevelopmentImpact(attributes: CoachAttributes): number {
  // Development attribute is primary driver (hidden, 1-100)
  // Convert to -5 to +10 scale
  const developmentRating = attributes.development;

  if (developmentRating >= 90) return 10;
  if (developmentRating >= 80) return 7;
  if (developmentRating >= 70) return 5;
  if (developmentRating >= 60) return 3;
  if (developmentRating >= 50) return 1;
  if (developmentRating >= 40) return 0;
  if (developmentRating >= 30) return -2;
  return -5;
}

/**
 * Calculates chemistry modifier for development
 */
function calculateChemistryModifier(chemistry: number): number {
  // Chemistry is -10 to +10
  // Convert to -2 to +3 modifier
  if (chemistry >= 7) return 3;
  if (chemistry >= 4) return 2;
  if (chemistry >= 1) return 1;
  if (chemistry >= -3) return 0;
  if (chemistry >= -6) return -1;
  return -2;
}

/**
 * Calculates scheme bonus for development
 */
function calculateSchemeBonus(
  player: Player,
  coach: Coach,
  schemeFitLevel: FitLevel
): number {
  // Good scheme fit accelerates development
  switch (schemeFitLevel) {
    case 'perfect':
      return 2;
    case 'good':
      return 1;
    case 'neutral':
      return 0;
    case 'poor':
      return 0;
    case 'terrible':
      return -1;
  }
}

/**
 * Calculates coach impact on player development
 * FOR ENGINE USE ONLY
 */
export function calculateDevelopmentImpact(
  coach: Coach,
  player: Player,
  chemistryValue: number,
  schemeFitLevel: FitLevel
): DevelopmentImpact {
  if (!coachAffectsPlayer(coach, player)) {
    return {
      playerId: player.id,
      coachId: coach.id,
      baseImpact: 0,
      chemistryModifier: 0,
      schemeBonus: 0,
      totalImpact: 0,
      impactAreas: [],
    };
  }

  const baseImpact = calculateBaseDevelopmentImpact(coach.attributes);
  const chemistryModifier = calculateChemistryModifier(chemistryValue);
  const schemeBonus = calculateSchemeBonus(player, coach, schemeFitLevel);

  // Head coach has reduced direct impact (50%)
  const multiplier = coach.role === 'headCoach' ? 0.5 : 1;

  const totalImpact = Math.round(
    (baseImpact + chemistryModifier + schemeBonus) * multiplier
  );

  // Determine impact areas based on coach role
  const impactAreas = getImpactAreas(coach.role, player.position);

  return {
    playerId: player.id,
    coachId: coach.id,
    baseImpact: Math.round(baseImpact * multiplier),
    chemistryModifier: Math.round(chemistryModifier * multiplier),
    schemeBonus: Math.round(schemeBonus * multiplier),
    totalImpact,
    impactAreas,
  };
}

/**
 * Gets the skill areas a coach impacts for a position
 */
function getImpactAreas(role: CoachRole, position: Position): string[] {
  const skillsByRole: Partial<Record<CoachRole, Record<string, string[]>>> = {
    qbCoach: {
      QB: ['accuracy', 'decisionMaking', 'pocketPresence', 'presnap'],
    },
    rbCoach: {
      RB: ['vision', 'cutAbility', 'passProtection'],
    },
    wrCoach: {
      WR: ['routeRunning', 'catching', 'separation'],
    },
    teCoach: {
      TE: ['blocking', 'routeRunning', 'catching'],
    },
    olCoach: {
      LT: ['passBlock', 'footwork', 'awareness'],
      LG: ['runBlock', 'passBlock', 'pullAbility'],
      C: ['awareness', 'runBlock', 'passBlock'],
      RG: ['runBlock', 'passBlock', 'pullAbility'],
      RT: ['passBlock', 'footwork', 'awareness'],
    },
    dlCoach: {
      DE: ['passRush', 'pursuit', 'finesse'],
      DT: ['runDefense', 'power', 'awareness'],
    },
    lbCoach: {
      OLB: ['blitzing', 'coverage', 'tackling'],
      ILB: ['tackling', 'zoneCoverage', 'awareness'],
    },
    dbCoach: {
      CB: ['manCoverage', 'zoneCoverage', 'press'],
      FS: ['zoneCoverage', 'closing', 'awareness'],
      SS: ['tackling', 'zoneCoverage', 'closing'],
    },
  };

  const roleSkills = skillsByRole[role];
  if (!roleSkills) return [];

  return roleSkills[position] ?? [];
}

/**
 * Creates development impact view model (qualitative)
 */
export function createDevelopmentImpactViewModel(
  impact: DevelopmentImpact,
  playerName: string,
  coachName: string
): DevelopmentImpactViewModel {
  // Determine relationship quality
  let relationship: DevelopmentImpactViewModel['relationship'];
  if (impact.chemistryModifier >= 2) {
    relationship = 'excellent';
  } else if (impact.chemistryModifier >= 1) {
    relationship = 'good';
  } else if (impact.chemistryModifier >= 0) {
    relationship = 'neutral';
  } else if (impact.chemistryModifier >= -1) {
    relationship = 'strained';
  } else {
    relationship = 'poor';
  }

  // Generate impact description
  let impactDescription: string;
  if (impact.totalImpact >= 7) {
    impactDescription = 'Elite development potential';
  } else if (impact.totalImpact >= 4) {
    impactDescription = 'Strong development potential';
  } else if (impact.totalImpact >= 2) {
    impactDescription = 'Good development potential';
  } else if (impact.totalImpact >= 0) {
    impactDescription = 'Average development potential';
  } else if (impact.totalImpact >= -2) {
    impactDescription = 'Limited development potential';
  } else {
    impactDescription = 'Poor development environment';
  }

  // Generate development outlook
  let developmentOutlook: string;
  if (impact.impactAreas.length === 0) {
    developmentOutlook = 'Coach does not directly develop this position';
  } else if (impact.totalImpact >= 5) {
    developmentOutlook = `Expect significant growth in ${impact.impactAreas.slice(0, 2).join(' and ')}`;
  } else if (impact.totalImpact >= 2) {
    developmentOutlook = `Should see steady improvement`;
  } else {
    developmentOutlook = `Development may be slower than expected`;
  }

  return {
    playerName,
    coachName,
    impactDescription,
    relationship,
    developmentOutlook,
  };
}

/**
 * Calculates scheme teaching effectiveness
 * FOR ENGINE USE ONLY
 */
export function calculateSchemeTeaching(
  coach: Coach,
  scheme: OffensiveScheme | DefensiveScheme
): SchemeTeachingResult {
  const schemeTeaching = coach.attributes.schemeTeaching;

  // Check if this coach runs this scheme
  const runsThisScheme = coach.scheme === scheme;

  // Base effectiveness from schemeTeaching attribute
  let teachingEffectiveness = schemeTeaching;

  // Bonus if this is the coach's own scheme
  if (runsThisScheme) {
    teachingEffectiveness = Math.min(100, teachingEffectiveness + 15);
  }

  // Calculate yearly progress rate
  // Higher teaching = faster learning
  const yearlySchemeProgress = Math.round(teachingEffectiveness / 10);

  // Max mastery depends on teaching quality
  const maxSchemeMastery = Math.min(100, 50 + teachingEffectiveness / 2);

  return {
    coachId: coach.id,
    scheme,
    teachingEffectiveness,
    yearlySchemeProgress,
    maxSchemeMastery,
  };
}

/**
 * Creates scheme teaching view model (qualitative)
 */
export function createSchemeTeachingViewModel(
  result: SchemeTeachingResult,
  coachName: string
): SchemeTeachingViewModel {
  // Get scheme display name
  const schemeName = isOffensiveScheme(result.scheme)
    ? OFFENSIVE_SCHEME_DEFINITIONS[result.scheme].name
    : DEFENSIVE_SCHEME_DEFINITIONS[result.scheme].name;

  // Determine teaching quality tier
  let teachingQuality: SchemeTeachingViewModel['teachingQuality'];
  if (result.teachingEffectiveness >= 90) {
    teachingQuality = 'elite';
  } else if (result.teachingEffectiveness >= 75) {
    teachingQuality = 'excellent';
  } else if (result.teachingEffectiveness >= 60) {
    teachingQuality = 'good';
  } else if (result.teachingEffectiveness >= 45) {
    teachingQuality = 'average';
  } else {
    teachingQuality = 'poor';
  }

  // Generate progress description
  let progressDescription: string;
  if (result.yearlySchemeProgress >= 8) {
    progressDescription = 'Players learn the scheme very quickly';
  } else if (result.yearlySchemeProgress >= 6) {
    progressDescription = 'Players adapt to the scheme efficiently';
  } else if (result.yearlySchemeProgress >= 4) {
    progressDescription = 'Players learn the scheme at a normal pace';
  } else {
    progressDescription = 'Players may take time to grasp the scheme';
  }

  return {
    coachName,
    schemeName,
    teachingQuality,
    progressDescription,
  };
}

/**
 * Calculates player-coach chemistry
 * FOR ENGINE USE ONLY
 */
export function calculatePlayerCoachChemistry(
  coach: Coach,
  player: Player,
  schemeFitLevel: FitLevel,
  yearsTogether: number,
  recentSuccess: boolean
): PlayerCoachChemistry {
  const sources: ChemistrySource[] = [];
  let totalChemistry = 0;

  // Base chemistry from existing relationship
  const existingChemistry = coach.playerChemistry[player.id] ?? 0;
  if (existingChemistry !== 0) {
    sources.push({ type: 'personality', contribution: existingChemistry * 0.3 });
    totalChemistry += existingChemistry * 0.3;
  }

  // Scheme fit contribution
  let schemeFitContribution = 0;
  switch (schemeFitLevel) {
    case 'perfect':
      schemeFitContribution = 3;
      break;
    case 'good':
      schemeFitContribution = 1.5;
      break;
    case 'neutral':
      schemeFitContribution = 0;
      break;
    case 'poor':
      schemeFitContribution = -1.5;
      break;
    case 'terrible':
      schemeFitContribution = -3;
      break;
  }
  sources.push({ type: 'scheme_fit', contribution: schemeFitContribution });
  totalChemistry += schemeFitContribution;

  // Development contribution (from coach attributes)
  const developmentContribution =
    (coach.attributes.development - 50) / 25; // -2 to +2
  sources.push({ type: 'development', contribution: developmentContribution });
  totalChemistry += developmentContribution;

  // Tenure bonus
  const tenureContribution = Math.min(yearsTogether * 0.5, 2);
  if (yearsTogether > 0) {
    sources.push({ type: 'tenure', contribution: tenureContribution });
    totalChemistry += tenureContribution;
  }

  // Success bonus
  if (recentSuccess) {
    sources.push({ type: 'success', contribution: 1 });
    totalChemistry += 1;
  }

  // Clamp to -10 to +10
  totalChemistry = Math.max(-10, Math.min(10, totalChemistry));

  return {
    playerId: player.id,
    coachId: coach.id,
    chemistry: Math.round(totalChemistry * 10) / 10,
    sources,
    yearsTogether,
  };
}

/**
 * Gets game day performance modifier from coach
 * FOR ENGINE USE ONLY
 */
export function getGameDayCoachModifier(coach: Coach): number {
  // gameDayIQ attribute affects in-game decisions
  const gameDayIQ = coach.attributes.gameDayIQ;

  // Convert 1-100 to -0.05 to +0.10 modifier
  if (gameDayIQ >= 90) return 0.1;
  if (gameDayIQ >= 80) return 0.07;
  if (gameDayIQ >= 70) return 0.04;
  if (gameDayIQ >= 60) return 0.02;
  if (gameDayIQ >= 50) return 0;
  if (gameDayIQ >= 40) return -0.02;
  return -0.05;
}

/**
 * Gets motivation modifier for player development
 * FOR ENGINE USE ONLY
 */
export function getMotivationModifier(coach: Coach): number {
  const motivation = coach.attributes.motivation;

  // Convert 1-100 to 0.8 to 1.2 multiplier
  return 0.8 + (motivation / 100) * 0.4;
}

/**
 * Evaluates coach overall rating (HIDDEN)
 */
export function evaluateCoachOverall(coach: Coach): number {
  const attrs = coach.attributes;

  // Weighted average of attributes
  const weights = {
    development: 0.2,
    gameDayIQ: 0.2,
    schemeTeaching: 0.15,
    playerEvaluation: 0.15,
    talentID: 0.15,
    motivation: 0.15,
  };

  return Math.round(
    attrs.development * weights.development +
    attrs.gameDayIQ * weights.gameDayIQ +
    attrs.schemeTeaching * weights.schemeTeaching +
    attrs.playerEvaluation * weights.playerEvaluation +
    attrs.talentID * weights.talentID +
    attrs.motivation * weights.motivation
  );
}

/**
 * Gets coach quality tier for display (qualitative)
 */
export function getCoachQualityTier(
  overallRating: number
): 'elite' | 'excellent' | 'good' | 'average' | 'below_average' | 'poor' {
  if (overallRating >= 90) return 'elite';
  if (overallRating >= 80) return 'excellent';
  if (overallRating >= 70) return 'good';
  if (overallRating >= 55) return 'average';
  if (overallRating >= 40) return 'below_average';
  return 'poor';
}

/**
 * Generates coach evaluation summary (qualitative)
 */
export function generateCoachEvaluationSummary(coach: Coach): {
  qualityTier: string;
  strengths: string[];
  weaknesses: string[];
  developmentAbility: string;
  gameDayAbility: string;
} {
  const overall = evaluateCoachOverall(coach);
  const qualityTier = getCoachQualityTier(overall);
  const attrs = coach.attributes;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // Identify strengths (>70) and weaknesses (<50)
  if (attrs.development >= 75) strengths.push('Player development');
  if (attrs.development < 45) weaknesses.push('Player development');

  if (attrs.gameDayIQ >= 75) strengths.push('Game management');
  if (attrs.gameDayIQ < 45) weaknesses.push('Game management');

  if (attrs.schemeTeaching >= 75) strengths.push('Teaching the system');
  if (attrs.schemeTeaching < 45) weaknesses.push('Scheme installation');

  if (attrs.motivation >= 75) strengths.push('Motivating players');
  if (attrs.motivation < 45) weaknesses.push('Player motivation');

  if (attrs.playerEvaluation >= 75) strengths.push('Talent evaluation');
  if (attrs.playerEvaluation < 45) weaknesses.push('Talent evaluation');

  // Generate descriptions
  let developmentAbility: string;
  if (attrs.development >= 80) {
    developmentAbility = 'Exceptional at developing players';
  } else if (attrs.development >= 65) {
    developmentAbility = 'Good at player development';
  } else if (attrs.development >= 50) {
    developmentAbility = 'Average player development';
  } else {
    developmentAbility = 'Struggles with player development';
  }

  let gameDayAbility: string;
  if (attrs.gameDayIQ >= 80) {
    gameDayAbility = 'Makes excellent in-game adjustments';
  } else if (attrs.gameDayIQ >= 65) {
    gameDayAbility = 'Solid game-day decision making';
  } else if (attrs.gameDayIQ >= 50) {
    gameDayAbility = 'Average game management';
  } else {
    gameDayAbility = 'Poor in-game adjustments';
  }

  return {
    qualityTier,
    strengths: strengths.length > 0 ? strengths : ['No notable strengths'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['No major weaknesses'],
    developmentAbility,
    gameDayAbility,
  };
}

/**
 * Calculates combined staff development bonus
 * FOR ENGINE USE ONLY
 */
export function calculateCombinedStaffDevelopmentBonus(
  positionCoach: Coach | null,
  coordinator: Coach | null,
  headCoach: Coach | null
): number {
  let totalBonus = 0;

  // Position coach contributes most (60%)
  if (positionCoach) {
    const impact = calculateBaseDevelopmentImpact(positionCoach.attributes);
    totalBonus += impact * 0.6;
  }

  // Coordinator contributes (25%)
  if (coordinator) {
    const impact = calculateBaseDevelopmentImpact(coordinator.attributes);
    totalBonus += impact * 0.25;
  }

  // Head coach contributes least (15%)
  if (headCoach) {
    const impact = calculateBaseDevelopmentImpact(headCoach.attributes);
    totalBonus += impact * 0.15;
  }

  return Math.round(totalBonus);
}
