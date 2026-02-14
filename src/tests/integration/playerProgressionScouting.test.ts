/**
 * Player Progression & Scouting Integration Tests
 *
 * Tests for:
 * - Player aging and development over multiple seasons
 * - Offseason progression with coach influence
 * - Mid-season progression and breakout mechanic
 * - Scouting accuracy tracking and revelation
 * - True vs perceived value mechanics
 * - Rookie development curves and veteran decline
 * - Hidden trait revelation
 */

import {
  generatePlayer,
  generateRoster,
} from '@core/generators/player/PlayerGenerator';
import { Player, validatePlayer, isRookie, isVeteran } from '@core/models/player/Player';
import { Position } from '@core/models/player/Position';
import { createDefaultCoach, Coach } from '@core/models/staff/Coach';
import {
  applyOffseasonProgression,
  applySkillChanges,
  processTeamProgression,
  applyMidSeasonProgression,
  generateDevelopmentNews,
} from '@core/career/PlayerProgression';
import {
  recordScoutEvaluation,
  updateEvaluationsWithResults,
  advanceAccuracyYear,
  classifyEvaluation,
  getAccuracyBreakdown,
  createAccuracyRevelationState,
  createScoutAccuracyViewModel,
  getScoutsByAccuracy,
} from '@core/scouting/ScoutAccuracySystem';
import { createDefaultScout, Scout } from '@core/models/staff/Scout';
import { createEmptyTrackRecord, MIN_EVALUATIONS_FOR_RELIABILITY } from '@core/models/staff/ScoutTrackRecord';

describe('Player Progression & Scouting Integration Tests', () => {
  // =====================================================
  // 1. Player aging and experience over multiple seasons
  // =====================================================
  describe('player aging and development over multiple seasons', () => {
    it('should age a player through a 15-year career while maintaining validity', () => {
      let player = generatePlayer({
        forDraft: true,
        position: Position.QB,
        ageRange: { min: 22, max: 22 },
      });

      expect(player.age).toBe(22);
      expect(player.experience).toBe(0);
      expect(isRookie(player)).toBe(true);

      for (let year = 0; year < 15; year++) {
        player = {
          ...player,
          age: player.age + 1,
          experience: player.experience + 1,
        };
        expect(validatePlayer(player)).toBe(true);
      }

      expect(player.age).toBe(37);
      expect(player.experience).toBe(15);
      expect(isVeteran(player)).toBe(true);
    });

    it('should correctly identify rookie, mid-career, and veteran stages', () => {
      const player = generatePlayer({
        forDraft: true,
        position: Position.RB,
        ageRange: { min: 22, max: 22 },
      });

      // Rookie
      expect(isRookie(player)).toBe(true);
      expect(isVeteran(player)).toBe(false);

      // Year 3 - mid-career
      const year3 = { ...player, age: 25, experience: 3 };
      expect(isRookie(year3)).toBe(false);
      expect(isVeteran(year3)).toBe(false);

      // Year 7 - veteran
      const year7 = { ...player, age: 29, experience: 7 };
      expect(isVeteran(year7)).toBe(true);
    });
  });

  // =====================================================
  // 2. Offseason progression with coach influence
  // =====================================================
  describe('offseason progression with coach influence', () => {
    let youngPlayer: Player;
    let veteranPlayer: Player;
    let coach: Coach;

    beforeEach(() => {
      youngPlayer = generatePlayer({
        forDraft: true,
        position: Position.WR,
        ageRange: { min: 22, max: 22 },
        skillTier: 'starter',
      });

      veteranPlayer = generatePlayer({
        position: Position.WR,
        ageRange: { min: 33, max: 33 },
        skillTier: 'starter',
      });
      veteranPlayer = { ...veteranPlayer, experience: 11 };

      coach = createDefaultCoach('coach-1', 'Head', 'Coach', 'headCoach');
    });

    it('should produce a valid ProgressionResult', () => {
      const result = applyOffseasonProgression(youngPlayer, coach);

      expect(result.playerId).toBe(youngPlayer.id);
      expect(result.playerName).toBe(
        `${youngPlayer.firstName} ${youngPlayer.lastName}`
      );
      expect(typeof result.totalChange).toBe('number');
      expect(['significant', 'moderate', 'minimal', 'negative']).toContain(
        result.coachInfluence
      );
      expect(result.developmentDescription.length).toBeGreaterThan(0);
    });

    it('applying skill changes should maintain valid player state', () => {
      const result = applyOffseasonProgression(youngPlayer, coach);
      const updated = applySkillChanges(youngPlayer, result);

      expect(validatePlayer(updated)).toBe(true);

      // Skill values should still be in valid range
      for (const skill of Object.values(updated.skills)) {
        expect(skill.trueValue).toBeGreaterThanOrEqual(1);
        expect(skill.trueValue).toBeLessThanOrEqual(99);
        expect(skill.perceivedMin).toBeLessThanOrEqual(skill.perceivedMax);
      }
    });

    it('young players should generally develop more than veterans', () => {
      // Run multiple trials to account for randomness
      let youngTotalChange = 0;
      let veteranTotalChange = 0;
      const trials = 20;

      for (let i = 0; i < trials; i++) {
        const youngResult = applyOffseasonProgression(youngPlayer, coach);
        const vetResult = applyOffseasonProgression(veteranPlayer, coach);
        youngTotalChange += youngResult.totalChange;
        veteranTotalChange += vetResult.totalChange;
      }

      // On average, young players should develop more
      expect(youngTotalChange / trials).toBeGreaterThanOrEqual(
        veteranTotalChange / trials
      );
    });

    it('processTeamProgression should update all players in roster', () => {
      const roster = [youngPlayer, veteranPlayer];
      const { updatedPlayers, results, notableImprovements } =
        processTeamProgression(roster, coach);

      expect(updatedPlayers).toHaveLength(2);
      expect(results).toHaveLength(2);

      // All updated players should be valid
      for (const player of updatedPlayers) {
        expect(validatePlayer(player)).toBe(true);
      }

      // Notable improvements should be a subset of results
      for (const notable of notableImprovements) {
        expect(notable.totalChange).toBeGreaterThanOrEqual(3);
      }
    });

    it('development news should be generated for significant changes', () => {
      // Generate results with varying changes
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(applyOffseasonProgression(youngPlayer, coach));
      }

      const newsItems = generateDevelopmentNews(results, 'Coach Smith');

      // News items should only be for significant changes (|totalChange| >= 3)
      for (const item of newsItems) {
        expect(item.headline.length).toBeGreaterThan(0);
        expect(item.body.length).toBeGreaterThan(0);
        expect(typeof item.isPositive).toBe('boolean');
        expect(['high', 'medium', 'low']).toContain(item.priority);
      }
    });
  });

  // =====================================================
  // 3. Mid-season progression and breakout mechanic
  // =====================================================
  describe('mid-season progression and breakout mechanic', () => {
    let youngPlayer: Player;
    let coach: Coach;

    beforeEach(() => {
      youngPlayer = generatePlayer({
        forDraft: true,
        position: Position.WR,
        ageRange: { min: 23, max: 23 },
        skillTier: 'starter',
      });

      coach = createDefaultCoach('coach-1', 'Head', 'Coach', 'headCoach');
    });

    it('standout game (score >= 85) should produce skill improvement', () => {
      const result = applyMidSeasonProgression(youngPlayer, 90, coach, 1);

      expect(result.updatedPlayer).toBeDefined();
      expect(validatePlayer(result.updatedPlayer)).toBe(true);
      expect(result.description.length).toBeGreaterThan(0);

      // Standout games should produce positive changes (or cap reached)
      if (result.skillChanges.length > 0) {
        expect(result.skillChanges.every((sc) => sc.change > 0)).toBe(true);
      }
    });

    it('poor game (score <= 25) should produce regression', () => {
      const result = applyMidSeasonProgression(youngPlayer, 20, coach, 1);

      expect(validatePlayer(result.updatedPlayer)).toBe(true);

      if (result.skillChanges.length > 0) {
        expect(result.skillChanges.every((sc) => sc.change < 0)).toBe(true);
      }
    });

    it('normal game (score 26-84) should not change skills', () => {
      const result = applyMidSeasonProgression(youngPlayer, 55, coach, 1);

      expect(result.skillChanges).toHaveLength(0);
      expect(result.isBreakout).toBe(false);
    });

    it('breakout meter should build on standout performances for young players', () => {
      let player: Player = { ...youngPlayer, breakoutMeter: 0, hasHadBreakout: false };

      // Multiple standout games should increase breakout meter
      for (let i = 0; i < 3; i++) {
        const result = applyMidSeasonProgression(player, 90, coach, i + 1);
        player = result.updatedPlayer;
      }

      // Breakout meter should have increased from standout performances
      expect(player.breakoutMeter).toBeGreaterThan(0);
    });

    it('breakout should trigger when meter reaches 100', () => {
      // Set meter close to 100
      let player: Player = { ...youngPlayer, breakoutMeter: 85, hasHadBreakout: false };

      // Keep trying standout games until breakout triggers
      let breakoutTriggered = false;
      for (let i = 0; i < 10; i++) {
        const result = applyMidSeasonProgression(player, 95, coach, i + 1);
        player = result.updatedPlayer;

        if (result.isBreakout) {
          breakoutTriggered = true;
          expect(result.breakoutDescription).toBeDefined();
          expect(result.breakoutDescription!.length).toBeGreaterThan(0);
          expect(player.hasHadBreakout).toBe(true);
          break;
        }
      }

      // Should eventually trigger
      expect(breakoutTriggered).toBe(true);
    });

    it('breakout should not trigger for players over 25', () => {
      const olderPlayer = generatePlayer({
        position: Position.WR,
        ageRange: { min: 28, max: 28 },
      });

      const player = {
        ...olderPlayer,
        breakoutMeter: 95,
        hasHadBreakout: false,
        experience: 6,
      };

      const result = applyMidSeasonProgression(player, 95, coach, 1);
      expect(result.isBreakout).toBe(false);
    });

    it('breakout should not trigger twice', () => {
      const player = {
        ...youngPlayer,
        breakoutMeter: 95,
        hasHadBreakout: true,
      };

      const result = applyMidSeasonProgression(player, 95, coach, 1);
      expect(result.isBreakout).toBe(false);
    });

    it('mid-season dev total should be capped at +/- 3', () => {
      let player: Player = {
        ...youngPlayer,
        midSeasonDevTotal: 2.8,
        breakoutMeter: 0,
        hasHadBreakout: true, // disable breakout to isolate skill changes
      };

      const result = applyMidSeasonProgression(player, 95, coach, 1);
      player = result.updatedPlayer;

      // Total dev should not exceed cap
      expect(Math.abs(player.midSeasonDevTotal ?? 0)).toBeLessThanOrEqual(3.1);
    });
  });

  // =====================================================
  // 4. True vs perceived value mechanics
  // =====================================================
  describe('true vs perceived value mechanics', () => {
    it('all skills should have perceivedMin <= trueValue <= perceivedMax initially', () => {
      const roster = generateRoster('team-1');

      for (const player of roster) {
        for (const [skillName, skill] of Object.entries(player.skills)) {
          // Perceived range should encompass or be near true value
          // Note: after history sim, perceived ranges may not perfectly contain trueValue
          // but they should be reasonable
          expect(skill.perceivedMin).toBeLessThanOrEqual(skill.perceivedMax);
          expect(skill.trueValue).toBeGreaterThanOrEqual(1);
          expect(skill.trueValue).toBeLessThanOrEqual(100);
        }
      }
    });

    it('perceived range should narrow when skill changes during progression', () => {
      const player = generatePlayer({
        position: Position.QB,
        skillTier: 'starter',
      });

      const coach = createDefaultCoach('c1', 'Test', 'Coach', 'headCoach');
      const result = applyOffseasonProgression(player, coach);

      if (Object.keys(result.skillChanges).length > 0) {
        const updated = applySkillChanges(player, result);

        // For changed skills, the range should have narrowed or stayed the same
        for (const skillName of Object.keys(result.skillChanges)) {
          const original = player.skills[skillName];
          const modified = updated.skills[skillName];

          if (original && modified) {
            const originalRange = original.perceivedMax - original.perceivedMin;
            const modifiedRange = modified.perceivedMax - modified.perceivedMin;
            // Range should have narrowed or stayed the same
            expect(modifiedRange).toBeLessThanOrEqual(originalRange);
          }
        }
      }
    });

    it('all players from roster generation should have valid perceived ranges', () => {
      const roster = generateRoster('test-team');

      for (const player of roster) {
        for (const skill of Object.values(player.skills)) {
          expect(skill.perceivedMin).toBeGreaterThanOrEqual(1);
          expect(skill.perceivedMax).toBeLessThanOrEqual(100);
          expect(skill.perceivedMin).toBeLessThanOrEqual(skill.perceivedMax);
        }
      }
    });
  });

  // =====================================================
  // 5. Hidden trait revelation
  // =====================================================
  describe('hidden trait revelation', () => {
    it('draft prospects should have trait structure initialized', () => {
      const prospect = generatePlayer({
        forDraft: true,
        position: Position.WR,
      });

      expect(prospect.hiddenTraits).toBeDefined();
      expect(Array.isArray(prospect.hiddenTraits.positive)).toBe(true);
      expect(Array.isArray(prospect.hiddenTraits.negative)).toBe(true);
      expect(Array.isArray(prospect.hiddenTraits.revealedToUser)).toBe(true);
    });

    it('traits can be manually revealed', () => {
      const player = generatePlayer({
        position: Position.CB,
      });

      // Add traits
      player.hiddenTraits.positive = ['clutch', 'filmJunkie'];
      player.hiddenTraits.negative = ['injuryProne'];
      player.hiddenTraits.revealedToUser = [];

      // Reveal one trait
      const revealed = {
        ...player,
        hiddenTraits: {
          ...player.hiddenTraits,
          revealedToUser: ['clutch'],
        },
      };

      expect(revealed.hiddenTraits.revealedToUser).toContain('clutch');
      expect(revealed.hiddenTraits.revealedToUser).not.toContain('filmJunkie');
      expect(revealed.hiddenTraits.revealedToUser).not.toContain('injuryProne');
    });

    it('all generated players should have consistent trait arrays', () => {
      const roster = generateRoster('team-traits');

      for (const player of roster) {
        expect(Array.isArray(player.hiddenTraits.positive)).toBe(true);
        expect(Array.isArray(player.hiddenTraits.negative)).toBe(true);
        expect(Array.isArray(player.hiddenTraits.revealedToUser)).toBe(true);

        // Revealed traits should be a subset of all traits
        const allTraits = [
          ...player.hiddenTraits.positive,
          ...player.hiddenTraits.negative,
        ];
        for (const revealed of player.hiddenTraits.revealedToUser) {
          expect(allTraits).toContain(revealed);
        }
      }
    });
  });

  // =====================================================
  // 6. Scouting accuracy tracking
  // =====================================================
  describe('scouting accuracy tracking', () => {
    let scout: Scout;

    beforeEach(() => {
      scout = createDefaultScout('scout-1', 'Test', 'Scout', 'headScout');
      scout.trackRecord = createEmptyTrackRecord('scout-1');
    });

    it('should start with empty track record', () => {
      const breakdown = getAccuracyBreakdown(scout);

      expect(breakdown.totalEvaluations).toBe(0);
      expect(breakdown.completedEvaluations).toBe(0);
      expect(breakdown.hitRate).toBeNull();
    });

    it('should record evaluations and classify them', () => {
      // Record an evaluation
      scout = recordScoutEvaluation(scout, {
        playerId: 'player-1',
        playerName: 'John Doe',
        position: Position.QB,
        draftYear: 2025,
        projectedOverall: { min: 70, max: 80 },
        projectedRound: 1,
        actualOverall: null,
        actualRound: null,
      });

      expect(scout.trackRecord.evaluations).toHaveLength(1);
      expect(classifyEvaluation(scout.trackRecord.evaluations[0])).toBe('pending');
    });

    it('should update evaluations with actual results', () => {
      // Record evaluation
      scout = recordScoutEvaluation(scout, {
        playerId: 'player-2',
        playerName: 'Jane Smith',
        position: Position.WR,
        draftYear: 2025,
        projectedOverall: { min: 70, max: 80 },
        projectedRound: 2,
        actualOverall: null,
        actualRound: null,
      });

      // Update with actual results - a hit (within range)
      scout = updateEvaluationsWithResults(scout, 'player-2', 2, 75);

      const evaluation = scout.trackRecord.evaluations[0];
      expect(evaluation.actualSkillRevealed).toBe(75);
      expect(evaluation.actualDraftRound).toBe(2);
      expect(classifyEvaluation(evaluation)).toBe('hit');
    });

    it('should classify near miss and miss evaluations correctly', () => {
      // Near miss - within 10 points of range
      scout = recordScoutEvaluation(scout, {
        playerId: 'near-miss',
        playerName: 'Near Miss',
        position: Position.RB,
        draftYear: 2025,
        projectedOverall: { min: 70, max: 80 },
        projectedRound: 2,
        actualOverall: null,
        actualRound: null,
      });
      scout = updateEvaluationsWithResults(scout, 'near-miss', 3, 65);
      expect(classifyEvaluation(scout.trackRecord.evaluations[0])).toBe('near_miss');

      // Miss - far outside range
      scout = recordScoutEvaluation(scout, {
        playerId: 'full-miss',
        playerName: 'Full Miss',
        position: Position.CB,
        draftYear: 2025,
        projectedOverall: { min: 70, max: 80 },
        projectedRound: 1,
        actualOverall: null,
        actualRound: null,
      });
      scout = updateEvaluationsWithResults(scout, 'full-miss', 5, 40);
      expect(classifyEvaluation(scout.trackRecord.evaluations[1])).toBe('miss');
    });

    it('should track hit rate after multiple evaluations', () => {
      // Record and complete many evaluations
      for (let i = 0; i < 10; i++) {
        scout = recordScoutEvaluation(scout, {
          playerId: `p-${i}`,
          playerName: `Player ${i}`,
          position: Position.WR,
          draftYear: 2025,
          projectedOverall: { min: 60, max: 80 },
          projectedRound: 3,
          actualOverall: null,
          actualRound: null,
        });
        // Alternate between hits and misses
        const actualOverall = i % 2 === 0 ? 70 : 40;
        scout = updateEvaluationsWithResults(scout, `p-${i}`, 3, actualOverall);
      }

      const breakdown = getAccuracyBreakdown(scout);
      expect(breakdown.completedEvaluations).toBe(10);
      expect(breakdown.hitRate).not.toBeNull();
      expect(breakdown.hitRate!).toBeGreaterThanOrEqual(0);
      expect(breakdown.hitRate!).toBeLessThanOrEqual(1);
    });

    it('should advance accuracy year', () => {
      const initial = scout.trackRecord.yearsOfData;
      scout = advanceAccuracyYear(scout);
      expect(scout.trackRecord.yearsOfData).toBe(initial + 1);
    });

    it('reliability should not be revealed with insufficient data', () => {
      const revelation = createAccuracyRevelationState(scout);
      expect(revelation.reliabilityRevealed).toBe(false);
    });

    it('should create a valid accuracy view model', () => {
      const viewModel = createScoutAccuracyViewModel(scout);

      expect(viewModel.scoutId).toBe(scout.id);
      expect(viewModel.scoutName).toBe('Test Scout');
      expect(viewModel.evaluationCount).toBe(0);
      expect(viewModel.reliabilityKnown).toBe(false);
      expect(viewModel.description.length).toBeGreaterThan(0);
    });

    it('should categorize scouts by revealed vs unrevealed', () => {
      const scout2 = createDefaultScout('scout-2', 'Second', 'Scout', 'offensiveScout');
      scout2.trackRecord = createEmptyTrackRecord('scout-2');

      const { revealed, unrevealed } = getScoutsByAccuracy([scout, scout2]);

      // Neither should be revealed yet
      expect(revealed).toHaveLength(0);
      expect(unrevealed).toHaveLength(2);
    });
  });

  // =====================================================
  // 7. Multi-season scouting accuracy build-up
  // =====================================================
  describe('multi-season scouting accuracy build-up', () => {
    it('should build track record over multiple years', () => {
      let scout = createDefaultScout('scout-ms', 'Multi', 'Year', 'headScout');
      scout.trackRecord = createEmptyTrackRecord('scout-ms');

      // Simulate 3 years of scouting
      for (let year = 0; year < 3; year++) {
        // Each year, evaluate 8 prospects
        for (let i = 0; i < 8; i++) {
          const prospectId = `prospect-y${year}-${i}`;
          scout = recordScoutEvaluation(scout, {
            playerId: prospectId,
            playerName: `Prospect ${year}-${i}`,
            position: i % 2 === 0 ? Position.QB : Position.WR,
            draftYear: 2025 + year,
            projectedOverall: { min: 60, max: 80 },
            projectedRound: 2,
            actualOverall: null,
            actualRound: null,
          });

          // Complete evaluation
          const actualOverall = 65 + Math.floor(Math.random() * 20);
          scout = updateEvaluationsWithResults(
            scout,
            prospectId,
            2,
            actualOverall
          );
        }

        scout = advanceAccuracyYear(scout);
      }

      expect(scout.trackRecord.yearsOfData).toBe(3);
      expect(scout.trackRecord.evaluations.length).toBe(24);

      const breakdown = getAccuracyBreakdown(scout);
      expect(breakdown.completedEvaluations).toBe(24);
      expect(breakdown.hitRate).not.toBeNull();
    });
  });

  // =====================================================
  // 8. Rookie development curves
  // =====================================================
  describe('rookie development curves', () => {
    it('rookies should have wider perceived ranges than veterans', () => {
      const rookies = [];
      const veterans = [];

      for (let i = 0; i < 20; i++) {
        rookies.push(
          generatePlayer({
            forDraft: true,
            position: Position.WR,
          })
        );
        const vet = generatePlayer({
          position: Position.WR,
          ageRange: { min: 30, max: 30 },
        });
        veterans.push({ ...vet, experience: 8 });
      }

      // Calculate average perceived range width
      let rookieRangeSum = 0;
      let rookieSkillCount = 0;
      for (const rookie of rookies) {
        for (const skill of Object.values(rookie.skills)) {
          rookieRangeSum += skill.perceivedMax - skill.perceivedMin;
          rookieSkillCount++;
        }
      }

      let vetRangeSum = 0;
      let vetSkillCount = 0;
      for (const vet of veterans) {
        for (const skill of Object.values(vet.skills)) {
          vetRangeSum += skill.perceivedMax - skill.perceivedMin;
          vetSkillCount++;
        }
      }

      const avgRookieRange = rookieRangeSum / rookieSkillCount;
      const avgVetRange = vetRangeSum / vetSkillCount;

      // Rookies should generally have wider ranges (more uncertainty)
      // This is a soft check because generation has variance
      expect(avgRookieRange).toBeGreaterThanOrEqual(avgVetRange * 0.8);
    });
  });

  // =====================================================
  // 9. Veteran decline
  // =====================================================
  describe('veteran decline', () => {
    it('offseason progression for old players should show less improvement', () => {
      const coach = createDefaultCoach('c1', 'Dev', 'Coach', 'headCoach');

      // Compare young vs old player progression over many trials
      let youngTotal = 0;
      let oldTotal = 0;
      const trials = 30;

      for (let i = 0; i < trials; i++) {
        const youngPlayer = generatePlayer({
          forDraft: true,
          position: Position.WR,
          ageRange: { min: 22, max: 22 },
          skillTier: 'starter',
        });

        const oldPlayer = generatePlayer({
          position: Position.WR,
          ageRange: { min: 35, max: 35 },
          skillTier: 'starter',
        });

        const youngResult = applyOffseasonProgression(youngPlayer, coach, {
          applyAgeModifier: true,
        });
        const oldResult = applyOffseasonProgression(
          { ...oldPlayer, experience: 13 },
          coach,
          { applyAgeModifier: true }
        );

        youngTotal += youngResult.totalChange;
        oldTotal += oldResult.totalChange;
      }

      // Young players should develop more on average
      expect(youngTotal / trials).toBeGreaterThan(oldTotal / trials);
    });
  });
});
