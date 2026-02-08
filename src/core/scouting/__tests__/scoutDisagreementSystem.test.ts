/**
 * Tests for ScoutDisagreementSystem
 */

import { Position } from '../../models/player/Position';
import {
  findDisagreements,
  analyzeSplitOpinion,
  analyzeAllSplitOpinions,
  getMostContentiousProspects,
  getSplitOpinionLabel,
  validateSplitOpinionFlag,
  DEFAULT_DISAGREEMENT_CONFIG,
  type DisagreementConfig,
} from '../ScoutDisagreementSystem';
import { ScoutReport } from '../ScoutReportGenerator';
import { SkillRange } from '../AutoScoutingSystem';

// Helper to create a mock scout report
function createMockReport(overrides: Partial<ScoutReport> = {}): ScoutReport {
  return {
    id: 'report-1',
    prospectId: 'prospect-1',
    prospectName: 'John Smith',
    position: Position.QB,
    reportType: 'auto',
    generatedAt: Date.now(),
    scoutId: 'scout-1',
    scoutName: 'Scout A',
    physicalMeasurements: {} as any,
    skillRanges: {
      overall: { min: 60, max: 80, confidence: 'medium' },
      physical: { min: 55, max: 75, confidence: 'medium' },
      technical: { min: 65, max: 85, confidence: 'medium' },
    },
    visibleTraits: [],
    hiddenTraitCount: 0,
    draftProjection: {
      roundMin: 1,
      roundMax: 2,
      pickRangeDescription: 'Early 1st to Late 2nd',
      overallGrade: 'Day 1-2 pick',
    },
    confidence: {
      level: 'medium',
      score: 55,
      factors: [],
    },
    ...overrides,
  } as ScoutReport;
}

describe('findDisagreements', () => {
  it('should find no disagreements for similar reports', () => {
    const reportA = createMockReport({
      scoutId: 'scout-1',
      scoutName: 'Scout A',
      skillRanges: {
        overall: { min: 70, max: 80, confidence: 'medium' },
        physical: { min: 65, max: 75, confidence: 'medium' },
        technical: { min: 68, max: 78, confidence: 'medium' },
      },
    });
    const reportB = createMockReport({
      scoutId: 'scout-2',
      scoutName: 'Scout B',
      skillRanges: {
        overall: { min: 72, max: 82, confidence: 'medium' },
        physical: { min: 67, max: 77, confidence: 'medium' },
        technical: { min: 70, max: 80, confidence: 'medium' },
      },
    });

    const disagreements = findDisagreements(reportA, reportB);
    expect(disagreements.length).toBe(0);
  });

  it('should find overall skill disagreement', () => {
    const reportA = createMockReport({
      scoutId: 'scout-1',
      scoutName: 'Scout A',
      skillRanges: {
        overall: { min: 70, max: 80, confidence: 'medium' },
        physical: { min: 65, max: 75, confidence: 'medium' },
        technical: { min: 68, max: 78, confidence: 'medium' },
      },
    });
    const reportB = createMockReport({
      scoutId: 'scout-2',
      scoutName: 'Scout B',
      skillRanges: {
        overall: { min: 40, max: 55, confidence: 'medium' },
        physical: { min: 65, max: 75, confidence: 'medium' },
        technical: { min: 68, max: 78, confidence: 'medium' },
      },
    });

    const disagreements = findDisagreements(reportA, reportB);
    const overallDisagreement = disagreements.find((d) => d.area === 'overall_skill');
    expect(overallDisagreement).toBeDefined();
    expect(overallDisagreement!.severity).toBe('major');
  });

  it('should find draft projection disagreement', () => {
    const reportA = createMockReport({
      scoutId: 'scout-1',
      scoutName: 'Scout A',
      draftProjection: {
        roundMin: 1,
        roundMax: 1,
        pickRangeDescription: 'Round 1',
        overallGrade: 'First-round talent',
      },
    });
    const reportB = createMockReport({
      scoutId: 'scout-2',
      scoutName: 'Scout B',
      draftProjection: {
        roundMin: 3,
        roundMax: 4,
        pickRangeDescription: 'Round 3-4',
        overallGrade: 'Mid-round prospect',
      },
    });

    const disagreements = findDisagreements(reportA, reportB);
    const projectionDisagreement = disagreements.find((d) => d.area === 'draft_projection');
    expect(projectionDisagreement).toBeDefined();
    expect(projectionDisagreement!.severity).toBe('major');
  });

  it('should find character assessment disagreement', () => {
    const reportA = createMockReport({
      scoutId: 'scout-1',
      scoutName: 'Scout A',
      characterAssessment: {
        workEthic: 'elite',
        leadership: 'captain',
        coachability: 'excellent',
        maturity: 'mature',
        competitiveness: 'fierce',
        notes: [],
      },
    });
    const reportB = createMockReport({
      scoutId: 'scout-2',
      scoutName: 'Scout B',
      characterAssessment: {
        workEthic: 'concerns',
        leadership: 'loner',
        coachability: 'difficult',
        maturity: 'immature',
        competitiveness: 'passive',
        notes: [],
      },
    });

    const disagreements = findDisagreements(reportA, reportB);
    const charDisagreement = disagreements.find((d) => d.area === 'character');
    expect(charDisagreement).toBeDefined();
    expect(charDisagreement!.severity).toBe('major');
  });

  it('should find medical assessment disagreement', () => {
    const reportA = createMockReport({
      scoutId: 'scout-1',
      scoutName: 'Scout A',
      medicalAssessment: {
        overallGrade: 'clean',
        injuryHistory: [],
        durabilityProjection: 'ironman',
        redFlags: [],
        clearances: [],
      },
    });
    const reportB = createMockReport({
      scoutId: 'scout-2',
      scoutName: 'Scout B',
      medicalAssessment: {
        overallGrade: 'major_concerns',
        injuryHistory: ['Torn ACL'],
        durabilityProjection: 'fragile',
        redFlags: ['Chronic knee issues'],
        clearances: [],
      },
    });

    const disagreements = findDisagreements(reportA, reportB);
    const medDisagreement = disagreements.find((d) => d.area === 'medical');
    expect(medDisagreement).toBeDefined();
    expect(medDisagreement!.severity).toBe('major');
  });
});

describe('analyzeSplitOpinion', () => {
  it('should show no split for single report', () => {
    const reports = [createMockReport()];
    const flag = analyzeSplitOpinion('prospect-1', 'John Smith', Position.QB, reports);

    expect(flag.hasSplitOpinion).toBe(false);
    expect(flag.disagreements.length).toBe(0);
    expect(flag.consensusScore).toBe(100);
  });

  it('should show split opinion for heavily disagreeing reports', () => {
    const reportA = createMockReport({
      scoutId: 'scout-1',
      scoutName: 'Scout A',
      skillRanges: {
        overall: { min: 80, max: 90, confidence: 'high' },
        physical: { min: 75, max: 85, confidence: 'high' },
        technical: { min: 80, max: 90, confidence: 'high' },
      },
      draftProjection: {
        roundMin: 1,
        roundMax: 1,
        pickRangeDescription: 'Round 1',
        overallGrade: 'First-round talent',
      },
    });
    const reportB = createMockReport({
      scoutId: 'scout-2',
      scoutName: 'Scout B',
      skillRanges: {
        overall: { min: 40, max: 55, confidence: 'low' },
        physical: { min: 40, max: 55, confidence: 'low' },
        technical: { min: 45, max: 60, confidence: 'low' },
      },
      draftProjection: {
        roundMin: 4,
        roundMax: 5,
        pickRangeDescription: 'Round 4-5',
        overallGrade: 'Late-round flier',
      },
    });

    const flag = analyzeSplitOpinion('prospect-1', 'John Smith', Position.QB, [reportA, reportB]);

    expect(flag.hasSplitOpinion).toBe(true);
    expect(flag.disagreements.length).toBeGreaterThan(0);
    expect(flag.worstSeverity).toBe('major');
    expect(flag.consensusScore).toBeLessThan(50);
    expect(flag.summary).toContain('SPLIT OPINION');
  });

  it('should return agreement for very similar reports', () => {
    const reportA = createMockReport({
      scoutId: 'scout-1',
      scoutName: 'Scout A',
      skillRanges: {
        overall: { min: 70, max: 80, confidence: 'medium' },
        physical: { min: 65, max: 75, confidence: 'medium' },
        technical: { min: 70, max: 80, confidence: 'medium' },
      },
    });
    const reportB = createMockReport({
      scoutId: 'scout-2',
      scoutName: 'Scout B',
      skillRanges: {
        overall: { min: 72, max: 82, confidence: 'medium' },
        physical: { min: 67, max: 77, confidence: 'medium' },
        technical: { min: 72, max: 82, confidence: 'medium' },
      },
    });

    const flag = analyzeSplitOpinion('prospect-1', 'John Smith', Position.QB, [reportA, reportB]);

    expect(flag.hasSplitOpinion).toBe(false);
    expect(flag.consensusScore).toBe(100);
    expect(flag.summary).toContain('agreement');
  });
});

describe('analyzeAllSplitOpinions', () => {
  it('should skip prospects with fewer than 2 reports', () => {
    const prospectReports = new Map<
      string,
      { name: string; position: Position; reports: ScoutReport[] }
    >();
    prospectReports.set('prospect-1', {
      name: 'John Smith',
      position: Position.QB,
      reports: [createMockReport()],
    });

    const results = analyzeAllSplitOpinions(prospectReports);
    expect(results.size).toBe(0);
  });

  it('should analyze prospects with 2+ reports', () => {
    const prospectReports = new Map<
      string,
      { name: string; position: Position; reports: ScoutReport[] }
    >();
    prospectReports.set('prospect-1', {
      name: 'John Smith',
      position: Position.QB,
      reports: [
        createMockReport({ scoutId: 'scout-1', scoutName: 'Scout A' }),
        createMockReport({ scoutId: 'scout-2', scoutName: 'Scout B' }),
      ],
    });

    const results = analyzeAllSplitOpinions(prospectReports);
    expect(results.size).toBe(1);
    expect(results.has('prospect-1')).toBe(true);
  });
});

describe('getMostContentiousProspects', () => {
  it('should return prospects with split opinions sorted by consensus', () => {
    const splitOpinions = new Map();

    splitOpinions.set('prospect-1', {
      prospectId: 'prospect-1',
      prospectName: 'Player A',
      position: Position.QB,
      hasSplitOpinion: true,
      disagreements: [],
      worstSeverity: 'major',
      summary: 'Major split',
      scoutCount: 2,
      consensusScore: 20,
    });

    splitOpinions.set('prospect-2', {
      prospectId: 'prospect-2',
      prospectName: 'Player B',
      position: Position.WR,
      hasSplitOpinion: true,
      disagreements: [],
      worstSeverity: 'moderate',
      summary: 'Moderate split',
      scoutCount: 2,
      consensusScore: 60,
    });

    splitOpinions.set('prospect-3', {
      prospectId: 'prospect-3',
      prospectName: 'Player C',
      position: Position.RB,
      hasSplitOpinion: false,
      disagreements: [],
      worstSeverity: 'minor',
      summary: 'No split',
      scoutCount: 2,
      consensusScore: 95,
    });

    const contentious = getMostContentiousProspects(splitOpinions, 5);
    expect(contentious.length).toBe(2); // Only the two with hasSplitOpinion
    expect(contentious[0].prospectId).toBe('prospect-1'); // Lowest consensus first
  });
});

describe('getSplitOpinionLabel', () => {
  it('should return correct labels', () => {
    expect(getSplitOpinionLabel('major')).toBe('Split Opinion');
    expect(getSplitOpinionLabel('moderate')).toBe('Mixed Reviews');
    expect(getSplitOpinionLabel('minor')).toBe('Minor Differences');
  });
});

describe('validateSplitOpinionFlag', () => {
  it('should validate a proper flag', () => {
    const flag = {
      prospectId: 'prospect-1',
      prospectName: 'John Smith',
      position: Position.QB,
      hasSplitOpinion: true,
      disagreements: [],
      worstSeverity: 'major' as const,
      summary: 'Test',
      scoutCount: 2,
      consensusScore: 50,
    };
    expect(validateSplitOpinionFlag(flag)).toBe(true);
  });

  it('should reject flags with invalid consensus score', () => {
    const flag = {
      prospectId: 'prospect-1',
      prospectName: 'John Smith',
      position: Position.QB,
      hasSplitOpinion: true,
      disagreements: [],
      worstSeverity: 'major' as const,
      summary: 'Test',
      scoutCount: 2,
      consensusScore: 150,
    };
    expect(validateSplitOpinionFlag(flag)).toBe(false);
  });
});
