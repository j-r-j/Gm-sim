/**
 * Coach Scouting Report System
 * Adds uncertainty to coach evaluations at hire time.
 *
 * Like player scouting, coaches have "true" values that are hidden,
 * and "perceived" ranges that represent what scouts/owners think.
 * The uncertainty narrows based on experience and reputation.
 */

import { Coach } from '../models/staff/Coach';
import {
  CoachAttributes,
  ReputationTier,
  getReputationTier,
} from '../models/staff/CoachAttributes';

/**
 * A perceived attribute range (like player skills)
 */
export interface PerceivedAttributeRange {
  /** Lower bound of what scouts think */
  min: number;
  /** Upper bound of what scouts think */
  max: number;
  /** Confidence level in the assessment */
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Scouting report for a single coach attribute
 */
export interface AttributeScoutingReport {
  name: string;
  displayName: string;
  description: string;
  perceived: PerceivedAttributeRange;
  /** Qualitative assessment based on perceived range */
  assessment: string;
}

/**
 * Full scouting report for a coach
 */
export interface CoachScoutingReport {
  coachId: string;
  coachName: string;

  /** Perceived reputation range (not exact tier) */
  perceivedReputation: {
    likelyTier: ReputationTier;
    possibleTiers: ReputationTier[];
    confidence: 'low' | 'medium' | 'high';
    narrativeAssessment: string;
  };

  /** Individual attribute reports */
  attributes: {
    development: AttributeScoutingReport;
    gameDayIQ: AttributeScoutingReport;
    schemeTeaching: AttributeScoutingReport;
    playerEvaluation: AttributeScoutingReport;
    talentID: AttributeScoutingReport;
    motivation: AttributeScoutingReport;
  };

  /** Overall assessment narrative */
  overallAssessment: string;

  /** Potential upside narrative */
  upside: string;

  /** Potential risk narrative */
  risk: string;
}

/**
 * Attribute display names and descriptions
 */
const ATTRIBUTE_INFO: Record<
  keyof Omit<CoachAttributes, 'reputation' | 'yearsExperience' | 'age'>,
  { displayName: string; description: string }
> = {
  development: {
    displayName: 'Player Development',
    description: 'How quickly players improve under this coach',
  },
  gameDayIQ: {
    displayName: 'Game Day IQ',
    description: 'Quality of in-game decisions and adjustments',
  },
  schemeTeaching: {
    displayName: 'Scheme Teaching',
    description: 'How fast players learn and execute the scheme',
  },
  playerEvaluation: {
    displayName: 'Player Evaluation',
    description: 'Accuracy when evaluating player abilities',
  },
  talentID: {
    displayName: 'Talent Identification',
    description: 'Ability to identify hidden potential in players',
  },
  motivation: {
    displayName: 'Motivation',
    description: 'Impact on player morale and effort',
  },
};

/**
 * Calculate uncertainty range based on experience
 * More experienced = narrower range (more known quantity)
 */
function getUncertaintyRange(yearsExperience: number): number {
  if (yearsExperience >= 20) return 8; // Very narrow, well known
  if (yearsExperience >= 15) return 12;
  if (yearsExperience >= 10) return 16;
  if (yearsExperience >= 5) return 22;
  if (yearsExperience >= 3) return 28;
  return 35; // Very uncertain for rookies
}

/**
 * Get confidence level based on experience
 */
function getConfidenceLevel(yearsExperience: number): 'low' | 'medium' | 'high' {
  if (yearsExperience >= 15) return 'high';
  if (yearsExperience >= 8) return 'medium';
  return 'low';
}

/**
 * Generate perceived range for an attribute
 */
function generatePerceivedRange(
  trueValue: number,
  yearsExperience: number
): PerceivedAttributeRange {
  const range = getUncertaintyRange(yearsExperience);
  const confidence = getConfidenceLevel(yearsExperience);

  // Add some randomness to the perceived range
  // The range might not be centered on the true value (scouts can be wrong)
  const bias = Math.floor((Math.random() - 0.5) * range * 0.4);

  let min = Math.max(1, trueValue - Math.floor(range / 2) + bias);
  let max = Math.min(99, trueValue + Math.floor(range / 2) + bias);

  // Ensure the true value is within the range (scouts aren't completely wrong)
  if (trueValue < min) min = trueValue;
  if (trueValue > max) max = trueValue;

  // Clamp to valid range
  min = Math.max(1, min);
  max = Math.min(99, max);

  return { min, max, confidence };
}

/**
 * Get qualitative assessment from perceived range
 */
function getQualitativeAssessment(perceived: PerceivedAttributeRange): string {
  const midpoint = (perceived.min + perceived.max) / 2;
  const rangeSize = perceived.max - perceived.min;

  // Base assessment on midpoint
  let baseAssessment: string;
  if (midpoint >= 80) baseAssessment = 'Elite';
  else if (midpoint >= 65) baseAssessment = 'Strong';
  else if (midpoint >= 50) baseAssessment = 'Average';
  else if (midpoint >= 35) baseAssessment = 'Below Average';
  else baseAssessment = 'Weak';

  // Add uncertainty qualifier based on range
  if (rangeSize > 25) {
    return `Possibly ${baseAssessment}`;
  } else if (rangeSize > 15) {
    return `Likely ${baseAssessment}`;
  }
  return baseAssessment;
}

/**
 * Get possible reputation tiers based on experience and actual reputation
 */
function getPossibleReputationTiers(
  trueReputation: number,
  yearsExperience: number
): { likely: ReputationTier; possible: ReputationTier[] } {
  const trueTier = getReputationTier(trueReputation);
  const tiers: ReputationTier[] = ['unknown', 'rising', 'established', 'elite', 'legendary'];
  const trueIndex = tiers.indexOf(trueTier);

  // For experienced coaches, reputation is more accurate
  if (yearsExperience >= 15) {
    return {
      likely: trueTier,
      possible: [trueTier],
    };
  }

  // For less experienced, there's uncertainty
  const possibleTiers: ReputationTier[] = [trueTier];

  if (yearsExperience < 10 && trueIndex > 0) {
    possibleTiers.push(tiers[trueIndex - 1]);
  }
  if (yearsExperience < 8 && trueIndex < tiers.length - 1) {
    possibleTiers.push(tiers[trueIndex + 1]);
  }

  return {
    likely: trueTier,
    possible: possibleTiers,
  };
}

/**
 * Generate reputation narrative assessment
 */
function getReputationNarrative(
  likely: ReputationTier,
  possible: ReputationTier[],
  yearsExperience: number
): string {
  if (possible.length === 1) {
    // High confidence
    switch (likely) {
      case 'legendary':
        return 'One of the most respected names in coaching';
      case 'elite':
        return 'Widely regarded as a top-tier coach';
      case 'established':
        return 'A proven coach with a solid track record';
      case 'rising':
        return 'Building a positive reputation in the league';
      default:
        return 'Still establishing himself in the profession';
    }
  }

  // Low confidence - more vague
  if (yearsExperience < 5) {
    return "Too early to judge - hasn't had enough time to prove himself";
  }

  switch (likely) {
    case 'elite':
    case 'legendary':
      return 'Shows signs of being a high-caliber coach, but opinions vary';
    case 'established':
      return 'Generally seen as competent, though some question his ceiling';
    case 'rising':
      return 'Showing promise, but the jury is still out';
    default:
      return 'An unknown quantity with limited track record';
  }
}

/**
 * Generate overall assessment narrative
 */
function generateOverallAssessment(
  coach: Coach,
  attributes: CoachScoutingReport['attributes']
): string {
  const attrList = Object.values(attributes);
  const strongAreas = attrList.filter((a) => (a.perceived.min + a.perceived.max) / 2 >= 65);
  const weakAreas = attrList.filter((a) => (a.perceived.min + a.perceived.max) / 2 < 45);

  const parts: string[] = [];

  if (coach.attributes.yearsExperience < 5) {
    parts.push(
      `With only ${coach.attributes.yearsExperience} years of experience, ${coach.firstName} ${coach.lastName} is still developing as a coach.`
    );
  } else if (coach.attributes.yearsExperience >= 15) {
    parts.push(
      `${coach.firstName} ${coach.lastName} is a veteran coach with ${coach.attributes.yearsExperience} years of experience.`
    );
  }

  if (strongAreas.length > 0) {
    parts.push(
      `Our scouts believe he may excel in ${strongAreas
        .slice(0, 2)
        .map((a) => a.displayName.toLowerCase())
        .join(' and ')}.`
    );
  }

  if (weakAreas.length > 0) {
    parts.push(`There are some concerns about his ${weakAreas[0].displayName.toLowerCase()}.`);
  }

  if (parts.length === 0) {
    parts.push(
      `${coach.firstName} ${coach.lastName} appears to be a well-rounded coaching candidate.`
    );
  }

  return parts.join(' ');
}

/**
 * Generate upside narrative
 */
function generateUpside(coach: Coach, perceived: CoachScoutingReport['attributes']): string {
  const attrList = Object.values(perceived);
  const highCeilingAttrs = attrList.filter((a) => a.perceived.max >= 75);

  if (highCeilingAttrs.length === 0) {
    return 'A steady hand without significant upside';
  }

  if (highCeilingAttrs.length >= 3) {
    return 'Could develop into an elite coach if assessments are accurate';
  }

  const topAttr = highCeilingAttrs[0];
  return `If our scouts are right about his ${topAttr.displayName.toLowerCase()}, he could be special`;
}

/**
 * Generate risk narrative
 */
function generateRisk(coach: Coach, perceived: CoachScoutingReport['attributes']): string {
  const attrList = Object.values(perceived);
  const lowFloorAttrs = attrList.filter((a) => a.perceived.min < 40);
  const wideRangeAttrs = attrList.filter((a) => a.perceived.max - a.perceived.min > 25);

  const risks: string[] = [];

  if (coach.attributes.yearsExperience < 5) {
    risks.push('Lacks experience');
  }

  if (lowFloorAttrs.length > 0) {
    risks.push(`Potential weakness in ${lowFloorAttrs[0].displayName.toLowerCase()}`);
  }

  if (wideRangeAttrs.length >= 3) {
    risks.push('Difficult to evaluate accurately');
  }

  if (risks.length === 0) {
    return 'Low risk, known quantity';
  }

  return risks.join('; ');
}

/**
 * Generate a full scouting report for a coach
 */
export function generateCoachScoutingReport(coach: Coach): CoachScoutingReport {
  const { yearsExperience, reputation } = coach.attributes;

  // Generate reputation assessment
  const repTiers = getPossibleReputationTiers(reputation, yearsExperience);
  const repConfidence = getConfidenceLevel(yearsExperience);

  // Generate attribute reports
  const attributes: CoachScoutingReport['attributes'] = {
    development: {
      name: 'development',
      ...ATTRIBUTE_INFO.development,
      perceived: generatePerceivedRange(coach.attributes.development, yearsExperience),
      assessment: '',
    },
    gameDayIQ: {
      name: 'gameDayIQ',
      ...ATTRIBUTE_INFO.gameDayIQ,
      perceived: generatePerceivedRange(coach.attributes.gameDayIQ, yearsExperience),
      assessment: '',
    },
    schemeTeaching: {
      name: 'schemeTeaching',
      ...ATTRIBUTE_INFO.schemeTeaching,
      perceived: generatePerceivedRange(coach.attributes.schemeTeaching, yearsExperience),
      assessment: '',
    },
    playerEvaluation: {
      name: 'playerEvaluation',
      ...ATTRIBUTE_INFO.playerEvaluation,
      perceived: generatePerceivedRange(coach.attributes.playerEvaluation, yearsExperience),
      assessment: '',
    },
    talentID: {
      name: 'talentID',
      ...ATTRIBUTE_INFO.talentID,
      perceived: generatePerceivedRange(coach.attributes.talentID, yearsExperience),
      assessment: '',
    },
    motivation: {
      name: 'motivation',
      ...ATTRIBUTE_INFO.motivation,
      perceived: generatePerceivedRange(coach.attributes.motivation, yearsExperience),
      assessment: '',
    },
  };

  // Add assessments
  for (const key of Object.keys(attributes) as (keyof typeof attributes)[]) {
    attributes[key].assessment = getQualitativeAssessment(attributes[key].perceived);
  }

  return {
    coachId: coach.id,
    coachName: `${coach.firstName} ${coach.lastName}`,
    perceivedReputation: {
      likelyTier: repTiers.likely,
      possibleTiers: repTiers.possible,
      confidence: repConfidence,
      narrativeAssessment: getReputationNarrative(
        repTiers.likely,
        repTiers.possible,
        yearsExperience
      ),
    },
    attributes,
    overallAssessment: generateOverallAssessment(coach, attributes),
    upside: generateUpside(coach, attributes),
    risk: generateRisk(coach, attributes),
  };
}

/**
 * Get display color for confidence level
 */
export function getConfidenceColor(confidence: 'low' | 'medium' | 'high'): string {
  switch (confidence) {
    case 'high':
      return '#22C55E'; // green
    case 'medium':
      return '#F59E0B'; // amber
    default:
      return '#EF4444'; // red
  }
}

/**
 * Get display color for perceived range midpoint
 */
export function getAttributeRangeColor(perceived: PerceivedAttributeRange): string {
  const midpoint = (perceived.min + perceived.max) / 2;
  if (midpoint >= 70) return '#22C55E'; // green
  if (midpoint >= 55) return '#3B82F6'; // blue
  if (midpoint >= 40) return '#F59E0B'; // amber
  return '#EF4444'; // red
}
