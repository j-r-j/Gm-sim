/**
 * Combine Phase (Phase 4)
 * Handles NFL Combine, Pro Days, and prospect scouting
 */

import { OffSeasonState, addEvent, completeTask } from '../OffSeasonPhaseManager';

/**
 * Combine drill types
 */
export type CombineDrill =
  | '40_yard_dash'
  | 'vertical_jump'
  | 'broad_jump'
  | 'bench_press'
  | '3_cone_drill'
  | '20_yard_shuttle'
  | 'position_drills';

/**
 * Combine result for a prospect
 */
export interface CombineResult {
  prospectId: string;
  prospectName: string;
  position: string;
  measurements: {
    height: string;
    weight: number;
    armLength: number;
    handSize: number;
    wingspan: number;
  };
  drills: {
    fortyYardDash: number | null;
    verticalJump: number | null;
    broadJump: number | null;
    benchPress: number | null;
    threeConeDrill: number | null;
    twentyYardShuttle: number | null;
  };
  interview: {
    conducted: boolean;
    impression: 'excellent' | 'good' | 'average' | 'concerning' | null;
    notes: string[];
  };
  medical: {
    cleared: boolean;
    concerns: string[];
  };
  overall: {
    athleticScore: number;
    riseOrFall: 'riser' | 'faller' | 'steady';
    projectedRound: number;
  };
}

/**
 * Pro day result
 */
export interface ProDayResult {
  prospectId: string;
  prospectName: string;
  position: string;
  school: string;
  attended: boolean;
  drillResults: {
    drill: CombineDrill;
    result: number;
    improvement: number | null;
  }[];
  notes: string[];
  teamInterest: 'high' | 'medium' | 'low';
}

/**
 * Combine event summary
 */
export interface CombineSummary {
  year: number;
  totalProspects: number;
  topPerformers: CombineResult[];
  risers: CombineResult[];
  fallers: CombineResult[];
  notableInterviews: Array<{
    prospectId: string;
    prospectName: string;
    impression: string;
  }>;
}

/**
 * Position-specific drill weights for athletic scoring
 */
const POSITION_DRILL_WEIGHTS: Record<string, Record<CombineDrill, number>> = {
  QB: {
    '40_yard_dash': 0.15,
    vertical_jump: 0.05,
    broad_jump: 0.05,
    bench_press: 0.05,
    '3_cone_drill': 0.1,
    '20_yard_shuttle': 0.1,
    position_drills: 0.5,
  },
  RB: {
    '40_yard_dash': 0.25,
    vertical_jump: 0.1,
    broad_jump: 0.15,
    bench_press: 0.1,
    '3_cone_drill': 0.15,
    '20_yard_shuttle': 0.15,
    position_drills: 0.1,
  },
  WR: {
    '40_yard_dash': 0.3,
    vertical_jump: 0.15,
    broad_jump: 0.1,
    bench_press: 0.05,
    '3_cone_drill': 0.15,
    '20_yard_shuttle': 0.1,
    position_drills: 0.15,
  },
  TE: {
    '40_yard_dash': 0.15,
    vertical_jump: 0.15,
    broad_jump: 0.1,
    bench_press: 0.15,
    '3_cone_drill': 0.1,
    '20_yard_shuttle': 0.1,
    position_drills: 0.25,
  },
  OL: {
    '40_yard_dash': 0.1,
    vertical_jump: 0.05,
    broad_jump: 0.1,
    bench_press: 0.25,
    '3_cone_drill': 0.15,
    '20_yard_shuttle': 0.15,
    position_drills: 0.2,
  },
  DL: {
    '40_yard_dash': 0.15,
    vertical_jump: 0.1,
    broad_jump: 0.1,
    bench_press: 0.2,
    '3_cone_drill': 0.15,
    '20_yard_shuttle': 0.1,
    position_drills: 0.2,
  },
  LB: {
    '40_yard_dash': 0.2,
    vertical_jump: 0.1,
    broad_jump: 0.15,
    bench_press: 0.15,
    '3_cone_drill': 0.15,
    '20_yard_shuttle': 0.1,
    position_drills: 0.15,
  },
  CB: {
    '40_yard_dash': 0.3,
    vertical_jump: 0.15,
    broad_jump: 0.1,
    bench_press: 0.05,
    '3_cone_drill': 0.15,
    '20_yard_shuttle': 0.1,
    position_drills: 0.15,
  },
  S: {
    '40_yard_dash': 0.25,
    vertical_jump: 0.15,
    broad_jump: 0.1,
    bench_press: 0.1,
    '3_cone_drill': 0.15,
    '20_yard_shuttle': 0.1,
    position_drills: 0.15,
  },
};

/**
 * Drill benchmarks for scoring (higher is better)
 */
const DRILL_BENCHMARKS = {
  '40_yard_dash': { elite: 4.35, good: 4.5, average: 4.65, poor: 4.85 },
  vertical_jump: { elite: 40, good: 36, average: 32, poor: 28 },
  broad_jump: { elite: 130, good: 120, average: 110, poor: 100 },
  bench_press: { elite: 30, good: 24, average: 18, poor: 12 },
  '3_cone_drill': { elite: 6.75, good: 7.0, average: 7.25, poor: 7.5 },
  '20_yard_shuttle': { elite: 4.0, good: 4.2, average: 4.4, poor: 4.6 },
};

/**
 * Calculates drill score (0-100)
 */
export function calculateDrillScore(
  drill: CombineDrill,
  result: number | null,
  _position: string
): number {
  if (result === null) return 50; // Default for missing drills

  const benchmarks = DRILL_BENCHMARKS[drill as keyof typeof DRILL_BENCHMARKS];
  if (!benchmarks) return 50;

  // For time-based drills (lower is better)
  const isTimeDrill = ['40_yard_dash', '3_cone_drill', '20_yard_shuttle'].includes(drill);

  let score: number;
  if (isTimeDrill) {
    if (result <= benchmarks.elite) score = 95;
    else if (result <= benchmarks.good) score = 80;
    else if (result <= benchmarks.average) score = 65;
    else if (result <= benchmarks.poor) score = 45;
    else score = 30;
  } else {
    if (result >= benchmarks.elite) score = 95;
    else if (result >= benchmarks.good) score = 80;
    else if (result >= benchmarks.average) score = 65;
    else if (result >= benchmarks.poor) score = 45;
    else score = 30;
  }

  return score;
}

/**
 * Calculates overall athletic score
 */
export function calculateAthleticScore(result: CombineResult): number {
  const positionWeights = POSITION_DRILL_WEIGHTS[result.position] || POSITION_DRILL_WEIGHTS['LB'];

  const drillScores = {
    '40_yard_dash': calculateDrillScore(
      '40_yard_dash',
      result.drills.fortyYardDash,
      result.position
    ),
    vertical_jump: calculateDrillScore(
      'vertical_jump',
      result.drills.verticalJump,
      result.position
    ),
    broad_jump: calculateDrillScore('broad_jump', result.drills.broadJump, result.position),
    bench_press: calculateDrillScore('bench_press', result.drills.benchPress, result.position),
    '3_cone_drill': calculateDrillScore(
      '3_cone_drill',
      result.drills.threeConeDrill,
      result.position
    ),
    '20_yard_shuttle': calculateDrillScore(
      '20_yard_shuttle',
      result.drills.twentyYardShuttle,
      result.position
    ),
    position_drills: 70, // Default for position drills
  };

  let weightedSum = 0;
  for (const [drill, weight] of Object.entries(positionWeights)) {
    const score = drillScores[drill as CombineDrill] || 50;
    weightedSum += score * weight;
  }

  return Math.round(weightedSum);
}

/**
 * Determines if prospect is a riser or faller
 */
export function determineStockChange(
  athleticScore: number,
  interviewImpression: string | null,
  medicalCleared: boolean,
  _projectedRoundBefore: number
): 'riser' | 'faller' | 'steady' {
  let stockChange = 0;

  // Athletic performance
  if (athleticScore >= 85) stockChange += 2;
  else if (athleticScore >= 75) stockChange += 1;
  else if (athleticScore < 55) stockChange -= 1;
  else if (athleticScore < 45) stockChange -= 2;

  // Interview
  if (interviewImpression === 'excellent') stockChange += 1;
  else if (interviewImpression === 'concerning') stockChange -= 1;

  // Medical
  if (!medicalCleared) stockChange -= 2;

  if (stockChange >= 2) return 'riser';
  if (stockChange <= -2) return 'faller';
  return 'steady';
}

/**
 * Processes combine results
 */
export function processCombineResults(
  state: OffSeasonState,
  results: CombineResult[]
): OffSeasonState {
  const risers = results.filter((r) => r.overall.riseOrFall === 'riser');
  const fallers = results.filter((r) => r.overall.riseOrFall === 'faller');

  let newState = addEvent(
    state,
    'phase_complete',
    `NFL Combine complete: ${results.length} prospects measured`,
    {
      totalProspects: results.length,
      risers: risers.length,
      fallers: fallers.length,
    }
  );

  // Add notable risers as events
  for (const riser of risers.slice(0, 3)) {
    newState = addEvent(
      newState,
      'development_reveal',
      `${riser.prospectName} impressed at combine (Athletic Score: ${riser.overall.athleticScore})`,
      { prospect: riser }
    );
  }

  newState = completeTask(newState, 'attend_combine');
  newState = completeTask(newState, 'view_prospects');

  return newState;
}

/**
 * Processes pro day attendance
 */
export function processProDay(state: OffSeasonState, result: ProDayResult): OffSeasonState {
  let newState = addEvent(
    state,
    'development_reveal',
    `Attended ${result.school} Pro Day - ${result.prospectName} workout`,
    { result }
  );

  newState = completeTask(newState, 'pro_days');

  return newState;
}

/**
 * Gets combine summary
 */
export function getCombineSummary(results: CombineResult[]): CombineSummary {
  const sorted = [...results].sort((a, b) => b.overall.athleticScore - a.overall.athleticScore);

  return {
    year: new Date().getFullYear(),
    totalProspects: results.length,
    topPerformers: sorted.slice(0, 10),
    risers: results.filter((r) => r.overall.riseOrFall === 'riser').slice(0, 5),
    fallers: results.filter((r) => r.overall.riseOrFall === 'faller').slice(0, 5),
    notableInterviews: results
      .filter(
        (r) => r.interview.impression === 'excellent' || r.interview.impression === 'concerning'
      )
      .map((r) => ({
        prospectId: r.prospectId,
        prospectName: r.prospectName,
        impression: r.interview.impression || 'average',
      })),
  };
}

/**
 * Gets combine result display text
 */
export function getCombineResultText(result: CombineResult): string {
  const { measurements, drills, interview, medical, overall } = result;

  let text = `${result.prospectName} (${result.position})
Measurements: ${measurements.height}, ${measurements.weight} lbs
Arm: ${measurements.armLength}", Hand: ${measurements.handSize}", Wingspan: ${measurements.wingspan}"

Drills:
- 40-yard dash: ${drills.fortyYardDash ?? 'DNS'}
- Vertical jump: ${drills.verticalJump ?? 'DNS'}"
- Broad jump: ${drills.broadJump ?? 'DNS'}"
- Bench press: ${drills.benchPress ?? 'DNS'} reps
- 3-cone drill: ${drills.threeConeDrill ?? 'DNS'}
- 20-yard shuttle: ${drills.twentyYardShuttle ?? 'DNS'}

Athletic Score: ${overall.athleticScore}
Stock: ${overall.riseOrFall.toUpperCase()}
Projected Round: ${overall.projectedRound}`;

  if (interview.conducted) {
    text += `\n\nInterview: ${interview.impression || 'N/A'}`;
    if (interview.notes.length > 0) {
      text += `\nNotes: ${interview.notes.join(', ')}`;
    }
  }

  if (!medical.cleared) {
    text += `\n\nMedical Concerns: ${medical.concerns.join(', ')}`;
  }

  return text;
}

/**
 * Filters prospects by position
 */
export function filterProspectsByPosition(
  results: CombineResult[],
  position: string
): CombineResult[] {
  return results.filter((r) => r.position === position);
}

/**
 * Gets top prospects by athletic score
 */
export function getTopAthleticProspects(
  results: CombineResult[],
  limit: number = 20
): CombineResult[] {
  return [...results]
    .sort((a, b) => b.overall.athleticScore - a.overall.athleticScore)
    .slice(0, limit);
}
