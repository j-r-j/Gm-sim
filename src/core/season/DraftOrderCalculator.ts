/**
 * Draft Order Calculator
 * Calculates NFL draft order based on final standings and playoff results
 *
 * Draft Order Rules:
 * - Picks 1-18: Non-playoff teams (worst to best record)
 * - Picks 19-24: Teams eliminated in Wild Card round
 * - Picks 25-28: Teams eliminated in Divisional round
 * - Picks 29-30: Teams eliminated in Conference Championships
 * - Pick 31: Super Bowl loser
 * - Pick 32: Super Bowl champion
 *
 * Tiebreakers (opposite of playoff tiebreakers - worse record wins):
 * - Strength of schedule (lower is better for draft)
 * - Head-to-head (loser gets higher pick)
 * - Division/conference record
 * - Point differential
 */

import {
  DetailedDivisionStandings,
  TeamStanding,
  resolveWildcardTiebreaker,
} from './StandingsCalculator';
import {
  PlayoffSchedule,
  getTeamEliminationRound,
  PlayoffRound,
} from './PlayoffGenerator';

/**
 * Resolves draft tiebreakers (opposite of playoff tiebreakers)
 * Worse record wins higher draft pick
 */
export function resolveDraftTiebreaker(teams: TeamStanding[]): TeamStanding[] {
  return [...teams].sort((a, b) => {
    // 1. Win percentage (lower is better for draft)
    if (a.winPercentage !== b.winPercentage) {
      return a.winPercentage - b.winPercentage;
    }

    // 2. Strength of schedule (lower is better for draft)
    if (a.strengthOfSchedule !== b.strengthOfSchedule) {
      return a.strengthOfSchedule - b.strengthOfSchedule;
    }

    // 3. Point differential (more negative is better for draft)
    if (a.pointDifferential !== b.pointDifferential) {
      return a.pointDifferential - b.pointDifferential;
    }

    // 4. Conference record (lower is better for draft)
    const aConfWinPct =
      (a.conferenceWins + a.conferenceTies * 0.5) /
        (a.conferenceWins + a.conferenceLosses + a.conferenceTies) || 0;
    const bConfWinPct =
      (b.conferenceWins + b.conferenceTies * 0.5) /
        (b.conferenceWins + b.conferenceLosses + b.conferenceTies) || 0;

    if (aConfWinPct !== bConfWinPct) {
      return aConfWinPct - bConfWinPct;
    }

    // 5. Division record (lower is better for draft)
    const aDivWinPct =
      (a.divisionWins + a.divisionTies * 0.5) /
        (a.divisionWins + a.divisionLosses + a.divisionTies) || 0;
    const bDivWinPct =
      (b.divisionWins + b.divisionTies * 0.5) /
        (b.divisionWins + b.divisionLosses + b.divisionTies) || 0;

    if (aDivWinPct !== bDivWinPct) {
      return aDivWinPct - bDivWinPct;
    }

    // 6. Coin flip (alphabetical by team ID for determinism)
    return a.teamId.localeCompare(b.teamId);
  });
}

/**
 * Gets all playoff teams from the schedule
 */
function getPlayoffTeams(playoffSchedule: PlayoffSchedule): Set<string> {
  const teams = new Set<string>();

  for (const teamId of playoffSchedule.afcSeeds.values()) {
    teams.add(teamId);
  }
  for (const teamId of playoffSchedule.nfcSeeds.values()) {
    teams.add(teamId);
  }

  return teams;
}

/**
 * Groups playoff teams by elimination round
 */
function groupTeamsByEliminationRound(
  playoffSchedule: PlayoffSchedule
): Map<PlayoffRound | 'champion', string[]> {
  const groups = new Map<PlayoffRound | 'champion', string[]>();
  groups.set('wildCard', []);
  groups.set('divisional', []);
  groups.set('conference', []);
  groups.set('superBowl', []); // Super Bowl loser
  groups.set('champion', []); // Super Bowl winner

  const playoffTeams = getPlayoffTeams(playoffSchedule);

  for (const teamId of playoffTeams) {
    // Check if this is the champion
    if (playoffSchedule.superBowlChampion === teamId) {
      groups.get('champion')!.push(teamId);
      continue;
    }

    // Check if Super Bowl loser
    if (playoffSchedule.superBowl?.isComplete) {
      const sbLoser =
        playoffSchedule.superBowl.winnerId === playoffSchedule.superBowl.homeTeamId
          ? playoffSchedule.superBowl.awayTeamId
          : playoffSchedule.superBowl.homeTeamId;
      if (teamId === sbLoser) {
        groups.get('superBowl')!.push(teamId);
        continue;
      }
    }

    // Check elimination round
    const eliminationRound = getTeamEliminationRound(playoffSchedule, teamId);
    if (eliminationRound) {
      groups.get(eliminationRound)!.push(teamId);
    }
  }

  return groups;
}

/**
 * Calculates the complete draft order
 *
 * @param standings - Final regular season standings
 * @param playoffResults - Completed playoff bracket
 * @returns Array of team IDs in draft order (pick 1 first)
 */
export function calculateDraftOrder(
  standings: DetailedDivisionStandings,
  playoffResults: PlayoffSchedule
): string[] {
  const draftOrder: string[] = [];
  const playoffTeams = getPlayoffTeams(playoffResults);

  // Get all standings in a flat list
  const allStandings: TeamStanding[] = [];
  for (const conference of ['afc', 'nfc'] as const) {
    for (const division of ['north', 'south', 'east', 'west'] as const) {
      allStandings.push(...standings[conference][division]);
    }
  }

  // Create map for quick lookup
  const standingsMap = new Map<string, TeamStanding>();
  for (const standing of allStandings) {
    standingsMap.set(standing.teamId, standing);
  }

  // 1. Non-playoff teams (picks 1-18) - sorted worst to best
  const nonPlayoffTeams = allStandings.filter(
    (s) => !playoffTeams.has(s.teamId)
  );
  const sortedNonPlayoff = resolveDraftTiebreaker(nonPlayoffTeams);
  for (const team of sortedNonPlayoff) {
    draftOrder.push(team.teamId);
  }

  // 2. Playoff teams by elimination round
  const eliminationGroups = groupTeamsByEliminationRound(playoffResults);

  // Wild Card losers (picks 19-24)
  const wcLosers = eliminationGroups.get('wildCard') || [];
  const wcStandings = wcLosers
    .map((id) => standingsMap.get(id))
    .filter((s): s is TeamStanding => s !== undefined);
  const sortedWC = resolveDraftTiebreaker(wcStandings);
  for (const team of sortedWC) {
    draftOrder.push(team.teamId);
  }

  // Divisional losers (picks 25-28)
  const divLosers = eliminationGroups.get('divisional') || [];
  const divStandings = divLosers
    .map((id) => standingsMap.get(id))
    .filter((s): s is TeamStanding => s !== undefined);
  const sortedDiv = resolveDraftTiebreaker(divStandings);
  for (const team of sortedDiv) {
    draftOrder.push(team.teamId);
  }

  // Conference Championship losers (picks 29-30)
  const confLosers = eliminationGroups.get('conference') || [];
  const confStandings = confLosers
    .map((id) => standingsMap.get(id))
    .filter((s): s is TeamStanding => s !== undefined);
  const sortedConf = resolveDraftTiebreaker(confStandings);
  for (const team of sortedConf) {
    draftOrder.push(team.teamId);
  }

  // Super Bowl loser (pick 31)
  const sbLosers = eliminationGroups.get('superBowl') || [];
  for (const teamId of sbLosers) {
    draftOrder.push(teamId);
  }

  // Super Bowl champion (pick 32)
  const champions = eliminationGroups.get('champion') || [];
  for (const teamId of champions) {
    draftOrder.push(teamId);
  }

  return draftOrder;
}

/**
 * Gets a team's draft position
 *
 * @param draftOrder - The complete draft order
 * @param teamId - The team ID
 * @returns The draft position (1-32), or null if not found
 */
export function getTeamDraftPosition(
  draftOrder: string[],
  teamId: string
): number | null {
  const index = draftOrder.indexOf(teamId);
  return index >= 0 ? index + 1 : null;
}

/**
 * Calculates draft order before playoffs are complete
 * (for non-playoff teams only)
 */
export function calculatePreliminaryDraftOrder(
  standings: DetailedDivisionStandings,
  playoffTeams: Set<string>
): string[] {
  const allStandings: TeamStanding[] = [];
  for (const conference of ['afc', 'nfc'] as const) {
    for (const division of ['north', 'south', 'east', 'west'] as const) {
      allStandings.push(...standings[conference][division]);
    }
  }

  const nonPlayoffTeams = allStandings.filter(
    (s) => !playoffTeams.has(s.teamId)
  );
  const sortedNonPlayoff = resolveDraftTiebreaker(nonPlayoffTeams);

  return sortedNonPlayoff.map((s) => s.teamId);
}

/**
 * Formats draft order for display
 */
export function formatDraftOrder(
  draftOrder: string[],
  teamNames: Map<string, string>
): { pick: number; teamId: string; teamName: string }[] {
  return draftOrder.map((teamId, index) => ({
    pick: index + 1,
    teamId,
    teamName: teamNames.get(teamId) || teamId,
  }));
}

/**
 * Gets the draft pick range for playoff elimination rounds
 */
export function getPickRangeForRound(
  round: PlayoffRound | 'non-playoff'
): { start: number; end: number } {
  switch (round) {
    case 'non-playoff':
      return { start: 1, end: 18 };
    case 'wildCard':
      return { start: 19, end: 24 };
    case 'divisional':
      return { start: 25, end: 28 };
    case 'conference':
      return { start: 29, end: 30 };
    case 'superBowl':
      return { start: 31, end: 32 };
  }
}

/**
 * Explains why a team has a specific draft position
 */
export function explainDraftPosition(
  teamId: string,
  draftOrder: string[],
  standings: DetailedDivisionStandings,
  playoffResults: PlayoffSchedule
): string {
  const position = getTeamDraftPosition(draftOrder, teamId);
  if (!position) return 'Team not found in draft order';

  const playoffTeams = getPlayoffTeams(playoffResults);

  if (!playoffTeams.has(teamId)) {
    // Non-playoff team
    const allStandings: TeamStanding[] = [];
    for (const conference of ['afc', 'nfc'] as const) {
      for (const division of ['north', 'south', 'east', 'west'] as const) {
        allStandings.push(...standings[conference][division]);
      }
    }

    const standing = allStandings.find((s) => s.teamId === teamId);
    if (standing) {
      return `Pick #${position}: Missed playoffs with ${standing.wins}-${standing.losses}${standing.ties > 0 ? `-${standing.ties}` : ''} record`;
    }
  }

  // Playoff team - check elimination round
  if (playoffResults.superBowlChampion === teamId) {
    return `Pick #${position}: Super Bowl champion`;
  }

  const eliminationRound = getTeamEliminationRound(playoffResults, teamId);
  if (eliminationRound) {
    const roundNames: Record<PlayoffRound, string> = {
      wildCard: 'Wild Card round',
      divisional: 'Divisional round',
      conference: 'Conference Championship',
      superBowl: 'Super Bowl',
    };
    return `Pick #${position}: Eliminated in ${roundNames[eliminationRound]}`;
  }

  return `Pick #${position}`;
}
