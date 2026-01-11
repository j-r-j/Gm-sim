/**
 * Auto-Scouting System
 * Generates basic prospect reports for all players in a scout's assigned region
 */

import { Scout } from '../models/staff/Scout';
import { ScoutRegion, getProspectsPerWeek } from '../models/staff/ScoutAttributes';
import { Position } from '../models/player/Position';

/**
 * Skill range for scouting reports
 */
export interface SkillRange {
  min: number;
  max: number;
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Basic trait visibility levels
 */
export type TraitVisibility = 'hidden' | 'partial' | 'visible';

/**
 * Auto-scouting report (basic information only)
 */
export interface AutoScoutingReport {
  prospectId: string;
  prospectName: string;
  position: Position;
  scoutId: string;
  reportDate: number; // Year/week representation

  // Basic measurements (always visible)
  height: string;
  weight: number;
  college: string;

  // Skill ranges (wide for auto-scouting)
  overallRange: SkillRange;
  physicalRange: SkillRange;
  technicalRange: SkillRange;

  // Limited trait visibility
  visibleTraits: string[]; // Only basic observable traits
  hiddenTraitCount: number;

  // Basic grade (wide range)
  projectedRound: { min: number; max: number };

  // Flags
  isAutoScouted: true;
  needsFocusScouting: boolean;
}

/**
 * Auto-scouting configuration
 */
export interface AutoScoutingConfig {
  skillRangeWidth: number; // Default: 25 points
  traitRevealPercent: number; // Default: 30%
  roundRangeWidth: number; // Default: 2 rounds
}

/**
 * Default auto-scouting configuration
 */
export const DEFAULT_AUTO_SCOUTING_CONFIG: AutoScoutingConfig = {
  skillRangeWidth: 25,
  traitRevealPercent: 0.3,
  roundRangeWidth: 2,
};

/**
 * Prospect data (input for auto-scouting)
 */
export interface ProspectData {
  id: string;
  name: string;
  position: Position;
  region: ScoutRegion;
  college: string;
  height: string;
  weight: number;

  // True values (hidden from user)
  trueOverall: number;
  truePhysical: number;
  trueTechnical: number;
  allTraits: string[];
  projectedRound: number;
}

/**
 * Weekly scouting result
 */
export interface WeeklyScoutingResult {
  scoutId: string;
  week: number;
  year: number;
  prospectsCoversThisWeek: number;
  reportsGenerated: AutoScoutingReport[];
  regionCovered: ScoutRegion;
}

/**
 * Calculates skill range for auto-scouting (wider ranges)
 * Uses scout evaluation attribute to determine range width
 */
export function calculateAutoScoutSkillRange(
  trueValue: number,
  scoutEvaluation: number,
  config: AutoScoutingConfig = DEFAULT_AUTO_SCOUTING_CONFIG
): SkillRange {
  // Base range width varies inversely with scout skill
  // Low skill scouts (1-33): Wide range
  // Mid skill scouts (34-66): Medium range
  // High skill scouts (67-100): Narrower (but still wider than focus scouting)
  const skillFactor = 1 - scoutEvaluation / 100;
  const rangeWidth = Math.round(config.skillRangeWidth * (0.7 + skillFactor * 0.6));

  // Add some randomness to the range center (scouts aren't always accurate)
  const centerOffset = Math.round((Math.random() - 0.5) * rangeWidth * 0.4);
  const center = trueValue + centerOffset;

  const min = Math.max(1, center - Math.floor(rangeWidth / 2));
  const max = Math.min(100, center + Math.ceil(rangeWidth / 2));

  // Confidence based on scout evaluation
  let confidence: SkillRange['confidence'];
  if (scoutEvaluation >= 70) {
    confidence = 'medium';
  } else if (scoutEvaluation >= 40) {
    confidence = 'low';
  } else {
    confidence = 'low';
  }

  return { min, max, confidence };
}

/**
 * Calculates projected round range for auto-scouting
 */
export function calculateAutoScoutRoundRange(
  trueRound: number,
  scoutEvaluation: number,
  config: AutoScoutingConfig = DEFAULT_AUTO_SCOUTING_CONFIG
): { min: number; max: number } {
  const skillFactor = 1 - scoutEvaluation / 100;
  const roundOffset = Math.round(config.roundRangeWidth * (0.5 + skillFactor * 0.5));

  // Add some randomness
  const centerOffset = Math.round((Math.random() - 0.5) * roundOffset);
  const center = trueRound + centerOffset;

  const min = Math.max(1, center - roundOffset);
  const max = Math.min(7, center + roundOffset);

  return { min, max };
}

/**
 * Determines which traits are visible through auto-scouting
 * Only basic/observable traits are revealed
 */
export function getVisibleTraitsForAutoScouting(
  allTraits: string[],
  scoutEvaluation: number,
  config: AutoScoutingConfig = DEFAULT_AUTO_SCOUTING_CONFIG
): { visible: string[]; hiddenCount: number } {
  // Observable traits (physical, on-field behavior)
  const observableTraitPatterns = [
    'speed',
    'size',
    'athletic',
    'strong',
    'fast',
    'quick',
    'agile',
    'physical',
    'tall',
    'short',
    'arm',
    'hands',
    'route',
    'blocking',
  ];

  // Filter to only observable traits
  const observableTraits = allTraits.filter((trait) =>
    observableTraitPatterns.some((pattern) => trait.toLowerCase().includes(pattern))
  );

  // Reveal percentage based on scout evaluation
  const revealPercent = config.traitRevealPercent * (0.5 + (scoutEvaluation / 100) * 0.5);
  const numToReveal = Math.max(1, Math.floor(observableTraits.length * revealPercent));

  // Randomly select traits to reveal
  const shuffled = [...observableTraits].sort(() => Math.random() - 0.5);
  const visible = shuffled.slice(0, numToReveal);

  return {
    visible,
    hiddenCount: allTraits.length - visible.length,
  };
}

/**
 * Generates an auto-scouting report for a prospect
 */
export function generateAutoScoutingReport(
  prospect: ProspectData,
  scout: Scout,
  reportDate: number,
  config: AutoScoutingConfig = DEFAULT_AUTO_SCOUTING_CONFIG
): AutoScoutingReport {
  const scoutEvaluation = scout.attributes.evaluation;

  // Calculate skill ranges (wide for auto-scouting)
  const overallRange = calculateAutoScoutSkillRange(prospect.trueOverall, scoutEvaluation, config);
  const physicalRange = calculateAutoScoutSkillRange(
    prospect.truePhysical,
    scoutEvaluation,
    config
  );
  const technicalRange = calculateAutoScoutSkillRange(
    prospect.trueTechnical,
    scoutEvaluation,
    config
  );

  // Calculate round range
  const projectedRound = calculateAutoScoutRoundRange(
    prospect.projectedRound,
    scoutEvaluation,
    config
  );

  // Determine visible traits
  const { visible: visibleTraits, hiddenCount: hiddenTraitCount } = getVisibleTraitsForAutoScouting(
    prospect.allTraits,
    scoutEvaluation,
    config
  );

  // Determine if focus scouting is needed
  // Flag high-potential prospects for focus scouting
  const avgSkillEstimate = (overallRange.min + overallRange.max) / 2;
  const needsFocusScouting = avgSkillEstimate >= 65 || projectedRound.max <= 3;

  return {
    prospectId: prospect.id,
    prospectName: prospect.name,
    position: prospect.position,
    scoutId: scout.id,
    reportDate,

    height: prospect.height,
    weight: prospect.weight,
    college: prospect.college,

    overallRange,
    physicalRange,
    technicalRange,

    visibleTraits,
    hiddenTraitCount,

    projectedRound,

    isAutoScouted: true,
    needsFocusScouting,
  };
}

/**
 * Processes a week of auto-scouting for a scout
 */
export function processWeeklyAutoScouting(
  scout: Scout,
  prospects: ProspectData[],
  week: number,
  year: number,
  config: AutoScoutingConfig = DEFAULT_AUTO_SCOUTING_CONFIG
): WeeklyScoutingResult {
  // Check if scout has auto-scouting active
  if (!scout.autoScoutingActive) {
    return {
      scoutId: scout.id,
      week,
      year,
      prospectsCoversThisWeek: 0,
      reportsGenerated: [],
      regionCovered: scout.region ?? 'northeast',
    };
  }

  // Get prospects per week based on scout speed
  const prospectsPerWeek = getProspectsPerWeek(scout.attributes);

  // Filter prospects by scout's region (if regional scout)
  const eligibleProspects = scout.region
    ? prospects.filter((p) => p.region === scout.region)
    : prospects;

  // Select prospects to scout this week (random selection for auto-scouting)
  const shuffled = [...eligibleProspects].sort(() => Math.random() - 0.5);
  const selectedProspects = shuffled.slice(0, prospectsPerWeek);

  // Generate reports
  const reportDate = year * 100 + week;
  const reportsGenerated = selectedProspects.map((prospect) =>
    generateAutoScoutingReport(prospect, scout, reportDate, config)
  );

  return {
    scoutId: scout.id,
    week,
    year,
    prospectsCoversThisWeek: selectedProspects.length,
    reportsGenerated,
    regionCovered: scout.region ?? 'northeast',
  };
}

/**
 * Aggregates multiple auto-scouting reports for the same prospect
 * Multiple scouts = slightly narrower ranges
 */
export function aggregateAutoScoutingReports(
  reports: AutoScoutingReport[]
): AutoScoutingReport | null {
  if (reports.length === 0) return null;
  if (reports.length === 1) return reports[0];

  // Use the most recent report as base
  const sorted = [...reports].sort((a, b) => b.reportDate - a.reportDate);
  const base = sorted[0];

  // Average the ranges for narrower estimate
  const avgOverall = averageSkillRanges(reports.map((r) => r.overallRange));
  const avgPhysical = averageSkillRanges(reports.map((r) => r.physicalRange));
  const avgTechnical = averageSkillRanges(reports.map((r) => r.technicalRange));
  const avgRound = averageRoundRanges(reports.map((r) => r.projectedRound));

  // Combine visible traits
  const allVisibleTraits = new Set<string>();
  for (const report of reports) {
    for (const trait of report.visibleTraits) {
      allVisibleTraits.add(trait);
    }
  }

  // More scouts = higher confidence
  const confidence: SkillRange['confidence'] = reports.length >= 3 ? 'high' : 'medium';

  return {
    ...base,
    overallRange: { ...avgOverall, confidence },
    physicalRange: { ...avgPhysical, confidence },
    technicalRange: { ...avgTechnical, confidence },
    projectedRound: avgRound,
    visibleTraits: Array.from(allVisibleTraits),
    hiddenTraitCount: Math.min(...reports.map((r) => r.hiddenTraitCount)),
  };
}

/**
 * Averages skill ranges from multiple reports
 */
function averageSkillRanges(ranges: SkillRange[]): SkillRange {
  const avgMin = Math.round(ranges.reduce((sum, r) => sum + r.min, 0) / ranges.length);
  const avgMax = Math.round(ranges.reduce((sum, r) => sum + r.max, 0) / ranges.length);

  // Multiple reports narrow the range slightly
  const narrowFactor = 0.8;
  const center = (avgMin + avgMax) / 2;
  const halfWidth = ((avgMax - avgMin) / 2) * narrowFactor;

  return {
    min: Math.max(1, Math.round(center - halfWidth)),
    max: Math.min(100, Math.round(center + halfWidth)),
    confidence: 'medium',
  };
}

/**
 * Averages round ranges from multiple reports
 */
function averageRoundRanges(ranges: { min: number; max: number }[]): { min: number; max: number } {
  const avgMin = Math.round(ranges.reduce((sum, r) => sum + r.min, 0) / ranges.length);
  const avgMax = Math.round(ranges.reduce((sum, r) => sum + r.max, 0) / ranges.length);

  // Multiple reports narrow the range slightly
  const narrowFactor = 0.8;
  const center = (avgMin + avgMax) / 2;
  const halfWidth = Math.max(1, ((avgMax - avgMin) / 2) * narrowFactor);

  return {
    min: Math.max(1, Math.round(center - halfWidth)),
    max: Math.min(7, Math.round(center + halfWidth)),
  };
}

/**
 * Validates an auto-scouting report
 */
export function validateAutoScoutingReport(report: AutoScoutingReport): boolean {
  // Check required fields
  if (!report.prospectId || !report.prospectName || !report.scoutId) {
    return false;
  }

  // Check skill ranges are valid
  if (
    report.overallRange.min < 1 ||
    report.overallRange.max > 100 ||
    report.overallRange.min > report.overallRange.max
  ) {
    return false;
  }

  if (
    report.physicalRange.min < 1 ||
    report.physicalRange.max > 100 ||
    report.physicalRange.min > report.physicalRange.max
  ) {
    return false;
  }

  if (
    report.technicalRange.min < 1 ||
    report.technicalRange.max > 100 ||
    report.technicalRange.min > report.technicalRange.max
  ) {
    return false;
  }

  // Check round ranges
  if (
    report.projectedRound.min < 1 ||
    report.projectedRound.max > 7 ||
    report.projectedRound.min > report.projectedRound.max
  ) {
    return false;
  }

  return true;
}

/**
 * Gets the quality description for an auto-scouting report
 */
export function getAutoScoutReportQuality(report: AutoScoutingReport): string {
  const overallWidth = report.overallRange.max - report.overallRange.min;
  const roundWidth = report.projectedRound.max - report.projectedRound.min;

  if (overallWidth <= 15 && roundWidth <= 1) {
    return 'Detailed preliminary report';
  } else if (overallWidth <= 25 && roundWidth <= 2) {
    return 'Basic scouting report';
  } else {
    return 'Initial scouting impression';
  }
}
