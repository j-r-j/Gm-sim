/**
 * Report Confidence System
 * Calculates and manages confidence levels for scout reports
 * Adjusts skill ranges based on confidence and tracks scout tendencies
 */

import { Scout } from '../models/staff/Scout';
import { Position } from '../models/player/Position';
import { SkillRange } from './AutoScoutingSystem';
import { ScoutReport, ReportType, ReportConfidence, ConfidenceFactor } from './ScoutReportGenerator';

/**
 * Scout tendency (optimistic, neutral, pessimistic)
 */
export type ScoutTendency = 'optimistic' | 'neutral' | 'pessimistic';

/**
 * Scout tendency details
 */
export interface ScoutTendencyProfile {
  overallTendency: ScoutTendency;
  tendencyStrength: number; // 0-100, how pronounced the tendency is
  positionTendencies: Partial<Record<Position, ScoutTendency>>;
  skillTendencies: {
    overall: ScoutTendency;
    physical: ScoutTendency;
    technical: ScoutTendency;
  };
  notes: string[];
}

/**
 * Confidence adjustment factors
 */
export interface ConfidenceAdjustment {
  baseMultiplier: number;
  scoutTendencyAdjustment: number;
  regionKnowledgeBonus: number;
  positionSpecialtyBonus: number;
  totalMultiplier: number;
}

/**
 * Multi-scout confidence aggregation
 */
export interface AggregatedConfidence {
  combinedScore: number;
  combinedLevel: 'low' | 'medium' | 'high';
  scoutCount: number;
  consensusStrength: 'weak' | 'moderate' | 'strong';
  divergenceScore: number; // How much scouts disagree (0-100)
  factors: ConfidenceFactor[];
}

/**
 * Confidence calculation config
 */
export interface ConfidenceConfig {
  baseConfidenceWeight: number;
  scoutEvaluationWeight: number;
  scoutingHoursWeight: number;
  regionBonusPercent: number;
  positionSpecialtyBonusPercent: number;
  tendencyImpactPercent: number;
}

/**
 * Default confidence configuration
 */
export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  baseConfidenceWeight: 0.3,
  scoutEvaluationWeight: 0.4,
  scoutingHoursWeight: 0.3,
  regionBonusPercent: 0.1,
  positionSpecialtyBonusPercent: 0.15,
  tendencyImpactPercent: 0.1,
};

/**
 * Calculates base confidence score from scout evaluation
 */
export function calculateBaseConfidence(scoutEvaluation: number): number {
  // Higher evaluation = higher confidence
  // Normalized to 0-100 scale
  return Math.max(0, Math.min(100, scoutEvaluation));
}

/**
 * Calculates scouting time confidence bonus
 */
export function calculateTimeConfidence(
  scoutingHours: number,
  reportType: ReportType
): number {
  // Expected hours by report type
  const expectedHours = reportType === 'focus' ? 45 : 5;
  const maxHours = reportType === 'focus' ? 60 : 10;

  // Calculate bonus (0-100)
  const ratio = Math.min(scoutingHours / expectedHours, 1);
  const baseScore = ratio * 70;

  // Bonus for exceeding expectations
  if (scoutingHours > expectedHours) {
    const excessRatio = Math.min((scoutingHours - expectedHours) / (maxHours - expectedHours), 1);
    return baseScore + excessRatio * 30;
  }

  return baseScore;
}

/**
 * Calculates region knowledge confidence modifier
 */
export function calculateRegionConfidenceModifier(
  scoutRegion: string | null,
  prospectRegion: string,
  config: ConfidenceConfig = DEFAULT_CONFIDENCE_CONFIG
): number {
  if (!scoutRegion) {
    // National scout - moderate bonus for all regions
    return config.regionBonusPercent * 0.5;
  }

  if (scoutRegion === prospectRegion) {
    // Primary region - full bonus
    return config.regionBonusPercent;
  }

  // Different region - no bonus
  return 0;
}

/**
 * Calculates position specialty confidence modifier
 */
export function calculatePositionConfidenceModifier(
  scoutSpecialty: string | null,
  prospectPosition: Position,
  config: ConfidenceConfig = DEFAULT_CONFIDENCE_CONFIG
): number {
  if (!scoutSpecialty) {
    return 0;
  }

  if (scoutSpecialty === prospectPosition) {
    return config.positionSpecialtyBonusPercent;
  }

  // Check for related positions
  const positionGroups: Record<string, Position[]> = {
    QB: [Position.QB],
    RB: [Position.RB],
    WR: [Position.WR, Position.TE],
    OL: [Position.LT, Position.LG, Position.C, Position.RG, Position.RT],
    DL: [Position.DE, Position.DT],
    LB: [Position.OLB, Position.ILB],
    DB: [Position.CB, Position.FS, Position.SS],
    ST: [Position.K, Position.P],
  };

  for (const [, positions] of Object.entries(positionGroups)) {
    if (
      positions.includes(prospectPosition as Position) &&
      positions.some((p) => p === scoutSpecialty)
    ) {
      return config.positionSpecialtyBonusPercent * 0.5;
    }
  }

  return 0;
}

/**
 * Determines scout tendency from historical data
 */
export function determineScoutTendency(
  historicalGrades: { projected: number; actual: number }[]
): ScoutTendency {
  if (historicalGrades.length < 5) {
    return 'neutral'; // Not enough data
  }

  let totalDifference = 0;
  for (const grade of historicalGrades) {
    totalDifference += grade.projected - grade.actual;
  }

  const avgDifference = totalDifference / historicalGrades.length;

  if (avgDifference > 5) {
    return 'optimistic'; // Tends to overrate
  } else if (avgDifference < -5) {
    return 'pessimistic'; // Tends to underrate
  }

  return 'neutral';
}

/**
 * Creates a scout tendency profile
 */
export function createScoutTendencyProfile(
  scout: Scout,
  historicalData?: { projected: number; actual: number; position: Position }[]
): ScoutTendencyProfile {
  // If no historical data, return neutral profile
  if (!historicalData || historicalData.length < 5) {
    return {
      overallTendency: 'neutral',
      tendencyStrength: 0,
      positionTendencies: {},
      skillTendencies: {
        overall: 'neutral',
        physical: 'neutral',
        technical: 'neutral',
      },
      notes: ['Insufficient historical data for tendency analysis'],
    };
  }

  // Calculate overall tendency
  let totalDiff = 0;
  for (const data of historicalData) {
    totalDiff += data.projected - data.actual;
  }
  const avgDiff = totalDiff / historicalData.length;

  let overallTendency: ScoutTendency = 'neutral';
  if (avgDiff > 5) {
    overallTendency = 'optimistic';
  } else if (avgDiff < -5) {
    overallTendency = 'pessimistic';
  }

  const tendencyStrength = Math.min(Math.abs(avgDiff) * 5, 100);

  // Calculate position-specific tendencies
  const positionTendencies: Partial<Record<Position, ScoutTendency>> = {};
  const positionData: Partial<Record<Position, number[]>> = {};

  for (const data of historicalData) {
    if (!positionData[data.position]) {
      positionData[data.position] = [];
    }
    positionData[data.position]!.push(data.projected - data.actual);
  }

  for (const [position, diffs] of Object.entries(positionData)) {
    if (diffs.length >= 3) {
      const avgPosDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      if (avgPosDiff > 5) {
        positionTendencies[position as Position] = 'optimistic';
      } else if (avgPosDiff < -5) {
        positionTendencies[position as Position] = 'pessimistic';
      } else {
        positionTendencies[position as Position] = 'neutral';
      }
    }
  }

  // Generate notes
  const notes: string[] = [];
  if (overallTendency === 'optimistic') {
    notes.push('Scout tends to rate prospects higher than they perform');
    notes.push('Consider adjusting projections slightly downward');
  } else if (overallTendency === 'pessimistic') {
    notes.push('Scout tends to be conservative with grades');
    notes.push('May undervalue some prospects');
  }

  for (const [pos, tendency] of Object.entries(positionTendencies)) {
    if (tendency !== 'neutral') {
      notes.push(`${tendency === 'optimistic' ? 'Overrates' : 'Underrates'} ${pos} prospects`);
    }
  }

  return {
    overallTendency,
    tendencyStrength,
    positionTendencies,
    skillTendencies: {
      overall: overallTendency,
      physical: overallTendency, // Simplified - could be more complex
      technical: overallTendency,
    },
    notes,
  };
}

/**
 * Calculates tendency adjustment for confidence
 */
export function calculateTendencyAdjustment(
  tendency: ScoutTendencyProfile,
  config: ConfidenceConfig = DEFAULT_CONFIDENCE_CONFIG
): number {
  // Neutral tendency = no adjustment
  if (tendency.overallTendency === 'neutral') {
    return 0;
  }

  // Strong tendencies reduce confidence
  const adjustmentBase = tendency.tendencyStrength * config.tendencyImpactPercent;

  // Non-neutral tendencies reduce confidence (we're less sure of biased scouts)
  return -adjustmentBase * 0.1;
}

/**
 * Calculates full confidence adjustment
 */
export function calculateConfidenceAdjustment(
  scout: Scout,
  prospectRegion: string,
  prospectPosition: Position,
  tendencyProfile?: ScoutTendencyProfile,
  config: ConfidenceConfig = DEFAULT_CONFIDENCE_CONFIG
): ConfidenceAdjustment {
  const baseMultiplier = 1.0;

  const regionBonus = calculateRegionConfidenceModifier(scout.region, prospectRegion, config);
  const positionBonus = calculatePositionConfidenceModifier(
    scout.attributes.positionSpecialty,
    prospectPosition,
    config
  );

  const tendencyAdjustment = tendencyProfile
    ? calculateTendencyAdjustment(tendencyProfile, config)
    : 0;

  const totalMultiplier =
    baseMultiplier + regionBonus + positionBonus + tendencyAdjustment;

  return {
    baseMultiplier,
    scoutTendencyAdjustment: tendencyAdjustment,
    regionKnowledgeBonus: regionBonus,
    positionSpecialtyBonus: positionBonus,
    totalMultiplier: Math.max(0.5, Math.min(1.5, totalMultiplier)),
  };
}

/**
 * Adjusts a skill range based on confidence level
 */
export function adjustRangeByConfidence(
  range: SkillRange,
  confidence: ReportConfidence
): SkillRange {
  // Higher confidence = narrower range
  let narrowFactor: number;
  switch (confidence.level) {
    case 'high':
      narrowFactor = 0.7;
      break;
    case 'medium':
      narrowFactor = 0.85;
      break;
    case 'low':
    default:
      narrowFactor = 1.0;
      break;
  }

  // Additional narrowing based on exact score
  const scoreFactor = 1 - (confidence.score - 50) / 200;
  const finalFactor = narrowFactor * scoreFactor;

  const center = (range.min + range.max) / 2;
  const halfWidth = ((range.max - range.min) / 2) * finalFactor;

  return {
    min: Math.max(1, Math.round(center - halfWidth)),
    max: Math.min(100, Math.round(center + halfWidth)),
    confidence: confidence.level,
  };
}

/**
 * Adjusts all ranges in a skill ranges object by confidence
 */
export function adjustRangesByConfidence(
  ranges: {
    overall: SkillRange;
    physical: SkillRange;
    technical: SkillRange;
    positionSpecific?: Record<string, SkillRange>;
  },
  confidence: ReportConfidence
): {
  overall: SkillRange;
  physical: SkillRange;
  technical: SkillRange;
  positionSpecific?: Record<string, SkillRange>;
} {
  const adjusted = {
    overall: adjustRangeByConfidence(ranges.overall, confidence),
    physical: adjustRangeByConfidence(ranges.physical, confidence),
    technical: adjustRangeByConfidence(ranges.technical, confidence),
    positionSpecific: undefined as Record<string, SkillRange> | undefined,
  };

  if (ranges.positionSpecific) {
    adjusted.positionSpecific = {};
    for (const [skill, range] of Object.entries(ranges.positionSpecific)) {
      adjusted.positionSpecific[skill] = adjustRangeByConfidence(range, confidence);
    }
  }

  return adjusted;
}

/**
 * Aggregates confidence from multiple scout reports on the same prospect
 */
export function aggregateConfidence(reports: ScoutReport[]): AggregatedConfidence {
  if (reports.length === 0) {
    return {
      combinedScore: 0,
      combinedLevel: 'low',
      scoutCount: 0,
      consensusStrength: 'weak',
      divergenceScore: 100,
      factors: [],
    };
  }

  if (reports.length === 1) {
    return {
      combinedScore: reports[0].confidence.score,
      combinedLevel: reports[0].confidence.level,
      scoutCount: 1,
      consensusStrength: 'weak',
      divergenceScore: 0,
      factors: reports[0].confidence.factors,
    };
  }

  // Calculate combined score (weighted average with bonus for multiple scouts)
  const scores = reports.map((r) => r.confidence.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  // Bonus for multiple scouts (up to 20 points for 4+ scouts)
  const multiScoutBonus = Math.min((reports.length - 1) * 5, 20);
  const combinedScore = Math.min(100, Math.round(avgScore + multiScoutBonus));

  // Calculate divergence
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const divergenceScore = maxScore - minScore;

  // Determine consensus strength
  let consensusStrength: AggregatedConfidence['consensusStrength'];
  if (divergenceScore <= 15 && reports.length >= 2) {
    consensusStrength = 'strong';
  } else if (divergenceScore <= 30) {
    consensusStrength = 'moderate';
  } else {
    consensusStrength = 'weak';
  }

  // Determine combined level
  let combinedLevel: 'low' | 'medium' | 'high';
  if (combinedScore >= 70) {
    combinedLevel = 'high';
  } else if (combinedScore >= 40) {
    combinedLevel = 'medium';
  } else {
    combinedLevel = 'low';
  }

  // Aggregate factors
  const factorMap = new Map<string, ConfidenceFactor>();
  for (const report of reports) {
    for (const factor of report.confidence.factors) {
      if (!factorMap.has(factor.factor)) {
        factorMap.set(factor.factor, factor);
      }
    }
  }

  // Add multi-scout factor
  const factors = Array.from(factorMap.values());
  factors.push({
    factor: 'Multiple Scouts',
    impact: reports.length >= 3 ? 'positive' : 'neutral',
    description: `${reports.length} scouts have evaluated this prospect`,
  });

  if (consensusStrength === 'strong') {
    factors.push({
      factor: 'Scout Consensus',
      impact: 'positive',
      description: 'Scouts agree on this evaluation',
    });
  } else if (consensusStrength === 'weak') {
    factors.push({
      factor: 'Scout Divergence',
      impact: 'negative',
      description: 'Significant disagreement between scouts',
    });
  }

  return {
    combinedScore,
    combinedLevel,
    scoutCount: reports.length,
    consensusStrength,
    divergenceScore,
    factors,
  };
}

/**
 * Gets confidence description for display
 */
export function getConfidenceDescription(confidence: ReportConfidence): string {
  const positiveFactors = confidence.factors.filter((f) => f.impact === 'positive').length;
  const negativeFactors = confidence.factors.filter((f) => f.impact === 'negative').length;

  if (confidence.level === 'high') {
    if (positiveFactors >= 2) {
      return 'Very confident in this evaluation';
    }
    return 'High confidence evaluation';
  } else if (confidence.level === 'medium') {
    if (negativeFactors > positiveFactors) {
      return 'Moderate confidence - more scouting recommended';
    }
    return 'Solid foundation, additional evaluation would help';
  } else {
    if (negativeFactors >= 2) {
      return 'Limited information - significant uncertainty';
    }
    return 'Preliminary evaluation only';
  }
}

/**
 * Calculates confidence improvement from additional scouting
 */
export function calculateConfidenceImprovement(
  currentConfidence: ReportConfidence,
  additionalHours: number,
  upgradingToFocus: boolean
): { newScore: number; improvement: number; worthwhile: boolean } {
  let potentialGain = 0;

  // Hours improvement
  const hoursGain = Math.min(additionalHours / 3, 15);
  potentialGain += hoursGain;

  // Focus scouting upgrade bonus
  if (upgradingToFocus) {
    potentialGain += 20;
  }

  const newScore = Math.min(100, currentConfidence.score + potentialGain);
  const improvement = newScore - currentConfidence.score;

  // Determine if worthwhile (>10 point improvement)
  const worthwhile = improvement >= 10;

  return { newScore, improvement, worthwhile };
}

/**
 * Validates a confidence object
 */
export function validateConfidence(confidence: ReportConfidence): boolean {
  if (confidence.score < 0 || confidence.score > 100) {
    return false;
  }

  const validLevels: ReportConfidence['level'][] = ['low', 'medium', 'high'];
  if (!validLevels.includes(confidence.level)) {
    return false;
  }

  return true;
}

/**
 * Calculates enhanced confidence with all adjustments
 */
export function calculateEnhancedConfidence(
  scout: Scout,
  reportType: ReportType,
  scoutingHours: number,
  prospectRegion: string,
  prospectPosition: Position,
  tendencyProfile?: ScoutTendencyProfile,
  config: ConfidenceConfig = DEFAULT_CONFIDENCE_CONFIG
): ReportConfidence {
  // Base scores
  const baseScore = calculateBaseConfidence(scout.attributes.evaluation);
  const timeScore = calculateTimeConfidence(scoutingHours, reportType);

  // Calculate adjustments
  const adjustment = calculateConfidenceAdjustment(
    scout,
    prospectRegion,
    prospectPosition,
    tendencyProfile,
    config
  );

  // Weighted calculation
  const rawScore =
    baseScore * config.scoutEvaluationWeight +
    timeScore * config.scoutingHoursWeight +
    (reportType === 'focus' ? 40 : 20) * config.baseConfidenceWeight;

  // Apply adjustments
  const adjustedScore = rawScore * adjustment.totalMultiplier;
  const finalScore = Math.max(0, Math.min(100, Math.round(adjustedScore)));

  // Determine level
  let level: ReportConfidence['level'];
  if (finalScore >= 70) {
    level = 'high';
  } else if (finalScore >= 40) {
    level = 'medium';
  } else {
    level = 'low';
  }

  // Generate factors
  const factors: ConfidenceFactor[] = [];

  // Scout evaluation factor
  if (scout.attributes.evaluation >= 80) {
    factors.push({
      factor: 'Scout Quality',
      impact: 'positive',
      description: 'Elite evaluator',
    });
  } else if (scout.attributes.evaluation >= 60) {
    factors.push({
      factor: 'Scout Quality',
      impact: 'neutral',
      description: 'Experienced evaluator',
    });
  } else {
    factors.push({
      factor: 'Scout Quality',
      impact: 'negative',
      description: 'Developing evaluator',
    });
  }

  // Time factor
  if (scoutingHours >= 30) {
    factors.push({
      factor: 'Scouting Time',
      impact: 'positive',
      description: `${scoutingHours} hours invested`,
    });
  } else if (scoutingHours >= 10) {
    factors.push({
      factor: 'Scouting Time',
      impact: 'neutral',
      description: `${scoutingHours} hours invested`,
    });
  } else {
    factors.push({
      factor: 'Scouting Time',
      impact: 'negative',
      description: 'Limited evaluation time',
    });
  }

  // Report type factor
  factors.push({
    factor: 'Report Depth',
    impact: reportType === 'focus' ? 'positive' : 'negative',
    description: reportType === 'focus' ? 'Full evaluation completed' : 'Preliminary scout only',
  });

  // Region bonus
  if (adjustment.regionKnowledgeBonus > 0) {
    factors.push({
      factor: 'Regional Knowledge',
      impact: 'positive',
      description: 'Scout has familiarity with region',
    });
  }

  // Position specialty
  if (adjustment.positionSpecialtyBonus > 0) {
    factors.push({
      factor: 'Position Expertise',
      impact: 'positive',
      description: `Scout specializes in ${prospectPosition}`,
    });
  }

  // Tendency impact
  if (tendencyProfile && tendencyProfile.overallTendency !== 'neutral') {
    factors.push({
      factor: 'Scout Tendency',
      impact: 'negative',
      description: `Scout tends to be ${tendencyProfile.overallTendency}`,
    });
  }

  return { level, score: finalScore, factors };
}
