/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Coach ViewModel Tests
 * Tests that CoachViewModel properly hides sensitive attributes
 */

import { Coach, createDefaultCoach, createCoachViewModel } from '../Coach';
import { createCoachContract } from '../CoachContract';
import { createDefaultOffensiveTendencies } from '../CoordinatorTendencies';

describe('CoachViewModel', () => {
  let testCoach: Coach;

  beforeEach(() => {
    testCoach = createDefaultCoach('coach-1', 'Bill', 'Johnson', 'offensiveCoordinator');

    // Set up contract
    testCoach.contract = createCoachContract({
      id: 'contract-1',
      coachId: 'coach-1',
      teamId: 'team-1',
      yearsTotal: 4,
      salaryPerYear: 5_000_000,
      guaranteedMoney: 12_000_000,
      startYear: 2024,
    });

    // Set up tendencies
    testCoach.tendencies = createDefaultOffensiveTendencies();

    // Set up chemistry values
    testCoach.playerChemistry = {
      'player-1': 5,
      'player-2': -3,
    };
    testCoach.staffChemistry = {
      'coach-2': 7,
      'coach-3': -2,
    };

    // Set up career history
    testCoach.careerHistory = [
      {
        teamId: 'team-1',
        teamName: 'Team A',
        role: 'offensiveCoordinator',
        yearStart: 2020,
        yearEnd: 2023,
        wins: 40,
        losses: 24,
        playoffAppearances: 2,
        championships: 1,
        achievements: ['Coach of the Year'],
      },
    ];
  });

  describe('createCoachViewModel', () => {
    it('should include public information', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect(viewModel.id).toBe('coach-1');
      expect(viewModel.fullName).toBe('Bill Johnson');
      expect(viewModel.role).toBe('offensiveCoordinator');
      expect(viewModel.teamName).toBe('Team A');
    });

    it('should include tree information', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect(viewModel.tree).toBeDefined();
      expect(viewModel.tree.name).toBe(testCoach.tree.treeName);
      expect(viewModel.tree.generation).toBe(testCoach.tree.generation);
    });

    it('should include personality type', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect(viewModel.personalityType).toBe(testCoach.personality.primary);
    });

    it('should calculate career totals correctly', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect(viewModel.careerWins).toBe(40);
      expect(viewModel.careerLosses).toBe(24);
      expect(viewModel.championships).toBe(1);
    });

    it('should NOT expose development attribute', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      // TypeScript ensures we can't access these, but we verify the structure
      expect('development' in viewModel).toBe(false);
      expect((viewModel as any).development).toBeUndefined();
    });

    it('should NOT expose gameDayIQ attribute', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect('gameDayIQ' in viewModel).toBe(false);
      expect((viewModel as any).gameDayIQ).toBeUndefined();
    });

    it('should NOT expose playerChemistry', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect('playerChemistry' in viewModel).toBe(false);
      expect((viewModel as any).playerChemistry).toBeUndefined();
    });

    it('should NOT expose staffChemistry', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect('staffChemistry' in viewModel).toBe(false);
      expect((viewModel as any).staffChemistry).toBeUndefined();
    });

    it('should NOT expose ego directly', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect('ego' in viewModel).toBe(false);
      expect((viewModel as any).ego).toBeUndefined();
    });

    it('should show tendencies as description, not raw numbers', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect(viewModel.tendenciesDescription).toBeDefined();
      expect(typeof viewModel.tendenciesDescription).toBe('string');

      // Should not contain raw numbers from tendencies
      expect(viewModel.tendenciesDescription).not.toMatch(/\d{2}%/);

      // Should not expose runPassSplit directly
      expect('runPassSplit' in viewModel).toBe(false);
    });

    it('should show contract details for own team', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect(viewModel.contractYearsRemaining).toBe(4);
      expect(viewModel.salary).toBe(5_000_000);
    });

    it('should hide contract details for other teams', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', false);

      expect(viewModel.contractYearsRemaining).toBeNull();
      expect(viewModel.salary).toBeNull();
    });

    it('should show attributes view model with limited info', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect(viewModel.attributesView).toBeDefined();
      expect(viewModel.attributesView.yearsExperience).toBeDefined();
      expect(viewModel.attributesView.age).toBeDefined();
      expect(viewModel.attributesView.reputationTier).toBeDefined();

      // Should not expose internal attributes
      expect('development' in viewModel.attributesView).toBe(false);
      expect('gameDayIQ' in viewModel.attributesView).toBe(false);
    });
  });

  describe('ViewModel completeness', () => {
    it('should have all expected public fields', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      const expectedFields = [
        'id',
        'fullName',
        'role',
        'teamName',
        'scheme',
        'tree',
        'personalityType',
        'yearsExperience',
        'age',
        'attributesView',
        'tendenciesDescription',
        'careerWins',
        'careerLosses',
        'championships',
        'contractYearsRemaining',
        'salary',
      ];

      for (const field of expectedFields) {
        expect(field in viewModel).toBe(true);
      }
    });

    it('should NOT have any hidden fields', () => {
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      const hiddenFields = [
        'development',
        'gameDayIQ',
        'schemeTeaching',
        'playerEvaluation',
        'talentID',
        'motivation',
        'playerChemistry',
        'staffChemistry',
        'ego',
        'adaptability',
        'tendencies', // Raw tendencies object
        'attributes', // Full attributes object
      ];

      for (const field of hiddenFields) {
        expect(field in viewModel).toBe(false);
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle coach without contract', () => {
      testCoach.contract = null;
      const viewModel = createCoachViewModel(testCoach, null, true);

      expect(viewModel.contractYearsRemaining).toBeNull();
      expect(viewModel.salary).toBeNull();
    });

    it('should handle coach without tendencies', () => {
      testCoach.tendencies = null;
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect(viewModel.tendenciesDescription).toBeNull();
    });

    it('should handle coach without team', () => {
      testCoach.teamId = null;
      const viewModel = createCoachViewModel(testCoach, null, false);

      expect(viewModel.teamName).toBeNull();
    });

    it('should handle empty career history', () => {
      testCoach.careerHistory = [];
      const viewModel = createCoachViewModel(testCoach, 'Team A', true);

      expect(viewModel.careerWins).toBe(0);
      expect(viewModel.careerLosses).toBe(0);
      expect(viewModel.championships).toBe(0);
    });
  });
});
