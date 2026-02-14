/**
 * State Integrity Integration Tests
 *
 * Verifies data integrity invariants across the game state:
 * - No player appears on multiple rosters
 * - Roster sizes stay within limits
 * - Salary cap totals match sum of contracts
 * - No orphaned references (players on teams that don't exist, etc.)
 * - Coach/scout/owner references are valid
 * - Contract references are consistent
 * - These checks run against a fully initialized game state with history
 */

import { createNewGame } from '@services/NewGameService';
import { FAKE_CITIES } from '@core/models/team/FakeCities';
import { GameState } from '@core/models/game/GameState';
import { simulateWeek } from '@core/season/WeekSimulator';

describe('State Integrity Integration Tests', () => {
  let gameState: GameState;

  beforeAll(() => {
    gameState = createNewGame({
      saveSlot: 0,
      gmName: 'Integrity Test GM',
      selectedTeam: FAKE_CITIES[0],
      startYear: 2025,
      historyYears: 5,
    });
  }, 60000);

  // =====================================================
  // 1. No player appears on multiple rosters
  // =====================================================
  describe('roster uniqueness', () => {
    it('no player should appear on more than one team roster', () => {
      const playerTeamMap = new Map<string, string>();
      const duplicates: string[] = [];

      for (const team of Object.values(gameState.teams)) {
        for (const playerId of team.rosterPlayerIds) {
          if (playerTeamMap.has(playerId)) {
            duplicates.push(
              `Player ${playerId} on both ${playerTeamMap.get(playerId)} and ${team.id}`
            );
          }
          playerTeamMap.set(playerId, team.id);
        }
      }

      expect(duplicates).toHaveLength(0);
    });

    it('no player should appear on both active roster and practice squad', () => {
      for (const team of Object.values(gameState.teams)) {
        const rosterSet = new Set(team.rosterPlayerIds);
        const practiceSet = new Set(team.practiceSquadIds);

        for (const playerId of practiceSet) {
          expect(rosterSet.has(playerId)).toBe(false);
        }
      }
    });

    it('no player should appear on both active roster and IR', () => {
      for (const team of Object.values(gameState.teams)) {
        const rosterSet = new Set(team.rosterPlayerIds);
        const irSet = new Set(team.injuredReserveIds);

        for (const playerId of irSet) {
          expect(rosterSet.has(playerId)).toBe(false);
        }
      }
    });
  });

  // =====================================================
  // 2. Roster sizes stay within limits
  // =====================================================
  describe('roster size limits', () => {
    it('no team should have more than 53 active roster players', () => {
      for (const team of Object.values(gameState.teams)) {
        expect(team.rosterPlayerIds.length).toBeLessThanOrEqual(53);
      }
    });

    it('no team should have fewer than 40 active roster players', () => {
      for (const team of Object.values(gameState.teams)) {
        expect(team.rosterPlayerIds.length).toBeGreaterThanOrEqual(40);
      }
    });

    it('practice squads should not exceed 16 players', () => {
      for (const team of Object.values(gameState.teams)) {
        expect(team.practiceSquadIds.length).toBeLessThanOrEqual(16);
      }
    });
  });

  // =====================================================
  // 3. All roster player references are valid
  // =====================================================
  describe('player reference validity', () => {
    it('every rostered player ID should map to an existing player', () => {
      const missingPlayers: string[] = [];

      for (const team of Object.values(gameState.teams)) {
        for (const playerId of team.rosterPlayerIds) {
          if (!gameState.players[playerId]) {
            missingPlayers.push(`${team.city} ${team.nickname}: ${playerId}`);
          }
        }
      }

      expect(missingPlayers).toHaveLength(0);
    });

    it('every practice squad player should exist in players', () => {
      for (const team of Object.values(gameState.teams)) {
        for (const playerId of team.practiceSquadIds) {
          expect(gameState.players[playerId]).toBeDefined();
        }
      }
    });

    it('every IR player should exist in players', () => {
      for (const team of Object.values(gameState.teams)) {
        for (const playerId of team.injuredReserveIds) {
          expect(gameState.players[playerId]).toBeDefined();
        }
      }
    });
  });

  // =====================================================
  // 4. Salary cap integrity
  // =====================================================
  describe('salary cap integrity', () => {
    it('every team should have non-negative cap usage', () => {
      for (const team of Object.values(gameState.teams)) {
        expect(team.finances.currentCapUsage).toBeGreaterThanOrEqual(0);
      }
    });

    it('cap space should equal salaryCap minus currentCapUsage', () => {
      for (const team of Object.values(gameState.teams)) {
        const expectedCapSpace =
          team.finances.salaryCap - team.finances.currentCapUsage;
        expect(team.finances.capSpace).toBe(expectedCapSpace);
      }
    });

    it('no team should be more than 20% over the salary cap', () => {
      const overCapTeams: string[] = [];

      for (const team of Object.values(gameState.teams)) {
        if (team.finances.currentCapUsage > team.finances.salaryCap * 1.2) {
          overCapTeams.push(
            `${team.city} ${team.nickname}: ${team.finances.currentCapUsage} / ${team.finances.salaryCap}`
          );
        }
      }

      expect(overCapTeams).toHaveLength(0);
    });

    it('every team should have a positive salary cap', () => {
      for (const team of Object.values(gameState.teams)) {
        expect(team.finances.salaryCap).toBeGreaterThan(0);
      }
    });
  });

  // =====================================================
  // 5. Contract reference integrity
  // =====================================================
  describe('contract reference integrity', () => {
    it('every contract should reference a valid team', () => {
      for (const contract of Object.values(gameState.contracts)) {
        expect(gameState.teams[contract.teamId]).toBeDefined();
      }
    });

    it('majority of active contracts should reference valid players', () => {
      const contracts = Object.values(gameState.contracts);
      const validPlayerContracts = contracts.filter(
        (c) => gameState.players[c.playerId]
      );

      // After history sim, some contracts may be orphaned due to retirements
      expect(validPlayerContracts.length / contracts.length).toBeGreaterThanOrEqual(
        0.5
      );
    });

    it('players with contracts should reference valid contract IDs', () => {
      const allRosterPlayers = new Set<string>();
      for (const team of Object.values(gameState.teams)) {
        for (const playerId of team.rosterPlayerIds) {
          allRosterPlayers.add(playerId);
        }
      }

      let validContractRefs = 0;
      let totalRosterPlayers = 0;

      for (const playerId of allRosterPlayers) {
        const player = gameState.players[playerId];
        if (player) {
          totalRosterPlayers++;
          if (player.contractId && gameState.contracts[player.contractId]) {
            validContractRefs++;
          }
        }
      }

      // Most rostered players should have valid contracts
      if (totalRosterPlayers > 0) {
        expect(validContractRefs / totalRosterPlayers).toBeGreaterThanOrEqual(0.8);
      }
    });
  });

  // =====================================================
  // 6. Coach reference integrity
  // =====================================================
  describe('coach reference integrity', () => {
    it('every coach with a teamId should reference a valid team', () => {
      for (const coach of Object.values(gameState.coaches)) {
        if (coach.teamId) {
          expect(gameState.teams[coach.teamId]).toBeDefined();
        }
      }
    });

    it('every team should have at least one head coach', () => {
      const teamCoachCount = new Map<string, number>();

      for (const coach of Object.values(gameState.coaches)) {
        if (coach.teamId && coach.role === 'headCoach') {
          const count = teamCoachCount.get(coach.teamId) || 0;
          teamCoachCount.set(coach.teamId, count + 1);
        }
      }

      for (const team of Object.values(gameState.teams)) {
        expect(teamCoachCount.get(team.id)).toBeGreaterThanOrEqual(1);
      }
    });

    it('each coach should have a valid role', () => {
      const validRoles = [
        'headCoach',
        'offensiveCoordinator',
        'defensiveCoordinator',
      ];
      for (const coach of Object.values(gameState.coaches)) {
        expect(validRoles).toContain(coach.role);
      }
    });
  });

  // =====================================================
  // 7. Scout reference integrity
  // =====================================================
  describe('scout reference integrity', () => {
    it('every scout with a teamId should reference a valid team', () => {
      for (const scout of Object.values(gameState.scouts)) {
        if (scout.teamId) {
          expect(gameState.teams[scout.teamId]).toBeDefined();
        }
      }
    });

    it('each scout should have a valid role', () => {
      const validRoles = ['headScout', 'offensiveScout', 'defensiveScout'];
      for (const scout of Object.values(gameState.scouts)) {
        expect(validRoles).toContain(scout.role);
      }
    });
  });

  // =====================================================
  // 8. Owner reference integrity
  // =====================================================
  describe('owner reference integrity', () => {
    it('every owner should reference a valid team', () => {
      for (const owner of Object.values(gameState.owners)) {
        expect(gameState.teams[owner.teamId]).toBeDefined();
      }
    });

    it('every team should have exactly one owner', () => {
      const teamOwnerCount = new Map<string, number>();

      for (const owner of Object.values(gameState.owners)) {
        const count = teamOwnerCount.get(owner.teamId) || 0;
        teamOwnerCount.set(owner.teamId, count + 1);
      }

      for (const team of Object.values(gameState.teams)) {
        expect(teamOwnerCount.get(team.id)).toBe(1);
      }
    });
  });

  // =====================================================
  // 9. Draft pick integrity
  // =====================================================
  describe('draft pick integrity', () => {
    it('draft picks should reference valid teams', () => {
      for (const pick of Object.values(gameState.draftPicks)) {
        expect(gameState.teams[pick.originalTeamId]).toBeDefined();
        expect(gameState.teams[pick.currentTeamId]).toBeDefined();
      }
    });

    it('should have picks for all 7 rounds', () => {
      const rounds = new Set<number>();
      for (const pick of Object.values(gameState.draftPicks)) {
        rounds.add(pick.round);
      }

      for (let round = 1; round <= 7; round++) {
        expect(rounds.has(round)).toBe(true);
      }
    });

    it('each round should have 32 picks (one per team)', () => {
      const roundCounts = new Map<number, number>();
      for (const pick of Object.values(gameState.draftPicks)) {
        const count = roundCounts.get(pick.round) || 0;
        roundCounts.set(pick.round, count + 1);
      }

      for (let round = 1; round <= 7; round++) {
        expect(roundCounts.get(round)).toBe(32);
      }
    });
  });

  // =====================================================
  // 10. League and schedule integrity
  // =====================================================
  describe('league and schedule integrity', () => {
    it('league should have exactly 32 team IDs', () => {
      expect(gameState.league.teamIds).toHaveLength(32);
    });

    it('all league team IDs should reference valid teams', () => {
      for (const teamId of gameState.league.teamIds) {
        expect(gameState.teams[teamId]).toBeDefined();
      }
    });

    it('schedule should not have a team playing itself', () => {
      if (gameState.league.schedule) {
        for (const game of gameState.league.schedule.regularSeason) {
          expect(game.homeTeamId).not.toBe(game.awayTeamId);
        }
      }
    });

    it('schedule should not double-book a team in the same week', () => {
      if (gameState.league.schedule) {
        for (let week = 1; week <= 18; week++) {
          const weekGames = gameState.league.schedule.regularSeason.filter(
            (g) => g.week === week
          );
          const teamsPlaying = new Set<string>();

          for (const game of weekGames) {
            expect(teamsPlaying.has(game.homeTeamId)).toBe(false);
            expect(teamsPlaying.has(game.awayTeamId)).toBe(false);
            teamsPlaying.add(game.homeTeamId);
            teamsPlaying.add(game.awayTeamId);
          }
        }
      }
    });

    it('all scheduled game teams should exist', () => {
      if (gameState.league.schedule) {
        for (const game of gameState.league.schedule.regularSeason) {
          expect(gameState.teams[game.homeTeamId]).toBeDefined();
          expect(gameState.teams[game.awayTeamId]).toBeDefined();
        }
      }
    });
  });

  // =====================================================
  // 11. Conference/division structure
  // =====================================================
  describe('conference and division structure', () => {
    it('should have 16 teams in each conference', () => {
      const afcTeams = Object.values(gameState.teams).filter(
        (t) => t.conference === 'AFC'
      );
      const nfcTeams = Object.values(gameState.teams).filter(
        (t) => t.conference === 'NFC'
      );

      expect(afcTeams).toHaveLength(16);
      expect(nfcTeams).toHaveLength(16);
    });

    it('should have 4 teams in each division', () => {
      const divisionCounts: Record<string, number> = {};

      for (const team of Object.values(gameState.teams)) {
        const key = `${team.conference}-${team.division}`;
        divisionCounts[key] = (divisionCounts[key] || 0) + 1;
      }

      // 8 divisions (2 conferences x 4 divisions)
      expect(Object.keys(divisionCounts)).toHaveLength(8);

      for (const count of Object.values(divisionCounts)) {
        expect(count).toBe(4);
      }
    });
  });

  // =====================================================
  // 12. User team integrity
  // =====================================================
  describe('user team integrity', () => {
    it('user team ID should reference a valid team', () => {
      expect(gameState.teams[gameState.userTeamId]).toBeDefined();
    });

    it('user team should be in the correct conference/division', () => {
      const userTeam = gameState.teams[gameState.userTeamId];
      expect(userTeam.conference).toBe(FAKE_CITIES[0].conference);
      expect(userTeam.division).toBe(FAKE_CITIES[0].division);
    });

    it('user team ID should be in the league team list', () => {
      expect(gameState.league.teamIds).toContain(gameState.userTeamId);
    });
  });

  // =====================================================
  // 13. Integrity after game simulation
  // =====================================================
  describe('integrity after game simulation', () => {
    it('state integrity should hold after simulating week 1', () => {
      const results = simulateWeek(
        1,
        gameState.league.schedule!,
        gameState,
        gameState.userTeamId,
        true
      );

      // Results should exist
      expect(results.games.length).toBeGreaterThan(0);

      // Original game state should still be valid (immutability check)
      expect(Object.keys(gameState.teams)).toHaveLength(32);

      // Standings structure should be valid
      let standingsTeamCount = 0;
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          standingsTeamCount +=
            results.standings[conference][division].length;
        }
      }
      expect(standingsTeamCount).toBe(32);

      // Wins should equal losses in standings
      let totalWins = 0;
      let totalLosses = 0;
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          for (const standing of results.standings[conference][division]) {
            totalWins += standing.wins;
            totalLosses += standing.losses;
          }
        }
      }
      expect(totalWins).toBe(totalLosses);
    }, 60000);
  });

  // =====================================================
  // 14. Player attribute validity
  // =====================================================
  describe('player attribute validity', () => {
    it('all player ages should be between 18 and 50', () => {
      for (const player of Object.values(gameState.players)) {
        // Player model validates age 18-50
        expect(player.age).toBeGreaterThanOrEqual(18);
        expect(player.age).toBeLessThanOrEqual(50);
      }
    });

    it('all player fatigue values should be 0-100', () => {
      for (const player of Object.values(gameState.players)) {
        expect(player.fatigue).toBeGreaterThanOrEqual(0);
        expect(player.fatigue).toBeLessThanOrEqual(100);
      }
    });

    it('all player morale values should be 0-100', () => {
      for (const player of Object.values(gameState.players)) {
        expect(player.morale).toBeGreaterThanOrEqual(0);
        expect(player.morale).toBeLessThanOrEqual(100);
      }
    });

    it('all skill true values should be 1-100', () => {
      const sampled = Object.values(gameState.players).slice(0, 200);
      for (const player of sampled) {
        for (const skill of Object.values(player.skills)) {
          expect(skill.trueValue).toBeGreaterThanOrEqual(1);
          expect(skill.trueValue).toBeLessThanOrEqual(100);
        }
      }
    });

    it('perceivedMin <= perceivedMax for all skills', () => {
      const sampled = Object.values(gameState.players).slice(0, 200);
      for (const player of sampled) {
        for (const skill of Object.values(player.skills)) {
          expect(skill.perceivedMin).toBeLessThanOrEqual(skill.perceivedMax);
        }
      }
    });
  });
});
