/**
 * Prospect Utilities
 * Functions for converting between prospect types and formats
 */

import { Prospect, getOverallRanking, getPositionRanking } from '../core/draft/Prospect';
import { DraftBoardProspect } from '../screens/DraftBoardScreen';
import { SkillValue } from '../core/models/player/TechnicalSkills';

/**
 * Role ceiling order for sorting prospects (best to worst)
 */
const ROLE_CEILING_ORDER = [
  'franchiseCornerstone',
  'highEndStarter',
  'solidStarter',
  'qualityRotational',
  'specialist',
  'depth',
  'practiceSquad',
];

/**
 * Sorts prospects by their talent level (role ceiling + it factor)
 * This is used to determine prospect rankings when no explicit rankings exist
 */
export function sortProspectsByTalent(prospects: Prospect[]): Prospect[] {
  return [...prospects].sort((a, b) => {
    const aCeilingIndex = ROLE_CEILING_ORDER.indexOf(a.player.roleFit.ceiling);
    const bCeilingIndex = ROLE_CEILING_ORDER.indexOf(b.player.roleFit.ceiling);

    // First sort by ceiling
    if (aCeilingIndex !== bCeilingIndex) {
      return aCeilingIndex - bCeilingIndex;
    }

    // Secondary sort by it factor
    return b.player.itFactor.value - a.player.itFactor.value;
  });
}

/**
 * Gets the rank index for a role ceiling (lower is better)
 */
function getRoleCeilingIndex(ceiling: string): number {
  const index = ROLE_CEILING_ORDER.indexOf(ceiling);
  return index === -1 ? ROLE_CEILING_ORDER.length : index;
}

/**
 * Converts a Prospect to DraftBoardProspect format for display
 */
export function convertToDraftBoardProspect(prospect: Prospect): DraftBoardProspect {
  const player = prospect.player;

  // Get rankings
  const overallRanking = getOverallRanking(prospect, 'consensus');
  const positionRanking = getPositionRanking(prospect, 'consensus');

  // Get projection info
  const projection = prospect.consensusProjection || prospect.userProjection;

  // Convert player skills to SkillValue format
  // The player.skills is already in the right format (Record<string, SkillValue>)
  const skills: Record<string, SkillValue> = {};
  if (player.skills) {
    for (const [key, value] of Object.entries(player.skills)) {
      if (value && typeof value === 'object' && 'trueValue' in value) {
        skills[key] = value as SkillValue;
      }
    }
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
  };
}

/**
 * Converts multiple prospects to DraftBoardProspect format
 */
export function convertProspectsToDraftBoard(
  prospects: Record<string, Prospect>
): DraftBoardProspect[] {
  return Object.values(prospects).map(convertToDraftBoardProspect);
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
