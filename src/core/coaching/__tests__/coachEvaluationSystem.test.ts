/**
 * Tests for Coach Evaluation System
 */

import {
  coachAffectsPlayer,
  calculateDevelopmentImpact,
  createDevelopmentImpactViewModel,
  calculateSchemeTeaching,
  createSchemeTeachingViewModel,
  calculatePlayerCoachChemistry,
  getGameDayCoachModifier,
  getMotivationModifier,
  evaluateCoachOverall,
  getCoachQualityTier,
  generateCoachEvaluationSummary,
  calculateCombinedStaffDevelopmentBonus,
} from '../CoachEvaluationSystem';
import { Coach, createDefaultCoach } from '../../models/staff/Coach';
import { Player } from '../../models/player/Player';
import { Position } from '../../models/player/Position';
import { createDefaultCoachingTree } from '../../models/staff/CoachingTree';
import { createDefaultPersonality } from '../../models/staff/CoachPersonality';
import { createDefaultAttributes, CoachAttributes } from '../../models/staff/CoachAttributes';
import { createDefaultSchemeFits } from '../../models/player/SchemeFit';

// Helper to create a test coach with specific attributes
function createTestCoach(
  id: string,
  role: Coach['role'],
  attributes?: Partial<CoachAttributes>
): Coach {
  const defaultAttrs = createDefaultAttributes();
  return {
    ...createDefaultCoach(id, 'Test', 'Coach', role),
    tree: createDefaultCoachingTree(),
    personality: createDefaultPersonality(),
    attributes: {
      ...defaultAttrs,
      ...attributes,
    },
    scheme: 'westCoast',
  };
}

// Helper to create a test player
function createTestPlayer(position: Position): Player {
  return {
    id: 'test-player-1',
    firstName: 'Test',
    lastName: 'Player',
    position,
    age: 25,
    experience: 3,
    physical: {
      height: 72,
      weight: 200,
      armLength: 32,
      handSize: 9.5,
      wingspan: 76,
      speed: 4.5,
      acceleration: 80,
      agility: 80,
      strength: 70,
      verticalJump: 35,
    },
    skills: {},
    hiddenTraits: {
      positive: [],
      negative: [],
      revealedToUser: [],
    },
    itFactor: {
      value: 50,
    },
    consistency: {
      tier: 'average',
      currentStreak: 'neutral',
      streakGamesRemaining: 0,
    },
    schemeFits: createDefaultSchemeFits(),
    roleFit: {
      ceiling: 'solidStarter',
      currentRole: 'solidStarter',
      roleEffectiveness: 75,
    },
    contractId: null,
    injuryStatus: {
      severity: 'none',
      type: 'none',
      weeksRemaining: 0,
      isPublic: true,
      lingeringEffect: 0,
    },
    fatigue: 0,
    morale: 75,
    collegeId: 'test-college',
    draftYear: 2020,
    draftRound: 2,
    draftPick: 45,
  };
}

describe('Coach Evaluation System', () => {
  describe('coachAffectsPlayer', () => {
    it('should return true for head coach affecting any player', () => {
      const coach = createTestCoach('coach-1', 'headCoach');
      const qb = createTestPlayer(Position.QB);
      const cb = createTestPlayer(Position.CB);

      expect(coachAffectsPlayer(coach, qb)).toBe(true);
      expect(coachAffectsPlayer(coach, cb)).toBe(true);
    });

    it('should return true for QB coach affecting QB', () => {
      const coach = createTestCoach('coach-1', 'qbCoach');
      const qb = createTestPlayer(Position.QB);

      expect(coachAffectsPlayer(coach, qb)).toBe(true);
    });

    it('should return false for QB coach affecting non-QB', () => {
      const coach = createTestCoach('coach-1', 'qbCoach');
      const wr = createTestPlayer(Position.WR);

      expect(coachAffectsPlayer(coach, wr)).toBe(false);
    });

    it('should return true for OL coach affecting all OL positions', () => {
      const coach = createTestCoach('coach-1', 'olCoach');

      expect(coachAffectsPlayer(coach, createTestPlayer(Position.LT))).toBe(true);
      expect(coachAffectsPlayer(coach, createTestPlayer(Position.LG))).toBe(true);
      expect(coachAffectsPlayer(coach, createTestPlayer(Position.C))).toBe(true);
      expect(coachAffectsPlayer(coach, createTestPlayer(Position.RG))).toBe(true);
      expect(coachAffectsPlayer(coach, createTestPlayer(Position.RT))).toBe(true);
    });

    it('should return true for DB coach affecting all DB positions', () => {
      const coach = createTestCoach('coach-1', 'dbCoach');

      expect(coachAffectsPlayer(coach, createTestPlayer(Position.CB))).toBe(true);
      expect(coachAffectsPlayer(coach, createTestPlayer(Position.FS))).toBe(true);
      expect(coachAffectsPlayer(coach, createTestPlayer(Position.SS))).toBe(true);
    });
  });

  describe('calculateDevelopmentImpact', () => {
    it('should return zero impact for non-affecting coach', () => {
      const coach = createTestCoach('coach-1', 'qbCoach');
      const wr = createTestPlayer(Position.WR);

      const impact = calculateDevelopmentImpact(coach, wr, 0, 'neutral');

      expect(impact.totalImpact).toBe(0);
      expect(impact.impactAreas).toEqual([]);
    });

    it('should calculate positive impact for high-development coach', () => {
      const coach = createTestCoach('coach-1', 'qbCoach', { development: 90 });
      const qb = createTestPlayer(Position.QB);

      const impact = calculateDevelopmentImpact(coach, qb, 5, 'good');

      expect(impact.totalImpact).toBeGreaterThan(0);
    });

    it('should include chemistry modifier in impact', () => {
      const coach = createTestCoach('coach-1', 'qbCoach', { development: 70 });
      const qb = createTestPlayer(Position.QB);

      const lowChemImpact = calculateDevelopmentImpact(coach, qb, -5, 'neutral');
      const highChemImpact = calculateDevelopmentImpact(coach, qb, 8, 'neutral');

      expect(highChemImpact.chemistryModifier).toBeGreaterThan(lowChemImpact.chemistryModifier);
    });

    it('should include scheme bonus for good fit', () => {
      const coach = createTestCoach('coach-1', 'qbCoach', { development: 70 });
      const qb = createTestPlayer(Position.QB);

      const goodFitImpact = calculateDevelopmentImpact(coach, qb, 0, 'perfect');
      const poorFitImpact = calculateDevelopmentImpact(coach, qb, 0, 'terrible');

      expect(goodFitImpact.schemeBonus).toBeGreaterThan(poorFitImpact.schemeBonus);
    });

    it('should reduce head coach impact by 50%', () => {
      const hc = createTestCoach('coach-1', 'headCoach', { development: 80 });
      const qbCoach = createTestCoach('coach-2', 'qbCoach', { development: 80 });
      const qb = createTestPlayer(Position.QB);

      const hcImpact = calculateDevelopmentImpact(hc, qb, 0, 'neutral');
      const qbCoachImpact = calculateDevelopmentImpact(qbCoach, qb, 0, 'neutral');

      expect(hcImpact.baseImpact).toBeLessThan(qbCoachImpact.baseImpact);
    });

    it('should return impact areas for position coaches', () => {
      const coach = createTestCoach('coach-1', 'qbCoach');
      const qb = createTestPlayer(Position.QB);

      const impact = calculateDevelopmentImpact(coach, qb, 0, 'neutral');

      expect(impact.impactAreas.length).toBeGreaterThan(0);
      expect(impact.impactAreas).toContain('accuracy');
    });
  });

  describe('createDevelopmentImpactViewModel', () => {
    it('should create qualitative view model', () => {
      const impact = {
        playerId: 'player-1',
        coachId: 'coach-1',
        baseImpact: 7,
        chemistryModifier: 2,
        schemeBonus: 1,
        totalImpact: 10,
        impactAreas: ['accuracy', 'decisionMaking'],
      };

      const viewModel = createDevelopmentImpactViewModel(impact, 'John Doe', 'Mike Smith');

      expect(viewModel.playerName).toBe('John Doe');
      expect(viewModel.coachName).toBe('Mike Smith');
      expect(['excellent', 'good', 'neutral', 'strained', 'poor']).toContain(
        viewModel.relationship
      );
      expect(viewModel.impactDescription).toBeDefined();
      expect(viewModel.developmentOutlook).toBeDefined();
    });
  });

  describe('calculateSchemeTeaching', () => {
    it('should calculate teaching effectiveness', () => {
      const coach = createTestCoach('coach-1', 'offensiveCoordinator', { schemeTeaching: 85 });
      coach.scheme = 'westCoast';

      const result = calculateSchemeTeaching(coach, 'westCoast');

      expect(result.teachingEffectiveness).toBeGreaterThan(85); // Bonus for own scheme
      expect(result.yearlySchemeProgress).toBeGreaterThan(0);
      expect(result.maxSchemeMastery).toBeGreaterThan(50);
    });

    it('should give bonus for coach running the scheme', () => {
      const coach = createTestCoach('coach-1', 'offensiveCoordinator', { schemeTeaching: 70 });
      coach.scheme = 'westCoast';

      const ownScheme = calculateSchemeTeaching(coach, 'westCoast');
      const otherScheme = calculateSchemeTeaching(coach, 'airRaid');

      expect(ownScheme.teachingEffectiveness).toBeGreaterThan(otherScheme.teachingEffectiveness);
    });
  });

  describe('createSchemeTeachingViewModel', () => {
    it('should create qualitative view model', () => {
      const result = {
        coachId: 'coach-1',
        scheme: 'westCoast' as const,
        teachingEffectiveness: 90,
        yearlySchemeProgress: 9,
        maxSchemeMastery: 95,
      };

      const viewModel = createSchemeTeachingViewModel(result, 'Mike Smith');

      expect(viewModel.coachName).toBe('Mike Smith');
      expect(viewModel.schemeName).toBe('West Coast Offense');
      expect(['elite', 'excellent', 'good', 'average', 'poor']).toContain(
        viewModel.teachingQuality
      );
      expect(viewModel.progressDescription).toBeDefined();
    });
  });

  describe('calculatePlayerCoachChemistry', () => {
    it('should calculate chemistry with all sources', () => {
      const coach = createTestCoach('coach-1', 'qbCoach', { development: 80 });
      const player = createTestPlayer(Position.QB);

      const chemistry = calculatePlayerCoachChemistry(coach, player, 'good', 2, true);

      expect(chemistry.playerId).toBe('test-player-1');
      expect(chemistry.coachId).toBe('coach-1');
      expect(chemistry.chemistry).toBeGreaterThanOrEqual(-10);
      expect(chemistry.chemistry).toBeLessThanOrEqual(10);
      expect(chemistry.sources.length).toBeGreaterThan(0);
    });

    it('should include tenure bonus', () => {
      const coach = createTestCoach('coach-1', 'qbCoach');
      const player = createTestPlayer(Position.QB);

      const noTenure = calculatePlayerCoachChemistry(coach, player, 'neutral', 0, false);
      const withTenure = calculatePlayerCoachChemistry(coach, player, 'neutral', 3, false);

      expect(withTenure.chemistry).toBeGreaterThan(noTenure.chemistry);
    });

    it('should include success bonus', () => {
      const coach = createTestCoach('coach-1', 'qbCoach');
      const player = createTestPlayer(Position.QB);

      const noSuccess = calculatePlayerCoachChemistry(coach, player, 'neutral', 0, false);
      const withSuccess = calculatePlayerCoachChemistry(coach, player, 'neutral', 0, true);

      expect(withSuccess.chemistry).toBeGreaterThan(noSuccess.chemistry);
    });
  });

  describe('getGameDayCoachModifier', () => {
    it('should return positive modifier for high gameDayIQ', () => {
      const coach = createTestCoach('coach-1', 'headCoach', { gameDayIQ: 95 });
      expect(getGameDayCoachModifier(coach)).toBe(0.1);
    });

    it('should return negative modifier for low gameDayIQ', () => {
      const coach = createTestCoach('coach-1', 'headCoach', { gameDayIQ: 30 });
      expect(getGameDayCoachModifier(coach)).toBe(-0.05);
    });

    it('should return 0 for average gameDayIQ', () => {
      const coach = createTestCoach('coach-1', 'headCoach', { gameDayIQ: 50 });
      expect(getGameDayCoachModifier(coach)).toBe(0);
    });
  });

  describe('getMotivationModifier', () => {
    it('should return higher multiplier for high motivation', () => {
      const coach = createTestCoach('coach-1', 'headCoach', { motivation: 100 });
      expect(getMotivationModifier(coach)).toBeCloseTo(1.2, 5);
    });

    it('should return lower multiplier for low motivation', () => {
      const coach = createTestCoach('coach-1', 'headCoach', { motivation: 0 });
      expect(getMotivationModifier(coach)).toBe(0.8);
    });

    it('should return 1.0 for middle motivation', () => {
      const coach = createTestCoach('coach-1', 'headCoach', { motivation: 50 });
      expect(getMotivationModifier(coach)).toBe(1.0);
    });
  });

  describe('evaluateCoachOverall', () => {
    it('should calculate weighted overall rating', () => {
      const coach = createTestCoach('coach-1', 'headCoach', {
        development: 80,
        gameDayIQ: 80,
        schemeTeaching: 80,
        playerEvaluation: 80,
        talentID: 80,
        motivation: 80,
      });

      const overall = evaluateCoachOverall(coach);

      expect(overall).toBe(80);
    });
  });

  describe('getCoachQualityTier', () => {
    it('should return elite for 90+', () => {
      expect(getCoachQualityTier(90)).toBe('elite');
      expect(getCoachQualityTier(100)).toBe('elite');
    });

    it('should return excellent for 80-89', () => {
      expect(getCoachQualityTier(80)).toBe('excellent');
      expect(getCoachQualityTier(89)).toBe('excellent');
    });

    it('should return good for 70-79', () => {
      expect(getCoachQualityTier(70)).toBe('good');
      expect(getCoachQualityTier(79)).toBe('good');
    });

    it('should return average for 55-69', () => {
      expect(getCoachQualityTier(55)).toBe('average');
      expect(getCoachQualityTier(69)).toBe('average');
    });

    it('should return below_average for 40-54', () => {
      expect(getCoachQualityTier(40)).toBe('below_average');
      expect(getCoachQualityTier(54)).toBe('below_average');
    });

    it('should return poor for <40', () => {
      expect(getCoachQualityTier(39)).toBe('poor');
      expect(getCoachQualityTier(0)).toBe('poor');
    });
  });

  describe('generateCoachEvaluationSummary', () => {
    it('should generate summary with strengths and weaknesses', () => {
      const coach = createTestCoach('coach-1', 'headCoach', {
        development: 85,
        gameDayIQ: 40,
        schemeTeaching: 75,
        playerEvaluation: 60,
        talentID: 60,
        motivation: 80,
      });

      const summary = generateCoachEvaluationSummary(coach);

      expect(summary.qualityTier).toBeDefined();
      expect(summary.strengths.length).toBeGreaterThan(0);
      expect(summary.weaknesses.length).toBeGreaterThan(0);
      expect(summary.developmentAbility).toBeDefined();
      expect(summary.gameDayAbility).toBeDefined();
    });

    it('should identify development as strength for high development', () => {
      const coach = createTestCoach('coach-1', 'headCoach', { development: 90 });

      const summary = generateCoachEvaluationSummary(coach);

      expect(summary.strengths).toContain('Player development');
    });
  });

  describe('calculateCombinedStaffDevelopmentBonus', () => {
    it('should calculate combined bonus from all coaches', () => {
      const positionCoach = createTestCoach('coach-1', 'qbCoach', { development: 80 });
      const coordinator = createTestCoach('coach-2', 'offensiveCoordinator', { development: 70 });
      const headCoach = createTestCoach('coach-3', 'headCoach', { development: 60 });

      const bonus = calculateCombinedStaffDevelopmentBonus(positionCoach, coordinator, headCoach);

      expect(bonus).toBeGreaterThan(0);
    });

    it('should handle null coaches', () => {
      const positionCoach = createTestCoach('coach-1', 'qbCoach', { development: 80 });

      const bonus = calculateCombinedStaffDevelopmentBonus(positionCoach, null, null);

      expect(bonus).toBeGreaterThan(0);
    });

    it('should weight position coach highest', () => {
      const highDevCoach = createTestCoach('coach-1', 'qbCoach', { development: 90 });
      const lowDevCoach = createTestCoach('coach-2', 'qbCoach', { development: 30 });

      const highAsPosition = calculateCombinedStaffDevelopmentBonus(
        highDevCoach,
        null,
        lowDevCoach
      );
      const highAsHC = calculateCombinedStaffDevelopmentBonus(lowDevCoach, null, highDevCoach);

      expect(highAsPosition).toBeGreaterThan(highAsHC);
    });
  });
});
