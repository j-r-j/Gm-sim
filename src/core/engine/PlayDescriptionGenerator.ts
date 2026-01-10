/**
 * Play Description Generator
 * Generates human-readable descriptions of plays.
 * This is what users actually see.
 */

import { Player } from '../models/player/Player';
import { PlayType, PlayOutcome } from './OutcomeTables';

/**
 * Drive result types
 */
export type DriveResult =
  | 'touchdown'
  | 'field_goal'
  | 'punt'
  | 'turnover'
  | 'turnover_on_downs'
  | 'end_of_half'
  | 'safety';

/**
 * Play result structure (subset needed for description)
 */
export interface PlayResultForDescription {
  playType: PlayType;
  outcome: PlayOutcome;
  yardsGained: number;
  primaryOffensivePlayer: string;
  primaryDefensivePlayer: string | null;
  turnover: boolean;
  touchdown: boolean;
  firstDown: boolean;
  penaltyOccurred: boolean;
  penaltyDetails: {
    team: 'offense' | 'defense';
    type: string;
    yards: number;
    playerId: string | null;
  } | null;
}

/**
 * Get player name abbreviation (F. LastName)
 */
function getPlayerName(player: Player): string {
  return `${player.firstName.charAt(0)}. ${player.lastName}`;
}

/**
 * Get player name from ID using player map
 */
function getPlayerNameById(playerId: string, players: Map<string, Player>): string {
  const player = players.get(playerId);
  if (!player) return 'Unknown';
  return getPlayerName(player);
}

/**
 * Get direction string for run plays
 */
function getRunDirection(playType: PlayType): string {
  const directions = ['left', 'right', 'up the middle'];

  if (playType === 'run_inside' || playType === 'qb_sneak') {
    return 'up the middle';
  }

  if (playType === 'run_outside' || playType === 'run_sweep') {
    return Math.random() < 0.5 ? 'left' : 'right';
  }

  return directions[Math.floor(Math.random() * directions.length)];
}

/**
 * Get direction string for pass plays
 */
function getPassDirection(): string {
  const directions = ['left', 'right', 'deep left', 'deep right', 'over the middle'];
  return directions[Math.floor(Math.random() * directions.length)];
}

/**
 * Format yards string
 */
function formatYards(yards: number): string {
  if (yards === 0) return 'no gain';
  if (yards === 1) return '1 yard';
  if (yards === -1) return 'loss of 1 yard';
  if (yards < 0) return `loss of ${Math.abs(yards)} yards`;
  return `${yards} yards`;
}

/**
 * Generate description for run plays
 */
function generateRunDescription(
  result: PlayResultForDescription,
  players: Map<string, Player>
): string {
  const rusher = getPlayerNameById(result.primaryOffensivePlayer, players);
  const direction = getRunDirection(result.playType);

  if (result.outcome === 'touchdown') {
    return `${rusher} rush ${direction} for ${result.yardsGained} yards, TOUCHDOWN!`;
  }

  if (result.outcome === 'fumble') {
    return `${rusher} rush ${direction} for ${formatYards(result.yardsGained)}, FUMBLE recovered by offense`;
  }

  if (result.outcome === 'fumble_lost') {
    const defender = result.primaryDefensivePlayer
      ? getPlayerNameById(result.primaryDefensivePlayer, players)
      : 'defense';
    return `${rusher} rush ${direction} for ${formatYards(result.yardsGained)}, FUMBLE recovered by ${defender}`;
  }

  if (result.outcome === 'big_gain') {
    return `${rusher} rush ${direction} for ${result.yardsGained} yards`;
  }

  // Standard run
  let desc = `${rusher} rush ${direction} for ${formatYards(result.yardsGained)}`;

  if (result.firstDown && result.yardsGained > 0) {
    desc += ' (First Down)';
  }

  return desc;
}

/**
 * Generate description for QB sneak
 */
function generateSneakDescription(
  result: PlayResultForDescription,
  players: Map<string, Player>
): string {
  const qb = getPlayerNameById(result.primaryOffensivePlayer, players);

  if (result.outcome === 'touchdown') {
    return `${qb} QB sneak for ${result.yardsGained} yards, TOUCHDOWN!`;
  }

  let desc = `${qb} QB sneak for ${formatYards(result.yardsGained)}`;

  if (result.firstDown && result.yardsGained > 0) {
    desc += ' (First Down)';
  }

  return desc;
}

/**
 * Generate description for pass plays
 */
function generatePassDescription(
  result: PlayResultForDescription,
  players: Map<string, Player>
): string {
  const qb = getPlayerNameById(result.primaryOffensivePlayer, players);
  const receiver = result.primaryDefensivePlayer
    ? getPlayerNameById(result.primaryDefensivePlayer, players)
    : 'receiver';

  if (result.outcome === 'incomplete') {
    return `${qb} pass incomplete`;
  }

  if (result.outcome === 'sack') {
    const defender = result.primaryDefensivePlayer
      ? getPlayerNameById(result.primaryDefensivePlayer, players)
      : '';
    if (defender) {
      return `${qb} sacked by ${defender} for ${formatYards(result.yardsGained)}`;
    }
    return `${qb} sacked for ${formatYards(result.yardsGained)}`;
  }

  if (result.outcome === 'interception') {
    const defender = result.primaryDefensivePlayer
      ? getPlayerNameById(result.primaryDefensivePlayer, players)
      : 'defense';
    return `${qb} pass INTERCEPTED by ${defender}`;
  }

  if (result.outcome === 'touchdown') {
    const direction = getPassDirection();
    return `${qb} pass ${direction} to ${receiver} for ${result.yardsGained} yards, TOUCHDOWN!`;
  }

  if (result.outcome === 'fumble_lost') {
    return `${qb} pass complete to ${receiver}, FUMBLE lost`;
  }

  if (result.outcome === 'fumble') {
    return `${qb} pass complete to ${receiver}, FUMBLE recovered by offense`;
  }

  // Completed pass
  const direction = getPassDirection();
  let desc = `${qb} pass ${direction} to ${receiver} for ${formatYards(result.yardsGained)}`;

  if (result.firstDown && result.yardsGained > 0) {
    desc += ' (First Down)';
  }

  return desc;
}

/**
 * Generate description for screen passes
 */
function generateScreenDescription(
  result: PlayResultForDescription,
  players: Map<string, Player>
): string {
  const qb = getPlayerNameById(result.primaryOffensivePlayer, players);
  const receiver = result.primaryDefensivePlayer
    ? getPlayerNameById(result.primaryDefensivePlayer, players)
    : 'receiver';

  if (result.outcome === 'touchdown') {
    return `${qb} screen pass to ${receiver} for ${result.yardsGained} yards, TOUCHDOWN!`;
  }

  if (result.outcome === 'incomplete') {
    return `${qb} screen pass incomplete`;
  }

  if (result.outcome === 'loss' || result.outcome === 'big_loss') {
    return `${qb} screen pass to ${receiver} for ${formatYards(result.yardsGained)}`;
  }

  let desc = `${qb} screen pass to ${receiver} for ${formatYards(result.yardsGained)}`;

  if (result.firstDown && result.yardsGained > 0) {
    desc += ' (First Down)';
  }

  return desc;
}

/**
 * Generate description for play action passes
 */
function generatePlayActionDescription(
  result: PlayResultForDescription,
  players: Map<string, Player>
): string {
  const qb = getPlayerNameById(result.primaryOffensivePlayer, players);
  const receiver = result.primaryDefensivePlayer
    ? getPlayerNameById(result.primaryDefensivePlayer, players)
    : 'receiver';

  if (result.outcome === 'incomplete') {
    return `${qb} play action, pass incomplete`;
  }

  if (result.outcome === 'sack') {
    return `${qb} play action, sacked for ${formatYards(result.yardsGained)}`;
  }

  if (result.outcome === 'interception') {
    const defender = result.primaryDefensivePlayer
      ? getPlayerNameById(result.primaryDefensivePlayer, players)
      : 'defense';
    return `${qb} play action, pass INTERCEPTED by ${defender}`;
  }

  if (result.outcome === 'touchdown') {
    return `${qb} play action pass to ${receiver} for ${result.yardsGained} yards, TOUCHDOWN!`;
  }

  let desc = `${qb} play action pass to ${receiver} for ${formatYards(result.yardsGained)}`;

  if (result.firstDown && result.yardsGained > 0) {
    desc += ' (First Down)';
  }

  return desc;
}

/**
 * Generate description for penalties
 */
function generatePenaltyDescription(
  result: PlayResultForDescription,
  players: Map<string, Player>
): string {
  if (!result.penaltyDetails) {
    // No details available - return generic penalty description
    return 'PENALTY on the field';
  }

  const { team, type, yards, playerId } = result.penaltyDetails;
  const playerName = playerId ? getPlayerNameById(playerId, players) : null;

  if (playerName) {
    return `PENALTY: ${type} on ${playerName} (${team}), ${yards} yards`;
  }

  return `PENALTY: ${type} on ${team}, ${yards} yards`;
}

/**
 * Generate human-readable play description
 * This is what users actually see
 *
 * @param result - The play result
 * @param players - Map of player IDs to Player objects
 * @returns Human-readable description string
 */
export function generatePlayDescription(
  result: PlayResultForDescription,
  players: Map<string, Player>
): string {
  // Handle penalties first
  if (result.penaltyOccurred && result.penaltyDetails) {
    return generatePenaltyDescription(result, players);
  }

  // Generate based on play type
  switch (result.playType) {
    case 'run_inside':
    case 'run_outside':
    case 'run_draw':
    case 'run_sweep':
    case 'qb_scramble':
      return generateRunDescription(result, players);

    case 'qb_sneak':
      return generateSneakDescription(result, players);

    case 'pass_short':
    case 'pass_medium':
    case 'pass_deep':
      return generatePassDescription(result, players);

    case 'pass_screen':
      return generateScreenDescription(result, players);

    case 'play_action_short':
    case 'play_action_deep':
      return generatePlayActionDescription(result, players);

    case 'field_goal':
      if (result.outcome === 'field_goal_made') {
        return 'Field goal is GOOD!';
      }
      return 'Field goal attempt is NO GOOD';

    case 'punt':
      return `Punt for ${result.yardsGained} yards`;

    case 'kickoff':
      return `Kickoff returned for ${result.yardsGained} yards`;

    default:
      return `Play result: ${formatYards(result.yardsGained)}`;
  }
}

/**
 * Generate drive summary
 *
 * @param plays - Array of play results
 * @param result - How the drive ended
 * @returns Summary string
 */
export function generateDriveSummary(
  plays: PlayResultForDescription[],
  result: DriveResult
): string {
  const numPlays = plays.length;
  const totalYards = plays.reduce((sum, p) => sum + p.yardsGained, 0);

  let resultString: string;
  switch (result) {
    case 'touchdown':
      resultString = 'TOUCHDOWN';
      break;
    case 'field_goal':
      resultString = 'FIELD GOAL';
      break;
    case 'punt':
      resultString = 'Punt';
      break;
    case 'turnover':
      resultString = 'Turnover';
      break;
    case 'turnover_on_downs':
      resultString = 'Turnover on Downs';
      break;
    case 'end_of_half':
      resultString = 'End of Half';
      break;
    case 'safety':
      resultString = 'SAFETY';
      break;
    default:
      resultString = 'Drive ended';
  }

  return `Drive: ${numPlays} plays, ${totalYards} yards - ${resultString}`;
}

/**
 * Generate quarter summary
 */
export function generateQuarterSummary(
  quarter: number,
  homeScore: number,
  awayScore: number,
  homeTeam: string,
  awayTeam: string
): string {
  const quarterName =
    quarter === 5
      ? 'Overtime'
      : quarter === 1
        ? '1st Quarter'
        : quarter === 2
          ? '2nd Quarter'
          : quarter === 3
            ? '3rd Quarter'
            : '4th Quarter';

  return `End of ${quarterName}: ${awayTeam} ${awayScore}, ${homeTeam} ${homeScore}`;
}

/**
 * Generate game summary
 */
export function generateGameSummary(
  homeScore: number,
  awayScore: number,
  homeTeam: string,
  awayTeam: string
): string {
  const winner = homeScore > awayScore ? homeTeam : awayTeam;
  const loser = homeScore > awayScore ? awayTeam : homeTeam;
  const winScore = Math.max(homeScore, awayScore);
  const loseScore = Math.min(homeScore, awayScore);

  if (homeScore === awayScore) {
    return `FINAL: ${awayTeam} ${awayScore}, ${homeTeam} ${homeScore} (TIE)`;
  }

  return `FINAL: ${winner} defeats ${loser}, ${winScore}-${loseScore}`;
}

/**
 * Generate scoring play description
 */
export function generateScoringPlayDescription(
  play: PlayResultForDescription,
  players: Map<string, Player>,
  scoringTeam: string,
  points: number
): string {
  const baseDescription = generatePlayDescription(play, players);

  if (points === 6) {
    return `${scoringTeam} - ${baseDescription}`;
  }

  if (points === 3) {
    return `${scoringTeam} - Field Goal`;
  }

  if (points === 7) {
    return `${scoringTeam} - ${baseDescription} (PAT Good)`;
  }

  if (points === 8) {
    return `${scoringTeam} - ${baseDescription} (2PT Conversion Good)`;
  }

  if (points === 2) {
    return `${scoringTeam} - Safety`;
  }

  return `${scoringTeam} - ${baseDescription} (+${points})`;
}
