/**
 * Bye Week Manager
 * Handles bye week assignment for the 17-game NFL season
 * Uses 2025 NFL bye week pattern as template
 */

import { Team } from '../models/team/Team';
import { Conference, Division } from '../models/team/FakeCities';

/**
 * Valid bye weeks (weeks 5-14 in NFL)
 */
export const BYE_WEEK_START = 5;
export const BYE_WEEK_END = 14;
export const TOTAL_BYE_WEEKS = BYE_WEEK_END - BYE_WEEK_START + 1;

/**
 * NFL Bye Week Template - perfectly balanced distribution
 * Exactly 4 teams on bye each week from 5-12, 0 teams weeks 13-14
 * This guarantees 272 games can be scheduled:
 * - Weeks 1-4: 16 games × 4 = 64
 * - Weeks 5-12: 14 games × 8 = 112
 * - Weeks 13-18: 16 games × 6 = 96
 * - Total: 272 games ✓
 */
const BYE_WEEK_TEMPLATE: Record<Conference, Record<Division, number[]>> = {
  AFC: {
    East: [5, 6, 7, 8],
    North: [9, 10, 11, 12],
    South: [5, 6, 7, 8],
    West: [9, 10, 11, 12],
  },
  NFC: {
    East: [5, 9, 6, 10],
    North: [7, 11, 8, 12],
    South: [5, 9, 6, 10],
    West: [7, 11, 8, 12],
  },
};

/**
 * Bye week assignment for a team
 */
export interface TeamByeWeek {
  teamId: string;
  byeWeek: number;
}

/**
 * Assigns bye weeks to all teams based on 2025 NFL template
 *
 * @param teams - Array of all 32 teams
 * @returns Map of teamId to bye week number
 */
export function assignByeWeeks(teams: Team[]): Map<string, number> {
  const byeWeeks = new Map<string, number>();

  // Group teams by conference and division
  const teamsByDivision = new Map<string, Team[]>();

  for (const team of teams) {
    const key = `${team.conference}-${team.division}`;
    const existing = teamsByDivision.get(key) || [];
    existing.push(team);
    teamsByDivision.set(key, existing);
  }

  // Assign bye weeks based on template
  for (const [key, divisionTeams] of teamsByDivision) {
    const [conference, division] = key.split('-') as [Conference, Division];
    const byePattern = BYE_WEEK_TEMPLATE[conference][division];

    // Sort teams by id for deterministic assignment
    const sortedTeams = [...divisionTeams].sort((a, b) => a.id.localeCompare(b.id));

    sortedTeams.forEach((team, index) => {
      byeWeeks.set(team.id, byePattern[index]);
    });
  }

  return byeWeeks;
}

/**
 * Checks if a team is on bye during a specific week
 *
 * @param teamId - The team to check
 * @param week - The week number (1-18)
 * @param byeWeeks - Object mapping team IDs to bye weeks
 * @returns True if team is on bye
 */
export function isOnBye(
  teamId: string,
  week: number,
  byeWeeks: Record<string, number> | Map<string, number>
): boolean {
  // Support both Map (from assignByeWeeks) and plain object (from JSON deserialization)
  const byeWeek = byeWeeks instanceof Map ? byeWeeks.get(teamId) : byeWeeks[teamId];
  return byeWeek === week;
}

/**
 * Gets all teams on bye for a specific week
 *
 * @param week - The week number
 * @param byeWeeks - Object mapping team IDs to bye weeks
 * @returns Array of team IDs on bye
 */
export function getTeamsOnBye(
  week: number,
  byeWeeks: Record<string, number> | Map<string, number>
): string[] {
  const teamsOnBye: string[] = [];

  const entries =
    byeWeeks instanceof Map ? Array.from(byeWeeks.entries()) : Object.entries(byeWeeks);

  for (const [teamId, byeWeek] of entries) {
    if (byeWeek === week) {
      teamsOnBye.push(teamId);
    }
  }

  return teamsOnBye;
}

/**
 * Gets the number of teams on bye for each week
 *
 * @param byeWeeks - Object mapping team IDs to bye weeks
 * @returns Map of week number to count of teams on bye
 */
export function getByeWeekDistribution(
  byeWeeks: Record<string, number> | Map<string, number>
): Map<number, number> {
  const distribution = new Map<number, number>();

  for (let week = BYE_WEEK_START; week <= BYE_WEEK_END; week++) {
    distribution.set(week, 0);
  }

  const values = byeWeeks instanceof Map ? Array.from(byeWeeks.values()) : Object.values(byeWeeks);

  for (const byeWeek of values) {
    const current = distribution.get(byeWeek) || 0;
    distribution.set(byeWeek, current + 1);
  }

  return distribution;
}

/**
 * Validates bye week assignment
 *
 * @param byeWeeks - Object mapping team IDs to bye weeks
 * @param teams - Array of all teams
 * @returns True if valid
 */
export function validateByeWeeks(
  byeWeeks: Record<string, number> | Map<string, number>,
  teams: Team[]
): boolean {
  const size = byeWeeks instanceof Map ? byeWeeks.size : Object.keys(byeWeeks).length;
  const values = byeWeeks instanceof Map ? Array.from(byeWeeks.values()) : Object.values(byeWeeks);
  const getByeWeek = (teamId: string) =>
    byeWeeks instanceof Map ? byeWeeks.get(teamId) : byeWeeks[teamId];

  // Every team should have a bye
  if (size !== teams.length) {
    return false;
  }

  // All byes should be in valid range
  for (const byeWeek of values) {
    if (byeWeek < BYE_WEEK_START || byeWeek > BYE_WEEK_END) {
      return false;
    }
  }

  // No division should have all 4 teams on the same bye
  const divisionByes = new Map<string, Set<number>>();

  for (const team of teams) {
    const key = `${team.conference}-${team.division}`;
    const byeWeek = getByeWeek(team.id);

    if (byeWeek === undefined) return false;

    const existing = divisionByes.get(key) || new Set();
    existing.add(byeWeek);
    divisionByes.set(key, existing);
  }

  // Each division should have at least 2 different bye weeks
  for (const byes of divisionByes.values()) {
    if (byes.size < 2) {
      return false;
    }
  }

  return true;
}

/**
 * Gets teams available to play in a specific week (not on bye)
 *
 * @param week - The week number
 * @param teams - Array of all teams
 * @param byeWeeks - Object mapping team IDs to bye weeks
 * @returns Array of teams available to play
 */
export function getAvailableTeams(
  week: number,
  teams: Team[],
  byeWeeks: Record<string, number> | Map<string, number>
): Team[] {
  return teams.filter((team) => !isOnBye(team.id, week, byeWeeks));
}

/**
 * Gets the bye week for a specific team
 *
 * @param teamId - The team ID
 * @param byeWeeks - Object mapping team IDs to bye weeks
 * @returns The bye week number, or undefined if not found
 */
export function getTeamByeWeek(
  teamId: string,
  byeWeeks: Record<string, number> | Map<string, number>
): number | undefined {
  return byeWeeks instanceof Map ? byeWeeks.get(teamId) : byeWeeks[teamId];
}
