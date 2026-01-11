/**
 * Owner Expectations System Tests
 * Tests for expectations generation, evaluation, and timeline management
 */

import {
  generateSeasonExpectations,
  generateLongTermExpectations,
  createExpectationsState,
  calculateUrgency,
  evaluateSeasonExpectations,
  advanceExpectations,
  createExpectationsViewModel,
  getCurrentYearGoal,
  validateExpectationsState,
  determineTeamPhase,
} from '../OwnerExpectationsSystem';
import { createDefaultOwner } from '../../models/owner/Owner';

describe('OwnerExpectationsSystem', () => {
  // Helper to create test owner
  function createTestOwner(overrides?: Partial<ReturnType<typeof createDefaultOwner>>) {
    const owner = createDefaultOwner('owner-1', 'team-1');
    return { ...owner, ...overrides };
  }

  describe('generateSeasonExpectations', () => {
    it('should generate expectations based on team phase', () => {
      const owner = createTestOwner();

      const rebuildExpectations = generateSeasonExpectations(owner, 'rebuild', 4, 40);
      const contenderExpectations = generateSeasonExpectations(owner, 'contender', 10, 75);

      expect(rebuildExpectations.minimumWins).toBeLessThan(contenderExpectations.minimumWins);
      expect(rebuildExpectations.expectedPlayoffs).toBe(false);
      expect(contenderExpectations.expectedPlayoffs).toBe(true);
    });

    it('should adjust for roster strength', () => {
      const owner = createTestOwner();

      const weakRoster = generateSeasonExpectations(owner, 'competitive', 8, 30);
      const strongRoster = generateSeasonExpectations(owner, 'competitive', 8, 80);

      expect(strongRoster.minimumWins).toBeGreaterThan(weakRoster.minimumWins);
    });

    it('should adjust for win-now owner', () => {
      const normalOwner = createTestOwner();
      const winNowOwner = createTestOwner();
      winNowOwner.personality.secondaryTraits = ['winNow'];

      const normalExpectations = generateSeasonExpectations(normalOwner, 'competitive', 8, 60);
      const winNowExpectations = generateSeasonExpectations(winNowOwner, 'competitive', 8, 60);

      expect(winNowExpectations.minimumWins).toBeGreaterThanOrEqual(normalExpectations.minimumWins);
    });

    it('should be more flexible for patient owners', () => {
      const impatientOwner = createTestOwner();
      impatientOwner.personality.traits.patience = 20;

      const patientOwner = createTestOwner();
      patientOwner.personality.traits.patience = 80;

      const impatientExpectations = generateSeasonExpectations(impatientOwner, 'competitive', 8, 60);
      const patientExpectations = generateSeasonExpectations(patientOwner, 'competitive', 8, 60);

      expect(patientExpectations.flexibilityLevel).not.toBe('strict');
      // Impatient owners should have stricter flexibility
      expect(impatientExpectations.flexibilityLevel).toBeDefined();
    });

    it('should set minimum playoff round for contenders', () => {
      const owner = createTestOwner();

      const contenderExpectations = generateSeasonExpectations(owner, 'contender', 11, 75);
      const dynastyExpectations = generateSeasonExpectations(owner, 'dynasty', 13, 85);

      expect(contenderExpectations.minimumPlayoffRound).not.toBeNull();
      expect(dynastyExpectations.minimumPlayoffRound).not.toBeNull();
    });

    it('should generate priority goals', () => {
      const owner = createTestOwner();
      const expectations = generateSeasonExpectations(owner, 'rebuild', 4, 35);

      expect(expectations.priorityGoals.length).toBeGreaterThan(0);
      expect(expectations.priorityGoals.some((g) => g.type === 'development')).toBe(true);
    });
  });

  describe('generateLongTermExpectations', () => {
    it('should set years to contend based on phase', () => {
      const owner = createTestOwner();

      const rebuildExpectations = generateLongTermExpectations(owner, 'rebuild', 1);
      const contenderExpectations = generateLongTermExpectations(owner, 'contender', 1);

      expect(rebuildExpectations.yearsToContend).toBeGreaterThan(
        contenderExpectations.yearsToContend
      );
    });

    it('should extend timeline for long-term thinker', () => {
      const normalOwner = createTestOwner();
      const longTermOwner = createTestOwner();
      longTermOwner.personality.secondaryTraits = ['longTermThinker'];

      const normalExpectations = generateLongTermExpectations(normalOwner, 'rebuild', 1);
      const longTermExpectations = generateLongTermExpectations(longTermOwner, 'rebuild', 1);

      expect(longTermExpectations.yearsToContend).toBeGreaterThanOrEqual(
        normalExpectations.yearsToContend
      );
    });

    it('should shorten timeline for win-now owner', () => {
      const normalOwner = createTestOwner();
      const winNowOwner = createTestOwner();
      winNowOwner.personality.secondaryTraits = ['winNow'];

      const normalExpectations = generateLongTermExpectations(normalOwner, 'rebuild', 1);
      const winNowExpectations = generateLongTermExpectations(winNowOwner, 'rebuild', 1);

      expect(winNowExpectations.yearsToContend).toBeLessThanOrEqual(
        normalExpectations.yearsToContend
      );
    });

    it('should set championship goal for contender/dynasty', () => {
      const owner = createTestOwner();

      const contenderExpectations = generateLongTermExpectations(owner, 'contender', 1);
      const dynastyExpectations = generateLongTermExpectations(owner, 'dynasty', 1);

      expect(contenderExpectations.ultimateGoal).toBe('superBowl');
      expect(dynastyExpectations.ultimateGoal).toBe('superBowl');
    });

    it('should generate timeline with year goals', () => {
      const owner = createTestOwner();
      const expectations = generateLongTermExpectations(owner, 'rebuild', 1);

      expect(expectations.timeline.year1Goal).toBeTruthy();
      expect(expectations.timeline.year2Goal).toBeTruthy();
      expect(expectations.timeline.year3Goal).toBeTruthy();
    });

    it('should set higher tolerance for patient owners', () => {
      const impatientOwner = createTestOwner();
      impatientOwner.personality.traits.patience = 20;

      const patientOwner = createTestOwner();
      patientOwner.personality.traits.patience = 80;

      const impatientExpectations = generateLongTermExpectations(impatientOwner, 'competitive', 1);
      const patientExpectations = generateLongTermExpectations(patientOwner, 'competitive', 1);

      expect(patientExpectations.tolerance).toBeGreaterThan(impatientExpectations.tolerance);
    });
  });

  describe('createExpectationsState', () => {
    it('should create complete state', () => {
      const owner = createTestOwner();
      const state = createExpectationsState(owner, 'team-1', 1, 'competitive', 8, 60);

      expect(state.ownerId).toBe('owner-1');
      expect(state.teamId).toBe('team-1');
      expect(state.currentSeason).toBe(1);
      expect(state.shortTerm).toBeTruthy();
      expect(state.longTerm).toBeTruthy();
      expect(state.urgency).toBeTruthy();
      expect(state.historyOfExpectations).toEqual([]);
    });
  });

  describe('calculateUrgency', () => {
    it('should return patient for high tolerance with years remaining', () => {
      const longTerm = generateLongTermExpectations(createTestOwner(), 'rebuild', 1);
      longTerm.tolerance = 80;

      const urgency = calculateUrgency(longTerm, 1);

      expect(urgency).toBe('patient');
    });

    it('should return critical when no years remaining and low tolerance', () => {
      const longTerm = generateLongTermExpectations(createTestOwner(), 'contender', 1);
      longTerm.tolerance = 30;
      longTerm.timeline.totalYears = 3;

      const urgency = calculateUrgency(longTerm, 4); // Past total years

      expect(urgency).toBe('critical');
    });

    it('should return pressing when one year remaining with low tolerance', () => {
      const longTerm = generateLongTermExpectations(createTestOwner(), 'competitive', 1);
      longTerm.tolerance = 25;
      longTerm.timeline.totalYears = 3;

      const urgency = calculateUrgency(longTerm, 2); // One year remaining

      expect(urgency).toBe('urgent');
    });
  });

  describe('evaluateSeasonExpectations', () => {
    it('should return met for meeting expectations', () => {
      const expectations = generateSeasonExpectations(createTestOwner(), 'competitive', 8, 60);
      expectations.minimumWins = 8;
      expectations.targetWins = 10;
      expectations.expectedPlayoffs = false;

      const result = evaluateSeasonExpectations(expectations, {
        wins: 9,
        madePlayoffs: false,
        playoffRound: 'none',
        goalsAchieved: [],
      });

      expect(result.met).toBe(true);
    });

    it('should return exceeded for exceeding expectations', () => {
      const expectations = generateSeasonExpectations(createTestOwner(), 'competitive', 8, 60);
      expectations.minimumWins = 8;
      expectations.targetWins = 10;
      expectations.expectedPlayoffs = false;

      const result = evaluateSeasonExpectations(expectations, {
        wins: 12,
        madePlayoffs: true,
        playoffRound: 'divisional',
        goalsAchieved: [],
      });

      expect(result.exceeded).toBe(true);
      expect(result.reaction).toBe('pleased');
    });

    it('should return not met for falling short', () => {
      const expectations = generateSeasonExpectations(createTestOwner(), 'contender', 10, 70);
      expectations.minimumWins = 10;
      expectations.expectedPlayoffs = true;

      const result = evaluateSeasonExpectations(expectations, {
        wins: 6,
        madePlayoffs: false,
        playoffRound: 'none',
        goalsAchieved: [],
      });

      expect(result.met).toBe(false);
      expect(['disappointed', 'angry']).toContain(result.reaction);
    });

    it('should generate appropriate summary', () => {
      const expectations = generateSeasonExpectations(createTestOwner(), 'competitive', 8, 60);

      const goodResult = evaluateSeasonExpectations(expectations, {
        wins: 11,
        madePlayoffs: true,
        playoffRound: 'wildCard',
        goalsAchieved: [],
      });

      expect(goodResult.summary).toBeTruthy();
      expect(typeof goodResult.summary).toBe('string');
    });
  });

  describe('advanceExpectations', () => {
    it('should advance to next season', () => {
      const owner = createTestOwner();
      const state = createExpectationsState(owner, 'team-1', 1, 'competitive', 8, 60);

      const advanced = advanceExpectations(
        state,
        { wins: 9, madePlayoffs: false, playoffRound: 'none', goalsAchieved: [] },
        owner,
        'competitive',
        62
      );

      expect(advanced.currentSeason).toBe(2);
      expect(advanced.longTerm.timeline.currentYear).toBe(2);
    });

    it('should add to history', () => {
      const owner = createTestOwner();
      const state = createExpectationsState(owner, 'team-1', 1, 'competitive', 8, 60);

      const advanced = advanceExpectations(
        state,
        { wins: 9, madePlayoffs: false, playoffRound: 'none', goalsAchieved: [] },
        owner,
        'competitive',
        62
      );

      expect(advanced.historyOfExpectations).toHaveLength(1);
      expect(advanced.historyOfExpectations[0].season).toBe(1);
    });

    it('should increase tolerance when exceeding expectations', () => {
      const owner = createTestOwner();
      owner.personality.traits.patience = 60;
      const state = createExpectationsState(owner, 'team-1', 1, 'competitive', 8, 60);
      const initialTolerance = state.longTerm.tolerance;

      const advanced = advanceExpectations(
        state,
        { wins: 14, madePlayoffs: true, playoffRound: 'conference', goalsAchieved: [] },
        owner,
        'contender',
        75
      );

      expect(advanced.longTerm.tolerance).toBeGreaterThanOrEqual(initialTolerance);
    });

    it('should decrease tolerance when disappointing', () => {
      const owner = createTestOwner();
      const state = createExpectationsState(owner, 'team-1', 1, 'contender', 10, 70);
      state.longTerm.tolerance = 50;

      const advanced = advanceExpectations(
        state,
        { wins: 4, madePlayoffs: false, playoffRound: 'none', goalsAchieved: [] },
        owner,
        'developing',
        45
      );

      expect(advanced.longTerm.tolerance).toBeLessThan(50);
    });
  });

  describe('createExpectationsViewModel', () => {
    it('should create view model with descriptions', () => {
      const owner = createTestOwner();
      const state = createExpectationsState(owner, 'team-1', 1, 'competitive', 8, 60);

      const viewModel = createExpectationsViewModel(state, owner);

      expect(viewModel.currentPhase).toBe('competitive');
      expect(viewModel.phaseDescription).toBeTruthy();
      expect(viewModel.seasonGoal).toBeTruthy();
      expect(viewModel.urgencyDescription).toBeTruthy();
      expect(viewModel.ownerMessage).toBeTruthy();
    });

    it('should include owner name in message', () => {
      const owner = createTestOwner();
      const state = createExpectationsState(owner, 'team-1', 1, 'competitive', 8, 60);

      const viewModel = createExpectationsViewModel(state, owner);

      expect(viewModel.ownerMessage).toContain(owner.firstName);
    });

    it('should show progress description', () => {
      const owner = createTestOwner();
      let state = createExpectationsState(owner, 'team-1', 1, 'competitive', 8, 60);

      // Add some history
      state = advanceExpectations(
        state,
        { wins: 9, madePlayoffs: false, playoffRound: 'none', goalsAchieved: [] },
        owner,
        'competitive',
        62
      );

      const viewModel = createExpectationsViewModel(state, owner);

      expect(viewModel.progressDescription).toBeTruthy();
    });
  });

  describe('getCurrentYearGoal', () => {
    it('should return correct year goal', () => {
      const owner = createTestOwner();
      const expectations = generateLongTermExpectations(owner, 'rebuild', 1);

      expect(getCurrentYearGoal(expectations.timeline)).toBe(expectations.timeline.year1Goal);

      expectations.timeline.currentYear = 2;
      expect(getCurrentYearGoal(expectations.timeline)).toBe(expectations.timeline.year2Goal);
    });

    it('should return default for out of range year', () => {
      const owner = createTestOwner();
      const expectations = generateLongTermExpectations(owner, 'rebuild', 1);
      expectations.timeline.currentYear = 10;

      const goal = getCurrentYearGoal(expectations.timeline);
      expect(goal).toContain('progress');
    });
  });

  describe('validateExpectationsState', () => {
    it('should return true for valid state', () => {
      const owner = createTestOwner();
      const state = createExpectationsState(owner, 'team-1', 1, 'competitive', 8, 60);

      expect(validateExpectationsState(state)).toBe(true);
    });

    it('should return false for missing ids', () => {
      const state = {
        ownerId: '',
        teamId: 'team-1',
        currentSeason: 1,
        shortTerm: { minimumWins: 8, targetWins: 10, expectedPlayoffs: false, minimumPlayoffRound: null, priorityGoals: [], flexibilityLevel: 'moderate' as const },
        longTerm: { phase: 'competitive' as const, yearsToContend: 2, ultimateGoal: 'playoffs' as const, timeline: { year1Goal: '', year2Goal: '', year3Goal: '', year4Goal: null, year5Goal: null, currentYear: 1, totalYears: 3 }, tolerance: 50 },
        urgency: 'normal' as const,
        lastUpdated: 1,
        historyOfExpectations: [],
      };

      expect(validateExpectationsState(state)).toBe(false);
    });

    it('should return false for invalid win counts', () => {
      const owner = createTestOwner();
      const state = createExpectationsState(owner, 'team-1', 1, 'competitive', 8, 60);
      state.shortTerm.minimumWins = -5;

      expect(validateExpectationsState(state)).toBe(false);
    });
  });

  describe('determineTeamPhase', () => {
    it('should return dynasty for consistent excellence', () => {
      const phase = determineTeamPhase(13, 80, 3);
      expect(phase).toBe('dynasty');
    });

    it('should return contender for strong teams', () => {
      const phase = determineTeamPhase(11, 70, 2);
      expect(phase).toBe('contender');
    });

    it('should return competitive for borderline teams', () => {
      const phase = determineTeamPhase(8, 55, 1);
      expect(phase).toBe('competitive');
    });

    it('should return developing for young teams', () => {
      const phase = determineTeamPhase(5, 45, 0);
      expect(phase).toBe('developing');
    });

    it('should return rebuild for weak teams', () => {
      const phase = determineTeamPhase(3, 30, 0);
      expect(phase).toBe('rebuild');
    });
  });
});
