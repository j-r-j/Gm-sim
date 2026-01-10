import {
  generateOutcomeTable,
  rollOutcome,
  generateFieldGoalTable,
  isTurnover,
  isPositiveOutcome,
  isNegativeOutcome,
  PlayType,
  PlayOutcome,
} from '../OutcomeTables';

describe('OutcomeTables', () => {
  describe('generateOutcomeTable', () => {
    it('should always sum probabilities to 1.0', () => {
      const playTypes: PlayType[] = [
        'run_inside', 'run_outside', 'run_draw', 'run_sweep',
        'pass_short', 'pass_medium', 'pass_deep', 'pass_screen',
        'play_action_short', 'play_action_deep',
      ];

      for (const playType of playTypes) {
        for (let i = 0; i < 10; i++) {
          const offRating = Math.floor(Math.random() * 40) + 50;
          const defRating = Math.floor(Math.random() * 40) + 50;

          const table = generateOutcomeTable(
            offRating,
            defRating,
            playType,
            { down: 1, yardsToGo: 10, yardsToEndzone: 75 },
            25
          );

          const sum = table.reduce((acc, entry) => acc + entry.probability, 0);

          expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
        }
      }
    });

    it('should return array of valid outcome entries', () => {
      const table = generateOutcomeTable(
        75,
        70,
        'pass_short',
        { down: 1, yardsToGo: 10, yardsToEndzone: 75 },
        25
      );

      expect(Array.isArray(table)).toBe(true);
      expect(table.length).toBeGreaterThan(0);

      for (const entry of table) {
        expect(entry).toHaveProperty('outcome');
        expect(entry).toHaveProperty('probability');
        expect(entry).toHaveProperty('yardsRange');
        expect(typeof entry.probability).toBe('number');
        expect(entry.probability).toBeGreaterThanOrEqual(0);
        expect(entry.probability).toBeLessThanOrEqual(1);
      }
    });

    it('should favor offense with higher advantage', () => {
      // Big offensive advantage
      const highAdvantageTable = generateOutcomeTable(
        90,
        50,
        'pass_short',
        { down: 1, yardsToGo: 10, yardsToEndzone: 75 },
        25
      );

      // Big defensive advantage
      const lowAdvantageTable = generateOutcomeTable(
        50,
        90,
        'pass_short',
        { down: 1, yardsToGo: 10, yardsToEndzone: 75 },
        25
      );

      // Calculate positive outcome probability for each
      const positiveOutcomes: PlayOutcome[] = ['touchdown', 'big_gain', 'good_gain', 'moderate_gain', 'short_gain'];

      const highAdvantagePositive = highAdvantageTable
        .filter(e => positiveOutcomes.includes(e.outcome))
        .reduce((sum, e) => sum + e.probability, 0);

      const lowAdvantagePositive = lowAdvantageTable
        .filter(e => positiveOutcomes.includes(e.outcome))
        .reduce((sum, e) => sum + e.probability, 0);

      // Higher offensive advantage should have more positive outcomes
      expect(highAdvantagePositive).toBeGreaterThan(lowAdvantagePositive);
    });

    it('should have higher turnover probability with defensive advantage', () => {
      // Big defensive advantage
      const defAdvantageTable = generateOutcomeTable(
        50,
        90,
        'pass_deep',
        { down: 1, yardsToGo: 10, yardsToEndzone: 75 },
        25
      );

      // Big offensive advantage
      const offAdvantageTable = generateOutcomeTable(
        90,
        50,
        'pass_deep',
        { down: 1, yardsToGo: 10, yardsToEndzone: 75 },
        25
      );

      const turnovers: PlayOutcome[] = ['interception', 'fumble', 'fumble_lost'];

      const defAdvantageTurnovers = defAdvantageTable
        .filter(e => turnovers.includes(e.outcome))
        .reduce((sum, e) => sum + e.probability, 0);

      const offAdvantageTurnovers = offAdvantageTable
        .filter(e => turnovers.includes(e.outcome))
        .reduce((sum, e) => sum + e.probability, 0);

      // Defensive advantage should have more turnovers
      expect(defAdvantageTurnovers).toBeGreaterThan(offAdvantageTurnovers);
    });

    it('should adjust for red zone situations', () => {
      // Normal field position
      const normalTable = generateOutcomeTable(
        75,
        70,
        'pass_short',
        { down: 1, yardsToGo: 10, yardsToEndzone: 75 },
        25
      );

      // Red zone
      const redZoneTable = generateOutcomeTable(
        75,
        70,
        'pass_short',
        { down: 1, yardsToGo: 10, yardsToEndzone: 15 },
        85
      );

      const normalTD = normalTable.find(e => e.outcome === 'touchdown')?.probability ?? 0;
      const redZoneTD = redZoneTable.find(e => e.outcome === 'touchdown')?.probability ?? 0;

      // Red zone should have higher TD probability
      expect(redZoneTD).toBeGreaterThan(normalTD);
    });

    it('should have valid yard ranges for outcomes', () => {
      const table = generateOutcomeTable(
        75,
        70,
        'run_inside',
        { down: 1, yardsToGo: 10, yardsToEndzone: 75 },
        25
      );

      for (const entry of table) {
        expect(entry.yardsRange).toHaveProperty('min');
        expect(entry.yardsRange).toHaveProperty('max');
        expect(entry.yardsRange.min).toBeLessThanOrEqual(entry.yardsRange.max);
      }
    });
  });

  describe('rollOutcome', () => {
    it('should return a valid outcome from the table', () => {
      const table = generateOutcomeTable(
        75,
        70,
        'pass_short',
        { down: 1, yardsToGo: 10, yardsToEndzone: 75 },
        25
      );

      for (let i = 0; i < 50; i++) {
        const result = rollOutcome(table);

        expect(result).toHaveProperty('outcome');
        expect(result).toHaveProperty('yards');
        expect(result).toHaveProperty('secondaryEffects');

        // Check outcome is in the table
        const outcomes = table.map(e => e.outcome);
        expect(outcomes).toContain(result.outcome);
      }
    });

    it('should return yards within the appropriate range', () => {
      const table = generateOutcomeTable(
        75,
        70,
        'run_inside',
        { down: 1, yardsToGo: 10, yardsToEndzone: 75 },
        25
      );

      for (let i = 0; i < 100; i++) {
        const result = rollOutcome(table);
        const entry = table.find(e => e.outcome === result.outcome);

        if (entry) {
          expect(result.yards).toBeGreaterThanOrEqual(entry.yardsRange.min);
          expect(result.yards).toBeLessThanOrEqual(entry.yardsRange.max);
        }
      }
    });

    it('should return array of secondary effects', () => {
      const table = generateOutcomeTable(
        75,
        70,
        'pass_deep',
        { down: 1, yardsToGo: 10, yardsToEndzone: 75 },
        25
      );

      const result = rollOutcome(table);

      expect(Array.isArray(result.secondaryEffects)).toBe(true);
    });
  });

  describe('generateFieldGoalTable', () => {
    it('should have high probability for short field goals', () => {
      const table = generateFieldGoalTable(80, 25, 0);

      const madeProb = table.find(e => e.outcome === 'field_goal_made')?.probability ?? 0;

      expect(madeProb).toBeGreaterThan(0.9);
    });

    it('should have lower probability for long field goals', () => {
      const table = generateFieldGoalTable(80, 55, 0);

      const madeProb = table.find(e => e.outcome === 'field_goal_made')?.probability ?? 0;

      // Long field goals (55+ yards) should have lower probability
      expect(madeProb).toBeLessThan(0.7);
    });

    it('should account for kicker rating', () => {
      const goodKickerTable = generateFieldGoalTable(90, 45, 0);
      const badKickerTable = generateFieldGoalTable(50, 45, 0);

      const goodKickerProb = goodKickerTable.find(e => e.outcome === 'field_goal_made')?.probability ?? 0;
      const badKickerProb = badKickerTable.find(e => e.outcome === 'field_goal_made')?.probability ?? 0;

      expect(goodKickerProb).toBeGreaterThan(badKickerProb);
    });

    it('should account for weather effects', () => {
      const normalTable = generateFieldGoalTable(80, 45, 0);
      const windyTable = generateFieldGoalTable(80, 45, -10);

      const normalProb = normalTable.find(e => e.outcome === 'field_goal_made')?.probability ?? 0;
      const windyProb = windyTable.find(e => e.outcome === 'field_goal_made')?.probability ?? 0;

      expect(normalProb).toBeGreaterThan(windyProb);
    });

    it('should sum to 1.0', () => {
      const table = generateFieldGoalTable(75, 40, 0);

      const sum = table.reduce((acc, e) => acc + e.probability, 0);

      expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
    });
  });

  describe('utility functions', () => {
    describe('isTurnover', () => {
      it('should return true for turnovers', () => {
        expect(isTurnover('interception')).toBe(true);
        expect(isTurnover('fumble_lost')).toBe(true);
      });

      it('should return false for non-turnovers', () => {
        expect(isTurnover('touchdown')).toBe(false);
        expect(isTurnover('incomplete')).toBe(false);
        expect(isTurnover('fumble')).toBe(false); // Fumble recovered by offense
        expect(isTurnover('sack')).toBe(false);
      });
    });

    describe('isPositiveOutcome', () => {
      it('should return true for positive outcomes', () => {
        expect(isPositiveOutcome('touchdown')).toBe(true);
        expect(isPositiveOutcome('big_gain')).toBe(true);
        expect(isPositiveOutcome('good_gain')).toBe(true);
        expect(isPositiveOutcome('moderate_gain')).toBe(true);
        expect(isPositiveOutcome('short_gain')).toBe(true);
      });

      it('should return false for negative outcomes', () => {
        expect(isPositiveOutcome('loss')).toBe(false);
        expect(isPositiveOutcome('sack')).toBe(false);
        expect(isPositiveOutcome('interception')).toBe(false);
      });
    });

    describe('isNegativeOutcome', () => {
      it('should return true for negative outcomes', () => {
        expect(isNegativeOutcome('loss')).toBe(true);
        expect(isNegativeOutcome('big_loss')).toBe(true);
        expect(isNegativeOutcome('sack')).toBe(true);
        expect(isNegativeOutcome('interception')).toBe(true);
        expect(isNegativeOutcome('fumble_lost')).toBe(true);
      });

      it('should return false for positive outcomes', () => {
        expect(isNegativeOutcome('touchdown')).toBe(false);
        expect(isNegativeOutcome('big_gain')).toBe(false);
      });
    });
  });
});
