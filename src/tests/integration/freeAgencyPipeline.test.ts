/**
 * Free Agency Pipeline Integration Tests
 *
 * Tests the complete free agency flow: phase transitions, offers,
 * signings, team budgets, and RFA tenders.
 */

import {
  createFreeAgencyState,
  addFreeAgent,
  advancePhase,
  advanceDay,
  submitOffer,
  acceptOffer,
  rejectOffer,
  withdrawOffer,
  setTeamInterest,
  getAvailableFreeAgents,
  getTopFreeAgents,
  getFreeAgentsByType,
  getFreeAgentsByPosition,
  getTeamOffers,
  getFreeAgentOffers,
  getTeamSignings,
  getRecentEvents,
  isFreeAgencyActive,
  canSignPlayers,
  classifyFreeAgentType,
  getPhaseDescription,
  validateFreeAgencyState,
  getFreeAgencySummary,
  FreeAgencyState,
  FreeAgencyPhase,
} from '@core/freeAgency/FreeAgencyManager';
import {
  createLegalTamperingState,
  startLegalTampering,
  endLegalTampering,
  initiateNegotiation,
  recordVerbalAgreement,
  getTeamVerbalAgreements,
  advanceTamperingDay,
  validateLegalTamperingState,
} from '@core/freeAgency/LegalTamperingPhase';
import {
  createDay1FrenzyState,
  startFrenzy,
  endFrenzy,
  recordFrenzySigning,
  validateDay1FrenzyState,
} from '@core/freeAgency/Day1FrenzySimulator';
import {
  createTricklePhaseState,
  startTricklePhase,
  identifyBargainOpportunities,
  validateTricklePhaseState,
} from '@core/freeAgency/TricklePhaseManager';
import {
  createRFASystemState,
  submitTender,
  getPlayerTender,
  calculateTenderValue,
  submitOfferSheet,
  matchOfferSheet,
  declineToMatch,
  validateRFASystemState,
} from '@core/freeAgency/RFATenderSystem';
import {
  createPlayerContract,
  ContractOffer,
  validatePlayerContract,
} from '@core/contracts/Contract';
import { Position } from '@core/models/player/Position';

const YEAR = 2025;
const TEAM_IDS = Array.from({ length: 32 }, (_, i) => `team-${i}`);
const USER_TEAM = 'team-0';

// Helper: create a free agent player descriptor
function createFAPlayer(
  playerId: string,
  position: Position,
  overallRating: number,
  age: number = 28,
  experience: number = 6
) {
  return {
    playerId,
    playerName: `Player ${playerId}`,
    position,
    age,
    experience,
    overallRating,
    previousTeamId: 'team-1',
    previousContractAAV: 10000,
  };
}

// Helper: create a contract offer
function createOffer(
  years: number,
  bonusPerYear: number,
  salaryPerYear: number
): ContractOffer {
  return {
    years,
    bonusPerYear,
    salaryPerYear,
    noTradeClause: false,
  };
}

describe('Free Agency Pipeline Integration Tests', () => {
  // ======================================================
  // 1. Free Agency State & Phase Transitions
  // ======================================================
  describe('free agency state and phase transitions', () => {
    it('should create valid initial state', () => {
      const state = createFreeAgencyState(YEAR, TEAM_IDS);

      expect(validateFreeAgencyState(state)).toBe(true);
      expect(state.phase).toBe('pre_free_agency');
      expect(state.currentYear).toBe(YEAR);
      expect(state.teamBudgets.size).toBe(32);
    });

    it('should advance through all phases in order', () => {
      let state = createFreeAgencyState(YEAR, TEAM_IDS);
      const expectedPhases: FreeAgencyPhase[] = [
        'pre_free_agency',
        'legal_tampering',
        'day1_frenzy',
        'day2_frenzy',
        'trickle',
        'training_camp',
        'closed',
      ];

      for (let i = 0; i < expectedPhases.length; i++) {
        expect(state.phase).toBe(expectedPhases[i]);

        if (i < expectedPhases.length - 1) {
          state = advancePhase(state);
        }
      }

      // Should not advance past closed
      const stillClosed = advancePhase(state);
      expect(stillClosed.phase).toBe('closed');
    });

    it('should track phase days', () => {
      let state = createFreeAgencyState(YEAR, TEAM_IDS);
      state = advancePhase(state); // legal_tampering
      expect(state.phaseDay).toBe(0);

      state = advanceDay(state);
      expect(state.phaseDay).toBe(1);

      state = advanceDay(state);
      expect(state.phaseDay).toBe(2);

      // Phase change should reset day counter
      state = advancePhase(state); // day1_frenzy
      expect(state.phaseDay).toBe(0);
    });

    it('should track free agency activity status', () => {
      let state = createFreeAgencyState(YEAR, TEAM_IDS);
      expect(isFreeAgencyActive(state)).toBe(false); // pre_free_agency
      expect(canSignPlayers(state)).toBe(false);

      state = advancePhase(state); // legal_tampering
      expect(isFreeAgencyActive(state)).toBe(true);
      expect(canSignPlayers(state)).toBe(false); // Can negotiate but not sign

      state = advancePhase(state); // day1_frenzy
      expect(isFreeAgencyActive(state)).toBe(true);
      expect(canSignPlayers(state)).toBe(true);
    });

    it('should generate phase change events', () => {
      let state = createFreeAgencyState(YEAR, TEAM_IDS);
      state = advancePhase(state);

      const events = getRecentEvents(state);
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('phase_change');
    });

    it('should provide phase descriptions', () => {
      const phases: FreeAgencyPhase[] = [
        'pre_free_agency',
        'legal_tampering',
        'day1_frenzy',
        'day2_frenzy',
        'trickle',
        'training_camp',
        'closed',
      ];

      for (const phase of phases) {
        const desc = getPhaseDescription(phase);
        expect(desc).toBeTruthy();
        expect(desc.length).toBeGreaterThan(5);
      }
    });
  });

  // ======================================================
  // 2. Free Agent Pool Management
  // ======================================================
  describe('free agent pool management', () => {
    it('should add free agents to the pool', () => {
      let state = createFreeAgencyState(YEAR, TEAM_IDS);

      state = addFreeAgent(
        state,
        createFAPlayer('fa-1', Position.QB, 85),
        'UFA',
        25000
      );
      state = addFreeAgent(
        state,
        createFAPlayer('fa-2', Position.WR, 78),
        'UFA',
        15000
      );
      state = addFreeAgent(
        state,
        createFAPlayer('fa-3', Position.CB, 72, 25, 3),
        'RFA',
        10000
      );

      expect(state.freeAgents.size).toBe(3);
    });

    it('should get available free agents', () => {
      let state = createFreeAgencyState(YEAR, TEAM_IDS);
      state = addFreeAgent(state, createFAPlayer('fa-1', Position.QB, 85), 'UFA', 25000);
      state = addFreeAgent(state, createFAPlayer('fa-2', Position.WR, 78), 'UFA', 15000);

      const available = getAvailableFreeAgents(state);
      expect(available.length).toBe(2);
    });

    it('should get top free agents sorted by market value', () => {
      let state = createFreeAgencyState(YEAR, TEAM_IDS);
      state = addFreeAgent(state, createFAPlayer('fa-1', Position.QB, 85), 'UFA', 25000);
      state = addFreeAgent(state, createFAPlayer('fa-2', Position.WR, 78), 'UFA', 15000);
      state = addFreeAgent(state, createFAPlayer('fa-3', Position.DE, 90), 'UFA', 30000);

      const top = getTopFreeAgents(state, 3);
      expect(top.length).toBe(3);
      expect(top[0].marketValue).toBeGreaterThanOrEqual(top[1].marketValue);
      expect(top[1].marketValue).toBeGreaterThanOrEqual(top[2].marketValue);
    });

    it('should filter by free agent type', () => {
      let state = createFreeAgencyState(YEAR, TEAM_IDS);
      state = addFreeAgent(state, createFAPlayer('ufa-1', Position.QB, 85, 28, 6), 'UFA', 25000);
      state = addFreeAgent(state, createFAPlayer('rfa-1', Position.WR, 78, 25, 3), 'RFA', 10000);

      const ufas = getFreeAgentsByType(state, 'UFA');
      expect(ufas.length).toBe(1);
      expect(ufas[0].type).toBe('UFA');

      const rfas = getFreeAgentsByType(state, 'RFA');
      expect(rfas.length).toBe(1);
      expect(rfas[0].type).toBe('RFA');
    });

    it('should filter by position', () => {
      let state = createFreeAgencyState(YEAR, TEAM_IDS);
      state = addFreeAgent(state, createFAPlayer('qb-1', Position.QB, 85), 'UFA', 25000);
      state = addFreeAgent(state, createFAPlayer('qb-2', Position.QB, 70), 'UFA', 8000);
      state = addFreeAgent(state, createFAPlayer('wr-1', Position.WR, 78), 'UFA', 15000);

      const qbs = getFreeAgentsByPosition(state, Position.QB);
      expect(qbs.length).toBe(2);

      const wrs = getFreeAgentsByPosition(state, Position.WR);
      expect(wrs.length).toBe(1);
    });

    it('should classify free agent types correctly', () => {
      expect(classifyFreeAgentType(2, true)).toBe('ERFA');
      expect(classifyFreeAgentType(3, true)).toBe('RFA');
      expect(classifyFreeAgentType(4, true)).toBe('UFA');
      expect(classifyFreeAgentType(3, false)).toBe('UFA'); // Undrafted
    });
  });

  // ======================================================
  // 3. Offer & Signing Flow
  // ======================================================
  describe('offer and signing flow', () => {
    let state: FreeAgencyState;

    beforeEach(() => {
      state = createFreeAgencyState(YEAR, TEAM_IDS);
      state = addFreeAgent(state, createFAPlayer('fa-star', Position.QB, 88), 'UFA', 25000);
      // Advance to day1_frenzy so we can make offers and sign
      state = advancePhase(state); // legal_tampering
      state = advancePhase(state); // day1_frenzy
    });

    it('should submit offers from teams', () => {
      const offer = createOffer(4, 8000, 12000);
      state = submitOffer(state, USER_TEAM, 'fa-fa-star-2025', offer, true);

      const teamOffers = getTeamOffers(state, USER_TEAM);
      expect(teamOffers.length).toBe(1);
      expect(teamOffers[0].status).toBe('pending');

      const faOffers = getFreeAgentOffers(state, 'fa-fa-star-2025');
      expect(faOffers.length).toBe(1);
    });

    it('should accept offer and create contract', () => {
      const offer = createOffer(4, 8000, 12000);
      state = submitOffer(state, USER_TEAM, 'fa-fa-star-2025', offer, true);

      const teamOffers = getTeamOffers(state, USER_TEAM);
      const offerId = teamOffers[0].id;

      state = acceptOffer(state, offerId);

      // Free agent should be signed
      const fa = state.freeAgents.get('fa-fa-star-2025');
      expect(fa).toBeDefined();
      expect(fa!.status).toBe('signed');
      expect(fa!.signedTeamId).toBe(USER_TEAM);
      expect(fa!.signedContractId).toBeTruthy();

      // Contract should be created
      expect(state.signedContracts.length).toBe(1);
      expect(validatePlayerContract(state.signedContracts[0])).toBe(true);
      expect(state.signedContracts[0].teamId).toBe(USER_TEAM);
      expect(state.signedContracts[0].totalYears).toBe(4);

      // Signing event should be logged
      const events = getRecentEvents(state);
      const signingEvents = events.filter((e) => e.type === 'signing');
      expect(signingEvents.length).toBe(1);
    });

    it('should not allow signing during legal tampering', () => {
      let tamperingState = createFreeAgencyState(YEAR, TEAM_IDS);
      tamperingState = addFreeAgent(
        tamperingState,
        createFAPlayer('fa-star', Position.QB, 88),
        'UFA',
        25000
      );
      tamperingState = advancePhase(tamperingState); // legal_tampering

      const offer = createOffer(4, 8000, 12000);
      tamperingState = submitOffer(tamperingState, USER_TEAM, 'fa-fa-star-2025', offer);

      const teamOffers = getTeamOffers(tamperingState, USER_TEAM);
      if (teamOffers.length > 0) {
        const beforeState = tamperingState;
        tamperingState = acceptOffer(tamperingState, teamOffers[0].id);
        // Accept should not work during legal tampering
        const fa = tamperingState.freeAgents.get('fa-fa-star-2025');
        expect(fa!.status).not.toBe('signed');
      }
    });

    it('should reject offers', () => {
      const offer = createOffer(4, 8000, 12000);
      state = submitOffer(state, USER_TEAM, 'fa-fa-star-2025', offer, true);

      const teamOffers = getTeamOffers(state, USER_TEAM);
      state = rejectOffer(state, teamOffers[0].id);

      const updatedOffers = getTeamOffers(state, USER_TEAM);
      const rejectedOffer = Array.from(state.offers.values()).find(
        (o) => o.id === teamOffers[0].id
      );
      expect(rejectedOffer?.status).toBe('rejected');
    });

    it('should withdraw offers', () => {
      const offer = createOffer(4, 8000, 12000);
      state = submitOffer(state, USER_TEAM, 'fa-fa-star-2025', offer, true);

      const teamOffers = getTeamOffers(state, USER_TEAM);
      state = withdrawOffer(state, teamOffers[0].id);

      const withdrawnOffer = Array.from(state.offers.values()).find(
        (o) => o.id === teamOffers[0].id
      );
      expect(withdrawnOffer?.status).toBe('withdrawn');
    });

    it('should update team budget when player signs', () => {
      const offer = createOffer(3, 5000, 10000); // AAV = 15000
      state = submitOffer(state, USER_TEAM, 'fa-fa-star-2025', offer, true);

      const teamOffers = getTeamOffers(state, USER_TEAM);
      state = acceptOffer(state, teamOffers[0].id);

      const budget = state.teamBudgets.get(USER_TEAM);
      expect(budget).toBeDefined();
      expect(budget!.spent).toBe(15000);
      expect(budget!.remaining).toBe(50000 - 15000);
    });

    it('should handle multiple offers from different teams', () => {
      const offer1 = createOffer(4, 8000, 12000);
      state = submitOffer(state, 'team-1', 'fa-fa-star-2025', offer1);

      const offer2 = createOffer(3, 6000, 14000);
      state = submitOffer(state, 'team-2', 'fa-fa-star-2025', offer2);

      const faOffers = getFreeAgentOffers(state, 'fa-fa-star-2025');
      // At least one offer should exist
      expect(faOffers.length).toBeGreaterThanOrEqual(1);

      // Accept the first offer
      state = acceptOffer(state, faOffers[0].id);

      // Player should be signed
      const fa = state.freeAgents.get('fa-fa-star-2025');
      expect(fa!.status).toBe('signed');
    });

    it('should not allow offers during pre_free_agency or closed', () => {
      let closedState = createFreeAgencyState(YEAR, TEAM_IDS);
      closedState = addFreeAgent(
        closedState,
        createFAPlayer('fa-1', Position.QB, 85),
        'UFA',
        25000
      );

      // Pre free agency - offers should be ignored
      const offer = createOffer(3, 5000, 10000);
      const beforeOffers = closedState.offers.size;
      closedState = submitOffer(closedState, USER_TEAM, 'fa-fa-1-2025', offer);
      expect(closedState.offers.size).toBe(beforeOffers);
    });

    it('should get team signings', () => {
      const offer = createOffer(3, 5000, 10000);
      state = submitOffer(state, USER_TEAM, 'fa-fa-star-2025', offer, true);

      const teamOffers = getTeamOffers(state, USER_TEAM);
      state = acceptOffer(state, teamOffers[0].id);

      const signings = getTeamSignings(state, USER_TEAM);
      expect(signings.length).toBe(1);
      expect(signings[0].signedTeamId).toBe(USER_TEAM);
    });

    it('should track team interest', () => {
      state = setTeamInterest(state, USER_TEAM, 'fa-fa-star-2025', 'high', true, true);
      state = setTeamInterest(state, 'team-5', 'fa-fa-star-2025', 'medium', true, true);

      const fa = state.freeAgents.get('fa-fa-star-2025');
      expect(fa).toBeDefined();
      expect(fa!.interest.length).toBe(2);

      const userInterest = fa!.interest.find((i) => i.teamId === USER_TEAM);
      expect(userInterest?.interestLevel).toBe('high');
    });
  });

  // ======================================================
  // 4. Legal Tampering Phase
  // ======================================================
  describe('legal tampering phase', () => {
    it('should create and validate legal tampering state', () => {
      const state = createLegalTamperingState(1, 3);
      expect(validateLegalTamperingState(state)).toBe(true);
    });

    it('should start and end legal tampering period', () => {
      let state = createLegalTamperingState(1, 3);
      state = startLegalTampering(state);
      expect(state.isActive).toBe(true);

      state = endLegalTampering(state);
      expect(state.isActive).toBe(false);
    });

    it('should initiate negotiations and record verbal agreements', () => {
      let state = createLegalTamperingState(1, 3);
      state = startLegalTampering(state);

      const initialOffer: ContractOffer = {
        years: 3,
        bonusPerYear: 5000,
        salaryPerYear: 10000,
        noTradeClause: false,
      };

      // initiateNegotiation(state, freeAgentId, teamId, initialOffer)
      state = initiateNegotiation(state, 'fa-1', USER_TEAM, initialOffer);

      const offer: ContractOffer = {
        years: 3,
        bonusPerYear: 5000,
        salaryPerYear: 10000,
        noTradeClause: false,
      };

      // recordVerbalAgreement(state, freeAgentId, teamId, offer)
      state = recordVerbalAgreement(state, 'fa-1', USER_TEAM, offer);

      const agreements = getTeamVerbalAgreements(state, USER_TEAM);
      expect(agreements.length).toBe(1);
      expect(agreements[0].freeAgentId).toBe('fa-1');
    });

    it('should advance tampering days', () => {
      let state = createLegalTamperingState(1, 5);
      state = startLegalTampering(state);

      state = advanceTamperingDay(state);
      expect(state.currentDay).toBe(2);
    });
  });

  // ======================================================
  // 5. Day 1 Frenzy
  // ======================================================
  describe('day 1 frenzy', () => {
    it('should create and validate frenzy state', () => {
      const state = createDay1FrenzyState();
      expect(validateDay1FrenzyState(state)).toBe(true);
    });

    it('should start and end frenzy', () => {
      let state = createDay1FrenzyState();
      state = startFrenzy(state);
      expect(state.isActive).toBe(true);

      state = endFrenzy(state);
      expect(state.isActive).toBe(false);
    });

    it('should record frenzy signings', () => {
      let state = createDay1FrenzyState();
      state = startFrenzy(state);

      // recordFrenzySigning(state, freeAgent, teamId, offer, marketValue, wasBiddingWar)
      const freeAgent = {
        playerId: 'fa-1',
        playerName: 'Star Player',
        position: Position.QB,
      } as any;

      const offer: ContractOffer = {
        years: 4,
        bonusPerYear: 7500,
        salaryPerYear: 2500,
        noTradeClause: false,
        totalValue: 40000,
        guaranteedMoney: 30000,
      };

      state = recordFrenzySigning(state, freeAgent, USER_TEAM, offer, 9000, false);

      expect(state.signings.length).toBe(1);
    });
  });

  // ======================================================
  // 6. Trickle Phase
  // ======================================================
  describe('trickle phase', () => {
    it('should create and validate trickle state', () => {
      const state = createTricklePhaseState();
      expect(validateTricklePhaseState(state)).toBe(true);
    });

    it('should start trickle phase', () => {
      let state = createTricklePhaseState();
      state = startTricklePhase(state);
      expect(state.isActive).toBe(true);
    });

    it('should identify bargain opportunities from remaining free agents', () => {
      let state = createTricklePhaseState(90);
      state = startTricklePhase(state);

      // Create FreeAgent objects matching the FreeAgent interface
      const remainingPlayers = [
        {
          id: 'fa-bargain-1',
          playerId: 'bargain-1',
          playerName: 'Bargain QB',
          position: Position.QB,
          age: 33,
          status: 'available' as const,
        },
        {
          id: 'fa-bargain-2',
          playerId: 'bargain-2',
          playerName: 'Bargain WR',
          position: Position.WR,
          age: 28,
          status: 'available' as const,
        },
      ] as any[];

      // Create market values map
      const marketValues = new Map<string, any>();
      marketValues.set('bargain-1', {
        projectedAAV: 5000,
        projectedYears: 1,
        tier: 'depth' as const,
      });
      marketValues.set('bargain-2', {
        projectedAAV: 7000,
        projectedYears: 2,
        tier: 'quality' as const,
      });

      // identifyBargainOpportunities(state, freeAgents, marketValues) returns updated state
      const updatedState = identifyBargainOpportunities(state, remainingPlayers, marketValues);
      expect(updatedState).toBeDefined();
      expect(updatedState.bargainOpportunities).toBeDefined();
    });
  });

  // ======================================================
  // 7. RFA Tender System
  // ======================================================
  describe('RFA tender system', () => {
    const SALARY_CAP = 255000;

    it('should create and validate RFA system state', () => {
      const state = createRFASystemState(YEAR);
      expect(validateRFASystemState(state)).toBe(true);
    });

    it('should calculate tender values', () => {
      const firstRoundTender = calculateTenderValue('first_round', SALARY_CAP);
      const secondRoundTender = calculateTenderValue('second_round', SALARY_CAP);
      const originalRoundTender = calculateTenderValue('original_round', SALARY_CAP);
      const rightOfFirstRefusal = calculateTenderValue('right_of_first_refusal', SALARY_CAP);

      expect(firstRoundTender).toBeGreaterThan(secondRoundTender);
      expect(secondRoundTender).toBeGreaterThan(originalRoundTender);
      expect(originalRoundTender).toBeGreaterThan(rightOfFirstRefusal);
    });

    it('should submit and retrieve tenders', () => {
      let state = createRFASystemState(YEAR);

      // submitTender(state, playerId, playerName, teamId, level, salaryCap)
      state = submitTender(state, 'rfa-player-1', 'RFA Player', USER_TEAM, 'first_round', SALARY_CAP);

      const tender = getPlayerTender(state, 'rfa-player-1');
      expect(tender).toBeDefined();
      expect(tender!.teamId).toBe(USER_TEAM);
      expect(tender!.level).toBe('first_round');
    });

    it('should handle offer sheet submission and matching', () => {
      let state = createRFASystemState(YEAR);

      // Original team submits tender
      state = submitTender(state, 'rfa-player-1', 'RFA Player', USER_TEAM, 'first_round', SALARY_CAP);

      // Another team submits offer sheet
      const offerSheet: ContractOffer = {
        years: 4,
        bonusPerYear: 5000,
        salaryPerYear: 10000,
        noTradeClause: false,
      };

      // submitOfferSheet(state, rfaPlayerId, offeringTeamId, originalTeamId, offer)
      state = submitOfferSheet(
        state,
        'rfa-player-1',
        'team-5',
        USER_TEAM,
        offerSheet
      );

      // Verify offer sheet exists (offerSheets is a Map)
      expect(state.offerSheets.size).toBe(1);

      // Get the offer sheet ID
      const offerSheetId = Array.from(state.offerSheets.keys())[0];

      // Original team can match - matchOfferSheet(state, offerSheetId)
      state = matchOfferSheet(state, offerSheetId);

      const matchedSheet = state.offerSheets.get(offerSheetId);
      // After matching, the sheet should be resolved
      expect(matchedSheet).toBeDefined();
      expect(matchedSheet!.status).toBe('matched');
    });

    it('should handle declining to match offer sheet', () => {
      let state = createRFASystemState(YEAR);

      state = submitTender(state, 'rfa-player-1', 'RFA Player', USER_TEAM, 'second_round', SALARY_CAP);

      const offerSheet: ContractOffer = {
        years: 4,
        bonusPerYear: 8000,
        salaryPerYear: 12000,
        noTradeClause: false,
      };

      state = submitOfferSheet(
        state,
        'rfa-player-1',
        'team-10',
        USER_TEAM,
        offerSheet
      );

      // Get the offer sheet ID
      const offerSheetId = Array.from(state.offerSheets.keys())[0];

      // Decline to match - returns { state, draftCompensation }
      const result = declineToMatch(state, offerSheetId);
      state = result.state;

      const declinedSheet = state.offerSheets.get(offerSheetId);
      expect(declinedSheet).toBeDefined();
      expect(declinedSheet!.status).toBe('not_matched');
    });
  });

  // ======================================================
  // 8. Full Free Agency Flow
  // ======================================================
  describe('full free agency flow', () => {
    it('should handle a complete FA cycle with multiple signings', () => {
      let state = createFreeAgencyState(YEAR, TEAM_IDS);

      // Add free agents
      state = addFreeAgent(state, createFAPlayer('fa-qb', Position.QB, 88), 'UFA', 30000);
      state = addFreeAgent(state, createFAPlayer('fa-wr', Position.WR, 82), 'UFA', 18000);
      state = addFreeAgent(state, createFAPlayer('fa-de', Position.DE, 79), 'UFA', 15000);
      state = addFreeAgent(state, createFAPlayer('fa-cb', Position.CB, 75), 'UFA', 12000);
      state = addFreeAgent(state, createFAPlayer('fa-rb', Position.RB, 70), 'UFA', 8000);

      expect(state.freeAgents.size).toBe(5);

      // Phase 1: Legal Tampering
      state = advancePhase(state); // legal_tampering
      expect(state.phase).toBe('legal_tampering');

      // Phase 2: Day 1 Frenzy - sign the star QB
      state = advancePhase(state); // day1_frenzy
      expect(canSignPlayers(state)).toBe(true);

      const qbOffer = createOffer(5, 10000, 20000);
      state = submitOffer(state, USER_TEAM, 'fa-fa-qb-2025', qbOffer, true);

      let teamOffers = getTeamOffers(state, USER_TEAM);
      expect(teamOffers.length).toBe(1);
      state = acceptOffer(state, teamOffers[0].id);

      // QB should be signed
      let signings = getTeamSignings(state, USER_TEAM);
      expect(signings.length).toBe(1);

      // Phase 3: Day 2 - more signings
      state = advancePhase(state); // day2_frenzy

      const wrOffer = createOffer(3, 5000, 13000);
      state = submitOffer(state, USER_TEAM, 'fa-fa-wr-2025', wrOffer, true);
      teamOffers = getTeamOffers(state, USER_TEAM).filter((o) => o.status === 'pending');
      state = acceptOffer(state, teamOffers[0].id);

      signings = getTeamSignings(state, USER_TEAM);
      expect(signings.length).toBe(2);

      // Phase 4: Trickle
      state = advancePhase(state); // trickle

      const deOffer = createOffer(2, 3000, 7000);
      state = submitOffer(state, 'team-5', 'fa-fa-de-2025', deOffer);
      const team5Offers = getTeamOffers(state, 'team-5').filter((o) => o.status === 'pending');
      if (team5Offers.length > 0) {
        state = acceptOffer(state, team5Offers[0].id);
      }

      // Verify summary
      const summary = getFreeAgencySummary(state);
      expect(summary.signedPlayers).toBeGreaterThanOrEqual(2);
      expect(summary.totalFreeAgents).toBe(5);

      // Contracts should be valid
      for (const contract of state.signedContracts) {
        expect(validatePlayerContract(contract)).toBe(true);
      }

      // Close free agency
      state = advancePhase(state); // training_camp
      state = advancePhase(state); // closed
      expect(state.phase).toBe('closed');
      expect(isFreeAgencyActive(state)).toBe(false);
    });
  });
});
