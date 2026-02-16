/**
 * Rookie Development Tracker
 * Updates rookie development plans game-by-game based on usage,
 * mentor presence, performance, and personality modifiers.
 *
 * All updates are immutable -- returns a new RookieDevelopmentPlan.
 */

import { RookieDevelopmentPlan } from './RookieDevelopment';

/**
 * Game statistics used to update a rookie's development plan.
 */
export interface RookieGameStats {
  snapsPlayed: number;
  totalTeamSnaps: number;
  started: boolean;
  performanceScore: number; // 0-100
}

/**
 * Clamp a number to a given range.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Updates a rookie development plan after a single game.
 *
 * Logic:
 * 1. Update snap/game counts
 * 2. Calculate actual snap% vs target snap%
 * 3. Usage fit modifier based on personality
 * 4. Mentor modifier
 * 5. Performance modifier
 * 6. Learning speed modifier
 * 7. Update adjustmentLevel based on confidence trend
 * 8. Clamp all values
 */
export function updateRookieAfterGame(
  plan: RookieDevelopmentPlan,
  gameStats: RookieGameStats,
  mentorPlayed: boolean
): RookieDevelopmentPlan {
  // 1. Update snap/game counts
  const seasonSnapsPlayed = plan.seasonSnapsPlayed + gameStats.snapsPlayed;
  const seasonGamesPlayed = plan.seasonGamesPlayed + 1;
  const seasonGamesStarted = plan.seasonGamesStarted + (gameStats.started ? 1 : 0);

  // Start with current values
  let developmentScore = plan.developmentScore;
  let confidenceMeter = plan.confidenceMeter;
  let adjustmentLevel = plan.adjustmentLevel;

  // 2. Actual snap% vs target snap%
  const actualSnapPercent =
    gameStats.totalTeamSnaps > 0 ? (gameStats.snapsPlayed / gameStats.totalTeamSnaps) * 100 : 0;
  const snapDifference = actualSnapPercent - plan.targetSnapPercentage;

  // 3. Usage fit modifier based on personality
  const { personalityProfile } = plan;
  if (
    personalityProfile.usageResponse === 'thrives_under_fire' &&
    actualSnapPercent > plan.targetSnapPercentage
  ) {
    developmentScore += 3;
  } else if (personalityProfile.usageResponse === 'needs_patience' && snapDifference >= 20) {
    developmentScore -= 2;
  }

  // 4. Mentor modifier
  if (mentorPlayed && plan.mentorChemistry > 60) {
    developmentScore += 1;
  }
  if (
    personalityProfile.mentorAffinity === 'mentor_dependent' &&
    plan.mentorId !== null &&
    !mentorPlayed
  ) {
    confidenceMeter -= 2;
  }

  // 5. Performance modifier
  if (gameStats.performanceScore > 70) {
    confidenceMeter += 2;
  } else if (gameStats.performanceScore < 40) {
    if (personalityProfile.resilienceType === 'bounces_back') {
      confidenceMeter -= 1;
    } else {
      confidenceMeter -= 3;
    }
  }

  // 6. Learning speed modifier
  if (personalityProfile.learningSpeed === 'fast_learner') {
    developmentScore += 1;
  } else if (
    personalityProfile.learningSpeed === 'slow_absorber' &&
    seasonGamesPlayed <= 4
  ) {
    developmentScore -= 1;
  }

  // 7. Update adjustmentLevel based on confidence trend
  // Positive confidence movement pushes adjustment up, negative pushes it down
  const confidenceDelta = confidenceMeter - plan.confidenceMeter;
  if (confidenceDelta > 0) {
    adjustmentLevel += 1;
  } else if (confidenceDelta < -1) {
    adjustmentLevel -= 1;
  }

  // 8. Clamp all values
  developmentScore = clamp(developmentScore, 0, 100);
  confidenceMeter = clamp(confidenceMeter, 0, 100);
  adjustmentLevel = clamp(adjustmentLevel, -20, 20);

  return {
    ...plan,
    seasonSnapsPlayed,
    seasonGamesPlayed,
    seasonGamesStarted,
    developmentScore,
    confidenceMeter,
    adjustmentLevel,
  };
}
