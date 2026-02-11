/**
 * Simulation Module Exports
 */

export {
  type WeekFlowPhase,
  type WeekFlowState,
  type WeekFlowAction,
  type NextActionPrompt,
  type LiveGameScore,
  createInitialWeekFlowState,
  getNextActionPrompt,
  getWeekLabel,
  transitionWeekFlowPhase,
  updateGate,
  canAdvanceWeek,
  getAdvancementBlockReason,
} from './WeekFlowState';
