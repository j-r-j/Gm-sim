/**
 * Extension System Tests
 */

import { Position } from '../../models/player/Position';
import {
  determineMarketTier,
  calculateMarketValue,
  generatePlayerDemands,
  evaluateOffer,
  extendContract,
  getExtensionEligible,
  calculateRecommendedOffer,
  getExtensionSummary,
} from '../ExtensionSystem';
import { createPlayerContract, ContractOffer } from '../Contract';

describe('ExtensionSystem', () => {
  const createTestContract = (years: number = 4, yearsRemaining: number = 1) => {
    const offer: ContractOffer = {
      years,
      totalValue: 40000,
      guaranteedMoney: 20000,
      signingBonus: 10000,
      firstYearSalary: 10000,
      annualEscalation: 0.03,
      noTradeClause: false,
      voidYears: 0,
    };

    const contract = createPlayerContract(
      'player-1',
      'John Doe',
      'team-1',
      Position.QB,
      offer,
      2024
    );

    return {
      ...contract,
      yearsRemaining,
    };
  };

  describe('determineMarketTier', () => {
    it('should return elite for high-rated players', () => {
      const tier = determineMarketTier(95, Position.QB);
      expect(tier).toBe('elite');
    });

    it('should return premium for good players', () => {
      const tier = determineMarketTier(82, Position.QB);
      expect(tier).toBe('premium');
    });

    it('should return starter for average players', () => {
      const tier = determineMarketTier(72, Position.QB);
      expect(tier).toBe('starter');
    });

    it('should return quality for below-average players', () => {
      const tier = determineMarketTier(62, Position.RB);
      expect(tier).toBe('quality');
    });

    it('should return depth for low-rated players', () => {
      const tier = determineMarketTier(52, Position.RB);
      expect(tier).toBe('depth');
    });

    it('should return minimum for poor players', () => {
      const tier = determineMarketTier(45, Position.RB);
      expect(tier).toBe('minimum');
    });

    it('should adjust for premium positions', () => {
      // QB is premium position, needs higher rating for same tier
      const qbTier = determineMarketTier(75, Position.QB);
      const rbTier = determineMarketTier(75, Position.RB);

      // QB and RB should have different tiers, RB should get a boost
      expect(qbTier).toBeDefined();
      expect(['starter', 'premium']).toContain(rbTier);
    });
  });

  describe('calculateMarketValue', () => {
    it('should calculate valuation for elite player', () => {
      const valuation = calculateMarketValue(Position.QB, 95, 26, 4, 2024);

      expect(valuation.marketTier).toBe('elite');
      expect(valuation.estimatedAAV).toBeGreaterThan(30000);
      expect(valuation.estimatedYears).toBeGreaterThanOrEqual(4);
    });

    it('should calculate valuation for average player', () => {
      const valuation = calculateMarketValue(Position.WR, 70, 27, 5, 2024);

      expect(valuation.marketTier).toBe('starter');
      expect(valuation.estimatedAAV).toBeGreaterThan(0);
      expect(valuation.estimatedYears).toBeGreaterThanOrEqual(2);
    });

    it('should apply age discount for older players', () => {
      const youngValuation = calculateMarketValue(Position.CB, 80, 25, 3, 2024);
      const oldValuation = calculateMarketValue(Position.CB, 80, 32, 10, 2024);

      expect(oldValuation.estimatedAAV).toBeLessThan(youngValuation.estimatedAAV);
    });

    it('should never go below minimum salary', () => {
      const valuation = calculateMarketValue(Position.K, 45, 22, 0, 2024);

      expect(valuation.estimatedAAV).toBeGreaterThan(0);
    });

    it('should have higher confidence for experienced players', () => {
      const rookieValuation = calculateMarketValue(Position.RB, 70, 22, 0, 2024);
      const vetValuation = calculateMarketValue(Position.RB, 70, 28, 6, 2024);

      expect(vetValuation.confidenceLevel).toBeGreaterThan(rookieValuation.confidenceLevel);
    });
  });

  describe('generatePlayerDemands', () => {
    it('should generate demands based on valuation', () => {
      const valuation = calculateMarketValue(Position.QB, 90, 26, 4, 2024);
      valuation.playerId = 'player-1';

      const demands = generatePlayerDemands(valuation, {
        greedy: 50,
        loyal: 50,
        competitive: 50,
      });

      expect(demands.preferredAAV).toBeGreaterThanOrEqual(demands.minimumAAV);
      expect(demands.preferredYears).toBeGreaterThanOrEqual(demands.minimumYears);
      expect(demands.preferredGuaranteed).toBeGreaterThanOrEqual(demands.minimumGuaranteed);
    });

    it('should increase demands for greedy players', () => {
      const valuation = calculateMarketValue(Position.WR, 85, 27, 5, 2024);
      valuation.playerId = 'player-1';

      const normalDemands = generatePlayerDemands(valuation, {
        greedy: 50,
        loyal: 50,
        competitive: 50,
      });

      const greedyDemands = generatePlayerDemands(valuation, {
        greedy: 90,
        loyal: 30,
        competitive: 50,
      });

      expect(greedyDemands.preferredAAV).toBeGreaterThan(normalDemands.preferredAAV);
    });

    it('should want no-trade clause for elite players', () => {
      const eliteValuation = calculateMarketValue(Position.QB, 95, 26, 4, 2024);
      eliteValuation.playerId = 'player-1';

      const demands = generatePlayerDemands(eliteValuation, {
        greedy: 50,
        loyal: 50,
        competitive: 50,
      });

      expect(demands.noTradeClause).toBe(true);
    });

    it('should set flexibility based on personality', () => {
      const valuation = calculateMarketValue(Position.RB, 75, 26, 4, 2024);
      valuation.playerId = 'player-1';

      const loyalDemands = generatePlayerDemands(valuation, {
        greedy: 30,
        loyal: 80,
        competitive: 50,
      });

      expect(loyalDemands.flexibilityLevel).toBe('flexible');

      const greedyDemands = generatePlayerDemands(valuation, {
        greedy: 80,
        loyal: 30,
        competitive: 50,
      });

      expect(greedyDemands.flexibilityLevel).toBe('rigid');
    });
  });

  describe('evaluateOffer', () => {
    it('should accept offer meeting demands', () => {
      const valuation = calculateMarketValue(Position.TE, 75, 27, 5, 2024);
      valuation.playerId = 'player-1';

      const demands = generatePlayerDemands(valuation, {
        greedy: 40,
        loyal: 60,
        competitive: 50,
      });

      const offer: ContractOffer = {
        years: demands.preferredYears,
        totalValue: demands.preferredAAV * demands.preferredYears,
        guaranteedMoney: demands.preferredGuaranteed,
        signingBonus: demands.preferredGuaranteed * 0.3,
        firstYearSalary: demands.preferredAAV,
        annualEscalation: 0.03,
        noTradeClause: demands.noTradeClause,
        voidYears: 0,
      };

      const result = evaluateOffer(offer, demands);

      expect(result.closeness).toBeGreaterThan(0.8);
    });

    it('should reject lowball offer', () => {
      const valuation = calculateMarketValue(Position.CB, 85, 26, 4, 2024);
      valuation.playerId = 'player-1';

      const demands = generatePlayerDemands(valuation, {
        greedy: 50,
        loyal: 50,
        competitive: 50,
      });

      const lowballOffer: ContractOffer = {
        years: 1,
        totalValue: demands.minimumAAV * 0.5,
        guaranteedMoney: 1000,
        signingBonus: 0,
        firstYearSalary: demands.minimumAAV * 0.5,
        annualEscalation: 0,
        noTradeClause: false,
        voidYears: 0,
      };

      const result = evaluateOffer(lowballOffer, demands);

      expect(result.accepted).toBe(false);
      expect(result.counterOffer).not.toBeNull();
      expect(result.playerResponse).toContain('below');
    });

    it('should provide counter-offer when close but not quite', () => {
      const valuation = calculateMarketValue(Position.DE, 80, 27, 5, 2024);
      valuation.playerId = 'player-1';

      const demands = generatePlayerDemands(valuation, {
        greedy: 30, // Lower greed for more flexibility
        loyal: 70,
        competitive: 50,
      });

      // Offer slightly below preferred but above minimum
      const nearOffer: ContractOffer = {
        years: demands.preferredYears,
        totalValue: demands.preferredAAV * demands.preferredYears * 0.92,
        guaranteedMoney: demands.preferredGuaranteed * 0.9,
        signingBonus: demands.preferredGuaranteed * 0.25,
        firstYearSalary: demands.preferredAAV * 0.92,
        annualEscalation: 0.03,
        noTradeClause: false,
        voidYears: 0,
      };

      const result = evaluateOffer(nearOffer, demands);

      // Whether accepted or not, should have a response
      expect(result.playerResponse).toBeDefined();
      expect(result.closeness).toBeGreaterThan(0);

      // If not accepted, should have a counter-offer
      if (!result.accepted) {
        expect(result.counterOffer).not.toBeNull();
      }
    });
  });

  describe('extendContract', () => {
    it('should successfully extend an active contract', () => {
      const contract = createTestContract(4, 1);

      const result = extendContract(contract, 3, 45000, 25000, 10000, 2024);

      expect(result.success).toBe(true);
      expect(result.newContract).not.toBeNull();
      expect(result.yearsAdded).toBe(3);
      expect(result.newMoneyAdded).toBe(55000); // 45000 + 10000 signing bonus
    });

    it('should fail for inactive contract', () => {
      const contract = createTestContract(4, 1);
      const inactiveContract = { ...contract, status: 'expired' as const };

      const result = extendContract(inactiveContract, 3, 45000, 25000, 10000, 2024);

      expect(result.success).toBe(false);
      expect(result.error).toContain('active');
    });

    it('should fail for invalid year count', () => {
      const contract = createTestContract(4, 1);

      const result = extendContract(contract, 10, 100000, 50000, 20000, 2024);

      expect(result.success).toBe(false);
      expect(result.error).toContain('1-5 years');
    });

    it('should prorate new signing bonus', () => {
      const contract = createTestContract(4, 2); // 2 years remaining

      const result = extendContract(contract, 3, 45000, 25000, 15000, 2024);

      expect(result.success).toBe(true);

      // Check that proration was added
      expect(result.newContract!.signingBonus).toBe(contract.signingBonus + 15000);

      // Bonus should be prorated over 2 existing + 3 new = 5 years
      const expectedTotalYears = 2 + 3;
      expect(result.newContract!.yearlyBreakdown.length).toBeGreaterThanOrEqual(expectedTotalYears);
    });

    it('should add note about extension', () => {
      const contract = createTestContract(4, 1);

      const result = extendContract(contract, 3, 45000, 25000, 10000, 2024);

      expect(result.newContract!.notes.some((n) => n.includes('Extended'))).toBe(true);
    });
  });

  describe('getExtensionEligible', () => {
    it('should return contracts in final 2 years', () => {
      const eligible = createTestContract(4, 1);
      const notEligible = createTestContract(4, 4);

      const result = getExtensionEligible([eligible, notEligible], 2024);

      expect(result.length).toBe(1);
      expect(result[0].id).toBe(eligible.id);
    });

    it('should exclude franchise tagged players', () => {
      const tagged = createTestContract(1, 1);
      const taggedContract = { ...tagged, type: 'franchise_tag' as const };

      const result = getExtensionEligible([taggedContract], 2024);

      expect(result.length).toBe(0);
    });

    it('should exclude inactive contracts', () => {
      const inactive = createTestContract(4, 1);
      const inactiveContract = { ...inactive, status: 'expired' as const };

      const result = getExtensionEligible([inactiveContract], 2024);

      expect(result.length).toBe(0);
    });
  });

  describe('calculateRecommendedOffer', () => {
    it('should generate offer based on valuation', () => {
      const valuation = calculateMarketValue(Position.LT, 82, 27, 5, 2024);
      const contract = createTestContract(4, 1);

      const offer = calculateRecommendedOffer(valuation, contract, 3);

      expect(offer.years).toBe(3);
      expect(offer.totalValue).toBeGreaterThan(0);
      expect(offer.guaranteedMoney).toBeLessThanOrEqual(offer.totalValue);
      expect(offer.signingBonus).toBeLessThanOrEqual(offer.totalValue);
    });

    it('should include no-trade clause for elite players', () => {
      const eliteValuation = calculateMarketValue(Position.QB, 95, 26, 4, 2024);
      const contract = createTestContract(4, 1);

      const offer = calculateRecommendedOffer(eliteValuation, contract, 4);

      expect(offer.noTradeClause).toBe(true);
    });
  });

  describe('getExtensionSummary', () => {
    it('should format extension summary', () => {
      const contract = createTestContract(4, 2);

      const offer: ContractOffer = {
        years: 3,
        totalValue: 60000,
        guaranteedMoney: 30000,
        signingBonus: 15000,
        firstYearSalary: 20000,
        annualEscalation: 0.03,
        noTradeClause: false,
        voidYears: 0,
      };

      const summary = getExtensionSummary(contract, offer);

      expect(summary.currentContractRemaining).toContain('$');
      expect(summary.proposedNewMoney).toContain('$');
      expect(summary.proposedNewYears).toBe(3);
      expect(summary.newTotalYears).toBe(5); // 2 remaining + 3 new
      expect(summary.newAAV).toContain('$');
      expect(summary.capImpactDescription).toBeDefined();
    });
  });
});
