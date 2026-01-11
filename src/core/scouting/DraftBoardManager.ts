/**
 * Draft Board Manager
 * Compiles scout reports into a team draft board with user rankings
 */

import { Position } from '../models/player/Position';
import { ScoutReport } from './ScoutReportGenerator';
import { AggregatedConfidence, aggregateConfidence } from './ReportConfidenceSystem';

/**
 * Prospect entry on draft board
 */
export interface DraftBoardProspect {
  prospectId: string;
  prospectName: string;
  position: Position;

  // Aggregated data from all reports
  reports: ScoutReport[];
  latestReport: ScoutReport;
  aggregatedConfidence: AggregatedConfidence;

  // Calculated values
  averageOverallMin: number;
  averageOverallMax: number;
  consensusRound: number;

  // User input
  userRank: number | null;
  userNotes: string;
  userTier: DraftTier | null;
  isLocked: boolean;

  // Director input
  directorRank: number | null;
  directorNotes: string;

  // Flags
  hasFocusReport: boolean;
  needsMoreScouting: boolean;
  lastUpdated: number;
}

/**
 * Draft tier classification
 */
export type DraftTier =
  | 'elite'
  | 'first_round'
  | 'second_round'
  | 'day_two'
  | 'day_three'
  | 'priority_fa'
  | 'draftable';

/**
 * Draft board state
 */
export interface DraftBoardState {
  teamId: string;
  draftYear: number;
  prospects: Map<string, DraftBoardProspect>;
  userRankings: string[]; // Ordered list of prospect IDs
  directorRecommendations: string[]; // Director's ordered list

  // Filters and views
  positionFilters: Position[];
  tierFilter: DraftTier | null;
  showOnlyFocused: boolean;
  sortBy: DraftBoardSortOption;

  // Metadata
  lastModified: number;
  isFinalized: boolean;
}

/**
 * Sort options for draft board
 */
export type DraftBoardSortOption =
  | 'user_rank'
  | 'director_rank'
  | 'consensus_round'
  | 'confidence'
  | 'position'
  | 'last_updated';

/**
 * Draft board view model for display
 */
export interface DraftBoardViewModel {
  teamId: string;
  draftYear: number;
  totalProspects: number;
  rankedProspects: number;
  unrankedProspects: number;

  // Sorted and filtered prospects
  prospects: DraftBoardProspectView[];

  // Summary stats
  tierCounts: Record<DraftTier, number>;
  positionCounts: Partial<Record<Position, number>>;
  averageConfidence: number;
  focusedCount: number;
  needsScoutingCount: number;
}

/**
 * Simplified prospect view for display
 */
export interface DraftBoardProspectView {
  prospectId: string;
  prospectName: string;
  position: Position;

  // Rankings
  userRank: number | null;
  directorRank: number | null;
  consensusRank: number;

  // Grades
  overallRange: string;
  projectedRound: string;
  tier: DraftTier | null;

  // Confidence
  confidence: string;
  confidenceScore: number;
  reportCount: number;

  // Flags
  hasFocusReport: boolean;
  needsMoreScouting: boolean;
  isLocked: boolean;

  // Notes
  userNotes: string;
}

/**
 * Director input for a prospect
 */
export interface DirectorInput {
  prospectId: string;
  rank: number;
  notes: string;
  recommendFocus: boolean;
}

/**
 * Creates an empty draft board state
 */
export function createDraftBoardState(teamId: string, draftYear: number): DraftBoardState {
  return {
    teamId,
    draftYear,
    prospects: new Map(),
    userRankings: [],
    directorRecommendations: [],
    positionFilters: [],
    tierFilter: null,
    showOnlyFocused: false,
    sortBy: 'consensus_round',
    lastModified: Date.now(),
    isFinalized: false,
  };
}

/**
 * Calculates consensus round from reports
 */
export function calculateConsensusRound(reports: ScoutReport[]): number {
  if (reports.length === 0) return 7;

  const rounds: number[] = [];
  for (const report of reports) {
    const avgRound = (report.draftProjection.roundMin + report.draftProjection.roundMax) / 2;
    rounds.push(avgRound);
  }

  return Math.round(rounds.reduce((a, b) => a + b, 0) / rounds.length);
}

/**
 * Calculates average overall range from reports
 */
export function calculateAverageOverallRange(reports: ScoutReport[]): { min: number; max: number } {
  if (reports.length === 0) return { min: 1, max: 100 };

  let totalMin = 0;
  let totalMax = 0;

  for (const report of reports) {
    totalMin += report.skillRanges.overall.min;
    totalMax += report.skillRanges.overall.max;
  }

  return {
    min: Math.round(totalMin / reports.length),
    max: Math.round(totalMax / reports.length),
  };
}

/**
 * Determines draft tier based on consensus round
 */
export function determineDraftTier(consensusRound: number): DraftTier {
  if (consensusRound <= 1) return 'first_round';
  if (consensusRound <= 2) return 'second_round';
  if (consensusRound <= 3) return 'day_two';
  if (consensusRound <= 5) return 'day_three';
  if (consensusRound <= 7) return 'draftable';
  return 'priority_fa';
}

/**
 * Creates a draft board prospect from reports
 */
export function createDraftBoardProspect(
  reports: ScoutReport[],
  timestamp: number
): DraftBoardProspect | null {
  if (reports.length === 0) return null;

  // Sort reports by date (newest first)
  const sortedReports = [...reports].sort((a, b) => b.generatedAt - a.generatedAt);
  const latestReport = sortedReports[0];

  // Calculate aggregated data
  const aggregatedConfidence = aggregateConfidence(reports);
  const avgRange = calculateAverageOverallRange(reports);
  const consensusRound = calculateConsensusRound(reports);

  // Check for focus reports
  const hasFocusReport = reports.some((r) => r.reportType === 'focus');
  const needsMoreScouting = latestReport.needsMoreScouting && !hasFocusReport;

  return {
    prospectId: latestReport.prospectId,
    prospectName: latestReport.prospectName,
    position: latestReport.position,

    reports: sortedReports,
    latestReport,
    aggregatedConfidence,

    averageOverallMin: avgRange.min,
    averageOverallMax: avgRange.max,
    consensusRound,

    userRank: null,
    userNotes: '',
    userTier: null,
    isLocked: false,

    directorRank: null,
    directorNotes: '',

    hasFocusReport,
    needsMoreScouting,
    lastUpdated: timestamp,
  };
}

/**
 * Adds a report to the draft board
 */
export function addReportToBoard(state: DraftBoardState, report: ScoutReport): DraftBoardState {
  if (state.isFinalized) return state; // Cannot modify finalized board

  const newProspects = new Map(state.prospects);
  const existingProspect = newProspects.get(report.prospectId);

  if (existingProspect) {
    // Add report to existing prospect
    const updatedReports = [...existingProspect.reports, report];
    const updatedProspect = createDraftBoardProspect(updatedReports, Date.now());

    if (updatedProspect) {
      // Preserve user input
      updatedProspect.userRank = existingProspect.userRank;
      updatedProspect.userNotes = existingProspect.userNotes;
      updatedProspect.userTier = existingProspect.userTier;
      updatedProspect.isLocked = existingProspect.isLocked;
      updatedProspect.directorRank = existingProspect.directorRank;
      updatedProspect.directorNotes = existingProspect.directorNotes;

      newProspects.set(report.prospectId, updatedProspect);
    }
  } else {
    // Create new prospect entry
    const newProspect = createDraftBoardProspect([report], Date.now());
    if (newProspect) {
      newProspects.set(report.prospectId, newProspect);
    }
  }

  return {
    ...state,
    prospects: newProspects,
    lastModified: Date.now(),
  };
}

/**
 * Adds multiple reports to the draft board
 */
export function addReportsToBoard(state: DraftBoardState, reports: ScoutReport[]): DraftBoardState {
  let newState = state;
  for (const report of reports) {
    newState = addReportToBoard(newState, report);
  }
  return newState;
}

/**
 * Sets user ranking for a prospect
 */
export function setUserRanking(
  state: DraftBoardState,
  prospectId: string,
  rank: number
): DraftBoardState {
  if (state.isFinalized) return state;

  const prospect = state.prospects.get(prospectId);
  if (!prospect || prospect.isLocked) return state;

  // Update prospect rank
  const newProspects = new Map(state.prospects);
  newProspects.set(prospectId, {
    ...prospect,
    userRank: rank,
    lastUpdated: Date.now(),
  });

  // Update rankings list
  const newRankings = state.userRankings.filter((id) => id !== prospectId);

  // Insert at correct position
  let inserted = false;
  for (let i = 0; i < newRankings.length; i++) {
    const otherProspect = newProspects.get(newRankings[i]);
    if (otherProspect && otherProspect.userRank !== null && otherProspect.userRank > rank) {
      newRankings.splice(i, 0, prospectId);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    newRankings.push(prospectId);
  }

  return {
    ...state,
    prospects: newProspects,
    userRankings: newRankings,
    lastModified: Date.now(),
  };
}

/**
 * Removes user ranking for a prospect
 */
export function removeUserRanking(state: DraftBoardState, prospectId: string): DraftBoardState {
  if (state.isFinalized) return state;

  const prospect = state.prospects.get(prospectId);
  if (!prospect) return state;

  const newProspects = new Map(state.prospects);
  newProspects.set(prospectId, {
    ...prospect,
    userRank: null,
    lastUpdated: Date.now(),
  });

  const newRankings = state.userRankings.filter((id) => id !== prospectId);

  return {
    ...state,
    prospects: newProspects,
    userRankings: newRankings,
    lastModified: Date.now(),
  };
}

/**
 * Sets user notes for a prospect
 */
export function setUserNotes(
  state: DraftBoardState,
  prospectId: string,
  notes: string
): DraftBoardState {
  if (state.isFinalized) return state;

  const prospect = state.prospects.get(prospectId);
  if (!prospect) return state;

  const newProspects = new Map(state.prospects);
  newProspects.set(prospectId, {
    ...prospect,
    userNotes: notes,
    lastUpdated: Date.now(),
  });

  return {
    ...state,
    prospects: newProspects,
    lastModified: Date.now(),
  };
}

/**
 * Sets user tier for a prospect
 */
export function setUserTier(
  state: DraftBoardState,
  prospectId: string,
  tier: DraftTier | null
): DraftBoardState {
  if (state.isFinalized) return state;

  const prospect = state.prospects.get(prospectId);
  if (!prospect) return state;

  const newProspects = new Map(state.prospects);
  newProspects.set(prospectId, {
    ...prospect,
    userTier: tier,
    lastUpdated: Date.now(),
  });

  return {
    ...state,
    prospects: newProspects,
    lastModified: Date.now(),
  };
}

/**
 * Locks a prospect (prevents further changes)
 */
export function lockProspect(state: DraftBoardState, prospectId: string): DraftBoardState {
  const prospect = state.prospects.get(prospectId);
  if (!prospect) return state;

  const newProspects = new Map(state.prospects);
  newProspects.set(prospectId, {
    ...prospect,
    isLocked: true,
  });

  return {
    ...state,
    prospects: newProspects,
    lastModified: Date.now(),
  };
}

/**
 * Unlocks a prospect
 */
export function unlockProspect(state: DraftBoardState, prospectId: string): DraftBoardState {
  const prospect = state.prospects.get(prospectId);
  if (!prospect) return state;

  const newProspects = new Map(state.prospects);
  newProspects.set(prospectId, {
    ...prospect,
    isLocked: false,
  });

  return {
    ...state,
    prospects: newProspects,
    lastModified: Date.now(),
  };
}

/**
 * Adds director input for a prospect
 */
export function addDirectorInput(state: DraftBoardState, input: DirectorInput): DraftBoardState {
  if (state.isFinalized) return state;

  const prospect = state.prospects.get(input.prospectId);
  if (!prospect) return state;

  const newProspects = new Map(state.prospects);
  newProspects.set(input.prospectId, {
    ...prospect,
    directorRank: input.rank,
    directorNotes: input.notes,
    needsMoreScouting: input.recommendFocus ? true : prospect.needsMoreScouting,
    lastUpdated: Date.now(),
  });

  // Update director recommendations
  const newRecommendations = state.directorRecommendations.filter((id) => id !== input.prospectId);

  // Insert at correct position
  let inserted = false;
  for (let i = 0; i < newRecommendations.length; i++) {
    const otherProspect = newProspects.get(newRecommendations[i]);
    if (
      otherProspect &&
      otherProspect.directorRank !== null &&
      otherProspect.directorRank > input.rank
    ) {
      newRecommendations.splice(i, 0, input.prospectId);
      inserted = true;
      break;
    }
  }
  if (!inserted) {
    newRecommendations.push(input.prospectId);
  }

  return {
    ...state,
    prospects: newProspects,
    directorRecommendations: newRecommendations,
    lastModified: Date.now(),
  };
}

/**
 * Sets filter options
 */
export function setFilters(
  state: DraftBoardState,
  options: {
    positions?: Position[];
    tier?: DraftTier | null;
    showOnlyFocused?: boolean;
  }
): DraftBoardState {
  return {
    ...state,
    positionFilters: options.positions ?? state.positionFilters,
    tierFilter: options.tier !== undefined ? options.tier : state.tierFilter,
    showOnlyFocused: options.showOnlyFocused ?? state.showOnlyFocused,
  };
}

/**
 * Sets sort option
 */
export function setSortOption(
  state: DraftBoardState,
  sortBy: DraftBoardSortOption
): DraftBoardState {
  return {
    ...state,
    sortBy,
  };
}

/**
 * Gets sorted and filtered prospects
 */
export function getSortedProspects(state: DraftBoardState): DraftBoardProspect[] {
  let prospects = Array.from(state.prospects.values());

  // Apply filters
  if (state.positionFilters.length > 0) {
    prospects = prospects.filter((p) => state.positionFilters.includes(p.position));
  }

  if (state.tierFilter) {
    prospects = prospects.filter((p) => {
      const tier = p.userTier ?? determineDraftTier(p.consensusRound);
      return tier === state.tierFilter;
    });
  }

  if (state.showOnlyFocused) {
    prospects = prospects.filter((p) => p.hasFocusReport);
  }

  // Sort
  switch (state.sortBy) {
    case 'user_rank':
      prospects.sort((a, b) => {
        if (a.userRank === null && b.userRank === null) return 0;
        if (a.userRank === null) return 1;
        if (b.userRank === null) return -1;
        return a.userRank - b.userRank;
      });
      break;

    case 'director_rank':
      prospects.sort((a, b) => {
        if (a.directorRank === null && b.directorRank === null) return 0;
        if (a.directorRank === null) return 1;
        if (b.directorRank === null) return -1;
        return a.directorRank - b.directorRank;
      });
      break;

    case 'consensus_round':
      prospects.sort((a, b) => a.consensusRound - b.consensusRound);
      break;

    case 'confidence':
      prospects.sort(
        (a, b) => b.aggregatedConfidence.combinedScore - a.aggregatedConfidence.combinedScore
      );
      break;

    case 'position':
      prospects.sort((a, b) => a.position.localeCompare(b.position));
      break;

    case 'last_updated':
      prospects.sort((a, b) => b.lastUpdated - a.lastUpdated);
      break;
  }

  return prospects;
}

/**
 * Gets draft board view model
 */
export function getDraftBoardView(state: DraftBoardState): DraftBoardViewModel {
  const sortedProspects = getSortedProspects(state);
  const allProspects = Array.from(state.prospects.values());

  // Calculate tier counts
  const tierCounts: Record<DraftTier, number> = {
    elite: 0,
    first_round: 0,
    second_round: 0,
    day_two: 0,
    day_three: 0,
    priority_fa: 0,
    draftable: 0,
  };

  // Calculate position counts
  const positionCounts: Partial<Record<Position, number>> = {};

  let totalConfidence = 0;
  let focusedCount = 0;
  let needsScoutingCount = 0;
  let rankedCount = 0;

  for (const prospect of allProspects) {
    const tier = prospect.userTier ?? determineDraftTier(prospect.consensusRound);
    tierCounts[tier]++;

    positionCounts[prospect.position] = (positionCounts[prospect.position] ?? 0) + 1;

    totalConfidence += prospect.aggregatedConfidence.combinedScore;

    if (prospect.hasFocusReport) focusedCount++;
    if (prospect.needsMoreScouting) needsScoutingCount++;
    if (prospect.userRank !== null) rankedCount++;
  }

  // Create prospect views
  const prospectViews: DraftBoardProspectView[] = sortedProspects.map((prospect, index) => {
    const tier = prospect.userTier ?? determineDraftTier(prospect.consensusRound);

    return {
      prospectId: prospect.prospectId,
      prospectName: prospect.prospectName,
      position: prospect.position,

      userRank: prospect.userRank,
      directorRank: prospect.directorRank,
      consensusRank: index + 1,

      overallRange: `${prospect.averageOverallMin}-${prospect.averageOverallMax}`,
      projectedRound: `Round ${prospect.consensusRound}`,
      tier,

      confidence: prospect.aggregatedConfidence.combinedLevel,
      confidenceScore: prospect.aggregatedConfidence.combinedScore,
      reportCount: prospect.reports.length,

      hasFocusReport: prospect.hasFocusReport,
      needsMoreScouting: prospect.needsMoreScouting,
      isLocked: prospect.isLocked,

      userNotes: prospect.userNotes,
    };
  });

  return {
    teamId: state.teamId,
    draftYear: state.draftYear,
    totalProspects: allProspects.length,
    rankedProspects: rankedCount,
    unrankedProspects: allProspects.length - rankedCount,

    prospects: prospectViews,

    tierCounts,
    positionCounts,
    averageConfidence:
      allProspects.length > 0 ? Math.round(totalConfidence / allProspects.length) : 0,
    focusedCount,
    needsScoutingCount,
  };
}

/**
 * Removes a prospect from the draft board
 */
export function removeProspect(state: DraftBoardState, prospectId: string): DraftBoardState {
  if (state.isFinalized) return state;

  const newProspects = new Map(state.prospects);
  newProspects.delete(prospectId);

  const newRankings = state.userRankings.filter((id) => id !== prospectId);
  const newRecommendations = state.directorRecommendations.filter((id) => id !== prospectId);

  return {
    ...state,
    prospects: newProspects,
    userRankings: newRankings,
    directorRecommendations: newRecommendations,
    lastModified: Date.now(),
  };
}

/**
 * Finalizes the draft board (prevents further changes)
 */
export function finalizeDraftBoard(state: DraftBoardState): DraftBoardState {
  return {
    ...state,
    isFinalized: true,
    lastModified: Date.now(),
  };
}

/**
 * Validates draft board state
 */
export function validateDraftBoardState(state: DraftBoardState): boolean {
  if (!state.teamId || !state.draftYear) {
    return false;
  }

  // Check rankings consistency
  for (const prospectId of state.userRankings) {
    if (!state.prospects.has(prospectId)) {
      return false;
    }
  }

  for (const prospectId of state.directorRecommendations) {
    if (!state.prospects.has(prospectId)) {
      return false;
    }
  }

  return true;
}

/**
 * Gets prospects that need more scouting
 */
export function getProspectsNeedingScouting(state: DraftBoardState): DraftBoardProspect[] {
  return Array.from(state.prospects.values()).filter(
    (p) => p.needsMoreScouting && !p.hasFocusReport
  );
}

/**
 * Gets prospects by position
 */
export function getProspectsByPosition(
  state: DraftBoardState,
  position: Position
): DraftBoardProspect[] {
  return Array.from(state.prospects.values())
    .filter((p) => p.position === position)
    .sort((a, b) => a.consensusRound - b.consensusRound);
}

/**
 * Gets top prospects by tier
 */
export function getTopProspectsByTier(
  state: DraftBoardState,
  tier: DraftTier,
  limit: number = 10
): DraftBoardProspect[] {
  return Array.from(state.prospects.values())
    .filter((p) => {
      const prospectTier = p.userTier ?? determineDraftTier(p.consensusRound);
      return prospectTier === tier;
    })
    .sort((a, b) => a.consensusRound - b.consensusRound)
    .slice(0, limit);
}
