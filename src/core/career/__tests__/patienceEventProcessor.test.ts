/**
 * Patience Event Processor Tests
 * Tests for event processing and patience updates
 */

import {
  getEventImpactRange,
  calculateEventImpact,
  processPatienceEvent,
  processMultipleEvents,
  generateSeasonEvents,
  processSeasonEnd,
  createDemandComplianceEvent,
  createPREvent,
  createPersonnelEvent,
  createGameResultEvent,
  calculateCumulativeImpact,
  getSupportedEventTypes,
  validatePatienceEvent,
  PatienceEvent,
  SeasonResultContext,
} from '../PatienceEventProcessor';
import { createPatienceMeterState } from '../PatienceMeterManager';
import { createDefaultOwner } from '../../models/owner/Owner';

describe('PatienceEventProcessor', () => {
  // Helper to create test owner
  function createTestOwner(overrides?: Partial<ReturnType<typeof createDefaultOwner>>) {
    const owner = createDefaultOwner('owner-1', 'team-1');
    return { ...owner, ...overrides };
  }

  describe('getEventImpactRange', () => {
    it('should return range for standard positive events', () => {
      const range = getEventImpactRange('superBowlWin');
      expect(range).not.toBeNull();
      expect(range!.minImpact).toBeGreaterThan(0);
      expect(range!.maxImpact).toBeGreaterThan(range!.minImpact);
    });

    it('should return range for standard negative events', () => {
      const range = getEventImpactRange('losingSeason');
      expect(range).not.toBeNull();
      expect(range!.minImpact).toBeLessThan(0);
    });

    it('should return range for additional events', () => {
      const range = getEventImpactRange('rivalryWin');
      expect(range).not.toBeNull();
      expect(range!.minImpact).toBeGreaterThan(0);
    });

    it('should return null for unknown events', () => {
      const range = getEventImpactRange('unknownEvent' as any);
      expect(range).toBeNull();
    });
  });

  describe('calculateEventImpact', () => {
    it('should calculate positive impact for winning events', () => {
      const owner = createTestOwner();
      const impact = calculateEventImpact('superBowlWin', owner, 0.5);

      expect(impact).toBeGreaterThan(0);
    });

    it('should calculate negative impact for losing events', () => {
      const owner = createTestOwner();
      const impact = calculateEventImpact('losingSeason', owner, 0.5);

      expect(impact).toBeLessThan(0);
    });

    it('should factor in owner patience trait', () => {
      const patientOwner = createTestOwner();
      patientOwner.personality.traits.patience = 80;

      const impatientOwner = createTestOwner();
      impatientOwner.personality.traits.patience = 20;

      // For negative events, patient owners should lose less
      const patientImpact = calculateEventImpact('losingSeason', patientOwner, 0.5);
      const impatientImpact = calculateEventImpact('losingSeason', impatientOwner, 0.5);

      expect(patientImpact).toBeGreaterThan(impatientImpact);
    });

    it('should return 0 for unknown events', () => {
      const owner = createTestOwner();
      const impact = calculateEventImpact('unknownEvent' as any, owner, 0.5);

      expect(impact).toBe(0);
    });
  });

  describe('processPatienceEvent', () => {
    it('should process event and update state', () => {
      const owner = createTestOwner();
      const state = createPatienceMeterState('owner-1', 50);

      const event: PatienceEvent = {
        type: 'winningSeason',
        week: 18,
        season: 1,
        description: 'Finished with winning record',
      };

      const result = processPatienceEvent(event, state, owner, 0.5);

      expect(result.impactValue).toBeGreaterThan(0);
      expect(result.newState.currentValue).toBeGreaterThan(50);
      expect(result.newState.history.length).toBe(2);
    });

    it('should detect level changes', () => {
      const owner = createTestOwner();
      const state = createPatienceMeterState('owner-1', 72); // Just above stable threshold

      const event: PatienceEvent = {
        type: 'losingSeason',
        week: 18,
        season: 1,
        description: 'Bad season',
      };

      const result = processPatienceEvent(event, state, owner, 1); // Max impact

      expect(result.levelChanged).toBe(true);
    });

    it('should detect would be fired', () => {
      const owner = createTestOwner();
      const state = createPatienceMeterState('owner-1', 25); // Hot seat

      const event: PatienceEvent = {
        type: 'defiedOwner',
        week: 5,
        season: 1,
        description: 'Defied owner demand',
      };

      const result = processPatienceEvent(event, state, owner, 1);

      expect(result.wouldBeFired).toBe(true);
    });
  });

  describe('processMultipleEvents', () => {
    it('should process events in sequence', () => {
      const owner = createTestOwner();
      const state = createPatienceMeterState('owner-1', 50);

      const events: PatienceEvent[] = [
        { type: 'winningSeason', week: 18, season: 1, description: 'Good record' },
        { type: 'playoffAppearance', week: 19, season: 1, description: 'Made playoffs' },
      ];

      const results = processMultipleEvents(events, state, owner, [0.5, 0.5]);

      expect(results).toHaveLength(2);
      expect(results[1].newState.currentValue).toBeGreaterThan(results[0].newState.currentValue);
    });

    it('should use provided random factors', () => {
      const owner = createTestOwner();
      const state = createPatienceMeterState('owner-1', 50);

      const events: PatienceEvent[] = [
        { type: 'winningSeason', week: 18, season: 1, description: 'Good record' },
      ];

      const minResult = processMultipleEvents(events, state, owner, [0]);
      const maxResult = processMultipleEvents(events, state, owner, [1]);

      expect(maxResult[0].impactValue).toBeGreaterThan(minResult[0].impactValue);
    });
  });

  describe('generateSeasonEvents', () => {
    it('should generate winning season event', () => {
      const context: SeasonResultContext = {
        wins: 10,
        losses: 7,
        playoffResult: null,
        expectedWins: 8,
        season: 1,
      };

      const events = generateSeasonEvents(context);

      expect(events.some((e) => e.type === 'winningSeason')).toBe(true);
    });

    it('should generate losing season event', () => {
      const context: SeasonResultContext = {
        wins: 5,
        losses: 12,
        playoffResult: null,
        expectedWins: 8,
        season: 1,
      };

      const events = generateSeasonEvents(context);

      expect(events.some((e) => e.type === 'losingSeason')).toBe(true);
    });

    it('should generate exceeded expectations event', () => {
      const context: SeasonResultContext = {
        wins: 12,
        losses: 5,
        playoffResult: null,
        expectedWins: 7,
        season: 1,
      };

      const events = generateSeasonEvents(context);

      expect(events.some((e) => e.type === 'exceededExpectations')).toBe(true);
    });

    it('should generate playoff events', () => {
      const context: SeasonResultContext = {
        wins: 11,
        losses: 6,
        playoffResult: 'divisionalWin',
        expectedWins: 10,
        season: 1,
      };

      const events = generateSeasonEvents(context);

      expect(events.some((e) => e.type === 'playoffAppearance')).toBe(true);
      expect(events.some((e) => e.type === 'divisionalWin')).toBe(true);
    });

    it('should generate Super Bowl win event', () => {
      const context: SeasonResultContext = {
        wins: 14,
        losses: 3,
        playoffResult: 'superBowlWin',
        expectedWins: 12,
        season: 1,
      };

      const events = generateSeasonEvents(context);

      expect(events.some((e) => e.type === 'superBowlWin')).toBe(true);
    });

    it('should generate missed expected playoffs event', () => {
      const context: SeasonResultContext = {
        wins: 7,
        losses: 10,
        playoffResult: 'missedPlayoffs',
        expectedWins: 10,
        season: 1,
      };

      const events = generateSeasonEvents(context);

      expect(events.some((e) => e.type === 'missedExpectedPlayoffs')).toBe(true);
    });
  });

  describe('processSeasonEnd', () => {
    it('should process all season events', () => {
      const owner = createTestOwner();
      const state = createPatienceMeterState('owner-1', 50);

      const context: SeasonResultContext = {
        wins: 10,
        losses: 7,
        playoffResult: 'wildCardWin',
        expectedWins: 8,
        season: 1,
      };

      const results = processSeasonEnd(context, state, owner);

      expect(results.length).toBeGreaterThan(0);
      // Should have improved overall
      const finalValue = results[results.length - 1].newState.currentValue;
      expect(finalValue).toBeGreaterThan(50);
    });
  });

  describe('createDemandComplianceEvent', () => {
    it('should create compliance event', () => {
      const event = createDemandComplianceEvent('demand-1', 'Sign free agent', true, 5, 1);

      expect(event.type).toBe('demandComplied');
      expect(event.description).toContain('Complied');
      expect(event.context?.demandId).toBe('demand-1');
    });

    it('should create defiance event', () => {
      const event = createDemandComplianceEvent('demand-1', 'Sign free agent', false, 5, 1);

      expect(event.type).toBe('defiedOwner');
      expect(event.description).toContain('Defied');
    });
  });

  describe('createPREvent', () => {
    it('should create positive PR event', () => {
      const event = createPREvent(true, 'Great community event', 5, 1, 'moderate');

      expect(event.type).toBe('communityInvolvement');
      expect(event.context?.positive).toBe(true);
    });

    it('should create major negative PR event', () => {
      const event = createPREvent(false, 'Major scandal', 5, 1, 'major');

      expect(event.type).toBe('badPR');
      expect(event.context?.severity).toBe('major');
    });
  });

  describe('createPersonnelEvent', () => {
    it('should create personnel event with player name', () => {
      const event = createPersonnelEvent('draftPickBecomesStar', 'Joe Star', 10, 2);

      expect(event.type).toBe('draftPickBecomesStar');
      expect(event.description).toContain('Joe Star');
      expect(event.context?.playerName).toBe('Joe Star');
    });
  });

  describe('createGameResultEvent', () => {
    it('should create game result event', () => {
      const event = createGameResultEvent('rivalryWin', 5, 1, 'Cowboys');

      expect(event.type).toBe('rivalryWin');
      expect(event.description).toContain('Cowboys');
      expect(event.context?.opponent).toBe('Cowboys');
    });

    it('should handle missing opponent', () => {
      const event = createGameResultEvent('blowoutWin', 5, 1);

      expect(event.type).toBe('blowoutWin');
      expect(event.description).toBe('Blowout victory');
    });
  });

  describe('calculateCumulativeImpact', () => {
    it('should calculate total impact', () => {
      const owner = createTestOwner();
      const state = createPatienceMeterState('owner-1', 50);

      const events: PatienceEvent[] = [
        { type: 'winningSeason', week: 18, season: 1, description: 'Good' },
        { type: 'playoffAppearance', week: 19, season: 1, description: 'Playoffs' },
      ];

      const results = processMultipleEvents(events, state, owner, [0.5, 0.5]);
      const cumulative = calculateCumulativeImpact(results);

      expect(cumulative.totalImpact).toBeGreaterThan(0);
      expect(cumulative.positiveEvents).toBe(2);
      expect(cumulative.negativeEvents).toBe(0);
    });
  });

  describe('getSupportedEventTypes', () => {
    it('should return all supported event types', () => {
      const types = getSupportedEventTypes();

      expect(types).toContain('superBowlWin');
      expect(types).toContain('losingSeason');
      expect(types).toContain('defiedOwner');
      expect(types.length).toBeGreaterThan(20);
    });
  });

  describe('validatePatienceEvent', () => {
    it('should return true for valid event', () => {
      const event: PatienceEvent = {
        type: 'winningSeason',
        week: 18,
        season: 1,
        description: 'Good season',
      };

      expect(validatePatienceEvent(event)).toBe(true);
    });

    it('should return false for invalid event type', () => {
      const event = {
        type: 'invalidType',
        week: 18,
        season: 1,
        description: 'Test',
      } as unknown as PatienceEvent;

      expect(validatePatienceEvent(event)).toBe(false);
    });

    it('should return false for negative week', () => {
      const event: PatienceEvent = {
        type: 'winningSeason',
        week: -1,
        season: 1,
        description: 'Test',
      };

      expect(validatePatienceEvent(event)).toBe(false);
    });

    it('should return false for empty description', () => {
      const event: PatienceEvent = {
        type: 'winningSeason',
        week: 18,
        season: 1,
        description: '',
      };

      expect(validatePatienceEvent(event)).toBe(false);
    });
  });
});
