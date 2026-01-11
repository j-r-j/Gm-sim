import {
  generateRookieContract,
  exerciseFifthYearOption,
  declineFifthYearOption,
  getCapHitForYear,
  getRemainingYears,
  getRemainingGuaranteed,
  getDeadCap,
  getContractSummary,
  validateRookieContract,
  getSlotValues,
  calculateYearlyBreakdown,
} from '../RookieContractGenerator';
import { createDraftPick, assignOverallPick, DraftPick } from '../../models/league/DraftPick';

describe('RookieContractGenerator', () => {
  // Helper to create test picks
  function createTestPick(round: number, overallPick: number, year: number = 2025): DraftPick {
    const pick = createDraftPick(`pick-${round}-${overallPick}`, year, round, 'team-1');
    return assignOverallPick(pick, overallPick);
  }

  describe('getSlotValues', () => {
    it('should return higher values for earlier picks', () => {
      const pick1 = getSlotValues(1, 1);
      const pick32 = getSlotValues(32, 1);
      const pick100 = getSlotValues(100, 4);

      expect(pick1.totalValue).toBeGreaterThan(pick32.totalValue);
      expect(pick32.totalValue).toBeGreaterThan(pick100.totalValue);
    });

    it('should return values for first round picks', () => {
      for (let pick = 1; pick <= 32; pick++) {
        const values = getSlotValues(pick, 1);
        expect(values.totalValue).toBeGreaterThan(0);
        expect(values.signingBonus).toBeGreaterThan(0);
      }
    });

    it('should return values for later rounds', () => {
      const round3 = getSlotValues(70, 3);
      const round7 = getSlotValues(220, 7);

      expect(round3.totalValue).toBeGreaterThan(0);
      expect(round7.totalValue).toBeGreaterThan(0);
    });
  });

  describe('calculateYearlyBreakdown', () => {
    it('should create 4-year breakdown', () => {
      const breakdown = calculateYearlyBreakdown(10000, 2000, 4, 1, 2025);
      expect(breakdown.length).toBe(4);
    });

    it('should have escalating salaries', () => {
      const breakdown = calculateYearlyBreakdown(10000, 2000, 4, 1, 2025);

      for (let i = 1; i < breakdown.length; i++) {
        expect(breakdown[i].baseSalary).toBeGreaterThan(breakdown[i - 1].baseSalary);
      }
    });

    it('should prorate signing bonus', () => {
      const signingBonus = 4000;
      const years = 4;
      const breakdown = calculateYearlyBreakdown(10000, signingBonus, years, 1, 2025);

      const expectedProration = signingBonus / years;
      expect(breakdown[0].prorationedBonus).toBe(expectedProration);
    });

    it('should set guarantees for round 1-2', () => {
      const round1 = calculateYearlyBreakdown(10000, 2000, 4, 1, 2025);
      const round2 = calculateYearlyBreakdown(8000, 1500, 4, 2, 2025);

      // All years guaranteed for rounds 1-2
      expect(round1.every((y) => y.isGuaranteed)).toBe(true);
      expect(round2.every((y) => y.isGuaranteed)).toBe(true);
    });

    it('should have partial guarantees for later rounds', () => {
      const round5 = calculateYearlyBreakdown(4000, 200, 4, 5, 2025);

      // Year 1 guaranteed
      expect(round5[0].isGuaranteed).toBe(true);
      // Later years not guaranteed
      expect(round5[3].isGuaranteed).toBe(false);
    });
  });

  describe('generateRookieContract', () => {
    it('should generate 4-year contract', () => {
      const pick = createTestPick(1, 10);
      const contract = generateRookieContract(pick, 'player-1');

      expect(contract.years).toBe(4);
      expect(contract.yearlyBreakdown.length).toBe(4);
    });

    it('should set 5th year option for round 1', () => {
      const firstRound = createTestPick(1, 15);
      const secondRound = createTestPick(2, 45);

      const firstContract = generateRookieContract(firstRound, 'player-1');
      const secondContract = generateRookieContract(secondRound, 'player-2');

      expect(firstContract.hasFifthYearOption).toBe(true);
      expect(firstContract.fifthYearOption).not.toBeNull();
      expect(secondContract.hasFifthYearOption).toBe(false);
      expect(secondContract.fifthYearOption).toBeNull();
    });

    it('should have higher values for earlier picks', () => {
      const pick1 = createTestPick(1, 1);
      const pick32 = createTestPick(1, 32);

      const contract1 = generateRookieContract(pick1, 'player-1');
      const contract32 = generateRookieContract(pick32, 'player-32');

      expect(contract1.totalValue).toBeGreaterThan(contract32.totalValue);
      expect(contract1.signingBonus).toBeGreaterThan(contract32.signingBonus);
    });

    it('should have correct IDs and metadata', () => {
      const pick = createTestPick(2, 50);
      const contract = generateRookieContract(pick, 'player-50');

      expect(contract.playerId).toBe('player-50');
      expect(contract.teamId).toBe('team-1');
      expect(contract.draftYear).toBe(2025);
      expect(contract.overallPick).toBe(50);
      expect(contract.round).toBe(2);
    });

    it('should throw for pick without overall number', () => {
      const pick = createDraftPick('pick-future', 2026, 1, 'team-1');
      expect(() => generateRookieContract(pick, 'player-1')).toThrow();
    });
  });

  describe('exerciseFifthYearOption', () => {
    it('should extend contract to 5 years', () => {
      const pick = createTestPick(1, 10);
      let contract = generateRookieContract(pick, 'player-1');

      contract = exerciseFifthYearOption(contract);

      expect(contract.years).toBe(5);
      expect(contract.yearlyBreakdown.length).toBe(5);
    });

    it('should mark option as exercised', () => {
      const pick = createTestPick(1, 10);
      let contract = generateRookieContract(pick, 'player-1');

      contract = exerciseFifthYearOption(contract);

      expect(contract.fifthYearOption?.exercised).toBe(true);
    });

    it('should add to total value and guaranteed', () => {
      const pick = createTestPick(1, 10);
      let contract = generateRookieContract(pick, 'player-1');
      const originalValue = contract.totalValue;
      const originalGuaranteed = contract.guaranteed;

      contract = exerciseFifthYearOption(contract);

      expect(contract.totalValue).toBeGreaterThan(originalValue);
      expect(contract.guaranteed).toBeGreaterThan(originalGuaranteed);
    });

    it('should throw if no option exists', () => {
      const pick = createTestPick(2, 50);
      const contract = generateRookieContract(pick, 'player-1');

      expect(() => exerciseFifthYearOption(contract)).toThrow();
    });

    it('should throw if already exercised', () => {
      const pick = createTestPick(1, 10);
      let contract = generateRookieContract(pick, 'player-1');
      contract = exerciseFifthYearOption(contract);

      expect(() => exerciseFifthYearOption(contract)).toThrow();
    });
  });

  describe('declineFifthYearOption', () => {
    it('should mark 5th year option as declined', () => {
      const pick = createTestPick(1, 10);
      let contract = generateRookieContract(pick, 'player-1');

      contract = declineFifthYearOption(contract);

      expect(contract.hasFifthYearOption).toBe(true);
      expect(contract.fifthYearOption).not.toBeNull();
      expect(contract.fifthYearOption?.declined).toBe(true);
    });

    it('should not change contract length', () => {
      const pick = createTestPick(1, 10);
      let contract = generateRookieContract(pick, 'player-1');

      contract = declineFifthYearOption(contract);

      expect(contract.years).toBe(4);
    });

    it('should throw if already declined', () => {
      const pick = createTestPick(1, 10);
      let contract = generateRookieContract(pick, 'player-1');
      contract = declineFifthYearOption(contract);

      expect(() => declineFifthYearOption(contract)).toThrow();
    });
  });

  describe('getCapHitForYear', () => {
    it('should return correct cap hit', () => {
      const pick = createTestPick(1, 15);
      const contract = generateRookieContract(pick, 'player-1');

      const year1Hit = getCapHitForYear(contract, 2025);
      const year2Hit = getCapHitForYear(contract, 2026);

      expect(year1Hit).toBeGreaterThan(0);
      expect(year2Hit).toBeGreaterThan(0);
    });

    it('should return 0 for years not in contract', () => {
      const pick = createTestPick(1, 15);
      const contract = generateRookieContract(pick, 'player-1');

      const hit = getCapHitForYear(contract, 2030);
      expect(hit).toBe(0);
    });
  });

  describe('getRemainingYears', () => {
    it('should calculate remaining years correctly', () => {
      const pick = createTestPick(1, 15);
      const contract = generateRookieContract(pick, 'player-1');

      expect(getRemainingYears(contract, 2025)).toBe(4);
      expect(getRemainingYears(contract, 2026)).toBe(3);
      expect(getRemainingYears(contract, 2028)).toBe(1);
      expect(getRemainingYears(contract, 2029)).toBe(0);
    });
  });

  describe('getRemainingGuaranteed', () => {
    it('should calculate remaining guaranteed money', () => {
      const pick = createTestPick(1, 15);
      const contract = generateRookieContract(pick, 'player-1');

      const fullGuaranteed = getRemainingGuaranteed(contract, 2025);
      const laterGuaranteed = getRemainingGuaranteed(contract, 2027);

      expect(fullGuaranteed).toBe(contract.guaranteed);
      expect(laterGuaranteed).toBeLessThan(fullGuaranteed);
    });
  });

  describe('getDeadCap', () => {
    it('should calculate dead cap if released', () => {
      const pick = createTestPick(1, 15);
      const contract = generateRookieContract(pick, 'player-1');

      const deadCap = getDeadCap(contract, 2025);
      expect(deadCap).toBeGreaterThan(0);
    });

    it('should decrease over time', () => {
      const pick = createTestPick(1, 15);
      const contract = generateRookieContract(pick, 'player-1');

      const deadCap2025 = getDeadCap(contract, 2025);
      const deadCap2027 = getDeadCap(contract, 2027);

      expect(deadCap2027).toBeLessThan(deadCap2025);
    });
  });

  describe('getContractSummary', () => {
    it('should format values correctly', () => {
      const pick = createTestPick(1, 5);
      const contract = generateRookieContract(pick, 'player-1');

      const summary = getContractSummary(contract);

      expect(summary.totalValue).toContain('$');
      expect(summary.guaranteed).toContain('$');
      expect(summary.years).toBe(4);
      expect(summary.hasFifthYearOption).toBe(true);
      expect(summary.fifthYearStatus).toBe('available');
    });

    it('should show exercised status', () => {
      const pick = createTestPick(1, 5);
      let contract = generateRookieContract(pick, 'player-1');
      contract = exerciseFifthYearOption(contract);

      const summary = getContractSummary(contract);
      expect(summary.fifthYearStatus).toBe('exercised');
    });

    it('should show declined status', () => {
      const pick = createTestPick(1, 5);
      let contract = generateRookieContract(pick, 'player-1');
      contract = declineFifthYearOption(contract);

      const summary = getContractSummary(contract);
      expect(summary.fifthYearStatus).toBe('declined');
    });
  });

  describe('validateRookieContract', () => {
    it('should validate correct contract', () => {
      const pick = createTestPick(1, 15);
      const contract = generateRookieContract(pick, 'player-1');

      expect(validateRookieContract(contract)).toBe(true);
    });

    it('should reject invalid round for 5th year option', () => {
      const pick = createTestPick(1, 15);
      const contract = generateRookieContract(pick, 'player-1');

      // Manually corrupt
      const invalid = { ...contract, round: 2 };
      expect(validateRookieContract(invalid)).toBe(false);
    });

    it('should reject invalid years', () => {
      const pick = createTestPick(1, 15);
      const contract = generateRookieContract(pick, 'player-1');

      const invalid = { ...contract, years: 10 };
      expect(validateRookieContract(invalid)).toBe(false);
    });

    it('should reject mismatched breakdown length', () => {
      const pick = createTestPick(1, 15);
      const contract = generateRookieContract(pick, 'player-1');

      const invalid = { ...contract, yearlyBreakdown: contract.yearlyBreakdown.slice(0, 2) };
      expect(validateRookieContract(invalid)).toBe(false);
    });
  });
});
