/**
 * Auto-Scouting System Tests
 */

import {
  calculateAutoScoutSkillRange,
  calculateAutoScoutRoundRange,
  getVisibleTraitsForAutoScouting,
  generateAutoScoutingReport,
  processWeeklyAutoScouting,
  aggregateAutoScoutingReports,
  validateAutoScoutingReport,
  getAutoScoutReportQuality,
  DEFAULT_AUTO_SCOUTING_CONFIG,
  AutoScoutingReport,
  ProspectData,
} from '../AutoScoutingSystem';
import { createDefaultScout, Scout } from '../../models/staff/Scout';
import { Position } from '../../models/player/Position';

describe('AutoScoutingSystem', () => {
  // Helper to create a mock prospect
  function createMockProspect(overrides: Partial<ProspectData> = {}): ProspectData {
    return {
      id: 'prospect-1',
      name: 'John Smith',
      position: Position.QB,
      region: 'northeast',
      college: 'State University',
      height: "6'3\"",
      weight: 215,
      trueOverall: 75,
      truePhysical: 80,
      trueTechnical: 70,
      allTraits: ['Strong Arm', 'Quick Release', 'Pocket Awareness', 'Leadership'],
      projectedRound: 2,
      ...overrides,
    };
  }

  // Helper to create scout with specific evaluation
  function createScoutWithEvaluation(evaluation: number): Scout {
    const scout = createDefaultScout('scout-1', 'John', 'Doe', 'regionalScout');
    return {
      ...scout,
      attributes: {
        ...scout.attributes,
        evaluation,
      },
    };
  }

  describe('calculateAutoScoutSkillRange', () => {
    it('should create wider ranges for low-skill scouts', () => {
      const lowSkillRange = calculateAutoScoutSkillRange(75, 30);
      const highSkillRange = calculateAutoScoutSkillRange(75, 90);

      const lowWidth = lowSkillRange.max - lowSkillRange.min;
      const highWidth = highSkillRange.max - highSkillRange.min;

      expect(lowWidth).toBeGreaterThan(highWidth);
    });

    it('should center range around true value', () => {
      const range = calculateAutoScoutSkillRange(75, 70);
      const center = (range.min + range.max) / 2;

      // Should be within ~15 points of true value
      expect(Math.abs(center - 75)).toBeLessThanOrEqual(15);
    });

    it('should clamp range to valid bounds (1-100)', () => {
      const lowRange = calculateAutoScoutSkillRange(10, 30);
      const highRange = calculateAutoScoutSkillRange(95, 30);

      expect(lowRange.min).toBeGreaterThanOrEqual(1);
      expect(highRange.max).toBeLessThanOrEqual(100);
    });

    it('should assign lower confidence to low-skill scouts', () => {
      const lowSkillRange = calculateAutoScoutSkillRange(75, 30);
      const highSkillRange = calculateAutoScoutSkillRange(75, 80);

      expect(lowSkillRange.confidence).toBe('low');
      expect(highSkillRange.confidence).toBe('medium');
    });
  });

  describe('calculateAutoScoutRoundRange', () => {
    it('should create round range around true round', () => {
      const range = calculateAutoScoutRoundRange(3, 70);

      expect(range.min).toBeGreaterThanOrEqual(1);
      expect(range.max).toBeLessThanOrEqual(7);
      expect(range.min).toBeLessThanOrEqual(range.max);
    });

    it('should clamp to valid rounds (1-7)', () => {
      const earlyRange = calculateAutoScoutRoundRange(1, 50);
      const lateRange = calculateAutoScoutRoundRange(7, 50);

      expect(earlyRange.min).toBeGreaterThanOrEqual(1);
      expect(lateRange.max).toBeLessThanOrEqual(7);
    });
  });

  describe('getVisibleTraitsForAutoScouting', () => {
    it('should reveal only observable traits', () => {
      const allTraits = ['Strong Arm', 'Leadership', 'Quick Speed', 'High IQ', 'Fast Hands'];
      const { visible } = getVisibleTraitsForAutoScouting(allTraits, 70);

      // Should only reveal traits with observable patterns
      for (const trait of visible) {
        const isObservable = ['strong', 'speed', 'fast', 'hands'].some((pattern) =>
          trait.toLowerCase().includes(pattern)
        );
        expect(isObservable).toBe(true);
      }
    });

    it('should reveal more traits for high-skill scouts', () => {
      const allTraits = [
        'Speed Demon',
        'Strong Runner',
        'Quick Hands',
        'Fast Feet',
        'Athletic Build',
      ];

      const { visible: lowSkillVisible } = getVisibleTraitsForAutoScouting(allTraits, 30);
      const { visible: highSkillVisible } = getVisibleTraitsForAutoScouting(allTraits, 90);

      expect(highSkillVisible.length).toBeGreaterThanOrEqual(lowSkillVisible.length);
    });

    it('should return hidden count', () => {
      const allTraits = ['Speed', 'Strength', 'IQ', 'Leadership', 'Clutch'];
      const { hiddenCount } = getVisibleTraitsForAutoScouting(allTraits, 50);

      expect(hiddenCount).toBeGreaterThan(0);
      expect(hiddenCount).toBeLessThanOrEqual(allTraits.length);
    });
  });

  describe('generateAutoScoutingReport', () => {
    it('should generate a valid report', () => {
      const prospect = createMockProspect();
      const scout = createScoutWithEvaluation(70);

      const report = generateAutoScoutingReport(prospect, scout, 202301);

      expect(report.prospectId).toBe('prospect-1');
      expect(report.prospectName).toBe('John Smith');
      expect(report.position).toBe('QB');
      expect(report.scoutId).toBe('scout-1');
      expect(report.isAutoScouted).toBe(true);
      expect(validateAutoScoutingReport(report)).toBe(true);
    });

    it('should include basic physical measurements', () => {
      const prospect = createMockProspect();
      const scout = createScoutWithEvaluation(70);

      const report = generateAutoScoutingReport(prospect, scout, 202301);

      expect(report.height).toBe("6'3\"");
      expect(report.weight).toBe(215);
      expect(report.college).toBe('State University');
    });

    it('should flag high-potential prospects for focus scouting', () => {
      const highPotential = createMockProspect({ trueOverall: 90, projectedRound: 1 });
      const scout = createScoutWithEvaluation(70);

      const report = generateAutoScoutingReport(highPotential, scout, 202301);

      expect(report.needsFocusScouting).toBe(true);
    });

    it('should have wider ranges for low-skill scouts', () => {
      const prospect = createMockProspect();
      const lowSkillScout = createScoutWithEvaluation(30);
      const highSkillScout = createScoutWithEvaluation(90);

      const lowSkillReport = generateAutoScoutingReport(prospect, lowSkillScout, 202301);
      const highSkillReport = generateAutoScoutingReport(prospect, highSkillScout, 202301);

      const lowWidth = lowSkillReport.overallRange.max - lowSkillReport.overallRange.min;
      const highWidth = highSkillReport.overallRange.max - highSkillReport.overallRange.min;

      expect(lowWidth).toBeGreaterThan(highWidth);
    });
  });

  describe('processWeeklyAutoScouting', () => {
    it('should process prospects based on scout speed', () => {
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'regionalScout');
      const prospects: ProspectData[] = [];
      for (let i = 0; i < 20; i++) {
        prospects.push(createMockProspect({ id: `prospect-${i}` }));
      }

      const result = processWeeklyAutoScouting(scout, prospects, 1, 2023);

      expect(result.reportsGenerated.length).toBeGreaterThan(0);
      expect(result.reportsGenerated.length).toBeLessThanOrEqual(prospects.length);
    });

    it('should filter prospects by scout region', () => {
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'regionalScout');
      // Scout region is northeast by default
      const prospects = [
        createMockProspect({ id: 'p1', region: 'northeast' }),
        createMockProspect({ id: 'p2', region: 'southeast' }),
        createMockProspect({ id: 'p3', region: 'west' }),
      ];

      const result = processWeeklyAutoScouting(scout, prospects, 1, 2023);

      // Should only scout northeast prospects
      for (const report of result.reportsGenerated) {
        const prospect = prospects.find((p) => p.id === report.prospectId);
        expect(prospect?.region).toBe('northeast');
      }
    });

    it('should return empty results if auto-scouting is disabled', () => {
      const scout = createDefaultScout('scout-1', 'John', 'Doe', 'regionalScout');
      const disabledScout: Scout = { ...scout, autoScoutingActive: false };
      const prospects = [createMockProspect()];

      const result = processWeeklyAutoScouting(disabledScout, prospects, 1, 2023);

      expect(result.reportsGenerated).toHaveLength(0);
      expect(result.prospectsCoversThisWeek).toBe(0);
    });
  });

  describe('aggregateAutoScoutingReports', () => {
    it('should return null for empty array', () => {
      const result = aggregateAutoScoutingReports([]);
      expect(result).toBeNull();
    });

    it('should return single report unchanged', () => {
      const prospect = createMockProspect();
      const scout = createScoutWithEvaluation(70);
      const report = generateAutoScoutingReport(prospect, scout, 202301);

      const result = aggregateAutoScoutingReports([report]);

      expect(result).toEqual(report);
    });

    it('should narrow ranges with multiple reports', () => {
      const prospect = createMockProspect();
      const scout1 = createScoutWithEvaluation(70);
      const scout2 = createScoutWithEvaluation(70);

      const report1 = generateAutoScoutingReport(prospect, scout1, 202301);
      const report2 = generateAutoScoutingReport(
        prospect,
        { ...scout2, id: 'scout-2' },
        202302
      );

      const aggregated = aggregateAutoScoutingReports([report1, report2])!;
      const singleWidth = report1.overallRange.max - report1.overallRange.min;
      const aggregatedWidth = aggregated.overallRange.max - aggregated.overallRange.min;

      expect(aggregatedWidth).toBeLessThanOrEqual(singleWidth);
    });

    it('should combine visible traits from all reports', () => {
      const prospect = createMockProspect({
        allTraits: ['Speed', 'Strength', 'Quick Hands', 'Fast Feet', 'Athletic'],
      });
      const scout1 = createScoutWithEvaluation(70);
      const scout2 = createScoutWithEvaluation(70);

      const report1 = generateAutoScoutingReport(prospect, scout1, 202301);
      const report2 = generateAutoScoutingReport(
        prospect,
        { ...scout2, id: 'scout-2' },
        202302
      );

      const aggregated = aggregateAutoScoutingReports([report1, report2])!;

      // Aggregated should have at least as many traits as either individual
      expect(aggregated.visibleTraits.length).toBeGreaterThanOrEqual(
        Math.max(report1.visibleTraits.length, report2.visibleTraits.length)
      );
    });
  });

  describe('validateAutoScoutingReport', () => {
    it('should validate correct report', () => {
      const prospect = createMockProspect();
      const scout = createScoutWithEvaluation(70);
      const report = generateAutoScoutingReport(prospect, scout, 202301);

      expect(validateAutoScoutingReport(report)).toBe(true);
    });

    it('should reject report with missing fields', () => {
      const invalidReport = {
        prospectId: '',
        prospectName: 'Test',
        scoutId: 'scout-1',
      } as AutoScoutingReport;

      expect(validateAutoScoutingReport(invalidReport)).toBe(false);
    });

    it('should reject report with invalid skill ranges', () => {
      const prospect = createMockProspect();
      const scout = createScoutWithEvaluation(70);
      const report = generateAutoScoutingReport(prospect, scout, 202301);

      const invalidReport: AutoScoutingReport = {
        ...report,
        overallRange: { min: 90, max: 50, confidence: 'low' }, // Invalid: min > max
      };

      expect(validateAutoScoutingReport(invalidReport)).toBe(false);
    });

    it('should reject report with invalid round ranges', () => {
      const prospect = createMockProspect();
      const scout = createScoutWithEvaluation(70);
      const report = generateAutoScoutingReport(prospect, scout, 202301);

      const invalidReport: AutoScoutingReport = {
        ...report,
        projectedRound: { min: 0, max: 3 }, // Invalid: min < 1
      };

      expect(validateAutoScoutingReport(invalidReport)).toBe(false);
    });
  });

  describe('getAutoScoutReportQuality', () => {
    it('should return detailed for narrow ranges', () => {
      const prospect = createMockProspect();
      const scout = createScoutWithEvaluation(95); // Very high skill
      const report = generateAutoScoutingReport(prospect, scout, 202301);

      // Manually create narrow ranges for test
      const narrowReport: AutoScoutingReport = {
        ...report,
        overallRange: { min: 70, max: 80, confidence: 'high' },
        projectedRound: { min: 2, max: 3 },
      };

      const quality = getAutoScoutReportQuality(narrowReport);
      expect(quality).toBe('Detailed preliminary report');
    });

    it('should return basic for medium ranges', () => {
      const mediumReport: AutoScoutingReport = {
        prospectId: 'p1',
        prospectName: 'Test',
        position: Position.QB,
        scoutId: 's1',
        reportDate: 202301,
        height: "6'0\"",
        weight: 200,
        college: 'Test U',
        overallRange: { min: 60, max: 80, confidence: 'medium' },
        physicalRange: { min: 60, max: 80, confidence: 'medium' },
        technicalRange: { min: 60, max: 80, confidence: 'medium' },
        visibleTraits: [],
        hiddenTraitCount: 3,
        projectedRound: { min: 2, max: 4 },
        isAutoScouted: true,
        needsFocusScouting: false,
      };

      const quality = getAutoScoutReportQuality(mediumReport);
      expect(quality).toBe('Basic scouting report');
    });

    it('should return initial for wide ranges', () => {
      const wideReport: AutoScoutingReport = {
        prospectId: 'p1',
        prospectName: 'Test',
        position: Position.QB,
        scoutId: 's1',
        reportDate: 202301,
        height: "6'0\"",
        weight: 200,
        college: 'Test U',
        overallRange: { min: 40, max: 80, confidence: 'low' },
        physicalRange: { min: 40, max: 80, confidence: 'low' },
        technicalRange: { min: 40, max: 80, confidence: 'low' },
        visibleTraits: [],
        hiddenTraitCount: 5,
        projectedRound: { min: 1, max: 5 },
        isAutoScouted: true,
        needsFocusScouting: false,
      };

      const quality = getAutoScoutReportQuality(wideReport);
      expect(quality).toBe('Initial scouting impression');
    });
  });

  describe('DEFAULT_AUTO_SCOUTING_CONFIG', () => {
    it('should have reasonable defaults', () => {
      expect(DEFAULT_AUTO_SCOUTING_CONFIG.skillRangeWidth).toBe(25);
      expect(DEFAULT_AUTO_SCOUTING_CONFIG.traitRevealPercent).toBe(0.3);
      expect(DEFAULT_AUTO_SCOUTING_CONFIG.roundRangeWidth).toBe(2);
    });
  });
});
