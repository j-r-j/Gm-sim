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
 * 2025 NFL Bye Week Template
 * Maps division to bye week assignment
 * This ensures balanced distribution and no division has all teams on same bye
 */
const BYE_WEEK_TEMPLATE: Record<Conference, Record<Division, number[]>> = {
  AFC: {
    East: [6, 9, 11, 14],
    North: [5, 7, 10, 13],
    South: [6, 8, 12, 14],
    West: [7, 9, 11, 13],
  },
  NFC: {
    East: [5, 8, 10, 12],
    North: [6, 9, 11, 14],
    South: [7, 10, 12, 13],
    West: [5, 8, 11, 14],
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
 * @param byeWeeks - Map of team bye weeks
 * @returns True if team is on bye
 */
export function isOnBye(
  teamId: string,
  week: number,
  byeWeeks: Map<string, number>
): boolean {
  const byeWeek = byeWeeks.get(teamId);
  return byeWeek === week;
}

/**
 * Gets all teams on bye for a specific week
 *
 * @param week - The week number
 * @param byeWeeks - Map of team bye weeks
 * @returns Array of team IDs on bye
 */
export function getTeamsOnBye(
  week: number,
  byeWeeks: Map<string, number>
): string[] {
  const teamsOnBye: string[] = [];

  for (const [teamId, byeWeek] of byeWeeks) {
    if (byeWeek === week) {
      teamsOnBye.push(teamId);
    }
  }

  return teamsOnBye;
}

/**
 * Gets the number of teams on bye for each week
 *
 * @param byeWeeks - Map of team bye weeks
 * @returns Map of week number to count of teams on bye
 */
export function getByeWeekDistribution(
  byeWeeks: Map<string, number>
): Map<number, number> {
  const distribution = new Map<number, number>();

  for (let week = BYE_WEEK_START; week <= BYE_WEEK_END; week++) {
    distribution.set(week, 0);
  }

  for (const byeWeek of byeWeeks.values()) {
    const current = distribution.get(byeWeek) || 0;
    distribution.set(byeWeek, current + 1);
  }

  return distribution;
}

/**
 * Validates bye week assignment
 *
 * @param byeWeeks - Map of team bye weeks
 * @param teams - Array of all teams
 * @returns True if valid
 */
export function validateByeWeeks(
  byeWeeks: Map<string, number>,
  teams: Team[]
): boolean {
  // Every team should have a bye
  if (byeWeeks.size !== teams.length) {
    return false;
  }

  // All byes should be in valid range
  for (const byeWeek of byeWeeks.values()) {
    if (byeWeek < BYE_WEEK_START || byeWeek > BYE_WEEK_END) {
      return false;
    }
  }

  // No division should have all 4 teams on the same bye
  const divisionByes = new Map<string, Set<number>>();

  for (const team of teams) {
    const key = `${team.conference}-${team.division}`;
    const byeWeek = byeWeeks.get(team.id);

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
 * @param byeWeeks - Map of team bye weeks
 * @returns Array of teams available to play
 */
export function getAvailableTeams(
  week: number,
  teams: Team[],
  byeWeeks: Map<string, number>
): Team[] {
  return teams.filter((team) => !isOnBye(team.id, week, byeWeeks));
}

/**
 * Gets the bye week for a specific team
 *
 * @param teamId - The team ID
 * @param byeWeeks - Map of team bye weeks
 * @returns The bye week number, or undefined if not found
 */
export function getTeamByeWeek(
  teamId: string,
  byeWeeks: Map<string, number>
): number | undefined {
  return byeWeeks.get(teamId);
}
