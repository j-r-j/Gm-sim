/**
 * Combine Bridge
 * Connects CombinePhase.ts (OffSeasonState events) with CombineSimulator.ts (actual simulation)
 */

import { GameState } from '../../models/game/GameState';
import { OffSeasonState, addEvent, completeTask } from '../OffSeasonPhaseManager';
import {
  simulateCombine,
  CombineResults,
  CombineSimulationResults,
  CombineGrade,
  DEFAULT_COMBINE_CONFIG,
} from '../../draft/CombineSimulator';
import { DraftClass } from '../../draft/DraftClassGenerator';

/**
 * Runs the combine simulation and integrates results into both GameState and OffSeasonState
 */
export function runCombineSimulation(
  gameState: GameState,
  draftClass: DraftClass
): {
  gameState: GameState;
  simulationResults: CombineSimulationResults;
  combineResultsRecord: Record<string, CombineResults>;
} {
  // Run the actual combine simulation
  const simulationResults = simulateCombine(draftClass, DEFAULT_COMBINE_CONFIG);

  // Convert Map to Record for storage in OffseasonPersistentData
  const combineResultsRecord: Record<string, CombineResults> = {};
  for (const [prospectId, results] of simulationResults.results) {
    combineResultsRecord[prospectId] = results;
  }

  // Update GameState with updated prospects
  const updatedProspects = { ...gameState.prospects };
  for (const prospect of simulationResults.updatedProspects) {
    updatedProspects[prospect.id] = prospect;
  }

  return {
    gameState: {
      ...gameState,
      prospects: updatedProspects,
    },
    simulationResults,
    combineResultsRecord,
  };
}

/**
 * Determines stock change based on combine performance
 */
function determineStockChange(results: CombineResults): 'riser' | 'faller' | 'steady' {
  switch (results.overallGrade) {
    case CombineGrade.EXCEPTIONAL:
      return 'riser';
    case CombineGrade.ABOVE_AVERAGE:
      return Math.random() > 0.5 ? 'riser' : 'steady';
    case CombineGrade.BELOW_AVERAGE:
      return Math.random() > 0.5 ? 'faller' : 'steady';
    case CombineGrade.POOR:
      return 'faller';
    default:
      return 'steady';
  }
}

/**
 * Integrates combine results into OffSeasonState (for event tracking)
 */
export function integrateCombineIntoOffseasonState(
  state: OffSeasonState,
  simulationResults: CombineSimulationResults
): OffSeasonState {
  let newState = addEvent(
    state,
    'phase_complete',
    `NFL Combine complete: ${simulationResults.summary.totalParticipated} prospects measured`,
    {
      totalInvited: simulationResults.summary.totalInvited,
      totalParticipated: simulationResults.summary.totalParticipated,
      gradeDistribution: simulationResults.summary.gradeDistribution,
      averageFortyTime: simulationResults.summary.averageFortyTime,
    }
  );

  // Find top performers
  const topPerformers: string[] = [];
  for (const [prospectId, results] of simulationResults.results) {
    if (results.overallGrade === CombineGrade.EXCEPTIONAL) {
      topPerformers.push(prospectId);
    }
  }

  if (topPerformers.length > 0) {
    newState = addEvent(
      newState,
      'development_reveal',
      `${topPerformers.length} prospects with exceptional combine performances`,
      { exceptionalProspectIds: topPerformers }
    );
  }

  newState = completeTask(newState, 'attend_combine');
  newState = completeTask(newState, 'view_prospects');

  return newState;
}

/**
 * Gets combine results for a specific prospect
 */
export function getProspectCombineResults(
  simulationResults: CombineSimulationResults,
  prospectId: string
): CombineResults | undefined {
  return simulationResults.results.get(prospectId);
}

/**
 * Gets risers from combine (prospects who improved their stock)
 */
export function getCombineRisers(
  combineResultsRecord: Record<string, CombineResults>
): CombineResults[] {
  return Object.values(combineResultsRecord).filter(
    r => determineStockChange(r) === 'riser'
  );
}

/**
 * Gets fallers from combine (prospects who hurt their stock)
 */
export function getCombineFallers(
  combineResultsRecord: Record<string, CombineResults>
): CombineResults[] {
  return Object.values(combineResultsRecord).filter(
    r => determineStockChange(r) === 'faller'
  );
}
