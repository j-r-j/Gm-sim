/**
 * Standings Calculator
 * Calculates standings with full NFL tiebreaker procedures
 *
 * NFL Tiebreaker Order (Division):
 * 1. Head-to-head record
 * 2. Division record
 * 3. Common games record
 * 4. Conference record
 * 5. Strength of victory
 * 6. Strength of schedule
 * 7. Points differential (conference)
 * 8. Points differential (all)
 * 9. Net touchdowns
 * 10. Coin flip
 *
 * Wild Card Tiebreakers are similar but apply to teams from different divisions
 */

import { Team } from '../models/team/Team';
import { Conference, Division, ALL_DIVISIONS } from '../models/team/FakeCities';
import { ScheduledGame } from './ScheduleGenerator';

/**
 * Head-to-head record against a specific team
 */
export interface HeadToHeadRecord {
  wins: number;
  losses: number;
  ties: number;
}

/**
 * Complete team standing with tiebreaker components
 */
export interface TeamStanding {
  teamId: string;
  conference: Conference;
  division: Division;

  // Win-loss record
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;

  // Tiebreaker components
  divisionWins: number;
  divisionLosses: number;
  divisionTies: number;
  conferenceWins: number;
  conferenceLosses: number;
  conferenceTies: number;

  // Points
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;

  // Head-to-head records
  headToHead: Map<string, HeadToHeadRecord>;

  // Strength of victory/schedule (calculated lazily)
  strengthOfVictory: number;
  strengthOfSchedule: number;

  // Net touchdowns (approximated from point differential)
  netTouchdowns: number;

  // Rankings
  divisionRank: number;
  conferenceRank: number;
  playoffPosition: 'division_leader' | 'wildcard' | 'in_hunt' | 'eliminated';

  // Streak
  currentStreak: number; // Positive = win streak, negative = loss streak

  // Games behind leader (for display)
  gamesBehind: number;
}

/**
 * Conference standings
 */
export interface ConferenceStandingsList {
  north: TeamStanding[];
  south: TeamStanding[];
  east: TeamStanding[];
  west: TeamStanding[];
}

/**
 * Complete division standings
 */
export interface DetailedDivisionStandings {
  afc: ConferenceStandingsList;
  nfc: ConferenceStandingsList;
}

/**
 * Playoff team determination result
 */
export interface PlayoffTeams {
  afc: {
    divisionWinners: string[];
    wildCards: string[];
  };
  nfc: {
    divisionWinners: string[];
    wildCards: string[];
  };
}

/**
 * Calculates win percentage
 */
function calculateWinPercentage(wins: number, losses: number, ties: number): number {
  const totalGames = wins + losses + ties;
  if (totalGames === 0) return 0;
  return (wins + ties * 0.5) / totalGames;
}

/**
 * Creates an empty standing for a team
 */
function createEmptyStanding(team: Team): TeamStanding {
  return {
    teamId: team.id,
    conference: team.conference,
    division: team.division,
    wins: 0,
    losses: 0,
    ties: 0,
    winPercentage: 0,
    divisionWins: 0,
    divisionLosses: 0,
    divisionTies: 0,
    conferenceWins: 0,
    conferenceLosses: 0,
    conferenceTies: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDifferential: 0,
    headToHead: new Map(),
    strengthOfVictory: 0,
    strengthOfSchedule: 0,
    netTouchdowns: 0,
    divisionRank: 0,
    conferenceRank: 0,
    playoffPosition: 'in_hunt',
    currentStreak: 0,
    gamesBehind: 0,
  };
}

/**
 * Processes a game result and updates standings
 */
function processGame(
  standing: TeamStanding,
  game: ScheduledGame,
  allTeams: Map<string, Team>
): TeamStanding {
  if (!game.isComplete || game.homeScore === null || game.awayScore === null) {
    return standing;
  }

  const isHome = game.homeTeamId === standing.teamId;
  const ownScore = isHome ? game.homeScore : game.awayScore;
  const oppScore = isHome ? game.awayScore : game.homeScore;
  const opponentId = isHome ? game.awayTeamId : game.homeTeamId;

  const opponent = allTeams.get(opponentId);
  if (!opponent) return standing;

  const isDivisional = game.isDivisional;
  const isConference = game.isConference;

  const isWin = ownScore > oppScore;
  const isLoss = ownScore < oppScore;
  const isTie = ownScore === oppScore;

  // Update head-to-head
  const h2h = standing.headToHead.get(opponentId) || { wins: 0, losses: 0, ties: 0 };
  if (isWin) h2h.wins++;
  else if (isLoss) h2h.losses++;
  else h2h.ties++;

  const updatedH2H = new Map(standing.headToHead);
  updatedH2H.set(opponentId, h2h);

  // Calculate new streak
  let newStreak = standing.currentStreak;
  if (isWin) {
    newStreak = standing.currentStreak > 0 ? standing.currentStreak + 1 : 1;
  } else if (isLoss) {
    newStreak = standing.currentStreak < 0 ? standing.currentStreak - 1 : -1;
  } else {
    newStreak = 0;
  }

  return {
    ...standing,
    wins: standing.wins + (isWin ? 1 : 0),
    losses: standing.losses + (isLoss ? 1 : 0),
    ties: standing.ties + (isTie ? 1 : 0),
    divisionWins: standing.divisionWins + (isDivisional && isWin ? 1 : 0),
    divisionLosses: standing.divisionLosses + (isDivisional && isLoss ? 1 : 0),
    divisionTies: standing.divisionTies + (isDivisional && isTie ? 1 : 0),
    conferenceWins: standing.conferenceWins + (isConference && isWin ? 1 : 0),
    conferenceLosses: standing.conferenceLosses + (isConference && isLoss ? 1 : 0),
    conferenceTies: standing.conferenceTies + (isConference && isTie ? 1 : 0),
    pointsFor: standing.pointsFor + ownScore,
    pointsAgainst: standing.pointsAgainst + oppScore,
    pointDifferential: standing.pointDifferential + (ownScore - oppScore),
    headToHead: updatedH2H,
    netTouchdowns: Math.round(
      (standing.pointDifferential + (ownScore - oppScore)) / 7
    ),
    currentStreak: newStreak,
    winPercentage: calculateWinPercentage(
      standing.wins + (isWin ? 1 : 0),
      standing.losses + (isLoss ? 1 : 0),
      standing.ties + (isTie ? 1 : 0)
    ),
  };
}

/**
 * Calculates strength of victory (winning percentage of opponents beaten)
 */
function calculateStrengthOfVictory(
  standing: TeamStanding,
  allStandings: Map<string, TeamStanding>
): number {
  let totalWins = 0;
  let totalLosses = 0;
  let totalTies = 0;

  for (const [opponentId, h2h] of standing.headToHead) {
    if (h2h.wins > 0) {
      const oppStanding = allStandings.get(opponentId);
      if (oppStanding) {
        totalWins += oppStanding.wins;
        totalLosses += oppStanding.losses;
        totalTies += oppStanding.ties;
      }
    }
  }

  return calculateWinPercentage(totalWins, totalLosses, totalTies);
}

/**
 * Calculates strength of schedule (winning percentage of all opponents)
 */
function calculateStrengthOfSchedule(
  standing: TeamStanding,
  allStandings: Map<string, TeamStanding>
): number {
  let totalWins = 0;
  let totalLosses = 0;
  let totalTies = 0;

  for (const opponentId of standing.headToHead.keys()) {
    const oppStanding = allStandings.get(opponentId);
    if (oppStanding) {
      totalWins += oppStanding.wins;
      totalLosses += oppStanding.losses;
      totalTies += oppStanding.ties;
    }
  }

  return calculateWinPercentage(totalWins, totalLosses, totalTies);
}

/**
 * Compares two teams using head-to-head record
 */
function compareHeadToHead(a: TeamStanding, b: TeamStanding): number {
  const aRecord = a.headToHead.get(b.teamId);
  const bRecord = b.headToHead.get(a.teamId);

  if (!aRecord || !bRecord) return 0;

  const aWinPct = calculateWinPercentage(aRecord.wins, aRecord.losses, aRecord.ties);
  const bWinPct = calculateWinPercentage(bRecord.wins, bRecord.losses, bRecord.ties);

  return bWinPct - aWinPct;
}

/**
 * Compares division record
 */
function compareDivisionRecord(a: TeamStanding, b: TeamStanding): number {
  const aWinPct = calculateWinPercentage(
    a.divisionWins,
    a.divisionLosses,
    a.divisionTies
  );
  const bWinPct = calculateWinPercentage(
    b.divisionWins,
    b.divisionLosses,
    b.divisionTies
  );
  return bWinPct - aWinPct;
}

/**
 * Compares conference record
 */
function compareConferenceRecord(a: TeamStanding, b: TeamStanding): number {
  const aWinPct = calculateWinPercentage(
    a.conferenceWins,
    a.conferenceLosses,
    a.conferenceTies
  );
  const bWinPct = calculateWinPercentage(
    b.conferenceWins,
    b.conferenceLosses,
    b.conferenceTies
  );
  return bWinPct - aWinPct;
}

/**
 * Resolves tiebreakers for teams in the same division
 */
function resolveDivisionTiebreaker(teams: TeamStanding[]): TeamStanding[] {
  return [...teams].sort((a, b) => {
    // 1. Win percentage
    if (a.winPercentage !== b.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }

    // 2. Head-to-head
    const h2h = compareHeadToHead(a, b);
    if (h2h !== 0) return h2h;

    // 3. Division record
    const divRecord = compareDivisionRecord(a, b);
    if (divRecord !== 0) return divRecord;

    // 4. Conference record
    const confRecord = compareConferenceRecord(a, b);
    if (confRecord !== 0) return confRecord;

    // 5. Strength of victory
    if (a.strengthOfVictory !== b.strengthOfVictory) {
      return b.strengthOfVictory - a.strengthOfVictory;
    }

    // 6. Strength of schedule
    if (a.strengthOfSchedule !== b.strengthOfSchedule) {
      return b.strengthOfSchedule - a.strengthOfSchedule;
    }

    // 7. Points differential
    if (a.pointDifferential !== b.pointDifferential) {
      return b.pointDifferential - a.pointDifferential;
    }

    // 8. Net touchdowns
    if (a.netTouchdowns !== b.netTouchdowns) {
      return b.netTouchdowns - a.netTouchdowns;
    }

    // 9. Coin flip (use team ID for determinism)
    return a.teamId.localeCompare(b.teamId);
  });
}

/**
 * Resolves tiebreakers for wild card teams (different divisions)
 */
export function resolveWildcardTiebreaker(teams: TeamStanding[]): TeamStanding[] {
  return [...teams].sort((a, b) => {
    // 1. Win percentage
    if (a.winPercentage !== b.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }

    // 2. Head-to-head (if they played)
    const h2h = compareHeadToHead(a, b);
    if (h2h !== 0) return h2h;

    // 3. Conference record
    const confRecord = compareConferenceRecord(a, b);
    if (confRecord !== 0) return confRecord;

    // 4. Strength of victory
    if (a.strengthOfVictory !== b.strengthOfVictory) {
      return b.strengthOfVictory - a.strengthOfVictory;
    }

    // 5. Strength of schedule
    if (a.strengthOfSchedule !== b.strengthOfSchedule) {
      return b.strengthOfSchedule - a.strengthOfSchedule;
    }

    // 6. Points differential (conference)
    // For simplicity, use total point differential
    if (a.pointDifferential !== b.pointDifferential) {
      return b.pointDifferential - a.pointDifferential;
    }

    // 7. Net touchdowns
    if (a.netTouchdowns !== b.netTouchdowns) {
      return b.netTouchdowns - a.netTouchdowns;
    }

    // 8. Coin flip
    return a.teamId.localeCompare(b.teamId);
  });
}

/**
 * Calculates standings after each week
 *
 * @param games - All games played so far
 * @param teams - Array of all 32 teams
 * @returns Complete division standings
 */
export function calculateStandings(
  games: ScheduledGame[],
  teams: Team[]
): DetailedDivisionStandings {
  const teamMap = new Map<string, Team>();
  for (const team of teams) {
    teamMap.set(team.id, team);
  }

  // Initialize standings
  const standingsMap = new Map<string, TeamStanding>();
  for (const team of teams) {
    standingsMap.set(team.id, createEmptyStanding(team));
  }

  // Process all completed games
  for (const game of games) {
    if (!game.isComplete) continue;

    // Update home team
    const homeStanding = standingsMap.get(game.homeTeamId);
    if (homeStanding) {
      standingsMap.set(
        game.homeTeamId,
        processGame(homeStanding, game, teamMap)
      );
    }

    // Update away team
    const awayStanding = standingsMap.get(game.awayTeamId);
    if (awayStanding) {
      standingsMap.set(
        game.awayTeamId,
        processGame(awayStanding, game, teamMap)
      );
    }
  }

  // Calculate strength of victory/schedule
  for (const standing of standingsMap.values()) {
    standing.strengthOfVictory = calculateStrengthOfVictory(standing, standingsMap);
    standing.strengthOfSchedule = calculateStrengthOfSchedule(standing, standingsMap);
  }

  // Group by division and sort
  const standings: DetailedDivisionStandings = {
    afc: { north: [], south: [], east: [], west: [] },
    nfc: { north: [], south: [], east: [], west: [] },
  };

  for (const standing of standingsMap.values()) {
    const confKey = standing.conference.toLowerCase() as 'afc' | 'nfc';
    const divKey = standing.division.toLowerCase() as 'north' | 'south' | 'east' | 'west';
    standings[confKey][divKey].push(standing);
  }

  // Sort each division and assign ranks
  for (const conference of ['afc', 'nfc'] as const) {
    for (const division of ['north', 'south', 'east', 'west'] as const) {
      const sorted = resolveDivisionTiebreaker(standings[conference][division]);

      // Assign division ranks and games behind
      const leaderWinPct = sorted[0]?.winPercentage || 0;
      sorted.forEach((standing, index) => {
        standing.divisionRank = index + 1;
        const gamesPlayed =
          standing.wins + standing.losses + standing.ties;
        const leaderGamesPlayed =
          (sorted[0]?.wins || 0) +
          (sorted[0]?.losses || 0) +
          (sorted[0]?.ties || 0);
        const avgGamesPlayed = (gamesPlayed + leaderGamesPlayed) / 2;
        standing.gamesBehind = Math.max(
          0,
          (leaderWinPct - standing.winPercentage) * avgGamesPlayed
        );
      });

      standings[conference][division] = sorted;
    }
  }

  // Calculate conference ranks and playoff positions
  updateConferenceRanks(standings.afc);
  updateConferenceRanks(standings.nfc);

  return standings;
}

/**
 * Updates conference ranks and playoff positions
 */
function updateConferenceRanks(conference: ConferenceStandingsList): void {
  // Get division winners
  const divisionWinners: TeamStanding[] = [];
  for (const division of ['north', 'south', 'east', 'west'] as const) {
    if (conference[division].length > 0) {
      const winner = conference[division][0];
      winner.playoffPosition = 'division_leader';
      divisionWinners.push(winner);
    }
  }

  // Sort division winners by record
  const sortedWinners = resolveWildcardTiebreaker(divisionWinners);
  sortedWinners.forEach((standing, index) => {
    standing.conferenceRank = index + 1;
  });

  // Get non-winners and sort for wild card
  const nonWinners: TeamStanding[] = [];
  for (const division of ['north', 'south', 'east', 'west'] as const) {
    for (let i = 1; i < conference[division].length; i++) {
      nonWinners.push(conference[division][i]);
    }
  }

  const sortedNonWinners = resolveWildcardTiebreaker(nonWinners);
  sortedNonWinners.forEach((standing, index) => {
    standing.conferenceRank = 5 + index;
    if (index < 3) {
      standing.playoffPosition = 'wildcard';
    } else {
      standing.playoffPosition = 'in_hunt';
    }
  });
}

/**
 * Determines playoff teams from standings
 *
 * @param standings - Complete division standings
 * @returns Playoff teams for each conference
 */
export function determinePlayoffTeams(
  standings: DetailedDivisionStandings
): PlayoffTeams {
  const result: PlayoffTeams = {
    afc: { divisionWinners: [], wildCards: [] },
    nfc: { divisionWinners: [], wildCards: [] },
  };

  for (const conference of ['afc', 'nfc'] as const) {
    const confStandings = standings[conference];

    // Get division winners
    const winners: TeamStanding[] = [];
    for (const division of ['north', 'south', 'east', 'west'] as const) {
      if (confStandings[division].length > 0) {
        winners.push(confStandings[division][0]);
      }
    }

    // Sort division winners
    const sortedWinners = resolveWildcardTiebreaker(winners);
    result[conference].divisionWinners = sortedWinners.map((s) => s.teamId);

    // Get non-winners for wild card
    const nonWinners: TeamStanding[] = [];
    for (const division of ['north', 'south', 'east', 'west'] as const) {
      for (let i = 1; i < confStandings[division].length; i++) {
        nonWinners.push(confStandings[division][i]);
      }
    }

    // Sort and take top 3
    const sortedNonWinners = resolveWildcardTiebreaker(nonWinners);
    result[conference].wildCards = sortedNonWinners
      .slice(0, 3)
      .map((s) => s.teamId);
  }

  return result;
}

/**
 * Gets all playoff-bound teams in seed order
 *
 * @param standings - Complete division standings
 * @param conference - The conference
 * @returns Array of team IDs in seed order (1-7)
 */
export function getPlayoffSeeds(
  standings: DetailedDivisionStandings,
  conference: 'afc' | 'nfc'
): string[] {
  const playoffTeams = determinePlayoffTeams(standings);
  return [
    ...playoffTeams[conference].divisionWinners,
    ...playoffTeams[conference].wildCards,
  ];
}

/**
 * Gets a team's standing
 */
export function getTeamStanding(
  standings: DetailedDivisionStandings,
  teamId: string
): TeamStanding | undefined {
  for (const conference of ['afc', 'nfc'] as const) {
    for (const division of ['north', 'south', 'east', 'west'] as const) {
      const found = standings[conference][division].find(
        (s) => s.teamId === teamId
      );
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Formats a standing for display
 */
export function formatStandingRecord(standing: TeamStanding): string {
  if (standing.ties > 0) {
    return `${standing.wins}-${standing.losses}-${standing.ties}`;
  }
  return `${standing.wins}-${standing.losses}`;
}

/**
 * Gets playoff picture summary for a conference
 */
export function getPlayoffPicture(
  standings: DetailedDivisionStandings,
  conference: 'afc' | 'nfc'
): TeamStanding[] {
  const allTeams: TeamStanding[] = [];

  for (const division of ['north', 'south', 'east', 'west'] as const) {
    allTeams.push(...standings[conference][division]);
  }

  // Sort by conference rank
  return allTeams.sort((a, b) => a.conferenceRank - b.conferenceRank);
}
