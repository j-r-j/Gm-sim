/**
 * History Stats Generator
 * Generates approximate season stats for players during history simulation.
 *
 * Since quick game simulation doesn't run play-by-play, we generate
 * plausible season stats based on:
 * - Player skill level (trueValue averages)
 * - Player position
 * - Whether they're a starter vs backup
 * - Team win/loss record (better teams' players get slightly better stats)
 * - Random variance for realism
 *
 * Stats are calibrated to NFL averages so they look realistic when browsed.
 */

import { Player } from '../models/player/Player';
import { Position } from '../models/player/Position';
import { Team } from '../models/team/Team';
import { determineSkillTierFromPlayer } from '../contracts/ContractGenerator';
import { PlayerSeasonLog, PlayerInjuryRecord, createEmptySeasonLog } from './PlayerHistoryTracker';
import { InjuryType } from '../models/player/InjuryStatus';
import { randomInt } from '../generators/utils/RandomUtils';

// ============================================================================
// STAT GENERATION
// ============================================================================

/**
 * Get a rough overall skill rating for a player (0-100)
 */
function getOverallSkill(player: Player): number {
  const skills = player.skills;
  const trueValues: number[] = [];
  for (const skillValue of Object.values(skills)) {
    if (skillValue && typeof skillValue.trueValue === 'number') {
      trueValues.push(skillValue.trueValue);
    }
  }
  if (trueValues.length === 0) return 50;
  return trueValues.reduce((sum, v) => sum + v, 0) / trueValues.length;
}

/**
 * Determine if a player is a starter on their team based on skill tier
 */
function isStarter(player: Player): boolean {
  const tier = determineSkillTierFromPlayer(player);
  return tier === 'elite' || tier === 'starter';
}

/**
 * Generate a season stat line for a player based on their position and skill
 */
export function generateSeasonStats(
  player: Player,
  team: Team,
  year: number,
  playoffTeamIds: string[],
  championTeamId: string | null
): PlayerSeasonLog {
  const log = createEmptySeasonLog(year, team.id, player.age);
  const skill = getOverallSkill(player);
  const starter = isStarter(player);
  const teamRecord = team.currentRecord;

  // Games played (starters play more, injuries reduce this)
  const injuryRisk = Math.random();
  let gamesPlayed = starter ? 17 : randomInt(4, 14);
  if (injuryRisk < 0.08)
    gamesPlayed = randomInt(0, 6); // Major injury
  else if (injuryRisk < 0.2) gamesPlayed = randomInt(8, 14); // Minor injury
  gamesPlayed = Math.min(17, gamesPlayed);

  log.gamesPlayed = gamesPlayed;
  log.gamesStarted = starter ? gamesPlayed : randomInt(0, Math.min(3, gamesPlayed));
  log.teamWins = teamRecord.wins;
  log.teamLosses = teamRecord.losses;
  log.madePlayoffs = playoffTeamIds.includes(team.id);
  log.wonChampionship = team.id === championTeamId;

  if (gamesPlayed === 0) return log;

  // Scale factor: skill-based multiplier (0.5 to 1.5)
  const skillScale = 0.5 + skill / 100;
  // Team success bonus (slight boost for winning teams)
  const winPct =
    teamRecord.wins + teamRecord.losses > 0
      ? teamRecord.wins / (teamRecord.wins + teamRecord.losses)
      : 0.5;
  const teamBonus = 0.85 + winPct * 0.3; // 0.85 to 1.15

  const pos = player.position;

  // QB stats
  if (pos === Position.QB && starter) {
    const attPerGame = Math.round((30 + randomInt(-5, 8)) * skillScale);
    log.passAttempts = attPerGame * gamesPlayed;
    const compPct = 0.55 + (skill - 50) * 0.004 + Math.random() * 0.05;
    log.passCompletions = Math.round(log.passAttempts * Math.min(0.75, Math.max(0.5, compPct)));
    const ypc = 7 + (skill - 50) * 0.06 + randomInt(-1, 1);
    log.passYards = Math.round(log.passCompletions * ypc * teamBonus);
    log.passTDs = Math.round(
      gamesPlayed * (1.2 + (skill - 50) * 0.03) * teamBonus + randomInt(-3, 3)
    );
    log.passINTs = Math.max(
      0,
      Math.round(gamesPlayed * (0.8 - (skill - 50) * 0.01) + randomInt(-2, 3))
    );
    log.passerRating = calculateApproxPasserRating(
      log.passCompletions,
      log.passAttempts,
      log.passYards,
      log.passTDs,
      log.passINTs
    );
    // QBs also rush
    log.rushAttempts = Math.round(gamesPlayed * randomInt(2, 5));
    log.rushYards = Math.round(log.rushAttempts * (3 + randomInt(-2, 4)));
    log.rushTDs = randomInt(0, Math.max(0, Math.round(gamesPlayed * 0.15)));
  } else if (pos === Position.QB && !starter) {
    // Backup QB: minimal stats
    log.passAttempts = randomInt(0, 30);
    log.passCompletions = Math.round(log.passAttempts * 0.58);
    log.passYards = log.passCompletions * randomInt(5, 9);
    log.passTDs = randomInt(0, 2);
    log.passINTs = randomInt(0, 2);
  }

  // RB stats
  if (pos === Position.RB) {
    if (starter) {
      log.rushAttempts = Math.round(gamesPlayed * (14 + randomInt(-3, 5)) * skillScale);
      const ypcRush = 3.5 + (skill - 50) * 0.04 + Math.random() * 0.8;
      log.rushYards = Math.round(log.rushAttempts * ypcRush * teamBonus);
      log.rushTDs = Math.max(
        0,
        Math.round(gamesPlayed * (0.4 + (skill - 50) * 0.015) * teamBonus + randomInt(-2, 2))
      );
      // Receiving
      log.receptions = Math.round(gamesPlayed * (2.5 + randomInt(-1, 2)));
      log.receivingYards = Math.round(log.receptions * (7 + randomInt(-2, 3)));
      log.receivingTDs = randomInt(0, 3);
    } else {
      log.rushAttempts = Math.round(gamesPlayed * randomInt(2, 6));
      log.rushYards = Math.round(log.rushAttempts * (3.5 + Math.random()));
      log.rushTDs = randomInt(0, 2);
      log.receptions = randomInt(0, gamesPlayed * 2);
      log.receivingYards = log.receptions * randomInt(5, 9);
    }
  }

  // WR stats
  if (pos === Position.WR) {
    if (starter) {
      log.receptions = Math.round(gamesPlayed * (4 + randomInt(-1, 3)) * skillScale);
      const ypr = 11 + (skill - 50) * 0.08 + randomInt(-2, 3);
      log.receivingYards = Math.round(log.receptions * ypr * teamBonus);
      log.receivingTDs = Math.max(
        0,
        Math.round(gamesPlayed * (0.35 + (skill - 50) * 0.012) * teamBonus + randomInt(-2, 2))
      );
    } else {
      log.receptions = randomInt(0, gamesPlayed * 2);
      log.receivingYards = log.receptions * randomInt(8, 14);
      log.receivingTDs = randomInt(0, 2);
    }
  }

  // TE stats
  if (pos === Position.TE) {
    if (starter) {
      log.receptions = Math.round(gamesPlayed * (3 + randomInt(-1, 2)) * skillScale);
      log.receivingYards = Math.round(log.receptions * (9 + randomInt(-2, 3)) * teamBonus);
      log.receivingTDs = Math.max(
        0,
        Math.round(gamesPlayed * (0.25 + (skill - 50) * 0.01) * teamBonus + randomInt(-1, 2))
      );
    } else {
      log.receptions = randomInt(0, gamesPlayed);
      log.receivingYards = log.receptions * randomInt(7, 12);
      log.receivingTDs = randomInt(0, 1);
    }
  }

  // Defensive stats (DE, DT, OLB, ILB, CB, FS, SS)
  if (isDefensivePosition(pos)) {
    if (starter) {
      log.tackles = Math.round(gamesPlayed * getTacklesPerGame(pos, skill) + randomInt(-5, 5));

      if (pos === Position.DE || pos === Position.OLB || pos === Position.DT) {
        log.sacks = Math.max(
          0,
          +(gamesPlayed * getSacksPerGame(pos, skill) + randomInt(-2, 2)).toFixed(1)
        );
      }
      if (pos === Position.CB || pos === Position.FS || pos === Position.SS) {
        log.interceptions = Math.max(
          0,
          Math.round(gamesPlayed * 0.15 * skillScale + randomInt(-1, 2))
        );
      }
      if (pos === Position.ILB || pos === Position.OLB) {
        log.interceptions = Math.max(0, randomInt(0, Math.round(skillScale)));
      }
      log.forcedFumbles = Math.max(0, randomInt(0, Math.round(gamesPlayed * 0.08 * skillScale)));
    } else {
      log.tackles = randomInt(5, gamesPlayed * 3);
      log.sacks = randomInt(0, 2);
      log.interceptions = randomInt(0, 1);
    }
  }

  // K stats
  if (pos === Position.K) {
    if (starter) {
      log.fieldGoalAttempts = Math.round(gamesPlayed * (1.8 + randomInt(-1, 1)));
      const fgPct = 0.75 + (skill - 50) * 0.004 + Math.random() * 0.05;
      log.fieldGoalsMade = Math.round(log.fieldGoalAttempts * Math.min(0.95, fgPct));
    }
  }

  // OL positions: minimal countable stats (just games)
  // P: minimal stats (just games)

  return log;
}

function isDefensivePosition(pos: Position): boolean {
  return [
    Position.DE,
    Position.DT,
    Position.OLB,
    Position.ILB,
    Position.CB,
    Position.FS,
    Position.SS,
  ].includes(pos);
}

function getTacklesPerGame(pos: Position, skill: number): number {
  const base: Partial<Record<Position, number>> = {
    [Position.ILB]: 6,
    [Position.OLB]: 4.5,
    [Position.SS]: 4,
    [Position.FS]: 3.5,
    [Position.CB]: 3,
    [Position.DE]: 3,
    [Position.DT]: 2.5,
  };
  const perGame = base[pos] || 3;
  return perGame * (0.7 + (skill / 100) * 0.6);
}

function getSacksPerGame(pos: Position, skill: number): number {
  const base: Partial<Record<Position, number>> = {
    [Position.DE]: 0.5,
    [Position.OLB]: 0.4,
    [Position.DT]: 0.2,
  };
  const perGame = base[pos] || 0.2;
  return perGame * (0.5 + skill / 100);
}

function calculateApproxPasserRating(
  comp: number,
  att: number,
  yards: number,
  tds: number,
  ints: number
): number {
  if (att === 0) return 0;
  const a = Math.min(2.375, Math.max(0, (comp / att - 0.3) * 5));
  const b = Math.min(2.375, Math.max(0, (yards / att - 3) * 0.25));
  const c = Math.min(2.375, Math.max(0, (tds / att) * 20));
  const d = Math.min(2.375, Math.max(0, 2.375 - (ints / att) * 25));
  return +(((a + b + c + d) / 6) * 100).toFixed(1);
}

// ============================================================================
// INJURY GENERATION
// ============================================================================

const INJURY_TYPES: InjuryType[] = [
  'hamstring',
  'knee',
  'ankle',
  'shoulder',
  'back',
  'foot',
  'hand',
  'elbow',
  'groin',
  'ribs',
  'concussion',
  'acl',
  'mcl',
];

/**
 * Generate random injuries for a player during a simulated season.
 * Returns injury records and total weeks missed.
 */
export function generateSeasonInjuries(
  playerId: string,
  teamId: string,
  year: number,
  gamesPlayed: number
): { injuries: PlayerInjuryRecord[]; weeksMissed: number } {
  const injuries: PlayerInjuryRecord[] = [];
  let weeksMissed = 17 - gamesPlayed;

  if (weeksMissed <= 0) return { injuries, weeksMissed: 0 };

  // Generate 1-2 injuries to account for missed games
  const numInjuries = weeksMissed > 8 ? 1 : weeksMissed > 3 ? randomInt(1, 2) : 1;
  let remainingWeeks = weeksMissed;

  for (let i = 0; i < numInjuries && remainingWeeks > 0; i++) {
    const weeksForThis =
      i === numInjuries - 1 ? remainingWeeks : randomInt(1, Math.max(1, remainingWeeks - 1));

    // Severity determines injury type
    let injuryType: InjuryType;
    if (weeksForThis >= 8) {
      // Major injury
      injuryType = Math.random() < 0.3 ? 'acl' : Math.random() < 0.5 ? 'mcl' : 'knee';
    } else if (weeksForThis >= 4) {
      // Moderate injury
      injuryType = INJURY_TYPES[randomInt(0, INJURY_TYPES.length - 4)];
    } else {
      // Minor
      injuryType = INJURY_TYPES[randomInt(0, INJURY_TYPES.length - 1)];
    }

    const week = randomInt(1, Math.max(1, 17 - weeksForThis));

    injuries.push({
      year,
      week,
      type: injuryType,
      weeksMissed: weeksForThis,
      teamId,
    });

    remainingWeeks -= weeksForThis;
  }

  return { injuries, weeksMissed };
}
