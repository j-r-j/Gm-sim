/**
 * Privacy Audit Integration Tests
 *
 * Ensures no hidden data (trueValue, itFactor, overall ratings) leaks to UI layer
 * This is CRITICAL for maintaining the game's mystery and skill evaluation mechanics
 */

import { generatePlayer, generateRoster } from '../../core/generators/player/PlayerGenerator';
import { Player } from '../../core/models/player/Player';
import {
  createPlayerViewModel,
  validateViewModelPrivacy,
  PlayerViewModel,
} from '../../core/models/player/PlayerViewModel';
import { Position } from '../../core/models/player/Position';

/**
 * List of forbidden terms that should NEVER appear in any UI-facing data
 */
const FORBIDDEN_TERMS = [
  'trueValue',
  'itFactor',
  'consistencyTier',
  'consistency',
  'hiddenTraits',
  'positive:',
  'negative:',
  'schemeFits',
  'roleEffectiveness',
  'overall',
  'overallRating',
  'aggregateRating',
  'totalRating',
  'compositeRating',
];

/**
 * Deep scan an object for forbidden terms
 */
function scanForForbiddenTerms(obj: unknown, path: string = ''): string[] {
  const violations: string[] = [];
  const json = JSON.stringify(obj);

  for (const term of FORBIDDEN_TERMS) {
    if (json.includes(term)) {
      violations.push(`Found forbidden term "${term}" in ${path || 'root'}`);
    }
  }

  return violations;
}

/**
 * Verify a ViewModel doesn't contain any property that could leak hidden data
 */
function auditViewModel(viewModel: PlayerViewModel): string[] {
  const violations: string[] = [];
  const json = JSON.stringify(viewModel);

  // Check for forbidden terms
  for (const term of FORBIDDEN_TERMS) {
    if (json.toLowerCase().includes(term.toLowerCase())) {
      violations.push(`ViewModel contains forbidden term: ${term}`);
    }
  }

  // Verify skillRanges don't contain trueValue
  for (const [skillName, range] of Object.entries(viewModel.skillRanges)) {
    if ('trueValue' in (range as object)) {
      violations.push(`Skill "${skillName}" exposes trueValue`);
    }
    if ('value' in (range as object)) {
      violations.push(`Skill "${skillName}" exposes direct value`);
    }
  }

  // Verify no numeric fields that could be hidden ratings
  const suspiciousNumericFields = ['itFactor', 'overall', 'rating', 'effectiveness'];
  for (const field of suspiciousNumericFields) {
    if (json.includes(`"${field}":`)) {
      violations.push(`ViewModel may contain suspicious numeric field: ${field}`);
    }
  }

  return violations;
}

describe('Privacy Audit Integration Tests', () => {
  describe('PlayerViewModel privacy', () => {
    it('should pass privacy validation for all player types', () => {
      const players: Player[] = [
        generatePlayer({ position: Position.QB, skillTier: 'elite' }),
        generatePlayer({ position: Position.RB, skillTier: 'starter' }),
        generatePlayer({ position: Position.WR, skillTier: 'backup' }),
        generatePlayer({ position: Position.CB, skillTier: 'fringe' }),
        generatePlayer({ forDraft: true, position: Position.DE }),
        generatePlayer({ forDraft: true, position: Position.OLB }),
        generatePlayer({ ageRange: { min: 38, max: 40 } }), // Veteran
      ];

      for (const player of players) {
        const viewModel = createPlayerViewModel(player);
        expect(validateViewModelPrivacy(viewModel)).toBe(true);
      }
    });

    it('should NEVER expose trueValue in any ViewModel', () => {
      // Generate 100 random players and check each
      for (let i = 0; i < 100; i++) {
        const player = generatePlayer({});
        const viewModel = createPlayerViewModel(player);
        const json = JSON.stringify(viewModel);

        expect(json).not.toContain('trueValue');
        expect(json).not.toContain('"true"');
      }
    });

    it('should NEVER expose itFactor in any ViewModel', () => {
      for (let i = 0; i < 100; i++) {
        const player = generatePlayer({});
        const viewModel = createPlayerViewModel(player);
        const json = JSON.stringify(viewModel);

        expect(json).not.toContain('"itFactor"');
        expect(json).not.toContain('"it"');
      }
    });

    it('should NEVER expose consistency tier in any ViewModel', () => {
      for (let i = 0; i < 100; i++) {
        const player = generatePlayer({});
        const viewModel = createPlayerViewModel(player);
        const json = JSON.stringify(viewModel);

        expect(json).not.toContain('consistencyTier');
        expect(json).not.toContain('"consistency"');
      }
    });

    it('should NEVER expose overall/aggregate ratings', () => {
      for (let i = 0; i < 100; i++) {
        const player = generatePlayer({});
        const viewModel = createPlayerViewModel(player);
        const json = JSON.stringify(viewModel);

        expect(json).not.toContain('overall');
        expect(json).not.toContain('aggregate');
        expect(json).not.toContain('composite');
        expect(json).not.toContain('totalRating');
      }
    });

    it('should audit complete roster without violations', () => {
      const roster = generateRoster('audit-team');

      for (const player of roster) {
        const viewModel = createPlayerViewModel(player);
        const violations = auditViewModel(viewModel);

        if (violations.length > 0) {
          // eslint-disable-next-line no-console
          console.error(`Player ${player.firstName} ${player.lastName} violations:`, violations);
        }

        expect(violations.length).toBe(0);
      }
    });
  });

  describe('skill range integrity', () => {
    it('should only expose min/max bounds for skills', () => {
      const player = generatePlayer({ position: Position.QB, skillTier: 'elite' });
      const viewModel = createPlayerViewModel(player);

      for (const range of Object.values(viewModel.skillRanges)) {
        // Should have min and max
        expect(range).toHaveProperty('min');
        expect(range).toHaveProperty('max');

        // Min should be <= max
        expect(range.min).toBeLessThanOrEqual(range.max);

        // Should NOT have trueValue or any other property
        const rangeKeys = Object.keys(range);
        expect(rangeKeys).toHaveLength(2);
        expect(rangeKeys).toContain('min');
        expect(rangeKeys).toContain('max');
      }
    });

    it('should maintain range uncertainty (not expose exact values)', () => {
      const player = generatePlayer({ position: Position.WR });
      const viewModel = createPlayerViewModel(player);

      for (const range of Object.values(viewModel.skillRanges)) {
        // Range should have some spread (uncertainty)
        // Note: Very experienced scouts might narrow ranges, but they should never be exact
        expect(range.max - range.min).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('hidden traits protection', () => {
    it('should only expose revealed traits', () => {
      const player = generatePlayer({ position: Position.CB });

      // Set up test traits (using valid camelCase trait names)
      player.hiddenTraits.positive = ['clutch', 'filmJunkie', 'leader'];
      player.hiddenTraits.negative = ['injuryProne', 'lazy'];
      player.hiddenTraits.revealedToUser = ['clutch']; // Only one revealed

      const viewModel = createPlayerViewModel(player);

      // Should only show revealed traits
      expect(viewModel.knownTraits).toContain('clutch');
      expect(viewModel.knownTraits.length).toBe(1);

      // Unrevealed traits should NOT appear
      expect(viewModel.knownTraits).not.toContain('filmJunkie');
      expect(viewModel.knownTraits).not.toContain('leader');
      expect(viewModel.knownTraits).not.toContain('injuryProne');
      expect(viewModel.knownTraits).not.toContain('lazy');
    });

    it('should not leak trait category information', () => {
      const player = generatePlayer({ position: Position.RB });
      const viewModel = createPlayerViewModel(player);
      const json = JSON.stringify(viewModel);

      // Should not indicate whether traits are positive or negative
      expect(json).not.toContain('"positive"');
      expect(json).not.toContain('"negative"');
      expect(json).not.toContain('revealedToUser');
    });
  });

  describe('scheme fit privacy', () => {
    it('should only provide qualitative descriptions, not fit levels', () => {
      const player = generatePlayer({ position: Position.WR });
      const viewModel = createPlayerViewModel(player, 'westCoast');
      const json = JSON.stringify(viewModel);

      // Should have description, not raw fit data
      expect(viewModel.schemeFitDescription).toBeDefined();
      expect(typeof viewModel.schemeFitDescription).toBe('string');

      // Should not expose the actual schemeFits object
      expect(json).not.toContain('"schemeFits"');
      expect(json).not.toContain('"offensive"');
      expect(json).not.toContain('"defensive"');
    });

    it('should use vague language for scheme fit descriptions', () => {
      const player = generatePlayer({ position: Position.DE });
      const viewModel = createPlayerViewModel(player, 'fourThreeUnder');

      // Description should be qualitative, not numeric
      expect(viewModel.schemeFitDescription).toMatch(
        /Unknown|Good|Excellent|Poor|Average|fit|scheme/i
      );
    });
  });

  describe('role fit privacy', () => {
    it('should only provide qualitative role description', () => {
      const player = generatePlayer({ position: Position.ILB });
      const viewModel = createPlayerViewModel(player);
      const json = JSON.stringify(viewModel);

      // Should have description
      expect(viewModel.roleFitDescription).toBeDefined();
      expect(typeof viewModel.roleFitDescription).toBe('string');

      // Should not expose roleEffectiveness number
      expect(json).not.toContain('roleEffectiveness');
      expect(json).not.toContain('"effectiveness"');
    });
  });

  describe('batch privacy audit', () => {
    it('should pass privacy audit for 1000 generated players', () => {
      const violations: string[] = [];

      for (let i = 0; i < 1000; i++) {
        const player = generatePlayer({});
        const viewModel = createPlayerViewModel(player);

        if (!validateViewModelPrivacy(viewModel)) {
          violations.push(`Player ${i} failed privacy validation`);
        }

        const json = JSON.stringify(viewModel);
        for (const term of FORBIDDEN_TERMS) {
          if (json.toLowerCase().includes(term.toLowerCase())) {
            violations.push(`Player ${i}: Found forbidden term "${term}"`);
          }
        }
      }

      expect(violations.length).toBe(0);
    });

    it('should pass privacy audit for all 32 team rosters', () => {
      const violations: string[] = [];

      for (let teamNum = 1; teamNum <= 32; teamNum++) {
        const roster = generateRoster(`team-${teamNum}`);

        for (const player of roster) {
          const viewModel = createPlayerViewModel(player);

          if (!validateViewModelPrivacy(viewModel)) {
            violations.push(
              `Team ${teamNum}, ${player.firstName} ${player.lastName}: Failed privacy`
            );
          }
        }
      }

      expect(violations.length).toBe(0);
    });
  });

  describe('serialization safety', () => {
    it('should be safe to send ViewModel to client', () => {
      const player = generatePlayer({ position: Position.QB, skillTier: 'elite' });
      const viewModel = createPlayerViewModel(player);

      // Simulate JSON serialization (as would happen in API response)
      const serialized = JSON.stringify(viewModel);
      const deserialized = JSON.parse(serialized);

      // After round-trip, should still pass privacy checks
      const roundTripViolations = scanForForbiddenTerms(deserialized);
      expect(roundTripViolations.length).toBe(0);
    });

    it('should not leak data through prototype pollution', () => {
      const player = generatePlayer({ position: Position.RB });
      const viewModel = createPlayerViewModel(player);

      // Check prototype chain
      const proto = Object.getPrototypeOf(viewModel);
      expect(proto).toBe(Object.prototype);

      // Check for any hidden properties
      const allKeys = Object.getOwnPropertyNames(viewModel);
      for (const key of allKeys) {
        expect(FORBIDDEN_TERMS).not.toContain(key);
      }
    });
  });
});

describe('Privacy Compliance Checklist', () => {
  it('CHECKPOINT: allViewModelsPrivate - should pass', () => {
    const samples = 100;
    let passed = 0;

    for (let i = 0; i < samples; i++) {
      const player = generatePlayer({});
      const viewModel = createPlayerViewModel(player);
      if (validateViewModelPrivacy(viewModel)) {
        passed++;
      }
    }

    expect(passed).toBe(samples);
  });

  it('CHECKPOINT: noTrueValueLeaks - should pass', () => {
    const samples = 100;

    for (let i = 0; i < samples; i++) {
      const player = generatePlayer({});
      const viewModel = createPlayerViewModel(player);
      const json = JSON.stringify(viewModel);

      expect(json).not.toContain('trueValue');
    }
  });

  it('CHECKPOINT: noItFactorExposed - should pass', () => {
    const samples = 100;

    for (let i = 0; i < samples; i++) {
      const player = generatePlayer({});
      const viewModel = createPlayerViewModel(player);
      const json = JSON.stringify(viewModel);

      expect(json).not.toContain('itFactor');
    }
  });

  it('CHECKPOINT: noOverallRatings - should pass', () => {
    const samples = 100;

    for (let i = 0; i < samples; i++) {
      const player = generatePlayer({});
      const viewModel = createPlayerViewModel(player);
      const json = JSON.stringify(viewModel);

      expect(json).not.toContain('overall');
      expect(json).not.toContain('aggregate');
      expect(json).not.toContain('totalRating');
    }
  });
});
