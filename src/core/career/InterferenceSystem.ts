/**
 * Interference System
 * Detects when owners intervene, tracks compliance/defiance, and calculates consequences
 */

import { Owner, OwnerDemand, OwnerDemandType } from '../models/owner/Owner';
import { applyPatienceChange, wouldBeFired } from '../models/owner/PatienceMeter';

/**
 * Team state for interference detection
 */
export interface TeamState {
  currentLosingStreak: number;
  fanApproval: number; // 0-100
  mediaScrutiny: number; // 0-100, higher = more negative attention
  seasonWins: number;
  seasonLosses: number;
  currentWeek: number;
  isPlayoffs: boolean;
  seasonExpectation: 'rebuild' | 'developing' | 'competitive' | 'contender' | 'championship';
}

/**
 * Intervention trigger result
 */
export interface InterventionTrigger {
  triggered: boolean;
  type: 'losingStreak' | 'fanApproval' | 'mediaScrutiny' | 'seasonPerformance' | 'ego';
  severity: 'mild' | 'moderate' | 'severe';
  description: string;
}

/**
 * Compliance tracking for a demand
 */
export interface ComplianceRecord {
  demandId: string;
  status: 'pending' | 'complied' | 'defied' | 'expired';
  issuedWeek: number;
  resolvedWeek: number | null;
  consequenceApplied: boolean;
}

/**
 * Consequence from defiance or compliance
 */
export interface InterferenceConsequence {
  patienceChange: number;
  trustChange: number;
  description: string;
  firedImmediately: boolean;
}

/**
 * Interference state tracking
 */
export interface InterferenceState {
  teamId: string;
  complianceHistory: ComplianceRecord[];
  totalDefiances: number;
  totalCompliances: number;
  consecutiveDefiances: number;
  lastInterventionWeek: number | null;
}

/**
 * Creates initial interference state
 */
export function createInterferenceState(teamId: string): InterferenceState {
  return {
    teamId,
    complianceHistory: [],
    totalDefiances: 0,
    totalCompliances: 0,
    consecutiveDefiances: 0,
    lastInterventionWeek: null,
  };
}

/**
 * Detects if owner should intervene based on losing streak
 */
export function detectLosingStreakIntervention(
  owner: Owner,
  teamState: TeamState
): InterventionTrigger {
  const threshold = owner.personality.interventionTriggers.losingStreakLength;

  if (teamState.currentLosingStreak >= threshold) {
    const overThreshold = teamState.currentLosingStreak - threshold;
    const severity: 'mild' | 'moderate' | 'severe' =
      overThreshold >= 3 ? 'severe' : overThreshold >= 1 ? 'moderate' : 'mild';

    return {
      triggered: true,
      type: 'losingStreak',
      severity,
      description: `${teamState.currentLosingStreak} game losing streak has caught the owner's attention`,
    };
  }

  return {
    triggered: false,
    type: 'losingStreak',
    severity: 'mild',
    description: '',
  };
}

/**
 * Detects if owner should intervene based on fan approval
 */
export function detectFanApprovalIntervention(
  owner: Owner,
  teamState: TeamState
): InterventionTrigger {
  const threshold = owner.personality.interventionTriggers.fanApprovalFloor;

  if (teamState.fanApproval < threshold) {
    const underThreshold = threshold - teamState.fanApproval;
    const severity: 'mild' | 'moderate' | 'severe' =
      underThreshold >= 20 ? 'severe' : underThreshold >= 10 ? 'moderate' : 'mild';

    return {
      triggered: true,
      type: 'fanApproval',
      severity,
      description: `Fan approval at ${teamState.fanApproval}% is below the owner's tolerance`,
    };
  }

  return {
    triggered: false,
    type: 'fanApproval',
    severity: 'mild',
    description: '',
  };
}

/**
 * Detects if owner should intervene based on media scrutiny
 */
export function detectMediaScrutinyIntervention(
  owner: Owner,
  teamState: TeamState
): InterventionTrigger {
  const threshold = owner.personality.interventionTriggers.mediaScrutinyThreshold;

  if (teamState.mediaScrutiny > threshold) {
    const overThreshold = teamState.mediaScrutiny - threshold;
    const severity: 'mild' | 'moderate' | 'severe' =
      overThreshold >= 30 ? 'severe' : overThreshold >= 15 ? 'moderate' : 'mild';

    return {
      triggered: true,
      type: 'mediaScrutiny',
      severity,
      description: 'Negative media attention has the owner concerned',
    };
  }

  return {
    triggered: false,
    type: 'mediaScrutiny',
    severity: 'mild',
    description: '',
  };
}

/**
 * Detects if owner should intervene based on underperformance
 */
export function detectSeasonPerformanceIntervention(
  owner: Owner,
  teamState: TeamState
): InterventionTrigger {
  // Only check mid-season or later
  if (teamState.currentWeek < 8) {
    return { triggered: false, type: 'seasonPerformance', severity: 'mild', description: '' };
  }

  const gamesPlayed = teamState.seasonWins + teamState.seasonLosses;
  if (gamesPlayed === 0) {
    return { triggered: false, type: 'seasonPerformance', severity: 'mild', description: '' };
  }

  const winPct = teamState.seasonWins / gamesPlayed;

  // Expected win percentages by expectation
  const expectedWinPct: Record<typeof teamState.seasonExpectation, number> = {
    rebuild: 0.25,
    developing: 0.4,
    competitive: 0.5,
    contender: 0.6,
    championship: 0.7,
  };

  const expected = expectedWinPct[teamState.seasonExpectation];
  const underperformance = expected - winPct;

  // Impatient owners trigger sooner
  const patienceFactor = (100 - owner.personality.traits.patience) / 100;
  const triggerThreshold = 0.15 - patienceFactor * 0.05; // 0.10 to 0.15

  if (underperformance > triggerThreshold) {
    const severity: 'mild' | 'moderate' | 'severe' =
      underperformance > 0.25 ? 'severe' : underperformance > 0.15 ? 'moderate' : 'mild';

    return {
      triggered: true,
      type: 'seasonPerformance',
      severity,
      description: `Team is underperforming expectations (${Math.round(winPct * 100)}% wins vs ${Math.round(expected * 100)}% expected)`,
    };
  }

  return {
    triggered: false,
    type: 'seasonPerformance',
    severity: 'mild',
    description: '',
  };
}

/**
 * Detects ego-driven intervention (owner wants to feel important)
 */
export function detectEgoIntervention(
  owner: Owner,
  currentWeek: number,
  lastInterventionWeek: number | null
): InterventionTrigger {
  // High-ego owners may intervene just to feel involved
  if (owner.personality.traits.ego < 70) {
    return { triggered: false, type: 'ego', severity: 'mild', description: '' };
  }

  // Check if it's been a while since last intervention
  const weeksSinceIntervention =
    lastInterventionWeek !== null ? currentWeek - lastInterventionWeek : currentWeek;

  // Higher ego = more frequent unprovoked interventions
  const interventionChance = (owner.personality.traits.ego - 70) / 100;
  const minWeeksGap = Math.max(3, 8 - Math.floor(owner.personality.traits.ego / 20));

  if (weeksSinceIntervention >= minWeeksGap && Math.random() < interventionChance) {
    return {
      triggered: true,
      type: 'ego',
      severity: 'mild',
      description: 'The owner wants to make their presence felt',
    };
  }

  return {
    triggered: false,
    type: 'ego',
    severity: 'mild',
    description: '',
  };
}

/**
 * Checks all intervention triggers
 */
export function detectAllInterventions(
  owner: Owner,
  teamState: TeamState,
  interferenceState: InterferenceState
): InterventionTrigger[] {
  const triggers: InterventionTrigger[] = [];

  const losingStreak = detectLosingStreakIntervention(owner, teamState);
  if (losingStreak.triggered) triggers.push(losingStreak);

  const fanApproval = detectFanApprovalIntervention(owner, teamState);
  if (fanApproval.triggered) triggers.push(fanApproval);

  const mediaScrutiny = detectMediaScrutinyIntervention(owner, teamState);
  if (mediaScrutiny.triggered) triggers.push(mediaScrutiny);

  const performance = detectSeasonPerformanceIntervention(owner, teamState);
  if (performance.triggered) triggers.push(performance);

  const ego = detectEgoIntervention(
    owner,
    teamState.currentWeek,
    interferenceState.lastInterventionWeek
  );
  if (ego.triggered) triggers.push(ego);

  return triggers;
}

/**
 * Gets most severe trigger from list
 */
export function getMostSevereTrigger(triggers: InterventionTrigger[]): InterventionTrigger | null {
  if (triggers.length === 0) return null;

  const severityOrder = { severe: 3, moderate: 2, mild: 1 };

  return triggers.reduce((most, current) =>
    severityOrder[current.severity] > severityOrder[most.severity] ? current : most
  );
}

/**
 * Records compliance with a demand
 */
export function recordCompliance(
  state: InterferenceState,
  demandId: string,
  currentWeek: number
): InterferenceState {
  const existingRecord = state.complianceHistory.find((r) => r.demandId === demandId);

  if (existingRecord) {
    return {
      ...state,
      complianceHistory: state.complianceHistory.map((r) =>
        r.demandId === demandId
          ? { ...r, status: 'complied', resolvedWeek: currentWeek, consequenceApplied: true }
          : r
      ),
      totalCompliances: state.totalCompliances + 1,
      consecutiveDefiances: 0,
    };
  }

  return {
    ...state,
    totalCompliances: state.totalCompliances + 1,
    consecutiveDefiances: 0,
  };
}

/**
 * Records defiance of a demand
 */
export function recordDefiance(
  state: InterferenceState,
  demandId: string,
  currentWeek: number
): InterferenceState {
  const existingRecord = state.complianceHistory.find((r) => r.demandId === demandId);

  if (existingRecord) {
    return {
      ...state,
      complianceHistory: state.complianceHistory.map((r) =>
        r.demandId === demandId
          ? { ...r, status: 'defied', resolvedWeek: currentWeek, consequenceApplied: true }
          : r
      ),
      totalDefiances: state.totalDefiances + 1,
      consecutiveDefiances: state.consecutiveDefiances + 1,
    };
  }

  return {
    ...state,
    totalDefiances: state.totalDefiances + 1,
    consecutiveDefiances: state.consecutiveDefiances + 1,
  };
}

/**
 * Adds a new demand to tracking
 */
export function trackNewDemand(
  state: InterferenceState,
  demand: OwnerDemand,
  currentWeek: number
): InterferenceState {
  const record: ComplianceRecord = {
    demandId: demand.id,
    status: 'pending',
    issuedWeek: currentWeek,
    resolvedWeek: null,
    consequenceApplied: false,
  };

  return {
    ...state,
    complianceHistory: [...state.complianceHistory, record],
    lastInterventionWeek: currentWeek,
  };
}

/**
 * Calculates consequence for compliance
 */
export function calculateComplianceConsequence(
  owner: Owner,
  _demandType: OwnerDemandType
): InterferenceConsequence {
  // Compliance generally improves relationship
  const basePatienceGain = 5;
  const baseTrustGain = 3;

  // Controlling owners expect compliance - less reward
  const controlFactor = owner.personality.traits.control / 100;
  const patienceChange = Math.round(basePatienceGain * (1 - controlFactor * 0.5));
  const trustChange = Math.round(baseTrustGain * (1 + controlFactor * 0.3));

  return {
    patienceChange,
    trustChange,
    description: 'Owner appreciates your cooperation',
    firedImmediately: false,
  };
}

/**
 * Calculates consequence for defiance
 */
export function calculateDefianceConsequence(
  owner: Owner,
  demandType: OwnerDemandType,
  consecutiveDefiances: number,
  currentPatience: number
): InterferenceConsequence {
  // Base defiance penalty
  let basePatienceLoss = -15;
  let baseTrustLoss = -10;

  // Higher control owners hate defiance more
  const controlMultiplier = 1 + (owner.personality.traits.control - 50) / 100;
  basePatienceLoss = Math.round(basePatienceLoss * controlMultiplier);
  baseTrustLoss = Math.round(baseTrustLoss * controlMultiplier);

  // Consecutive defiances stack
  const defianceMultiplier = 1 + consecutiveDefiances * 0.25;
  basePatienceLoss = Math.round(basePatienceLoss * defianceMultiplier);
  baseTrustLoss = Math.round(baseTrustLoss * defianceMultiplier);

  // Loyalty can soften the blow slightly
  const loyaltyReduction = (owner.personality.traits.loyalty - 50) / 200;
  basePatienceLoss = Math.round(basePatienceLoss * (1 - loyaltyReduction));

  // Calculate if this would result in firing
  const newPatience = applyPatienceChange(currentPatience, basePatienceLoss);
  const firedImmediately = wouldBeFired(newPatience);

  // Build description
  let description: string;
  if (firedImmediately) {
    description = 'Your defiance was the final straw. You have been fired.';
  } else if (consecutiveDefiances >= 2) {
    description = 'The owner is losing patience with your repeated defiance';
  } else {
    description = 'The owner is unhappy with your decision to ignore their request';
  }

  return {
    patienceChange: basePatienceLoss,
    trustChange: baseTrustLoss,
    description,
    firedImmediately,
  };
}

/**
 * Checks for expired demands
 */
export function checkExpiredDemands(
  owner: Owner,
  state: InterferenceState,
  currentWeek: number
): { expiredDemands: OwnerDemand[]; updatedState: InterferenceState } {
  const expiredDemands: OwnerDemand[] = [];
  let updatedState = state;

  for (const demand of owner.activeDemands) {
    if (demand.deadline <= currentWeek) {
      const record = state.complianceHistory.find((r) => r.demandId === demand.id);
      if (record && record.status === 'pending') {
        expiredDemands.push(demand);
        updatedState = recordDefiance(updatedState, demand.id, currentWeek);
      }
    }
  }

  return { expiredDemands, updatedState };
}

/**
 * Applies interference consequence to owner
 */
export function applyInterferenceConsequence(
  owner: Owner,
  consequence: InterferenceConsequence
): Owner {
  const newPatience = applyPatienceChange(owner.patienceMeter, consequence.patienceChange);
  const newTrust = Math.max(0, Math.min(100, owner.trustLevel + consequence.trustChange));

  return {
    ...owner,
    patienceMeter: newPatience,
    trustLevel: newTrust,
  };
}

/**
 * Gets compliance rate as percentage
 */
export function getComplianceRate(state: InterferenceState): number | null {
  const total = state.totalCompliances + state.totalDefiances;
  if (total === 0) return null;
  return Math.round((state.totalCompliances / total) * 100);
}

/**
 * Gets user-friendly compliance description
 */
export function getComplianceDescription(
  state: InterferenceState
): 'exemplary' | 'cooperative' | 'independent' | 'defiant' | 'rebellious' | 'unknown' {
  const rate = getComplianceRate(state);
  if (rate === null) return 'unknown';

  if (rate >= 90) return 'exemplary';
  if (rate >= 70) return 'cooperative';
  if (rate >= 50) return 'independent';
  if (rate >= 30) return 'defiant';
  return 'rebellious';
}

/**
 * Determines if owner should generate a demand based on triggers
 */
export function shouldGenerateDemand(
  owner: Owner,
  triggers: InterventionTrigger[],
  hasActiveDemand: boolean
): boolean {
  // Don't pile on demands
  if (hasActiveDemand && owner.personality.traits.control < 80) {
    return false;
  }

  // No triggers, no demand (unless high ego)
  if (triggers.length === 0) {
    return false;
  }

  // Severe triggers always generate demands
  if (triggers.some((t) => t.severity === 'severe')) {
    return true;
  }

  // Moderate triggers have good chance
  if (triggers.some((t) => t.severity === 'moderate')) {
    return Math.random() < 0.7;
  }

  // Mild triggers depend on control trait
  const controlChance = owner.personality.traits.control / 100;
  return Math.random() < controlChance * 0.5;
}
