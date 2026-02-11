/**
 * Scout Disagreement System
 * Detects conflicting evaluations between scouts on the same prospect
 * and surfaces "split opinion" flags for the draft board.
 */

import { Position } from '../models/player/Position';
import { ScoutReport } from './ScoutReportGenerator';
import { SkillRange } from './AutoScoutingSystem';

/**
 * Disagreement severity
 */
export type DisagreementSeverity = 'minor' | 'moderate' | 'major';

/**
 * Disagreement area
 */
export type DisagreementArea =
  | 'overall_skill'
  | 'physical'
  | 'technical'
  | 'draft_projection'
  | 'character'
  | 'medical';

/**
 * A single disagreement between two scout reports
 */
export interface ScoutDisagreement {
  area: DisagreementArea;
  severity: DisagreementSeverity;
  scoutAId: string;
  scoutAName: string;
  scoutBId: string;
  scoutBName: string;
  scoutAView: string;
  scoutBView: string;
  summary: string;
}

/**
 * Split opinion summary for a prospect
 */
export interface SplitOpinionFlag {
  prospectId: string;
  prospectName: string;
  position: Position;
  hasSplitOpinion: boolean;
  disagreements: ScoutDisagreement[];
  worstSeverity: DisagreementSeverity;
  summary: string;
  scoutCount: number;
  consensusScore: number;
}

/**
 * Configuration for disagreement detection
 */
export interface DisagreementConfig {
  /** Minimum skill range midpoint difference for minor disagreement */
  minorSkillDiff: number;
  /** Minimum skill range midpoint difference for moderate disagreement */
  moderateSkillDiff: number;
  /** Minimum skill range midpoint difference for major disagreement */
  majorSkillDiff: number;
  /** Minimum round difference for projection disagreement */
  minorRoundDiff: number;
  /** Minimum round difference for major projection disagreement */
  majorRoundDiff: number;
}

/**
 * Default disagreement detection thresholds
 */
export const DEFAULT_DISAGREEMENT_CONFIG: DisagreementConfig = {
  minorSkillDiff: 8,
  moderateSkillDiff: 15,
  majorSkillDiff: 25,
  minorRoundDiff: 1,
  majorRoundDiff: 2,
};

/**
 * Calculates the midpoint of a skill range
 */
function rangeMidpoint(range: SkillRange): number {
  return (range.min + range.max) / 2;
}

/**
 * Formats a skill range for display
 */
function formatRange(range: SkillRange): string {
  return `${range.min}-${range.max}`;
}

/**
 * Determines disagreement severity from skill difference
 */
function skillDiffToSeverity(
  diff: number,
  config: DisagreementConfig
): DisagreementSeverity | null {
  if (diff >= config.majorSkillDiff) return 'major';
  if (diff >= config.moderateSkillDiff) return 'moderate';
  if (diff >= config.minorSkillDiff) return 'minor';
  return null;
}

/**
 * Compares two scout reports and finds disagreements
 */
export function findDisagreements(
  reportA: ScoutReport,
  reportB: ScoutReport,
  config: DisagreementConfig = DEFAULT_DISAGREEMENT_CONFIG
): ScoutDisagreement[] {
  const disagreements: ScoutDisagreement[] = [];

  // Compare overall skill ranges
  const overallDiff = Math.abs(
    rangeMidpoint(reportA.skillRanges.overall) - rangeMidpoint(reportB.skillRanges.overall)
  );
  const overallSeverity = skillDiffToSeverity(overallDiff, config);
  if (overallSeverity) {
    const aHigher =
      rangeMidpoint(reportA.skillRanges.overall) > rangeMidpoint(reportB.skillRanges.overall);
    disagreements.push({
      area: 'overall_skill',
      severity: overallSeverity,
      scoutAId: reportA.scoutId,
      scoutAName: reportA.scoutName,
      scoutBId: reportB.scoutId,
      scoutBName: reportB.scoutName,
      scoutAView: `Overall: ${formatRange(reportA.skillRanges.overall)}`,
      scoutBView: `Overall: ${formatRange(reportB.skillRanges.overall)}`,
      summary: `${aHigher ? reportA.scoutName : reportB.scoutName} rates ${reportA.prospectName} significantly higher overall`,
    });
  }

  // Compare physical ranges
  const physicalDiff = Math.abs(
    rangeMidpoint(reportA.skillRanges.physical) - rangeMidpoint(reportB.skillRanges.physical)
  );
  const physicalSeverity = skillDiffToSeverity(physicalDiff, config);
  if (physicalSeverity) {
    disagreements.push({
      area: 'physical',
      severity: physicalSeverity,
      scoutAId: reportA.scoutId,
      scoutAName: reportA.scoutName,
      scoutBId: reportB.scoutId,
      scoutBName: reportB.scoutName,
      scoutAView: `Physical: ${formatRange(reportA.skillRanges.physical)}`,
      scoutBView: `Physical: ${formatRange(reportB.skillRanges.physical)}`,
      summary: `Scouts disagree on physical ability`,
    });
  }

  // Compare technical ranges
  const technicalDiff = Math.abs(
    rangeMidpoint(reportA.skillRanges.technical) - rangeMidpoint(reportB.skillRanges.technical)
  );
  const technicalSeverity = skillDiffToSeverity(technicalDiff, config);
  if (technicalSeverity) {
    disagreements.push({
      area: 'technical',
      severity: technicalSeverity,
      scoutAId: reportA.scoutId,
      scoutAName: reportA.scoutName,
      scoutBId: reportB.scoutId,
      scoutBName: reportB.scoutName,
      scoutAView: `Technical: ${formatRange(reportA.skillRanges.technical)}`,
      scoutBView: `Technical: ${formatRange(reportB.skillRanges.technical)}`,
      summary: `Scouts disagree on technical skills`,
    });
  }

  // Compare draft projections
  const roundMidA = (reportA.draftProjection.roundMin + reportA.draftProjection.roundMax) / 2;
  const roundMidB = (reportB.draftProjection.roundMin + reportB.draftProjection.roundMax) / 2;
  const roundDiff = Math.abs(roundMidA - roundMidB);

  if (roundDiff >= config.majorRoundDiff) {
    disagreements.push({
      area: 'draft_projection',
      severity: 'major',
      scoutAId: reportA.scoutId,
      scoutAName: reportA.scoutName,
      scoutBId: reportB.scoutId,
      scoutBName: reportB.scoutName,
      scoutAView: `Projection: ${reportA.draftProjection.pickRangeDescription}`,
      scoutBView: `Projection: ${reportB.draftProjection.pickRangeDescription}`,
      summary: `Major projection split: ${reportA.scoutName} says "${reportA.draftProjection.overallGrade}" vs ${reportB.scoutName} says "${reportB.draftProjection.overallGrade}"`,
    });
  } else if (roundDiff >= config.minorRoundDiff) {
    disagreements.push({
      area: 'draft_projection',
      severity: 'moderate',
      scoutAId: reportA.scoutId,
      scoutAName: reportA.scoutName,
      scoutBId: reportB.scoutId,
      scoutBName: reportB.scoutName,
      scoutAView: `Projection: ${reportA.draftProjection.pickRangeDescription}`,
      scoutBView: `Projection: ${reportB.draftProjection.pickRangeDescription}`,
      summary: `Projection disagreement between scouts`,
    });
  }

  // Compare character assessments (if both are focus reports)
  if (reportA.characterAssessment && reportB.characterAssessment) {
    const charA = reportA.characterAssessment;
    const charB = reportB.characterAssessment;

    // Compare work ethic and leadership ratings
    const workEthicLevels: Record<string, number> = {
      elite: 4,
      good: 3,
      average: 2,
      concerns: 1,
      unknown: 2,
    };

    const leadershipLevels: Record<string, number> = {
      captain: 4,
      leader: 3,
      follower: 2,
      loner: 1,
      unknown: 2,
    };

    const workEthicDiff = Math.abs(
      (workEthicLevels[charA.workEthic] ?? 2) - (workEthicLevels[charB.workEthic] ?? 2)
    );
    const leadershipDiff = Math.abs(
      (leadershipLevels[charA.leadership] ?? 2) - (leadershipLevels[charB.leadership] ?? 2)
    );

    if (workEthicDiff >= 2 || leadershipDiff >= 2) {
      disagreements.push({
        area: 'character',
        severity: workEthicDiff >= 3 || leadershipDiff >= 3 ? 'major' : 'moderate',
        scoutAId: reportA.scoutId,
        scoutAName: reportA.scoutName,
        scoutBId: reportB.scoutId,
        scoutBName: reportB.scoutName,
        scoutAView: `Work ethic: ${charA.workEthic}, Leadership: ${charA.leadership}`,
        scoutBView: `Work ethic: ${charB.workEthic}, Leadership: ${charB.leadership}`,
        summary: `Character assessment split -- scouts see very different players off the field`,
      });
    }
  }

  // Compare medical assessments (if both are focus reports)
  if (reportA.medicalAssessment && reportB.medicalAssessment) {
    const medA = reportA.medicalAssessment;
    const medB = reportB.medicalAssessment;

    const medLevels: Record<string, number> = {
      clean: 4,
      minor_concerns: 3,
      moderate_concerns: 2,
      major_concerns: 1,
      unknown: 2,
    };

    const medDiff = Math.abs(
      (medLevels[medA.overallGrade] ?? 3) - (medLevels[medB.overallGrade] ?? 3)
    );

    if (medDiff >= 2) {
      disagreements.push({
        area: 'medical',
        severity: medDiff >= 3 ? 'major' : 'moderate',
        scoutAId: reportA.scoutId,
        scoutAName: reportA.scoutName,
        scoutBId: reportB.scoutId,
        scoutBName: reportB.scoutName,
        scoutAView: `Medical: ${medA.overallGrade}`,
        scoutBView: `Medical: ${medB.overallGrade}`,
        summary: `Medical evaluation disagreement -- one scout sees red flags the other doesn't`,
      });
    }
  }

  return disagreements;
}

/**
 * Analyzes all reports for a prospect and produces a split opinion flag
 */
export function analyzeSplitOpinion(
  prospectId: string,
  prospectName: string,
  position: Position,
  reports: ScoutReport[],
  config: DisagreementConfig = DEFAULT_DISAGREEMENT_CONFIG
): SplitOpinionFlag {
  const allDisagreements: ScoutDisagreement[] = [];

  // Compare every pair of reports
  for (let i = 0; i < reports.length; i++) {
    for (let j = i + 1; j < reports.length; j++) {
      const disagreements = findDisagreements(reports[i], reports[j], config);
      allDisagreements.push(...disagreements);
    }
  }

  // Determine worst severity
  let worstSeverity: DisagreementSeverity = 'minor';
  for (const d of allDisagreements) {
    if (d.severity === 'major') {
      worstSeverity = 'major';
      break;
    }
    if (d.severity === 'moderate') {
      worstSeverity = 'moderate';
    }
  }

  // Calculate consensus score (0 = total disagreement, 100 = perfect agreement)
  let consensusScore = 100;
  if (allDisagreements.length > 0) {
    const severityPenalties: Record<DisagreementSeverity, number> = {
      minor: 5,
      moderate: 15,
      major: 30,
    };
    let totalPenalty = 0;
    for (const d of allDisagreements) {
      totalPenalty += severityPenalties[d.severity];
    }
    consensusScore = Math.max(0, 100 - totalPenalty);
  }

  // Generate summary
  let summary: string;
  if (allDisagreements.length === 0) {
    summary = 'Scouts are in agreement on this prospect';
  } else if (worstSeverity === 'major') {
    const majorAreas = allDisagreements
      .filter((d) => d.severity === 'major')
      .map((d) => d.area.replace('_', ' '));
    summary = `SPLIT OPINION: Major disagreements in ${majorAreas.join(', ')}`;
  } else if (worstSeverity === 'moderate') {
    summary = `Mixed reviews -- scouts have different takes on this prospect`;
  } else {
    summary = `Minor differences between scout evaluations`;
  }

  return {
    prospectId,
    prospectName,
    position,
    hasSplitOpinion: allDisagreements.length > 0 && worstSeverity !== 'minor',
    disagreements: allDisagreements,
    worstSeverity,
    summary,
    scoutCount: reports.length,
    consensusScore,
  };
}

/**
 * Batch analyze split opinions for all prospects on a draft board
 */
export function analyzeAllSplitOpinions(
  prospectReports: Map<string, { name: string; position: Position; reports: ScoutReport[] }>,
  config: DisagreementConfig = DEFAULT_DISAGREEMENT_CONFIG
): Map<string, SplitOpinionFlag> {
  const results = new Map<string, SplitOpinionFlag>();

  for (const [prospectId, data] of prospectReports) {
    if (data.reports.length < 2) continue; // Need at least 2 reports to disagree

    const flag = analyzeSplitOpinion(prospectId, data.name, data.position, data.reports, config);
    results.set(prospectId, flag);
  }

  return results;
}

/**
 * Gets the most contentious prospects (highest disagreement)
 */
export function getMostContentiousProspects(
  splitOpinions: Map<string, SplitOpinionFlag>,
  limit: number = 10
): SplitOpinionFlag[] {
  const flags: SplitOpinionFlag[] = [];
  splitOpinions.forEach((flag: SplitOpinionFlag) => {
    if (flag.hasSplitOpinion) {
      flags.push(flag);
    }
  });
  flags.sort((a: SplitOpinionFlag, b: SplitOpinionFlag) => a.consensusScore - b.consensusScore);
  return flags.slice(0, limit);
}

/**
 * Gets the label text for a split opinion severity
 */
export function getSplitOpinionLabel(severity: DisagreementSeverity): string {
  switch (severity) {
    case 'major':
      return 'Split Opinion';
    case 'moderate':
      return 'Mixed Reviews';
    case 'minor':
      return 'Minor Differences';
  }
}

/**
 * Validates a split opinion flag
 */
export function validateSplitOpinionFlag(flag: SplitOpinionFlag): boolean {
  if (!flag.prospectId || typeof flag.prospectId !== 'string') return false;
  if (typeof flag.hasSplitOpinion !== 'boolean') return false;
  if (!Array.isArray(flag.disagreements)) return false;
  if (flag.consensusScore < 0 || flag.consensusScore > 100) return false;
  return true;
}
