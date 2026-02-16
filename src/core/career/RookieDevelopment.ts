/**
 * Rookie Development System
 * Tracks first-year player development with personality-based modifiers
 */

export type DevelopmentTrack = 'starter' | 'rotational' | 'sit_and_develop';

export type FitLevel = 'perfect' | 'good' | 'neutral' | 'poor';

export interface RookieDevelopmentPlan {
  playerId: string;
  teamId: string;
  draftYear: number;
  draftRound: number;
  developmentTrack: DevelopmentTrack;
  seasonSnapsPlayed: number;
  seasonGamesPlayed: number;
  seasonGamesStarted: number;
  targetSnapPercentage: number;
  mentorId: string | null;
  mentorQuality: number; // 0-100
  mentorChemistry: number; // 0-100
  schemeFitAtDraft: FitLevel;
  developmentScore: number; // 0-100 running score
  confidenceMeter: number; // 0-100
  adjustmentLevel: number; // -20 to +20
  personalityProfile: RookiePersonalityProfile;
  firstYearOutcome: FirstYearOutcome | null;
}

export interface RookiePersonalityProfile {
  usageResponse: 'thrives_under_fire' | 'balanced' | 'needs_patience';
  learningSpeed: 'fast_learner' | 'steady' | 'slow_absorber';
  resilienceType: 'bounces_back' | 'neutral' | 'confidence_shaker';
  mentorAffinity: 'mentor_dependent' | 'independent' | 'mentor_enhanced';
}

export interface FirstYearOutcome {
  overallGrade:
    | 'exceeded_expectations'
    | 'met_expectations'
    | 'developing'
    | 'struggled'
    | 'bust_risk';
  developmentMultiplier: number; // 0.5 to 2.0
  ceilingAdjustment: number; // -5 to +5
  confidenceCarryover: number;
  narrativeDescription: string;
  keyFactors: string[];
}

/**
 * Maps hidden traits to a rookie personality profile.
 */
export function derivePersonalityFromTraits(
  positiveTraits: string[],
  negativeTraits: string[]
): RookiePersonalityProfile {
  // usageResponse
  let usageResponse: RookiePersonalityProfile['usageResponse'] = 'balanced';
  if (positiveTraits.includes('clutch') || positiveTraits.includes('coolUnderPressure')) {
    usageResponse = 'thrives_under_fire';
  } else if (negativeTraits.includes('chokes') || negativeTraits.includes('lazy')) {
    usageResponse = 'needs_patience';
  }

  // learningSpeed
  let learningSpeed: RookiePersonalityProfile['learningSpeed'] = 'steady';
  if (positiveTraits.includes('filmJunkie') || positiveTraits.includes('schemeVersatile')) {
    learningSpeed = 'fast_learner';
  } else if (negativeTraits.includes('lazy') || negativeTraits.includes('hotHead')) {
    learningSpeed = 'slow_absorber';
  }

  // resilienceType
  let resilienceType: RookiePersonalityProfile['resilienceType'] = 'neutral';
  if (positiveTraits.includes('coolUnderPressure')) {
    resilienceType = 'bounces_back';
  } else if (negativeTraits.includes('chokes')) {
    resilienceType = 'confidence_shaker';
  }

  // mentorAffinity
  let mentorAffinity: RookiePersonalityProfile['mentorAffinity'] = 'mentor_enhanced';
  if (positiveTraits.includes('teamFirst')) {
    mentorAffinity = 'mentor_dependent';
  } else if (negativeTraits.includes('diva') || negativeTraits.includes('hotHead')) {
    mentorAffinity = 'independent';
  }

  return { usageResponse, learningSpeed, resilienceType, mentorAffinity };
}

/**
 * Calculates mentor quality from experience, skill, and traits.
 * Result clamped to 0-100.
 */
export function calculateMentorQuality(
  experience: number,
  avgSkill: number,
  positiveTraits: string[],
  negativeTraits: string[]
): number {
  const expComponent = Math.min(experience, 50);
  const skillComponent = Math.min(avgSkill, 25);

  let traitBonus = 0;
  if (positiveTraits.includes('leader')) traitBonus += 15;
  if (positiveTraits.includes('filmJunkie')) traitBonus += 10;

  let traitPenalty = 0;
  if (negativeTraits.includes('diva')) traitPenalty += 10;
  if (negativeTraits.includes('lockerRoomCancer')) traitPenalty += 20;

  const result = expComponent + skillComponent + traitBonus - traitPenalty;
  return Math.max(0, Math.min(100, result));
}

/**
 * Calculates mentor chemistry between a rookie and a potential mentor.
 * Base 50, with trait-based modifiers.
 */
export function calculateMentorChemistry(
  rookieProfile: RookiePersonalityProfile,
  mentorPositiveTraits: string[],
  mentorNegativeTraits: string[]
): number {
  let chemistry = 50;

  if (mentorPositiveTraits.includes('leader') && rookieProfile.mentorAffinity === 'mentor_dependent') {
    chemistry += 15;
  }
  if (mentorPositiveTraits.includes('filmJunkie') && rookieProfile.learningSpeed === 'fast_learner') {
    chemistry += 10;
  }
  if (mentorPositiveTraits.includes('teamFirst')) {
    chemistry += 5;
  }
  if (mentorNegativeTraits.includes('diva')) {
    chemistry -= 10;
  }
  if (mentorNegativeTraits.includes('lockerRoomCancer')) {
    chemistry -= 15;
  }

  return Math.max(0, Math.min(100, chemistry));
}

/**
 * Determines development track from draft round.
 */
function getDefaultTrack(draftRound: number): DevelopmentTrack {
  if (draftRound <= 2) return 'starter';
  if (draftRound <= 4) return 'rotational';
  return 'sit_and_develop';
}

/**
 * Returns target snap percentage for a given track.
 */
function getTargetSnapPercentage(track: DevelopmentTrack): number {
  switch (track) {
    case 'starter':
      return 70;
    case 'rotational':
      return 40;
    case 'sit_and_develop':
      return 15;
  }
}

/**
 * Creates an initial rookie development plan with defaults.
 */
export function createRookieDevelopmentPlan(
  playerId: string,
  teamId: string,
  draftYear: number,
  draftRound: number,
  positiveTraits: string[],
  negativeTraits: string[],
  schemeFit: FitLevel,
  mentorId: string | null,
  mentorQuality: number,
  mentorChemistry: number
): RookieDevelopmentPlan {
  const personalityProfile = derivePersonalityFromTraits(positiveTraits, negativeTraits);
  const developmentTrack = getDefaultTrack(draftRound);

  return {
    playerId,
    teamId,
    draftYear,
    draftRound,
    developmentTrack,
    seasonSnapsPlayed: 0,
    seasonGamesPlayed: 0,
    seasonGamesStarted: 0,
    targetSnapPercentage: getTargetSnapPercentage(developmentTrack),
    mentorId,
    mentorQuality,
    mentorChemistry,
    schemeFitAtDraft: schemeFit,
    developmentScore: 50,
    confidenceMeter: 50,
    adjustmentLevel: 0,
    personalityProfile,
    firstYearOutcome: null,
  };
}

/**
 * Calculates the first-year outcome based on the final state of a development plan.
 */
export function calculateFirstYearOutcome(plan: RookieDevelopmentPlan): FirstYearOutcome {
  const { developmentScore, confidenceMeter, adjustmentLevel, personalityProfile } = plan;

  // Weighted combination for the development multiplier
  const normalizedDev = developmentScore / 100; // 0-1
  const normalizedConf = confidenceMeter / 100; // 0-1
  const normalizedAdj = (adjustmentLevel + 20) / 40; // map -20..+20 to 0..1

  // Personality alignment bonus: if fast learner, bounces back, thrives under fire
  let personalityBonus = 0;
  if (personalityProfile.learningSpeed === 'fast_learner') personalityBonus += 0.05;
  if (personalityProfile.resilienceType === 'bounces_back') personalityBonus += 0.05;
  if (personalityProfile.usageResponse === 'thrives_under_fire') personalityBonus += 0.05;

  // Weighted raw multiplier: dev score 50%, confidence 30%, adjustment 20%
  const rawMultiplier =
    normalizedDev * 0.5 + normalizedConf * 0.3 + normalizedAdj * 0.2 + personalityBonus;

  // Scale from 0-1 range to 0.5-2.0 range
  const developmentMultiplier = Math.max(0.5, Math.min(2.0, 0.5 + rawMultiplier * 1.5));

  // Ceiling adjustment
  let ceilingAdjustment: number;
  if (developmentMultiplier >= 1.5) {
    ceilingAdjustment = developmentMultiplier >= 1.75 ? 5 : 3;
  } else if (developmentMultiplier <= 0.7) {
    ceilingAdjustment = developmentMultiplier <= 0.6 ? -3 : -2;
  } else {
    ceilingAdjustment = 0;
  }

  // Overall grade
  let overallGrade: FirstYearOutcome['overallGrade'];
  if (developmentMultiplier >= 1.5) {
    overallGrade = 'exceeded_expectations';
  } else if (developmentMultiplier >= 1.1) {
    overallGrade = 'met_expectations';
  } else if (developmentMultiplier >= 0.8) {
    overallGrade = 'developing';
  } else if (developmentMultiplier >= 0.6) {
    overallGrade = 'struggled';
  } else {
    overallGrade = 'bust_risk';
  }

  // Confidence carryover
  const confidenceCarryover = Math.round(confidenceMeter * 0.7);

  // Narrative description
  const narrativeDescription = generateNarrative(overallGrade, plan);

  // Key factors
  const keyFactors = generateKeyFactors(plan);

  return {
    overallGrade,
    developmentMultiplier: Math.round(developmentMultiplier * 100) / 100,
    ceilingAdjustment,
    confidenceCarryover,
    narrativeDescription,
    keyFactors,
  };
}

function generateNarrative(
  grade: FirstYearOutcome['overallGrade'],
  plan: RookieDevelopmentPlan
): string {
  const round = plan.draftRound;
  const gamesStarted = plan.seasonGamesStarted;

  switch (grade) {
    case 'exceeded_expectations':
      return `A standout rookie campaign. Started ${gamesStarted} games and quickly established himself as a key contributor, exceeding all expectations for a Round ${round} pick.`;
    case 'met_expectations':
      return `A solid rookie season. Showed steady improvement throughout the year and met the development benchmarks set by the coaching staff.`;
    case 'developing':
      return `Flashed potential at times but remains a work in progress. The coaching staff sees growth but knows there is still a long way to go.`;
    case 'struggled':
      return `A difficult first year. Struggled to adjust to the pro game and will need significant improvement heading into year two.`;
    case 'bust_risk':
      return `A very concerning rookie campaign. Failed to show the traits that made him a Round ${round} pick, and questions are mounting about his future with the team.`;
  }
}

function generateKeyFactors(plan: RookieDevelopmentPlan): string[] {
  const factors: string[] = [];

  // Development score factor
  if (plan.developmentScore >= 70) {
    factors.push('Strong on-field development');
  } else if (plan.developmentScore <= 35) {
    factors.push('Slow on-field development');
  }

  // Confidence factor
  if (plan.confidenceMeter >= 70) {
    factors.push('High confidence and self-belief');
  } else if (plan.confidenceMeter <= 30) {
    factors.push('Confidence issues throughout the season');
  }

  // Mentor factor
  if (plan.mentorId && plan.mentorChemistry >= 70) {
    factors.push('Benefited from strong mentor relationship');
  } else if (plan.mentorId === null) {
    factors.push('Lacked veteran mentorship');
  }

  // Scheme fit factor
  if (plan.schemeFitAtDraft === 'perfect' || plan.schemeFitAtDraft === 'good') {
    factors.push('Good scheme fit accelerated development');
  } else if (plan.schemeFitAtDraft === 'poor') {
    factors.push('Poor scheme fit hindered adjustment');
  }

  // Usage factor
  if (plan.seasonGamesStarted >= 12) {
    factors.push('Heavy usage as a starter');
  } else if (plan.seasonGamesPlayed <= 5) {
    factors.push('Limited playing time');
  }

  // Return 2-3 most relevant factors
  return factors.slice(0, 3);
}
