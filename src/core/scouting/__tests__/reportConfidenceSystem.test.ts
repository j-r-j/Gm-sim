/**
 * Tests for Report Confidence System
 */

import { Position } from '../../models/player/Position';
import { Scout, createDefaultScout } from '../../models/staff/Scout';
import { SkillRange } from '../AutoScoutingSystem';
import { ScoutReport, ReportConfidence } from '../ScoutReportGenerator';
import {
  ScoutTendencyProfile,
  DEFAULT_CONFIDENCE_CONFIG,
  calculateBaseConfidence,
  calculateTimeConfidence,
  calculateRegionConfidenceModifier,
  calculatePositionConfidenceModifier,
  determineScoutTendency,
  createScoutTendencyProfile,
  calculateTendencyAdjustment,
  calculateConfidenceAdjustment,
  adjustRangeByConfidence,
  adjustRangesByConfidence,
  aggregateConfidence,
  getConfidenceDescription,
  calculateConfidenceImprovement,
  validateConfidence,
  calculateEnhancedConfidence,
} from '../ReportConfidenceSystem';

// Helper to create mock scout
function createMockScout(
  evaluation: number = 70,
  region: string | null = 'northeast',
  positionSpecialty: Position | null = null
): Scout {
  const scout = createDefaultScout('scout-1', 'John', 'Smith', 'regionalScout');
  return {
    ...scout,
    region: region as Scout['region'],
    attributes: {
      ...scout.attributes,
      evaluation,
      positionSpecialty,
    },
  };
}

// Helper to create mock report
function createMockReport(
  prospectId: string,
  scoutId: string,
  confidenceScore: number,
  reportType: 'auto' | 'focus' = 'auto'
): ScoutReport {
  return {
    id: `report-${prospectId}-${scoutId}`,
    prospectId,
    prospectName: 'Test Player',
    position: Position.WR,
    reportType,
    generatedAt: Date.now(),
    scoutId,
    scoutName: 'Test Scout',
    physicalMeasurements: {
      height: '6\'2"',
      weight: 210,
      college: 'Test U',
    },
    skillRanges: {
      overall: { min: 70, max: 85, confidence: 'medium' },
      physical: { min: 75, max: 88, confidence: 'medium' },
      technical: { min: 65, max: 80, confidence: 'medium' },
    },
    visibleTraits: [],
    hiddenTraitCount: 3,
    draftProjection: {
      roundMin: 1,
      roundMax: 2,
      pickRangeDescription: 'Round 1-2',
      overallGrade: 'Day 1-2 pick',
    },
    confidence: {
      level: confidenceScore >= 70 ? 'high' : confidenceScore >= 40 ? 'medium' : 'low',
      score: confidenceScore,
      factors: [],
    },
    needsMoreScouting: reportType === 'auto',
    scoutingHours: reportType === 'focus' ? 45 : 3,
  };
}

describe('ReportConfidenceSystem', () => {
  describe('calculateBaseConfidence', () => {
    it('should return evaluation score as base confidence', () => {
      expect(calculateBaseConfidence(80)).toBe(80);
      expect(calculateBaseConfidence(50)).toBe(50);
      expect(calculateBaseConfidence(100)).toBe(100);
    });

    it('should clamp values to 0-100', () => {
      expect(calculateBaseConfidence(-10)).toBe(0);
      expect(calculateBaseConfidence(150)).toBe(100);
    });
  });

  describe('calculateTimeConfidence', () => {
    it('should give higher confidence for more hours', () => {
      const lowTime = calculateTimeConfidence(5, 'focus');
      const midTime = calculateTimeConfidence(30, 'focus');
      const highTime = calculateTimeConfidence(50, 'focus');

      expect(midTime).toBeGreaterThan(lowTime);
      expect(highTime).toBeGreaterThan(midTime);
    });

    it('should use different baselines for auto vs focus', () => {
      const autoConfidence = calculateTimeConfidence(5, 'auto');
      const focusConfidence = calculateTimeConfidence(5, 'focus');

      // 5 hours is good for auto but low for focus
      expect(autoConfidence).toBeGreaterThan(focusConfidence);
    });

    it('should cap at 100', () => {
      const maxedConfidence = calculateTimeConfidence(100, 'auto');
      expect(maxedConfidence).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateRegionConfidenceModifier', () => {
    it('should give full bonus for matching region', () => {
      const modifier = calculateRegionConfidenceModifier('northeast', 'northeast');
      expect(modifier).toBe(DEFAULT_CONFIDENCE_CONFIG.regionBonusPercent);
    });

    it('should give no bonus for different region', () => {
      const modifier = calculateRegionConfidenceModifier('northeast', 'southeast');
      expect(modifier).toBe(0);
    });

    it('should give partial bonus for national scout', () => {
      const modifier = calculateRegionConfidenceModifier(null, 'northeast');
      expect(modifier).toBeGreaterThan(0);
      expect(modifier).toBeLessThan(DEFAULT_CONFIDENCE_CONFIG.regionBonusPercent);
    });
  });

  describe('calculatePositionConfidenceModifier', () => {
    it('should give full bonus for matching position specialty', () => {
      const modifier = calculatePositionConfidenceModifier(Position.WR, Position.WR);
      expect(modifier).toBe(DEFAULT_CONFIDENCE_CONFIG.positionSpecialtyBonusPercent);
    });

    it('should give no bonus when scout has no specialty', () => {
      const modifier = calculatePositionConfidenceModifier(null, Position.WR);
      expect(modifier).toBe(0);
    });

    it('should give partial bonus for related positions', () => {
      // WR and TE are in the same group
      const modifier = calculatePositionConfidenceModifier(Position.WR, Position.TE);
      expect(modifier).toBeGreaterThan(0);
      expect(modifier).toBeLessThan(DEFAULT_CONFIDENCE_CONFIG.positionSpecialtyBonusPercent);
    });
  });

  describe('determineScoutTendency', () => {
    it('should return neutral with insufficient data', () => {
      const tendency = determineScoutTendency([
        { projected: 80, actual: 78 },
        { projected: 75, actual: 74 },
      ]);
      expect(tendency).toBe('neutral');
    });

    it('should identify optimistic tendency', () => {
      const tendency = determineScoutTendency([
        { projected: 85, actual: 75 },
        { projected: 82, actual: 72 },
        { projected: 78, actual: 68 },
        { projected: 80, actual: 70 },
        { projected: 76, actual: 66 },
      ]);
      expect(tendency).toBe('optimistic');
    });

    it('should identify pessimistic tendency', () => {
      const tendency = determineScoutTendency([
        { projected: 70, actual: 82 },
        { projected: 72, actual: 84 },
        { projected: 68, actual: 80 },
        { projected: 75, actual: 87 },
        { projected: 71, actual: 83 },
      ]);
      expect(tendency).toBe('pessimistic');
    });

    it('should return neutral for accurate scout', () => {
      const tendency = determineScoutTendency([
        { projected: 80, actual: 82 },
        { projected: 75, actual: 73 },
        { projected: 78, actual: 79 },
        { projected: 82, actual: 80 },
        { projected: 77, actual: 78 },
      ]);
      expect(tendency).toBe('neutral');
    });
  });

  describe('createScoutTendencyProfile', () => {
    it('should create neutral profile with no data', () => {
      const scout = createMockScout();
      const profile = createScoutTendencyProfile(scout);

      expect(profile.overallTendency).toBe('neutral');
      expect(profile.tendencyStrength).toBe(0);
    });

    it('should create profile with historical data', () => {
      const scout = createMockScout();
      const historicalData = [
        { projected: 85, actual: 75, position: Position.WR },
        { projected: 82, actual: 72, position: Position.WR },
        { projected: 78, actual: 68, position: Position.RB },
        { projected: 80, actual: 70, position: Position.RB },
        { projected: 76, actual: 66, position: Position.WR },
      ];

      const profile = createScoutTendencyProfile(scout, historicalData);

      expect(profile.overallTendency).toBe('optimistic');
      expect(profile.tendencyStrength).toBeGreaterThan(0);
    });

    it('should include position-specific tendencies', () => {
      const scout = createMockScout();
      const historicalData = [
        { projected: 85, actual: 75, position: Position.WR },
        { projected: 82, actual: 72, position: Position.WR },
        { projected: 78, actual: 68, position: Position.WR },
        { projected: 75, actual: 85, position: Position.RB },
        { projected: 72, actual: 82, position: Position.RB },
        { projected: 70, actual: 80, position: Position.RB },
      ];

      const profile = createScoutTendencyProfile(scout, historicalData);

      expect(profile.positionTendencies[Position.WR]).toBe('optimistic');
      expect(profile.positionTendencies[Position.RB]).toBe('pessimistic');
    });
  });

  describe('calculateTendencyAdjustment', () => {
    it('should return 0 for neutral tendency', () => {
      const profile: ScoutTendencyProfile = {
        overallTendency: 'neutral',
        tendencyStrength: 0,
        positionTendencies: {},
        skillTendencies: { overall: 'neutral', physical: 'neutral', technical: 'neutral' },
        notes: [],
      };

      const adjustment = calculateTendencyAdjustment(profile);
      expect(adjustment).toBe(0);
    });

    it('should return negative adjustment for non-neutral tendency', () => {
      const profile: ScoutTendencyProfile = {
        overallTendency: 'optimistic',
        tendencyStrength: 50,
        positionTendencies: {},
        skillTendencies: { overall: 'optimistic', physical: 'neutral', technical: 'neutral' },
        notes: [],
      };

      const adjustment = calculateTendencyAdjustment(profile);
      expect(adjustment).toBeLessThan(0);
    });
  });

  describe('calculateConfidenceAdjustment', () => {
    it('should include region bonus for matching region', () => {
      const scout = createMockScout(70, 'northeast');
      const adjustment = calculateConfidenceAdjustment(scout, 'northeast', Position.WR);

      expect(adjustment.regionKnowledgeBonus).toBeGreaterThan(0);
    });

    it('should include position bonus for specialty', () => {
      const scout = createMockScout(70, 'northeast', Position.WR);
      const adjustment = calculateConfidenceAdjustment(scout, 'northeast', Position.WR);

      expect(adjustment.positionSpecialtyBonus).toBeGreaterThan(0);
    });

    it('should calculate total multiplier', () => {
      const scout = createMockScout(70, 'northeast', Position.WR);
      const adjustment = calculateConfidenceAdjustment(scout, 'northeast', Position.WR);

      expect(adjustment.totalMultiplier).toBeGreaterThanOrEqual(0.5);
      expect(adjustment.totalMultiplier).toBeLessThanOrEqual(1.5);
    });
  });

  describe('adjustRangeByConfidence', () => {
    it('should narrow range for high confidence', () => {
      const range: SkillRange = { min: 60, max: 80, confidence: 'low' };
      const highConfidence: ReportConfidence = {
        level: 'high',
        score: 85,
        factors: [],
      };

      const adjusted = adjustRangeByConfidence(range, highConfidence);

      const originalWidth = range.max - range.min;
      const adjustedWidth = adjusted.max - adjusted.min;

      expect(adjustedWidth).toBeLessThan(originalWidth);
    });

    it('should maintain range for low confidence', () => {
      const range: SkillRange = { min: 60, max: 80, confidence: 'low' };
      const lowConfidence: ReportConfidence = {
        level: 'low',
        score: 30,
        factors: [],
      };

      const adjusted = adjustRangeByConfidence(range, lowConfidence);

      const originalWidth = range.max - range.min;
      const adjustedWidth = adjusted.max - adjusted.min;

      // Should be close to original width
      expect(adjustedWidth).toBeGreaterThanOrEqual(originalWidth * 0.8);
    });

    it('should preserve center point', () => {
      const range: SkillRange = { min: 60, max: 80, confidence: 'medium' };
      const confidence: ReportConfidence = {
        level: 'high',
        score: 90,
        factors: [],
      };

      const adjusted = adjustRangeByConfidence(range, confidence);

      const originalCenter = (range.min + range.max) / 2;
      const adjustedCenter = (adjusted.min + adjusted.max) / 2;

      expect(Math.abs(adjustedCenter - originalCenter)).toBeLessThan(2);
    });
  });

  describe('adjustRangesByConfidence', () => {
    it('should adjust all range types', () => {
      const ranges = {
        overall: { min: 60, max: 80, confidence: 'low' as const },
        physical: { min: 65, max: 85, confidence: 'low' as const },
        technical: { min: 55, max: 75, confidence: 'low' as const },
      };
      const confidence: ReportConfidence = {
        level: 'high',
        score: 85,
        factors: [],
      };

      const adjusted = adjustRangesByConfidence(ranges, confidence);

      expect(adjusted.overall.max - adjusted.overall.min).toBeLessThan(20);
      expect(adjusted.physical.max - adjusted.physical.min).toBeLessThan(20);
      expect(adjusted.technical.max - adjusted.technical.min).toBeLessThan(20);
    });

    it('should handle position-specific ranges', () => {
      const ranges = {
        overall: { min: 60, max: 80, confidence: 'medium' as const },
        physical: { min: 65, max: 85, confidence: 'medium' as const },
        technical: { min: 55, max: 75, confidence: 'medium' as const },
        positionSpecific: {
          routeRunning: { min: 70, max: 85, confidence: 'medium' as const },
        },
      };
      const confidence: ReportConfidence = {
        level: 'high',
        score: 80,
        factors: [],
      };

      const adjusted = adjustRangesByConfidence(ranges, confidence);

      expect(adjusted.positionSpecific).toBeDefined();
      expect(adjusted.positionSpecific?.routeRunning).toBeDefined();
    });
  });

  describe('aggregateConfidence', () => {
    it('should return zero confidence for no reports', () => {
      const aggregated = aggregateConfidence([]);

      expect(aggregated.combinedScore).toBe(0);
      expect(aggregated.combinedLevel).toBe('low');
      expect(aggregated.scoutCount).toBe(0);
    });

    it('should return same confidence for single report', () => {
      const report = createMockReport('prospect-1', 'scout-1', 75);
      const aggregated = aggregateConfidence([report]);

      expect(aggregated.combinedScore).toBe(75);
      expect(aggregated.scoutCount).toBe(1);
    });

    it('should increase confidence for multiple agreeing reports', () => {
      const reports = [
        createMockReport('prospect-1', 'scout-1', 70),
        createMockReport('prospect-1', 'scout-2', 72),
        createMockReport('prospect-1', 'scout-3', 68),
      ];

      const aggregated = aggregateConfidence(reports);

      expect(aggregated.scoutCount).toBe(3);
      // Should get bonus for multiple scouts
      expect(aggregated.combinedScore).toBeGreaterThan(70);
    });

    it('should identify strong consensus', () => {
      const reports = [
        createMockReport('prospect-1', 'scout-1', 70),
        createMockReport('prospect-1', 'scout-2', 72),
        createMockReport('prospect-1', 'scout-3', 71),
      ];

      const aggregated = aggregateConfidence(reports);

      expect(aggregated.consensusStrength).toBe('strong');
      expect(aggregated.divergenceScore).toBeLessThanOrEqual(15);
    });

    it('should identify weak consensus for diverging reports', () => {
      const reports = [
        createMockReport('prospect-1', 'scout-1', 85),
        createMockReport('prospect-1', 'scout-2', 45),
      ];

      const aggregated = aggregateConfidence(reports);

      expect(aggregated.consensusStrength).toBe('weak');
      expect(aggregated.divergenceScore).toBeGreaterThan(30);
    });
  });

  describe('getConfidenceDescription', () => {
    it('should describe high confidence positively', () => {
      const confidence: ReportConfidence = {
        level: 'high',
        score: 85,
        factors: [
          { factor: 'Test', impact: 'positive', description: '' },
          { factor: 'Test2', impact: 'positive', description: '' },
        ],
      };

      const description = getConfidenceDescription(confidence);

      expect(description.toLowerCase()).toContain('confident');
    });

    it('should describe low confidence with uncertainty', () => {
      const confidence: ReportConfidence = {
        level: 'low',
        score: 25,
        factors: [
          { factor: 'Test', impact: 'negative', description: '' },
          { factor: 'Test2', impact: 'negative', description: '' },
        ],
      };

      const description = getConfidenceDescription(confidence);

      expect(description.toLowerCase()).toContain('limited');
    });
  });

  describe('calculateConfidenceImprovement', () => {
    it('should show improvement potential for focus upgrade', () => {
      const currentConfidence: ReportConfidence = {
        level: 'low',
        score: 35,
        factors: [],
      };

      const improvement = calculateConfidenceImprovement(currentConfidence, 0, true);

      expect(improvement.newScore).toBeGreaterThan(currentConfidence.score);
      expect(improvement.improvement).toBeGreaterThan(0);
      expect(improvement.worthwhile).toBe(true);
    });

    it('should show diminishing returns for high confidence', () => {
      const currentConfidence: ReportConfidence = {
        level: 'high',
        score: 90,
        factors: [],
      };

      const improvement = calculateConfidenceImprovement(currentConfidence, 10, false);

      expect(improvement.improvement).toBeLessThan(10);
    });

    it('should identify worthwhile improvements', () => {
      const lowConfidence: ReportConfidence = {
        level: 'low',
        score: 30,
        factors: [],
      };

      const improvement = calculateConfidenceImprovement(lowConfidence, 20, true);

      expect(improvement.worthwhile).toBe(true);
    });
  });

  describe('validateConfidence', () => {
    it('should validate well-formed confidence', () => {
      const confidence: ReportConfidence = {
        level: 'high',
        score: 85,
        factors: [],
      };

      expect(validateConfidence(confidence)).toBe(true);
    });

    it('should reject invalid score', () => {
      const confidence: ReportConfidence = {
        level: 'high',
        score: 150,
        factors: [],
      };

      expect(validateConfidence(confidence)).toBe(false);
    });

    it('should reject invalid level', () => {
      const confidence = {
        level: 'invalid' as 'high',
        score: 50,
        factors: [],
      };

      expect(validateConfidence(confidence)).toBe(false);
    });
  });

  describe('calculateEnhancedConfidence', () => {
    it('should calculate full confidence with all factors', () => {
      const scout = createMockScout(80, 'northeast', Position.WR);

      const confidence = calculateEnhancedConfidence(scout, 'focus', 45, 'northeast', Position.WR);

      expect(confidence.level).toBe('high');
      expect(confidence.score).toBeGreaterThan(60);
      expect(confidence.factors.length).toBeGreaterThan(0);
    });

    it('should include all factor types', () => {
      const scout = createMockScout(80, 'northeast', Position.WR);

      const confidence = calculateEnhancedConfidence(scout, 'focus', 45, 'northeast', Position.WR);

      const factorNames = confidence.factors.map((f) => f.factor);

      expect(factorNames).toContain('Scout Quality');
      expect(factorNames).toContain('Scouting Time');
      expect(factorNames).toContain('Report Depth');
    });

    it('should include tendency impact when provided', () => {
      const scout = createMockScout(70, 'northeast');
      const tendencyProfile: ScoutTendencyProfile = {
        overallTendency: 'optimistic',
        tendencyStrength: 50,
        positionTendencies: {},
        skillTendencies: { overall: 'optimistic', physical: 'neutral', technical: 'neutral' },
        notes: [],
      };

      const confidence = calculateEnhancedConfidence(
        scout,
        'focus',
        30,
        'northeast',
        Position.WR,
        tendencyProfile
      );

      const tendencyFactor = confidence.factors.find((f) => f.factor === 'Scout Tendency');
      expect(tendencyFactor).toBeDefined();
      expect(tendencyFactor?.impact).toBe('negative');
    });
  });
});
