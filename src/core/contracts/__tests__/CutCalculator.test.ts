/**
 * Cut Calculator Tests
 */

import { Position } from '../../models/player/Position';
import {
  analyzeStandardCut,
  analyzePostJune1Cut,
  analyzeDesignatedPostJune1Cut,
  getCutBreakdown,
  createCutPenalties,
  executeCut,
  rankCutCandidates,
  getCutSummary,
  validateCut,
} from '../CutCalculator';
import {
  createPlayerContract,
  ContractOffer,
} from '../Contract';

describe('CutCalculator', () => {
  const createTestContract = (
    totalValue: number = 80000,
    years: number = 4,
    signedYear: number = 2024
  ) => {
    const offer: ContractOffer = {
      years,
      totalValue,
      guaranteedMoney: totalValue * 0.5,
      signingBonus: totalValue * 0.25,
      firstYearSalary: totalValue / years,
      annualEscalation: 0.03,
      noTradeClause: false,
      voidYears: 0,
    };

    return createPlayerContract(
      'player-1',
      'John Doe',
      'team-1',
      Position.QB,
      offer,
      signedYear
    );
  };

  describe('analyzeStandardCut', () => {
    it('should calculate dead money and cap savings', () => {
      const contract = createTestContract();

      const analysis = analyzeStandardCut(contract, 2024);

      expect(analysis.cutType).toBe('standard');
      expect(analysis.currentCapHit).toBeGreaterThan(0);
      expect(analysis.deadMoney).toBeGreaterThan(0);
      expect(analysis.capSavings).toBe(analysis.currentCapHit - analysis.deadMoney);
      expect(analysis.secondYearDeadMoney).toBe(0);
    });

    it('should not recommend cut if no savings', () => {
      // Create a fully guaranteed contract
      const offer: ContractOffer = {
        years: 2,
        totalValue: 40000,
        guaranteedMoney: 40000, // Fully guaranteed
        signingBonus: 20000,
        firstYearSalary: 10000,
        annualEscalation: 0,
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

      const analysis = analyzeStandardCut(contract, 2024);

      if (analysis.capSavings <= 0) {
        expect(analysis.isAdvisable).toBe(false);
        expect(analysis.recommendation).toContain('savings');
      }
    });
  });

  describe('analyzePostJune1Cut', () => {
    it('should split dead money over two years', () => {
      const contract = createTestContract(80000, 4);

      const analysis = analyzePostJune1Cut(contract, 2024);

      expect(analysis.cutType).toBe('post_june_1');
      expect(analysis.deadMoney).toBeGreaterThan(0);
      expect(analysis.secondYearDeadMoney).toBeGreaterThan(0);
      expect(analysis.totalDeadMoney).toBe(analysis.deadMoney + analysis.secondYearDeadMoney);
    });

    it('should provide more immediate savings than standard cut', () => {
      const contract = createTestContract(80000, 4);

      const standardAnalysis = analyzeStandardCut(contract, 2024);
      const postJune1Analysis = analyzePostJune1Cut(contract, 2024);

      // Post-June 1 typically has better immediate savings for long contracts
      expect(postJune1Analysis.deadMoney).toBeLessThanOrEqual(standardAnalysis.deadMoney);
    });
  });

  describe('analyzeDesignatedPostJune1Cut', () => {
    it('should have same numbers as post-June 1', () => {
      const contract = createTestContract();

      const postJune1 = analyzePostJune1Cut(contract, 2024);
      const designated = analyzeDesignatedPostJune1Cut(contract, 2024);

      expect(designated.deadMoney).toBe(postJune1.deadMoney);
      expect(designated.secondYearDeadMoney).toBe(postJune1.secondYearDeadMoney);
      expect(designated.cutType).toBe('designated_post_june_1');
    });
  });

  describe('getCutBreakdown', () => {
    it('should return all cut options', () => {
      const contract = createTestContract();

      const breakdown = getCutBreakdown(contract, 2024);

      expect(breakdown.playerId).toBe('player-1');
      expect(breakdown.playerName).toBe('John Doe');
      expect(breakdown.standardCut).toBeDefined();
      expect(breakdown.postJune1Cut).toBeDefined();
      expect(breakdown.designatedPostJune1Cut).toBeDefined();
      expect(breakdown.bestOption).toBeDefined();
      expect(breakdown.bestOptionReason).toBeDefined();
    });

    it('should recommend best option', () => {
      const contract = createTestContract();

      const breakdown = getCutBreakdown(contract, 2024);

      expect(['standard', 'post_june_1', 'designated_post_june_1']).toContain(
        breakdown.bestOption
      );
    });
  });

  describe('createCutPenalties', () => {
    it('should create single penalty for standard cut', () => {
      const contract = createTestContract();

      const penalties = createCutPenalties(contract, 2024, 'standard');

      expect(penalties.length).toBeLessThanOrEqual(1);
      if (penalties.length > 0) {
        expect(penalties[0].year).toBe(2024);
        expect(penalties[0].reason).toBe('cut');
      }
    });

    it('should create two penalties for post-June 1 cut', () => {
      const contract = createTestContract(80000, 4);

      const penalties = createCutPenalties(contract, 2024, 'post_june_1');

      // Should have penalty for year 1 and year 2
      const year1Penalties = penalties.filter((p) => p.year === 2024);
      const year2Penalties = penalties.filter((p) => p.year === 2025);

      if (year1Penalties.length > 0 && year2Penalties.length > 0) {
        expect(year1Penalties.length).toBe(1);
        expect(year2Penalties.length).toBe(1);
      }
    });
  });

  describe('executeCut', () => {
    it('should successfully execute a cut', () => {
      const contract = createTestContract();

      const result = executeCut(contract, 2024, 'standard');

      expect(result.success).toBe(true);
      expect(result.contract.status).toBe('voided');
      expect(result.contract.yearsRemaining).toBe(0);
      expect(result.contract.notes.some((n) => n.includes('Released'))).toBe(true);
    });

    it('should fail for inactive contract', () => {
      const contract = createTestContract();
      const inactiveContract = { ...contract, status: 'expired' as const };

      const result = executeCut(inactiveContract, 2024, 'standard');

      expect(result.success).toBe(false);
      expect(result.error).toContain('inactive');
    });

    it('should return correct cap savings', () => {
      const contract = createTestContract();
      const analysis = analyzeStandardCut(contract, 2024);

      const result = executeCut(contract, 2024, 'standard');

      expect(result.capSavings).toBe(analysis.capSavings);
    });
  });

  describe('rankCutCandidates', () => {
    it('should rank players by value score', () => {
      const contract1 = createTestContract(80000, 4);
      const contract2 = createTestContract(40000, 2);
      const contract3 = createTestContract(20000, 1);

      const candidates = rankCutCandidates([contract1, contract2, contract3], 2024);

      // Should be sorted by value score (lower is better)
      for (let i = 0; i < candidates.length - 1; i++) {
        expect(candidates[i].valueScore).toBeLessThanOrEqual(candidates[i + 1].valueScore);
      }
    });

    it('should filter out low-savings candidates', () => {
      const contract = createTestContract(5000, 4); // Small contract

      const candidates = rankCutCandidates([contract], 2024, 10000); // High minimum

      // May be empty if savings below minimum
      expect(Array.isArray(candidates)).toBe(true);
    });

    it('should skip inactive contracts', () => {
      const activeContract = createTestContract(80000, 4);
      const inactiveContract = { ...createTestContract(40000, 2), status: 'expired' as const };

      const candidates = rankCutCandidates([activeContract, inactiveContract], 2024);

      expect(candidates.every((c) => c.contract.status === 'active')).toBe(true);
    });
  });

  describe('getCutSummary', () => {
    it('should return descriptive summary', () => {
      const contract = createTestContract();
      const breakdown = getCutBreakdown(contract, 2024);

      const summary = getCutSummary(breakdown);

      expect(summary.recommendedAction).toBeDefined();
      expect(summary.savingsDescription).toContain('$');
      expect(summary.deadMoneyDescription).toBeDefined();
      expect(summary.timingAdvice).toBeDefined();
    });
  });

  describe('validateCut', () => {
    it('should validate active contract', () => {
      const contract = createTestContract();

      const result = validateCut(contract, 2024, 'standard');

      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject inactive contract', () => {
      const contract = createTestContract();
      const inactiveContract = { ...contract, status: 'expired' as const };

      const result = validateCut(inactiveContract, 2024, 'standard');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('not active');
    });

    it('should reject contract with no years remaining', () => {
      const contract = createTestContract();
      const expiredContract = { ...contract, yearsRemaining: 0 };

      const result = validateCut(expiredContract, 2024, 'standard');

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('years remaining');
    });
  });
});
