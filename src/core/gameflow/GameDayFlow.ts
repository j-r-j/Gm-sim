/**
 * Game Day Flow Service
 *
 * Orchestrates the pre-game → game → post-game flow for user's games.
 * Provides a clean API for screens to interact with game simulation.
 */

import { GameState } from '../models/game/GameState';
import { Team } from '../models/team/Team';
import { GameResult } from '../game/GameRunner';
import { setupGame, GameConfig } from '../game/GameSetup';
import { ScheduledGame } from '../season/ScheduleGenerator';
import { GameSimulationEngine, createGameEngine } from './GameSimulationEngine';
import {
  GameDayPhase,
  GameDayFlowState,
  PreGameInfo,
  PostGameInfo,
  LiveGameDisplay,
  PlayDisplay,
  InjuryStatus,
  GameOutcome,
  SimulationSpeed,
  GamePrediction,
  HalftimeInfo,
} from './types';
import { GameFlowEventBus, gameFlowEventBus } from './events';

/**
 * Weather condition for pre-game display
 */
interface PreGameWeather {
  temperature: number;
  condition: string;
  wind: number;
  precipitation: 'none' | 'rain' | 'snow';
  isDome: boolean;
}

/**
 * Simple weather generator
 */
function generateWeather(week: number, isDome: boolean): PreGameWeather {
  if (isDome) {
    return { temperature: 72, condition: 'dome', wind: 0, precipitation: 'none', isDome: true };
  }

  // Simulate seasonal weather
  const isLateSeasonOrPlayoffs = week > 14;
  const baseTemp = isLateSeasonOrPlayoffs ? 35 : 65;
  const tempVariance = Math.floor(Math.random() * 20) - 10;
  const temperature = baseTemp + tempVariance;

  const wind = Math.floor(Math.random() * 20);

  // Determine precipitation
  let precipitation: 'none' | 'rain' | 'snow' = 'none';
  const precipChance = Math.random();
  if (precipChance < 0.2) {
    precipitation = temperature < 35 ? 'snow' : 'rain';
  }

  const conditions =
    precipitation === 'snow'
      ? 'snow'
      : precipitation === 'rain'
        ? 'rain'
        : isLateSeasonOrPlayoffs
          ? ['clear', 'cloudy', 'cold'][Math.floor(Math.random() * 3)]
          : ['clear', 'sunny', 'cloudy'][Math.floor(Math.random() * 3)];

  return { temperature, condition: conditions, wind, precipitation, isDome: false };
}

/**
 * Configuration for game day flow
 */
export interface GameDayFlowConfig {
  /** Event bus for emitting events */
  eventBus?: GameFlowEventBus;
  /** Whether to emit events */
  emitEvents: boolean;
}

const DEFAULT_CONFIG: GameDayFlowConfig = {
  emitEvents: true,
};

/**
 * Game Day Flow Service
 *
 * Manages the complete game day experience from pre-game through post-game.
 */
export class GameDayFlow {
  private config: GameDayFlowConfig;
  private eventBus: GameFlowEventBus;
  private engine: GameSimulationEngine;

  // State
  private state: GameDayFlowState;
  private gameState: GameState | null = null;
  private userTeamId: string = '';
  private scheduledGame: ScheduledGame | null = null;

  // Callbacks
  private onStateChange: ((state: GameDayFlowState) => void) | null = null;
  private onLiveGameUpdate: ((game: LiveGameDisplay) => void) | null = null;

  constructor(config: Partial<GameDayFlowConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.eventBus = config.eventBus || gameFlowEventBus;
    this.engine = createGameEngine({ eventBus: this.eventBus });

    this.state = this.createInitialState();
  }

  /**
   * Create initial state
   */
  private createInitialState(): GameDayFlowState {
    return {
      phase: 'idle',
      preGameInfo: null,
      liveGame: null,
      simulationSpeed: 'normal',
      isPaused: false,
      prediction: null,
      halftimeInfo: null,
      postGameInfo: null,
    };
  }

  /**
   * Set state change callback
   */
  setOnStateChange(callback: (state: GameDayFlowState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Set live game update callback
   */
  setOnLiveGameUpdate(callback: (game: LiveGameDisplay) => void): void {
    this.onLiveGameUpdate = callback;
    this.engine.setOnStateUpdate(callback);
  }

  /**
   * Get current state
   */
  getState(): GameDayFlowState {
    return { ...this.state };
  }

  /**
   * Initialize game day with a scheduled game
   */
  initializeGameDay(game: ScheduledGame, gameState: GameState, userTeamId: string): PreGameInfo {
    this.gameState = gameState;
    this.userTeamId = userTeamId;
    this.scheduledGame = game;

    const isUserHome = game.homeTeamId === userTeamId;
    const userTeam = gameState.teams[userTeamId];
    const opponentId = isUserHome ? game.awayTeamId : game.homeTeamId;
    const opponent = gameState.teams[opponentId];

    // Generate weather (check if dome stadium)
    const isDome =
      userTeam.stadium?.type === 'domeFixed' || userTeam.stadium?.type === 'domeRetractable';
    const weather = generateWeather(game.week, isDome);

    // Get injuries
    const userInjuries = this.getTeamInjuries(gameState, userTeamId);
    const opponentInjuries = this.getTeamInjuries(gameState, opponentId);

    // Get recent form (simplified)
    const userForm = this.getRecentForm(userTeam);
    const opponentForm = this.getRecentForm(opponent);

    // Generate key matchup
    const keyMatchup = this.generateKeyMatchup(userTeam, opponent);

    const preGameInfo: PreGameInfo = {
      game,
      userTeam,
      opponent,
      isUserHome,
      weather,
      stakes: game.week > 18 ? 'playoff' : 'regular',
      week: game.week,
      keyMatchup,
      userInjuries,
      opponentInjuries,
      userForm,
      opponentForm,
    };

    this.state = {
      ...this.state,
      phase: 'pre_game',
      preGameInfo,
    };

    this.notifyStateChange();

    return preGameInfo;
  }

  /**
   * Set user's game prediction
   */
  setPrediction(prediction: GamePrediction): void {
    this.state = {
      ...this.state,
      prediction,
    };
    this.notifyStateChange();
  }

  /**
   * Start the game simulation
   */
  startGame(): void {
    if (!this.gameState || !this.scheduledGame || !this.state.preGameInfo) {
      console.error('Game day not initialized');
      return;
    }

    const { userTeam, opponent, isUserHome, weather, stakes } = this.state.preGameInfo;

    // Create game config
    const gameConfig: GameConfig = {
      homeTeamId: isUserHome ? userTeam.id : opponent.id,
      awayTeamId: isUserHome ? opponent.id : userTeam.id,
      week: this.scheduledGame.week,
      isPlayoff: stakes === 'playoff',
    };

    // Setup game
    const teams = new Map(Object.entries(this.gameState.teams));
    const players = new Map(Object.entries(this.gameState.players));
    const coaches = new Map(Object.entries(this.gameState.coaches));

    const setup = setupGame(gameConfig, teams, players, coaches);

    // Initialize engine
    this.engine.initializeFromSetup(setup, {
      gameId: this.scheduledGame.gameId,
      week: this.scheduledGame.week,
    });

    // Update state
    this.state = {
      ...this.state,
      phase: 'coin_toss',
    };
    this.notifyStateChange();

    // Brief delay for coin toss animation, then start
    setTimeout(() => {
      this.state = {
        ...this.state,
        phase: 'simulating',
        liveGame: this.engine.getCurrentState(),
      };
      this.notifyStateChange();
    }, 1500);
  }

  /**
   * Set simulation speed
   */
  setSpeed(speed: SimulationSpeed): void {
    this.engine.setSpeed(speed);
    this.state = {
      ...this.state,
      simulationSpeed: speed,
    };
    this.notifyStateChange();
  }

  /**
   * Pause simulation
   */
  pause(): void {
    this.engine.pause();
    this.state = {
      ...this.state,
      isPaused: true,
    };
    this.notifyStateChange();
  }

  /**
   * Resume simulation
   */
  resume(): void {
    this.engine.resume();
    this.state = {
      ...this.state,
      isPaused: false,
    };
    this.notifyStateChange();
  }

  /**
   * Run next play
   */
  async runNextPlay(): Promise<{ play: PlayDisplay; isComplete: boolean } | null> {
    const result = await this.engine.runSinglePlay();
    if (!result) return null;

    this.state = {
      ...this.state,
      liveGame: result.state,
    };

    if (result.isComplete) {
      this.handleGameComplete();
    }

    this.notifyStateChange();

    return { play: result.play, isComplete: result.isComplete };
  }

  /**
   * Run simulation continuously
   */
  async runContinuous(): Promise<GameResult | null> {
    this.state = {
      ...this.state,
      isPaused: false,
    };
    this.notifyStateChange();

    const result = await this.engine.runToCompletion(true);

    if (result) {
      this.handleGameComplete();
    }

    return result;
  }

  /**
   * Skip to end of game
   */
  async skipToEnd(): Promise<GameResult | null> {
    const result = await this.engine.skipToEnd();

    if (result) {
      this.handleGameComplete();
    }

    return result;
  }

  /**
   * Handle game completion
   */
  private handleGameComplete(): void {
    const result = this.engine.getResult();
    if (!result || !this.state.preGameInfo || !this.gameState) return;

    const { userTeam, opponent, isUserHome } = this.state.preGameInfo;

    const userWon = isUserHome
      ? result.homeScore > result.awayScore
      : result.awayScore > result.homeScore;

    // Check prediction
    const predictionCorrect =
      this.state.prediction !== null ? (this.state.prediction === 'win') === userWon : null;

    // Get key plays
    const liveGame = this.engine.getCurrentState();
    const keyPlays =
      liveGame?.recentPlays.filter((p) => p.isScoring || p.isTurnover || p.isBigPlay) || [];

    // Get MVP (simplified - would need stat analysis)
    const mvp = this.determineMVP(result);

    // Get new injuries
    const newInjuries = result.injuries.map((i) => ({
      playerId: i.playerId,
      playerName: i.playerName,
      position: 'Unknown',
      injury: i.injuryType,
      status: 'out' as const,
    }));

    // Calculate new record
    const currentRecord = userTeam.currentRecord;
    const newWins = currentRecord.wins + (userWon ? 1 : 0);
    const newLosses = currentRecord.losses + (userWon ? 0 : 1);

    const postGameInfo: PostGameInfo = {
      result,
      userTeam,
      opponent,
      userWon,
      wasUpset: false, // Would need pre-game favorite logic
      predictionCorrect,
      newUserRecord: `${newWins}-${newLosses}`,
      keyPlays,
      mvp,
      newInjuries,
      playoffImplication: null, // Would calculate based on week
    };

    this.state = {
      ...this.state,
      phase: 'post_game',
      postGameInfo,
    };

    this.notifyStateChange();
  }

  /**
   * Determine game MVP (simplified)
   */
  private determineMVP(result: GameResult): PostGameInfo['mvp'] {
    // Simplified - would analyze box score
    const boxScore = result.boxScore;
    if (boxScore.passingLeaders.length > 0) {
      const leader = boxScore.passingLeaders[0];
      return {
        playerId: leader.playerId,
        playerName: leader.playerName,
        position: 'QB',
        statLine: leader.statLine,
      };
    }
    return null;
  }

  /**
   * Get game result
   */
  getGameResult(): GameResult | null {
    return this.state.postGameInfo?.result || null;
  }

  /**
   * Reset for next game
   */
  reset(): void {
    this.state = this.createInitialState();
    this.gameState = null;
    this.userTeamId = '';
    this.scheduledGame = null;
    this.notifyStateChange();
  }

  /**
   * Get team injuries for pre-game display
   */
  private getTeamInjuries(gameState: GameState, teamId: string): InjuryStatus[] {
    const injuries: InjuryStatus[] = [];
    const team = gameState.teams[teamId];

    if (!team || !team.rosterPlayerIds) return injuries;

    for (const playerId of team.rosterPlayerIds) {
      const player = gameState.players[playerId];
      if (player && player.injuryStatus.weeksRemaining > 0) {
        let status: InjuryStatus['status'] = 'out';
        if (player.injuryStatus.weeksRemaining === 0) status = 'probable';
        else if (player.injuryStatus.weeksRemaining === 1) status = 'questionable';

        injuries.push({
          playerId: player.id,
          playerName: `${player.firstName} ${player.lastName}`,
          position: player.position,
          injury: player.injuryStatus.type,
          status,
        });
      }
    }

    return injuries;
  }

  /**
   * Get recent form (last 3 games)
   */
  private getRecentForm(team: Team): GameOutcome[] {
    // Simplified - would track actual game history
    const form: GameOutcome[] = [];
    const record = team.currentRecord;

    // Generate fake recent form based on record
    for (let i = 0; i < 3; i++) {
      const isWin = Math.random() < record.wins / (record.wins + record.losses + 1);
      form.push({
        result: isWin ? 'W' : 'L',
        opponentAbbr: ['NYG', 'PHI', 'WSH', 'DAL', 'SF'][Math.floor(Math.random() * 5)],
        score: isWin
          ? `${20 + Math.floor(Math.random() * 15)}-${10 + Math.floor(Math.random() * 10)}`
          : `${10 + Math.floor(Math.random() * 10)}-${20 + Math.floor(Math.random() * 15)}`,
      });
    }

    return form;
  }

  /**
   * Generate key matchup description
   */
  private generateKeyMatchup(userTeam: Team, opponent: Team): string {
    const matchups = [
      `Your offense vs their defense`,
      `Your offensive line vs their pass rush`,
      `Your secondary vs their receiving corps`,
      `Your run game vs their run defense`,
      `Your pass rush vs their offensive line`,
    ];
    return matchups[Math.floor(Math.random() * matchups.length)];
  }

  /**
   * Notify state change
   */
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }
}

/**
 * Create a new game day flow service
 */
export function createGameDayFlow(config: Partial<GameDayFlowConfig> = {}): GameDayFlow {
  return new GameDayFlow(config);
}
