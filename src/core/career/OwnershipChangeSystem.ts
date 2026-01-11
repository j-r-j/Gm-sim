/**
 * Ownership Change System
 * Handles rare ownership changes, generates new owners, and resets expectations
 */

import { Owner } from '../models/owner/Owner';
import { OwnerPersonality } from '../models/owner/OwnerPersonality';
import { TeamContext, generateOwner, PersonalityArchetype } from './OwnerPersonalityEngine';
import { OwnerMoodState, createOwnerMoodState } from './OwnerMoodSystem';
import { InterferenceState, createInterferenceState } from './InterferenceSystem';

/**
 * Ownership change types
 */
export type OwnershipChangeType =
  | 'sale'
  | 'death'
  | 'family_transfer'
  | 'forced_sale'
  | 'group_purchase';

/**
 * Ownership change event
 */
export interface OwnershipChangeEvent {
  type: OwnershipChangeType;
  previousOwnerId: string;
  newOwnerId: string;
  season: number;
  description: string;
  gmRetained: boolean;
  expectationsReset: boolean;
}

/**
 * League-wide ownership state
 */
export interface LeagueOwnershipState {
  owners: Map<string, Owner>;
  teamContexts: Map<string, TeamContext>;
  lastChangePerTeam: Map<string, number>; // teamId -> season of last change
  ownershipHistory: OwnershipChangeEvent[];
  moodStates: Map<string, OwnerMoodState>;
  interferenceStates: Map<string, InterferenceState>;
}

/**
 * Common owner first names for generation
 */
const OWNER_FIRST_NAMES = [
  'Robert',
  'James',
  'William',
  'Michael',
  'David',
  'Richard',
  'Charles',
  'Thomas',
  'John',
  'Daniel',
  'Mark',
  'Steven',
  'Kenneth',
  'Edward',
  'George',
  'Arthur',
  'Stanley',
  'Harold',
  'Eugene',
  'Philip',
  'Lawrence',
  'Gerald',
  'Raymond',
  'Howard',
];

/**
 * Common owner last names for generation
 */
const OWNER_LAST_NAMES = [
  'Anderson',
  'Williams',
  'Johnson',
  'Brown',
  'Davis',
  'Miller',
  'Wilson',
  'Moore',
  'Taylor',
  'Thomas',
  'Jackson',
  'White',
  'Harris',
  'Martin',
  'Thompson',
  'Garcia',
  'Martinez',
  'Robinson',
  'Clark',
  'Rodriguez',
  'Lewis',
  'Lee',
  'Walker',
  'Hall',
  'Allen',
  'Young',
  'King',
  'Wright',
  'Scott',
  'Green',
  'Baker',
  'Adams',
  'Nelson',
  'Hill',
  'Campbell',
  'Mitchell',
  'Roberts',
  'Carter',
  'Phillips',
  'Evans',
];

/**
 * Creates initial league ownership state
 */
export function createLeagueOwnershipState(): LeagueOwnershipState {
  return {
    owners: new Map(),
    teamContexts: new Map(),
    lastChangePerTeam: new Map(),
    ownershipHistory: [],
    moodStates: new Map(),
    interferenceStates: new Map(),
  };
}

/**
 * Generates a unique owner ID
 */
function generateOwnerId(): string {
  return `owner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a random owner name
 */
export function generateOwnerName(): { firstName: string; lastName: string } {
  const firstName = OWNER_FIRST_NAMES[Math.floor(Math.random() * OWNER_FIRST_NAMES.length)];
  const lastName = OWNER_LAST_NAMES[Math.floor(Math.random() * OWNER_LAST_NAMES.length)];
  return { firstName, lastName };
}

/**
 * Calculates probability of ownership change for a season
 * Target: ~1 team per 3-5 years across 32 teams = 6.25-10.67 per 32 teams per year
 * Per team: 1/(3*32) to 1/(5*32) = ~0.625% to 1.04% per team per year
 */
export function calculateOwnershipChangeProbability(
  owner: Owner,
  teamContext: TeamContext,
  currentSeason: number,
  lastChangeSeason: number | undefined
): number {
  // Base probability ~0.8% per team per year (avg of 3-5 year range)
  let probability = 0.008;

  // Years since last change
  const yearsSinceChange =
    lastChangeSeason !== undefined ? currentSeason - lastChangeSeason : owner.yearsAsOwner;

  // Increase probability after 10+ years
  if (yearsSinceChange > 10) {
    probability += (yearsSinceChange - 10) * 0.002;
  }

  // Old owners more likely to sell/transfer
  if (owner.yearsAsOwner > 20) {
    probability += 0.005;
  }
  if (owner.yearsAsOwner > 30) {
    probability += 0.005;
  }

  // Poor performance can force sales
  if (teamContext.recentPerformance === 'terrible') {
    probability += 0.003;
  }

  // Struggling small-market teams more likely to be sold
  if (teamContext.marketSize === 'small' && teamContext.recentPerformance === 'poor') {
    probability += 0.002;
  }

  // Cap at 5% per year
  return Math.min(0.05, probability);
}

/**
 * Determines ownership change type
 */
export function determineChangeType(owner: Owner, random: number): OwnershipChangeType {
  // Weight by owner characteristics
  const weights: Record<OwnershipChangeType, number> = {
    sale: 35,
    death: owner.yearsAsOwner > 25 ? 20 : 10,
    family_transfer: owner.yearsAsOwner > 15 ? 25 : 15,
    forced_sale: 15,
    group_purchase: 15,
  };

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let target = random * total;

  for (const [type, weight] of Object.entries(weights)) {
    target -= weight;
    if (target <= 0) {
      return type as OwnershipChangeType;
    }
  }

  return 'sale';
}

/**
 * Generates description for ownership change
 */
export function generateChangeDescription(
  changeType: OwnershipChangeType,
  previousOwner: Owner,
  newOwnerName: string
): string {
  const descriptions: Record<OwnershipChangeType, string[]> = {
    sale: [
      `${previousOwner.firstName} ${previousOwner.lastName} has sold the team to ${newOwnerName}`,
      `The franchise has been purchased by ${newOwnerName} from ${previousOwner.firstName} ${previousOwner.lastName}`,
      `${newOwnerName} becomes the new owner after purchasing the team`,
    ],
    death: [
      `Following the passing of ${previousOwner.firstName} ${previousOwner.lastName}, ${newOwnerName} takes ownership`,
      `The team transitions to new ownership under ${newOwnerName} following the death of the previous owner`,
    ],
    family_transfer: [
      `${previousOwner.firstName} ${previousOwner.lastName} has transferred ownership to ${newOwnerName}`,
      `${newOwnerName} takes control as ownership passes within the family`,
      `The franchise stays in the family as ${newOwnerName} becomes the new owner`,
    ],
    forced_sale: [
      `The league has forced a sale of the team to ${newOwnerName}`,
      `${newOwnerName} purchases the team following a league-mandated sale`,
      `Ownership controversy leads to forced sale to ${newOwnerName}`,
    ],
    group_purchase: [
      `An ownership group led by ${newOwnerName} has purchased the team`,
      `${newOwnerName} leads new ownership group taking control of the franchise`,
      `The team is now owned by a group headed by ${newOwnerName}`,
    ],
  };

  const options = descriptions[changeType];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Determines if GM is retained after ownership change
 */
export function determineGMRetention(
  changeType: OwnershipChangeType,
  previousOwner: Owner,
  newPersonality: OwnerPersonality,
  gmPerformance: 'excellent' | 'good' | 'average' | 'poor' | 'terrible'
): boolean {
  // Base retention chance by change type
  const baseRetention: Record<OwnershipChangeType, number> = {
    family_transfer: 0.8, // Family tends to keep existing staff
    death: 0.7,
    sale: 0.5,
    group_purchase: 0.4,
    forced_sale: 0.3,
  };

  let retention = baseRetention[changeType];

  // Modify by GM performance
  const performanceModifier: Record<typeof gmPerformance, number> = {
    excellent: 0.3,
    good: 0.15,
    average: 0,
    poor: -0.2,
    terrible: -0.4,
  };
  retention += performanceModifier[gmPerformance];

  // New owner's control trait affects retention
  // High-control owners want their own people
  if (newPersonality.traits.control > 70) {
    retention -= 0.2;
  } else if (newPersonality.traits.control < 30) {
    retention += 0.1;
  }

  // Patient owners more likely to give GM a chance
  if (newPersonality.traits.patience > 70) {
    retention += 0.15;
  } else if (newPersonality.traits.patience < 30) {
    retention -= 0.15;
  }

  return Math.random() < Math.max(0.1, Math.min(0.95, retention));
}

/**
 * Creates new owner for ownership change
 */
export function createNewOwner(
  teamId: string,
  teamContext: TeamContext,
  changeType: OwnershipChangeType,
  _previousOwner: Owner
): Owner {
  const { firstName, lastName } = generateOwnerName();
  const newId = generateOwnerId();

  // Family transfers might have similar personalities
  let archetype: PersonalityArchetype | undefined;
  if (changeType === 'family_transfer' && Math.random() < 0.5) {
    // Some similarity to previous owner
    archetype = undefined; // Will be generated but context carries over
  }

  // Forced sales often bring in analytics-focused owners
  if (changeType === 'forced_sale' && Math.random() < 0.6) {
    archetype = 'analytics_believer';
  }

  // Group purchases tend to be more hands-off initially
  if (changeType === 'group_purchase' && Math.random() < 0.4) {
    archetype = 'hands_off_owner';
  }

  const options = {
    teamContext,
    archetype,
    randomSeed: Math.random() * 10000,
  };

  const newOwner = generateOwner(newId, teamId, firstName, lastName, options);

  // Adjust initial values for ownership change scenario
  // New owners start with moderate patience (fresh start)
  newOwner.patienceMeter = 55 + Math.floor(Math.random() * 20);
  newOwner.trustLevel = 45 + Math.floor(Math.random() * 15);

  // New owners start fresh
  newOwner.yearsAsOwner = 1;
  newOwner.previousGMsFired = 0;
  newOwner.championshipsWon = 0;
  newOwner.activeDemands = [];

  return newOwner;
}

/**
 * Processes ownership change for a team
 */
export function processOwnershipChange(
  state: LeagueOwnershipState,
  teamId: string,
  previousOwner: Owner,
  currentSeason: number,
  gmPerformance: 'excellent' | 'good' | 'average' | 'poor' | 'terrible'
): {
  newState: LeagueOwnershipState;
  event: OwnershipChangeEvent;
  newOwner: Owner;
} {
  const teamContext = state.teamContexts.get(teamId);
  if (!teamContext) {
    throw new Error(`No team context found for team ${teamId}`);
  }

  // Determine change type
  const changeType = determineChangeType(previousOwner, Math.random());

  // Create new owner
  const newOwner = createNewOwner(teamId, teamContext, changeType, previousOwner);

  // Determine if GM is retained
  const gmRetained = determineGMRetention(
    changeType,
    previousOwner,
    newOwner.personality,
    gmPerformance
  );

  // Generate description
  const description = generateChangeDescription(
    changeType,
    previousOwner,
    `${newOwner.firstName} ${newOwner.lastName}`
  );

  // Create event
  const event: OwnershipChangeEvent = {
    type: changeType,
    previousOwnerId: previousOwner.id,
    newOwnerId: newOwner.id,
    season: currentSeason,
    description,
    gmRetained,
    expectationsReset: true,
  };

  // Update state
  const newOwners = new Map(state.owners);
  newOwners.set(teamId, newOwner);

  const newLastChange = new Map(state.lastChangePerTeam);
  newLastChange.set(teamId, currentSeason);

  const newMoodStates = new Map(state.moodStates);
  newMoodStates.set(teamId, createOwnerMoodState());

  const newInterferenceStates = new Map(state.interferenceStates);
  newInterferenceStates.set(teamId, createInterferenceState(teamId));

  return {
    newState: {
      ...state,
      owners: newOwners,
      lastChangePerTeam: newLastChange,
      ownershipHistory: [...state.ownershipHistory, event],
      moodStates: newMoodStates,
      interferenceStates: newInterferenceStates,
    },
    event,
    newOwner,
  };
}

/**
 * Checks all teams for potential ownership changes
 */
export function checkLeagueOwnershipChanges(
  state: LeagueOwnershipState,
  currentSeason: number,
  gmPerformances: Map<string, 'excellent' | 'good' | 'average' | 'poor' | 'terrible'>
): {
  newState: LeagueOwnershipState;
  changes: OwnershipChangeEvent[];
} {
  let currentState = state;
  const changes: OwnershipChangeEvent[] = [];

  for (const [teamId, owner] of state.owners) {
    const teamContext = state.teamContexts.get(teamId);
    if (!teamContext) continue;

    const lastChange = state.lastChangePerTeam.get(teamId);
    const probability = calculateOwnershipChangeProbability(
      owner,
      teamContext,
      currentSeason,
      lastChange
    );

    if (Math.random() < probability) {
      const gmPerformance = gmPerformances.get(teamId) ?? 'average';
      const result = processOwnershipChange(
        currentState,
        teamId,
        owner,
        currentSeason,
        gmPerformance
      );

      currentState = result.newState;
      changes.push(result.event);
    }
  }

  return { newState: currentState, changes };
}

/**
 * Gets user-visible ownership change summary
 */
export function getOwnershipChangeSummary(event: OwnershipChangeEvent): {
  headline: string;
  subtext: string;
  gmStatus: string;
} {
  let headline: string;
  switch (event.type) {
    case 'sale':
      headline = 'Team Sold to New Owner';
      break;
    case 'death':
      headline = 'Ownership Transition Following Passing';
      break;
    case 'family_transfer':
      headline = 'Team Passes to New Family Member';
      break;
    case 'forced_sale':
      headline = 'League Forces Sale of Franchise';
      break;
    case 'group_purchase':
      headline = 'New Ownership Group Takes Control';
      break;
    default:
      headline = 'New Ownership';
  }

  const gmStatus = event.gmRetained
    ? 'You have been retained by the new ownership'
    : 'New ownership has decided to make a change at GM';

  return {
    headline,
    subtext: event.description,
    gmStatus,
  };
}

/**
 * Gets ownership history for a team
 */
export function getTeamOwnershipHistory(
  state: LeagueOwnershipState,
  teamId: string
): OwnershipChangeEvent[] {
  const currentOwner = state.owners.get(teamId);
  if (!currentOwner) return [];

  return state.ownershipHistory.filter(
    (e) =>
      state.owners.get(teamId)?.id === e.newOwnerId ||
      state.owners.get(teamId)?.id === e.previousOwnerId
  );
}

/**
 * Initializes ownership for a new team
 */
export function initializeTeamOwnership(
  state: LeagueOwnershipState,
  teamId: string,
  teamContext: TeamContext,
  initialSeason: number
): LeagueOwnershipState {
  const { firstName, lastName } = generateOwnerName();
  const ownerId = generateOwnerId();

  const owner = generateOwner(ownerId, teamId, firstName, lastName, {
    teamContext,
    randomSeed: Math.random() * 10000,
  });

  const newOwners = new Map(state.owners);
  newOwners.set(teamId, owner);

  const newContexts = new Map(state.teamContexts);
  newContexts.set(teamId, teamContext);

  const newMoodStates = new Map(state.moodStates);
  newMoodStates.set(teamId, createOwnerMoodState());

  const newInterferenceStates = new Map(state.interferenceStates);
  newInterferenceStates.set(teamId, createInterferenceState(teamId));

  const newLastChange = new Map(state.lastChangePerTeam);
  newLastChange.set(teamId, initialSeason - owner.yearsAsOwner);

  return {
    ...state,
    owners: newOwners,
    teamContexts: newContexts,
    moodStates: newMoodStates,
    interferenceStates: newInterferenceStates,
    lastChangePerTeam: newLastChange,
  };
}
