/**
 * Pro Day Simulator
 * Simulates individual pro day workouts for prospects who didn't attend
 * the combine or want to improve their numbers.
 */

import { Position } from '../models/player/Position';
import { PhysicalAttributes } from '../models/player/PhysicalAttributes';
import { randomInt, clampedNormal, chance } from '../generators/utils/RandomUtils';
import { Prospect, WorkoutStatus, updateProDayStatus } from './Prospect';
import { CollegeProgram } from './CollegeProgramGenerator';
import { CombineWorkoutResults, OfficialMeasurements, CombineResults } from './CombineSimulator';

/**
 * Pro Day workout type
 */
export enum ProDayType {
  FULL_WORKOUT = 'FULL_WORKOUT', // All drills
  POSITION_WORKOUT = 'POSITION_WORKOUT', // Position-specific only
  INDIVIDUAL_WORKOUT = 'INDIVIDUAL_WORKOUT', // Private workout
  MEDICAL_ONLY = 'MEDICAL_ONLY', // Medical rechecks
}

/**
 * Team attendance at pro day
 */
export interface ProDayAttendance {
  teamId: string;
  /** Scout tier who attended */
  attendeeLevel: 'director' | 'area_scout' | 'regional_scout';
  /** Whether team requested private workout */
  privateWorkoutRequested: boolean;
}

/**
 * Position-specific workout results
 */
export interface PositionWorkoutResults {
  /** QB-specific: Throwing accuracy tests */
  throwingAccuracy?: {
    shortPasses: number; // Completion %
    mediumPasses: number;
    deepPasses: number;
    onTheMove: number;
  };
  /** RB/WR/TE: Route running and catching */
  receivingDrills?: {
    catchRate: number;
    routeRunning: number; // 1-10 grade
    handsGrade: number; // 1-10 grade
  };
  /** OL: Blocking drills */
  blockingDrills?: {
    passSet: number; // 1-10 grade
    runBlocking: number;
    pullAndTrap: number;
  };
  /** DL: Pass rush drills */
  passRushDrills?: {
    getOff: number; // 1-10 grade
    handUsage: number;
    bendsAroundEdge: number;
  };
  /** DB: Coverage drills */
  coverageDrills?: {
    backpedal: number; // 1-10 grade
    hipFlip: number;
    ballSkills: number;
  };
}

/**
 * Pro Day results for a prospect
 */
export interface ProDayResults {
  /** Prospect ID */
  prospectId: string;
  /** College program ID */
  collegeProgramId: string;
  /** Type of workout */
  workoutType: ProDayType;
  /** Official measurements */
  measurements: OfficialMeasurements | null;
  /** Athletic testing results */
  workoutResults: CombineWorkoutResults | null;
  /** Position-specific drill results */
  positionWorkouts: PositionWorkoutResults | null;
  /** Teams in attendance */
  attendance: ProDayAttendance[];
  /** Overall impression grade (1-10) */
  overallGrade: number;
  /** Notable observations */
  observations: string[];
  /** Date of pro day */
  date: number;
}

/**
 * Pro Day configuration
 */
export interface ProDayConfig {
  /** Whether to improve on combine numbers (retest bonus) */
  allowRetests: boolean;
  /** Average number of teams attending */
  avgTeamAttendance: number;
}

/**
 * Default pro day configuration
 */
export const DEFAULT_PRO_DAY_CONFIG: ProDayConfig = {
  allowRetests: true,
  avgTeamAttendance: 18,
};

/**
 * Generates official measurements at pro day
 */
function generateProDayMeasurements(physical: PhysicalAttributes): OfficialMeasurements {
  // Pro day measurements are the same as combine (official height/weight)
  return {
    height: physical.height,
    weight: physical.weight,
    armLength: physical.armLength,
    handSize: physical.handSize,
    wingspan: Math.round((physical.armLength * 2 + physical.height * 0.15) * 10) / 10,
  };
}

/**
 * Simulates workout results at pro day
 * Can sometimes improve on combine numbers due to familiar environment
 */
function simulateProDayWorkouts(
  physical: PhysicalAttributes,
  position: Position,
  combineResults?: CombineWorkoutResults | null
): CombineWorkoutResults {
  // Calculate base performance from athleticism
  // Convert speed (40 time: lower is better) to a 1-100 scale for averaging
  const speedRating = Math.max(0, Math.min(100, ((5.5 - physical.speed) * 100) / 1.3));
  const athleticBase =
    (speedRating + physical.acceleration + physical.agility + physical.strength) / 4;
  const performanceModifier = (athleticBase - 50) / 50;

  // Home field advantage - slight improvement potential (0-3%)
  const homeBonus = 1 + Math.random() * 0.03;

  // Position-specific benchmarks (simplified)
  const posGroup = getPositionGroup(position);

  const baseForty = getBaseForty(posGroup) - performanceModifier * 0.15;
  const baseBench = getBaseBench(posGroup) + (physical.strength - 50) * 0.2;
  const baseVert = getBaseVert(posGroup) + performanceModifier * 3;
  const baseBroad = getBaseBroad(posGroup) + performanceModifier * 6;

  // If combine results exist, potentially improve
  let fortyYardDash = clampedNormal(
    baseForty / homeBonus,
    0.06,
    baseForty - 0.15,
    baseForty + 0.15
  );
  let benchPress = Math.round(
    clampedNormal(baseBench * homeBonus, 3, baseBench - 5, baseBench + 8)
  );
  let verticalJump =
    Math.round(clampedNormal(baseVert * homeBonus, 2, baseVert - 3, baseVert + 4) * 10) / 10;
  let broadJump = Math.round(clampedNormal(baseBroad * homeBonus, 4, baseBroad - 5, baseBroad + 8));

  // If retesting, potentially beat combine numbers
  if (combineResults) {
    if (combineResults.fortyYardDash && fortyYardDash > combineResults.fortyYardDash) {
      // 40% chance to beat combine time when retesting
      if (chance(0.4)) {
        fortyYardDash = combineResults.fortyYardDash - Math.random() * 0.05;
      }
    }
  }

  return {
    fortyYardDash: Math.round(fortyYardDash * 100) / 100,
    benchPress,
    verticalJump,
    broadJump,
    twentyYardShuttle: clampedNormal(4.2 - performanceModifier * 0.1, 0.08, 3.9, 4.6),
    threeConeDrill: clampedNormal(7.0 - performanceModifier * 0.1, 0.1, 6.5, 7.6),
    sixtyYardShuttle: chance(0.5) ? clampedNormal(11.3, 0.25, 10.5, 12.2) : null,
  };
}

/**
 * Gets position group for workout generation
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
    case Position.P:
      return 'ST';
  }
}

// Position group baseline values
function getBaseForty(posGroup: string): number {
  const bases: Record<string, number> = {
    QB: 4.85,
    RB: 4.52,
    WR: 4.48,
    TE: 4.72,
    OL: 5.2,
    DL: 4.9,
    LB: 4.65,
    DB: 4.48,
    ST: 5.0,
  };
  return bases[posGroup] || 4.8;
}

function getBaseBench(posGroup: string): number {
  const bases: Record<string, number> = {
    QB: 15,
    RB: 18,
    WR: 13,
    TE: 20,
    OL: 26,
    DL: 26,
    LB: 22,
    DB: 13,
    ST: 10,
  };
  return bases[posGroup] || 18;
}

function getBaseVert(posGroup: string): number {
  const bases: Record<string, number> = {
    QB: 30,
    RB: 35,
    WR: 37,
    TE: 34,
    OL: 27,
    DL: 30,
    LB: 34,
    DB: 38,
    ST: 28,
  };
  return bases[posGroup] || 32;
}

function getBaseBroad(posGroup: string): number {
  const bases: Record<string, number> = {
    QB: 108,
    RB: 118,
    WR: 122,
    TE: 114,
    OL: 100,
    DL: 108,
    LB: 116,
    DB: 122,
    ST: 102,
  };
  return bases[posGroup] || 112;
}

/**
 * Generates position-specific workout results
 */
function generatePositionWorkouts(position: Position): PositionWorkoutResults {
  const posGroup = getPositionGroup(position);

  switch (posGroup) {
    case 'QB':
      return {
        throwingAccuracy: {
          shortPasses: clampedNormal(75, 10, 50, 95),
          mediumPasses: clampedNormal(70, 12, 45, 92),
          deepPasses: clampedNormal(55, 15, 30, 85),
          onTheMove: clampedNormal(65, 12, 40, 88),
        },
      };
    case 'RB':
    case 'WR':
    case 'TE':
      return {
        receivingDrills: {
          catchRate: clampedNormal(85, 10, 60, 100),
          routeRunning: Math.round(clampedNormal(7, 1.5, 4, 10) * 10) / 10,
          handsGrade: Math.round(clampedNormal(7, 1.5, 4, 10) * 10) / 10,
        },
      };
    case 'OL':
      return {
        blockingDrills: {
          passSet: Math.round(clampedNormal(7, 1.2, 4, 10) * 10) / 10,
          runBlocking: Math.round(clampedNormal(7, 1.2, 4, 10) * 10) / 10,
          pullAndTrap: Math.round(clampedNormal(6.5, 1.5, 3, 10) * 10) / 10,
        },
      };
    case 'DL':
      return {
        passRushDrills: {
          getOff: Math.round(clampedNormal(7, 1.3, 4, 10) * 10) / 10,
          handUsage: Math.round(clampedNormal(6.8, 1.4, 4, 10) * 10) / 10,
          bendsAroundEdge: Math.round(clampedNormal(6.5, 1.5, 3, 10) * 10) / 10,
        },
      };
    case 'DB':
    case 'LB':
      return {
        coverageDrills: {
          backpedal: Math.round(clampedNormal(7, 1.2, 4, 10) * 10) / 10,
          hipFlip: Math.round(clampedNormal(6.8, 1.3, 4, 10) * 10) / 10,
          ballSkills: Math.round(clampedNormal(7, 1.4, 4, 10) * 10) / 10,
        },
      };
    default:
      return {};
  }
}

/**
 * Generates team attendance at pro day
 */
function generateProDayAttendance(
  college: CollegeProgram,
  prospectValue: number,
  config: ProDayConfig
): ProDayAttendance[] {
  const attendance: ProDayAttendance[] = [];

  // Higher prospect value = more teams attend
  const baseAttendance = config.avgTeamAttendance;
  const valueModifier = prospectValue / 50; // 0-2 range
  const numTeams = Math.min(
    32,
    Math.max(5, Math.round(baseAttendance * valueModifier * (0.8 + Math.random() * 0.4)))
  );

  for (let i = 0; i < numTeams; i++) {
    const teamId = `team-${randomInt(1, 32)}`;

    // Avoid duplicate teams
    if (attendance.some((a) => a.teamId === teamId)) continue;

    // Higher value prospects get higher-level scouts
    const attendeeLevel = weightedAttendeeLevel(prospectValue);

    attendance.push({
      teamId,
      attendeeLevel,
      privateWorkoutRequested: chance(0.15 * valueModifier),
    });
  }

  return attendance;
}

/**
 * Gets weighted attendee level based on prospect value
 */
function weightedAttendeeLevel(
  prospectValue: number
): 'director' | 'area_scout' | 'regional_scout' {
  const roll = Math.random() * 100;
  const directorChance = prospectValue * 0.3;
  const areaScoutChance = prospectValue * 0.5;

  if (roll < directorChance) return 'director';
  if (roll < directorChance + areaScoutChance) return 'area_scout';
  return 'regional_scout';
}

/**
 * Generates observations from pro day
 */
function generateObservations(
  prospect: Prospect,
  workoutResults: CombineWorkoutResults,
  positionWorkouts: PositionWorkoutResults
): string[] {
  const observations: string[] = [];

  // Athletic observations
  if (workoutResults.fortyYardDash && workoutResults.fortyYardDash < 4.45) {
    observations.push('Elite straight-line speed on display');
  }
  if (workoutResults.verticalJump && workoutResults.verticalJump > 38) {
    observations.push('Explosive vertical leap');
  }
  if (workoutResults.benchPress && workoutResults.benchPress > 28) {
    observations.push('Exceptional strength numbers');
  }

  // Position-specific observations
  if (positionWorkouts.throwingAccuracy) {
    if (positionWorkouts.throwingAccuracy.deepPasses > 70) {
      observations.push('Impressive deep ball accuracy');
    }
    if (positionWorkouts.throwingAccuracy.onTheMove > 75) {
      observations.push('Shows ability to throw on the run');
    }
  }

  if (positionWorkouts.receivingDrills) {
    if (positionWorkouts.receivingDrills.handsGrade > 8) {
      observations.push('Natural hands, catches everything');
    }
    if (positionWorkouts.receivingDrills.routeRunning > 8) {
      observations.push('Crisp route runner');
    }
  }

  if (positionWorkouts.blockingDrills) {
    if (positionWorkouts.blockingDrills.passSet > 8) {
      observations.push('Quick feet in pass protection');
    }
  }

  if (positionWorkouts.passRushDrills) {
    if (positionWorkouts.passRushDrills.getOff > 8) {
      observations.push('Explosive first step');
    }
    if (positionWorkouts.passRushDrills.bendsAroundEdge > 8) {
      observations.push('Excellent bend and flexibility');
    }
  }

  if (positionWorkouts.coverageDrills) {
    if (positionWorkouts.coverageDrills.ballSkills > 8) {
      observations.push('Natural ball skills, playmaker');
    }
  }

  // Add a random general observation
  const generalObservations = [
    'Looked comfortable in workout environment',
    'Good energy and focus throughout',
    'Engaged well with scouts and coaches',
    'Completed all drills without issue',
    'Showed good body control',
  ];
  if (chance(0.5)) {
    observations.push(generalObservations[randomInt(0, generalObservations.length - 1)]);
  }

  return observations;
}

/**
 * Calculates overall pro day grade
 */
function calculateProDayGrade(
  workoutResults: CombineWorkoutResults,
  positionWorkouts: PositionWorkoutResults,
  prospect: Prospect
): number {
  let grade = 5.0; // Base grade

  // Athletic testing impacts
  if (workoutResults.fortyYardDash) {
    if (workoutResults.fortyYardDash < 4.5) grade += 1;
    else if (workoutResults.fortyYardDash > 5.0) grade -= 0.5;
  }

  if (workoutResults.verticalJump) {
    if (workoutResults.verticalJump > 36) grade += 0.5;
    if (workoutResults.verticalJump > 40) grade += 0.5;
  }

  // Position workout impacts
  if (positionWorkouts.throwingAccuracy) {
    const avgAccuracy =
      (positionWorkouts.throwingAccuracy.shortPasses +
        positionWorkouts.throwingAccuracy.mediumPasses +
        positionWorkouts.throwingAccuracy.deepPasses) /
      3;
    grade += (avgAccuracy - 60) / 20;
  }

  if (positionWorkouts.receivingDrills) {
    grade += (positionWorkouts.receivingDrills.handsGrade - 7) * 0.3;
  }

  if (positionWorkouts.blockingDrills) {
    const avgBlock =
      (positionWorkouts.blockingDrills.passSet + positionWorkouts.blockingDrills.runBlocking) / 2;
    grade += (avgBlock - 7) * 0.3;
  }

  // It factor influence
  grade += (prospect.player.itFactor.value - 50) / 50;

  return Math.round(Math.max(1, Math.min(10, grade)) * 10) / 10;
}

/**
 * Simulates pro day for a single prospect
 */
export function simulateProDayForProspect(
  prospect: Prospect,
  college: CollegeProgram,
  combineResults?: CombineResults | null,
  config: ProDayConfig = DEFAULT_PRO_DAY_CONFIG
): ProDayResults {
  // Determine workout type
  const hadCombine = combineResults?.participated || false;
  let workoutType: ProDayType;

  if (!hadCombine) {
    // Full workout if didn't do combine
    workoutType = ProDayType.FULL_WORKOUT;
  } else if (combineResults?.medicalEvaluation?.grade !== 'CLEAN') {
    // Medical recheck if had issues
    workoutType = chance(0.3) ? ProDayType.MEDICAL_ONLY : ProDayType.POSITION_WORKOUT;
  } else {
    // Position drills to showcase
    workoutType = chance(0.7) ? ProDayType.POSITION_WORKOUT : ProDayType.FULL_WORKOUT;
  }

  const measurements = generateProDayMeasurements(prospect.player.physical);

  const workoutResults =
    workoutType === ProDayType.MEDICAL_ONLY
      ? null
      : simulateProDayWorkouts(
          prospect.player.physical,
          prospect.player.position,
          combineResults?.workoutResults
        );

  const positionWorkouts =
    workoutType === ProDayType.MEDICAL_ONLY
      ? null
      : generatePositionWorkouts(prospect.player.position);

  // Calculate prospect value for attendance
  const ceilingOrder = [
    'franchiseCornerstone',
    'highEndStarter',
    'solidStarter',
    'qualityRotational',
    'specialist',
    'depth',
    'practiceSquad',
  ];
  const prospectValue =
    100 -
    ceilingOrder.indexOf(prospect.player.roleFit.ceiling) * 12 +
    prospect.player.itFactor.value * 0.3;

  const attendance = generateProDayAttendance(college, prospectValue, config);

  const observations =
    workoutResults && positionWorkouts
      ? generateObservations(prospect, workoutResults, positionWorkouts)
      : [];

  const overallGrade =
    workoutResults && positionWorkouts
      ? calculateProDayGrade(workoutResults, positionWorkouts, prospect)
      : 5.0;

  return {
    prospectId: prospect.id,
    collegeProgramId: college.id,
    workoutType,
    measurements,
    workoutResults,
    positionWorkouts,
    attendance,
    overallGrade,
    observations,
    date: Date.now(),
  };
}

/**
 * Simulates pro days for all non-combine prospects in a draft class
 */
export interface ProDaySimulationResults {
  /** All pro day results by prospect ID */
  results: Map<string, ProDayResults>;
  /** Updated prospects with pro day status */
  updatedProspects: Prospect[];
  /** Summary statistics */
  summary: ProDaySummary;
}

/**
 * Pro day summary statistics
 */
export interface ProDaySummary {
  totalProDays: number;
  averageGrade: number;
  fullWorkouts: number;
  positionWorkouts: number;
  privateWorkoutsRequested: number;
}

/**
 * Runs pro day simulation for prospects
 */
export function simulateProDays(
  prospects: Prospect[],
  collegePrograms: CollegeProgram[],
  combineResults: Map<string, CombineResults>,
  config: ProDayConfig = DEFAULT_PRO_DAY_CONFIG
): ProDaySimulationResults {
  const results = new Map<string, ProDayResults>();
  const updatedProspects: Prospect[] = [];

  let totalGrade = 0;
  let fullWorkouts = 0;
  let positionWorkouts = 0;
  let privateWorkoutsRequested = 0;

  // Create college program lookup
  const programLookup = new Map(collegePrograms.map((p) => [p.id, p]));

  for (const prospect of prospects) {
    const combineResult = combineResults.get(prospect.id);
    const college = programLookup.get(prospect.collegeProgramId);

    if (!college) {
      updatedProspects.push(prospect);
      continue;
    }

    // Everyone gets a pro day opportunity
    const proDayResult = simulateProDayForProspect(prospect, college, combineResult, config);
    results.set(prospect.id, proDayResult);

    // Update prospect status
    const status =
      proDayResult.workoutType === ProDayType.MEDICAL_ONLY
        ? WorkoutStatus.MEDICAL_ONLY
        : WorkoutStatus.COMPLETED;
    updatedProspects.push(updateProDayStatus(prospect, status));

    // Track stats
    totalGrade += proDayResult.overallGrade;
    if (proDayResult.workoutType === ProDayType.FULL_WORKOUT) fullWorkouts++;
    if (proDayResult.workoutType === ProDayType.POSITION_WORKOUT) positionWorkouts++;
    privateWorkoutsRequested += proDayResult.attendance.filter(
      (a) => a.privateWorkoutRequested
    ).length;
  }

  return {
    results,
    updatedProspects,
    summary: {
      totalProDays: prospects.length,
      averageGrade: prospects.length > 0 ? totalGrade / prospects.length : 0,
      fullWorkouts,
      positionWorkouts,
      privateWorkoutsRequested,
    },
  };
}

/**
 * Gets pro day results for a prospect
 */
export function getProDayResultsForProspect(
  results: Map<string, ProDayResults>,
  prospectId: string
): ProDayResults | undefined {
  return results.get(prospectId);
}

/**
 * Validates pro day results
 */
export function validateProDayResults(results: ProDayResults): boolean {
  if (!results.prospectId || typeof results.prospectId !== 'string') return false;
  if (!results.collegeProgramId || typeof results.collegeProgramId !== 'string') return false;
  if (!Object.values(ProDayType).includes(results.workoutType)) return false;
  if (results.overallGrade < 1 || results.overallGrade > 10) return false;
  if (!Array.isArray(results.attendance)) return false;
  if (!Array.isArray(results.observations)) return false;
  return true;
}
