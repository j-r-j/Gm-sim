/**
 * Prospect Utilities
 * Functions for converting between prospect types and formats
 */

import { Prospect, getOverallRanking, getPositionRanking } from '../core/draft/Prospect';
import { DraftBoardProspect, ProspectCombineData } from '../screens/DraftBoardScreen';
import { SkillValue } from '../core/models/player/TechnicalSkills';
import { CombineResults } from '../core/draft/CombineSimulator';

/**
 * Extra scouting data that can be passed when building the draft board
 */
export interface DraftBoardEnrichment {
  combineResults?: Record<string, CombineResults>;
  /** Aggregated OVR ranges by prospectId, e.g. { "id": "72-81" } */
  ovrRanges?: Record<string, string>;
  /** Scout confidence scores by prospectId (0-100) */
  confidenceScores?: Record<string, number>;
  /** Confidence labels by prospectId */
  confidenceLabels?: Record<string, string>;
}

/**
 * Extracts combine workout data into the display format
 */
function extractCombineData(result: CombineResults): ProspectCombineData | null {
  if (!result.participated || !result.workoutResults) {
    return null;
  }
  const w = result.workoutResults;
  return {
    fortyYardDash: w.fortyYardDash,
    benchPress: w.benchPress,
    verticalJump: w.verticalJump,
    broadJump: w.broadJump,
    threeConeDrill: w.threeConeDrill,
    twentyYardShuttle: w.twentyYardShuttle,
  };
}

/**
 * Converts a Prospect to DraftBoardProspect format for display
 */
export function convertToDraftBoardProspect(
  prospect: Prospect,
  enrichment?: DraftBoardEnrichment
): DraftBoardProspect {
  const player = prospect.player;

  // Get rankings
  const overallRanking = getOverallRanking(prospect, 'consensus');
  const positionRanking = getPositionRanking(prospect, 'consensus');

  // Get projection info
  const projection = prospect.consensusProjection || prospect.userProjection;

  // Convert player skills to SkillValue format
  const skills: Record<string, SkillValue> = {};
  if (player.skills) {
    for (const [key, value] of Object.entries(player.skills)) {
      if (value && typeof value === 'object' && 'trueValue' in value) {
        skills[key] = value as SkillValue;
      }
    }
  }

  // Extract combine data if available
  let combine: ProspectCombineData | null = null;
  if (enrichment?.combineResults?.[prospect.id]) {
    combine = extractCombineData(enrichment.combineResults[prospect.id]);
  }

  return {
    id: prospect.id,
    name: `${player.firstName} ${player.lastName}`,
    position: player.position,
    collegeName: prospect.collegeName,
    age: player.age,
    projectedRound: projection?.projectedRound ?? null,
    projectedPickRange: projection?.projectedPickRange ?? null,
    userTier: prospect.userTier,
    flagged: prospect.flagged,
    positionRank: positionRanking?.rank ?? null,
    overallRank: overallRanking?.rank ?? null,
    skills,
    physical: prospect.physicalsRevealed ? player.physical : null,
    combine,
    ovrRange: enrichment?.ovrRanges?.[prospect.id] ?? null,
    confidence: enrichment?.confidenceScores?.[prospect.id] ?? null,
    confidenceLabel: enrichment?.confidenceLabels?.[prospect.id] ?? null,
  };
}

/**
 * Converts multiple prospects to DraftBoardProspect format
 */
export function convertProspectsToDraftBoard(
  prospects: Record<string, Prospect>,
  enrichment?: DraftBoardEnrichment
): DraftBoardProspect[] {
  return Object.values(prospects).map((p) => convertToDraftBoardProspect(p, enrichment));
}

/**
 * Sorts prospects by overall rank for initial display
 */
export function sortProspectsByRank(prospects: DraftBoardProspect[]): DraftBoardProspect[] {
  return [...prospects].sort((a, b) => {
    // Sort by overall rank if available
    if (a.overallRank !== null && b.overallRank !== null) {
      return a.overallRank - b.overallRank;
    }
    // Put ranked prospects first
    if (a.overallRank !== null) return -1;
    if (b.overallRank !== null) return 1;
    // Fall back to projected round
    if (a.projectedRound !== null && b.projectedRound !== null) {
      return a.projectedRound - b.projectedRound;
    }
    if (a.projectedRound !== null) return -1;
    if (b.projectedRound !== null) return 1;
    // Fall back to name
    return a.name.localeCompare(b.name);
  });
}
