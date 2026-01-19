/**
 * Tests for NewGameCandidateGenerator
 */

import {
  generateHiringCandidates,
  createCandidateContract,
  calculateTotalStaffSalary,
  candidateFitsInBudget,
  getMinimumSalaryForRole,
  getMinimumTotalBudget,
  HiringCandidate,
} from '../NewGameCandidateGenerator';
import { generateCoach } from '../CoachGenerator';
import { ALL_OFFENSIVE_SCHEMES, ALL_DEFENSIVE_SCHEMES } from '../../models/player/SchemeFit';
import { COACH_SALARY_RANGES } from '../../models/staff/StaffSalary';

describe('NewGameCandidateGenerator', () => {
  describe('generateHiringCandidates', () => {
    it('should generate the requested number of candidates', () => {
      const candidates = generateHiringCandidates('headCoach', { count: 7 });
      expect(candidates.length).toBe(7);
    });

    it('should cover all offensive schemes for head coach', () => {
      const candidates = generateHiringCandidates('headCoach', { count: 7 });
      const schemes = candidates.map((c) => c.coach.scheme);

      for (const scheme of ALL_OFFENSIVE_SCHEMES) {
        expect(schemes).toContain(scheme);
      }
    });

    it('should cover all offensive schemes for offensive coordinator', () => {
      const candidates = generateHiringCandidates('offensiveCoordinator', { count: 7 });
      const schemes = candidates.map((c) => c.coach.scheme);

      for (const scheme of ALL_OFFENSIVE_SCHEMES) {
        expect(schemes).toContain(scheme);
      }
    });

    it('should cover all defensive schemes for defensive coordinator', () => {
      const candidates = generateHiringCandidates('defensiveCoordinator', { count: 7 });
      const schemes = candidates.map((c) => c.coach.scheme);

      for (const scheme of ALL_DEFENSIVE_SCHEMES) {
        expect(schemes).toContain(scheme);
      }
    });

    it('should include varied reputation tiers', () => {
      const candidates = generateHiringCandidates('headCoach', { count: 7 });
      const reputations = candidates.map((c) => c.reputationDisplay);
      const uniqueReputations = new Set(reputations);

      // Should have at least 2 different reputation tiers
      expect(uniqueReputations.size).toBeGreaterThanOrEqual(2);
    });

    it('should generate complete candidate data', () => {
      const candidates = generateHiringCandidates('headCoach', { count: 7 });

      for (const candidate of candidates) {
        expect(candidate.coach).toBeTruthy();
        expect(candidate.writeup).toBeTruthy();
        expect(candidate.writeup.length).toBeGreaterThan(50);
        expect(candidate.strengths.length).toBeGreaterThanOrEqual(2);
        expect(candidate.weaknesses.length).toBeGreaterThanOrEqual(1);
        expect(candidate.schemeDisplay).toBeTruthy();
        expect(candidate.treeDisplay).toBeTruthy();
        expect(candidate.personalityDisplay).toBeTruthy();
        expect(candidate.reputationDisplay).toBeTruthy();
        expect(candidate.expectedSalary).toBeGreaterThan(0);
        expect(candidate.expectedYears).toBeGreaterThanOrEqual(3);
        expect(['high', 'medium', 'low']).toContain(candidate.interestLevel);
      }
    });

    it('should sort candidates by reputation tier (elite first)', () => {
      const candidates = generateHiringCandidates('headCoach', { count: 7 });

      // First candidates should be higher tier
      const tierOrder = ['Legendary', 'Elite', 'Established', 'Rising Star', 'Unknown'];

      for (let i = 0; i < candidates.length - 1; i++) {
        const currentIdx = tierOrder.indexOf(candidates[i].reputationDisplay);
        const nextIdx = tierOrder.indexOf(candidates[i + 1].reputationDisplay);
        expect(currentIdx).toBeLessThanOrEqual(nextIdx);
      }
    });

    it('should include existing staff when provided', () => {
      const existingHC = generateCoach('headCoach', 'team-buf', 2025);
      existingHC.scheme = 'westCoast'; // Set a specific scheme

      const candidates = generateHiringCandidates('headCoach', {
        count: 7,
        existingStaff: [existingHC],
      });

      // Should find the former staff member
      const formerStaff = candidates.find((c) => c.isFormerStaff);
      expect(formerStaff).toBeTruthy();
      expect(formerStaff!.coach.firstName).toBe(existingHC.firstName);
      expect(formerStaff!.coach.lastName).toBe(existingHC.lastName);
    });

    it('should mark former staff with isFormerStaff flag', () => {
      const existingCoaches = [
        generateCoach('headCoach', 'team-buf', 2025),
        generateCoach('offensiveCoordinator', 'team-buf', 2025),
      ];

      const candidates = generateHiringCandidates('headCoach', {
        count: 7,
        existingStaff: existingCoaches,
      });

      const formerStaffCount = candidates.filter((c) => c.isFormerStaff).length;
      // Both HC and OC can be HC candidates (OC could be promoted)
      expect(formerStaffCount).toBeGreaterThanOrEqual(1);
    });

    it('should generate valid salary expectations within range', () => {
      const candidates = generateHiringCandidates('headCoach', { count: 7 });
      const range = COACH_SALARY_RANGES.headCoach;

      for (const candidate of candidates) {
        expect(candidate.expectedSalary).toBeGreaterThanOrEqual(range.min);
        expect(candidate.expectedSalary).toBeLessThanOrEqual(range.max);
      }
    });

    it('should generate valid salary expectations for coordinators', () => {
      const ocCandidates = generateHiringCandidates('offensiveCoordinator', { count: 7 });
      const dcCandidates = generateHiringCandidates('defensiveCoordinator', { count: 7 });

      const ocRange = COACH_SALARY_RANGES.offensiveCoordinator;
      const dcRange = COACH_SALARY_RANGES.defensiveCoordinator;

      for (const candidate of ocCandidates) {
        expect(candidate.expectedSalary).toBeGreaterThanOrEqual(ocRange.min);
        expect(candidate.expectedSalary).toBeLessThanOrEqual(ocRange.max);
      }

      for (const candidate of dcCandidates) {
        expect(candidate.expectedSalary).toBeGreaterThanOrEqual(dcRange.min);
        expect(candidate.expectedSalary).toBeLessThanOrEqual(dcRange.max);
      }
    });
  });

  describe('createCandidateContract', () => {
    it('should create a valid contract for a candidate', () => {
      const candidates = generateHiringCandidates('headCoach', { count: 1 });
      const candidate = candidates[0];

      const hiredCoach = createCandidateContract(candidate, 'team-buf', 2025);

      expect(hiredCoach.teamId).toBe('team-buf');
      expect(hiredCoach.contract).toBeTruthy();
      expect(hiredCoach.contract!.yearsTotal).toBe(candidate.expectedYears);
      expect(hiredCoach.contract!.salaryPerYear).toBe(candidate.expectedSalary);
      expect(hiredCoach.contract!.startYear).toBe(2025);
      expect(hiredCoach.isAvailable).toBe(false);
    });
  });

  describe('calculateTotalStaffSalary', () => {
    it('should sum all candidate salaries', () => {
      const candidates: HiringCandidate[] = [
        { expectedSalary: 10000000 } as HiringCandidate,
        { expectedSalary: 4000000 } as HiringCandidate,
        { expectedSalary: 4000000 } as HiringCandidate,
      ];

      expect(calculateTotalStaffSalary(candidates)).toBe(18000000);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotalStaffSalary([])).toBe(0);
    });
  });

  describe('candidateFitsInBudget', () => {
    it('should return true when salary is within budget', () => {
      const candidate = { expectedSalary: 5000000 } as HiringCandidate;
      expect(candidateFitsInBudget(candidate, 10000000)).toBe(true);
    });

    it('should return true when salary equals budget', () => {
      const candidate = { expectedSalary: 5000000 } as HiringCandidate;
      expect(candidateFitsInBudget(candidate, 5000000)).toBe(true);
    });

    it('should return false when salary exceeds budget', () => {
      const candidate = { expectedSalary: 15000000 } as HiringCandidate;
      expect(candidateFitsInBudget(candidate, 10000000)).toBe(false);
    });
  });

  describe('getMinimumSalaryForRole', () => {
    it('should return correct minimum for head coach', () => {
      expect(getMinimumSalaryForRole('headCoach')).toBe(COACH_SALARY_RANGES.headCoach.min);
    });

    it('should return correct minimum for offensive coordinator', () => {
      expect(getMinimumSalaryForRole('offensiveCoordinator')).toBe(
        COACH_SALARY_RANGES.offensiveCoordinator.min
      );
    });

    it('should return correct minimum for defensive coordinator', () => {
      expect(getMinimumSalaryForRole('defensiveCoordinator')).toBe(
        COACH_SALARY_RANGES.defensiveCoordinator.min
      );
    });
  });

  describe('getMinimumTotalBudget', () => {
    it('should return sum of all minimums', () => {
      const expected =
        COACH_SALARY_RANGES.headCoach.min +
        COACH_SALARY_RANGES.offensiveCoordinator.min +
        COACH_SALARY_RANGES.defensiveCoordinator.min;

      expect(getMinimumTotalBudget()).toBe(expected);
    });

    it('should be at least 12 million', () => {
      // HC min (8M) + OC min (2M) + DC min (2M) = 12M
      expect(getMinimumTotalBudget()).toBeGreaterThanOrEqual(12000000);
    });
  });
});
