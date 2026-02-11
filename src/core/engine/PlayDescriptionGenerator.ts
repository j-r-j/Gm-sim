/**
 * Play Description Generator
 * Generates human-readable descriptions of plays.
 * This is what users actually see.
 */

import { Player } from '../models/player/Player';
import { PlayType, PlayOutcome } from './OutcomeTables';

/**
 * Optional context for richer play descriptions
 */
export interface PlayDescriptionContext {
  fatiguedPlayers?: string[];
  keyMatchup?: { offensePlayer: string; defensePlayer: string; winner: string };
  driveMomentum?: 'hot' | 'stalled' | 'neutral';
}

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
 * Pick a random element from an array
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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
    const variants = [
      `${rusher} powers in ${direction} from ${result.yardsGained} out, TOUCHDOWN!`,
      `${rusher} punches it in for a ${result.yardsGained}-yard score!`,
      `${rusher} walks in untouched ${direction} from ${result.yardsGained} yards, TOUCHDOWN!`,
      `${rusher} dives into the end zone from ${result.yardsGained} yards out!`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'fumble') {
    const variants = [
      `${rusher} rush ${direction} for ${formatYards(result.yardsGained)}, coughs it up! Recovered by offense`,
      `${rusher} rush ${direction} for ${formatYards(result.yardsGained)}, FUMBLE recovered by offense`,
      `${rusher} has the ball stripped after ${formatYards(result.yardsGained)}, recovered by offense`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'fumble_lost') {
    const defender = result.primaryDefensivePlayer
      ? getPlayerNameById(result.primaryDefensivePlayer, players)
      : 'defense';
    const variants = [
      `${rusher} rush ${direction} for ${formatYards(result.yardsGained)}, FUMBLE recovered by ${defender}`,
      `${rusher} coughs it up after ${formatYards(result.yardsGained)}! ${defender} recovers`,
      `${rusher} loses the handle, ${defender} pounces on the loose ball`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'big_gain') {
    const variants = [
      `${rusher} bursts through ${direction} for ${result.yardsGained} yards!`,
      `${rusher} breaks loose for ${result.yardsGained} yards!`,
      `${rusher} explodes through the hole for ${result.yardsGained} yards!`,
      `${rusher} finds daylight ${direction} for ${result.yardsGained} yards!`,
    ];
    return pickRandom(variants);
  }

  // Standard run
  const standardVariants = [
    `${rusher} rushes ${direction} for ${formatYards(result.yardsGained)}`,
    `${rusher} picks up ${formatYards(result.yardsGained)} on the ground`,
    `${rusher} gains ${formatYards(result.yardsGained)} ${direction}`,
    `${rusher} runs ${direction} for ${formatYards(result.yardsGained)}`,
  ];
  let desc = pickRandom(standardVariants);

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
    const variants = [
      `${qb} QB sneak for ${result.yardsGained} yards, TOUCHDOWN!`,
      `${qb} pushes his way in on the sneak, TOUCHDOWN!`,
      `${qb} dives over the pile for the score!`,
    ];
    return pickRandom(variants);
  }

  const variants = [
    `${qb} pushes forward for ${formatYards(result.yardsGained)} on the sneak`,
    `${qb} muscles ahead for ${formatYards(result.yardsGained)}`,
    `${qb} dives forward for ${formatYards(result.yardsGained)} on the QB sneak`,
    `${qb} QB sneak for ${formatYards(result.yardsGained)}`,
  ];
  let desc = pickRandom(variants);

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
    const variants = [
      `${qb} throws it away`,
      `${qb} can't connect with ${receiver}`,
      `${qb} pass falls incomplete`,
      `${qb} just misses ${receiver}`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'sack') {
    const defender = result.primaryDefensivePlayer
      ? getPlayerNameById(result.primaryDefensivePlayer, players)
      : '';
    if (defender) {
      const variants = [
        `${qb} brought down by ${defender}!`,
        `${qb} sacked by ${defender} for ${formatYards(result.yardsGained)}`,
        `${qb} dragged down by ${defender} behind the line!`,
        `${qb} buried by ${defender} for a ${Math.abs(result.yardsGained)}-yard loss!`,
      ];
      return pickRandom(variants);
    }
    const variants = [
      `${qb} sacked for ${formatYards(result.yardsGained)}`,
      `${qb} can't escape the rush!`,
      `${qb} dragged down behind the line!`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'interception') {
    const defender = result.primaryDefensivePlayer
      ? getPlayerNameById(result.primaryDefensivePlayer, players)
      : 'defense';
    const variants = [
      `${qb} pass INTERCEPTED by ${defender}!`,
      `${qb} picked off by ${defender}!`,
      `${qb} throws it right to ${defender}!`,
      `INTERCEPTED! ${defender} comes away with the ball!`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'touchdown') {
    const direction = getPassDirection();
    const variants = [
      `${qb} fires ${direction} to ${receiver} for the TOUCHDOWN!`,
      `${qb} connects with ${receiver} for a ${result.yardsGained}-yard score!`,
      `${qb} hits ${receiver} in stride ${direction}, TOUCHDOWN!`,
      `${qb} delivers to ${receiver} in the end zone, TOUCHDOWN!`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'fumble_lost') {
    const variants = [
      `${qb} pass complete to ${receiver}, FUMBLE lost`,
      `${qb} finds ${receiver} but the ball is stripped! Turnover`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'fumble') {
    const variants = [
      `${qb} pass complete to ${receiver}, FUMBLE recovered by offense`,
      `${qb} hits ${receiver} who loses the handle, but offense recovers`,
    ];
    return pickRandom(variants);
  }

  // Completed pass
  const direction = getPassDirection();
  const variants = [
    `${qb} finds ${receiver} ${direction} for ${formatYards(result.yardsGained)}`,
    `${qb} delivers to ${receiver} for ${formatYards(result.yardsGained)}`,
    `${qb} hits ${receiver} ${direction} for ${formatYards(result.yardsGained)}`,
    `${qb} connects with ${receiver} for a ${formatYards(result.yardsGained)} gain`,
  ];
  let desc = pickRandom(variants);

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
    const variants = [
      `${qb} screen pass to ${receiver} for ${result.yardsGained} yards, TOUCHDOWN!`,
      `${qb} dumps it off to ${receiver} who takes it ${result.yardsGained} yards to the house!`,
      `${qb} flips the screen to ${receiver}, ${receiver} breaks free for the TOUCHDOWN!`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'incomplete') {
    const variants = [
      `${qb} screen pass incomplete`,
      `${qb} flips the screen but it falls incomplete`,
      `${qb} tosses the screen, but it's batted down`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'loss' || result.outcome === 'big_loss') {
    const variants = [
      `${qb} screen pass to ${receiver} for ${formatYards(result.yardsGained)}`,
      `${qb} dumps it off to ${receiver} who is swallowed up for ${formatYards(result.yardsGained)}`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'big_gain') {
    const variants = [
      `${qb} dumps it off to ${receiver}, ${receiver} turns the corner for ${result.yardsGained} yards!`,
      `${qb} tosses the screen to ${receiver}, ${receiver} breaks free for ${result.yardsGained} yards!`,
      `${qb} flips it to ${receiver} who finds room to run for ${result.yardsGained} yards!`,
    ];
    return pickRandom(variants);
  }

  const variants = [
    `${qb} dumps it off to ${receiver} for ${formatYards(result.yardsGained)}`,
    `${qb} flips it to ${receiver} for ${formatYards(result.yardsGained)}`,
    `${qb} tosses the screen to ${receiver} for ${formatYards(result.yardsGained)}`,
    `${qb} screen pass to ${receiver} for ${formatYards(result.yardsGained)}`,
  ];
  let desc = pickRandom(variants);

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

  const fakePrefix = pickRandom([
    `${qb} fakes the handoff and`,
    `${qb} sells the play-action,`,
    `${qb} boots out after the fake,`,
    `${qb} play action,`,
  ]);

  if (result.outcome === 'incomplete') {
    const variants = [
      `${fakePrefix} throws it away`,
      `${fakePrefix} pass falls incomplete`,
      `${fakePrefix} can't find anyone open`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'sack') {
    const variants = [
      `${fakePrefix} but is brought down for ${formatYards(result.yardsGained)}`,
      `${fakePrefix} sacked for ${formatYards(result.yardsGained)}`,
      `${fakePrefix} can't escape the rush!`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'interception') {
    const defender = result.primaryDefensivePlayer
      ? getPlayerNameById(result.primaryDefensivePlayer, players)
      : 'defense';
    const variants = [
      `${fakePrefix} INTERCEPTED by ${defender}!`,
      `${fakePrefix} throws it right to ${defender}!`,
      `${fakePrefix} picked off by ${defender}!`,
    ];
    return pickRandom(variants);
  }

  if (result.outcome === 'touchdown') {
    const variants = [
      `${fakePrefix} fires to ${receiver} for the TOUCHDOWN!`,
      `${fakePrefix} hits ${receiver} in stride for a ${result.yardsGained}-yard score!`,
      `${fakePrefix} delivers to ${receiver} in the end zone!`,
    ];
    return pickRandom(variants);
  }

  const variants = [
    `${fakePrefix} finds ${receiver} for ${formatYards(result.yardsGained)}`,
    `${fakePrefix} connects with ${receiver} for ${formatYards(result.yardsGained)}`,
    `${fakePrefix} delivers to ${receiver} for ${formatYards(result.yardsGained)}`,
  ];
  let desc = pickRandom(variants);

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
 * Append optional context-aware flavor to a play description
 */
function applyContextFlavor(
  desc: string,
  result: PlayResultForDescription,
  context?: PlayDescriptionContext
): string {
  if (!context) return desc;

  // Check if a fatigued player is involved (~20% chance to mention)
  if (context.fatiguedPlayers && Math.random() < 0.2) {
    const involvedPlayers = [result.primaryOffensivePlayer, result.primaryDefensivePlayer].filter(
      Boolean
    ) as string[];
    const fatigued = involvedPlayers.find((p) => context.fatiguedPlayers!.includes(p));
    if (fatigued) {
      const fatiguePhrase = pickRandom([', despite looking gassed', ', visibly tiring']);
      desc += fatiguePhrase;
    }
  }

  // Check if key matchup was decisive (~30% chance to mention)
  if (context.keyMatchup && Math.random() < 0.3) {
    const { offensePlayer, defensePlayer, winner } = context.keyMatchup;
    const involvedPlayers = [result.primaryOffensivePlayer, result.primaryDefensivePlayer];
    if (involvedPlayers.includes(offensePlayer) || involvedPlayers.includes(defensePlayer)) {
      if (winner === offensePlayer) {
        desc += pickRandom([', easily beating his man', ', winning the matchup decisively']);
      } else {
        desc += pickRandom([', despite strong coverage', ', against tight coverage']);
      }
    }
  }

  return desc;
}

/**
 * Generate human-readable play description
 * This is what users actually see
 *
 * @param result - The play result
 * @param players - Map of player IDs to Player objects
 * @param context - Optional context for richer descriptions
 * @returns Human-readable description string
 */
export function generatePlayDescription(
  result: PlayResultForDescription,
  players: Map<string, Player>,
  context?: PlayDescriptionContext
): string {
  // Handle penalties first
  if (result.penaltyOccurred && result.penaltyDetails) {
    return generatePenaltyDescription(result, players);
  }

  let desc: string;

  // Generate based on play type
  switch (result.playType) {
    case 'run_inside':
    case 'run_outside':
    case 'run_draw':
    case 'run_sweep':
    case 'qb_scramble':
      desc = generateRunDescription(result, players);
      break;

    case 'qb_sneak':
      desc = generateSneakDescription(result, players);
      break;

    case 'pass_short':
    case 'pass_medium':
    case 'pass_deep':
      desc = generatePassDescription(result, players);
      break;

    case 'pass_screen':
      desc = generateScreenDescription(result, players);
      break;

    case 'play_action_short':
    case 'play_action_deep':
      desc = generatePlayActionDescription(result, players);
      break;

    case 'field_goal':
      if (result.outcome === 'field_goal_made') {
        desc = pickRandom([
          'Field goal is GOOD!',
          "The kick is up... and it's GOOD!",
          'Splits the uprights! Field goal is GOOD!',
        ]);
      } else {
        desc = pickRandom([
          'Field goal attempt is NO GOOD',
          'The kick is wide! No good',
          'Misses! Field goal attempt is no good',
        ]);
      }
      return desc;

    case 'punt':
      desc = pickRandom([
        `Punt for ${result.yardsGained} yards`,
        `Punts it ${result.yardsGained} yards downfield`,
        `Booms the punt ${result.yardsGained} yards`,
      ]);
      return desc;

    case 'kickoff':
      desc = pickRandom([
        `Kickoff returned for ${result.yardsGained} yards`,
        `Brings the kickoff back ${result.yardsGained} yards`,
        `Kickoff return of ${result.yardsGained} yards`,
      ]);
      return desc;

    default:
      return `Play result: ${formatYards(result.yardsGained)}`;
  }

  return applyContextFlavor(desc, result, context);
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
