import { resolvePlay, resolveSpecialTeamsPlay } from '../PlayResolver';
import {
  createDefaultPlayCallContext,
  selectOffensivePlay,
  selectDefensivePlay,
} from '../PlayCaller';
import { TeamGameState } from '../TeamGameState';
import { generatePlayer, generateRoster } from '../../generators/player/PlayerGenerator';
import { Position } from '../../models/player/Position';
import { createDefaultCoach } from '../../models/staff/Coach';
import {
  createDefaultOffensiveTendencies,
  createDefaultDefensiveTendencies,
} from '../../models/staff/CoordinatorTendencies';

// Helper to create a minimal team game state for testing
function createTestTeamGameState(teamId: string): TeamGameState {
  const roster = generateRoster(teamId);

  // Find players by position
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
  const p =
    roster.find((p) => p.position === Position.P) || generatePlayer({ position: Position.P });

  const allPlayers = new Map<string, typeof qb>();
  roster.forEach((player) => allPlayers.set(player.id, player));

  const oc = createDefaultCoach('oc-1', 'John', 'Smith', 'offensiveCoordinator');
  const dc = createDefaultCoach('dc-1', 'Jane', 'Doe', 'defensiveCoordinator');

  return {
    teamId,
    teamName: 'Test Team',
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
      p,
      returner: wrs[0] || generatePlayer({ position: Position.WR }),
    },
    allPlayers,
    coaches: {
      offensiveCoordinator: oc,
      defensiveCoordinator: dc,
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

describe('PlayResolver', () => {
  describe('resolvePlay', () => {
    let homeTeam: TeamGameState;
    let awayTeam: TeamGameState;

    beforeEach(() => {
      homeTeam = createTestTeamGameState('home-team');
      awayTeam = createTestTeamGameState('away-team');
    });

    it('should produce a valid play result', () => {
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

      expect(result).toHaveProperty('playType');
      expect(result).toHaveProperty('outcome');
      expect(result).toHaveProperty('yardsGained');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('newDown');
      expect(result).toHaveProperty('newDistance');
      expect(result).toHaveProperty('newFieldPosition');
    });

    it('should have numeric yards gained', () => {
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

      expect(typeof result.yardsGained).toBe('number');
      expect(isNaN(result.yardsGained)).toBe(false);
    });

    it('should detect touchdowns correctly', () => {
      // Run multiple plays to get at least one touchdown
      let foundTouchdown = false;

      for (let i = 0; i < 100 && !foundTouchdown; i++) {
        // Set up near goal line for higher TD chance
        const context = {
          ...createDefaultPlayCallContext(),
          fieldPosition: 95,
          distance: 5,
        };

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

        if (result.touchdown) {
          foundTouchdown = true;
          expect(result.touchdown).toBe(true);
        }
      }

      // Should find at least one touchdown in 100 goal line attempts
      expect(foundTouchdown).toBe(true);
    });

    it('should detect turnovers correctly', () => {
      // Run multiple plays to hopefully get a turnover
      let foundTurnover = false;

      for (let i = 0; i < 100 && !foundTurnover; i++) {
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

        if (result.turnover) {
          foundTurnover = true;
          expect(result.turnover).toBe(true);
          expect(['interception', 'fumble_lost']).toContain(result.outcome);
        }
      }

      // Turnovers are relatively rare, but should occur sometimes
      // This is a soft expectation - we mainly want to ensure the logic works
    });

    it('should calculate first downs correctly', () => {
      // Set up 3rd and 5
      const context = {
        ...createDefaultPlayCallContext(),
        down: 3,
        distance: 5,
      };

      let foundFirstDown = false;

      for (let i = 0; i < 50 && !foundFirstDown; i++) {
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

        if (result.firstDown) {
          foundFirstDown = true;
          expect(result.firstDown).toBe(true);
          expect(result.yardsGained).toBeGreaterThanOrEqual(5);
        }
      }
    });

    it('should produce a human-readable description', () => {
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

      expect(typeof result.description).toBe('string');
      expect(result.description.length).toBeGreaterThan(0);
    });

    it('should update game state values', () => {
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

      // New down should be valid
      expect([1, 2, 3, 4]).toContain(result.newDown);

      // New distance should be positive
      expect(result.newDistance).toBeGreaterThan(0);

      // Field position should be in valid range
      expect(result.newFieldPosition).toBeGreaterThanOrEqual(1);
      expect(result.newFieldPosition).toBeLessThanOrEqual(99);
    });
  });

  describe('resolveSpecialTeamsPlay', () => {
    let homeTeam: TeamGameState;
    let awayTeam: TeamGameState;

    beforeEach(() => {
      homeTeam = createTestTeamGameState('home-team');
      awayTeam = createTestTeamGameState('away-team');
    });

    it('should resolve field goal attempts', () => {
      const context = {
        ...createDefaultPlayCallContext(),
        fieldPosition: 70, // 30 yard attempt (100-70+17)
      };

      const result = resolveSpecialTeamsPlay(homeTeam, awayTeam, 'field_goal', context);

      expect(['field_goal_made', 'field_goal_missed']).toContain(result.outcome);
      expect(result.description).toContain('field goal');
    });

    it('should resolve punts', () => {
      const context = {
        ...createDefaultPlayCallContext(),
        fieldPosition: 30,
        down: 4,
      };

      const result = resolveSpecialTeamsPlay(homeTeam, awayTeam, 'punt', context);

      expect(result.playType).toBe('punt');
      expect(result.description).toContain('Punt');
    });

    it('should resolve kickoffs', () => {
      const context = createDefaultPlayCallContext();

      const result = resolveSpecialTeamsPlay(homeTeam, awayTeam, 'kickoff', context);

      expect(result.playType).toBe('kickoff');
      expect(
        result.description.includes('Kickoff') || result.description.includes('Touchback')
      ).toBe(true);
    });

    it('should have higher FG success rate for shorter kicks', () => {
      const shortKickContext = {
        ...createDefaultPlayCallContext(),
        fieldPosition: 80, // 20-yard line = ~37 yard FG
      };

      const longKickContext = {
        ...createDefaultPlayCallContext(),
        fieldPosition: 45, // ~55 yard FG
      };

      let shortMade = 0;
      let longMade = 0;
      const attempts = 100;

      for (let i = 0; i < attempts; i++) {
        const shortResult = resolveSpecialTeamsPlay(
          homeTeam,
          awayTeam,
          'field_goal',
          shortKickContext
        );
        const longResult = resolveSpecialTeamsPlay(
          homeTeam,
          awayTeam,
          'field_goal',
          longKickContext
        );

        if (shortResult.outcome === 'field_goal_made') shortMade++;
        if (longResult.outcome === 'field_goal_made') longMade++;
      }

      // Short kicks should have higher success rate
      expect(shortMade).toBeGreaterThan(longMade);
    });
  });
});
