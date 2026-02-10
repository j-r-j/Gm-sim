/**
 * Standings Service
 * Calculates and updates league standings from team records
 */

import { Team } from '../core/models/team/Team';
import { DivisionStandings } from '../core/models/league/League';
import { ScheduledGame } from '../core/season/ScheduleGenerator';

/**
 * Standings entry with calculated fields
 */
export interface StandingsEntry {
  teamId: string;
  teamName: string;
  teamAbbr: string;
  conference: string;
  division: string;
  wins: number;
  losses: number;
  ties: number;
  pct: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDiff: number;
  streak: string;
  divisionWins: number;
  divisionLosses: number;
  conferenceWins: number;
  conferenceLosses: number;
  isUserTeam: boolean;
  playoffSeed: number | null;
}

/**
 * Calculates win percentage
 */
function calculatePct(wins: number, losses: number, ties: number): number {
  const total = wins + losses + ties;
  if (total === 0) return 0;
  return (wins + ties * 0.5) / total;
}

/**
 * Formats streak number to string (e.g., 3 -> "W3", -2 -> "L2")
 */
function formatStreak(streak: number): string {
  if (streak === 0) return '-';
  if (streak > 0) return `W${streak}`;
  return `L${Math.abs(streak)}`;
}

/**
 * Creates a standings entry from a team
 */
export function createStandingsEntry(team: Team, userTeamId: string): StandingsEntry {
  const record = team.currentRecord;
  const pct = calculatePct(record.wins, record.losses, record.ties || 0);

  return {
    teamId: team.id,
    teamName: `${team.city} ${team.nickname}`,
    teamAbbr: team.abbreviation,
    conference: team.conference,
    division: team.division,
    wins: record.wins,
    losses: record.losses,
    ties: record.ties || 0,
    pct,
    pointsFor: record.pointsFor,
    pointsAgainst: record.pointsAgainst,
    pointsDiff: record.pointsFor - record.pointsAgainst,
    streak: formatStreak(record.streak),
    divisionWins: record.divisionWins || 0,
    divisionLosses: record.divisionLosses || 0,
    conferenceWins: record.conferenceWins || 0,
    conferenceLosses: record.conferenceLosses || 0,
    isUserTeam: team.id === userTeamId,
    playoffSeed: team.playoffSeed || null,
  };
}

/**
 * Head-to-head record between two teams
 */
interface HeadToHeadRecord {
  wins: number;
  losses: number;
  ties: number;
}

/**
 * Builds a lookup map of head-to-head records from completed games.
 * Key format: "teamAId:teamBId" (both orderings stored for easy lookup)
 */
function buildHeadToHeadMap(completedGames: ScheduledGame[]): Map<string, HeadToHeadRecord> {
  const h2hMap = new Map<string, HeadToHeadRecord>();

  for (const game of completedGames) {
    if (!game.isComplete || game.homeScore === null || game.awayScore === null) continue;

    const homeId = game.homeTeamId;
    const awayId = game.awayTeamId;
    const key = `${homeId}:${awayId}`;
    const reverseKey = `${awayId}:${homeId}`;

    // Get or create records for both directions
    const homeRecord = h2hMap.get(key) ?? { wins: 0, losses: 0, ties: 0 };
    const awayRecord = h2hMap.get(reverseKey) ?? { wins: 0, losses: 0, ties: 0 };

    if (game.homeScore > game.awayScore) {
      homeRecord.wins++;
      awayRecord.losses++;
    } else if (game.awayScore > game.homeScore) {
      homeRecord.losses++;
      awayRecord.wins++;
    } else {
      homeRecord.ties++;
      awayRecord.ties++;
    }

    h2hMap.set(key, homeRecord);
    h2hMap.set(reverseKey, awayRecord);
  }

  return h2hMap;
}

/**
 * Gets the head-to-head win percentage of team A vs team B.
 * Returns null if they haven't played each other.
 */
function getH2HPct(
  h2hMap: Map<string, HeadToHeadRecord>,
  teamAId: string,
  teamBId: string
): number | null {
  const record = h2hMap.get(`${teamAId}:${teamBId}`);
  if (!record) return null;
  const total = record.wins + record.losses + record.ties;
  if (total === 0) return null;
  return (record.wins + record.ties * 0.5) / total;
}

/**
 * Sorts standings entries by record
 * Tiebreakers: PCT > Head-to-head > Division record > Conference record > Points diff
 */
function sortStandingsEntries(
  entries: StandingsEntry[],
  h2hMap?: Map<string, HeadToHeadRecord>
): StandingsEntry[] {
  return [...entries].sort((a, b) => {
    // 1. Win percentage
    if (a.pct !== b.pct) return b.pct - a.pct;

    // 2. Head-to-head record
    if (h2hMap) {
      const aH2H = getH2HPct(h2hMap, a.teamId, b.teamId);
      const bH2H = getH2HPct(h2hMap, b.teamId, a.teamId);
      if (aH2H !== null && bH2H !== null && aH2H !== bH2H) {
        return bH2H > aH2H ? 1 : -1;
      }
    }

    // 3. Division record (for same-division teams)
    if (a.division === b.division) {
      const aDivPct = calculatePct(a.divisionWins, a.divisionLosses, 0);
      const bDivPct = calculatePct(b.divisionWins, b.divisionLosses, 0);
      if (aDivPct !== bDivPct) return bDivPct - aDivPct;
    }

    // 4. Conference record
    const aConfPct = calculatePct(a.conferenceWins, a.conferenceLosses, 0);
    const bConfPct = calculatePct(b.conferenceWins, b.conferenceLosses, 0);
    if (aConfPct !== bConfPct) return bConfPct - aConfPct;

    // 5. Point differential
    return b.pointsDiff - a.pointsDiff;
  });
}

/**
 * Calculates full standings from teams
 * Optionally accepts completed games for head-to-head tiebreaker resolution
 */
export function calculateStandings(
  teams: Record<string, Team>,
  userTeamId: string,
  completedGames?: ScheduledGame[]
): {
  byDivision: Record<string, Record<string, StandingsEntry[]>>;
  byConference: Record<string, StandingsEntry[]>;
  all: StandingsEntry[];
} {
  const entries = Object.values(teams).map((team) => createStandingsEntry(team, userTeamId));
  const h2hMap = completedGames ? buildHeadToHeadMap(completedGames) : undefined;

  // Group by division
  const byDivision: Record<string, Record<string, StandingsEntry[]>> = {
    AFC: { North: [], South: [], East: [], West: [] },
    NFC: { North: [], South: [], East: [], West: [] },
  };

  for (const entry of entries) {
    if (byDivision[entry.conference]?.[entry.division]) {
      byDivision[entry.conference][entry.division].push(entry);
    }
  }

  // Sort each division
  for (const conf of Object.keys(byDivision)) {
    for (const div of Object.keys(byDivision[conf])) {
      byDivision[conf][div] = sortStandingsEntries(byDivision[conf][div], h2hMap);
    }
  }

  // Group by conference
  const byConference: Record<string, StandingsEntry[]> = {
    AFC: entries.filter((e) => e.conference === 'AFC'),
    NFC: entries.filter((e) => e.conference === 'NFC'),
  };

  // Sort conferences
  byConference.AFC = sortStandingsEntries(byConference.AFC, h2hMap);
  byConference.NFC = sortStandingsEntries(byConference.NFC, h2hMap);

  // All teams sorted
  const all = sortStandingsEntries(entries, h2hMap);

  return { byDivision, byConference, all };
}

/**
 * Updates division standings in League format from team data
 */
export function updateDivisionStandings(teams: Record<string, Team>): DivisionStandings {
  const teamArray = Object.values(teams);

  // Helper to get sorted team IDs for a division
  const getSortedDivisionTeams = (conf: string, div: string): string[] => {
    const divisionTeams = teamArray.filter((t) => t.conference === conf && t.division === div);
    // Sort by record
    divisionTeams.sort((a, b) => {
      const aPct = calculatePct(
        a.currentRecord.wins,
        a.currentRecord.losses,
        a.currentRecord.ties || 0
      );
      const bPct = calculatePct(
        b.currentRecord.wins,
        b.currentRecord.losses,
        b.currentRecord.ties || 0
      );
      if (aPct !== bPct) return bPct - aPct;
      // Tiebreaker: point differential
      const aDiff = a.currentRecord.pointsFor - a.currentRecord.pointsAgainst;
      const bDiff = b.currentRecord.pointsFor - b.currentRecord.pointsAgainst;
      return bDiff - aDiff;
    });
    return divisionTeams.map((t) => t.id);
  };

  return {
    afc: {
      north: getSortedDivisionTeams('AFC', 'North'),
      south: getSortedDivisionTeams('AFC', 'South'),
      east: getSortedDivisionTeams('AFC', 'East'),
      west: getSortedDivisionTeams('AFC', 'West'),
    },
    nfc: {
      north: getSortedDivisionTeams('NFC', 'North'),
      south: getSortedDivisionTeams('NFC', 'South'),
      east: getSortedDivisionTeams('NFC', 'East'),
      west: getSortedDivisionTeams('NFC', 'West'),
    },
  };
}

/**
 * Calculates playoff seeds for a conference
 * Returns team IDs in seed order (1-7)
 */
export function calculatePlayoffSeeds(
  teams: Record<string, Team>,
  conference: 'AFC' | 'NFC'
): string[] {
  const confTeams = Object.values(teams).filter((t) => t.conference === conference);

  // Group by division and sort
  const divisions: Record<string, Team[]> = { North: [], South: [], East: [], West: [] };
  for (const team of confTeams) {
    divisions[team.division].push(team);
  }

  // Sort each division
  for (const div of Object.keys(divisions)) {
    divisions[div].sort((a, b) => {
      const aPct = calculatePct(a.currentRecord.wins, a.currentRecord.losses, 0);
      const bPct = calculatePct(b.currentRecord.wins, b.currentRecord.losses, 0);
      if (aPct !== bPct) return bPct - aPct;
      const aDiff = a.currentRecord.pointsFor - a.currentRecord.pointsAgainst;
      const bDiff = b.currentRecord.pointsFor - b.currentRecord.pointsAgainst;
      return bDiff - aDiff;
    });
  }

  // Get division winners (seeds 1-4)
  const divisionWinners = Object.values(divisions)
    .map((d) => d[0])
    .filter(Boolean)
    .sort((a, b) => {
      const aPct = calculatePct(a.currentRecord.wins, a.currentRecord.losses, 0);
      const bPct = calculatePct(b.currentRecord.wins, b.currentRecord.losses, 0);
      if (aPct !== bPct) return bPct - aPct;
      const aDiff = a.currentRecord.pointsFor - a.currentRecord.pointsAgainst;
      const bDiff = b.currentRecord.pointsFor - b.currentRecord.pointsAgainst;
      return bDiff - aDiff;
    });

  // Get wild cards (seeds 5-7)
  const divisionWinnerIds = new Set(divisionWinners.map((t) => t.id));
  const nonWinners = confTeams
    .filter((t) => !divisionWinnerIds.has(t.id))
    .sort((a, b) => {
      const aPct = calculatePct(a.currentRecord.wins, a.currentRecord.losses, 0);
      const bPct = calculatePct(b.currentRecord.wins, b.currentRecord.losses, 0);
      if (aPct !== bPct) return bPct - aPct;
      const aDiff = a.currentRecord.pointsFor - a.currentRecord.pointsAgainst;
      const bDiff = b.currentRecord.pointsFor - b.currentRecord.pointsAgainst;
      return bDiff - aDiff;
    });

  const wildCards = nonWinners.slice(0, 3);

  // Combine: 4 division winners + 3 wild cards
  return [...divisionWinners, ...wildCards].map((t) => t.id);
}
