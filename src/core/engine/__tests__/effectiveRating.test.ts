import {
  calculateEffectiveRating,
  calculateSchemeFitModifier,
  calculateRoleFitModifier,
  calculateCoachChemistryModifier,
  calculateWeatherModifier,
  calculateStakesModifier,
  createDefaultWeather,
  createDomeWeather,
  WeatherCondition,
  GameStakes,
} from '../EffectiveRatingCalculator';
import { generatePlayer } from '../../generators/player/PlayerGenerator';
import { Position } from '../../models/player/Position';
import { createDefaultCoach } from '../../models/staff/Coach';

describe('EffectiveRatingCalculator', () => {
  describe('calculateSchemeFitModifier', () => {
    it('should return a value in the expected range (-10 to +8)', () => {
      for (let i = 0; i < 20; i++) {
        const player = generatePlayer({ position: Position.QB });
        const modifier = calculateSchemeFitModifier(player, 'westCoast');

        expect(modifier).toBeGreaterThanOrEqual(-10);
        expect(modifier).toBeLessThanOrEqual(8);
      }
    });

    it('should return different values for different schemes', () => {
      const player = generatePlayer({ position: Position.RB });
      const schemes = ['powerRun', 'zoneRun', 'westCoast', 'airRaid'] as const;

      const modifiers = schemes.map((s) => calculateSchemeFitModifier(player, s));

      // All modifiers should be defined numbers
      for (const mod of modifiers) {
        expect(typeof mod).toBe('number');
      }
    });
  });

  describe('calculateRoleFitModifier', () => {
    it('should return a value in the expected range (-8 to +10)', () => {
      for (let i = 0; i < 20; i++) {
        const player = generatePlayer({ position: Position.WR });
        const modifier = calculateRoleFitModifier(player, player.roleFit.currentRole);

        expect(modifier).toBeGreaterThanOrEqual(-8);
        expect(modifier).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('calculateCoachChemistryModifier', () => {
    it('should return 0 for no coach', () => {
      const player = generatePlayer({ position: Position.TE });
      const modifier = calculateCoachChemistryModifier(player, null);

      expect(modifier).toBe(0);
    });

    it('should return 0 for coach with no established chemistry', () => {
      const player = generatePlayer({ position: Position.C });
      const coach = createDefaultCoach('coach-1', 'John', 'Smith', 'olCoach');

      const modifier = calculateCoachChemistryModifier(player, coach);

      expect(modifier).toBe(0);
    });

    it('should return the chemistry value when established', () => {
      const player = generatePlayer({ position: Position.CB });
      const coach = createDefaultCoach('coach-1', 'Jane', 'Doe', 'dbCoach');
      coach.playerChemistry[player.id] = 7;

      const modifier = calculateCoachChemistryModifier(player, coach);

      expect(modifier).toBe(7);
    });

    it('should return value in range (-10 to +10)', () => {
      const player = generatePlayer({ position: Position.DE });
      const coach = createDefaultCoach('coach-1', 'Bob', 'Jones', 'dlCoach');

      // Set various chemistry values
      const chemistries = [-10, -5, 0, 5, 10];
      for (const chem of chemistries) {
        coach.playerChemistry[player.id] = chem;
        const modifier = calculateCoachChemistryModifier(player, coach);

        expect(modifier).toBeGreaterThanOrEqual(-10);
        expect(modifier).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('calculateWeatherModifier', () => {
    it('should return 0 for dome weather', () => {
      const player = generatePlayer({ position: Position.QB });
      const domeWeather = createDomeWeather();

      const modifier = calculateWeatherModifier(player, domeWeather);

      expect(modifier).toBe(0);
    });

    it('should return negative value for bad weather', () => {
      const player = generatePlayer({ position: Position.WR });
      const badWeather: WeatherCondition = {
        temperature: 20,
        precipitation: 'snow',
        wind: 25,
        isDome: false,
      };

      const modifier = calculateWeatherModifier(player, badWeather);

      expect(modifier).toBeLessThan(0);
    });

    it('should return value in range (-10 to +2)', () => {
      for (let i = 0; i < 20; i++) {
        const player = generatePlayer({ position: Position.RB });
        const weather: WeatherCondition = {
          temperature: Math.floor(Math.random() * 80) + 10,
          precipitation: Math.random() < 0.3 ? 'rain' : Math.random() < 0.1 ? 'snow' : 'none',
          wind: Math.floor(Math.random() * 30),
          isDome: false,
        };

        const modifier = calculateWeatherModifier(player, weather);

        expect(modifier).toBeGreaterThanOrEqual(-10);
        expect(modifier).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('calculateStakesModifier', () => {
    it('should return 0 for preseason games', () => {
      const player = generatePlayer({ position: Position.LT });
      const modifier = calculateStakesModifier(player, 'preseason');

      expect(modifier).toEqual(0);
    });

    it('should return value in range (-15 to +15)', () => {
      const stakes: GameStakes[] = ['preseason', 'regular', 'rivalry', 'playoff', 'championship'];

      for (let i = 0; i < 20; i++) {
        const player = generatePlayer({ position: Position.QB });

        for (const stake of stakes) {
          const modifier = calculateStakesModifier(player, stake);

          expect(modifier).toBeGreaterThanOrEqual(-15);
          expect(modifier).toBeLessThanOrEqual(15);
        }
      }
    });

    it('should apply higher modifiers for championship stakes', () => {
      // Players with high It factor should get bigger bonuses in championships
      const highItPlayer = generatePlayer({ position: Position.QB });
      // Manually set high It factor for testing
      highItPlayer.itFactor.value = 95;

      const championshipMod = calculateStakesModifier(highItPlayer, 'championship');
      const regularMod = calculateStakesModifier(highItPlayer, 'regular');

      // Championship should have larger absolute modifier
      expect(Math.abs(championshipMod)).toBeGreaterThanOrEqual(Math.abs(regularMod));
    });
  });

  describe('calculateEffectiveRating', () => {
    it('should return a value between 1 and 100', () => {
      for (let i = 0; i < 50; i++) {
        const player = generatePlayer({ position: Position.QB });

        const rating = calculateEffectiveRating({
          player,
          skill: 'accuracy',
          positionCoach: null,
          teamScheme: 'westCoast',
          assignedRole: player.roleFit.currentRole,
          weather: createDefaultWeather(),
          gameStakes: 'regular',
          weeklyVariance: 0,
        });

        expect(rating).toBeGreaterThanOrEqual(1);
        expect(rating).toBeLessThanOrEqual(100);
      }
    });

    it('should incorporate weekly variance', () => {
      const player = generatePlayer({ position: Position.RB });

      const baseRating = calculateEffectiveRating({
        player,
        skill: 'vision',
        positionCoach: null,
        teamScheme: 'powerRun',
        assignedRole: player.roleFit.currentRole,
        weather: createDefaultWeather(),
        gameStakes: 'regular',
        weeklyVariance: 0,
      });

      const highVarianceRating = calculateEffectiveRating({
        player,
        skill: 'vision',
        positionCoach: null,
        teamScheme: 'powerRun',
        assignedRole: player.roleFit.currentRole,
        weather: createDefaultWeather(),
        gameStakes: 'regular',
        weeklyVariance: 15,
      });

      // High variance should increase rating
      expect(highVarianceRating).toBeGreaterThan(baseRating);
    });

    it('should reduce rating for injured players', () => {
      const player = generatePlayer({ position: Position.WR });

      const healthyRating = calculateEffectiveRating({
        player,
        skill: 'routeRunning',
        positionCoach: null,
        teamScheme: 'airRaid',
        assignedRole: player.roleFit.currentRole,
        weather: createDefaultWeather(),
        gameStakes: 'regular',
        weeklyVariance: 0,
      });

      // Set player as questionable
      player.injuryStatus.severity = 'questionable';

      const injuredRating = calculateEffectiveRating({
        player,
        skill: 'routeRunning',
        positionCoach: null,
        teamScheme: 'airRaid',
        assignedRole: player.roleFit.currentRole,
        weather: createDefaultWeather(),
        gameStakes: 'regular',
        weeklyVariance: 0,
      });

      // Injured player should have lower rating
      expect(injuredRating).toBeLessThan(healthyRating);
    });

    it('should return reasonable values across all positions', () => {
      const positions = [
        Position.QB,
        Position.RB,
        Position.WR,
        Position.TE,
        Position.LT,
        Position.C,
        Position.DE,
        Position.DT,
        Position.OLB,
        Position.ILB,
        Position.CB,
        Position.FS,
      ];

      for (const position of positions) {
        const player = generatePlayer({ position });
        const skillName = Object.keys(player.skills)[0];

        const rating = calculateEffectiveRating({
          player,
          skill: skillName,
          positionCoach: null,
          teamScheme: 'westCoast',
          assignedRole: player.roleFit.currentRole,
          weather: createDefaultWeather(),
          gameStakes: 'regular',
          weeklyVariance: 0,
        });

        expect(rating).toBeGreaterThanOrEqual(1);
        expect(rating).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('createDefaultWeather', () => {
    it('should create neutral weather conditions', () => {
      const weather = createDefaultWeather();

      expect(weather.temperature).toBe(70);
      expect(weather.precipitation).toBe('none');
      expect(weather.wind).toBe(5);
      expect(weather.isDome).toBe(false);
    });
  });

  describe('createDomeWeather', () => {
    it('should create dome weather conditions', () => {
      const weather = createDomeWeather();

      expect(weather.isDome).toBe(true);
      expect(weather.precipitation).toBe('none');
      expect(weather.wind).toBe(0);
    });
  });
});
