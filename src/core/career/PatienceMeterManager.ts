/**
 * Patience Meter Manager
 * Handles patience state tracking, trend analysis, and status management
 * Note: Exact values are hidden from players - only qualitative status is exposed
 */

import {
  Owner,
  JobSecurityLevel,
  getJobSecurityLevel,
  getJobSecurityStatus,
  applyPatienceChange,
  validatePatienceValue,
} from '../models/owner';

/**
 * Patience trend direction
 */
export type PatienceTrend = 'improving' | 'stable' | 'declining';

/**
 * Historical patience entry for trend tracking
 */
export interface PatienceHistoryEntry {
  week: number;
  season: number;
  value: number;
  eventDescription: string | null;
}

/**
 * Patience meter state - tracks full history and trends
 */
export interface PatienceMeterState {
  ownerId: string;
  currentValue: number;
  history: PatienceHistoryEntry[];
  seasonStartValue: number;
  lastWeekValue: number;
  consecutiveDeclines: number;
  consecutiveImprovements: number;
}

/**
 * View model for patience - exposes only qualitative information
 * This is what the player sees (no raw numbers)
 */
export interface PatienceViewModel {
  status: 'secure' | 'stable' | 'warm seat' | 'hot seat' | 'danger';
  trend: PatienceTrend;
  trendDescription: string;
  weeklyChange: 'improved' | 'unchanged' | 'worsened';
  seasonChange: 'much better' | 'better' | 'same' | 'worse' | 'much worse';
  isAtRisk: boolean;
  urgencyLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Qualitative impact description for UI display
 */
export type ImpactDescription =
  | 'major boost'
  | 'significant boost'
  | 'moderate boost'
  | 'slight boost'
  | 'no change'
  | 'slight concern'
  | 'moderate concern'
  | 'significant concern'
  | 'major concern';

/**
 * Creates a new patience meter state
 */
export function createPatienceMeterState(
  ownerId: string,
  initialValue: number = 50,
  currentWeek: number = 1,
  currentSeason: number = 1
): PatienceMeterState {
  const clampedValue = Math.max(0, Math.min(100, initialValue));

  return {
    ownerId,
    currentValue: clampedValue,
    history: [
      {
        week: currentWeek,
        season: currentSeason,
        value: clampedValue,
        eventDescription: 'Initial hire',
      },
    ],
    seasonStartValue: clampedValue,
    lastWeekValue: clampedValue,
    consecutiveDeclines: 0,
    consecutiveImprovements: 0,
  };
}

/**
 * Updates the patience value and records history
 */
export function updatePatienceValue(
  state: PatienceMeterState,
  change: number,
  week: number,
  season: number,
  eventDescription: string
): PatienceMeterState {
  const newValue = applyPatienceChange(state.currentValue, change);

  // Track consecutive changes
  let consecutiveDeclines = state.consecutiveDeclines;
  let consecutiveImprovements = state.consecutiveImprovements;

  if (change < 0) {
    consecutiveDeclines++;
    consecutiveImprovements = 0;
  } else if (change > 0) {
    consecutiveImprovements++;
    consecutiveDeclines = 0;
  }

  const newEntry: PatienceHistoryEntry = {
    week,
    season,
    value: newValue,
    eventDescription,
  };

  return {
    ...state,
    currentValue: newValue,
    lastWeekValue: state.currentValue,
    history: [...state.history, newEntry],
    consecutiveDeclines,
    consecutiveImprovements,
  };
}

/**
 * Resets season tracking (call at start of new season)
 */
export function startNewSeason(state: PatienceMeterState): PatienceMeterState {
  return {
    ...state,
    seasonStartValue: state.currentValue,
  };
}

/**
 * Gets the current job security level
 */
export function getCurrentSecurityLevel(state: PatienceMeterState): JobSecurityLevel {
  return getJobSecurityLevel(state.currentValue);
}

/**
 * Calculates the patience trend based on recent history
 */
export function calculateTrend(state: PatienceMeterState): PatienceTrend {
  // Need at least 3 entries for trend
  if (state.history.length < 3) {
    return 'stable';
  }

  // Look at last 5 entries (or all if fewer)
  const recentHistory = state.history.slice(-5);
  const firstValue = recentHistory[0].value;
  const lastValue = recentHistory[recentHistory.length - 1].value;
  const difference = lastValue - firstValue;

  // Threshold for detecting trend (5 points)
  if (difference >= 5) {
    return 'improving';
  } else if (difference <= -5) {
    return 'declining';
  }

  return 'stable';
}

/**
 * Gets a description for the current trend
 */
export function getTrendDescription(trend: PatienceTrend, state: PatienceMeterState): string {
  const level = getCurrentSecurityLevel(state);

  switch (trend) {
    case 'improving':
      if (level === 'hotSeat' || level === 'warmSeat') {
        return 'Owner confidence is recovering';
      }
      return 'Owner is increasingly pleased with your performance';

    case 'declining':
      if (level === 'secure' || level === 'stable') {
        return 'Recent results have raised some concerns';
      }
      return 'Owner patience is wearing thin';

    case 'stable':
      switch (level) {
        case 'secure':
          return 'Your position remains strong';
        case 'stable':
          return 'Owner remains satisfied with direction';
        case 'warmSeat':
          return 'Your position requires improvement';
        case 'hotSeat':
          return 'Your job security is in serious jeopardy';
        default:
          return 'Your position is uncertain';
      }
  }
}

/**
 * Determines weekly change description
 */
export function getWeeklyChange(state: PatienceMeterState): 'improved' | 'unchanged' | 'worsened' {
  const diff = state.currentValue - state.lastWeekValue;

  if (diff > 2) return 'improved';
  if (diff < -2) return 'worsened';
  return 'unchanged';
}

/**
 * Determines season change description
 */
export function getSeasonChange(
  state: PatienceMeterState
): 'much better' | 'better' | 'same' | 'worse' | 'much worse' {
  const diff = state.currentValue - state.seasonStartValue;

  if (diff >= 20) return 'much better';
  if (diff >= 8) return 'better';
  if (diff <= -20) return 'much worse';
  if (diff <= -8) return 'worse';
  return 'same';
}

/**
 * Determines urgency level for player awareness
 */
export function getUrgencyLevel(
  state: PatienceMeterState
): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  const level = getCurrentSecurityLevel(state);
  const trend = calculateTrend(state);

  switch (level) {
    case 'secure':
      return 'none';

    case 'stable':
      return trend === 'declining' ? 'low' : 'none';

    case 'warmSeat':
      return trend === 'declining' ? 'medium' : 'low';

    case 'hotSeat':
      return trend === 'declining' ? 'critical' : 'high';

    case 'fired':
      return 'critical';

    default:
      return 'medium';
  }
}

/**
 * Checks if the GM is at risk of being fired
 */
export function isAtRisk(state: PatienceMeterState): boolean {
  const level = getCurrentSecurityLevel(state);
  return level === 'hotSeat' || level === 'fired';
}

/**
 * Creates the view model for UI display (hides raw numbers)
 */
export function createPatienceViewModel(state: PatienceMeterState): PatienceViewModel {
  const trend = calculateTrend(state);

  return {
    status: getJobSecurityStatus(state.currentValue),
    trend,
    trendDescription: getTrendDescription(trend, state),
    weeklyChange: getWeeklyChange(state),
    seasonChange: getSeasonChange(state),
    isAtRisk: isAtRisk(state),
    urgencyLevel: getUrgencyLevel(state),
  };
}

/**
 * Converts a numeric change to a qualitative impact description
 * This is shown to the player instead of actual numbers
 */
export function getImpactDescription(change: number): ImpactDescription {
  if (change >= 25) return 'major boost';
  if (change >= 15) return 'significant boost';
  if (change >= 8) return 'moderate boost';
  if (change >= 3) return 'slight boost';
  if (change > -3) return 'no change';
  if (change > -8) return 'slight concern';
  if (change > -15) return 'moderate concern';
  if (change > -25) return 'significant concern';
  return 'major concern';
}

/**
 * Gets the distance to the next threshold (positive = how far above, negative = how close to dropping)
 * Returns null if at lowest threshold
 */
export function getDistanceToNextThreshold(state: PatienceMeterState): number | null {
  const level = getCurrentSecurityLevel(state);

  const thresholds: Record<JobSecurityLevel, number | null> = {
    secure: 70, // Must stay at or above 70
    stable: 50, // Must stay at or above 50
    warmSeat: 35, // Must stay at or above 35
    hotSeat: 20, // Must stay at or above 20
    fired: null, // Already at bottom
  };

  const threshold = thresholds[level];
  if (threshold === null) return null;

  return state.currentValue - threshold;
}

/**
 * Gets how many points until the next status improvement
 */
export function getPointsToImprove(state: PatienceMeterState): number | null {
  const level = getCurrentSecurityLevel(state);

  const improvementThresholds: Record<JobSecurityLevel, number | null> = {
    secure: null, // Already at top
    stable: 70,
    warmSeat: 50,
    hotSeat: 35,
    fired: 20,
  };

  const threshold = improvementThresholds[level];
  if (threshold === null) return null;

  return threshold - state.currentValue;
}

/**
 * Validates a patience meter state
 */
export function validatePatienceMeterState(state: PatienceMeterState): boolean {
  if (!state.ownerId || typeof state.ownerId !== 'string') return false;
  if (!validatePatienceValue(state.currentValue)) return false;
  if (!validatePatienceValue(state.seasonStartValue)) return false;
  if (!validatePatienceValue(state.lastWeekValue)) return false;
  if (!Array.isArray(state.history)) return false;
  if (state.consecutiveDeclines < 0) return false;
  if (state.consecutiveImprovements < 0) return false;

  // Validate history entries
  for (const entry of state.history) {
    if (!validatePatienceValue(entry.value)) return false;
    if (entry.week < 0 || entry.season < 0) return false;
  }

  return true;
}

/**
 * Calculates patience recovery rate based on good performance
 * Patient owners recover faster, impatient owners slower
 */
export function calculateRecoveryModifier(ownerPatienceTrait: number): number {
  // Patience trait 1-100: 1 = very impatient, 100 = very patient
  // Recovery modifier: 0.5x to 1.5x
  return 0.5 + ownerPatienceTrait / 100;
}

/**
 * Calculates how quickly patience declines based on owner temperament
 * Impatient owners lose patience faster
 */
export function calculateDeclineModifier(ownerPatienceTrait: number): number {
  // Patience trait 1-100: 1 = very impatient, 100 = very patient
  // Decline modifier: 1.5x (impatient) to 0.5x (patient)
  return 1.5 - ownerPatienceTrait / 100;
}

/**
 * Applies owner personality modifiers to a patience change
 */
export function applyPersonalityModifiers(baseChange: number, ownerPatienceTrait: number): number {
  if (baseChange > 0) {
    return Math.round(baseChange * calculateRecoveryModifier(ownerPatienceTrait));
  } else {
    return Math.round(baseChange * calculateDeclineModifier(ownerPatienceTrait));
  }
}

/**
 * Gets summary statistics for a patience meter state
 */
export function getPatienceSummary(state: PatienceMeterState): {
  totalChanges: number;
  positiveChanges: number;
  negativeChanges: number;
  biggestGain: number;
  biggestLoss: number;
  averageChange: number;
} {
  if (state.history.length < 2) {
    return {
      totalChanges: 0,
      positiveChanges: 0,
      negativeChanges: 0,
      biggestGain: 0,
      biggestLoss: 0,
      averageChange: 0,
    };
  }

  let positiveChanges = 0;
  let negativeChanges = 0;
  let biggestGain = 0;
  let biggestLoss = 0;
  let totalChange = 0;

  for (let i = 1; i < state.history.length; i++) {
    const change = state.history[i].value - state.history[i - 1].value;

    if (change > 0) {
      positiveChanges++;
      biggestGain = Math.max(biggestGain, change);
    } else if (change < 0) {
      negativeChanges++;
      biggestLoss = Math.min(biggestLoss, change);
    }

    totalChange += change;
  }

  return {
    totalChanges: state.history.length - 1,
    positiveChanges,
    negativeChanges,
    biggestGain,
    biggestLoss,
    averageChange: Math.round((totalChange / (state.history.length - 1)) * 10) / 10,
  };
}

/**
 * Syncs patience meter state with owner entity
 */
export function syncWithOwner(state: PatienceMeterState, owner: Owner): Owner {
  return {
    ...owner,
    patienceMeter: state.currentValue,
  };
}

/**
 * Creates patience meter state from existing owner
 */
export function createFromOwner(
  owner: Owner,
  currentWeek: number = 1,
  currentSeason: number = 1
): PatienceMeterState {
  return createPatienceMeterState(owner.id, owner.patienceMeter, currentWeek, currentSeason);
}
