/**
 * Salary Cap Manager Tests
 */

import { Position } from '../../models/player/Position';
import {
  createSalaryCapState,
  addContract,
  removeContract,
  addCapPenalty,
  calculateCapUsage,
  getTop51CapHits,
  getCapStatus,
  projectCap,
  calculateRollover,
  advanceCapYear,
  getContractsByCapHit,
  getExpiringContracts,
  canAffordContract,
  getCapSummary,
  validateSalaryCapState,
  CapPenalty,
} from '../SalaryCapManager';
import {
  createPlayerContract,
  ContractOffer,
} from '../Contract';
import { DEFAULT_SALARY_CAP } from '../../models/team/TeamFinances';

describe('SalaryCapManager', () => {
  const createTestContract = (
    playerId: string,
    totalValue: number,
    years: number,
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
      playerId,
      `Player ${playerId}`,
      'team-1',
      Position.QB,
      offer,
      signedYear
    );
  };

  describe('createSalaryCapState', () => {
    it('should create initial state with default cap', () => {
      const state = createSalaryCapState('team-1', 2024);

      expect(state.teamId).toBe('team-1');
      expect(state.currentYear).toBe(2024);
      expect(state.salaryCap).toBe(DEFAULT_SALARY_CAP);
      expect(state.rollover).toBe(0);
      expect(state.contracts.size).toBe(0);
      expect(state.penalties).toHaveLength(0);
    });

    it('should accept custom cap value', () => {
      const customCap = 300000;
      const state = createSalaryCapState('team-1', 2024, customCap);

      expect(state.salaryCap).toBe(customCap);
      expect(state.baselineCap).toBe(customCap);
    });
  });

  describe('addContract and removeContract', () => {
    it('should add a contract to state', () => {
      let state = createSalaryCapState('team-1', 2024);
      const contract = createTestContract('player-1', 40000, 4);

      state = addContract(state, contract);

      expect(state.contracts.size).toBe(1);
      expect(state.contracts.get(contract.id)).toBe(contract);
    });

    it('should remove a contract from state', () => {
      let state = createSalaryCapState('team-1', 2024);
      const contract = createTestContract('player-1', 40000, 4);

      state = addContract(state, contract);
      expect(state.contracts.size).toBe(1);

      state = removeContract(state, contract.id);
      expect(state.contracts.size).toBe(0);
    });
  });

  describe('addCapPenalty', () => {
    it('should add a cap penalty', () => {
      let state = createSalaryCapState('team-1', 2024);
      const penalty: CapPenalty = {
        id: 'penalty-1',
        playerId: 'player-1',
        playerName: 'John Doe',
        reason: 'cut',
        amount: 5000,
        year: 2024,
        yearsRemaining: 1,
      };

      state = addCapPenalty(state, penalty);

      expect(state.penalties).toHaveLength(1);
      expect(state.penalties[0]).toBe(penalty);
    });
  });

  describe('calculateCapUsage', () => {
    it('should calculate total cap usage from contracts', () => {
      let state = createSalaryCapState('team-1', 2024);
      const contract1 = createTestContract('player-1', 40000, 4);
      const contract2 = createTestContract('player-2', 20000, 2);

      state = addContract(state, contract1);
      state = addContract(state, contract2);

      const usage = calculateCapUsage(state, 2024);

      expect(usage).toBeGreaterThan(0);
    });

    it('should include cap penalties in usage', () => {
      let state = createSalaryCapState('team-1', 2024);
      const penalty: CapPenalty = {
        id: 'penalty-1',
        playerId: 'player-1',
        playerName: 'John Doe',
        reason: 'cut',
        amount: 5000,
        year: 2024,
        yearsRemaining: 1,
      };

      const usageBefore = calculateCapUsage(state, 2024);
      state = addCapPenalty(state, penalty);
      const usageAfter = calculateCapUsage(state, 2024);

      expect(usageAfter - usageBefore).toBe(5000);
    });
  });

  describe('getTop51CapHits', () => {
    it('should return sum of top 51 cap hits', () => {
      let state = createSalaryCapState('team-1', 2024);

      // Add 3 contracts
      for (let i = 1; i <= 3; i++) {
        const contract = createTestContract(`player-${i}`, 10000 * i, 2);
        state = addContract(state, contract);
      }

      const top51 = getTop51CapHits(state, 2024);

      expect(top51).toBeGreaterThan(0);
    });
  });

  describe('getCapStatus', () => {
    it('should return comprehensive cap status', () => {
      let state = createSalaryCapState('team-1', 2024);
      const contract = createTestContract('player-1', 100000, 4);
      state = addContract(state, contract);

      const status = getCapStatus(state);

      expect(status.salaryCap).toBe(DEFAULT_SALARY_CAP);
      expect(status.currentCapUsage).toBeGreaterThan(0);
      expect(status.capSpace).toBe(status.salaryCap - status.currentCapUsage);
      expect(status.percentUsed).toBeGreaterThan(0);
      expect(typeof status.isOverCap).toBe('boolean');
      expect(typeof status.meetsFloor).toBe('boolean');
    });

    it('should detect when team is over the cap', () => {
      let state = createSalaryCapState('team-1', 2024, 50000); // Small cap
      const contract = createTestContract('player-1', 200000, 4); // Huge contract
      state = addContract(state, contract);

      const status = getCapStatus(state);

      expect(status.isOverCap).toBe(true);
      expect(status.capSpace).toBeLessThan(0);
    });
  });

  describe('projectCap', () => {
    it('should project cap for future years', () => {
      let state = createSalaryCapState('team-1', 2024);
      const contract = createTestContract('player-1', 40000, 4);
      state = addContract(state, contract);

      const projections = projectCap(state, 3);

      expect(projections).toHaveLength(4); // Current + 3 future
      expect(projections[0].year).toBe(2024);
      expect(projections[3].year).toBe(2027);

      // Cap should grow each year
      expect(projections[1].projectedCap).toBeGreaterThan(projections[0].projectedCap);
    });

    it('should track expiring contracts', () => {
      let state = createSalaryCapState('team-1', 2024);
      const shortContract = createTestContract('player-1', 10000, 1);
      const longContract = createTestContract('player-2', 20000, 4);

      state = addContract(state, shortContract);
      state = addContract(state, longContract);

      const projections = projectCap(state, 3);

      expect(projections[0].expiringContracts).toBe(1); // Short contract expires in 2024
    });
  });

  describe('calculateRollover', () => {
    it('should calculate unused cap space as rollover', () => {
      const state = createSalaryCapState('team-1', 2024);
      // Empty roster = all cap unused

      const rollover = calculateRollover(state);

      expect(rollover).toBe(DEFAULT_SALARY_CAP);
    });

    it('should return 0 when over cap', () => {
      let state = createSalaryCapState('team-1', 2024, 50000);
      const contract = createTestContract('player-1', 200000, 4);
      state = addContract(state, contract);

      const rollover = calculateRollover(state);

      expect(rollover).toBe(0);
    });
  });

  describe('advanceCapYear', () => {
    it('should advance to next year with rollover', () => {
      let state = createSalaryCapState('team-1', 2024);
      const contract = createTestContract('player-1', 40000, 4);
      state = addContract(state, contract);

      const rollover = calculateRollover(state);
      const newBaseline = 260000;
      const advanced = advanceCapYear(state, newBaseline);

      expect(advanced.currentYear).toBe(2025);
      expect(advanced.baselineCap).toBe(newBaseline);
      expect(advanced.salaryCap).toBe(newBaseline + rollover);
      expect(advanced.rollover).toBe(rollover);
    });

    it('should advance contracts and remove expired', () => {
      let state = createSalaryCapState('team-1', 2024);
      const expiringContract = createTestContract('player-1', 10000, 1);
      const ongoingContract = createTestContract('player-2', 20000, 4);

      state = addContract(state, expiringContract);
      state = addContract(state, ongoingContract);

      const advanced = advanceCapYear(state, 260000);

      // Expiring contract should be removed
      expect(advanced.contracts.size).toBe(1);
    });
  });

  describe('getContractsByCapHit', () => {
    it('should return contracts sorted by cap hit', () => {
      let state = createSalaryCapState('team-1', 2024);
      const smallContract = createTestContract('player-1', 10000, 2);
      const bigContract = createTestContract('player-2', 50000, 2);
      const medContract = createTestContract('player-3', 25000, 2);

      state = addContract(state, smallContract);
      state = addContract(state, bigContract);
      state = addContract(state, medContract);

      const sorted = getContractsByCapHit(state);

      expect(sorted).toHaveLength(3);
      expect(sorted[0].capHit).toBeGreaterThanOrEqual(sorted[1].capHit);
      expect(sorted[1].capHit).toBeGreaterThanOrEqual(sorted[2].capHit);
    });
  });

  describe('getExpiringContracts', () => {
    it('should return contracts expiring in given year', () => {
      let state = createSalaryCapState('team-1', 2024);
      const expiringContract = createTestContract('player-1', 10000, 1, 2024);
      const ongoingContract = createTestContract('player-2', 20000, 4, 2024);

      state = addContract(state, expiringContract);
      state = addContract(state, ongoingContract);

      const expiring = getExpiringContracts(state, 2024);

      expect(expiring).toHaveLength(1);
      expect(expiring[0].id).toBe(expiringContract.id);
    });
  });

  describe('canAffordContract', () => {
    it('should return true when cap space is sufficient', () => {
      const state = createSalaryCapState('team-1', 2024);

      expect(canAffordContract(state, 10000)).toBe(true);
    });

    it('should return false when cap space is insufficient', () => {
      let state = createSalaryCapState('team-1', 2024, 50000);
      const contract = createTestContract('player-1', 180000, 4);
      state = addContract(state, contract);

      expect(canAffordContract(state, 10000)).toBe(false);
    });
  });

  describe('getCapSummary', () => {
    it('should return descriptive cap summary', () => {
      const state = createSalaryCapState('team-1', 2024);

      const summary = getCapSummary(state);

      expect(summary.capStatusDescription).toBeDefined();
      expect(summary.spaceDescription).toContain('$');
      expect(summary.deadMoneyDescription).toBeDefined();
      expect(['excellent', 'good', 'moderate', 'limited', 'critical']).toContain(
        summary.flexibilityRating
      );
    });
  });

  describe('validateSalaryCapState', () => {
    it('should validate a correct state', () => {
      const state = createSalaryCapState('team-1', 2024);

      expect(validateSalaryCapState(state)).toBe(true);
    });

    it('should reject invalid year', () => {
      const state = createSalaryCapState('team-1', 1900);

      expect(validateSalaryCapState(state)).toBe(false);
    });
  });
});
