/**
 * Offseason Persistent Data Types
 * Data that persists in GameState across offseason phases
 */

import type { CombineResults } from '../draft/CombineSimulator';
import type { ProDayResults } from '../draft/ProDaySimulator';
import type { PositionBattle, DevelopmentReveal, CampInjury } from './phases/TrainingCampPhase';
import type { PreseasonGame, PreseasonEvaluation, PreseasonInjury } from './phases/PreseasonPhase';
import type { OTAReport, RookieIntegrationReport } from './phases/OTAsPhase';
import type { SeasonRecap } from './OffSeasonPhaseManager';
import type { Prospect } from '../draft/Prospect';

/**
 * User decision during OTAs phase
 */
export interface OTADecision {
  playerId: string;
  playerName: string;
  decisionType: 'rest_or_push' | 'assign_mentor';
  choice: 'rest' | 'push' | 'mentor_assigned' | null; // null = not yet decided
  mentorPlayerId?: string; // for mentor assignments
  mentorPlayerName?: string;
}

/**
 * Cross-phase storyline that threads narratives across multiple offseason phases
 */
export interface CrossPhaseStoryline {
  id: string;
  type:
    | 'holdout'
    | 'position_battle'
    | 'rookie_emergence'
    | 'veteran_decline'
    | 'scheme_transition';
  playerIds: string[];
  phaseStarted: string; // phase name where it began
  currentNarrative: string;
  isResolved: boolean;
  resolution?: string;
}

/**
 * Owner expectations for the season
 */
export interface OwnerExpectations {
  wins: { minimum: number; expected: number; stretch: number };
  playoffs: boolean;
  division: boolean;
  championship: boolean;
  playerDevelopment: string[];
  financialTargets: { minRevenue: number; maxSpending: number };
  patience: number; // 1-100 scale
}

/**
 * Media projection for the team
 */
export interface MediaProjection {
  source: string;
  projectedWins: number;
  projectedLosses: number;
  playoffOdds: number;
  divisionOdds: number;
  championshipOdds: number;
  ranking: number; // 1-32
  analysis: string;
}

/**
 * Season goals set by the player/GM
 */
export interface SeasonGoal {
  id: string;
  type:
    | 'wins'
    | 'playoffs'
    | 'division'
    | 'championship'
    | 'player_development'
    | 'financial'
    | 'custom';
  description: string;
  target: string | number;
  status: 'pending' | 'on_track' | 'at_risk' | 'achieved' | 'failed';
}

/**
 * Award winner information
 */
export interface AwardWinner {
  award: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  stats?: Record<string, number>;
}

/**
 * Waiver wire player
 */
export interface WaiverPlayer {
  playerId: string;
  playerName: string;
  position: string;
  previousTeamId: string;
  previousTeamName: string;
  overallRating: number;
  age: number;
  salary: number;
  waiverPriority: number; // 1-32, 1 is first claim
  claimedBy?: string;
  expiresAt: number;
}

/**
 * Coach evaluation result
 */
export interface CoachEvaluationResult {
  coachId: string;
  coachName: string;
  role: string;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  strengths: string[];
  weaknesses: string[];
  recommendation: 'keep' | 'extend' | 'fire' | 'demote';
  yearsRemaining: number;
}

/**
 * Coaching change record
 */
export interface CoachingChangeRecord {
  type: 'hire' | 'fire' | 'promote' | 'demote';
  coachId: string;
  coachName: string;
  role: string;
  previousRole?: string;
  teamId: string;
  reason?: string;
  deadMoney?: number;
}

/**
 * Contract decision record
 */
export interface ContractDecisionRecord {
  type: 'cut' | 'restructure' | 'franchise_tag' | 'transition_tag' | 'extension';
  playerId: string;
  playerName: string;
  position: string;
  teamId: string;
  details: {
    previousSalary?: number;
    newSalary?: number;
    capSavings?: number;
    deadMoney?: number;
    yearsAdded?: number;
    guaranteeAdded?: number;
  };
}

/**
 * Draft selection record
 */
export interface DraftSelectionRecord {
  round: number;
  pick: number;
  overallPick: number;
  teamId: string;
  prospectId: string;
  playerName: string;
  position: string;
  school: string;
  grade: string;
  contractYears: number;
  contractValue: number;
}

/**
 * Free agent signing record (extended)
 */
export interface FreeAgentSigningRecord {
  playerId: string;
  playerName: string;
  position: string;
  teamId: string;
  previousTeamId: string | null;
  contractYears: number;
  totalValue: number;
  guaranteedMoney: number;
  signingBonus: number;
  phase: 'legal_tampering' | 'frenzy' | 'trickle';
  day: number;
}

/**
 * UDFA signing record
 */
export interface UDFASigningRecord {
  prospectId: string;
  playerName: string;
  position: string;
  school: string;
  teamId: string;
  signingBonus: number;
  contractYears: number;
  baseSalary: number;
}

/**
 * Main persistent data container
 * Stored in GameState.offseasonData
 */
export interface OffseasonPersistentData {
  // Phase 1: Season End
  seasonRecap: SeasonRecap | null;
  awards: AwardWinner[];
  draftOrder: string[]; // Team IDs in draft order

  // Phase 2: Coaching Decisions
  coachEvaluations: CoachEvaluationResult[];
  coachingChanges: CoachingChangeRecord[];

  // Phase 3: Contract Management
  contractDecisions: ContractDecisionRecord[];
  capSpaceAfterDecisions: number;

  // Phase 4: Combine
  combineResults: Record<string, CombineResults>; // Keyed by prospectId
  proDayResults: Record<string, ProDayResults>; // Keyed by prospectId
  combineComplete: boolean;

  // Phase 5: Free Agency
  freeAgentSignings: FreeAgentSigningRecord[];
  freeAgencyDay: number;
  remainingFreeAgents: string[]; // Player IDs still available

  // Phase 6: Draft
  draftSelections: DraftSelectionRecord[];
  draftComplete: boolean;
  tradesExecuted: number;

  // Phase 7: UDFA
  udfaPool: Prospect[];
  udfaSignings: UDFASigningRecord[];

  // Phase 8: OTAs
  otaReports: OTAReport[];
  rookieIntegrationReports: RookieIntegrationReport[];
  otaDecisions?: OTADecision[];
  crossPhaseStorylines?: CrossPhaseStoryline[];

  // Phase 9: Training Camp
  positionBattles: PositionBattle[];
  developmentReveals: DevelopmentReveal[];
  campInjuries: CampInjury[];

  // Phase 10: Preseason
  preseasonGames: PreseasonGame[];
  preseasonEvaluations: PreseasonEvaluation[];
  preseasonInjuries: PreseasonInjury[];

  // Phase 11: Final Cuts
  waiverWire: WaiverPlayer[];
  waiverClaims: Array<{ teamId: string; playerId: string; claimed: boolean }>;
  practiceSquadSignings: string[]; // Player IDs

  // Phase 12: Season Start
  ownerExpectations: OwnerExpectations | null;
  mediaProjections: MediaProjection[];
  seasonGoals: SeasonGoal[];

  // Metadata
  lastUpdatedPhase: string;
  lastUpdatedAt: number;
}

/**
 * Creates empty offseason persistent data
 */
export function createEmptyOffseasonData(): OffseasonPersistentData {
  return {
    // Phase 1
    seasonRecap: null,
    awards: [],
    draftOrder: [],

    // Phase 2
    coachEvaluations: [],
    coachingChanges: [],

    // Phase 3
    contractDecisions: [],
    capSpaceAfterDecisions: 0,

    // Phase 4
    combineResults: {},
    proDayResults: {},
    combineComplete: false,

    // Phase 5
    freeAgentSignings: [],
    freeAgencyDay: 0,
    remainingFreeAgents: [],

    // Phase 6
    draftSelections: [],
    draftComplete: false,
    tradesExecuted: 0,

    // Phase 7
    udfaPool: [],
    udfaSignings: [],

    // Phase 8
    otaReports: [],
    rookieIntegrationReports: [],
    otaDecisions: [],
    crossPhaseStorylines: [],

    // Phase 9
    positionBattles: [],
    developmentReveals: [],
    campInjuries: [],

    // Phase 10
    preseasonGames: [],
    preseasonEvaluations: [],
    preseasonInjuries: [],

    // Phase 11
    waiverWire: [],
    waiverClaims: [],
    practiceSquadSignings: [],

    // Phase 12
    ownerExpectations: null,
    mediaProjections: [],
    seasonGoals: [],

    // Metadata
    lastUpdatedPhase: '',
    lastUpdatedAt: Date.now(),
  };
}

/**
 * Validates offseason persistent data
 */
export function validateOffseasonData(data: OffseasonPersistentData): boolean {
  if (!data) return false;

  // Check required arrays exist
  if (!Array.isArray(data.awards)) return false;
  if (!Array.isArray(data.draftOrder)) return false;
  if (!Array.isArray(data.coachEvaluations)) return false;
  if (!Array.isArray(data.contractDecisions)) return false;
  if (!Array.isArray(data.draftSelections)) return false;
  if (!Array.isArray(data.positionBattles)) return false;
  if (!Array.isArray(data.preseasonGames)) return false;
  if (!Array.isArray(data.seasonGoals)) return false;

  // Check required objects exist
  if (typeof data.combineResults !== 'object') return false;
  if (typeof data.proDayResults !== 'object') return false;

  return true;
}

/**
 * Merges partial offseason data updates
 */
export function mergeOffseasonData(
  existing: OffseasonPersistentData,
  updates: Partial<OffseasonPersistentData>
): OffseasonPersistentData {
  return {
    ...existing,
    ...updates,
    lastUpdatedAt: Date.now(),
  };
}
