/**
 * Tests for Coaching Staff Manager
 */

import {
  createCoachingStaffState,
  getStaffCoaches,
  getCoachByRole,
  getVacancies,
  hireCoach,
  fireCoach,
  assignInterim,
  removeInterim,
  getInterimForRole,
  calculateStaffChemistry,
  createStaffChemistryViewModel,
  advanceStaffYear,
  buildCoachingTreeRelationships,
  getSameTreeCoaches,
  hasMinimumCoachingStaff,
  getStaffCompleteness,
  validateCoachingStaffState,
  getCoachingStaffSummary,
  CoachingStaffState,
} from '../CoachingStaffManager';
import { Coach, createDefaultCoach } from '../../models/staff/Coach';
import { createEmptyStaffHierarchy, StaffHierarchy } from '../../models/staff/StaffHierarchy';
import { createDefaultCoachingTree } from '../../models/staff/CoachingTree';
import { createDefaultPersonality } from '../../models/staff/CoachPersonality';
import { createDefaultAttributes } from '../../models/staff/CoachAttributes';

// Helper to create a test coach
function createTestCoach(
  id: string,
  firstName: string,
  lastName: string,
  role: Coach['role']
): Coach {
  return {
    ...createDefaultCoach(id, firstName, lastName, role),
    tree: createDefaultCoachingTree(),
    personality: createDefaultPersonality(),
    attributes: createDefaultAttributes(),
  };
}

describe('Coaching Staff Manager', () => {
  let state: CoachingStaffState;
  let hierarchy: StaffHierarchy;

  beforeEach(() => {
    state = createCoachingStaffState('team-1');
    hierarchy = createEmptyStaffHierarchy('team-1', 25000000);
  });

  describe('createCoachingStaffState', () => {
    it('should create initial state', () => {
      expect(state.teamId).toBe('team-1');
      expect(state.coaches.size).toBe(0);
      expect(state.interimAssignments).toEqual([]);
      expect(state.coachingTreeRelationships).toEqual([]);
    });
  });

  describe('getVacancies', () => {
    it('should return all positions as vacant for empty hierarchy', () => {
      const vacancies = getVacancies(hierarchy);

      expect(vacancies.length).toBe(13); // All coaching positions
      expect(vacancies.find((v) => v.role === 'headCoach')).toBeDefined();
      expect(vacancies.find((v) => v.role === 'offensiveCoordinator')).toBeDefined();
    });

    it('should mark head coach vacancy as critical priority', () => {
      const vacancies = getVacancies(hierarchy);
      const hcVacancy = vacancies.find((v) => v.role === 'headCoach');

      expect(hcVacancy?.priority).toBe('critical');
    });

    it('should mark coordinator vacancies as important priority', () => {
      const vacancies = getVacancies(hierarchy);
      const ocVacancy = vacancies.find((v) => v.role === 'offensiveCoordinator');
      const dcVacancy = vacancies.find((v) => v.role === 'defensiveCoordinator');

      expect(ocVacancy?.priority).toBe('important');
      expect(dcVacancy?.priority).toBe('important');
    });
  });

  describe('hireCoach', () => {
    it('should add coach to state and hierarchy', () => {
      const coach = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');

      const result = hireCoach(state, hierarchy, coach, 'headCoach');

      expect(result.hierarchy.headCoach).toBe('coach-1');
      expect(result.state.coaches.has('coach-1')).toBe(true);
    });

    it('should update coach role and team', () => {
      const coach = createTestCoach('coach-1', 'John', 'Smith', 'qbCoach');

      const result = hireCoach(state, hierarchy, coach, 'headCoach');
      const hiredCoach = result.state.coaches.get('coach-1');

      expect(hiredCoach?.role).toBe('headCoach');
      expect(hiredCoach?.teamId).toBe('team-1');
      expect(hiredCoach?.isAvailable).toBe(false);
    });

    it('should throw if position is already filled', () => {
      const coach1 = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const coach2 = createTestCoach('coach-2', 'Jane', 'Doe', 'headCoach');

      const result = hireCoach(state, hierarchy, coach1, 'headCoach');

      expect(() => {
        hireCoach(result.state, result.hierarchy, coach2, 'headCoach');
      }).toThrow('Position headCoach is already filled');
    });

    it('should initialize years together matrix', () => {
      const coach1 = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const coach2 = createTestCoach('coach-2', 'Jane', 'Doe', 'offensiveCoordinator');

      let result = hireCoach(state, hierarchy, coach1, 'headCoach');
      result = hireCoach(result.state, result.hierarchy, coach2, 'offensiveCoordinator');

      expect(result.state.yearsTogetherMatrix.get('coach-1')?.get('coach-2')).toBe(0);
      expect(result.state.yearsTogetherMatrix.get('coach-2')?.get('coach-1')).toBe(0);
    });
  });

  describe('fireCoach', () => {
    it('should remove coach from state and hierarchy', () => {
      const coach = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      let result = hireCoach(state, hierarchy, coach, 'headCoach');

      result = fireCoach(result.state, result.hierarchy, 'coach-1');

      expect(result.hierarchy.headCoach).toBeNull();
      expect(result.state.coaches.has('coach-1')).toBe(false);
    });

    it('should throw if coach not found', () => {
      expect(() => {
        fireCoach(state, hierarchy, 'nonexistent');
      }).toThrow('Coach not found');
    });

    it('should remove from years together matrix', () => {
      const coach1 = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const coach2 = createTestCoach('coach-2', 'Jane', 'Doe', 'offensiveCoordinator');

      let result = hireCoach(state, hierarchy, coach1, 'headCoach');
      result = hireCoach(result.state, result.hierarchy, coach2, 'offensiveCoordinator');
      result = fireCoach(result.state, result.hierarchy, 'coach-1');

      expect(result.state.yearsTogetherMatrix.has('coach-1')).toBe(false);
      expect(result.state.yearsTogetherMatrix.get('coach-2')?.has('coach-1')).toBe(false);
    });
  });

  describe('getStaffCoaches', () => {
    it('should return all coaches on staff', () => {
      const coach1 = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const coach2 = createTestCoach('coach-2', 'Jane', 'Doe', 'offensiveCoordinator');

      let result = hireCoach(state, hierarchy, coach1, 'headCoach');
      result = hireCoach(result.state, result.hierarchy, coach2, 'offensiveCoordinator');

      const coaches = getStaffCoaches(result.state, result.hierarchy);

      expect(coaches.length).toBe(2);
      expect(coaches.map((c) => c.id)).toContain('coach-1');
      expect(coaches.map((c) => c.id)).toContain('coach-2');
    });
  });

  describe('getCoachByRole', () => {
    it('should return coach for filled position', () => {
      const coach = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const result = hireCoach(state, hierarchy, coach, 'headCoach');

      const found = getCoachByRole(result.state, result.hierarchy, 'headCoach');

      expect(found?.id).toBe('coach-1');
    });

    it('should return null for vacant position', () => {
      const found = getCoachByRole(state, hierarchy, 'headCoach');
      expect(found).toBeNull();
    });
  });

  describe('Interim Assignments', () => {
    it('should assign interim coach', () => {
      const coach = createTestCoach('coach-1', 'John', 'Smith', 'qbCoach');
      const result = hireCoach(state, hierarchy, coach, 'qbCoach');

      const newState = assignInterim(result.state, 'offensiveCoordinator', 'coach-1');

      expect(newState.interimAssignments.length).toBe(1);
      expect(newState.interimAssignments[0].vacantRole).toBe('offensiveCoordinator');
      expect(newState.interimAssignments[0].interimCoachId).toBe('coach-1');
      expect(newState.interimAssignments[0].originalRole).toBe('qbCoach');
    });

    it('should remove interim assignment', () => {
      const coach = createTestCoach('coach-1', 'John', 'Smith', 'qbCoach');
      const result = hireCoach(state, hierarchy, coach, 'qbCoach');

      let newState = assignInterim(result.state, 'offensiveCoordinator', 'coach-1');
      newState = removeInterim(newState, 'offensiveCoordinator');

      expect(newState.interimAssignments.length).toBe(0);
    });

    it('should get interim for role', () => {
      const coach = createTestCoach('coach-1', 'John', 'Smith', 'qbCoach');
      const result = hireCoach(state, hierarchy, coach, 'qbCoach');

      const newState = assignInterim(result.state, 'offensiveCoordinator', 'coach-1');
      const interim = getInterimForRole(newState, 'offensiveCoordinator');

      expect(interim?.interimCoachId).toBe('coach-1');
    });

    it('should return null when no interim assigned', () => {
      const interim = getInterimForRole(state, 'offensiveCoordinator');
      expect(interim).toBeNull();
    });
  });

  describe('calculateStaffChemistry', () => {
    it('should calculate chemistry for staff', () => {
      const coach1 = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const coach2 = createTestCoach('coach-2', 'Jane', 'Doe', 'offensiveCoordinator');

      let result = hireCoach(state, hierarchy, coach1, 'headCoach');
      result = hireCoach(result.state, result.hierarchy, coach2, 'offensiveCoordinator');

      const chemistry = calculateStaffChemistry(result.state, result.hierarchy);

      expect(chemistry.overallChemistry).toBeGreaterThanOrEqual(-10);
      expect(chemistry.overallChemistry).toBeLessThanOrEqual(10);
      expect(chemistry.details.length).toBeGreaterThan(0);
    });

    it('should return zero chemistry for empty staff', () => {
      const chemistry = calculateStaffChemistry(state, hierarchy);

      expect(chemistry.overallChemistry).toBe(0);
      expect(chemistry.details.length).toBe(0);
    });
  });

  describe('createStaffChemistryViewModel', () => {
    it('should create qualitative view model', () => {
      const coach1 = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const coach2 = createTestCoach('coach-2', 'Jane', 'Doe', 'offensiveCoordinator');

      let result = hireCoach(state, hierarchy, coach1, 'headCoach');
      result = hireCoach(result.state, result.hierarchy, coach2, 'offensiveCoordinator');

      const chemistry = calculateStaffChemistry(result.state, result.hierarchy);
      const viewModel = createStaffChemistryViewModel(chemistry, result.state.coaches);

      expect(['excellent', 'good', 'neutral', 'strained', 'toxic']).toContain(
        viewModel.staffHarmony
      );
      expect(viewModel.overallDescription).toBeDefined();
    });
  });

  describe('advanceStaffYear', () => {
    it('should increment years together', () => {
      const coach1 = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const coach2 = createTestCoach('coach-2', 'Jane', 'Doe', 'offensiveCoordinator');

      let result = hireCoach(state, hierarchy, coach1, 'headCoach');
      result = hireCoach(result.state, result.hierarchy, coach2, 'offensiveCoordinator');

      const advanced = advanceStaffYear(result.state);

      expect(advanced.yearsTogetherMatrix.get('coach-1')?.get('coach-2')).toBe(1);
    });
  });

  describe('buildCoachingTreeRelationships', () => {
    it('should build relationships for coaches', () => {
      const coach1 = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const coach2 = createTestCoach('coach-2', 'Jane', 'Doe', 'offensiveCoordinator');

      const relationships = buildCoachingTreeRelationships([coach1, coach2]);

      expect(relationships.length).toBe(2);
      expect(relationships[0].coachId).toBe('coach-1');
      expect(relationships[0].treeName).toBeDefined();
    });
  });

  describe('getSameTreeCoaches', () => {
    it('should return coaches from same tree', () => {
      const coach1 = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const coach2 = createTestCoach('coach-2', 'Jane', 'Doe', 'offensiveCoordinator');
      // Both have default tree name

      const sameTree = getSameTreeCoaches([coach1, coach2], coach1.tree.treeName);

      expect(sameTree.length).toBe(2);
    });
  });

  describe('hasMinimumCoachingStaff', () => {
    it('should return false for empty staff', () => {
      expect(hasMinimumCoachingStaff(hierarchy)).toBe(false);
    });

    it('should return false with only head coach', () => {
      const coach = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const result = hireCoach(state, hierarchy, coach, 'headCoach');

      expect(hasMinimumCoachingStaff(result.hierarchy)).toBe(false);
    });

    it('should return true with head coach and coordinator', () => {
      const hc = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const oc = createTestCoach('coach-2', 'Jane', 'Doe', 'offensiveCoordinator');

      let result = hireCoach(state, hierarchy, hc, 'headCoach');
      result = hireCoach(result.state, result.hierarchy, oc, 'offensiveCoordinator');

      expect(hasMinimumCoachingStaff(result.hierarchy)).toBe(true);
    });
  });

  describe('getStaffCompleteness', () => {
    it('should return 0 for empty staff', () => {
      expect(getStaffCompleteness(hierarchy)).toBe(0);
    });

    it('should calculate percentage correctly', () => {
      const coach = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const result = hireCoach(state, hierarchy, coach, 'headCoach');

      const completeness = getStaffCompleteness(result.hierarchy);
      expect(completeness).toBeGreaterThan(0);
      expect(completeness).toBeLessThan(100);
    });
  });

  describe('validateCoachingStaffState', () => {
    it('should validate empty state', () => {
      expect(validateCoachingStaffState(state)).toBe(true);
    });

    it('should validate state with coaches', () => {
      const coach = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const result = hireCoach(state, hierarchy, coach, 'headCoach');

      expect(validateCoachingStaffState(result.state)).toBe(true);
    });
  });

  describe('getCoachingStaffSummary', () => {
    it('should return summary for empty staff', () => {
      const summary = getCoachingStaffSummary(state, hierarchy);

      expect(summary.totalPositions).toBe(13);
      expect(summary.filledPositions).toBe(0);
      expect(summary.vacancies).toBe(13);
      expect(summary.hasHeadCoach).toBe(false);
    });

    it('should return summary for partial staff', () => {
      const hc = createTestCoach('coach-1', 'John', 'Smith', 'headCoach');
      const oc = createTestCoach('coach-2', 'Jane', 'Doe', 'offensiveCoordinator');

      let result = hireCoach(state, hierarchy, hc, 'headCoach');
      result = hireCoach(result.state, result.hierarchy, oc, 'offensiveCoordinator');

      const summary = getCoachingStaffSummary(result.state, result.hierarchy);

      expect(summary.filledPositions).toBe(2);
      expect(summary.vacancies).toBe(11);
      expect(summary.hasHeadCoach).toBe(true);
      expect(summary.hasOffensiveCoordinator).toBe(true);
      expect(summary.hasDefensiveCoordinator).toBe(false);
    });
  });
});
