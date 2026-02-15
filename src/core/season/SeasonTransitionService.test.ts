/**
 * Season Transition Service Tests
 * Basic tests for the year-over-year season transition.
 */

import { transitionToNewSeason } from './SeasonTransitionService';
import { GameState } from '@core/models/game/GameState';
import { createDefaultLeague } from '@core/models/league/League';
import { createEmptyTeamRecord, Team } from '@core/models/team/Team';
import { createEmptyStaffHierarchy } from '@core/models/staff/StaffHierarchy';
import { createDefaultTeamFinances } from '@core/models/team/TeamFinances';
import { createDefaultStadium } from '@core/models/team/Stadium';
import { generatePlayer } from '@core/generators/player/PlayerGenerator';
import { Position } from '@core/models/player/Position';
import { createNewGame } from '@services/NewGameService';
import { getCityByAbbreviation } from '@core/models/team/FakeCities';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestTeam(
  id: string,
  conference: 'AFC' | 'NFC',
  division: 'North' | 'South' | 'East' | 'West'
): Team {
  return {
    id,
    city: `City-${id}`,
    nickname: `Team-${id}`,
    abbreviation: id.slice(0, 3).toUpperCase().padEnd(3, 'X'),
    conference,
    division,
    stadium: createDefaultStadium(`stadium-${id}`, id, `City-${id}`),
    finances: createDefaultTeamFinances(id),
    staffHierarchy: createEmptyStaffHierarchy(id, 30000),
    ownerId: `owner-${id}`,
    gmId: null,
    rosterPlayerIds: [],
    practiceSquadIds: [],
    injuredReserveIds: [],
    currentRecord: {
      ...createEmptyTeamRecord(),
      wins: 8,
      losses: 9,
    },
    playoffSeed: null,
    isEliminated: false,
    allTimeRecord: { wins: 100, losses: 100, ties: 0 },
    championships: 0,
    lastChampionshipYear: null,
    marketSize: 'medium',
    prestige: 50,
    fanbasePassion: 50,
  };
}

function createMinimalGameState(): GameState {
  const conferences: ('AFC' | 'NFC')[] = ['AFC', 'NFC'];
  const divisions: ('North' | 'South' | 'East' | 'West')[] = ['North', 'South', 'East', 'West'];

  const teams: Record<string, Team> = {};
  const teamIds: string[] = [];

  for (const conf of conferences) {
    for (const div of divisions) {
      for (let i = 0; i < 4; i++) {
        const id = `team-${conf.toLowerCase()}-${div.toLowerCase()}-${i}`;
        teams[id] = createTestTeam(id, conf, div);
        teamIds.push(id);
      }
    }
  }

  // Add a player to the first team
  const userTeamId = teamIds[0];
  const player = generatePlayer({ position: Position.QB, ageRange: { min: 25, max: 25 } });
  const playerId = player.id;

  teams[userTeamId] = {
    ...teams[userTeamId],
    rosterPlayerIds: [playerId],
    gmId: 'user-gm',
  };

  const league = createDefaultLeague('league-1', teamIds, 2025);
  // Set to a state where the season is complete
  league.calendar = {
    currentYear: 2025,
    currentWeek: 22,
    currentPhase: 'playoffs',
    offseasonPhase: null,
  };

  return {
    saveSlot: 0,
    createdAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString(),
    userTeamId,
    userName: 'TestGM',
    league,
    teams,
    players: { [playerId]: player },
    coaches: {},
    scouts: {},
    owners: {},
    draftPicks: {},
    prospects: {},
    contracts: {},
    careerStats: {
      seasonsCompleted: 0,
      totalWins: 0,
      totalLosses: 0,
      playoffAppearances: 0,
      championships: 0,
      teamHistory: [],
    },
    gameSettings: {
      autoSaveEnabled: true,
      simulationSpeed: 'normal',
      notificationsEnabled: true,
    },
    newsReadStatus: {},
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('SeasonTransitionService', () => {
  describe('transitionToNewSeason', () => {
    let state: GameState;
    let playerId: string;

    beforeEach(() => {
      state = createMinimalGameState();
      playerId = Object.keys(state.players)[0];
    });

    it('should advance the calendar year by 1', () => {
      const result = transitionToNewSeason(state);
      expect(result.league.calendar.currentYear).toBe(2026);
    });

    it('should reset week to 1 and phase to regularSeason', () => {
      const result = transitionToNewSeason(state);
      expect(result.league.calendar.currentWeek).toBe(1);
      expect(result.league.calendar.currentPhase).toBe('regularSeason');
      expect(result.league.calendar.offseasonPhase).toBeNull();
    });

    it('should reset all team records to 0-0', () => {
      const result = transitionToNewSeason(state);
      for (const team of Object.values(result.teams)) {
        expect(team.currentRecord.wins).toBe(0);
        expect(team.currentRecord.losses).toBe(0);
        expect(team.currentRecord.ties).toBe(0);
      }
    });

    it('should accumulate all-time records', () => {
      const userTeam = state.teams[state.userTeamId];
      const originalAllTimeWins = userTeam.allTimeRecord.wins;
      const seasonWins = userTeam.currentRecord.wins;

      const result = transitionToNewSeason(state);
      const updatedTeam = result.teams[state.userTeamId];
      expect(updatedTeam.allTimeRecord.wins).toBe(originalAllTimeWins + seasonWins);
    });

    it('should add a season summary to history', () => {
      expect(state.league.seasonHistory).toHaveLength(0);
      const result = transitionToNewSeason(state);
      expect(result.league.seasonHistory).toHaveLength(1);
      expect(result.league.seasonHistory[0].year).toBe(2025);
    });

    it('should age all players by 1 year', () => {
      const originalAge = state.players[playerId].age;
      const result = transitionToNewSeason(state);
      expect(result.players[playerId].age).toBe(originalAge + 1);
    });

    it('should increment player experience', () => {
      const originalExp = state.players[playerId].experience;
      const result = transitionToNewSeason(state);
      expect(result.players[playerId].experience).toBe(originalExp + 1);
    });

    it('should generate new prospects', () => {
      expect(Object.keys(state.prospects)).toHaveLength(0);
      const result = transitionToNewSeason(state);
      expect(Object.keys(result.prospects).length).toBeGreaterThan(200);
    });

    it('should generate new draft picks', () => {
      const result = transitionToNewSeason(state);
      // 7 rounds * 32 teams = 224 picks
      const newPicks = Object.values(result.draftPicks).filter((p) => p.year === 2026);
      expect(newPicks).toHaveLength(224);
    });

    it('should clear transient state', () => {
      const result = transitionToNewSeason(state);
      expect(result.seasonStats).toBeUndefined();
      expect(result.offseasonState).toBeUndefined();
      expect(result.offseasonData).toBeUndefined();
      expect(result.weeklyGamePlan).toBeUndefined();
      expect(result.tradeOffers).toBeUndefined();
      expect(result.startSitDecisions).toBeUndefined();
      expect(result.weeklyAwards).toBeUndefined();
      expect(result.waiverWire).toBeUndefined();
      expect(result.halftimeDecisions).toBeUndefined();
    });

    it('should reset player fatigue to 0', () => {
      state.players[playerId] = {
        ...state.players[playerId],
        fatigue: 80,
      };
      const result = transitionToNewSeason(state);
      expect(result.players[playerId].fatigue).toBe(0);
    });

    it('should clear playoff bracket and standings', () => {
      const result = transitionToNewSeason(state);
      expect(result.league.playoffBracket).toBeNull();
    });

    it('should update career stats', () => {
      const result = transitionToNewSeason(state);
      expect(result.careerStats.seasonsCompleted).toBe(1);
      expect(result.careerStats.totalWins).toBe(8);
      expect(result.careerStats.totalLosses).toBe(9);
    });

    it('should advance contracts and expire finished ones', () => {
      const contractId = 'contract-1';
      state.contracts[contractId] = {
        id: contractId,
        playerId,
        playerName: 'Test Player',
        teamId: state.userTeamId,
        position: Position.QB,
        status: 'active',
        type: 'veteran',
        signedYear: 2024,
        totalYears: 2,
        yearsRemaining: 1, // Will expire after advance
        totalValue: 10000,
        guaranteedMoney: 5000,
        signingBonus: 0,
        averageAnnualValue: 5000,
        yearlyBreakdown: [
          { year: 2024, bonus: 2500, salary: 2500, capHit: 5000, isVoidYear: false },
          { year: 2025, bonus: 2500, salary: 2500, capHit: 5000, isVoidYear: false },
        ],
        voidYears: 0,
        hasNoTradeClause: false,
        hasNoTagClause: false,
        originalContractId: null,
        notes: [],
      };
      state.players[playerId] = {
        ...state.players[playerId],
        contractId,
      };

      const result = transitionToNewSeason(state);
      const contract = result.contracts[contractId];

      expect(contract.status).toBe('expired');
      expect(contract.yearsRemaining).toBe(0);
      expect(result.players[playerId].contractId).toBeNull();
    });

    it('should generate a new schedule', () => {
      const result = transitionToNewSeason(state);
      expect(result.league.schedule).not.toBeNull();
      expect(result.league.schedule!.year).toBe(2026);
      expect(result.league.schedule!.regularSeason.length).toBe(272);
    });

    it('should recalculate cap space correctly for surviving contracts', () => {
      // Add a multi-year contract that will survive the transition
      const contractId = 'contract-multiyear';
      const multiYearContract = {
        id: contractId,
        playerId,
        playerName: 'Test Player',
        teamId: state.userTeamId,
        position: Position.QB,
        status: 'active' as const,
        type: 'veteran' as const,
        signedYear: 2025,
        totalYears: 4,
        yearsRemaining: 4,
        totalValue: 40000,
        guaranteedMoney: 20000,
        signingBonus: 0,
        averageAnnualValue: 10000,
        yearlyBreakdown: [
          { year: 2025, bonus: 5000, salary: 5000, capHit: 10000, isVoidYear: false },
          { year: 2026, bonus: 5000, salary: 5000, capHit: 10000, isVoidYear: false },
          { year: 2027, bonus: 5000, salary: 5000, capHit: 10000, isVoidYear: false },
          { year: 2028, bonus: 5000, salary: 5000, capHit: 10000, isVoidYear: false },
        ],
        voidYears: 0,
        hasNoTradeClause: false,
        hasNoTagClause: false,
        originalContractId: null,
        notes: [],
      };
      state.contracts[contractId] = multiYearContract;
      state.players[playerId] = {
        ...state.players[playerId],
        contractId,
      };

      const result = transitionToNewSeason(state);

      // Contract should still be active with yearsRemaining = 3
      expect(result.contracts[contractId].status).toBe('active');
      expect(result.contracts[contractId].yearsRemaining).toBe(3);

      // Cap space for the user's team should reflect the contract's cap hit
      const userTeam = result.teams[state.userTeamId];
      expect(userTeam.finances.currentCapUsage).toBeGreaterThan(0);
      expect(userTeam.finances.capSpace).toBeGreaterThan(0);
      expect(userTeam.finances.capSpace).toBeLessThan(userTeam.finances.salaryCap);
      // capSpace should be salaryCap - currentCapUsage
      expect(userTeam.finances.capSpace).toBe(
        userTeam.finances.salaryCap - userTeam.finances.currentCapUsage
      );
    });

    it('should recalculate cap space for ALL teams, not just with default 0', () => {
      // Add contracts to multiple teams to ensure ALL teams get recalculated
      const teamIds = Object.keys(state.teams);
      let contractIdx = 0;

      for (const teamId of teamIds) {
        // Generate a player for this team
        const p = generatePlayer({ position: Position.WR, ageRange: { min: 25, max: 25 } });
        state.players[p.id] = p;
        state.teams[teamId] = {
          ...state.teams[teamId],
          rosterPlayerIds: [...state.teams[teamId].rosterPlayerIds, p.id],
        };

        // Give each team a 3-year contract worth 15000/year
        const cid = `contract-team-${contractIdx++}`;
        state.contracts[cid] = {
          id: cid,
          playerId: p.id,
          playerName: `Player ${contractIdx}`,
          teamId,
          position: Position.WR,
          status: 'active' as const,
          type: 'veteran' as const,
          signedYear: 2025,
          totalYears: 3,
          yearsRemaining: 3,
          totalValue: 45000,
          guaranteedMoney: 20000,
          signingBonus: 0,
          averageAnnualValue: 15000,
          yearlyBreakdown: [
            { year: 2025, bonus: 5000, salary: 10000, capHit: 15000, isVoidYear: false },
            { year: 2026, bonus: 5000, salary: 10000, capHit: 15000, isVoidYear: false },
            { year: 2027, bonus: 5000, salary: 10000, capHit: 15000, isVoidYear: false },
          ],
          voidYears: 0,
          hasNoTradeClause: false,
          hasNoTagClause: false,
          originalContractId: null,
          notes: [],
        };
        state.players[p.id] = { ...state.players[p.id], contractId: cid };
      }

      const result = transitionToNewSeason(state);

      // Every team should have nonzero cap usage and positive cap space
      for (const teamId of teamIds) {
        const team = result.teams[teamId];
        expect(team.finances.currentCapUsage).toBeGreaterThan(0);
        expect(team.finances.salaryCap).toBeGreaterThan(0);
        expect(team.finances.capSpace).toBe(
          team.finances.salaryCap - team.finances.currentCapUsage
        );
        // Cap space should not be equal to the full salary cap (that would mean $0 usage)
        expect(team.finances.capSpace).not.toBe(team.finances.salaryCap);
      }
    });

    it('should recalculate cap space correctly with a full realistic game state', () => {
      // Use createNewGame to get a realistic state with proper contracts
      const realisticState = createNewGame({
        saveSlot: 0,
        gmName: 'TestGM',
        selectedTeam: getCityByAbbreviation('NYG')!,
        startYear: 2025,
        historyYears: 0,
      });

      // Verify the initial state has cap usage
      const userTeamBefore = realisticState.teams[realisticState.userTeamId];
      expect(userTeamBefore.finances.currentCapUsage).toBeGreaterThan(0);

      // Now transition to new season (simulating end of Season 1)
      const season2State = transitionToNewSeason(realisticState);

      // Verify cap space for user's team is recalculated correctly
      const userTeamAfter = season2State.teams[season2State.userTeamId];
      expect(userTeamAfter.finances.salaryCap).toBeGreaterThan(0);
      expect(userTeamAfter.finances.currentCapUsage).toBeGreaterThan(0);
      expect(userTeamAfter.finances.capSpace).toBe(
        userTeamAfter.finances.salaryCap - userTeamAfter.finances.currentCapUsage
      );
      // Cap space should not be 0 (that's the bug we're testing for)
      expect(userTeamAfter.finances.capSpace).not.toBe(0);

      // Also verify ALL 32 teams have proper cap recalculation
      const allTeamIds = Object.keys(season2State.teams);
      let teamsWithCapUsage = 0;
      for (const teamId of allTeamIds) {
        const team = season2State.teams[teamId];
        if (team.finances.currentCapUsage > 0) {
          teamsWithCapUsage++;
          expect(team.finances.capSpace).toBe(
            team.finances.salaryCap - team.finances.currentCapUsage
          );
        }
      }
      // Most teams should have cap usage (active contracts)
      expect(teamsWithCapUsage).toBeGreaterThan(20);

      // Now transition AGAIN to Season 3 to test two consecutive transitions
      const season3State = transitionToNewSeason(season2State);
      const userTeamS3 = season3State.teams[season3State.userTeamId];
      expect(userTeamS3.finances.salaryCap).toBeGreaterThan(0);
      expect(userTeamS3.finances.currentCapUsage).toBeGreaterThan(0);
      expect(userTeamS3.finances.capSpace).toBe(
        userTeamS3.finances.salaryCap - userTeamS3.finances.currentCapUsage
      );
      expect(userTeamS3.finances.capSpace).not.toBe(0);
    }, 30000);

    it('should retire very old players', () => {
      // Add an old player who should almost certainly retire
      const oldPlayer = generatePlayer({
        position: Position.QB,
        ageRange: { min: 42, max: 42 },
      });
      const oldPlayerId = oldPlayer.id;
      state.players[oldPlayerId] = oldPlayer;
      state.teams[state.userTeamId] = {
        ...state.teams[state.userTeamId],
        rosterPlayerIds: [...state.teams[state.userTeamId].rosterPlayerIds, oldPlayerId],
      };

      // Run multiple times since retirement is probabilistic
      let retiredAtLeastOnce = false;
      for (let i = 0; i < 20; i++) {
        const result = transitionToNewSeason(state);
        if (!result.players[oldPlayerId]) {
          retiredAtLeastOnce = true;
          // Also verify they were removed from the roster
          expect(result.teams[state.userTeamId].rosterPlayerIds).not.toContain(oldPlayerId);
          break;
        }
      }

      expect(retiredAtLeastOnce).toBe(true);
    });
  });
});
