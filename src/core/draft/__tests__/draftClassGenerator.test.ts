import {
  generateDraftClass,
  getDraftClassSummary,
  getProspectsByPosition,
  getTopProspects,
  validateDraftClass,
  DraftClass,
} from '../DraftClassGenerator';
import { ClassStrength } from '../ClassStrengthSystem';
import { validateProspect } from '../Prospect';
import {
  Position,
  OFFENSIVE_POSITIONS,
  DEFENSIVE_POSITIONS,
  SPECIAL_TEAMS_POSITIONS,
} from '../../models/player/Position';

describe('DraftClassGenerator', () => {
  // Cache a draft class for tests that don't need fresh data
  let cachedDraftClass: DraftClass;

  beforeAll(() => {
    cachedDraftClass = generateDraftClass({ year: 2025 });
  });

  describe('generateDraftClass', () => {
    it('should generate at least 250 prospects', () => {
      const draftClass = generateDraftClass({ minProspects: 250, maxProspects: 300 });
      expect(draftClass.prospects.length).toBeGreaterThanOrEqual(250);
    });

    it('should not exceed 350 prospects (with position coverage)', () => {
      const draftClass = generateDraftClass({ minProspects: 250, maxProspects: 300 });
      // With position coverage additions, should still be reasonable
      expect(draftClass.prospects.length).toBeLessThanOrEqual(350);
    });

    it('should generate valid prospects', () => {
      for (const prospect of cachedDraftClass.prospects.slice(0, 50)) {
        expect(validateProspect(prospect)).toBe(true);
      }
    });

    it('should include all positions', () => {
      const allPositions = [
        ...OFFENSIVE_POSITIONS,
        ...DEFENSIVE_POSITIONS,
        ...SPECIAL_TEAMS_POSITIONS,
      ];
      const positionsFound = new Set(cachedDraftClass.prospects.map((p) => p.player.position));

      for (const position of allPositions) {
        expect(positionsFound.has(position)).toBe(true);
      }
    });

    it('should use state-named colleges', () => {
      for (const prospect of cachedDraftClass.prospects.slice(0, 20)) {
        // All college names should contain common patterns
        const name = prospect.collegeName.toLowerCase();
        expect(
          name.includes('state of') ||
            name.includes('university of') ||
            name.includes('tech') ||
            name.includes('college')
        ).toBe(true);
      }
    });

    it('should respect specified class strength', () => {
      const historicClass = generateDraftClass({
        year: 2025,
        strength: ClassStrength.HISTORIC,
      });

      expect(historicClass.meta.strength).toBe(ClassStrength.HISTORIC);
    });

    it('should have valid metadata', () => {
      expect(cachedDraftClass.meta.year).toBe(2025);
      expect(Object.values(ClassStrength)).toContain(cachedDraftClass.meta.strength);
    });

    it('should include college programs', () => {
      expect(cachedDraftClass.collegePrograms.length).toBeGreaterThan(100);
    });
  });

  describe('position distribution', () => {
    it('should have more WRs than Ks/Ps', () => {
      const wrs = getProspectsByPosition(cachedDraftClass, Position.WR);
      const ks = getProspectsByPosition(cachedDraftClass, Position.K);
      const ps = getProspectsByPosition(cachedDraftClass, Position.P);

      expect(wrs.length).toBeGreaterThan(ks.length);
      expect(wrs.length).toBeGreaterThan(ps.length);
    });

    it('should have reasonable QB count', () => {
      const qbs = getProspectsByPosition(cachedDraftClass, Position.QB);

      // Should have enough QBs but not too many
      expect(qbs.length).toBeGreaterThanOrEqual(8);
      expect(qbs.length).toBeLessThanOrEqual(25);
    });

    it('should have minimum coverage for each position', () => {
      const minCounts: Partial<Record<Position, number>> = {
        [Position.QB]: 8,
        [Position.RB]: 10,
        [Position.WR]: 15,
        [Position.K]: 2,
        [Position.P]: 2,
      };

      for (const [position, minCount] of Object.entries(minCounts)) {
        const prospects = getProspectsByPosition(cachedDraftClass, position as Position);
        expect(prospects.length).toBeGreaterThanOrEqual(minCount);
      }
    });
  });

  describe('class strength effects', () => {
    it('should have more elite prospects in historic classes', () => {
      const historicClass = generateDraftClass({
        year: 2025,
        strength: ClassStrength.HISTORIC,
        minProspects: 300,
        maxProspects: 300,
      });

      const poorClass = generateDraftClass({
        year: 2025,
        strength: ClassStrength.POOR,
        minProspects: 300,
        maxProspects: 300,
      });

      const historicSummary = getDraftClassSummary(historicClass);
      const poorSummary = getDraftClassSummary(poorClass);

      expect(historicSummary.prospectsByTier.elite).toBeGreaterThan(
        poorSummary.prospectsByTier.elite
      );
    });
  });

  describe('getDraftClassSummary', () => {
    it('should provide accurate counts', () => {
      const summary = getDraftClassSummary(cachedDraftClass);

      expect(summary.totalProspects).toBe(cachedDraftClass.prospects.length);
      expect(summary.year).toBe(cachedDraftClass.year);
      expect(summary.strength).toBe(cachedDraftClass.meta.strength);
    });

    it('should count all positions', () => {
      const summary = getDraftClassSummary(cachedDraftClass);

      let totalByPosition = 0;
      for (const count of Object.values(summary.prospectsByPosition)) {
        totalByPosition += count;
      }

      expect(totalByPosition).toBe(cachedDraftClass.prospects.length);
    });

    it('should count all tiers', () => {
      const summary = getDraftClassSummary(cachedDraftClass);

      const totalByTier =
        summary.prospectsByTier.elite +
        summary.prospectsByTier.starter +
        summary.prospectsByTier.backup +
        summary.prospectsByTier.fringe;

      expect(totalByTier).toBe(cachedDraftClass.prospects.length);
    });

    it('should include position modifiers', () => {
      const summary = getDraftClassSummary(cachedDraftClass);

      expect(summary.strongPositions).toBeDefined();
      expect(summary.weakPositions).toBeDefined();
      expect(Array.isArray(summary.strongPositions)).toBe(true);
      expect(Array.isArray(summary.weakPositions)).toBe(true);
    });
  });

  describe('getProspectsByPosition', () => {
    it('should filter by position correctly', () => {
      const qbs = getProspectsByPosition(cachedDraftClass, Position.QB);

      for (const prospect of qbs) {
        expect(prospect.player.position).toBe(Position.QB);
      }
    });

    it('should return empty array for position with no prospects', () => {
      // Create a minimal draft class
      const smallClass: DraftClass = {
        ...cachedDraftClass,
        prospects: cachedDraftClass.prospects.filter((p) => p.player.position === Position.QB),
      };

      const rbs = getProspectsByPosition(smallClass, Position.RB);
      expect(rbs.length).toBe(0);
    });
  });

  describe('getTopProspects', () => {
    it('should return requested number of prospects', () => {
      const top50 = getTopProspects(cachedDraftClass, 50);
      expect(top50.length).toBe(50);
    });

    it('should return all if count exceeds total', () => {
      const all = getTopProspects(cachedDraftClass, 1000);
      expect(all.length).toBe(cachedDraftClass.prospects.length);
    });

    it('should sort by quality (role ceiling)', () => {
      const top10 = getTopProspects(cachedDraftClass, 10);
      const ceilingOrder = [
        'franchiseCornerstone',
        'highEndStarter',
        'solidStarter',
        'qualityRotational',
        'specialist',
        'depth',
        'practiceSquad',
      ];

      // Check that top prospects are sorted by ceiling
      for (let i = 1; i < top10.length; i++) {
        const prevCeiling = ceilingOrder.indexOf(top10[i - 1].player.roleFit.ceiling);
        const currCeiling = ceilingOrder.indexOf(top10[i].player.roleFit.ceiling);

        // Current should be same or lower quality than previous
        expect(currCeiling).toBeGreaterThanOrEqual(prevCeiling);
      }
    });

    it('should include high-ceiling prospects', () => {
      const top20 = getTopProspects(cachedDraftClass, 20);
      const topCeilings = top20.map((p) => p.player.roleFit.ceiling);

      // At least some top prospects should have high ceilings
      expect(
        topCeilings.some(
          (c) => c === 'franchiseCornerstone' || c === 'highEndStarter' || c === 'solidStarter'
        )
      ).toBe(true);
    });
  });

  describe('validateDraftClass', () => {
    it('should validate correct draft class', () => {
      expect(validateDraftClass(cachedDraftClass)).toBe(true);
    });

    it('should reject class with too few prospects', () => {
      const invalid: DraftClass = {
        ...cachedDraftClass,
        prospects: cachedDraftClass.prospects.slice(0, 100),
      };

      expect(validateDraftClass(invalid)).toBe(false);
    });

    it('should reject class with invalid year', () => {
      const invalid: DraftClass = {
        ...cachedDraftClass,
        year: 1900,
      };

      expect(validateDraftClass(invalid)).toBe(false);
    });
  });

  describe('college stats generation', () => {
    it('should generate appropriate QB stats', () => {
      const qbs = getProspectsByPosition(cachedDraftClass, Position.QB);

      for (const qb of qbs.slice(0, 5)) {
        const stats = qb.collegeStats;
        expect(stats.positionStats.type).toBe('QB');
        if (stats.positionStats.type === 'QB') {
          expect(stats.positionStats.passAttempts).toBeGreaterThanOrEqual(0);
          expect(stats.positionStats.passYards).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should have college awards for some prospects', () => {
      const prospectsWithAwards = cachedDraftClass.prospects.filter(
        (p) => p.collegeStats.awards.length > 0
      );

      // Some prospects should have awards
      expect(prospectsWithAwards.length).toBeGreaterThan(0);
    });

    it('should track seasons played', () => {
      for (const prospect of cachedDraftClass.prospects.slice(0, 20)) {
        expect(prospect.collegeStats.seasonsPlayed).toBeGreaterThanOrEqual(2);
        expect(prospect.collegeStats.seasonsPlayed).toBeLessThanOrEqual(4);
      }
    });
  });

  describe('prospect initialization', () => {
    it('should have physicals not revealed initially', () => {
      for (const prospect of cachedDraftClass.prospects.slice(0, 20)) {
        expect(prospect.physicalsRevealed).toBe(false);
      }
    });

    it('should have no scout reports initially', () => {
      for (const prospect of cachedDraftClass.prospects.slice(0, 20)) {
        expect(prospect.scoutReportIds.length).toBe(0);
      }
    });

    it('should have declared status', () => {
      for (const prospect of cachedDraftClass.prospects.slice(0, 20)) {
        expect(prospect.declared).toBe(true);
      }
    });

    it('should have correct draft year', () => {
      for (const prospect of cachedDraftClass.prospects.slice(0, 20)) {
        expect(prospect.draftYear).toBe(2025);
      }
    });
  });
});
