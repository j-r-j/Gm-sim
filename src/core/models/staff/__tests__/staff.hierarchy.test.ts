/**
 * Staff Hierarchy Tests
 * Tests for staff hierarchy structure, budget calculations, and reporting structure
 */

import {
  createEmptyStaffHierarchy,
  getCoachingPositionKeys,
  getScoutingPositionKeys,
  countFilledCoachingPositions,
  countFilledScoutingPositions,
  getVacantCoachingPositions,
  getVacantScoutingPositions,
  updateBudget,
  validateStaffHierarchy,
  getDirectReports,
  hasMinimumStaff,
  getStaffHierarchySummary,
  COACHING_REPORTS_TO,
  SCOUTING_REPORTS_TO,
} from '../StaffHierarchy';
import {
  COACH_SALARY_RANGES,
  SCOUT_SALARY_RANGES,
  STAFF_BUDGET_TIERS,
  ALL_COACH_ROLES,
  ALL_SCOUT_ROLES,
} from '../StaffSalary';

describe('Staff Hierarchy', () => {
  describe('Total positions', () => {
    it('should have 13 coaching positions', () => {
      const coachingKeys = getCoachingPositionKeys();
      expect(coachingKeys.length).toBe(13);
    });

    it('should have 8 scouting positions', () => {
      const scoutingKeys = getScoutingPositionKeys();
      expect(scoutingKeys.length).toBe(8);
    });

    it('should have 21 total staff positions', () => {
      const coachingKeys = getCoachingPositionKeys();
      const scoutingKeys = getScoutingPositionKeys();
      expect(coachingKeys.length + scoutingKeys.length).toBe(21);
    });

    it('should include all expected coaching positions', () => {
      const coachingKeys = getCoachingPositionKeys();
      const expectedPositions = [
        'headCoach',
        'offensiveCoordinator',
        'defensiveCoordinator',
        'specialTeamsCoordinator',
        'qbCoach',
        'rbCoach',
        'wrCoach',
        'teCoach',
        'olCoach',
        'dlCoach',
        'lbCoach',
        'dbCoach',
        'stCoach',
      ];

      for (const position of expectedPositions) {
        expect(coachingKeys).toContain(position);
      }
    });

    it('should include all expected scouting positions', () => {
      const scoutingKeys = getScoutingPositionKeys();
      const expectedPositions = [
        'scoutingDirector',
        'nationalScout',
        'regionalScoutNortheast',
        'regionalScoutSoutheast',
        'regionalScoutMidwest',
        'regionalScoutWest',
        'regionalScoutSouthwest',
        'proScout',
      ];

      for (const position of expectedPositions) {
        expect(scoutingKeys).toContain(position);
      }
    });
  });

  describe('createEmptyStaffHierarchy', () => {
    it('should create hierarchy with all positions null', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);

      expect(hierarchy.teamId).toBe('team-1');
      expect(hierarchy.headCoach).toBeNull();
      expect(hierarchy.offensiveCoordinator).toBeNull();
      expect(hierarchy.scoutingDirector).toBeNull();
      expect(hierarchy.nationalScout).toBeNull();
    });

    it('should set initial budget correctly', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);

      expect(hierarchy.staffBudget).toBe(25_000_000);
      expect(hierarchy.coachingSpend).toBe(0);
      expect(hierarchy.scoutingSpend).toBe(0);
      expect(hierarchy.remainingBudget).toBe(25_000_000);
    });
  });

  describe('Position counting', () => {
    it('should count filled coaching positions correctly', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      expect(countFilledCoachingPositions(hierarchy)).toBe(0);

      hierarchy.headCoach = 'coach-1';
      hierarchy.offensiveCoordinator = 'coach-2';
      expect(countFilledCoachingPositions(hierarchy)).toBe(2);
    });

    it('should count filled scouting positions correctly', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      expect(countFilledScoutingPositions(hierarchy)).toBe(0);

      hierarchy.scoutingDirector = 'scout-1';
      hierarchy.nationalScout = 'scout-2';
      hierarchy.regionalScoutSoutheast = 'scout-3';
      expect(countFilledScoutingPositions(hierarchy)).toBe(3);
    });
  });

  describe('Vacant positions', () => {
    it('should return all coaching positions when empty', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      const vacant = getVacantCoachingPositions(hierarchy);

      expect(vacant.length).toBe(13);
      expect(vacant).toContain('headCoach');
    });

    it('should exclude filled positions from vacant list', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      hierarchy.headCoach = 'coach-1';
      hierarchy.offensiveCoordinator = 'coach-2';

      const vacant = getVacantCoachingPositions(hierarchy);
      expect(vacant.length).toBe(11);
      expect(vacant).not.toContain('headCoach');
      expect(vacant).not.toContain('offensiveCoordinator');
    });

    it('should return all scouting positions when empty', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      const vacant = getVacantScoutingPositions(hierarchy);

      expect(vacant.length).toBe(8);
      expect(vacant).toContain('scoutingDirector');
    });
  });

  describe('Budget calculations', () => {
    it('should update budget correctly', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      const updated = updateBudget(hierarchy, 15_000_000, 3_000_000);

      expect(updated.coachingSpend).toBe(15_000_000);
      expect(updated.scoutingSpend).toBe(3_000_000);
      expect(updated.remainingBudget).toBe(7_000_000);
    });

    it('should calculate remaining budget accurately', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 30_000_000);
      const updated = updateBudget(hierarchy, 20_000_000, 5_000_000);

      expect(updated.remainingBudget).toBe(5_000_000);
    });
  });

  describe('validateStaffHierarchy', () => {
    it('should validate a valid hierarchy', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      expect(validateStaffHierarchy(hierarchy)).toBe(true);
    });

    it('should reject negative budget', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', -1000);
      expect(validateStaffHierarchy(hierarchy)).toBe(false);
    });

    it('should reject spending exceeding budget', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 20_000_000);
      hierarchy.coachingSpend = 15_000_000;
      hierarchy.scoutingSpend = 10_000_000; // Total 25M > 20M budget
      hierarchy.remainingBudget = -5_000_000;

      expect(validateStaffHierarchy(hierarchy)).toBe(false);
    });

    it('should reject incorrect remaining budget calculation', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      hierarchy.coachingSpend = 10_000_000;
      hierarchy.scoutingSpend = 5_000_000;
      hierarchy.remainingBudget = 20_000_000; // Should be 10M

      expect(validateStaffHierarchy(hierarchy)).toBe(false);
    });
  });

  describe('Reporting structure', () => {
    it('should have head coach report to GM', () => {
      expect(COACHING_REPORTS_TO.headCoach).toBe('gm');
    });

    it('should have coordinators report to head coach', () => {
      expect(COACHING_REPORTS_TO.offensiveCoordinator).toBe('headCoach');
      expect(COACHING_REPORTS_TO.defensiveCoordinator).toBe('headCoach');
      expect(COACHING_REPORTS_TO.specialTeamsCoordinator).toBe('headCoach');
    });

    it('should have offensive position coaches report to OC', () => {
      expect(COACHING_REPORTS_TO.qbCoach).toBe('offensiveCoordinator');
      expect(COACHING_REPORTS_TO.rbCoach).toBe('offensiveCoordinator');
      expect(COACHING_REPORTS_TO.wrCoach).toBe('offensiveCoordinator');
      expect(COACHING_REPORTS_TO.teCoach).toBe('offensiveCoordinator');
      expect(COACHING_REPORTS_TO.olCoach).toBe('offensiveCoordinator');
    });

    it('should have defensive position coaches report to DC', () => {
      expect(COACHING_REPORTS_TO.dlCoach).toBe('defensiveCoordinator');
      expect(COACHING_REPORTS_TO.lbCoach).toBe('defensiveCoordinator');
      expect(COACHING_REPORTS_TO.dbCoach).toBe('defensiveCoordinator');
    });

    it('should have ST coach report to STC', () => {
      expect(COACHING_REPORTS_TO.stCoach).toBe('specialTeamsCoordinator');
    });

    it('should have scouting director report to GM', () => {
      expect(SCOUTING_REPORTS_TO.scoutingDirector).toBe('gm');
    });

    it('should have all scouts report to scouting director', () => {
      expect(SCOUTING_REPORTS_TO.nationalScout).toBe('scoutingDirector');
      expect(SCOUTING_REPORTS_TO.regionalScout).toBe('scoutingDirector');
      expect(SCOUTING_REPORTS_TO.proScout).toBe('scoutingDirector');
    });
  });

  describe('getDirectReports', () => {
    it('should return coordinators for head coach', () => {
      const reports = getDirectReports('headCoach');

      expect(reports).toContain('offensiveCoordinator');
      expect(reports).toContain('defensiveCoordinator');
      expect(reports).toContain('specialTeamsCoordinator');
      expect(reports.length).toBe(3);
    });

    it('should return offensive position coaches for OC', () => {
      const reports = getDirectReports('offensiveCoordinator');

      expect(reports).toContain('qbCoach');
      expect(reports).toContain('rbCoach');
      expect(reports).toContain('wrCoach');
      expect(reports).toContain('teCoach');
      expect(reports).toContain('olCoach');
      expect(reports.length).toBe(5);
    });

    it('should return defensive position coaches for DC', () => {
      const reports = getDirectReports('defensiveCoordinator');

      expect(reports).toContain('dlCoach');
      expect(reports).toContain('lbCoach');
      expect(reports).toContain('dbCoach');
      expect(reports.length).toBe(3);
    });

    it('should return ST coach for STC', () => {
      const reports = getDirectReports('specialTeamsCoordinator');

      expect(reports).toContain('stCoach');
      expect(reports.length).toBe(1);
    });

    it('should return empty array for position coaches', () => {
      const reports = getDirectReports('qbCoach');
      expect(reports.length).toBe(0);
    });
  });

  describe('hasMinimumStaff', () => {
    it('should return false with no staff', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      expect(hasMinimumStaff(hierarchy)).toBe(false);
    });

    it('should return false with only head coach', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      hierarchy.headCoach = 'coach-1';

      expect(hasMinimumStaff(hierarchy)).toBe(false);
    });

    it('should return true with head coach and OC', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      hierarchy.headCoach = 'coach-1';
      hierarchy.offensiveCoordinator = 'coach-2';

      expect(hasMinimumStaff(hierarchy)).toBe(true);
    });

    it('should return true with head coach and DC', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      hierarchy.headCoach = 'coach-1';
      hierarchy.defensiveCoordinator = 'coach-2';

      expect(hasMinimumStaff(hierarchy)).toBe(true);
    });
  });

  describe('getStaffHierarchySummary', () => {
    it('should return correct summary for empty hierarchy', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 25_000_000);
      const summary = getStaffHierarchySummary(hierarchy);

      expect(summary.coachingFilled).toBe(0);
      expect(summary.coachingTotal).toBe(13);
      expect(summary.scoutingFilled).toBe(0);
      expect(summary.scoutingTotal).toBe(8);
      expect(summary.budgetUsed).toBe(0);
      expect(summary.budgetTotal).toBe(25_000_000);
    });

    it('should return correct summary for partially filled hierarchy', () => {
      const hierarchy = createEmptyStaffHierarchy('team-1', 30_000_000);
      hierarchy.headCoach = 'coach-1';
      hierarchy.offensiveCoordinator = 'coach-2';
      hierarchy.defensiveCoordinator = 'coach-3';
      hierarchy.scoutingDirector = 'scout-1';
      hierarchy.coachingSpend = 18_000_000;
      hierarchy.scoutingSpend = 2_000_000;
      hierarchy.remainingBudget = 10_000_000;

      const summary = getStaffHierarchySummary(hierarchy);

      expect(summary.coachingFilled).toBe(3);
      expect(summary.scoutingFilled).toBe(1);
      expect(summary.budgetUsed).toBe(20_000_000);
    });
  });
});

describe('Salary Ranges', () => {
  it('should have head coach salary range 8M-18M', () => {
    expect(COACH_SALARY_RANGES.headCoach.min).toBe(8_000_000);
    expect(COACH_SALARY_RANGES.headCoach.max).toBe(18_000_000);
  });

  it('should have coordinator salary ranges 2M-6M', () => {
    expect(COACH_SALARY_RANGES.offensiveCoordinator.min).toBe(2_000_000);
    expect(COACH_SALARY_RANGES.offensiveCoordinator.max).toBe(6_000_000);
    expect(COACH_SALARY_RANGES.defensiveCoordinator.min).toBe(2_000_000);
    expect(COACH_SALARY_RANGES.defensiveCoordinator.max).toBe(6_000_000);
  });

  it('should have all coach roles defined', () => {
    for (const role of ALL_COACH_ROLES) {
      expect(COACH_SALARY_RANGES[role]).toBeDefined();
      expect(COACH_SALARY_RANGES[role].min).toBeGreaterThan(0);
      expect(COACH_SALARY_RANGES[role].max).toBeGreaterThan(COACH_SALARY_RANGES[role].min);
    }
  });

  it('should have all scout roles defined', () => {
    for (const role of ALL_SCOUT_ROLES) {
      expect(SCOUT_SALARY_RANGES[role]).toBeDefined();
      expect(SCOUT_SALARY_RANGES[role].min).toBeGreaterThan(0);
      expect(SCOUT_SALARY_RANGES[role].max).toBeGreaterThan(SCOUT_SALARY_RANGES[role].min);
    }
  });

  it('should have scouting director at top of scout salary', () => {
    const directorMax = SCOUT_SALARY_RANGES.scoutingDirector.max;

    expect(directorMax).toBeGreaterThan(SCOUT_SALARY_RANGES.nationalScout.max);
    expect(directorMax).toBeGreaterThan(SCOUT_SALARY_RANGES.regionalScout.max);
    expect(directorMax).toBeGreaterThan(SCOUT_SALARY_RANGES.proScout.max);
  });
});

describe('Budget Tiers', () => {
  it('should have elite tier 35M-40M', () => {
    expect(STAFF_BUDGET_TIERS.elite.min).toBe(35_000_000);
    expect(STAFF_BUDGET_TIERS.elite.max).toBe(40_000_000);
  });

  it('should have all tiers in descending order', () => {
    expect(STAFF_BUDGET_TIERS.elite.min).toBeGreaterThan(STAFF_BUDGET_TIERS.high.min);
    expect(STAFF_BUDGET_TIERS.high.min).toBeGreaterThan(STAFF_BUDGET_TIERS.mid.min);
    expect(STAFF_BUDGET_TIERS.mid.min).toBeGreaterThan(STAFF_BUDGET_TIERS.low.min);
    expect(STAFF_BUDGET_TIERS.low.min).toBeGreaterThan(STAFF_BUDGET_TIERS.bottom.min);
  });
});
