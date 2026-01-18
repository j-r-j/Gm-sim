/**
 * Training Camp Phase (Phase 9)
 * Handles position battles, development reveals, and roster evaluation
 */

import { OffSeasonState, addEvent, completeTask } from '../OffSeasonPhaseManager';
import { Player } from '../../models/player/Player';
import { Coach } from '../../models/staff/Coach';
import {
  processTeamProgression,
  ProgressionResult,
} from '../../career/PlayerProgression';

/**
 * Position battle status
 */
export interface PositionBattle {
  battleId: string;
  position: string;
  spotType: 'starter' | 'backup' | 'depth';
  competitors: PositionBattleCompetitor[];
  status: 'ongoing' | 'decided' | 'too_close';
  winner: string | null;
  campWeek: number;
  updates: string[];
}

/**
 * Position battle competitor
 */
export interface PositionBattleCompetitor {
  playerId: string;
  playerName: string;
  currentScore: number; // 1-100
  trend: 'rising' | 'steady' | 'falling';
  highlights: string[];
  concerns: string[];
  practiceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

/**
 * Development reveal during camp
 */
export interface DevelopmentReveal {
  playerId: string;
  playerName: string;
  position: string;
  revealType: 'trait' | 'skill_jump' | 'decline' | 'injury_concern' | 'intangible';
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  details: Record<string, unknown>;
}

/**
 * Camp injury report
 */
export interface CampInjury {
  playerId: string;
  playerName: string;
  position: string;
  injuryType: string;
  severity: 'minor' | 'moderate' | 'serious' | 'season_ending';
  estimatedReturn: string;
  practiceStatus: 'full' | 'limited' | 'out';
}

/**
 * Training camp summary
 */
export interface TrainingCampSummary {
  year: number;
  totalDays: number;
  positionBattles: PositionBattle[];
  developmentReveals: DevelopmentReveal[];
  injuries: CampInjury[];
  standouts: string[];
  disappointments: string[];
  rosterBubblePlayers: string[];
}

/**
 * Updates a position battle
 */
export function updatePositionBattle(
  battle: PositionBattle,
  competitorUpdates: Array<{
    playerId: string;
    scoreChange: number;
    highlight?: string;
    concern?: string;
  }>
): PositionBattle {
  const updatedCompetitors = battle.competitors.map((c) => {
    const update = competitorUpdates.find((u) => u.playerId === c.playerId);
    if (!update) return c;

    const newScore = Math.min(100, Math.max(0, c.currentScore + update.scoreChange));
    const trend: 'rising' | 'steady' | 'falling' =
      update.scoreChange > 3 ? 'rising' : update.scoreChange < -3 ? 'falling' : 'steady';

    const highlights = update.highlight ? [...c.highlights, update.highlight] : c.highlights;
    const concerns = update.concern ? [...c.concerns, update.concern] : c.concerns;

    // Calculate practice grade
    let practiceGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'C';
    if (newScore >= 85) practiceGrade = 'A';
    else if (newScore >= 75) practiceGrade = 'B';
    else if (newScore >= 60) practiceGrade = 'C';
    else if (newScore >= 45) practiceGrade = 'D';
    else practiceGrade = 'F';

    return {
      ...c,
      currentScore: newScore,
      trend,
      highlights,
      concerns,
      practiceGrade,
    };
  });

  // Check if battle is decided
  const sortedCompetitors = [...updatedCompetitors].sort((a, b) => b.currentScore - a.currentScore);
  const leader = sortedCompetitors[0];
  const second = sortedCompetitors[1];

  let status = battle.status;
  let winner = battle.winner;

  if (leader && second) {
    const gap = leader.currentScore - second.currentScore;
    if (gap >= 15) {
      status = 'decided';
      winner = leader.playerId;
    } else if (gap <= 5) {
      status = 'too_close';
    }
  }

  return {
    ...battle,
    competitors: updatedCompetitors,
    status,
    winner,
    campWeek: battle.campWeek + 1,
  };
}

/**
 * Creates a position battle
 */
export function createPositionBattle(
  position: string,
  spotType: 'starter' | 'backup' | 'depth',
  competitors: Array<{ playerId: string; playerName: string; initialRating: number }>
): PositionBattle {
  return {
    battleId: `battle-${position}-${spotType}-${Date.now()}`,
    position,
    spotType,
    competitors: competitors.map((c) => ({
      playerId: c.playerId,
      playerName: c.playerName,
      currentScore: c.initialRating,
      trend: 'steady',
      highlights: [],
      concerns: [],
      practiceGrade: 'C',
    })),
    status: 'ongoing',
    winner: null,
    campWeek: 1,
    updates: [],
  };
}

/**
 * Generates a development reveal
 */
export function generateDevelopmentReveal(
  playerId: string,
  playerName: string,
  position: string,
  age: number,
  experience: number
): DevelopmentReveal | null {
  // Random chance of development reveal
  if (Math.random() > 0.15) return null;

  const revealTypes = [
    { type: 'trait', weight: 0.3 },
    { type: 'skill_jump', weight: 0.25 },
    { type: 'decline', weight: 0.15 },
    { type: 'injury_concern', weight: 0.15 },
    { type: 'intangible', weight: 0.15 },
  ] as const;

  // Weight based on age/experience
  let typeSelection: 'trait' | 'skill_jump' | 'decline' | 'injury_concern' | 'intangible' = 'trait';
  const roll = Math.random();

  if (age >= 30 && roll < 0.4) {
    typeSelection = roll < 0.2 ? 'decline' : 'injury_concern';
  } else if (experience <= 2 && roll < 0.5) {
    typeSelection = roll < 0.25 ? 'skill_jump' : 'trait';
  } else {
    let cumulative = 0;
    for (const rt of revealTypes) {
      cumulative += rt.weight;
      if (roll < cumulative) {
        typeSelection = rt.type;
        break;
      }
    }
  }

  const descriptions: Record<typeof typeSelection, { positive: string[]; negative: string[] }> = {
    trait: {
      positive: [
        'Showing exceptional leadership in the huddle',
        'Film study habits are elite level',
        'Natural clutch performer emerging',
      ],
      negative: [
        'Struggles with complex playbook sections',
        'Shows frustration when corrected',
        'Tendency to take plays off in practice',
      ],
    },
    skill_jump: {
      positive: [
        'Made significant improvements to technique',
        'Speed measurably faster this year',
        'Strength gains noticeable on the field',
      ],
      negative: [
        'Regression in key skill areas observed',
        'Lost a step compared to last year',
        'Technique has slipped',
      ],
    },
    decline: {
      positive: [],
      negative: [
        'Age-related decline becoming apparent',
        'Recovery between practices taking longer',
        'Not the same burst as previous seasons',
      ],
    },
    injury_concern: {
      positive: [],
      negative: [
        'Nagging injury limiting practice reps',
        'Durability concerns emerging',
        'Managing an undisclosed issue',
      ],
    },
    intangible: {
      positive: [
        'Becoming a vocal leader in the locker room',
        'Mentoring young players effectively',
        'Exceptional work ethic setting the tone',
      ],
      negative: [
        'Chemistry issues with teammates',
        'Struggles to motivate himself in practice',
        'Not meshing well with coaching staff',
      ],
    },
  };

  const isPositive =
    typeSelection === 'decline' || typeSelection === 'injury_concern' ? false : Math.random() < 0.6;
  const options = isPositive
    ? descriptions[typeSelection].positive
    : descriptions[typeSelection].negative;

  if (options.length === 0) return null;

  const description = options[Math.floor(Math.random() * options.length)];

  return {
    playerId,
    playerName,
    position,
    revealType: typeSelection,
    description,
    impact: isPositive ? 'positive' : 'negative',
    details: { age, experience },
  };
}

/**
 * Generates camp injury
 */
export function generateCampInjury(
  playerId: string,
  playerName: string,
  position: string,
  injuryProne: boolean = false
): CampInjury | null {
  // Base injury chance
  let injuryChance = 0.03;
  if (injuryProne) injuryChance = 0.08;

  if (Math.random() > injuryChance) return null;

  const injuryTypes = [
    { type: 'Hamstring strain', severity: 'minor' as const, return: '1-2 weeks' },
    { type: 'Soft tissue injury', severity: 'minor' as const, return: '1 week' },
    { type: 'Ankle sprain', severity: 'moderate' as const, return: '2-4 weeks' },
    { type: 'Knee injury', severity: 'moderate' as const, return: '3-6 weeks' },
    { type: 'Shoulder injury', severity: 'moderate' as const, return: '4-6 weeks' },
    { type: 'ACL tear', severity: 'season_ending' as const, return: 'Season' },
    { type: 'Achilles rupture', severity: 'season_ending' as const, return: 'Season' },
  ];

  // Weight towards minor injuries
  const weights = [0.25, 0.25, 0.2, 0.1, 0.1, 0.05, 0.05];
  const roll = Math.random();
  let cumulative = 0;
  let selected = injuryTypes[0];

  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) {
      selected = injuryTypes[i];
      break;
    }
  }

  const practiceStatus: 'full' | 'limited' | 'out' =
    selected.severity === 'minor' ? 'limited' : 'out';

  return {
    playerId,
    playerName,
    position,
    injuryType: selected.type,
    severity: selected.severity,
    estimatedReturn: selected.return,
    practiceStatus,
  };
}

/**
 * Processes training camp phase
 */
export function processTrainingCamp(
  state: OffSeasonState,
  battles: PositionBattle[],
  reveals: DevelopmentReveal[],
  injuries: CampInjury[]
): OffSeasonState {
  let newState = addEvent(
    state,
    'phase_start',
    `Training Camp begins: ${battles.length} position battles to watch`,
    { battles: battles.length, reveals: reveals.length, injuries: injuries.length }
  );

  // Add development reveal events
  for (const reveal of reveals) {
    newState = addEvent(
      newState,
      'development_reveal',
      `${reveal.playerName}: ${reveal.description}`,
      { reveal }
    );
  }

  // Add injury events
  for (const injury of injuries.filter((i) => i.severity !== 'minor')) {
    newState = addEvent(
      newState,
      'injury',
      `${injury.playerName} (${injury.position}): ${injury.injuryType} - ${injury.estimatedReturn}`,
      { injury }
    );
  }

  newState = completeTask(newState, 'view_battles');

  return newState;
}

/**
 * Gets training camp summary
 */
export function getTrainingCampSummary(
  battles: PositionBattle[],
  reveals: DevelopmentReveal[],
  injuries: CampInjury[]
): TrainingCampSummary {
  const standouts = reveals.filter((r) => r.impact === 'positive').map((r) => r.playerName);
  const disappointments = reveals.filter((r) => r.impact === 'negative').map((r) => r.playerName);
  const rosterBubble = battles
    .filter((b) => b.spotType === 'depth' && b.status === 'too_close')
    .flatMap((b) => b.competitors.map((c) => c.playerName));

  return {
    year: new Date().getFullYear(),
    totalDays: 28,
    positionBattles: battles,
    developmentReveals: reveals,
    injuries,
    standouts,
    disappointments,
    rosterBubblePlayers: rosterBubble,
  };
}

/**
 * Gets position battle text
 */
export function getPositionBattleText(battle: PositionBattle): string {
  const sortedCompetitors = [...battle.competitors].sort((a, b) => b.currentScore - a.currentScore);

  return `${battle.position} - ${battle.spotType.toUpperCase()} Battle
Status: ${battle.status.replace('_', ' ').toUpperCase()}
${battle.winner ? `Winner: ${battle.competitors.find((c) => c.playerId === battle.winner)?.playerName}` : ''}

Competitors:
${sortedCompetitors
  .map(
    (c, i) => `${i + 1}. ${c.playerName} - ${c.currentScore} (${c.trend}) Grade: ${c.practiceGrade}`
  )
  .join('\n')}`;
}

/**
 * Gets camp injury report text
 */
export function getCampInjuryReportText(injuries: CampInjury[]): string {
  if (injuries.length === 0) return 'No significant injuries to report.';

  return `Training Camp Injury Report

${injuries
  .map(
    (i) =>
      `${i.playerName} (${i.position})
  ${i.injuryType} - ${i.severity}
  Return: ${i.estimatedReturn}
  Status: ${i.practiceStatus}`
  )
  .join('\n\n')}`;
}

/**
 * Training camp progression result
 */
export interface TrainingCampProgressionResult {
  updatedPlayers: Player[];
  progressionResults: ProgressionResult[];
  notableImprovements: ProgressionResult[];
  developmentNews: string[];
}

/**
 * Processes player development during training camp
 * This applies coach-influenced skill progression to all roster players
 */
export function processTrainingCampProgression(
  players: Player[],
  headCoach: Coach,
  options: {
    recentSuccess?: boolean;
    yearsTogether?: number;
  } = {}
): TrainingCampProgressionResult {
  const { updatedPlayers, results, notableImprovements } = processTeamProgression(
    players,
    headCoach,
    {
      yearsTogether: options.yearsTogether ?? 1,
      recentSuccess: options.recentSuccess ?? false,
      applyAgeModifier: true,
    }
  );

  // Generate development news for notable improvements
  const developmentNews: string[] = notableImprovements.map((result) => {
    if (result.totalChange >= 5) {
      return `${result.playerName} has emerged as a standout in training camp, showing remarkable improvement.`;
    } else {
      return `${result.playerName} has been impressive in camp with noticeable skill development.`;
    }
  });

  return {
    updatedPlayers,
    progressionResults: results,
    notableImprovements,
    developmentNews,
  };
}
