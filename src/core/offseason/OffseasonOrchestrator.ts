/**
 * Offseason Orchestrator
 * Central coordinator for offseason phase processing and GameState updates
 */

import type { GameState } from '../models/game/GameState';
import type { OffSeasonState, OffSeasonPhaseType } from './OffSeasonPhaseManager';
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
  generateSeasonStartData,
} from './bridges/PhaseGenerators';
import {
  otaToTrainingCampInput,
  trainingCampToPreseasonInput,
  preseasonToFinalCutsInput,
} from './bridges/PhaseDataFlow';
import {
  processSeasonEndWithReveals,
  calculatePlayerGrade,
  type PlayerSeasonGrade,
  type AwardWinner as SeasonEndAward,
} from './phases/SeasonEndPhase';

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
export function enterPhase(gameState: GameState, phase: OffSeasonPhaseType): PhaseProcessResult {
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
        const awards = generateSeasonAwards(newGameState, newGameState.seasonStats);
        newOffseasonData.awards = awards;
        changes.push(`Generated ${awards.length} season awards`);
      }

      // Process season-end reveals and write-up for user's team
      const userTeam = newGameState.teams[newGameState.userTeamId];
      if (userTeam && !newOffseasonState.seasonRecap) {
        const seasonEndResult = buildSeasonEndRecap(
          newOffseasonState,
          newGameState,
          userTeam,
          newOffseasonData
        );
        newOffseasonState = seasonEndResult.offseasonState;
        // Write updated players (with narrowed perceived ranges) back to GameState
        const updatedPlayers = { ...newGameState.players };
        for (const player of seasonEndResult.updatedPlayers) {
          updatedPlayers[player.id] = player;
        }
        newGameState = { ...newGameState, players: updatedPlayers };
        changes.push('Generated season write-up and player rating reveals');
        changes.push(
          `Narrowed skill ranges for ${seasonEndResult.updatedPlayers.length} players based on tenure and playing time`
        );
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

    case 'free_agency': {
      // Initialize free agency day counter
      newOffseasonData.freeAgencyDay = 1;

      // Populate free agent pool: collect all players not on any team's roster
      const allRosteredPlayerIds = new Set<string>();
      for (const team of Object.values(newGameState.teams)) {
        for (const pid of team.rosterPlayerIds) {
          allRosteredPlayerIds.add(pid);
        }
        for (const pid of team.practiceSquadIds) {
          allRosteredPlayerIds.add(pid);
        }
        for (const pid of team.injuredReserveIds) {
          allRosteredPlayerIds.add(pid);
        }
      }
      const freeAgentIds = Object.keys(newGameState.players).filter(
        (pid) => !allRosteredPlayerIds.has(pid)
      );
      newOffseasonData.remainingFreeAgents = [
        ...new Set([...newOffseasonData.remainingFreeAgents, ...freeAgentIds]),
      ];

      changes.push('Free agency period opened');
      changes.push(
        `Populated free agent pool with ${newOffseasonData.remainingFreeAgents.length} players`
      );
      break;
    }

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
      if (
        !newOffseasonData.rookieIntegrationReports ||
        newOffseasonData.rookieIntegrationReports.length === 0
      ) {
        const rookieReports = generateRookieIntegrationReports(newGameState);
        newOffseasonData.rookieIntegrationReports = rookieReports;
        changes.push(`Generated ${rookieReports.length} rookie integration reports`);
      }
      break;
    }

    case 'training_camp': {
      // Bridge OTA data into training camp
      const otaCampBridge = otaToTrainingCampInput(
        newOffseasonData.otaReports || [],
        newOffseasonData.rookieIntegrationReports || [],
        [] // Position battle previews are not persisted; seeds come from OTA conditioning/scheme data
      );

      // Auto-generate position battles
      if (!newOffseasonData.positionBattles || newOffseasonData.positionBattles.length === 0) {
        const battles = generatePositionBattles(newGameState);
        // Enhance position battle scores using OTA conditioning data from bridge
        for (const battle of battles) {
          for (const competitor of battle.competitors) {
            const conditioning = otaCampBridge.playerConditionLevels[competitor.playerId];
            const schemeGrasp = otaCampBridge.playerSchemeGrasp[competitor.playerId];
            if (conditioning !== undefined) {
              // Players with better conditioning get a slight score boost
              competitor.currentScore += (conditioning - 70) * 0.1;
            }
            if (schemeGrasp !== undefined) {
              // Players with better scheme grasp get a slight score boost
              competitor.currentScore += (schemeGrasp - 60) * 0.1;
            }
            competitor.currentScore = Math.min(100, Math.max(0, competitor.currentScore));
          }
        }
        newOffseasonData.positionBattles = battles;
        changes.push(`Generated ${battles.length} position battles (enhanced with OTA data)`);
      }
      // Auto-generate development reveals
      if (
        !newOffseasonData.developmentReveals ||
        newOffseasonData.developmentReveals.length === 0
      ) {
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
      // Apply camp injuries to player records in GameState
      if (newOffseasonData.campInjuries.length > 0) {
        const injuryResult = applyInjuries(newGameState, newOffseasonData.campInjuries);
        newGameState = injuryResult.gameState;
        changes.push(`Applied ${newOffseasonData.campInjuries.length} camp injuries to players`);
      }
      changes.push('Training camp begins');
      break;
    }

    case 'preseason': {
      // Bridge training camp data into preseason
      const campPreseasonBridge = trainingCampToPreseasonInput(
        newOffseasonData.positionBattles || [],
        newOffseasonData.developmentReveals || [],
        newOffseasonData.campInjuries || []
      );

      // Auto-generate preseason games
      if (!newOffseasonData.preseasonGames || newOffseasonData.preseasonGames.length === 0) {
        const games = generatePreseasonGames(newGameState);
        newOffseasonData.preseasonGames = games;
        changes.push(`Generated ${games.length} preseason games`);

        // Auto-generate evaluations from games
        const evaluations = generatePreseasonEvaluations(games, newGameState);
        // Enhance evaluations with camp bridge data (development bonuses, injury status)
        for (const evaluation of evaluations) {
          const devBonus = campPreseasonBridge.developmentBonuses[evaluation.playerId];
          if (devBonus !== undefined) {
            evaluation.avgGrade = Math.min(100, Math.max(0, evaluation.avgGrade + devBonus));
          }
          // Mark injured players as cut candidates if still out
          if (campPreseasonBridge.injuredPlayers.includes(evaluation.playerId)) {
            evaluation.rosterProjection = 'bubble';
            evaluation.recommendation = 'Limited by camp injury - monitor closely';
          }
        }
        newOffseasonData.preseasonEvaluations = evaluations;
        changes.push(
          `Generated ${evaluations.length} preseason evaluations (enhanced with camp data)`
        );
      }
      changes.push('Preseason schedule ready');
      break;
    }

    case 'final_cuts': {
      // Bridge preseason data into final cuts
      const preseasonCutsBridge = preseasonToFinalCutsInput(
        newOffseasonData.preseasonEvaluations || [],
        newOffseasonData.positionBattles || [],
        newGameState
      );
      // Initialize waiver wire
      newOffseasonData.waiverWire = [];
      changes.push('Final roster cutdown begins');
      changes.push(
        `Cut analysis: ${preseasonCutsBridge.cutCandidates.length} cut candidates, ` +
          `${preseasonCutsBridge.bubblePlayers.length} bubble players, ` +
          `${preseasonCutsBridge.mustKeepPlayers.length} must-keep players`
      );
      break;
    }

    case 'season_start': {
      // Auto-generate season start data
      if (
        !newOffseasonData.ownerExpectations ||
        !newOffseasonData.mediaProjections ||
        !newOffseasonData.seasonGoals
      ) {
        const seasonStartData = generateSeasonStartData(newGameState);
        newOffseasonData.ownerExpectations = seasonStartData.ownerExpectations;
        newOffseasonData.mediaProjections = seasonStartData.mediaProjections;
        newOffseasonData.seasonGoals = seasonStartData.seasonGoals;
        changes.push('Generated owner expectations and season goals');
        changes.push(`Generated ${seasonStartData.mediaProjections.length} media projections`);
      }
      changes.push('Season preparation begins');
      break;
    }
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
export function processPhaseAction(gameState: GameState, action: PhaseAction): PhaseProcessResult {
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
      // Add cut players to free agent pool
      const cutPlayerIds = result.changes.playersRemoved;
      newOffseasonData = mergeOffseasonData(newOffseasonData, {
        contractDecisions: [...newOffseasonData.contractDecisions, ...action.decisions],
        remainingFreeAgents: [
          ...new Set([...newOffseasonData.remainingFreeAgents, ...cutPlayerIds]),
        ],
      });
      changes.push(`Applied ${action.decisions.length} contract decisions`);
      if (cutPlayerIds.length > 0) {
        changes.push(`Added ${cutPlayerIds.length} cut players to free agent pool`);
      }
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
    signings:
      (offseasonData?.freeAgentSignings?.length ?? 0) + (offseasonData?.udfaSignings?.length ?? 0),
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

  return sortedTeams.map((t) => t.id);
}

// =============================================================================
// Season End Helpers
// =============================================================================

/**
 * Builds the full season-end recap with write-up, stat improvements, and rating reveals.
 * Calculates player tenure, grades, and feeds them into processSeasonEndWithReveals.
 */
function buildSeasonEndRecap(
  offseasonState: OffSeasonState,
  gameState: GameState,
  userTeam: GameState['teams'][string],
  offseasonData: OffseasonPersistentData
): { offseasonState: OffSeasonState; updatedPlayers: GameState['players'][string][] } {
  const teamName = `${userTeam.city} ${userTeam.nickname}`;
  const teamRecord = userTeam.currentRecord;

  // Calculate division finish
  const confKey = userTeam.conference.toLowerCase() as 'afc' | 'nfc';
  const divKey = userTeam.division.toLowerCase() as 'north' | 'south' | 'east' | 'west';
  const divisionTeamIds = gameState.league.standings[confKey]?.[divKey] || [];
  const divisionTeams = divisionTeamIds
    .map((teamId: string) => gameState.teams[teamId])
    .filter(Boolean)
    .sort((a, b) => {
      const total = (t: typeof a) =>
        Math.max(1, t.currentRecord.wins + t.currentRecord.losses + t.currentRecord.ties);
      return b.currentRecord.wins / total(b) - a.currentRecord.wins / total(a);
    });
  const divisionFinish = divisionTeams.findIndex((t) => t.id === userTeam.id) + 1 || 4;

  // Determine playoff status
  const madePlayoffs = teamRecord.wins >= 10;
  const playoffResult = gameState.league.playoffBracket
    ? getPlayoffResultFromBracket(gameState, userTeam.id)
    : null;

  // Draft position
  const draftPosition =
    offseasonData.draftOrder.indexOf(userTeam.id) + 1 || calculateDraftPosition(gameState);

  // Gather roster players
  const rosterPlayers = userTeam.rosterPlayerIds.map((id) => gameState.players[id]).filter(Boolean);

  // Season stats (if available)
  const seasonStats = gameState.seasonStats || {};

  // Calculate player tenures (approximate from experience - most players stay with drafting team)
  const currentYear = gameState.league.calendar.currentYear;
  const playerTenures: Record<string, number> = {};
  for (const player of rosterPlayers) {
    // Use years since draft as a reasonable proxy for tenure
    playerTenures[player.id] = Math.max(1, currentYear - player.draftYear);
  }

  // Generate player grades from available stats or perceived ratings
  const playerGrades: PlayerSeasonGrade[] = rosterPlayers.map((player) => {
    const stats = seasonStats[player.id];
    const gamesPlayed = stats?.gamesPlayed ?? 0;
    const gamesStarted = stats?.gamesStarted ?? 0;
    // Estimate performance from perceived skill average
    const skills = Object.values(player.skills);
    const avgPerceived =
      skills.length > 0
        ? skills.reduce((sum, s) => sum + (s.perceivedMin + s.perceivedMax) / 2, 0) / skills.length
        : 50;
    const grade = calculatePlayerGrade(gamesPlayed, gamesStarted, avgPerceived);

    return {
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      overallGrade: grade,
      categories: { production: grade, consistency: grade, impact: grade },
      highlights: [],
      concerns: [],
    };
  });

  // Convert persistent awards to SeasonEndPhase AwardWinner format
  const awards: SeasonEndAward[] = (offseasonData.awards || []).map((a) => ({
    award: a.award as SeasonEndAward['award'],
    playerId: a.playerId,
    playerName: a.playerName,
    teamId: a.teamId,
    teamName: a.teamName,
    stats: '',
  }));

  return processSeasonEndWithReveals(
    offseasonState,
    userTeam.id,
    teamName,
    { wins: teamRecord.wins, losses: teamRecord.losses, ties: teamRecord.ties },
    divisionFinish,
    madePlayoffs,
    playoffResult,
    draftPosition,
    rosterPlayers,
    seasonStats,
    playerTenures,
    playerGrades,
    awards,
    offseasonData.draftOrder
  );
}

/**
 * Extracts playoff result from bracket (simplified)
 */
function getPlayoffResultFromBracket(gameState: GameState, teamId: string): string | null {
  const bracket = gameState.league.playoffBracket;
  if (!bracket) return null;

  // Check if team was in the bracket at all
  const allGames = [
    ...(bracket.wildCardResults || []),
    ...(bracket.divisionalResults || []),
    ...(bracket.conferenceResults || []),
    ...(bracket.superBowl ? [bracket.superBowl] : []),
  ];

  const teamGames = allGames.filter(
    (g) => g && (g.homeTeamId === teamId || g.awayTeamId === teamId)
  );

  if (teamGames.length === 0) return null;

  // Check for super bowl winner
  if (bracket.superBowl?.winnerId === teamId) return 'Super Bowl Champions';
  if (
    bracket.superBowl &&
    (bracket.superBowl.homeTeamId === teamId || bracket.superBowl.awayTeamId === teamId)
  ) {
    return 'Super Bowl Runner-Up';
  }

  // Check conference championship
  const confGames = bracket.conferenceResults || [];
  const inConf = confGames.some((g) => g && (g.homeTeamId === teamId || g.awayTeamId === teamId));
  if (inConf) return 'Lost in Conference Championship';

  // Check divisional
  const divGames = bracket.divisionalResults || [];
  const inDiv = divGames.some((g) => g && (g.homeTeamId === teamId || g.awayTeamId === teamId));
  if (inDiv) return 'Lost in Divisional Round';

  return 'Lost in Wild Card Round';
}

/**
 * Simple draft position calculation fallback
 */
function calculateDraftPosition(gameState: GameState): number {
  const allTeams = Object.values(gameState.teams);
  const sorted = [...allTeams].sort((a, b) => {
    const total = (t: typeof a) =>
      Math.max(1, t.currentRecord.wins + t.currentRecord.losses + t.currentRecord.ties);
    return a.currentRecord.wins / total(a) - b.currentRecord.wins / total(b);
  });
  return sorted.findIndex((t) => t.id === gameState.userTeamId) + 1 || 16;
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
import type { PositionBattle, DevelopmentReveal, CampInjury } from './phases/TrainingCampPhase';
import type { PreseasonGame, PreseasonEvaluation } from './phases/PreseasonPhase';
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
  | {
      type: 'apply_roster_moves';
      cuts: string[];
      practiceSquadSignings: string[];
      irPlacements: string[];
    }
  | {
      type: 'apply_development';
      changes: Array<{
        playerId: string;
        attributeChanges: Record<string, number>;
        overallChange?: number;
      }>;
    }
  | { type: 'store_position_battles'; battles: PositionBattle[] }
  | { type: 'store_development_reveals'; reveals: DevelopmentReveal[] }
  | { type: 'store_camp_injuries'; injuries: CampInjury[] }
  | { type: 'store_preseason_games'; games: PreseasonGame[] }
  | { type: 'store_preseason_evaluations'; evaluations: PreseasonEvaluation[] }
  | { type: 'store_ota_reports'; reports: OTAReport[] }
  | {
      type: 'store_owner_expectations';
      expectations: OwnerExpectations;
      projections: MediaProjection[];
      goals: SeasonGoal[];
    }
  | { type: 'store_combine_results'; results: Record<string, CombineResults> }
  | { type: 'store_awards'; awards: AwardWinner[] }
  | { type: 'store_coach_evaluations'; evaluations: CoachEvaluationResult[] }
  | { type: 'store_rookie_integration_reports'; reports: RookieIntegrationReport[] }
  | { type: 'store_season_recap'; recap: SeasonRecap }
  | { type: 'mark_draft_complete'; tradesExecuted: number }
  | { type: 'mark_combine_complete' };
