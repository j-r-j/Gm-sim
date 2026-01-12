/**
 * OTAs Phase (Phase 8)
 * Handles Organized Team Activities and first impressions
 */

import { OffSeasonState, addEvent, completeTask } from '../OffSeasonPhaseManager';

/**
 * OTA report for a player
 */
export interface OTAReport {
  playerId: string;
  playerName: string;
  position: string;
  type: 'rookie' | 'veteran' | 'free_agent';
  attendance: 'full' | 'partial' | 'holdout' | 'excused';
  impression: 'standout' | 'solid' | 'average' | 'concerning' | 'injury';
  notes: string[];
  highlights: string[];
  concerns: string[];
  conditioningLevel: number; // 1-100
  schemeGrasp: number; // 1-100
  coachFeedback: string;
}

/**
 * Position battle preview
 */
export interface PositionBattlePreview {
  position: string;
  incumbentId: string;
  incumbentName: string;
  challengers: Array<{
    playerId: string;
    playerName: string;
    earlyImpression: 'strong' | 'average' | 'weak';
  }>;
  competitionLevel: 'heated' | 'competitive' | 'clear_starter';
  previewNotes: string;
}

/**
 * Rookie integration report
 */
export interface RookieIntegrationReport {
  playerId: string;
  playerName: string;
  position: string;
  draftRound: number | null; // null for UDFAs
  learningCurve: 'ahead' | 'on_track' | 'behind';
  physicalReadiness: 'NFL_ready' | 'needs_work' | 'project';
  mentalReadiness: 'sharp' | 'average' | 'struggling';
  veteranMentor: string | null;
  adjustmentNotes: string[];
}

/**
 * OTA summary
 */
export interface OTASummary {
  year: number;
  totalParticipants: number;
  holdouts: number;
  standouts: OTAReport[];
  concerns: OTAReport[];
  rookieReports: RookieIntegrationReport[];
  positionBattles: PositionBattlePreview[];
}

/**
 * Generates OTA report for a player
 */
export function generateOTAReport(
  playerId: string,
  playerName: string,
  position: string,
  type: 'rookie' | 'veteran' | 'free_agent',
  overallRating: number,
  workEthic: number,
  isHoldout: boolean = false
): OTAReport {
  // Determine attendance
  let attendance: 'full' | 'partial' | 'holdout' | 'excused' = 'full';
  if (isHoldout) attendance = 'holdout';
  else if (Math.random() < 0.05) attendance = 'excused';
  else if (Math.random() < 0.1) attendance = 'partial';

  // Determine impression based on rating and work ethic
  const performanceScore = overallRating * 0.6 + workEthic * 0.4 + (Math.random() * 20 - 10);
  let impression: 'standout' | 'solid' | 'average' | 'concerning' | 'injury' = 'average';

  if (Math.random() < 0.03) impression = 'injury';
  else if (performanceScore >= 85) impression = 'standout';
  else if (performanceScore >= 75) impression = 'solid';
  else if (performanceScore >= 60) impression = 'average';
  else impression = 'concerning';

  // Generate notes based on impression
  const notes: string[] = [];
  const highlights: string[] = [];
  const concerns: string[] = [];

  if (impression === 'standout') {
    highlights.push('Consistently outperforming expectations');
    highlights.push('Natural leader on the field');
    notes.push('One of the most impressive performers this OTA period');
  } else if (impression === 'solid') {
    notes.push('Meeting expectations and showing steady improvement');
    highlights.push('Good command of the playbook');
  } else if (impression === 'average') {
    notes.push('Performing at expected level');
  } else if (impression === 'concerning') {
    concerns.push('Struggling with playbook complexity');
    concerns.push('May need additional development time');
    notes.push('Coaches working closely to address concerns');
  } else if (impression === 'injury') {
    concerns.push('Dealing with minor injury, limited participation');
    notes.push('Day-to-day status, being cautious');
  }

  // Conditioning and scheme grasp
  const conditioningLevel = Math.min(100, Math.max(40, overallRating + Math.random() * 20 - 10));
  const schemeGrasp = Math.min(
    100,
    Math.max(30, (overallRating + workEthic) / 2 + Math.random() * 30 - 15)
  );

  // Coach feedback
  const feedbackOptions = {
    standout: "Extremely pleased with his progress. He's going to be a key contributor.",
    solid: 'Doing exactly what we expected. Steady and reliable.',
    average: "Still evaluating, but he's showing flashes.",
    concerning: "We're working with him to get up to speed.",
    injury: 'Taking it slow, being smart with his recovery.',
  };

  return {
    playerId,
    playerName,
    position,
    type,
    attendance,
    impression,
    notes,
    highlights,
    concerns,
    conditioningLevel: Math.round(conditioningLevel),
    schemeGrasp: Math.round(schemeGrasp),
    coachFeedback: feedbackOptions[impression],
  };
}

/**
 * Generates position battle preview
 */
export function generatePositionBattlePreview(
  position: string,
  incumbent: { id: string; name: string; rating: number },
  challengers: Array<{ id: string; name: string; rating: number }>
): PositionBattlePreview {
  // Determine competition level
  const ratingGap = incumbent.rating - Math.max(...challengers.map((c) => c.rating));
  let competitionLevel: 'heated' | 'competitive' | 'clear_starter' = 'competitive';

  if (ratingGap <= 3) competitionLevel = 'heated';
  else if (ratingGap <= 8) competitionLevel = 'competitive';
  else competitionLevel = 'clear_starter';

  const challengerReports = challengers.map((c) => {
    const gap = incumbent.rating - c.rating;
    let earlyImpression: 'strong' | 'average' | 'weak' = 'average';
    if (gap <= 2 || Math.random() < 0.15) earlyImpression = 'strong';
    else if (gap >= 10) earlyImpression = 'weak';

    return {
      playerId: c.id,
      playerName: c.name,
      earlyImpression,
    };
  });

  const previewNotes = {
    heated: `Expect a tight battle all camp. Both players making strong cases.`,
    competitive: `${incumbent.name} has the edge, but challengers are making noise.`,
    clear_starter: `${incumbent.name} firmly entrenched as the starter.`,
  };

  return {
    position,
    incumbentId: incumbent.id,
    incumbentName: incumbent.name,
    challengers: challengerReports,
    competitionLevel,
    previewNotes: previewNotes[competitionLevel],
  };
}

/**
 * Generates rookie integration report
 */
export function generateRookieIntegrationReport(
  playerId: string,
  playerName: string,
  position: string,
  draftRound: number | null,
  overallGrade: number,
  athleticScore: number
): RookieIntegrationReport {
  // Learning curve based on grade
  let learningCurve: 'ahead' | 'on_track' | 'behind' = 'on_track';
  if (overallGrade >= 80 || Math.random() < 0.2) learningCurve = 'ahead';
  else if (overallGrade < 60 || Math.random() < 0.2) learningCurve = 'behind';

  // Physical readiness based on athletic score
  let physicalReadiness: 'NFL_ready' | 'needs_work' | 'project' = 'needs_work';
  if (athleticScore >= 80) physicalReadiness = 'NFL_ready';
  else if (athleticScore < 60) physicalReadiness = 'project';

  // Mental readiness
  let mentalReadiness: 'sharp' | 'average' | 'struggling' = 'average';
  if (learningCurve === 'ahead') mentalReadiness = 'sharp';
  else if (learningCurve === 'behind') mentalReadiness = 'struggling';

  const adjustmentNotes: string[] = [];
  if (physicalReadiness === 'NFL_ready') {
    adjustmentNotes.push('Body is ready for the NFL game');
  } else if (physicalReadiness === 'project') {
    adjustmentNotes.push('Needs significant strength and conditioning work');
  }

  if (mentalReadiness === 'sharp') {
    adjustmentNotes.push('Picking up the playbook quickly');
  } else if (mentalReadiness === 'struggling') {
    adjustmentNotes.push('Taking extra time in meetings');
  }

  return {
    playerId,
    playerName,
    position,
    draftRound,
    learningCurve,
    physicalReadiness,
    mentalReadiness,
    veteranMentor: null, // Can be assigned later
    adjustmentNotes,
  };
}

/**
 * Processes OTA phase
 */
export function processOTAs(
  state: OffSeasonState,
  reports: OTAReport[],
  _rookieReports: RookieIntegrationReport[],
  _positionBattles: PositionBattlePreview[]
): OffSeasonState {
  const standouts = reports.filter((r) => r.impression === 'standout');
  const concernReports = reports.filter((r) => r.impression === 'concerning');

  let newState = addEvent(
    state,
    'phase_start',
    `OTAs complete: ${reports.length} players participated`,
    {
      totalParticipants: reports.length,
      standouts: standouts.length,
      concerns: concernReports.length,
    }
  );

  // Add standout events
  for (const standout of standouts.slice(0, 3)) {
    newState = addEvent(
      newState,
      'development_reveal',
      `${standout.playerName} impressing in OTAs - "${standout.coachFeedback}"`,
      { report: standout }
    );
  }

  newState = completeTask(newState, 'view_reports');

  return newState;
}

/**
 * Gets OTA summary
 */
export function getOTASummary(
  reports: OTAReport[],
  rookieReports: RookieIntegrationReport[],
  positionBattles: PositionBattlePreview[]
): OTASummary {
  return {
    year: new Date().getFullYear(),
    totalParticipants: reports.length,
    holdouts: reports.filter((r) => r.attendance === 'holdout').length,
    standouts: reports.filter((r) => r.impression === 'standout'),
    concerns: reports.filter((r) => r.impression === 'concerning'),
    rookieReports,
    positionBattles,
  };
}

/**
 * Gets OTA report text
 */
export function getOTAReportText(report: OTAReport): string {
  return `${report.playerName} (${report.position}) - ${report.type}
Attendance: ${report.attendance}
Impression: ${report.impression.toUpperCase()}

Conditioning: ${report.conditioningLevel}/100
Scheme Grasp: ${report.schemeGrasp}/100

Coach Feedback: "${report.coachFeedback}"

${report.highlights.length > 0 ? `Highlights:\n${report.highlights.map((h) => `+ ${h}`).join('\n')}` : ''}
${report.concerns.length > 0 ? `\nConcerns:\n${report.concerns.map((c) => `- ${c}`).join('\n')}` : ''}`;
}

/**
 * Gets rookie report text
 */
export function getRookieReportText(report: RookieIntegrationReport): string {
  return `${report.playerName} (${report.position})
Draft: ${report.draftRound ? `Round ${report.draftRound}` : 'UDFA'}

Learning Curve: ${report.learningCurve.replace('_', ' ')}
Physical Readiness: ${report.physicalReadiness.replace('_', ' ')}
Mental Readiness: ${report.mentalReadiness}

Notes:
${report.adjustmentNotes.map((n) => `- ${n}`).join('\n')}`;
}
