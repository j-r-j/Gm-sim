/**
 * Big Board Generator
 * Generates team's consensus big board with weighted rankings based on scout reliability
 */

import { Position } from '../models/player/Position';
import { ScoutReport } from './ScoutReportGenerator';
import {
  DraftBoardState,
  DraftBoardProspect,
  DraftTier,
  determineDraftTier,
} from './DraftBoardManager';

/**
 * Positional need levels
 */
export type NeedLevel = 'critical' | 'high' | 'moderate' | 'low' | 'none';

/**
 * Team positional needs
 */
export interface PositionalNeeds {
  teamId: string;
  needs: Partial<Record<Position, NeedLevel>>;
  priorities: Position[]; // Ordered by importance
}

/**
 * Scout reliability weighting
 */
export interface ScoutReliability {
  scoutId: string;
  overallReliability: number; // 0-100
  positionReliability: Partial<Record<Position, number>>;
  isKnown: boolean; // Whether reliability has been revealed
}

/**
 * Prospect ranking entry
 */
export interface ProspectRanking {
  prospectId: string;
  prospectName: string;
  position: Position;

  // Weighted scores
  rawScore: number; // Before need adjustment
  needAdjustedScore: number; // After need adjustment
  finalRank: number;

  // Component scores
  skillScore: number;
  confidenceScore: number;
  needBonus: number;
  reliabilityWeight: number;

  // Draft projection
  projectedRound: number;
  tier: DraftTier;

  // Metadata
  reportCount: number;
  hasFocusReport: boolean;
}

/**
 * Big board
 */
export interface BigBoard {
  teamId: string;
  draftYear: number;
  generatedAt: number;

  // Rankings
  overallRankings: ProspectRanking[];
  positionRankings: Partial<Record<Position, ProspectRanking[]>>;

  // Top picks by tier
  tierRankings: Partial<Record<DraftTier, ProspectRanking[]>>;

  // Need-adjusted view
  needBasedRankings: ProspectRanking[];

  // Summary
  topProspects: ProspectRanking[];
  bestValue: ProspectRanking[];
  risersAndFallers: {
    risers: ProspectRanking[];
    fallers: ProspectRanking[];
  };
}

/**
 * Big board generation config
 */
export interface BigBoardConfig {
  skillScoreWeight: number;
  confidenceWeight: number;
  reliabilityWeight: number;
  needMultipliers: Record<NeedLevel, number>;
  focusReportBonus: number;
}

/**
 * Default big board configuration
 */
export const DEFAULT_BIG_BOARD_CONFIG: BigBoardConfig = {
  skillScoreWeight: 0.5,
  confidenceWeight: 0.25,
  reliabilityWeight: 0.25,
  needMultipliers: {
    critical: 1.25,
    high: 1.15,
    moderate: 1.05,
    low: 1.0,
    none: 0.9,
  },
  focusReportBonus: 5,
};

/**
 * Creates default positional needs (all moderate)
 */
export function createDefaultPositionalNeeds(teamId: string): PositionalNeeds {
  const needs: Partial<Record<Position, NeedLevel>> = {};
  const priorities: Position[] = [];

  for (const position of Object.values(Position)) {
    needs[position] = 'moderate';
    priorities.push(position);
  }

  return { teamId, needs, priorities };
}

/**
 * Creates scout reliability from track record data
 */
export function createScoutReliability(
  scoutId: string,
  overallHitRate: number | null,
  positionAccuracy: Partial<Record<Position, number | null>>,
  isRevealed: boolean
): ScoutReliability {
  const positionReliability: Partial<Record<Position, number>> = {};

  for (const [position, accuracy] of Object.entries(positionAccuracy)) {
    if (accuracy !== null) {
      positionReliability[position as Position] = accuracy;
    }
  }

  return {
    scoutId,
    overallReliability: overallHitRate ?? 50, // Default to 50 if unknown
    positionReliability,
    isKnown: isRevealed,
  };
}

/**
 * Gets reliability weight for a scout
 */
export function getScoutReliabilityWeight(
  scoutId: string,
  position: Position,
  reliabilityMap: Map<string, ScoutReliability>
): number {
  const reliability = reliabilityMap.get(scoutId);

  if (!reliability) {
    return 0.5; // Default weight for unknown scouts
  }

  if (!reliability.isKnown) {
    return 0.5; // Default weight if not revealed
  }

  // Use position-specific reliability if available
  const positionReliability = reliability.positionReliability[position];
  if (positionReliability !== undefined) {
    return positionReliability / 100;
  }

  // Fall back to overall reliability
  return reliability.overallReliability / 100;
}

/**
 * Calculates skill score from reports
 */
export function calculateSkillScore(reports: ScoutReport[]): number {
  if (reports.length === 0) return 0;

  let totalScore = 0;
  for (const report of reports) {
    const avgOverall = (report.skillRanges.overall.min + report.skillRanges.overall.max) / 2;
    totalScore += avgOverall;
  }

  return totalScore / reports.length;
}

/**
 * Calculates confidence score from reports
 */
export function calculateConfidenceScore(reports: ScoutReport[]): number {
  if (reports.length === 0) return 0;

  let totalConfidence = 0;
  for (const report of reports) {
    totalConfidence += report.confidence.score;
  }

  return totalConfidence / reports.length;
}

/**
 * Calculates weighted skill score using scout reliability
 */
export function calculateWeightedSkillScore(
  reports: ScoutReport[],
  reliabilityMap: Map<string, ScoutReliability>,
  position: Position
): number {
  if (reports.length === 0) return 0;

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const report of reports) {
    const weight = getScoutReliabilityWeight(report.scoutId, position, reliabilityMap);
    const avgOverall = (report.skillRanges.overall.min + report.skillRanges.overall.max) / 2;

    totalWeightedScore += avgOverall * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
}

/**
 * Calculates need bonus for a position
 */
export function calculateNeedBonus(
  position: Position,
  needs: PositionalNeeds,
  config: BigBoardConfig = DEFAULT_BIG_BOARD_CONFIG
): number {
  const needLevel = needs.needs[position] ?? 'moderate';
  return config.needMultipliers[needLevel];
}

/**
 * Creates a prospect ranking
 */
export function createProspectRanking(
  prospect: DraftBoardProspect,
  needs: PositionalNeeds,
  reliabilityMap: Map<string, ScoutReliability>,
  config: BigBoardConfig = DEFAULT_BIG_BOARD_CONFIG
): ProspectRanking {
  // Calculate component scores
  const skillScore = calculateWeightedSkillScore(
    prospect.reports,
    reliabilityMap,
    prospect.position
  );
  const confidenceScore = prospect.aggregatedConfidence.combinedScore;

  // Calculate average reliability weight
  let totalReliabilityWeight = 0;
  for (const report of prospect.reports) {
    totalReliabilityWeight += getScoutReliabilityWeight(
      report.scoutId,
      prospect.position,
      reliabilityMap
    );
  }
  const avgReliabilityWeight =
    prospect.reports.length > 0 ? totalReliabilityWeight / prospect.reports.length : 0.5;

  // Calculate raw score
  const rawScore =
    skillScore * config.skillScoreWeight +
    confidenceScore * config.confidenceWeight +
    avgReliabilityWeight * 100 * config.reliabilityWeight +
    (prospect.hasFocusReport ? config.focusReportBonus : 0);

  // Calculate need bonus
  const needMultiplier = calculateNeedBonus(prospect.position, needs, config);
  const needBonus = (needMultiplier - 1) * rawScore;
  const needAdjustedScore = rawScore * needMultiplier;

  const tier = prospect.userTier ?? determineDraftTier(prospect.consensusRound);

  return {
    prospectId: prospect.prospectId,
    prospectName: prospect.prospectName,
    position: prospect.position,

    rawScore,
    needAdjustedScore,
    finalRank: 0, // Will be set during sorting

    skillScore,
    confidenceScore,
    needBonus,
    reliabilityWeight: avgReliabilityWeight,

    projectedRound: prospect.consensusRound,
    tier,

    reportCount: prospect.reports.length,
    hasFocusReport: prospect.hasFocusReport,
  };
}

/**
 * Generates prospect rankings from draft board
 */
export function generateProspectRankings(
  draftBoard: DraftBoardState,
  needs: PositionalNeeds,
  reliabilityMap: Map<string, ScoutReliability>,
  config: BigBoardConfig = DEFAULT_BIG_BOARD_CONFIG
): ProspectRanking[] {
  const prospects = Array.from(draftBoard.prospects.values());
  const rankings: ProspectRanking[] = [];

  for (const prospect of prospects) {
    const ranking = createProspectRanking(prospect, needs, reliabilityMap, config);
    rankings.push(ranking);
  }

  // Sort by raw score (descending)
  rankings.sort((a, b) => b.rawScore - a.rawScore);

  // Assign ranks
  for (let i = 0; i < rankings.length; i++) {
    rankings[i].finalRank = i + 1;
  }

  return rankings;
}

/**
 * Generates need-adjusted rankings
 */
export function generateNeedAdjustedRankings(rankings: ProspectRanking[]): ProspectRanking[] {
  const needAdjusted = [...rankings];

  // Sort by need-adjusted score (descending)
  needAdjusted.sort((a, b) => b.needAdjustedScore - a.needAdjustedScore);

  // Update ranks for this view
  const result: ProspectRanking[] = [];
  for (let i = 0; i < needAdjusted.length; i++) {
    result.push({
      ...needAdjusted[i],
      finalRank: i + 1,
    });
  }

  return result;
}

/**
 * Generates position-specific rankings
 */
export function generatePositionRankings(
  rankings: ProspectRanking[]
): Partial<Record<Position, ProspectRanking[]>> {
  const positionRankings: Partial<Record<Position, ProspectRanking[]>> = {};

  for (const position of Object.values(Position)) {
    const positionProspects = rankings
      .filter((r) => r.position === position)
      .sort((a, b) => b.rawScore - a.rawScore);

    if (positionProspects.length > 0) {
      // Assign position-specific ranks
      positionRankings[position] = positionProspects.map((p, i) => ({
        ...p,
        finalRank: i + 1,
      }));
    }
  }

  return positionRankings;
}

/**
 * Generates tier-based rankings
 */
export function generateTierRankings(
  rankings: ProspectRanking[]
): Partial<Record<DraftTier, ProspectRanking[]>> {
  const tierRankings: Partial<Record<DraftTier, ProspectRanking[]>> = {};

  const tiers: DraftTier[] = [
    'elite',
    'first_round',
    'second_round',
    'day_two',
    'day_three',
    'priority_fa',
    'draftable',
  ];

  for (const tier of tiers) {
    const tierProspects = rankings
      .filter((r) => r.tier === tier)
      .sort((a, b) => b.rawScore - a.rawScore);

    if (tierProspects.length > 0) {
      tierRankings[tier] = tierProspects.map((p, i) => ({
        ...p,
        finalRank: i + 1,
      }));
    }
  }

  return tierRankings;
}

/**
 * Identifies best value prospects (high skill relative to projected round)
 */
export function identifyBestValue(
  rankings: ProspectRanking[],
  limit: number = 10
): ProspectRanking[] {
  // Value = skill score relative to draft position
  // Higher skill in later rounds = better value
  const valueScores = rankings.map((r) => ({
    ranking: r,
    valueScore: r.skillScore / (r.projectedRound * 10), // Normalize
  }));

  valueScores.sort((a, b) => b.valueScore - a.valueScore);

  return valueScores.slice(0, limit).map((v) => v.ranking);
}

/**
 * Identifies risers (prospects performing above their draft projection)
 */
export function identifyRisers(
  rankings: ProspectRanking[],
  previousRankings: ProspectRanking[] | null,
  limit: number = 5
): ProspectRanking[] {
  if (!previousRankings || previousRankings.length === 0) {
    // Without previous data, use skill score vs projected round
    return rankings
      .filter((r) => r.skillScore > 60 && r.projectedRound >= 3)
      .sort((a, b) => b.skillScore - a.skillScore)
      .slice(0, limit);
  }

  // Compare current rank to previous rank
  const previousRankMap = new Map<string, number>();
  for (const prev of previousRankings) {
    previousRankMap.set(prev.prospectId, prev.finalRank);
  }

  const risers: { ranking: ProspectRanking; improvement: number }[] = [];

  for (const current of rankings) {
    const previousRank = previousRankMap.get(current.prospectId);
    if (previousRank && previousRank > current.finalRank) {
      risers.push({
        ranking: current,
        improvement: previousRank - current.finalRank,
      });
    }
  }

  risers.sort((a, b) => b.improvement - a.improvement);
  return risers.slice(0, limit).map((r) => r.ranking);
}

/**
 * Identifies fallers (prospects dropping in rankings)
 */
export function identifyFallers(
  rankings: ProspectRanking[],
  previousRankings: ProspectRanking[] | null,
  limit: number = 5
): ProspectRanking[] {
  if (!previousRankings || previousRankings.length === 0) {
    // Without previous data, identify high projected picks with low confidence
    return rankings
      .filter((r) => r.projectedRound <= 2 && r.confidenceScore < 50)
      .sort((a, b) => a.confidenceScore - b.confidenceScore)
      .slice(0, limit);
  }

  // Compare current rank to previous rank
  const previousRankMap = new Map<string, number>();
  for (const prev of previousRankings) {
    previousRankMap.set(prev.prospectId, prev.finalRank);
  }

  const fallers: { ranking: ProspectRanking; drop: number }[] = [];

  for (const current of rankings) {
    const previousRank = previousRankMap.get(current.prospectId);
    if (previousRank && previousRank < current.finalRank) {
      fallers.push({
        ranking: current,
        drop: current.finalRank - previousRank,
      });
    }
  }

  fallers.sort((a, b) => b.drop - a.drop);
  return fallers.slice(0, limit).map((f) => f.ranking);
}

/**
 * Generates a complete big board
 */
export function generateBigBoard(
  draftBoard: DraftBoardState,
  needs: PositionalNeeds,
  reliabilityMap: Map<string, ScoutReliability>,
  previousRankings: ProspectRanking[] | null = null,
  config: BigBoardConfig = DEFAULT_BIG_BOARD_CONFIG
): BigBoard {
  // Generate base rankings
  const overallRankings = generateProspectRankings(draftBoard, needs, reliabilityMap, config);

  // Generate derived rankings
  const needBasedRankings = generateNeedAdjustedRankings(overallRankings);
  const positionRankings = generatePositionRankings(overallRankings);
  const tierRankings = generateTierRankings(overallRankings);

  // Identify special groups
  const topProspects = overallRankings.slice(0, 10);
  const bestValue = identifyBestValue(overallRankings, 10);
  const risers = identifyRisers(overallRankings, previousRankings, 5);
  const fallers = identifyFallers(overallRankings, previousRankings, 5);

  return {
    teamId: draftBoard.teamId,
    draftYear: draftBoard.draftYear,
    generatedAt: Date.now(),

    overallRankings,
    positionRankings,
    tierRankings,
    needBasedRankings,

    topProspects,
    bestValue,
    risersAndFallers: {
      risers,
      fallers,
    },
  };
}

/**
 * Compares two prospects
 */
export function compareProspects(
  prospect1: ProspectRanking,
  prospect2: ProspectRanking
): {
  winner: ProspectRanking;
  comparison: {
    skillAdvantage: string;
    confidenceAdvantage: string;
    tierComparison: string;
  };
} {
  const skillDiff = prospect1.skillScore - prospect2.skillScore;
  const confidenceDiff = prospect1.confidenceScore - prospect2.confidenceScore;

  let skillAdvantage: string;
  if (Math.abs(skillDiff) < 5) {
    skillAdvantage = 'Similar skill levels';
  } else if (skillDiff > 0) {
    skillAdvantage = `${prospect1.prospectName} has higher skill ceiling`;
  } else {
    skillAdvantage = `${prospect2.prospectName} has higher skill ceiling`;
  }

  let confidenceAdvantage: string;
  if (Math.abs(confidenceDiff) < 10) {
    confidenceAdvantage = 'Similar evaluation confidence';
  } else if (confidenceDiff > 0) {
    confidenceAdvantage = `${prospect1.prospectName} has more reliable evaluation`;
  } else {
    confidenceAdvantage = `${prospect2.prospectName} has more reliable evaluation`;
  }

  const tierComparison =
    prospect1.tier === prospect2.tier
      ? `Both are ${prospect1.tier.replace('_', ' ')} prospects`
      : `${prospect1.prospectName} (${prospect1.tier.replace('_', ' ')}) vs ${prospect2.prospectName} (${prospect2.tier.replace('_', ' ')})`;

  const winner = prospect1.rawScore >= prospect2.rawScore ? prospect1 : prospect2;

  return {
    winner,
    comparison: {
      skillAdvantage,
      confidenceAdvantage,
      tierComparison,
    },
  };
}

/**
 * Gets position group rankings
 */
export function getPositionGroupRankings(bigBoard: BigBoard): Record<string, ProspectRanking[]> {
  const groups: Record<string, Position[]> = {
    QB: [Position.QB],
    RB: [Position.RB],
    WR: [Position.WR],
    TE: [Position.TE],
    OL: [Position.LT, Position.LG, Position.C, Position.RG, Position.RT],
    DL: [Position.DE, Position.DT],
    LB: [Position.OLB, Position.ILB],
    DB: [Position.CB, Position.FS, Position.SS],
    ST: [Position.K, Position.P],
  };

  const groupRankings: Record<string, ProspectRanking[]> = {};

  for (const [groupName, positions] of Object.entries(groups)) {
    const prospects: ProspectRanking[] = [];

    for (const position of positions) {
      const positionProspects = bigBoard.positionRankings[position];
      if (positionProspects) {
        prospects.push(...positionProspects);
      }
    }

    // Sort by raw score and re-rank
    prospects.sort((a, b) => b.rawScore - a.rawScore);
    groupRankings[groupName] = prospects.map((p, i) => ({
      ...p,
      finalRank: i + 1,
    }));
  }

  return groupRankings;
}

/**
 * Validates a big board
 */
export function validateBigBoard(bigBoard: BigBoard): boolean {
  if (!bigBoard.teamId || !bigBoard.draftYear) {
    return false;
  }

  if (bigBoard.overallRankings.length === 0) {
    return false;
  }

  // Check for duplicate prospect IDs
  const prospectIds = new Set<string>();
  for (const ranking of bigBoard.overallRankings) {
    if (prospectIds.has(ranking.prospectId)) {
      return false;
    }
    prospectIds.add(ranking.prospectId);
  }

  // Check rankings are consecutive
  for (let i = 0; i < bigBoard.overallRankings.length; i++) {
    if (bigBoard.overallRankings[i].finalRank !== i + 1) {
      return false;
    }
  }

  return true;
}

/**
 * Gets big board summary for display
 */
export function getBigBoardSummary(bigBoard: BigBoard): {
  totalProspects: number;
  byTier: Record<string, number>;
  topPositionNeeds: { position: Position; count: number }[];
  averageConfidence: number;
  focusedPercentage: number;
} {
  const totalProspects = bigBoard.overallRankings.length;

  // Count by tier
  const byTier: Record<string, number> = {};
  for (const ranking of bigBoard.overallRankings) {
    byTier[ranking.tier] = (byTier[ranking.tier] ?? 0) + 1;
  }

  // Count by position
  const positionCounts: Partial<Record<Position, number>> = {};
  for (const ranking of bigBoard.overallRankings) {
    positionCounts[ranking.position] = (positionCounts[ranking.position] ?? 0) + 1;
  }

  // Top position needs (positions with most prospects)
  const topPositionNeeds = Object.entries(positionCounts)
    .map(([position, count]) => ({ position: position as Position, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Average confidence
  const totalConfidence = bigBoard.overallRankings.reduce((sum, r) => sum + r.confidenceScore, 0);
  const averageConfidence = totalProspects > 0 ? Math.round(totalConfidence / totalProspects) : 0;

  // Focused percentage
  const focusedCount = bigBoard.overallRankings.filter((r) => r.hasFocusReport).length;
  const focusedPercentage =
    totalProspects > 0 ? Math.round((focusedCount / totalProspects) * 100) : 0;

  return {
    totalProspects,
    byTier,
    topPositionNeeds,
    averageConfidence,
    focusedPercentage,
  };
}
