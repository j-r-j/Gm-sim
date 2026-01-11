import {
  createDraftOrderState,
  createDraftYearState,
  getTeamPicks,
  getPicksByRound,
  executeTrade,
  recordFATransaction,
  calculateCompensatoryPicks,
  setDraftOrderFromStandings,
  getDraftOrder,
  getNextPick,
  canTradePick,
  advanceYear,
  getTotalPicksForYear,
  validateDraftOrderState,
  validateDraftYearState,
  getTeamDraftCapitalSummary,
  DraftOrderState,
  FATransaction,
  MAX_FUTURE_TRADE_YEARS,
} from '../DraftOrderManager';
import { DRAFT_ROUNDS } from '../../models/league/DraftPick';

describe('DraftOrderManager', () => {
  const testTeamIds = ['team-1', 'team-2', 'team-3', 'team-4'];
  const currentYear = 2025;
  let state: DraftOrderState;

  beforeEach(() => {
    state = createDraftOrderState(currentYear, testTeamIds, 3);
  });

  describe('createDraftOrderState', () => {
    it('should create state with correct year', () => {
      expect(state.currentYear).toBe(currentYear);
    });

    it('should include all team IDs', () => {
      expect(state.teamIds).toEqual(testTeamIds);
    });

    it('should create draft years for current and future years', () => {
      expect(state.draftYears.has(2025)).toBe(true);
      expect(state.draftYears.has(2026)).toBe(true);
      expect(state.draftYears.has(2027)).toBe(true);
      expect(state.draftYears.has(2028)).toBe(true);
    });

    it('should create correct number of picks per year', () => {
      const yearState = state.draftYears.get(2025)!;
      expect(yearState.picks.length).toBe(testTeamIds.length * DRAFT_ROUNDS);
    });
  });

  describe('createDraftYearState', () => {
    it('should create picks for all rounds', () => {
      const yearState = createDraftYearState(2025, testTeamIds);
      const roundCounts = new Map<number, number>();

      for (const pick of yearState.picks) {
        const count = roundCounts.get(pick.round) || 0;
        roundCounts.set(pick.round, count + 1);
      }

      for (let r = 1; r <= DRAFT_ROUNDS; r++) {
        expect(roundCounts.get(r)).toBe(testTeamIds.length);
      }
    });

    it('should not be finalized initially', () => {
      const yearState = createDraftYearState(2025, testTeamIds);
      expect(yearState.isFinalized).toBe(false);
    });
  });

  describe('getTeamPicks', () => {
    it('should return all picks for a team', () => {
      const picks = getTeamPicks(state, 'team-1', 2025);
      expect(picks.length).toBe(DRAFT_ROUNDS);
    });

    it('should return empty array for non-existent team', () => {
      const picks = getTeamPicks(state, 'fake-team', 2025);
      expect(picks.length).toBe(0);
    });

    it('should return empty array for non-existent year', () => {
      const picks = getTeamPicks(state, 'team-1', 2099);
      expect(picks.length).toBe(0);
    });
  });

  describe('getPicksByRound', () => {
    it('should return all picks for a round', () => {
      const picks = getPicksByRound(state, 2025, 1);
      expect(picks.length).toBe(testTeamIds.length);
    });

    it('should return picks with correct round', () => {
      const picks = getPicksByRound(state, 2025, 3);
      for (const pick of picks) {
        expect(pick.round).toBe(3);
      }
    });
  });

  describe('executeTrade', () => {
    it('should transfer pick to new team', () => {
      const teamPicks = getTeamPicks(state, 'team-1', 2025);
      const pickToTrade = teamPicks[0];

      const newState = executeTrade(state, pickToTrade.id, 2025, 'team-2', 'trade-1', 1);

      const team2Picks = getTeamPicks(newState, 'team-2', 2025);
      const tradedPick = team2Picks.find((p) => p.id === pickToTrade.id);
      expect(tradedPick).toBeDefined();
      expect(tradedPick?.currentTeamId).toBe('team-2');
    });

    it('should add to trade history', () => {
      const teamPicks = getTeamPicks(state, 'team-1', 2025);
      const pickToTrade = teamPicks[0];

      const newState = executeTrade(state, pickToTrade.id, 2025, 'team-2', 'trade-1', 1);

      const tradedPick = getTeamPicks(newState, 'team-2', 2025).find((p) => p.id === pickToTrade.id);
      expect(tradedPick?.tradeHistory.length).toBe(1);
      expect(tradedPick?.tradeHistory[0].fromTeamId).toBe('team-1');
      expect(tradedPick?.tradeHistory[0].toTeamId).toBe('team-2');
    });

    it('should throw for picks too far in future', () => {
      const futureYear = currentYear + MAX_FUTURE_TRADE_YEARS + 1;
      expect(() => {
        executeTrade(state, 'fake-pick', futureYear, 'team-2', 'trade-1', 1);
      }).toThrow();
    });
  });

  describe('recordFATransaction', () => {
    it('should add transaction to state', () => {
      const transaction: FATransaction = {
        id: 'fa-1',
        playerId: 'player-1',
        playerName: 'Test Player',
        teamId: 'team-1',
        type: 'loss',
        contractValue: 15000,
        projectedRound: 3,
        year: 2024,
      };

      const newState = recordFATransaction(state, transaction);
      expect(newState.faTransactions.length).toBe(1);
      expect(newState.faTransactions[0]).toEqual(transaction);
    });
  });

  describe('calculateCompensatoryPicks', () => {
    it('should calculate comp picks for unmatched losses', () => {
      let testState = state;

      // Add FA losses
      testState = recordFATransaction(testState, {
        id: 'fa-1',
        playerId: 'player-1',
        playerName: 'Star Player',
        teamId: 'team-1',
        type: 'loss',
        contractValue: 20000,
        projectedRound: 3,
        year: 2024,
      });

      const compPicks = calculateCompensatoryPicks(testState, 2025);
      expect(compPicks.length).toBeGreaterThan(0);
    });

    it('should not award comp picks for matched losses', () => {
      let testState = state;

      // Add FA loss
      testState = recordFATransaction(testState, {
        id: 'fa-1',
        playerId: 'player-1',
        playerName: 'Star Player',
        teamId: 'team-1',
        type: 'loss',
        contractValue: 10000,
        projectedRound: 4,
        year: 2024,
      });

      // Add matching FA gain
      testState = recordFATransaction(testState, {
        id: 'fa-2',
        playerId: 'player-2',
        playerName: 'New Player',
        teamId: 'team-1',
        type: 'gain',
        contractValue: 12000,
        projectedRound: 4,
        year: 2024,
      });

      const compPicks = calculateCompensatoryPicks(testState, 2025);
      const team1Picks = compPicks.filter((p) => p.teamId === 'team-1');
      expect(team1Picks.length).toBe(0);
    });
  });

  describe('setDraftOrderFromStandings', () => {
    it('should assign overall pick numbers', () => {
      // Standings: best to worst
      const standings = ['team-4', 'team-3', 'team-2', 'team-1'];
      const newState = setDraftOrderFromStandings(state, 2025, standings);

      const order = getDraftOrder(newState, 2025);

      // First pick should be worst team (team-1)
      expect(order[0].originalTeamId).toBe('team-1');
      expect(order[0].overallPick).toBe(1);
    });

    it('should maintain round structure', () => {
      const standings = ['team-1', 'team-2', 'team-3', 'team-4'];
      const newState = setDraftOrderFromStandings(state, 2025, standings);

      const order = getDraftOrder(newState, 2025);

      // First 4 picks should be round 1
      for (let i = 0; i < 4; i++) {
        expect(order[i].round).toBe(1);
      }

      // Next 4 picks should be round 2
      for (let i = 4; i < 8; i++) {
        expect(order[i].round).toBe(2);
      }
    });
  });

  describe('getNextPick', () => {
    it('should return first unselected pick', () => {
      const standings = ['team-1', 'team-2', 'team-3', 'team-4'];
      const newState = setDraftOrderFromStandings(state, 2025, standings);

      const nextPick = getNextPick(newState, 2025);
      expect(nextPick).not.toBeNull();
      expect(nextPick?.overallPick).toBe(1);
    });
  });

  describe('canTradePick', () => {
    it('should allow trading owned picks', () => {
      const picks = getTeamPicks(state, 'team-1', 2025);
      const result = canTradePick(state, picks[0].id, 2025, 'team-1');
      expect(result.canTrade).toBe(true);
    });

    it('should not allow trading picks not owned', () => {
      const picks = getTeamPicks(state, 'team-1', 2025);
      const result = canTradePick(state, picks[0].id, 2025, 'team-2');
      expect(result.canTrade).toBe(false);
    });

    it('should not allow trading picks too far in future', () => {
      const result = canTradePick(state, 'pick-id', 2030, 'team-1');
      expect(result.canTrade).toBe(false);
    });
  });

  describe('advanceYear', () => {
    it('should increment current year', () => {
      const newState = advanceYear(state);
      expect(newState.currentYear).toBe(currentYear + 1);
    });

    it('should add new future year', () => {
      const newState = advanceYear(state);
      const furthestYear = newState.currentYear + MAX_FUTURE_TRADE_YEARS;
      expect(newState.draftYears.has(furthestYear)).toBe(true);
    });
  });

  describe('getTotalPicksForYear', () => {
    it('should return correct total', () => {
      const total = getTotalPicksForYear(state, 2025);
      expect(total).toBe(testTeamIds.length * DRAFT_ROUNDS);
    });
  });

  describe('getTeamDraftCapitalSummary', () => {
    it('should calculate correct summary', () => {
      const summary = getTeamDraftCapitalSummary(state, 'team-1', 2025);

      expect(summary.teamId).toBe('team-1');
      expect(summary.totalPicks).toBe(DRAFT_ROUNDS);
      expect(summary.hasFirstRounder).toBe(true);
      expect(summary.hasSecondRounder).toBe(true);
      expect(summary.tradedAwayCount).toBe(0);
      expect(summary.acquiredCount).toBe(0);
    });

    it('should track traded picks', () => {
      const picks = getTeamPicks(state, 'team-1', 2025);
      const newState = executeTrade(state, picks[0].id, 2025, 'team-2', 'trade-1', 1);

      const summary = getTeamDraftCapitalSummary(newState, 'team-1', 2025);
      expect(summary.tradedAwayCount).toBe(1);

      const team2Summary = getTeamDraftCapitalSummary(newState, 'team-2', 2025);
      expect(team2Summary.acquiredCount).toBe(1);
    });
  });

  describe('validation', () => {
    it('should validate correct state', () => {
      expect(validateDraftOrderState(state)).toBe(true);
    });

    it('should validate year state', () => {
      const yearState = state.draftYears.get(2025)!;
      expect(validateDraftYearState(yearState)).toBe(true);
    });
  });
});
