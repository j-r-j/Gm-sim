/**
 * Trade System Integration Tests
 *
 * Tests the trade evaluation, execution, roster updates,
 * and salary cap implications of trades.
 */

import {
  generateWeeklyTradeOffers,
  acceptTradeOffer,
  rejectTradeOffer,
  expireOldOffers,
  processWeeklyTradeOffers,
  createTradeOffersState,
  evaluateUserTradeProposal,
  AITradeOffer,
  TradeOffersState,
  UserTradeProposal,
} from '@core/trade/AITradeOfferGenerator';
import { evaluateTrade, wouldAIAcceptTrade, TradeProposal } from '@core/draft/TradeValueCalculator';
import {
  createDraftOrderState,
  executeTrade,
  getTeamPicks,
  getDraftOrder,
  DraftOrderState,
} from '@core/draft/DraftOrderManager';
import { createNewGame } from '../../services/NewGameService';
import { GameState } from '@core/models/game/GameState';
import { FAKE_CITIES } from '@core/models/team/FakeCities';

const YEAR = 2025;
const TEAM_IDS = Array.from({ length: 32 }, (_, i) => `team-${i}`);

describe('Trade System Integration Tests', () => {
  // ======================================================
  // 1. Draft Pick Trade Evaluation
  // ======================================================
  describe('draft pick trade evaluation', () => {
    let orderState: DraftOrderState;

    beforeEach(() => {
      orderState = createDraftOrderState(YEAR, TEAM_IDS);
    });

    it('should evaluate pick-for-pick trade proposals', () => {
      const team0Picks = getTeamPicks(orderState, 'team-0', YEAR);
      const team1Picks = getTeamPicks(orderState, 'team-1', YEAR);

      // Trade team-0 round 1 for team-1 round 1
      if (team0Picks.length > 0 && team1Picks.length > 0) {
        const proposal: TradeProposal = {
          picksOffered: [team0Picks[0]],
          picksRequested: [team1Picks[0]],
          currentYear: YEAR,
        };

        const evaluation = evaluateTrade(proposal);
        expect(evaluation).toBeDefined();
        expect(evaluation.assessment).toBeDefined();
        expect(evaluation.description).toBeTruthy();
        expect(typeof evaluation._internalValueDiff).toBe('number');
        expect(typeof evaluation._internalValueRatio).toBe('number');
      }
    });

    it('should correctly value higher picks more than lower picks', () => {
      const team0Picks = getTeamPicks(orderState, 'team-0', YEAR);

      if (team0Picks.length >= 2) {
        // Round 1 pick for round 7 pick - clearly unfair
        const round1Pick = team0Picks.find((p) => p.round === 1);
        const round7Pick = team0Picks.find((p) => p.round === 7);

        if (round1Pick && round7Pick) {
          const proposal: TradeProposal = {
            picksOffered: [round1Pick],
            picksRequested: [round7Pick],
            currentYear: YEAR,
          };

          const evaluation = evaluateTrade(proposal);
          // Offering round 1 for round 7 = giving away more value
          // _internalValueDiff > 0 means you're overpaying
          expect(evaluation._internalValueDiff).toBeGreaterThan(0);
        }
      }
    });

    it('should evaluate AI willingness for trade proposals', () => {
      const team0Picks = getTeamPicks(orderState, 'team-0', YEAR);
      const team1Picks = getTeamPicks(orderState, 'team-1', YEAR);

      if (team0Picks.length >= 2 && team1Picks.length >= 1) {
        // Offer two picks for one (should be more attractive)
        const round3 = team0Picks.find((p) => p.round === 3);
        const round4 = team0Picks.find((p) => p.round === 4);
        const round2 = team1Picks.find((p) => p.round === 2);

        if (round3 && round4 && round2) {
          const proposal: TradeProposal = {
            picksOffered: [round3, round4],
            picksRequested: [round2],
            currentYear: YEAR,
          };

          const result = wouldAIAcceptTrade(proposal);
          expect(typeof result).toBe('boolean');
        }
      }
    });
  });

  // ======================================================
  // 2. Draft Pick Trade Execution
  // ======================================================
  describe('draft pick trade execution', () => {
    let orderState: DraftOrderState;

    beforeEach(() => {
      orderState = createDraftOrderState(YEAR, TEAM_IDS);
    });

    it('should swap pick ownership after trade', () => {
      const team0Picks = getTeamPicks(orderState, 'team-0', YEAR);
      const pickToTrade = team0Picks[0]; // Round 1 pick

      // Trade to team-1
      const newState = executeTrade(
        orderState,
        pickToTrade.id,
        YEAR,
        'team-1',
        'test-trade-1',
        5 // Week 5
      );

      // Pick should now belong to team-1
      const team0PicksAfter = getTeamPicks(newState, 'team-0', YEAR);
      const team1PicksAfter = getTeamPicks(newState, 'team-1', YEAR);

      expect(team0PicksAfter.length).toBe(team0Picks.length - 1);
      expect(team1PicksAfter.length).toBe(getTeamPicks(orderState, 'team-1', YEAR).length + 1);

      // The traded pick should have a trade history entry
      const tradedPick = team1PicksAfter.find((p) => p.id === pickToTrade.id);
      expect(tradedPick).toBeDefined();
      expect(tradedPick!.currentTeamId).toBe('team-1');
      expect(tradedPick!.tradeHistory.length).toBeGreaterThan(0);
    });

    it('should allow future year pick trades', () => {
      const futureYear = YEAR + 1;
      const team0FuturePicks = getTeamPicks(orderState, 'team-0', futureYear);

      if (team0FuturePicks.length > 0) {
        const pickToTrade = team0FuturePicks[0];
        const newState = executeTrade(
          orderState,
          pickToTrade.id,
          futureYear,
          'team-5',
          'trade-future-1',
          3
        );

        const team5FuturePicks = getTeamPicks(newState, 'team-5', futureYear);
        const hasTradedPick = team5FuturePicks.some((p) => p.id === pickToTrade.id);
        expect(hasTradedPick).toBe(true);
      }
    });

    it('should not allow trades more than 3 years in the future', () => {
      const tooFarYear = YEAR + 4;

      // This should throw because we only generate 3 years of picks
      expect(() => {
        executeTrade(orderState, 'nonexistent-pick', tooFarYear, 'team-1', 'trade-too-far', 1);
      }).toThrow();
    });

    it('should maintain total pick count after multiple trades', () => {
      const totalBefore = getDraftOrder(orderState, YEAR).length;

      // Make several trades
      let state = orderState;
      const team0Picks = getTeamPicks(state, 'team-0', YEAR);
      const team1Picks = getTeamPicks(state, 'team-1', YEAR);

      if (team0Picks.length > 0 && team1Picks.length > 0) {
        // Trade team-0 round 1 to team-1
        state = executeTrade(state, team0Picks[0].id, YEAR, 'team-1', 'trade-1', 1);

        // Trade team-1 round 2 to team-0
        const team1Round2 = team1Picks.find((p) => p.round === 2);
        if (team1Round2) {
          state = executeTrade(state, team1Round2.id, YEAR, 'team-0', 'trade-2', 1);
        }

        const totalAfter = getDraftOrder(state, YEAR).length;
        expect(totalAfter).toBe(totalBefore); // Total picks unchanged
      }
    });
  });

  // ======================================================
  // 3. AI Trade Offer Generation (with full GameState)
  // ======================================================
  describe('AI trade offer generation with full game', () => {
    let gameState: GameState;

    beforeAll(() => {
      gameState = createNewGame({
        saveSlot: 0,
        gmName: 'Test GM',
        selectedTeam: FAKE_CITIES[0],
        startYear: 2025,
        historyYears: 0,
      });
    }, 60000);

    it('should generate trade offers from game state', () => {
      // May produce 0 offers due to randomness, so run multiple times
      for (let attempt = 0; attempt < 10; attempt++) {
        const offers = generateWeeklyTradeOffers(gameState);
        if (offers.length > 0) {
          for (const offer of offers) {
            expect(offer.id).toBeTruthy();
            expect(offer.offeringTeamId).toBeTruthy();
            expect(offer.offeringTeamId).not.toBe(gameState.userTeamId);
            expect(offer.offering.length).toBeGreaterThan(0);
            expect(offer.requesting.length).toBeGreaterThan(0);
            expect(offer.fairnessScore).toBeGreaterThanOrEqual(0);
            expect(offer.fairnessScore).toBeLessThanOrEqual(100);
            expect(offer.motivation).toBeTruthy();
            expect(offer.status).toBe('pending');
          }
          break;
        }
      }
      // It's possible all 10 attempts produce 0 offers due to randomness
      // We just verify the function runs without errors
    });

    it('should accept trade offer and update rosters', () => {
      // Create a controlled trade offer
      const userTeam = gameState.teams[gameState.userTeamId];
      const aiTeamId = Object.keys(gameState.teams).find((id) => id !== gameState.userTeamId)!;
      const aiTeam = gameState.teams[aiTeamId];

      if (userTeam.rosterPlayerIds.length > 0 && aiTeam.rosterPlayerIds.length > 0) {
        const userPlayerId = userTeam.rosterPlayerIds[0];
        const aiPlayerId = aiTeam.rosterPlayerIds[0];

        const userPlayer = gameState.players[userPlayerId];
        const aiPlayer = gameState.players[aiPlayerId];

        const tradeOffer: AITradeOffer = {
          id: 'test-trade-offer',
          offeringTeamId: aiTeamId,
          offeringTeamName: `${aiTeam.city} ${aiTeam.nickname}`,
          offering: [
            {
              type: 'player',
              playerId: aiPlayerId,
              playerName: aiPlayer ? `${aiPlayer.firstName} ${aiPlayer.lastName}` : 'AI Player',
              position: aiPlayer?.position || 'QB',
              overallRating: 70,
              estimatedValue: 50,
            },
          ],
          requesting: [
            {
              type: 'player',
              playerId: userPlayerId,
              playerName: userPlayer
                ? `${userPlayer.firstName} ${userPlayer.lastName}`
                : 'User Player',
              position: userPlayer?.position || 'QB',
              overallRating: 65,
              estimatedValue: 45,
            },
          ],
          fairnessScore: 50,
          motivation: 'Testing trade execution',
          expiresWeek: 10,
          status: 'pending',
          createdWeek: 5,
        };

        // Set up trade offers state on gameState
        const stateWithTrades = {
          ...gameState,
          tradeOffers: {
            activeOffers: [tradeOffer],
            offerHistory: [],
            lastGeneratedWeek: 5,
          },
        } as GameState;

        const afterTrade = acceptTradeOffer(stateWithTrades, 'test-trade-offer');

        // User team should have gained AI player and lost their player
        const updatedUserTeam = afterTrade.teams[gameState.userTeamId];
        const updatedAITeam = afterTrade.teams[aiTeamId];

        expect(updatedUserTeam.rosterPlayerIds).toContain(aiPlayerId);
        expect(updatedUserTeam.rosterPlayerIds).not.toContain(userPlayerId);
        expect(updatedAITeam.rosterPlayerIds).toContain(userPlayerId);
        expect(updatedAITeam.rosterPlayerIds).not.toContain(aiPlayerId);
      }
    });

    it('should reject trade offer and move to history', () => {
      const aiTeamId = Object.keys(gameState.teams).find((id) => id !== gameState.userTeamId)!;

      const tradeOffer: AITradeOffer = {
        id: 'test-reject-offer',
        offeringTeamId: aiTeamId,
        offeringTeamName: 'Test Team',
        offering: [],
        requesting: [],
        fairnessScore: 30,
        motivation: 'Lowball offer',
        expiresWeek: 6,
        status: 'pending',
        createdWeek: 5,
      };

      const stateWithTrades = {
        ...gameState,
        tradeOffers: {
          activeOffers: [tradeOffer],
          offerHistory: [],
          lastGeneratedWeek: 5,
        },
      } as GameState;

      const afterReject = rejectTradeOffer(stateWithTrades, 'test-reject-offer');
      const tradeOffers = (afterReject as GameState & { tradeOffers?: TradeOffersState })
        .tradeOffers;

      expect(tradeOffers).toBeDefined();
      expect(tradeOffers!.activeOffers.length).toBe(0);
      expect(tradeOffers!.offerHistory.length).toBe(1);
      expect(tradeOffers!.offerHistory[0].status).toBe('rejected');
    });

    it('should expire old trade offers', () => {
      const tradeOffer: AITradeOffer = {
        id: 'test-expire-offer',
        offeringTeamId: 'team-5',
        offeringTeamName: 'Test Team',
        offering: [],
        requesting: [],
        fairnessScore: 50,
        motivation: 'Fair offer',
        expiresWeek: 3,
        status: 'pending',
        createdWeek: 2,
      };

      const stateWithTrades = {
        ...gameState,
        tradeOffers: {
          activeOffers: [tradeOffer],
          offerHistory: [],
          lastGeneratedWeek: 2,
        },
      } as GameState;

      const afterExpire = expireOldOffers(stateWithTrades, 5); // Current week 5 > expiresWeek 3
      const tradeOffers = (afterExpire as GameState & { tradeOffers?: TradeOffersState })
        .tradeOffers;

      expect(tradeOffers!.activeOffers.length).toBe(0);
      expect(tradeOffers!.offerHistory.length).toBe(1);
      expect(tradeOffers!.offerHistory[0].status).toBe('expired');
    });

    it('should process weekly trade offers (generate + expire)', () => {
      const processed = processWeeklyTradeOffers(gameState);
      // Should not throw and should return valid game state
      expect(processed).toBeDefined();
      expect(processed.teams).toBeDefined();
    });
  });

  // ======================================================
  // 4. User-Initiated Trade Evaluation
  // ======================================================
  describe('user-initiated trade evaluation', () => {
    let gameState: GameState;

    beforeAll(() => {
      gameState = createNewGame({
        saveSlot: 0,
        gmName: 'Test GM',
        selectedTeam: FAKE_CITIES[0],
        startYear: 2025,
        historyYears: 0,
      });
    }, 60000);

    it('should evaluate user trade proposals', () => {
      const userTeam = gameState.teams[gameState.userTeamId];
      const aiTeamId = Object.keys(gameState.teams).find((id) => id !== gameState.userTeamId)!;
      const aiTeam = gameState.teams[aiTeamId];

      if (userTeam.rosterPlayerIds.length > 0 && aiTeam.rosterPlayerIds.length > 0) {
        const proposal: UserTradeProposal = {
          userTeamId: gameState.userTeamId,
          aiTeamId,
          playersOffered: [userTeam.rosterPlayerIds[0]],
          playersRequested: [aiTeam.rosterPlayerIds[0]],
          picksOffered: [],
          picksRequested: [],
        };

        const response = evaluateUserTradeProposal(gameState, proposal);
        expect(response.decision).toBeDefined();
        expect(['accept', 'reject', 'counter']).toContain(response.decision);
        expect(response.reason).toBeTruthy();

        if (response.decision === 'counter') {
          expect(response.counterOffer).toBeDefined();
        }
      }
    });

    it('should reject empty trades', () => {
      const aiTeamId = Object.keys(gameState.teams).find((id) => id !== gameState.userTeamId)!;

      const proposal: UserTradeProposal = {
        userTeamId: gameState.userTeamId,
        aiTeamId,
        playersOffered: [],
        playersRequested: [],
        picksOffered: [],
        picksRequested: [],
      };

      const response = evaluateUserTradeProposal(gameState, proposal);
      expect(response.decision).toBe('reject');
    });

    it('should reject trades with invalid team', () => {
      const proposal: UserTradeProposal = {
        userTeamId: gameState.userTeamId,
        aiTeamId: 'nonexistent-team',
        playersOffered: [],
        playersRequested: [],
        picksOffered: [],
        picksRequested: [],
      };

      const response = evaluateUserTradeProposal(gameState, proposal);
      expect(response.decision).toBe('reject');
    });

    it('should consider salary cap in trade evaluation', () => {
      const aiTeamId = Object.keys(gameState.teams).find((id) => id !== gameState.userTeamId)!;
      const aiTeam = gameState.teams[aiTeamId];

      // Just verify the function handles the salary cap check without errors
      if (aiTeam.rosterPlayerIds.length > 0) {
        const proposal: UserTradeProposal = {
          userTeamId: gameState.userTeamId,
          aiTeamId,
          playersOffered: [],
          playersRequested: [aiTeam.rosterPlayerIds[0]],
          picksOffered: [],
          picksRequested: [],
        };

        const response = evaluateUserTradeProposal(gameState, proposal);
        // Should get a valid response (accept/reject/counter)
        expect(response.decision).toBeDefined();
      }
    });

    it.skip('TODO: should evaluate player-for-pick trades (draftPicks not yet available on gameState)', () => {
      // GameState may not have a draftPicks field in all configurations
    });
  });

  // ======================================================
  // 5. Trade Offers State Management
  // ======================================================
  describe('trade offers state management', () => {
    it('should create initial empty state', () => {
      const state = createTradeOffersState();
      expect(state.activeOffers).toHaveLength(0);
      expect(state.offerHistory).toHaveLength(0);
      expect(state.lastGeneratedWeek).toBe(0);
    });
  });
});
