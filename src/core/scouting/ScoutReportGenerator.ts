/**
 * Scout Report Generator
 * Generates unified scout reports based on scouting depth with appropriate information hiding
 */

import { Scout } from '../models/staff/Scout';
import { Position } from '../models/player/Position';
import {
  SkillRange,
  AutoScoutingReport,
  ProspectData,
  DEFAULT_AUTO_SCOUTING_CONFIG,
  calculateAutoScoutSkillRange,
  calculateAutoScoutRoundRange,
  getVisibleTraitsForAutoScouting,
} from './AutoScoutingSystem';
import {
  FocusScoutingReport,
  ExtendedProspectData,
  CharacterAssessment,
  MedicalAssessment,
  SchemeFitAnalysis,
  InterviewInsights,
  DEFAULT_FOCUS_SCOUTING_CONFIG,
  calculateFocusSkillRange,
  calculateFocusRoundRange,
  generateCharacterAssessment,
  generateMedicalAssessment,
  generateSchemeFitAnalysis,
  generateInterviewInsights,
} from './FocusPlayerSystem';

/**
 * Report type enum
 */
export type ReportType = 'auto' | 'focus';

/**
 * Physical measurements for display
 */
export interface PhysicalMeasurements {
  height: string;
  weight: number;
  college: string;
  armLength?: string;
  handSize?: string;
  fortyYardDash?: number;
  verticalJump?: number;
  broadJump?: number;
  threeConeDrill?: number;
  twentyYardShuttle?: number;
}

/**
 * Draft projection with grade
 */
export interface DraftProjection {
  roundMin: number;
  roundMax: number;
  pickRangeDescription: string; // "Early 1st", "Late 2nd", etc.
  overallGrade: string; // "First-round talent", "Day 2 pick", etc.
}

/**
 * Confidence factor breakdown
 */
export interface ConfidenceFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

/**
 * Report confidence
 */
export interface ReportConfidence {
  level: 'low' | 'medium' | 'high';
  score: number; // 0-100
  factors: ConfidenceFactor[];
}

/**
 * Trait info for display
 */
export interface TraitInfo {
  name: string;
  category: 'physical' | 'mental' | 'character' | 'skill';
  analysis?: string;
}

/**
 * Unified scout report
 */
export interface ScoutReport {
  // Identification
  id: string;
  prospectId: string;
  prospectName: string;
  position: Position;
  reportType: ReportType;
  generatedAt: number;
  scoutId: string;
  scoutName: string;

  // Physical measurements (always exact)
  physicalMeasurements: PhysicalMeasurements;

  // Skills (ranges only - never true values)
  skillRanges: {
    overall: SkillRange;
    physical: SkillRange;
    technical: SkillRange;
    positionSpecific?: Record<string, SkillRange>;
  };

  // Traits (visibility based on report type)
  visibleTraits: TraitInfo[];
  hiddenTraitCount: number;

  // Draft projection
  draftProjection: DraftProjection;

  // Confidence
  confidence: ReportConfidence;

  // Focus-only fields (undefined for auto reports)
  characterAssessment?: CharacterAssessment;
  medicalAssessment?: MedicalAssessment;
  schemeFitAnalysis?: SchemeFitAnalysis;
  interviewInsights?: InterviewInsights;

  // Focus-only comparisons
  playerComparison?: string;
  ceiling?: string;
  floor?: string;

  // Flags
  needsMoreScouting: boolean;
  scoutingHours: number;
}

/**
 * Display-formatted report for UI
 */
export interface DisplayReport {
  header: {
    playerName: string;
    position: string;
    college: string;
    reportType: string;
    scoutName: string;
    dateGenerated: string;
  };
  physical: {
    measurements: string[];
    combineResults?: string[];
  };
  skills: {
    overall: string;
    physical: string;
    technical: string;
    positionSpecific?: string[];
  };
  traits: {
    visible: string[];
    hiddenCount: number;
    message: string;
  };
  projection: {
    round: string;
    grade: string;
    confidence: string;
  };
  detailedAnalysis?: {
    character?: string[];
    medical?: string[];
    schemeFit?: string[];
    interview?: string[];
    comparison?: string;
    ceilingFloor?: string;
  };
  recommendation: string;
}

/**
 * Report generation configuration
 */
export interface ReportGenerationConfig {
  autoSkillRangeWidth: number;
  focusSkillRangeWidth: number;
  autoTraitRevealPercent: number;
  focusTraitRevealPercent: number;
  autoRoundRangeWidth: number;
  focusRoundRangeWidth: number;
}

/**
 * Default report generation configuration
 */
export const DEFAULT_REPORT_CONFIG: ReportGenerationConfig = {
  autoSkillRangeWidth: 25,
  focusSkillRangeWidth: 10,
  autoTraitRevealPercent: 0.3,
  focusTraitRevealPercent: 1.0,
  autoRoundRangeWidth: 2,
  focusRoundRangeWidth: 1,
};

/**
 * Generates a unique report ID
 */
export function generateReportId(prospectId: string, scoutId: string, timestamp: number): string {
  return `report-${prospectId}-${scoutId}-${timestamp}`;
}

/**
 * Calculates draft projection from round range
 */
export function calculateDraftProjection(
  roundRange: { min: number; max: number },
  confidence: ReportConfidence
): DraftProjection {
  const avgRound = (roundRange.min + roundRange.max) / 2;

  // Pick range description
  let pickRangeDescription: string;
  if (roundRange.min === 1 && roundRange.max === 1) {
    if (confidence.level === 'high') {
      pickRangeDescription = 'Round 1';
    } else {
      pickRangeDescription = 'Round 1-2';
    }
  } else if (roundRange.max <= 2) {
    pickRangeDescription = `Round ${roundRange.min}-${roundRange.max}`;
  } else if (roundRange.max <= 3) {
    pickRangeDescription = 'Day 2 (Rounds 2-3)';
  } else if (roundRange.max <= 5) {
    pickRangeDescription = `Round ${roundRange.min}-${roundRange.max}`;
  } else {
    pickRangeDescription = 'Day 3 (Rounds 4-7)';
  }

  // Overall grade description
  let overallGrade: string;
  if (avgRound <= 1.5) {
    overallGrade = 'First-round talent';
  } else if (avgRound <= 2.5) {
    overallGrade = 'Day 1-2 pick';
  } else if (avgRound <= 3.5) {
    overallGrade = 'Day 2 pick';
  } else if (avgRound <= 5) {
    overallGrade = 'Mid-round prospect';
  } else if (avgRound <= 6) {
    overallGrade = 'Late-round flier';
  } else {
    overallGrade = 'Priority free agent';
  }

  return {
    roundMin: roundRange.min,
    roundMax: roundRange.max,
    pickRangeDescription,
    overallGrade,
  };
}

/**
 * Generates confidence factors based on scouting depth and scout quality
 */
export function generateConfidenceFactors(
  scoutEvaluation: number,
  reportType: ReportType,
  scoutingHours: number
): ConfidenceFactor[] {
  const factors: ConfidenceFactor[] = [];

  // Scout evaluation factor
  if (scoutEvaluation >= 80) {
    factors.push({
      factor: 'Scout Experience',
      impact: 'positive',
      description: 'Highly experienced evaluator',
    });
  } else if (scoutEvaluation >= 60) {
    factors.push({
      factor: 'Scout Experience',
      impact: 'neutral',
      description: 'Competent evaluator',
    });
  } else {
    factors.push({
      factor: 'Scout Experience',
      impact: 'negative',
      description: 'Developing evaluator',
    });
  }

  // Report type factor
  if (reportType === 'focus') {
    factors.push({
      factor: 'Scouting Depth',
      impact: 'positive',
      description: 'In-depth evaluation completed',
    });
  } else {
    factors.push({
      factor: 'Scouting Depth',
      impact: 'negative',
      description: 'Limited observation time',
    });
  }

  // Scouting hours factor
  if (scoutingHours >= 30) {
    factors.push({
      factor: 'Time Invested',
      impact: 'positive',
      description: `${scoutingHours}+ hours of film study`,
    });
  } else if (scoutingHours >= 10) {
    factors.push({
      factor: 'Time Invested',
      impact: 'neutral',
      description: `${scoutingHours} hours of evaluation`,
    });
  } else {
    factors.push({
      factor: 'Time Invested',
      impact: 'negative',
      description: 'Brief evaluation only',
    });
  }

  return factors;
}

/**
 * Calculates report confidence
 */
export function calculateReportConfidence(
  scoutEvaluation: number,
  reportType: ReportType,
  scoutingHours: number
): ReportConfidence {
  // Base score from scout evaluation (0-40 points)
  let score = (scoutEvaluation / 100) * 40;

  // Report type bonus (0-30 points)
  if (reportType === 'focus') {
    score += 30;
  } else {
    score += 10;
  }

  // Scouting hours bonus (0-30 points)
  const hoursFactor = Math.min(scoutingHours / 45, 1);
  score += hoursFactor * 30;

  // Clamp score
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine level
  let level: ReportConfidence['level'];
  if (score >= 70) {
    level = 'high';
  } else if (score >= 40) {
    level = 'medium';
  } else {
    level = 'low';
  }

  const factors = generateConfidenceFactors(scoutEvaluation, reportType, scoutingHours);

  return { level, score, factors };
}

/**
 * Converts traits to TraitInfo objects
 */
export function convertTraitsToInfo(traits: string[], includeAnalysis: boolean): TraitInfo[] {
  return traits.map((trait) => {
    // Categorize trait
    const lowerTrait = trait.toLowerCase();
    let category: TraitInfo['category'] = 'skill';

    if (
      lowerTrait.includes('speed') ||
      lowerTrait.includes('athletic') ||
      lowerTrait.includes('strong') ||
      lowerTrait.includes('fast') ||
      lowerTrait.includes('agile') ||
      lowerTrait.includes('size')
    ) {
      category = 'physical';
    } else if (
      lowerTrait.includes('leader') ||
      lowerTrait.includes('work') ||
      lowerTrait.includes('competitive') ||
      lowerTrait.includes('character')
    ) {
      category = 'character';
    } else if (
      lowerTrait.includes('iq') ||
      lowerTrait.includes('smart') ||
      lowerTrait.includes('decision') ||
      lowerTrait.includes('instinct')
    ) {
      category = 'mental';
    }

    const info: TraitInfo = {
      name: trait,
      category,
    };

    if (includeAnalysis) {
      info.analysis = `Detailed analysis based on film study and interviews for ${trait}`;
    }

    return info;
  });
}

/**
 * Generates an auto-scout report
 */
export function generateAutoScoutReport(
  prospect: ProspectData,
  scout: Scout,
  timestamp: number,
  config: ReportGenerationConfig = DEFAULT_REPORT_CONFIG
): ScoutReport {
  const scoutEvaluation = scout.attributes.evaluation;

  // Auto-scouting config
  const autoConfig = {
    ...DEFAULT_AUTO_SCOUTING_CONFIG,
    skillRangeWidth: config.autoSkillRangeWidth,
    traitRevealPercent: config.autoTraitRevealPercent,
    roundRangeWidth: config.autoRoundRangeWidth,
  };

  // Calculate skill ranges (wide)
  const overallRange = calculateAutoScoutSkillRange(
    prospect.trueOverall,
    scoutEvaluation,
    autoConfig
  );
  const physicalRange = calculateAutoScoutSkillRange(
    prospect.truePhysical,
    scoutEvaluation,
    autoConfig
  );
  const technicalRange = calculateAutoScoutSkillRange(
    prospect.trueTechnical,
    scoutEvaluation,
    autoConfig
  );

  // Calculate round range
  const roundRange = calculateAutoScoutRoundRange(
    prospect.projectedRound,
    scoutEvaluation,
    autoConfig
  );

  // Get visible traits (limited for auto)
  const { visible: visibleTraitNames, hiddenCount } = getVisibleTraitsForAutoScouting(
    prospect.allTraits,
    scoutEvaluation,
    autoConfig
  );

  const visibleTraits = convertTraitsToInfo(visibleTraitNames, false);

  // Calculate confidence (low for auto)
  const scoutingHours = 3; // Auto-scouting is brief
  const confidence = calculateReportConfidence(scoutEvaluation, 'auto', scoutingHours);

  // Calculate draft projection
  const draftProjection = calculateDraftProjection(roundRange, confidence);

  // Determine if more scouting needed
  const avgSkillEstimate = (overallRange.min + overallRange.max) / 2;
  const needsMoreScouting = avgSkillEstimate >= 65 || roundRange.max <= 3;

  return {
    id: generateReportId(prospect.id, scout.id, timestamp),
    prospectId: prospect.id,
    prospectName: prospect.name,
    position: prospect.position,
    reportType: 'auto',
    generatedAt: timestamp,
    scoutId: scout.id,
    scoutName: `${scout.firstName} ${scout.lastName}`,

    physicalMeasurements: {
      height: prospect.height,
      weight: prospect.weight,
      college: prospect.college,
    },

    skillRanges: {
      overall: overallRange,
      physical: physicalRange,
      technical: technicalRange,
    },

    visibleTraits,
    hiddenTraitCount: hiddenCount,

    draftProjection,
    confidence,

    needsMoreScouting,
    scoutingHours,
  };
}

/**
 * Generates a focus scouting report
 */
export function generateFocusScoutReport(
  prospect: ExtendedProspectData,
  scout: Scout,
  timestamp: number,
  weeksSpent: number = 3,
  config: ReportGenerationConfig = DEFAULT_REPORT_CONFIG
): ScoutReport {
  const scoutEvaluation = scout.attributes.evaluation;

  // Focus scouting config
  const focusConfig = {
    ...DEFAULT_FOCUS_SCOUTING_CONFIG,
    skillRangeWidth: config.focusSkillRangeWidth,
    roundRangeWidth: config.focusRoundRangeWidth,
  };

  // Calculate skill ranges (narrow)
  const overallRange = calculateFocusSkillRange(prospect.trueOverall, scoutEvaluation, focusConfig);
  const physicalRange = calculateFocusSkillRange(
    prospect.truePhysical,
    scoutEvaluation,
    focusConfig
  );
  const technicalRange = calculateFocusSkillRange(
    prospect.trueTechnical,
    scoutEvaluation,
    focusConfig
  );

  // Calculate round range
  const roundRange = calculateFocusRoundRange(
    prospect.projectedRound,
    scoutEvaluation,
    focusConfig
  );

  // All traits visible for focus scouting
  const visibleTraits = convertTraitsToInfo(prospect.allTraits, true);

  // Calculate confidence (higher for focus)
  const scoutingHours = weeksSpent * 15; // ~15 hours per week
  const confidence = calculateReportConfidence(scoutEvaluation, 'focus', scoutingHours);

  // Calculate draft projection
  const draftProjection = calculateDraftProjection(roundRange, confidence);

  // Generate detailed assessments
  const characterAssessment = generateCharacterAssessment(prospect, scoutEvaluation);
  const medicalAssessment = generateMedicalAssessment(prospect, scoutEvaluation);
  const schemeFitAnalysis = generateSchemeFitAnalysis(prospect, scoutEvaluation);
  const interviewInsights = generateInterviewInsights(prospect, scoutEvaluation);

  return {
    id: generateReportId(prospect.id, scout.id, timestamp),
    prospectId: prospect.id,
    prospectName: prospect.name,
    position: prospect.position,
    reportType: 'focus',
    generatedAt: timestamp,
    scoutId: scout.id,
    scoutName: `${scout.firstName} ${scout.lastName}`,

    physicalMeasurements: {
      height: prospect.height,
      weight: prospect.weight,
      college: prospect.college,
    },

    skillRanges: {
      overall: overallRange,
      physical: physicalRange,
      technical: technicalRange,
    },

    visibleTraits,
    hiddenTraitCount: 0, // All traits visible

    draftProjection,
    confidence,

    characterAssessment,
    medicalAssessment,
    schemeFitAnalysis,
    interviewInsights,

    playerComparison: prospect.comparison,
    ceiling: prospect.ceiling,
    floor: prospect.floor,

    needsMoreScouting: false, // Focus scouting is complete
    scoutingHours,
  };
}

/**
 * Formats a skill range for display
 */
export function formatSkillRange(range: SkillRange): string {
  const width = range.max - range.min;
  const midpoint = Math.round((range.min + range.max) / 2);

  if (width <= 6) {
    return `${range.min}-${range.max} (${range.confidence} confidence)`;
  } else if (width <= 15) {
    return `~${midpoint} (${range.min}-${range.max}, ${range.confidence} confidence)`;
  } else {
    return `${range.min}-${range.max} (wide range, ${range.confidence} confidence)`;
  }
}

/**
 * Formats a report for display
 */
export function formatReportForDisplay(report: ScoutReport): DisplayReport {
  const physical = report.physicalMeasurements;

  // Format header
  const header = {
    playerName: report.prospectName,
    position: report.position,
    college: physical.college,
    reportType: report.reportType === 'focus' ? 'In-Depth Report' : 'Preliminary Report',
    scoutName: report.scoutName,
    dateGenerated: new Date(report.generatedAt).toLocaleDateString(),
  };

  // Format physical measurements
  const measurements: string[] = [`Height: ${physical.height}`, `Weight: ${physical.weight} lbs`];
  if (physical.armLength) measurements.push(`Arm: ${physical.armLength}`);
  if (physical.handSize) measurements.push(`Hand: ${physical.handSize}`);

  const combineResults: string[] = [];
  if (physical.fortyYardDash) combineResults.push(`40: ${physical.fortyYardDash}s`);
  if (physical.verticalJump) combineResults.push(`Vert: ${physical.verticalJump}"`);
  if (physical.broadJump) combineResults.push(`Broad: ${physical.broadJump}"`);
  if (physical.threeConeDrill) combineResults.push(`3-cone: ${physical.threeConeDrill}s`);
  if (physical.twentyYardShuttle) combineResults.push(`Shuttle: ${physical.twentyYardShuttle}s`);

  // Format skills
  const skills = {
    overall: formatSkillRange(report.skillRanges.overall),
    physical: formatSkillRange(report.skillRanges.physical),
    technical: formatSkillRange(report.skillRanges.technical),
    positionSpecific: report.skillRanges.positionSpecific
      ? Object.entries(report.skillRanges.positionSpecific).map(
          ([skill, range]) => `${skill}: ${formatSkillRange(range)}`
        )
      : undefined,
  };

  // Format traits
  const traitMessage =
    report.hiddenTraitCount > 0
      ? `${report.hiddenTraitCount} additional traits require deeper scouting to reveal`
      : 'All traits evaluated';

  const traits = {
    visible: report.visibleTraits.map(
      (t) => `${t.name} (${t.category})${t.analysis ? ` - ${t.analysis}` : ''}`
    ),
    hiddenCount: report.hiddenTraitCount,
    message: traitMessage,
  };

  // Format projection
  const projection = {
    round: report.draftProjection.pickRangeDescription,
    grade: report.draftProjection.overallGrade,
    confidence: `${report.confidence.level.toUpperCase()} (${report.confidence.score}/100)`,
  };

  // Format detailed analysis (focus only)
  let detailedAnalysis: DisplayReport['detailedAnalysis'] | undefined;

  if (report.reportType === 'focus') {
    const character: string[] = [];
    if (report.characterAssessment) {
      const ca = report.characterAssessment;
      character.push(`Work Ethic: ${ca.workEthic}`);
      character.push(`Leadership: ${ca.leadership}`);
      character.push(`Coachability: ${ca.coachability}`);
      character.push(`Maturity: ${ca.maturity}`);
      character.push(`Competitiveness: ${ca.competitiveness}`);
      for (const note of ca.notes) {
        character.push(`Note: ${note}`);
      }
    }

    const medical: string[] = [];
    if (report.medicalAssessment) {
      const ma = report.medicalAssessment;
      medical.push(`Overall Grade: ${ma.overallGrade}`);
      medical.push(`Durability: ${ma.durabilityProjection}`);
      for (const flag of ma.redFlags) {
        medical.push(`Red Flag: ${flag}`);
      }
      for (const clearance of ma.clearances) {
        medical.push(`Clearance: ${clearance}`);
      }
    }

    const schemeFit: string[] = [];
    if (report.schemeFitAnalysis) {
      const sf = report.schemeFitAnalysis;
      schemeFit.push(`Best Fit: ${sf.bestFitScheme}`);
      schemeFit.push(`Worst Fit: ${sf.worstFitScheme}`);
      schemeFit.push(`Versatility: ${sf.versatility}`);
    }

    const interview: string[] = [];
    if (report.interviewInsights) {
      const ii = report.interviewInsights;
      interview.push(`Football IQ: ${ii.footballIQ}`);
      interview.push(`Communication: ${ii.communication}`);
      interview.push(`Motivation: ${ii.motivation}`);
      for (const positive of ii.positives) {
        interview.push(`Positive: ${positive}`);
      }
      for (const concern of ii.concerns) {
        interview.push(`Concern: ${concern}`);
      }
    }

    const comparison = report.playerComparison
      ? `Player Comparison: ${report.playerComparison}`
      : undefined;

    const ceilingFloor =
      report.ceiling && report.floor
        ? `Ceiling: ${report.ceiling} | Floor: ${report.floor}`
        : undefined;

    detailedAnalysis = {
      character: character.length > 0 ? character : undefined,
      medical: medical.length > 0 ? medical : undefined,
      schemeFit: schemeFit.length > 0 ? schemeFit : undefined,
      interview: interview.length > 0 ? interview : undefined,
      comparison,
      ceilingFloor,
    };
  }

  // Generate recommendation
  let recommendation: string;
  if (report.reportType === 'focus') {
    if (report.draftProjection.roundMax <= 2 && report.confidence.level === 'high') {
      recommendation = 'Highly recommended for Day 1-2 consideration';
    } else if (report.draftProjection.roundMax <= 4) {
      recommendation = 'Worth continued tracking as mid-round target';
    } else {
      recommendation = 'Potential late-round value or UDFA signing';
    }
  } else {
    if (report.needsMoreScouting) {
      recommendation = 'Recommend assigning for in-depth focus scouting';
    } else {
      recommendation = 'Monitor through draft process';
    }
  }

  return {
    header,
    physical: {
      measurements,
      combineResults: combineResults.length > 0 ? combineResults : undefined,
    },
    skills,
    traits,
    projection,
    detailedAnalysis,
    recommendation,
  };
}

/**
 * Converts an AutoScoutingReport to a unified ScoutReport
 */
export function convertAutoReportToScoutReport(
  autoReport: AutoScoutingReport,
  scout: Scout,
  timestamp: number
): ScoutReport {
  const confidence = calculateReportConfidence(scout.attributes.evaluation, 'auto', 3);
  const draftProjection = calculateDraftProjection(autoReport.projectedRound, confidence);

  return {
    id: generateReportId(autoReport.prospectId, autoReport.scoutId, timestamp),
    prospectId: autoReport.prospectId,
    prospectName: autoReport.prospectName,
    position: autoReport.position,
    reportType: 'auto',
    generatedAt: timestamp,
    scoutId: autoReport.scoutId,
    scoutName: `${scout.firstName} ${scout.lastName}`,

    physicalMeasurements: {
      height: autoReport.height,
      weight: autoReport.weight,
      college: autoReport.college,
    },

    skillRanges: {
      overall: autoReport.overallRange,
      physical: autoReport.physicalRange,
      technical: autoReport.technicalRange,
    },

    visibleTraits: convertTraitsToInfo(autoReport.visibleTraits, false),
    hiddenTraitCount: autoReport.hiddenTraitCount,

    draftProjection,
    confidence,

    needsMoreScouting: autoReport.needsFocusScouting,
    scoutingHours: 3,
  };
}

/**
 * Converts a FocusScoutingReport to a unified ScoutReport
 */
export function convertFocusReportToScoutReport(
  focusReport: FocusScoutingReport,
  scout: Scout,
  timestamp: number
): ScoutReport {
  const confidence = calculateReportConfidence(
    scout.attributes.evaluation,
    'focus',
    focusReport.totalScoutingHours
  );
  const draftProjection = calculateDraftProjection(focusReport.projectedRound, confidence);

  return {
    id: generateReportId(focusReport.prospectId, focusReport.scoutId, timestamp),
    prospectId: focusReport.prospectId,
    prospectName: focusReport.prospectName,
    position: focusReport.position,
    reportType: 'focus',
    generatedAt: timestamp,
    scoutId: focusReport.scoutId,
    scoutName: `${scout.firstName} ${scout.lastName}`,

    physicalMeasurements: {
      height: focusReport.height,
      weight: focusReport.weight,
      college: focusReport.college,
    },

    skillRanges: {
      overall: focusReport.overallRange,
      physical: focusReport.physicalRange,
      technical: focusReport.technicalRange,
      positionSpecific: focusReport.positionSkills,
    },

    visibleTraits: convertTraitsToInfo(focusReport.allTraits, true),
    hiddenTraitCount: 0,

    draftProjection,
    confidence,

    characterAssessment: focusReport.character,
    medicalAssessment: focusReport.medical,
    schemeFitAnalysis: focusReport.schemeFit,
    interviewInsights: focusReport.interview,

    playerComparison: focusReport.playerComparison,
    ceiling: focusReport.ceiling,
    floor: focusReport.floor,

    needsMoreScouting: false,
    scoutingHours: focusReport.totalScoutingHours,
  };
}

/**
 * Validates a scout report
 */
export function validateScoutReport(report: ScoutReport): boolean {
  // Check required fields
  if (!report.id || !report.prospectId || !report.scoutId) {
    return false;
  }

  // Validate skill ranges
  const validateRange = (range: SkillRange): boolean =>
    range.min >= 1 && range.max <= 100 && range.min <= range.max;

  if (!validateRange(report.skillRanges.overall)) return false;
  if (!validateRange(report.skillRanges.physical)) return false;
  if (!validateRange(report.skillRanges.technical)) return false;

  // Validate draft projection
  if (
    report.draftProjection.roundMin < 1 ||
    report.draftProjection.roundMax > 7 ||
    report.draftProjection.roundMin > report.draftProjection.roundMax
  ) {
    return false;
  }

  // Validate confidence
  if (report.confidence.score < 0 || report.confidence.score > 100) {
    return false;
  }

  return true;
}

/**
 * Gets report quality description
 */
export function getReportQuality(report: ScoutReport): string {
  const overallWidth = report.skillRanges.overall.max - report.skillRanges.overall.min;
  const roundWidth = report.draftProjection.roundMax - report.draftProjection.roundMin;

  if (report.reportType === 'focus') {
    if (overallWidth <= 8 && roundWidth <= 1) {
      return 'Comprehensive evaluation';
    } else {
      return 'Detailed analysis';
    }
  } else {
    if (overallWidth <= 15 && roundWidth <= 1) {
      return 'Strong preliminary report';
    } else if (overallWidth <= 25 && roundWidth <= 2) {
      return 'Standard scouting report';
    } else {
      return 'Initial impression';
    }
  }
}
