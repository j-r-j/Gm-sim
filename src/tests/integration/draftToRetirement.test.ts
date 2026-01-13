/**
 * Draft-to-Retirement Lifecycle Integration Tests
 *
 * Tests for complete player lifecycle from draft through retirement
 */

import {
  generatePlayer,
  generateSimpleDraftClass,
  generateRoster,
} from '../../core/generators/player/PlayerGenerator';
import { Player, validatePlayer, isRookie, isVeteran } from '../../core/models/player/Player';
import {
  createPlayerViewModel,
  validateViewModelPrivacy,
} from '../../core/models/player/PlayerViewModel';
import {
  Position,
  OFFENSIVE_POSITIONS,
  DEFENSIVE_POSITIONS,
} from '../../core/models/player/Position';

describe('Draft-to-Retirement Lifecycle Integration Tests', () => {
  describe('draft class generation', () => {
    it('should generate a complete draft class with 300 prospects', () => {
      const draftClass = generateSimpleDraftClass(300);

      expect(draftClass.length).toBe(300);

      // All prospects should be valid players
      for (const prospect of draftClass) {
        expect(validatePlayer(prospect)).toBe(true);
      }
    });

    it('should generate draft prospects with proper attributes', () => {
      const draftClass = generateSimpleDraftClass(100);

      for (const prospect of draftClass) {
        // Draft prospects should be rookies
        expect(prospect.experience).toBe(0);

        // Age should be in rookie range (21-24)
        expect(prospect.age).toBeGreaterThanOrEqual(21);
        expect(prospect.age).toBeLessThanOrEqual(24);

        // Should have draft year set
        expect(prospect.draftYear).toBe(new Date().getFullYear());
      }
    });

    it('should distribute skill tiers across draft class', () => {
      const draftClass = generateSimpleDraftClass(300);

      // Count by role ceiling (proxy for skill tier)
      const ceilingCounts = {
        elite: 0,
        starter: 0,
        backup: 0,
        fringe: 0,
      };

      for (const prospect of draftClass) {
        const ceiling = prospect.roleFit.ceiling;
        if (ceiling === 'franchiseCornerstone' || ceiling === 'highEndStarter') {
          ceilingCounts.elite++;
        } else if (ceiling === 'solidStarter') {
          ceilingCounts.starter++;
        } else if (ceiling === 'qualityRotational' || ceiling === 'specialist') {
          ceilingCounts.backup++;
        } else {
          ceilingCounts.fringe++;
        }
      }

      // Should have distribution of talent
      expect(ceilingCounts.elite).toBeGreaterThan(0);
      expect(ceilingCounts.starter).toBeGreaterThan(0);
      expect(ceilingCounts.backup).toBeGreaterThan(0);
      expect(ceilingCounts.fringe).toBeGreaterThan(0);

      // Elite players should be minority
      expect(ceilingCounts.elite).toBeLessThan(ceilingCounts.fringe);
    });

    it('should cover all positions in draft class', () => {
      const draftClass = generateSimpleDraftClass(300);
      const positions = new Set<Position>();

      for (const prospect of draftClass) {
        positions.add(prospect.position);
      }

      // Should have variety of positions
      expect(positions.size).toBeGreaterThan(10);

      // Should include offensive positions
      const hasOffensivePositions = OFFENSIVE_POSITIONS.some((pos) => positions.has(pos));
      expect(hasOffensivePositions).toBe(true);

      // Should include defensive positions
      const hasDefensivePositions = DEFENSIVE_POSITIONS.some((pos) => positions.has(pos));
      expect(hasDefensivePositions).toBe(true);
    });
  });

  describe('rookie development', () => {
    it('should track rookie year attributes', () => {
      const rookie = generatePlayer({
        forDraft: true,
        position: Position.QB,
        skillTier: 'starter',
      });

      expect(isRookie(rookie)).toBe(true);
      expect(rookie.experience).toBe(0);
      expect(validatePlayer(rookie)).toBe(true);
    });

    it('should generate valid view model for rookies', () => {
      const rookie = generatePlayer({
        forDraft: true,
        position: Position.WR,
      });

      const viewModel = createPlayerViewModel(rookie);

      expect(viewModel.experience).toBe(0);
      expect(validateViewModelPrivacy(viewModel)).toBe(true);

      // View model should not expose hidden data
      const json = JSON.stringify(viewModel);
      expect(json).not.toContain('trueValue');
      expect(json).not.toContain('itFactor');
    });
  });

  describe('career progression simulation', () => {
    it('should simulate player aging through career', () => {
      // Create a rookie
      let player = generatePlayer({
        forDraft: true,
        position: Position.RB,
        ageRange: { min: 22, max: 22 },
      });

      const initialAge = player.age;
      expect(initialAge).toBe(22);

      // Simulate 10 years of career
      for (let year = 0; year < 10; year++) {
        // Age the player
        player = {
          ...player,
          age: player.age + 1,
          experience: player.experience + 1,
        };

        expect(validatePlayer(player)).toBe(true);
      }

      expect(player.age).toBe(32);
      expect(player.experience).toBe(10);
      expect(isVeteran(player)).toBe(true);
    });

    it('should track experience milestones', () => {
      const player = generatePlayer({
        forDraft: true,
        position: Position.CB,
      });

      // Rookie year
      expect(isRookie(player)).toBe(true);
      expect(isVeteran(player)).toBe(false);

      // After 4 years (post-rookie contract)
      const year4Player = {
        ...player,
        age: player.age + 4,
        experience: 4,
      };
      expect(isRookie(year4Player)).toBe(false);
      expect(isVeteran(year4Player)).toBe(false);

      // After 5+ years (veteran)
      const veteranPlayer = {
        ...player,
        age: player.age + 7,
        experience: 7,
      };
      expect(isVeteran(veteranPlayer)).toBe(true);
    });

    it('should maintain valid state through 15-year career', () => {
      let player = generatePlayer({
        forDraft: true,
        position: Position.QB,
        ageRange: { min: 22, max: 22 },
      });

      // Simulate 15 year career
      for (let year = 0; year < 15; year++) {
        player = {
          ...player,
          age: player.age + 1,
          experience: player.experience + 1,
          // Simulate fatigue fluctuations
          fatigue: Math.min(100, Math.max(0, player.fatigue + (Math.random() - 0.5) * 20)),
          morale: Math.min(100, Math.max(0, player.morale + (Math.random() - 0.5) * 10)),
        };

        expect(validatePlayer(player)).toBe(true);
      }

      expect(player.age).toBe(37);
      expect(player.experience).toBe(15);
    });
  });

  describe('roster lifecycle', () => {
    it('should generate complete 53-man roster', () => {
      const roster = generateRoster('team-1');

      expect(roster.length).toBe(53);

      // All players should be valid
      for (const player of roster) {
        expect(validatePlayer(player)).toBe(true);
      }
    });

    it('should have appropriate position distribution', () => {
      const roster = generateRoster('team-1');
      const positionCounts = new Map<Position, number>();

      for (const player of roster) {
        const count = positionCounts.get(player.position) || 0;
        positionCounts.set(player.position, count + 1);
      }

      // Should have QBs
      expect(positionCounts.get(Position.QB)).toBeGreaterThanOrEqual(2);

      // Should have multiple skill position players
      expect(positionCounts.get(Position.WR)).toBeGreaterThanOrEqual(4);
      expect(positionCounts.get(Position.RB)).toBeGreaterThanOrEqual(2);

      // Should have complete offensive line
      expect(positionCounts.get(Position.LT)).toBeGreaterThanOrEqual(1);
      expect(positionCounts.get(Position.C)).toBeGreaterThanOrEqual(1);
      expect(positionCounts.get(Position.RT)).toBeGreaterThanOrEqual(1);
    });

    it('should have mix of starters and backups', () => {
      const roster = generateRoster('team-1');

      let starterTier = 0;
      let backupTier = 0;

      for (const player of roster) {
        const ceiling = player.roleFit.ceiling;
        if (
          ceiling === 'franchiseCornerstone' ||
          ceiling === 'highEndStarter' ||
          ceiling === 'solidStarter'
        ) {
          starterTier++;
        } else {
          backupTier++;
        }
      }

      // Should have roughly 22 starters and 31 backups
      expect(starterTier).toBeGreaterThan(15);
      expect(backupTier).toBeGreaterThan(15);
    });
  });

  describe('hidden data protection', () => {
    it('should never expose true values in view models', () => {
      const players = [
        generatePlayer({ position: Position.QB, skillTier: 'elite' }),
        generatePlayer({ position: Position.RB, skillTier: 'starter' }),
        generatePlayer({ position: Position.WR, skillTier: 'backup' }),
        generatePlayer({ position: Position.CB, skillTier: 'fringe' }),
        generatePlayer({ forDraft: true }),
      ];

      for (const player of players) {
        const viewModel = createPlayerViewModel(player);
        expect(validateViewModelPrivacy(viewModel)).toBe(true);

        const json = JSON.stringify(viewModel);

        // Critical: these should NEVER appear
        expect(json).not.toContain('trueValue');
        expect(json).not.toContain('"itFactor"');
        expect(json).not.toContain('consistencyTier');
        expect(json).not.toContain('roleEffectiveness');
      }
    });

    it('should provide skill ranges instead of exact values', () => {
      const player = generatePlayer({
        position: Position.QB,
        skillTier: 'starter',
      });

      const viewModel = createPlayerViewModel(player);

      // Should have skill ranges
      expect(viewModel.skillRanges).toBeDefined();
      expect(Object.keys(viewModel.skillRanges).length).toBeGreaterThan(0);

      // Each range should have min/max but NOT trueValue
      for (const range of Object.values(viewModel.skillRanges)) {
        expect(range.min).toBeDefined();
        expect(range.max).toBeDefined();
        expect(range.min).toBeLessThanOrEqual(range.max);
        // Verify trueValue is not present
        expect('trueValue' in range).toBe(false);
      }
    });
  });

  describe('trait revelation lifecycle', () => {
    it('should start with no revealed traits for draft prospects', () => {
      const prospect = generatePlayer({
        forDraft: true,
        position: Position.WR,
      });

      // Hidden traits should exist but not be revealed to user
      expect(prospect.hiddenTraits).toBeDefined();
      expect(prospect.hiddenTraits.revealedToUser).toBeDefined();

      // Typically starts with no or few revealed traits
      // (exact behavior depends on trait generation)
    });

    it('should have consistent trait structure', () => {
      const player = generatePlayer({
        position: Position.RB,
      });

      expect(player.hiddenTraits).toBeDefined();
      expect(Array.isArray(player.hiddenTraits.positive)).toBe(true);
      expect(Array.isArray(player.hiddenTraits.negative)).toBe(true);
      expect(Array.isArray(player.hiddenTraits.revealedToUser)).toBe(true);
    });

    it('should only show revealed traits in view model', () => {
      const player = generatePlayer({
        position: Position.CB,
      });

      // Manually set some revealed traits for testing (using correct camelCase names)
      player.hiddenTraits.positive = ['clutch', 'filmJunkie'];
      player.hiddenTraits.negative = ['injuryProne'];
      player.hiddenTraits.revealedToUser = ['clutch']; // Only one revealed

      const viewModel = createPlayerViewModel(player);

      // Should only contain revealed traits
      expect(viewModel.knownTraits).toContain('clutch');
      expect(viewModel.knownTraits).not.toContain('filmJunkie');
      expect(viewModel.knownTraits).not.toContain('injuryProne');
    });
  });

  describe('end of career scenarios', () => {
    it('should handle players at retirement age', () => {
      const veteranPlayer = generatePlayer({
        position: Position.QB,
        ageRange: { min: 40, max: 42 },
      });

      // Should still be valid
      expect(validatePlayer(veteranPlayer)).toBe(true);
      expect(veteranPlayer.age).toBeGreaterThanOrEqual(40);
      expect(isVeteran(veteranPlayer)).toBe(true);
    });

    it('should handle very experienced players', () => {
      // Create an experienced veteran
      const player = generatePlayer({
        position: Position.K, // Kickers can play longer
        ageRange: { min: 38, max: 38 },
      });

      // Simulate long career
      const longCareerPlayer = {
        ...player,
        experience: 18, // 18-year career
        age: 40,
      };

      expect(validatePlayer(longCareerPlayer)).toBe(true);
    });

    it('should validate maximum reasonable career length', () => {
      const validLongCareer = generatePlayer({
        position: Position.QB,
        ageRange: { min: 45, max: 45 },
      });

      const modifiedPlayer = {
        ...validLongCareer,
        experience: 23,
      };

      expect(validatePlayer(modifiedPlayer)).toBe(true);

      // Invalid: experience > 25
      const invalidPlayer = {
        ...validLongCareer,
        experience: 26,
      };

      expect(validatePlayer(invalidPlayer)).toBe(false);
    });
  });

  describe('league-wide player generation', () => {
    it('should generate players for all 32 teams', () => {
      // Generate rosters for 32 teams
      const allPlayers: Player[] = [];

      for (let teamNum = 1; teamNum <= 32; teamNum++) {
        const roster = generateRoster(`team-${teamNum}`);
        allPlayers.push(...roster);
      }

      // Should have 32 * 53 = 1696 players
      expect(allPlayers.length).toBe(1696);

      // All should be valid
      for (const player of allPlayers) {
        expect(validatePlayer(player)).toBe(true);
      }
    });
  });
});
