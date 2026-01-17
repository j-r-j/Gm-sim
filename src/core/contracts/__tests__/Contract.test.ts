/**
 * Contract Model Tests
 */

import { Position } from '../../models/player/Position';
import {
  createPlayerContract,
  createMinimumContract,
  ContractOffer,
  getCapHitForYear,
  getCurrentCapHit,
  calculateDeadMoney,
  calculateCapSavings,
  calculatePostJune1DeadMoney,
  advanceContractYear,
  isExpiringContract,
  getContractEndYear,
  getContractSummary,
  validatePlayerContract,
  getMinimumSalary,
  VETERAN_MINIMUM_SALARY,
} from '../Contract';

describe('Contract', () => {
  const createTestOffer = (overrides: Partial<ContractOffer> = {}): ContractOffer => ({
    years: 4,
    bonusPerYear: Math.round(50000 / 4), // $50M guaranteed / 4 years
    salaryPerYear: Math.round((80000 - 50000) / 4), // ($80M - $50M) / 4 years
    noTradeClause: false,
    // Backward-compat properties
    totalValue: 80000, // $80M
    guaranteedMoney: 50000, // $50M guaranteed
    signingBonus: 20000, // $20M signing bonus
    firstYearSalary: 15000, // $15M first year
    annualEscalation: 0.05, // 5% escalation
    voidYears: 0,
    ...overrides,
  });

  describe('createPlayerContract', () => {
    it('should create a valid contract from an offer', () => {
      const offer = createTestOffer();
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024,
        'veteran'
      );

      expect(contract.id).toBeDefined();
      expect(contract.playerId).toBe('player-1');
      expect(contract.playerName).toBe('John Doe');
      expect(contract.teamId).toBe('team-1');
      expect(contract.position).toBe(Position.QB);
      expect(contract.status).toBe('active');
      expect(contract.type).toBe('veteran');
      expect(contract.totalYears).toBe(4);
      expect(contract.yearsRemaining).toBe(4);
      expect(contract.totalValue).toBe(80000);
      expect(contract.guaranteedMoney).toBe(50000);
      // In simplified model, signingBonus is not used (always 0)
      // All guaranteed money is handled through bonusPerYear
      expect(contract.signingBonus).toBe(0);
    });

    it('should calculate yearly breakdown correctly', () => {
      const offer = createTestOffer();
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      expect(contract.yearlyBreakdown).toHaveLength(4);
      expect(contract.yearlyBreakdown[0].year).toBe(2024);
      expect(contract.yearlyBreakdown[3].year).toBe(2027);

      // Each year should have bonus (prorationedBonus is alias)
      // bonusPerYear = 50000 / 4 = 12500
      const expectedBonus = Math.round(50000 / 4);
      for (const year of contract.yearlyBreakdown) {
        expect(year.bonus).toBe(expectedBonus);
        expect(year.prorationedBonus).toBe(expectedBonus); // alias
      }
    });

    it('should handle void years correctly', () => {
      // In simplified model, void years are only added through restructures
      // The voidYears property is stored but yearlyBreakdown only has real years
      const offer = createTestOffer({ voidYears: 2 });
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      // Yearly breakdown only includes the 4 playing years (void years added via restructure)
      expect(contract.yearlyBreakdown).toHaveLength(4);
      // voidYears property is stored on contract (used in restructure logic)
      expect(contract.voidYears).toBe(0); // Starts at 0, added through restructure
    });

    it('should handle no-trade clause', () => {
      const offer = createTestOffer({ noTradeClause: true });
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      expect(contract.hasNoTradeClause).toBe(true);
    });
  });

  describe('createMinimumContract', () => {
    it('should create a minimum salary contract for a rookie', () => {
      const contract = createMinimumContract(
        'player-1',
        'Rookie Player',
        'team-1',
        Position.WR,
        0, // 0 years experience
        2024
      );

      expect(contract.totalValue).toBe(795); // Rookie minimum
      expect(contract.totalYears).toBe(1);
      expect(contract.guaranteedMoney).toBe(795);
    });

    it('should create a minimum salary contract for a veteran', () => {
      const contract = createMinimumContract(
        'player-1',
        'Vet Player',
        'team-1',
        Position.WR,
        5, // 5 years experience
        2024,
        2 // 2 year deal
      );

      expect(contract.totalValue).toBe(1215 * 2); // Vet minimum x 2 years
      expect(contract.totalYears).toBe(2);
    });
  });

  describe('getCapHitForYear', () => {
    it('should return correct cap hit for a given year', () => {
      const offer = createTestOffer();
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      const capHit2024 = getCapHitForYear(contract, 2024);
      expect(capHit2024).toBeGreaterThan(0);

      // Should return 0 for years not in contract
      const capHit2023 = getCapHitForYear(contract, 2023);
      expect(capHit2023).toBe(0);

      const capHit2030 = getCapHitForYear(contract, 2030);
      expect(capHit2030).toBe(0);
    });
  });

  describe('calculateDeadMoney', () => {
    it('should calculate dead money correctly', () => {
      const offer = createTestOffer();
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      const deadMoney = calculateDeadMoney(contract, 2024);

      // Dead money should include all remaining prorated bonus
      expect(deadMoney).toBeGreaterThan(0);
      expect(deadMoney).toBeLessThanOrEqual(contract.totalValue);
    });

    it('should decrease dead money as contract progresses', () => {
      const offer = createTestOffer();
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      const deadMoney2024 = calculateDeadMoney(contract, 2024);
      const deadMoney2026 = calculateDeadMoney(contract, 2026);

      expect(deadMoney2026).toBeLessThan(deadMoney2024);
    });
  });

  describe('calculateCapSavings', () => {
    it('should calculate cap savings correctly', () => {
      const offer = createTestOffer();
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      const capSavings = calculateCapSavings(contract, 2024);

      // In simplified model, capSavings = salary (non-guaranteed portion you avoid)
      // salaryPerYear = (80000 - 50000) / 4 = 7500
      expect(capSavings).toBe(7500);
    });
  });

  describe('calculatePostJune1DeadMoney', () => {
    it('should split dead money over two years', () => {
      const offer = createTestOffer();
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      const { year1DeadMoney, year2DeadMoney } = calculatePostJune1DeadMoney(contract, 2024);

      expect(year1DeadMoney).toBeGreaterThan(0);
      expect(year2DeadMoney).toBeGreaterThan(0);
      expect(year1DeadMoney + year2DeadMoney).toBe(calculateDeadMoney(contract, 2024));
    });
  });

  describe('advanceContractYear', () => {
    it('should decrease years remaining', () => {
      const offer = createTestOffer();
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      const advanced = advanceContractYear(contract);

      expect(advanced).not.toBeNull();
      expect(advanced!.yearsRemaining).toBe(3);
      expect(advanced!.status).toBe('active');
    });

    it('should expire contract when years remaining reaches 0', () => {
      const offer = createTestOffer({ years: 1 });
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      const advanced = advanceContractYear(contract);

      expect(advanced).not.toBeNull();
      expect(advanced!.yearsRemaining).toBe(0);
      expect(advanced!.status).toBe('expired');
    });
  });

  describe('isExpiringContract', () => {
    it('should return true for final year of contract', () => {
      const offer = createTestOffer({ years: 1 });
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      expect(isExpiringContract(contract)).toBe(true);
    });

    it('should return false for multi-year contracts', () => {
      const offer = createTestOffer({ years: 4 });
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      expect(isExpiringContract(contract)).toBe(false);
    });
  });

  describe('getContractEndYear', () => {
    it('should return correct end year', () => {
      const offer = createTestOffer({ years: 4 });
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      expect(getContractEndYear(contract)).toBe(2027);
    });
  });

  describe('getContractSummary', () => {
    it('should format contract summary correctly', () => {
      const offer = createTestOffer();
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      const summary = getContractSummary(contract, 2024);

      expect(summary.totalValue).toContain('$');
      expect(summary.guaranteed).toContain('$');
      expect(summary.aav).toContain('$');
      expect(summary.years).toBe(4);
      expect(summary.yearsRemaining).toBe(4);
      expect(summary.statusDescription).toBe('Active');
    });
  });

  describe('validatePlayerContract', () => {
    it('should validate a correct contract', () => {
      const offer = createTestOffer();
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      expect(validatePlayerContract(contract)).toBe(true);
    });

    it('should reject contract with guaranteed exceeding total', () => {
      const offer = createTestOffer();
      const contract = createPlayerContract(
        'player-1',
        'John Doe',
        'team-1',
        Position.QB,
        offer,
        2024
      );

      // Manually corrupt the contract
      const invalidContract = {
        ...contract,
        guaranteedMoney: contract.totalValue + 1000,
      };

      expect(validatePlayerContract(invalidContract)).toBe(false);
    });
  });

  describe('getMinimumSalary', () => {
    it('should return correct minimum for each experience level', () => {
      expect(getMinimumSalary(0)).toBe(VETERAN_MINIMUM_SALARY[0]);
      expect(getMinimumSalary(5)).toBe(VETERAN_MINIMUM_SALARY[5]);
      expect(getMinimumSalary(10)).toBe(VETERAN_MINIMUM_SALARY[7]); // Caps at 7
    });
  });
});
