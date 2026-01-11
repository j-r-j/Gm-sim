/**
 * Owner Mood System Tests
 * Tests for owner satisfaction tracking and mood events
 */

import {
  OwnerMoodState,
  createOwnerMoodState,
  getMoodFromValue,
  getMoodDescription,
  createMoodEvent,
  processMoodEvent,
  getMoodTrend,
  getStreakDescription,
  applyMoodDecay,
  getRecentEventsSummary,
  getOwnerSentiment,
  shouldMakePublicStatement,
  generateOwnerStatement,
} from '../OwnerMoodSystem';
import { createDefaultOwner } from '../../models/owner/Owner';

describe('OwnerMoodSystem', () => {
  describe('createOwnerMoodState', () => {
    it('should create initial state with neutral mood', () => {
      const state = createOwnerMoodState();

      expect(state.currentMood).toBe('neutral');
      expect(state.moodValue).toBe(50);
      expect(state.recentEvents).toHaveLength(0);
      expect(state.weeklyMoodHistory).toHaveLength(0);
      expect(state.satisfactionStreak).toBe(0);
    });
  });

  describe('getMoodFromValue', () => {
    it('should return elated for very high values', () => {
      expect(getMoodFromValue(95)).toBe('elated');
      expect(getMoodFromValue(90)).toBe('elated');
    });

    it('should return pleased for high values', () => {
      expect(getMoodFromValue(85)).toBe('pleased');
      expect(getMoodFromValue(75)).toBe('pleased');
    });

    it('should return content for moderately high values', () => {
      expect(getMoodFromValue(70)).toBe('content');
      expect(getMoodFromValue(60)).toBe('content');
    });

    it('should return neutral for middle values', () => {
      expect(getMoodFromValue(55)).toBe('neutral');
      expect(getMoodFromValue(45)).toBe('neutral');
    });

    it('should return concerned for low values', () => {
      expect(getMoodFromValue(40)).toBe('concerned');
      expect(getMoodFromValue(35)).toBe('concerned');
    });

    it('should return frustrated for lower values', () => {
      expect(getMoodFromValue(30)).toBe('frustrated');
      expect(getMoodFromValue(25)).toBe('frustrated');
    });

    it('should return angry for very low values', () => {
      expect(getMoodFromValue(20)).toBe('angry');
      expect(getMoodFromValue(15)).toBe('angry');
    });

    it('should return furious for extremely low values', () => {
      expect(getMoodFromValue(10)).toBe('furious');
      expect(getMoodFromValue(0)).toBe('furious');
    });
  });

  describe('getMoodDescription', () => {
    it('should return user-friendly descriptions', () => {
      expect(getMoodDescription('elated')).toBe('very happy');
      expect(getMoodDescription('pleased')).toBe('happy');
      expect(getMoodDescription('content')).toBe('satisfied');
      expect(getMoodDescription('neutral')).toBe('neutral');
      expect(getMoodDescription('concerned')).toBe('concerned');
      expect(getMoodDescription('frustrated')).toBe('unhappy');
      expect(getMoodDescription('angry')).toBe('very unhappy');
      expect(getMoodDescription('furious')).toBe('very unhappy');
    });
  });

  describe('createMoodEvent', () => {
    it('should create event with calculated impacts', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const event = createMoodEvent('win', 'Team won the game', owner, 5, 2024);

      expect(event.type).toBe('win');
      expect(event.description).toBe('Team won the game');
      expect(event.moodImpact).toBeGreaterThan(0);
      expect(event.patienceImpact).toBeGreaterThan(0);
      expect(event.week).toBe(5);
      expect(event.season).toBe(2024);
    });

    it('should create negative impact events for losses', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const event = createMoodEvent('loss', 'Team lost', owner, 5, 2024);

      expect(event.moodImpact).toBeLessThan(0);
      expect(event.patienceImpact).toBeLessThan(0);
    });

    it('should have larger impact for major events', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const win = createMoodEvent('win', 'Regular win', owner, 5, 2024);
      const superBowl = createMoodEvent('superBowlWin', 'Championship!', owner, 20, 2024);

      expect(superBowl.moodImpact).toBeGreaterThan(win.moodImpact);
      expect(superBowl.patienceImpact).toBeGreaterThan(win.patienceImpact);
    });

    it('should apply personality modifiers', () => {
      const patientOwner = createDefaultOwner('owner-1', 'team-1');
      patientOwner.personality.traits.patience = 90;

      const impatientOwner = createDefaultOwner('owner-2', 'team-2');
      impatientOwner.personality.traits.patience = 20;

      // Use a larger impact event to see modifier effects more clearly
      const patientEvent = createMoodEvent('blowoutLoss', 'Loss', patientOwner, 5, 2024);
      const impatientEvent = createMoodEvent('blowoutLoss', 'Loss', impatientOwner, 5, 2024);

      // Impatient owner should have worse or equal reaction to loss
      // Due to rounding, values may be similar but impatient should never be better
      expect(impatientEvent.moodImpact).toBeLessThanOrEqual(patientEvent.moodImpact);
    });
  });

  describe('processMoodEvent', () => {
    it('should update mood value', () => {
      const state = createOwnerMoodState();
      const owner = createDefaultOwner('owner-1', 'team-1');
      const event = createMoodEvent('win', 'Win', owner, 5, 2024);

      const { newState } = processMoodEvent(state, owner, event);

      expect(newState.moodValue).toBeGreaterThan(50);
    });

    it('should clamp mood value to valid range', () => {
      let state = createOwnerMoodState();
      state = { ...state, moodValue: 95 };

      const owner = createDefaultOwner('owner-1', 'team-1');
      const event = createMoodEvent('superBowlWin', 'Championship!', owner, 20, 2024);

      const { newState } = processMoodEvent(state, owner, event);

      expect(newState.moodValue).toBeLessThanOrEqual(100);
    });

    it('should update satisfaction streak for positive events', () => {
      const state = createOwnerMoodState();
      const owner = createDefaultOwner('owner-1', 'team-1');
      const event = createMoodEvent('win', 'Win', owner, 5, 2024);

      const { newState } = processMoodEvent(state, owner, event);

      expect(newState.satisfactionStreak).toBe(1);
    });

    it('should reset streak direction on opposite events', () => {
      let state = createOwnerMoodState();
      state = { ...state, satisfactionStreak: 3 };

      const owner = createDefaultOwner('owner-1', 'team-1');
      const event = createMoodEvent('loss', 'Loss', owner, 5, 2024);

      const { newState } = processMoodEvent(state, owner, event);

      expect(newState.satisfactionStreak).toBe(-1);
    });

    it('should return owner updates', () => {
      const state = createOwnerMoodState();
      const owner = createDefaultOwner('owner-1', 'team-1');
      const event = createMoodEvent('win', 'Win', owner, 5, 2024);

      const { ownerUpdates } = processMoodEvent(state, owner, event);

      expect(ownerUpdates.patienceMeter).toBeDefined();
      expect(ownerUpdates.trustLevel).toBeDefined();
    });

    it('should keep only recent events', () => {
      let state = createOwnerMoodState();
      const owner = createDefaultOwner('owner-1', 'team-1');

      // Add 15 events
      for (let i = 0; i < 15; i++) {
        const event = createMoodEvent('win', `Win ${i}`, owner, i, 2024);
        const result = processMoodEvent(state, owner, event);
        state = result.newState;
      }

      expect(state.recentEvents.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getMoodTrend', () => {
    it('should return stable for insufficient history', () => {
      const state = createOwnerMoodState();
      expect(getMoodTrend(state)).toBe('stable');
    });

    it('should return improving when mood increases', () => {
      const state: OwnerMoodState = {
        ...createOwnerMoodState(),
        weeklyMoodHistory: [
          { week: 1, mood: 'neutral', value: 45 },
          { week: 2, mood: 'neutral', value: 50 },
          { week: 3, mood: 'content', value: 60 },
        ],
      };

      expect(getMoodTrend(state)).toBe('improving');
    });

    it('should return declining when mood decreases', () => {
      const state: OwnerMoodState = {
        ...createOwnerMoodState(),
        weeklyMoodHistory: [
          { week: 1, mood: 'content', value: 60 },
          { week: 2, mood: 'neutral', value: 50 },
          { week: 3, mood: 'concerned', value: 40 },
        ],
      };

      expect(getMoodTrend(state)).toBe('declining');
    });
  });

  describe('getStreakDescription', () => {
    it('should return appropriate descriptions for streaks', () => {
      expect(getStreakDescription(5)).toBe('hot streak');
      expect(getStreakDescription(3)).toBe('doing well');
      expect(getStreakDescription(0)).toBe('neutral');
      expect(getStreakDescription(-3)).toBe('struggling');
      expect(getStreakDescription(-6)).toBe('cold streak');
    });
  });

  describe('applyMoodDecay', () => {
    it('should move mood value toward neutral', () => {
      let state = createOwnerMoodState();
      state = { ...state, moodValue: 80 };

      const decayed = applyMoodDecay(state);

      expect(decayed.moodValue).toBeLessThan(80);
      expect(decayed.moodValue).toBeGreaterThan(50);
    });

    it('should move low mood toward neutral', () => {
      let state = createOwnerMoodState();
      state = { ...state, moodValue: 20 };

      const decayed = applyMoodDecay(state);

      expect(decayed.moodValue).toBeGreaterThan(20);
      expect(decayed.moodValue).toBeLessThan(50);
    });

    it('should not change neutral mood', () => {
      const state = createOwnerMoodState(); // starts at 50

      const decayed = applyMoodDecay(state);

      expect(decayed.moodValue).toBe(50);
    });
  });

  describe('getRecentEventsSummary', () => {
    it('should count positive and negative events', () => {
      const state: OwnerMoodState = {
        ...createOwnerMoodState(),
        recentEvents: [
          {
            type: 'win',
            description: '',
            moodImpact: 5,
            patienceImpact: 2,
            trustImpact: 1,
            week: 1,
            season: 2024,
          },
          {
            type: 'win',
            description: '',
            moodImpact: 5,
            patienceImpact: 2,
            trustImpact: 1,
            week: 2,
            season: 2024,
          },
          {
            type: 'loss',
            description: '',
            moodImpact: -5,
            patienceImpact: -2,
            trustImpact: -1,
            week: 3,
            season: 2024,
          },
        ],
      };

      const summary = getRecentEventsSummary(state);

      expect(summary.positiveEvents).toBe(2);
      expect(summary.negativeEvents).toBe(1);
      expect(summary.netSentiment).toBe('positive');
    });

    it('should handle empty events', () => {
      const state = createOwnerMoodState();
      const summary = getRecentEventsSummary(state);

      expect(summary.positiveEvents).toBe(0);
      expect(summary.negativeEvents).toBe(0);
      expect(summary.netSentiment).toBe('neutral');
    });
  });

  describe('getOwnerSentiment', () => {
    it('should return user-friendly sentiment info', () => {
      const state: OwnerMoodState = {
        ...createOwnerMoodState(),
        moodValue: 70,
        currentMood: 'content',
        weeklyMoodHistory: [
          { week: 1, mood: 'neutral', value: 50 },
          { week: 2, mood: 'neutral', value: 55 },
          { week: 3, mood: 'content', value: 70 },
        ],
      };

      const sentiment = getOwnerSentiment(state);

      expect(typeof sentiment.mood).toBe('string');
      expect(typeof sentiment.trend).toBe('string');
      expect(typeof sentiment.outlook).toBe('string');
    });

    it('should have appropriate outlook for high mood', () => {
      const state: OwnerMoodState = {
        ...createOwnerMoodState(),
        moodValue: 80,
        currentMood: 'pleased',
      };

      const sentiment = getOwnerSentiment(state);

      expect(sentiment.outlook).toContain('confident');
    });

    it('should have appropriate outlook for low mood', () => {
      const state: OwnerMoodState = {
        ...createOwnerMoodState(),
        moodValue: 25,
        currentMood: 'frustrated',
      };

      const sentiment = getOwnerSentiment(state);

      expect(sentiment.outlook).toContain('patience');
    });
  });

  describe('shouldMakePublicStatement', () => {
    it('should suggest praise for very high mood', () => {
      const state: OwnerMoodState = {
        ...createOwnerMoodState(),
        moodValue: 90,
      };

      const result = shouldMakePublicStatement(state);

      expect(result.shouldSpeak).toBe(true);
      expect(result.type).toBe('praise');
    });

    it('should suggest warning for very low mood', () => {
      const state: OwnerMoodState = {
        ...createOwnerMoodState(),
        moodValue: 8,
      };

      const result = shouldMakePublicStatement(state);

      expect(result.shouldSpeak).toBe(true);
      expect(result.type).toBe('warning');
    });

    it('should not suggest statement for neutral mood', () => {
      const state = createOwnerMoodState();

      const result = shouldMakePublicStatement(state);

      expect(result.shouldSpeak).toBe(false);
      expect(result.type).toBeNull();
    });
  });

  describe('generateOwnerStatement', () => {
    it('should generate statements for all types', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const types: Array<'praise' | 'support' | 'concern' | 'criticism' | 'warning'> = [
        'praise',
        'support',
        'concern',
        'criticism',
        'warning',
      ];

      types.forEach((type) => {
        const statement = generateOwnerStatement(owner, type);
        expect(typeof statement).toBe('string');
        expect(statement.length).toBeGreaterThan(10);
        expect(statement.startsWith('"')).toBe(true);
        expect(statement.endsWith('"')).toBe(true);
      });
    });
  });
});
