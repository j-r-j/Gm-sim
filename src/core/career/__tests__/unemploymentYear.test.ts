/**
 * Unemployment Year Tests
 * Tests for handling seasons without a GM position
 */

import {
  createUnemploymentState,
  startUnemploymentYear,
  generateMediaNarrative,
  simulateUnemploymentWeek,
  generateConsultantOpportunity,
  acceptConsultantOpportunity,
  completeConsultantJob,
  calculateUnemploymentReputationDecay,
  endUnemploymentYear,
  decideToRetire,
  getUnemploymentSummary,
  validateUnemploymentState,
  UnemploymentState,
} from '../UnemploymentYear';
import { JobOpening } from '../JobMarketManager';

describe('UnemploymentYear', () => {
  // Helper to create test opening
  function createTestOpening(overrides?: Partial<JobOpening>): JobOpening {
    return {
      id: 'opening-1',
      teamId: 'team-1',
      teamName: 'Tigers',
      teamCity: 'Test City',
      conference: 'AFC',
      division: 'North',
      reason: 'fired',
      dateOpened: 19,
      yearOpened: 2025,
      situation: 'mediocre',
      lastSeasonRecord: { wins: 8, losses: 9 },
      playoffAppearancesLast5Years: 1,
      championshipsLast10Years: 0,
      currentRosterTalent: 50,
      ownerName: 'John Smith',
      ownerPatience: 'moderate',
      ownerSpending: 'moderate',
      ownerControl: 'moderate',
      marketSize: 'medium',
      prestige: 50,
      fanbaseExpectations: 'moderate',
      isFilled: false,
      filledByPlayerId: null,
      ...overrides,
    };
  }

  describe('createUnemploymentState', () => {
    it('should create initial state with defaults', () => {
      const state = createUnemploymentState(2025);

      expect(state.year).toBe(2025);
      expect(state.currentWeek).toBe(0);
      expect(state.consecutiveYearsUnemployed).toBe(0);
      expect(state.events).toHaveLength(0);
      expect(state.isWatchingFromSidelines).toBe(true);
      expect(state.hasDecidedToRetire).toBe(false);
    });
  });

  describe('startUnemploymentYear', () => {
    it('should increment consecutive years when starting from previous state', () => {
      const previousState = createUnemploymentState(2024);
      previousState.consecutiveYearsUnemployed = 1;

      const newState = startUnemploymentYear(previousState, 2025);

      expect(newState.year).toBe(2025);
      expect(newState.consecutiveYearsUnemployed).toBe(2);
    });

    it('should start at 1 when no previous state', () => {
      const newState = startUnemploymentYear(null, 2025);

      expect(newState.consecutiveYearsUnemployed).toBe(1);
    });

    it('should reset weekly tracking', () => {
      const previousState = createUnemploymentState(2024);
      previousState.events = [{ id: 'old', type: 'media_speculation', week: 5, year: 2024, headline: 'Test', description: 'Test' }];

      const newState = startUnemploymentYear(previousState, 2025);

      expect(newState.currentWeek).toBe(0);
      expect(newState.events).toHaveLength(0);
    });
  });

  describe('generateMediaNarrative', () => {
    it('should return positive narrative for champion on gap year', () => {
      const narrative = generateMediaNarrative(80, 1, 2);
      expect(narrative.toLowerCase()).toContain('championship');
    });

    it('should return positive narrative for high reputation first year', () => {
      const narrative = generateMediaNarrative(75, 1, 0);
      expect(narrative.toLowerCase()).toContain('well-regarded');
    });

    it('should return concerning narrative for long unemployment', () => {
      const narrative = generateMediaNarrative(50, 3, 0);
      expect(narrative.toLowerCase()).toContain('struggling');
    });

    it('should return negative narrative for low reputation', () => {
      const narrative = generateMediaNarrative(30, 1, 0);
      expect(narrative.toLowerCase()).toContain('limited');
    });
  });

  describe('simulateUnemploymentWeek', () => {
    it('should generate events for new openings', () => {
      const state = createUnemploymentState(2025);
      const newOpenings = [createTestOpening()];

      const result = simulateUnemploymentWeek(state, newOpenings, []);

      expect(result.events.some((e) => e.type === 'opening_announced')).toBe(true);
      expect(result.newOpeningsThisYear).toContain('opening-1');
    });

    it('should generate events for filled openings', () => {
      const state = createUnemploymentState(2025);
      const filledOpening = { ...createTestOpening(), isFilled: true };

      const result = simulateUnemploymentWeek(state, [], [filledOpening]);

      expect(result.events.some((e) => e.type === 'opening_filled')).toBe(true);
      expect(result.filledOpeningsThisYear).toContain('opening-1');
    });

    it('should advance the week', () => {
      const state = createUnemploymentState(2025);
      const result = simulateUnemploymentWeek(state, [], []);

      expect(result.currentWeek).toBe(1);
    });

    it('should generate season milestone events', () => {
      // Week 1 is when season starts (milestone at week 1)
      const state = { ...createUnemploymentState(2025), currentWeek: 0 };
      const result = simulateUnemploymentWeek(state, [], []);

      // After advancing from week 0 to week 1, we should get the season start milestone
      expect(result.currentWeek).toBe(1);
      expect(result.events.some((e) => e.type === 'season_milestone')).toBe(true);
    });

    it('should not duplicate events for same opening', () => {
      let state = createUnemploymentState(2025);
      const opening = createTestOpening();

      state = simulateUnemploymentWeek(state, [opening], []);
      state = simulateUnemploymentWeek(state, [opening], []);

      const openingEvents = state.events.filter((e) => e.type === 'opening_announced');
      expect(openingEvents).toHaveLength(1);
    });
  });

  describe('generateConsultantOpportunity', () => {
    it('should create opportunity with correct structure', () => {
      const opportunity = generateConsultantOpportunity('team-1', 'Test Tigers', 70);

      expect(opportunity.teamId).toBe('team-1');
      expect(opportunity.teamName).toBe('Test Tigers');
      expect(opportunity.compensation).toBeGreaterThan(0);
      expect(opportunity.durationWeeks).toBe(4);
      expect(opportunity.accepted).toBe(false);
    });

    it('should scale compensation with reputation', () => {
      const lowRep = generateConsultantOpportunity('team-1', 'Team', 30);
      const highRep = generateConsultantOpportunity('team-1', 'Team', 90);

      expect(highRep.compensation).toBeGreaterThan(lowRep.compensation);
    });

    it('should scale reputation bonus with reputation', () => {
      const lowRep = generateConsultantOpportunity('team-1', 'Team', 30);
      const highRep = generateConsultantOpportunity('team-1', 'Team', 90);

      expect(highRep.reputationBonus).toBeGreaterThan(lowRep.reputationBonus);
    });
  });

  describe('acceptConsultantOpportunity', () => {
    it('should accept opportunity and set as active', () => {
      let state = createUnemploymentState(2025);
      const opportunity = generateConsultantOpportunity('team-1', 'Test Tigers', 50);
      state = { ...state, consultantOpportunities: [opportunity] };

      const result = acceptConsultantOpportunity(state, opportunity.id);

      expect(result.activeConsultantJob).not.toBeNull();
      expect(result.activeConsultantJob?.accepted).toBe(true);
      expect(result.totalReputationChange).toBe(opportunity.reputationBonus);
    });

    it('should generate event for accepting', () => {
      let state = createUnemploymentState(2025);
      const opportunity = generateConsultantOpportunity('team-1', 'Test Tigers', 50);
      state = { ...state, consultantOpportunities: [opportunity] };

      const result = acceptConsultantOpportunity(state, opportunity.id);

      expect(result.events.some((e) => e.type === 'consultant_offer')).toBe(true);
    });

    it('should not accept if already have active job', () => {
      let state = createUnemploymentState(2025);
      const opp1 = generateConsultantOpportunity('team-1', 'Team 1', 50);
      const opp2 = generateConsultantOpportunity('team-2', 'Team 2', 50);
      state = { ...state, consultantOpportunities: [opp1, opp2] };

      state = acceptConsultantOpportunity(state, opp1.id);
      const result = acceptConsultantOpportunity(state, opp2.id);

      // Should still only have first job
      expect(result.activeConsultantJob?.id).toBe(opp1.id);
    });
  });

  describe('completeConsultantJob', () => {
    it('should clear active job', () => {
      let state = createUnemploymentState(2025);
      const opportunity = generateConsultantOpportunity('team-1', 'Test Tigers', 50);
      state = { ...state, consultantOpportunities: [opportunity] };
      state = acceptConsultantOpportunity(state, opportunity.id);

      const result = completeConsultantJob(state);

      expect(result.activeConsultantJob).toBeNull();
    });

    it('should generate completion event', () => {
      let state = createUnemploymentState(2025);
      const opportunity = generateConsultantOpportunity('team-1', 'Test Tigers', 50);
      state = { ...state, consultantOpportunities: [opportunity] };
      state = acceptConsultantOpportunity(state, opportunity.id);

      const result = completeConsultantJob(state);

      expect(result.events.some((e) =>
        e.type === 'consultant_offer' && e.headline.includes('Complete')
      )).toBe(true);
    });

    it('should do nothing if no active job', () => {
      const state = createUnemploymentState(2025);
      const result = completeConsultantJob(state);

      expect(result).toEqual(state);
    });
  });

  describe('calculateUnemploymentReputationDecay', () => {
    it('should calculate 3% decay per year', () => {
      const decay1Year = calculateUnemploymentReputationDecay(100, 1);
      expect(decay1Year).toBe(3);

      const decay2Years = calculateUnemploymentReputationDecay(100, 2);
      expect(decay2Years).toBe(6);
    });

    it('should cap at 15% maximum decay', () => {
      const decayManyYears = calculateUnemploymentReputationDecay(100, 10);
      expect(decayManyYears).toBe(15);
    });

    it('should scale with base reputation', () => {
      const highRep = calculateUnemploymentReputationDecay(100, 1);
      const lowRep = calculateUnemploymentReputationDecay(50, 1);

      expect(highRep).toBeGreaterThan(lowRep);
    });
  });

  describe('endUnemploymentYear', () => {
    it('should return reputation change and summary', () => {
      const state = createUnemploymentState(2025);
      state.consecutiveYearsUnemployed = 1;

      const result = endUnemploymentYear(state);

      expect(typeof result.reputationChange).toBe('number');
      expect(result.summary).toBeTruthy();
    });

    it('should include consultant work in summary', () => {
      let state = createUnemploymentState(2025);
      const opportunity = generateConsultantOpportunity('team-1', 'Test Tigers', 50);
      state = { ...state, consultantOpportunities: [opportunity] };
      state = acceptConsultantOpportunity(state, opportunity.id);

      const result = endUnemploymentYear(state);

      expect(result.summary.toLowerCase()).toContain('consulting');
    });

    it('should have different message for long unemployment', () => {
      const state1Year = createUnemploymentState(2025);
      state1Year.consecutiveYearsUnemployed = 1;

      const state3Years = createUnemploymentState(2025);
      state3Years.consecutiveYearsUnemployed = 3;

      const result1 = endUnemploymentYear(state1Year);
      const result3 = endUnemploymentYear(state3Years);

      expect(result1.summary).not.toBe(result3.summary);
    });
  });

  describe('decideToRetire', () => {
    it('should set retirement flag', () => {
      const state = createUnemploymentState(2025);
      const result = decideToRetire(state);

      expect(result.hasDecidedToRetire).toBe(true);
    });

    it('should generate retirement event', () => {
      const state = createUnemploymentState(2025);
      const result = decideToRetire(state);

      expect(result.events.some((e) =>
        e.headline.toLowerCase().includes('step away')
      )).toBe(true);
    });
  });

  describe('getUnemploymentSummary', () => {
    it('should return correct counts', () => {
      let state = createUnemploymentState(2025);
      state = simulateUnemploymentWeek(state, [createTestOpening({ id: 'op-1' })], []);
      state = simulateUnemploymentWeek(state, [], [createTestOpening({ id: 'op-2', isFilled: true })]);

      const summary = getUnemploymentSummary(state);

      expect(summary.openingsWatched).toBe(1);
      expect(summary.opportunitiesMissed).toBe(1);
      expect(summary.eventsCount).toBeGreaterThan(0);
    });

    it('should track consultant work', () => {
      let state = createUnemploymentState(2025);
      const opportunity = generateConsultantOpportunity('team-1', 'Team', 50);
      state = { ...state, consultantOpportunities: [opportunity] };
      state = acceptConsultantOpportunity(state, opportunity.id);

      const summary = getUnemploymentSummary(state);

      expect(summary.consultantWorkDone).toBe(true);
    });
  });

  describe('validateUnemploymentState', () => {
    it('should validate valid state', () => {
      const state = createUnemploymentState(2025);
      expect(validateUnemploymentState(state)).toBe(true);
    });

    it('should reject invalid year', () => {
      const state = { ...createUnemploymentState(2025), year: 1900 };
      expect(validateUnemploymentState(state)).toBe(false);
    });

    it('should reject negative week', () => {
      const state = { ...createUnemploymentState(2025), currentWeek: -1 };
      expect(validateUnemploymentState(state)).toBe(false);
    });

    it('should reject negative unemployment years', () => {
      const state = { ...createUnemploymentState(2025), consecutiveYearsUnemployed: -1 };
      expect(validateUnemploymentState(state)).toBe(false);
    });
  });
});
