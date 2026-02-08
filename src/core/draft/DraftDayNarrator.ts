/**
 * Draft Day Narrator
 * Generates war room feed events: pick narratives, trade rumors,
 * scout reactions, steal/reach alerts, and drama moments.
 */

import { Position } from '../models/player/Position';
import { Prospect } from './Prospect';
import { DraftPickResult, DraftRoomState, TradeResult } from './DraftRoomSimulator';
import { ScoutReport } from '../scouting/ScoutReportGenerator';
import { DraftBoardProspect } from '../scouting/DraftBoardManager';

/**
 * Feed event types
 */
export type FeedEventType =
  | 'pick_announcement'
  | 'trade_alert'
  | 'trade_rumor'
  | 'steal_alert'
  | 'reach_alert'
  | 'scout_reaction'
  | 'user_target_taken'
  | 'position_run'
  | 'round_summary'
  | 'clock_warning'
  | 'draft_milestone';

/**
 * Feed event urgency
 */
export type FeedUrgency = 'low' | 'medium' | 'high' | 'critical';

/**
 * A single war room feed event
 */
export interface WarRoomFeedEvent {
  id: string;
  type: FeedEventType;
  urgency: FeedUrgency;
  timestamp: number;
  headline: string;
  detail: string;
  relatedProspectId?: string;
  relatedTeamId?: string;
  pickNumber?: number;
}

/**
 * Steal/reach classification for a pick
 */
export interface PickValueAlert {
  type: 'steal' | 'reach' | 'fair';
  magnitude: 'minor' | 'moderate' | 'major';
  message: string;
  picksBeyondProjection: number;
}

/**
 * Position run detection
 */
export interface PositionRunInfo {
  position: Position;
  consecutivePicks: number;
  message: string;
}

/**
 * Draft grade for a team's picks
 */
export type DraftLetterGrade =
  | 'A+'
  | 'A'
  | 'A-'
  | 'B+'
  | 'B'
  | 'B-'
  | 'C+'
  | 'C'
  | 'C-'
  | 'D'
  | 'F';

/**
 * Team draft grade
 */
export interface TeamDraftGrade {
  teamId: string;
  grade: DraftLetterGrade;
  score: number;
  picks: PickGrade[];
  bestPick: PickGrade | null;
  worstPick: PickGrade | null;
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

/**
 * Individual pick grade
 */
export interface PickGrade {
  pickNumber: number;
  round: number;
  prospectName: string;
  prospectPosition: Position;
  grade: DraftLetterGrade;
  valueScore: number;
  projectedPick: number;
  actualPick: number;
  assessment: string;
}

let eventCounter = 0;

/**
 * Generates a unique event ID
 */
function nextEventId(): string {
  eventCounter += 1;
  return `feed-${Date.now()}-${eventCounter}`;
}

/**
 * Generates a pick announcement feed event
 */
export function generatePickAnnouncement(
  pickResult: DraftPickResult,
  teamName: string,
  isUserTeam: boolean
): WarRoomFeedEvent {
  const prospect = pickResult.prospect;
  const position = prospect.player.position;
  const name = `${prospect.player.firstName} ${prospect.player.lastName}`;
  const college = prospect.collegeName;
  const pick = pickResult.pick;

  const headline = isUserTeam
    ? `YOUR PICK: ${name}, ${position}`
    : `Pick #${pick.overallPick}: ${teamName} selects ${name}`;

  const detail = `${position} from ${college} | Round ${pick.round}, Pick ${pick.overallPick}`;

  return {
    id: nextEventId(),
    type: 'pick_announcement',
    urgency: isUserTeam ? 'high' : 'low',
    timestamp: pickResult.timestamp,
    headline,
    detail,
    relatedProspectId: prospect.id,
    relatedTeamId: pickResult.teamId,
    pickNumber: pick.overallPick ?? undefined,
  };
}

/**
 * Generates a trade alert feed event
 */
export function generateTradeAlert(
  trade: TradeResult,
  team1Name: string,
  team2Name: string,
  involvesUser: boolean
): WarRoomFeedEvent {
  const headline = involvesUser
    ? `TRADE COMPLETED: You have traded with ${team1Name === 'You' ? team2Name : team1Name}`
    : `TRADE: ${team1Name} and ${team2Name} swap picks`;

  const team1PicksDesc = trade.team1Receives.map((p) => `Rd ${p.round} #${p.overallPick ?? '?'}`);
  const team2PicksDesc = trade.team2Receives.map((p) => `Rd ${p.round} #${p.overallPick ?? '?'}`);

  const detail = `${team1Name} receives: ${team1PicksDesc.join(', ')} | ${team2Name} receives: ${team2PicksDesc.join(', ')}`;

  return {
    id: nextEventId(),
    type: 'trade_alert',
    urgency: involvesUser ? 'critical' : 'medium',
    timestamp: trade.timestamp,
    headline,
    detail,
    relatedTeamId: trade.team1Id,
  };
}

/**
 * Classifies whether a pick is a steal or a reach
 */
export function classifyPickValue(
  actualPick: number,
  projectedRound: number | null,
  projectedPickRange: { min: number; max: number } | null
): PickValueAlert {
  if (projectedRound === null || projectedPickRange === null) {
    return {
      type: 'fair',
      magnitude: 'minor',
      message: 'Unknown projection',
      picksBeyondProjection: 0,
    };
  }

  const projectedMid = (projectedPickRange.min + projectedPickRange.max) / 2;
  const diff = projectedMid - actualPick;

  if (diff >= 40) {
    return {
      type: 'steal',
      magnitude: 'major',
      message: `Massive steal -- projected ${projectedPickRange.min}-${projectedPickRange.max}, taken at #${actualPick}`,
      picksBeyondProjection: Math.round(diff),
    };
  }
  if (diff >= 20) {
    return {
      type: 'steal',
      magnitude: 'moderate',
      message: `Good value pick -- taken well ahead of projection`,
      picksBeyondProjection: Math.round(diff),
    };
  }
  if (diff >= 10) {
    return {
      type: 'steal',
      magnitude: 'minor',
      message: `Slight value pick`,
      picksBeyondProjection: Math.round(diff),
    };
  }
  if (diff <= -40) {
    return {
      type: 'reach',
      magnitude: 'major',
      message: `Major reach -- projected ${projectedPickRange.min}-${projectedPickRange.max}, taken at #${actualPick}`,
      picksBeyondProjection: Math.round(-diff),
    };
  }
  if (diff <= -20) {
    return {
      type: 'reach',
      magnitude: 'moderate',
      message: `Significant reach -- picked well above consensus`,
      picksBeyondProjection: Math.round(-diff),
    };
  }
  if (diff <= -10) {
    return {
      type: 'reach',
      magnitude: 'minor',
      message: `Slight reach for this pick`,
      picksBeyondProjection: Math.round(-diff),
    };
  }

  return {
    type: 'fair',
    magnitude: 'minor',
    message: 'Right around projected value',
    picksBeyondProjection: 0,
  };
}

/**
 * Generates a steal or reach alert feed event
 */
export function generateStealReachAlert(
  pickResult: DraftPickResult,
  alert: PickValueAlert,
  teamName: string
): WarRoomFeedEvent | null {
  if (alert.type === 'fair') return null;

  const prospect = pickResult.prospect;
  const name = `${prospect.player.firstName} ${prospect.player.lastName}`;

  const isSteal = alert.type === 'steal';
  const headline = isSteal
    ? `STEAL ALERT: ${name} falls to #${pickResult.pick.overallPick}`
    : `REACH ALERT: ${teamName} takes ${name} at #${pickResult.pick.overallPick}`;

  return {
    id: nextEventId(),
    type: isSteal ? 'steal_alert' : 'reach_alert',
    urgency: alert.magnitude === 'major' ? 'high' : 'medium',
    timestamp: pickResult.timestamp,
    headline,
    detail: alert.message,
    relatedProspectId: prospect.id,
    relatedTeamId: pickResult.teamId,
    pickNumber: pickResult.pick.overallPick ?? undefined,
  };
}

/**
 * Generates a scout reaction to a pick
 */
export function generateScoutReaction(
  pickResult: DraftPickResult,
  scoutReport: ScoutReport | null,
  isUserTeam: boolean
): WarRoomFeedEvent | null {
  if (!scoutReport) return null;

  const prospect = pickResult.prospect;
  const name = `${prospect.player.firstName} ${prospect.player.lastName}`;
  const scoutName = scoutReport.scoutName;

  const reactions: string[] = [];

  if (scoutReport.reportType === 'focus' && isUserTeam) {
    if (scoutReport.confidence.level === 'high') {
      reactions.push(`${scoutName}: "I'm very confident in ${name}. This is the right pick."`);
    } else if (scoutReport.confidence.level === 'low') {
      reactions.push(
        `${scoutName}: "I wish we had more time to evaluate ${name}. There's still a lot of uncertainty."`
      );
    }
  }

  if (!isUserTeam && scoutReport.reportType === 'focus') {
    reactions.push(`${scoutName}: "We had a focus report on ${name}. He was on our board too."`);
  }

  if (scoutReport.characterAssessment) {
    const ca = scoutReport.characterAssessment;
    if (ca.workEthic === 'elite' || ca.workEthic === 'good') {
      reactions.push(`${scoutName}: "${name} is a gym rat. He'll outwork everyone."`);
    }
    if (ca.leadership === 'captain') {
      reactions.push(`${scoutName}: "Born leader. Captained his team every year."`);
    }
  }

  if (reactions.length === 0) return null;

  const chosenReaction = reactions[Math.floor(Math.random() * reactions.length)];

  return {
    id: nextEventId(),
    type: 'scout_reaction',
    urgency: isUserTeam ? 'medium' : 'low',
    timestamp: pickResult.timestamp + 500,
    headline: 'Scout Reaction',
    detail: chosenReaction,
    relatedProspectId: prospect.id,
    relatedTeamId: pickResult.teamId,
  };
}

/**
 * Generates an alert when a user's flagged/targeted prospect is taken by another team
 */
export function generateUserTargetTaken(
  pickResult: DraftPickResult,
  teamName: string,
  userRank: number | null,
  userTier: string | null
): WarRoomFeedEvent {
  const prospect = pickResult.prospect;
  const name = `${prospect.player.firstName} ${prospect.player.lastName}`;

  let detail = `${teamName} has selected ${name} at #${pickResult.pick.overallPick}.`;
  if (userRank !== null) {
    detail += ` He was #${userRank} on your board.`;
  }
  if (userTier) {
    detail += ` You had him tagged as "${userTier}".`;
  }

  return {
    id: nextEventId(),
    type: 'user_target_taken',
    urgency: 'critical',
    timestamp: pickResult.timestamp,
    headline: `YOUR TARGET TAKEN: ${name}`,
    detail,
    relatedProspectId: prospect.id,
    relatedTeamId: pickResult.teamId,
    pickNumber: pickResult.pick.overallPick ?? undefined,
  };
}

/**
 * Detects a position run (3+ consecutive picks at same position group)
 */
export function detectPositionRun(recentPicks: DraftPickResult[]): PositionRunInfo | null {
  if (recentPicks.length < 3) return null;

  const positionGroups: Record<string, Position[]> = {
    QB: [Position.QB],
    RB: [Position.RB],
    WR: [Position.WR],
    TE: [Position.TE],
    OL: [Position.LT, Position.LG, Position.C, Position.RG, Position.RT],
    DL: [Position.DE, Position.DT],
    LB: [Position.OLB, Position.ILB],
    DB: [Position.CB, Position.FS, Position.SS],
  };

  const lastThree = recentPicks.slice(-3);

  for (const [groupName, positions] of Object.entries(positionGroups)) {
    const allMatch = lastThree.every((p) => positions.includes(p.prospect.player.position));
    if (allMatch) {
      let streak = 3;
      for (let i = recentPicks.length - 4; i >= 0; i--) {
        if (positions.includes(recentPicks[i].prospect.player.position)) {
          streak++;
        } else {
          break;
        }
      }

      return {
        position: lastThree[0].prospect.player.position,
        consecutivePicks: streak,
        message: `Position run: ${streak} consecutive ${groupName} picks`,
      };
    }
  }

  return null;
}

/**
 * Generates a position run feed event
 */
export function generatePositionRunAlert(run: PositionRunInfo): WarRoomFeedEvent {
  return {
    id: nextEventId(),
    type: 'position_run',
    urgency: run.consecutivePicks >= 4 ? 'high' : 'medium',
    timestamp: Date.now(),
    headline: `POSITION RUN: ${run.consecutivePicks} straight ${run.position} picks`,
    detail: run.message,
  };
}

/**
 * Generates a clock warning event
 */
export function generateClockWarning(
  secondsRemaining: number,
  pickNumber: number
): WarRoomFeedEvent {
  let headline: string;
  let urgency: FeedUrgency;

  if (secondsRemaining <= 30) {
    headline = `WARNING: 30 seconds remaining on pick #${pickNumber}!`;
    urgency = 'critical';
  } else if (secondsRemaining <= 60) {
    headline = `1 minute remaining on pick #${pickNumber}`;
    urgency = 'high';
  } else {
    headline = `2 minutes remaining on pick #${pickNumber}`;
    urgency = 'medium';
  }

  return {
    id: nextEventId(),
    type: 'clock_warning',
    urgency,
    timestamp: Date.now(),
    headline,
    detail: 'Make your selection or the pick will be auto-selected.',
    pickNumber,
  };
}

/**
 * Generates a round summary feed event
 */
export function generateRoundSummary(
  roundNumber: number,
  roundPicks: DraftPickResult[],
  userTeamId: string
): WarRoomFeedEvent {
  const userPicks = roundPicks.filter((p) => p.teamId === userTeamId);
  const positions = new Map<string, number>();

  for (const pick of roundPicks) {
    const pos = pick.prospect.player.position;
    positions.set(pos, (positions.get(pos) || 0) + 1);
  }

  const topPosition = [...positions.entries()].sort((a, b) => b[1] - a[1])[0];
  const positionSummary = topPosition
    ? `Most drafted position: ${topPosition[0]} (${topPosition[1]})`
    : '';

  let detail = `Round ${roundNumber} complete. ${roundPicks.length} picks made.`;
  if (userPicks.length > 0) {
    const userNames = userPicks.map(
      (p) => `${p.prospect.player.firstName} ${p.prospect.player.lastName}`
    );
    detail += ` Your picks: ${userNames.join(', ')}.`;
  }
  if (positionSummary) {
    detail += ` ${positionSummary}.`;
  }

  return {
    id: nextEventId(),
    type: 'round_summary',
    urgency: 'medium',
    timestamp: Date.now(),
    headline: `ROUND ${roundNumber} COMPLETE`,
    detail,
  };
}

/**
 * Generates trade rumor events (adds atmosphere)
 */
export function generateTradeRumor(
  teamName: string,
  targetPosition: Position,
  currentPick: number
): WarRoomFeedEvent {
  const rumors = [
    `${teamName} reportedly working the phones, looking to move up for a ${targetPosition}`,
    `Sources say ${teamName} has made multiple calls about trading into the top of the draft`,
    `${teamName} is said to be very interested in the ${targetPosition} class this year`,
    `Multiple teams are calling about moving up. ${teamName} is among the most aggressive`,
    `There's buzz that ${teamName} may have a deal in place to move up soon`,
  ];

  const chosen = rumors[Math.floor(Math.random() * rumors.length)];

  return {
    id: nextEventId(),
    type: 'trade_rumor',
    urgency: 'low',
    timestamp: Date.now(),
    headline: 'TRADE RUMOR',
    detail: chosen,
    relatedTeamId: teamName,
  };
}

/**
 * Calculates a letter grade from a numeric value score
 */
export function scoreToGrade(score: number): DraftLetterGrade {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 45) return 'D';
  return 'F';
}

/**
 * Grades an individual draft pick
 */
export function gradePickValue(
  pickNumber: number,
  round: number,
  prospect: Prospect,
  consensusRound: number | null,
  projectedPickRange: { min: number; max: number } | null
): PickGrade {
  const name = `${prospect.player.firstName} ${prospect.player.lastName}`;
  const projectedMid = projectedPickRange
    ? (projectedPickRange.min + projectedPickRange.max) / 2
    : pickNumber;

  // Value score: how much earlier the player was projected vs where they were taken
  // Higher = better value (got a better player later)
  const diff = projectedMid - pickNumber;
  let valueScore = 75; // Base = fair value

  if (diff > 0) {
    // Steal territory
    valueScore = Math.min(100, 75 + diff * 0.5);
  } else if (diff < 0) {
    // Reach territory
    valueScore = Math.max(30, 75 + diff * 0.4);
  }

  // Ceiling bonus for high-ceiling picks
  const ceilingBonus: Record<string, number> = {
    franchiseCornerstone: 10,
    highEndStarter: 5,
    solidStarter: 2,
    qualityRotational: 0,
    specialist: -2,
    depth: -5,
    practiceSquad: -10,
  };
  valueScore += ceilingBonus[prospect.player.roleFit.ceiling] || 0;
  valueScore = Math.max(0, Math.min(100, valueScore));

  const grade = scoreToGrade(valueScore);

  let assessment: string;
  if (valueScore >= 85) {
    assessment = 'Excellent value. Could be the steal of the draft.';
  } else if (valueScore >= 75) {
    assessment = 'Solid pick at the right spot.';
  } else if (valueScore >= 65) {
    assessment = 'Slight reach, but fills a need.';
  } else if (valueScore >= 55) {
    assessment = 'Reached a bit here. Could have waited.';
  } else {
    assessment = 'Significant reach. Questionable value.';
  }

  return {
    pickNumber,
    round,
    prospectName: name,
    prospectPosition: prospect.player.position,
    grade,
    valueScore,
    projectedPick: Math.round(projectedMid),
    actualPick: pickNumber,
    assessment,
  };
}

/**
 * Generates a full team draft grade from all picks
 */
export function generateTeamDraftGrade(
  teamId: string,
  picks: DraftPickResult[],
  prospectProjections: Map<
    string,
    { consensusRound: number | null; pickRange: { min: number; max: number } | null }
  >
): TeamDraftGrade {
  if (picks.length === 0) {
    return {
      teamId,
      grade: 'C',
      score: 60,
      picks: [],
      bestPick: null,
      worstPick: null,
      summary: 'No picks made.',
      strengths: [],
      weaknesses: [],
    };
  }

  const pickGrades: PickGrade[] = [];

  for (const pick of picks) {
    const projection = prospectProjections.get(pick.prospect.id);
    const pg = gradePickValue(
      pick.pick.overallPick ?? 0,
      pick.pick.round,
      pick.prospect,
      projection?.consensusRound ?? null,
      projection?.pickRange ?? null
    );
    pickGrades.push(pg);
  }

  // Overall score is weighted average (earlier picks count more)
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const pg of pickGrades) {
    const roundWeight = 8 - pg.round; // Round 1 = weight 7, Round 7 = weight 1
    totalWeightedScore += pg.valueScore * roundWeight;
    totalWeight += roundWeight;
  }

  const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 60;
  const grade = scoreToGrade(overallScore);

  // Find best and worst picks
  const sorted = [...pickGrades].sort((a, b) => b.valueScore - a.valueScore);
  const bestPick = sorted[0] || null;
  const worstPick = sorted[sorted.length - 1] || null;

  // Generate strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  const steals = pickGrades.filter((pg) => pg.valueScore >= 85);
  const reaches = pickGrades.filter((pg) => pg.valueScore < 60);

  if (steals.length > 0) {
    strengths.push(`Found ${steals.length} value pick${steals.length > 1 ? 's' : ''}`);
  }
  if (pickGrades.length >= 3 && overallScore >= 75) {
    strengths.push('Consistently strong draft selections');
  }
  if (bestPick && bestPick.valueScore >= 90) {
    strengths.push(`${bestPick.prospectName} could be a draft-day steal`);
  }

  if (reaches.length > 0) {
    weaknesses.push(
      `${reaches.length} pick${reaches.length > 1 ? 's were' : ' was a'} reach${reaches.length === 1 ? '' : 'es'}`
    );
  }
  if (worstPick && worstPick.valueScore < 50) {
    weaknesses.push(
      `${worstPick.prospectName} was a significant reach at #${worstPick.actualPick}`
    );
  }

  // Unique positions drafted
  const positions = new Set(pickGrades.map((pg) => pg.prospectPosition));
  if (positions.size === 1 && pickGrades.length >= 3) {
    weaknesses.push('Only addressed one position group');
  }
  if (positions.size >= 4) {
    strengths.push('Addressed multiple position groups');
  }

  // Generate summary
  let summary: string;
  if (overallScore >= 85) {
    summary = `Outstanding draft. This team maximized value and addressed key needs.`;
  } else if (overallScore >= 75) {
    summary = `Strong draft class. Solid picks across the board.`;
  } else if (overallScore >= 65) {
    summary = `Average draft. Some good picks mixed with some reaches.`;
  } else if (overallScore >= 55) {
    summary = `Below average draft. Too many reaches and missed opportunities.`;
  } else {
    summary = `Poor draft. Significant value left on the board.`;
  }

  return {
    teamId,
    grade,
    score: Math.round(overallScore),
    picks: pickGrades,
    bestPick,
    worstPick,
    summary,
    strengths,
    weaknesses,
  };
}

/**
 * Generates all feed events for a completed pick
 */
export function generateFeedEventsForPick(
  pickResult: DraftPickResult,
  state: DraftRoomState,
  teamName: string,
  scoutReport: ScoutReport | null,
  boardProspect: DraftBoardProspect | null,
  userFlaggedProspectIds: Set<string>
): WarRoomFeedEvent[] {
  const events: WarRoomFeedEvent[] = [];
  const isUserTeam = pickResult.teamId === state.userTeamId;

  // 1. Pick announcement
  events.push(generatePickAnnouncement(pickResult, teamName, isUserTeam));

  // 2. Steal/reach alert
  const projectedRound = pickResult.prospect.consensusProjection?.projectedRound ?? null;
  const projectedPickRange = pickResult.prospect.consensusProjection?.projectedPickRange ?? null;
  const alert = classifyPickValue(
    pickResult.pick.overallPick ?? 0,
    projectedRound,
    projectedPickRange
  );
  const alertEvent = generateStealReachAlert(pickResult, alert, teamName);
  if (alertEvent) {
    events.push(alertEvent);
  }

  // 3. Scout reaction (for user's picks or prospects they had focus reports on)
  const reaction = generateScoutReaction(pickResult, scoutReport, isUserTeam);
  if (reaction) {
    events.push(reaction);
  }

  // 4. User target taken alert
  if (!isUserTeam && userFlaggedProspectIds.has(pickResult.prospect.id)) {
    events.push(
      generateUserTargetTaken(
        pickResult,
        teamName,
        boardProspect?.userRank ?? null,
        boardProspect?.userTier ?? null
      )
    );
  }

  // 5. Position run detection
  const recentPicks = [...state.picks, pickResult];
  const positionRun = detectPositionRun(recentPicks);
  if (positionRun && positionRun.consecutivePicks === 3) {
    events.push(generatePositionRunAlert(positionRun));
  }

  return events;
}

/**
 * Validates a war room feed event
 */
export function validateWarRoomFeedEvent(event: WarRoomFeedEvent): boolean {
  if (!event.id || typeof event.id !== 'string') return false;
  if (!event.headline || typeof event.headline !== 'string') return false;
  if (!event.detail || typeof event.detail !== 'string') return false;
  if (typeof event.timestamp !== 'number') return false;
  return true;
}
