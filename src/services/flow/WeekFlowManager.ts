/**
 * WeekFlowManager
 * Manages the single-flow weekly progression through the season
 *
 * FLOW: Dashboard → Pre-Game → Game Simulation → Post-Game → Week Summary → Dashboard
 *
 * This service enforces that users complete each step before advancing,
 * preventing confusion and ensuring a consistent experience.
 */

import { GameState } from '../../core/models/game/GameState';
import { SeasonPhase } from '../../core/models/league/League';

/**
 * Phases of the weekly flow
 */
export type WeekFlowPhase =
  | 'pre_game' // User needs to view matchup
  | 'simulating' // Game is running
  | 'post_game' // User needs to view results
  | 'sim_other' // Simulating other league games
  | 'week_summary' // User needs to view week summary
  | 'ready_to_advance'; // All steps complete, can move to next week

/**
 * Completion flags for week flow gates
 */
export interface WeekFlowFlags {
  preGameViewed: boolean;
  gameSimulated: boolean;
  postGameViewed: boolean;
  otherGamesSimulated: boolean;
  weekSummaryViewed: boolean;
}

/**
 * Next action that the user should take
 */
export interface NextAction {
  /** Button label */
  label: string;
  /** Contextual description */
  description: string;
  /** Secondary info (time, opponent, etc.) */
  secondaryInfo?: string;
  /** Action type for styling */
  type: 'primary' | 'success' | 'warning' | 'info';
  /** Target screen to navigate to */
  targetScreen: string;
  /** Whether the action is available */
  isEnabled: boolean;
  /** Reason if disabled */
  disabledReason?: string;
  /** Icon name */
  icon: string;
}

/**
 * Complete week flow state
 */
export interface WeekFlowState {
  phase: WeekFlowPhase;
  flags: WeekFlowFlags;
  canAdvanceWeek: boolean;
  nextAction: NextAction;
  currentWeek: number;
  seasonPhase: SeasonPhase;
}

/**
 * Default (fresh) week flow flags
 */
export const DEFAULT_WEEK_FLAGS: WeekFlowFlags = {
  preGameViewed: false,
  gameSimulated: false,
  postGameViewed: false,
  otherGamesSimulated: false,
  weekSummaryViewed: false,
};

/**
 * Get the current week flow state from game state
 */
export function getWeekFlowState(gameState: GameState): WeekFlowState {
  const { calendar } = gameState.league;
  const team = gameState.teams[gameState.userTeamId];

  // Get week flags (use defaults if not present)
  const flags: WeekFlowFlags =
    (gameState as GameState & { weekFlags?: WeekFlowFlags }).weekFlags ?? DEFAULT_WEEK_FLAGS;

  // Determine current phase based on flags
  const phase = determinePhase(flags);

  // Check if we can advance
  const canAdvanceWeek = phase === 'ready_to_advance';

  // Get the next action based on phase
  const nextAction = getNextAction(gameState, phase, team);

  return {
    phase,
    flags,
    canAdvanceWeek,
    nextAction,
    currentWeek: calendar.currentWeek,
    seasonPhase: calendar.currentPhase,
  };
}

/**
 * Determine the current phase based on completion flags
 */
function determinePhase(flags: WeekFlowFlags): WeekFlowPhase {
  if (!flags.preGameViewed) {
    return 'pre_game';
  }
  if (!flags.gameSimulated) {
    return 'simulating';
  }
  if (!flags.postGameViewed) {
    return 'post_game';
  }
  if (!flags.otherGamesSimulated) {
    return 'sim_other';
  }
  if (!flags.weekSummaryViewed) {
    return 'week_summary';
  }
  return 'ready_to_advance';
}

/**
 * Game info for filtering and display
 */
interface ScheduleGame {
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  timeSlot?: string;
}

/**
 * Get the next action based on current phase
 */
function getNextAction(
  gameState: GameState,
  phase: WeekFlowPhase,
  _team: GameState['teams'][string]
): NextAction {
  const { calendar, schedule } = gameState.league;
  const currentWeek = calendar.currentWeek;

  // Get this week's game for the user's team from regularSeason array
  const allGames = (schedule?.regularSeason ?? []) as ScheduleGame[];
  const weekGames = allGames.filter((g) => g.week === currentWeek);
  const userGame = weekGames.find(
    (g) => g.homeTeamId === gameState.userTeamId || g.awayTeamId === gameState.userTeamId
  );

  const opponentId = userGame
    ? userGame.homeTeamId === gameState.userTeamId
      ? userGame.awayTeamId
      : userGame.homeTeamId
    : null;
  const opponent = opponentId ? gameState.teams[opponentId] : null;
  const isHome = userGame?.homeTeamId === gameState.userTeamId;
  const matchupText = opponent
    ? `${isHome ? 'vs' : '@'} ${opponent.city} ${opponent.nickname}`
    : 'Bye Week';

  switch (phase) {
    case 'pre_game':
      return {
        label: `Play Week ${currentWeek}`,
        description: matchupText,
        secondaryInfo: userGame ? formatGameTime(userGame) : undefined,
        type: 'primary',
        targetScreen: 'PreGame',
        isEnabled: true,
        icon: 'american-football',
      };

    case 'simulating':
      return {
        label: 'Simulate Game',
        description: matchupText,
        type: 'primary',
        targetScreen: 'GameSimulation',
        isEnabled: true,
        icon: 'play-circle',
      };

    case 'post_game':
      return {
        label: 'View Results',
        description: 'See how your team performed',
        type: 'info',
        targetScreen: 'PostGame',
        isEnabled: true,
        icon: 'stats-chart',
      };

    case 'sim_other':
      return {
        label: 'League Results',
        description: 'Simulate other games',
        type: 'info',
        targetScreen: 'SimOtherGames',
        isEnabled: true,
        icon: 'grid',
      };

    case 'week_summary':
      return {
        label: 'Week Summary',
        description: 'Review league standings and news',
        type: 'info',
        targetScreen: 'WeekSummary',
        isEnabled: true,
        icon: 'newspaper',
      };

    case 'ready_to_advance':
      return {
        label: `Advance to Week ${currentWeek + 1}`,
        description: 'Move to the next week',
        type: 'success',
        targetScreen: 'Dashboard',
        isEnabled: true,
        icon: 'arrow-forward-circle',
      };

    default:
      return {
        label: 'Continue',
        description: '',
        type: 'primary',
        targetScreen: 'Dashboard',
        isEnabled: true,
        icon: 'arrow-forward',
      };
  }
}

/**
 * Format game time for display
 */
function formatGameTime(game: { dayOfWeek?: string; timeSlot?: string }): string {
  const day = game.dayOfWeek ?? 'Sunday';
  const time = game.timeSlot ?? '1:00 PM';
  return `${day} ${time}`;
}

/**
 * Update week flow flags immutably
 */
export function updateWeekFlags(gameState: GameState, updates: Partial<WeekFlowFlags>): GameState {
  const currentFlags =
    (gameState as GameState & { weekFlags?: WeekFlowFlags }).weekFlags ?? DEFAULT_WEEK_FLAGS;

  return {
    ...gameState,
    weekFlags: {
      ...currentFlags,
      ...updates,
    },
  } as GameState;
}

/**
 * Mark pre-game as viewed
 */
export function markPreGameViewed(gameState: GameState): GameState {
  return updateWeekFlags(gameState, { preGameViewed: true });
}

/**
 * Mark game as simulated
 */
export function markGameSimulated(gameState: GameState): GameState {
  return updateWeekFlags(gameState, { gameSimulated: true });
}

/**
 * Mark post-game as viewed
 */
export function markPostGameViewed(gameState: GameState): GameState {
  return updateWeekFlags(gameState, { postGameViewed: true });
}

/**
 * Mark other games as simulated
 */
export function markOtherGamesSimulated(gameState: GameState): GameState {
  return updateWeekFlags(gameState, { otherGamesSimulated: true });
}

/**
 * Mark week summary as viewed
 */
export function markWeekSummaryViewed(gameState: GameState): GameState {
  return updateWeekFlags(gameState, { weekSummaryViewed: true });
}

/**
 * Reset week flags for a new week
 */
export function resetWeekFlags(gameState: GameState): GameState {
  return {
    ...gameState,
    weekFlags: { ...DEFAULT_WEEK_FLAGS },
  } as GameState;
}

/**
 * Advance to the next week (only if ready)
 */
export function advanceWeek(gameState: GameState): GameState | null {
  const flowState = getWeekFlowState(gameState);

  if (!flowState.canAdvanceWeek) {
    console.warn('Cannot advance week - not all steps completed');
    return null;
  }

  // Import and use calendar advancement function
  const { advanceCalendarWeek } = require('../../core/models/league/League');

  const newLeague = {
    ...gameState.league,
    calendar: advanceCalendarWeek(gameState.league.calendar),
  };

  // Reset flags for new week
  return {
    ...gameState,
    league: newLeague,
    weekFlags: { ...DEFAULT_WEEK_FLAGS },
  } as GameState;
}

/**
 * Check if user has a bye week
 */
export function isUserByeWeek(gameState: GameState): boolean {
  const { calendar, schedule } = gameState.league;
  const allGames = (schedule?.regularSeason ?? []) as ScheduleGame[];
  const weekGames = allGames.filter((g) => g.week === calendar.currentWeek);

  return !weekGames.some(
    (g) => g.homeTeamId === gameState.userTeamId || g.awayTeamId === gameState.userTeamId
  );
}

/**
 * Get week flow progress percentage
 */
export function getWeekFlowProgress(flags: WeekFlowFlags): number {
  const steps = [
    flags.preGameViewed,
    flags.gameSimulated,
    flags.postGameViewed,
    flags.otherGamesSimulated,
    flags.weekSummaryViewed,
  ];

  const completed = steps.filter(Boolean).length;
  return completed / steps.length;
}

/**
 * Get remaining steps in week flow
 */
export function getRemainingSteps(flags: WeekFlowFlags): string[] {
  const remaining: string[] = [];

  if (!flags.preGameViewed) remaining.push('View matchup');
  if (!flags.gameSimulated) remaining.push('Simulate game');
  if (!flags.postGameViewed) remaining.push('View results');
  if (!flags.otherGamesSimulated) remaining.push('Simulate other games');
  if (!flags.weekSummaryViewed) remaining.push('Review week summary');

  return remaining;
}
