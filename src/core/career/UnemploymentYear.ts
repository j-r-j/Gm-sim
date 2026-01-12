/**
 * Unemployment Year System
 * Handles seasons when the player has no GM position
 */

import { JobOpening, OpeningReason } from './JobMarketManager';

/**
 * Narrative event types during unemployment
 */
export type UnemploymentEventType =
  | 'opening_announced'
  | 'opening_filled'
  | 'media_speculation'
  | 'reputation_change'
  | 'networking_opportunity'
  | 'consultant_offer'
  | 'season_milestone'
  | 'championship_result';

/**
 * A narrative event during unemployment
 */
export interface UnemploymentEvent {
  id: string;
  type: UnemploymentEventType;
  week: number;
  year: number;
  headline: string;
  description: string;
  teamId?: string;
  teamName?: string;
  impactOnReputation?: number;
}

/**
 * Consultant opportunity during unemployment
 */
export interface ConsultantOpportunity {
  id: string;
  teamId: string;
  teamName: string;
  description: string;
  compensation: number;
  durationWeeks: number;
  reputationBonus: number;
  accepted: boolean;
}

/**
 * Unemployment year state
 */
export interface UnemploymentState {
  year: number;
  currentWeek: number;
  consecutiveYearsUnemployed: number;

  // Events and opportunities
  events: UnemploymentEvent[];
  consultantOpportunities: ConsultantOpportunity[];
  activeConsultantJob: ConsultantOpportunity | null;

  // Tracking
  newOpeningsThisYear: string[];
  filledOpeningsThisYear: string[];
  totalReputationChange: number;

  // Player choices
  isWatchingFromSidelines: boolean;
  hasDecidedToRetire: boolean;
}

/**
 * Creates initial unemployment state
 */
export function createUnemploymentState(year: number): UnemploymentState {
  return {
    year,
    currentWeek: 0,
    consecutiveYearsUnemployed: 0,
    events: [],
    consultantOpportunities: [],
    activeConsultantJob: null,
    newOpeningsThisYear: [],
    filledOpeningsThisYear: [],
    totalReputationChange: 0,
    isWatchingFromSidelines: true,
    hasDecidedToRetire: false,
  };
}

/**
 * Starts a new unemployment year
 */
export function startUnemploymentYear(
  previousState: UnemploymentState | null,
  year: number
): UnemploymentState {
  const consecutiveYears = previousState ? previousState.consecutiveYearsUnemployed + 1 : 1;

  return {
    ...createUnemploymentState(year),
    consecutiveYearsUnemployed: consecutiveYears,
  };
}

/**
 * Generates media narrative about the unemployed GM
 */
export function generateMediaNarrative(
  reputationScore: number,
  yearsUnemployed: number,
  championshipsWon: number
): string {
  if (championshipsWon > 0 && yearsUnemployed === 1) {
    return "Championship-winning GM taking a 'gap year' before returning to the league";
  }
  if (reputationScore >= 70 && yearsUnemployed === 1) {
    return 'Well-regarded GM waiting for the right opportunity';
  }
  if (reputationScore >= 50 && yearsUnemployed <= 2) {
    return 'Former GM exploring options after recent departure';
  }
  if (yearsUnemployed >= 3) {
    return 'Former GM struggling to find a way back into the league';
  }
  if (reputationScore < 40) {
    return "Former GM's job prospects limited after disappointing tenure";
  }
  return 'Former GM surveying the job market';
}

/**
 * Simulates a week of unemployment
 */
export function simulateUnemploymentWeek(
  state: UnemploymentState,
  newOpenings: JobOpening[],
  filledOpenings: JobOpening[]
): UnemploymentState {
  const newEvents: UnemploymentEvent[] = [];

  // Generate events for new openings
  for (const opening of newOpenings) {
    if (!state.newOpeningsThisYear.includes(opening.id)) {
      newEvents.push({
        id: `event-opening-${opening.id}`,
        type: 'opening_announced',
        week: state.currentWeek,
        year: state.year,
        headline: `${opening.teamCity} ${opening.teamName} Announce GM Search`,
        description: getOpeningDescription(opening),
        teamId: opening.teamId,
        teamName: `${opening.teamCity} ${opening.teamName}`,
      });
    }
  }

  // Generate events for filled openings
  for (const opening of filledOpenings) {
    if (!state.filledOpeningsThisYear.includes(opening.id)) {
      newEvents.push({
        id: `event-filled-${opening.id}`,
        type: 'opening_filled',
        week: state.currentWeek,
        year: state.year,
        headline: `${opening.teamCity} ${opening.teamName} Hire New GM`,
        description: `Another opportunity off the board as the ${opening.teamName} complete their GM search.`,
        teamId: opening.teamId,
        teamName: `${opening.teamCity} ${opening.teamName}`,
      });
    }
  }

  // Add season milestone events (check the new week after advancing)
  const newWeek = state.currentWeek + 1;
  const milestoneEvent = getSeasonMilestoneEvent(newWeek, state.year);
  if (milestoneEvent) {
    newEvents.push(milestoneEvent);
  }

  return {
    ...state,
    currentWeek: newWeek,
    events: [...state.events, ...newEvents],
    newOpeningsThisYear: [...state.newOpeningsThisYear, ...newOpenings.map((o) => o.id)],
    filledOpeningsThisYear: [...state.filledOpeningsThisYear, ...filledOpenings.map((o) => o.id)],
  };
}

/**
 * Gets description for an opening announcement
 */
function getOpeningDescription(opening: JobOpening): string {
  const reasonDescriptions: Record<OpeningReason, string> = {
    fired: `after parting ways with their previous GM`,
    retired: `following the retirement of their long-time GM`,
    resigned: `after their GM left for another opportunity`,
    promoted: `as their GM was promoted to a league position`,
    expansion: `as the newest franchise in the league`,
    newOwnership: `as new ownership brings in their own front office`,
  };

  return `The ${opening.teamCity} ${opening.teamName} have opened their GM search ${reasonDescriptions[opening.reason]}.`;
}

/**
 * Gets season milestone events
 */
function getSeasonMilestoneEvent(week: number, year: number): UnemploymentEvent | null {
  if (week === 1) {
    return {
      id: `milestone-season-start-${year}`,
      type: 'season_milestone',
      week,
      year,
      headline: `${year} NFL Season Kicks Off`,
      description: 'Another season begins without you on a sideline. Watch as the league unfolds.',
    };
  }

  if (week === 9) {
    return {
      id: `milestone-midseason-${year}`,
      type: 'season_milestone',
      week,
      year,
      headline: 'Midseason Report',
      description: 'Halfway through the season. Some teams are thriving, others struggling.',
    };
  }

  if (week === 18) {
    return {
      id: `milestone-regular-end-${year}`,
      type: 'season_milestone',
      week,
      year,
      headline: 'Regular Season Concludes',
      description: 'Playoff picture set. Black Monday looms for struggling franchises.',
    };
  }

  if (week === 19) {
    return {
      id: `milestone-black-monday-${year}`,
      type: 'season_milestone',
      week,
      year,
      headline: 'Black Monday',
      description:
        'The annual coaching and front office purge begins. New opportunities may emerge.',
    };
  }

  return null;
}

/**
 * Generates consultant opportunity
 */
export function generateConsultantOpportunity(
  teamId: string,
  teamName: string,
  reputationScore: number
): ConsultantOpportunity {
  // Better reputation = better opportunities
  const baseCompensation = 50000;
  const reputationBonus = Math.round(reputationScore * 1000);

  return {
    id: `consultant-${teamId}-${Date.now()}`,
    teamId,
    teamName,
    description: `${teamName} seeking outside consultation on roster evaluation`,
    compensation: baseCompensation + reputationBonus,
    durationWeeks: 4,
    reputationBonus: Math.round(reputationScore / 10),
    accepted: false,
  };
}

/**
 * Accepts a consultant opportunity
 */
export function acceptConsultantOpportunity(
  state: UnemploymentState,
  opportunityId: string
): UnemploymentState {
  const opportunity = state.consultantOpportunities.find((o) => o.id === opportunityId);
  if (!opportunity || state.activeConsultantJob) {
    return state;
  }

  return {
    ...state,
    consultantOpportunities: state.consultantOpportunities.map((o) =>
      o.id === opportunityId ? { ...o, accepted: true } : o
    ),
    activeConsultantJob: { ...opportunity, accepted: true },
    totalReputationChange: state.totalReputationChange + opportunity.reputationBonus,
    events: [
      ...state.events,
      {
        id: `event-consultant-${opportunityId}`,
        type: 'consultant_offer',
        week: state.currentWeek,
        year: state.year,
        headline: `Taking Consultant Role with ${opportunity.teamName}`,
        description: `Staying connected to the game with a short-term consulting position.`,
        teamId: opportunity.teamId,
        teamName: opportunity.teamName,
        impactOnReputation: opportunity.reputationBonus,
      },
    ],
  };
}

/**
 * Completes active consultant job
 */
export function completeConsultantJob(state: UnemploymentState): UnemploymentState {
  if (!state.activeConsultantJob) {
    return state;
  }

  return {
    ...state,
    activeConsultantJob: null,
    events: [
      ...state.events,
      {
        id: `event-consultant-complete-${state.activeConsultantJob.id}`,
        type: 'consultant_offer',
        week: state.currentWeek,
        year: state.year,
        headline: 'Consulting Work Complete',
        description: `Finished consulting work with ${state.activeConsultantJob.teamName}.`,
        teamId: state.activeConsultantJob.teamId,
        teamName: state.activeConsultantJob.teamName,
      },
    ],
  };
}

/**
 * Calculates reputation decay during unemployment
 */
export function calculateUnemploymentReputationDecay(
  baseReputation: number,
  yearsUnemployed: number
): number {
  // 3% decay per year, up to 15% maximum
  const decayRate = Math.min(0.03 * yearsUnemployed, 0.15);
  const decay = Math.round(baseReputation * decayRate);
  return decay;
}

/**
 * Ends unemployment year
 */
export function endUnemploymentYear(state: UnemploymentState): {
  reputationChange: number;
  summary: string;
} {
  const decay = calculateUnemploymentReputationDecay(50, state.consecutiveYearsUnemployed);
  const consultantBonus = state.totalReputationChange;
  const netChange = consultantBonus - decay;

  let summary: string;
  if (state.activeConsultantJob) {
    summary = `Spent the year consulting for ${state.activeConsultantJob.teamName}. Stayed connected to the game.`;
  } else if (state.consecutiveYearsUnemployed >= 2) {
    summary = `Another year on the sidelines. The longer out, the harder to get back in.`;
  } else {
    summary = `Watched from the sidelines as the season unfolded. Ready for a fresh start.`;
  }

  return {
    reputationChange: netChange,
    summary,
  };
}

/**
 * Adds retirement decision to state
 */
export function decideToRetire(state: UnemploymentState): UnemploymentState {
  return {
    ...state,
    hasDecidedToRetire: true,
    events: [
      ...state.events,
      {
        id: `event-retire-decision-${state.year}`,
        type: 'media_speculation',
        week: state.currentWeek,
        year: state.year,
        headline: 'Decision Made to Step Away',
        description: 'After careful consideration, decided to retire from the profession.',
      },
    ],
  };
}

/**
 * Gets unemployment year summary
 */
export function getUnemploymentSummary(state: UnemploymentState): {
  eventsCount: number;
  openingsWatched: number;
  opportunitiesMissed: number;
  consultantWorkDone: boolean;
} {
  return {
    eventsCount: state.events.length,
    openingsWatched: state.newOpeningsThisYear.length,
    opportunitiesMissed: state.filledOpeningsThisYear.length,
    consultantWorkDone: state.consultantOpportunities.some((o) => o.accepted),
  };
}

/**
 * Validates unemployment state
 */
export function validateUnemploymentState(state: UnemploymentState): boolean {
  if (typeof state.year !== 'number' || state.year < 2000) return false;
  if (typeof state.currentWeek !== 'number' || state.currentWeek < 0) return false;
  if (state.consecutiveYearsUnemployed < 0) return false;
  if (!Array.isArray(state.events)) return false;
  if (!Array.isArray(state.consultantOpportunities)) return false;
  if (!Array.isArray(state.newOpeningsThisYear)) return false;
  if (!Array.isArray(state.filledOpeningsThisYear)) return false;

  return true;
}
