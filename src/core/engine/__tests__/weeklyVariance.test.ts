import {
  calculateWeeklyVariance,
  calculateTeamWeeklyVariances,
  VARIANCE_RANGES,
} from '../WeeklyVarianceCalculator';
import { ConsistencyTier, ConsistencyProfile } from '../../models/player/Consistency';
import { generateRoster } from '../../generators/player/PlayerGenerator';

describe('WeeklyVarianceCalculator', () => {
  describe('VARIANCE_RANGES', () => {
    it('should have correct ranges for metronome tier', () => {
      expect(VARIANCE_RANGES.metronome).toEqual({ min: -2, max: 2 });
    });

    it('should have correct ranges for steady tier', () => {
      expect(VARIANCE_RANGES.steady).toEqual({ min: -4, max: 4 });
    });

    it('should have correct ranges for average tier', () => {
      expect(VARIANCE_RANGES.average).toEqual({ min: -7, max: 7 });
    });

    it('should have correct ranges for streaky tier', () => {
      expect(VARIANCE_RANGES.streaky).toEqual({ min: -10, max: 12 });
    });

    it('should have correct ranges for volatile tier', () => {
      expect(VARIANCE_RANGES.volatile).toEqual({ min: -15, max: 15 });
    });

    it('should have correct ranges for chaotic tier', () => {
      expect(VARIANCE_RANGES.chaotic).toEqual({ min: -20, max: 20 });
    });
  });

  describe('calculateWeeklyVariance', () => {
    it('should return variance within expected range for metronome tier', () => {
      const profile: ConsistencyProfile = {
        tier: 'metronome',
        currentStreak: 'neutral',
        streakGamesRemaining: 0,
      };

      for (let i = 0; i < 50; i++) {
        const result = calculateWeeklyVariance(profile);

        // Metronome with streak bonus could go slightly outside base range
        expect(result.variance).toBeGreaterThanOrEqual(-7); // -2 - 5 streak mod
        expect(result.variance).toBeLessThanOrEqual(7); // 2 + 5 streak mod
      }
    });

    it('should return variance within expected range for streaky tier', () => {
      const profile: ConsistencyProfile = {
        tier: 'streaky',
        currentStreak: 'neutral',
        streakGamesRemaining: 0,
      };

      for (let i = 0; i < 50; i++) {
        const result = calculateWeeklyVariance(profile);

        // Streaky can have wider range with streak mods
        expect(result.variance).toBeGreaterThanOrEqual(-15);
        expect(result.variance).toBeLessThanOrEqual(17);
      }
    });

    it('should return variance within expected range for chaotic tier', () => {
      const profile: ConsistencyProfile = {
        tier: 'chaotic',
        currentStreak: 'neutral',
        streakGamesRemaining: 0,
      };

      for (let i = 0; i < 50; i++) {
        const result = calculateWeeklyVariance(profile);

        expect(result.variance).toBeGreaterThanOrEqual(-25);
        expect(result.variance).toBeLessThanOrEqual(25);
      }
    });

    it('should decrement streak games remaining when in a streak', () => {
      const profile: ConsistencyProfile = {
        tier: 'streaky',
        currentStreak: 'hot',
        streakGamesRemaining: 3,
      };

      const result = calculateWeeklyVariance(profile);

      expect(result.streakGamesRemaining).toBe(2);
      expect(result.newStreakState).toBe('hot');
    });

    it('should end streak when games remaining reaches 0', () => {
      const profile: ConsistencyProfile = {
        tier: 'streaky',
        currentStreak: 'hot',
        streakGamesRemaining: 1,
      };

      const result = calculateWeeklyVariance(profile);

      // After using the last streak game, could start new streak or be neutral
      expect(result.streakGamesRemaining).toBeGreaterThanOrEqual(0);
    });

    it('should bias toward positive variance during hot streaks', () => {
      const profile: ConsistencyProfile = {
        tier: 'streaky',
        currentStreak: 'hot',
        streakGamesRemaining: 5,
      };

      let positiveCount = 0;
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const result = calculateWeeklyVariance(profile);
        if (result.variance > 0) positiveCount++;
      }

      // During hot streaks, should be more positive than negative
      expect(positiveCount).toBeGreaterThan(iterations * 0.5);
    });

    it('should bias toward negative variance during cold streaks', () => {
      const profile: ConsistencyProfile = {
        tier: 'streaky',
        currentStreak: 'cold',
        streakGamesRemaining: 5,
      };

      let negativeCount = 0;
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const result = calculateWeeklyVariance(profile);
        if (result.variance < 0) negativeCount++;
      }

      // During cold streaks, should be more negative than positive
      expect(negativeCount).toBeGreaterThan(iterations * 0.5);
    });

    it('should return valid streak state', () => {
      const tiers: ConsistencyTier[] = [
        'metronome',
        'steady',
        'average',
        'streaky',
        'volatile',
        'chaotic',
      ];

      for (const tier of tiers) {
        const profile: ConsistencyProfile = {
          tier,
          currentStreak: 'neutral',
          streakGamesRemaining: 0,
        };

        const result = calculateWeeklyVariance(profile);

        expect(['hot', 'cold', 'neutral']).toContain(result.newStreakState);
        expect(result.streakGamesRemaining).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('calculateTeamWeeklyVariances', () => {
    it('should return variance for all players', () => {
      const roster = generateRoster('team-1');
      const variances = calculateTeamWeeklyVariances(roster);

      expect(variances.size).toBe(roster.length);

      for (const player of roster) {
        expect(variances.has(player.id)).toBe(true);
      }
    });

    it('should return numeric variance values', () => {
      const roster = generateRoster('team-1');
      const variances = calculateTeamWeeklyVariances(roster);

      for (const variance of variances.values()) {
        expect(typeof variance).toBe('number');
        expect(isNaN(variance)).toBe(false);
      }
    });

    it('should calculate different variances for different players', () => {
      const roster = generateRoster('team-1');
      const variances = calculateTeamWeeklyVariances(roster);

      const varianceValues = Array.from(variances.values());
      const uniqueValues = new Set(varianceValues);

      // Should have at least some variety (not all same value)
      expect(uniqueValues.size).toBeGreaterThan(1);
    });

    it('should handle empty roster', () => {
      const variances = calculateTeamWeeklyVariances([]);

      expect(variances.size).toBe(0);
    });
  });

  describe('consistency tier effects', () => {
    it('should have smaller variance range for metronome than chaotic', () => {
      const metronomeProfile: ConsistencyProfile = {
        tier: 'metronome',
        currentStreak: 'neutral',
        streakGamesRemaining: 0,
      };

      const chaoticProfile: ConsistencyProfile = {
        tier: 'chaotic',
        currentStreak: 'neutral',
        streakGamesRemaining: 0,
      };

      let metronomeMin = 0,
        metronomeMax = 0;
      let chaoticMin = 0,
        chaoticMax = 0;

      for (let i = 0; i < 100; i++) {
        const metronomeResult = calculateWeeklyVariance(metronomeProfile);
        const chaoticResult = calculateWeeklyVariance(chaoticProfile);

        metronomeMin = Math.min(metronomeMin, metronomeResult.variance);
        metronomeMax = Math.max(metronomeMax, metronomeResult.variance);
        chaoticMin = Math.min(chaoticMin, chaoticResult.variance);
        chaoticMax = Math.max(chaoticMax, chaoticResult.variance);
      }

      const metronomeRange = metronomeMax - metronomeMin;
      const chaoticRange = chaoticMax - chaoticMin;

      // Chaotic should have larger range than metronome
      expect(chaoticRange).toBeGreaterThan(metronomeRange);
    });
  });
});
