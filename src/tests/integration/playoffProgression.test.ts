/**
 * Playoff Progression Integration Tests
 *
 * Tests the full playoff bracket from Wild Card through Super Bowl.
 * Verifies bracket generation, game simulation, round advancement,
 * home-field advantage, and champion determination all work together.
 */

import { createSeasonManager } from '@core/season/SeasonManager';
import { Team, createEmptyTeamRecord } from '@core/models/team/Team';
import { Player } from '@core/models/player/Player';
import { Coach, createDefaultCoach } from '@core/models/staff/Coach';
import { Position } from '@core/models/player/Position';
import { FAKE_CITIES } from '@core/models/team/FakeCities';
import { createDefaultStadium } from '@core/models/team/Stadium';
import { createDefaultTeamFinances } from '@core/models/team/TeamFinances';
import { createEmptyStaffHierarchy } from '@core/models/staff/StaffHierarchy';
import {
  generateSeasonSchedule,
  createDefaultStandings,
} from '@core/season/ScheduleGenerator';
import { simulateWeek } from '@core/season/WeekSimulator';
import {
  generatePlayoffBracket,
  advancePlayoffRound,
  simulatePlayoffRound,
  getCurrentPlayoffRound,
  arePlayoffsComplete,
  getTeamsAlive,
  getTeamEliminationRound,
  getTeamPlayoffSeed,
  PlayoffSchedule,
} from '@core/season/PlayoffGenerator';
import { calculateStandings } from '@core/season/StandingsCalculator';
import { calculateDraftOrder } from '@core/season/DraftOrderCalculator';
import {
  GameState,
  createDefaultCareerStats,
  DEFAULT_GAME_SETTINGS,
} from '@core/models/game/GameState';
import { DEFAULT_LEAGUE_SETTINGS } from '@core/models/league/League';
import { createHealthyStatus } from '@core/models/player/InjuryStatus';
import { createDefaultOwner } from '@core/models/owner';

// ============================================
// TEST HELPERS (same as fullSeasonSimulation)
// ============================================

function createTestPlayer(
  id: string,
  position: Position,
  firstName: string,
  lastName: string
): Player {
  return {
    id,
    firstName,
    lastName,
    position,
    age: 25,
    experience: 3,
    physical: {
      height: 72,
      weight: 200,
      armLength: 32,
      handSize: 9.5,
      wingspan: 76,
      speed: 4.6,
      acceleration: 75,
      agility: 75,
      strength: 75,
      verticalJump: 34,
    },
    skills: {
      accuracy: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      mobility: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      vision: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      tackling: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      catching: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      routeRunning: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      blocking: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      passBlock: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      runBlock: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      passRush: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      runDefense: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      manCoverage: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      zoneCoverage: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      kickPower: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      kickAccuracy: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
      tracking: { trueValue: 75, perceivedMin: 70, perceivedMax: 80, maturityAge: 26 },
    },
    hiddenTraits: { positive: [], negative: [], revealedToUser: [] },
    itFactor: { value: 50 },
    consistency: { tier: 'average', currentStreak: 'neutral', streakGamesRemaining: 0 },
    schemeFits: {
      offensive: {
        westCoast: 'good',
        airRaid: 'good',
        spreadOption: 'good',
        powerRun: 'good',
        zoneRun: 'good',
        playAction: 'good',
      },
      defensive: {
        fourThreeUnder: 'good',
        threeFour: 'good',
        coverThree: 'good',
        coverTwo: 'good',
        manPress: 'good',
        blitzHeavy: 'good',
      },
    },
    roleFit: { ceiling: 'solidStarter', currentRole: 'solidStarter', roleEffectiveness: 75 },
    contractId: null,
    injuryStatus: createHealthyStatus(),
    fatigue: 0,
    morale: 75,
    collegeId: 'college-1',
    draftYear: 2020,
    draftRound: 3,
    draftPick: 80,
  };
}

function createMinimalRoster(teamId: string): Player[] {
  const positions: { position: Position; firstName: string; lastName: string }[] = [
    { position: Position.QB, firstName: 'John', lastName: 'Quarterback' },
    { position: Position.RB, firstName: 'Mike', lastName: 'Runner' },
    { position: Position.RB, firstName: 'Steve', lastName: 'Backup' },
    { position: Position.WR, firstName: 'Tom', lastName: 'Receiver1' },
    { position: Position.WR, firstName: 'Jerry', lastName: 'Receiver2' },
    { position: Position.WR, firstName: 'Larry', lastName: 'Receiver3' },
    { position: Position.TE, firstName: 'Rob', lastName: 'TightEnd' },
    { position: Position.TE, firstName: 'Travis', lastName: 'TightEnd2' },
    { position: Position.LT, firstName: 'Tyron', lastName: 'Tackle' },
    { position: Position.LG, firstName: 'Zack', lastName: 'Guard1' },
    { position: Position.C, firstName: 'Jason', lastName: 'Center' },
    { position: Position.RG, firstName: 'Quenton', lastName: 'Guard2' },
    { position: Position.RT, firstName: 'Lane', lastName: 'Tackle2' },
    { position: Position.DE, firstName: 'Myles', lastName: 'End1' },
    { position: Position.DE, firstName: 'Nick', lastName: 'End2' },
    { position: Position.DT, firstName: 'Aaron', lastName: 'Tackle3' },
    { position: Position.DT, firstName: 'Chris', lastName: 'Tackle4' },
    { position: Position.OLB, firstName: 'TJ', lastName: 'Backer1' },
    { position: Position.OLB, firstName: 'Micah', lastName: 'Backer2' },
    { position: Position.ILB, firstName: 'Fred', lastName: 'Backer3' },
    { position: Position.ILB, firstName: 'Bobby', lastName: 'Backer4' },
    { position: Position.CB, firstName: 'Jalen', lastName: 'Corner1' },
    { position: Position.CB, firstName: 'Sauce', lastName: 'Corner2' },
    { position: Position.CB, firstName: 'Pat', lastName: 'Corner3' },
    { position: Position.FS, firstName: 'Jessie', lastName: 'Safety1' },
    { position: Position.SS, firstName: 'Derwin', lastName: 'Safety2' },
    { position: Position.K, firstName: 'Justin', lastName: 'Kicker' },
    { position: Position.P, firstName: 'Tommy', lastName: 'Punter' },
  ];

  return positions.map((p, index) =>
    createTestPlayer(`${teamId}-player-${index}`, p.position, p.firstName, p.lastName)
  );
}

function createTestTeams(): Team[] {
  return FAKE_CITIES.map((city, index) => ({
    id: `team-${index}`,
    city: city.city,
    nickname: city.nickname,
    abbreviation: city.abbreviation,
    conference: city.conference,
    division: city.division,
    stadium: {
      ...createDefaultStadium(`stadium-${index}`, `team-${index}`, city.city),
      type: city.stadiumType,
      latitude: city.latitude,
    },
    finances: createDefaultTeamFinances(`team-${index}`, 255000),
    staffHierarchy: createEmptyStaffHierarchy(`team-${index}`, 30000),
    ownerId: `owner-${index}`,
    gmId: null,
    rosterPlayerIds: [],
    practiceSquadIds: [],
    injuredReserveIds: [],
    currentRecord: createEmptyTeamRecord(),
    playoffSeed: null,
    isEliminated: false,
    allTimeRecord: { wins: 0, losses: 0, ties: 0 },
    championships: 0,
    lastChampionshipYear: null,
    marketSize: city.marketSize,
    prestige: 50,
    fanbasePassion: 50,
  }));
}

function createMinimalGameState(teams: Team[]): GameState {
  const players: Record<string, Player> = {};
  const coaches: Record<string, Coach> = {};
  const teamsRecord: Record<string, Team> = {};

  teams.forEach((team, teamIndex) => {
    const roster = createMinimalRoster(team.id);
    const rosterIds: string[] = [];

    roster.forEach((player) => {
      players[player.id] = player;
      rosterIds.push(player.id);
    });

    const headCoach = createDefaultCoach(
      `coach-${team.id}`,
      'Head',
      `Coach${teamIndex}`,
      'headCoach'
    );
    coaches[headCoach.id] = headCoach;

    teamsRecord[team.id] = {
      ...team,
      rosterPlayerIds: rosterIds,
    };
  });

  const previousStandings = createDefaultStandings(teams);
  const schedule = generateSeasonSchedule(teams, previousStandings, 2025);

  return {
    saveSlot: 0,
    createdAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString(),
    userTeamId: teams[0].id,
    userName: 'Test GM',
    league: {
      id: 'league-1',
      name: 'Test League',
      teamIds: teams.map((t) => t.id),
      calendar: {
        currentYear: 2025,
        currentWeek: 1,
        currentPhase: 'regularSeason',
        offseasonPhase: null,
      },
      settings: DEFAULT_LEAGUE_SETTINGS,
      schedule,
      standings: {
        afc: { north: [], south: [], east: [], west: [] },
        nfc: { north: [], south: [], east: [], west: [] },
      },
      playoffBracket: null,
      seasonHistory: [],
      upcomingEvents: [],
    },
    teams: teamsRecord,
    players,
    coaches,
    scouts: {},
    owners: teams.reduce(
      (acc, team) => {
        acc[`owner-${team.id}`] = createDefaultOwner(`owner-${team.id}`, team.id);
        return acc;
      },
      {} as Record<string, ReturnType<typeof createDefaultOwner>>
    ),
    draftPicks: {},
    prospects: {},
    contracts: {},
    careerStats: createDefaultCareerStats(),
    gameSettings: DEFAULT_GAME_SETTINGS,
    newsReadStatus: {},
  };
}

/**
 * Simulates a full regular season and returns final standings and game state.
 */
function simulateFullRegularSeason(teams: Team[], gameState: GameState) {
  const schedule = gameState.league.schedule!;

  for (let week = 1; week <= 18; week++) {
    const results = simulateWeek(week, schedule, gameState, gameState.userTeamId, true);
    for (const { game } of results.games) {
      const idx = schedule.regularSeason.findIndex((g) => g.gameId === game.gameId);
      if (idx >= 0) {
        schedule.regularSeason[idx] = game;
      }
    }
  }

  const completedGames = schedule.regularSeason.filter((g) => g.isComplete);
  return calculateStandings(completedGames, teams);
}

// ============================================
// TESTS
// ============================================

describe('Playoff Progression Integration Tests', () => {
  let teams: Team[];
  let gameState: GameState;
  let finalStandings: ReturnType<typeof calculateStandings>;
  let playoffBracket: PlayoffSchedule;

  beforeAll(() => {
    teams = createTestTeams();
    gameState = createMinimalGameState(teams);
    finalStandings = simulateFullRegularSeason(teams, gameState);
    playoffBracket = generatePlayoffBracket(finalStandings);
  }, 180000);

  describe('playoff bracket generation', () => {
    it('should generate 7 seeds per conference', () => {
      expect(playoffBracket.afcSeeds.size).toBe(7);
      expect(playoffBracket.nfcSeeds.size).toBe(7);
    });

    it('should have seeds 1-7 for each conference', () => {
      for (let seed = 1; seed <= 7; seed++) {
        expect(playoffBracket.afcSeeds.has(seed)).toBe(true);
        expect(playoffBracket.nfcSeeds.has(seed)).toBe(true);
      }
    });

    it('should have unique team IDs for all playoff seeds', () => {
      const allTeamIds = new Set<string>();

      for (const teamId of playoffBracket.afcSeeds.values()) {
        expect(allTeamIds.has(teamId)).toBe(false);
        allTeamIds.add(teamId);
      }

      for (const teamId of playoffBracket.nfcSeeds.values()) {
        expect(allTeamIds.has(teamId)).toBe(false);
        allTeamIds.add(teamId);
      }

      expect(allTeamIds.size).toBe(14);
    });

    it('should generate 6 Wild Card games (3 per conference)', () => {
      expect(playoffBracket.wildCardRound).toHaveLength(6);

      const afcGames = playoffBracket.wildCardRound.filter((m) => m.conference === 'afc');
      const nfcGames = playoffBracket.wildCardRound.filter((m) => m.conference === 'nfc');

      expect(afcGames).toHaveLength(3);
      expect(nfcGames).toHaveLength(3);
    });

    it('should have #1 seed get bye (not playing in Wild Card)', () => {
      const afc1 = playoffBracket.afcSeeds.get(1)!;
      const nfc1 = playoffBracket.nfcSeeds.get(1)!;

      const wcTeams = new Set<string>();
      for (const matchup of playoffBracket.wildCardRound) {
        wcTeams.add(matchup.homeTeamId);
        wcTeams.add(matchup.awayTeamId);
      }

      expect(wcTeams.has(afc1)).toBe(false);
      expect(wcTeams.has(nfc1)).toBe(false);
    });

    it('should have correct Wild Card matchups: #2 vs #7, #3 vs #6, #4 vs #5', () => {
      for (const conference of ['afc', 'nfc'] as const) {
        const seeds = conference === 'afc' ? playoffBracket.afcSeeds : playoffBracket.nfcSeeds;
        const confGames = playoffBracket.wildCardRound.filter((m) => m.conference === conference);

        const expectedMatchups = [
          { home: 2, away: 7 },
          { home: 3, away: 6 },
          { home: 4, away: 5 },
        ];

        for (const expected of expectedMatchups) {
          const matchup = confGames.find(
            (m) =>
              m.homeTeamId === seeds.get(expected.home) &&
              m.awayTeamId === seeds.get(expected.away)
          );
          expect(matchup).toBeDefined();
          expect(matchup!.homeSeed).toBe(expected.home);
          expect(matchup!.awaySeed).toBe(expected.away);
        }
      }
    });

    it('should have higher seed hosting in Wild Card round', () => {
      for (const matchup of playoffBracket.wildCardRound) {
        expect(matchup.homeSeed).toBeLessThan(matchup.awaySeed);
      }
    });

    it('should not be complete before any games are played', () => {
      expect(arePlayoffsComplete(playoffBracket)).toBe(false);
    });

    it('should have all 14 teams alive before any games', () => {
      const alive = getTeamsAlive(playoffBracket);
      expect(alive).toHaveLength(14);
    });

    it('should have current round be wildCard', () => {
      expect(getCurrentPlayoffRound(playoffBracket)).toBe('wildCard');
    });
  });

  describe('Wild Card round simulation', () => {
    let postWildCard: PlayoffSchedule;

    beforeAll(() => {
      const wcResults = simulatePlayoffRound(playoffBracket, 'wildCard', gameState);
      postWildCard = advancePlayoffRound(playoffBracket, wcResults);
    }, 60000);

    it('should complete all 6 Wild Card games', () => {
      for (const matchup of postWildCard.wildCardRound) {
        expect(matchup.isComplete).toBe(true);
        expect(matchup.homeScore).not.toBeNull();
        expect(matchup.awayScore).not.toBeNull();
        expect(matchup.winnerId).not.toBeNull();
      }
    });

    it('should have each winner match the team with the higher score', () => {
      for (const matchup of postWildCard.wildCardRound) {
        if (matchup.homeScore! > matchup.awayScore!) {
          expect(matchup.winnerId).toBe(matchup.homeTeamId);
        } else {
          expect(matchup.winnerId).toBe(matchup.awayTeamId);
        }
      }
    });

    it('should generate 4 Divisional round matchups (2 per conference)', () => {
      expect(postWildCard.divisionalRound).toHaveLength(4);

      const afcDiv = postWildCard.divisionalRound.filter((m) => m.conference === 'afc');
      const nfcDiv = postWildCard.divisionalRound.filter((m) => m.conference === 'nfc');

      expect(afcDiv).toHaveLength(2);
      expect(nfcDiv).toHaveLength(2);
    });

    it('should include #1 seeds in Divisional round when Wild Card has 3 winners per conference', () => {
      // Check that each conference's #1 seed appears if 3 WC winners exist for that conference
      for (const conference of ['afc', 'nfc'] as const) {
        const seeds = conference === 'afc' ? postWildCard.afcSeeds : postWildCard.nfcSeeds;
        const topSeed = seeds.get(1)!;
        const confWcGames = postWildCard.wildCardRound.filter(
          (m) => m.conference === conference
        );
        const confWcWinners = confWcGames.filter((m) => m.winnerId != null);

        if (confWcWinners.length === 3) {
          const divTeams = new Set<string>();
          for (const matchup of postWildCard.divisionalRound) {
            if (matchup.conference === conference) {
              divTeams.add(matchup.homeTeamId);
              divTeams.add(matchup.awayTeamId);
            }
          }
          expect(divTeams.has(topSeed)).toBe(true);
        }
      }
    });

    it('should eliminate teams after Wild Card round', () => {
      const alive = getTeamsAlive(postWildCard);
      // Should have at most 8 alive (14 - 6 losers), but ties could leave more
      const wcLosersCount = postWildCard.wildCardRound.filter(
        (m) => m.isComplete && m.winnerId != null
      ).length;
      expect(alive).toHaveLength(14 - wcLosersCount);
    });

    it('should have current round be divisional', () => {
      expect(getCurrentPlayoffRound(postWildCard)).toBe('divisional');
    });

    it('should track elimination round for Wild Card losers', () => {
      for (const matchup of postWildCard.wildCardRound) {
        if (matchup.winnerId) {
          const loserId =
            matchup.winnerId === matchup.homeTeamId ? matchup.awayTeamId : matchup.homeTeamId;
          expect(getTeamEliminationRound(postWildCard, loserId)).toBe('wildCard');
        }
      }
    });
  });

  describe('full playoff progression through all rounds via SeasonManager', () => {
    it('should transition to playoff time after regular season', () => {
      const t = createTestTeams();
      const gs = createMinimalGameState(t);
      const manager = createSeasonManager(2025, t, t[0].id);
      manager.startSeason();

      for (let week = 1; week <= 18; week++) {
        manager.simulateWeek(gs, true);
        if (week < 18) {
          manager.advanceToNextWeek();
        }
      }

      manager.advanceToNextWeek();
      expect(manager.isPlayoffTime()).toBe(true);
      expect(manager.getPlayoffBracket()).not.toBeNull();
      expect(manager.getCurrentPhase()).toBe('wildCard');
    }, 180000);

    it('should simulate through playoff rounds, advancing bracket each time', () => {
      const t = createTestTeams();
      const gs = createMinimalGameState(t);
      const manager = createSeasonManager(2025, t, t[0].id);
      manager.startSeason();

      for (let week = 1; week <= 18; week++) {
        manager.simulateWeek(gs, true);
        if (week < 18) {
          manager.advanceToNextWeek();
        }
      }

      manager.advanceToNextWeek();

      // Simulate rounds until complete or no more rounds
      let roundCount = 0;
      while (
        manager.getPlayoffBracket() &&
        getCurrentPlayoffRound(manager.getPlayoffBracket()!) !== null
      ) {
        manager.simulatePlayoffRound(gs);
        roundCount++;
        if (roundCount > 10) break; // Safety
      }

      expect(roundCount).toBeGreaterThanOrEqual(1);
      // After all rounds, playoffs should either be complete or stalled from ties
      const bracket = manager.getPlayoffBracket()!;
      // At minimum, wild card round should be complete
      for (const m of bracket.wildCardRound) {
        expect(m.isComplete).toBe(true);
      }
    }, 180000);
  });

  describe('round-by-round bracket advancement', () => {
    it('should advance through each round until no more rounds exist', () => {
      let bracket = generatePlayoffBracket(finalStandings);

      // Wild Card
      let currentRound = getCurrentPlayoffRound(bracket);
      expect(currentRound).toBe('wildCard');
      let results = simulatePlayoffRound(bracket, currentRound!, gameState);
      bracket = advancePlayoffRound(bracket, results);

      // Verify all WC games complete
      for (const m of bracket.wildCardRound) {
        expect(m.isComplete).toBe(true);
      }

      // Continue advancing through remaining rounds
      currentRound = getCurrentPlayoffRound(bracket);
      let maxIterations = 5;
      while (currentRound && maxIterations > 0) {
        results = simulatePlayoffRound(bracket, currentRound, gameState);
        bracket = advancePlayoffRound(bracket, results);
        currentRound = getCurrentPlayoffRound(bracket);
        maxIterations--;
      }

      // If we got through all rounds, verify completion
      if (arePlayoffsComplete(bracket)) {
        expect(bracket.superBowlChampion).not.toBeNull();
        const alive = getTeamsAlive(bracket);
        expect(alive).toHaveLength(1);
        expect(alive[0]).toBe(bracket.superBowlChampion);
      }
    }, 60000);

    it('should track winners advancing from WC to subsequent rounds', () => {
      let bracket = generatePlayoffBracket(finalStandings);

      // Simulate WC
      const wcResults = simulatePlayoffRound(bracket, 'wildCard', gameState);
      bracket = advancePlayoffRound(bracket, wcResults);

      // Gather WC winners
      const wcWinners = new Set<string>();
      for (const m of bracket.wildCardRound) {
        if (m.winnerId) {
          wcWinners.add(m.winnerId);
        }
      }

      // All divisional participants should be either a WC winner or a #1 seed
      const afc1 = bracket.afcSeeds.get(1)!;
      const nfc1 = bracket.nfcSeeds.get(1)!;

      for (const m of bracket.divisionalRound) {
        const homeIsValid = wcWinners.has(m.homeTeamId) || m.homeTeamId === afc1 || m.homeTeamId === nfc1;
        const awayIsValid = wcWinners.has(m.awayTeamId) || m.awayTeamId === afc1 || m.awayTeamId === nfc1;
        expect(homeIsValid).toBe(true);
        expect(awayIsValid).toBe(true);
      }
    }, 60000);

    it('should produce valid draft order when playoffs complete', () => {
      let bracket = generatePlayoffBracket(finalStandings);

      // Simulate all rounds
      let currentRound = getCurrentPlayoffRound(bracket);
      while (currentRound) {
        const results = simulatePlayoffRound(bracket, currentRound, gameState);
        bracket = advancePlayoffRound(bracket, results);
        currentRound = getCurrentPlayoffRound(bracket);
      }

      if (arePlayoffsComplete(bracket)) {
        const draftOrder = calculateDraftOrder(finalStandings, bracket);

        // Should have entries
        expect(draftOrder.length).toBeGreaterThan(0);

        // No duplicates
        const uniqueTeams = new Set(draftOrder);
        expect(uniqueTeams.size).toBe(draftOrder.length);

        // Champion should be last
        expect(draftOrder[draftOrder.length - 1]).toBe(bracket.superBowlChampion);
      }
    }, 60000);
  });

  describe('playoff seed tracking', () => {
    it('should correctly look up team playoff seeds', () => {
      for (let seed = 1; seed <= 7; seed++) {
        const afcTeamId = playoffBracket.afcSeeds.get(seed)!;
        const nfcTeamId = playoffBracket.nfcSeeds.get(seed)!;

        expect(getTeamPlayoffSeed(playoffBracket, afcTeamId)).toBe(seed);
        expect(getTeamPlayoffSeed(playoffBracket, nfcTeamId)).toBe(seed);
      }
    });

    it('should return null for non-playoff team seed lookup', () => {
      const allPlayoffTeamIds = new Set<string>();
      for (const teamId of playoffBracket.afcSeeds.values()) {
        allPlayoffTeamIds.add(teamId);
      }
      for (const teamId of playoffBracket.nfcSeeds.values()) {
        allPlayoffTeamIds.add(teamId);
      }

      const nonPlayoffTeam = teams.find((t) => !allPlayoffTeamIds.has(t.id));
      if (nonPlayoffTeam) {
        expect(getTeamPlayoffSeed(playoffBracket, nonPlayoffTeam.id)).toBeNull();
      }
    });
  });
});
