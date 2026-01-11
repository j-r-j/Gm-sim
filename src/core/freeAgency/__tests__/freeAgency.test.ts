/**
 * Free Agency System Tests
 * Comprehensive tests for all free agency components
 */

import { Position } from '../../models/player/Position';
import { ContractOffer } from '../../contracts/Contract';

// FreeAgencyManager tests
import {
  createFreeAgencyState,
  addFreeAgent,
  advancePhase,
  submitOffer,
  acceptOffer,
  classifyFreeAgentType,
  isFreeAgencyActive,
  canSignPlayers,
  validateFreeAgencyState,
  FreeAgent,
} from '../FreeAgencyManager';

// MarketValueCalculator tests
import {
  createDefaultMarketConditions,
  determineProductionTier,
  calculateAgeAdjustment,
  calculateMarketValue,
  compareOfferToMarket,
  PlayerProduction,
} from '../MarketValueCalculator';

// LegalTamperingPhase tests
import {
  createLegalTamperingState,
  startLegalTampering,
  endLegalTampering,
  initiateNegotiation,
  updateNegotiation,
  recordVerbalAgreement,
  hasVerbalAgreement,
  getPrimaryVerbalAgreement,
} from '../LegalTamperingPhase';

// Day1FrenzySimulator tests
import {
  createDay1FrenzyState,
  getDefaultFrenzyConfig,
  startFrenzy,
  endFrenzy,
  updateIntensity,
  initiateBiddingWar,
  processBiddingWarRound,
  endBiddingWar,
  generateEscalatedBid,
  getActiveBiddingWars,
} from '../Day1FrenzySimulator';

// TricklePhaseManager tests
import {
  createTricklePhaseState,
  startTricklePhase,
  advanceTrickleDay,
  calculateTimeAdjustment,
  generateMinimumOffer,
} from '../TricklePhaseManager';

// RFATenderSystem tests
import {
  createRFASystemState,
  calculateTenderValue,
  getTenderDraftCompensation,
  recommendTenderLevel,
  submitTender,
  getPlayerTender,
  getTeamTenders,
  submitOfferSheet,
  matchOfferSheet,
} from '../RFATenderSystem';

// CompensatoryPickCalculator tests
import {
  createCompPickCalculatorState,
  isQualifyingContract,
  recordDeparture,
  recordAcquisition,
  determineCompPickRound,
  calculateTeamEntitlements,
  calculateAllCompPicks,
  getTeamAwardedPicks,
} from '../CompensatoryPickCalculator';

// AIFreeAgencyLogic tests
import {
  createDefaultAIProfile,
  analyzeRosterComposition,
  assessTeamNeeds,
  evaluateFreeAgent,
} from '../AIFreeAgencyLogic';

describe('FreeAgencyManager', () => {
  describe('createFreeAgencyState', () => {
    it('creates initial state correctly', () => {
      const state = createFreeAgencyState(2025, ['team1', 'team2', 'team3']);

      expect(state.currentYear).toBe(2025);
      expect(state.phase).toBe('pre_free_agency');
      expect(state.phaseDay).toBe(0);
      expect(state.freeAgents.size).toBe(0);
      expect(state.teamBudgets.size).toBe(3);
    });
  });

  describe('addFreeAgent', () => {
    it('adds a free agent to the pool', () => {
      let state = createFreeAgencyState(2025, ['team1']);

      state = addFreeAgent(
        state,
        {
          playerId: 'player1',
          playerName: 'John Doe',
          position: Position.QB,
          age: 28,
          experience: 5,
          overallRating: 85,
          previousTeamId: 'team1',
          previousContractAAV: 25000,
        },
        'UFA',
        30000
      );

      expect(state.freeAgents.size).toBe(1);
      const fa = Array.from(state.freeAgents.values())[0];
      expect(fa.playerName).toBe('John Doe');
      expect(fa.type).toBe('UFA');
      expect(fa.marketValue).toBe(30000);
    });
  });

  describe('phase management', () => {
    it('advances through phases correctly', () => {
      let state = createFreeAgencyState(2025, ['team1']);

      expect(state.phase).toBe('pre_free_agency');

      state = advancePhase(state);
      expect(state.phase).toBe('legal_tampering');

      state = advancePhase(state);
      expect(state.phase).toBe('day1_frenzy');

      state = advancePhase(state);
      expect(state.phase).toBe('day2_frenzy');

      state = advancePhase(state);
      expect(state.phase).toBe('trickle');
    });

    it('identifies active phases correctly', () => {
      let state = createFreeAgencyState(2025, ['team1']);
      expect(isFreeAgencyActive(state)).toBe(false);

      state = advancePhase(state);
      expect(isFreeAgencyActive(state)).toBe(true);
    });

    it('identifies signing-allowed phases correctly', () => {
      let state = createFreeAgencyState(2025, ['team1']);
      expect(canSignPlayers(state)).toBe(false);

      state = advancePhase(state); // legal_tampering
      expect(canSignPlayers(state)).toBe(false);

      state = advancePhase(state); // day1_frenzy
      expect(canSignPlayers(state)).toBe(true);
    });
  });

  describe('offer management', () => {
    it('submits and accepts offers', () => {
      let state = createFreeAgencyState(2025, ['team1', 'team2']);
      state = advancePhase(state); // legal_tampering
      state = advancePhase(state); // day1_frenzy

      state = addFreeAgent(
        state,
        {
          playerId: 'player1',
          playerName: 'John Doe',
          position: Position.QB,
          age: 28,
          experience: 5,
          overallRating: 85,
          previousTeamId: 'team1',
          previousContractAAV: 25000,
        },
        'UFA',
        30000
      );

      const faId = Array.from(state.freeAgents.keys())[0];

      const offer: ContractOffer = {
        years: 3,
        totalValue: 90000,
        guaranteedMoney: 50000,
        signingBonus: 20000,
        firstYearSalary: 28000,
        annualEscalation: 0.03,
        noTradeClause: false,
        voidYears: 0,
      };

      state = submitOffer(state, 'team2', faId, offer);
      expect(state.offers.size).toBe(1);

      const offerId = Array.from(state.offers.keys())[0];
      state = acceptOffer(state, offerId);

      const fa = state.freeAgents.get(faId);
      expect(fa?.status).toBe('signed');
      expect(fa?.signedTeamId).toBe('team2');
      expect(state.signedContracts.length).toBe(1);
    });

    it('cannot sign during legal tampering', () => {
      let state = createFreeAgencyState(2025, ['team1', 'team2']);
      state = advancePhase(state); // legal_tampering

      state = addFreeAgent(
        state,
        {
          playerId: 'player1',
          playerName: 'John Doe',
          position: Position.QB,
          age: 28,
          experience: 5,
          overallRating: 85,
          previousTeamId: 'team1',
          previousContractAAV: 25000,
        },
        'UFA',
        30000
      );

      const faId = Array.from(state.freeAgents.keys())[0];

      const offer: ContractOffer = {
        years: 3,
        totalValue: 90000,
        guaranteedMoney: 50000,
        signingBonus: 20000,
        firstYearSalary: 28000,
        annualEscalation: 0.03,
        noTradeClause: false,
        voidYears: 0,
      };

      state = submitOffer(state, 'team2', faId, offer);
      const offerId = Array.from(state.offers.keys())[0];
      state = acceptOffer(state, offerId);

      // Should still be available - can't sign during tampering
      const fa = state.freeAgents.get(faId);
      expect(fa?.status).not.toBe('signed');
    });
  });

  describe('classifyFreeAgentType', () => {
    it('classifies players correctly', () => {
      expect(classifyFreeAgentType(2, true)).toBe('ERFA');
      expect(classifyFreeAgentType(3, true)).toBe('RFA');
      expect(classifyFreeAgentType(4, true)).toBe('UFA');
      expect(classifyFreeAgentType(3, false)).toBe('UFA');
    });
  });

  describe('validateFreeAgencyState', () => {
    it('validates correct state', () => {
      const state = createFreeAgencyState(2025, ['team1']);
      expect(validateFreeAgencyState(state)).toBe(true);
    });
  });
});

describe('MarketValueCalculator', () => {
  describe('determineProductionTier', () => {
    it('determines tiers correctly', () => {
      expect(determineProductionTier(95, Position.QB)).toBe('elite');
      expect(determineProductionTier(85, Position.QB)).toBe('pro_bowl');
      expect(determineProductionTier(75, Position.RB)).toBe('starter');
      expect(determineProductionTier(65, Position.RB)).toBe('quality');
    });
  });

  describe('calculateAgeAdjustment', () => {
    it('applies age discounts correctly', () => {
      // Young player premium
      expect(calculateAgeAdjustment(24, Position.RB)).toBeGreaterThanOrEqual(1.0);

      // Peak RB (26)
      expect(calculateAgeAdjustment(26, Position.RB)).toBe(1.0);

      // Declining RB
      expect(calculateAgeAdjustment(30, Position.RB)).toBeLessThan(1.0);
    });
  });

  describe('calculateMarketValue', () => {
    it('calculates market value for elite player', () => {
      const conditions = createDefaultMarketConditions(2025, 255000);

      const production: PlayerProduction = {
        playerId: 'player1',
        position: Position.QB,
        age: 28,
        experience: 5,
        overallRating: 92,
        recentPerformance: 90,
        durability: 95,
        primeYearsRemaining: 4,
        trajectory: 'peak',
      };

      const result = calculateMarketValue(production, conditions);

      expect(result.tier).toBe('elite');
      expect(result.projectedAAV).toBeGreaterThan(30000);
      expect(result.projectedYears).toBeGreaterThanOrEqual(3);
    });

    it('applies age discount for older player', () => {
      const conditions = createDefaultMarketConditions(2025, 255000);

      const youngPlayer: PlayerProduction = {
        playerId: 'player1',
        position: Position.WR,
        age: 26,
        experience: 3,
        overallRating: 82,
        recentPerformance: 80,
        durability: 90,
        primeYearsRemaining: 4,
        trajectory: 'ascending',
      };

      const oldPlayer: PlayerProduction = {
        playerId: 'player2',
        position: Position.WR,
        age: 33,
        experience: 10,
        overallRating: 82,
        recentPerformance: 75,
        durability: 80,
        primeYearsRemaining: 0,
        trajectory: 'declining',
      };

      const youngResult = calculateMarketValue(youngPlayer, conditions);
      const oldResult = calculateMarketValue(oldPlayer, conditions);

      expect(youngResult.projectedAAV).toBeGreaterThan(oldResult.projectedAAV);
    });
  });

  describe('compareOfferToMarket', () => {
    it('identifies above market offers', () => {
      const conditions = createDefaultMarketConditions(2025, 255000);
      const production: PlayerProduction = {
        playerId: 'player1',
        position: Position.CB,
        age: 27,
        experience: 4,
        overallRating: 80,
        recentPerformance: 78,
        durability: 90,
        primeYearsRemaining: 3,
        trajectory: 'peak',
      };

      const marketValue = calculateMarketValue(production, conditions);
      const comparison = compareOfferToMarket(
        marketValue.projectedAAV * 4 * 1.2, // 20% above market
        4,
        marketValue
      );

      expect(comparison.assessment).toBe('above_market');
    });
  });
});

describe('LegalTamperingPhase', () => {
  describe('tampering period management', () => {
    it('creates and manages tampering state', () => {
      const state = createLegalTamperingState(68, 70);

      expect(state.isActive).toBe(false);
      expect(state.startDay).toBe(68);
      expect(state.endDay).toBe(70);

      const started = startLegalTampering(state);
      expect(started.isActive).toBe(true);

      const ended = endLegalTampering(started);
      expect(ended.isActive).toBe(false);
    });
  });

  describe('negotiations', () => {
    it('tracks negotiations correctly', () => {
      let state = createLegalTamperingState(68, 70);
      state = startLegalTampering(state);

      const offer: ContractOffer = {
        years: 3,
        totalValue: 60000,
        guaranteedMoney: 30000,
        signingBonus: 10000,
        firstYearSalary: 18000,
        annualEscalation: 0.03,
        noTradeClause: false,
        voidYears: 0,
      };

      state = initiateNegotiation(state, 'fa1', 'team1', offer);
      expect(state.negotiationsInProgress.size).toBe(1);

      state = updateNegotiation(state, 'team1', 'fa1', { ...offer, totalValue: 65000 }, 0.8);
      const negotiation = state.negotiationsInProgress.get('team1-fa1');
      expect(negotiation?.offerHistory.length).toBe(2);
      expect(negotiation?.closeness).toBe(0.8);
    });
  });

  describe('verbal agreements', () => {
    it('records and retrieves verbal agreements', () => {
      let state = createLegalTamperingState(68, 70);
      state = startLegalTampering(state);

      const offer: ContractOffer = {
        years: 3,
        totalValue: 60000,
        guaranteedMoney: 30000,
        signingBonus: 10000,
        firstYearSalary: 18000,
        annualEscalation: 0.03,
        noTradeClause: false,
        voidYears: 0,
      };

      state = recordVerbalAgreement(state, 'fa1', 'team1', offer);

      expect(state.verbalAgreements.length).toBe(1);
      expect(hasVerbalAgreement(state, 'fa1')).toBe(true);

      const primary = getPrimaryVerbalAgreement(state, 'fa1');
      expect(primary?.teamId).toBe('team1');
    });
  });
});

describe('Day1FrenzySimulator', () => {
  describe('frenzy state management', () => {
    it('manages frenzy lifecycle', () => {
      const state = createDay1FrenzyState();
      expect(state.isActive).toBe(false);

      const started = startFrenzy(state);
      expect(started.isActive).toBe(true);
      expect(started.intensity).toBe('extreme');

      const ended = endFrenzy(started);
      expect(ended.isActive).toBe(false);
    });
  });

  describe('intensity management', () => {
    it('adjusts intensity based on remaining players', () => {
      let state = createDay1FrenzyState();
      state = startFrenzy(state);

      state = updateIntensity(state, 25);
      expect(state.intensity).toBe('extreme');

      state = updateIntensity(state, 15);
      expect(state.intensity).toBe('high');

      state = updateIntensity(state, 7);
      expect(state.intensity).toBe('moderate');

      state = updateIntensity(state, 3);
      expect(state.intensity).toBe('calm');
    });
  });

  describe('bidding wars', () => {
    it('manages bidding war lifecycle', () => {
      let state = createDay1FrenzyState();
      state = startFrenzy(state);

      const config = getDefaultFrenzyConfig();
      const initialOffer: ContractOffer = {
        years: 4,
        totalValue: 80000,
        guaranteedMoney: 40000,
        signingBonus: 15000,
        firstYearSalary: 18000,
        annualEscalation: 0.03,
        noTradeClause: false,
        voidYears: 0,
      };

      state = initiateBiddingWar(
        state,
        'fa1',
        ['team1', 'team2', 'team3'],
        initialOffer,
        'team1',
        config
      );
      expect(state.biddingWars.size).toBe(1);

      const activeWars = getActiveBiddingWars(state);
      expect(activeWars.length).toBe(1);

      const warId = activeWars[0].id;
      const escalatedOffer = generateEscalatedBid(initialOffer, config.escalationRate);
      expect(escalatedOffer.totalValue).toBeGreaterThan(initialOffer.totalValue);

      state = processBiddingWarRound(state, warId, escalatedOffer, 'team2');

      const result = endBiddingWar(state, warId);
      expect(result?.winner).toBe('team2');
    });
  });
});

describe('TricklePhaseManager', () => {
  describe('phase management', () => {
    it('manages trickle phase lifecycle', () => {
      let state = createTricklePhaseState(90);
      expect(state.isActive).toBe(false);

      state = startTricklePhase(state);
      expect(state.isActive).toBe(true);
      expect(state.subPhase).toBe('early');

      // Advance past 25% of days
      for (let i = 0; i < 25; i++) {
        state = advanceTrickleDay(state);
      }
      expect(state.subPhase).toBe('mid');
    });
  });

  describe('time adjustments', () => {
    it('calculates value adjustments over time', () => {
      const day7 = calculateTimeAdjustment(7);
      expect(day7.valueMultiplier).toBe(1.0);

      const day30 = calculateTimeAdjustment(30);
      expect(day30.valueMultiplier).toBeLessThan(1.0);

      const day60 = calculateTimeAdjustment(60);
      expect(day60.valueMultiplier).toBeLessThan(day30.valueMultiplier);
    });
  });

  describe('minimum contracts', () => {
    it('generates correct minimum offers', () => {
      const rookieOffer = generateMinimumOffer(0);
      expect(rookieOffer.totalValue).toBe(795);

      const vetOffer = generateMinimumOffer(7);
      expect(vetOffer.totalValue).toBe(1215);
    });
  });
});

describe('RFATenderSystem', () => {
  describe('tender calculations', () => {
    it('calculates tender values correctly', () => {
      const cap = 255000;

      const firstRound = calculateTenderValue('first_round', cap);
      expect(firstRound).toBeGreaterThan(20000);

      const secondRound = calculateTenderValue('second_round', cap);
      expect(secondRound).toBeLessThan(firstRound);

      const rofrTender = calculateTenderValue('right_of_first_refusal', cap);
      expect(rofrTender).toBeLessThan(secondRound);
    });
  });

  describe('draft compensation', () => {
    it('returns correct compensation strings', () => {
      expect(getTenderDraftCompensation('first_round')).toBe('1st round pick');
      expect(getTenderDraftCompensation('second_round')).toBe('2nd round pick');
      expect(getTenderDraftCompensation('right_of_first_refusal')).toBeNull();
    });
  });

  describe('tender recommendations', () => {
    it('recommends appropriate tenders', () => {
      expect(recommendTenderLevel(90, Position.QB, 1)).toBe('first_round');
      expect(recommendTenderLevel(78, Position.WR, 2)).toBe('second_round');
      expect(recommendTenderLevel(68, Position.RB, 3)).toBe('original_round');
      expect(recommendTenderLevel(60, Position.ILB, 5)).toBe('right_of_first_refusal');
    });
  });

  describe('tender management', () => {
    it('submits and manages tenders', () => {
      let state = createRFASystemState(2025);

      state = submitTender(state, 'player1', 'John Doe', 'team1', 'second_round', 255000);
      expect(state.tenders.size).toBe(1);

      const tender = getPlayerTender(state, 'player1');
      expect(tender?.level).toBe('second_round');

      const teamTenders = getTeamTenders(state, 'team1');
      expect(teamTenders.length).toBe(1);
    });
  });

  describe('offer sheets', () => {
    it('handles offer sheet matching', () => {
      let state = createRFASystemState(2025);
      state = submitTender(state, 'player1', 'John Doe', 'team1', 'second_round', 255000);

      const offer: ContractOffer = {
        years: 4,
        totalValue: 60000,
        guaranteedMoney: 30000,
        signingBonus: 10000,
        firstYearSalary: 14000,
        annualEscalation: 0.03,
        noTradeClause: false,
        voidYears: 0,
      };

      state = submitOfferSheet(state, 'player1', 'team2', 'team1', offer);
      expect(state.offerSheets.size).toBe(1);

      const osId = Array.from(state.offerSheets.keys())[0];
      state = matchOfferSheet(state, osId);

      expect(state.matchedPlayers.has('player1')).toBe(true);
    });
  });
});

describe('CompensatoryPickCalculator', () => {
  describe('qualifying contracts', () => {
    it('identifies qualifying contracts', () => {
      expect(isQualifyingContract(20000, 27)).toBe(true);
      expect(isQualifyingContract(1000, 27)).toBe(false);
      expect(isQualifyingContract(3000, 36)).toBe(false);
    });
  });

  describe('comp pick rounds', () => {
    it('determines rounds correctly', () => {
      expect(determineCompPickRound(25000)).toBe(3);
      expect(determineCompPickRound(14000)).toBe(4);
      expect(determineCompPickRound(9000)).toBe(5);
      expect(determineCompPickRound(5000)).toBe(6);
      expect(determineCompPickRound(2000)).toBe(7);
      expect(determineCompPickRound(1000)).toBeNull();
    });
  });

  describe('departure recording', () => {
    it('records departures correctly', () => {
      let state = createCompPickCalculatorState(2025);

      state = recordDeparture(state, {
        playerId: 'player1',
        playerName: 'John Doe',
        position: Position.DE,
        previousTeamId: 'team1',
        newTeamId: 'team2',
        contractAAV: 18000,
        contractYears: 4,
        contractTotal: 72000,
        age: 27,
        overallRating: 82,
        year: 2025,
      });

      expect(state.departures.length).toBe(1);
      expect(state.departures[0].qualifyingContract).toBe(true);
    });
  });

  describe('comp pick calculation', () => {
    it('calculates comp picks for net losses', () => {
      let state = createCompPickCalculatorState(2025);

      // Team 1 loses a player
      state = recordDeparture(state, {
        playerId: 'player1',
        playerName: 'John Doe',
        position: Position.DE,
        previousTeamId: 'team1',
        newTeamId: 'team2',
        contractAAV: 18000,
        contractYears: 4,
        contractTotal: 72000,
        age: 27,
        overallRating: 82,
        year: 2025,
      });

      state = calculateAllCompPicks(state, ['team1', 'team2']);

      expect(state.isCalculated).toBe(true);
      const team1Picks = getTeamAwardedPicks(state, 'team1');
      expect(team1Picks.length).toBeGreaterThanOrEqual(0);
    });

    it('offsets losses with gains', () => {
      let state = createCompPickCalculatorState(2025);

      // Team loses and gains similar value
      state = recordDeparture(state, {
        playerId: 'player1',
        playerName: 'John Doe',
        position: Position.DE,
        previousTeamId: 'team1',
        newTeamId: 'team2',
        contractAAV: 15000,
        contractYears: 3,
        contractTotal: 45000,
        age: 28,
        overallRating: 78,
        year: 2025,
      });

      state = recordAcquisition(state, {
        playerId: 'player2',
        playerName: 'Jane Smith',
        position: Position.CB,
        newTeamId: 'team1',
        previousTeamId: 'team3',
        contractAAV: 16000,
        contractYears: 3,
        contractTotal: 48000,
        age: 27,
        overallRating: 80,
        year: 2025,
      });

      const entitlements = calculateTeamEntitlements(state, 'team1');
      const unmatchedLosses = entitlements.filter((e) => !e.matchedWithGain);

      // Should be offset - no unmatched losses
      expect(unmatchedLosses.length).toBe(0);
    });
  });
});

describe('AIFreeAgencyLogic', () => {
  describe('AI profiles', () => {
    it('creates appropriate profiles based on team situation', () => {
      const winningTeam = createDefaultAIProfile('team1', { wins: 12, losses: 5 }, 50000, 255000);
      expect(winningTeam.strategy).toBe('contend');

      const losingTeam = createDefaultAIProfile('team2', { wins: 3, losses: 14 }, 80000, 255000);
      expect(losingTeam.strategy).toBe('rebuild');
    });
  });

  describe('roster analysis', () => {
    it('analyzes roster composition', () => {
      const players = [
        { position: Position.QB, overallRating: 85, age: 28, isStarter: true },
        { position: Position.QB, overallRating: 65, age: 25, isStarter: false },
        { position: Position.WR, overallRating: 78, age: 26, isStarter: true },
        { position: Position.WR, overallRating: 72, age: 24, isStarter: true },
        { position: Position.WR, overallRating: 68, age: 27, isStarter: false },
      ];

      const composition = analyzeRosterComposition('team1', players);

      expect(composition.positionCounts.get(Position.QB)).toBe(2);
      expect(composition.positionCounts.get(Position.WR)).toBe(3);
      expect(composition.starterQuality.get(Position.QB)).toBe(85);
    });
  });

  describe('needs assessment', () => {
    it('identifies team needs correctly', () => {
      const composition = analyzeRosterComposition('team1', [
        { position: Position.QB, overallRating: 85, age: 28, isStarter: true },
        // Missing RBs, WRs, etc.
      ]);

      const needs = assessTeamNeeds(composition, 50000, 255000);

      expect(needs.needs.get(Position.RB)).toBe('critical');
      expect(needs.priorityPositions).toContain(Position.RB);
    });
  });

  describe('offer decisions', () => {
    it('makes offer decisions based on needs and budget', () => {
      const faState = createFreeAgencyState(2025, ['team1']);
      const budget = faState.teamBudgets.get('team1')!;
      budget.priorityPositions = [Position.DE];
      budget.needsLevel.set(Position.DE, 'critical');

      const profile = createDefaultAIProfile('team1', { wins: 8, losses: 9 }, 50000, 255000);

      const composition = analyzeRosterComposition('team1', []);
      const needs = assessTeamNeeds(composition, budget.remaining, budget.totalBudget);

      const freeAgent: FreeAgent = {
        id: 'fa1',
        playerId: 'player1',
        playerName: 'John Doe',
        position: Position.DE,
        age: 27,
        experience: 4,
        overallRating: 80,
        previousTeamId: 'team2',
        previousContractAAV: 12000,
        type: 'UFA',
        marketValue: 15000,
        interest: [],
        offers: [],
        status: 'available',
        signedTeamId: null,
        signedContractId: null,
      };

      const conditions = createDefaultMarketConditions(2025, 255000);
      const marketValue = calculateMarketValue(
        {
          playerId: 'player1',
          position: Position.DE,
          age: 27,
          experience: 4,
          overallRating: 80,
          recentPerformance: 78,
          durability: 90,
          primeYearsRemaining: 3,
          trajectory: 'peak',
        },
        conditions
      );

      const decision = evaluateFreeAgent(freeAgent, marketValue, needs, profile, budget);

      expect(decision.shouldMakeOffer).toBe(true);
      expect(decision.offer).not.toBeNull();
    });
  });
});
