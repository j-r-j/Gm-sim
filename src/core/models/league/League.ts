/**
 * League Structure Model
 * Defines league calendar, settings, standings, and events
 */

/**
 * Season phases
 */
export type SeasonPhase = 'preseason' | 'regularSeason' | 'playoffs' | 'offseason';

/**
 * All season phases
 */
export const ALL_SEASON_PHASES: SeasonPhase[] = ['preseason', 'regularSeason', 'playoffs', 'offseason'];

/**
 * Season calendar tracking
 */
export interface SeasonCalendar {
  currentYear: number;
  currentWeek: number; // 1-18 regular, 19-22 playoffs
  currentPhase: SeasonPhase;
  offseasonPhase: number | null; // 1-12 if in offseason
}

/**
 * Offseason phase descriptions
 */
export const OFFSEASON_PHASES: Record<number, string> = {
  1: 'End of Season',
  2: 'Senior Bowl / Combine Prep',
  3: 'NFL Combine',
  4: 'Free Agency - Early',
  5: 'Free Agency - Mid',
  6: 'Pro Days',
  7: 'Pre-Draft Visits',
  8: 'NFL Draft',
  9: 'Post-Draft Signings',
  10: 'OTAs',
  11: 'Minicamp',
  12: 'Training Camp',
};

/**
 * Regular season weeks
 */
export const REGULAR_SEASON_WEEKS = 18;

/**
 * Playoff weeks (wild card through super bowl)
 */
export const PLAYOFF_WEEKS = 4;

/**
 * League settings
 */
export interface LeagueSettings {
  salaryCap: number;
  salaryFloor: number;
  rookiePoolTotal: number;
  franchiseTagMultipliers: Record<string, number>; // By position
  practiceSquadSize: number;
  activeRosterSize: number;
  irSlots: number;
}

/**
 * Default league settings
 */
export const DEFAULT_LEAGUE_SETTINGS: LeagueSettings = {
  salaryCap: 255000, // $255 million in thousands
  salaryFloor: 226950, // 89% of cap
  rookiePoolTotal: 12500, // ~$12.5 million
  franchiseTagMultipliers: {
    QB: 1.2,
    RB: 0.9,
    WR: 1.05,
    TE: 0.95,
    OL: 1.0,
    DL: 1.05,
    LB: 1.0,
    DB: 1.0,
    K: 0.8,
    P: 0.8,
  },
  practiceSquadSize: 16,
  activeRosterSize: 53,
  irSlots: 20,
};

/**
 * Playoff matchup result
 */
export interface PlayoffMatchup {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
}

/**
 * Playoff bracket structure
 */
export interface PlayoffBracket {
  afcSeeds: Record<number, string>; // Seed -> teamId
  nfcSeeds: Record<number, string>;
  wildCardResults: PlayoffMatchup[];
  divisionalResults: PlayoffMatchup[];
  conferenceResults: PlayoffMatchup[];
  superBowl: PlayoffMatchup | null;
}

/**
 * Division standings within each conference
 */
export interface ConferenceStandings {
  north: string[]; // TeamIds in order
  south: string[];
  east: string[];
  west: string[];
}

/**
 * Complete division standings
 */
export interface DivisionStandings {
  afc: ConferenceStandings;
  nfc: ConferenceStandings;
}

/**
 * Season summary for history
 */
export interface SeasonSummary {
  year: number;
  championTeamId: string;
  mvpPlayerId: string;
  draftOrder: string[]; // TeamIds
}

/**
 * League event types
 */
export type LeagueEventType = 'injury' | 'trade' | 'signing' | 'firing' | 'award' | 'other';

/**
 * A league event
 */
export interface LeagueEvent {
  id: string;
  type: LeagueEventType;
  week: number;
  description: string;
  involvedTeamIds: string[];
  involvedPlayerIds: string[];
}

/**
 * Complete league entity
 */
export interface League {
  id: string;
  name: string;

  // Teams
  teamIds: string[];

  // Calendar
  calendar: SeasonCalendar;

  // Settings
  settings: LeagueSettings;

  // Current season state
  standings: DivisionStandings;
  playoffBracket: PlayoffBracket | null;

  // History
  seasonHistory: SeasonSummary[];

  // Events
  upcomingEvents: LeagueEvent[];
}

/**
 * Creates empty division standings
 */
export function createEmptyStandings(): DivisionStandings {
  return {
    afc: {
      north: [],
      south: [],
      east: [],
      west: [],
    },
    nfc: {
      north: [],
      south: [],
      east: [],
      west: [],
    },
  };
}

/**
 * Creates a default season calendar
 */
export function createDefaultCalendar(year: number): SeasonCalendar {
  return {
    currentYear: year,
    currentWeek: 1,
    currentPhase: 'preseason',
    offseasonPhase: null,
  };
}

/**
 * Creates an empty playoff bracket
 */
export function createEmptyPlayoffBracket(): PlayoffBracket {
  return {
    afcSeeds: {},
    nfcSeeds: {},
    wildCardResults: [],
    divisionalResults: [],
    conferenceResults: [],
    superBowl: null,
  };
}

/**
 * Validates a season calendar
 */
export function validateSeasonCalendar(calendar: SeasonCalendar): boolean {
  if (calendar.currentYear < 2000 || calendar.currentYear > 2100) return false;
  if (calendar.currentWeek < 1 || calendar.currentWeek > 22) return false;
  if (!ALL_SEASON_PHASES.includes(calendar.currentPhase)) return false;

  // Offseason phase validation
  if (calendar.currentPhase === 'offseason') {
    if (calendar.offseasonPhase === null) return false;
    if (calendar.offseasonPhase < 1 || calendar.offseasonPhase > 12) return false;
  } else {
    if (calendar.offseasonPhase !== null) return false;
  }

  return true;
}

/**
 * Validates league settings
 */
export function validateLeagueSettings(settings: LeagueSettings): boolean {
  if (settings.salaryCap < 0) return false;
  if (settings.salaryFloor < 0 || settings.salaryFloor > settings.salaryCap) return false;
  if (settings.rookiePoolTotal < 0) return false;
  if (settings.practiceSquadSize < 0 || settings.practiceSquadSize > 30) return false;
  if (settings.activeRosterSize < 45 || settings.activeRosterSize > 60) return false;
  if (settings.irSlots < 0 || settings.irSlots > 30) return false;

  return true;
}

/**
 * Validates a playoff matchup
 */
export function validatePlayoffMatchup(matchup: PlayoffMatchup): boolean {
  if (!matchup.homeTeamId || typeof matchup.homeTeamId !== 'string') return false;
  if (!matchup.awayTeamId || typeof matchup.awayTeamId !== 'string') return false;

  // Scores and winner are optional (game not played yet)
  if (matchup.homeScore !== null && matchup.homeScore < 0) return false;
  if (matchup.awayScore !== null && matchup.awayScore < 0) return false;

  // If winner is set, must match a team and have scores
  if (matchup.winnerId !== null) {
    if (matchup.winnerId !== matchup.homeTeamId && matchup.winnerId !== matchup.awayTeamId) {
      return false;
    }
    if (matchup.homeScore === null || matchup.awayScore === null) return false;
  }

  return true;
}

/**
 * Validates a league event
 */
export function validateLeagueEvent(event: LeagueEvent): boolean {
  if (!event.id || typeof event.id !== 'string') return false;
  if (!['injury', 'trade', 'signing', 'firing', 'award', 'other'].includes(event.type)) return false;
  if (typeof event.week !== 'number' || event.week < 0) return false;
  if (!event.description || typeof event.description !== 'string') return false;
  if (!Array.isArray(event.involvedTeamIds)) return false;
  if (!Array.isArray(event.involvedPlayerIds)) return false;

  return true;
}

/**
 * Validates a complete league
 */
export function validateLeague(league: League): boolean {
  if (!league.id || typeof league.id !== 'string') return false;
  if (!league.name || typeof league.name !== 'string') return false;

  // Teams
  if (!Array.isArray(league.teamIds)) return false;
  if (league.teamIds.length !== 32) return false;

  // Calendar
  if (!validateSeasonCalendar(league.calendar)) return false;

  // Settings
  if (!validateLeagueSettings(league.settings)) return false;

  // Playoff bracket validation (if exists)
  if (league.playoffBracket !== null) {
    for (const matchup of league.playoffBracket.wildCardResults) {
      if (!validatePlayoffMatchup(matchup)) return false;
    }
    for (const matchup of league.playoffBracket.divisionalResults) {
      if (!validatePlayoffMatchup(matchup)) return false;
    }
    for (const matchup of league.playoffBracket.conferenceResults) {
      if (!validatePlayoffMatchup(matchup)) return false;
    }
    if (league.playoffBracket.superBowl !== null) {
      if (!validatePlayoffMatchup(league.playoffBracket.superBowl)) return false;
    }
  }

  // Events
  if (!Array.isArray(league.upcomingEvents)) return false;
  for (const event of league.upcomingEvents) {
    if (!validateLeagueEvent(event)) return false;
  }

  // History
  if (!Array.isArray(league.seasonHistory)) return false;

  return true;
}

/**
 * Creates a default league
 */
export function createDefaultLeague(id: string, teamIds: string[], year: number): League {
  return {
    id,
    name: 'National Football League',
    teamIds,
    calendar: createDefaultCalendar(year),
    settings: { ...DEFAULT_LEAGUE_SETTINGS },
    standings: createEmptyStandings(),
    playoffBracket: null,
    seasonHistory: [],
    upcomingEvents: [],
  };
}

/**
 * Advances the calendar by one week
 */
export function advanceWeek(calendar: SeasonCalendar): SeasonCalendar {
  const newWeek = calendar.currentWeek + 1;

  // Check for phase transitions
  if (calendar.currentPhase === 'regularSeason' && newWeek > REGULAR_SEASON_WEEKS) {
    return {
      ...calendar,
      currentWeek: REGULAR_SEASON_WEEKS + 1,
      currentPhase: 'playoffs',
    };
  }

  if (calendar.currentPhase === 'playoffs' && newWeek > REGULAR_SEASON_WEEKS + PLAYOFF_WEEKS) {
    return {
      ...calendar,
      currentWeek: 1,
      currentPhase: 'offseason',
      offseasonPhase: 1,
    };
  }

  return {
    ...calendar,
    currentWeek: newWeek,
  };
}

/**
 * Advances to the next offseason phase
 */
export function advanceOffseasonPhase(calendar: SeasonCalendar): SeasonCalendar {
  if (calendar.currentPhase !== 'offseason' || calendar.offseasonPhase === null) {
    throw new Error('Not in offseason');
  }

  const newPhase = calendar.offseasonPhase + 1;

  // Check for transition to preseason
  if (newPhase > 12) {
    return {
      currentYear: calendar.currentYear + 1,
      currentWeek: 1,
      currentPhase: 'preseason',
      offseasonPhase: null,
    };
  }

  return {
    ...calendar,
    offseasonPhase: newPhase,
  };
}

/**
 * Gets the current phase description
 */
export function getPhaseDescription(calendar: SeasonCalendar): string {
  if (calendar.currentPhase === 'offseason' && calendar.offseasonPhase !== null) {
    return OFFSEASON_PHASES[calendar.offseasonPhase] || 'Offseason';
  }

  const descriptions: Record<SeasonPhase, string> = {
    preseason: `Preseason Week ${calendar.currentWeek}`,
    regularSeason: `Week ${calendar.currentWeek}`,
    playoffs: getPlayoffWeekDescription(calendar.currentWeek),
    offseason: 'Offseason',
  };

  return descriptions[calendar.currentPhase];
}

/**
 * Gets playoff week description
 */
function getPlayoffWeekDescription(week: number): string {
  const playoffWeek = week - REGULAR_SEASON_WEEKS;
  switch (playoffWeek) {
    case 1:
      return 'Wild Card Round';
    case 2:
      return 'Divisional Round';
    case 3:
      return 'Conference Championships';
    case 4:
      return 'Super Bowl';
    default:
      return 'Playoffs';
  }
}

/**
 * Adds an event to the league
 */
export function addLeagueEvent(league: League, event: LeagueEvent): League {
  return {
    ...league,
    upcomingEvents: [...league.upcomingEvents, event],
  };
}

/**
 * Clears events from a completed week
 */
export function clearWeekEvents(league: League, week: number): League {
  return {
    ...league,
    upcomingEvents: league.upcomingEvents.filter((e) => e.week !== week),
  };
}
