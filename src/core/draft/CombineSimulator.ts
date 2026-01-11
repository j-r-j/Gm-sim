/**
 * NFL Combine Simulator
 * Simulates the NFL Scouting Combine with ~330 invites,
 * physical measurements, interview impressions, and medical evaluations.
 */

import { Position } from '../models/player/Position';
import { PhysicalAttributes } from '../models/player/PhysicalAttributes';
import { randomInt, clampedNormal, chance } from '../generators/utils/RandomUtils';
import { Prospect, WorkoutStatus, updateCombineStatus } from './Prospect';
import { DraftClass } from './DraftClassGenerator';

/**
 * Combine workout results
 */
export interface CombineWorkoutResults {
  /** 40-yard dash time (seconds) */
  fortyYardDash: number | null;
  /** Bench press reps (225 lbs) */
  benchPress: number | null;
  /** Vertical jump (inches) */
  verticalJump: number | null;
  /** Broad jump (inches) */
  broadJump: number | null;
  /** 20-yard shuttle (seconds) */
  twentyYardShuttle: number | null;
  /** 3-cone drill (seconds) */
  threeConeDrill: number | null;
  /** 60-yard shuttle (seconds) */
  sixtyYardShuttle: number | null;
}

/**
 * Interview impression from team meetings
 */
export interface InterviewImpression {
  /** Team that conducted interview */
  teamId: string;
  /** Overall impression score (1-10) */
  overallScore: number;
  /** Football IQ assessment (1-10) */
  footballIQ: number;
  /** Character assessment (1-10) */
  character: number;
  /** Communication skills (1-10) */
  communication: number;
  /** Leadership indicators */
  leadershipTraits: boolean;
  /** Red flags noted */
  redFlags: string[];
  /** Interview notes */
  notes: string;
}

/**
 * Medical evaluation results
 */
export interface MedicalEvaluation {
  /** Overall medical grade */
  grade: MedicalGrade;
  /** Injury concerns */
  concerns: MedicalConcern[];
  /** Durability rating (1-100) */
  durabilityRating: number;
  /** Whether player passed physical */
  passedPhysical: boolean;
  /** Flagged conditions */
  flaggedConditions: string[];
}

/**
 * Medical grades
 */
export enum MedicalGrade {
  CLEAN = 'CLEAN',
  MINOR_CONCERNS = 'MINOR_CONCERNS',
  MODERATE_CONCERNS = 'MODERATE_CONCERNS',
  SIGNIFICANT_CONCERNS = 'SIGNIFICANT_CONCERNS',
  FAILED = 'FAILED',
}

/**
 * Medical concern entry
 */
export interface MedicalConcern {
  /** Area of concern */
  area: string;
  /** Severity (1-10) */
  severity: number;
  /** Whether chronic/recurring */
  chronic: boolean;
  /** Recommended follow-up */
  followUp: string | null;
}

/**
 * Complete combine results for a prospect
 */
export interface CombineResults {
  /** Prospect ID */
  prospectId: string;
  /** Whether prospect was invited */
  invited: boolean;
  /** Whether prospect participated */
  participated: boolean;
  /** Official measurements (revealed after combine) */
  measurements: OfficialMeasurements | null;
  /** Workout results */
  workoutResults: CombineWorkoutResults | null;
  /** Interview impressions from teams */
  interviewImpressions: InterviewImpression[];
  /** Medical evaluation */
  medicalEvaluation: MedicalEvaluation | null;
  /** Overall combine performance grade */
  overallGrade: CombineGrade;
}

/**
 * Official measurements taken at combine
 */
export interface OfficialMeasurements {
  /** Height in inches */
  height: number;
  /** Weight in pounds */
  weight: number;
  /** Arm length in inches */
  armLength: number;
  /** Hand size in inches */
  handSize: number;
  /** Wingspan in inches */
  wingspan: number;
}

/**
 * Combine performance grades
 */
export enum CombineGrade {
  EXCEPTIONAL = 'EXCEPTIONAL', // Top 5% performer
  ABOVE_AVERAGE = 'ABOVE_AVERAGE',
  AVERAGE = 'AVERAGE',
  BELOW_AVERAGE = 'BELOW_AVERAGE',
  POOR = 'POOR',
  DID_NOT_PARTICIPATE = 'DID_NOT_PARTICIPATE',
}

/**
 * Combine configuration
 */
export interface CombineConfig {
  /** Maximum invites */
  maxInvites: number;
  /** Minimum elite prospects to invite */
  minEliteInvites: number;
  /** Number of teams conducting interviews */
  teamsInterviewing: number;
}

/**
 * Default combine configuration
 */
export const DEFAULT_COMBINE_CONFIG: CombineConfig = {
  maxInvites: 330,
  minEliteInvites: 50,
  teamsInterviewing: 32,
};

/**
 * Position-specific workout benchmarks (for grading)
 */
interface WorkoutBenchmarks {
  fortyYardDash: { elite: number; average: number; poor: number };
  benchPress: { elite: number; average: number; poor: number };
  verticalJump: { elite: number; average: number; poor: number };
  broadJump: { elite: number; average: number; poor: number };
  twentyYardShuttle: { elite: number; average: number; poor: number };
  threeConeDrill: { elite: number; average: number; poor: number };
}

/**
 * Benchmarks by position group
 */
const POSITION_BENCHMARKS: Record<string, WorkoutBenchmarks> = {
  QB: {
    fortyYardDash: { elite: 4.55, average: 4.85, poor: 5.15 },
    benchPress: { elite: 20, average: 15, poor: 10 },
    verticalJump: { elite: 35, average: 30, poor: 26 },
    broadJump: { elite: 118, average: 108, poor: 100 },
    twentyYardShuttle: { elite: 4.1, average: 4.35, poor: 4.6 },
    threeConeDrill: { elite: 6.9, average: 7.2, poor: 7.5 },
  },
  RB: {
    fortyYardDash: { elite: 4.4, average: 4.55, poor: 4.7 },
    benchPress: { elite: 22, average: 17, poor: 12 },
    verticalJump: { elite: 40, average: 35, poor: 30 },
    broadJump: { elite: 126, average: 116, poor: 106 },
    twentyYardShuttle: { elite: 4.0, average: 4.25, poor: 4.5 },
    threeConeDrill: { elite: 6.7, average: 7.0, poor: 7.3 },
  },
  WR: {
    fortyYardDash: { elite: 4.35, average: 4.5, poor: 4.65 },
    benchPress: { elite: 18, average: 13, poor: 8 },
    verticalJump: { elite: 42, average: 36, poor: 31 },
    broadJump: { elite: 130, average: 120, poor: 110 },
    twentyYardShuttle: { elite: 4.0, average: 4.2, poor: 4.45 },
    threeConeDrill: { elite: 6.6, average: 6.95, poor: 7.25 },
  },
  TE: {
    fortyYardDash: { elite: 4.55, average: 4.75, poor: 4.95 },
    benchPress: { elite: 25, average: 20, poor: 15 },
    verticalJump: { elite: 38, average: 33, poor: 28 },
    broadJump: { elite: 122, average: 112, poor: 102 },
    twentyYardShuttle: { elite: 4.2, average: 4.4, poor: 4.65 },
    threeConeDrill: { elite: 7.0, average: 7.3, poor: 7.6 },
  },
  OL: {
    fortyYardDash: { elite: 5.0, average: 5.25, poor: 5.5 },
    benchPress: { elite: 32, average: 25, poor: 18 },
    verticalJump: { elite: 32, average: 27, poor: 22 },
    broadJump: { elite: 108, average: 98, poor: 88 },
    twentyYardShuttle: { elite: 4.5, average: 4.8, poor: 5.1 },
    threeConeDrill: { elite: 7.5, average: 7.9, poor: 8.3 },
  },
  DL: {
    fortyYardDash: { elite: 4.7, average: 4.95, poor: 5.2 },
    benchPress: { elite: 30, average: 24, poor: 18 },
    verticalJump: { elite: 34, average: 29, poor: 24 },
    broadJump: { elite: 116, average: 106, poor: 96 },
    twentyYardShuttle: { elite: 4.3, average: 4.55, poor: 4.8 },
    threeConeDrill: { elite: 7.2, average: 7.5, poor: 7.9 },
  },
  LB: {
    fortyYardDash: { elite: 4.5, average: 4.7, poor: 4.9 },
    benchPress: { elite: 28, average: 22, poor: 16 },
    verticalJump: { elite: 38, average: 33, poor: 28 },
    broadJump: { elite: 124, average: 114, poor: 104 },
    twentyYardShuttle: { elite: 4.1, average: 4.35, poor: 4.6 },
    threeConeDrill: { elite: 6.9, average: 7.2, poor: 7.5 },
  },
  DB: {
    fortyYardDash: { elite: 4.35, average: 4.5, poor: 4.65 },
    benchPress: { elite: 18, average: 13, poor: 8 },
    verticalJump: { elite: 42, average: 37, poor: 32 },
    broadJump: { elite: 130, average: 120, poor: 110 },
    twentyYardShuttle: { elite: 4.0, average: 4.2, poor: 4.4 },
    threeConeDrill: { elite: 6.6, average: 6.9, poor: 7.2 },
  },
  K: {
    fortyYardDash: { elite: 4.9, average: 5.1, poor: 5.3 },
    benchPress: { elite: 15, average: 10, poor: 5 },
    verticalJump: { elite: 32, average: 28, poor: 24 },
    broadJump: { elite: 108, average: 100, poor: 92 },
    twentyYardShuttle: { elite: 4.4, average: 4.6, poor: 4.8 },
    threeConeDrill: { elite: 7.2, average: 7.5, poor: 7.8 },
  },
  P: {
    fortyYardDash: { elite: 4.9, average: 5.1, poor: 5.3 },
    benchPress: { elite: 15, average: 10, poor: 5 },
    verticalJump: { elite: 32, average: 28, poor: 24 },
    broadJump: { elite: 108, average: 100, poor: 92 },
    twentyYardShuttle: { elite: 4.4, average: 4.6, poor: 4.8 },
    threeConeDrill: { elite: 7.2, average: 7.5, poor: 7.8 },
  },
};

/**
 * Gets position group for benchmarks
 */
function getPositionGroup(position: Position): string {
  switch (position) {
    case Position.QB:
      return 'QB';
    case Position.RB:
      return 'RB';
    case Position.WR:
      return 'WR';
    case Position.TE:
      return 'TE';
    case Position.LT:
    case Position.LG:
    case Position.C:
    case Position.RG:
    case Position.RT:
      return 'OL';
    case Position.DE:
    case Position.DT:
      return 'DL';
    case Position.OLB:
    case Position.ILB:
      return 'LB';
    case Position.CB:
    case Position.FS:
    case Position.SS:
      return 'DB';
    case Position.K:
      return 'K';
    case Position.P:
      return 'P';
  }
}

/**
 * Generates official measurements from physical attributes
 */
function generateOfficialMeasurements(physical: PhysicalAttributes): OfficialMeasurements {
  return {
    height: physical.height,
    weight: physical.weight,
    armLength: physical.armLength,
    handSize: physical.handSize,
    wingspan: Math.round((physical.armLength * 2 + physical.height * 0.15) * 10) / 10,
  };
}

/**
 * Simulates workout results based on physical attributes
 */
function simulateWorkoutResults(
  physical: PhysicalAttributes,
  position: Position
): CombineWorkoutResults {
  const group = getPositionGroup(position);
  const benchmarks = POSITION_BENCHMARKS[group];

  // Base performance influenced by athleticism
  // Convert speed (40 time: lower is better) to a 1-100 scale for averaging
  const speedRating = Math.max(0, Math.min(100, ((5.5 - physical.speed) * 100) / 1.3));
  const athleticBase =
    (speedRating + physical.acceleration + physical.agility + physical.strength) / 4;
  const performanceModifier = (athleticBase - 50) / 50; // -1 to +1 range

  // Some players skip certain drills (10% chance per drill)
  const skipChance = 0.1;

  return {
    fortyYardDash: chance(skipChance)
      ? null
      : clampedNormal(
          benchmarks.fortyYardDash.average - performanceModifier * 0.2,
          0.08,
          benchmarks.fortyYardDash.elite - 0.1,
          benchmarks.fortyYardDash.poor + 0.2
        ),
    benchPress: chance(skipChance)
      ? null
      : Math.round(
          clampedNormal(
            benchmarks.benchPress.average + (physical.strength - 50) * 0.2,
            4,
            benchmarks.benchPress.poor - 5,
            benchmarks.benchPress.elite + 8
          )
        ),
    verticalJump: chance(skipChance)
      ? null
      : Math.round(
          clampedNormal(
            benchmarks.verticalJump.average + performanceModifier * 4,
            3,
            benchmarks.verticalJump.poor - 3,
            benchmarks.verticalJump.elite + 5
          ) * 10
        ) / 10,
    broadJump: chance(skipChance)
      ? null
      : Math.round(
          clampedNormal(
            benchmarks.broadJump.average + performanceModifier * 8,
            5,
            benchmarks.broadJump.poor - 5,
            benchmarks.broadJump.elite + 10
          )
        ),
    twentyYardShuttle: chance(skipChance)
      ? null
      : clampedNormal(
          benchmarks.twentyYardShuttle.average - performanceModifier * 0.15,
          0.1,
          benchmarks.twentyYardShuttle.elite - 0.05,
          benchmarks.twentyYardShuttle.poor + 0.1
        ),
    threeConeDrill: chance(skipChance)
      ? null
      : clampedNormal(
          benchmarks.threeConeDrill.average - performanceModifier * 0.15,
          0.12,
          benchmarks.threeConeDrill.elite - 0.05,
          benchmarks.threeConeDrill.poor + 0.1
        ),
    sixtyYardShuttle: chance(0.3)
      ? null
      : clampedNormal(11.5 - performanceModifier * 0.3, 0.3, 10.5, 12.5),
  };
}

/**
 * Simulates interview impressions
 */
function simulateInterviewImpressions(prospect: Prospect, numTeams: number): InterviewImpression[] {
  const impressions: InterviewImpression[] = [];
  const itFactor = prospect.player.itFactor.value;

  // Base character and IQ influenced by hidden traits and it factor
  const baseCharacter = clampedNormal(7 + (itFactor - 50) / 25, 1.2, 3, 10);
  const baseIQ = clampedNormal(6.5 + (itFactor - 50) / 30, 1.5, 3, 10);

  for (let i = 0; i < numTeams; i++) {
    const teamId = `team-${i + 1}`;

    // Generate red flags (rare)
    const redFlags: string[] = [];
    if (chance(0.05)) redFlags.push('Concerns about work ethic');
    if (chance(0.03)) redFlags.push('Character questions from college');
    if (chance(0.02)) redFlags.push('Off-field incidents');
    if (chance(0.04)) redFlags.push('Maturity concerns');

    impressions.push({
      teamId,
      overallScore: Math.round(clampedNormal((baseCharacter + baseIQ) / 2, 0.8, 3, 10) * 10) / 10,
      footballIQ: Math.round(clampedNormal(baseIQ, 1, 3, 10) * 10) / 10,
      character: Math.round(clampedNormal(baseCharacter, 1, 3, 10) * 10) / 10,
      communication: Math.round(clampedNormal(6.5, 1.5, 3, 10) * 10) / 10,
      leadershipTraits: chance(0.2 + itFactor / 200),
      redFlags,
      notes: generateInterviewNotes(baseCharacter, baseIQ),
    });
  }

  return impressions;
}

/**
 * Generates interview notes
 */
function generateInterviewNotes(character: number, footballIQ: number): string {
  const notes: string[] = [];

  if (footballIQ >= 8) notes.push('Excellent film study habits.');
  else if (footballIQ >= 6) notes.push('Solid understanding of concepts.');
  else notes.push('May need extra time in meeting room.');

  if (character >= 8) notes.push('High character, team-first mentality.');
  else if (character >= 6) notes.push('Good teammate, no concerns.');
  else notes.push('Some maturity questions.');

  return notes.join(' ');
}

/**
 * Simulates medical evaluation
 */
function simulateMedicalEvaluation(prospect: Prospect): MedicalEvaluation {
  const concerns: MedicalConcern[] = [];
  const flaggedConditions: string[] = [];

  // Base durability from injury history
  let baseDurability = 85;
  for (const injury of prospect.collegeStats.injuryHistory) {
    baseDurability -= injury.surgeryRequired ? 8 : 3;
    if (injury.type.includes('ACL')) {
      concerns.push({
        area: 'Knee (ACL)',
        severity: 7,
        chronic: false,
        followUp: 'Follow-up imaging recommended',
      });
      flaggedConditions.push('Previous ACL reconstruction');
    } else if (injury.type.includes('Torn')) {
      concerns.push({
        area: injury.type.replace('Torn ', ''),
        severity: 5,
        chronic: false,
        followUp: 'Monitor for recurrence',
      });
    }
  }

  // Random minor concerns
  if (chance(0.15)) {
    concerns.push({
      area: 'Shoulder',
      severity: randomInt(2, 4),
      chronic: chance(0.3),
      followUp: null,
    });
  }
  if (chance(0.1)) {
    concerns.push({
      area: 'Ankle',
      severity: randomInt(2, 4),
      chronic: chance(0.2),
      followUp: null,
    });
  }

  const durabilityRating = Math.max(40, Math.min(100, baseDurability));
  const maxSeverity = concerns.length > 0 ? Math.max(...concerns.map((c) => c.severity)) : 0;

  let grade: MedicalGrade;
  if (maxSeverity >= 8) {
    grade = MedicalGrade.FAILED;
  } else if (maxSeverity >= 6) {
    grade = MedicalGrade.SIGNIFICANT_CONCERNS;
  } else if (maxSeverity >= 4) {
    grade = MedicalGrade.MODERATE_CONCERNS;
  } else if (concerns.length > 0) {
    grade = MedicalGrade.MINOR_CONCERNS;
  } else {
    grade = MedicalGrade.CLEAN;
  }

  return {
    grade,
    concerns,
    durabilityRating,
    passedPhysical: grade !== MedicalGrade.FAILED,
    flaggedConditions,
  };
}

/**
 * Calculates overall combine grade
 */
function calculateCombineGrade(
  workoutResults: CombineWorkoutResults,
  position: Position,
  medicalEval: MedicalEvaluation
): CombineGrade {
  const group = getPositionGroup(position);
  const benchmarks = POSITION_BENCHMARKS[group];

  let totalScore = 0;
  let tests = 0;

  // Score each workout
  const scoreWorkout = (
    result: number | null,
    benchmark: { elite: number; average: number; poor: number },
    lowerIsBetter: boolean
  ): void => {
    if (result === null) return;
    tests++;

    if (lowerIsBetter) {
      if (result <= benchmark.elite) totalScore += 10;
      else if (result <= benchmark.average) totalScore += 7;
      else if (result <= benchmark.poor) totalScore += 4;
      else totalScore += 2;
    } else {
      if (result >= benchmark.elite) totalScore += 10;
      else if (result >= benchmark.average) totalScore += 7;
      else if (result >= benchmark.poor) totalScore += 4;
      else totalScore += 2;
    }
  };

  scoreWorkout(workoutResults.fortyYardDash, benchmarks.fortyYardDash, true);
  scoreWorkout(workoutResults.benchPress, benchmarks.benchPress, false);
  scoreWorkout(workoutResults.verticalJump, benchmarks.verticalJump, false);
  scoreWorkout(workoutResults.broadJump, benchmarks.broadJump, false);
  scoreWorkout(workoutResults.twentyYardShuttle, benchmarks.twentyYardShuttle, true);
  scoreWorkout(workoutResults.threeConeDrill, benchmarks.threeConeDrill, true);

  if (tests === 0) return CombineGrade.DID_NOT_PARTICIPATE;

  const avgScore = totalScore / tests;

  // Apply medical penalty
  const medicalPenalty =
    medicalEval.grade === MedicalGrade.FAILED
      ? 3
      : medicalEval.grade === MedicalGrade.SIGNIFICANT_CONCERNS
        ? 2
        : medicalEval.grade === MedicalGrade.MODERATE_CONCERNS
          ? 1
          : 0;

  const finalScore = avgScore - medicalPenalty;

  if (finalScore >= 9) return CombineGrade.EXCEPTIONAL;
  if (finalScore >= 7) return CombineGrade.ABOVE_AVERAGE;
  if (finalScore >= 5) return CombineGrade.AVERAGE;
  if (finalScore >= 3) return CombineGrade.BELOW_AVERAGE;
  return CombineGrade.POOR;
}

/**
 * Selects prospects to invite to the combine
 */
export function selectCombineInvites(
  prospects: Prospect[],
  config: CombineConfig = DEFAULT_COMBINE_CONFIG
): Prospect[] {
  // Sort prospects by expected value (role ceiling + it factor)
  const sorted = [...prospects].sort((a, b) => {
    const ceilingOrder = [
      'franchiseCornerstone',
      'highEndStarter',
      'solidStarter',
      'qualityRotational',
      'specialist',
      'depth',
      'practiceSquad',
    ];
    const aCeiling = ceilingOrder.indexOf(a.player.roleFit.ceiling);
    const bCeiling = ceilingOrder.indexOf(b.player.roleFit.ceiling);

    if (aCeiling !== bCeiling) return aCeiling - bCeiling;
    return b.player.itFactor.value - a.player.itFactor.value;
  });

  // Take top prospects up to max invites
  return sorted.slice(0, Math.min(config.maxInvites, prospects.length));
}

/**
 * Simulates the combine for a single prospect
 */
export function simulateCombineForProspect(prospect: Prospect, teamIds: string[]): CombineResults {
  // 5% chance prospect declines
  if (chance(0.05)) {
    return {
      prospectId: prospect.id,
      invited: true,
      participated: false,
      measurements: null,
      workoutResults: null,
      interviewImpressions: [],
      medicalEvaluation: null,
      overallGrade: CombineGrade.DID_NOT_PARTICIPATE,
    };
  }

  // 3% chance medical-only participation
  const medicalOnly = chance(0.03);

  const measurements = generateOfficialMeasurements(prospect.player.physical);
  const workoutResults = medicalOnly
    ? null
    : simulateWorkoutResults(prospect.player.physical, prospect.player.position);
  const medicalEvaluation = simulateMedicalEvaluation(prospect);

  // Select random teams for interviews (each prospect meets with 8-15 teams)
  const numInterviews = randomInt(8, 15);
  const shuffledTeams = [...teamIds].sort(() => Math.random() - 0.5);
  const interviewTeams = shuffledTeams.slice(0, numInterviews);
  const interviewImpressions = simulateInterviewImpressions(prospect, interviewTeams.length);

  const overallGrade = workoutResults
    ? calculateCombineGrade(workoutResults, prospect.player.position, medicalEvaluation)
    : CombineGrade.DID_NOT_PARTICIPATE;

  return {
    prospectId: prospect.id,
    invited: true,
    participated: !medicalOnly,
    measurements,
    workoutResults,
    interviewImpressions,
    medicalEvaluation,
    overallGrade,
  };
}

/**
 * Simulates the entire combine
 */
export interface CombineSimulationResults {
  /** All combine results by prospect ID */
  results: Map<string, CombineResults>;
  /** Updated prospects with combine status */
  updatedProspects: Prospect[];
  /** IDs of invited prospects */
  invitedProspectIds: string[];
  /** Summary statistics */
  summary: CombineSummary;
}

/**
 * Combine summary statistics
 */
export interface CombineSummary {
  totalInvited: number;
  totalParticipated: number;
  gradeDistribution: Record<CombineGrade, number>;
  medicalRedFlags: number;
  averageFortyTime: number | null;
}

/**
 * Runs the complete combine simulation for a draft class
 */
export function simulateCombine(
  draftClass: DraftClass,
  config: CombineConfig = DEFAULT_COMBINE_CONFIG
): CombineSimulationResults {
  const teamIds = Array.from({ length: 32 }, (_, i) => `team-${i + 1}`);

  // Select invites
  const invited = selectCombineInvites(draftClass.prospects, config);
  const invitedIds = new Set(invited.map((p) => p.id));

  const results = new Map<string, CombineResults>();
  const updatedProspects: Prospect[] = [];

  // Grade distribution tracking
  const gradeDistribution: Record<CombineGrade, number> = {
    [CombineGrade.EXCEPTIONAL]: 0,
    [CombineGrade.ABOVE_AVERAGE]: 0,
    [CombineGrade.AVERAGE]: 0,
    [CombineGrade.BELOW_AVERAGE]: 0,
    [CombineGrade.POOR]: 0,
    [CombineGrade.DID_NOT_PARTICIPATE]: 0,
  };

  let totalFortyTime = 0;
  let fortyCount = 0;
  let medicalRedFlags = 0;
  let participatedCount = 0;

  for (const prospect of draftClass.prospects) {
    if (invitedIds.has(prospect.id)) {
      const combineResult = simulateCombineForProspect(prospect, teamIds);
      results.set(prospect.id, combineResult);

      // Update prospect status
      const status = combineResult.participated
        ? WorkoutStatus.COMPLETED
        : combineResult.measurements
          ? WorkoutStatus.MEDICAL_ONLY
          : WorkoutStatus.DECLINED;
      updatedProspects.push(updateCombineStatus(prospect, status));

      // Track statistics
      gradeDistribution[combineResult.overallGrade]++;
      if (combineResult.participated) participatedCount++;
      if (combineResult.workoutResults?.fortyYardDash) {
        totalFortyTime += combineResult.workoutResults.fortyYardDash;
        fortyCount++;
      }
      if (
        combineResult.medicalEvaluation &&
        combineResult.medicalEvaluation.grade === MedicalGrade.SIGNIFICANT_CONCERNS
      ) {
        medicalRedFlags++;
      }
    } else {
      // Not invited
      results.set(prospect.id, {
        prospectId: prospect.id,
        invited: false,
        participated: false,
        measurements: null,
        workoutResults: null,
        interviewImpressions: [],
        medicalEvaluation: null,
        overallGrade: CombineGrade.DID_NOT_PARTICIPATE,
      });
      updatedProspects.push(prospect);
    }
  }

  return {
    results,
    updatedProspects,
    invitedProspectIds: Array.from(invitedIds),
    summary: {
      totalInvited: invited.length,
      totalParticipated: participatedCount,
      gradeDistribution,
      medicalRedFlags,
      averageFortyTime: fortyCount > 0 ? totalFortyTime / fortyCount : null,
    },
  };
}

/**
 * Gets combine results for a prospect
 */
export function getCombineResultsForProspect(
  results: Map<string, CombineResults>,
  prospectId: string
): CombineResults | undefined {
  return results.get(prospectId);
}

/**
 * Validates combine results
 */
export function validateCombineResults(results: CombineResults): boolean {
  if (!results.prospectId || typeof results.prospectId !== 'string') return false;
  if (typeof results.invited !== 'boolean') return false;
  if (typeof results.participated !== 'boolean') return false;
  if (!Object.values(CombineGrade).includes(results.overallGrade)) return false;
  return true;
}
