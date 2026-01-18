/**
 * Pro Scouting System Tests
 */

import {
  getPlayerVisibility,
  calculateProScoutSkillRange,
  getVisibleProTraits,
  analyzePerformanceTrend,
  calculateTradeValue,
  generateProScoutingReport,
  compareProReports,
  identifyScoutingTargets,
  validateProScoutingReport,
  DEFAULT_PRO_SCOUTING_CONFIG,
  ProPlayerData,
  ProScoutingReport,
} from '../ProScoutingSystem';
import { createDefaultScout, Scout } from '../../models/staff/Scout';
import { Position } from '../../models/player/Position';

describe('ProScoutingSystem', () => {
  // Helper to create mock pro player
  function createMockProPlayer(overrides: Partial<ProPlayerData> = {}): ProPlayerData {
    return {
      id: 'player-1',
      name: 'John Smith',
      position: Position.QB,
      teamId: 'team-1',
      teamName: 'Test Team',
      age: 26,
      yearsInLeague: 4,
      status: 'starter',
      contract: {
        salary: 15_000_000,
        capHit: 18_000_000,
        yearsRemaining: 3,
        signingBonus: 10_000_000,
        deadCap: 12_000_000,
        isExpiring: false,
        hasFifthYearOption: false,
        hasNoTradeClause: false,
      },
      trueOverall: 85,
      truePhysical: 80,
      trueTechnical: 88,
      trueAwareness: 90,
      allTraits: ['Strong Arm', 'Quick Release', 'Pocket Awareness', 'Leader', 'Clutch'],
      recentPerformance: 87,
      seasonPerformance: 85,
      careerPerformance: 82,
      ...overrides,
    };
  }

  // Helper to create scout with specific evaluation
  function createScoutWithEvaluation(evaluation: number): Scout {
    const scout = createDefaultScout('scout-1', 'John', 'Doe', 'defensiveScout');
    return {
      ...scout,
      attributes: {
        ...scout.attributes,
        evaluation,
      },
    };
  }

  describe('getPlayerVisibility', () => {
    it('should return high for veteran starter', () => {
      const player = createMockProPlayer({ status: 'starter', yearsInLeague: 5 });
      expect(getPlayerVisibility(player)).toBe('high');
    });

    it('should return medium for first-year starter', () => {
      const player = createMockProPlayer({ status: 'starter', yearsInLeague: 1 });
      expect(getPlayerVisibility(player)).toBe('medium');
    });

    it('should return medium for rotational player', () => {
      const player = createMockProPlayer({ status: 'rotational' });
      expect(getPlayerVisibility(player)).toBe('medium');
    });

    it('should return low for backup with experience', () => {
      const player = createMockProPlayer({ status: 'backup', yearsInLeague: 2 });
      expect(getPlayerVisibility(player)).toBe('low');
    });

    it('should return minimal for practice squad player', () => {
      const player = createMockProPlayer({ status: 'practice_squad' });
      expect(getPlayerVisibility(player)).toBe('minimal');
    });

    it('should return minimal for injured player', () => {
      const player = createMockProPlayer({ status: 'injured' });
      expect(getPlayerVisibility(player)).toBe('minimal');
    });
  });

  describe('calculateProScoutSkillRange', () => {
    it('should create narrower ranges for high visibility', () => {
      const highVisRange = calculateProScoutSkillRange(85, 'high', 70);
      const lowVisRange = calculateProScoutSkillRange(85, 'low', 70);

      const highWidth = highVisRange.max - highVisRange.min;
      const lowWidth = lowVisRange.max - lowVisRange.min;

      expect(highWidth).toBeLessThan(lowWidth);
    });

    it('should be more accurate for skilled scouts', () => {
      const lowSkillRange = calculateProScoutSkillRange(85, 'medium', 30);
      const highSkillRange = calculateProScoutSkillRange(85, 'medium', 90);

      const lowWidth = lowSkillRange.max - lowSkillRange.min;
      const highWidth = highSkillRange.max - highSkillRange.min;

      expect(highWidth).toBeLessThan(lowWidth);
    });

    it('should clamp to valid bounds', () => {
      const lowRange = calculateProScoutSkillRange(5, 'minimal', 50);
      const highRange = calculateProScoutSkillRange(98, 'minimal', 50);

      expect(lowRange.min).toBeGreaterThanOrEqual(1);
      expect(highRange.max).toBeLessThanOrEqual(100);
    });

    it('should assign appropriate confidence', () => {
      const highVisHighSkill = calculateProScoutSkillRange(85, 'high', 80);
      const minimalVisLowSkill = calculateProScoutSkillRange(85, 'minimal', 30);

      expect(highVisHighSkill.confidence).toBe('high');
      expect(minimalVisLowSkill.confidence).toBe('low');
    });
  });

  describe('getVisibleProTraits', () => {
    it('should reveal more traits for high visibility', () => {
      const traits = ['Speed', 'Strength', 'Technique', 'Awareness', 'Leadership'];
      const { visible: highVis } = getVisibleProTraits(traits, 'high', 70);
      const { visible: lowVis } = getVisibleProTraits(traits, 'low', 70);

      expect(highVis.length).toBeGreaterThanOrEqual(lowVis.length);
    });

    it('should reveal more traits for skilled scouts', () => {
      const traits = ['Speed', 'Strength', 'Technique', 'Awareness', 'Leadership'];
      const { visible: lowSkill } = getVisibleProTraits(traits, 'medium', 30);
      const { visible: highSkill } = getVisibleProTraits(traits, 'medium', 90);

      expect(highSkill.length).toBeGreaterThanOrEqual(lowSkill.length);
    });

    it('should only reveal observable traits', () => {
      const traits = ['Speed Demon', 'High IQ', 'Good Hands', 'Natural Leader'];
      const { visible } = getVisibleProTraits(traits, 'high', 80);

      // Should only reveal traits with observable patterns
      for (const trait of visible) {
        const isObservable = ['speed', 'hands'].some((pattern) =>
          trait.toLowerCase().includes(pattern)
        );
        expect(isObservable).toBe(true);
      }
    });
  });

  describe('analyzePerformanceTrend', () => {
    it('should detect improving trend', () => {
      const player = createMockProPlayer({
        recentPerformance: 90,
        seasonPerformance: 85,
        careerPerformance: 78,
      });

      const trend = analyzePerformanceTrend(player);

      expect(trend.direction).toBe('improving');
      expect(trend.notes).toContain('Playing best football of career');
    });

    it('should detect declining trend', () => {
      const player = createMockProPlayer({
        recentPerformance: 70,
        seasonPerformance: 75,
        careerPerformance: 85,
      });

      const trend = analyzePerformanceTrend(player);

      expect(trend.direction).toBe('declining');
      expect(trend.notes).toContain('Performance has dropped off');
    });

    it('should detect stable trend', () => {
      const player = createMockProPlayer({
        recentPerformance: 82,
        seasonPerformance: 82,
        careerPerformance: 82,
      });

      const trend = analyzePerformanceTrend(player);

      expect(trend.direction).toBe('stable');
    });

    it('should assess recent games correctly', () => {
      const hotStreak = createMockProPlayer({
        trueOverall: 75,
        recentPerformance: 85,
      });

      const trend = analyzePerformanceTrend(hotStreak);

      expect(trend.recentGames).toBe('strong');
      expect(trend.notes).toContain('Hot streak in recent games');
    });

    it('should flag age-related concerns', () => {
      const veteranDecline = createMockProPlayer({
        age: 32,
        recentPerformance: 70,
        seasonPerformance: 72,
        careerPerformance: 85,
      });

      const trend = analyzePerformanceTrend(veteranDecline);

      expect(trend.notes).toContain('Age may be catching up');
    });
  });

  describe('calculateTradeValue', () => {
    it('should identify premium value player', () => {
      const elitePlayer = createMockProPlayer({
        age: 25,
      });
      const skillRange = { min: 85, max: 95, confidence: 'high' as const };

      const value = calculateTradeValue(elitePlayer, skillRange);

      expect(value.overallValue).toBe('premium');
      expect(value.ageConsideration).toBe('prime');
    });

    it('should account for age in value', () => {
      const youngPlayer = createMockProPlayer({ age: 24 });
      const oldPlayer = createMockProPlayer({ age: 32 });
      const skillRange = { min: 75, max: 85, confidence: 'high' as const };

      const youngValue = calculateTradeValue(youngPlayer, skillRange);
      const oldValue = calculateTradeValue(oldPlayer, skillRange);

      expect(youngValue.ageConsideration).toBe('entering_prime');
      expect(oldValue.ageConsideration).toBe('declining');
    });

    it('should assess contract impact', () => {
      const teamFriendly = createMockProPlayer({
        contract: {
          ...createMockProPlayer().contract,
          yearsRemaining: 4,
          capHit: 10_000_000,
        },
      });

      const skillRange = { min: 75, max: 85, confidence: 'high' as const };
      const value = calculateTradeValue(teamFriendly, skillRange);

      expect(value.contractImpact).toBe('positive');
      expect(value.notes).toContain('Team-friendly contract');
    });

    it('should flag no-trade clause', () => {
      const noTradePlayer = createMockProPlayer({
        contract: {
          ...createMockProPlayer().contract,
          hasNoTradeClause: true,
        },
      });

      const skillRange = { min: 85, max: 95, confidence: 'high' as const };
      const value = calculateTradeValue(noTradePlayer, skillRange);

      expect(value.tradeLikelihood).toBe('unlikely');
      expect(value.notes).toContain('Has no-trade clause');
    });

    it('should flag expiring contracts', () => {
      const expiringPlayer = createMockProPlayer({
        contract: {
          ...createMockProPlayer().contract,
          isExpiring: true,
        },
      });

      const skillRange = { min: 70, max: 80, confidence: 'medium' as const };
      const value = calculateTradeValue(expiringPlayer, skillRange);

      expect(value.tradeLikelihood).toBe('likely');
      expect(value.notes).toContain('Expiring contract - team may look to trade');
    });
  });

  describe('generateProScoutingReport', () => {
    it('should generate a valid report', () => {
      const player = createMockProPlayer();
      const scout = createScoutWithEvaluation(75);

      const report = generateProScoutingReport(player, scout, 202301);

      expect(report.playerId).toBe('player-1');
      expect(report.playerName).toBe('John Smith');
      expect(report.scoutId).toBe('scout-1');
      expect(validateProScoutingReport(report)).toBe(true);
    });

    it('should include contract information', () => {
      const player = createMockProPlayer();
      const scout = createScoutWithEvaluation(75);

      const report = generateProScoutingReport(player, scout, 202301);

      expect(report.contract).toEqual(player.contract);
    });

    it('should include performance trend', () => {
      const player = createMockProPlayer();
      const scout = createScoutWithEvaluation(75);

      const report = generateProScoutingReport(player, scout, 202301);

      expect(report.performanceTrend).toBeDefined();
      expect(['improving', 'stable', 'declining', 'unknown']).toContain(
        report.performanceTrend.direction
      );
    });

    it('should include trade value assessment', () => {
      const player = createMockProPlayer();
      const scout = createScoutWithEvaluation(75);

      const report = generateProScoutingReport(player, scout, 202301);

      expect(report.tradeValue).toBeDefined();
      expect(report.tradeValue.draftPickEquivalent).toBeDefined();
    });

    it('should assign report confidence', () => {
      const player = createMockProPlayer({ status: 'starter', yearsInLeague: 5 });
      const highSkillScout = createScoutWithEvaluation(85);
      const lowSkillScout = createScoutWithEvaluation(55); // Above 50 threshold for medium

      const highReport = generateProScoutingReport(player, highSkillScout, 202301);
      const lowReport = generateProScoutingReport(player, lowSkillScout, 202301);

      expect(highReport.reportConfidence).toBe('high');
      expect(lowReport.reportConfidence).toBe('medium');
    });
  });

  describe('compareProReports', () => {
    it('should compare two players for trade', () => {
      const player1 = createMockProPlayer({ id: 'p1', name: 'Player One', age: 25 });
      const player2 = createMockProPlayer({ id: 'p2', name: 'Player Two', age: 30 });
      const scout = createScoutWithEvaluation(75);

      const report1 = generateProScoutingReport(player1, scout, 202301);
      const report2 = generateProScoutingReport(player2, scout, 202301);

      const comparison = compareProReports(report1, report2);

      expect(['player1_better', 'player2_better', 'even']).toContain(comparison.comparison);
      expect(comparison.summary).toBeDefined();
    });

    it('should factor in contract value', () => {
      const goodContract = createMockProPlayer({
        id: 'p1',
        name: 'Good Contract',
        contract: {
          ...createMockProPlayer().contract,
          capHit: 5_000_000,
          yearsRemaining: 4,
        },
      });
      const badContract = createMockProPlayer({
        id: 'p2',
        name: 'Bad Contract',
        contract: {
          ...createMockProPlayer().contract,
          capHit: 30_000_000,
          deadCap: 20_000_000,
        },
      });
      const scout = createScoutWithEvaluation(75);

      const report1 = generateProScoutingReport(goodContract, scout, 202301);
      const report2 = generateProScoutingReport(badContract, scout, 202301);

      const comparison = compareProReports(report1, report2);

      // Good contract player should generally be valued higher
      expect(comparison.comparison).toBe('player1_better');
    });
  });

  describe('identifyScoutingTargets', () => {
    it('should filter by target positions', () => {
      const players = [
        createMockProPlayer({ id: 'qb1', position: Position.QB }),
        createMockProPlayer({ id: 'rb1', position: Position.RB }),
        createMockProPlayer({ id: 'wr1', position: Position.WR }),
      ];

      const targets = identifyScoutingTargets(players, [Position.QB, Position.WR]);

      expect(targets.map((t) => t.position)).not.toContain('RB');
      expect(targets.length).toBe(2);
    });

    it('should exclude practice squad players', () => {
      const players = [
        createMockProPlayer({ id: 'p1', status: 'starter' }),
        createMockProPlayer({ id: 'p2', status: 'practice_squad' }),
      ];

      const targets = identifyScoutingTargets(players, [Position.QB]);

      expect(targets.map((t) => t.id)).not.toContain('p2');
    });

    it('should exclude injured players', () => {
      const players = [
        createMockProPlayer({ id: 'p1', status: 'starter' }),
        createMockProPlayer({ id: 'p2', status: 'injured' }),
      ];

      const targets = identifyScoutingTargets(players, [Position.QB]);

      expect(targets.map((t) => t.id)).not.toContain('p2');
    });

    it('should exclude players over 32', () => {
      const players = [
        createMockProPlayer({ id: 'p1', age: 26 }),
        createMockProPlayer({ id: 'p2', age: 35 }),
      ];

      const targets = identifyScoutingTargets(players, [Position.QB]);

      expect(targets.map((t) => t.id)).not.toContain('p2');
    });

    it('should sort by estimated value', () => {
      const players = [
        createMockProPlayer({ id: 'low', trueOverall: 60, age: 30 }),
        createMockProPlayer({ id: 'high', trueOverall: 90, age: 24 }),
        createMockProPlayer({ id: 'mid', trueOverall: 75, age: 27 }),
      ];

      const targets = identifyScoutingTargets(players, [Position.QB]);

      expect(targets[0].id).toBe('high');
    });
  });

  describe('validateProScoutingReport', () => {
    it('should validate correct report', () => {
      const player = createMockProPlayer();
      const scout = createScoutWithEvaluation(75);
      const report = generateProScoutingReport(player, scout, 202301);

      expect(validateProScoutingReport(report)).toBe(true);
    });

    it('should reject report with missing fields', () => {
      const invalidReport = {
        playerId: '',
        playerName: 'Test',
        scoutId: 'scout-1',
      } as ProScoutingReport;

      expect(validateProScoutingReport(invalidReport)).toBe(false);
    });

    it('should reject report with invalid skill ranges', () => {
      const player = createMockProPlayer();
      const scout = createScoutWithEvaluation(75);
      const report = generateProScoutingReport(player, scout, 202301);

      const invalidReport: ProScoutingReport = {
        ...report,
        overallRange: { min: 150, max: 200, confidence: 'high' },
      };

      expect(validateProScoutingReport(invalidReport)).toBe(false);
    });

    it('should reject report with invalid age', () => {
      const player = createMockProPlayer();
      const scout = createScoutWithEvaluation(75);
      const report = generateProScoutingReport(player, scout, 202301);

      const invalidReport: ProScoutingReport = {
        ...report,
        age: 15, // Too young
      };

      expect(validateProScoutingReport(invalidReport)).toBe(false);
    });
  });

  describe('DEFAULT_PRO_SCOUTING_CONFIG', () => {
    it('should have appropriate range widths by visibility', () => {
      expect(DEFAULT_PRO_SCOUTING_CONFIG.highVisibilityRangeWidth).toBe(12);
      expect(DEFAULT_PRO_SCOUTING_CONFIG.mediumVisibilityRangeWidth).toBe(18);
      expect(DEFAULT_PRO_SCOUTING_CONFIG.lowVisibilityRangeWidth).toBe(25);
      expect(DEFAULT_PRO_SCOUTING_CONFIG.minimalVisibilityRangeWidth).toBe(35);
    });

    it('should have increasing widths as visibility decreases', () => {
      expect(DEFAULT_PRO_SCOUTING_CONFIG.highVisibilityRangeWidth).toBeLessThan(
        DEFAULT_PRO_SCOUTING_CONFIG.mediumVisibilityRangeWidth
      );
      expect(DEFAULT_PRO_SCOUTING_CONFIG.mediumVisibilityRangeWidth).toBeLessThan(
        DEFAULT_PRO_SCOUTING_CONFIG.lowVisibilityRangeWidth
      );
      expect(DEFAULT_PRO_SCOUTING_CONFIG.lowVisibilityRangeWidth).toBeLessThan(
        DEFAULT_PRO_SCOUTING_CONFIG.minimalVisibilityRangeWidth
      );
    });
  });
});
