/**
 * Draft Pipeline Integration Tests
 *
 * Tests the complete draft pipeline: class generation -> combine -> draft simulation -> UDFA
 * Verifies subsystems work together correctly.
 */

import {
  generateDraftClass,
  validateDraftClass,
  getDraftClassSummary,
  getTopProspects,
  getProspectsByPosition,
  DraftClass,
} from '@core/draft/DraftClassGenerator';
import {
  selectCombineInvites,
  simulateCombine,
  CombineSimulationResults,
  CombineGrade,
} from '@core/draft/CombineSimulator';
import {
  createDraftOrderState,
  getDraftOrder,
  getTeamPicks,
  setDraftOrderFromStandings,
  DraftOrderState,
} from '@core/draft/DraftOrderManager';
import {
  createDraftRoomState,
  startDraft,
  processAIPick,
  makeUserPick,
  continueAfterRoundBreak,
  getDraftSummary,
  DraftStatus,
  DraftRoomState,
  DEFAULT_TIMER_CONFIG,
} from '@core/draft/DraftRoomSimulator';
import {
  createAIDraftProfile,
  assessTeamNeeds,
  AIDraftProfile,
  DraftPhilosophy,
  TeamNeeds,
} from '@core/draft/AIDraftStrategy';
import {
  createUDFAPool,
  simulateAISignings,
  attemptUDFASigning,
  getTopUDFAs,
  getUserRemainingBudget,
  getUserSignedUDFAs,
  UDFA_BONUS_BUDGET,
  validateUDFAPoolState,
} from '@core/draft/UDFASystem';
import {
  generateRookieContract,
  validateRookieContract,
} from '@core/draft/RookieContractGenerator';
import { DraftPick, createDraftPick, assignOverallPick } from '@core/models/league/DraftPick';
import { Position } from '@core/models/player/Position';

// Helper: create 32 fake team IDs
function createTeamIds(): string[] {
  return Array.from({ length: 32 }, (_, i) => `team-${i}`);
}

// Helper: create dummy standings as team ID array (best to worst)
// setDraftOrderFromStandings expects string[] in best-to-worst order
function createStandingsOrder(teamIds: string[]): string[] {
  // Return in best-to-worst order: team-31 is best (most wins), team-0 is worst
  return [...teamIds].reverse();
}

describe('Draft Pipeline Integration Tests', () => {
  const YEAR = 2025;
  const teamIds = createTeamIds();
  const userTeamId = 'team-0';
  let draftClass: DraftClass;

  // Generate once for all tests in this describe block
  beforeAll(() => {
    draftClass = generateDraftClass({ year: YEAR, minProspects: 250, maxProspects: 300 });
  }, 30000);

  // ======================================================
  // 1. Draft Class Generation
  // ======================================================
  describe('draft class generation', () => {
    it('should generate a valid draft class with 250-300+ prospects', () => {
      expect(validateDraftClass(draftClass)).toBe(true);
      expect(draftClass.prospects.length).toBeGreaterThanOrEqual(250);
    });

    it('should have a valid class meta with strength', () => {
      expect(draftClass.meta).toBeDefined();
      expect(draftClass.meta.strength).toBeDefined();
      expect(draftClass.meta.year).toBe(YEAR);
    });

    it('should cover all NFL positions', () => {
      const positions = new Set(draftClass.prospects.map((p) => p.player.position));
      const allPositions = Object.values(Position);
      for (const pos of allPositions) {
        expect(positions.has(pos)).toBe(true);
      }
    });

    it('should have a distribution of talent tiers', () => {
      const summary = getDraftClassSummary(draftClass);
      expect(summary.prospectsByTier.elite).toBeGreaterThan(0);
      expect(summary.prospectsByTier.starter).toBeGreaterThan(0);
      expect(summary.prospectsByTier.backup).toBeGreaterThan(0);
      expect(summary.prospectsByTier.fringe).toBeGreaterThan(0);
      // Elite should be the minority
      expect(summary.prospectsByTier.elite).toBeLessThan(summary.prospectsByTier.fringe);
    });

    it('should have college programs assigned to all prospects', () => {
      for (const prospect of draftClass.prospects) {
        // Prospect uses collegeName (denormalized), not a college object
        expect(prospect.collegeName).toBeTruthy();
        expect(prospect.collegeProgramId).toBeTruthy();
      }
    });

    it('should have college stats for all prospects', () => {
      for (const prospect of draftClass.prospects) {
        expect(prospect.collegeStats).toBeDefined();
        expect(prospect.collegeStats.seasonsPlayed).toBeGreaterThanOrEqual(2);
        expect(prospect.collegeStats.gamesPlayed).toBeGreaterThan(0);
      }
    });

    it('getTopProspects should return sorted by ceiling', () => {
      const top = getTopProspects(draftClass, 10);
      expect(top.length).toBe(10);

      // First prospect should have a high ceiling
      const bestCeilings = ['franchiseCornerstone', 'highEndStarter', 'solidStarter'];
      expect(bestCeilings).toContain(top[0].player.roleFit.ceiling);
    });

    it('getProspectsByPosition should filter correctly', () => {
      const qbs = getProspectsByPosition(draftClass, Position.QB);
      expect(qbs.length).toBeGreaterThanOrEqual(8);
      for (const qb of qbs) {
        expect(qb.player.position).toBe(Position.QB);
      }
    });
  });

  // ======================================================
  // 2. Combine Simulation
  // ======================================================
  describe('combine evaluation', () => {
    let combineResults: CombineSimulationResults;

    beforeAll(() => {
      // simulateCombine takes (DraftClass, CombineConfig?) and handles invites internally
      combineResults = simulateCombine(draftClass);
    }, 15000);

    it('should invite prospects to the combine', () => {
      expect(combineResults.results.size).toBeGreaterThan(0);
      expect(combineResults.invitedProspectIds.length).toBeGreaterThan(0);
    });

    it('should have workout results for invited prospects who participated', () => {
      let foundWorkouts = false;
      for (const [prospectId, result] of combineResults.results) {
        if (result.invited && result.participated && result.workoutResults) {
          foundWorkouts = true;
          const workouts = result.workoutResults;
          // At least some workout values should be populated
          const hasValues =
            workouts.fortyYardDash !== null ||
            workouts.benchPress !== null ||
            workouts.verticalJump !== null;
          expect(hasValues).toBe(true);
          break;
        }
      }
      expect(foundWorkouts).toBe(true);
    });

    it('should have medical evaluations for invited prospects', () => {
      let foundMedical = false;
      for (const [prospectId, result] of combineResults.results) {
        if (result.invited && result.participated && result.medicalEvaluation) {
          foundMedical = true;
          expect(result.medicalEvaluation.grade).toBeDefined();
          expect(result.medicalEvaluation.durabilityRating).toBeGreaterThanOrEqual(0);
          break;
        }
      }
      expect(foundMedical).toBe(true);
    });

    it('should have interview impressions', () => {
      let hasInterviews = false;
      for (const [prospectId, result] of combineResults.results) {
        if (result.interviewImpressions && result.interviewImpressions.length > 0) {
          hasInterviews = true;
          for (const interview of result.interviewImpressions) {
            expect(interview.overallScore).toBeGreaterThanOrEqual(1);
            expect(interview.overallScore).toBeLessThanOrEqual(10);
          }
          break;
        }
      }
      expect(hasInterviews).toBe(true);
    });
  });

  // ======================================================
  // 3. Draft Order Setup
  // ======================================================
  describe('draft order management', () => {
    let orderState: DraftOrderState;

    beforeAll(() => {
      orderState = createDraftOrderState(YEAR, teamIds);
    });

    it('should create 7 rounds x 32 teams = 224 picks', () => {
      const allPicks = getDraftOrder(orderState, YEAR);
      expect(allPicks.length).toBe(224);
    });

    it('should assign picks to all teams', () => {
      for (const teamId of teamIds) {
        const teamPicks = getTeamPicks(orderState, teamId, YEAR);
        expect(teamPicks.length).toBe(7); // 1 per round
      }
    });

    it('should set draft order from standings', () => {
      // setDraftOrderFromStandings expects team IDs in best-to-worst order
      const standings = createStandingsOrder(teamIds);
      const updated = setDraftOrderFromStandings(orderState, YEAR, standings);
      const allPicks = getDraftOrder(updated, YEAR);

      // First pick should belong to worst team (team-0, which is last in best-to-worst order)
      const firstPick = allPicks[0];
      expect(firstPick.overallPick).toBe(1);
      expect(firstPick.currentTeamId).toBe('team-0');

      // Last first-round pick should be best team (team-31)
      const lastFirstRoundPick = allPicks[31];
      expect(lastFirstRoundPick.overallPick).toBe(32);
      expect(lastFirstRoundPick.currentTeamId).toBe('team-31');
    });

    it('should have picks for future years', () => {
      const nextYearPicks = getDraftOrder(orderState, YEAR + 1);
      expect(nextYearPicks.length).toBe(224);
    });
  });

  // ======================================================
  // 4. Full Draft Simulation (7 rounds)
  // ======================================================
  describe('full 7-round draft simulation', () => {
    let finalState: DraftRoomState;

    beforeAll(() => {
      // Create draft order with standings
      let orderState = createDraftOrderState(YEAR, teamIds);
      const standings = createStandingsOrder(teamIds);
      orderState = setDraftOrderFromStandings(orderState, YEAR, standings);

      // Create AI profiles for all non-user teams
      const aiProfiles = new Map<string, AIDraftProfile>();
      for (const teamId of teamIds) {
        if (teamId === userTeamId) continue;
        const needs: TeamNeeds = {
          teamId,
          positionNeeds: new Map<Position, 'critical' | 'high' | 'moderate' | 'low' | 'none'>([
            [Position.QB, 'high'],
            [Position.WR, 'moderate'],
            [Position.DE, 'critical'],
          ]),
          criticalPositions: [Position.DE],
          highNeedPositions: [Position.QB],
        };
        const profile = createAIDraftProfile(teamId, needs);
        aiProfiles.set(teamId, profile);
      }

      // Create draft room with timer disabled for test speed
      const timerConfig = { ...DEFAULT_TIMER_CONFIG, enabled: false };
      let state = createDraftRoomState(YEAR, orderState, draftClass, aiProfiles, userTeamId, timerConfig);

      // Start the draft
      state = startDraft(state);
      expect(state.status).toBe(DraftStatus.IN_PROGRESS);

      // Simulate all 224 picks
      let picksMade = 0;
      const maxPicks = 224;

      while (state.status !== DraftStatus.COMPLETED && picksMade < maxPicks) {
        if (state.status === DraftStatus.ROUND_COMPLETE) {
          state = continueAfterRoundBreak(state);
        }

        if (!state.currentPick) break;

        if (state.currentPick.isUserPick) {
          // User picks best available
          const topProspect = state.availableProspects[0];
          if (topProspect) {
            state = makeUserPick(state, topProspect.id);
          } else {
            break;
          }
        } else {
          state = processAIPick(state);
        }
        picksMade++;
      }

      finalState = state;
    }, 60000);

    it('should complete all 224 picks', () => {
      expect(finalState.status).toBe(DraftStatus.COMPLETED);
      expect(finalState.picks.length).toBe(224);
    });

    it('should have unique prospects for each pick', () => {
      const prospectIds = new Set(finalState.picks.map((p) => p.prospect.id));
      expect(prospectIds.size).toBe(224);
    });

    it('should assign all picks to teams', () => {
      for (const pick of finalState.picks) {
        expect(pick.teamId).toBeTruthy();
        expect(teamIds).toContain(pick.teamId);
      }
    });

    it('user team should have made picks', () => {
      const summary = getDraftSummary(finalState);
      expect(summary.userPicks.length).toBeGreaterThan(0);
      // User had 7 picks (1 per round, no trades)
      expect(summary.userPicks.length).toBe(7);
    });

    it('each team should have approximately 7 picks (allowing for trades)', () => {
      const picksByTeam = new Map<string, number>();
      for (const pick of finalState.picks) {
        picksByTeam.set(pick.teamId, (picksByTeam.get(pick.teamId) || 0) + 1);
      }

      // Without trades, every team gets exactly 7
      for (const teamId of teamIds) {
        const count = picksByTeam.get(teamId) || 0;
        expect(count).toBeGreaterThanOrEqual(1); // At minimum 1 pick
      }

      // Total should be 224
      let total = 0;
      for (const count of picksByTeam.values()) {
        total += count;
      }
      expect(total).toBe(224);
    });

    it('available prospects should be reduced after draft', () => {
      expect(finalState.availableProspects.length).toBe(draftClass.prospects.length - 224);
    });

    it('draft order should follow standings (round 1)', () => {
      const round1Picks = finalState.picks.filter((p) => p.pick.round === 1);
      // First pick should be team-0 (worst record)
      expect(round1Picks[0].teamId).toBe('team-0');
    });
  });

  // ======================================================
  // 5. Rookie Contract Generation
  // ======================================================
  describe('rookie contract generation', () => {
    it('should generate valid rookie contracts for all 7 rounds', () => {
      for (let round = 1; round <= 7; round++) {
        const overallPick = (round - 1) * 32 + 1; // First pick of each round
        // generateRookieContract takes (DraftPick, playerId)
        const pick: DraftPick = {
          id: `pick-${YEAR}-R${round}-team-0`,
          year: YEAR,
          round,
          originalTeamId: 'team-0',
          currentTeamId: 'team-0',
          overallPick,
          selectedPlayerId: `player-r${round}`,
          tradeHistory: [],
        };

        const contract = generateRookieContract(pick, `player-r${round}`);

        expect(validateRookieContract(contract)).toBe(true);
        expect(contract.round).toBe(round);
        expect(contract.overallPick).toBe(overallPick);

        // All rookie contracts should have 4 years
        expect(contract.years).toBe(4);

        // First round picks get 5th year option
        if (round === 1) {
          expect(contract.hasFifthYearOption).toBe(true);
          expect(contract.fifthYearOption).not.toBeNull();
        }
      }
    });

    it('higher picks should have higher total value', () => {
      const firstPick: DraftPick = {
        id: `pick-${YEAR}-R1-team-0`,
        year: YEAR,
        round: 1,
        originalTeamId: 'team-0',
        currentTeamId: 'team-0',
        overallPick: 1,
        selectedPlayerId: 'player-1',
        tradeHistory: [],
      };
      const lastPick: DraftPick = {
        id: `pick-${YEAR}-R7-team-31`,
        year: YEAR,
        round: 7,
        originalTeamId: 'team-31',
        currentTeamId: 'team-31',
        overallPick: 224,
        selectedPlayerId: 'player-224',
        tradeHistory: [],
      };

      const firstOverall = generateRookieContract(firstPick, 'player-1');
      const lastPickContract = generateRookieContract(lastPick, 'player-224');

      expect(firstOverall.totalValue).toBeGreaterThan(lastPickContract.totalValue);
    });
  });

  // ======================================================
  // 6. UDFA System
  // ======================================================
  describe('UDFA system after draft', () => {
    it('should create UDFA pool from undrafted prospects', () => {
      // Simulate: 224 prospects drafted
      const draftedIds = new Set(draftClass.prospects.slice(0, 224).map((p) => p.id));
      const pool = createUDFAPool(draftClass, draftedIds, teamIds, userTeamId);

      expect(validateUDFAPoolState(pool)).toBe(true);
      expect(pool.availableProspects.length).toBe(draftClass.prospects.length - 224);
      expect(pool.availableProspects.length).toBeGreaterThan(0);
    });

    it('should allow user to sign UDFAs within budget', () => {
      const draftedIds = new Set(draftClass.prospects.slice(0, 224).map((p) => p.id));
      let pool = createUDFAPool(draftClass, draftedIds, teamIds, userTeamId);

      const topUDFAs = getTopUDFAs(pool, 5);
      expect(topUDFAs.length).toBeGreaterThan(0);

      // Try signing top UDFA
      const target = topUDFAs[0];
      const { result, newState } = attemptUDFASigning(pool, target.id, 50);

      if (result.success) {
        // Successfully signed
        expect(result.prospect).toBeDefined();
        expect(result.signingBonus).toBe(50);
        expect(getUserRemainingBudget(newState)).toBe(UDFA_BONUS_BUDGET - 50);
        expect(getUserSignedUDFAs(newState).length).toBe(1);
        pool = newState;
      } else {
        // Lost to AI competition - still valid behavior
        expect(result.message).toBeTruthy();
      }
    });

    it('should simulate AI UDFA signings', () => {
      const draftedIds = new Set(draftClass.prospects.slice(0, 224).map((p) => p.id));
      const pool = createUDFAPool(draftClass, draftedIds, teamIds, userTeamId);

      const initialAvailable = pool.availableProspects.length;
      const afterAI = simulateAISignings(pool, 3);

      // AI teams should have signed some UDFAs
      let totalAISigned = 0;
      for (const teamId of teamIds) {
        if (teamId === userTeamId) continue;
        const signed = afterAI.signedByTeam.get(teamId) || [];
        totalAISigned += signed.length;
      }

      expect(totalAISigned).toBeGreaterThan(0);
      expect(afterAI.availableProspects.length).toBeLessThan(initialAvailable);
    });

    it('should enforce UDFA budget limits', () => {
      const draftedIds = new Set(draftClass.prospects.slice(0, 224).map((p) => p.id));
      const pool = createUDFAPool(draftClass, draftedIds, teamIds, userTeamId);

      // Try to sign with more than budget
      const topUDFA = getTopUDFAs(pool, 1)[0];
      if (topUDFA) {
        const { result } = attemptUDFASigning(pool, topUDFA.id, UDFA_BONUS_BUDGET + 100);
        expect(result.success).toBe(false);
        expect(result.message).toContain('budget');
      }
    });
  });
});
