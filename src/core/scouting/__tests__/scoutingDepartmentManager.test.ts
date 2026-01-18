/**
 * Scouting Department Manager Tests
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
    it('should have 8 total positions', () => {
      expect(TOTAL_SCOUTING_POSITIONS).toBe(8);

      const totalPositions = SCOUTING_DEPARTMENT_STRUCTURE.reduce((sum, pos) => sum + pos.count, 0);
      expect(totalPositions).toBe(8);
    });

    it('should have correct structure', () => {
      const directors = SCOUTING_DEPARTMENT_STRUCTURE.filter((p) => p.role === 'headScout');
      const nationalScouts = SCOUTING_DEPARTMENT_STRUCTURE.filter(
        (p) => p.role === 'headScout'
      );
      const regionalScouts = SCOUTING_DEPARTMENT_STRUCTURE.filter(
        (p) => p.role === 'offensiveScout'
      );
      const proScouts = SCOUTING_DEPARTMENT_STRUCTURE.filter((p) => p.role === 'defensiveScout');

      expect(directors).toHaveLength(1);
      expect(directors[0].count).toBe(1);
      expect(nationalScouts).toHaveLength(1);
      expect(nationalScouts[0].count).toBe(2);
      expect(regionalScouts).toHaveLength(4); // 4 regions
      expect(proScouts).toHaveLength(1);
      expect(proScouts[0].count).toBe(1);
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

      // Scouting director min is 1,000,000
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

    it('should add regional assignment for regional scout', () => {
      const state = createScoutingDepartmentState('team-1', 5_000_000);
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'offensiveScout');
      // The default scout sets region to 'northeast' for regional scouts

      const result = hireScout(state, scout, 400_000, 3);

      expect(result).not.toBeNull();
      expect(result!.regionalAssignments).toHaveLength(1);
      expect(result!.regionalAssignments[0].scoutId).toBe('scout-1');
      expect(result!.regionalAssignments[0].region).toBe('northeast');
      expect(result!.regionalAssignments[0].isPrimary).toBe(true);
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

    it('should remove regional assignments when firing regional scout', () => {
      let state = createScoutingDepartmentState('team-1', 5_000_000);
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'offensiveScout');
      state = hireScout(state, scout, 400_000, 3)!;

      expect(state.regionalAssignments).toHaveLength(1);

      const result = fireScout(state, 'scout-1');

      expect(result).not.toBeNull();
      expect(result!.regionalAssignments).toHaveLength(0);
    });
  });

  describe('getScoutingVacancies', () => {
    it('should return all vacancies for empty department', () => {
      const state = createScoutingDepartmentState('team-1', 5_000_000);

      const vacancies = getScoutingVacancies(state);

      // 1 director + 2 national + 4 regional (5 regions but midwest/southwest share) + 1 pro = 8
      // Actually the structure shows 4 regional scouts for 4 regions
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

    it('should mark director vacancy as critical', () => {
      const state = createScoutingDepartmentState('team-1', 5_000_000);

      const vacancies = getScoutingVacancies(state);
      const directorVacancy = vacancies.find((v) => v.role === 'headScout');

      expect(directorVacancy?.priority).toBe('critical');
    });
  });

  describe('getScoutsByRole', () => {
    it('should return scouts filtered by role', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const director = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      const national = createDefaultScout('scout-2', 'Jane', 'Doe', 'headScout');

      state = hireScout(state, director, 2_000_000, 3)!;
      state = hireScout(state, national, 800_000, 3)!;

      const directors = getScoutsByRole(state, 'headScout');
      const nationals = getScoutsByRole(state, 'headScout');

      expect(directors).toHaveLength(1);
      expect(directors[0].id).toBe('scout-1');
      expect(nationals).toHaveLength(1);
      expect(nationals[0].id).toBe('scout-2');
    });
  });

  describe('getHeadScout', () => {
    it('should return the scouting director', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const director = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, director, 2_000_000, 3)!;

      const result = getHeadScout(state);

      expect(result).not.toBeNull();
      expect(result!.id).toBe('scout-1');
    });

    it('should return null if no director', () => {
      const state = createScoutingDepartmentState('team-1', 5_000_000);

      const result = getHeadScout(state);

      expect(result).toBeNull();
    });
  });

  describe('assignScoutToRegion', () => {
    it('should assign national scout to region', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const national = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, national, 800_000, 3)!;

      const result = assignScoutToRegion(state, 'scout-1', 'southeast', true);

      expect(result).not.toBeNull();
      expect(result!.regionalAssignments).toHaveLength(1);
      expect(result!.regionalAssignments[0].region).toBe('southeast');
      expect(result!.regionalAssignments[0].isPrimary).toBe(true);
    });

    it('should reject assignment for non-scout roles', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const director = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, director, 2_000_000, 3)!;

      const result = assignScoutToRegion(state, 'scout-1', 'southeast', false);

      expect(result).toBeNull();
    });
  });

  describe('advanceScoutingYear', () => {
    it('should advance contracts and return expired ones', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const scout1 = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      const scout2 = createDefaultScout('scout-2', 'Jane', 'Doe', 'headScout');

      state = hireScout(state, scout1, 2_000_000, 1)!; // 1 year contract
      state = hireScout(state, scout2, 800_000, 3)!; // 3 year contract

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
      const director = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      const national = createDefaultScout('scout-2', 'Jane', 'Doe', 'headScout');

      state = hireScout(state, director, 2_000_000, 3)!;
      state = hireScout(state, national, 800_000, 3)!;

      const summary = getScoutingDepartmentSummary(state);

      expect(summary.totalPositions).toBe(TOTAL_SCOUTING_POSITIONS);
      expect(summary.filledPositions).toBe(2);
      expect(summary.vacancies).toBe(TOTAL_SCOUTING_POSITIONS - 2);
      expect(summary.hasDirector).toBe(true);
      expect(summary.hasProScout).toBe(false);
      expect(summary.budgetRemaining).toBe(10_000_000 - 2_800_000);
    });

    it('should show all regions covered with national scout', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const national = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, national, 800_000, 3)!;

      const summary = getScoutingDepartmentSummary(state);

      expect(summary.regionsCovered).toHaveLength(5); // All regions
      expect(summary.regionsUncovered).toHaveLength(0);
    });
  });

  describe('hasMinimumScoutingStaff', () => {
    it('should return true with director', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const director = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, director, 2_000_000, 3)!;

      expect(hasMinimumScoutingStaff(state)).toBe(true);
    });

    it('should return true with national scout', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const national = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, national, 800_000, 3)!;

      expect(hasMinimumScoutingStaff(state)).toBe(true);
    });

    it('should return false with only regional or pro scout', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const regional = createDefaultScout('scout-1', 'John', 'Doe', 'offensiveScout');
      state = hireScout(state, regional, 400_000, 3)!;

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
      const regional = createDefaultScout('scout-1', 'John', 'Doe', 'offensiveScout');
      state = hireScout(state, regional, 400_000, 3)!;

      const scouts = getScoutsForRegion(state, 'northeast');

      expect(scouts).toHaveLength(1);
      expect(scouts[0].id).toBe('scout-1');
    });

    it('should return empty for unassigned region', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const regional = createDefaultScout('scout-1', 'John', 'Doe', 'offensiveScout');
      state = hireScout(state, regional, 400_000, 3)!;

      const scouts = getScoutsForRegion(state, 'west');

      expect(scouts).toHaveLength(0);
    });
  });

  describe('getPrimaryScoutForRegion', () => {
    it('should return primary scout for region', () => {
      let state = createScoutingDepartmentState('team-1', 10_000_000);
      const regional = createDefaultScout('scout-1', 'John', 'Doe', 'offensiveScout');
      state = hireScout(state, regional, 400_000, 3)!;

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
      const national = createDefaultScout('scout-1', 'John', 'Doe', 'headScout');
      state = hireScout(state, national, 800_000, 3)!;
      state = assignScoutToRegion(state, 'scout-1', 'southeast', false)!;

      expect(state.regionalAssignments).toHaveLength(1);

      const result = removeScoutFromRegion(state, 'scout-1', 'southeast');

      expect(result.regionalAssignments).toHaveLength(0);
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
      const scout2 = createDefaultScout('scout-2', 'Jane', 'Doe', 'headScout');

      state = hireScout(state, scout1, 2_000_000, 3)!;
      state = hireScout(state, scout2, 800_000, 3)!;

      expect(getTotalDepartmentSalary(state)).toBe(2_800_000);
    });
  });
});
