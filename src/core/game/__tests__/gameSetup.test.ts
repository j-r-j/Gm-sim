/**
 * Game Setup Tests
 */

import {
  generateWeather,
  calculateHomeFieldAdvantage,
  determineGameStakes,
  GameConfig,
} from '../GameSetup';
import { Stadium } from '../../models/team/Stadium';

describe('GameSetup', () => {
  // Test stadium fixtures
  const domeStadium: Stadium = {
    id: 'stadium-dome',
    name: 'Dome Stadium',
    teamId: 'team-1',
    city: 'Dome City',
    type: 'domeFixed',
    surface: 'turf',
    capacity: 70000,
    latitude: 33.0,
    elevation: 500,
    averageNovemberTemp: 60,
    averageDecemberTemp: 55,
    noiseFactor: 8,
    intimidationFactor: 7,
  };

  const outdoorColdStadium: Stadium = {
    id: 'stadium-cold',
    name: 'Cold Stadium',
    teamId: 'team-2',
    city: 'Cold City',
    type: 'outdoorCold',
    surface: 'grass',
    capacity: 80000,
    latitude: 42.0,
    elevation: 600,
    averageNovemberTemp: 40,
    averageDecemberTemp: 25,
    noiseFactor: 9,
    intimidationFactor: 8,
  };

  const outdoorWarmStadium: Stadium = {
    id: 'stadium-warm',
    name: 'Warm Stadium',
    teamId: 'team-3',
    city: 'Warm City',
    type: 'outdoorWarm',
    surface: 'grass',
    capacity: 65000,
    latitude: 28.0,
    elevation: 50,
    averageNovemberTemp: 70,
    averageDecemberTemp: 65,
    noiseFactor: 6,
    intimidationFactor: 5,
  };

  const highElevationStadium: Stadium = {
    id: 'stadium-high',
    name: 'High Stadium',
    teamId: 'team-4',
    city: 'High City',
    type: 'outdoorCold',
    surface: 'turf',
    capacity: 75000,
    latitude: 39.7,
    elevation: 5280,
    averageNovemberTemp: 45,
    averageDecemberTemp: 35,
    noiseFactor: 7,
    intimidationFactor: 6,
  };

  describe('generateWeather', () => {
    it('should return dome conditions for fixed dome stadiums', () => {
      const weather = generateWeather(domeStadium, 10);

      expect(weather.isDome).toBe(true);
      expect(weather.temperature).toBe(72);
      expect(weather.precipitation).toBe('none');
      expect(weather.wind).toBe(0);
    });

    it('should return outdoor conditions for outdoor stadiums', () => {
      const weather = generateWeather(outdoorColdStadium, 10);

      expect(weather.isDome).toBe(false);
      // Temperature should be in a reasonable range
      expect(weather.temperature).toBeLessThan(80);
      expect(weather.temperature).toBeGreaterThan(-20);
    });

    it('should have colder temperatures in later weeks', () => {
      // Run multiple times to get average
      let earlySeasonTotal = 0;
      let lateSeasonTotal = 0;
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        earlySeasonTotal += generateWeather(outdoorColdStadium, 2).temperature;
        lateSeasonTotal += generateWeather(outdoorColdStadium, 16).temperature;
      }

      const earlyAvg = earlySeasonTotal / iterations;
      const lateAvg = lateSeasonTotal / iterations;

      // Later weeks should generally be colder
      expect(earlyAvg).toBeGreaterThan(lateAvg);
    });

    it('should have reasonable wind values', () => {
      const weather = generateWeather(outdoorColdStadium, 10);

      expect(weather.wind).toBeGreaterThanOrEqual(0);
      expect(weather.wind).toBeLessThanOrEqual(30);
    });

    it('should only have valid precipitation types', () => {
      // Run multiple times to check precipitation variety
      const precipTypes = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const weather = generateWeather(outdoorColdStadium, 15);
        precipTypes.add(weather.precipitation);
      }

      // All precipitation types should be valid
      for (const type of precipTypes) {
        expect(['none', 'rain', 'snow']).toContain(type);
      }
    });
  });

  describe('calculateHomeFieldAdvantage', () => {
    it('should return a positive value for all stadiums', () => {
      expect(calculateHomeFieldAdvantage(domeStadium, 10, 'regular')).toBeGreaterThan(0);
      expect(calculateHomeFieldAdvantage(outdoorColdStadium, 10, 'regular')).toBeGreaterThan(0);
      expect(calculateHomeFieldAdvantage(outdoorWarmStadium, 10, 'regular')).toBeGreaterThan(0);
    });

    it('should give more advantage to stadiums with higher noise/intimidation', () => {
      const highAdvantage = calculateHomeFieldAdvantage(outdoorColdStadium, 10, 'regular');
      const lowAdvantage = calculateHomeFieldAdvantage(outdoorWarmStadium, 10, 'regular');

      expect(highAdvantage).toBeGreaterThan(lowAdvantage);
    });

    it('should give extra advantage to cold stadiums late in season', () => {
      const earlyAdvantage = calculateHomeFieldAdvantage(outdoorColdStadium, 5, 'regular');
      const lateAdvantage = calculateHomeFieldAdvantage(outdoorColdStadium, 15, 'regular');

      expect(lateAdvantage).toBeGreaterThan(earlyAdvantage);
    });

    it('should give extra advantage to high elevation stadiums', () => {
      const normalAdvantage = calculateHomeFieldAdvantage(outdoorColdStadium, 10, 'regular');
      const highAdvantage = calculateHomeFieldAdvantage(highElevationStadium, 10, 'regular');

      expect(highAdvantage).toBeGreaterThan(normalAdvantage);
    });

    it('should reduce advantage slightly for playoff games', () => {
      const regularAdvantage = calculateHomeFieldAdvantage(outdoorColdStadium, 10, 'regular');
      const playoffAdvantage = calculateHomeFieldAdvantage(outdoorColdStadium, 10, 'playoff');

      expect(playoffAdvantage).toBeLessThan(regularAdvantage);
    });

    it('should return advantage in typical points range (2-4)', () => {
      const advantage = calculateHomeFieldAdvantage(outdoorColdStadium, 10, 'regular');

      expect(advantage).toBeGreaterThanOrEqual(2);
      expect(advantage).toBeLessThanOrEqual(4.5);
    });
  });

  describe('determineGameStakes', () => {
    it('should return regular for normal regular season games', () => {
      const config: GameConfig = {
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        week: 8,
        isPlayoff: false,
      };

      expect(determineGameStakes(config)).toBe('regular');
    });

    it('should return rivalry for late regular season games', () => {
      const config: GameConfig = {
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        week: 16,
        isPlayoff: false,
      };

      expect(determineGameStakes(config)).toBe('rivalry');
    });

    it('should return playoff for playoff games', () => {
      const config: GameConfig = {
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        week: 18,
        isPlayoff: true,
        playoffRound: 'wildCard',
      };

      expect(determineGameStakes(config)).toBe('playoff');
    });

    it('should return championship for Super Bowl', () => {
      const config: GameConfig = {
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        week: 22,
        isPlayoff: true,
        playoffRound: 'superBowl',
      };

      expect(determineGameStakes(config)).toBe('championship');
    });

    it('should return playoff for divisional round', () => {
      const config: GameConfig = {
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        week: 19,
        isPlayoff: true,
        playoffRound: 'divisional',
      };

      expect(determineGameStakes(config)).toBe('playoff');
    });

    it('should return playoff for conference championship', () => {
      const config: GameConfig = {
        homeTeamId: 'team-1',
        awayTeamId: 'team-2',
        week: 20,
        isPlayoff: true,
        playoffRound: 'conference',
      };

      expect(determineGameStakes(config)).toBe('playoff');
    });
  });
});
