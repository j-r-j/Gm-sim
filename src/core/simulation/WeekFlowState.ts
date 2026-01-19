/**
 * Week Flow State
 * Manages the state machine for advancing through game weeks
 * Provides clear completion gates and tracks user progress
 */

import { Team } from '../models/team/Team';

/**
 * Week flow phases
 */
export type WeekFlowPhase =
  | 'pre_week' // Initial state, ready to start week
  | 'pre_game' // User is preparing for their game
  | 'simulating' // Game simulation in progress
  | 'post_game' // User's game complete, reviewing results
  | 'sim_other_games' // Simulating remaining league games
  | 'week_summary' // Reviewing week summary
  | 'ready_to_advance'; // All gates passed, ready for next week

/**
 * Live game state for simulation display
 */
export interface LiveGameScore {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamAbbr: string;
  awayTeamAbbr: string;
  homeScore: number;
  awayScore: number;
  quarter: number | 'OT' | 'Final';
  timeRemaining: number;
  possession: 'home' | 'away' | null;
  isUserGame: boolean;
  isComplete: boolean;
}

/**
 * User's next action prompt data
 */
export interface NextActionPrompt {
  /** Main action text (e.g., "Simulate Week 5") */
  actionText: string;
  /** Supporting context (e.g., "Your team plays @ Cowboys") */
  contextText: string;
  /** Action type for styling */
  actionType: 'primary' | 'secondary' | 'warning' | 'success';
  /** Target screen/action when tapped */
  targetAction: WeekFlowAction;
  /** Whether action is currently available */
  isEnabled: boolean;
  /** Reason if disabled */
  disabledReason?: string;
}

/**
 * Possible actions in the week flow
 */
export type WeekFlowAction =
  | 'view_matchup'
  | 'start_simulation'
  | 'continue_simulation'
  | 'view_game_result'
  | 'sim_other_games'
  | 'view_week_summary'
  | 'advance_week'
  | 'view_playoff_bracket'
  | 'enter_offseason';

/**
 * Complete week flow state
 */
export interface WeekFlowState {
  /** Current phase in the flow */
  phase: WeekFlowPhase;

  /** Current week number */
  weekNumber: number;

  /** Season phase (regularSeason, playoffs, etc.) */
  seasonPhase: string;

  /** User's opponent info for this week */
  opponent: {
    teamId: string;
    name: string;
    abbr: string;
    record: string;
    isHome: boolean;
  } | null;

  /** Whether user's game is complete */
  userGameComplete: boolean;

  /** User's game result (if complete) */
  userGameResult: {
    won: boolean;
    userScore: number;
    opponentScore: number;
    userRecord: string;
  } | null;

  /** Whether user is on bye */
  isUserOnBye: boolean;

  /** All live game scores for the week */
  liveGames: LiveGameScore[];

  /** Number of completed games this week */
  gamesComplete: number;

  /** Total games this week */
  totalGames: number;

  /** Completion gates status */
  gates: {
    preGameAcknowledged: boolean;
    gameResultSeen: boolean;
    weekSummarySeen: boolean;
  };
}

/**
 * Creates initial week flow state
 */
export function createInitialWeekFlowState(weekNumber: number, seasonPhase: string): WeekFlowState {
  return {
    phase: 'pre_week',
    weekNumber,
    seasonPhase,
    opponent: null,
    userGameComplete: false,
    userGameResult: null,
    isUserOnBye: false,
    liveGames: [],
    gamesComplete: 0,
    totalGames: 0,
    gates: {
      preGameAcknowledged: false,
      gameResultSeen: false,
      weekSummarySeen: false,
    },
  };
}

/**
 * Generates the next action prompt based on current state
 */
export function getNextActionPrompt(state: WeekFlowState, userTeam: Team): NextActionPrompt {
  const { phase, weekNumber, opponent, isUserOnBye, seasonPhase } = state;

  // Handle bye week
  if (isUserOnBye) {
    if (!state.gates.weekSummarySeen && state.gamesComplete === state.totalGames) {
      return {
        actionText: 'View Week Summary',
        contextText: `Your team has a bye - See how the league played out`,
        actionType: 'primary',
        targetAction: 'view_week_summary',
        isEnabled: true,
      };
    }

    if (state.gamesComplete < state.totalGames) {
      return {
        actionText: 'Simulate League Games',
        contextText: `Your team has a bye this week`,
        actionType: 'primary',
        targetAction: 'sim_other_games',
        isEnabled: true,
      };
    }

    return {
      actionText: `Advance to Week ${weekNumber + 1}`,
      contextText: `Bye week complete`,
      actionType: 'success',
      targetAction: 'advance_week',
      isEnabled: state.gates.weekSummarySeen,
      disabledReason: !state.gates.weekSummarySeen ? 'Review week summary first' : undefined,
    };
  }

  // Playoff-specific messaging
  const weekLabel = getWeekLabel(weekNumber, seasonPhase);

  switch (phase) {
    case 'pre_week':
    case 'pre_game': {
      const matchupText = opponent
        ? `${opponent.isHome ? 'vs' : '@'} ${opponent.name} (${opponent.record})`
        : 'Matchup loading...';

      return {
        actionText: `Play ${weekLabel}`,
        contextText: matchupText,
        actionType: 'primary',
        targetAction: 'view_matchup',
        isEnabled: true,
      };
    }

    case 'simulating':
      return {
        actionText: 'Continue Game',
        contextText: `Game in progress...`,
        actionType: 'secondary',
        targetAction: 'continue_simulation',
        isEnabled: true,
      };

    case 'post_game': {
      if (!state.gates.gameResultSeen) {
        const resultText = state.userGameResult
          ? state.userGameResult.won
            ? 'Victory!'
            : 'Defeat'
          : 'Game Complete';

        return {
          actionText: 'View Game Result',
          contextText: resultText,
          actionType: state.userGameResult?.won ? 'success' : 'warning',
          targetAction: 'view_game_result',
          isEnabled: true,
        };
      }

      if (state.gamesComplete < state.totalGames) {
        return {
          actionText: `Sim Remaining Games`,
          contextText: `${state.totalGames - state.gamesComplete} games left`,
          actionType: 'secondary',
          targetAction: 'sim_other_games',
          isEnabled: true,
        };
      }

      return {
        actionText: 'View Week Summary',
        contextText: `All games complete`,
        actionType: 'primary',
        targetAction: 'view_week_summary',
        isEnabled: true,
      };
    }

    case 'sim_other_games':
      return {
        actionText: 'Simulating Games...',
        contextText: `${state.gamesComplete}/${state.totalGames} complete`,
        actionType: 'secondary',
        targetAction: 'sim_other_games',
        isEnabled: false,
      };

    case 'week_summary':
      return {
        actionText: 'Review Week Summary',
        contextText: `${weekLabel} Complete`,
        actionType: 'primary',
        targetAction: 'view_week_summary',
        isEnabled: true,
      };

    case 'ready_to_advance': {
      // Check for phase transitions
      if (weekNumber >= 18 && seasonPhase === 'regularSeason') {
        return {
          actionText: 'Begin Playoffs',
          contextText: 'Regular season complete!',
          actionType: 'success',
          targetAction: 'view_playoff_bracket',
          isEnabled: true,
        };
      }

      if (weekNumber >= 22 && seasonPhase === 'playoffs') {
        return {
          actionText: 'Enter Offseason',
          contextText: 'Season complete!',
          actionType: 'success',
          targetAction: 'enter_offseason',
          isEnabled: true,
        };
      }

      const nextWeek = weekNumber + 1;
      return {
        actionText: `Advance to ${getWeekLabel(nextWeek, seasonPhase)}`,
        contextText: `${userTeam.currentRecord.wins}-${userTeam.currentRecord.losses}`,
        actionType: 'success',
        targetAction: 'advance_week',
        isEnabled: state.gates.weekSummarySeen,
        disabledReason: !state.gates.weekSummarySeen ? 'Review week summary first' : undefined,
      };
    }

    default:
      return {
        actionText: 'Continue',
        contextText: '',
        actionType: 'primary',
        targetAction: 'advance_week',
        isEnabled: true,
      };
  }
}

/**
 * Gets the display label for a week
 */
export function getWeekLabel(week: number, seasonPhase: string): string {
  if (seasonPhase === 'playoffs') {
    switch (week) {
      case 19:
        return 'Wild Card';
      case 20:
        return 'Divisional Round';
      case 21:
        return 'Conference Championship';
      case 22:
        return 'Super Bowl';
      default:
        return `Playoff Week ${week - 18}`;
    }
  }

  if (seasonPhase === 'preseason') {
    return `Preseason Week ${week}`;
  }

  return `Week ${week}`;
}

/**
 * Updates the week flow state when transitioning phases
 */
export function transitionWeekFlowPhase(
  state: WeekFlowState,
  newPhase: WeekFlowPhase
): WeekFlowState {
  return {
    ...state,
    phase: newPhase,
  };
}

/**
 * Updates a completion gate
 */
export function updateGate(
  state: WeekFlowState,
  gate: keyof WeekFlowState['gates'],
  value: boolean
): WeekFlowState {
  return {
    ...state,
    gates: {
      ...state.gates,
      [gate]: value,
    },
  };
}

/**
 * Checks if all required gates are passed to advance
 */
export function canAdvanceWeek(state: WeekFlowState): boolean {
  // Bye weeks only need summary seen
  if (state.isUserOnBye) {
    return state.gates.weekSummarySeen && state.gamesComplete === state.totalGames;
  }

  // Regular weeks need all gates
  return (
    state.userGameComplete &&
    state.gates.gameResultSeen &&
    state.gates.weekSummarySeen &&
    state.gamesComplete === state.totalGames
  );
}

/**
 * Gets the reason why advancement is blocked
 */
export function getAdvancementBlockReason(state: WeekFlowState): string | null {
  if (state.isUserOnBye) {
    if (state.gamesComplete < state.totalGames) {
      return 'Simulate remaining league games';
    }
    if (!state.gates.weekSummarySeen) {
      return 'Review the week summary';
    }
    return null;
  }

  if (!state.userGameComplete) {
    return 'Play your game first';
  }

  if (!state.gates.gameResultSeen) {
    return 'Review your game result';
  }

  if (state.gamesComplete < state.totalGames) {
    return 'Simulate remaining league games';
  }

  if (!state.gates.weekSummarySeen) {
    return 'Review the week summary';
  }

  return null;
}
