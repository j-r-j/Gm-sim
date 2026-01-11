/**
 * Focus Player System Tests
 */

import {
  getMaxFocusProspects,
  calculateFocusSkillRange,
  calculateFocusRoundRange,
  generateCharacterAssessment,
  generateMedicalAssessment,
  generateSchemeFitAnalysis,
  generateInterviewInsights,
  generateFocusScoutingReport,
  crossReferenceFocusReports,
  canAssignFocusPlayer,
  validateFocusScoutingReport,
  DEFAULT_FOCUS_SCOUTING_CONFIG,
  ExtendedProspectData,
  FocusScoutingReport,
} from '../FocusPlayerSystem';
import {
  createDefaultScout,
  Scout,
  MAX_FOCUS_PROSPECTS,
  MIN_FOCUS_PROSPECTS,
} from '../../models/staff/Scout';
import { Position } from '../../models/player/Position';

describe('FocusPlayerSystem', () => {
  // Helper to create mock extended prospect
  function createMockExtendedProspect(
    overrides: Partial<ExtendedProspectData> = {}
  ): ExtendedProspectData {
    return {
      id: 'prospect-1',
      name: 'John Smith',
      position: Position.QB,
      region: 'northeast',
      college: 'State University',
      height: '6\'3"',
      weight: 215,
      trueOverall: 80,
      truePhysical: 85,
      trueTechnical: 75,
      allTraits: ['Strong Arm', 'Quick Release', 'Pocket Awareness', 'Leadership'],
      projectedRound: 1,
      trueWorkEthic: 85,
      trueLeadership: 80,
      trueCoachability: 75,
      trueMaturity: 70,
      trueCompetitiveness: 90,
      injuryHistory: [],
      durabilityRating: 85,
      footballIQ: 80,
      schemeFits: {
        offense_west_coast: 85,
        offense_air_raid: 90,
        offense_power_run: 60,
        defense_43: 0,
      },
      comparison: 'Peyton Manning',
      ceiling: 'Pro Bowl starter',
      floor: 'Quality backup',
      ...overrides,
    };
  }

  // Helper to create scout with specific attributes
  function createScoutWithAttributes(evaluation: number, experience: number): Scout {
    const scout = createDefaultScout('scout-1', 'John', 'Doe', 'nationalScout');
    return {
      ...scout,
      attributes: {
        ...scout.attributes,
        evaluation,
        experience,
      },
    };
  }

  describe('getMaxFocusProspects', () => {
    it('should return MIN for low experience scouts', () => {
      expect(getMaxFocusProspects(0)).toBe(MIN_FOCUS_PROSPECTS);
      expect(getMaxFocusProspects(2)).toBe(MIN_FOCUS_PROSPECTS);
      expect(getMaxFocusProspects(4)).toBe(MIN_FOCUS_PROSPECTS);
    });

    it('should return 4 for medium experience scouts', () => {
      expect(getMaxFocusProspects(5)).toBe(4);
      expect(getMaxFocusProspects(7)).toBe(4);
      expect(getMaxFocusProspects(9)).toBe(4);
    });

    it('should return MAX for high experience scouts', () => {
      expect(getMaxFocusProspects(10)).toBe(MAX_FOCUS_PROSPECTS);
      expect(getMaxFocusProspects(15)).toBe(MAX_FOCUS_PROSPECTS);
      expect(getMaxFocusProspects(20)).toBe(MAX_FOCUS_PROSPECTS);
    });
  });

  describe('calculateFocusSkillRange', () => {
    it('should create narrower ranges than auto-scouting', () => {
      const range = calculateFocusSkillRange(75, 70);
      const width = range.max - range.min;

      // Focus scouting should have max width around 10 (from config)
      expect(width).toBeLessThanOrEqual(15);
    });

    it('should be more accurate for high-skill scouts', () => {
      const lowSkillRange = calculateFocusSkillRange(75, 30);
      const highSkillRange = calculateFocusSkillRange(75, 90);

      const lowWidth = lowSkillRange.max - lowSkillRange.min;
      const highWidth = highSkillRange.max - highSkillRange.min;

      expect(highWidth).toBeLessThanOrEqual(lowWidth);
    });

    it('should assign higher confidence for focus scouting', () => {
      const range = calculateFocusSkillRange(75, 70);
      expect(['high', 'medium']).toContain(range.confidence);
    });

    it('should clamp to valid bounds', () => {
      const lowRange = calculateFocusSkillRange(5, 70);
      const highRange = calculateFocusSkillRange(98, 70);

      expect(lowRange.min).toBeGreaterThanOrEqual(1);
      expect(highRange.max).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateFocusRoundRange', () => {
    it('should create narrow round range', () => {
      const range = calculateFocusRoundRange(2, 70);

      expect(range.max - range.min).toBeLessThanOrEqual(2);
      expect(range.min).toBeGreaterThanOrEqual(1);
      expect(range.max).toBeLessThanOrEqual(7);
    });
  });

  describe('generateCharacterAssessment', () => {
    it('should assess work ethic correctly', () => {
      const eliteWorkEthic = createMockExtendedProspect({ trueWorkEthic: 90 });
      const assessment = generateCharacterAssessment(eliteWorkEthic, 80);

      expect(assessment.workEthic).toBe('elite');
      expect(assessment.notes).toContain('First one in, last one out');
    });

    it('should assess leadership correctly', () => {
      const naturalLeader = createMockExtendedProspect({ trueLeadership: 90 });
      const assessment = generateCharacterAssessment(naturalLeader, 80);

      expect(assessment.leadership).toBe('captain');
      expect(assessment.notes).toContain('Natural leader in the locker room');
    });

    it('should flag maturity concerns', () => {
      const immature = createMockExtendedProspect({ trueMaturity: 30 });
      const assessment = generateCharacterAssessment(immature, 80);

      expect(assessment.maturity).toBe('immature');
      expect(assessment.notes).toContain('Some maturity concerns reported');
    });

    it('should generate qualitative assessments', () => {
      const prospect = createMockExtendedProspect();
      const assessment = generateCharacterAssessment(prospect, 70);

      expect(['elite', 'good', 'average', 'concerns', 'unknown']).toContain(assessment.workEthic);
      expect(['captain', 'leader', 'follower', 'loner', 'unknown']).toContain(
        assessment.leadership
      );
      expect(['excellent', 'good', 'average', 'difficult', 'unknown']).toContain(
        assessment.coachability
      );
    });
  });

  describe('generateMedicalAssessment', () => {
    it('should assess clean medical history', () => {
      const cleanProspect = createMockExtendedProspect({
        durabilityRating: 90,
        injuryHistory: [],
      });

      const assessment = generateMedicalAssessment(cleanProspect, 80);

      expect(assessment.overallGrade).toBe('clean');
      expect(assessment.durabilityProjection).toBe('ironman');
      expect(assessment.redFlags).toHaveLength(0);
    });

    it('should flag injury history', () => {
      const injuredProspect = createMockExtendedProspect({
        durabilityRating: 40,
        injuryHistory: ['ACL tear 2021', 'Shoulder surgery 2022', 'Ankle sprain 2023'],
      });

      const assessment = generateMedicalAssessment(injuredProspect, 80);

      expect(assessment.overallGrade).toBe('major_concerns');
      expect(assessment.durabilityProjection).toBe('fragile');
      expect(assessment.redFlags.length).toBeGreaterThan(0);
    });

    it('should return clearances for healthy prospects', () => {
      const healthyProspect = createMockExtendedProspect({
        durabilityRating: 95,
        injuryHistory: [],
      });

      const assessment = generateMedicalAssessment(healthyProspect, 80);

      expect(assessment.clearances).toContain('No significant injury history');
      expect(assessment.clearances).toContain('Excellent physical durability');
    });
  });

  describe('generateSchemeFitAnalysis', () => {
    it('should identify best fit scheme', () => {
      const prospect = createMockExtendedProspect({
        schemeFits: {
          offense_west_coast: 50,
          offense_air_raid: 95,
          offense_spread: 70,
        },
      });

      const analysis = generateSchemeFitAnalysis(prospect, 80);

      expect(analysis.bestFitScheme).toBe('air_raid');
    });

    it('should identify worst fit scheme', () => {
      const prospect = createMockExtendedProspect({
        schemeFits: {
          offense_west_coast: 50,
          offense_power_run: 25,
          offense_spread: 70,
        },
      });

      const analysis = generateSchemeFitAnalysis(prospect, 80);

      expect(analysis.worstFitScheme).toBe('power_run');
    });

    it('should calculate versatility', () => {
      const versatileProspect = createMockExtendedProspect({
        schemeFits: {
          offense_a: 75,
          offense_b: 78,
          offense_c: 72,
        },
      });

      const analysis = generateSchemeFitAnalysis(versatileProspect, 80);

      expect(analysis.versatility).toBe('high');
    });
  });

  describe('generateInterviewInsights', () => {
    it('should assess elite football IQ', () => {
      const smartProspect = createMockExtendedProspect({ footballIQ: 95 });
      const insights = generateInterviewInsights(smartProspect, 80);

      expect(insights.footballIQ).toBe('elite');
      expect(insights.positives).toContain('Exceptional football mind');
    });

    it('should flag low football IQ', () => {
      const lowIQProspect = createMockExtendedProspect({ footballIQ: 30 });
      const insights = generateInterviewInsights(lowIQProspect, 80);

      expect(insights.footballIQ).toBe('low');
      expect(insights.concerns).toContain('May take time to learn playbook');
    });

    it('should assess communication based on leadership and maturity', () => {
      const articulateProspect = createMockExtendedProspect({
        trueLeadership: 90,
        trueMaturity: 90,
      });

      const insights = generateInterviewInsights(articulateProspect, 80);

      expect(insights.communication).toBe('excellent');
      expect(insights.positives).toContain('Articulate and confident');
    });

    it('should generate motivation summary', () => {
      const drivenProspect = createMockExtendedProspect({
        trueWorkEthic: 90,
        trueCompetitiveness: 90,
      });

      const insights = generateInterviewInsights(drivenProspect, 80);

      expect(insights.motivation).toBe('Highly driven to be the best');
    });
  });

  describe('generateFocusScoutingReport', () => {
    it('should generate a complete focus report', () => {
      const prospect = createMockExtendedProspect();
      const scout = createScoutWithAttributes(80, 10);

      const report = generateFocusScoutingReport(prospect, scout, 202301);

      expect(report.prospectId).toBe('prospect-1');
      expect(report.isFocusScouted).toBe(true);
      expect(report.allTraits).toEqual(prospect.allTraits);
      expect(report.character).toBeDefined();
      expect(report.medical).toBeDefined();
      expect(report.schemeFit).toBeDefined();
      expect(report.interview).toBeDefined();
      expect(validateFocusScoutingReport(report)).toBe(true);
    });

    it('should include player comparison and projections', () => {
      const prospect = createMockExtendedProspect({
        comparison: 'Tom Brady',
        ceiling: 'Hall of Fame',
        floor: 'Solid starter',
      });
      const scout = createScoutWithAttributes(80, 10);

      const report = generateFocusScoutingReport(prospect, scout, 202301);

      expect(report.playerComparison).toBe('Tom Brady');
      expect(report.ceiling).toBe('Hall of Fame');
      expect(report.floor).toBe('Solid starter');
    });

    it('should have narrower ranges than auto-scouting', () => {
      const prospect = createMockExtendedProspect();
      const scout = createScoutWithAttributes(70, 10);

      const report = generateFocusScoutingReport(prospect, scout, 202301);
      const overallWidth = report.overallRange.max - report.overallRange.min;

      // Focus scouting should typically have range width <= 15
      expect(overallWidth).toBeLessThanOrEqual(15);
    });

    it('should track scouting hours', () => {
      const prospect = createMockExtendedProspect();
      const scout = createScoutWithAttributes(80, 10);

      const report = generateFocusScoutingReport(prospect, scout, 202301);

      expect(report.totalScoutingHours).toBe(DEFAULT_FOCUS_SCOUTING_CONFIG.weeksToComplete * 15);
    });

    it('should assign scout confidence based on evaluation', () => {
      const prospect = createMockExtendedProspect();
      const highSkillScout = createScoutWithAttributes(85, 10);
      const lowSkillScout = createScoutWithAttributes(35, 5);

      const highSkillReport = generateFocusScoutingReport(prospect, highSkillScout, 202301);
      const lowSkillReport = generateFocusScoutingReport(prospect, lowSkillScout, 202301);

      expect(highSkillReport.scoutConfidence).toBe('high');
      expect(lowSkillReport.scoutConfidence).toBe('low');
    });
  });

  describe('crossReferenceFocusReports', () => {
    it('should return null for empty array', () => {
      expect(crossReferenceFocusReports([])).toBeNull();
    });

    it('should return single report unchanged', () => {
      const prospect = createMockExtendedProspect();
      const scout = createScoutWithAttributes(80, 10);
      const report = generateFocusScoutingReport(prospect, scout, 202301);

      const result = crossReferenceFocusReports([report]);

      expect(result).toEqual(report);
    });

    it('should narrow ranges with multiple reports', () => {
      const prospect = createMockExtendedProspect();
      const scout1 = createScoutWithAttributes(70, 10);
      const scout2 = createScoutWithAttributes(70, 10);

      const report1 = generateFocusScoutingReport(prospect, scout1, 202301);
      const report2 = generateFocusScoutingReport(prospect, { ...scout2, id: 'scout-2' }, 202302);

      const crossRef = crossReferenceFocusReports([report1, report2])!;
      const singleWidth = report1.overallRange.max - report1.overallRange.min;
      const crossRefWidth = crossRef.overallRange.max - crossRef.overallRange.min;

      expect(crossRefWidth).toBeLessThanOrEqual(singleWidth);
    });

    it('should aggregate character notes', () => {
      const prospect = createMockExtendedProspect({ trueWorkEthic: 90, trueLeadership: 90 });
      const scout1 = createScoutWithAttributes(80, 10);
      const scout2 = createScoutWithAttributes(80, 10);

      const report1 = generateFocusScoutingReport(prospect, scout1, 202301);
      const report2 = generateFocusScoutingReport(prospect, { ...scout2, id: 'scout-2' }, 202302);

      const crossRef = crossReferenceFocusReports([report1, report2])!;

      // Should have combined notes from both scouts
      expect(crossRef.character.notes.length).toBeGreaterThanOrEqual(
        Math.max(report1.character.notes.length, report2.character.notes.length)
      );
    });

    it('should set high confidence for cross-referenced reports', () => {
      const prospect = createMockExtendedProspect();
      const scout1 = createScoutWithAttributes(60, 5);
      const scout2 = createScoutWithAttributes(60, 5);

      const report1 = generateFocusScoutingReport(prospect, scout1, 202301);
      const report2 = generateFocusScoutingReport(prospect, { ...scout2, id: 'scout-2' }, 202302);

      const crossRef = crossReferenceFocusReports([report1, report2])!;

      expect(crossRef.scoutConfidence).toBe('high');
    });

    it('should accumulate total scouting hours', () => {
      const prospect = createMockExtendedProspect();
      const scout1 = createScoutWithAttributes(70, 10);
      const scout2 = createScoutWithAttributes(70, 10);

      const report1 = generateFocusScoutingReport(prospect, scout1, 202301);
      const report2 = generateFocusScoutingReport(prospect, { ...scout2, id: 'scout-2' }, 202302);

      const crossRef = crossReferenceFocusReports([report1, report2])!;

      expect(crossRef.totalScoutingHours).toBe(
        report1.totalScoutingHours + report2.totalScoutingHours
      );
    });
  });

  describe('canAssignFocusPlayer', () => {
    it('should allow assignment when under max', () => {
      const scout = createScoutWithAttributes(70, 3);

      expect(canAssignFocusPlayer(scout, 'prospect-1')).toBe(true);
    });

    it('should reject assignment when at max', () => {
      const scout = createScoutWithAttributes(70, 3);
      const maxedScout: Scout = {
        ...scout,
        focusProspects: ['p1', 'p2', 'p3'], // 3 is max for experience < 5
      };

      expect(canAssignFocusPlayer(maxedScout, 'prospect-new')).toBe(false);
    });

    it('should reject assignment for already focused prospect', () => {
      const scout = createScoutWithAttributes(70, 3);
      const scoutWithFocus: Scout = {
        ...scout,
        focusProspects: ['prospect-1'],
      };

      expect(canAssignFocusPlayer(scoutWithFocus, 'prospect-1')).toBe(false);
    });
  });

  describe('validateFocusScoutingReport', () => {
    it('should validate correct report', () => {
      const prospect = createMockExtendedProspect();
      const scout = createScoutWithAttributes(80, 10);
      const report = generateFocusScoutingReport(prospect, scout, 202301);

      expect(validateFocusScoutingReport(report)).toBe(true);
    });

    it('should reject report with missing fields', () => {
      const invalidReport = {
        prospectId: '',
        prospectName: 'Test',
        scoutId: 'scout-1',
      } as FocusScoutingReport;

      expect(validateFocusScoutingReport(invalidReport)).toBe(false);
    });

    it('should reject report with invalid skill ranges', () => {
      const prospect = createMockExtendedProspect();
      const scout = createScoutWithAttributes(80, 10);
      const report = generateFocusScoutingReport(prospect, scout, 202301);

      const invalidReport: FocusScoutingReport = {
        ...report,
        overallRange: { min: 150, max: 200, confidence: 'high' },
      };

      expect(validateFocusScoutingReport(invalidReport)).toBe(false);
    });

    it('should reject report with invalid round ranges', () => {
      const prospect = createMockExtendedProspect();
      const scout = createScoutWithAttributes(80, 10);
      const report = generateFocusScoutingReport(prospect, scout, 202301);

      const invalidReport: FocusScoutingReport = {
        ...report,
        projectedRound: { min: 0, max: 10 },
      };

      expect(validateFocusScoutingReport(invalidReport)).toBe(false);
    });
  });

  describe('DEFAULT_FOCUS_SCOUTING_CONFIG', () => {
    it('should have narrower ranges than auto-scouting', () => {
      expect(DEFAULT_FOCUS_SCOUTING_CONFIG.skillRangeWidth).toBe(10);
      expect(DEFAULT_FOCUS_SCOUTING_CONFIG.roundRangeWidth).toBe(1);
    });

    it('should require multiple weeks to complete', () => {
      expect(DEFAULT_FOCUS_SCOUTING_CONFIG.weeksToComplete).toBe(3);
    });
  });
});
