/**
 * Full Season Simulation Integration Tests
 *
 * Tests for simulating a complete NFL season from week 1 through Super Bowl.
 * Verifies that schedule generation, game simulation, standings calculation,
 * and playoff seeding all work together correctly across an entire season.
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
  getWeekGames,
} from '@core/season/ScheduleGenerator';
import {
  simulateWeek,
  WeekResults,
} from '@core/season/WeekSimulator';
import { calculateStandings, TeamStanding } from '@core/season/StandingsCalculator';
import {
  GameState,
  createDefaultCareerStats,
  DEFAULT_GAME_SETTINGS,
} from '@core/models/game/GameState';
import { DEFAULT_LEAGUE_SETTINGS } from '@core/models/league/League';
import { createHealthyStatus } from '@core/models/player/InjuryStatus';
import { createDefaultOwner } from '@core/models/owner';

// ============================================
// TEST HELPERS
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

// ============================================
// TESTS
// ============================================

describe('Full Season Simulation Integration Tests', () => {
  let teams: Team[];
  let gameState: GameState;

  beforeEach(() => {
    teams = createTestTeams();
    gameState = createMinimalGameState(teams);
  });

  describe('complete 18-week regular season simulation', () => {
    let allWeekResults: WeekResults[];
    let finalStandings: ReturnType<typeof calculateStandings>;

    beforeEach(() => {
      allWeekResults = [];
      const schedule = gameState.league.schedule!;

      // Simulate all 18 weeks
      for (let week = 1; week <= 18; week++) {
        const results = simulateWeek(week, schedule, gameState, gameState.userTeamId, true);
        allWeekResults.push(results);

        // Update schedule with results for next week
        for (const { game } of results.games) {
          const idx = schedule.regularSeason.findIndex((g) => g.gameId === game.gameId);
          if (idx >= 0) {
            schedule.regularSeason[idx] = game;
          }
        }
      }

      finalStandings = allWeekResults[allWeekResults.length - 1].standings;
    }, 120000);

    it('should simulate all 18 weeks', () => {
      expect(allWeekResults).toHaveLength(18);
      for (let i = 0; i < 18; i++) {
        expect(allWeekResults[i].week).toBe(i + 1);
      }
    });

    it('should have correct total wins equals total losses for each week', () => {
      for (const weekResult of allWeekResults) {
        let totalWins = 0;
        let totalLosses = 0;

        for (const conference of ['afc', 'nfc'] as const) {
          for (const division of ['north', 'south', 'east', 'west'] as const) {
            for (const standing of weekResult.standings[conference][division]) {
              totalWins += standing.wins;
              totalLosses += standing.losses;
            }
          }
        }

        // In a closed league, total wins must equal total losses
        expect(totalWins).toBe(totalLosses);
      }
    });

    it('should have all 32 teams in final standings', () => {
      let totalTeams = 0;
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          totalTeams += finalStandings[conference][division].length;
        }
      }
      expect(totalTeams).toBe(32);
    });

    it('should have 4 teams per division in final standings', () => {
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          expect(finalStandings[conference][division]).toHaveLength(4);
        }
      }
    });

    it('should have wins + losses + ties = 17 for each team after 18 weeks', () => {
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          for (const standing of finalStandings[conference][division]) {
            const totalGames = standing.wins + standing.losses + standing.ties;
            expect(totalGames).toBe(17);
          }
        }
      }
    });

    it('should have division ranks 1-4 for each division', () => {
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          const ranks = finalStandings[conference][division].map((s) => s.divisionRank);
          expect(ranks.sort()).toEqual([1, 2, 3, 4]);
        }
      }
    });

    it('should have division winners (rank 1) for all 8 divisions', () => {
      let divisionWinnerCount = 0;
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          const leader = finalStandings[conference][division].find((s) => s.divisionRank === 1);
          expect(leader).toBeDefined();
          divisionWinnerCount++;
        }
      }
      expect(divisionWinnerCount).toBe(8);
    });

    it('should have division leaders with best or equal win pct in division', () => {
      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          const divTeams = finalStandings[conference][division];
          const leader = divTeams[0];
          for (const team of divTeams.slice(1)) {
            expect(leader.winPercentage).toBeGreaterThanOrEqual(team.winPercentage);
          }
        }
      }
    });

    it('should have correct conference ranks (1-16) for each conference', () => {
      for (const conference of ['afc', 'nfc'] as const) {
        const allTeams: TeamStanding[] = [];
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          allTeams.push(...finalStandings[conference][division]);
        }
        const confRanks = allTeams.map((s) => s.conferenceRank).sort((a, b) => a - b);
        expect(confRanks).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
      }
    });

    it('should accumulate stats correctly across weeks (wins monotonically increase)', () => {
      // Track a specific team across weeks - wins should only go up or stay the same
      const teamId = teams[0].id;
      let prevWins = 0;

      for (const weekResult of allWeekResults) {
        let teamStanding: TeamStanding | undefined;
        for (const conference of ['afc', 'nfc'] as const) {
          for (const division of ['north', 'south', 'east', 'west'] as const) {
            const found = weekResult.standings[conference][division].find(
              (s) => s.teamId === teamId
            );
            if (found) teamStanding = found;
          }
        }

        if (teamStanding) {
          expect(teamStanding.wins).toBeGreaterThanOrEqual(prevWins);
          prevWins = teamStanding.wins;
        }
      }
    });

    it('should have realistic score ranges for simulated games', () => {
      for (const weekResult of allWeekResults) {
        for (const { result } of weekResult.games) {
          // NFL scores typically range 0-60
          expect(result.homeScore).toBeGreaterThanOrEqual(0);
          expect(result.homeScore).toBeLessThanOrEqual(80);
          expect(result.awayScore).toBeGreaterThanOrEqual(0);
          expect(result.awayScore).toBeLessThanOrEqual(80);
        }
      }
    });

    it('should have correct winner IDs matching higher score', () => {
      for (const weekResult of allWeekResults) {
        for (const { game, result } of weekResult.games) {
          if (!result.isTie) {
            if (result.homeScore > result.awayScore) {
              expect(result.winnerId).toBe(game.homeTeamId);
            } else {
              expect(result.winnerId).toBe(game.awayTeamId);
            }
          }
        }
      }
    });

    it('should have points for and points against that sum correctly', () => {
      // Total points scored in the league should equal total points allowed
      let totalPointsFor = 0;
      let totalPointsAgainst = 0;

      for (const conference of ['afc', 'nfc'] as const) {
        for (const division of ['north', 'south', 'east', 'west'] as const) {
          for (const standing of finalStandings[conference][division]) {
            totalPointsFor += standing.pointsFor;
            totalPointsAgainst += standing.pointsAgainst;
          }
        }
      }

      expect(totalPointsFor).toBe(totalPointsAgainst);
    });
  });

  describe('playoff seeding verification', () => {
    it('should produce 7 playoff teams per conference from SeasonManager', () => {
      const manager = createSeasonManager(2025, teams, teams[0].id);
      manager.startSeason();

      // Simulate 18 weeks
      for (let week = 1; week <= 18; week++) {
        manager.simulateWeek(gameState, true);
        if (week < 18) {
          manager.advanceToNextWeek();
        }
      }

      // Advance to trigger playoff transition
      manager.advanceToNextWeek();

      const picture = manager.getPlayoffPicture();
      expect(picture.afc).toHaveLength(16);
      expect(picture.nfc).toHaveLength(16);

      // Top 7 teams in each conference should be playoff-bound
      const afcPlayoffTeams = picture.afc.filter(
        (t) => t.playoffPosition === 'division_leader' || t.playoffPosition === 'wildcard'
      );
      const nfcPlayoffTeams = picture.nfc.filter(
        (t) => t.playoffPosition === 'division_leader' || t.playoffPosition === 'wildcard'
      );

      expect(afcPlayoffTeams.length).toBe(7);
      expect(nfcPlayoffTeams.length).toBe(7);
    }, 120000);

    it('should have 4 division winners and 3 wild cards per conference', () => {
      const manager = createSeasonManager(2025, teams, teams[0].id);
      manager.startSeason();

      for (let week = 1; week <= 18; week++) {
        manager.simulateWeek(gameState, true);
        if (week < 18) {
          manager.advanceToNextWeek();
        }
      }

      manager.advanceToNextWeek();

      const picture = manager.getPlayoffPicture();

      for (const conference of [picture.afc, picture.nfc]) {
        const divLeaders = conference.filter((t) => t.playoffPosition === 'division_leader');
        const wildcards = conference.filter((t) => t.playoffPosition === 'wildcard');

        expect(divLeaders).toHaveLength(4);
        expect(wildcards).toHaveLength(3);
      }
    }, 120000);
  });

  describe('schedule generation produces correct game counts', () => {
    it('should generate exactly 272 regular season games (17 games * 32 teams / 2)', () => {
      const schedule = gameState.league.schedule!;
      expect(schedule.regularSeason).toHaveLength(272);
    });

    it('should have each team playing exactly 17 games', () => {
      const schedule = gameState.league.schedule!;
      const gamesPerTeam = new Map<string, number>();

      for (const game of schedule.regularSeason) {
        gamesPerTeam.set(game.homeTeamId, (gamesPerTeam.get(game.homeTeamId) || 0) + 1);
        gamesPerTeam.set(game.awayTeamId, (gamesPerTeam.get(game.awayTeamId) || 0) + 1);
      }

      for (const team of teams) {
        expect(gamesPerTeam.get(team.id)).toBe(17);
      }
    });

    it('should not schedule any team twice in the same week', () => {
      const schedule = gameState.league.schedule!;

      for (let week = 1; week <= 18; week++) {
        const weekGames = getWeekGames(schedule, week);
        const teamsPlaying = new Set<string>();

        for (const game of weekGames) {
          expect(teamsPlaying.has(game.homeTeamId)).toBe(false);
          expect(teamsPlaying.has(game.awayTeamId)).toBe(false);
          teamsPlaying.add(game.homeTeamId);
          teamsPlaying.add(game.awayTeamId);
        }
      }
    });

    it('should assign bye weeks to all 32 teams within valid range', () => {
      const schedule = gameState.league.schedule!;
      const byeWeeks = schedule.byeWeeks;

      expect(Object.keys(byeWeeks)).toHaveLength(32);

      for (const byeWeek of Object.values(byeWeeks)) {
        expect(byeWeek).toBeGreaterThanOrEqual(5);
        expect(byeWeek).toBeLessThanOrEqual(14);
      }
    });

    it('should have 6 divisional games per team', () => {
      const schedule = gameState.league.schedule!;
      const divGamesPerTeam = new Map<string, number>();

      for (const game of schedule.regularSeason) {
        if (game.isDivisional) {
          divGamesPerTeam.set(game.homeTeamId, (divGamesPerTeam.get(game.homeTeamId) || 0) + 1);
          divGamesPerTeam.set(game.awayTeamId, (divGamesPerTeam.get(game.awayTeamId) || 0) + 1);
        }
      }

      for (const team of teams) {
        expect(divGamesPerTeam.get(team.id)).toBe(6);
      }
    });
  });

  describe('standings accumulation across weeks', () => {
    it('should show increasing total games played across weeks', () => {
      const schedule = gameState.league.schedule!;
      let prevTotalGames = 0;

      for (let week = 1; week <= 5; week++) {
        const results = simulateWeek(week, schedule, gameState, gameState.userTeamId, true);

        // Update schedule for next week
        for (const { game } of results.games) {
          const idx = schedule.regularSeason.findIndex((g) => g.gameId === game.gameId);
          if (idx >= 0) {
            schedule.regularSeason[idx] = game;
          }
        }

        let totalGames = 0;
        for (const conference of ['afc', 'nfc'] as const) {
          for (const division of ['north', 'south', 'east', 'west'] as const) {
            for (const standing of results.standings[conference][division]) {
              totalGames += standing.wins + standing.losses + standing.ties;
            }
          }
        }

        expect(totalGames).toBeGreaterThan(prevTotalGames);
        prevTotalGames = totalGames;
      }
    }, 60000);

    it('should have point differentials that sum to zero league-wide', () => {
      const schedule = gameState.league.schedule!;
      let lastResults: WeekResults | null = null;

      for (let week = 1; week <= 3; week++) {
        lastResults = simulateWeek(week, schedule, gameState, gameState.userTeamId, true);
        for (const { game } of lastResults.games) {
          const idx = schedule.regularSeason.findIndex((g) => g.gameId === game.gameId);
          if (idx >= 0) {
            schedule.regularSeason[idx] = game;
          }
        }
      }

      if (lastResults) {
        let totalPointDiff = 0;
        for (const conference of ['afc', 'nfc'] as const) {
          for (const division of ['north', 'south', 'east', 'west'] as const) {
            for (const standing of lastResults.standings[conference][division]) {
              totalPointDiff += standing.pointDifferential;
            }
          }
        }
        expect(totalPointDiff).toBe(0);
      }
    }, 60000);
  });
});
