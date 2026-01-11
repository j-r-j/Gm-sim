/**
 * Trade Value Calculator
 * Internal pick value calculations for trade fairness evaluation.
 * BRAND GUIDELINE: Pick values are NEVER shown numerically to the user.
 */

import { DraftPick } from '../models/league/DraftPick';

/**
 * Internal pick value points (HIDDEN from user)
 * Based on historical draft value charts
 */
const PICK_VALUE_CHART: Record<number, number> = {
  1: 3000,
  2: 2600,
  3: 2200,
  4: 1900,
  5: 1700,
  6: 1600,
  7: 1500,
  8: 1400,
  9: 1350,
  10: 1300,
  11: 1250,
  12: 1200,
  13: 1150,
  14: 1100,
  15: 1050,
  16: 1000,
  17: 950,
  18: 900,
  19: 875,
  20: 850,
  21: 825,
  22: 800,
  23: 775,
  24: 750,
  25: 725,
  26: 700,
  27: 675,
  28: 650,
  29: 625,
  30: 600,
  31: 590,
  32: 580,
  // Round 2
  33: 560,
  34: 550,
  35: 540,
  36: 530,
  37: 520,
  38: 510,
  39: 500,
  40: 490,
  41: 480,
  42: 470,
  43: 460,
  44: 450,
  45: 440,
  46: 430,
  47: 420,
  48: 410,
  49: 400,
  50: 390,
  51: 380,
  52: 370,
  53: 360,
  54: 350,
  55: 340,
  56: 330,
  57: 320,
  58: 310,
  59: 300,
  60: 292,
  61: 284,
  62: 276,
  63: 270,
  64: 265,
  // Round 3
  65: 255,
  66: 250,
  67: 245,
  68: 240,
  69: 235,
  70: 230,
  71: 225,
  72: 220,
  73: 215,
  74: 210,
  75: 205,
  76: 200,
  77: 195,
  78: 190,
  79: 185,
  80: 180,
  81: 175,
  82: 170,
  83: 165,
  84: 160,
  85: 155,
  86: 150,
  87: 146,
  88: 142,
  89: 138,
  90: 134,
  91: 130,
  92: 126,
  93: 122,
  94: 118,
  95: 114,
  96: 110,
  // Round 4
  97: 106,
  98: 103,
  99: 100,
  100: 97,
  101: 94,
  102: 91,
  103: 88,
  104: 85,
  105: 82,
  106: 80,
  107: 78,
  108: 76,
  109: 74,
  110: 72,
  111: 70,
  112: 68,
  113: 66,
  114: 64,
  115: 62,
  116: 60,
  117: 58,
  118: 56,
  119: 54,
  120: 52,
  121: 50,
  122: 49,
  123: 48,
  124: 47,
  125: 46,
  126: 45,
  127: 44,
  128: 43,
  // Round 5
  129: 41,
  130: 40,
  131: 39,
  132: 38,
  133: 37,
  134: 36,
  135: 35,
  136: 34,
  137: 33,
  138: 32,
  139: 31,
  140: 30,
  141: 29,
  142: 28,
  143: 27,
  144: 26,
  145: 25,
  146: 24,
  147: 23,
  148: 22,
  149: 21,
  150: 20,
  151: 19,
  152: 18,
  153: 17,
  154: 16,
  155: 15,
  156: 14,
  157: 13,
  158: 12,
  159: 11,
  160: 10,
  // Round 6
  161: 9.5,
  162: 9,
  163: 8.5,
  164: 8,
  165: 7.8,
  166: 7.6,
  167: 7.4,
  168: 7.2,
  169: 7,
  170: 6.8,
  171: 6.6,
  172: 6.4,
  173: 6.2,
  174: 6,
  175: 5.8,
  176: 5.6,
  177: 5.4,
  178: 5.2,
  179: 5,
  180: 4.8,
  181: 4.6,
  182: 4.4,
  183: 4.2,
  184: 4,
  185: 3.8,
  186: 3.6,
  187: 3.4,
  188: 3.2,
  189: 3,
  190: 2.9,
  191: 2.8,
  192: 2.7,
  // Round 7
  193: 2.5,
  194: 2.4,
  195: 2.3,
  196: 2.2,
  197: 2.1,
  198: 2,
  199: 1.9,
  200: 1.8,
  201: 1.7,
  202: 1.6,
  203: 1.5,
  204: 1.4,
  205: 1.3,
  206: 1.2,
  207: 1.1,
  208: 1,
  209: 0.95,
  210: 0.9,
  211: 0.85,
  212: 0.8,
  213: 0.75,
  214: 0.7,
  215: 0.65,
  216: 0.6,
  217: 0.55,
  218: 0.5,
  219: 0.48,
  220: 0.46,
  221: 0.44,
  222: 0.42,
  223: 0.4,
  224: 0.38,
  // Extended for compensatory picks (up to 262)
  225: 0.36,
  226: 0.34,
  227: 0.32,
  228: 0.3,
  229: 0.28,
  230: 0.26,
  231: 0.24,
  232: 0.22,
  233: 0.2,
  234: 0.19,
  235: 0.18,
  236: 0.17,
  237: 0.16,
  238: 0.15,
  239: 0.14,
  240: 0.13,
  241: 0.12,
  242: 0.11,
  243: 0.1,
  244: 0.1,
  245: 0.1,
  246: 0.1,
  247: 0.1,
  248: 0.1,
  249: 0.1,
  250: 0.1,
  251: 0.1,
  252: 0.1,
  253: 0.1,
  254: 0.1,
  255: 0.1,
  256: 0.1,
  257: 0.1,
  258: 0.1,
  259: 0.1,
  260: 0.1,
  261: 0.1,
  262: 0.1,
};

/**
 * Discount factor for future picks per year
 */
const FUTURE_YEAR_DISCOUNT = 0.85;

/**
 * Qualitative trade assessment (shown to user)
 */
export type TradeAssessment =
  | 'heavily_favors_them'
  | 'slightly_favors_them'
  | 'fair'
  | 'slightly_favors_you'
  | 'heavily_favors_you';

/**
 * Trade evaluation result (hidden values, visible assessment)
 */
export interface TradeEvaluation {
  /** Qualitative assessment shown to user */
  assessment: TradeAssessment;
  /** Description for user */
  description: string;
  /** Internal: value difference (HIDDEN) */
  _internalValueDiff: number;
  /** Internal: value ratio (HIDDEN) */
  _internalValueRatio: number;
}

/**
 * Picks involved in a trade proposal
 */
export interface TradeProposal {
  /** Picks being offered by the proposing team */
  picksOffered: DraftPick[];
  /** Picks being requested from the other team */
  picksRequested: DraftPick[];
  /** Current year for calculating future value */
  currentYear: number;
}

/**
 * Gets the internal value for a pick (HIDDEN from user)
 * @internal
 */
export function _getPickValue(overallPick: number): number {
  if (overallPick < 1) return 0;
  if (overallPick > 262) return 0.1;
  return PICK_VALUE_CHART[overallPick] ?? 0.1;
}

/**
 * Estimates overall pick from round (for future/unknown picks)
 * Uses middle of round as estimate
 */
export function estimateOverallFromRound(round: number): number {
  const basePicksPerRound = 32;
  // Middle of round estimate
  return (round - 1) * basePicksPerRound + 16;
}

/**
 * Gets the internal value for a draft pick (HIDDEN from user)
 * Handles both assigned picks and future picks
 * @internal
 */
export function _calculatePickValue(pick: DraftPick, currentYear: number): number {
  let baseValue: number;

  if (pick.overallPick !== null) {
    // Pick has assigned position
    baseValue = _getPickValue(pick.overallPick);
  } else {
    // Future pick - estimate from round
    const estimatedOverall = estimateOverallFromRound(pick.round);
    baseValue = _getPickValue(estimatedOverall);
  }

  // Apply discount for future years
  const yearsOut = pick.year - currentYear;
  if (yearsOut > 0) {
    baseValue *= Math.pow(FUTURE_YEAR_DISCOUNT, yearsOut);
  }

  return baseValue;
}

/**
 * Calculates total value of a set of picks (HIDDEN from user)
 * @internal
 */
export function _calculateTotalValue(picks: DraftPick[], currentYear: number): number {
  return picks.reduce((total, pick) => total + _calculatePickValue(pick, currentYear), 0);
}

/**
 * Evaluates a trade proposal and returns assessment
 * The internal values are hidden; only qualitative assessment shown to user
 */
export function evaluateTrade(proposal: TradeProposal): TradeEvaluation {
  const offeredValue = _calculateTotalValue(proposal.picksOffered, proposal.currentYear);
  const requestedValue = _calculateTotalValue(proposal.picksRequested, proposal.currentYear);

  const valueDiff = offeredValue - requestedValue;
  const valueRatio =
    requestedValue > 0 ? offeredValue / requestedValue : offeredValue > 0 ? 999 : 1;

  let assessment: TradeAssessment;
  let description: string;

  if (valueRatio < 0.6) {
    assessment = 'heavily_favors_them';
    description =
      'This trade heavily favors the other team. You would be giving up much more value.';
  } else if (valueRatio < 0.85) {
    assessment = 'slightly_favors_them';
    description = 'This trade slightly favors the other team. Consider asking for more.';
  } else if (valueRatio <= 1.18) {
    assessment = 'fair';
    description = 'This trade appears to be relatively fair for both sides.';
  } else if (valueRatio <= 1.65) {
    assessment = 'slightly_favors_you';
    description = 'This trade slightly favors you. A good opportunity.';
  } else {
    assessment = 'heavily_favors_you';
    description = 'This trade heavily favors you. The other team may reject it.';
  }

  return {
    assessment,
    description,
    _internalValueDiff: valueDiff,
    _internalValueRatio: valueRatio,
  };
}

/**
 * Checks if AI would accept a trade based on value
 * Uses internal calculations (HIDDEN logic)
 */
export function wouldAIAcceptTrade(
  proposal: TradeProposal,
  aiPersonalityFactor: number = 1.0
): boolean {
  const evaluation = evaluateTrade(proposal);

  // AI accepts if the trade is fair or favors them
  // personalityFactor adjusts threshold (trade-happy AI has lower threshold)
  const acceptThreshold = 0.9 * aiPersonalityFactor;

  return evaluation._internalValueRatio >= acceptThreshold;
}

/**
 * Generates counter-offer picks to balance a trade
 * Returns additional picks the offering team should include
 */
export function suggestTradeAdditions(
  proposal: TradeProposal,
  availablePicks: DraftPick[]
): DraftPick[] {
  const evaluation = evaluateTrade(proposal);

  if (evaluation._internalValueRatio >= 0.85) {
    // Trade is already fair enough
    return [];
  }

  const valueNeeded =
    _calculateTotalValue(proposal.picksRequested, proposal.currentYear) * 0.9 -
    _calculateTotalValue(proposal.picksOffered, proposal.currentYear);

  if (valueNeeded <= 0) {
    return [];
  }

  // Find picks to add that would make trade fair
  const sortedPicks = [...availablePicks]
    .filter(
      (p) =>
        !proposal.picksOffered.some((offered) => offered.id === p.id) &&
        !proposal.picksRequested.some((requested) => requested.id === p.id)
    )
    .sort(
      (a, b) =>
        _calculatePickValue(a, proposal.currentYear) - _calculatePickValue(b, proposal.currentYear)
    );

  const additions: DraftPick[] = [];
  let addedValue = 0;

  for (const pick of sortedPicks) {
    if (addedValue >= valueNeeded) break;
    const pickValue = _calculatePickValue(pick, proposal.currentYear);
    if (addedValue + pickValue <= valueNeeded * 1.2) {
      additions.push(pick);
      addedValue += pickValue;
    }
  }

  return additions;
}

/**
 * Gets qualitative pick tier for display (NOT numeric value)
 */
export function getPickTierDescription(pick: DraftPick): string {
  const round = pick.round;

  if (round === 1) {
    const overall = pick.overallPick;
    if (overall !== null) {
      if (overall <= 5) return 'Premium first-round selection';
      if (overall <= 15) return 'High first-round selection';
      return 'Late first-round selection';
    }
    return 'First-round selection';
  }

  if (round === 2) return 'Second-round selection';
  if (round === 3) return 'Third-round selection';
  if (round === 4) return 'Fourth-round selection';
  if (round === 5) return 'Fifth-round selection';
  if (round === 6) return 'Sixth-round selection';
  return 'Seventh-round selection';
}

/**
 * Compares two picks qualitatively (for user display)
 */
export function comparePicksQualitative(
  pick1: DraftPick,
  pick2: DraftPick
): 'significantly_better' | 'better' | 'similar' | 'worse' | 'significantly_worse' {
  const value1 = _calculatePickValue(pick1, pick1.year);
  const value2 = _calculatePickValue(pick2, pick2.year);

  const ratio = value1 / value2;

  if (ratio > 2) return 'significantly_better';
  if (ratio > 1.3) return 'better';
  if (ratio > 0.77) return 'similar';
  if (ratio > 0.5) return 'worse';
  return 'significantly_worse';
}

/**
 * Validates trade evaluation
 */
export function validateTradeEvaluation(evaluation: TradeEvaluation): boolean {
  const validAssessments: TradeAssessment[] = [
    'heavily_favors_them',
    'slightly_favors_them',
    'fair',
    'slightly_favors_you',
    'heavily_favors_you',
  ];

  if (!validAssessments.includes(evaluation.assessment)) return false;
  if (!evaluation.description || typeof evaluation.description !== 'string') return false;
  if (typeof evaluation._internalValueDiff !== 'number') return false;
  if (typeof evaluation._internalValueRatio !== 'number') return false;

  return true;
}
