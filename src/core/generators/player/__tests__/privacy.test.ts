import { Position } from '../../../models/player/Position';
import { createPlayerViewModel } from '../../../models/player/PlayerViewModel';
import { generatePlayer, generateRoster } from '../PlayerGenerator';

describe('Privacy Tests - Hidden Values Not Exposed', () => {
  describe('trueValue is not exposed in view model', () => {
    it('should not contain trueValue in serialized view model', () => {
      for (let i = 0; i < 10; i++) {
        const player = generatePlayer({ position: Position.QB });
        const viewModel = createPlayerViewModel(player);
        const serialized = JSON.stringify(viewModel);

        expect(serialized).not.toContain('"trueValue"');
        expect(serialized).not.toContain('trueValue');
      }
    });

    it('should only expose perceived ranges in skills', () => {
      const player = generatePlayer({ position: Position.WR });
      const viewModel = createPlayerViewModel(player);

      // Check that skills only have min/max values (as skillRanges)
      for (const skill of Object.values(viewModel.skillRanges)) {
        expect(skill).toHaveProperty('min');
        expect(skill).toHaveProperty('max');
        expect((skill as unknown as Record<string, unknown>).trueValue).toBeUndefined();
      }
    });
  });

  describe('"It" factor is not exposed in view model', () => {
    it('should not contain itFactor in serialized view model', () => {
      for (let i = 0; i < 10; i++) {
        const player = generatePlayer();
        const viewModel = createPlayerViewModel(player);
        const serialized = JSON.stringify(viewModel);

        // The raw player DOES have itFactor with value
        expect(player.itFactor.value).toBeDefined();

        // But the view model should not expose it
        expect(serialized).not.toContain('itFactor');
      }
    });

    it('should not expose the numerical "It" factor value', () => {
      const player = generatePlayer({ position: Position.RB });
      const viewModel = createPlayerViewModel(player);

      // itFactor should not exist in view model
      expect((viewModel as unknown as Record<string, unknown>).itFactor).toBeUndefined();
    });
  });

  describe('consistency tier is not exposed in view model', () => {
    it('should not contain hidden consistency tier in serialized view model', () => {
      for (let i = 0; i < 10; i++) {
        const player = generatePlayer();
        const viewModel = createPlayerViewModel(player);
        const serialized = JSON.stringify(viewModel);

        // The actual tier value should not be exposed
        expect(serialized).not.toContain('consistency');
        expect(serialized).not.toContain('"tier"');
      }
    });
  });

  describe('hidden traits are not exposed before revealed', () => {
    it('should not expose unrevealed traits in view model', () => {
      for (let i = 0; i < 10; i++) {
        const player = generatePlayer();
        const viewModel = createPlayerViewModel(player);
        const serialized = JSON.stringify(viewModel);

        // Player has actual traits
        const hasPositiveTraits = player.hiddenTraits.positive.length > 0;
        const hasNegativeTraits = player.hiddenTraits.negative.length > 0;

        // If player has traits, they should not appear in view model
        // unless they are in revealedToUser (which is empty for new players)
        if (hasPositiveTraits) {
          for (const trait of player.hiddenTraits.positive) {
            // All traits should be hidden since revealedToUser starts empty
            expect(viewModel.knownTraits).not.toContain(trait);
          }
        }

        if (hasNegativeTraits) {
          for (const trait of player.hiddenTraits.negative) {
            expect(viewModel.knownTraits).not.toContain(trait);
          }
        }

        // View model should not contain positive/negative arrays
        expect(serialized).not.toContain('"positive"');
        expect(serialized).not.toContain('"negative"');
      }
    });

    it('should start with empty revealed traits', () => {
      for (let i = 0; i < 20; i++) {
        const player = generatePlayer();
        expect(player.hiddenTraits.revealedToUser).toEqual([]);
      }
    });

    it('should have empty knownTraits in view model for new players', () => {
      for (let i = 0; i < 20; i++) {
        const player = generatePlayer();
        const viewModel = createPlayerViewModel(player);
        expect(viewModel.knownTraits).toEqual([]);
      }
    });
  });

  describe('role effectiveness is not exposed', () => {
    it('should not expose numerical role effectiveness in view model', () => {
      for (let i = 0; i < 10; i++) {
        const player = generatePlayer();
        const viewModel = createPlayerViewModel(player);
        const serialized = JSON.stringify(viewModel);

        // Player has effectiveness value
        expect(player.roleFit.roleEffectiveness).toBeDefined();

        // But view model should not expose the number
        expect(serialized).not.toContain('roleEffectiveness');
      }
    });

    it('should only expose qualitative role fit description', () => {
      const player = generatePlayer({ position: Position.LT });
      const viewModel = createPlayerViewModel(player);

      // Should have a description string instead of numbers
      expect(typeof viewModel.roleFitDescription).toBe('string');
      expect(viewModel.roleFitDescription.length).toBeGreaterThan(0);
    });
  });

  describe('overall ratings are never calculated', () => {
    it('should not have any overall rating property', () => {
      for (let i = 0; i < 10; i++) {
        const player = generatePlayer();
        const viewModel = createPlayerViewModel(player);
        const serialized = JSON.stringify(viewModel);

        // Should never have an "overall" or "rating" or "ovr" property
        expect(serialized).not.toMatch(/"overall"/i);
        expect(serialized).not.toMatch(/"ovr"/i);
        expect(serialized).not.toMatch(/"playerRating"/i);
        expect(serialized).not.toMatch(/"totalRating"/i);
      }
    });

    it('should not calculate aggregate skill scores for display', () => {
      const player = generatePlayer({ position: Position.QB });
      const viewModel = createPlayerViewModel(player) as unknown as Record<string, unknown>;

      // Check that there's no aggregated score
      expect(viewModel.overallSkill).toBeUndefined();
      expect(viewModel.skillScore).toBeUndefined();
      expect(viewModel.rating).toBeUndefined();
    });
  });

  describe('physical attributes ARE visible', () => {
    it('should expose physical attributes in view model', () => {
      const player = generatePlayer({ position: Position.LT });
      const viewModel = createPlayerViewModel(player);

      // Physical attributes should be fully visible
      expect(viewModel.physical).toBeDefined();
      expect(viewModel.physical.height).toBe(player.physical.height);
      expect(viewModel.physical.weight).toBe(player.physical.weight);
      expect(viewModel.physical.speed).toBe(player.physical.speed);
      expect(viewModel.physical.armLength).toBe(player.physical.armLength);
      expect(viewModel.physical.handSize).toBe(player.physical.handSize);
    });
  });

  describe('roster generation maintains privacy', () => {
    it('should not expose hidden values in any roster player', () => {
      const roster = generateRoster('team-1');

      for (const player of roster) {
        const viewModel = createPlayerViewModel(player);
        const serialized = JSON.stringify(viewModel);

        // Check all privacy requirements
        expect(serialized).not.toContain('"trueValue"');
        expect(serialized).not.toContain('itFactor');
        expect(serialized).not.toContain('consistency');
        expect(serialized).not.toContain('roleEffectiveness');
      }
    });
  });

  describe('snapshot test for data leakage', () => {
    it('should match expected view model structure', () => {
      const player = generatePlayer({ position: Position.CB });
      const viewModel = createPlayerViewModel(player);

      // Check that view model has the expected shape
      expect(Object.keys(viewModel)).toEqual(
        expect.arrayContaining([
          'id',
          'name',
          'position',
          'age',
          'experience',
          'physical',
          'skillRanges',
          'knownTraits',
          'schemeFitDescription',
          'roleFitDescription',
          'injuryDisplay',
          'draftInfo',
        ])
      );

      // Check skillRanges structure
      const skillKeys = Object.keys(viewModel.skillRanges);
      expect(skillKeys.length).toBeGreaterThan(0);

      for (const skill of Object.values(viewModel.skillRanges)) {
        expect(Object.keys(skill).sort()).toEqual(['max', 'min']);
      }
    });
  });

  describe('scheme fits are not directly exposed', () => {
    it('should not expose raw scheme fit data', () => {
      const player = generatePlayer({ position: Position.WR });
      const viewModel = createPlayerViewModel(player);
      const serialized = JSON.stringify(viewModel);

      // Should not contain the raw schemeFits object with offensive/defensive
      expect(serialized).not.toContain('"schemeFits"');

      // Should have a description instead
      expect(viewModel.schemeFitDescription).toBeDefined();
    });
  });
});
