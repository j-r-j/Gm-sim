# PR-07: Single Game Resolution System

## Objective

Implement the complete single game resolution system including pre-game setup, statistics tracking, box scores, and post-game results. This builds on PR-06's engine to provide the full game experience.

## Dependencies

- **PR-01 through PR-05**: Foundation and generation ✅
- **PR-06**: Probability-Based Simulation Engine ✅

## Branch Name

`feature/pr-07-game-resolution`

-----

## AI Developer Prompt

```
You are building an NFL GM Simulation React Native mobile game. This is PR-07 of 25.

### PLATFORM
React Native CLI - iOS and Android
TypeScript strict mode

### CONTEXT
PR-06 built the simulation engine. Now we need to wrap it with pre-game setup, statistics tracking, and post-game processing to create the complete game experience.

### DEPENDENCIES
PR-06 must be complete with GameStateMachine working.

### YOUR TASK
Create the single game resolution system with full statistics and results.

### REQUIREMENTS

1. **Statistics Tracker** (`src/core/game/StatisticsTracker.ts`)
   ```typescript
   import { PlayResult } from '../engine/PlayResolver';

   export interface PassingStats {
     attempts: number;
     completions: number;
     yards: number;
     touchdowns: number;
     interceptions: number;
     sacks: number;
     sackYardsLost: number;
     longestPass: number;
     rating: number;  // Passer rating (calculated)
   }

   export interface RushingStats {
     attempts: number;
     yards: number;
     touchdowns: number;
     fumbles: number;
     fumblesLost: number;
     longestRush: number;
     yardsPerCarry: number;
   }

   export interface ReceivingStats {
     targets: number;
     receptions: number;
     yards: number;
     touchdowns: number;
     longestReception: number;
     yardsPerReception: number;
     drops: number;
   }

   export interface DefensiveStats {
     tackles: number;
     tacklesForLoss: number;
     sacks: number;
     interceptions: number;
     passesDefended: number;
     forcedFumbles: number;
     fumblesRecovered: number;
     touchdowns: number;  // Defensive TDs
   }

   export interface KickingStats {
     fieldGoalAttempts: number;
     fieldGoalsMade: number;
     longestFieldGoal: number;
     extraPointAttempts: number;
     extraPointsMade: number;
   }

   export interface PlayerGameStats {
     playerId: string;
     passing: PassingStats;
     rushing: RushingStats;
     receiving: ReceivingStats;
     defensive: DefensiveStats;
     kicking: KickingStats;
     snapsPlayed: number;
     penaltiesCommitted: number;
     penaltyYards: number;
   }

   export interface TeamGameStats {
     teamId: string;

     // Scoring
     score: number;
     scoreByQuarter: number[];

     // Offense totals
     totalYards: number;
     passingYards: number;
     rushingYards: number;
     turnovers: number;

     // Time of possession
     timeOfPossession: number;  // Seconds

     // Efficiency
     thirdDownAttempts: number;
     thirdDownConversions: number;
     fourthDownAttempts: number;
     fourthDownConversions: number;
     redZoneAttempts: number;
     redZoneTouchdowns: number;

     // Other
     penalties: number;
     penaltyYards: number;
     firstDowns: number;
     punts: number;
     puntYards: number;

     // Individual stats
     playerStats: Map<string, PlayerGameStats>;
   }

   export class StatisticsTracker {
     private homeStats: TeamGameStats;
     private awayStats: TeamGameStats;

     constructor(homeTeamId: string, awayTeamId: string);

     recordPlay(play: PlayResult, offenseTeamId: string): void;
     getHomeStats(): TeamGameStats;
     getAwayStats(): TeamGameStats;
     getPlayerStats(playerId: string): PlayerGameStats | null;
     calculatePasserRating(stats: PassingStats): number;
   }
```

1. **Box Score Generator** (`src/core/game/BoxScoreGenerator.ts`)

   ```typescript
   import { TeamGameStats, PlayerGameStats } from './StatisticsTracker';

   export interface BoxScore {
     gameId: string;
     date: string;
     week: number;

     // Teams
     homeTeam: {
       id: string;
       name: string;
       abbreviation: string;
       score: number;
       scoreByQuarter: number[];
     };
     awayTeam: {
       id: string;
       name: string;
       abbreviation: string;
       score: number;
       scoreByQuarter: number[];
     };

     // Team comparison
     teamComparison: {
       category: string;
       home: string | number;
       away: string | number;
     }[];

     // Scoring summary
     scoringSummary: ScoringPlay[];

     // Individual leaders
     passingLeaders: PlayerStatLine[];
     rushingLeaders: PlayerStatLine[];
     receivingLeaders: PlayerStatLine[];
     defensiveLeaders: PlayerStatLine[];

     // Full player stats (for detailed view)
     homePlayerStats: PlayerStatLine[];
     awayPlayerStats: PlayerStatLine[];
   }

   export interface ScoringPlay {
     quarter: number;
     time: string;
     team: string;
     description: string;
     homeScore: number;
     awayScore: number;
   }

   export interface PlayerStatLine {
     playerId: string;
     playerName: string;
     position: string;
     statLine: string;  // "22/31, 287 YDS, 2 TD, 1 INT"
   }

   export function generateBoxScore(
     homeStats: TeamGameStats,
     awayStats: TeamGameStats,
     scoringPlays: ScoringPlay[],
     gameInfo: { gameId: string; week: number; date: string },
   ): BoxScore;
   ```
1. **Game Setup** (`src/core/game/GameSetup.ts`)

   ```typescript
   import { Team } from '../models/team/Team';
   import { TeamGameState } from '../engine/TeamGameState';
   import { WeatherCondition, GameStakes } from '../engine/EffectiveRatingCalculator';

   export interface GameConfig {
     homeTeamId: string;
     awayTeamId: string;
     week: number;
     isPlayoff: boolean;
     playoffRound?: 'wildCard' | 'divisional' | 'conference' | 'superBowl';
   }

   /**
    * Set up a game for simulation
    */
   export function setupGame(
     config: GameConfig,
     teams: Map<string, Team>,
     players: Map<string, Player>,
     coaches: Map<string, Coach>,
   ): {
     homeTeamState: TeamGameState;
     awayTeamState: TeamGameState;
     weather: WeatherCondition;
     stakes: GameStakes;
     homeFieldAdvantage: number;
   };

   /**
    * Generate weather based on stadium and week
    */
   export function generateWeather(
     stadium: Stadium,
     week: number,
   ): WeatherCondition;

   /**
    * Calculate home field advantage
    */
   export function calculateHomeFieldAdvantage(
     stadium: Stadium,
     week: number,
     stakes: GameStakes,
   ): number;  // Points equivalent (2-3 typically)

   /**
    * Select starting lineup from roster
    */
   export function selectStartingLineup(
     team: Team,
     players: Map<string, Player>,
     injuredPlayerIds: string[],
   ): {
     offense: { /* by position */ };
     defense: { /* by position */ };
     specialTeams: { /* by position */ };
   };
   ```
1. **Game Runner** (`src/core/game/GameRunner.ts`)

   ```typescript
   import { GameStateMachine, GameState } from '../engine/GameStateMachine';
   import { StatisticsTracker, TeamGameStats } from './StatisticsTracker';
   import { BoxScore } from './BoxScoreGenerator';

   export interface GameResult {
     gameId: string;
     week: number;

     // Outcome
     homeTeamId: string;
     awayTeamId: string;
     homeScore: number;
     awayScore: number;
     winnerId: string;
     loserId: string;
     isTie: boolean;

     // Stats
     homeStats: TeamGameStats;
     awayStats: TeamGameStats;
     boxScore: BoxScore;

     // Injuries that occurred
     injuries: GameInjury[];

     // Notable events
     notableEvents: NotableEvent[];

     // Play-by-play (condensed)
     keyPlays: PlayResult[];
   }

   export interface GameInjury {
     playerId: string;
     playerName: string;
     team: string;
     injuryType: string;
     severity: string;
     weeksOut: number;
   }

   export interface NotableEvent {
     type: 'milestone' | 'record' | 'highlight' | 'lowlight';
     playerId: string | null;
     description: string;
   }

   /**
    * Run a complete game and return results
    */
   export function runGame(config: GameConfig): GameResult;

   /**
    * Run game with options for user watching
    */
   export interface GameRunnerOptions {
     mode: 'instant' | 'playByPlay';  // Instant for sim, playByPlay for watching
     onPlayComplete?: (play: PlayResult, state: GameState) => void;
     onQuarterComplete?: (quarter: number, state: GameState) => void;
     onScoreChange?: (state: GameState) => void;
   }

   export class GameRunner {
     private machine: GameStateMachine;
     private tracker: StatisticsTracker;
     private options: GameRunnerOptions;

     constructor(config: GameConfig, options: GameRunnerOptions);

     // For instant simulation
     runToCompletion(): GameResult;

     // For play-by-play watching
     runNextPlay(): { play: PlayResult; state: GameState; isComplete: boolean };
     runDrive(): { plays: PlayResult[]; state: GameState; isComplete: boolean };
     runQuarter(): { plays: PlayResult[]; state: GameState; isComplete: boolean };

     // State access
     getCurrentState(): GameState;
     getBoxScore(): BoxScore;
   }
   ```
1. **Post-Game Processor** (`src/core/game/PostGameProcessor.ts`)

   ```typescript
   import { GameResult } from './GameRunner';
   import { Player } from '../models/player/Player';

   /**
    * Process game results and update persistent state
    */
   export interface PostGameUpdates {
     // Player updates
     playerUpdates: {
       playerId: string;
       fatigueChange: number;
       moraleChange: number;
       injuryUpdate: InjuryUpdate | null;
       seasonStats: Partial<PlayerGameStats>;
     }[];

     // Team updates
     teamUpdates: {
       teamId: string;
       winsChange: number;
       lossesChange: number;
       divisionRecord: { wins: number; losses: number };
       conferenceRecord: { wins: number; losses: number };
       pointsFor: number;
       pointsAgainst: number;
     }[];

     // Standings implications
     standingsUpdate: {
       teamId: string;
       newDivisionRank: number;
       newConferenceRank: number;
       playoffPicture: 'in' | 'out' | 'contention';
     }[];

     // News events generated
     newsEvents: NewsEvent[];
   }

   export interface InjuryUpdate {
     playerId: string;
     newStatus: 'healthy' | 'questionable' | 'doubtful' | 'out' | 'ir';
     weeksRemaining: number;
   }

   export interface NewsEvent {
     headline: string;
     body: string;
     involvedPlayerIds: string[];
     involvedTeamIds: string[];
     type: 'injury' | 'performance' | 'milestone' | 'trade_rumor' | 'contract';
   }

   export function processGameResult(result: GameResult): PostGameUpdates;

   /**
    * Check for notable achievements
    */
   export function checkMilestones(
     playerId: string,
     gameStats: PlayerGameStats,
     careerStats: PlayerCareerStats,
   ): NotableEvent[];

   /**
    * Generate game-related news
    */
   export function generateGameNews(result: GameResult): NewsEvent[];
   ```
1. **Season Stats Aggregator** (`src/core/game/SeasonStatsAggregator.ts`)

   ```typescript
   export interface PlayerSeasonStats {
     playerId: string;
     gamesPlayed: number;
     gamesStarted: number;

     // Cumulative stats
     passing: PassingStats;
     rushing: RushingStats;
     receiving: ReceivingStats;
     defensive: DefensiveStats;
     kicking: KickingStats;

     // Calculated
     fantasyPoints: number;  // For comparison purposes
     approximateValue: number;  // Hidden, for AI evaluation
   }

   export interface TeamSeasonStats {
     teamId: string;
     gamesPlayed: number;

     // Cumulative
     pointsFor: number;
     pointsAgainst: number;
     totalYards: number;
     yardsAllowed: number;
     turnoversForced: number;
     turnoversCommitted: number;

     // Averages
     pointsPerGame: number;
     yardsPerGame: number;

     // Rankings (calculated)
     offenseRank: number;
     defenseRank: number;
   }

   export function aggregatePlayerStats(
     gameStats: PlayerGameStats[],
   ): PlayerSeasonStats;

   export function aggregateTeamStats(
     gameResults: GameResult[],
     teamId: string,
   ): TeamSeasonStats;

   export function calculateLeagueRankings(
     teamStats: TeamSeasonStats[],
   ): Map<string, { offenseRank: number; defenseRank: number }>;
   ```

### BRAND GUIDELINES COMPLIANCE

Before completing, verify:

- [ ] Statistics are visible (this is outcome data, not internals)
- [ ] No effective ratings shown in stats
- [ ] No probability data in box scores
- [ ] Player performance reflects hidden attributes but doesn't expose them
- [ ] Weekly variance effects visible in results but system hidden

### TESTS TO WRITE

1. **statisticsTracker.test.ts**
- Test stat recording for all play types
- Test passer rating calculation
- Test accumulation over multiple plays
1. **boxScoreGenerator.test.ts**
- Test box score format
- Test stat leaders extraction
- Test scoring summary
1. **gameSetup.test.ts**
- Test weather generation
- Test home field advantage calculation
- Test lineup selection
1. **gameRunner.test.ts**
- Test complete game execution
- Test play-by-play mode
- Test injury recording
1. **postGameProcessor.test.ts**
- Test standings updates
- Test injury status updates
- Test news generation

### BOOLEAN CHECKPOINTS

```typescript
const checkpoints = {
  // Checkpoint 1: PR-06 complete
  pr06Complete: () => {
    return fs.existsSync('src/core/engine/GameStateMachine.ts');
  },

  // Checkpoint 2: All files created
  filesCreated: () => {
    const files = [
      'src/core/game/StatisticsTracker.ts',
      'src/core/game/BoxScoreGenerator.ts',
      'src/core/game/GameSetup.ts',
      'src/core/game/GameRunner.ts',
      'src/core/game/PostGameProcessor.ts',
      'src/core/game/SeasonStatsAggregator.ts',
    ];
    return files.every(f => fs.existsSync(f));
  },

  // Checkpoint 3: TypeScript compiles
  typeCheckPasses: async () => {
    const result = await runCommand('npx tsc --noEmit');
    return result.exitCode === 0;
  },

  // Checkpoint 4: Tests pass
  testsPass: async () => {
    const result = await runCommand('npm test -- --testPathPattern=game');
    return result.exitCode === 0;
  },

  // Checkpoint 5: Can run complete game
  canRunGame: () => {
    const { runGame } = require('./src/core/game/GameRunner');
    const result = runGame({ /* test config */ });
    return result.winnerId && result.boxScore;
  },

  // Checkpoint 6: Box score generates correctly
  boxScoreValid: () => {
    const { runGame } = require('./src/core/game/GameRunner');
    const result = runGame({ /* test config */ });
    return result.boxScore.homeTeam &&
           result.boxScore.awayTeam &&
           result.boxScore.scoringSummary.length >= 0;
  },

  // Checkpoint 7: No internals exposed
  noInternalsExposed: () => {
    const { runGame } = require('./src/core/game/GameRunner');
    const result = runGame({ /* test config */ });
    const serialized = JSON.stringify(result);
    return !serialized.includes('effectiveRating') &&
           !serialized.includes('probability');
  }
};

// ALL must return true before proceeding to PR-08
const canProceed = Object.values(checkpoints).every(check => check() === true);
```

### EXPECTED DELIVERABLES

1. Complete statistics tracking system
1. Box score generation
1. Game setup with weather and home field
1. Game runner with instant and play-by-play modes
1. Post-game processing for state updates
1. Season stats aggregation
1. Comprehensive test coverage

### DO NOT

- Do not create UI components
- Do not expose engine internals in results
- Do not implement season scheduling (next PR)
- Do not implement playoffs (later)

```
---

## Files to Create
```

src/core/game/
├── index.ts
├── StatisticsTracker.ts
├── BoxScoreGenerator.ts
├── GameSetup.ts
├── GameRunner.ts
├── PostGameProcessor.ts
├── SeasonStatsAggregator.ts
└── **tests**/
├── statisticsTracker.test.ts
├── boxScoreGenerator.test.ts
├── gameSetup.test.ts
├── gameRunner.test.ts
└── postGameProcessor.test.ts

```
---

## Next PR
Upon successful completion of all checkpoints, proceed to **PR-08: Season Loop & Standings**
```
