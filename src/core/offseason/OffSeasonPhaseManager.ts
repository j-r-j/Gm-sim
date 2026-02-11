/**
 * Off-Season Phase Manager
 * Orchestrates the 12-phase off-season flow from Season End to Season Start
 */

/**
 * Off-season phase types (1-12)
 */
export type OffSeasonPhaseType =
  | 'season_end'
  | 'coaching_decisions'
  | 'contract_management'
  | 'combine'
  | 'free_agency'
  | 'draft'
  | 'udfa'
  | 'otas'
  | 'training_camp'
  | 'preseason'
  | 'final_cuts'
  | 'season_start';

/**
 * Phase order for navigation
 */
export const PHASE_ORDER: OffSeasonPhaseType[] = [
  'season_end',
  'coaching_decisions',
  'contract_management',
  'combine',
  'free_agency',
  'draft',
  'udfa',
  'otas',
  'training_camp',
  'preseason',
  'final_cuts',
  'season_start',
];

/**
 * Phase number mapping
 */
export const PHASE_NUMBERS: Record<OffSeasonPhaseType, number> = {
  season_end: 1,
  coaching_decisions: 2,
  contract_management: 3,
  combine: 4,
  free_agency: 5,
  draft: 6,
  udfa: 7,
  otas: 8,
  training_camp: 9,
  preseason: 10,
  final_cuts: 11,
  season_start: 12,
};

/**
 * Phase display names
 */
export const PHASE_NAMES: Record<OffSeasonPhaseType, string> = {
  season_end: 'Season End',
  coaching_decisions: 'Coaching Decisions',
  contract_management: 'Contract Management',
  combine: 'NFL Combine',
  free_agency: 'Free Agency',
  draft: 'NFL Draft',
  udfa: 'UDFA Signing',
  otas: 'OTAs',
  training_camp: 'Training Camp',
  preseason: 'Preseason',
  final_cuts: 'Final Cuts',
  season_start: 'Season Start',
};

/**
 * Phase descriptions
 */
export const PHASE_DESCRIPTIONS: Record<OffSeasonPhaseType, string> = {
  season_end: 'Review season performance, grades, and awards',
  coaching_decisions: 'Evaluate and make coaching staff changes',
  contract_management: 'Manage roster through cuts, restructures, and tags',
  combine: 'Scout prospects at the NFL Combine and Pro Days',
  free_agency: 'Sign free agents to fill roster needs',
  draft: 'Select new players through the NFL Draft',
  udfa: 'Sign undrafted free agents to complete roster',
  otas: 'Organized team activities and first impressions',
  training_camp: 'Competition and development reveals',
  preseason: 'Exhibition games and final evaluations',
  final_cuts: 'Cut roster to 53 players',
  season_start: 'Set expectations and prepare for the season',
};

/**
 * Task action types
 * - navigate: Opens a screen where the user must take action
 * - view: Opens a screen for viewing only, auto-completes on visit
 * - validate: Requires a game state condition to be met
 * - auto: Completes automatically when phase is entered
 */
export type TaskActionType = 'navigate' | 'view' | 'validate' | 'auto';

/**
 * Screen names that tasks can navigate to
 */
export type TaskTargetScreen =
  | 'DraftBoard'
  | 'DraftRoom'
  | 'FreeAgency'
  | 'Staff'
  | 'Finances'
  | 'ContractManagement'
  | 'Roster'
  | 'FinalCuts'
  | 'OTAs'
  | 'TrainingCamp'
  | 'Preseason'
  | 'SeasonRecap'
  | 'OwnerRelations';

/**
 * Completion conditions for validate tasks
 */
export type TaskCompletionCondition =
  | 'visited'
  | 'draftComplete'
  | 'rosterSize<=53'
  | 'hasSigned'
  | 'optional';

/**
 * Task definition
 */
export interface OffSeasonTask {
  id: string;
  name: string;
  description: string;
  isRequired: boolean;
  isComplete: boolean;
  // Action metadata
  actionType: TaskActionType;
  targetScreen?: TaskTargetScreen;
  completionCondition: TaskCompletionCondition;
}

/**
 * Phase task status
 */
export interface PhaseTaskStatus {
  phase: OffSeasonPhaseType;
  requiredComplete: boolean;
  optionalComplete: boolean;
  tasks: OffSeasonTask[];
  tasksCompleted: string[];
}

/**
 * Off-season event types
 */
export type OffSeasonEventType =
  | 'phase_start'
  | 'phase_complete'
  | 'task_complete'
  | 'signing'
  | 'release'
  | 'trade'
  | 'draft_pick'
  | 'coaching_change'
  | 'development_reveal'
  | 'injury'
  | 'award'
  | 'contract'
  | 'roster_move';

/**
 * Off-season event
 */
export interface OffSeasonEvent {
  id: string;
  phase: OffSeasonPhaseType;
  type: OffSeasonEventType;
  description: string;
  timestamp: number;
  details: Record<string, unknown>;
}

/**
 * A single skill rating insight revealed at season end
 */
export interface SkillRatingReveal {
  skillName: string;
  previousMin: number;
  previousMax: number;
  newMin: number;
  newMax: number;
  isFullyRevealed: boolean;
}

/**
 * Per-player stat improvement summary for season end
 */
export interface PlayerStatImprovement {
  playerId: string;
  playerName: string;
  position: string;
  gamesPlayed: number;
  gamesStarted: number;
  /** Key stat line (position-appropriate) */
  statLine: string;
  /** Overall grade earned */
  grade: string;
  /** Skill rating reveals earned through playing time and tenure */
  ratingReveals: SkillRatingReveal[];
  /** How many skills were narrowed this season */
  totalSkillsNarrowed: number;
  /** Whether any skill was fully revealed */
  hadFullReveal: boolean;
  /** Hidden traits revealed this season (e.g., 'clutch', 'lazy') */
  traitsRevealed: string[];
}

/**
 * Season recap data
 */
export interface SeasonRecap {
  year: number;
  teamRecord: { wins: number; losses: number; ties: number };
  divisionFinish: number;
  madePlayoffs: boolean;
  playoffResult: string | null;
  draftPosition: number;
  topPerformers: Array<{
    playerId: string;
    playerName: string;
    position: string;
    grade: string;
  }>;
  awards: Array<{
    award: string;
    playerId: string;
    playerName: string;
  }>;
  /** Narrative write-up of the season */
  seasonWriteUp: string;
  /** Per-player stat improvements and rating reveals */
  playerImprovements: PlayerStatImprovement[];
}

/**
 * Complete off-season state
 */
export interface OffSeasonState {
  year: number;
  currentPhase: OffSeasonPhaseType;
  phaseDay: number;
  phaseTasks: Record<OffSeasonPhaseType, PhaseTaskStatus>;
  events: OffSeasonEvent[];
  completedPhases: OffSeasonPhaseType[];
  isComplete: boolean;

  // Phase-specific data
  seasonRecap: SeasonRecap | null;
  draftOrder: string[];
  rosterChanges: RosterChange[];
  signings: PlayerSigning[];
  releases: PlayerRelease[];
}

/**
 * Roster change record
 */
export interface RosterChange {
  id: string;
  type: 'signing' | 'release' | 'trade' | 'draft' | 'waiver' | 'ir';
  playerId: string;
  playerName: string;
  position: string;
  teamId: string;
  phase: OffSeasonPhaseType;
  timestamp: number;
  details: Record<string, unknown>;
}

/**
 * Player signing record
 */
export interface PlayerSigning {
  playerId: string;
  playerName: string;
  position: string;
  teamId: string;
  contractYears: number;
  contractValue: number;
  signingType: 'free_agent' | 'udfa' | 'extension' | 'restructure';
  phase: OffSeasonPhaseType;
}

/**
 * Player release record
 */
export interface PlayerRelease {
  playerId: string;
  playerName: string;
  position: string;
  teamId: string;
  releaseType: 'cut' | 'waived' | 'released' | 'buyout';
  capSavings: number;
  deadCap: number;
  phase: OffSeasonPhaseType;
}

/**
 * Creates default tasks for a phase
 */
function createPhaseTasks(phase: OffSeasonPhaseType): OffSeasonTask[] {
  const taskDefinitions: Record<OffSeasonPhaseType, OffSeasonTask[]> = {
    season_end: [
      {
        id: 'view_recap',
        name: 'View Season Recap',
        description: "Review your team's season performance",
        isRequired: true,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'SeasonRecap',
        completionCondition: 'visited',
      },
      {
        id: 'view_awards',
        name: 'View Awards',
        description: 'See league awards and team honors',
        isRequired: false,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'SeasonRecap',
        completionCondition: 'optional',
      },
      {
        id: 'view_draft_order',
        name: 'View Draft Order',
        description: 'Check your draft position',
        isRequired: false,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'DraftBoard',
        completionCondition: 'optional',
      },
    ],
    coaching_decisions: [
      {
        id: 'review_staff',
        name: 'Review Coaching Staff',
        description: 'Evaluate your coaching staff performance',
        isRequired: true,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'Staff',
        completionCondition: 'visited',
      },
      {
        id: 'make_changes',
        name: 'Make Staff Changes',
        description: 'Fire or hire coaching staff',
        isRequired: false,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'Staff',
        completionCondition: 'optional',
      },
    ],
    contract_management: [
      {
        id: 'review_cap',
        name: 'Review Cap Situation',
        description: 'Analyze your salary cap space',
        isRequired: true,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'Finances',
        completionCondition: 'visited',
      },
      {
        id: 'franchise_tag',
        name: 'Apply Franchise Tag',
        description: 'Use franchise or transition tag on a player',
        isRequired: false,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'ContractManagement',
        completionCondition: 'optional',
      },
      {
        id: 'cut_players',
        name: 'Release Players',
        description: 'Cut players to create cap space',
        isRequired: false,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'ContractManagement',
        completionCondition: 'optional',
      },
      {
        id: 'restructure',
        name: 'Restructure Contracts',
        description: 'Restructure existing contracts',
        isRequired: false,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'ContractManagement',
        completionCondition: 'optional',
      },
    ],
    combine: [
      {
        id: 'view_prospects',
        name: 'View Top Prospects',
        description: 'Scout the top draft prospects',
        isRequired: true,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'DraftBoard',
        completionCondition: 'visited',
      },
      {
        id: 'attend_combine',
        name: 'Attend Combine',
        description: 'Watch combine drills and interviews',
        isRequired: false,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'DraftBoard',
        completionCondition: 'optional',
      },
      {
        id: 'pro_days',
        name: 'Attend Pro Days',
        description: 'Visit college pro days',
        isRequired: false,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'DraftBoard',
        completionCondition: 'optional',
      },
    ],
    free_agency: [
      {
        id: 'review_market',
        name: 'Review Free Agent Market',
        description: 'Evaluate available free agents',
        isRequired: true,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'FreeAgency',
        completionCondition: 'visited',
      },
      {
        id: 'make_offers',
        name: 'Make Offers',
        description: 'Submit contract offers to free agents',
        isRequired: false,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'FreeAgency',
        completionCondition: 'optional',
      },
      {
        id: 'sign_players',
        name: 'Sign Free Agents',
        description: 'Complete free agent signings',
        isRequired: false,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'FreeAgency',
        completionCondition: 'hasSigned',
      },
    ],
    draft: [
      {
        id: 'make_picks',
        name: 'Make Draft Picks',
        description: 'Select players in the NFL Draft',
        isRequired: true,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'DraftRoom',
        completionCondition: 'draftComplete',
      },
      {
        id: 'trade_picks',
        name: 'Trade Draft Picks',
        description: 'Trade up or down in the draft',
        isRequired: false,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'DraftRoom',
        completionCondition: 'optional',
      },
    ],
    udfa: [
      {
        id: 'review_udfa',
        name: 'Review UDFA Pool',
        description: 'Evaluate undrafted free agents',
        isRequired: true,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'FreeAgency',
        completionCondition: 'visited',
      },
      {
        id: 'sign_udfa',
        name: 'Sign UDFAs',
        description: 'Sign undrafted free agents',
        isRequired: false,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'FreeAgency',
        completionCondition: 'optional',
      },
    ],
    otas: [
      {
        id: 'view_reports',
        name: 'View OTA Reports',
        description: 'Read reports on player progress',
        isRequired: true,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'OTAs',
        completionCondition: 'visited',
      },
      {
        id: 'adjust_depth',
        name: 'Adjust Depth Chart',
        description: 'Update depth chart based on OTA performance',
        isRequired: false,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'Roster',
        completionCondition: 'optional',
      },
    ],
    training_camp: [
      {
        id: 'view_battles',
        name: 'View Position Battles',
        description: 'Track position competition results',
        isRequired: true,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'TrainingCamp',
        completionCondition: 'visited',
      },
      {
        id: 'manage_injuries',
        name: 'Manage Injuries',
        description: 'Handle training camp injuries',
        isRequired: false,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'Roster',
        completionCondition: 'optional',
      },
      {
        id: 'development_check',
        name: 'Check Development',
        description: 'Review player development updates',
        isRequired: false,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'TrainingCamp',
        completionCondition: 'optional',
      },
    ],
    preseason: [
      {
        id: 'sim_games',
        name: 'Simulate Preseason',
        description: 'Play 3 preseason games',
        isRequired: true,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'Preseason',
        completionCondition: 'visited',
      },
      {
        id: 'evaluate_players',
        name: 'Evaluate Players',
        description: 'Review preseason performances',
        isRequired: false,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'Preseason',
        completionCondition: 'optional',
      },
    ],
    final_cuts: [
      {
        id: 'cut_to_53',
        name: 'Cut to 53',
        description: 'Reduce roster to 53 players',
        isRequired: true,
        isComplete: false,
        actionType: 'validate',
        targetScreen: 'FinalCuts',
        completionCondition: 'rosterSize<=53',
      },
      {
        id: 'form_practice_squad',
        name: 'Form Practice Squad',
        description: 'Sign players to practice squad',
        isRequired: false,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'FinalCuts',
        completionCondition: 'optional',
      },
      {
        id: 'claim_waivers',
        name: 'Claim Waivers',
        description: 'Claim players from waivers',
        isRequired: false,
        isComplete: false,
        actionType: 'navigate',
        targetScreen: 'FinalCuts',
        completionCondition: 'optional',
      },
    ],
    season_start: [
      {
        id: 'view_expectations',
        name: 'View Owner Expectations',
        description: 'Understand owner expectations for the season',
        isRequired: true,
        isComplete: false,
        actionType: 'view',
        targetScreen: 'OwnerRelations',
        completionCondition: 'visited',
      },
      {
        id: 'media_projections',
        name: 'View Media Projections',
        description: 'See media predictions for your team',
        isRequired: false,
        isComplete: false,
        actionType: 'auto',
        completionCondition: 'optional',
      },
      {
        id: 'set_goals',
        name: 'Set Season Goals',
        description: 'Define personal goals for the season',
        isRequired: false,
        isComplete: false,
        actionType: 'auto',
        completionCondition: 'optional',
      },
    ],
  };

  return taskDefinitions[phase] || [];
}

/**
 * Creates initial phase task status
 */
function createPhaseTaskStatus(phase: OffSeasonPhaseType): PhaseTaskStatus {
  const tasks = createPhaseTasks(phase);
  return {
    phase,
    requiredComplete: false,
    optionalComplete: false,
    tasks,
    tasksCompleted: [],
  };
}

/**
 * Creates initial off-season state
 */
export function createOffSeasonState(year: number): OffSeasonState {
  const phaseTasks = {} as Record<OffSeasonPhaseType, PhaseTaskStatus>;

  for (const phase of PHASE_ORDER) {
    phaseTasks[phase] = createPhaseTaskStatus(phase);
  }

  return {
    year,
    currentPhase: 'season_end',
    phaseDay: 1,
    phaseTasks,
    events: [],
    completedPhases: [],
    isComplete: false,
    seasonRecap: null,
    draftOrder: [],
    rosterChanges: [],
    signings: [],
    releases: [],
  };
}

/**
 * Gets the current phase number (1-12)
 */
export function getCurrentPhaseNumber(state: OffSeasonState): number {
  return PHASE_NUMBERS[state.currentPhase];
}

/**
 * Gets the current phase name
 */
export function getCurrentPhaseName(state: OffSeasonState): string {
  return PHASE_NAMES[state.currentPhase];
}

/**
 * Gets the current phase description
 */
export function getCurrentPhaseDescription(state: OffSeasonState): string {
  return PHASE_DESCRIPTIONS[state.currentPhase];
}

/**
 * Gets tasks for the current phase
 */
export function getCurrentPhaseTasks(state: OffSeasonState): OffSeasonTask[] {
  const taskStatus = state.phaseTasks[state.currentPhase];
  return taskStatus?.tasks || [];
}

/**
 * Gets required tasks for the current phase
 */
export function getRequiredTasks(state: OffSeasonState): OffSeasonTask[] {
  return getCurrentPhaseTasks(state).filter((task) => task.isRequired);
}

/**
 * Gets optional tasks for the current phase
 */
export function getOptionalTasks(state: OffSeasonState): OffSeasonTask[] {
  return getCurrentPhaseTasks(state).filter((task) => !task.isRequired);
}

/**
 * Checks if all required tasks are complete for the current phase
 */
export function areRequiredTasksComplete(state: OffSeasonState): boolean {
  const requiredTasks = getRequiredTasks(state);
  return requiredTasks.every((task) => task.isComplete);
}

/**
 * Checks if all tasks are complete for the current phase
 */
export function areAllTasksComplete(state: OffSeasonState): boolean {
  const tasks = getCurrentPhaseTasks(state);
  return tasks.every((task) => task.isComplete);
}

/**
 * Completes a task
 */
export function completeTask(state: OffSeasonState, taskId: string): OffSeasonState {
  const taskStatus = state.phaseTasks[state.currentPhase];
  if (!taskStatus) {
    return state;
  }

  const taskIndex = taskStatus.tasks.findIndex((t) => t.id === taskId);
  if (taskIndex === -1) {
    return state;
  }

  const task = taskStatus.tasks[taskIndex];
  if (task.isComplete) {
    return state; // Already complete
  }

  // Update task
  const updatedTasks = [...taskStatus.tasks];
  updatedTasks[taskIndex] = { ...task, isComplete: true };

  const updatedTasksCompleted = [...taskStatus.tasksCompleted, taskId];

  // Check if required/optional are now complete
  const requiredComplete = updatedTasks.filter((t) => t.isRequired).every((t) => t.isComplete);
  const optionalComplete = updatedTasks.filter((t) => !t.isRequired).every((t) => t.isComplete);

  const updatedTaskStatus: PhaseTaskStatus = {
    ...taskStatus,
    tasks: updatedTasks,
    tasksCompleted: updatedTasksCompleted,
    requiredComplete,
    optionalComplete,
  };

  const newPhaseTasks: Record<OffSeasonPhaseType, PhaseTaskStatus> = {
    ...state.phaseTasks,
    [state.currentPhase]: updatedTaskStatus,
  };

  // Create event
  const event: OffSeasonEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    phase: state.currentPhase,
    type: 'task_complete',
    description: `Completed: ${task.name}`,
    timestamp: Date.now(),
    details: { taskId, taskName: task.name },
  };

  return {
    ...state,
    phaseTasks: newPhaseTasks,
    events: [...state.events, event],
  };
}

/**
 * Checks if the current phase can be advanced
 */
export function canAdvancePhase(state: OffSeasonState): boolean {
  return areRequiredTasksComplete(state) && !state.isComplete;
}

/**
 * Gets the next phase
 */
export function getNextPhase(state: OffSeasonState): OffSeasonPhaseType | null {
  const currentIndex = PHASE_ORDER.indexOf(state.currentPhase);
  if (currentIndex === -1 || currentIndex >= PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[currentIndex + 1];
}

/**
 * Advances to the next phase
 */
export function advancePhase(state: OffSeasonState): OffSeasonState {
  if (!canAdvancePhase(state)) {
    return state;
  }

  const nextPhase = getNextPhase(state);

  // If no next phase, complete the off-season
  if (!nextPhase) {
    const completeEvent: OffSeasonEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      phase: state.currentPhase,
      type: 'phase_complete',
      description: 'Off-season complete! Ready for the new season.',
      timestamp: Date.now(),
      details: { finalPhase: state.currentPhase },
    };

    return {
      ...state,
      completedPhases: [...state.completedPhases, state.currentPhase],
      isComplete: true,
      events: [...state.events, completeEvent],
    };
  }

  // Create phase complete event
  const completeEvent: OffSeasonEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    phase: state.currentPhase,
    type: 'phase_complete',
    description: `${PHASE_NAMES[state.currentPhase]} phase complete`,
    timestamp: Date.now(),
    details: { phase: state.currentPhase },
  };

  // Create phase start event
  const startEvent: OffSeasonEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    phase: nextPhase,
    type: 'phase_start',
    description: `${PHASE_NAMES[nextPhase]} phase begins`,
    timestamp: Date.now() + 1,
    details: { phase: nextPhase },
  };

  return {
    ...state,
    currentPhase: nextPhase,
    phaseDay: 1,
    completedPhases: [...state.completedPhases, state.currentPhase],
    events: [...state.events, completeEvent, startEvent],
  };
}

/**
 * Advances the day within the current phase
 */
export function advanceDay(state: OffSeasonState): OffSeasonState {
  return {
    ...state,
    phaseDay: state.phaseDay + 1,
  };
}

/**
 * Sets the season recap data
 */
export function setSeasonRecap(state: OffSeasonState, recap: SeasonRecap): OffSeasonState {
  return {
    ...state,
    seasonRecap: recap,
  };
}

/**
 * Sets the draft order
 */
export function setDraftOrder(state: OffSeasonState, order: string[]): OffSeasonState {
  return {
    ...state,
    draftOrder: order,
  };
}

/**
 * Adds a roster change
 */
export function addRosterChange(
  state: OffSeasonState,
  change: Omit<RosterChange, 'id' | 'timestamp'>
): OffSeasonState {
  const rosterChange: RosterChange = {
    ...change,
    id: `roster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  const event: OffSeasonEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    phase: state.currentPhase,
    type: 'roster_move',
    description: `${change.type}: ${change.playerName}`,
    timestamp: Date.now(),
    details: { change: rosterChange },
  };

  return {
    ...state,
    rosterChanges: [...state.rosterChanges, rosterChange],
    events: [...state.events, event],
  };
}

/**
 * Adds a player signing
 */
export function addSigning(state: OffSeasonState, signing: PlayerSigning): OffSeasonState {
  const event: OffSeasonEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    phase: state.currentPhase,
    type: 'signing',
    description: `Signed ${signing.playerName} (${signing.position})`,
    timestamp: Date.now(),
    details: { signing },
  };

  return {
    ...state,
    signings: [...state.signings, signing],
    events: [...state.events, event],
  };
}

/**
 * Adds a player release
 */
export function addRelease(state: OffSeasonState, release: PlayerRelease): OffSeasonState {
  const event: OffSeasonEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    phase: state.currentPhase,
    type: 'release',
    description: `Released ${release.playerName} (${release.position})`,
    timestamp: Date.now(),
    details: { release },
  };

  return {
    ...state,
    releases: [...state.releases, release],
    events: [...state.events, event],
  };
}

/**
 * Adds a custom event
 */
export function addEvent(
  state: OffSeasonState,
  type: OffSeasonEventType,
  description: string,
  details: Record<string, unknown> = {}
): OffSeasonState {
  const event: OffSeasonEvent = {
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    phase: state.currentPhase,
    type,
    description,
    timestamp: Date.now(),
    details,
  };

  return {
    ...state,
    events: [...state.events, event],
  };
}

/**
 * Gets recent events
 */
export function getRecentEvents(state: OffSeasonState, limit: number = 20): OffSeasonEvent[] {
  return state.events.slice(-limit).reverse();
}

/**
 * Gets events for a specific phase
 */
export function getPhaseEvents(state: OffSeasonState, phase: OffSeasonPhaseType): OffSeasonEvent[] {
  return state.events.filter((e) => e.phase === phase);
}

/**
 * Gets progress summary
 */
export interface OffSeasonProgress {
  currentPhase: OffSeasonPhaseType;
  currentPhaseNumber: number;
  currentPhaseName: string;
  phaseDay: number;
  completedPhases: number;
  totalPhases: number;
  percentComplete: number;
  requiredTasksComplete: boolean;
  allTasksComplete: boolean;
  canAdvance: boolean;
  isComplete: boolean;
}

export function getProgress(state: OffSeasonState): OffSeasonProgress {
  return {
    currentPhase: state.currentPhase,
    currentPhaseNumber: getCurrentPhaseNumber(state),
    currentPhaseName: getCurrentPhaseName(state),
    phaseDay: state.phaseDay,
    completedPhases: state.completedPhases.length,
    totalPhases: PHASE_ORDER.length,
    percentComplete: Math.round((state.completedPhases.length / PHASE_ORDER.length) * 100),
    requiredTasksComplete: areRequiredTasksComplete(state),
    allTasksComplete: areAllTasksComplete(state),
    canAdvance: canAdvancePhase(state),
    isComplete: state.isComplete,
  };
}

/**
 * Skips optional tasks and advances to next phase
 */
export function skipToNextPhase(state: OffSeasonState): OffSeasonState {
  if (!areRequiredTasksComplete(state)) {
    return state; // Cannot skip if required tasks not complete
  }
  return advancePhase(state);
}

/**
 * Gets a summary of the off-season
 */
export interface OffSeasonSummary {
  year: number;
  phasesCompleted: number;
  totalSignings: number;
  totalReleases: number;
  totalRosterMoves: number;
  keyEvents: OffSeasonEvent[];
}

export function getSummary(state: OffSeasonState): OffSeasonSummary {
  const keyEvents = state.events.filter(
    (e) =>
      e.type === 'signing' ||
      e.type === 'release' ||
      e.type === 'draft_pick' ||
      e.type === 'coaching_change' ||
      e.type === 'award'
  );

  return {
    year: state.year,
    phasesCompleted: state.completedPhases.length,
    totalSignings: state.signings.length,
    totalReleases: state.releases.length,
    totalRosterMoves: state.rosterChanges.length,
    keyEvents: keyEvents.slice(-10),
  };
}

/**
 * Validates off-season state
 */
export function validateOffSeasonState(state: OffSeasonState): boolean {
  if (typeof state.year !== 'number') return false;
  if (state.year < 2000 || state.year > 2100) return false;

  if (!PHASE_ORDER.includes(state.currentPhase)) return false;
  if (typeof state.phaseDay !== 'number' || state.phaseDay < 1) return false;

  if (
    typeof state.phaseTasks !== 'object' ||
    state.phaseTasks === null ||
    Array.isArray(state.phaseTasks)
  )
    return false;
  if (!Array.isArray(state.events)) return false;
  if (!Array.isArray(state.completedPhases)) return false;
  if (!Array.isArray(state.draftOrder)) return false;
  if (!Array.isArray(state.rosterChanges)) return false;
  if (!Array.isArray(state.signings)) return false;
  if (!Array.isArray(state.releases)) return false;

  if (typeof state.isComplete !== 'boolean') return false;

  return true;
}

/**
 * Resets a phase (for testing or re-do scenarios)
 */
export function resetPhase(state: OffSeasonState, phase: OffSeasonPhaseType): OffSeasonState {
  const newPhaseTasks: Record<OffSeasonPhaseType, PhaseTaskStatus> = {
    ...state.phaseTasks,
    [phase]: createPhaseTaskStatus(phase),
  };

  const newCompletedPhases = state.completedPhases.filter((p) => p !== phase);

  return {
    ...state,
    phaseTasks: newPhaseTasks,
    completedPhases: newCompletedPhases,
    isComplete: false,
  };
}

/**
 * Auto-completes required tasks for a phase (for simulation/skip)
 */
export function autoCompletePhase(state: OffSeasonState): OffSeasonState {
  const requiredTasks = getRequiredTasks(state);
  let newState = state;

  for (const task of requiredTasks) {
    if (!task.isComplete) {
      newState = completeTask(newState, task.id);
    }
  }

  return newState;
}

/**
 * Simulates through all remaining phases
 */
export function simulateRemainingOffSeason(state: OffSeasonState): OffSeasonState {
  let newState = state;

  while (!newState.isComplete) {
    // Auto-complete required tasks
    newState = autoCompletePhase(newState);

    // Advance to next phase
    if (canAdvancePhase(newState)) {
      newState = advancePhase(newState);
    } else {
      break; // Safety break
    }
  }

  return newState;
}
