/**
 * Pro Scouting System
 * Evaluates players on other teams for trade purposes
 */

import { Scout } from '../models/staff/Scout';
import { Position } from '../models/player/Position';
import { SkillRange } from './AutoScoutingSystem';

/**
 * Player status affecting scouting accuracy
 */
export type PlayerStatus = 'starter' | 'rotational' | 'backup' | 'practice_squad' | 'injured';

/**
 * Player visibility level based on status and age
 */
export type VisibilityLevel = 'high' | 'medium' | 'low' | 'minimal';

/**
 * Contract information (public knowledge)
 */
export interface ContractInfo {
  salary: number;
  capHit: number;
  yearsRemaining: number;
  signingBonus: number;
  deadCap: number;
  isExpiring: boolean;
  hasFifthYearOption: boolean;
  hasNoTradeClause: boolean;
}

/**
 * Performance trending
 */
export interface PerformanceTrend {
  direction: 'improving' | 'stable' | 'declining' | 'unknown';
  recentGames: 'strong' | 'average' | 'weak' | 'unknown';
  consistency: 'consistent' | 'inconsistent' | 'unknown';
  notes: string[];
}

/**
 * Trade value assessment
 */
export interface TradeValueAssessment {
  overallValue: 'premium' | 'high' | 'medium' | 'low' | 'negligible';
  draftPickEquivalent: string; // "Early 1st", "Mid 2nd", etc.
  contractImpact: 'positive' | 'neutral' | 'negative';
  ageConsideration: 'prime' | 'entering_prime' | 'peak' | 'declining';
  tradeLikelihood: 'likely' | 'possible' | 'unlikely' | 'untouchable';
  notes: string[];
}

/**
 * Pro player data (from other team)
 */
export interface ProPlayerData {
  id: string;
  name: string;
  position: Position;
  teamId: string;
  teamName: string;

  // Public info
  age: number;
  yearsInLeague: number;
  status: PlayerStatus;
  contract: ContractInfo;

  // Hidden true values
  trueOverall: number;
  truePhysical: number;
  trueTechnical: number;
  trueAwareness: number;

  // Hidden traits
  allTraits: string[];

  // Performance data
  recentPerformance: number; // Last 4 games avg
  seasonPerformance: number; // Season avg
  careerPerformance: number; // Career avg
}

/**
 * Pro scouting report
 */
export interface ProScoutingReport {
  playerId: string;
  playerName: string;
  position: Position;
  teamId: string;
  teamName: string;
  scoutId: string;
  reportDate: number;

  // Basic info (public)
  age: number;
  yearsInLeague: number;
  status: PlayerStatus;

  // Skill assessment (ranges vary by visibility)
  overallRange: SkillRange;
  physicalRange: SkillRange;
  technicalRange: SkillRange;

  // Observable traits only
  visibleTraits: string[];
  hiddenTraitCount: number;

  // Performance analysis
  performanceTrend: PerformanceTrend;

  // Contract (public)
  contract: ContractInfo;

  // Trade value
  tradeValue: TradeValueAssessment;

  // Report quality
  visibility: VisibilityLevel;
  reportConfidence: 'high' | 'medium' | 'low';
}

/**
 * Pro scouting configuration
 */
export interface ProScoutingConfig {
  highVisibilityRangeWidth: number; // Default: 12
  mediumVisibilityRangeWidth: number; // Default: 18
  lowVisibilityRangeWidth: number; // Default: 25
  minimalVisibilityRangeWidth: number; // Default: 35
}

/**
 * Default pro scouting configuration
 */
export const DEFAULT_PRO_SCOUTING_CONFIG: ProScoutingConfig = {
  highVisibilityRangeWidth: 12,
  mediumVisibilityRangeWidth: 18,
  lowVisibilityRangeWidth: 25,
  minimalVisibilityRangeWidth: 35,
};

/**
 * Determines visibility level based on player status and age
 */
export function getPlayerVisibility(player: ProPlayerData): VisibilityLevel {
  // Starters with multiple years have high visibility
  if (player.status === 'starter' && player.yearsInLeague >= 2) {
    return 'high';
  }

  // Starters in first year or rotational players
  if (player.status === 'starter' || player.status === 'rotational') {
    return 'medium';
  }

  // Backups with some playing time
  if (player.status === 'backup' && player.yearsInLeague >= 1) {
    return 'low';
  }

  // Practice squad or injured players
  return 'minimal';
}

/**
 * Calculates skill range based on visibility
 */
export function calculateProScoutSkillRange(
  trueValue: number,
  visibility: VisibilityLevel,
  scoutEvaluation: number,
  config: ProScoutingConfig = DEFAULT_PRO_SCOUTING_CONFIG
): SkillRange {
  // Get base range width for visibility level
  let baseWidth: number;
  switch (visibility) {
    case 'high':
      baseWidth = config.highVisibilityRangeWidth;
      break;
    case 'medium':
      baseWidth = config.mediumVisibilityRangeWidth;
      break;
    case 'low':
      baseWidth = config.lowVisibilityRangeWidth;
      break;
    case 'minimal':
      baseWidth = config.minimalVisibilityRangeWidth;
      break;
  }

  // Adjust based on scout evaluation skill
  const skillFactor = 1 - scoutEvaluation / 100;
  const rangeWidth = Math.round(baseWidth * (0.7 + skillFactor * 0.6));

  // Add some noise
  const centerOffset = Math.round((Math.random() - 0.5) * rangeWidth * 0.3);
  const center = trueValue + centerOffset;

  const min = Math.max(1, center - Math.floor(rangeWidth / 2));
  const max = Math.min(100, center + Math.ceil(rangeWidth / 2));

  // Confidence based on visibility and scout skill
  let confidence: SkillRange['confidence'];
  if (visibility === 'high' && scoutEvaluation >= 60) {
    confidence = 'high';
  } else if (visibility !== 'minimal' && scoutEvaluation >= 40) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return { min, max, confidence };
}

/**
 * Determines visible traits based on visibility
 */
export function getVisibleProTraits(
  allTraits: string[],
  visibility: VisibilityLevel,
  scoutEvaluation: number
): { visible: string[]; hiddenCount: number } {
  // High visibility players show more traits
  let revealPercent: number;
  switch (visibility) {
    case 'high':
      revealPercent = 0.7;
      break;
    case 'medium':
      revealPercent = 0.5;
      break;
    case 'low':
      revealPercent = 0.3;
      break;
    case 'minimal':
      revealPercent = 0.1;
      break;
  }

  // Adjust for scout skill
  revealPercent *= 0.7 + (scoutEvaluation / 100) * 0.3;

  // Only observable traits (on-field behavior)
  const observablePatterns = [
    'speed',
    'athletic',
    'strong',
    'physical',
    'aggressive',
    'technique',
    'hands',
    'route',
    'tackling',
    'coverage',
    'blocking',
    'awareness',
  ];

  const observableTraits = allTraits.filter((trait) =>
    observablePatterns.some((pattern) => trait.toLowerCase().includes(pattern))
  );

  const numToReveal = Math.max(1, Math.floor(observableTraits.length * revealPercent));
  const shuffled = [...observableTraits].sort(() => Math.random() - 0.5);
  const visible = shuffled.slice(0, numToReveal);

  return {
    visible,
    hiddenCount: allTraits.length - visible.length,
  };
}

/**
 * Generates performance trend analysis
 */
export function analyzePerformanceTrend(player: ProPlayerData): PerformanceTrend {
  const notes: string[] = [];

  // Determine trend direction
  let direction: PerformanceTrend['direction'];
  const recentVsCareer = player.recentPerformance - player.careerPerformance;
  const seasonVsCareer = player.seasonPerformance - player.careerPerformance;

  if (recentVsCareer > 5 && seasonVsCareer > 3) {
    direction = 'improving';
    notes.push('Playing best football of career');
  } else if (recentVsCareer < -5 && seasonVsCareer < -3) {
    direction = 'declining';
    notes.push('Performance has dropped off');
  } else {
    direction = 'stable';
  }

  // Recent games assessment
  let recentGames: PerformanceTrend['recentGames'];
  if (player.recentPerformance >= player.trueOverall + 5) {
    recentGames = 'strong';
    notes.push('Hot streak in recent games');
  } else if (player.recentPerformance <= player.trueOverall - 5) {
    recentGames = 'weak';
    notes.push('Struggling in recent games');
  } else {
    recentGames = 'average';
  }

  // Consistency
  const variance = Math.abs(player.recentPerformance - player.seasonPerformance);
  let consistency: PerformanceTrend['consistency'];
  if (variance <= 3) {
    consistency = 'consistent';
  } else {
    consistency = 'inconsistent';
    notes.push('Performance varies week-to-week');
  }

  // Add age-related notes
  if (player.age >= 30 && direction === 'declining') {
    notes.push('Age may be catching up');
  }
  if (player.age <= 25 && direction === 'improving') {
    notes.push('Still developing and improving');
  }

  return {
    direction,
    recentGames,
    consistency,
    notes,
  };
}

/**
 * Calculates trade value assessment
 */
export function calculateTradeValue(
  player: ProPlayerData,
  skillRange: SkillRange
): TradeValueAssessment {
  const notes: string[] = [];

  // Age consideration
  let ageConsideration: TradeValueAssessment['ageConsideration'];
  if (player.age <= 24) {
    ageConsideration = 'entering_prime';
  } else if (player.age <= 27) {
    ageConsideration = 'prime';
  } else if (player.age <= 30) {
    ageConsideration = 'peak';
  } else {
    ageConsideration = 'declining';
    notes.push('Age limits trade value');
  }

  // Estimate skill level from range
  const estimatedSkill = (skillRange.min + skillRange.max) / 2;

  // Overall value based on skill and age
  let overallValue: TradeValueAssessment['overallValue'];
  if (estimatedSkill >= 85 && ageConsideration !== 'declining') {
    overallValue = 'premium';
  } else if (estimatedSkill >= 75) {
    overallValue = 'high';
  } else if (estimatedSkill >= 65) {
    overallValue = 'medium';
  } else if (estimatedSkill >= 50) {
    overallValue = 'low';
  } else {
    overallValue = 'negligible';
  }

  // Contract impact
  let contractImpact: TradeValueAssessment['contractImpact'];
  const yearsRemaining = player.contract.yearsRemaining;
  const capHit = player.contract.capHit;

  if (yearsRemaining >= 2 && capHit < 15_000_000) {
    contractImpact = 'positive';
    notes.push('Team-friendly contract');
  } else if (capHit > 25_000_000 || player.contract.deadCap > capHit * 0.5) {
    contractImpact = 'negative';
    notes.push('Significant cap implications');
  } else {
    contractImpact = 'neutral';
  }

  // Draft pick equivalent
  let draftPickEquivalent: string;
  if (overallValue === 'premium' && ageConsideration !== 'declining') {
    draftPickEquivalent = 'Multiple 1sts';
  } else if (overallValue === 'premium') {
    draftPickEquivalent = 'Early 1st';
  } else if (overallValue === 'high') {
    draftPickEquivalent = 'Mid 1st';
  } else if (overallValue === 'medium') {
    draftPickEquivalent = '2nd round pick';
  } else if (overallValue === 'low') {
    draftPickEquivalent = '4th-5th round pick';
  } else {
    draftPickEquivalent = 'Conditional late pick';
  }

  // Trade likelihood
  let tradeLikelihood: TradeValueAssessment['tradeLikelihood'];
  if (player.contract.hasNoTradeClause) {
    tradeLikelihood = 'unlikely';
    notes.push('Has no-trade clause');
  } else if (overallValue === 'premium' && player.status === 'starter') {
    tradeLikelihood = 'untouchable';
    notes.push('Franchise cornerstone - unlikely to be available');
  } else if (player.contract.isExpiring) {
    tradeLikelihood = 'likely';
    notes.push('Expiring contract - team may look to trade');
  } else if (contractImpact === 'negative') {
    tradeLikelihood = 'possible';
    notes.push('Team might look to shed salary');
  } else {
    tradeLikelihood = 'possible';
  }

  return {
    overallValue,
    draftPickEquivalent,
    contractImpact,
    ageConsideration,
    tradeLikelihood,
    notes,
  };
}

/**
 * Generates a full pro scouting report
 */
export function generateProScoutingReport(
  player: ProPlayerData,
  scout: Scout,
  reportDate: number,
  config: ProScoutingConfig = DEFAULT_PRO_SCOUTING_CONFIG
): ProScoutingReport {
  const scoutEvaluation = scout.attributes.evaluation;
  const visibility = getPlayerVisibility(player);

  // Calculate skill ranges based on visibility
  const overallRange = calculateProScoutSkillRange(
    player.trueOverall,
    visibility,
    scoutEvaluation,
    config
  );
  const physicalRange = calculateProScoutSkillRange(
    player.truePhysical,
    visibility,
    scoutEvaluation,
    config
  );
  const technicalRange = calculateProScoutSkillRange(
    player.trueTechnical,
    visibility,
    scoutEvaluation,
    config
  );

  // Get visible traits
  const { visible: visibleTraits, hiddenCount: hiddenTraitCount } = getVisibleProTraits(
    player.allTraits,
    visibility,
    scoutEvaluation
  );

  // Analyze performance
  const performanceTrend = analyzePerformanceTrend(player);

  // Calculate trade value
  const tradeValue = calculateTradeValue(player, overallRange);

  // Determine report confidence
  let reportConfidence: ProScoutingReport['reportConfidence'];
  if (visibility === 'high' && scoutEvaluation >= 70) {
    reportConfidence = 'high';
  } else if (visibility !== 'minimal' && scoutEvaluation >= 50) {
    reportConfidence = 'medium';
  } else {
    reportConfidence = 'low';
  }

  return {
    playerId: player.id,
    playerName: player.name,
    position: player.position,
    teamId: player.teamId,
    teamName: player.teamName,
    scoutId: scout.id,
    reportDate,

    age: player.age,
    yearsInLeague: player.yearsInLeague,
    status: player.status,

    overallRange,
    physicalRange,
    technicalRange,

    visibleTraits,
    hiddenTraitCount,

    performanceTrend,
    contract: player.contract,
    tradeValue,

    visibility,
    reportConfidence,
  };
}

/**
 * Compares two pro scouting reports for trade evaluation
 */
export function compareProReports(
  report1: ProScoutingReport,
  report2: ProScoutingReport
): {
  comparison: 'player1_better' | 'player2_better' | 'even';
  summary: string;
} {
  const avg1 = (report1.overallRange.min + report1.overallRange.max) / 2;
  const avg2 = (report2.overallRange.min + report2.overallRange.max) / 2;

  // Factor in age
  const ageAdjusted1 = avg1 - Math.max(0, report1.age - 27) * 2;
  const ageAdjusted2 = avg2 - Math.max(0, report2.age - 27) * 2;

  // Factor in contract
  let contractAdj1 = 0;
  let contractAdj2 = 0;
  if (report1.tradeValue.contractImpact === 'positive') contractAdj1 = 5;
  if (report1.tradeValue.contractImpact === 'negative') contractAdj1 = -5;
  if (report2.tradeValue.contractImpact === 'positive') contractAdj2 = 5;
  if (report2.tradeValue.contractImpact === 'negative') contractAdj2 = -5;

  const score1 = ageAdjusted1 + contractAdj1;
  const score2 = ageAdjusted2 + contractAdj2;

  if (Math.abs(score1 - score2) < 5) {
    return {
      comparison: 'even',
      summary: `${report1.playerName} and ${report2.playerName} have similar trade value`,
    };
  }

  if (score1 > score2) {
    return {
      comparison: 'player1_better',
      summary: `${report1.playerName} appears to be the more valuable asset`,
    };
  }

  return {
    comparison: 'player2_better',
    summary: `${report2.playerName} appears to be the more valuable asset`,
  };
}

/**
 * Gets players worth scouting on a team
 */
export function identifyScoutingTargets(
  players: ProPlayerData[],
  targetPositions: Position[]
): ProPlayerData[] {
  return players
    .filter((p) => targetPositions.includes(p.position))
    .filter((p) => p.status !== 'practice_squad' && p.status !== 'injured')
    .filter((p) => p.age <= 32) // Focus on tradeable players
    .sort((a, b) => {
      // Sort by estimated value
      const valueA = getEstimatedValue(a);
      const valueB = getEstimatedValue(b);
      return valueB - valueA;
    });
}

function getEstimatedValue(player: ProPlayerData): number {
  let value = player.trueOverall;

  // Age adjustment
  if (player.age <= 25) value += 10;
  else if (player.age <= 28) value += 5;
  else if (player.age >= 31) value -= 10;

  // Contract adjustment
  if (player.contract.isExpiring) value += 5;
  if (player.contract.hasNoTradeClause) value -= 15;

  // Status adjustment
  if (player.status === 'starter') value += 5;
  if (player.status === 'backup') value -= 5;

  return value;
}

/**
 * Validates a pro scouting report
 */
export function validateProScoutingReport(report: ProScoutingReport): boolean {
  if (!report.playerId || !report.playerName || !report.scoutId) {
    return false;
  }

  // Validate skill ranges
  const validateRange = (range: SkillRange): boolean =>
    range.min >= 1 && range.max <= 100 && range.min <= range.max;

  if (!validateRange(report.overallRange)) return false;
  if (!validateRange(report.physicalRange)) return false;
  if (!validateRange(report.technicalRange)) return false;

  // Validate age
  if (report.age < 21 || report.age > 45) return false;

  return true;
}
