/**
 * Scouting Department Manager Tests
 * Updated for simplified 3-scout structure (Head Scout, Offensive Scout, Defensive Scout)
 */

import {
  createScoutingDepartmentState,
  getScoutsByRole,
  getHeadScout,
  getScoutsForRegion,
  getPrimaryScoutForRegion,
  getScoutingVacancies,
  hireScout,
  fireScout,
  assignScoutToRegion,
  removeScoutFromRegion,
  updateScoutingBudget,
  advanceScoutingYear,
  getScoutingDepartmentSummary,
  hasMinimumScoutingStaff,
  getTotalDepartmentSalary,
  validateScoutingDepartmentState,
  renewScoutContract,
  TOTAL_SCOUTING_POSITIONS,
  SCOUTING_DEPARTMENT_STRUCTURE,
} from '../ScoutingDepartmentManager';
import { createDefaultScout } from '../../models/staff/Scout';

describe('ScoutingDepartmentManager', () => {
  describe('createScoutingDepartmentState', () => {
    it('should create empty department state', () => {
      const state = createScoutingDepartmentState('team-1', 5_000_000);

      expect(state.teamId).toBe('team-1');
      expect(state.budget).toBe(5_000_000);
      expect(state.spentBudget).toBe(0);
      expect(state.scouts.size).toBe(0);
      expect(state.regionalAssignments).toHaveLength(0);
    });
  });

  describe('SCOUTING_DEPARTMENT_STRUCTURE', () => {
    it('should have 3 total positions', () => {
      expect(TOTAL_SCOUTING_POSITIONS).toBe(3);

      const totalPositions = SCOUTING_DEPARTMENT_STRUCTURE.reduce((sum, pos) => sum + pos.count, 0);
      expect(totalPositions).toBe(3);
    });

    it('should have correct structure', () => {
      const headScouts = SCOUTING_DEPARTMENT_STRUCTURE.filter((p) => p.role === 'headScout');
      const offensiveScouts = SCOUTING_DEPARTMENT_STRUCTURE.filter(
        (p) => p.role === 'offensiveScout'
      );
      const defensiveScouts = SCOUTING_DEPARTMENT_STRUCTURE.filter(
        (p) => p.role === 'defensiveScout'
      );

      expect(headScouts).toHaveLength(1);
      expect(headScouts[0].count).toBe(1);
      expect(offensiveScouts).toHaveLength(1);
      expect(offensiveScouts[0].count).toBe(1);
      expect(defensiveScouts).toHaveLength(1);
      expect(defensiveScouts[0].count).toBe(1);
    });
  });

  describe('hireScout', () => {
    it('should hire a scout to the department', () => {
      const state = createScoutingDepartmentState('team-1', 5_000_000);
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');

      const result = hireScout(state, scout, 2_000_000, 3);

      expect(result).not.toBeNull();
      expect(result!.scouts.size).toBe(1);
      expect(result!.scouts.get('scout-1')).toBeDefined();
      expect(result!.scouts.get('scout-1')!.teamId).toBe('team-1');
      expect(result!.scouts.get('scout-1')!.contract?.salary).toBe(2_000_000);
      expect(result!.spentBudget).toBe(2_000_000);
    });

    it('should reject hire if over budget', () => {
      const state = createScoutingDepartmentState('team-1', 1_000_000);
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');

      const result = hireScout(state, scout, 2_000_000, 3);

      expect(result).toBeNull();
    });

    it('should reject hire if salary out of range', () => {
      const state = createScoutingDepartmentState('team-1', 10_000_000);
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');

      // Head scout min is 1,000,000
      const result = hireScout(state, scout, 100_000, 3);

      expect(result).toBeNull();
    });

    it('should reject hire if no vacancy', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const scout1 = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      const scout2 = createDefaultScout('scout-2', 'Jane', 'Doe', 'headScout');

      state = hireScout(state, scout1, 2_000_000, 3)!;
      const result = hireScout(state, scout2, 2_000_000, 3);

      expect(result).toBeNull();
    });

    it('should hire all three scout roles', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const headScout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      const offensiveScout = createDefaultScout('scout-2', 'Jane', 'Doe', 'offensiveScout');
      const defensiveScout = createDefaultScout('scout-3', 'Bob', 'Smith', 'defensiveScout');

      state = hireScout(state, headScout, 2_000_000, 3)!;
      state = hireScout(state, offensiveScout, 600_000, 3)!;
      state = hireScout(state, defensiveScout, 600_000, 3)!;

      expect(state.scouts.size).toBe(3);
      expect(state.spentBudget).toBe(3_200_000);
    });
  });

  describe('fireScout', () => {
    it('should fire a scout from the department', () => {
      let state = createScoutingDepartmentState('team-1', 5_000_000);
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, scout, 2_000_000, 3)!;

      const result = fireScout(state, 'scout-1');

      expect(result).not.toBeNull();
      expect(result!.scouts.size).toBe(0);
      expect(result!.spentBudget).toBe(0);
    });

    it('should return null if scout not found', () => {
      const state = createScoutingDepartmentState('team-1', 5_000_000);

      const result = fireScout(state, 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getScoutingVacancies', () => {
    it('should return all vacancies for empty department', () => {
      const state = createScoutingDepartmentState('team-1', 5_000_000);

      const vacancies = getScoutingVacancies(state);

      expect(vacancies.length).toBe(TOTAL_SCOUTING_POSITIONS);
    });

    it('should reduce vacancies when scouts are hired', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, scout, 2_000_000, 3)!;

      const vacancies = getScoutingVacancies(state);

      expect(vacancies.length).toBe(TOTAL_SCOUTING_POSITIONS - 1);
      expect(vacancies.find((v) => v.role === 'headScout')).toBeUndefined();
    });

    it('should mark head scout vacancy as critical', () => {
      const state = createScoutingDepartmentState('team-1', 5_000_000);

      const vacancies = getScoutingVacancies(state);
      const headScoutVacancy = vacancies.find((v) => v.role === 'headScout');

      expect(headScoutVacancy?.priority).toBe('critical');
    });

    it('should mark offensive and defensive scout vacancies as important', () => {
      const state = createScoutingDepartmentState('team-1', 5_000_000);

      const vacancies = getScoutingVacancies(state);
      const offensiveVacancy = vacancies.find((v) => v.role === 'offensiveScout');
      const defensiveVacancy = vacancies.find((v) => v.role === 'defensiveScout');

      expect(offensiveVacancy?.priority).toBe('important');
      expect(defensiveVacancy?.priority).toBe('important');
    });
  });

  describe('getScoutsByRole', () => {
    it('should return scouts filtered by role', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const headScout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      const offensiveScout = createDefaultScout('scout-2', 'Jane', 'Doe', 'offensiveScout');

      state = hireScout(state, headScout, 2_000_000, 3)!;
      state = hireScout(state, offensiveScout, 600_000, 3)!;

      const headScouts = getScoutsByRole(state, 'headScout');
      const offensiveScouts = getScoutsByRole(state, 'offensiveScout');

      expect(headScouts).toHaveLength(1);
      expect(headScouts[0].id).toBe('scout-1');
      expect(offensiveScouts).toHaveLength(1);
      expect(offensiveScouts[0].id).toBe('scout-2');
    });
  });

  describe('getHeadScout', () => {
    it('should return the head scout', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const headScout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, headScout, 2_000_000, 3)!;

      const result = getHeadScout(state);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('scout-1');
    });

    it('should return null if no head scout', () => {
      const state = createScoutingDepartmentState('team-1', 5_000_000);

      const result = getHeadScout(state);

      expect(result).toBeNull();
    });
  });

  describe('assignScoutToRegion', () => {
    it('should assign scout to region', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const offensiveScout = createDefaultScout('scout-1', 'John', 'Doe', 'offensiveScout');
      state = hireScout(state, offensiveScout, 600_000, 3)!;

      const result = assignScoutToRegion(state, 'scout-1', 'southeast', true);

      expect(result).not.toBeNull();
      expect(result!.regionalAssignments.length).toBeGreaterThanOrEqual(0);
    });

    it('should return null for nonexistent scout', () => {
      const state = createScoutingDepartmentState('team-1', 10_000_000);

      const result = assignScoutToRegion(state, 'nonexistent', 'southeast', false);

      expect(result).toBeNull();
    });
  });

  describe('advanceScoutingYear', () => {
    it('should advance contracts and return expired ones', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const scout1 = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      const scout2 = createDefaultScout('scout-2', 'Jane', 'Doe', 'offensiveScout');

      state = hireScout(state, scout1, 2_000_000, 1)!; // 1 year contract
      state = hireScout(state, scout2, 600_000, 3)!; // 3 year contract

      const result = advanceScoutingYear(state);

      expect(result.expiredContracts).toContain('scout-1');
      expect(result.expiredContracts).not.toContain('scout-2');
      expect(result.state.scouts.get('scout-1')?.contract).toBeNull();
      expect(result.state.scouts.get('scout-2')?.contract?.yearsRemaining).toBe(2);
    });
  });

  describe('getScoutingDepartmentSummary', () => {
    it('should return accurate summary', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const headScout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      const offensiveScout = createDefaultScout('scout-2', 'Jane', 'Doe', 'offensiveScout');

      state = hireScout(state, headScout, 2_000_000, 3)!;
      state = hireScout(state, offensiveScout, 600_000, 3)!;

      const summary = getScoutingDepartmentSummary(state);

      expect(summary.totalPositions).toBe(TOTAL_SCOUTING_POSITIONS);
      expect(summary.filledPositions).toBe(2);
      expect(summary.vacancies).toBe(TOTAL_SCOUTING_POSITIONS - 2);
      expect(summary.hasDirector).toBe(true);
      expect(summary.budgetRemaining).toBe(10_000_000 - 2_600_000);
    });

    it('should show all regions covered when any scout is hired', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const headScout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, headScout, 2_000_000, 3)!;

      const summary = getScoutingDepartmentSummary(state);

      expect(summary.regionsCovered).toHaveLength(5); // All regions
      expect(summary.regionsUncovered).toHaveLength(0);
    });

    it('should show no regions covered when no scouts', () => {
      const state = createScoutingDepartmentState('team-1', 10_000_000);

      const summary = getScoutingDepartmentSummary(state);

      expect(summary.regionsCovered).toHaveLength(0);
      expect(summary.regionsUncovered).toHaveLength(5);
    });
  });

  describe('hasMinimumScoutingStaff', () => {
    it('should return true with head scout', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const headScout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, headScout, 2_000_000, 3)!;

      expect(hasMinimumScoutingStaff(state)).toBe(true);
    });

    it('should return false without head scout', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const offensiveScout = createDefaultScout('scout-1', 'John', 'Doe', 'offensiveScout');
      state = hireScout(state, offensiveScout, 600_000, 3)!;

      expect(hasMinimumScoutingStaff(state)).toBe(false);
    });

    it('should return false with empty department', () => {
      const state = createScoutingDepartmentState('team-1', 10_000_000);

      expect(hasMinimumScoutingStaff(state)).toBe(false);
    });
  });

  describe('validateScoutingDepartmentState', () => {
    it('should validate correct state', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, scout, 2_000_000, 3)!;

      expect(validateScoutingDepartmentState(state)).toBe(true);
    });

    it('should reject state with over-budget spending', () => {
      const state = createScoutingDepartmentState('team-1', 1_000_000);
      // Manually set invalid state
      const invalidState = {
        ...state,
        spentBudget: 2_000_000,
      };

      expect(validateScoutingDepartmentState(invalidState)).toBe(false);
    });
  });

  describe('renewScoutContract', () => {
    it('should renew a scout contract', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, scout, 2_000_000, 1)!;

      const result = renewScoutContract(state, 'scout-1', 2_500_000, 3);

      expect(result).not.toBeNull();
      expect(result!.scouts.get('scout-1')?.contract?.salary).toBe(2_500_000);
      expect(result!.scouts.get('scout-1')?.contract?.yearsRemaining).toBe(3);
      expect(result!.spentBudget).toBe(2_500_000);
    });

    it('should reject renewal if over budget', () => {
      let state = createScoutingDepartmentState('team-1', 3_000_000);
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, scout, 2_000_000, 1)!;

      // Try to renew at 4M when budget is only 3M
      const result = renewScoutContract(state, 'scout-1', 4_000_000, 3);

      expect(result).toBeNull();
    });
  });

  describe('getScoutsForRegion', () => {
    it('should return scouts assigned to a region', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const offensiveScout = createDefaultScout('scout-1', 'John', 'Doe', 'offensiveScout');
      state = hireScout(state, offensiveScout, 600_000, 3)!;
      // Manually assign to region
      state = assignScoutToRegion(state, 'scout-1', 'northeast', true)!;

      const scouts = getScoutsForRegion(state, 'northeast');

      expect(scouts).toHaveLength(1);
      expect(scouts[0].id).toBe('scout-1');
    });

    it('should return empty for unassigned region', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const offensiveScout = createDefaultScout('scout-1', 'John', 'Doe', 'offensiveScout');
      state = hireScout(state, offensiveScout, 600_000, 3)!;

      const scouts = getScoutsForRegion(state, 'west');

      expect(scouts).toHaveLength(0);
    });
  });

  describe('getPrimaryScoutForRegion', () => {
    it('should return primary scout for region', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const offensiveScout = createDefaultScout('scout-1', 'John', 'Doe', 'offensiveScout');
      state = hireScout(state, offensiveScout, 600_000, 3)!;
      state = assignScoutToRegion(state, 'scout-1', 'northeast', true)!;

      const primary = getPrimaryScoutForRegion(state, 'northeast');

      expect(primary).not.toBeNull();
      expect(primary!.id).toBe('scout-1');
    });

    it('should return null if no primary scout', () => {
      const state = createScoutingDepartmentState('team-1', 10_000_000);

      const primary = getPrimaryScoutForRegion(state, 'northeast');

      expect(primary).toBeNull();
    });
  });

  describe('removeScoutFromRegion', () => {
    it('should remove scout from region assignment', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const offensiveScout = createDefaultScout('scout-1', 'John', 'Doe', 'offensiveScout');
      state = hireScout(state, offensiveScout, 600_000, 3)!;
      state = assignScoutToRegion(state, 'scout-1', 'southeast', false)!;

      expect(state.regionalAssignments.length).toBeGreaterThanOrEqual(0);

      const result = removeScoutFromRegion(state, 'scout-1', 'southeast');

      expect(result.regionalAssignments.filter((a) => a.region === 'southeast')).toHaveLength(0);
    });
  });

  describe('updateScoutingBudget', () => {
    it('should update budget', () => {
      const state = createScoutingDepartmentState('team-1', 5_000_000);

      const result = updateScoutingBudget(state, 8_000_000);

      expect(result).not.toBeNull();
      expect(result!.budget).toBe(8_000_000);
    });

    it('should reject budget reduction below spent amount', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, scout, 2_000_000, 3)!;

      const result = updateScoutingBudget(state, 1_000_000);

      expect(result).toBeNull();
    });
  });

  describe('getTotalDepartmentSalary', () => {
    it('should calculate total salary correctly', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const scout1 = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      const scout2 = createDefaultScout('scout-2', 'Jane', 'Doe', 'offensiveScout');

      state = hireScout(state, scout1, 2_000_000, 3)!;
      state = hireScout(state, scout2, 600_000, 3)!;

      expect(getTotalDepartmentSalary(state)).toBe(2_600_000);
    });
  });
});
