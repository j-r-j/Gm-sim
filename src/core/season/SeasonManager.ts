/**
 * Season Manager
 * Orchestrates the complete season flow from week 1 through the Super Bowl
 */

import { Team } from '../models/team/Team';
import { GameState } from '../models/game/GameState';
import { GameResult } from '../game/GameRunner';
import {
  ScheduledGame,
  SeasonSchedule,
  generateSeasonSchedule,
  getWeekGames,
  updateGameResult,
  createDefaultStandings,
  PreviousYearStandings,
  isRegularSeasonComplete,
} from './ScheduleGenerator';
import {
  DetailedDivisionStandings,
  calculateStandings,
  determinePlayoffTeams,
  TeamStanding,
} from './StandingsCalculator';
import {
  simulateWeek,
  simulateUserTeamGame,
  WeekResults,
  getUserTeamGame,
  isUserOnBye,
} from './WeekSimulator';
import {
  PlayoffSchedule,
  PlayoffMatchup,
  generatePlayoffBracket,
  advancePlayoffRound,
  simulatePlayoffRound,
  simulatePlayoffGame,
  getCurrentPlayoffRound,
  arePlayoffsComplete,
} from './PlayoffGenerator';
import { calculateDraftOrder } from './DraftOrderCalculator';

/**
 * Season phase types
 */
export type SeasonPhase =
  | 'preseason'
  | 'week1' | 'week2' | 'week3' | 'week4' | 'week5' | 'week6' | 'week7' | 'week8' | 'week9'
  | 'week10' | 'week11' | 'week12' | 'week13' | 'week14' | 'week15' | 'week16' | 'week17' | 'week18'
  | 'wildCard' | 'divisional' | 'conference' | 'superBowl'
  | 'offseason';

/**
 * Complete season state
 */
export interface SeasonState {
  year: number;
  phase: SeasonPhase;
  currentWeek: number;

  schedule: SeasonSchedule;
  standings: DetailedDivisionStandings;
  playoffBracket: PlayoffSchedule | null;

  // Weekly results archive
  weekResults: Map<number, WeekResults>;

  // Champion
  superBowlChampion: string | null;

  // Draft order (set after season complete)
  draftOrder: string[] | null;
}

/**
 * Season summary at end of year
 */
export interface SeasonSummary {
  year: number;
  champion: string;
  championRecord: string;
  runnerUp: string;
  mvp: string | null; // Would be determined by player stats
  draftOrder: string[];
  playoffTeams: {
    afc: string[];
    nfc: string[];
  };
}

/**
 * Creates initial season state
 */
function createInitialSeasonState(
  year: number,
  teams: Team[],
  previousStandings: PreviousYearStandings
): SeasonState {
  const schedule = generateSeasonSchedule(teams, previousStandings, year);

  return {
    year,
    phase: 'preseason',
    currentWeek: 0,
    schedule,
    standings: calculateStandings([], teams),
    playoffBracket: null,
    weekResults: new Map(),
    superBowlChampion: null,
    draftOrder: null,
  };
}

/**
 * Gets the phase name for a week number
 */
function getPhaseForWeek(week: number): SeasonPhase {
  if (week === 0) return 'preseason';
  if (week >= 1 && week <= 18) {
    return `week${week}` as SeasonPhase;
  }
  if (week === 19) return 'wildCard';
  if (week === 20) return 'divisional';
  if (week === 21) return 'conference';
  if (week === 22) return 'superBowl';
  return 'offseason';
}

/**
 * Season Manager Class
 * Manages the complete season lifecycle
 */
export class SeasonManager {
  private state: SeasonState;
  private userTeamId: string;
  private teams: Team[];

  constructor(
    year: number,
    teams: Team[],
    userTeamId: string,
    previousStandings?: PreviousYearStandings
  ) {
    this.teams = teams;
    this.userTeamId = userTeamId;

    const standings = previousStandings || createDefaultStandings(teams);
    this.state = createInitialSeasonState(year, teams, standings);
  }

  // =====================
  // State Getters
  // =====================

  /**
   * Gets the current season phase
   */
  getCurrentPhase(): SeasonPhase {
    return this.state.phase;
  }

  /**
   * Gets the current week number
   */
  getCurrentWeek(): number {
    return this.state.currentWeek;
  }

  /**
   * Gets games for the current week
   */
  getWeekGames(): ScheduledGame[] {
    return getWeekGames(this.state.schedule, this.state.currentWeek);
  }

  /**
   * Gets the user's team game for the current week
   */
  getUserTeamGame(): ScheduledGame | null {
    return getUserTeamGame(
      this.state.schedule,
      this.state.currentWeek,
      this.userTeamId
    );
  }

  /**
   * Checks if user is on bye this week
   */
  isUserOnBye(): boolean {
    return isUserOnBye(
      this.state.schedule,
      this.state.currentWeek,
      this.userTeamId
    );
  }

  /**
   * Gets current standings
   */
  getStandings(): DetailedDivisionStandings {
    return this.state.standings;
  }

  /**
   * Gets the playoff bracket (if in playoffs)
   */
  getPlayoffBracket(): PlayoffSchedule | null {
    return this.state.playoffBracket;
  }

  /**
   * Gets the playoff picture for both conferences
   */
  getPlayoffPicture(): { afc: TeamStanding[]; nfc: TeamStanding[] } {
    const result: { afc: TeamStanding[]; nfc: TeamStanding[] } = {
      afc: [],
      nfc: [],
    };

    for (const conference of ['afc', 'nfc'] as const) {
      const allTeams: TeamStanding[] = [];
      for (const division of ['north', 'south', 'east', 'west'] as const) {
        allTeams.push(...this.state.standings[conference][division]);
      }
      allTeams.sort((a, b) => a.conferenceRank - b.conferenceRank);
      result[conference] = allTeams;
    }

    return result;
  }

  /**
   * Gets the schedule
   */
  getSchedule(): SeasonSchedule {
    return this.state.schedule;
  }

  /**
   * Gets the complete season state
   */
  getSeasonState(): SeasonState {
    return this.state;
  }

  // =====================
  // Season Flow
  // =====================

  /**
   * Starts the regular season
   */
  startSeason(): void {
    this.state.currentWeek = 1;
    this.state.phase = 'week1';
  }

  /**
   * Simulates the current week
   *
   * @param simulateUserGame - Whether to simulate the user's game
   * @returns Week results
   */
  simulateWeek(
    gameState: GameState,
    simulateUserGame: boolean = true
  ): WeekResults {
    if (this.isPlayoffTime()) {
      throw new Error('Use simulatePlayoffRound during playoffs');
    }

    const results = simulateWeek(
      this.state.currentWeek,
      this.state.schedule,
      gameState,
      this.userTeamId,
      simulateUserGame
    );

    // Update schedule with results
    for (const { game } of results.games) {
      this.state.schedule = updateGameResult(
        this.state.schedule,
        game.gameId,
        game.homeScore!,
        game.awayScore!
      );
    }

    // Update standings
    this.state.standings = results.standings;

    // Store week results
    this.state.weekResults.set(this.state.currentWeek, results);

    return results;
  }

  /**
   * Simulates just the user's game
   */
  simulateUserGame(gameState: GameState): GameResult | null {
    const result = simulateUserTeamGame(
      this.state.schedule,
      this.state.currentWeek,
      this.userTeamId,
      gameState
    );

    if (result) {
      // Update schedule
      this.state.schedule = updateGameResult(
        this.state.schedule,
        result.game.gameId,
        result.game.homeScore!,
        result.game.awayScore!
      );

      // Recalculate standings
      this.state.standings = calculateStandings(
        this.state.schedule.regularSeason.filter((g) => g.isComplete),
        this.teams
      );

      return result.result;
    }

    return null;
  }

  /**
   * Advances to the next week
   */
  advanceToNextWeek(): void {
    if (this.state.currentWeek >= 18) {
      // Check if regular season complete
      if (isRegularSeasonComplete(this.state.schedule)) {
        this.transitionToPlayoffs();
      }
      return;
    }

    this.state.currentWeek++;
    this.state.phase = getPhaseForWeek(this.state.currentWeek);
  }

  // =====================
  // Playoffs
  // =====================

  /**
   * Checks if it's playoff time
   */
  isPlayoffTime(): boolean {
    return (
      this.state.phase === 'wildCard' ||
      this.state.phase === 'divisional' ||
      this.state.phase === 'conference' ||
      this.state.phase === 'superBowl'
    );
  }

  /**
   * Transitions to playoffs
   */
  private transitionToPlayoffs(): void {
    // Generate playoff bracket
    this.state.playoffBracket = generatePlayoffBracket(this.state.standings);
    this.state.schedule.playoffs = this.state.playoffBracket;
    this.state.currentWeek = 19;
    this.state.phase = 'wildCard';
  }

  /**
   * Generates playoffs (if not already)
   */
  generatePlayoffs(): void {
    if (!this.state.playoffBracket) {
      this.transitionToPlayoffs();
    }
  }

  /**
   * Simulates the current playoff round
   */
  simulatePlayoffRound(gameState: GameState): PlayoffMatchup[] {
    if (!this.state.playoffBracket) {
      throw new Error('Playoffs not started');
    }

    const currentRound = getCurrentPlayoffRound(this.state.playoffBracket);
    if (!currentRound) {
      throw new Error('No current playoff round');
    }

    const results = simulatePlayoffRound(
      this.state.playoffBracket,
      currentRound,
      gameState
    );

    // Advance the bracket
    this.state.playoffBracket = advancePlayoffRound(
      this.state.playoffBracket,
      results
    );

    // Update phase
    this.advancePlayoffPhase();

    return results;
  }

  /**
   * Simulates a single playoff game
   */
  simulatePlayoffGame(
    matchup: PlayoffMatchup,
    gameState: GameState
  ): GameResult {
    return simulatePlayoffGame(matchup, gameState);
  }

  /**
   * Advances the playoff phase
   */
  private advancePlayoffPhase(): void {
    if (!this.state.playoffBracket) return;

    const currentRound = getCurrentPlayoffRound(this.state.playoffBracket);

    if (!currentRound) {
      // Playoffs complete
      this.state.superBowlChampion = this.state.playoffBracket.superBowlChampion;
      this.state.phase = 'offseason';
      this.state.currentWeek = 23;
      this.calculateFinalDraftOrder();
      return;
    }

    switch (currentRound) {
      case 'wildCard':
        this.state.phase = 'wildCard';
        this.state.currentWeek = 19;
        break;
      case 'divisional':
        this.state.phase = 'divisional';
        this.state.currentWeek = 20;
        break;
      case 'conference':
        this.state.phase = 'conference';
        this.state.currentWeek = 21;
        break;
      case 'superBowl':
        this.state.phase = 'superBowl';
        this.state.currentWeek = 22;
        break;
    }
  }

  /**
   * Gets the current playoff matchups
   */
  getCurrentPlayoffMatchups(): PlayoffMatchup[] {
    if (!this.state.playoffBracket) return [];

    const round = getCurrentPlayoffRound(this.state.playoffBracket);
    if (!round) return [];

    switch (round) {
      case 'wildCard':
        return this.state.playoffBracket.wildCardRound;
      case 'divisional':
        return this.state.playoffBracket.divisionalRound;
      case 'conference':
        return this.state.playoffBracket.conferenceChampionships;
      case 'superBowl':
        return this.state.playoffBracket.superBowl
          ? [this.state.playoffBracket.superBowl]
          : [];
    }
  }

  /**
   * Gets the user's playoff game (if any)
   */
  getUserPlayoffGame(): PlayoffMatchup | null {
    const matchups = this.getCurrentPlayoffMatchups();
    return (
      matchups.find(
        (m) =>
          m.homeTeamId === this.userTeamId || m.awayTeamId === this.userTeamId
      ) || null
    );
  }

  /**
   * Checks if user is still in playoffs
   */
  isUserInPlayoffs(): boolean {
    if (!this.state.playoffBracket) return false;

    // Check if user is in playoff seeds
    let inPlayoffs = false;
    for (const teamId of this.state.playoffBracket.afcSeeds.values()) {
      if (teamId === this.userTeamId) inPlayoffs = true;
    }
    for (const teamId of this.state.playoffBracket.nfcSeeds.values()) {
      if (teamId === this.userTeamId) inPlayoffs = true;
    }

    if (!inPlayoffs) return false;

    // Check if eliminated
    const allMatchups = [
      ...this.state.playoffBracket.wildCardRound,
      ...this.state.playoffBracket.divisionalRound,
      ...this.state.playoffBracket.conferenceChampionships,
      ...(this.state.playoffBracket.superBowl
        ? [this.state.playoffBracket.superBowl]
        : []),
    ];

    for (const matchup of allMatchups) {
      if (!matchup.isComplete) continue;

      const isInGame =
        matchup.homeTeamId === this.userTeamId ||
        matchup.awayTeamId === this.userTeamId;
      const lost = isInGame && matchup.winnerId !== this.userTeamId;

      if (lost) return false;
    }

    return true;
  }

  // =====================
  // End of Season
  // =====================

  /**
   * Calculates draft order after season is complete
   */
  private calculateFinalDraftOrder(): void {
    if (!this.state.playoffBracket || !arePlayoffsComplete(this.state.playoffBracket)) {
      return;
    }

    this.state.draftOrder = calculateDraftOrder(
      this.state.standings,
      this.state.playoffBracket
    );
  }

  /**
   * Gets the draft order
   */
  getDraftOrder(): string[] | null {
    return this.state.draftOrder;
  }

  /**
   * Ends the season and returns summary
   */
  endSeason(): SeasonSummary {
    if (!this.state.playoffBracket) {
      throw new Error('Season not complete');
    }

    const champion = this.state.superBowlChampion;
    if (!champion) {
      throw new Error('No champion determined');
    }

    // Get champion's record
    let championRecord = '0-0';
    for (const conference of ['afc', 'nfc'] as const) {
      for (const division of ['north', 'south', 'east', 'west'] as const) {
        const standing = this.state.standings[conference][division].find(
          (s) => s.teamId === champion
        );
        if (standing) {
          championRecord = `${standing.wins}-${standing.losses}${standing.ties > 0 ? `-${standing.ties}` : ''}`;
          break;
        }
      }
    }

    // Get runner up
    const superBowl = this.state.playoffBracket.superBowl;
    const runnerUp = superBowl
      ? superBowl.winnerId === superBowl.homeTeamId
        ? superBowl.awayTeamId
        : superBowl.homeTeamId
      : '';

    // Get playoff teams
    const playoffTeams = determinePlayoffTeams(this.state.standings);

    return {
      year: this.state.year,
      champion,
      championRecord,
      runnerUp,
      mvp: null, // Would be determined by player stats in a future PR
      draftOrder: this.state.draftOrder || [],
      playoffTeams: {
        afc: [...playoffTeams.afc.divisionWinners, ...playoffTeams.afc.wildCards],
        nfc: [...playoffTeams.nfc.divisionWinners, ...playoffTeams.nfc.wildCards],
      },
    };
  }

  /**
   * Checks if the season is complete
   */
  isSeasonComplete(): boolean {
    return (
      this.state.phase === 'offseason' &&
      this.state.superBowlChampion !== null
    );
  }

  /**
   * Gets the Super Bowl champion
   */
  getSuperBowlChampion(): string | null {
    return this.state.superBowlChampion;
  }

  // =====================
  // History
  // =====================

  /**
   * Gets week results for a specific week
   */
  getWeekResults(week: number): WeekResults | undefined {
    return this.state.weekResults.get(week);
  }

  /**
   * Gets all week results
   */
  getAllWeekResults(): Map<number, WeekResults> {
    return this.state.weekResults;
  }
}

/**
 * Creates a new season manager
 */
export function createSeasonManager(
  year: number,
  teams: Team[],
  userTeamId: string,
  previousStandings?: PreviousYearStandings
): SeasonManager {
  return new SeasonManager(year, teams, userTeamId, previousStandings);
}
