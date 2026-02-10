/**
 * Quick Game Simulator
 * Generates realistic game scores based on team strength ratings
 * without running full play-by-play simulation.
 *
 * Used for pre-history simulation where performance matters more than
 * individual play detail. Produces score distributions matching real NFL games.
 */

import { Team } from '../models/team/Team';
import { Player } from '../models/player/Player';
import { Coach } from '../models/staff/Coach';
import { ScheduledGame } from '../season/ScheduleGenerator';
import { randomInt } from '../generators/utils/RandomUtils';

/**
 * Quick game result - minimal output for history tracking
 */
export interface QuickGameResult {
  homeScore: number;
  awayScore: number;
  winnerId: string;
  loserId: string;
  isTie: boolean;
}

/**
 * Team strength factors used to generate scores
 */
interface TeamStrength {
  offense: number; // 0-100
  defense: number; // 0-100
  overall: number; // 0-100
}

/**
 * Calculate a team's strength from its roster and coach
 */
export function calculateTeamStrength(
  team: Team,
  players: Record<string, Player>,
  coaches: Record<string, Coach>
): TeamStrength {
  const rosterPlayers = team.rosterPlayerIds
    .map((id) => players[id])
    .filter((p): p is Player => p != null);

  if (rosterPlayers.length === 0) {
    return { offense: 40, defense: 40, overall: 40 };
  }

  // Calculate average skill rating across roster
  let offenseTotal = 0;
  let offenseCount = 0;
  let defenseTotal = 0;
  let defenseCount = 0;

  for (const player of rosterPlayers) {
    // Use the true overall skill value from technical skills
    const skills = player.skills;
    const overallSkill = getPlayerOverallRating(skills);

    if (isOffensivePosition(player.position)) {
      offenseTotal += overallSkill;
      offenseCount++;
    } else if (isDefensivePosition(player.position)) {
      defenseTotal += overallSkill;
      defenseCount++;
    }
  }

  const offense = offenseCount > 0 ? offenseTotal / offenseCount : 40;
  const defense = defenseCount > 0 ? defenseTotal / defenseCount : 40;

  // Coach bonus: better coaches slightly boost team performance
  const teamCoaches = Object.values(coaches).filter((c) => c.teamId === team.id);
  let coachBonus = 0;
  for (const coach of teamCoaches) {
    if (coach.attributes) {
      coachBonus += (coach.attributes.gameDayIQ - 50) * 0.05;
    }
  }

  const adjustedOffense = Math.max(20, Math.min(95, offense + coachBonus));
  const adjustedDefense = Math.max(20, Math.min(95, defense + coachBonus));
  const overall = (adjustedOffense + adjustedDefense) / 2;

  return {
    offense: Math.round(adjustedOffense),
    defense: Math.round(adjustedDefense),
    overall: Math.round(overall),
  };
}

/**
 * Get a rough overall rating from a player's technical skills.
 * TechnicalSkills is { [skillName: string]: SkillValue } where SkillValue has trueValue.
 */
function getPlayerOverallRating(skills: Player['skills']): number {
  const trueValues: number[] = [];

  for (const skillValue of Object.values(skills)) {
    if (skillValue && typeof skillValue.trueValue === 'number') {
      trueValues.push(skillValue.trueValue);
    }
  }

  if (trueValues.length === 0) return 50;
  return trueValues.reduce((sum, v) => sum + v, 0) / trueValues.length;
}

function isOffensivePosition(position: string): boolean {
  return ['QB', 'RB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT'].includes(position);
}

function isDefensivePosition(position: string): boolean {
  return ['DE', 'DT', 'OLB', 'ILB', 'CB', 'FS', 'SS'].includes(position);
}

/**
 * NFL average scoring: ~22 points per team per game
 * Standard deviation: ~10 points
 * Home field advantage: ~3 points
 *
 * Score generation uses team strength to shift the distribution
 */
const BASE_SCORE = 22;
const SCORE_STDDEV = 10;
const HOME_FIELD_ADVANTAGE = 3;

/**
 * Generate a score for one team based on their offensive strength
 * vs the opponent's defensive strength, with randomness
 */
function generateTeamScore(
  offenseStrength: number,
  opponentDefenseStrength: number,
  isHome: boolean
): number {
  // Strength differential adjusts the mean score
  // A 60-offense vs 40-defense should score more than baseline
  const strengthDiff = (offenseStrength - opponentDefenseStrength) / 100;
  const strengthAdjustment = strengthDiff * 14; // max ±14 points from strength

  const homeBonus = isHome ? HOME_FIELD_ADVANTAGE : 0;
  const mean = BASE_SCORE + strengthAdjustment + homeBonus;

  // Box-Muller for approximate normal distribution
  const u1 = Math.random() || 0.001;
  const u2 = Math.random() || 0.001;
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const rawScore = mean + z * SCORE_STDDEV;

  // Round to realistic NFL-like scores (mostly multiples of 3 and 7)
  const score = Math.max(0, Math.round(rawScore));

  return score;
}

/**
 * Simulate a single game quickly using team strength ratings
 */
export function simulateQuickGame(
  homeTeam: Team,
  awayTeam: Team,
  players: Record<string, Player>,
  coaches: Record<string, Coach>
): QuickGameResult {
  const homeStrength = calculateTeamStrength(homeTeam, players, coaches);
  const awayStrength = calculateTeamStrength(awayTeam, players, coaches);

  let homeScore = generateTeamScore(homeStrength.offense, awayStrength.defense, true);
  let awayScore = generateTeamScore(awayStrength.offense, homeStrength.defense, false);

  // Handle ties - NFL regular season games go to OT
  // ~1% of NFL games end in a tie
  if (homeScore === awayScore) {
    // Overtime: 90% chance someone wins, 10% stays tied
    if (Math.random() < 0.9) {
      // OT field goal (3 points) for one team
      if (Math.random() < 0.55) {
        homeScore += 3; // Slight home advantage in OT
      } else {
        awayScore += 3;
      }
    }
  }

  const isTie = homeScore === awayScore;
  const winnerId = isTie ? homeTeam.id : homeScore > awayScore ? homeTeam.id : awayTeam.id;
  const loserId = isTie ? awayTeam.id : homeScore > awayScore ? awayTeam.id : homeTeam.id;

  return {
    homeScore,
    awayScore,
    winnerId,
    loserId,
    isTie,
  };
}

/**
 * Simulate all games in a week and update the scheduled games with results
 */
export function simulateWeekQuick(
  weekGames: ScheduledGame[],
  teams: Record<string, Team>,
  players: Record<string, Player>,
  coaches: Record<string, Coach>
): ScheduledGame[] {
  return weekGames.map((game) => {
    if (game.isComplete) return game;

    const homeTeam = teams[game.homeTeamId];
    const awayTeam = teams[game.awayTeamId];

    if (!homeTeam || !awayTeam) {
      return game;
    }

    const result = simulateQuickGame(homeTeam, awayTeam, players, coaches);

    return {
      ...game,
      isComplete: true,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      winnerId: result.isTie ? null : result.winnerId,
    };
  });
}

/**
 * Update team records based on completed games
 */
export function updateTeamRecords(
  teams: Record<string, Team>,
  completedGames: ScheduledGame[]
): Record<string, Team> {
  const updatedTeams = { ...teams };

  for (const game of completedGames) {
    if (!game.isComplete || game.homeScore === null || game.awayScore === null) continue;

    const homeTeam = updatedTeams[game.homeTeamId];
    const awayTeam = updatedTeams[game.awayTeamId];
    if (!homeTeam || !awayTeam) continue;

    const homeWon = game.homeScore > game.awayScore;
    const tied = game.homeScore === game.awayScore;

    // Update current season records
    const updateRecord = (
      team: Team,
      won: boolean,
      isTie: boolean,
      pointsFor: number,
      pointsAgainst: number,
      isDivisional: boolean,
      isConference: boolean
    ): Team => {
      const record = { ...team.currentRecord };
      if (isTie) {
        record.ties++;
      } else if (won) {
        record.wins++;
        record.streak = record.streak >= 0 ? record.streak + 1 : 1;
      } else {
        record.losses++;
        record.streak = record.streak <= 0 ? record.streak - 1 : -1;
      }
      record.pointsFor += pointsFor;
      record.pointsAgainst += pointsAgainst;

      if (isDivisional) {
        if (isTie) {
          /* no division tie tracking in current model */
        } else if (won) {
          record.divisionWins++;
        } else {
          record.divisionLosses++;
        }
      }
      if (isConference) {
        if (isTie) {
          /* no conference tie tracking in current model */
        } else if (won) {
          record.conferenceWins++;
        } else {
          record.conferenceLosses++;
        }
      }

      return { ...team, currentRecord: record };
    };

    updatedTeams[game.homeTeamId] = updateRecord(
      homeTeam,
      homeWon,
      tied,
      game.homeScore,
      game.awayScore,
      game.isDivisional,
      game.isConference
    );
    updatedTeams[game.awayTeamId] = updateRecord(
      awayTeam,
      !homeWon && !tied,
      tied,
      game.awayScore,
      game.homeScore,
      game.isDivisional,
      game.isConference
    );
  }

  return updatedTeams;
}

/**
 * Simulate a playoff game (no ties allowed)
 */
export function simulatePlayoffGameQuick(
  homeTeam: Team,
  awayTeam: Team,
  players: Record<string, Player>,
  coaches: Record<string, Coach>
): QuickGameResult {
  const homeStrength = calculateTeamStrength(homeTeam, players, coaches);
  const awayStrength = calculateTeamStrength(awayTeam, players, coaches);

  let homeScore = generateTeamScore(homeStrength.offense, awayStrength.defense, true);
  let awayScore = generateTeamScore(awayStrength.offense, homeStrength.defense, false);

  // No ties in playoffs - keep playing OT
  while (homeScore === awayScore) {
    // Add OT scoring - typically a field goal
    if (Math.random() < 0.55) {
      homeScore += randomInt(3, 7);
    } else {
      awayScore += randomInt(3, 7);
    }
  }

  return {
    homeScore,
    awayScore,
    winnerId: homeScore > awayScore ? homeTeam.id : awayTeam.id,
    loserId: homeScore > awayScore ? awayTeam.id : homeTeam.id,
    isTie: false,
  };
}
