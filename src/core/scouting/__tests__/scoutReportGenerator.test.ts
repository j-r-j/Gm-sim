/**
 * Tests for Scout Report Generator
 */

import { Position } from '../../models/player/Position';
import { Scout, createDefaultScout } from '../../models/staff/Scout';
import { ProspectData } from '../AutoScoutingSystem';
import { ExtendedProspectData } from '../FocusPlayerSystem';
import {
  ReportConfidence,
  generateReportId,
  calculateDraftProjection,
  generateConfidenceFactors,
  calculateReportConfidence,
  convertTraitsToInfo,
  generateAutoScoutReport,
  generateFocusScoutReport,
  formatSkillRange,
  formatReportForDisplay,
  validateScoutReport,
  getReportQuality,
} from '../ScoutReportGenerator';

// Helper function to create mock scout
function createMockScout(evaluation: number = 70): Scout {
  const scout = createDefaultScout('scout-1', 'John', 'Smith', 'offensiveScout');
  return {
    ...scout,
    attributes: {
      ...scout.attributes,
      evaluation,
      speed: 60,
      experience: 5,
    },
  };
}

// Helper function to create mock prospect
function createMockProspect(overrides: Partial<ProspectData> = {}): ProspectData {
  return {
    id: 'prospect-1',
    name: 'Marcus Johnson',
    position: Position.WR,
    region: 'northeast',
    college: 'State University',
    height: '6\'2"',
    weight: 210,
    trueOverall: 82,
    truePhysical: 85,
    trueTechnical: 78,
    allTraits: ['Elite Speed', 'Strong Hands', 'Route Running', 'Deep Threat'],
    projectedRound: 1,
    ...overrides,
  };
}

// Helper function to create extended prospect
function createExtendedProspect(
  overrides: Partial<ExtendedProspectData> = {}
): ExtendedProspectData {
  return {
    ...createMockProspect(),
    trueWorkEthic: 85,
    trueLeadership: 70,
    trueCoachability: 80,
    trueMaturity: 75,
    trueCompetitiveness: 90,
    injuryHistory: [],
    durabilityRating: 85,
    footballIQ: 75,
    schemeFits: {
      offense_spread: 85,
      offense_west_coast: 70,
      offense_pro_style: 75,
    },
    comparison: 'Julio Jones',
    ceiling: 'Pro Bowl receiver',
    floor: 'Solid WR2',
    ...overrides,
  };
}

describe('ScoutReportGenerator', () => {
  describe('generateReportId', () => {
    it('should generate unique report IDs', () => {
      const id1 = generateReportId('prospect-1', 'scout-1', 1000);
      const id2 = generateReportId('prospect-1', 'scout-2', 1000);
      const id3 = generateReportId('prospect-1', 'scout-1', 2000);

      expect(id1).toBe('report-prospect-1-scout-1-1000');
      expect(id2).toBe('report-prospect-1-scout-2-1000');
      expect(id3).toBe('report-prospect-1-scout-1-2000');
      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
    });
  });

  describe('calculateDraftProjection', () => {
    it('should project first round for elite prospects', () => {
      const confidence: ReportConfidence = {
        level: 'high',
        score: 85,
        factors: [],
      };

      const projection = calculateDraftProjection({ min: 1, max: 1 }, confidence);

      expect(projection.roundMin).toBe(1);
      expect(projection.roundMax).toBe(1);
      expect(projection.overallGrade).toBe('First-round talent');
      expect(projection.pickRangeDescription).toBe('Round 1');
    });

    it('should project day two for mid-round prospects', () => {
      const confidence: ReportConfidence = {
        level: 'medium',
        score: 55,
        factors: [],
      };

      const projection = calculateDraftProjection({ min: 2, max: 3 }, confidence);

      expect(projection.roundMin).toBe(2);
      expect(projection.roundMax).toBe(3);
      // Average of 2.5 results in Day 1-2 pick
      expect(projection.overallGrade).toBe('Day 1-2 pick');
    });

    it('should project late rounds for lower prospects', () => {
      const confidence: ReportConfidence = {
        level: 'low',
        score: 35,
        factors: [],
      };

      const projection = calculateDraftProjection({ min: 5, max: 7 }, confidence);

      expect(projection.roundMin).toBe(5);
      expect(projection.roundMax).toBe(7);
      expect(projection.pickRangeDescription).toBe('Day 3 (Rounds 4-7)');
    });
  });

  describe('generateConfidenceFactors', () => {
    it('should generate positive factors for experienced scout', () => {
      const factors = generateConfidenceFactors(85, 'focus', 45);

      expect(factors.length).toBeGreaterThan(0);

      const scoutFactor = factors.find((f) => f.factor === 'Scout Experience');
      expect(scoutFactor).toBeDefined();
      expect(scoutFactor?.impact).toBe('positive');
    });

    it('should generate negative factors for brief evaluation', () => {
      const factors = generateConfidenceFactors(40, 'auto', 2);

      const timeFactor = factors.find((f) => f.factor === 'Time Invested');
      expect(timeFactor).toBeDefined();
      expect(timeFactor?.impact).toBe('negative');
    });

    it('should include scouting depth factor', () => {
      const focusFactors = generateConfidenceFactors(60, 'focus', 30);
      const autoFactors = generateConfidenceFactors(60, 'auto', 5);

      const focusDepth = focusFactors.find((f) => f.factor === 'Scouting Depth');
      const autoDepth = autoFactors.find((f) => f.factor === 'Scouting Depth');

      expect(focusDepth?.impact).toBe('positive');
      expect(autoDepth?.impact).toBe('negative');
    });
  });

  describe('calculateReportConfidence', () => {
    it('should return high confidence for experienced scout with focus report', () => {
      const confidence = calculateReportConfidence(90, 'focus', 45);

      expect(confidence.level).toBe('high');
      expect(confidence.score).toBeGreaterThan(70);
    });

    it('should return low confidence for auto scout with brief time', () => {
      const confidence = calculateReportConfidence(40, 'auto', 2);

      expect(confidence.level).toBe('low');
      expect(confidence.score).toBeLessThan(50);
    });

    it('should return medium confidence for average scenarios', () => {
      const confidence = calculateReportConfidence(60, 'auto', 10);

      expect(confidence.level).toBe('medium');
      expect(confidence.score).toBeGreaterThanOrEqual(40);
      expect(confidence.score).toBeLessThan(70);
    });

    it('should include confidence factors', () => {
      const confidence = calculateReportConfidence(70, 'focus', 30);

      expect(confidence.factors.length).toBeGreaterThan(0);
    });
  });

  describe('convertTraitsToInfo', () => {
    it('should categorize physical traits correctly', () => {
      const traits = ['Elite Speed', 'Strong Build'];
      const traitInfo = convertTraitsToInfo(traits, false);

      expect(traitInfo[0].category).toBe('physical');
      expect(traitInfo[1].category).toBe('physical');
    });

    it('should categorize character traits correctly', () => {
      const traits = ['Team Leader', 'Hard Worker'];
      const traitInfo = convertTraitsToInfo(traits, false);

      expect(traitInfo[0].category).toBe('character');
      expect(traitInfo[1].category).toBe('character');
    });

    it('should include analysis when requested', () => {
      const traits = ['Elite Speed'];
      const withAnalysis = convertTraitsToInfo(traits, true);
      const withoutAnalysis = convertTraitsToInfo(traits, false);

      expect(withAnalysis[0].analysis).toBeDefined();
      expect(withoutAnalysis[0].analysis).toBeUndefined();
    });
  });

  describe('generateAutoScoutReport', () => {
    it('should generate a valid auto scout report', () => {
      const scout = createMockScout(70);
      const prospect = createMockProspect();
      const timestamp = Date.now();

      const report = generateAutoScoutReport(prospect, scout, timestamp);

      expect(report.reportType).toBe('auto');
      expect(report.prospectId).toBe(prospect.id);
      expect(report.prospectName).toBe(prospect.name);
      expect(report.position).toBe(prospect.position);
      expect(report.scoutId).toBe(scout.id);
    });

    it('should have wide skill ranges for auto scouting', () => {
      const scout = createMockScout(60);
      const prospect = createMockProspect();

      const report = generateAutoScoutReport(prospect, scout, Date.now());

      const overallWidth = report.skillRanges.overall.max - report.skillRanges.overall.min;
      expect(overallWidth).toBeGreaterThan(10);
    });

    it('should have limited trait visibility', () => {
      const scout = createMockScout(70);
      const prospect = createMockProspect({
        allTraits: ['Speed', 'Hands', 'Leadership', 'Football IQ', 'Work Ethic'],
      });

      const report = generateAutoScoutReport(prospect, scout, Date.now());

      expect(report.hiddenTraitCount).toBeGreaterThan(0);
      expect(report.visibleTraits.length).toBeLessThan(prospect.allTraits.length);
    });

    it('should not include focus-only fields', () => {
      const scout = createMockScout();
      const prospect = createMockProspect();

      const report = generateAutoScoutReport(prospect, scout, Date.now());

      expect(report.characterAssessment).toBeUndefined();
      expect(report.medicalAssessment).toBeUndefined();
      expect(report.schemeFitAnalysis).toBeUndefined();
      expect(report.interviewInsights).toBeUndefined();
    });

    it('should flag high-potential prospects for focus scouting', () => {
      const scout = createMockScout(70);
      const prospect = createMockProspect({
        trueOverall: 90,
        projectedRound: 1,
      });

      const report = generateAutoScoutReport(prospect, scout, Date.now());

      expect(report.needsMoreScouting).toBe(true);
    });

    it('should never expose true values', () => {
      const scout = createMockScout(100); // Even with perfect scout
      const prospect = createMockProspect({
        trueOverall: 85,
        truePhysical: 88,
        trueTechnical: 82,
      });

      const report = generateAutoScoutReport(prospect, scout, Date.now());

      // Ranges should not exactly match true values - should have a range
      expect(report.skillRanges.overall.max - report.skillRanges.overall.min).toBeGreaterThan(5);
    });
  });

  describe('generateFocusScoutReport', () => {
    it('should generate a valid focus scout report', () => {
      const scout = createMockScout(75);
      const prospect = createExtendedProspect();
      const timestamp = Date.now();

      const report = generateFocusScoutReport(prospect, scout, timestamp, 3);

      expect(report.reportType).toBe('focus');
      expect(report.prospectId).toBe(prospect.id);
      expect(report.prospectName).toBe(prospect.name);
    });

    it('should have narrower skill ranges than auto scouting', () => {
      const scout = createMockScout(70);
      const prospect = createExtendedProspect();

      const focusReport = generateFocusScoutReport(prospect, scout, Date.now(), 3);
      const autoReport = generateAutoScoutReport(prospect, scout, Date.now());

      const focusWidth = focusReport.skillRanges.overall.max - focusReport.skillRanges.overall.min;
      const autoWidth = autoReport.skillRanges.overall.max - autoReport.skillRanges.overall.min;

      expect(focusWidth).toBeLessThan(autoWidth);
    });

    it('should reveal all traits for focus scouting', () => {
      const scout = createMockScout(70);
      const prospect = createExtendedProspect();

      const report = generateFocusScoutReport(prospect, scout, Date.now(), 3);

      expect(report.hiddenTraitCount).toBe(0);
      expect(report.visibleTraits.length).toBe(prospect.allTraits.length);
    });

    it('should include character assessment', () => {
      const scout = createMockScout(75);
      const prospect = createExtendedProspect();

      const report = generateFocusScoutReport(prospect, scout, Date.now(), 3);

      expect(report.characterAssessment).toBeDefined();
      expect(report.characterAssessment?.workEthic).toBeDefined();
      expect(report.characterAssessment?.leadership).toBeDefined();
    });

    it('should include medical assessment', () => {
      const scout = createMockScout(75);
      const prospect = createExtendedProspect();

      const report = generateFocusScoutReport(prospect, scout, Date.now(), 3);

      expect(report.medicalAssessment).toBeDefined();
      expect(report.medicalAssessment?.overallGrade).toBeDefined();
      expect(report.medicalAssessment?.durabilityProjection).toBeDefined();
    });

    it('should include scheme fit analysis', () => {
      const scout = createMockScout(75);
      const prospect = createExtendedProspect();

      const report = generateFocusScoutReport(prospect, scout, Date.now(), 3);

      expect(report.schemeFitAnalysis).toBeDefined();
      expect(report.schemeFitAnalysis?.bestFitScheme).toBeDefined();
    });

    it('should include interview insights', () => {
      const scout = createMockScout(75);
      const prospect = createExtendedProspect();

      const report = generateFocusScoutReport(prospect, scout, Date.now(), 3);

      expect(report.interviewInsights).toBeDefined();
      expect(report.interviewInsights?.footballIQ).toBeDefined();
    });

    it('should include player comparison and ceiling/floor', () => {
      const scout = createMockScout(75);
      const prospect = createExtendedProspect();

      const report = generateFocusScoutReport(prospect, scout, Date.now(), 3);

      expect(report.playerComparison).toBe(prospect.comparison);
      expect(report.ceiling).toBe(prospect.ceiling);
      expect(report.floor).toBe(prospect.floor);
    });

    it('should have higher confidence than auto reports', () => {
      const scout = createMockScout(70);
      const prospect = createExtendedProspect();

      const focusReport = generateFocusScoutReport(prospect, scout, Date.now(), 3);
      const autoReport = generateAutoScoutReport(prospect, scout, Date.now());

      expect(focusReport.confidence.score).toBeGreaterThan(autoReport.confidence.score);
    });

    it('should track scouting hours based on weeks spent', () => {
      const scout = createMockScout(70);
      const prospect = createExtendedProspect();

      const report3Weeks = generateFocusScoutReport(prospect, scout, Date.now(), 3);
      const report5Weeks = generateFocusScoutReport(prospect, scout, Date.now(), 5);

      expect(report5Weeks.scoutingHours).toBeGreaterThan(report3Weeks.scoutingHours);
    });
  });

  describe('formatSkillRange', () => {
    it('should format narrow ranges correctly', () => {
      const range = { min: 78, max: 82, confidence: 'high' as const };
      const formatted = formatSkillRange(range);

      expect(formatted).toContain('78-82');
      expect(formatted).toContain('high');
    });

    it('should format wide ranges with range notation', () => {
      const range = { min: 60, max: 80, confidence: 'low' as const };
      const formatted = formatSkillRange(range);

      expect(formatted).toContain('60-80'); // Full range shown
      expect(formatted).toContain('wide range');
    });
  });

  describe('formatReportForDisplay', () => {
    it('should format auto report for display', () => {
      const scout = createMockScout(70);
      const prospect = createMockProspect();
      const report = generateAutoScoutReport(prospect, scout, Date.now());

      const display = formatReportForDisplay(report);

      expect(display.header.playerName).toBe(prospect.name);
      expect(display.header.reportType).toBe('Preliminary Report');
      expect(display.physical.measurements.length).toBeGreaterThan(0);
      expect(display.skills.overall).toBeDefined();
    });

    it('should format focus report with detailed analysis', () => {
      const scout = createMockScout(75);
      const prospect = createExtendedProspect();
      const report = generateFocusScoutReport(prospect, scout, Date.now(), 3);

      const display = formatReportForDisplay(report);

      expect(display.header.reportType).toBe('In-Depth Report');
      expect(display.detailedAnalysis).toBeDefined();
      expect(display.detailedAnalysis?.character).toBeDefined();
      expect(display.detailedAnalysis?.medical).toBeDefined();
    });

    it('should include recommendation', () => {
      const scout = createMockScout(70);
      const prospect = createMockProspect();
      const report = generateAutoScoutReport(prospect, scout, Date.now());

      const display = formatReportForDisplay(report);

      expect(display.recommendation).toBeDefined();
      expect(display.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe('validateScoutReport', () => {
    it('should validate a well-formed report', () => {
      const scout = createMockScout(70);
      const prospect = createMockProspect();
      const report = generateAutoScoutReport(prospect, scout, Date.now());

      expect(validateScoutReport(report)).toBe(true);
    });

    it('should reject report with missing ID', () => {
      const scout = createMockScout(70);
      const prospect = createMockProspect();
      const report = generateAutoScoutReport(prospect, scout, Date.now());
      report.id = '';

      expect(validateScoutReport(report)).toBe(false);
    });

    it('should reject report with invalid skill ranges', () => {
      const scout = createMockScout(70);
      const prospect = createMockProspect();
      const report = generateAutoScoutReport(prospect, scout, Date.now());
      report.skillRanges.overall.min = 150; // Invalid

      expect(validateScoutReport(report)).toBe(false);
    });

    it('should reject report with invalid round ranges', () => {
      const scout = createMockScout(70);
      const prospect = createMockProspect();
      const report = generateAutoScoutReport(prospect, scout, Date.now());
      report.draftProjection.roundMin = 0; // Invalid

      expect(validateScoutReport(report)).toBe(false);
    });
  });

  describe('getReportQuality', () => {
    it('should return comprehensive for tight focus reports', () => {
      const scout = createMockScout(85);
      const prospect = createExtendedProspect();
      const report = generateFocusScoutReport(prospect, scout, Date.now(), 4);

      // Force narrow ranges for test
      report.skillRanges.overall = { min: 78, max: 84, confidence: 'high' };
      report.draftProjection.roundMin = 1;
      report.draftProjection.roundMax = 1;

      const quality = getReportQuality(report);

      expect(quality).toBe('Comprehensive evaluation');
    });

    it('should return initial impression for wide auto reports', () => {
      const scout = createMockScout(40);
      const prospect = createMockProspect();
      const report = generateAutoScoutReport(prospect, scout, Date.now());

      // Force wide ranges for test
      report.skillRanges.overall = { min: 50, max: 80, confidence: 'low' };
      report.draftProjection.roundMin = 2;
      report.draftProjection.roundMax = 5;

      const quality = getReportQuality(report);

      expect(quality).toBe('Initial impression');
    });
  });
});
