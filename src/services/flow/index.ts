/**
 * Flow Services Index
 * Single-flow management for consistent user experiences
 */

export {
  // Types
  type WeekFlowPhase,
  type WeekFlowFlags,
  type WeekFlowState,
  type NextAction,
  // Constants
  DEFAULT_WEEK_FLAGS,
  // Functions
  getWeekFlowState,
  updateWeekFlags,
  markPreGameViewed,
  markGameSimulated,
  markPostGameViewed,
  markOtherGamesSimulated,
  markWeekSummaryViewed,
  resetWeekFlags,
  advanceWeek,
  isUserByeWeek,
  getWeekFlowProgress,
  getRemainingSteps,
} from './WeekFlowManager';
