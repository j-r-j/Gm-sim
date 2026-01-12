/**
 * Season Start Phase (Phase 12)
 * Handles final preparations, owner expectations, and transition to regular season
 */

import {
  OffSeasonState,
  addEvent,
  completeTask,
} from '../OffSeasonPhaseManager';

/**
 * Owner expectation levels
 */
export type ExpectationLevel =
  | 'super_bowl'
  | 'championship_contender'
  | 'playoff_team'
  | 'competitive'
  | 'rebuild';

/**
 * Season expectations from owner
 */
export interface OwnerExpectations {
  overall: ExpectationLevel;
  minimumWins: number;
  playoffExpectation: 'miss' | 'make' | 'deep_run' | 'championship';
  specificGoals: string[];
  patientLevel: number; // 1-100, higher = more patient
  pressureLevel: number; // 1-100, higher = more pressure
  message: string;
}

/**
 * Media projection
 */
export interface MediaProjection {
  source: string;
  projectedWins: number;
  projectedLosses: number;
  playoffProjection: 'miss' | 'wild_card' | 'division' | 'super_bowl';
  teamRanking: number; // 1-32
  strengthOfSchedule: 'easy' | 'average' | 'hard';
  analysis: string;
}

/**
 * Season goal
 */
export interface SeasonGoal {
  id: string;
  description: string;
  type: 'team' | 'player' | 'personal';
  target: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isAchieved: boolean;
}

/**
 * Season start summary
 */
export interface SeasonStartSummary {
  year: number;
  teamId: string;
  teamName: string;
  expectations: OwnerExpectations;
  mediaProjections: MediaProjection[];
  goals: SeasonGoal[];
  rosterStrength: {
    offense: number;
    defense: number;
    specialTeams: number;
    overall: number;
  };
  schedule: {
    homeGames: number;
    awayGames: number;
    divisionGames: number;
    primetime: number;
  };
}

/**
 * Calculates owner expectations based on roster and history
 */
export function calculateOwnerExpectations(
  rosterStrength: number,
  previousSeasonWins: number,
  ownerPersonality: 'patient' | 'demanding' | 'balanced',
  yearsWithTeam: number
): OwnerExpectations {
  let overall: ExpectationLevel = 'competitive';
  let minimumWins = 8;
  let playoffExpectation: 'miss' | 'make' | 'deep_run' | 'championship' = 'make';
  let patientLevel = 50;
  let pressureLevel = 50;

  // Determine expectations based on roster strength
  if (rosterStrength >= 85) {
    overall = 'super_bowl';
    minimumWins = 12;
    playoffExpectation = 'championship';
    pressureLevel = 80;
  } else if (rosterStrength >= 75) {
    overall = 'championship_contender';
    minimumWins = 10;
    playoffExpectation = 'deep_run';
    pressureLevel = 70;
  } else if (rosterStrength >= 65) {
    overall = 'playoff_team';
    minimumWins = 9;
    playoffExpectation = 'make';
    pressureLevel = 60;
  } else if (rosterStrength >= 55) {
    overall = 'competitive';
    minimumWins = 7;
    playoffExpectation = 'make';
    pressureLevel = 50;
  } else {
    overall = 'rebuild';
    minimumWins = 5;
    playoffExpectation = 'miss';
    pressureLevel = 30;
  }

  // Adjust for owner personality
  switch (ownerPersonality) {
    case 'demanding':
      minimumWins += 1;
      pressureLevel += 20;
      patientLevel = 30;
      break;
    case 'patient':
      minimumWins -= 1;
      pressureLevel -= 15;
      patientLevel = 70;
      break;
    case 'balanced':
    default:
      patientLevel = 50;
  }

  // Adjust for tenure
  if (yearsWithTeam >= 3) {
    pressureLevel += 10;
    patientLevel -= 10;
  } else if (yearsWithTeam === 1) {
    pressureLevel -= 10;
    patientLevel += 15;
  }

  // Generate specific goals
  const specificGoals: string[] = [];
  if (playoffExpectation !== 'miss') {
    specificGoals.push('Make the playoffs');
  }
  if (playoffExpectation === 'championship') {
    specificGoals.push('Win the Super Bowl');
  }
  specificGoals.push(`Win at least ${minimumWins} games`);
  if (previousSeasonWins > 0) {
    specificGoals.push(`Improve on last season (${previousSeasonWins} wins)`);
  }

  // Generate message
  const messages: Record<ExpectationLevel, string> = {
    super_bowl:
      'This is a championship-caliber roster. I expect us to compete for a Super Bowl. Nothing less will be acceptable.',
    championship_contender:
      'We have the talent to make a deep playoff run. I want to see this team competing in January.',
    playoff_team:
      'This should be a playoff team. Make sure we punch our ticket to the postseason.',
    competitive:
      'I expect us to be competitive every week. Show me progress and fight for a playoff spot.',
    rebuild:
      'We\'re building for the future. Focus on development, but I still want to see competitive effort.',
  };

  return {
    overall,
    minimumWins,
    playoffExpectation,
    specificGoals,
    patientLevel: Math.max(0, Math.min(100, patientLevel)),
    pressureLevel: Math.max(0, Math.min(100, pressureLevel)),
    message: messages[overall],
  };
}

/**
 * Generates media projections
 */
export function generateMediaProjections(
  rosterStrength: number,
  scheduleStrength: number,
  _previousSeasonWins: number
): MediaProjection[] {
  const sources = [
    'ESPN Power Rankings',
    'NFL Network',
    'Sports Illustrated',
    'The Athletic',
    'Pro Football Focus',
  ];

  const projections: MediaProjection[] = [];

  for (const source of sources) {
    // Add variance to projections
    const variance = Math.floor(Math.random() * 6) - 3;
    const baseWins = Math.round((rosterStrength / 100) * 12 + 4);
    const projectedWins = Math.max(2, Math.min(15, baseWins + variance));
    const projectedLosses = 17 - projectedWins;

    // Determine playoff projection
    let playoffProjection: 'miss' | 'wild_card' | 'division' | 'super_bowl' = 'miss';
    if (projectedWins >= 12) playoffProjection = 'super_bowl';
    else if (projectedWins >= 10) playoffProjection = 'division';
    else if (projectedWins >= 8) playoffProjection = 'wild_card';

    // Determine ranking
    const ranking = Math.max(1, Math.min(32, 32 - Math.round(rosterStrength / 3.5) + variance));

    // Determine schedule strength
    let strengthOfSchedule: 'easy' | 'average' | 'hard' = 'average';
    if (scheduleStrength < 0.47) strengthOfSchedule = 'easy';
    else if (scheduleStrength > 0.53) strengthOfSchedule = 'hard';

    // Generate analysis
    const analyses = {
      super_bowl: 'A legitimate Super Bowl contender with elite talent across the roster.',
      division: 'Should compete for their division with playoff success within reach.',
      wild_card: 'Bubble playoff team that needs things to break their way.',
      miss: 'Facing an uphill battle to reach the postseason this year.',
    };

    projections.push({
      source,
      projectedWins,
      projectedLosses,
      playoffProjection,
      teamRanking: ranking,
      strengthOfSchedule,
      analysis: analyses[playoffProjection],
    });
  }

  return projections;
}

/**
 * Generates default season goals
 */
export function generateSeasonGoals(
  expectations: OwnerExpectations,
  keyPlayers: Array<{ name: string; position: string }>
): SeasonGoal[] {
  const goals: SeasonGoal[] = [];

  // Team goals based on expectations
  goals.push({
    id: 'goal-wins',
    description: `Win at least ${expectations.minimumWins} games`,
    type: 'team',
    target: `${expectations.minimumWins} wins`,
    difficulty: 'medium',
    isAchieved: false,
  });

  if (expectations.playoffExpectation !== 'miss') {
    goals.push({
      id: 'goal-playoffs',
      description: 'Make the playoffs',
      type: 'team',
      target: 'Playoff berth',
      difficulty: expectations.overall === 'rebuild' ? 'hard' : 'medium',
      isAchieved: false,
    });
  }

  if (expectations.playoffExpectation === 'championship') {
    goals.push({
      id: 'goal-championship',
      description: 'Win the Super Bowl',
      type: 'team',
      target: 'Championship',
      difficulty: 'hard',
      isAchieved: false,
    });
  }

  // Player goals
  for (const player of keyPlayers.slice(0, 3)) {
    goals.push({
      id: `goal-player-${player.name.toLowerCase().replace(' ', '-')}`,
      description: `${player.name} makes Pro Bowl`,
      type: 'player',
      target: 'Pro Bowl selection',
      difficulty: 'medium',
      isAchieved: false,
    });
  }

  // Personal goal
  goals.push({
    id: 'goal-job-security',
    description: 'Keep owner satisfied throughout the season',
    type: 'personal',
    target: 'Job security',
    difficulty: expectations.overall === 'super_bowl' ? 'hard' : 'medium',
    isAchieved: false,
  });

  return goals;
}

/**
 * Processes season start phase
 */
export function processSeasonStart(
  state: OffSeasonState,
  expectations: OwnerExpectations,
  projections: MediaProjection[],
  _goals: SeasonGoal[]
): OffSeasonState {
  let newState = addEvent(
    state,
    'phase_complete',
    `Off-season complete! Ready for ${state.year} season`,
    {
      expectations: expectations.overall,
      minimumWins: expectations.minimumWins,
      avgProjectedWins:
        projections.reduce((sum, p) => sum + p.projectedWins, 0) / projections.length,
    }
  );

  newState = addEvent(
    newState,
    'phase_start',
    `Owner message: "${expectations.message}"`,
    { expectations }
  );

  newState = completeTask(newState, 'view_expectations');

  return newState;
}

/**
 * Gets season start summary
 */
export function getSeasonStartSummary(
  year: number,
  teamId: string,
  teamName: string,
  expectations: OwnerExpectations,
  projections: MediaProjection[],
  goals: SeasonGoal[],
  rosterStrength: { offense: number; defense: number; specialTeams: number; overall: number }
): SeasonStartSummary {
  return {
    year,
    teamId,
    teamName,
    expectations,
    mediaProjections: projections,
    goals,
    rosterStrength,
    schedule: {
      homeGames: 9,
      awayGames: 8,
      divisionGames: 6,
      primetime: Math.floor(Math.random() * 4) + 1,
    },
  };
}

/**
 * Gets expectations text
 */
export function getExpectationsText(expectations: OwnerExpectations): string {
  return `Owner Expectations

Overall: ${expectations.overall.replace('_', ' ').toUpperCase()}
Minimum Wins: ${expectations.minimumWins}
Playoff Expectation: ${expectations.playoffExpectation.replace('_', ' ')}

Pressure Level: ${expectations.pressureLevel}/100
Patience Level: ${expectations.patientLevel}/100

Goals:
${expectations.specificGoals.map((g) => `- ${g}`).join('\n')}

Owner Message:
"${expectations.message}"`;
}

/**
 * Gets media projections text
 */
export function getMediaProjectionsText(projections: MediaProjection[]): string {
  const avgWins =
    Math.round(
      (projections.reduce((sum, p) => sum + p.projectedWins, 0) / projections.length) * 10
    ) / 10;
  const avgRanking =
    Math.round(
      (projections.reduce((sum, p) => sum + p.teamRanking, 0) / projections.length) * 10
    ) / 10;

  return `Media Projections

Average Projected Record: ${avgWins} - ${17 - avgWins}
Average Power Ranking: #${avgRanking}

${projections
  .map(
    (p) =>
      `${p.source}:
  Record: ${p.projectedWins}-${p.projectedLosses} | Rank: #${p.teamRanking}
  Playoff: ${p.playoffProjection.replace('_', ' ')}
  "${p.analysis}"`
  )
  .join('\n\n')}`;
}

/**
 * Gets goals text
 */
export function getGoalsText(goals: SeasonGoal[]): string {
  return `Season Goals

Team Goals:
${goals
  .filter((g) => g.type === 'team')
  .map((g) => `- ${g.description} (${g.difficulty})`)
  .join('\n')}

Player Goals:
${goals
  .filter((g) => g.type === 'player')
  .map((g) => `- ${g.description} (${g.difficulty})`)
  .join('\n')}

Personal Goals:
${goals
  .filter((g) => g.type === 'personal')
  .map((g) => `- ${g.description} (${g.difficulty})`)
  .join('\n')}`;
}
