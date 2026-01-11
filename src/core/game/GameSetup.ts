/**
 * Game Setup
 * Handles pre-game setup including weather generation, home field advantage,
 * lineup selection, and team game state creation.
 */

import { Team } from '../models/team/Team';
import { Player } from '../models/player/Player';
import { Coach } from '../models/staff/Coach';
import { Stadium, STADIUM_WEATHER_EXPOSURE, StadiumType } from '../models/team/Stadium';
import {
  TeamGameState,
  OffensivePersonnel,
  DefensivePersonnel,
  SpecialTeamsPersonnel,
  GameCoachingStaff,
} from '../engine/TeamGameState';
import { WeatherCondition, GameStakes } from '../engine/EffectiveRatingCalculator';
import { calculateWeeklyVariance } from '../engine/WeeklyVarianceCalculator';
import { OffensiveScheme, DefensiveScheme } from '../models/player/SchemeFit';
import {
  OffensiveTendencies,
  DefensiveTendencies,
  createDefaultOffensiveTendencies,
  createDefaultDefensiveTendencies,
} from '../models/staff/CoordinatorTendencies';
import { Position } from '../models/player/Position';

/**
 * Game configuration
 */
export interface GameConfig {
  homeTeamId: string;
  awayTeamId: string;
  week: number;
  isPlayoff: boolean;
  playoffRound?: 'wildCard' | 'divisional' | 'conference' | 'superBowl';
}

/**
 * Lineup by position
 */
export interface StartingLineup {
  offense: {
    qb: Player;
    rb: Player[];
    wr: Player[];
    te: Player[];
    lt: Player;
    lg: Player;
    c: Player;
    rg: Player;
    rt: Player;
  };
  defense: {
    de: Player[];
    dt: Player[];
    olb: Player[];
    ilb: Player[];
    cb: Player[];
    fs: Player;
    ss: Player;
  };
  specialTeams: {
    k: Player;
    p: Player;
    returner: Player;
  };
}

/**
 * Complete game setup result
 */
export interface GameSetupResult {
  homeTeamState: TeamGameState;
  awayTeamState: TeamGameState;
  weather: WeatherCondition;
  stakes: GameStakes;
  homeFieldAdvantage: number;
}

/**
 * Get month from NFL week number
 */
function getMonthFromWeek(week: number): number {
  // NFL season typically runs September-February
  // Week 1 = early September (month 9)
  if (week <= 4) return 9; // September
  if (week <= 8) return 10; // October
  if (week <= 13) return 11; // November
  if (week <= 17) return 12; // December
  return 1; // January (playoffs)
}

/**
 * Get base temperature for a location and month
 */
function getBaseTemperature(latitude: number, month: number, stadiumType: StadiumType): number {
  // Domes have controlled temperature
  if (stadiumType === 'domeFixed' || stadiumType === 'domeRetractable') {
    return 72;
  }

  // Simplified temperature model based on latitude and month
  // Higher latitude = colder, later months = colder
  const baseTemp = 70;
  const latitudeEffect = (latitude - 35) * 0.5; // Colder as you go north
  const monthEffect = month >= 9 ? (month - 8) * 5 : (month + 4) * 5; // Gets colder through season

  return Math.round(baseTemp - latitudeEffect - monthEffect);
}

/**
 * Generate weather based on stadium and week
 */
export function generateWeather(stadium: Stadium, week: number): WeatherCondition {
  const month = getMonthFromWeek(week);
  const exposure = STADIUM_WEATHER_EXPOSURE[stadium.type];

  // Domes have perfect conditions
  if (exposure === 'none') {
    return {
      temperature: 72,
      precipitation: 'none',
      wind: 0,
      isDome: true,
    };
  }

  // Calculate base temperature
  const baseTemp = getBaseTemperature(stadium.latitude, month, stadium.type);

  // Add some randomness (+/- 15 degrees)
  const tempVariance = Math.floor(Math.random() * 30) - 15;
  const temperature = baseTemp + tempVariance;

  // Determine precipitation
  let precipitation: 'none' | 'rain' | 'snow' = 'none';
  const precipChance = Math.random();

  if (precipChance < 0.2) {
    // 20% chance of precipitation
    if (temperature < 32) {
      precipitation = 'snow';
    } else {
      precipitation = 'rain';
    }
  }

  // Minimal exposure typically means retractable roof closes in bad weather
  if (exposure === 'minimal' && (precipitation !== 'none' || temperature < 50)) {
    return {
      temperature: 72,
      precipitation: 'none',
      wind: 0,
      isDome: true,
    };
  }

  // Generate wind
  let wind = Math.floor(Math.random() * 15); // 0-15 mph typical

  // Higher chance of strong wind in outdoor cold stadiums
  if (stadium.type === 'outdoorCold' && Math.random() < 0.3) {
    wind = Math.floor(Math.random() * 15) + 10; // 10-25 mph
  }

  return {
    temperature,
    precipitation,
    wind,
    isDome: false,
  };
}

/**
 * Calculate home field advantage
 */
export function calculateHomeFieldAdvantage(
  stadium: Stadium,
  week: number,
  stakes: GameStakes
): number {
  // Base advantage (in points equivalent)
  let advantage = 2.5;

  // Noise and intimidation factors
  advantage += stadium.noiseFactor * 0.05;
  advantage += stadium.intimidationFactor * 0.04;

  // Cold weather stadiums have extra advantage late in season
  if (stadium.type === 'outdoorCold' && week > 12) {
    advantage += 0.5;
  }

  // High elevation advantage
  if (stadium.elevation > 5000) {
    advantage += 0.3;
  }

  // Playoff games have slightly reduced home advantage (road teams more prepared)
  if (stakes === 'playoff' || stakes === 'championship') {
    advantage *= 0.9;
  }

  return Math.round(advantage * 10) / 10;
}

/**
 * Determine game stakes from config
 */
export function determineGameStakes(config: GameConfig): GameStakes {
  if (config.isPlayoff) {
    if (config.playoffRound === 'superBowl') {
      return 'championship';
    }
    return 'playoff';
  }

  // Late season games have higher stakes
  if (config.week >= 15) {
    return 'rivalry'; // Use rivalry as "high stakes regular season"
  }

  return 'regular';
}

/**
 * Get players by position from roster
 */
function getPlayersByPosition(
  players: Map<string, Player>,
  rosterIds: string[],
  position: Position,
  injuredIds: string[]
): Player[] {
  return rosterIds
    .filter((id) => !injuredIds.includes(id))
    .map((id) => players.get(id))
    .filter((p): p is Player => p !== undefined && p.position === position)
    .sort((a, b) => {
      // Sort by role fit (starters first)
      const roleOrder: Record<string, number> = {
        franchiseCornerstone: 0,
        highEndStarter: 1,
        solidStarter: 2,
        qualityRotational: 3,
        specialist: 4,
        depth: 5,
        practiceSquad: 6,
      };
      return (
        (roleOrder[a.roleFit.currentRole] ?? 6) - (roleOrder[b.roleFit.currentRole] ?? 6)
      );
    });
}

/**
 * Select starting lineup from roster
 */
export function selectStartingLineup(
  team: Team,
  players: Map<string, Player>,
  injuredPlayerIds: string[]
): StartingLineup {
  const rosterIds = team.rosterPlayerIds;

  // Get available players by position
  const qbs = getPlayersByPosition(players, rosterIds, Position.QB, injuredPlayerIds);
  const rbs = getPlayersByPosition(players, rosterIds, Position.RB, injuredPlayerIds);
  const wrs = getPlayersByPosition(players, rosterIds, Position.WR, injuredPlayerIds);
  const tes = getPlayersByPosition(players, rosterIds, Position.TE, injuredPlayerIds);
  const lts = getPlayersByPosition(players, rosterIds, Position.LT, injuredPlayerIds);
  const lgs = getPlayersByPosition(players, rosterIds, Position.LG, injuredPlayerIds);
  const cs = getPlayersByPosition(players, rosterIds, Position.C, injuredPlayerIds);
  const rgs = getPlayersByPosition(players, rosterIds, Position.RG, injuredPlayerIds);
  const rts = getPlayersByPosition(players, rosterIds, Position.RT, injuredPlayerIds);

  // Defense
  const des = getPlayersByPosition(players, rosterIds, Position.DE, injuredPlayerIds);
  const dts = getPlayersByPosition(players, rosterIds, Position.DT, injuredPlayerIds);
  const olbs = getPlayersByPosition(players, rosterIds, Position.OLB, injuredPlayerIds);
  const ilbs = getPlayersByPosition(players, rosterIds, Position.ILB, injuredPlayerIds);
  const cbs = getPlayersByPosition(players, rosterIds, Position.CB, injuredPlayerIds);
  const fss = getPlayersByPosition(players, rosterIds, Position.FS, injuredPlayerIds);
  const sss = getPlayersByPosition(players, rosterIds, Position.SS, injuredPlayerIds);

  // Special teams
  const ks = getPlayersByPosition(players, rosterIds, Position.K, injuredPlayerIds);
  const ps = getPlayersByPosition(players, rosterIds, Position.P, injuredPlayerIds);

  // Create placeholder player for missing positions
  const createPlaceholder = (pos: Position): Player =>
    ({
      id: `placeholder-${pos}`,
      firstName: 'Placeholder',
      lastName: pos,
      position: pos,
      age: 25,
      experience: 0,
      physical: {
        height: 72,
        weight: 200,
        armLength: 32,
        handSize: 9.5,
        wingspan: 76,
        speed: 4.8,
        acceleration: 50,
        agility: 50,
        strength: 50,
        verticalJump: 30,
      },
      skills: {},
      hiddenTraits: { positive: [], negative: [], revealedToUser: [] },
      itFactor: { value: 50 },
      consistency: { tier: 'average', currentStreak: 'neutral', streakGamesRemaining: 0 },
      schemeFits: {
        offensive: {
          westCoast: 'neutral',
          airRaid: 'neutral',
          spreadOption: 'neutral',
          powerRun: 'neutral',
          zoneRun: 'neutral',
          playAction: 'neutral',
        },
        defensive: {
          fourThreeUnder: 'neutral',
          threeFour: 'neutral',
          coverThree: 'neutral',
          coverTwo: 'neutral',
          manPress: 'neutral',
          blitzHeavy: 'neutral',
        },
      },
      roleFit: { ceiling: 'depth', currentRole: 'depth', roleEffectiveness: 50 },
      contractId: null,
      injuryStatus: { severity: 'none', type: 'none', weeksRemaining: 0, isPublic: true, lingeringEffect: 0 },
      fatigue: 0,
      morale: 50,
      collegeId: '',
      draftYear: 2020,
      draftRound: 7,
      draftPick: 250,
    }) as Player;

  // Select starters (or placeholder if not available)
  return {
    offense: {
      qb: qbs[0] || createPlaceholder(Position.QB),
      rb: rbs.slice(0, 2),
      wr: wrs.slice(0, 3),
      te: tes.slice(0, 2),
      lt: lts[0] || createPlaceholder(Position.LT),
      lg: lgs[0] || createPlaceholder(Position.LG),
      c: cs[0] || createPlaceholder(Position.C),
      rg: rgs[0] || createPlaceholder(Position.RG),
      rt: rts[0] || createPlaceholder(Position.RT),
    },
    defense: {
      de: des.slice(0, 2),
      dt: dts.slice(0, 2),
      olb: olbs.slice(0, 2),
      ilb: ilbs.slice(0, 2),
      cb: cbs.slice(0, 3),
      fs: fss[0] || createPlaceholder(Position.FS),
      ss: sss[0] || createPlaceholder(Position.SS),
    },
    specialTeams: {
      k: ks[0] || createPlaceholder(Position.K),
      p: ps[0] || createPlaceholder(Position.P),
      returner: wrs[0] || rbs[0] || createPlaceholder(Position.WR),
    },
  };
}

/**
 * Convert starting lineup to offensive personnel
 */
function createOffensivePersonnel(lineup: StartingLineup): OffensivePersonnel {
  return {
    qb: lineup.offense.qb,
    rb: lineup.offense.rb,
    wr: lineup.offense.wr,
    te: lineup.offense.te,
    ol: [
      lineup.offense.lt,
      lineup.offense.lg,
      lineup.offense.c,
      lineup.offense.rg,
      lineup.offense.rt,
    ],
  };
}

/**
 * Convert starting lineup to defensive personnel
 */
function createDefensivePersonnel(lineup: StartingLineup): DefensivePersonnel {
  return {
    dl: [...lineup.defense.de, ...lineup.defense.dt],
    lb: [...lineup.defense.olb, ...lineup.defense.ilb],
    db: [...lineup.defense.cb, lineup.defense.fs, lineup.defense.ss],
  };
}

/**
 * Convert starting lineup to special teams personnel
 */
function createSpecialTeamsPersonnel(lineup: StartingLineup): SpecialTeamsPersonnel {
  return {
    k: lineup.specialTeams.k,
    p: lineup.specialTeams.p,
    returner: lineup.specialTeams.returner,
  };
}

/**
 * Create coaching staff for game
 */
function createGameCoachingStaff(
  team: Team,
  coaches: Map<string, Coach>
): GameCoachingStaff {
  const getCoach = (coachId: string | undefined): Coach | null => {
    if (!coachId) return null;
    return coaches.get(coachId) || null;
  };

  const hierarchy = team.staffHierarchy;

  return {
    offensiveCoordinator:
      getCoach(hierarchy.offensiveCoordinator ?? undefined) ||
      ({ id: 'default-oc', playerChemistry: {} } as Coach),
    defensiveCoordinator:
      getCoach(hierarchy.defensiveCoordinator ?? undefined) ||
      ({ id: 'default-dc', playerChemistry: {} } as Coach),
    positionCoaches: new Map(),
  };
}

/**
 * Get offensive tendencies from coordinator
 */
function getOffensiveTendencies(
  team: Team,
  coaches: Map<string, Coach>
): OffensiveTendencies {
  const ocId = team.staffHierarchy.offensiveCoordinator;
  if (ocId) {
    const oc = coaches.get(ocId);
    if (oc?.tendencies && 'passRunRatio' in oc.tendencies) {
      return oc.tendencies as OffensiveTendencies;
    }
  }
  return createDefaultOffensiveTendencies();
}

/**
 * Get defensive tendencies from coordinator
 */
function getDefensiveTendencies(
  team: Team,
  coaches: Map<string, Coach>
): DefensiveTendencies {
  const dcId = team.staffHierarchy.defensiveCoordinator;
  if (dcId) {
    const dc = coaches.get(dcId);
    if (dc?.tendencies && 'blitzFrequency' in dc.tendencies) {
      return dc.tendencies as DefensiveTendencies;
    }
  }
  return createDefaultDefensiveTendencies();
}

/**
 * Get team scheme
 */
function getTeamScheme(
  team: Team,
  coaches: Map<string, Coach>,
  type: 'offensive' | 'defensive'
): OffensiveScheme | DefensiveScheme {
  const coordinatorId =
    type === 'offensive'
      ? team.staffHierarchy.offensiveCoordinator
      : team.staffHierarchy.defensiveCoordinator;

  if (coordinatorId) {
    const coordinator = coaches.get(coordinatorId);
    if (coordinator?.scheme) {
      return coordinator.scheme as OffensiveScheme | DefensiveScheme;
    }
  }

  // Default schemes
  return type === 'offensive' ? 'westCoast' : 'coverThree';
}

/**
 * Calculate weekly variances for all players
 */
function calculateTeamWeeklyVariances(
  lineup: StartingLineup,
  _allPlayers: Map<string, Player>
): Map<string, number> {
  const variances = new Map<string, number>();

  // Get all players in lineup
  const allLineupPlayers = [
    lineup.offense.qb,
    ...lineup.offense.rb,
    ...lineup.offense.wr,
    ...lineup.offense.te,
    lineup.offense.lt,
    lineup.offense.lg,
    lineup.offense.c,
    lineup.offense.rg,
    lineup.offense.rt,
    ...lineup.defense.de,
    ...lineup.defense.dt,
    ...lineup.defense.olb,
    ...lineup.defense.ilb,
    ...lineup.defense.cb,
    lineup.defense.fs,
    lineup.defense.ss,
    lineup.specialTeams.k,
    lineup.specialTeams.p,
    lineup.specialTeams.returner,
  ];

  for (const player of allLineupPlayers) {
    if (player && player.id && !player.id.startsWith('placeholder')) {
      const variance = calculateWeeklyVariance(player.consistency);
      variances.set(player.id, variance.variance);
    }
  }

  return variances;
}

/**
 * Create team game state from team and lineup
 */
function createTeamGameState(
  team: Team,
  lineup: StartingLineup,
  players: Map<string, Player>,
  coaches: Map<string, Coach>
): TeamGameState {
  const allPlayers = new Map<string, Player>();

  // Add all roster players to allPlayers map
  for (const playerId of team.rosterPlayerIds) {
    const player = players.get(playerId);
    if (player) {
      allPlayers.set(playerId, player);
    }
  }

  // Add lineup players (in case they weren't in roster)
  const lineupPlayers = [
    lineup.offense.qb,
    ...lineup.offense.rb,
    ...lineup.offense.wr,
    ...lineup.offense.te,
    lineup.offense.lt,
    lineup.offense.lg,
    lineup.offense.c,
    lineup.offense.rg,
    lineup.offense.rt,
    ...lineup.defense.de,
    ...lineup.defense.dt,
    ...lineup.defense.olb,
    ...lineup.defense.ilb,
    ...lineup.defense.cb,
    lineup.defense.fs,
    lineup.defense.ss,
    lineup.specialTeams.k,
    lineup.specialTeams.p,
    lineup.specialTeams.returner,
  ];

  for (const player of lineupPlayers) {
    if (player && player.id) {
      allPlayers.set(player.id, player);
    }
  }

  return {
    teamId: team.id,
    teamName: `${team.city} ${team.nickname}`,

    offense: createOffensivePersonnel(lineup),
    defense: createDefensivePersonnel(lineup),
    specialTeams: createSpecialTeamsPersonnel(lineup),

    allPlayers,
    coaches: createGameCoachingStaff(team, coaches),

    offensiveScheme: getTeamScheme(team, coaches, 'offensive') as OffensiveScheme,
    defensiveScheme: getTeamScheme(team, coaches, 'defensive') as DefensiveScheme,

    offensiveTendencies: getOffensiveTendencies(team, coaches),
    defensiveTendencies: getDefensiveTendencies(team, coaches),

    timeoutsRemaining: 3,
    fatigueLevels: new Map(),
    snapCounts: new Map(),
    weeklyVariances: calculateTeamWeeklyVariances(lineup, players),
  };
}

/**
 * Set up a game for simulation
 */
export function setupGame(
  config: GameConfig,
  teams: Map<string, Team>,
  players: Map<string, Player>,
  coaches: Map<string, Coach>
): GameSetupResult {
  const homeTeam = teams.get(config.homeTeamId);
  const awayTeam = teams.get(config.awayTeamId);

  if (!homeTeam || !awayTeam) {
    throw new Error(`Team not found: ${!homeTeam ? config.homeTeamId : config.awayTeamId}`);
  }

  // Get injured players
  const homeInjuredIds = homeTeam.injuredReserveIds;
  const awayInjuredIds = awayTeam.injuredReserveIds;

  // Select lineups
  const homeLineup = selectStartingLineup(homeTeam, players, homeInjuredIds);
  const awayLineup = selectStartingLineup(awayTeam, players, awayInjuredIds);

  // Generate weather from home stadium
  const weather = generateWeather(homeTeam.stadium, config.week);

  // Determine stakes
  const stakes = determineGameStakes(config);

  // Calculate home field advantage
  const homeFieldAdvantage = calculateHomeFieldAdvantage(
    homeTeam.stadium,
    config.week,
    stakes
  );

  // Create team game states
  const homeTeamState = createTeamGameState(homeTeam, homeLineup, players, coaches);
  const awayTeamState = createTeamGameState(awayTeam, awayLineup, players, coaches);

  return {
    homeTeamState,
    awayTeamState,
    weather,
    stakes,
    homeFieldAdvantage,
  };
}

/**
 * Quick setup for testing or simple simulations
 */
export function quickSetup(
  homeTeamState: TeamGameState,
  awayTeamState: TeamGameState,
  config?: Partial<{ week: number; isPlayoff: boolean }>
): GameSetupResult {
  const isPlayoff = config?.isPlayoff ?? false;

  return {
    homeTeamState,
    awayTeamState,
    weather: {
      temperature: 70,
      precipitation: 'none',
      wind: 5,
      isDome: false,
    },
    stakes: isPlayoff ? 'playoff' : 'regular',
    homeFieldAdvantage: 2.5,
  };
}
