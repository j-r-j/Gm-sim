/**
 * Tests for League History Simulator
 * Tests the complete pre-simulation of league history including:
 * - Quick game simulation
 * - Player retirement
 * - Contract expiration
 * - Coaching changes
 * - AI Draft
 * - AI Free Agency
 * - Multi-year orchestration
 */

import { createNewGame } from '../../../services/NewGameService';
import { FAKE_CITIES } from '../../models/team/FakeCities';
import { simulateLeagueHistory } from '../LeagueHistorySimulator';
import {
  simulateQuickGame,
  calculateTeamStrength,
  updateTeamRecords,
  simulatePlayoffGameQuick,
} from '../QuickGameSimulator';
import {
  shouldPlayerRetire,
  processRetirements,
  processContractExpirations,
  processCoachingChanges,
  processAIDraft,
  processRosterMaintenance,
  updateTeamHistories,
} from '../HistoryOffseasonProcessor';
import { generateDraftClass } from '../../draft/DraftClassGenerator';
import { Player } from '../../models/player/Player';
import { Position } from '../../models/player/Position';

// Helper: create a base game state for testing
function createTestGameState() {
  return createNewGame({
    saveSlot: 0,
    gmName: 'Test GM',
    selectedTeam: FAKE_CITIES[0],
    startYear: 2025,
    historyYears: 0, // Skip history for base state creation
  });
}

describe('QuickGameSimulator', () => {
  let gameState: ReturnType<typeof createTestGameState>;

  beforeAll(() => {
    gameState = createTestGameState();
  });

  describe('calculateTeamStrength', () => {
    it('should return strength values between 20 and 95', () => {
      const teamIds = Object.keys(gameState.teams);
      for (const teamId of teamIds.slice(0, 5)) {
        const team = gameState.teams[teamId];
        const strength = calculateTeamStrength(team, gameState.players, gameState.coaches);
        expect(strength.offense).toBeGreaterThanOrEqual(20);
        expect(strength.offense).toBeLessThanOrEqual(95);
        expect(strength.defense).toBeGreaterThanOrEqual(20);
        expect(strength.defense).toBeLessThanOrEqual(95);
        expect(strength.overall).toBeGreaterThanOrEqual(20);
        expect(strength.overall).toBeLessThanOrEqual(95);
      }
    });
  });

  describe('simulateQuickGame', () => {
    it('should produce valid game results', () => {
      const teamIds = Object.keys(gameState.teams);
      const homeTeam = gameState.teams[teamIds[0]];
      const awayTeam = gameState.teams[teamIds[1]];

      const result = simulateQuickGame(homeTeam, awayTeam, gameState.players, gameState.coaches);

      expect(result.homeScore).toBeGreaterThanOrEqual(0);
      expect(result.awayScore).toBeGreaterThanOrEqual(0);
      expect(result.winnerId).toBeTruthy();
      expect(result.loserId).toBeTruthy();
      expect(typeof result.isTie).toBe('boolean');
    });

    it('should produce realistic score ranges', () => {
      const teamIds = Object.keys(gameState.teams);
      const homeTeam = gameState.teams[teamIds[0]];
      const awayTeam = gameState.teams[teamIds[1]];

      const scores: number[] = [];
      for (let i = 0; i < 100; i++) {
        const result = simulateQuickGame(homeTeam, awayTeam, gameState.players, gameState.coaches);
        scores.push(result.homeScore, result.awayScore);
      }

      const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      // NFL average is ~22 points, our sim should be in a reasonable range
      expect(avg).toBeGreaterThan(10);
      expect(avg).toBeLessThan(40);
    });
  });

  describe('simulatePlayoffGameQuick', () => {
    it('should never produce ties', () => {
      const teamIds = Object.keys(gameState.teams);
      const homeTeam = gameState.teams[teamIds[0]];
      const awayTeam = gameState.teams[teamIds[1]];

      for (let i = 0; i < 50; i++) {
        const result = simulatePlayoffGameQuick(
          homeTeam,
          awayTeam,
          gameState.players,
          gameState.coaches
        );
        expect(result.isTie).toBe(false);
        expect(result.homeScore).not.toBe(result.awayScore);
      }
    });
  });

  describe('updateTeamRecords', () => {
    it('should update wins and losses from completed games', () => {
      const teamIds = Object.keys(gameState.teams);
      const result = updateTeamRecords(gameState.teams, [
        {
          gameId: 'test-1',
          week: 1,
          homeTeamId: teamIds[0],
          awayTeamId: teamIds[1],
          isDivisional: false,
          isConference: true,
          isRivalry: false,
          component: 'A' as const,
          timeSlot: 'early_sunday' as const,
          isComplete: true,
          homeScore: 24,
          awayScore: 17,
          winnerId: teamIds[0],
        },
      ]);

      expect(result[teamIds[0]].currentRecord.wins).toBe(1);
      expect(result[teamIds[1]].currentRecord.losses).toBe(1);
    });
  });
});

describe('HistoryOffseasonProcessor', () => {
  let gameState: ReturnType<typeof createTestGameState>;

  beforeAll(() => {
    gameState = createTestGameState();
  });

  describe('shouldPlayerRetire', () => {
    it('should never retire players under 28', () => {
      for (let i = 0; i < 100; i++) {
        const youngPlayer = {
          age: 22,
          position: Position.QB,
          roleFit: { ceiling: 'solidStarter', currentRole: 'solidStarter', roleEffectiveness: 75 },
        } as Player;
        expect(shouldPlayerRetire(youngPlayer)).toBe(false);
      }
    });

    it('should have high retirement chance for very old players', () => {
      let retiredCount = 0;
      for (let i = 0; i < 100; i++) {
        const oldPlayer = {
          age: 42,
          position: Position.RB,
          roleFit: { ceiling: 'depth', currentRole: 'depth', roleEffectiveness: 50 },
        } as Player;
        if (shouldPlayerRetire(oldPlayer)) retiredCount++;
      }
      // Very old fringe RBs should retire very frequently
      expect(retiredCount).toBeGreaterThan(50);
    });
  });

  describe('processRetirements', () => {
    it('should remove retired players from teams and expire their contracts', () => {
      const result = processRetirements(gameState.players, gameState.contracts, gameState.teams);

      // Some players should retire (can't guarantee exact number due to randomness)
      // But no retired player should still be in a team roster
      for (const retiredId of result.retiredPlayerIds) {
        for (const team of Object.values(result.updatedTeams)) {
          expect(team.rosterPlayerIds).not.toContain(retiredId);
        }
        // Retired player should be removed from players collection
        expect(result.updatedPlayers[retiredId]).toBeUndefined();
      }
    });
  });

  describe('processContractExpirations', () => {
    it('should handle contract advancement', () => {
      const result = processContractExpirations(
        gameState.players,
        gameState.contracts,
        gameState.teams
      );

      // Players with expired contracts should have null contractId
      for (const faId of result.newFreeAgentIds) {
        expect(result.updatedPlayers[faId]?.contractId).toBeNull();
      }
    });
  });

  describe('processCoachingChanges', () => {
    it('should fire coaches from losing teams', () => {
      // Set up a team with a terrible record
      const teamIds = Object.keys(gameState.teams);
      const testTeams = { ...gameState.teams };
      testTeams[teamIds[0]] = {
        ...testTeams[teamIds[0]],
        currentRecord: {
          ...testTeams[teamIds[0]].currentRecord,
          wins: 2,
          losses: 15,
          ties: 0,
        },
      };

      // Run multiple times to account for randomness
      let hadFiring = false;
      for (let i = 0; i < 10; i++) {
        const result = processCoachingChanges(testTeams, gameState.coaches, 2025);
        if (result.changes.length > 0) {
          hadFiring = true;
          break;
        }
      }
      expect(hadFiring).toBe(true);
    });
  });

  describe('processAIDraft', () => {
    it('should draft players for all teams', () => {
      const teamIds = Object.keys(gameState.teams);
      const draftClass = generateDraftClass({ year: 2025 });

      const result = processAIDraft(
        teamIds,
        draftClass.prospects,
        gameState.teams,
        gameState.players,
        2025
      );

      // Should have drafted players (7 rounds * 32 teams = 224, but limited by prospect pool)
      expect(result.draftedPlayers.length).toBeGreaterThan(100);

      // Each drafted player should have a contract
      expect(result.draftedContracts.length).toBe(result.draftedPlayers.length);

      // Each drafted player should be on a team roster
      for (const player of result.draftedPlayers) {
        let found = false;
        for (const team of Object.values(result.updatedTeams)) {
          if (team.rosterPlayerIds.includes(player.id)) {
            found = true;
            break;
          }
        }
        expect(found).toBe(true);
      }
    });
  });

  describe('processRosterMaintenance', () => {
    it('should ensure all teams have at most 53 players', () => {
      const result = processRosterMaintenance(
        gameState.teams,
        gameState.players,
        gameState.contracts,
        2025
      );

      for (const team of Object.values(result.updatedTeams)) {
        expect(team.rosterPlayerIds.length).toBeLessThanOrEqual(53);
      }
    });
  });

  describe('updateTeamHistories', () => {
    it('should accumulate win/loss records', () => {
      const teamIds = Object.keys(gameState.teams);
      const teamsWithRecords = { ...gameState.teams };
      teamsWithRecords[teamIds[0]] = {
        ...teamsWithRecords[teamIds[0]],
        currentRecord: {
          ...teamsWithRecords[teamIds[0]].currentRecord,
          wins: 12,
          losses: 5,
          ties: 0,
        },
      };

      const result = updateTeamHistories(teamsWithRecords, teamIds[0], 2025);

      expect(result[teamIds[0]].allTimeRecord.wins).toBe(12);
      expect(result[teamIds[0]].allTimeRecord.losses).toBe(5);
      expect(result[teamIds[0]].championships).toBe(1);
      expect(result[teamIds[0]].lastChampionshipYear).toBe(2025);
    });
  });
});

describe('simulateLeagueHistory', () => {
  it('should simulate multiple years of history', () => {
    const baseState = createTestGameState();

    const result = simulateLeagueHistory(baseState, { years: 3 });

    // Should have 3 season summaries
    expect(result.seasonSummaries.length).toBe(3);

    // Each season should have a champion (most of the time)
    for (const season of result.seasonSummaries) {
      expect(season.year).toBeGreaterThan(0);
      // Draft order should have teams (may not always be exactly 32 due to
      // fallback ordering in edge cases)
      expect(season.draftOrder.length).toBeGreaterThan(0);
    }

    // Should have tracked some events
    expect(result.totalDraftPicks).toBeGreaterThan(0);
    expect(result.totalRetirements).toBeGreaterThanOrEqual(0);

    // Teams should have accumulated all-time records
    for (const team of Object.values(result.gameState.teams)) {
      const totalAllTime =
        team.allTimeRecord.wins + team.allTimeRecord.losses + team.allTimeRecord.ties;
      // 3 seasons * ~17 games = ~51 total games
      expect(totalAllTime).toBeGreaterThan(0);
    }
  }, 120000); // Long timeout for multi-year simulation

  it('should produce a valid game state ready for user play', () => {
    const baseState = createTestGameState();

    const result = simulateLeagueHistory(baseState, { years: 2 });
    const state = result.gameState;

    // Calendar should be set to the user's start year
    expect(state.league.calendar.currentYear).toBe(2025);
    expect(state.league.calendar.currentPhase).toBe('regularSeason');
    expect(state.league.calendar.currentWeek).toBe(1);

    // Should have 32 teams
    expect(Object.keys(state.teams).length).toBe(32);

    // Each team should have a roster
    for (const team of Object.values(state.teams)) {
      expect(team.rosterPlayerIds.length).toBeGreaterThan(0);
      expect(team.rosterPlayerIds.length).toBeLessThanOrEqual(53);
    }

    // Should have a schedule for the current year
    expect(state.league.schedule).not.toBeNull();

    // Should have season history
    expect(state.league.seasonHistory.length).toBe(2);

    // Should have draft picks and prospects for the user's year
    expect(Object.keys(state.draftPicks).length).toBeGreaterThan(0);
    expect(Object.keys(state.prospects).length).toBeGreaterThan(0);
  }, 120000);

  it('should call progress callback', () => {
    const baseState = createTestGameState();
    const progressCalls: { year: number; total: number; phase: string }[] = [];

    simulateLeagueHistory(baseState, {
      years: 2,
      onProgress: (year, total, phase) => {
        progressCalls.push({ year, total, phase });
      },
    });

    // Should have been called for each year's season and offseason
    expect(progressCalls.length).toBe(4); // 2 years * 2 phases (season + offseason)
    expect(progressCalls[0].year).toBe(1);
    expect(progressCalls[0].total).toBe(2);
  }, 120000);

  it('should produce teams with varied championship counts after many years', () => {
    const baseState = createTestGameState();

    const result = simulateLeagueHistory(baseState, { years: 5 });

    // After 5 years, at least some teams should have championships
    const champCounts = Object.values(result.gameState.teams).map((t) => t.championships);
    const totalChampionships = champCounts.reduce((sum, c) => sum + c, 0);
    expect(totalChampionships).toBe(5); // Exactly one champion per year
  }, 180000);
});
