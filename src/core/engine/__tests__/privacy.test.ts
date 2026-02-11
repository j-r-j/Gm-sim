/**
 * Privacy Tests
 * CRITICAL: Ensure no internal engine data is exposed to users.
 *
 * The simulation engine is a "black box" - users should NEVER see:
 * - Probability tables
 * - Dice roll values
 * - Effective ratings
 * - Outcome tables
 * - True skill values
 */

import { resolvePlay } from '../PlayResolver';
import { createGame } from '../GameStateMachine';
import { generateOutcomeTable, rollOutcome } from '../OutcomeTables';
import { TeamGameState } from '../TeamGameState';
import { generatePlayer, generateRoster } from '../../generators/player/PlayerGenerator';
import { Position } from '../../models/player/Position';
import { createDefaultCoach } from '../../models/staff/Coach';
import {
  createDefaultOffensiveTendencies,
  createDefaultDefensiveTendencies,
} from '../../models/staff/CoordinatorTendencies';
import {
  selectOffensivePlay,
  selectDefensivePlay,
  createDefaultPlayCallContext,
} from '../PlayCaller';

// Helper to create team game state
function createTestTeamGameState(teamId: string): TeamGameState {
  const roster = generateRoster(teamId);

  const qb =
    roster.find((p) => p.position === Position.QB) || generatePlayer({ position: Position.QB });
  const rbs = roster.filter((p) => p.position === Position.RB);
  const wrs = roster.filter((p) => p.position === Position.WR);
  const tes = roster.filter((p) => p.position === Position.TE);
  const ols = roster.filter((p) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(p.position));
  const dls = roster.filter((p) => ['DE', 'DT'].includes(p.position));
  const lbs = roster.filter((p) => ['OLB', 'ILB'].includes(p.position));
  const dbs = roster.filter((p) => ['CB', 'FS', 'SS'].includes(p.position));
  const k =
    roster.find((p) => p.position === Position.K) || generatePlayer({ position: Position.K });
  const punter =
    roster.find((p) => p.position === Position.P) || generatePlayer({ position: Position.P });

  const allPlayers = new Map<string, typeof qb>();
  roster.forEach((player) => allPlayers.set(player.id, player));

  return {
    teamId,
    teamName: teamId,
    offense: {
      qb,
      rb: rbs.slice(0, 2),
      wr: wrs.slice(0, 3),
      te: tes.slice(0, 2),
      ol: ols.slice(0, 5),
    },
    defense: {
      dl: dls.slice(0, 4),
      lb: lbs.slice(0, 4),
      db: dbs.slice(0, 4),
    },
    specialTeams: {
      k,
      p: punter,
      returner: wrs[0] || generatePlayer({ position: Position.WR }),
    },
    allPlayers,
    coaches: {
      offensiveCoordinator: createDefaultCoach('oc', 'John', 'Smith', 'offensiveCoordinator'),
      defensiveCoordinator: createDefaultCoach('dc', 'Jane', 'Doe', 'defensiveCoordinator'),
      positionCoaches: new Map(),
    },
    offensiveScheme: 'westCoast',
    defensiveScheme: 'fourThreeUnder',
    offensiveTendencies: createDefaultOffensiveTendencies(),
    defensiveTendencies: createDefaultDefensiveTendencies(),
    timeoutsRemaining: 3,
    fatigueLevels: new Map(),
    snapCounts: new Map(),
    weeklyVariances: new Map(),
  };
}

describe('Privacy Tests - Engine Internals Not Exposed', () => {
  describe('PlayResult does not expose internal ratings', () => {
    it('should not contain effectiveRating in serialized PlayResult', () => {
      const homeTeam = createTestTeamGameState('home');
      const awayTeam = createTestTeamGameState('away');

      for (let i = 0; i < 20; i++) {
        const context = createDefaultPlayCallContext();
        const offensivePlay = selectOffensivePlay(homeTeam.offensiveTendencies, context);
        const defensivePlay = selectDefensivePlay(
          awayTeam.defensiveTendencies,
          context,
          offensivePlay.formation
        );

        const result = resolvePlay(
          homeTeam,
          awayTeam,
          { offensive: offensivePlay, defensive: defensivePlay },
          context
        );

        const serialized = JSON.stringify(result);

        expect(serialized).not.toContain('effectiveRating');
        expect(serialized).not.toContain('trueValue');
        expect(serialized).not.toContain('probability');
        expect(serialized).not.toContain('outcomeTable');
      }
    });

    it('should not contain roll values in PlayResult', () => {
      const homeTeam = createTestTeamGameState('home');
      const awayTeam = createTestTeamGameState('away');

      for (let i = 0; i < 20; i++) {
        const context = createDefaultPlayCallContext();
        const offensivePlay = selectOffensivePlay(homeTeam.offensiveTendencies, context);
        const defensivePlay = selectDefensivePlay(
          awayTeam.defensiveTendencies,
          context,
          offensivePlay.formation
        );

        const result = resolvePlay(
          homeTeam,
          awayTeam,
          { offensive: offensivePlay, defensive: defensivePlay },
          context
        );

        const serialized = JSON.stringify(result);

        expect(serialized).not.toContain('"roll"');
        expect(serialized).not.toContain('diceRoll');
        expect(serialized).not.toContain('randomValue');
      }
    });

    it('should only contain expected public fields', () => {
      const homeTeam = createTestTeamGameState('home');
      const awayTeam = createTestTeamGameState('away');

      const context = createDefaultPlayCallContext();
      const offensivePlay = selectOffensivePlay(homeTeam.offensiveTendencies, context);
      const defensivePlay = selectDefensivePlay(
        awayTeam.defensiveTendencies,
        context,
        offensivePlay.formation
      );

      const result = resolvePlay(
        homeTeam,
        awayTeam,
        { offensive: offensivePlay, defensive: defensivePlay },
        context
      );

      // Check that only expected fields exist
      const allowedFields = [
        'playType',
        'outcome',
        'yardsGained',
        'primaryOffensivePlayer',
        'primaryDefensivePlayer',
        'newDown',
        'newDistance',
        'newFieldPosition',
        'turnover',
        'touchdown',
        'firstDown',
        'injuryOccurred',
        'injuredPlayerId',
        'penaltyOccurred',
        'penaltyDetails',
        'safety',
        'description',
      ];

      const resultKeys = Object.keys(result);
      for (const key of resultKeys) {
        expect(allowedFields).toContain(key);
      }
    });
  });

  describe('GameState does not expose outcome tables', () => {
    it('should not contain outcomeTable in serialized GameState', () => {
      const homeTeam = createTestTeamGameState('home');
      const awayTeam = createTestTeamGameState('away');

      const machine = createGame(homeTeam, awayTeam, {
        gameId: 'test',
        quarterLength: 30,
      });

      // Run a few plays
      for (let i = 0; i < 10; i++) {
        if (!machine.isGameOver()) {
          machine.executePlay();
        }
      }

      const state = machine.getState();
      const serialized = JSON.stringify(state);

      expect(serialized).not.toContain('outcomeTable');
      expect(serialized).not.toContain('probability');
      expect(serialized).not.toContain('effectiveRating');
    });

    it('should not expose internal calculations in plays array', () => {
      const homeTeam = createTestTeamGameState('home');
      const awayTeam = createTestTeamGameState('away');

      const machine = createGame(homeTeam, awayTeam, {
        gameId: 'test',
        quarterLength: 30,
      });

      // Simulate a short game
      const finalState = machine.simulateToEnd();

      for (const play of finalState.plays) {
        const serialized = JSON.stringify(play);

        expect(serialized).not.toContain('trueValue');
        expect(serialized).not.toContain('effectiveRating');
        expect(serialized).not.toContain('probability');
        expect(serialized).not.toContain('outcomeTable');
      }
    });
  });

  describe('Probability values never appear in output', () => {
    it('should not expose probability values from outcome tables', () => {
      // Generate outcome table (internal use)
      const table = generateOutcomeTable(
        75,
        70,
        'pass_short',
        { down: 1, yardsToGo: 10, yardsToEndzone: 75 },
        25
      );

      // Roll outcome
      const rollResult = rollOutcome(table);

      // The roll result should not contain probability
      const serialized = JSON.stringify(rollResult);

      expect(serialized).not.toContain('probability');
      expect(serialized).not.toContain('0.'); // Probability values are decimals

      // Only outcome, yards, and secondaryEffects
      expect(rollResult).toHaveProperty('outcome');
      expect(rollResult).toHaveProperty('yards');
      expect(rollResult).toHaveProperty('secondaryEffects');
      expect(Object.keys(rollResult).length).toBe(3);
    });
  });

  describe('Description is the only human-readable output', () => {
    it('should have meaningful description without internal data', () => {
      const homeTeam = createTestTeamGameState('home');
      const awayTeam = createTestTeamGameState('away');

      for (let i = 0; i < 20; i++) {
        const context = createDefaultPlayCallContext();
        const offensivePlay = selectOffensivePlay(homeTeam.offensiveTendencies, context);
        const defensivePlay = selectDefensivePlay(
          awayTeam.defensiveTendencies,
          context,
          offensivePlay.formation
        );

        const result = resolvePlay(
          homeTeam,
          awayTeam,
          { offensive: offensivePlay, defensive: defensivePlay },
          context
        );

        // Description should be human-readable
        expect(typeof result.description).toBe('string');
        expect(result.description.length).toBeGreaterThan(0);

        // Description should not contain internal terms
        // Use word boundary matching to avoid false positives (e.g., "carroll" containing "roll")
        const lowerDesc = result.description.toLowerCase();
        expect(lowerDesc).not.toContain('effective');
        expect(lowerDesc).not.toContain('probability');
        expect(lowerDesc).not.toMatch(/\broll\b/);
        expect(lowerDesc).not.toContain('rating');
        expect(lowerDesc).not.toContain('modifier');
      }
    });
  });

  describe('Weekly variance is applied but hidden', () => {
    it('should not expose variance values in outputs', () => {
      const homeTeam = createTestTeamGameState('home');
      const awayTeam = createTestTeamGameState('away');

      // Add some weekly variances
      homeTeam.weeklyVariances.set(homeTeam.offense.qb.id, 5);
      homeTeam.weeklyVariances.set(homeTeam.offense.rb[0]?.id || '', -3);

      const context = createDefaultPlayCallContext();
      const offensivePlay = selectOffensivePlay(homeTeam.offensiveTendencies, context);
      const defensivePlay = selectDefensivePlay(
        awayTeam.defensiveTendencies,
        context,
        offensivePlay.formation
      );

      const result = resolvePlay(
        homeTeam,
        awayTeam,
        { offensive: offensivePlay, defensive: defensivePlay },
        context
      );

      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain('variance');
      expect(serialized).not.toContain('weeklyVariance');
      expect(serialized).not.toContain('consistency');
    });
  });

  describe('"It" factor influences results but value never exposed', () => {
    it('should not expose itFactor in play results', () => {
      const homeTeam = createTestTeamGameState('home');
      const awayTeam = createTestTeamGameState('away');

      // Verify players have itFactor internally
      expect(homeTeam.offense.qb.itFactor.value).toBeDefined();

      const context = createDefaultPlayCallContext();
      const offensivePlay = selectOffensivePlay(homeTeam.offensiveTendencies, context);
      const defensivePlay = selectDefensivePlay(
        awayTeam.defensiveTendencies,
        context,
        offensivePlay.formation
      );

      const result = resolvePlay(
        homeTeam,
        awayTeam,
        { offensive: offensivePlay, defensive: defensivePlay },
        context
      );

      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain('itFactor');
      expect(serialized).not.toContain('clutch');
    });
  });

  describe('Scheme fit modifiers are hidden', () => {
    it('should not expose scheme fit calculations', () => {
      const homeTeam = createTestTeamGameState('home');
      const awayTeam = createTestTeamGameState('away');

      const context = createDefaultPlayCallContext();
      const offensivePlay = selectOffensivePlay(homeTeam.offensiveTendencies, context);
      const defensivePlay = selectDefensivePlay(
        awayTeam.defensiveTendencies,
        context,
        offensivePlay.formation
      );

      const result = resolvePlay(
        homeTeam,
        awayTeam,
        { offensive: offensivePlay, defensive: defensivePlay },
        context
      );

      const serialized = JSON.stringify(result);

      expect(serialized).not.toContain('schemeFit');
      expect(serialized).not.toContain('modifier');
      expect(serialized).not.toContain('scheme');
    });
  });

  describe('Full game simulation maintains privacy in play results', () => {
    it('should not expose any internal data in play results from complete game', () => {
      const homeTeam = createTestTeamGameState('home');
      const awayTeam = createTestTeamGameState('away');

      const machine = createGame(homeTeam, awayTeam, {
        gameId: 'privacy-test',
        quarterLength: 30,
      });

      const finalState = machine.simulateToEnd();

      // Check each play result - this is what users see
      for (const play of finalState.plays) {
        const serialized = JSON.stringify(play);

        // List of terms that should NEVER appear in PlayResult
        const forbiddenTerms = [
          'effectiveRating',
          'probability',
          'outcomeTable',
          'diceRoll',
          'modifier',
        ];

        for (const term of forbiddenTerms) {
          expect(serialized.toLowerCase()).not.toContain(term.toLowerCase());
        }
      }
    });

    it('should have user-friendly play descriptions', () => {
      const homeTeam = createTestTeamGameState('home');
      const awayTeam = createTestTeamGameState('away');

      const machine = createGame(homeTeam, awayTeam, {
        gameId: 'privacy-test',
        quarterLength: 30,
      });

      const finalState = machine.simulateToEnd();

      // All plays should have human-readable descriptions
      for (const play of finalState.plays) {
        expect(typeof play.description).toBe('string');
        expect(play.description.length).toBeGreaterThan(0);

        // Descriptions should not contain internal engine terminology
        const lowerDesc = play.description.toLowerCase();
        expect(lowerDesc).not.toContain('effective');
        expect(lowerDesc).not.toContain('probability');
        expect(lowerDesc).not.toContain('modifier');
      }
    });
  });
});
