/**
 * Owner Expectations System
 * Manages short/long term expectations, timelines, and minimum acceptable outcomes
 */

import { Owner } from '../models/owner';

/**
 * Team phase that affects expectations
 */
export type TeamPhase = 'rebuild' | 'developing' | 'competitive' | 'contender' | 'dynasty';

/**
 * Expectation urgency level
 */
export type ExpectationUrgency = 'patient' | 'normal' | 'pressing' | 'urgent' | 'critical';

/**
 * Short-term (season) expectation
 */
export interface SeasonExpectation {
  minimumWins: number;
  targetWins: number;
  expectedPlayoffs: boolean;
  minimumPlayoffRound: 'none' | 'wildCard' | 'divisional' | 'conference' | 'superBowl' | null;
  priorityGoals: SeasonGoal[];
  flexibilityLevel: 'strict' | 'moderate' | 'flexible';
}

/**
 * Specific seasonal goal
 */
export interface SeasonGoal {
  id: string;
  type: 'wins' | 'playoffs' | 'division' | 'draft' | 'development' | 'salary' | 'other';
  description: string;
  isRequired: boolean;
  deadline: number | null; // Week number, null for end of season
}

/**
 * Long-term (multi-year) expectation
 */
export interface LongTermExpectation {
  phase: TeamPhase;
  yearsToContend: number;
  ultimateGoal: 'superBowl' | 'playoffs' | 'competitive' | 'rebuild';
  timeline: ExpectationTimeline;
  tolerance: number; // 0-100, how much deviation is acceptable
}

/**
 * Timeline with milestones
 */
export interface ExpectationTimeline {
  year1Goal: string;
  year2Goal: string;
  year3Goal: string;
  year4Goal: string | null;
  year5Goal: string | null;
  currentYear: number;
  totalYears: number;
}

/**
 * Complete expectations state
 */
export interface ExpectationsState {
  ownerId: string;
  teamId: string;
  currentSeason: number;
  shortTerm: SeasonExpectation;
  longTerm: LongTermExpectation;
  urgency: ExpectationUrgency;
  lastUpdated: number;
  historyOfExpectations: ExpectationHistory[];
}

/**
 * Historical record of expectations
 */
export interface ExpectationHistory {
  season: number;
  expectation: SeasonExpectation;
  met: boolean;
  ownerReaction: 'pleased' | 'satisfied' | 'disappointed' | 'angry';
}

/**
 * View model for expectations (player-facing)
 */
export interface ExpectationsViewModel {
  currentPhase: TeamPhase;
  phaseDescription: string;
  seasonGoal: string;
  urgencyDescription: string;
  yearsRemaining: number | null;
  progressDescription: string;
  ownerMessage: string;
}

/**
 * Generates season expectations based on team context
 */
export function generateSeasonExpectations(
  owner: Owner,
  teamPhase: TeamPhase,
  previousSeasonWins: number,
  rosterStrength: number // 0-100
): SeasonExpectation {
  const patience = owner.personality.traits.patience;
  const winNow = owner.personality.secondaryTraits.includes('winNow');
  const championshipOrBust = owner.personality.secondaryTraits.includes('championshipOrBust');

  // Base expectations by phase
  const baseExpectations: Record<TeamPhase, { minWins: number; targetWins: number }> = {
    rebuild: { minWins: 3, targetWins: 6 },
    developing: { minWins: 6, targetWins: 8 },
    competitive: { minWins: 8, targetWins: 10 },
    contender: { minWins: 10, targetWins: 12 },
    dynasty: { minWins: 11, targetWins: 14 },
  };

  const base = baseExpectations[teamPhase];

  // Adjust based on roster strength
  const rosterModifier = (rosterStrength - 50) / 50; // -1 to +1
  const adjustedMinWins = Math.max(0, Math.min(17, Math.round(base.minWins + rosterModifier * 2)));
  const adjustedTargetWins = Math.max(
    adjustedMinWins,
    Math.min(17, Math.round(base.targetWins + rosterModifier * 2))
  );

  // Adjust for owner traits
  let minimumWins = adjustedMinWins;
  let targetWins = adjustedTargetWins;

  if (winNow || championshipOrBust) {
    minimumWins = Math.min(17, minimumWins + 2);
    targetWins = Math.min(17, targetWins + 2);
  }

  if (patience <= 30) {
    minimumWins = Math.min(17, minimumWins + 1);
  } else if (patience >= 70) {
    minimumWins = Math.max(0, minimumWins - 1);
  }

  // Playoff expectations
  const expectedPlayoffs =
    teamPhase === 'contender' ||
    teamPhase === 'dynasty' ||
    (teamPhase === 'competitive' && (winNow || championshipOrBust));

  // Minimum playoff round
  let minimumPlayoffRound: SeasonExpectation['minimumPlayoffRound'] = null;
  if (teamPhase === 'dynasty') {
    minimumPlayoffRound = championshipOrBust ? 'conference' : 'divisional';
  } else if (teamPhase === 'contender') {
    minimumPlayoffRound = championshipOrBust ? 'divisional' : 'wildCard';
  } else if (expectedPlayoffs) {
    minimumPlayoffRound = 'wildCard';
  }

  // Generate priority goals
  const priorityGoals = generateSeasonGoals(teamPhase, owner);

  // Flexibility
  let flexibilityLevel: SeasonExpectation['flexibilityLevel'];
  if (patience >= 70 && !championshipOrBust) {
    flexibilityLevel = 'flexible';
  } else if (patience <= 30 || championshipOrBust) {
    flexibilityLevel = 'strict';
  } else {
    flexibilityLevel = 'moderate';
  }

  return {
    minimumWins,
    targetWins,
    expectedPlayoffs,
    minimumPlayoffRound,
    priorityGoals,
    flexibilityLevel,
  };
}

/**
 * Generates specific season goals
 */
function generateSeasonGoals(phase: TeamPhase, owner: Owner): SeasonGoal[] {
  const goals: SeasonGoal[] = [];
  let goalId = 1;

  // Phase-specific goals
  switch (phase) {
    case 'rebuild':
      goals.push({
        id: `goal-${goalId++}`,
        type: 'development',
        description: 'Develop young talent',
        isRequired: true,
        deadline: null,
      });
      goals.push({
        id: `goal-${goalId++}`,
        type: 'draft',
        description: 'Build through the draft',
        isRequired: true,
        deadline: null,
      });
      break;

    case 'developing':
      goals.push({
        id: `goal-${goalId++}`,
        type: 'wins',
        description: 'Show improvement in win total',
        isRequired: true,
        deadline: null,
      });
      goals.push({
        id: `goal-${goalId++}`,
        type: 'development',
        description: 'Continue player development',
        isRequired: false,
        deadline: null,
      });
      break;

    case 'competitive':
      goals.push({
        id: `goal-${goalId++}`,
        type: 'playoffs',
        description: 'Compete for playoff spot',
        isRequired: owner.personality.traits.patience < 50,
        deadline: null,
      });
      break;

    case 'contender':
      goals.push({
        id: `goal-${goalId++}`,
        type: 'playoffs',
        description: 'Make playoffs',
        isRequired: true,
        deadline: null,
      });
      goals.push({
        id: `goal-${goalId++}`,
        type: 'division',
        description: 'Compete for division title',
        isRequired: false,
        deadline: null,
      });
      break;

    case 'dynasty':
      goals.push({
        id: `goal-${goalId++}`,
        type: 'playoffs',
        description: 'Deep playoff run',
        isRequired: true,
        deadline: null,
      });
      break;
  }

  // Owner trait-based goals
  if (owner.personality.secondaryTraits.includes('prObsessed')) {
    goals.push({
      id: `goal-${goalId++}`,
      type: 'other',
      description: 'Maintain positive media presence',
      isRequired: false,
      deadline: null,
    });
  }

  if (owner.personality.secondaryTraits.includes('analyticsBeliever')) {
    goals.push({
      id: `goal-${goalId++}`,
      type: 'other',
      description: 'Embrace analytics in decision-making',
      isRequired: false,
      deadline: null,
    });
  }

  return goals;
}

/**
 * Generates long-term expectations
 */
export function generateLongTermExpectations(
  owner: Owner,
  currentPhase: TeamPhase,
  _currentSeason: number
): LongTermExpectation {
  const patience = owner.personality.traits.patience;
  const winNow = owner.personality.secondaryTraits.includes('winNow');
  const longTermThinker = owner.personality.secondaryTraits.includes('longTermThinker');
  const championshipOrBust = owner.personality.secondaryTraits.includes('championshipOrBust');

  // Determine years to contend based on phase and owner traits
  let yearsToContend: number;
  switch (currentPhase) {
    case 'rebuild':
      yearsToContend = longTermThinker ? 4 : winNow ? 2 : 3;
      break;
    case 'developing':
      yearsToContend = longTermThinker ? 3 : winNow ? 1 : 2;
      break;
    case 'competitive':
      yearsToContend = 1;
      break;
    case 'contender':
    case 'dynasty':
      yearsToContend = 0; // Already there
      break;
  }

  // Adjust for patience
  if (patience >= 70) {
    yearsToContend = Math.min(5, yearsToContend + 1);
  } else if (patience <= 30) {
    yearsToContend = Math.max(0, yearsToContend - 1);
  }

  // Determine ultimate goal
  let ultimateGoal: LongTermExpectation['ultimateGoal'];
  if (championshipOrBust || winNow) {
    ultimateGoal = 'superBowl';
  } else if (currentPhase === 'contender' || currentPhase === 'dynasty') {
    ultimateGoal = 'superBowl';
  } else if (currentPhase === 'competitive') {
    ultimateGoal = 'playoffs';
  } else if (currentPhase === 'developing') {
    ultimateGoal = 'competitive';
  } else {
    ultimateGoal = 'rebuild';
  }

  // Generate timeline
  const timeline = generateTimeline(currentPhase, yearsToContend, ultimateGoal);

  // Tolerance for deviation
  let tolerance: number;
  if (patience >= 70 && longTermThinker) {
    tolerance = 80;
  } else if (patience <= 30 || championshipOrBust) {
    tolerance = 30;
  } else if (patience >= 50) {
    tolerance = 60;
  } else {
    tolerance = 45;
  }

  return {
    phase: currentPhase,
    yearsToContend,
    ultimateGoal,
    timeline,
    tolerance,
  };
}

/**
 * Generates a multi-year timeline
 */
function generateTimeline(
  phase: TeamPhase,
  yearsToContend: number,
  _ultimateGoal: LongTermExpectation['ultimateGoal']
): ExpectationTimeline {
  const goals: (string | null)[] = [];

  // Generate yearly goals based on progression
  switch (phase) {
    case 'rebuild':
      goals.push('Establish foundation and acquire draft capital');
      goals.push('Develop young core players');
      goals.push('Become competitive and push for .500 record');
      goals.push(yearsToContend > 3 ? 'Compete for playoff spot' : null);
      goals.push(yearsToContend > 4 ? 'Make playoffs and compete' : null);
      break;

    case 'developing':
      goals.push('Show improvement and develop talent');
      goals.push('Compete for playoff spot');
      goals.push('Make playoffs');
      goals.push(yearsToContend > 2 ? 'Deep playoff run' : null);
      goals.push(null);
      break;

    case 'competitive':
      goals.push('Push for playoffs');
      goals.push('Make playoffs and win a game');
      goals.push('Compete for division title');
      goals.push(null);
      goals.push(null);
      break;

    case 'contender':
      goals.push('Win division and advance in playoffs');
      goals.push('Deep playoff run');
      goals.push('Compete for championship');
      goals.push(null);
      goals.push(null);
      break;

    case 'dynasty':
      goals.push('Win championship');
      goals.push('Repeat as champions');
      goals.push('Sustain excellence');
      goals.push(null);
      goals.push(null);
      break;
  }

  return {
    year1Goal: goals[0] || 'Establish direction',
    year2Goal: goals[1] || 'Continue progress',
    year3Goal: goals[2] || 'Achieve objectives',
    year4Goal: goals[3] || null,
    year5Goal: goals[4] || null,
    currentYear: 1,
    totalYears: Math.max(3, yearsToContend + 1),
  };
}

/**
 * Creates initial expectations state
 */
export function createExpectationsState(
  owner: Owner,
  teamId: string,
  currentSeason: number,
  teamPhase: TeamPhase,
  previousSeasonWins: number,
  rosterStrength: number
): ExpectationsState {
  const shortTerm = generateSeasonExpectations(
    owner,
    teamPhase,
    previousSeasonWins,
    rosterStrength
  );
  const longTerm = generateLongTermExpectations(owner, teamPhase, currentSeason);
  const urgency = calculateUrgency(longTerm, 1);

  return {
    ownerId: owner.id,
    teamId,
    currentSeason,
    shortTerm,
    longTerm,
    urgency,
    lastUpdated: currentSeason,
    historyOfExpectations: [],
  };
}

/**
 * Calculates urgency level
 */
export function calculateUrgency(
  longTerm: LongTermExpectation,
  currentYearInTimeline: number
): ExpectationUrgency {
  const yearsRemaining = longTerm.timeline.totalYears - currentYearInTimeline;
  const tolerance = longTerm.tolerance;

  if (yearsRemaining <= 0) {
    return tolerance < 50 ? 'critical' : 'urgent';
  }

  if (yearsRemaining === 1) {
    return tolerance < 40 ? 'urgent' : tolerance < 60 ? 'pressing' : 'normal';
  }

  if (yearsRemaining === 2) {
    return tolerance < 30 ? 'pressing' : 'normal';
  }

  if (tolerance >= 70) {
    return 'patient';
  }

  return 'normal';
}

/**
 * Evaluates if season expectations were met
 */
export function evaluateSeasonExpectations(
  expectations: SeasonExpectation,
  result: {
    wins: number;
    madePlayoffs: boolean;
    playoffRound: 'none' | 'wildCard' | 'divisional' | 'conference' | 'superBowl';
    goalsAchieved: string[];
  }
): {
  met: boolean;
  exceeded: boolean;
  reaction: ExpectationHistory['ownerReaction'];
  summary: string;
} {
  let score = 0;

  // Wins evaluation (40% weight)
  if (result.wins >= expectations.targetWins) {
    score += 45; // Exceeded
  } else if (result.wins >= expectations.minimumWins) {
    score += 35; // Met minimum
  } else if (result.wins >= expectations.minimumWins - 2) {
    score += 20; // Close
  } else {
    score += 5; // Failed
  }

  // Playoffs evaluation (40% weight)
  if (expectations.expectedPlayoffs) {
    if (result.madePlayoffs) {
      score += 35;

      // Playoff round bonus
      const roundOrder = ['none', 'wildCard', 'divisional', 'conference', 'superBowl'];
      const minimumIndex = expectations.minimumPlayoffRound
        ? roundOrder.indexOf(expectations.minimumPlayoffRound)
        : 0;
      const actualIndex = roundOrder.indexOf(result.playoffRound);

      if (actualIndex >= minimumIndex) {
        score += 10;
      }
    }
  } else {
    // No playoff expectation - give full points if made it anyway
    score += result.madePlayoffs ? 45 : 30;
  }

  // Goals evaluation (20% weight)
  const requiredGoals = expectations.priorityGoals.filter((g) => g.isRequired);
  const requiredMet = requiredGoals.filter((g) => result.goalsAchieved.includes(g.id)).length;

  if (requiredGoals.length > 0) {
    const goalScore = (requiredMet / requiredGoals.length) * 20;
    score += goalScore;
  } else {
    score += 15; // No required goals, partial credit
  }

  // Determine outcome
  const met = score >= 60;
  const exceeded = score >= 85;

  let reaction: ExpectationHistory['ownerReaction'];
  if (score >= 90) {
    reaction = 'pleased';
  } else if (score >= 65) {
    reaction = 'satisfied';
  } else if (score >= 45) {
    reaction = 'disappointed';
  } else {
    reaction = 'angry';
  }

  // Generate summary
  let summary: string;
  if (exceeded) {
    summary = 'Season exceeded all expectations';
  } else if (met) {
    summary = 'Season met expectations';
  } else if (score >= 45) {
    summary = 'Season fell short of expectations';
  } else {
    summary = 'Season was a significant disappointment';
  }

  return { met, exceeded, reaction, summary };
}

/**
 * Advances to next season and updates expectations
 */
export function advanceExpectations(
  state: ExpectationsState,
  seasonResult: {
    wins: number;
    madePlayoffs: boolean;
    playoffRound: 'none' | 'wildCard' | 'divisional' | 'conference' | 'superBowl';
    goalsAchieved: string[];
  },
  owner: Owner,
  newTeamPhase: TeamPhase,
  newRosterStrength: number
): ExpectationsState {
  // Evaluate previous season
  const evaluation = evaluateSeasonExpectations(state.shortTerm, seasonResult);

  // Record history
  const historyEntry: ExpectationHistory = {
    season: state.currentSeason,
    expectation: state.shortTerm,
    met: evaluation.met,
    ownerReaction: evaluation.reaction,
  };

  // Update timeline
  const newCurrentYear = state.longTerm.timeline.currentYear + 1;
  const updatedTimeline: ExpectationTimeline = {
    ...state.longTerm.timeline,
    currentYear: newCurrentYear,
  };

  // Adjust long-term expectations based on result
  let updatedLongTerm = {
    ...state.longTerm,
    timeline: updatedTimeline,
    phase: newTeamPhase,
  };

  // If exceeded expectations, owner might extend patience
  if (evaluation.exceeded && owner.personality.traits.patience >= 40) {
    updatedLongTerm = {
      ...updatedLongTerm,
      tolerance: Math.min(100, updatedLongTerm.tolerance + 10),
    };
  }

  // If disappointed, reduce tolerance
  if (evaluation.reaction === 'disappointed' || evaluation.reaction === 'angry') {
    updatedLongTerm = {
      ...updatedLongTerm,
      tolerance: Math.max(0, updatedLongTerm.tolerance - 15),
    };
  }

  // Generate new short-term expectations
  const newShortTerm = generateSeasonExpectations(
    owner,
    newTeamPhase,
    seasonResult.wins,
    newRosterStrength
  );

  // Calculate new urgency
  const newUrgency = calculateUrgency(updatedLongTerm, newCurrentYear);

  return {
    ...state,
    currentSeason: state.currentSeason + 1,
    shortTerm: newShortTerm,
    longTerm: updatedLongTerm,
    urgency: newUrgency,
    lastUpdated: state.currentSeason + 1,
    historyOfExpectations: [...state.historyOfExpectations, historyEntry],
  };
}

/**
 * Creates a view model for UI display
 */
export function createExpectationsViewModel(
  state: ExpectationsState,
  owner: Owner
): ExpectationsViewModel {
  const phaseDescriptions: Record<TeamPhase, string> = {
    rebuild: 'Building for the future',
    developing: 'Developing young talent',
    competitive: 'Pushing for playoffs',
    contender: 'Championship window open',
    dynasty: 'Sustaining excellence',
  };

  const urgencyDescriptions: Record<ExpectationUrgency, string> = {
    patient: 'Owner is patient with the process',
    normal: 'Standard expectations',
    pressing: 'Owner expects progress soon',
    urgent: 'Owner demands results this season',
    critical: 'Your job is on the line',
  };

  // Generate season goal summary
  const seasonGoal = state.shortTerm.expectedPlayoffs
    ? `Win ${state.shortTerm.minimumWins}+ games and make playoffs`
    : `Win ${state.shortTerm.minimumWins}+ games`;

  // Calculate years remaining
  const yearsRemaining = state.longTerm.timeline.totalYears - state.longTerm.timeline.currentYear;

  // Generate progress description
  const progressDescription = generateProgressDescription(state);

  // Generate owner message
  const ownerMessage = generateOwnerMessage(state, owner);

  return {
    currentPhase: state.longTerm.phase,
    phaseDescription: phaseDescriptions[state.longTerm.phase],
    seasonGoal,
    urgencyDescription: urgencyDescriptions[state.urgency],
    yearsRemaining: yearsRemaining > 0 ? yearsRemaining : null,
    progressDescription,
    ownerMessage,
  };
}

/**
 * Generates progress description
 */
function generateProgressDescription(state: ExpectationsState): string {
  const recentHistory = state.historyOfExpectations.slice(-3);

  if (recentHistory.length === 0) {
    return 'First season with current ownership';
  }

  const metCount = recentHistory.filter((h) => h.met).length;
  const ratio = metCount / recentHistory.length;

  if (ratio >= 0.8) {
    return 'Consistently meeting or exceeding expectations';
  } else if (ratio >= 0.5) {
    return 'Mixed results relative to expectations';
  } else {
    return 'Struggling to meet expectations';
  }
}

/**
 * Generates owner message based on state
 */
function generateOwnerMessage(state: ExpectationsState, owner: Owner): string {
  const ownerName = `${owner.firstName} ${owner.lastName}`;

  if (state.urgency === 'critical') {
    return `${ownerName}: "I need to see significant improvement immediately."`;
  }

  if (state.urgency === 'urgent') {
    return `${ownerName}: "This season is crucial. We need results."`;
  }

  if (state.urgency === 'pressing') {
    return `${ownerName}: "I expect to see progress this year."`;
  }

  if (state.longTerm.phase === 'dynasty') {
    return `${ownerName}: "Let's keep this winning tradition alive."`;
  }

  if (state.longTerm.phase === 'contender') {
    return `${ownerName}: "Our window is now. Let's make the most of it."`;
  }

  if (state.longTerm.phase === 'rebuild') {
    return `${ownerName}: "I understand we're building. Just show me progress."`;
  }

  return `${ownerName}: "I trust you to guide this team in the right direction."`;
}

/**
 * Gets the current year goal from the timeline
 */
export function getCurrentYearGoal(timeline: ExpectationTimeline): string {
  const yearGoals = [
    timeline.year1Goal,
    timeline.year2Goal,
    timeline.year3Goal,
    timeline.year4Goal,
    timeline.year5Goal,
  ];

  const currentGoal = yearGoals[timeline.currentYear - 1];
  return currentGoal || 'Continue progress toward goals';
}

/**
 * Validates expectations state
 */
export function validateExpectationsState(state: ExpectationsState): boolean {
  if (!state.ownerId || !state.teamId) return false;
  if (state.currentSeason < 1) return false;
  if (!state.shortTerm || !state.longTerm) return false;
  if (state.shortTerm.minimumWins < 0 || state.shortTerm.minimumWins > 17) return false;
  if (state.shortTerm.targetWins < state.shortTerm.minimumWins) return false;
  if (state.longTerm.tolerance < 0 || state.longTerm.tolerance > 100) return false;
  if (!Array.isArray(state.historyOfExpectations)) return false;

  return true;
}

/**
 * Determines team phase from win total and roster strength
 */
export function determineTeamPhase(
  wins: number,
  rosterStrength: number,
  recentPlayoffAppearances: number // Last 3 years
): TeamPhase {
  // Dynasty: consistent excellence
  if (wins >= 12 && rosterStrength >= 75 && recentPlayoffAppearances >= 3) {
    return 'dynasty';
  }

  // Contender: strong team ready to compete
  if (wins >= 10 && rosterStrength >= 65 && recentPlayoffAppearances >= 2) {
    return 'contender';
  }

  // Competitive: borderline playoff team
  if (wins >= 7 && rosterStrength >= 50) {
    return 'competitive';
  }

  // Developing: young team showing promise
  if (wins >= 4 || rosterStrength >= 40) {
    return 'developing';
  }

  // Rebuild: starting over
  return 'rebuild';
}
