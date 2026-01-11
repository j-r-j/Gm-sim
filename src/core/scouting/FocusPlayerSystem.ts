/**
 * Focus Player System
 * Provides deep evaluation for selected prospects with narrower skill ranges and more insights
 */

import { Scout, MAX_FOCUS_PROSPECTS, MIN_FOCUS_PROSPECTS } from '../models/staff/Scout';
import { Position } from '../models/player/Position';
import { SkillRange, ProspectData } from './AutoScoutingSystem';

/**
 * Character trait assessment
 */
export interface CharacterAssessment {
  workEthic: 'elite' | 'good' | 'average' | 'concerns' | 'unknown';
  leadership: 'captain' | 'leader' | 'follower' | 'loner' | 'unknown';
  coachability: 'excellent' | 'good' | 'average' | 'difficult' | 'unknown';
  maturity: 'mature' | 'developing' | 'immature' | 'unknown';
  competitiveness: 'fierce' | 'competitive' | 'passive' | 'unknown';
  notes: string[];
}

/**
 * Medical assessment
 */
export interface MedicalAssessment {
  overallGrade: 'clean' | 'minor_concerns' | 'moderate_concerns' | 'major_concerns' | 'unknown';
  injuryHistory: string[];
  durabilityProjection: 'ironman' | 'durable' | 'average' | 'fragile' | 'unknown';
  redFlags: string[];
  clearances: string[];
}

/**
 * Scheme fit analysis
 */
export interface SchemeFitAnalysis {
  offensiveSchemes: Record<string, 'excellent' | 'good' | 'average' | 'poor'>;
  defensiveSchemes: Record<string, 'excellent' | 'good' | 'average' | 'poor'>;
  bestFitScheme: string;
  worstFitScheme: string;
  versatility: 'high' | 'medium' | 'low';
}

/**
 * Interview insights
 */
export interface InterviewInsights {
  footballIQ: 'elite' | 'high' | 'average' | 'low' | 'unknown';
  communication: 'excellent' | 'good' | 'average' | 'poor' | 'unknown';
  motivation: string;
  concerns: string[];
  positives: string[];
}

/**
 * Focus scouting report (detailed information)
 */
export interface FocusScoutingReport {
  prospectId: string;
  prospectName: string;
  position: Position;
  scoutId: string;
  reportDate: number;

  // Basic info
  height: string;
  weight: number;
  college: string;

  // Narrow skill ranges (focus scouting benefit)
  overallRange: SkillRange;
  physicalRange: SkillRange;
  technicalRange: SkillRange;

  // Detailed position-specific skills
  positionSkills: Record<string, SkillRange>;

  // All traits visible
  allTraits: string[];
  traitAnalysis: Record<string, string>; // Trait name -> analysis

  // Character assessment
  character: CharacterAssessment;

  // Medical deep dive
  medical: MedicalAssessment;

  // Scheme fit
  schemeFit: SchemeFitAnalysis;

  // Interview insights
  interview: InterviewInsights;

  // Draft projection (narrow range)
  projectedRound: { min: number; max: number };
  projectedPick: { early: boolean; mid: boolean; late: boolean };

  // Comparison
  playerComparison: string; // "Reminds me of..."
  ceiling: string;
  floor: string;

  // Flags
  isFocusScouted: true;
  scoutConfidence: 'high' | 'medium' | 'low';
  totalScoutingHours: number;
}

/**
 * Focus scouting configuration
 */
export interface FocusScoutingConfig {
  skillRangeWidth: number; // Default: 10 points (narrower than auto)
  roundRangeWidth: number; // Default: 1 round
  weeksToComplete: number; // Default: 2-4 weeks
}

/**
 * Default focus scouting configuration
 */
export const DEFAULT_FOCUS_SCOUTING_CONFIG: FocusScoutingConfig = {
  skillRangeWidth: 10,
  roundRangeWidth: 1,
  weeksToComplete: 3,
};

/**
 * Extended prospect data for focus scouting
 */
export interface ExtendedProspectData extends ProspectData {
  // Hidden character values
  trueWorkEthic: number; // 1-100
  trueLeadership: number;
  trueCoachability: number;
  trueMaturity: number;
  trueCompetitiveness: number;

  // Hidden medical data
  injuryHistory: string[];
  durabilityRating: number; // 1-100

  // Hidden football IQ
  footballIQ: number; // 1-100

  // Scheme fit ratings (hidden)
  schemeFits: Record<string, number>; // 1-100

  // Player comparison and projections
  comparison: string;
  ceiling: string;
  floor: string;
}

/**
 * Focus scouting progress
 */
export interface FocusScoutingProgress {
  prospectId: string;
  scoutId: string;
  weeksCompleted: number;
  weeksTotal: number;
  currentPhase: 'initial' | 'film' | 'interviews' | 'medical' | 'final';
  partialReport: Partial<FocusScoutingReport> | null;
}

/**
 * Maximum focus prospects based on scout experience
 */
export function getMaxFocusProspects(scoutExperience: number): number {
  if (scoutExperience >= 10) return MAX_FOCUS_PROSPECTS; // 5
  if (scoutExperience >= 5) return 4;
  return MIN_FOCUS_PROSPECTS; // 3
}

/**
 * Calculates skill range for focus scouting (narrower than auto)
 */
export function calculateFocusSkillRange(
  trueValue: number,
  scoutEvaluation: number,
  config: FocusScoutingConfig = DEFAULT_FOCUS_SCOUTING_CONFIG
): SkillRange {
  // Focus scouting has much narrower ranges
  const skillFactor = 1 - scoutEvaluation / 100;
  const rangeWidth = Math.round(config.skillRangeWidth * (0.6 + skillFactor * 0.4));

  // Less randomness for focus scouting (more time spent)
  const centerOffset = Math.round((Math.random() - 0.5) * rangeWidth * 0.2);
  const center = trueValue + centerOffset;

  const min = Math.max(1, center - Math.floor(rangeWidth / 2));
  const max = Math.min(100, center + Math.ceil(rangeWidth / 2));

  // Confidence is higher for focus scouting
  let confidence: SkillRange['confidence'];
  if (scoutEvaluation >= 60) {
    confidence = 'high';
  } else if (scoutEvaluation >= 30) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return { min, max, confidence };
}

/**
 * Calculates projected round range for focus scouting
 */
export function calculateFocusRoundRange(
  trueRound: number,
  scoutEvaluation: number,
  config: FocusScoutingConfig = DEFAULT_FOCUS_SCOUTING_CONFIG
): { min: number; max: number } {
  const skillFactor = 1 - scoutEvaluation / 100;
  const roundOffset = Math.round(config.roundRangeWidth * (0.5 + skillFactor * 0.5));

  // Less randomness
  const centerOffset = Math.round((Math.random() - 0.5) * roundOffset * 0.3);
  const center = trueRound + centerOffset;

  const min = Math.max(1, center - roundOffset);
  const max = Math.min(7, center + roundOffset);

  return { min, max };
}

/**
 * Generates character assessment from hidden values
 */
export function generateCharacterAssessment(
  prospect: ExtendedProspectData,
  scoutEvaluation: number
): CharacterAssessment {
  const accuracy = scoutEvaluation / 100;

  // Add some noise based on scout accuracy
  const noise = () => (Math.random() - 0.5) * (1 - accuracy) * 30;

  const perceivedWorkEthic = Math.max(1, Math.min(100, prospect.trueWorkEthic + noise()));
  const perceivedLeadership = Math.max(1, Math.min(100, prospect.trueLeadership + noise()));
  const perceivedCoachability = Math.max(1, Math.min(100, prospect.trueCoachability + noise()));
  const perceivedMaturity = Math.max(1, Math.min(100, prospect.trueMaturity + noise()));
  const perceivedCompetitiveness = Math.max(
    1,
    Math.min(100, prospect.trueCompetitiveness + noise())
  );

  const notes: string[] = [];

  // Generate qualitative assessments
  const workEthic = ratingToWorkEthic(perceivedWorkEthic);
  const leadership = ratingToLeadership(perceivedLeadership);
  const coachability = ratingToCoachability(perceivedCoachability);
  const maturity = ratingToMaturity(perceivedMaturity);
  const competitiveness = ratingToCompetitiveness(perceivedCompetitiveness);

  // Add notes based on standout traits
  if (perceivedWorkEthic >= 85) notes.push('First one in, last one out');
  if (perceivedLeadership >= 85) notes.push('Natural leader in the locker room');
  if (perceivedCoachability >= 85) notes.push('Extremely receptive to coaching');
  if (perceivedWorkEthic < 40) notes.push('Questions about dedication');
  if (perceivedMaturity < 40) notes.push('Some maturity concerns reported');

  return {
    workEthic,
    leadership,
    coachability,
    maturity,
    competitiveness,
    notes,
  };
}

function ratingToWorkEthic(rating: number): CharacterAssessment['workEthic'] {
  if (rating >= 85) return 'elite';
  if (rating >= 65) return 'good';
  if (rating >= 45) return 'average';
  return 'concerns';
}

function ratingToLeadership(rating: number): CharacterAssessment['leadership'] {
  if (rating >= 85) return 'captain';
  if (rating >= 65) return 'leader';
  if (rating >= 45) return 'follower';
  return 'loner';
}

function ratingToCoachability(rating: number): CharacterAssessment['coachability'] {
  if (rating >= 80) return 'excellent';
  if (rating >= 60) return 'good';
  if (rating >= 40) return 'average';
  return 'difficult';
}

function ratingToMaturity(rating: number): CharacterAssessment['maturity'] {
  if (rating >= 70) return 'mature';
  if (rating >= 40) return 'developing';
  return 'immature';
}

function ratingToCompetitiveness(rating: number): CharacterAssessment['competitiveness'] {
  if (rating >= 80) return 'fierce';
  if (rating >= 50) return 'competitive';
  return 'passive';
}

/**
 * Generates medical assessment
 */
export function generateMedicalAssessment(
  prospect: ExtendedProspectData,
  _scoutEvaluation: number
): MedicalAssessment {
  const redFlags: string[] = [];
  const clearances: string[] = [];

  // Based on durability rating and injury history
  let overallGrade: MedicalAssessment['overallGrade'];
  if (prospect.durabilityRating >= 85 && prospect.injuryHistory.length === 0) {
    overallGrade = 'clean';
    clearances.push('No significant injury history');
  } else if (prospect.durabilityRating >= 65 && prospect.injuryHistory.length <= 1) {
    overallGrade = 'minor_concerns';
    if (prospect.injuryHistory.length > 0) {
      redFlags.push(`History: ${prospect.injuryHistory[0]}`);
    }
  } else if (prospect.durabilityRating >= 45) {
    overallGrade = 'moderate_concerns';
    for (const injury of prospect.injuryHistory.slice(0, 2)) {
      redFlags.push(`History: ${injury}`);
    }
  } else {
    overallGrade = 'major_concerns';
    for (const injury of prospect.injuryHistory) {
      redFlags.push(`History: ${injury}`);
    }
    redFlags.push('Long-term durability questions');
  }

  // Durability projection
  let durabilityProjection: MedicalAssessment['durabilityProjection'];
  if (prospect.durabilityRating >= 90) {
    durabilityProjection = 'ironman';
    clearances.push('Excellent physical durability');
  } else if (prospect.durabilityRating >= 70) {
    durabilityProjection = 'durable';
  } else if (prospect.durabilityRating >= 50) {
    durabilityProjection = 'average';
  } else {
    durabilityProjection = 'fragile';
    redFlags.push('Injury-prone concerns');
  }

  return {
    overallGrade,
    injuryHistory: prospect.injuryHistory,
    durabilityProjection,
    redFlags,
    clearances,
  };
}

/**
 * Generates scheme fit analysis
 */
export function generateSchemeFitAnalysis(
  prospect: ExtendedProspectData,
  scoutEvaluation: number
): SchemeFitAnalysis {
  const offensiveSchemes: Record<string, 'excellent' | 'good' | 'average' | 'poor'> = {};
  const defensiveSchemes: Record<string, 'excellent' | 'good' | 'average' | 'poor'> = {};

  let bestFitScheme = '';
  let worstFitScheme = '';
  let bestFitRating = 0;
  let worstFitRating = 100;

  // Add some noise based on scout evaluation
  const noise = () => (Math.random() - 0.5) * (1 - scoutEvaluation / 100) * 20;

  for (const [scheme, rating] of Object.entries(prospect.schemeFits)) {
    const perceived = Math.max(1, Math.min(100, rating + noise()));
    const grade = ratingToSchemeFit(perceived);

    if (scheme.startsWith('offense_')) {
      offensiveSchemes[scheme.replace('offense_', '')] = grade;
    } else if (scheme.startsWith('defense_')) {
      defensiveSchemes[scheme.replace('defense_', '')] = grade;
    }

    if (perceived > bestFitRating) {
      bestFitRating = perceived;
      bestFitScheme = scheme.replace('offense_', '').replace('defense_', '');
    }
    if (perceived < worstFitRating) {
      worstFitRating = perceived;
      worstFitScheme = scheme.replace('offense_', '').replace('defense_', '');
    }
  }

  // Calculate versatility
  const ratings = Object.values(prospect.schemeFits);
  const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  const variance = ratings.reduce((sum, r) => sum + Math.pow(r - avgRating, 2), 0) / ratings.length;

  let versatility: SchemeFitAnalysis['versatility'];
  if (variance < 100) {
    versatility = 'high';
  } else if (variance < 300) {
    versatility = 'medium';
  } else {
    versatility = 'low';
  }

  return {
    offensiveSchemes,
    defensiveSchemes,
    bestFitScheme,
    worstFitScheme,
    versatility,
  };
}

function ratingToSchemeFit(rating: number): 'excellent' | 'good' | 'average' | 'poor' {
  if (rating >= 80) return 'excellent';
  if (rating >= 60) return 'good';
  if (rating >= 40) return 'average';
  return 'poor';
}

/**
 * Generates interview insights
 */
export function generateInterviewInsights(
  prospect: ExtendedProspectData,
  scoutEvaluation: number
): InterviewInsights {
  const concerns: string[] = [];
  const positives: string[] = [];

  // Football IQ
  const noise = () => (Math.random() - 0.5) * (1 - scoutEvaluation / 100) * 25;
  const perceivedIQ = Math.max(1, Math.min(100, prospect.footballIQ + noise()));

  let footballIQ: InterviewInsights['footballIQ'];
  if (perceivedIQ >= 90) {
    footballIQ = 'elite';
    positives.push('Exceptional football mind');
  } else if (perceivedIQ >= 70) {
    footballIQ = 'high';
    positives.push('Strong understanding of the game');
  } else if (perceivedIQ >= 50) {
    footballIQ = 'average';
  } else {
    footballIQ = 'low';
    concerns.push('May take time to learn playbook');
  }

  // Communication based on various factors
  let communication: InterviewInsights['communication'];
  const commScore = (prospect.trueLeadership + prospect.trueMaturity) / 2;
  if (commScore >= 80) {
    communication = 'excellent';
    positives.push('Articulate and confident');
  } else if (commScore >= 60) {
    communication = 'good';
  } else if (commScore >= 40) {
    communication = 'average';
  } else {
    communication = 'poor';
    concerns.push('Struggled to express thoughts clearly');
  }

  // Motivation
  let motivation: string;
  if (prospect.trueWorkEthic >= 80 && prospect.trueCompetitiveness >= 80) {
    motivation = 'Highly driven to be the best';
  } else if (prospect.trueWorkEthic >= 60) {
    motivation = 'Wants to prove himself at the next level';
  } else {
    motivation = 'Focused on reaching the NFL';
  }

  // Add character-related concerns/positives
  if (prospect.trueCoachability < 50) {
    concerns.push('May resist coaching adjustments');
  }
  if (prospect.trueMaturity < 50) {
    concerns.push('Still maturing as a person and player');
  }
  if (prospect.trueWorkEthic >= 80) {
    positives.push('Known as a gym rat');
  }

  return {
    footballIQ,
    communication,
    motivation,
    concerns,
    positives,
  };
}

/**
 * Generates a full focus scouting report
 */
export function generateFocusScoutingReport(
  prospect: ExtendedProspectData,
  scout: Scout,
  reportDate: number,
  config: FocusScoutingConfig = DEFAULT_FOCUS_SCOUTING_CONFIG
): FocusScoutingReport {
  const scoutEvaluation = scout.attributes.evaluation;

  // Calculate narrow skill ranges
  const overallRange = calculateFocusSkillRange(prospect.trueOverall, scoutEvaluation, config);
  const physicalRange = calculateFocusSkillRange(prospect.truePhysical, scoutEvaluation, config);
  const technicalRange = calculateFocusSkillRange(prospect.trueTechnical, scoutEvaluation, config);

  // Generate position-specific skills (placeholder - would come from detailed prospect data)
  const positionSkills: Record<string, SkillRange> = {};

  // All traits are visible for focus scouting
  const traitAnalysis: Record<string, string> = {};
  for (const trait of prospect.allTraits) {
    traitAnalysis[trait] = `Detailed analysis of ${trait} trait based on film study and interviews`;
  }

  // Generate detailed assessments
  const character = generateCharacterAssessment(prospect, scoutEvaluation);
  const medical = generateMedicalAssessment(prospect, scoutEvaluation);
  const schemeFit = generateSchemeFitAnalysis(prospect, scoutEvaluation);
  const interview = generateInterviewInsights(prospect, scoutEvaluation);

  // Projected round (narrower than auto)
  const projectedRound = calculateFocusRoundRange(prospect.projectedRound, scoutEvaluation, config);

  // Determine draft position within round
  const projectedPick = {
    early: prospect.projectedRound <= 2,
    mid: prospect.projectedRound >= 2 && prospect.projectedRound <= 5,
    late: prospect.projectedRound >= 4,
  };

  // Scout confidence
  let scoutConfidence: FocusScoutingReport['scoutConfidence'];
  if (scoutEvaluation >= 75) {
    scoutConfidence = 'high';
  } else if (scoutEvaluation >= 50) {
    scoutConfidence = 'medium';
  } else {
    scoutConfidence = 'low';
  }

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
    positionSkills,

    allTraits: prospect.allTraits,
    traitAnalysis,

    character,
    medical,
    schemeFit,
    interview,

    projectedRound,
    projectedPick,

    playerComparison: prospect.comparison,
    ceiling: prospect.ceiling,
    floor: prospect.floor,

    isFocusScouted: true,
    scoutConfidence,
    totalScoutingHours: config.weeksToComplete * 15, // ~15 hours per week
  };
}

/**
 * Cross-references multiple focus reports to narrow ranges further
 */
export function crossReferenceFocusReports(
  reports: FocusScoutingReport[]
): FocusScoutingReport | null {
  if (reports.length === 0) return null;
  if (reports.length === 1) return reports[0];

  // Use most recent as base
  const sorted = [...reports].sort((a, b) => b.reportDate - a.reportDate);
  const base = sorted[0];

  // Average and narrow skill ranges
  const narrowedOverall = narrowSkillRanges(reports.map((r) => r.overallRange));
  const narrowedPhysical = narrowSkillRanges(reports.map((r) => r.physicalRange));
  const narrowedTechnical = narrowSkillRanges(reports.map((r) => r.technicalRange));
  const narrowedRound = narrowRoundRanges(reports.map((r) => r.projectedRound));

  // Aggregate character notes
  const allNotes = new Set<string>();
  for (const report of reports) {
    for (const note of report.character.notes) {
      allNotes.add(note);
    }
  }

  // Aggregate medical info
  const allRedFlags = new Set<string>();
  const allClearances = new Set<string>();
  for (const report of reports) {
    for (const flag of report.medical.redFlags) allRedFlags.add(flag);
    for (const clearance of report.medical.clearances) allClearances.add(clearance);
  }

  return {
    ...base,
    overallRange: narrowedOverall,
    physicalRange: narrowedPhysical,
    technicalRange: narrowedTechnical,
    projectedRound: narrowedRound,
    character: {
      ...base.character,
      notes: Array.from(allNotes),
    },
    medical: {
      ...base.medical,
      redFlags: Array.from(allRedFlags),
      clearances: Array.from(allClearances),
    },
    scoutConfidence: 'high', // Multiple reports = high confidence
    totalScoutingHours: reports.reduce((sum, r) => sum + r.totalScoutingHours, 0),
  };
}

function narrowSkillRanges(ranges: SkillRange[]): SkillRange {
  const avgMin = ranges.reduce((sum, r) => sum + r.min, 0) / ranges.length;
  const avgMax = ranges.reduce((sum, r) => sum + r.max, 0) / ranges.length;

  // Multiple reports significantly narrow the range
  const narrowFactor = 0.6;
  const center = (avgMin + avgMax) / 2;
  const halfWidth = ((avgMax - avgMin) / 2) * narrowFactor;

  return {
    min: Math.max(1, Math.round(center - halfWidth)),
    max: Math.min(100, Math.round(center + halfWidth)),
    confidence: 'high',
  };
}

function narrowRoundRanges(ranges: { min: number; max: number }[]): { min: number; max: number } {
  const avgMin = ranges.reduce((sum, r) => sum + r.min, 0) / ranges.length;
  const avgMax = ranges.reduce((sum, r) => sum + r.max, 0) / ranges.length;

  // Multiple reports can lock in the round
  const center = (avgMin + avgMax) / 2;

  return {
    min: Math.max(1, Math.round(center)),
    max: Math.min(7, Math.round(center) + 1),
  };
}

/**
 * Validates focus player assignment
 */
export function canAssignFocusPlayer(scout: Scout, prospectId: string): boolean {
  const maxFocus = getMaxFocusProspects(scout.attributes.experience);

  // Check if already at max
  if (scout.focusProspects.length >= maxFocus) {
    return false;
  }

  // Check if already focusing on this prospect
  if (scout.focusProspects.includes(prospectId)) {
    return false;
  }

  return true;
}

/**
 * Validates a focus scouting report
 */
export function validateFocusScoutingReport(report: FocusScoutingReport): boolean {
  // Check required fields
  if (!report.prospectId || !report.prospectName || !report.scoutId) {
    return false;
  }

  // Check skill ranges
  const validateRange = (range: SkillRange): boolean =>
    range.min >= 1 && range.max <= 100 && range.min <= range.max;

  if (!validateRange(report.overallRange)) return false;
  if (!validateRange(report.physicalRange)) return false;
  if (!validateRange(report.technicalRange)) return false;

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
