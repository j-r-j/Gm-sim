/**
 * Offseason Orchestrator
 * Central coordinator for offseason phase processing and GameState updates
 */

import type { GameState } from '../models/game/GameState';
import type {
  OffSeasonState,
  OffSeasonPhaseType,
} from './OffSeasonPhaseManager';
import {
  PHASE_ORDER,
  PHASE_NAMES,
  createOffSeasonState,
  advancePhase as advanceOffseasonPhase,
  canAdvancePhase,
  completeTask,
  addEvent,
} from './OffSeasonPhaseManager';
import {
  createEmptyOffseasonData,
  mergeOffseasonData,
  type OffseasonPersistentData,
} from './OffseasonPersistentData';
import {
  applyCoachingChanges,
  applyContractDecisions,
  applyDraftSelections,
  applyFreeAgencySignings,
  applyUDFASignings,
  applyInjuries,
  applyRosterMoves,
  applyDevelopmentChanges,
  type PhaseApplicationResult,
} from './PhaseStateMappers';
import {
  generateSeasonAwards,
  generateCoachEvaluations,
  generateOTAReports,
  generateRookieIntegrationReports,
  generatePositionBattles,
  generateDevelopmentReveals,
  generateCampInjuries,
  generatePreseasonGames,
  generatePreseasonEvaluations,
} from './bridges/PhaseGenerators';

/**
 * Result of entering or processing a phase
 */
export interface PhaseProcessResult {
  gameState: GameState;
  offseasonState: OffSeasonState;
  offseasonData: OffseasonPersistentData;
  success: boolean;
  errors: string[];
  changes: string[];
}

/**
 * Initializes the offseason for a new year
 */
export function initializeOffseason(gameState: GameState): PhaseProcessResult {
  const year = gameState.league.calendar.currentYear;
  const offseasonState = createOffSeasonState(year);
  const offseasonData = createEmptyOffseasonData();

  const updatedGameState: GameState = {
    ...gameState,
    offseasonState,
    offseasonData,
  };

  return {
    gameState: updatedGameState,
    offseasonState,
    offseasonData,
    success: true,
    errors: [],
    changes: [`Initialized offseason for year ${year}`],
  };
}

/**
 * Enters a specific phase and runs any automatic processing
 */
export function enterPhase(
  gameState: GameState,
  phase: OffSeasonPhaseType
): PhaseProcessResult {
  const offseasonState = gameState.offseasonState;
  const offseasonData = gameState.offseasonData || createEmptyOffseasonData();

  if (!offseasonState) {
    return {
      gameState,
      offseasonState: createOffSeasonState(gameState.league.calendar.currentYear),
      offseasonData,
      success: false,
      errors: ['No offseason state found'],
      changes: [],
    };
  }

  const changes: string[] = [];
  let newOffseasonState = addEvent(
    offseasonState,
    'phase_start',
    `Entering ${PHASE_NAMES[phase]}`,
    { phase }
  );

  // Phase-specific automatic processing on entry
  let newOffseasonData = { ...offseasonData };
  let newGameState = { ...gameState };

  switch (phase) {
    case 'season_end': {
      // Auto-generate draft order if not set
      if (newOffseasonData.draftOrder.length === 0) {
        newOffseasonData.draftOrder = calculateDraftOrder(newGameState);
        changes.push('Generated draft order from standings');
      }
      // Auto-generate season awards
      if (!newOffseasonData.awards || newOffseasonData.awards.length === 0) {
        const awards = generateSeasonAwards(newGameState);
        newOffseasonData.awards = awards;
        changes.push(`Generated ${awards.length} season awards`);
      }
      break;
    }

    case 'coaching_decisions': {
      // Auto-generate coach evaluations
      if (!newOffseasonData.coachEvaluations || newOffseasonData.coachEvaluations.length === 0) {
        const evaluations = generateCoachEvaluations(newGameState);
        newOffseasonData.coachEvaluations = evaluations;
        changes.push(`Generated ${evaluations.length} coach evaluations`);
      }
      break;
    }

    case 'combine':
      // Mark combine as starting
      newOffseasonData.combineComplete = false;
      changes.push('NFL Combine period started');
      break;

    case 'free_agency':
      // Initialize free agency day counter
      newOffseasonData.freeAgencyDay = 1;
      changes.push('Free agency period opened');
      break;

    case 'draft':
      // Ensure draft order is set
      if (newOffseasonData.draftOrder.length === 0) {
        newOffseasonData.draftOrder = calculateDraftOrder(newGameState);
      }
      changes.push('NFL Draft begins');
      break;

    case 'udfa': {
      // Generate UDFA pool from remaining prospects
      const remainingProspects = Object.values(newGameState.prospects);
      newOffseasonData.udfaPool = remainingProspects;
      changes.push(`UDFA pool generated: ${remainingProspects.length} prospects available`);
      break;
    }

    case 'otas': {
      // Auto-generate OTA reports
      if (!newOffseasonData.otaReports || newOffseasonData.otaReports.length === 0) {
        const otaReports = generateOTAReports(newGameState);
        newOffseasonData.otaReports = otaReports;
        changes.push(`Generated ${otaReports.length} OTA reports`);
      }
      // Auto-generate rookie integration reports
      if (!newOffseasonData.rookieIntegrationReports || newOffseasonData.rookieIntegrationReports.length === 0) {
        const rookieReports = generateRookieIntegrationReports(newGameState);
        newOffseasonData.rookieIntegrationReports = rookieReports;
        changes.push(`Generated ${rookieReports.length} rookie integration reports`);
      }
      break;
    }

    case 'training_camp': {
      // Auto-generate position battles
      if (!newOffseasonData.positionBattles || newOffseasonData.positionBattles.length === 0) {
        const battles = generatePositionBattles(newGameState);
        newOffseasonData.positionBattles = battles;
        changes.push(`Generated ${battles.length} position battles`);
      }
      // Auto-generate development reveals
      if (!newOffseasonData.developmentReveals || newOffseasonData.developmentReveals.length === 0) {
        const reveals = generateDevelopmentReveals(newGameState);
        newOffseasonData.developmentReveals = reveals;
        changes.push(`Generated ${reveals.length} development reveals`);
      }
      // Auto-generate camp injuries
      if (!newOffseasonData.campInjuries || newOffseasonData.campInjuries.length === 0) {
        const injuries = generateCampInjuries(newGameState);
        newOffseasonData.campInjuries = injuries;
        changes.push(`Generated ${injuries.length} camp injuries`);
      }
      changes.push('Training camp begins');
      break;
    }

    case 'preseason': {
      // Auto-generate preseason games
      if (!newOffseasonData.preseasonGames || newOffseasonData.preseasonGames.length === 0) {
        const games = generatePreseasonGames(newGameState);
        newOffseasonData.preseasonGames = games;
        changes.push(`Generated ${games.length} preseason games`);

        // Auto-generate evaluations from games
        const evaluations = generatePreseasonEvaluations(games, newGameState);
        newOffseasonData.preseasonEvaluations = evaluations;
        changes.push(`Generated ${evaluations.length} preseason evaluations`);
      }
      changes.push('Preseason schedule ready');
      break;
    }

    case 'final_cuts':
      // Initialize waiver wire
      newOffseasonData.waiverWire = [];
      changes.push('Final roster cutdown begins');
      break;

    case 'season_start':
      changes.push('Season preparation begins');
      break;
  }

  newOffseasonData = mergeOffseasonData(newOffseasonData, {
    lastUpdatedPhase: phase,
  });

  const updatedGameState: GameState = {
    ...newGameState,
    offseasonState: newOffseasonState,
    offseasonData: newOffseasonData,
  };

  return {
    gameState: updatedGameState,
    offseasonState: newOffseasonState,
    offseasonData: newOffseasonData,
    success: true,
    errors: [],
    changes,
  };
}

/**
 * Processes phase-specific actions and updates GameState
 */
export function processPhaseAction(
  gameState: GameState,
  action: PhaseAction
): PhaseProcessResult {
  const offseasonState = gameState.offseasonState;
  const offseasonData = gameState.offseasonData || createEmptyOffseasonData();

  if (!offseasonState) {
    return {
      gameState,
      offseasonState: createOffSeasonState(gameState.league.calendar.currentYear),
      offseasonData,
      success: false,
      errors: ['No offseason state found'],
      changes: [],
    };
  }

  const changes: string[] = [];
  const errors: string[] = [];
  let newOffseasonState = offseasonState;
  let newOffseasonData = offseasonData;
  let newGameState = gameState;

  switch (action.type) {
    case 'complete_task': {
      newOffseasonState = completeTask(newOffseasonState, action.taskId);
      changes.push(`Completed task: ${action.taskId}`);
      break;
    }

    case 'apply_coaching_changes': {
      const result = applyCoachingChanges(newGameState, action.changes);
      newGameState = result.gameState;
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        coachingChanges: [...newOffseasonData.coachingChanges, ...action.changes],
      });
      changes.push(`Applied ${action.changes.length} coaching changes`);
      errors.push(...result.errors);
      break;
    }

    case 'apply_contract_decisions': {
      const result = applyContractDecisions(newGameState, action.decisions);
      newGameState = result.gameState;
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        contractDecisions: [...newOffseasonData.contractDecisions, ...action.decisions],
      });
      changes.push(`Applied ${action.decisions.length} contract decisions`);
      errors.push(...result.errors);
      break;
    }

    case 'apply_draft_selections': {
      const result = applyDraftSelections(newGameState, action.selections);
      newGameState = result.gameState;
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        draftSelections: [...newOffseasonData.draftSelections, ...action.selections],
      });
      changes.push(`Applied ${action.selections.length} draft selections`);
      errors.push(...result.errors);
      break;
    }

    case 'apply_fa_signings': {
      const result = applyFreeAgencySignings(newGameState, action.signings);
      newGameState = result.gameState;
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        freeAgentSignings: [...newOffseasonData.freeAgentSignings, ...action.signings],
      });
      changes.push(`Applied ${action.signings.length} free agent signings`);
      errors.push(...result.errors);
      break;
    }

    case 'apply_udfa_signings': {
      const result = applyUDFASignings(newGameState, action.signings);
      newGameState = result.gameState;
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        udfaSignings: [...newOffseasonData.udfaSignings, ...action.signings],
      });
      changes.push(`Applied ${action.signings.length} UDFA signings`);
      errors.push(...result.errors);
      break;
    }

    case 'apply_injuries': {
      const result = applyInjuries(newGameState, action.injuries);
      newGameState = result.gameState;
      changes.push(`Applied ${action.injuries.length} injuries`);
      errors.push(...result.errors);
      break;
    }

    case 'apply_roster_moves': {
      const result = applyRosterMoves(
        newGameState,
        action.cuts,
        action.practiceSquadSignings,
        action.irPlacements
      );
      newGameState = result.gameState;
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        practiceSquadSignings: [
          ...newOffseasonData.practiceSquadSignings,
          ...action.practiceSquadSignings,
        ],
      });
      changes.push(
        `Applied roster moves: ${action.cuts.length} cuts, ` +
        `${action.practiceSquadSignings.length} PS signings, ` +
        `${action.irPlacements.length} IR placements`
      );
      errors.push(...result.errors);
      break;
    }

    case 'apply_development': {
      const result = applyDevelopmentChanges(newGameState, action.changes);
      newGameState = result.gameState;
      changes.push(`Applied ${action.changes.length} development changes`);
      errors.push(...result.errors);
      break;
    }

    case 'store_position_battles': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        positionBattles: action.battles,
      });
      changes.push(`Stored ${action.battles.length} position battles`);
      break;
    }

    case 'store_development_reveals': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        developmentReveals: action.reveals,
      });
      changes.push(`Stored ${action.reveals.length} development reveals`);
      break;
    }

    case 'store_camp_injuries': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        campInjuries: action.injuries,
      });
      // Also apply to player status
      const injuryResult = applyInjuries(newGameState, action.injuries);
      newGameState = injuryResult.gameState;
      changes.push(`Stored ${action.injuries.length} camp injuries`);
      errors.push(...injuryResult.errors);
      break;
    }

    case 'store_preseason_games': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        preseasonGames: action.games,
      });
      changes.push(`Stored ${action.games.length} preseason games`);
      break;
    }

    case 'store_preseason_evaluations': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        preseasonEvaluations: action.evaluations,
      });
      changes.push(`Stored ${action.evaluations.length} preseason evaluations`);
      break;
    }

    case 'store_ota_reports': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        otaReports: action.reports,
      });
      changes.push(`Stored ${action.reports.length} OTA reports`);
      break;
    }

    case 'store_owner_expectations': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        ownerExpectations: action.expectations,
        mediaProjections: action.projections,
        seasonGoals: action.goals,
      });
      changes.push('Stored owner expectations and season goals');
      break;
    }

    case 'store_combine_results': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        combineResults: { ...newOffseasonData.combineResults, ...action.results },
        combineComplete: true,
      });
      changes.push(`Stored combine results for ${Object.keys(action.results).length} prospects`);
      break;
    }

    case 'store_awards': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        awards: action.awards,
      });
      changes.push(`Stored ${action.awards.length} awards`);
      break;
    }

    case 'store_coach_evaluations': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        coachEvaluations: action.evaluations,
      });
      changes.push(`Stored ${action.evaluations.length} coach evaluations`);
      break;
    }

    case 'store_rookie_integration_reports': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        rookieIntegrationReports: action.reports,
      });
      changes.push(`Stored ${action.reports.length} rookie integration reports`);
      break;
    }

    case 'store_season_recap': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        seasonRecap: action.recap,
      });
      changes.push('Stored season recap');
      break;
    }

    case 'mark_draft_complete': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        draftComplete: true,
        tradesExecuted: action.tradesExecuted,
      });
      changes.push('Draft marked as complete');
      break;
    }

    case 'mark_combine_complete': {
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        combineComplete: true,
      });
      changes.push('Combine marked as complete');
      break;
    }
  }

  newOffseasonData = mergeOffseasonData(newOffseasonData, {
    lastUpdatedPhase: offseasonState.currentPhase,
  });

  const updatedGameState: GameState = {
    ...newGameState,
    offseasonState: newOffseasonState,
    offseasonData: newOffseasonData,
  };

  return {
    gameState: updatedGameState,
    offseasonState: newOffseasonState,
    offseasonData: newOffseasonData,
    success: errors.length === 0,
    errors,
    changes,
  };
}

/**
 * Advances to the next offseason phase
 */
export function advanceToNextPhase(gameState: GameState): PhaseProcessResult {
  const offseasonState = gameState.offseasonState;
  const offseasonData = gameState.offseasonData || createEmptyOffseasonData();

  if (!offseasonState) {
    return {
      gameState,
      offseasonState: createOffSeasonState(gameState.league.calendar.currentYear),
      offseasonData,
      success: false,
      errors: ['No offseason state found'],
      changes: [],
    };
  }

  if (!canAdvancePhase(offseasonState)) {
    return {
      gameState,
      offseasonState,
      offseasonData,
      success: false,
      errors: ['Cannot advance phase - required tasks not complete'],
      changes: [],
    };
  }

  const previousPhase = offseasonState.currentPhase;
  const newOffseasonState = advanceOffseasonPhase(offseasonState);
  const nextPhase = newOffseasonState.currentPhase;

  const changes: string[] = [
    `Advanced from ${PHASE_NAMES[previousPhase]} to ${PHASE_NAMES[nextPhase]}`,
  ];

  // Enter the new phase
  const enterResult = enterPhase(
    {
      ...gameState,
      offseasonState: newOffseasonState,
      offseasonData,
    },
    nextPhase
  );

  return {
    ...enterResult,
    changes: [...changes, ...enterResult.changes],
  };
}

/**
 * Checks if the offseason is complete
 */
export function isOffseasonComplete(gameState: GameState): boolean {
  return gameState.offseasonState?.isComplete ?? false;
}

/**
 * Gets the current offseason phase
 */
export function getCurrentPhase(gameState: GameState): OffSeasonPhaseType | null {
  return gameState.offseasonState?.currentPhase ?? null;
}

/**
 * Gets the offseason progress percentage
 */
export function getOffseasonProgress(gameState: GameState): number {
  const offseasonState = gameState.offseasonState;
  if (!offseasonState) return 0;

  const completedPhases = offseasonState.completedPhases.length;

  return Math.round((completedPhases / PHASE_ORDER.length) * 100);
}

/**
 * Completes the offseason and transitions to the regular season
 */
export function completeOffseason(gameState: GameState): PhaseProcessResult {
  const offseasonState = gameState.offseasonState;
  const offseasonData = gameState.offseasonData || createEmptyOffseasonData();

  if (!offseasonState) {
    return {
      gameState,
      offseasonState: createOffSeasonState(gameState.league.calendar.currentYear),
      offseasonData,
      success: false,
      errors: ['No offseason state found'],
      changes: [],
    };
  }

  const changes: string[] = [];

  // Mark offseason as complete
  const completedOffseasonState: OffSeasonState = {
    ...offseasonState,
    isComplete: true,
    completedPhases: [...PHASE_ORDER],
  };

  // Update league calendar to regular season
  const newYear = gameState.league.calendar.currentYear + 1;
  const updatedLeague = {
    ...gameState.league,
    calendar: {
      ...gameState.league.calendar,
      currentPhase: 'regularSeason' as const,
      currentWeek: 1,
      currentYear: newYear,
    },
  };

  changes.push(`Offseason complete, starting ${newYear} regular season`);

  const updatedGameState: GameState = {
    ...gameState,
    league: updatedLeague,
    offseasonState: completedOffseasonState,
    offseasonData,
  };

  return {
    gameState: updatedGameState,
    offseasonState: completedOffseasonState,
    offseasonData,
    success: true,
    errors: [],
    changes,
  };
}

/**
 * Gets a summary of offseason actions for the user
 */
export function getOffseasonSummary(gameState: GameState): {
  phase: string;
  progress: number;
  draftPicks: number;
  signings: number;
  coachingChanges: number;
  contractDecisions: number;
} {
  const offseasonState = gameState.offseasonState;
  const offseasonData = gameState.offseasonData;

  return {
    phase: offseasonState ? PHASE_NAMES[offseasonState.currentPhase] : 'Not started',
    progress: getOffseasonProgress(gameState),
    draftPicks: offseasonData?.draftSelections?.length ?? 0,
    signings: (offseasonData?.freeAgentSignings?.length ?? 0) +
              (offseasonData?.udfaSignings?.length ?? 0),
    coachingChanges: offseasonData?.coachingChanges?.length ?? 0,
    contractDecisions: offseasonData?.contractDecisions?.length ?? 0,
  };
}

/**
 * Calculates draft order from standings
 */
function calculateDraftOrder(gameState: GameState): string[] {
  const teams = Object.values(gameState.teams);

  // Sort by record (worst to best for draft order)
  const sortedTeams = [...teams].sort((a, b) => {
    const aWinPct = a.currentRecord.wins / (a.currentRecord.wins + a.currentRecord.losses || 1);
    const bWinPct = b.currentRecord.wins / (b.currentRecord.wins + b.currentRecord.losses || 1);
    return aWinPct - bWinPct; // Worst record first
  });

  return sortedTeams.map(t => t.id);
}

// =============================================================================
// Phase Action Types
// =============================================================================

import type {
  CoachingChangeRecord,
  ContractDecisionRecord,
  DraftSelectionRecord,
  FreeAgentSigningRecord,
  UDFASigningRecord,
  AwardWinner,
  OwnerExpectations,
  MediaProjection,
  SeasonGoal,
  CoachEvaluationResult,
} from './OffseasonPersistentData';
import type {
  PositionBattle,
  DevelopmentReveal,
  CampInjury,
} from './phases/TrainingCampPhase';
import type {
  PreseasonGame,
  PreseasonEvaluation,
} from './phases/PreseasonPhase';
import type { OTAReport, RookieIntegrationReport } from './phases/OTAsPhase';
import type { CombineResults } from '../draft/CombineSimulator';
import type { SeasonRecap } from './OffSeasonPhaseManager';

export type PhaseAction =
  | { type: 'complete_task'; taskId: string }
  | { type: 'apply_coaching_changes'; changes: CoachingChangeRecord[] }
  | { type: 'apply_contract_decisions'; decisions: ContractDecisionRecord[] }
  | { type: 'apply_draft_selections'; selections: DraftSelectionRecord[] }
  | { type: 'apply_fa_signings'; signings: FreeAgentSigningRecord[] }
  | { type: 'apply_udfa_signings'; signings: UDFASigningRecord[] }
  | { type: 'apply_injuries'; injuries: CampInjury[] }
  | { type: 'apply_roster_moves'; cuts: string[]; practiceSquadSignings: string[]; irPlacements: string[] }
  | { type: 'apply_development'; changes: Array<{ playerId: string; attributeChanges: Record<string, number>; overallChange?: number }> }
  | { type: 'store_position_battles'; battles: PositionBattle[] }
  | { type: 'store_development_reveals'; reveals: DevelopmentReveal[] }
  | { type: 'store_camp_injuries'; injuries: CampInjury[] }
  | { type: 'store_preseason_games'; games: PreseasonGame[] }
  | { type: 'store_preseason_evaluations'; evaluations: PreseasonEvaluation[] }
  | { type: 'store_ota_reports'; reports: OTAReport[] }
  | { type: 'store_owner_expectations'; expectations: OwnerExpectations; projections: MediaProjection[]; goals: SeasonGoal[] }
  | { type: 'store_combine_results'; results: Record<string, CombineResults> }
  | { type: 'store_awards'; awards: AwardWinner[] }
  | { type: 'store_coach_evaluations'; evaluations: CoachEvaluationResult[] }
  | { type: 'store_rookie_integration_reports'; reports: RookieIntegrationReport[] }
  | { type: 'store_season_recap'; recap: SeasonRecap }
  | { type: 'mark_draft_complete'; tradesExecuted: number }
  | { type: 'mark_combine_complete' };
