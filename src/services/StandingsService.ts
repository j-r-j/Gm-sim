/**
 * Standings Service
 * Calculates and updates league standings from team records
 */

import { Team } from '../core/models/team/Team';
import { DivisionStandings } from '../core/models/league/League';

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
 * Sorts standings entries by record
 * Basic tiebreakers: PCT > Head-to-head (not implemented) > Division record > Points diff
 */
function sortStandingsEntries(entries: StandingsEntry[]): StandingsEntry[] {
  return [...entries].sort((a, b) => {
    // 1. Win percentage
    if (a.pct !== b.pct) return b.pct - a.pct;

    // 2. Division record (for same-division teams)
    if (a.division === b.division) {
      const aDivPct = calculatePct(a.divisionWins, a.divisionLosses, 0);
      const bDivPct = calculatePct(b.divisionWins, b.divisionLosses, 0);
      if (aDivPct !== bDivPct) return bDivPct - aDivPct;
    }

    // 3. Conference record
    const aConfPct = calculatePct(a.conferenceWins, a.conferenceLosses, 0);
    const bConfPct = calculatePct(b.conferenceWins, b.conferenceLosses, 0);
    if (aConfPct !== bConfPct) return bConfPct - aConfPct;

    // 4. Point differential
    return b.pointsDiff - a.pointsDiff;
  });
}

/**
 * Calculates full standings from teams
 */
export function calculateStandings(
  teams: Record<string, Team>,
  userTeamId: string
): {
  byDivision: Record<string, Record<string, StandingsEntry[]>>;
  byConference: Record<string, StandingsEntry[]>;
  all: StandingsEntry[];
} {
  const entries = Object.values(teams).map((team) =>
    createStandingsEntry(team, userTeamId)
  );

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
      byDivision[conf][div] = sortStandingsEntries(byDivision[conf][div]);
    }
  }

  // Group by conference
  const byConference: Record<string, StandingsEntry[]> = {
    AFC: entries.filter((e) => e.conference === 'AFC'),
    NFC: entries.filter((e) => e.conference === 'NFC'),
  };

  // Sort conferences
  byConference.AFC = sortStandingsEntries(byConference.AFC);
  byConference.NFC = sortStandingsEntries(byConference.NFC);

  // All teams sorted
  const all = sortStandingsEntries(entries);

  return { byDivision, byConference, all };
}

/**
 * Updates division standings in League format from team data
 */
export function updateDivisionStandings(
  teams: Record<string, Team>
): DivisionStandings {
  const teamArray = Object.values(teams);

  // Helper to get sorted team IDs for a division
  const getSortedDivisionTeams = (conf: string, div: string): string[] => {
    const divisionTeams = teamArray.filter(
      (t) => t.conference === conf && t.division === div
    );
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
  const confTeams = Object.values(teams).filter(
    (t) => t.conference === conference
  );

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
