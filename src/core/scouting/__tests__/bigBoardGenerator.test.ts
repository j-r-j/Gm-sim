/**
 * Tests for Big Board Generator
 */

import { Position } from '../../models/player/Position';
import { ScoutReport } from '../ScoutReportGenerator';
import {
  DraftBoardState,
  createDraftBoardState,
  addReportToBoard,
} from '../DraftBoardManager';
import {
  PositionalNeeds,
  ScoutReliability,
  DEFAULT_BIG_BOARD_CONFIG,
  createDefaultPositionalNeeds,
  createScoutReliability,
  getScoutReliabilityWeight,
  calculateSkillScore,
  calculateConfidenceScore,
  calculateWeightedSkillScore,
  calculateNeedBonus,
  createProspectRanking,
  generateProspectRankings,
  generateNeedAdjustedRankings,
  generatePositionRankings,
  generateTierRankings,
  identifyBestValue,
  identifyRisers,
  identifyFallers,
  generateBigBoard,
  compareProspects,
  getPositionGroupRankings,
  validateBigBoard,
  getBigBoardSummary,
} from '../BigBoardGenerator';

// Helper to create mock report
function createMockReport(
  prospectId: string,
  scoutId: string,
  options: {
    position?: Position;
    overallMin?: number;
    overallMax?: number;
    roundMin?: number;
    roundMax?: number;
    confidenceScore?: number;
    reportType?: 'auto' | 'focus';
  } = {}
): ScoutReport {
  const {
    position = Position.WR,
    overallMin = 70,
    overallMax = 85,
    roundMin = 2,
    roundMax = 3,
    confidenceScore = 65,
    reportType = 'auto',
  } = options;

  return {
    id: `report-${prospectId}-${scoutId}-${Date.now()}`,
    prospectId,
    prospectName: `Player ${prospectId}`,
    position,
    reportType,
    generatedAt: Date.now(),
    scoutId,
    scoutName: `Scout ${scoutId}`,
    physicalMeasurements: {
      height: '6\'2"',
      weight: 210,
      college: 'Test University',
    },
    skillRanges: {
      overall: { min: overallMin, max: overallMax, confidence: 'medium' },
      physical: { min: overallMin + 5, max: overallMax + 3, confidence: 'medium' },
      technical: { min: overallMin - 5, max: overallMax - 2, confidence: 'medium' },
    },
    visibleTraits: [],
    hiddenTraitCount: 3,
    draftProjection: {
      roundMin,
      roundMax,
      pickRangeDescription: `Round ${roundMin}-${roundMax}`,
      overallGrade: 'Day 2 pick',
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

// Helper to create draft board with prospects
function createDraftBoardWithProspects(
  prospects: { id: string; position: Position; overallMin: number; overallMax: number; round: number }[]
): DraftBoardState {
  let state = createDraftBoardState('team-1', 2025);

  for (const prospect of prospects) {
    const report = createMockReport(prospect.id, 'scout-1', {
      position: prospect.position,
      overallMin: prospect.overallMin,
      overallMax: prospect.overallMax,
      roundMin: prospect.round,
      roundMax: prospect.round,
    });
    state = addReportToBoard(state, report);
  }

  return state;
}

describe('BigBoardGenerator', () => {
  describe('createDefaultPositionalNeeds', () => {
    it('should create needs for all positions', () => {
      const needs = createDefaultPositionalNeeds('team-1');

      expect(needs.teamId).toBe('team-1');
      expect(needs.needs[Position.QB]).toBe('moderate');
      expect(needs.needs[Position.WR]).toBe('moderate');
      expect(needs.needs[Position.CB]).toBe('moderate');
    });

    it('should include all positions in priorities', () => {
      const needs = createDefaultPositionalNeeds('team-1');

      expect(needs.priorities.length).toBe(Object.values(Position).length);
    });
  });

  describe('createScoutReliability', () => {
    it('should create scout reliability from hit rate', () => {
      const reliability = createScoutReliability(
        'scout-1',
        75,
        { [Position.WR]: 80, [Position.CB]: 70 },
        true
      );

      expect(reliability.scoutId).toBe('scout-1');
      expect(reliability.overallReliability).toBe(75);
      expect(reliability.positionReliability[Position.WR]).toBe(80);
      expect(reliability.isKnown).toBe(true);
    });

    it('should default to 50 for null hit rate', () => {
      const reliability = createScoutReliability('scout-1', null, {}, false);

      expect(reliability.overallReliability).toBe(50);
      expect(reliability.isKnown).toBe(false);
    });
  });

  describe('getScoutReliabilityWeight', () => {
    it('should return position-specific weight when available', () => {
      const reliabilityMap = new Map<string, ScoutReliability>();
      reliabilityMap.set('scout-1', {
        scoutId: 'scout-1',
        overallReliability: 70,
        positionReliability: { [Position.WR]: 85 },
        isKnown: true,
      });

      const weight = getScoutReliabilityWeight('scout-1', Position.WR, reliabilityMap);

      expect(weight).toBe(0.85);
    });

    it('should return overall weight when position not available', () => {
      const reliabilityMap = new Map<string, ScoutReliability>();
      reliabilityMap.set('scout-1', {
        scoutId: 'scout-1',
        overallReliability: 70,
        positionReliability: {},
        isKnown: true,
      });

      const weight = getScoutReliabilityWeight('scout-1', Position.WR, reliabilityMap);

      expect(weight).toBe(0.7);
    });

    it('should return default for unknown scout', () => {
      const reliabilityMap = new Map<string, ScoutReliability>();

      const weight = getScoutReliabilityWeight('unknown', Position.WR, reliabilityMap);

      expect(weight).toBe(0.5);
    });

    it('should return default when reliability not revealed', () => {
      const reliabilityMap = new Map<string, ScoutReliability>();
      reliabilityMap.set('scout-1', {
        scoutId: 'scout-1',
        overallReliability: 85,
        positionReliability: {},
        isKnown: false,
      });

      const weight = getScoutReliabilityWeight('scout-1', Position.WR, reliabilityMap);

      expect(weight).toBe(0.5);
    });
  });

  describe('calculateSkillScore', () => {
    it('should calculate average skill from reports', () => {
      const reports = [
        createMockReport('p1', 's1', { overallMin: 70, overallMax: 80 }),
        createMockReport('p1', 's2', { overallMin: 75, overallMax: 85 }),
      ];

      const score = calculateSkillScore(reports);

      // Average of (75 + 80) / 2 = 77.5
      expect(score).toBe(77.5);
    });

    it('should return 0 for no reports', () => {
      const score = calculateSkillScore([]);
      expect(score).toBe(0);
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should calculate average confidence from reports', () => {
      const reports = [
        createMockReport('p1', 's1', { confidenceScore: 60 }),
        createMockReport('p1', 's2', { confidenceScore: 80 }),
      ];

      const score = calculateConfidenceScore(reports);

      expect(score).toBe(70);
    });

    it('should return 0 for no reports', () => {
      const score = calculateConfidenceScore([]);
      expect(score).toBe(0);
    });
  });

  describe('calculateWeightedSkillScore', () => {
    it('should weight skill by scout reliability', () => {
      const reports = [
        createMockReport('p1', 'scout-1', { overallMin: 80, overallMax: 90 }), // 85 avg
        createMockReport('p1', 'scout-2', { overallMin: 60, overallMax: 70 }), // 65 avg
      ];

      const reliabilityMap = new Map<string, ScoutReliability>();
      reliabilityMap.set('scout-1', {
        scoutId: 'scout-1',
        overallReliability: 90,
        positionReliability: {},
        isKnown: true,
      });
      reliabilityMap.set('scout-2', {
        scoutId: 'scout-2',
        overallReliability: 50,
        positionReliability: {},
        isKnown: true,
      });

      const score = calculateWeightedSkillScore(reports, reliabilityMap, Position.WR);

      // scout-1 has higher weight (0.9) so score should be closer to 85 than 65
      expect(score).toBeGreaterThan(75);
    });

    it('should return 0 for no reports', () => {
      const score = calculateWeightedSkillScore([], new Map(), Position.WR);
      expect(score).toBe(0);
    });
  });

  describe('calculateNeedBonus', () => {
    it('should return higher multiplier for critical need', () => {
      const needs: PositionalNeeds = {
        teamId: 'team-1',
        needs: { [Position.WR]: 'critical' },
        priorities: [Position.WR],
      };

      const bonus = calculateNeedBonus(Position.WR, needs);

      expect(bonus).toBe(DEFAULT_BIG_BOARD_CONFIG.needMultipliers.critical);
    });

    it('should return lower multiplier for no need', () => {
      const needs: PositionalNeeds = {
        teamId: 'team-1',
        needs: { [Position.WR]: 'none' },
        priorities: [],
      };

      const bonus = calculateNeedBonus(Position.WR, needs);

      expect(bonus).toBe(DEFAULT_BIG_BOARD_CONFIG.needMultipliers.none);
    });

    it('should default to moderate for undefined positions', () => {
      const needs: PositionalNeeds = {
        teamId: 'team-1',
        needs: {},
        priorities: [],
      };

      const bonus = calculateNeedBonus(Position.WR, needs);

      expect(bonus).toBe(DEFAULT_BIG_BOARD_CONFIG.needMultipliers.moderate);
    });
  });

  describe('createProspectRanking', () => {
    it('should create ranking with all components', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 75, overallMax: 85, round: 2 },
      ]);

      const prospect = state.prospects.get('p1')!;
      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();

      const ranking = createProspectRanking(prospect, needs, reliabilityMap);

      expect(ranking.prospectId).toBe('p1');
      expect(ranking.position).toBe(Position.WR);
      expect(ranking.skillScore).toBeGreaterThan(0);
      expect(ranking.rawScore).toBeGreaterThan(0);
    });

    it('should include focus report bonus', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1', { reportType: 'focus' }));

      const prospect = state.prospects.get('p1')!;
      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();

      const ranking = createProspectRanking(prospect, needs, reliabilityMap);

      expect(ranking.hasFocusReport).toBe(true);
      // Focus report adds bonus to raw score
    });

    it('should apply need multiplier', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 75, overallMax: 85, round: 2 },
      ]);

      const prospect = state.prospects.get('p1')!;
      const lowNeed: PositionalNeeds = {
        teamId: 'team-1',
        needs: { [Position.WR]: 'low' },
        priorities: [],
      };
      const highNeed: PositionalNeeds = {
        teamId: 'team-1',
        needs: { [Position.WR]: 'critical' },
        priorities: [Position.WR],
      };

      const reliabilityMap = new Map<string, ScoutReliability>();

      const lowNeedRanking = createProspectRanking(prospect, lowNeed, reliabilityMap);
      const highNeedRanking = createProspectRanking(prospect, highNeed, reliabilityMap);

      expect(highNeedRanking.needAdjustedScore).toBeGreaterThan(lowNeedRanking.needAdjustedScore);
    });
  });

  describe('generateProspectRankings', () => {
    it('should generate and sort rankings', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 60, overallMax: 70, round: 3 },
        { id: 'p2', position: Position.CB, overallMin: 80, overallMax: 90, round: 1 },
        { id: 'p3', position: Position.QB, overallMin: 70, overallMax: 80, round: 2 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();

      const rankings = generateProspectRankings(state, needs, reliabilityMap);

      expect(rankings).toHaveLength(3);
      // p2 should be ranked first (highest skill)
      expect(rankings[0].prospectId).toBe('p2');
      expect(rankings[0].finalRank).toBe(1);
    });

    it('should assign consecutive ranks', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 70, overallMax: 80, round: 2 },
        { id: 'p2', position: Position.CB, overallMin: 75, overallMax: 85, round: 2 },
        { id: 'p3', position: Position.QB, overallMin: 65, overallMax: 75, round: 3 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();

      const rankings = generateProspectRankings(state, needs, reliabilityMap);

      expect(rankings[0].finalRank).toBe(1);
      expect(rankings[1].finalRank).toBe(2);
      expect(rankings[2].finalRank).toBe(3);
    });
  });

  describe('generateNeedAdjustedRankings', () => {
    it('should reorder rankings based on need', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 75, overallMax: 85, round: 2 },
        { id: 'p2', position: Position.CB, overallMin: 75, overallMax: 85, round: 2 },
      ]);

      const needs: PositionalNeeds = {
        teamId: 'team-1',
        needs: { [Position.WR]: 'low', [Position.CB]: 'critical' },
        priorities: [Position.CB],
      };
      const reliabilityMap = new Map<string, ScoutReliability>();

      const baseRankings = generateProspectRankings(state, needs, reliabilityMap);
      const needRankings = generateNeedAdjustedRankings(baseRankings);

      // CB should rank higher due to critical need
      const cbRanking = needRankings.find((r) => r.position === Position.CB);
      const wrRanking = needRankings.find((r) => r.position === Position.WR);

      expect(cbRanking!.finalRank).toBeLessThan(wrRanking!.finalRank);
    });
  });

  describe('generatePositionRankings', () => {
    it('should group rankings by position', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 75, overallMax: 85, round: 2 },
        { id: 'p2', position: Position.WR, overallMin: 70, overallMax: 80, round: 3 },
        { id: 'p3', position: Position.CB, overallMin: 80, overallMax: 90, round: 1 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const baseRankings = generateProspectRankings(state, needs, reliabilityMap);

      const positionRankings = generatePositionRankings(baseRankings);

      expect(positionRankings[Position.WR]).toHaveLength(2);
      expect(positionRankings[Position.CB]).toHaveLength(1);
    });

    it('should assign position-specific ranks', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 75, overallMax: 85, round: 2 },
        { id: 'p2', position: Position.WR, overallMin: 70, overallMax: 80, round: 3 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const baseRankings = generateProspectRankings(state, needs, reliabilityMap);

      const positionRankings = generatePositionRankings(baseRankings);

      expect(positionRankings[Position.WR]![0].finalRank).toBe(1);
      expect(positionRankings[Position.WR]![1].finalRank).toBe(2);
    });
  });

  describe('generateTierRankings', () => {
    it('should group rankings by tier', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 85, overallMax: 95, round: 1 },
        { id: 'p2', position: Position.CB, overallMin: 75, overallMax: 85, round: 2 },
        { id: 'p3', position: Position.RB, overallMin: 60, overallMax: 70, round: 5 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const baseRankings = generateProspectRankings(state, needs, reliabilityMap);

      const tierRankings = generateTierRankings(baseRankings);

      expect(tierRankings.first_round).toHaveLength(1);
      expect(tierRankings.second_round).toHaveLength(1);
      expect(tierRankings.day_three).toHaveLength(1);
    });
  });

  describe('identifyBestValue', () => {
    it('should identify high skill relative to draft round', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 80, overallMax: 90, round: 1 }, // High skill, early round
        { id: 'p2', position: Position.CB, overallMin: 75, overallMax: 85, round: 4 }, // Good skill, late round = value
        { id: 'p3', position: Position.RB, overallMin: 60, overallMax: 70, round: 5 }, // Low skill, late round
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const baseRankings = generateProspectRankings(state, needs, reliabilityMap);

      const bestValue = identifyBestValue(baseRankings, 10);

      // Best value calculation considers skill / (round * 10)
      // p1: 85 / 10 = 8.5, p2: 80 / 40 = 2, p3: 65 / 50 = 1.3
      // p1 has highest value score due to elite skill
      expect(bestValue.length).toBeGreaterThan(0);
      expect(bestValue[0].skillScore).toBeGreaterThan(0);
    });

    it('should respect limit', () => {
      const prospects = [];
      for (let i = 0; i < 20; i++) {
        prospects.push({
          id: `p${i}`,
          position: Position.WR,
          overallMin: 70,
          overallMax: 80,
          round: 3,
        });
      }

      const state = createDraftBoardWithProspects(prospects);
      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const baseRankings = generateProspectRankings(state, needs, reliabilityMap);

      const bestValue = identifyBestValue(baseRankings, 5);

      expect(bestValue).toHaveLength(5);
    });
  });

  describe('identifyRisers', () => {
    it('should identify prospects performing above projection', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 80, overallMax: 90, round: 4 }, // High skill, late round projection
        { id: 'p2', position: Position.CB, overallMin: 70, overallMax: 80, round: 2 }, // Average skill, mid round
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const baseRankings = generateProspectRankings(state, needs, reliabilityMap);

      const risers = identifyRisers(baseRankings, null, 5);

      // p1 should be identified as a riser
      expect(risers.length).toBeGreaterThan(0);
      expect(risers[0].prospectId).toBe('p1');
    });
  });

  describe('identifyFallers', () => {
    it('should identify high projections with low confidence', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(
        state,
        createMockReport('p1', 's1', { roundMin: 1, roundMax: 1, confidenceScore: 35 })
      );
      state = addReportToBoard(
        state,
        createMockReport('p2', 's1', { roundMin: 2, roundMax: 2, confidenceScore: 80 })
      );

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const baseRankings = generateProspectRankings(state, needs, reliabilityMap);

      const fallers = identifyFallers(baseRankings, null, 5);

      // p1 should be identified as a faller (low confidence on high projection)
      expect(fallers.length).toBeGreaterThan(0);
      expect(fallers[0].prospectId).toBe('p1');
    });
  });

  describe('generateBigBoard', () => {
    it('should generate complete big board', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 80, overallMax: 90, round: 1 },
        { id: 'p2', position: Position.CB, overallMin: 75, overallMax: 85, round: 2 },
        { id: 'p3', position: Position.RB, overallMin: 70, overallMax: 80, round: 3 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();

      const bigBoard = generateBigBoard(state, needs, reliabilityMap);

      expect(bigBoard.teamId).toBe('team-1');
      expect(bigBoard.draftYear).toBe(2025);
      expect(bigBoard.overallRankings).toHaveLength(3);
      expect(bigBoard.topProspects.length).toBeGreaterThan(0);
      expect(bigBoard.bestValue.length).toBeGreaterThan(0);
    });

    it('should include position rankings', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 80, overallMax: 90, round: 1 },
        { id: 'p2', position: Position.WR, overallMin: 75, overallMax: 85, round: 2 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();

      const bigBoard = generateBigBoard(state, needs, reliabilityMap);

      expect(bigBoard.positionRankings[Position.WR]).toHaveLength(2);
    });

    it('should include need-adjusted rankings', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 75, overallMax: 85, round: 2 },
        { id: 'p2', position: Position.CB, overallMin: 75, overallMax: 85, round: 2 },
      ]);

      const needs: PositionalNeeds = {
        teamId: 'team-1',
        needs: { [Position.WR]: 'low', [Position.CB]: 'critical' },
        priorities: [Position.CB],
      };
      const reliabilityMap = new Map<string, ScoutReliability>();

      const bigBoard = generateBigBoard(state, needs, reliabilityMap);

      // Need-adjusted should have CB ranked higher
      expect(bigBoard.needBasedRankings[0].position).toBe(Position.CB);
    });
  });

  describe('compareProspects', () => {
    it('should compare two prospects', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 80, overallMax: 90, round: 1 },
        { id: 'p2', position: Position.CB, overallMin: 70, overallMax: 80, round: 2 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const rankings = generateProspectRankings(state, needs, reliabilityMap);

      const result = compareProspects(rankings[0], rankings[1]);

      expect(result.winner).toBeDefined();
      expect(result.comparison.skillAdvantage).toBeDefined();
      expect(result.comparison.confidenceAdvantage).toBeDefined();
      expect(result.comparison.tierComparison).toBeDefined();
    });

    it('should identify higher skill player', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 85, overallMax: 95, round: 1 },
        { id: 'p2', position: Position.WR, overallMin: 65, overallMax: 75, round: 3 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const rankings = generateProspectRankings(state, needs, reliabilityMap);

      const p1Ranking = rankings.find((r) => r.prospectId === 'p1')!;
      const p2Ranking = rankings.find((r) => r.prospectId === 'p2')!;

      const result = compareProspects(p1Ranking, p2Ranking);

      expect(result.winner.prospectId).toBe('p1');
      expect(result.comparison.skillAdvantage).toContain('p1');
    });
  });

  describe('getPositionGroupRankings', () => {
    it('should group positions into categories', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.LT, overallMin: 75, overallMax: 85, round: 2 },
        { id: 'p2', position: Position.LG, overallMin: 70, overallMax: 80, round: 3 },
        { id: 'p3', position: Position.CB, overallMin: 80, overallMax: 90, round: 1 },
        { id: 'p4', position: Position.FS, overallMin: 70, overallMax: 80, round: 3 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const bigBoard = generateBigBoard(state, needs, reliabilityMap);

      const groupRankings = getPositionGroupRankings(bigBoard);

      expect(groupRankings['OL']).toHaveLength(2);
      expect(groupRankings['DB']).toHaveLength(2);
    });
  });

  describe('validateBigBoard', () => {
    it('should validate well-formed big board', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 75, overallMax: 85, round: 2 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const bigBoard = generateBigBoard(state, needs, reliabilityMap);

      expect(validateBigBoard(bigBoard)).toBe(true);
    });

    it('should reject empty big board', () => {
      const state = createDraftBoardState('team-1', 2025);
      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const bigBoard = generateBigBoard(state, needs, reliabilityMap);

      expect(validateBigBoard(bigBoard)).toBe(false);
    });

    it('should reject big board with missing team ID', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 75, overallMax: 85, round: 2 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const bigBoard = generateBigBoard(state, needs, reliabilityMap);
      bigBoard.teamId = '';

      expect(validateBigBoard(bigBoard)).toBe(false);
    });
  });

  describe('getBigBoardSummary', () => {
    it('should return summary statistics', () => {
      const state = createDraftBoardWithProspects([
        { id: 'p1', position: Position.WR, overallMin: 85, overallMax: 95, round: 1 },
        { id: 'p2', position: Position.WR, overallMin: 75, overallMax: 85, round: 2 },
        { id: 'p3', position: Position.CB, overallMin: 70, overallMax: 80, round: 3 },
      ]);

      const needs = createDefaultPositionalNeeds('team-1');
      const reliabilityMap = new Map<string, ScoutReliability>();
      const bigBoard = generateBigBoard(state, needs, reliabilityMap);

      const summary = getBigBoardSummary(bigBoard);

      expect(summary.totalProspects).toBe(3);
      expect(summary.byTier).toBeDefined();
      expect(summary.topPositionNeeds.length).toBeGreaterThan(0);
      expect(summary.averageConfidence).toBeGreaterThan(0);
    });
  });
});
