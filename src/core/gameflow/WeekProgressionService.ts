/**
 * Week Progression Service
 *
 * Handles week advancement, injury recovery, fatigue reset,
 * and all between-week game state updates.
 *
 * Follows best practices for American football sim games:
 * - Clear week boundaries
 * - Injury tracking with realistic recovery
 * - Fatigue management
 * - Standings updates
 * - Playoff implications
 */

import { GameState } from '../models/game/GameState';
import { Team } from '../models/team/Team';
import { Player } from '../models/player/Player';
import { GameResult } from '../game/GameRunner';
import { ScheduledGame, SeasonSchedule, getWeekGames } from '../season/ScheduleGenerator';
import { DetailedDivisionStandings, calculateStandings } from '../season/StandingsCalculator';
import { isOnBye } from '../season/ByeWeekManager';
import {
  WeekFlowState,
  WeekSummary,
  GameSummary,
  DivisionStandingSummary,
  PlayoffImplication,
  Headline,
  InjuryUpdate,
  SeasonPhase,
} from './types';
import { GameFlowEventBus, gameFlowEventBus } from './events';

/**
 * Week advancement result
 */
export interface WeekAdvancementResult {
  /** New week number */
  newWeek: number;

  /** Season phase after advancement */
  seasonPhase: SeasonPhase;

  /** Players who recovered from injuries */
  recoveredPlayers: RecoveredPlayer[];

  /** Whether fatigue was reset */
  fatigueReset: boolean;

  /** Whether this advancement ends the season */
  seasonEnded: boolean;

  /** Whether playoffs start after this week */
  playoffsStart: boolean;
}

/**
 * Recovered player info
 */
export interface RecoveredPlayer {
  playerId: string;
  playerName: string;
  position: string;
  teamId: string;
  injuryType: string;
}

/**
 * Other games simulation result
 */
export interface OtherGamesResult {
  /** Simulated game results */
  results: Array<{
    game: ScheduledGame;
    homeScore: number;
    awayScore: number;
    winnerId: string;
  }>;

  /** Updated standings */
  standings: DetailedDivisionStandings;

  /** New playoff implications */
  playoffImplications: PlayoffImplication[];

  /** Headlines generated */
  headlines: Headline[];
}

/**
 * Configuration for week progression service
 */
export interface WeekProgressionConfig {
  /** Event bus for emitting events */
  eventBus?: GameFlowEventBus;

  /** Whether to emit events */
  emitEvents: boolean;

  /** Regular season length */
  regularSeasonWeeks: number;

  /** Number of playoff weeks */
  playoffWeeks: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: WeekProgressionConfig = {
  emitEvents: true,
  regularSeasonWeeks: 18,
  playoffWeeks: 4,
};

/**
 * Week Progression Service
 *
 * Manages all week-to-week progression logic including:
 * - Week flow state management
 * - Injury recovery processing
 * - Fatigue reset
 * - Other games simulation
 * - Standings and playoff implications
 */
export class WeekProgressionService {
  private config: WeekProgressionConfig;
  private eventBus: GameFlowEventBus;

  constructor(config: Partial<WeekProgressionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = config.eventBus || gameFlowEventBus;
  }

  /**
   * Create initial week flow state for a week
   */
  createWeekFlowState(
    weekNumber: number,
    seasonPhase: SeasonPhase,
    userTeamId: string,
    schedule: SeasonSchedule
  ): WeekFlowState {
    const isUserOnBye = isOnBye(userTeamId, weekNumber, schedule.byeWeeks);
    const userGame = this.getUserGame(schedule, weekNumber, userTeamId);
    const otherGames = this.getOtherGames(schedule, weekNumber, userTeamId);

    return {
      phase: 'week_start',
      weekNumber,
      seasonPhase,
      isUserOnBye,
      userGame,
      userGameCompleted: false,
      userGameResult: null,
      otherGames,
      otherGamesCompleted: 0,
      gates: {
        gameResultViewed: false,
        weekSummaryViewed: false,
      },
    };
  }

  /**
   * Get user's game for a week
   */
  getUserGame(
    schedule: SeasonSchedule,
    week: number,
    userTeamId: string
  ): ScheduledGame | null {
    if (isOnBye(userTeamId, week, schedule.byeWeeks)) {
      return null;
    }

    const weekGames = getWeekGames(schedule, week);
    return (
      weekGames.find(
        (g) => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId
      ) || null
    );
  }

  /**
   * Get other games (non-user) for a week
   */
  getOtherGames(
    schedule: SeasonSchedule,
    week: number,
    userTeamId: string
  ): ScheduledGame[] {
    const weekGames = getWeekGames(schedule, week);
    return weekGames.filter(
      (g) => g.homeTeamId !== userTeamId && g.awayTeamId !== userTeamId
    );
  }

  /**
   * Record user's game result and update state
   */
  recordUserGameResult(
    state: WeekFlowState,
    result: GameResult,
    gameState: GameState,
    userTeamId: string
  ): {
    updatedWeekFlow: WeekFlowState;
    updatedGameState: GameState;
  } {
    // Update team records
    const updatedTeams = this.updateTeamRecords(
      gameState.teams,
      result,
      userTeamId
    );

    // Update player season stats
    const updatedPlayers = this.updatePlayerStats(gameState.players, result);

    // Apply injuries from game
    const playersWithInjuries = this.applyGameInjuries(
      updatedPlayers,
      result.injuries
    );

    const updatedGameState: GameState = {
      ...gameState,
      teams: updatedTeams,
      players: playersWithInjuries,
    };

    const updatedWeekFlow: WeekFlowState = {
      ...state,
      phase: 'post_game',
      userGameCompleted: true,
      userGameResult: result,
    };

    // Emit event
    if (this.config.emitEvents) {
      this.eventBus.emit({
        type: 'GAME_END',
        payload: result,
      });
    }

    return { updatedWeekFlow, updatedGameState };
  }

  /**
   * Update team records after a game
   */
  private updateTeamRecords(
    teams: Record<string, Team>,
    result: GameResult,
    _userTeamId: string
  ): Record<string, Team> {
    const updatedTeams = { ...teams };

    const homeTeam = updatedTeams[result.homeTeamId];
    const awayTeam = updatedTeams[result.awayTeamId];

    if (homeTeam && awayTeam) {
      const homeWon = result.homeScore > result.awayScore;
      const awayWon = result.awayScore > result.homeScore;
      const tie = result.isTie;

      updatedTeams[result.homeTeamId] = {
        ...homeTeam,
        currentRecord: {
          ...homeTeam.currentRecord,
          wins: homeTeam.currentRecord.wins + (homeWon ? 1 : 0),
          losses: homeTeam.currentRecord.losses + (awayWon ? 1 : 0),
          ties: homeTeam.currentRecord.ties + (tie ? 1 : 0),
        },
      };

      updatedTeams[result.awayTeamId] = {
        ...awayTeam,
        currentRecord: {
          ...awayTeam.currentRecord,
          wins: awayTeam.currentRecord.wins + (awayWon ? 1 : 0),
          losses: awayTeam.currentRecord.losses + (homeWon ? 1 : 0),
          ties: awayTeam.currentRecord.ties + (tie ? 1 : 0),
        },
      };
    }

    return updatedTeams;
  }

  /**
   * Update player season stats from game result
   */
  private updatePlayerStats(
    players: Record<string, Player>,
    result: GameResult
  ): Record<string, Player> {
    // For now, just return players as-is
    // Full implementation would aggregate game stats to season stats
    return players;
  }

  /**
   * Apply injuries from game to players
   */
  private applyGameInjuries(
    players: Record<string, Player>,
    injuries: GameResult['injuries']
  ): Record<string, Player> {
    const updatedPlayers = { ...players };

    for (const injury of injuries) {
      const player = updatedPlayers[injury.playerId];
      if (player && injury.weeksOut > 0) {
        updatedPlayers[injury.playerId] = {
          ...player,
          injuryStatus: {
            severity: injury.weeksOut > 4 ? 'ir' : injury.weeksOut > 1 ? 'out' : 'questionable',
            type: this.mapInjuryType(injury.injuryType),
            weeksRemaining: injury.weeksOut,
            isPublic: true,
            lingeringEffect: 0,
          },
        };
      }
    }

    return updatedPlayers;
  }

  /**
   * Simulate other games in the week
   */
  simulateOtherGames(
    state: WeekFlowState,
    gameState: GameState,
    userTeamId: string
  ): {
    updatedWeekFlow: WeekFlowState;
    updatedGameState: GameState;
    results: OtherGamesResult;
  } {
    const results: OtherGamesResult['results'] = [];
    let updatedTeams = { ...gameState.teams };

    // Simulate each non-user game
    for (const game of state.otherGames) {
      if (game.isComplete) continue;

      // Simple simulation - generate realistic scores
      const homeScore = this.generateRealisticScore();
      const awayScore = this.generateRealisticScore();
      const winnerId =
        homeScore > awayScore
          ? game.homeTeamId
          : awayScore > homeScore
            ? game.awayTeamId
            : '';

      results.push({
        game,
        homeScore,
        awayScore,
        winnerId,
      });

      // Update team records
      const homeTeam = updatedTeams[game.homeTeamId];
      const awayTeam = updatedTeams[game.awayTeamId];

      if (homeTeam && awayTeam) {
        const homeWon = homeScore > awayScore;
        const awayWon = awayScore > homeScore;
        const tie = homeScore === awayScore;

        updatedTeams[game.homeTeamId] = {
          ...homeTeam,
          currentRecord: {
            ...homeTeam.currentRecord,
            wins: homeTeam.currentRecord.wins + (homeWon ? 1 : 0),
            losses: homeTeam.currentRecord.losses + (awayWon ? 1 : 0),
            ties: homeTeam.currentRecord.ties + (tie ? 1 : 0),
          },
        };

        updatedTeams[game.awayTeamId] = {
          ...awayTeam,
          currentRecord: {
            ...awayTeam.currentRecord,
            wins: awayTeam.currentRecord.wins + (awayWon ? 1 : 0),
            losses: awayTeam.currentRecord.losses + (homeWon ? 1 : 0),
            ties: awayTeam.currentRecord.ties + (tie ? 1 : 0),
          },
        };
      }
    }

    // Calculate standings
    const teamsArray = Object.values(updatedTeams);
    // Note: This would need all completed games, simplified here
    const standings = calculateStandings([], teamsArray);

    // Generate playoff implications
    const playoffImplications = this.generatePlayoffImplications(
      standings,
      state.weekNumber
    );

    // Generate headlines
    const headlines = this.generateHeadlines(results, updatedTeams);

    const updatedWeekFlow: WeekFlowState = {
      ...state,
      phase: 'week_summary',
      otherGamesCompleted: state.otherGames.length,
    };

    const updatedGameState: GameState = {
      ...gameState,
      teams: updatedTeams,
    };

    // Emit event
    if (this.config.emitEvents) {
      this.eventBus.emit({
        type: 'OTHER_GAMES_COMPLETE',
        payload: {
          completedGames: results.length,
          totalGames: state.otherGames.length,
        },
      });
    }

    return {
      updatedWeekFlow,
      updatedGameState,
      results: {
        results,
        standings,
        playoffImplications,
        headlines,
      },
    };
  }

  /**
   * Generate realistic NFL score
   */
  private generateRealisticScore(): number {
    // NFL average score is around 22-23 points
    // Use normal distribution with some variance
    const base = 21;
    const variance = Math.floor(Math.random() * 20) - 7; // -7 to +12
    return Math.max(0, base + variance);
  }

  /**
   * Generate playoff implications
   */
  private generatePlayoffImplications(
    standings: DetailedDivisionStandings,
    week: number
  ): PlayoffImplication[] {
    const implications: PlayoffImplication[] = [];

    // Only generate after week 10
    if (week < 10) return implications;

    // Simplified implementation - would need full playoff clinching logic
    for (const conference of ['afc', 'nfc'] as const) {
      for (const division of ['north', 'south', 'east', 'west'] as const) {
        const divTeams = standings[conference][division];
        if (divTeams.length > 0 && week >= 14) {
          const leader = divTeams[0];
          if (leader.wins >= 10 && leader.divisionRank === 1) {
            implications.push({
              teamId: leader.teamId,
              teamName: leader.teamId, // Would need actual name lookup
              type: 'controls_destiny',
              description: `${conference.toUpperCase()} ${division} in driver's seat`,
            });
          }
        }
      }
    }

    return implications;
  }

  /**
   * Generate news headlines from game results
   */
  private generateHeadlines(
    results: OtherGamesResult['results'],
    teams: Record<string, Team>
  ): Headline[] {
    const headlines: Headline[] = [];

    for (const { game, homeScore, awayScore } of results) {
      const homeTeam = teams[game.homeTeamId];
      const awayTeam = teams[game.awayTeamId];
      if (!homeTeam || !awayTeam) continue;

      // High-scoring games
      if (homeScore + awayScore >= 70) {
        headlines.push({
          text: `Shootout! ${homeTeam.nickname} and ${awayTeam.nickname} combine for ${homeScore + awayScore} points`,
          importance: 'major',
          teamIds: [game.homeTeamId, game.awayTeamId],
        });
      }

      // Shutouts
      if (homeScore === 0 || awayScore === 0) {
        const winner = homeScore > 0 ? homeTeam : awayTeam;
        const loser = homeScore === 0 ? homeTeam : awayTeam;
        headlines.push({
          text: `${winner.nickname} defense shuts out ${loser.nickname}`,
          importance: 'major',
          teamIds: [game.homeTeamId, game.awayTeamId],
        });
      }

      // Close games
      if (Math.abs(homeScore - awayScore) <= 3) {
        const winner = homeScore > awayScore ? homeTeam : awayTeam;
        headlines.push({
          text: `${winner.nickname} win thriller`,
          importance: 'notable',
          teamIds: [game.homeTeamId, game.awayTeamId],
        });
      }
    }

    return headlines.slice(0, 5);
  }

  /**
   * Advance to next week
   */
  advanceWeek(
    currentWeek: number,
    seasonPhase: SeasonPhase,
    gameState: GameState
  ): {
    result: WeekAdvancementResult;
    updatedGameState: GameState;
  } {
    const recoveredPlayers: RecoveredPlayer[] = [];
    const updatedPlayers = { ...gameState.players };

    // Process injury recovery
    for (const [playerId, player] of Object.entries(updatedPlayers)) {
      if (player.injuryStatus.weeksRemaining > 0) {
        const newWeeksRemaining = player.injuryStatus.weeksRemaining - 1;

        updatedPlayers[playerId] = {
          ...player,
          injuryStatus: {
            ...player.injuryStatus,
            weeksRemaining: newWeeksRemaining,
            severity: newWeeksRemaining === 0 ? 'none' : player.injuryStatus.severity,
          },
          // Reset fatigue on new week
          fatigue: 0,
        };

        if (newWeeksRemaining === 0) {
          const team = Object.values(gameState.teams).find(
            (t) => t.rosterPlayerIds?.some((p) => p === playerId)
          );
          recoveredPlayers.push({
            playerId,
            playerName: `${player.firstName} ${player.lastName}`,
            position: player.position,
            teamId: team?.id || '',
            injuryType: player.injuryStatus.type,
          });
        }
      } else {
        // Reset fatigue for healthy players
        updatedPlayers[playerId] = {
          ...player,
          fatigue: 0,
        };
      }
    }

    // Determine new week and phase
    const newWeek = currentWeek + 1;
    let newSeasonPhase = seasonPhase;
    let playoffsStart = false;
    let seasonEnded = false;

    if (
      seasonPhase === 'regularSeason' &&
      currentWeek >= this.config.regularSeasonWeeks
    ) {
      newSeasonPhase = 'playoffs';
      playoffsStart = true;
    } else if (
      seasonPhase === 'playoffs' &&
      currentWeek >= this.config.regularSeasonWeeks + this.config.playoffWeeks
    ) {
      newSeasonPhase = 'offseason';
      seasonEnded = true;
    }

    // Emit event
    if (this.config.emitEvents) {
      this.eventBus.emit({
        type: 'WEEK_START',
        payload: {
          weekNumber: newWeek,
          seasonPhase: newSeasonPhase,
          isUserOnBye: false, // Would need to check
        },
      });

      if (playoffsStart || seasonEnded) {
        this.eventBus.emit({
          type: 'SEASON_PHASE_CHANGE',
          payload: {
            previousPhase: seasonPhase,
            newPhase: newSeasonPhase,
          },
        });
      }
    }

    return {
      result: {
        newWeek,
        seasonPhase: newSeasonPhase,
        recoveredPlayers,
        fatigueReset: true,
        seasonEnded,
        playoffsStart,
      },
      updatedGameState: {
        ...gameState,
        players: updatedPlayers,
      },
    };
  }

  /**
   * Generate week summary
   */
  generateWeekSummary(
    weekFlow: WeekFlowState,
    gameState: GameState,
    userTeamId: string
  ): WeekSummary {
    const userTeam = gameState.teams[userTeamId];
    const userResult = weekFlow.userGameResult;

    // User's result
    let userResultSummary = null;
    if (userResult && userTeam) {
      const opponent = gameState.teams[
        userResult.homeTeamId === userTeamId
          ? userResult.awayTeamId
          : userResult.homeTeamId
      ];
      userResultSummary = {
        won:
          (userResult.homeTeamId === userTeamId &&
            userResult.homeScore > userResult.awayScore) ||
          (userResult.awayTeamId === userTeamId &&
            userResult.awayScore > userResult.homeScore),
        score:
          userResult.homeTeamId === userTeamId
            ? `${userResult.homeScore}-${userResult.awayScore}`
            : `${userResult.awayScore}-${userResult.homeScore}`,
        opponent: opponent?.nickname || 'Unknown',
        newRecord: `${userTeam.currentRecord.wins}-${userTeam.currentRecord.losses}`,
      };
    }

    // Game summaries
    const gameResults: GameSummary[] = [];
    if (weekFlow.userGame && userResult) {
      gameResults.push({
        homeTeamAbbr: gameState.teams[weekFlow.userGame.homeTeamId]?.abbreviation || '???',
        awayTeamAbbr: gameState.teams[weekFlow.userGame.awayTeamId]?.abbreviation || '???',
        homeScore: userResult.homeScore,
        awayScore: userResult.awayScore,
        isUserGame: true,
      });
    }

    // Calculate standings
    const teamsArray = Object.values(gameState.teams);
    const standings = calculateStandings([], teamsArray);

    // Convert to summary format
    const standingsSummary: DivisionStandingSummary[] = [];
    for (const conference of ['afc', 'nfc'] as const) {
      for (const division of ['north', 'south', 'east', 'west'] as const) {
        const divTeams = standings[conference][division];
        standingsSummary.push({
          conference: conference.toUpperCase() as 'AFC' | 'NFC',
          division: (division.charAt(0).toUpperCase() + division.slice(1)) as
            | 'North'
            | 'South'
            | 'East'
            | 'West',
          teams: divTeams.map((t) => ({
            name: gameState.teams[t.teamId]?.nickname || t.teamId,
            abbr: gameState.teams[t.teamId]?.abbreviation || '???',
            wins: t.wins,
            losses: t.losses,
            ties: t.ties,
            divisionRank: t.divisionRank,
            isUserTeam: t.teamId === userTeamId,
          })),
        });
      }
    }

    // Playoff implications
    const playoffImplications = this.generatePlayoffImplications(
      standings,
      weekFlow.weekNumber
    );

    // Injury updates
    const injuryUpdates: InjuryUpdate[] = [];
    if (userResult) {
      for (const injury of userResult.injuries) {
        injuryUpdates.push({
          playerId: injury.playerId,
          playerName: injury.playerName,
          teamId: injury.team,
          teamAbbr: gameState.teams[injury.team]?.abbreviation || '???',
          type: 'new_injury',
          description: `${injury.injuryType} - Out ${injury.weeksOut} weeks`,
        });
      }
    }

    return {
      week: weekFlow.weekNumber,
      userResult: userResultSummary,
      gameResults,
      standings: standingsSummary,
      playoffImplications,
      headlines: [],
      injuryUpdates,
    };
  }

  /**
   * Map injury type string to valid InjuryType
   */
  private mapInjuryType(
    injuryType: string | undefined
  ): import('../models/player/InjuryStatus').InjuryType {
    const validTypes = [
      'concussion',
      'hamstring',
      'knee',
      'ankle',
      'shoulder',
      'back',
      'foot',
      'hand',
      'elbow',
      'groin',
      'ribs',
      'neck',
      'achilles',
      'acl',
      'mcl',
    ] as const;

    if (injuryType && validTypes.includes(injuryType as (typeof validTypes)[number])) {
      return injuryType as import('../models/player/InjuryStatus').InjuryType;
    }
    return 'other';
  }

  /**
   * Check if week can be advanced
   */
  canAdvanceWeek(state: WeekFlowState): { canAdvance: boolean; reason?: string } {
    if (state.isUserOnBye) {
      if (state.otherGamesCompleted < state.otherGames.length) {
        return { canAdvance: false, reason: 'Simulate remaining games' };
      }
      if (!state.gates.weekSummaryViewed) {
        return { canAdvance: false, reason: 'View week summary' };
      }
      return { canAdvance: true };
    }

    if (!state.userGameCompleted) {
      return { canAdvance: false, reason: 'Play your game' };
    }

    if (!state.gates.gameResultViewed) {
      return { canAdvance: false, reason: 'View game result' };
    }

    if (state.otherGamesCompleted < state.otherGames.length) {
      return { canAdvance: false, reason: 'Simulate remaining games' };
    }

    if (!state.gates.weekSummaryViewed) {
      return { canAdvance: false, reason: 'View week summary' };
    }

    return { canAdvance: true };
  }
}

/**
 * Create a new week progression service
 */
export function createWeekProgressionService(
  config: Partial<WeekProgressionConfig> = {}
): WeekProgressionService {
  return new WeekProgressionService(config);
}
