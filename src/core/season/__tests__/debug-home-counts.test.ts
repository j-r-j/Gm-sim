/**
 * Debug test to trace home/away counts for failing years
 */
/* eslint-disable no-console */
import {
  generateSeasonSchedule,
  createDefaultStandings,
  get17thGameHomeConference,
} from '../ScheduleGenerator';
import { Team, createEmptyTeamRecord } from '../../models/team/Team';
import { FAKE_CITIES } from '../../models/team/FakeCities';
import { createDefaultStadium } from '../../models/team/Stadium';
import { createDefaultTeamFinances } from '../../models/team/TeamFinances';
import { createEmptyStaffHierarchy } from '../../models/staff/StaffHierarchy';

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

describe('Debug Home Counts', () => {
  it('should analyze home counts for 2023', () => {
    const teams = createTestTeams();
    const standings = createDefaultStandings(teams);
    const schedule = generateSeasonSchedule(teams, standings, 2023);

    console.log('17th game home conference for 2023:', get17thGameHomeConference(2023));

    // Count home games per component per team
    const teamStats = new Map<
      string,
      { A: number; B: number; C: number; D: number; E: number; total: number }
    >();
    for (const team of teams) {
      teamStats.set(team.id, { A: 0, B: 0, C: 0, D: 0, E: 0, total: 0 });
    }

    for (const game of schedule.regularSeason) {
      const stats = teamStats.get(game.homeTeamId)!;
      stats[game.component]++;
      stats.total++;
    }

    // Find teams with wrong home count
    const afcTeamsWithWrongHome = teams.filter((t) => {
      const stats = teamStats.get(t.id)!;
      return t.conference === 'AFC' && stats.total !== 9;
    });

    if (afcTeamsWithWrongHome.length > 0) {
      console.log('AFC teams with wrong home count:');
      for (const team of afcTeamsWithWrongHome.slice(0, 3)) {
        const stats = teamStats.get(team.id)!;
        console.log(`${team.city} ${team.nickname} (${team.division}):`, stats);
      }
    }

    // Check a specific team in detail - first AFC North team
    const baltimoreLike = teams.find((t) => t.conference === 'AFC' && t.division === 'North');
    if (baltimoreLike) {
      const teamGames = schedule.regularSeason.filter(
        (g) => g.homeTeamId === baltimoreLike.id || g.awayTeamId === baltimoreLike.id
      );

      console.log(`\n${baltimoreLike.city} (ID: ${baltimoreLike.id}) games by component:`);
      for (const comp of ['A', 'B', 'C', 'D', 'E'] as const) {
        const compGames = teamGames.filter((g) => g.component === comp);
        const homeGames = compGames.filter((g) => g.homeTeamId === baltimoreLike.id);
        console.log(`  ${comp}: ${homeGames.length}H/${compGames.length - homeGames.length}A`);

        // Show D games in detail
        if (comp === 'D') {
          for (const game of compGames) {
            const opponentId =
              game.homeTeamId === baltimoreLike.id ? game.awayTeamId : game.homeTeamId;
            const opponent = teams.find((t) => t.id === opponentId);
            const isHome = game.homeTeamId === baltimoreLike.id;
            console.log(
              `    vs ${opponent?.city} ${opponent?.division}: ${isHome ? 'HOME' : 'away'}`
            );
          }
        }
      }
    }

    // Show all Component D games
    console.log('\nAll Component D games (AFC):');
    const componentDGames = schedule.regularSeason.filter((g) => g.component === 'D');
    const afcDGames = componentDGames.filter((g) => {
      const homeTeam = teams.find((t) => t.id === g.homeTeamId);
      return homeTeam?.conference === 'AFC';
    });
    console.log(
      `Total Component D games: ${componentDGames.length}, AFC home: ${afcDGames.length}`
    );

    expect(true).toBe(true);
  });
});
