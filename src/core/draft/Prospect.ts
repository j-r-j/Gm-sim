/**
 * Prospect Entity
 * Extends the Player model with draft-specific information including
 * college stats, scout reports, and rankings.
 */

import { Player, validatePlayer } from '../models/player/Player';
import { Position } from '../models/player/Position';
import { CollegeProgram } from './CollegeProgramGenerator';

/**
 * College statistical categories by position
 */
export interface CollegeStats {
  /** Number of college seasons played */
  seasonsPlayed: number;
  /** Games started */
  gamesStarted: number;
  /** Total games played */
  gamesPlayed: number;
  /** Position-specific stats */
  positionStats: PositionCollegeStats;
  /** College awards and honors */
  awards: CollegeAward[];
  /** Injury history in college */
  injuryHistory: CollegeInjury[];
}

/**
 * Position-specific college statistics
 */
export type PositionCollegeStats =
  | QBCollegeStats
  | RBCollegeStats
  | WRCollegeStats
  | TECollegeStats
  | OLCollegeStats
  | DLCollegeStats
  | LBCollegeStats
  | DBCollegeStats
  | KPCollegeStats;

/**
 * Quarterback college stats
 */
export interface QBCollegeStats {
  type: 'QB';
  passAttempts: number;
  passCompletions: number;
  passYards: number;
  passTouchdowns: number;
  interceptions: number;
  rushAttempts: number;
  rushYards: number;
  rushTouchdowns: number;
  sacksTaken: number;
}

/**
 * Running back college stats
 */
export interface RBCollegeStats {
  type: 'RB';
  rushAttempts: number;
  rushYards: number;
  rushTouchdowns: number;
  receptions: number;
  receivingYards: number;
  receivingTouchdowns: number;
  fumbles: number;
}

/**
 * Wide receiver college stats
 */
export interface WRCollegeStats {
  type: 'WR';
  receptions: number;
  receivingYards: number;
  receivingTouchdowns: number;
  rushAttempts: number;
  rushYards: number;
  drops: number;
}

/**
 * Tight end college stats
 */
export interface TECollegeStats {
  type: 'TE';
  receptions: number;
  receivingYards: number;
  receivingTouchdowns: number;
  blocksGraded: number;
  blockingGrade: number;
}

/**
 * Offensive line college stats
 */
export interface OLCollegeStats {
  type: 'OL';
  gamesAtPosition: Record<string, number>;
  sacksAllowed: number;
  penaltiesCommitted: number;
  passBlockGrade: number;
  runBlockGrade: number;
}

/**
 * Defensive line college stats
 */
export interface DLCollegeStats {
  type: 'DL';
  totalTackles: number;
  tacklesForLoss: number;
  sacks: number;
  forcedFumbles: number;
  passesDefended: number;
}

/**
 * Linebacker college stats
 */
export interface LBCollegeStats {
  type: 'LB';
  totalTackles: number;
  tacklesForLoss: number;
  sacks: number;
  interceptions: number;
  passesDefended: number;
  forcedFumbles: number;
}

/**
 * Defensive back college stats
 */
export interface DBCollegeStats {
  type: 'DB';
  totalTackles: number;
  interceptions: number;
  passesDefended: number;
  forcedFumbles: number;
  touchdowns: number;
}

/**
 * Kicker/Punter college stats
 */
export interface KPCollegeStats {
  type: 'KP';
  fieldGoalAttempts: number;
  fieldGoalsMade: number;
  longFieldGoal: number;
  extraPointAttempts: number;
  extraPointsMade: number;
  punts: number;
  puntYards: number;
  puntAverage: number;
  touchbacks: number;
}

/**
 * College awards
 */
export interface CollegeAward {
  /** Award name */
  name: string;
  /** Year received */
  year: number;
  /** Award prestige level */
  prestige: 'national' | 'conference' | 'team';
}

/**
 * Common college awards
 */
export const COLLEGE_AWARDS = {
  national: [
    'National Player of the Year',
    'Offensive Player of the Year',
    'Defensive Player of the Year',
    'Freshman of the Year',
  ],
  conference: [
    'Conference Player of the Year',
    'Conference Offensive MVP',
    'Conference Defensive MVP',
    'All-Conference First Team',
    'All-Conference Second Team',
  ],
  team: ['Team Captain', 'Team MVP', 'Offensive MVP', 'Defensive MVP', 'Most Improved'],
};

/**
 * College injury record
 */
export interface CollegeInjury {
  /** Type of injury */
  type: string;
  /** Year of injury */
  year: number;
  /** Games missed */
  gamesMissed: number;
  /** Whether surgery was required */
  surgeryRequired: boolean;
}

/**
 * Draft projection from scouts/media
 */
export interface DraftProjection {
  /** Projected round (1-7, 0 for undrafted) */
  projectedRound: number;
  /** Projected overall pick range */
  projectedPickRange: { min: number; max: number };
  /** Confidence in projection (0-100) */
  confidence: number;
  /** Source of projection */
  source: 'consensus' | 'user' | 'scout';
}

/**
 * Prospect ranking entry
 */
export interface ProspectRanking {
  /** Ranking type */
  type: 'overall' | 'position';
  /** Rank number */
  rank: number;
  /** Total in ranking */
  total: number;
  /** Source of ranking */
  source: 'consensus' | 'user' | 'scout';
  /** Date of ranking */
  timestamp: number;
}

/**
 * Combine/Pro Day participation status
 */
export enum WorkoutStatus {
  NOT_INVITED = 'NOT_INVITED',
  INVITED = 'INVITED',
  COMPLETED = 'COMPLETED',
  DECLINED = 'DECLINED',
  MEDICAL_ONLY = 'MEDICAL_ONLY',
}

/**
 * Prospect entity - extends Player with draft-specific data
 */
export interface Prospect {
  /** Base player data (NEVER modified directly, use functions) */
  player: Player;

  /** Reference to college program */
  collegeProgramId: string;

  /** College program name (denormalized for display) */
  collegeName: string;

  /** College statistics */
  collegeStats: CollegeStats;

  /** Combine participation status */
  combineStatus: WorkoutStatus;

  /** Pro Day participation status */
  proDayStatus: WorkoutStatus;

  /** Whether physical measurements have been revealed */
  physicalsRevealed: boolean;

  /** Consensus draft projection */
  consensusProjection: DraftProjection | null;

  /** User's draft projection */
  userProjection: DraftProjection | null;

  /** Array of rankings from various sources */
  rankings: ProspectRanking[];

  /** IDs of scout reports filed on this prospect */
  scoutReportIds: string[];

  /** User notes on prospect */
  userNotes: string;

  /** Whether user has flagged this prospect */
  flagged: boolean;

  /** User's custom tier for this prospect */
  userTier: string | null;

  /** Whether prospect has declared for draft */
  declared: boolean;

  /** Year prospect entered draft */
  draftYear: number;

  /** Unique ID for the prospect (same as player.id) */
  id: string;
}

/**
 * Creates empty college stats for a position
 */
export function createEmptyCollegeStats(position: Position): CollegeStats {
  return {
    seasonsPlayed: 0,
    gamesStarted: 0,
    gamesPlayed: 0,
    positionStats: createEmptyPositionStats(position),
    awards: [],
    injuryHistory: [],
  };
}

/**
 * Creates empty position-specific stats
 */
function createEmptyPositionStats(position: Position): PositionCollegeStats {
  switch (position) {
    case Position.QB:
      return {
        type: 'QB',
        passAttempts: 0,
        passCompletions: 0,
        passYards: 0,
        passTouchdowns: 0,
        interceptions: 0,
        rushAttempts: 0,
        rushYards: 0,
        rushTouchdowns: 0,
        sacksTaken: 0,
      };
    case Position.RB:
      return {
        type: 'RB',
        rushAttempts: 0,
        rushYards: 0,
        rushTouchdowns: 0,
        receptions: 0,
        receivingYards: 0,
        receivingTouchdowns: 0,
        fumbles: 0,
      };
    case Position.WR:
      return {
        type: 'WR',
        receptions: 0,
        receivingYards: 0,
        receivingTouchdowns: 0,
        rushAttempts: 0,
        rushYards: 0,
        drops: 0,
      };
    case Position.TE:
      return {
        type: 'TE',
        receptions: 0,
        receivingYards: 0,
        receivingTouchdowns: 0,
        blocksGraded: 0,
        blockingGrade: 0,
      };
    case Position.LT:
    case Position.LG:
    case Position.C:
    case Position.RG:
    case Position.RT:
      return {
        type: 'OL',
        gamesAtPosition: {},
        sacksAllowed: 0,
        penaltiesCommitted: 0,
        passBlockGrade: 0,
        runBlockGrade: 0,
      };
    case Position.DE:
    case Position.DT:
      return {
        type: 'DL',
        totalTackles: 0,
        tacklesForLoss: 0,
        sacks: 0,
        forcedFumbles: 0,
        passesDefended: 0,
      };
    case Position.OLB:
    case Position.ILB:
      return {
        type: 'LB',
        totalTackles: 0,
        tacklesForLoss: 0,
        sacks: 0,
        interceptions: 0,
        passesDefended: 0,
        forcedFumbles: 0,
      };
    case Position.CB:
    case Position.FS:
    case Position.SS:
      return {
        type: 'DB',
        totalTackles: 0,
        interceptions: 0,
        passesDefended: 0,
        forcedFumbles: 0,
        touchdowns: 0,
      };
    case Position.K:
    case Position.P:
      return {
        type: 'KP',
        fieldGoalAttempts: 0,
        fieldGoalsMade: 0,
        longFieldGoal: 0,
        extraPointAttempts: 0,
        extraPointsMade: 0,
        punts: 0,
        puntYards: 0,
        puntAverage: 0,
        touchbacks: 0,
      };
  }
}

/**
 * Creates a prospect from a player
 */
export function createProspect(
  player: Player,
  college: CollegeProgram,
  collegeStats: CollegeStats,
  draftYear: number
): Prospect {
  return {
    id: player.id,
    player,
    collegeProgramId: college.id,
    collegeName: college.name,
    collegeStats,
    combineStatus: WorkoutStatus.NOT_INVITED,
    proDayStatus: WorkoutStatus.NOT_INVITED,
    physicalsRevealed: false,
    consensusProjection: null,
    userProjection: null,
    rankings: [],
    scoutReportIds: [],
    userNotes: '',
    flagged: false,
    userTier: null,
    declared: true,
    draftYear,
  };
}

/**
 * Updates combine status for a prospect
 */
export function updateCombineStatus(prospect: Prospect, status: WorkoutStatus): Prospect {
  return {
    ...prospect,
    combineStatus: status,
    // Reveal physicals if combine is completed
    physicalsRevealed: prospect.physicalsRevealed || status === WorkoutStatus.COMPLETED,
  };
}

/**
 * Updates pro day status for a prospect
 */
export function updateProDayStatus(prospect: Prospect, status: WorkoutStatus): Prospect {
  return {
    ...prospect,
    proDayStatus: status,
    // Reveal physicals if pro day is completed
    physicalsRevealed: prospect.physicalsRevealed || status === WorkoutStatus.COMPLETED,
  };
}

/**
 * Adds a scout report ID to prospect
 */
export function addScoutReport(prospect: Prospect, reportId: string): Prospect {
  if (prospect.scoutReportIds.includes(reportId)) {
    return prospect;
  }
  return {
    ...prospect,
    scoutReportIds: [...prospect.scoutReportIds, reportId],
  };
}

/**
 * Sets user notes for prospect
 */
export function setProspectUserNotes(prospect: Prospect, notes: string): Prospect {
  return {
    ...prospect,
    userNotes: notes,
  };
}

/**
 * Toggles flagged status
 */
export function toggleProspectFlag(prospect: Prospect): Prospect {
  return {
    ...prospect,
    flagged: !prospect.flagged,
  };
}

/**
 * Sets user tier
 */
export function setProspectUserTier(prospect: Prospect, tier: string | null): Prospect {
  return {
    ...prospect,
    userTier: tier,
  };
}

/**
 * Updates consensus projection
 */
export function updateConsensusProjection(
  prospect: Prospect,
  projection: DraftProjection
): Prospect {
  return {
    ...prospect,
    consensusProjection: projection,
  };
}

/**
 * Updates user projection
 */
export function updateUserProjection(
  prospect: Prospect,
  projection: DraftProjection | null
): Prospect {
  return {
    ...prospect,
    userProjection: projection,
  };
}

/**
 * Adds a ranking to prospect
 */
export function addProspectRanking(prospect: Prospect, ranking: ProspectRanking): Prospect {
  return {
    ...prospect,
    rankings: [...prospect.rankings, ranking],
  };
}

/**
 * Gets the prospect's overall ranking from a source
 */
export function getOverallRanking(
  prospect: Prospect,
  source: 'consensus' | 'user' | 'scout'
): ProspectRanking | undefined {
  return prospect.rankings.find((r) => r.type === 'overall' && r.source === source);
}

/**
 * Gets the prospect's position ranking from a source
 */
export function getPositionRanking(
  prospect: Prospect,
  source: 'consensus' | 'user' | 'scout'
): ProspectRanking | undefined {
  return prospect.rankings.find((r) => r.type === 'position' && r.source === source);
}

/**
 * Validates a prospect entity
 */
export function validateProspect(prospect: Prospect): boolean {
  // Validate base player
  if (!validatePlayer(prospect.player)) return false;

  // Validate IDs match
  if (prospect.id !== prospect.player.id) return false;

  // Validate college info
  if (!prospect.collegeProgramId || typeof prospect.collegeProgramId !== 'string') return false;
  if (!prospect.collegeName || typeof prospect.collegeName !== 'string') return false;

  // Validate college stats
  if (!prospect.collegeStats || typeof prospect.collegeStats !== 'object') return false;
  if (prospect.collegeStats.seasonsPlayed < 0 || prospect.collegeStats.seasonsPlayed > 6)
    return false;
  if (prospect.collegeStats.gamesPlayed < 0) return false;

  // Validate workout status
  if (!Object.values(WorkoutStatus).includes(prospect.combineStatus)) return false;
  if (!Object.values(WorkoutStatus).includes(prospect.proDayStatus)) return false;

  // Validate draft year
  if (prospect.draftYear < 2000 || prospect.draftYear > 2100) return false;

  // Validate arrays
  if (!Array.isArray(prospect.rankings)) return false;
  if (!Array.isArray(prospect.scoutReportIds)) return false;

  return true;
}

/**
 * Gets display name for prospect
 */
export function getProspectDisplayName(prospect: Prospect): string {
  return `${prospect.player.firstName} ${prospect.player.lastName}`;
}

/**
 * Gets prospect's position
 */
export function getProspectPosition(prospect: Prospect): Position {
  return prospect.player.position;
}

/**
 * Checks if prospect has revealed physicals
 */
export function hasRevealedPhysicals(prospect: Prospect): boolean {
  return prospect.physicalsRevealed;
}

/**
 * Gets physical attributes (only if revealed)
 */
export function getRevealedPhysicals(prospect: Prospect): Player['physical'] | null {
  if (!prospect.physicalsRevealed) {
    return null;
  }
  return prospect.player.physical;
}

/**
 * Creates a view-safe prospect object (hides unrevealed data)
 */
export interface ProspectView {
  id: string;
  name: string;
  position: Position;
  age: number;
  collegeName: string;
  collegeStats: CollegeStats;
  physicals: Player['physical'] | null;
  consensusProjection: DraftProjection | null;
  userProjection: DraftProjection | null;
  combineStatus: WorkoutStatus;
  proDayStatus: WorkoutStatus;
  scoutReportCount: number;
  flagged: boolean;
  userTier: string | null;
  userNotes: string;
}

/**
 * Creates a view-safe prospect object
 */
export function createProspectView(prospect: Prospect): ProspectView {
  return {
    id: prospect.id,
    name: getProspectDisplayName(prospect),
    position: prospect.player.position,
    age: prospect.player.age,
    collegeName: prospect.collegeName,
    collegeStats: prospect.collegeStats,
    physicals: getRevealedPhysicals(prospect),
    consensusProjection: prospect.consensusProjection,
    userProjection: prospect.userProjection,
    combineStatus: prospect.combineStatus,
    proDayStatus: prospect.proDayStatus,
    scoutReportCount: prospect.scoutReportIds.length,
    flagged: prospect.flagged,
    userTier: prospect.userTier,
    userNotes: prospect.userNotes,
  };
}
