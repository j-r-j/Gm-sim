/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Coach Model Tests
 * Tests for Coach entity validation, coaching tree chemistry, and personality conflicts
 */

import {
  createDefaultCoach,
  validateCoach,
  getCoachFullName,
  isCoordinator,
  getCareerWinningPercentage,
} from '../Coach';
import {
  CoachingTree,
  calculateTreeChemistry,
  validateCoachingTree,
  createDefaultCoachingTree,
  DEFAULT_TREE_CHEMISTRY,
} from '../CoachingTree';
import {
  CoachPersonality,
  hasPersonalityConflict,
  hasPersonalitySynergy,
  calculatePersonalityChemistry,
  validatePersonality,
  createDefaultPersonality,
  PERSONALITY_CONFLICTS,
} from '../CoachPersonality';
import {
  createCoachContract,
  calculateDeadMoney,
  validateContract,
  advanceContractYear,
} from '../CoachContract';

describe('Coach Entity', () => {
  describe('createDefaultCoach', () => {
    it('should create a coach with all required fields', () => {
      const coach = createDefaultCoach('coach-1', 'John', 'Smith', 'headCoach');

      expect(coach.id).toBe('coach-1');
      expect(coach.firstName).toBe('John');
      expect(coach.lastName).toBe('Smith');
      expect(coach.role).toBe('headCoach');
      expect(coach.teamId).toBeNull();
      expect(coach.scheme).toBeNull();
      expect(coach.tree).toBeDefined();
      expect(coach.personality).toBeDefined();
      expect(coach.attributes).toBeDefined();
      expect(coach.tendencies).toBeNull();
      expect(coach.contract).toBeNull();
      expect(coach.careerHistory).toEqual([]);
      expect(coach.playerChemistry).toEqual({});
      expect(coach.staffChemistry).toEqual({});
      expect(coach.isAvailable).toBe(true);
      expect(coach.isRetired).toBe(false);
      expect(coach.interviewRequests).toEqual([]);
    });
  });

  describe('validateCoach', () => {
    it('should validate a valid coach', () => {
      const coach = createDefaultCoach('coach-1', 'John', 'Smith', 'headCoach');
      expect(validateCoach(coach)).toBe(true);
    });

    it('should reject coach without ID', () => {
      const coach = createDefaultCoach('', 'John', 'Smith', 'headCoach');
      expect(validateCoach(coach)).toBe(false);
    });

    it('should reject coach without first name', () => {
      const coach = createDefaultCoach('coach-1', '', 'Smith', 'headCoach');
      expect(validateCoach(coach)).toBe(false);
    });

    it('should reject coach without last name', () => {
      const coach = createDefaultCoach('coach-1', 'John', '', 'headCoach');
      expect(validateCoach(coach)).toBe(false);
    });

    it('should reject chemistry values outside -10 to 10 range', () => {
      const coach = createDefaultCoach('coach-1', 'John', 'Smith', 'headCoach');
      coach.playerChemistry['player-1'] = 15; // Invalid
      expect(validateCoach(coach)).toBe(false);
    });

    it('should reject negative chemistry values below -10', () => {
      const coach = createDefaultCoach('coach-1', 'John', 'Smith', 'headCoach');
      coach.staffChemistry['coach-2'] = -15; // Invalid
      expect(validateCoach(coach)).toBe(false);
    });
  });

  describe('getCoachFullName', () => {
    it('should return full name', () => {
      const coach = createDefaultCoach('coach-1', 'John', 'Smith', 'headCoach');
      expect(getCoachFullName(coach)).toBe('John Smith');
    });
  });

  describe('isCoordinator', () => {
    it('should return true for offensive coordinator', () => {
      const coach = createDefaultCoach('coach-1', 'John', 'Smith', 'offensiveCoordinator');
      expect(isCoordinator(coach)).toBe(true);
    });

    it('should return true for defensive coordinator', () => {
      const coach = createDefaultCoach('coach-1', 'John', 'Smith', 'defensiveCoordinator');
      expect(isCoordinator(coach)).toBe(true);
    });

    it('should return false for head coach', () => {
      const coach = createDefaultCoach('coach-1', 'John', 'Smith', 'headCoach');
      expect(isCoordinator(coach)).toBe(false);
    });
  });

  describe('getCareerWinningPercentage', () => {
    it('should return null for no career history', () => {
      const coach = createDefaultCoach('coach-1', 'John', 'Smith', 'headCoach');
      expect(getCareerWinningPercentage(coach)).toBeNull();
    });

    it('should calculate winning percentage correctly', () => {
      const coach = createDefaultCoach('coach-1', 'John', 'Smith', 'headCoach');
      coach.careerHistory = [
        {
          teamId: 'team-1',
          teamName: 'Team A',
          role: 'headCoach',
          yearStart: 2020,
          yearEnd: 2022,
          wins: 30,
          losses: 18,
          playoffAppearances: 2,
          championships: 1,
          achievements: [],
        },
      ];
      expect(getCareerWinningPercentage(coach)).toBeCloseTo(0.625, 3);
    });
  });
});

describe('Coaching Tree', () => {
  describe('validateCoachingTree', () => {
    it('should validate a valid coaching tree', () => {
      const tree = createDefaultCoachingTree();
      expect(validateCoachingTree(tree)).toBe(true);
    });

    it('should reject invalid tree name', () => {
      const tree = createDefaultCoachingTree();
      (tree as any).treeName = 'invalid';
      expect(validateCoachingTree(tree)).toBe(false);
    });

    it('should reject invalid generation', () => {
      const tree = createDefaultCoachingTree();
      (tree as any).generation = 5;
      expect(validateCoachingTree(tree)).toBe(false);
    });

    it('should reject invalid risk tolerance', () => {
      const tree = createDefaultCoachingTree();
      (tree as any).philosophy.riskTolerance = 'invalid';
      expect(validateCoachingTree(tree)).toBe(false);
    });
  });

  describe('calculateTreeChemistry', () => {
    it('should return highest chemistry for same tree, same generation', () => {
      const tree1: CoachingTree = {
        treeName: 'walsh',
        generation: 2,
        mentorId: null,
        philosophy: {
          offensiveTendency: 'passing',
          defensiveTendency: 'zone',
          riskTolerance: 'balanced',
        },
      };
      const tree2: CoachingTree = {
        treeName: 'walsh',
        generation: 2,
        mentorId: null,
        philosophy: {
          offensiveTendency: 'passing',
          defensiveTendency: 'zone',
          riskTolerance: 'balanced',
        },
      };

      const chemistry = calculateTreeChemistry(tree1, tree2);
      expect(chemistry).toEqual(DEFAULT_TREE_CHEMISTRY.sameTreeSameGen);
    });

    it('should return good chemistry for same tree, adjacent generation', () => {
      const tree1: CoachingTree = {
        treeName: 'belichick',
        generation: 2,
        mentorId: null,
        philosophy: {
          offensiveTendency: 'balanced',
          defensiveTendency: 'aggressive',
          riskTolerance: 'conservative',
        },
      };
      const tree2: CoachingTree = {
        treeName: 'belichick',
        generation: 3,
        mentorId: null,
        philosophy: {
          offensiveTendency: 'balanced',
          defensiveTendency: 'aggressive',
          riskTolerance: 'conservative',
        },
      };

      const chemistry = calculateTreeChemistry(tree1, tree2);
      expect(chemistry).toEqual(DEFAULT_TREE_CHEMISTRY.sameTreeAdjacentGen);
    });

    it('should return negative chemistry for conflicting trees', () => {
      const tree1: CoachingTree = {
        treeName: 'walsh',
        generation: 2,
        mentorId: null,
        philosophy: {
          offensiveTendency: 'passing',
          defensiveTendency: 'zone',
          riskTolerance: 'balanced',
        },
      };
      const tree2: CoachingTree = {
        treeName: 'parcells',
        generation: 2,
        mentorId: null,
        philosophy: {
          offensiveTendency: 'running',
          defensiveTendency: 'man',
          riskTolerance: 'conservative',
        },
      };

      const chemistry = calculateTreeChemistry(tree1, tree2);
      expect(chemistry).toEqual(DEFAULT_TREE_CHEMISTRY.conflictingTrees);
    });

    it('should return negative chemistry for opposing philosophies', () => {
      const tree1: CoachingTree = {
        treeName: 'gruden',
        generation: 2,
        mentorId: null,
        philosophy: {
          offensiveTendency: 'passing',
          defensiveTendency: 'zone',
          riskTolerance: 'aggressive',
        },
      };
      const tree2: CoachingTree = {
        treeName: 'payton',
        generation: 2,
        mentorId: null,
        philosophy: {
          offensiveTendency: 'running',
          defensiveTendency: 'man',
          riskTolerance: 'conservative',
        },
      };

      const chemistry = calculateTreeChemistry(tree1, tree2);
      expect(chemistry).toEqual(DEFAULT_TREE_CHEMISTRY.opposingPhilosophy);
    });
  });
});

describe('Coach Personality', () => {
  describe('validatePersonality', () => {
    it('should validate a valid personality', () => {
      const personality = createDefaultPersonality();
      expect(validatePersonality(personality)).toBe(true);
    });

    it('should reject invalid primary type', () => {
      const personality = createDefaultPersonality();
      (personality as any).primary = 'invalid';
      expect(validatePersonality(personality)).toBe(false);
    });

    it('should reject ego outside 1-100 range', () => {
      const personality = createDefaultPersonality();
      personality.ego = 0;
      expect(validatePersonality(personality)).toBe(false);
    });

    it('should reject adaptability outside 1-100 range', () => {
      const personality = createDefaultPersonality();
      personality.adaptability = 101;
      expect(validatePersonality(personality)).toBe(false);
    });
  });

  describe('hasPersonalityConflict', () => {
    it('should detect conflict between analytical and aggressive', () => {
      expect(hasPersonalityConflict('analytical', 'aggressive')).toBe(true);
    });

    it('should detect conflict between conservative and innovative', () => {
      expect(hasPersonalityConflict('conservative', 'innovative')).toBe(true);
    });

    it('should not detect conflict for playersCoach', () => {
      expect(hasPersonalityConflict('playersCoach', 'aggressive')).toBe(false);
    });
  });

  describe('hasPersonalitySynergy', () => {
    it('should detect synergy between analytical and innovative', () => {
      expect(hasPersonalitySynergy('analytical', 'innovative')).toBe(true);
    });

    it('should detect synergy between playersCoach and aggressive', () => {
      expect(hasPersonalitySynergy('playersCoach', 'aggressive')).toBe(true);
    });
  });

  describe('calculatePersonalityChemistry', () => {
    it('should return negative chemistry for conflicting personalities', () => {
      const personality1: CoachPersonality = {
        primary: 'analytical',
        secondary: null,
        ego: 50,
        adaptability: 50,
        conflictsWith: PERSONALITY_CONFLICTS.analytical,
        synergizesWith: [],
      };
      const personality2: CoachPersonality = {
        primary: 'aggressive',
        secondary: null,
        ego: 50,
        adaptability: 50,
        conflictsWith: PERSONALITY_CONFLICTS.aggressive,
        synergizesWith: [],
      };

      const chemistry = calculatePersonalityChemistry(personality1, personality2);
      expect(chemistry).toBeLessThan(0);
    });

    it('should return extra negative chemistry for high ego coaches', () => {
      // Use types that neither conflict nor synergize (oldSchool and aggressive)
      const personality1: CoachPersonality = {
        primary: 'oldSchool',
        secondary: null,
        ego: 85,
        adaptability: 50,
        conflictsWith: PERSONALITY_CONFLICTS.oldSchool,
        synergizesWith: [],
      };
      const personality2: CoachPersonality = {
        primary: 'aggressive',
        secondary: null,
        ego: 90,
        adaptability: 50,
        conflictsWith: PERSONALITY_CONFLICTS.aggressive,
        synergizesWith: [],
      };

      const chemistry = calculatePersonalityChemistry(personality1, personality2);
      expect(chemistry).toBe(-3); // Only ego clash penalty, no conflict or synergy
    });
  });
});

describe('Coach Contract', () => {
  describe('createCoachContract', () => {
    it('should create a valid contract', () => {
      const contract = createCoachContract({
        id: 'contract-1',
        coachId: 'coach-1',
        teamId: 'team-1',
        yearsTotal: 4,
        salaryPerYear: 10_000_000,
        guaranteedMoney: 25_000_000,
        signingBonus: 5_000_000,
        startYear: 2024,
      });

      expect(contract.id).toBe('contract-1');
      expect(contract.yearsTotal).toBe(4);
      expect(contract.yearsRemaining).toBe(4);
      expect(contract.endYear).toBe(2027);
      expect(contract.deadMoneyIfFired).toBe(25_000_000);
    });
  });

  describe('validateContract', () => {
    it('should validate a valid contract', () => {
      const contract = createCoachContract({
        id: 'contract-1',
        coachId: 'coach-1',
        teamId: 'team-1',
        yearsTotal: 4,
        salaryPerYear: 10_000_000,
        guaranteedMoney: 25_000_000,
        startYear: 2024,
      });

      expect(validateContract(contract)).toBe(true);
    });

    it('should reject contract with more than 5 years', () => {
      const contract = createCoachContract({
        id: 'contract-1',
        coachId: 'coach-1',
        teamId: 'team-1',
        yearsTotal: 6,
        salaryPerYear: 10_000_000,
        guaranteedMoney: 25_000_000,
        startYear: 2024,
      });

      expect(validateContract(contract)).toBe(false);
    });

    it('should reject contract with negative salary', () => {
      const contract = createCoachContract({
        id: 'contract-1',
        coachId: 'coach-1',
        teamId: 'team-1',
        yearsTotal: 4,
        salaryPerYear: -1,
        guaranteedMoney: 25_000_000,
        startYear: 2024,
      });

      expect(validateContract(contract)).toBe(false);
    });
  });

  describe('calculateDeadMoney', () => {
    it('should calculate dead money correctly', () => {
      const contract = createCoachContract({
        id: 'contract-1',
        coachId: 'coach-1',
        teamId: 'team-1',
        yearsTotal: 4,
        salaryPerYear: 10_000_000,
        guaranteedMoney: 20_000_000,
        startYear: 2024,
      });

      // Full contract: 20M / 4 years * 4 remaining = 20M
      expect(calculateDeadMoney(contract)).toBe(20_000_000);

      // After one year: 20M / 4 years * 3 remaining = 15M
      const advancedContract = advanceContractYear(contract);
      expect(calculateDeadMoney(advancedContract!)).toBe(15_000_000);
    });
  });

  describe('advanceContractYear', () => {
    it('should reduce years remaining', () => {
      const contract = createCoachContract({
        id: 'contract-1',
        coachId: 'coach-1',
        teamId: 'team-1',
        yearsTotal: 4,
        salaryPerYear: 10_000_000,
        guaranteedMoney: 20_000_000,
        startYear: 2024,
      });

      const advanced = advanceContractYear(contract);
      expect(advanced?.yearsRemaining).toBe(3);
    });

    it('should return null when contract expires', () => {
      const contract = createCoachContract({
        id: 'contract-1',
        coachId: 'coach-1',
        teamId: 'team-1',
        yearsTotal: 1,
        salaryPerYear: 10_000_000,
        guaranteedMoney: 5_000_000,
        startYear: 2024,
      });

      const advanced = advanceContractYear(contract);
      expect(advanced).toBeNull();
    });
  });
});
