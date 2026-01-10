# PR-06: Probability-Based Simulation Engine

## Objective

Implement the Strat-O-Matic inspired probability-based simulation engine that resolves plays using hidden outcome tables. This is the "black box" core - users never see dice rolls, probability tables, or modifier calculations.

## Dependencies

- **PR-01 through PR-04**: All data models ✅
- **PR-05**: Player Generation System ✅

## Branch Name

`feature/pr-06-simulation-engine`

-----

## AI Developer Prompt

```
You are building an NFL GM Simulation React Native mobile game. This is PR-06 of 25.

### PLATFORM
React Native CLI - iOS and Android
TypeScript strict mode

### CONTEXT
This is the heart of the game - the Strat-O-Matic inspired simulation engine. The core concept:
1. Play is called (based on coordinator tendencies)
2. Engine generates outcome probability tables for each player
3. Roll determines if offense or defense "wins" the play
4. Result cross-referenced against winner's outcome table
5. Outcome resolved and returned

**CRITICAL:** Users NEVER see probability tables, dice rolls, or any mechanics. They only see play results.

### DEPENDENCIES
PR-05 must be complete with player generation working.

### YOUR TASK
Create the probability-based simulation engine.

### REQUIREMENTS

1. **Effective Rating Calculator** (`src/core/engine/EffectiveRatingCalculator.ts`)
   ```typescript
   import { Player } from '../models/player/Player';
   import { Coach } from '../models/staff/Coach';

   /**
    * Calculate a player's effective rating for a specific play/moment
    *
    * Formula:
    * Base True Rating
    * + Scheme Fit (-10 to +8)
    * + Role Fit (-8 to +10)
    * + Coach Chemistry (-10 to +10)
    * + Weather Tolerance (-10 to +2)
    * + Game Stakes × "It" Factor (-15 to +15)
    * + Weekly Random (Consistency-based)
    * = Effective Rating
    *
    * This value is NEVER shown to the user
    */
   export interface EffectiveRatingParams {
     player: Player;
     skill: string;
     positionCoach: Coach | null;
     teamScheme: string;
     assignedRole: string;
     weather: WeatherCondition;
     gameStakes: GameStakes;
     weeklyVariance: number;
   }

   export type GameStakes = 'preseason' | 'regular' | 'rivalry' | 'playoff' | 'championship';

   export type WeatherCondition = {
     temperature: number;
     precipitation: 'none' | 'rain' | 'snow';
     wind: number;  // mph
     isDome: boolean;
   };

   export function calculateEffectiveRating(params: EffectiveRatingParams): number;

   // Individual modifier calculators (all hidden from user)
   export function calculateSchemeFitModifier(player: Player, scheme: string): number;
   export function calculateRoleFitModifier(player: Player, role: string): number;
   export function calculateCoachChemistryModifier(player: Player, coach: Coach | null): number;
   export function calculateWeatherModifier(player: Player, weather: WeatherCondition): number;
   export function calculateStakesModifier(player: Player, stakes: GameStakes): number;
```

1. **Weekly Variance Calculator** (`src/core/engine/WeeklyVarianceCalculator.ts`)

   ```typescript
   import { ConsistencyProfile, ConsistencyTier } from '../models/player/Consistency';

   export const VARIANCE_RANGES: Record<ConsistencyTier, { min: number; max: number }> = {
     metronome: { min: -2, max: 2 },
     steady: { min: -4, max: 4 },
     average: { min: -7, max: 7 },
     streaky: { min: -10, max: 12 },
     volatile: { min: -15, max: 15 },
     chaotic: { min: -20, max: 20 },
   };

   export function calculateWeeklyVariance(
     consistency: ConsistencyProfile,
     previousWeekVariance?: number,
   ): {
     variance: number;
     newStreakState: 'hot' | 'cold' | 'neutral';
     streakGamesRemaining: number;
   };

   // Pre-calculate all player variances for a week
   export function calculateTeamWeeklyVariances(
     players: Player[],
   ): Map<string, number>;  // playerId -> variance
   ```
1. **Outcome Tables** (`src/core/engine/OutcomeTables.ts`)

   ```typescript
   // Strat-O-Matic style outcome tables - COMPLETELY HIDDEN from users

   export type PlayType =
     | 'run_inside' | 'run_outside' | 'run_draw' | 'run_sweep'
     | 'pass_short' | 'pass_medium' | 'pass_deep' | 'pass_screen'
     | 'play_action_short' | 'play_action_deep'
     | 'qb_scramble' | 'qb_sneak'
     | 'field_goal' | 'punt' | 'kickoff';

   export type PlayOutcome =
     | 'touchdown' | 'big_gain' | 'good_gain' | 'moderate_gain'
     | 'short_gain' | 'no_gain' | 'loss' | 'big_loss'
     | 'sack' | 'incomplete' | 'interception' | 'fumble' | 'fumble_lost'
     | 'penalty_offense' | 'penalty_defense'
     | 'field_goal_made' | 'field_goal_missed';

   export interface OutcomeTableEntry {
     outcome: PlayOutcome;
     probability: number;  // 0-1, all entries sum to 1
     yardsRange: { min: number; max: number };
     secondaryEffects?: SecondaryEffect[];
   }

   export type SecondaryEffect =
     | 'injury_check' | 'fatigue_high' | 'big_hit' | 'highlight_play';

   /**
    * Generate outcome table based on matchup quality
    * This is the core Strat-O-Matic mechanic
    */
   export function generateOutcomeTable(
     offensiveEffectiveRating: number,
     defensiveEffectiveRating: number,
     playType: PlayType,
     situation: DownAndDistance,
     fieldPosition: number,  // Yards from own end zone
   ): OutcomeTableEntry[];

   /**
    * Roll against outcome table and return result
    */
   export function rollOutcome(
     table: OutcomeTableEntry[],
   ): {
     outcome: PlayOutcome;
     yards: number;
     secondaryEffects: SecondaryEffect[];
   };

   export interface DownAndDistance {
     down: 1 | 2 | 3 | 4;
     yardsToGo: number;
     yardsToEndzone: number;
   }
   ```
1. **Play Caller** (`src/core/engine/PlayCaller.ts`)

   ```typescript
   import { OffensiveTendencies, DefensiveTendencies } from '../models/staff/CoordinatorTendencies';
   import { PlayType } from './OutcomeTables';

   export interface PlayCallContext {
     down: number;
     distance: number;
     fieldPosition: number;
     timeRemaining: number;  // Seconds in game
     quarter: 1 | 2 | 3 | 4 | 'OT';
     scoreDifferential: number;  // Positive = winning
     weather: WeatherCondition;
     isRedZone: boolean;
     isTwoMinuteWarning: boolean;
   }

   /**
    * Select play based on coordinator tendencies and situation
    * User never sees this - it just happens based on their OC/DC
    */
   export function selectOffensivePlay(
     tendencies: OffensiveTendencies,
     context: PlayCallContext,
   ): {
     playType: PlayType;
     targetPosition: string;  // WR1, RB, TE, etc.
     formation: string;
   };

   export function selectDefensivePlay(
     tendencies: DefensiveTendencies,
     context: PlayCallContext,
     offensiveFormation: string,
   ): {
     coverage: string;
     blitz: boolean;
     pressRate: number;
   };
   ```
1. **Matchup Resolver** (`src/core/engine/MatchupResolver.ts`)

   ```typescript
   import { Player } from '../models/player/Player';

   export interface MatchupResult {
     winner: 'offense' | 'defense' | 'neutral';
     marginOfVictory: number;  // How decisively
     offensiveRating: number;
     defensiveRating: number;
   }

   /**
    * Resolve individual matchups (WR vs CB, OL vs DL, etc.)
    */
   export function resolveMatchup(
     offensivePlayer: Player,
     offensiveEffective: number,
     defensivePlayer: Player,
     defensiveEffective: number,
   ): MatchupResult;

   /**
    * Aggregate matchups for a play (OL vs DL for run, WR vs CB for pass)
    */
   export function resolvePlayMatchup(
     offensivePlayers: { player: Player; effective: number }[],
     defensivePlayers: { player: Player; effective: number }[],
     playType: PlayType,
   ): {
     overallWinner: 'offense' | 'defense';
     aggregateMargin: number;
     keyMatchup: { offense: string; defense: string; result: string };
   };
   ```
1. **Play Resolver** (`src/core/engine/PlayResolver.ts`)

   ```typescript
   import { PlayType, PlayOutcome } from './OutcomeTables';

   export interface PlayResult {
     // What happened
     playType: PlayType;
     outcome: PlayOutcome;
     yardsGained: number;

     // Who was involved (for stats/display)
     primaryOffensivePlayer: string;  // Player ID
     primaryDefensivePlayer: string | null;

     // Game state changes
     newDown: number;
     newDistance: number;
     newFieldPosition: number;
     turnover: boolean;
     touchdown: boolean;
     firstDown: boolean;

     // Side effects
     injuryOccurred: boolean;
     injuredPlayerId: string | null;
     penaltyOccurred: boolean;
     penaltyDetails: PenaltyDetails | null;

     // For display (user sees this)
     description: string;  // "D. Smith rush left for 6 yards"
   }

   export interface PenaltyDetails {
     team: 'offense' | 'defense';
     type: string;
     yards: number;
     playerId: string | null;
     declined: boolean;
   }

   /**
    * Main play resolution function
    * Takes all context and returns what happened
    */
   export function resolvePlay(
     offensiveTeam: TeamGameState,
     defensiveTeam: TeamGameState,
     playCall: { offensive: any; defensive: any },
     context: PlayCallContext,
     weeklyVariances: Map<string, number>,
   ): PlayResult;
   ```
1. **Team Game State** (`src/core/engine/TeamGameState.ts`)

   ```typescript
   import { Player } from '../models/player/Player';
   import { Coach } from '../models/staff/Coach';

   export interface TeamGameState {
     teamId: string;

     // Active players by position
     offense: {
       qb: Player;
       rb: Player[];
       wr: Player[];
       te: Player[];
       ol: Player[];  // LT, LG, C, RG, RT
     };
     defense: {
       dl: Player[];
       lb: Player[];
       db: Player[];
     };
     specialTeams: {
       k: Player;
       p: Player;
       returner: Player;
     };

     // Coaches
     offensiveCoordinator: Coach;
     defensiveCoordinator: Coach;
     positionCoaches: Map<string, Coach>;

     // Scheme
     offensiveScheme: string;
     defensiveScheme: string;

     // In-game state
     timeoutsRemaining: number;
     fatigueLevels: Map<string, number>;  // playerId -> fatigue 0-100

     // Pre-calculated weekly variances
     weeklyVariances: Map<string, number>;
   }
   ```
1. **Game State Machine** (`src/core/engine/GameStateMachine.ts`)

   ```typescript
   export interface GameClock {
     quarter: 1 | 2 | 3 | 4 | 'OT';
     timeRemaining: number;  // Seconds in quarter
     playClock: number;
     isRunning: boolean;
   }

   export interface FieldState {
     ballPosition: number;  // Yards from home team end zone
     possession: 'home' | 'away';
     down: 1 | 2 | 3 | 4;
     yardsToGo: number;
     yardsToEndzone: number;
   }

   export interface ScoreState {
     home: number;
     away: number;
   }

   export interface GameState {
     gameId: string;
     homeTeam: TeamGameState;
     awayTeam: TeamGameState;

     clock: GameClock;
     field: FieldState;
     score: ScoreState;

     // Game situation
     weather: WeatherCondition;
     stakes: GameStakes;

     // History (for stats, play-by-play)
     plays: PlayResult[];

     // State
     isComplete: boolean;
     inProgress: boolean;
   }

   export class GameStateMachine {
     private state: GameState;

     constructor(homeTeam: TeamGameState, awayTeam: TeamGameState, config: GameConfig);

     // Advance the game
     executePlay(): PlayResult;

     // Handle special situations
     handleKickoff(): PlayResult;
     handlePunt(): PlayResult;
     handleFieldGoal(): PlayResult;
     handleTwoPointConversion(): PlayResult;
     handleExtraPoint(): PlayResult;

     // Clock management
     advanceClock(seconds: number): void;
     callTimeout(team: 'home' | 'away'): boolean;

     // State queries
     getState(): GameState;
     getCurrentContext(): PlayCallContext;
     isGameOver(): boolean;

     // Run to completion
     simulateToEnd(): GameState;
     simulateQuarter(): GameState;
     simulateDrive(): { plays: PlayResult[]; result: DriveResult };
   }

   export type DriveResult =
     | 'touchdown' | 'field_goal' | 'punt' | 'turnover' | 'turnover_on_downs' | 'end_of_half';
   ```
1. **Injury Processor** (`src/core/engine/InjuryProcessor.ts`)

   ```typescript
   import { Player } from '../models/player/Player';

   export interface InjuryCheckParams {
     player: Player;
     playType: PlayType;
     outcome: PlayOutcome;
     hadBigHit: boolean;
     currentFatigue: number;
     weather: WeatherCondition;
   }

   export interface InjuryResult {
     occurred: boolean;
     type: InjuryType | null;
     severity: InjurySeverity | null;
     weeksOut: number;
     permanentEffects: PermanentInjuryEffect[];
   }

   export type InjuryType =
     | 'concussion' | 'ankle' | 'knee_minor' | 'knee_acl' | 'knee_mcl'
     | 'hamstring' | 'shoulder' | 'back' | 'hand' | 'foot' | 'ribs';

   export type InjurySeverity = 'minor' | 'moderate' | 'significant' | 'severe' | 'season_ending';

   export type PermanentInjuryEffect =
     | 'speed_reduction' | 'agility_reduction' | 'reinjury_risk' | 'none';

   export function checkForInjury(params: InjuryCheckParams): InjuryResult;

   // Injury prone trait increases probability
   // Iron Man trait decreases probability
   // Position affects injury type distribution
   // Weather affects soft tissue injury risk
   ```
1. **Fatigue System** (`src/core/engine/FatigueSystem.ts`)

   ```typescript
   import { Player } from '../models/player/Player';

   export interface FatigueParams {
     player: Player;
     currentFatigue: number;  // 0-100
     snapCount: number;       // Snaps this game
     weather: WeatherCondition;
     playIntensity: 'low' | 'normal' | 'high';
   }

   /**
    * Calculate fatigue increase from a play
    */
   export function calculateFatigueIncrease(params: FatigueParams): number;

   /**
    * Get performance penalty from fatigue
    */
   export function getFatiguePenalty(fatigue: number): number;

   /**
    * Calculate fatigue recovery between plays
    */
   export function calculateFatigueRecovery(
     currentFatigue: number,
     playsSinceLastSnap: number,
     playerCondition: number,  // From physical attributes
   ): number;
   ```
1. **Play Description Generator** (`src/core/engine/PlayDescriptionGenerator.ts`)

   ```typescript
   import { PlayResult } from './PlayResolver';
   import { Player } from '../models/player/Player';

   /**
    * Generate human-readable play descriptions
    * This is what users actually see
    */
   export function generatePlayDescription(
     result: PlayResult,
     players: Map<string, Player>,
   ): string;

   // Examples:
   // "D. Smith rush left for 6 yards"
   // "M. Johnson pass deep right to T. Williams for 34 yards, TOUCHDOWN"
   // "J. Brown sacked by A. Davis for loss of 8 yards"
   // "Pass incomplete to R. Miller (defended by C. Jones)"
   // "INTERCEPTION by S. Thompson at the 35 yard line"

   export function generateDriveSummary(
     plays: PlayResult[],
     result: DriveResult,
   ): string;
   ```

### CRITICAL IMPLEMENTATION NOTES

1. **The Black Box Principle:**
- NO probability values ever exposed to user
- NO dice roll values shown
- NO effective ratings displayed
- Only PlayResult.description and final statistics visible
1. **Outcome Table Generation:**

   ```typescript
   // Example: If offense has 85 effective, defense has 75 effective
   // Offense has +10 advantage = better outcome probabilities
   function generateOutcomeTable(offRating, defRating, playType, situation) {
     const advantage = offRating - defRating;  // -40 to +40 range

     // Shift probability distribution based on advantage
     // Higher advantage = more big_gain, touchdown
     // Lower advantage = more no_gain, sack, interception

     // Return table that sums to 1.0 probability
   }
   ```
1. **Stat Tracking:**
   PlayResult should have enough information to update all player stats, but the engine internals remain hidden.

### BRAND GUIDELINES COMPLIANCE

Before completing, verify:

- [ ] No probability values exposed in any public interface
- [ ] No dice roll values shown anywhere
- [ ] Effective ratings calculated but NEVER returned to UI
- [ ] Weekly variance applied but hidden
- [ ] "It" factor influences results but value never exposed
- [ ] PlayResult only contains outcome, yards, description - no internals
- [ ] Outcome tables completely encapsulated

### TESTS TO WRITE

1. **effectiveRating.test.ts**
- Test all modifiers calculate correctly
- Test scheme fit applies correctly
- Test "It" factor influences stakes correctly
- Test weather modifiers apply
- Test combined rating is reasonable (1-100 range)
1. **weeklyVariance.test.ts**
- Test variance within expected ranges per tier
- Test streak system activates for streaky players
- Test metronome players have minimal variance
1. **outcomeTables.test.ts**
- Test tables always sum to 1.0
- Test higher advantage = better outcomes
- Test yard ranges are position-appropriate
1. **playResolver.test.ts**
- Test play resolution produces valid results
- Test touchdown detection
- Test turnover detection
- Test first down calculation
1. **gameStateMachine.test.ts**
- Test full game simulation completes
- Test clock management
- Test scoring updates correctly
- Test drives resolve properly
1. **privacy.test.ts**
- CRITICAL: Test that no PlayResult contains internal ratings
- Test that GameState doesn't expose outcome tables
- Test that probability values never appear in output

### BOOLEAN CHECKPOINTS

```typescript
const checkpoints = {
  // Checkpoint 1: Dependencies exist
  dependenciesExist: () => {
    return fs.existsSync('src/core/generators/player/PlayerGenerator.ts') &&
           fs.existsSync('src/core/models/player/Player.ts');
  },

  // Checkpoint 2: All engine files created
  engineFilesCreated: () => {
    const requiredFiles = [
      'src/core/engine/EffectiveRatingCalculator.ts',
      'src/core/engine/WeeklyVarianceCalculator.ts',
      'src/core/engine/OutcomeTables.ts',
      'src/core/engine/PlayCaller.ts',
      'src/core/engine/MatchupResolver.ts',
      'src/core/engine/PlayResolver.ts',
      'src/core/engine/TeamGameState.ts',
      'src/core/engine/GameStateMachine.ts',
      'src/core/engine/InjuryProcessor.ts',
      'src/core/engine/FatigueSystem.ts',
      'src/core/engine/PlayDescriptionGenerator.ts',
    ];
    return requiredFiles.every(f => fs.existsSync(f));
  },

  // Checkpoint 3: TypeScript compiles
  typeCheckPasses: async () => {
    const result = await runCommand('npx tsc --noEmit');
    return result.exitCode === 0;
  },

  // Checkpoint 4: All tests pass
  testsPass: async () => {
    const result = await runCommand('npm test -- --testPathPattern=engine');
    return result.exitCode === 0;
  },

  // Checkpoint 5: Can simulate a complete play
  canSimulatePlay: () => {
    const { resolvePlay } = require('./src/core/engine/PlayResolver');
    // Set up minimal test data
    const result = resolvePlay(/* test params */);

    return result.outcome &&
           typeof result.yardsGained === 'number' &&
           result.description;
  },

  // Checkpoint 6: PlayResult doesn't expose internals
  playResultClean: () => {
    const { resolvePlay } = require('./src/core/engine/PlayResolver');
    const result = resolvePlay(/* test params */);
    const serialized = JSON.stringify(result);

    // Should not contain internal data
    return !serialized.includes('effectiveRating') &&
           !serialized.includes('probability') &&
           !serialized.includes('outcomeTable') &&
           !serialized.includes('trueValue');
  },

  // Checkpoint 7: Outcome tables sum to 1.0
  tablesValid: () => {
    const { generateOutcomeTable } = require('./src/core/engine/OutcomeTables');
    const table = generateOutcomeTable(75, 70, 'pass_short', { down: 1, yardsToGo: 10 });

    const sum = table.reduce((acc, entry) => acc + entry.probability, 0);
    return Math.abs(sum - 1.0) < 0.001;
  },

  // Checkpoint 8: Game state machine can run full game
  canSimulateGame: () => {
    const { GameStateMachine } = require('./src/core/engine/GameStateMachine');
    // Set up test teams
    const machine = new GameStateMachine(/* test params */);
    const finalState = machine.simulateToEnd();

    return finalState.isComplete &&
           typeof finalState.score.home === 'number' &&
           typeof finalState.score.away === 'number';
  }
};

// ALL must return true before proceeding to PR-07
const canProceed = Object.values(checkpoints).every(check => check() === true);
```

### EXPECTED DELIVERABLES

1. Effective rating calculator with all modifiers
1. Weekly variance system with streaks
1. Hidden outcome tables (Strat-O-Matic style)
1. Play caller based on coordinator tendencies
1. Matchup resolver for player vs player
1. Complete play resolver
1. Game state machine for full game simulation
1. Injury and fatigue systems
1. Human-readable play descriptions
1. Comprehensive test suite with privacy tests

### DO NOT

- Do not expose probability tables
- Do not show effective ratings
- Do not display dice rolls or random values
- Do not include internal calculations in PlayResult
- Do not create UI components
- Do not implement statistics tracking (that's next PR)

```
---

## Acceptance Criteria

| Criteria | Status |
|----------|--------|
| Effective rating calculator working | ⬜ |
| Weekly variance system implemented | ⬜ |
| Outcome tables generate correctly | ⬜ |
| Play resolver produces valid results | ⬜ |
| Game state machine runs full games | ⬜ |
| No internal data exposed in outputs | ⬜ |
| Injury system functional | ⬜ |
| Fatigue system functional | ⬜ |
| Play descriptions readable | ⬜ |
| All boolean checkpoints return TRUE | ⬜ |

---

## Files to Create
```
src/core/engine/
├── index.ts
├── EffectiveRatingCalculator.ts
├── WeeklyVarianceCalculator.ts
├── OutcomeTables.ts
├── PlayCaller.ts
├── MatchupResolver.ts
├── PlayResolver.ts
├── TeamGameState.ts
├── GameStateMachine.ts
├── InjuryProcessor.ts
├── FatigueSystem.ts
├── PlayDescriptionGenerator.ts
└── __tests__/
    ├── effectiveRating.test.ts
    ├── weeklyVariance.test.ts
    ├── outcomeTables.test.ts
    ├── playResolver.test.ts
    ├── gameStateMachine.test.ts
    └── privacy.test.ts
```

---

## Next PR
Upon successful completion of all checkpoints, proceed to **PR-07: Single Game Resolution System**
