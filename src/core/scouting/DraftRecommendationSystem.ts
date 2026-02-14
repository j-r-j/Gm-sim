/**
 * Draft Recommendation System
 * Generates per-scout draft pick recommendations during the draft.
 * Each scout recommends based on their focus prospects, evaluation skill, and role bias.
 * If a scout hasn't used all their deep scout slots, they auto-generate a recommendation.
 */

import { Scout } from '../models/staff/Scout';
import { Position } from '../models/player/Position';
import { Prospect } from '../draft/Prospect';

/**
 * A single scout's draft recommendation
 */
export interface ScoutDraftRecommendation {
  scoutId: string;
  scoutName: string;
  scoutRole: string;
  recommendedProspectId: string;
  recommendedProspectName: string;
  recommendedProspectPosition: Position;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  /** Whether this came from a focus-scouted prospect */
  isFocusBased: boolean;
  /** The scout's estimated overall range for this prospect */
  estimatedOverall: { min: number; max: number } | null;
}

/**
 * All scout recommendations for a given pick
 */
export interface DraftPickRecommendations {
  pickNumber: number;
  round: number;
  recommendations: ScoutDraftRecommendation[];
  /** Whether all scouts agree on the same player */
  unanimous: boolean;
  /** Consensus pick if scouts agree */
  consensusProspectId: string | null;
}

/**
 * Offensive position groups for offensive scout bias
 */
const OFFENSIVE_POSITIONS: Position[] = [
  Position.QB,
  Position.RB,
  Position.WR,
  Position.TE,
  Position.LT,
  Position.LG,
  Position.C,
  Position.RG,
  Position.RT,
];

/**
 * Defensive position groups for defensive scout bias
 */
const DEFENSIVE_POSITIONS: Position[] = [
  Position.DE,
  Position.DT,
  Position.OLB,
  Position.ILB,
  Position.CB,
  Position.FS,
  Position.SS,
];

/**
 * Generates a scout's recommendation for the current pick
 */
export function generateScoutRecommendation(
  scout: Scout,
  availableProspects: Prospect[],
  teamNeeds: Position[],
  pickNumber: number
): ScoutDraftRecommendation | null {
  if (availableProspects.length === 0) return null;

  const scoutName = `${scout.firstName} ${scout.lastName}`;

  // If scout has focus prospects that are still available, prioritize those
  const availableFocusProspects = availableProspects.filter((p) =>
    scout.focusProspects.includes(p.id)
  );

  if (availableFocusProspects.length > 0) {
    // Recommend the best focus prospect based on scout evaluation
    const bestFocus = pickBestProspect(availableFocusProspects, scout, teamNeeds, pickNumber);
    if (bestFocus) {
      return {
        scoutId: scout.id,
        scoutName,
        scoutRole: scout.role,
        recommendedProspectId: bestFocus.id,
        recommendedProspectName: `${bestFocus.player.firstName} ${bestFocus.player.lastName}`,
        recommendedProspectPosition: bestFocus.player.position,
        reasoning: generateFocusReasoning(bestFocus, scout, teamNeeds),
        confidence: 'high',
        isFocusBased: true,
        estimatedOverall: estimateOverall(bestFocus, scout),
      };
    }
  }

  // Auto-generate recommendation based on role bias and evaluation
  const biasedProspects = applyRoleBias(availableProspects, scout);
  const bestProspect = pickBestProspect(biasedProspects, scout, teamNeeds, pickNumber);

  if (!bestProspect) return null;

  return {
    scoutId: scout.id,
    scoutName,
    scoutRole: scout.role,
    recommendedProspectId: bestProspect.id,
    recommendedProspectName: `${bestProspect.player.firstName} ${bestProspect.player.lastName}`,
    recommendedProspectPosition: bestProspect.player.position,
    reasoning: generateAutoReasoning(bestProspect, scout, teamNeeds),
    confidence: scout.focusProspects.length > 0 ? 'medium' : 'low',
    isFocusBased: false,
    estimatedOverall: estimateOverall(bestProspect, scout),
  };
}

/**
 * Generates recommendations from all scouts for a pick
 */
export function generatePickRecommendations(
  scouts: Scout[],
  availableProspects: Prospect[],
  teamNeeds: Position[],
  pickNumber: number,
  round: number
): DraftPickRecommendations {
  const recommendations: ScoutDraftRecommendation[] = [];

  for (const scout of scouts) {
    const rec = generateScoutRecommendation(scout, availableProspects, teamNeeds, pickNumber);
    if (rec) {
      recommendations.push(rec);
    }
  }

  // Check for unanimity
  const prospectIds = recommendations.map((r) => r.recommendedProspectId);
  const uniqueIds = new Set(prospectIds);
  const unanimous = uniqueIds.size === 1 && recommendations.length > 1;
  const consensusProspectId = unanimous ? prospectIds[0] : null;

  return {
    pickNumber,
    round,
    recommendations,
    unanimous,
    consensusProspectId,
  };
}

/**
 * Picks the best prospect for a scout based on their evaluation and biases
 */
function pickBestProspect(
  prospects: Prospect[],
  scout: Scout,
  teamNeeds: Position[],
  _pickNumber: number
): Prospect | null {
  if (prospects.length === 0) return null;

  const scored = prospects.map((p) => ({
    prospect: p,
    score: scoreProspect(p, scout, teamNeeds),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0].prospect;
}

/**
 * Scores a prospect from a scout's perspective
 */
function scoreProspect(prospect: Prospect, scout: Scout, teamNeeds: Position[]): number {
  let score = 0;

  // Base score from consensus projection (lower projected round = higher score)
  const projectedRound = prospect.consensusProjection?.projectedRound ?? 5;
  score += (8 - projectedRound) * 15;

  // Scout evaluation skill affects accuracy of assessment
  const evalSkill = scout.attributes.evaluation;
  const trueOverall = prospect.player.roleFit?.roleEffectiveness ?? 50;

  // Scout sees a noisy version of true value
  const noise = (100 - evalSkill) * 0.3 * (Math.random() - 0.5);
  score += trueOverall + noise;

  // Team need bonus
  if (teamNeeds.includes(prospect.player.position)) {
    score += 20;
  }

  // Role-specific bias
  if (scout.role === 'offensiveScout' && OFFENSIVE_POSITIONS.includes(prospect.player.position)) {
    score += 10;
  } else if (
    scout.role === 'defensiveScout' &&
    DEFENSIVE_POSITIONS.includes(prospect.player.position)
  ) {
    score += 10;
  }

  // Focus prospect bonus (scout knows them better)
  if (scout.focusProspects.includes(prospect.id)) {
    score += 15;
  }

  return score;
}

/**
 * Applies role-based bias to prospect list
 * Offensive scouts favor offensive players, defensive scouts favor defensive players
 */
function applyRoleBias(prospects: Prospect[], scout: Scout): Prospect[] {
  if (scout.role === 'headScout') {
    // Head scout has no bias
    return prospects;
  }

  // Sort so role-matching prospects appear first, but don't exclude others
  const sorted = [...prospects].sort((a, b) => {
    const aMatch = isRoleMatch(a.player.position, scout.role);
    const bMatch = isRoleMatch(b.player.position, scout.role);
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });

  return sorted;
}

/**
 * Checks if a position matches a scout's role
 */
function isRoleMatch(position: Position, role: string): boolean {
  if (role === 'offensiveScout') return OFFENSIVE_POSITIONS.includes(position);
  if (role === 'defensiveScout') return DEFENSIVE_POSITIONS.includes(position);
  return true; // Head scout matches all
}

/**
 * Generates reasoning for a focus-scouted recommendation
 */
function generateFocusReasoning(prospect: Prospect, scout: Scout, teamNeeds: Position[]): string {
  const name = `${prospect.player.firstName} ${prospect.player.lastName}`;
  const pos = prospect.player.position;
  const isNeed = teamNeeds.includes(pos);

  const reasons: string[] = [];

  reasons.push(`I've spent weeks evaluating ${name}`);

  if (isNeed) {
    reasons.push(`and he fills our need at ${pos}`);
  }

  const ceiling = prospect.player.roleFit?.ceiling;
  if (ceiling === 'franchiseCornerstone') {
    reasons.push('This kid has franchise-changing potential');
  } else if (ceiling === 'highEndStarter') {
    reasons.push("He's a day-one starter with Pro Bowl upside");
  } else if (ceiling === 'solidStarter') {
    reasons.push('Solid starter who can contribute immediately');
  }

  // Add scout-specific flavor
  if (scout.role === 'offensiveScout' && OFFENSIVE_POSITIONS.includes(pos)) {
    reasons.push("He'll elevate our offense");
  } else if (scout.role === 'defensiveScout' && DEFENSIVE_POSITIONS.includes(pos)) {
    reasons.push("He'll be a force on our defense");
  }

  return reasons.join('. ') + '.';
}

/**
 * Generates reasoning for an auto-generated recommendation
 */
function generateAutoReasoning(prospect: Prospect, scout: Scout, teamNeeds: Position[]): string {
  const name = `${prospect.player.firstName} ${prospect.player.lastName}`;
  const pos = prospect.player.position;
  const isNeed = teamNeeds.includes(pos);

  const reasons: string[] = [];

  if (isNeed) {
    reasons.push(`${name} is the best available at ${pos}, which we need`);
  } else {
    reasons.push(`${name} is the best player available from what I've seen`);
  }

  const projRound = prospect.consensusProjection?.projectedRound;
  if (projRound && projRound < 3) {
    reasons.push("Don't overthink it - take the talent");
  }

  // Less confident without deep scouting
  reasons.push("I haven't had enough time with his film to be sure though");

  return reasons.join('. ') + '.';
}

/**
 * Estimates overall range based on scout evaluation skill
 */
function estimateOverall(prospect: Prospect, scout: Scout): { min: number; max: number } | null {
  const trueOverall = prospect.player.roleFit?.roleEffectiveness ?? null;

  if (trueOverall === null) return null;

  // Range width inversely proportional to scout evaluation skill
  const evalSkill = scout.attributes.evaluation;
  const rangeWidth = Math.round(25 * (1 - evalSkill / 100) + 8);

  // Center offset with some noise
  const offset = Math.round((Math.random() - 0.5) * rangeWidth * 0.3);
  const center = trueOverall + offset;

  return {
    min: Math.max(1, Math.round(center - rangeWidth / 2)),
    max: Math.min(99, Math.round(center + rangeWidth / 2)),
  };
}

/**
 * Gets the auto-pick recommendation when user hasn't used scout deep features
 * Prioritizes focus prospects, then falls back to BPA with team needs
 */
export function getAutoPickRecommendation(
  scouts: Scout[],
  availableProspects: Prospect[],
  teamNeeds: Position[]
): Prospect | null {
  if (availableProspects.length === 0) return null;

  // Collect all focus prospects from all scouts that are still available
  const focusProspectIds = new Set<string>();
  for (const scout of scouts) {
    for (const id of scout.focusProspects) {
      focusProspectIds.add(id);
    }
  }

  const availableFocusProspects = availableProspects.filter((p) => focusProspectIds.has(p.id));

  // If scouts have focus prospects available, pick the best one
  if (availableFocusProspects.length > 0) {
    // Use head scout's evaluation as the tiebreaker
    const headScout = scouts.find((s) => s.role === 'headScout');
    if (headScout) {
      const rec = generateScoutRecommendation(headScout, availableFocusProspects, teamNeeds, 0);
      if (rec) {
        return availableProspects.find((p) => p.id === rec.recommendedProspectId) ?? null;
      }
    }

    // Fallback: pick first available focus prospect
    return availableFocusProspects[0];
  }

  // No focus prospects available: pick BPA with need adjustment
  const scored = availableProspects.map((p) => {
    let score = 0;
    const projRound = p.consensusProjection?.projectedRound ?? 5;
    score += (8 - projRound) * 15;
    if (teamNeeds.includes(p.player.position)) {
      score += 25;
    }
    return { prospect: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.prospect ?? null;
}
