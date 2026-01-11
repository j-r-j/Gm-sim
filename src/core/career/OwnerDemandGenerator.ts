/**
 * Owner Demand Generator
 * Generates specific demands from owners with types, deadlines, and penalties
 */

import { Owner, OwnerDemand, OwnerDemandType } from '../models/owner/Owner';
import { InterventionTrigger, TeamState } from './InterferenceSystem';

/**
 * Player info for demand generation
 */
export interface PlayerInfo {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  overall: number;
  age: number;
  salary: number;
  isStarter: boolean;
  isStar: boolean; // 85+ overall
  isStruggling: boolean; // Recent poor performance
  isFreeAgent?: boolean;
}

/**
 * Coach info for demand generation
 */
export interface CoachInfo {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  winPercentage: number | null;
  yearsWithTeam: number;
  isStruggling: boolean;
}

/**
 * Draft prospect info for demand generation
 */
export interface ProspectInfo {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  projectedRound: number;
  hypeLevel: 'unknown' | 'sleeper' | 'prospect' | 'star' | 'generational';
}

/**
 * Context for demand generation
 */
export interface DemandContext {
  currentWeek: number;
  currentSeason: number;
  teamState: TeamState;
  availablePlayers: PlayerInfo[];
  availableCoaches: CoachInfo[];
  draftProspects: ProspectInfo[];
  tradeTargets: PlayerInfo[];
  teamRoster: PlayerInfo[];
}

/**
 * Demand weights based on trigger type
 */
const TRIGGER_DEMAND_WEIGHTS: Record<
  InterventionTrigger['type'],
  Partial<Record<OwnerDemandType, number>>
> = {
  losingStreak: { fireCoach: 40, signPlayer: 30, tradeFor: 30 },
  fanApproval: { signPlayer: 50, tradeFor: 30, fireCoach: 20 },
  mediaScrutiny: { fireCoach: 35, signPlayer: 35, other: 30 },
  seasonPerformance: { fireCoach: 40, tradeFor: 30, signPlayer: 30 },
  ego: { draftPlayer: 40, signPlayer: 30, other: 30 },
};

/**
 * Generates a unique demand ID
 */
function generateDemandId(): string {
  return `demand-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Selects demand type based on trigger and owner personality
 */
export function selectDemandType(
  owner: Owner,
  trigger: InterventionTrigger | null,
  context: DemandContext
): OwnerDemandType {
  // Get base weights from trigger
  const baseWeights: Record<OwnerDemandType, number> = {
    signPlayer: 25,
    fireCoach: 25,
    draftPlayer: 20,
    tradeFor: 20,
    other: 10,
  };

  if (trigger) {
    const triggerWeights = TRIGGER_DEMAND_WEIGHTS[trigger.type];
    for (const [type, weight] of Object.entries(triggerWeights)) {
      baseWeights[type as OwnerDemandType] += weight;
    }
  }

  // Modify based on owner personality
  const { traits, secondaryTraits } = owner.personality;

  // Impatient owners more likely to fire coaches
  if (traits.patience < 40) {
    baseWeights.fireCoach += 20;
  }

  // Big spenders want signings
  if (traits.spending > 70) {
    baseWeights.signPlayer += 20;
    baseWeights.tradeFor += 10;
  }

  // Win-now owners want trades
  if (secondaryTraits.includes('winNow')) {
    baseWeights.tradeFor += 25;
    baseWeights.signPlayer += 15;
  }

  // Analytics believers more patient, less likely to fire
  if (secondaryTraits.includes('analyticsBeliever')) {
    baseWeights.fireCoach -= 15;
  }

  // Old school wants coaching changes
  if (secondaryTraits.includes('oldSchool')) {
    baseWeights.fireCoach += 15;
  }

  // PR obsessed wants big names
  if (secondaryTraits.includes('prObsessed')) {
    baseWeights.signPlayer += 20;
  }

  // Adjust based on context availability
  if (
    context.availableCoaches.length === 0 ||
    !hasStrugglingCoach(context.teamRoster, context.availableCoaches)
  ) {
    baseWeights.fireCoach = Math.max(5, baseWeights.fireCoach - 30);
  }

  if (context.draftProspects.length === 0 || context.currentWeek > 17) {
    baseWeights.draftPlayer = 5; // Off-season only
  }

  // Normalize and select
  const total = Object.values(baseWeights).reduce((a, b) => a + b, 0);
  let random = Math.random() * total;

  for (const [type, weight] of Object.entries(baseWeights)) {
    random -= weight;
    if (random <= 0) {
      return type as OwnerDemandType;
    }
  }

  return 'other';
}

/**
 * Checks if there's a struggling coach
 */
function hasStrugglingCoach(_roster: PlayerInfo[], coaches: CoachInfo[]): boolean {
  return coaches.some((c) => c.isStruggling);
}

/**
 * Generates a sign player demand
 */
export function generateSignPlayerDemand(
  owner: Owner,
  context: DemandContext,
  trigger: InterventionTrigger | null
): OwnerDemand | null {
  const availablePlayers = context.availablePlayers.filter((p) => p.isFreeAgent);

  if (availablePlayers.length === 0) {
    // Generate generic demand for future signing
    return {
      id: generateDemandId(),
      type: 'signPlayer',
      description: 'Make a significant free agent signing',
      targetId: null,
      deadline: context.currentWeek + 4,
      consequence: determineConsequence(owner, 'signPlayer', trigger?.severity ?? 'mild'),
      issuedWeek: context.currentWeek,
    };
  }

  // Pick a target based on owner preferences
  let target: PlayerInfo;

  if (owner.personality.secondaryTraits.includes('prObsessed')) {
    // Want a star
    const stars = availablePlayers.filter((p) => p.isStar);
    target =
      stars.length > 0 ? stars[Math.floor(Math.random() * stars.length)] : availablePlayers[0];
  } else if (owner.personality.traits.spending < 40) {
    // Want a bargain
    const affordable = availablePlayers.filter((p) => p.overall < 80);
    target =
      affordable.length > 0
        ? affordable[Math.floor(Math.random() * affordable.length)]
        : availablePlayers[0];
  } else {
    // Random good player
    const good = availablePlayers.filter((p) => p.overall >= 75);
    target = good.length > 0 ? good[Math.floor(Math.random() * good.length)] : availablePlayers[0];
  }

  return {
    id: generateDemandId(),
    type: 'signPlayer',
    description: `Sign ${target.firstName} ${target.lastName} (${target.position})`,
    targetId: target.id,
    deadline: context.currentWeek + determineDeadline(owner, 'signPlayer'),
    consequence: determineConsequence(owner, 'signPlayer', trigger?.severity ?? 'mild'),
    issuedWeek: context.currentWeek,
  };
}

/**
 * Generates a fire coach demand
 */
export function generateFireCoachDemand(
  owner: Owner,
  context: DemandContext,
  trigger: InterventionTrigger | null
): OwnerDemand | null {
  const strugglingCoaches = context.availableCoaches.filter((c) => c.isStruggling);

  if (strugglingCoaches.length === 0 && context.availableCoaches.length === 0) {
    return null;
  }

  // Target the most struggling coach, or random if none struggling
  const target =
    strugglingCoaches.length > 0
      ? strugglingCoaches[Math.floor(Math.random() * strugglingCoaches.length)]
      : context.availableCoaches[Math.floor(Math.random() * context.availableCoaches.length)];

  return {
    id: generateDemandId(),
    type: 'fireCoach',
    description: `Fire ${target.firstName} ${target.lastName} (${target.role})`,
    targetId: target.id,
    deadline: context.currentWeek + determineDeadline(owner, 'fireCoach'),
    consequence: determineConsequence(owner, 'fireCoach', trigger?.severity ?? 'mild'),
    issuedWeek: context.currentWeek,
  };
}

/**
 * Generates a draft player demand
 */
export function generateDraftPlayerDemand(
  owner: Owner,
  context: DemandContext,
  trigger: InterventionTrigger | null
): OwnerDemand | null {
  if (context.draftProspects.length === 0) {
    return null;
  }

  // High ego owners want generational talents
  let target: ProspectInfo;
  if (owner.personality.traits.ego > 70) {
    const hyped = context.draftProspects.filter(
      (p) => p.hypeLevel === 'generational' || p.hypeLevel === 'star'
    );
    target =
      hyped.length > 0
        ? hyped[Math.floor(Math.random() * hyped.length)]
        : context.draftProspects[0];
  } else if (owner.personality.secondaryTraits.includes('analyticsBeliever')) {
    // Analytics owners might want sleepers
    const sleepers = context.draftProspects.filter((p) => p.hypeLevel === 'sleeper');
    target =
      sleepers.length > 0
        ? sleepers[Math.floor(Math.random() * sleepers.length)]
        : context.draftProspects[Math.floor(Math.random() * context.draftProspects.length)];
  } else {
    target = context.draftProspects[Math.floor(Math.random() * context.draftProspects.length)];
  }

  return {
    id: generateDemandId(),
    type: 'draftPlayer',
    description: `Draft ${target.firstName} ${target.lastName} (${target.position})`,
    targetId: target.id,
    deadline: context.currentWeek + 8, // Draft deadline
    consequence: determineConsequence(owner, 'draftPlayer', trigger?.severity ?? 'mild'),
    issuedWeek: context.currentWeek,
  };
}

/**
 * Generates a trade for demand
 */
export function generateTradeForDemand(
  owner: Owner,
  context: DemandContext,
  trigger: InterventionTrigger | null
): OwnerDemand | null {
  if (context.tradeTargets.length === 0) {
    return {
      id: generateDemandId(),
      type: 'tradeFor',
      description: 'Make a significant trade to improve the roster',
      targetId: null,
      deadline: context.currentWeek + determineDeadline(owner, 'tradeFor'),
      consequence: determineConsequence(owner, 'tradeFor', trigger?.severity ?? 'mild'),
      issuedWeek: context.currentWeek,
    };
  }

  // Pick target based on team needs
  const stars = context.tradeTargets.filter((p) => p.isStar);
  const target =
    stars.length > 0 && owner.personality.traits.spending > 50
      ? stars[Math.floor(Math.random() * stars.length)]
      : context.tradeTargets[Math.floor(Math.random() * context.tradeTargets.length)];

  return {
    id: generateDemandId(),
    type: 'tradeFor',
    description: `Trade for ${target.firstName} ${target.lastName} (${target.position})`,
    targetId: target.id,
    deadline: context.currentWeek + determineDeadline(owner, 'tradeFor'),
    consequence: determineConsequence(owner, 'tradeFor', trigger?.severity ?? 'mild'),
    issuedWeek: context.currentWeek,
  };
}

/**
 * Generates an other/generic demand
 */
export function generateOtherDemand(
  owner: Owner,
  context: DemandContext,
  _trigger: InterventionTrigger | null
): OwnerDemand {
  const demands: Array<{ description: string; consequence: string }> = [
    {
      description: 'Improve team chemistry and locker room culture',
      consequence: 'Trust in your leadership will decrease',
    },
    {
      description: 'Reduce player conflicts and drama',
      consequence: 'Media scrutiny will increase further',
    },
    {
      description: 'Show progress in the next few weeks',
      consequence: 'Your job security will be questioned',
    },
    {
      description: 'Address the offensive struggles immediately',
      consequence: 'Fans will demand changes',
    },
    {
      description: 'Fix the defensive issues plaguing the team',
      consequence: 'Patience is running thin',
    },
  ];

  const selected = demands[Math.floor(Math.random() * demands.length)];

  return {
    id: generateDemandId(),
    type: 'other',
    description: selected.description,
    targetId: null,
    deadline: context.currentWeek + determineDeadline(owner, 'other'),
    consequence: selected.consequence,
    issuedWeek: context.currentWeek,
  };
}

/**
 * Determines deadline based on owner patience and demand type
 */
function determineDeadline(owner: Owner, demandType: OwnerDemandType): number {
  const baseDeadlines: Record<OwnerDemandType, [number, number]> = {
    signPlayer: [2, 6],
    fireCoach: [1, 3],
    draftPlayer: [4, 8],
    tradeFor: [2, 5],
    other: [3, 6],
  };

  const [min, max] = baseDeadlines[demandType];

  // Patient owners give more time
  const patienceBonus = Math.floor((owner.personality.traits.patience - 50) / 25);

  const deadline = Math.floor(min + Math.random() * (max - min)) + patienceBonus;
  return Math.max(1, deadline);
}

/**
 * Determines consequence description based on severity
 */
function determineConsequence(
  owner: Owner,
  demandType: OwnerDemandType,
  severity: 'mild' | 'moderate' | 'severe'
): string {
  const consequences: Record<'mild' | 'moderate' | 'severe', string[]> = {
    mild: ['The owner will be disappointed', 'Trust will be affected', 'Expect some pushback'],
    moderate: [
      'Your job security will decrease significantly',
      'The owner will lose confidence in your leadership',
      'Expect increased scrutiny of your decisions',
    ],
    severe: [
      'Your position will be in serious jeopardy',
      'This could be the final straw',
      'Failure is not an option at this point',
    ],
  };

  const options = consequences[severity];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Main function to generate a demand
 */
export function generateDemand(
  owner: Owner,
  context: DemandContext,
  trigger: InterventionTrigger | null
): OwnerDemand | null {
  const demandType = selectDemandType(owner, trigger, context);

  switch (demandType) {
    case 'signPlayer':
      return generateSignPlayerDemand(owner, context, trigger);
    case 'fireCoach':
      return generateFireCoachDemand(owner, context, trigger);
    case 'draftPlayer':
      return generateDraftPlayerDemand(owner, context, trigger);
    case 'tradeFor':
      return generateTradeForDemand(owner, context, trigger);
    case 'other':
      return generateOtherDemand(owner, context, trigger);
    default:
      return null;
  }
}

/**
 * Gets user-friendly demand urgency
 */
export function getDemandUrgency(
  demand: OwnerDemand,
  currentWeek: number
): 'relaxed' | 'soon' | 'urgent' | 'critical' {
  const weeksRemaining = demand.deadline - currentWeek;

  if (weeksRemaining <= 0) return 'critical';
  if (weeksRemaining <= 1) return 'urgent';
  if (weeksRemaining <= 3) return 'soon';
  return 'relaxed';
}

/**
 * Gets demand description for display
 */
export function getDemandDisplayInfo(
  demand: OwnerDemand,
  currentWeek: number
): {
  title: string;
  urgency: string;
  weeksRemaining: number;
  consequence: string;
} {
  const weeksRemaining = Math.max(0, demand.deadline - currentWeek);
  const urgency = getDemandUrgency(demand, currentWeek);

  const urgencyLabels: Record<typeof urgency, string> = {
    relaxed: 'When convenient',
    soon: 'Soon',
    urgent: 'Urgent',
    critical: 'Overdue!',
  };

  return {
    title: demand.description,
    urgency: urgencyLabels[urgency],
    weeksRemaining,
    consequence: demand.consequence,
  };
}

/**
 * Checks if a demand has been satisfied
 */
export function isDemandSatisfied(
  demand: OwnerDemand,
  completedActions: Array<{ type: OwnerDemandType; targetId: string | null }>
): boolean {
  return completedActions.some(
    (action) =>
      action.type === demand.type &&
      (demand.targetId === null || action.targetId === demand.targetId)
  );
}
