/**
 * Season End Phase (Phase 1)
 * Handles season recap, grades, awards, draft order calculation,
 * narrative season write-up, stat improvements, and rating clarity reveals.
 */

import {
  OffSeasonState,
  SeasonRecap,
  SkillRatingReveal,
  PlayerStatImprovement,
  setSeasonRecap,
  setDraftOrder,
  addEvent,
  completeTask,
} from '../OffSeasonPhaseManager';
import { Player } from '../../models/player/Player';
import { SkillValue } from '../../models/player/TechnicalSkills';
import { PlayerSeasonStats } from '../../game/SeasonStatsAggregator';

/**
 * Season grade thresholds
 */
export type PlayerGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

/**
 * Award types
 */
export type AwardType =
  | 'MVP'
  | 'OPOY'
  | 'DPOY'
  | 'OROY'
  | 'DROY'
  | 'CPOY'
  | 'WPMOY'
  | 'All-Pro First Team'
  | 'All-Pro Second Team'
  | 'Pro Bowl';

/**
 * Player season grade data
 */
export interface PlayerSeasonGrade {
  playerId: string;
  playerName: string;
  position: string;
  overallGrade: PlayerGrade;
  categories: {
    production: PlayerGrade;
    consistency: PlayerGrade;
    impact: PlayerGrade;
  };
  highlights: string[];
  concerns: string[];
}

/**
 * Award winner data
 */
export interface AwardWinner {
  award: AwardType;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  stats: string;
}

/**
 * Calculates a player grade based on performance
 */
export function calculatePlayerGrade(
  gamesPlayed: number,
  gamesStarted: number,
  performanceRating: number // 0-100
): PlayerGrade {
  // Penalize for missed games
  const availabilityFactor = Math.min(gamesPlayed / 17, 1);
  const adjustedRating = performanceRating * availabilityFactor;

  if (adjustedRating >= 95) return 'A+';
  if (adjustedRating >= 90) return 'A';
  if (adjustedRating >= 85) return 'A-';
  if (adjustedRating >= 80) return 'B+';
  if (adjustedRating >= 75) return 'B';
  if (adjustedRating >= 70) return 'B-';
  if (adjustedRating >= 65) return 'C+';
  if (adjustedRating >= 60) return 'C';
  if (adjustedRating >= 55) return 'C-';
  if (adjustedRating >= 45) return 'D';
  return 'F';
}

/**
 * Converts grade to numeric value for sorting
 */
export function gradeToNumber(grade: PlayerGrade): number {
  const gradeMap: Record<PlayerGrade, number> = {
    'A+': 12,
    A: 11,
    'A-': 10,
    'B+': 9,
    B: 8,
    'B-': 7,
    'C+': 6,
    C: 5,
    'C-': 4,
    D: 3,
    F: 1,
  };
  return gradeMap[grade];
}

/**
 * Generates season recap from season data
 */
export function generateSeasonRecap(
  year: number,
  teamId: string,
  teamRecord: { wins: number; losses: number; ties: number },
  divisionFinish: number,
  madePlayoffs: boolean,
  playoffResult: string | null,
  draftPosition: number,
  playerGrades: PlayerSeasonGrade[],
  awards: AwardWinner[]
): SeasonRecap {
  // Get top 5 performers
  const sortedGrades = [...playerGrades].sort(
    (a, b) => gradeToNumber(b.overallGrade) - gradeToNumber(a.overallGrade)
  );

  const topPerformers = sortedGrades.slice(0, 5).map((g) => ({
    playerId: g.playerId,
    playerName: g.playerName,
    position: g.position,
    grade: g.overallGrade,
  }));

  // Get team awards
  const teamAwards = awards
    .filter((a) => a.teamId === teamId)
    .map((a) => ({
      award: a.award,
      playerId: a.playerId,
      playerName: a.playerName,
    }));

  return {
    year,
    teamRecord,
    divisionFinish,
    madePlayoffs,
    playoffResult,
    draftPosition,
    topPerformers,
    awards: teamAwards,
    seasonWriteUp: '',
    playerImprovements: [],
  };
}

/**
 * Calculates draft order based on standings
 */
export function calculateDraftOrderFromStandings(
  standings: Array<{
    teamId: string;
    wins: number;
    losses: number;
    ties: number;
    playoffSeed: number | null;
    playoffElimRound: string | null;
    superBowlWinner: boolean;
  }>
): string[] {
  // Sort by:
  // 1. Super Bowl winner picks last
  // 2. Playoff teams pick later (by elimination round)
  // 3. Non-playoff teams by record (worst first)

  const sortedTeams = [...standings].sort((a, b) => {
    // Super Bowl winner picks last
    if (a.superBowlWinner) return 1;
    if (b.superBowlWinner) return -1;

    // Playoff teams
    if (a.playoffSeed && b.playoffSeed) {
      // Order by elimination round (earlier = earlier pick)
      const roundOrder: Record<string, number> = {
        wildCard: 1,
        divisional: 2,
        conference: 3,
        superBowl: 4,
      };
      const aRound = a.playoffElimRound ? roundOrder[a.playoffElimRound] || 0 : 4;
      const bRound = b.playoffElimRound ? roundOrder[b.playoffElimRound] || 0 : 4;
      if (aRound !== bRound) return aRound - bRound;
    }

    // Non-playoff before playoff
    if (a.playoffSeed && !b.playoffSeed) return 1;
    if (!a.playoffSeed && b.playoffSeed) return -1;

    // By record (worst first)
    const aWinPct = (a.wins + a.ties * 0.5) / (a.wins + a.losses + a.ties);
    const bWinPct = (b.wins + b.ties * 0.5) / (b.wins + b.losses + b.ties);
    return aWinPct - bWinPct;
  });

  return sortedTeams.map((t) => t.teamId);
}

/**
 * Generates playoff result description
 */
export function getPlayoffResultDescription(
  madePlayoffs: boolean,
  playoffSeed: number | null,
  eliminationRound: string | null,
  wonSuperBowl: boolean
): string | null {
  if (!madePlayoffs) return null;
  if (wonSuperBowl) return 'Super Bowl Champions';

  if (!eliminationRound) return 'Made Playoffs';

  const roundDescriptions: Record<string, string> = {
    wildCard: 'Lost in Wild Card Round',
    divisional: 'Lost in Divisional Round',
    conference: 'Lost in Conference Championship',
    superBowl: 'Super Bowl Runner-Up',
  };

  const baseDesc = roundDescriptions[eliminationRound] || 'Eliminated from Playoffs';
  return playoffSeed ? `#${playoffSeed} Seed - ${baseDesc}` : baseDesc;
}

/**
 * Processes season end phase
 */
export function processSeasonEnd(
  state: OffSeasonState,
  recap: SeasonRecap,
  draftOrder: string[]
): OffSeasonState {
  let newState = state;

  // Set recap
  newState = setSeasonRecap(newState, recap);

  // Set draft order
  newState = setDraftOrder(newState, draftOrder);

  // Add events for key accomplishments
  if (recap.madePlayoffs) {
    newState = addEvent(
      newState,
      'award',
      `Made playoffs as ${recap.divisionFinish === 1 ? 'Division Champion' : 'Wild Card'}`,
      { playoffResult: recap.playoffResult }
    );
  }

  for (const award of recap.awards) {
    newState = addEvent(newState, 'award', `${award.playerName} won ${award.award}`, {
      award,
    });
  }

  // Complete the view recap task
  newState = completeTask(newState, 'view_recap');

  return newState;
}

/**
 * Gets season summary text
 */
export function getSeasonSummaryText(recap: SeasonRecap): string {
  const { teamRecord, madePlayoffs, playoffResult, draftPosition } = recap;
  const recordStr = `${teamRecord.wins}-${teamRecord.losses}${teamRecord.ties > 0 ? `-${teamRecord.ties}` : ''}`;

  let summary = `Season Record: ${recordStr}`;

  if (madePlayoffs && playoffResult) {
    summary += `\n${playoffResult}`;
  } else {
    summary += '\nMissed Playoffs';
  }

  summary += `\nDraft Position: #${draftPosition}`;

  if (recap.awards.length > 0) {
    summary += `\nAwards: ${recap.awards.length}`;
  }

  return summary;
}

/**
 * Gets award display text
 */
export function getAwardDisplayText(award: AwardWinner): string {
  return `${award.award}: ${award.playerName} (${award.teamName}) - ${award.stats}`;
}

/**
 * Calculates a clarity factor (0-1) based on tenure and playing time.
 * Higher clarity = more of the true rating is revealed.
 *
 * - Tenure (years with team): familiarity with the player grows over time
 * - Playing time: more snaps = more film = better evaluation
 *
 * Tenure contributes up to 40% clarity, playing time up to 60%.
 */
export function calculateClarityFactor(
  yearsWithTeam: number,
  gamesPlayed: number,
  gamesStarted: number
): number {
  // Tenure clarity: 10% per year, maxing at 40% after 4+ years
  const tenureClarity = Math.min(yearsWithTeam * 0.1, 0.4);

  // Playing time clarity: based on starts and appearances
  // Full-time starter (17 starts) = 60%, part-time contributor scales down
  const startFraction = Math.min(gamesStarted / 17, 1.0);
  const playedFraction = Math.min(gamesPlayed / 17, 1.0);
  // Weighted: starts matter more than appearances
  const playingTimeClarity = startFraction * 0.45 + playedFraction * 0.15;

  return Math.min(tenureClarity + playingTimeClarity, 1.0);
}

/**
 * Narrows a single skill's perceived range based on clarity factor.
 * Returns the updated SkillValue and a reveal description.
 *
 * clarityFactor 0 = no change, 1 = fully revealed (perceived range collapses to true value)
 */
export function narrowSkillRange(
  skill: SkillValue,
  clarityFactor: number
): { updated: SkillValue; reveal: SkillRatingReveal | null } {
  if (clarityFactor <= 0) {
    return { updated: skill, reveal: null };
  }

  const currentRange = skill.perceivedMax - skill.perceivedMin;
  if (currentRange <= 0) {
    // Already fully revealed
    return { updated: skill, reveal: null };
  }

  // How much of the gap between perceived bounds and trueValue to close
  const minGap = skill.trueValue - skill.perceivedMin;
  const maxGap = skill.perceivedMax - skill.trueValue;

  const minNarrow = Math.round(minGap * clarityFactor);
  const maxNarrow = Math.round(maxGap * clarityFactor);

  // Don't narrow if the change would be negligible
  if (minNarrow === 0 && maxNarrow === 0) {
    return { updated: skill, reveal: null };
  }

  const newMin = Math.min(skill.perceivedMin + minNarrow, skill.trueValue);
  const newMax = Math.max(skill.perceivedMax - maxNarrow, skill.trueValue);

  const updated: SkillValue = {
    ...skill,
    perceivedMin: newMin,
    perceivedMax: newMax,
  };

  return { updated, reveal: null };
}

/**
 * Applies rating clarity reveals to a player based on tenure and playing time.
 * Returns the updated player and a list of skill reveals.
 */
export function applyRatingClarity(
  player: Player,
  yearsWithTeam: number,
  seasonStats: PlayerSeasonStats | undefined
): { updatedPlayer: Player; reveals: SkillRatingReveal[] } {
  const gamesPlayed = seasonStats?.gamesPlayed ?? 0;
  const gamesStarted = seasonStats?.gamesStarted ?? 0;

  const clarityFactor = calculateClarityFactor(yearsWithTeam, gamesPlayed, gamesStarted);

  if (clarityFactor <= 0) {
    return { updatedPlayer: player, reveals: [] };
  }

  const reveals: SkillRatingReveal[] = [];
  const newSkills: Record<string, SkillValue> = {};

  for (const [skillName, skillValue] of Object.entries(player.skills)) {
    const previousMin = skillValue.perceivedMin;
    const previousMax = skillValue.perceivedMax;

    const { updated } = narrowSkillRange(skillValue, clarityFactor);
    newSkills[skillName] = updated;

    // Record meaningful narrowing
    if (updated.perceivedMin !== previousMin || updated.perceivedMax !== previousMax) {
      reveals.push({
        skillName,
        previousMin,
        previousMax,
        newMin: updated.perceivedMin,
        newMax: updated.perceivedMax,
        isFullyRevealed: updated.perceivedMin === updated.perceivedMax,
      });
    }
  }

  const updatedPlayer: Player = {
    ...player,
    skills: newSkills,
  };

  return { updatedPlayer, reveals };
}

/**
 * Generates a position-appropriate stat line string for a player
 */
export function generateStatLine(player: Player, stats: PlayerSeasonStats | undefined): string {
  if (!stats || stats.gamesPlayed === 0) {
    return 'Did not play';
  }

  const pos = player.position;

  // QB
  if (pos === 'QB' && stats.passing.attempts > 0) {
    const compPct =
      stats.passing.attempts > 0
        ? Math.round((stats.passing.completions / stats.passing.attempts) * 100)
        : 0;
    return `${stats.passing.yards} yds, ${stats.passing.touchdowns} TD, ${stats.passing.interceptions} INT (${compPct}% comp)`;
  }

  // RB
  if (pos === 'RB') {
    const parts: string[] = [];
    if (stats.rushing.attempts > 0) {
      parts.push(`${stats.rushing.yards} rush yds, ${stats.rushing.touchdowns} TD`);
    }
    if (stats.receiving.receptions > 0) {
      parts.push(`${stats.receiving.receptions} rec, ${stats.receiving.yards} rec yds`);
    }
    return parts.join(' | ') || 'Did not play';
  }

  // WR / TE
  if (pos === 'WR' || pos === 'TE') {
    if (stats.receiving.targets > 0) {
      return `${stats.receiving.receptions} rec, ${stats.receiving.yards} yds, ${stats.receiving.touchdowns} TD`;
    }
    return `${stats.gamesPlayed} GP`;
  }

  // OL
  if (pos === 'LT' || pos === 'LG' || pos === 'C' || pos === 'RG' || pos === 'RT') {
    return `${stats.gamesStarted} GS`;
  }

  // DL
  if (pos === 'DE' || pos === 'DT') {
    return `${stats.defensive.tackles} tkl, ${stats.defensive.sacks} sacks, ${stats.defensive.tacklesForLoss} TFL`;
  }

  // LB
  if (pos === 'ILB' || pos === 'OLB') {
    return `${stats.defensive.tackles} tkl, ${stats.defensive.sacks} sacks, ${stats.defensive.interceptions} INT`;
  }

  // DB
  if (pos === 'CB' || pos === 'SS' || pos === 'FS') {
    return `${stats.defensive.tackles} tkl, ${stats.defensive.interceptions} INT, ${stats.defensive.passesDefended} PD`;
  }

  // K
  if (pos === 'K') {
    const fgPct =
      stats.kicking.fieldGoalAttempts > 0
        ? Math.round((stats.kicking.fieldGoalsMade / stats.kicking.fieldGoalAttempts) * 100)
        : 0;
    return `${stats.kicking.fieldGoalsMade}/${stats.kicking.fieldGoalAttempts} FG (${fgPct}%)`;
  }

  // P
  if (pos === 'P') {
    return `${stats.gamesPlayed} GP`;
  }

  // Default
  return `${stats.gamesPlayed} GP, ${stats.gamesStarted} GS`;
}

/**
 * Generates a player stat improvement entry for the season recap
 */
export function generatePlayerImprovement(
  player: Player,
  stats: PlayerSeasonStats | undefined,
  yearsWithTeam: number,
  grade: PlayerGrade
): { improvement: PlayerStatImprovement; updatedPlayer: Player } {
  const { updatedPlayer, reveals } = applyRatingClarity(player, yearsWithTeam, stats);

  const improvement: PlayerStatImprovement = {
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    position: player.position,
    gamesPlayed: stats?.gamesPlayed ?? 0,
    gamesStarted: stats?.gamesStarted ?? 0,
    statLine: generateStatLine(player, stats),
    grade,
    ratingReveals: reveals,
    totalSkillsNarrowed: reveals.length,
    hadFullReveal: reveals.some((r) => r.isFullyRevealed),
  };

  return { improvement, updatedPlayer };
}

/**
 * Generates a narrative season write-up
 */
export function generateSeasonWriteUp(
  teamName: string,
  teamRecord: { wins: number; losses: number; ties: number },
  divisionFinish: number,
  madePlayoffs: boolean,
  playoffResult: string | null,
  topPerformers: Array<{ playerName: string; position: string; grade: string }>,
  playerImprovements: PlayerStatImprovement[]
): string {
  const { wins, losses, ties } = teamRecord;
  const recordStr = `${wins}-${losses}${ties > 0 ? `-${ties}` : ''}`;
  const totalGames = wins + losses + ties;
  const winPct = totalGames > 0 ? wins / totalGames : 0;

  const paragraphs: string[] = [];

  // Opening paragraph - record and overall feel
  let opener: string;
  if (winPct >= 0.75) {
    opener = `The ${teamName} delivered a dominant ${recordStr} campaign, establishing themselves as one of the league's elite teams.`;
  } else if (winPct >= 0.59) {
    opener = `The ${teamName} posted a solid ${recordStr} record, proving to be a competitive force throughout the season.`;
  } else if (winPct >= 0.41) {
    opener = `The ${teamName} finished the year at ${recordStr} in a season of ups and downs that left the fan base with mixed feelings.`;
  } else if (winPct >= 0.25) {
    opener = `It was a tough year for the ${teamName}, who limped to a ${recordStr} finish and will enter the offseason with plenty of questions to answer.`;
  } else {
    opener = `The ${teamName} endured a brutal ${recordStr} season that tested the patience of the front office, coaching staff, and fans alike.`;
  }

  // Division finish context
  const divisionSuffix =
    divisionFinish === 1 ? 'st' : divisionFinish === 2 ? 'nd' : divisionFinish === 3 ? 'rd' : 'th';
  opener += ` They finished ${divisionFinish}${divisionSuffix} in the division.`;
  paragraphs.push(opener);

  // Playoff paragraph
  if (madePlayoffs && playoffResult) {
    if (playoffResult === 'Super Bowl Champions') {
      paragraphs.push(
        `The season culminated in a Super Bowl championship, capping off a remarkable run through the playoffs. This is a year the organization will never forget.`
      );
    } else if (playoffResult.includes('Super Bowl Runner-Up')) {
      paragraphs.push(
        `The team made an impressive run all the way to the Super Bowl, ultimately falling short in the final game. While the loss stings, the postseason experience is invaluable.`
      );
    } else if (playoffResult.includes('Conference')) {
      paragraphs.push(
        `A deep playoff run ended in the Conference Championship. The team proved they can compete with the best, but will need to find that extra gear to get over the hump.`
      );
    } else if (playoffResult.includes('Divisional')) {
      paragraphs.push(
        `The playoffs brought a Divisional Round exit. The team showed they belong in the postseason conversation, but there is still work to do to become a true contender.`
      );
    } else {
      paragraphs.push(
        `A Wild Card appearance gave the team playoff experience, though an early exit left the roster hungry for more. The foundation is there to build on.`
      );
    }
  } else {
    if (winPct >= 0.41) {
      paragraphs.push(
        `Despite a competitive season, the team fell short of the playoff picture. The offseason will be critical for addressing the gaps that kept them out of the postseason.`
      );
    } else {
      paragraphs.push(
        `Missing the playoffs was expected given the record, and the focus now shifts entirely to rebuilding and roster improvement heading into next year.`
      );
    }
  }

  // Top performers paragraph
  if (topPerformers.length > 0) {
    const performerNames = topPerformers
      .slice(0, 3)
      .map((p) => `${p.playerName} (${p.position}, ${p.grade})`);
    let performerText: string;
    if (performerNames.length === 1) {
      performerText = `Leading the way was ${performerNames[0]}, who stood out as the team's best player this season.`;
    } else if (performerNames.length === 2) {
      performerText = `The team was led by ${performerNames[0]} and ${performerNames[1]}, both of whom delivered strong seasons.`;
    } else {
      performerText = `On the field, ${performerNames.slice(0, -1).join(', ')}, and ${performerNames[performerNames.length - 1]} all earned top marks for their contributions.`;
    }
    paragraphs.push(performerText);
  }

  // Rating reveal paragraph
  const playersWithReveals = playerImprovements.filter((p) => p.totalSkillsNarrowed > 0);
  const playersFullyRevealed = playerImprovements.filter((p) => p.hadFullReveal);

  if (playersWithReveals.length > 0) {
    let revealText = `The coaching staff now has a clearer picture of ${playersWithReveals.length} player${playersWithReveals.length !== 1 ? 's' : ''} on the roster after a full season of evaluation.`;
    if (playersFullyRevealed.length > 0) {
      const revealedNames = playersFullyRevealed.slice(0, 3).map((p) => p.playerName);
      if (revealedNames.length === 1) {
        revealText += ` ${revealedNames[0]}'s abilities are now fully understood by the organization.`;
      } else {
        revealText += ` The front office now has a complete read on ${revealedNames.join(' and ')}.`;
      }
    }
    paragraphs.push(revealText);
  }

  return paragraphs.join('\n\n');
}

/**
 * Processes the full season end with write-up, stat improvements, and rating reveals.
 * Returns updated players with narrowed perceived ratings and the enriched recap.
 */
export function processSeasonEndWithReveals(
  state: OffSeasonState,
  teamId: string,
  teamName: string,
  teamRecord: { wins: number; losses: number; ties: number },
  divisionFinish: number,
  madePlayoffs: boolean,
  playoffResult: string | null,
  draftPosition: number,
  rosterPlayers: Player[],
  seasonStats: Record<string, PlayerSeasonStats>,
  playerTenures: Record<string, number>,
  playerGrades: PlayerSeasonGrade[],
  awards: AwardWinner[],
  draftOrder: string[]
): {
  offseasonState: OffSeasonState;
  updatedPlayers: Player[];
} {
  const year = state.year;

  // Build a grade lookup
  const gradeByPlayerId = new Map<string, PlayerGrade>();
  for (const g of playerGrades) {
    gradeByPlayerId.set(g.playerId, g.overallGrade);
  }

  // Generate player improvements and apply rating clarity
  const updatedPlayers: Player[] = [];
  const playerImprovements: PlayerStatImprovement[] = [];

  for (const player of rosterPlayers) {
    const stats = seasonStats[player.id];
    const tenure = playerTenures[player.id] ?? 1;
    const grade = gradeByPlayerId.get(player.id) ?? 'C';

    const { improvement, updatedPlayer } = generatePlayerImprovement(player, stats, tenure, grade);

    updatedPlayers.push(updatedPlayer);
    playerImprovements.push(improvement);
  }

  // Sort improvements: most games played first, then by grade
  playerImprovements.sort((a, b) => {
    if (b.gamesStarted !== a.gamesStarted) return b.gamesStarted - a.gamesStarted;
    return gradeToNumber(b.grade as PlayerGrade) - gradeToNumber(a.grade as PlayerGrade);
  });

  // Get top performers
  const sortedGrades = [...playerGrades].sort(
    (a, b) => gradeToNumber(b.overallGrade) - gradeToNumber(a.overallGrade)
  );
  const topPerformers = sortedGrades.slice(0, 5).map((g) => ({
    playerId: g.playerId,
    playerName: g.playerName,
    position: g.position,
    grade: g.overallGrade,
  }));

  // Get team awards
  const teamAwards = awards
    .filter((a) => a.teamId === teamId)
    .map((a) => ({
      award: a.award,
      playerId: a.playerId,
      playerName: a.playerName,
    }));

  // Generate narrative write-up
  const seasonWriteUp = generateSeasonWriteUp(
    teamName,
    teamRecord,
    divisionFinish,
    madePlayoffs,
    playoffResult,
    topPerformers,
    playerImprovements
  );

  const recap: SeasonRecap = {
    year,
    teamRecord,
    divisionFinish,
    madePlayoffs,
    playoffResult,
    draftPosition,
    topPerformers,
    awards: teamAwards,
    seasonWriteUp,
    playerImprovements,
  };

  // Apply to offseason state
  let newState = state;
  newState = setSeasonRecap(newState, recap);
  newState = setDraftOrder(newState, draftOrder);

  // Add events
  if (madePlayoffs) {
    newState = addEvent(
      newState,
      'award',
      `Made playoffs as ${divisionFinish === 1 ? 'Division Champion' : 'Wild Card'}`,
      { playoffResult }
    );
  }

  for (const award of recap.awards) {
    newState = addEvent(newState, 'award', `${award.playerName} won ${award.award}`, {
      award,
    });
  }

  // Add reveal events for notable reveals
  const notableReveals = playerImprovements.filter((p) => p.hadFullReveal);
  for (const reveal of notableReveals.slice(0, 5)) {
    newState = addEvent(
      newState,
      'development_reveal',
      `${reveal.playerName}'s true abilities have been fully evaluated`,
      { playerId: reveal.playerId, reveals: reveal.ratingReveals }
    );
  }

  newState = completeTask(newState, 'view_recap');

  return { offseasonState: newState, updatedPlayers };
}

/**
 * Determines if a season was successful based on owner expectations
 */
export function evaluateSeasonSuccess(
  wins: number,
  expectedWins: number,
  madePlayoffs: boolean,
  playoffExpectation: 'miss' | 'make' | 'deep_run' | 'championship',
  playoffResult: string | null
): { met: boolean; exceeded: boolean; description: string } {
  let met = false;
  let exceeded = false;
  let description = '';

  // Win evaluation
  const winDiff = wins - expectedWins;

  if (winDiff >= 3) {
    exceeded = true;
    description = 'Significantly exceeded win expectations';
  } else if (winDiff >= 0) {
    met = true;
    description = 'Met win expectations';
  } else if (winDiff >= -2) {
    description = 'Slightly below win expectations';
  } else {
    description = 'Failed to meet win expectations';
  }

  // Playoff evaluation
  switch (playoffExpectation) {
    case 'championship':
      if (playoffResult === 'Super Bowl Champions') {
        exceeded = true;
        description = 'Won the Super Bowl!';
      } else if (playoffResult === 'Super Bowl Runner-Up') {
        met = true;
        description = 'Made it to the Super Bowl';
      } else {
        description = 'Failed to win championship';
      }
      break;
    case 'deep_run':
      if (playoffResult?.includes('Conference') || playoffResult?.includes('Super Bowl')) {
        met = true;
        if (playoffResult === 'Super Bowl Champions') exceeded = true;
      }
      break;
    case 'make':
      if (madePlayoffs) {
        met = true;
        if (playoffResult?.includes('Conference') || playoffResult?.includes('Super Bowl')) {
          exceeded = true;
        }
      }
      break;
    case 'miss':
      met = true; // No playoff expectation
      if (madePlayoffs) exceeded = true;
      break;
  }

  return { met, exceeded, description };
}
