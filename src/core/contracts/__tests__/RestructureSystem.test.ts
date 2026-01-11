/**
 * Restructure System Tests
 */

import { Position } from '../../models/player/Position';
import {
  getMaxRestructureAmount,
  calculateProration,
  previewRestructure,
  restructureContract,
  executePayCut,
  getRestructureOptions,
  projectRestructureImpact,
} from '../RestructureSystem';
import { createPlayerContract, ContractOffer, getCapHitForYear } from '../Contract';

describe('RestructureSystem', () => {
  const createTestContract = (baseSalary: number = 20000, years: number = 4) => {
    const offer: ContractOffer = {
      years,
      totalValue: baseSalary * years,
      guaranteedMoney: baseSalary * years * 0.5,
      signingBonus: baseSalary * years * 0.2,
      firstYearSalary: baseSalary,
      annualEscalation: 0.05,
      noTradeClause: false,
      voidYears: 0,
    };

    return createPlayerContract('player-1', 'John Doe', 'team-1', Position.QB, offer, 2024);
  };

  describe('getMaxRestructureAmount', () => {
    it('should return restructurable salary above veteran minimum', () => {
      const contract = createTestContract(20000); // $20M base salary

      const maxRestructure = getMaxRestructureAmount(contract, 2024);

      // Should be base salary minus vet minimum (~$1.2M)
      expect(maxRestructure).toBeLessThan(20000);
      expect(maxRestructure).toBeGreaterThan(15000);
    });

    it('should return 0 for void years', () => {
      const contract = createTestContract(20000);
      // Year 2028 would be after the contract ends
      const maxRestructure = getMaxRestructureAmount(contract, 2028);

      expect(maxRestructure).toBe(0);
    });

    it('should return 0 for minimum salary contract', () => {
      const contract = createTestContract(1215); // Vet minimum

      const maxRestructure = getMaxRestructureAmount(contract, 2024);

      expect(maxRestructure).toBe(0);
    });
  });

  describe('calculateProration', () => {
    it('should evenly distribute amount over years', () => {
      const proration = calculateProration(10000, 4);

      expect(proration).toHaveLength(4);
      expect(proration[0]).toBe(2500);
      expect(proration[1]).toBe(2500);
      expect(proration[2]).toBe(2500);
      expect(proration[3]).toBe(2500);
    });

    it('should include void years in proration', () => {
      const proration = calculateProration(10000, 2, 2); // 2 real + 2 void

      expect(proration).toHaveLength(4);
      expect(proration[0]).toBe(2500);
    });

    it('should handle rounding', () => {
      const proration = calculateProration(10000, 3);

      expect(proration).toHaveLength(3);
      // Each should be approximately 3333
      expect(proration[0]).toBeCloseTo(3333, 0);
    });
  });

  describe('previewRestructure', () => {
    it('should calculate current year savings', () => {
      const contract = createTestContract(20000);

      const preview = previewRestructure(contract, 2024, 10000);

      expect(preview.capSavings).toBeGreaterThan(0);
      expect(preview.newCapHit).toBeLessThan(preview.originalCapHit);
    });

    it('should show future year impact', () => {
      const contract = createTestContract(20000);

      const preview = previewRestructure(contract, 2024, 10000);

      expect(preview.futureImpact.length).toBeGreaterThan(0);
      expect(preview.futureImpact[0].additionalCapHit).toBeGreaterThan(0);
    });

    it('should provide recommendation', () => {
      const contract = createTestContract(20000);

      const preview = previewRestructure(contract, 2024, 10000);

      expect(preview.recommendation).toBeDefined();
      expect(preview.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe('restructureContract', () => {
    it('should successfully restructure a valid contract', () => {
      const contract = createTestContract(20000);
      const originalCapHit = getCapHitForYear(contract, 2024);

      const result = restructureContract(contract, 2024, 10000);

      expect(result.success).toBe(true);
      expect(result.newContract).not.toBeNull();
      expect(result.details).not.toBeNull();
      expect(result.details!.currentYearSavings).toBeGreaterThan(0);

      // New cap hit should be lower
      const newCapHit = getCapHitForYear(result.newContract!, 2024);
      expect(newCapHit).toBeLessThan(originalCapHit);
    });

    it('should fail if restructure amount exceeds maximum', () => {
      const contract = createTestContract(20000);
      const maxAmount = getMaxRestructureAmount(contract, 2024);

      const result = restructureContract(contract, 2024, maxAmount + 10000);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Maximum');
    });

    it('should fail for inactive contracts', () => {
      const contract = createTestContract(20000);
      const inactiveContract = { ...contract, status: 'expired' as const };

      const result = restructureContract(inactiveContract, 2024, 5000);

      expect(result.success).toBe(false);
      expect(result.error).toContain('active');
    });

    it('should add void years when specified', () => {
      const contract = createTestContract(20000);

      const result = restructureContract(contract, 2024, 10000, 2);

      expect(result.success).toBe(true);
      expect(result.newContract!.voidYears).toBe(2);
      expect(result.newContract!.yearlyBreakdown.length).toBe(6); // 4 original + 2 void
    });

    it('should add note about restructure', () => {
      const contract = createTestContract(20000);

      const result = restructureContract(contract, 2024, 10000);

      expect(result.newContract!.notes.some((n) => n.includes('Restructured'))).toBe(true);
    });
  });

  describe('executePayCut', () => {
    it('should reduce salary for current and future years', () => {
      const contract = createTestContract(20000);
      const originalCapHit = getCapHitForYear(contract, 2024);

      const result = executePayCut(contract, 2024, 15000);

      expect(result.success).toBe(true);
      expect(result.details!.payCutAmount).toBe(5000);

      const newCapHit = getCapHitForYear(result.newContract!, 2024);
      expect(newCapHit).toBeLessThan(originalCapHit);
    });

    it('should fail if new salary is higher', () => {
      const contract = createTestContract(20000);

      const result = executePayCut(contract, 2024, 25000);

      expect(result.success).toBe(false);
      expect(result.error).toContain('less than');
    });

    it('should void guarantees on pay cut', () => {
      const contract = createTestContract(20000);

      const result = executePayCut(contract, 2024, 10000);

      // Future years should no longer be guaranteed
      const futureYears = result.newContract!.yearlyBreakdown.filter(
        (y) => y.year > 2024 && !y.isVoidYear
      );
      expect(futureYears.every((y) => !y.isGuaranteed)).toBe(true);
    });
  });

  describe('getRestructureOptions', () => {
    it('should return options for valid contract', () => {
      const contract = createTestContract(20000);

      const options = getRestructureOptions(contract, 2024);

      expect(options.canRestructure).toBe(true);
      expect(options.maxConversion).toBeGreaterThan(0);
      expect(options.suggestedConversions.length).toBeGreaterThan(0);
    });

    it('should not allow restructure for inactive contract', () => {
      const contract = createTestContract(20000);
      const inactiveContract = { ...contract, status: 'expired' as const };

      const options = getRestructureOptions(inactiveContract, 2024);

      expect(options.canRestructure).toBe(false);
      expect(options.reason).toContain('not active');
    });

    it('should suggest multiple conversion amounts', () => {
      const contract = createTestContract(20000);

      const options = getRestructureOptions(contract, 2024);

      // Should suggest 25%, 50%, 75%, 100%
      expect(options.suggestedConversions.length).toBe(4);
      expect(options.suggestedConversions[3]).toBe(options.maxConversion);
    });
  });

  describe('projectRestructureImpact', () => {
    it('should project year-by-year impact', () => {
      const contract = createTestContract(20000);

      const impact = projectRestructureImpact(contract, 2024, 10000);

      expect(impact.yearByYear.length).toBeGreaterThan(0);
      expect(impact.yearByYear[0].year).toBe(2024);
    });

    it('should calculate total savings and costs', () => {
      const contract = createTestContract(20000);

      const impact = projectRestructureImpact(contract, 2024, 10000);

      expect(impact.totalSavings).toBeGreaterThan(0);
      expect(impact.totalAdditionalCost).toBeGreaterThan(0);
    });

    it('should calculate dead money risk', () => {
      const contract = createTestContract(20000);

      const impact = projectRestructureImpact(contract, 2024, 10000);

      // Dead money risk equals amount converted
      expect(impact.deadMoneyRisk).toBe(10000);
    });
  });
});
