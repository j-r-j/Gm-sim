/**
 * Roster Module Index
 * Exports roster management functionality
 */

export {
  // Types
  DepthSlot,
  DepthChartEntry,
  DepthChart,
  PositionGroup,
  RankedPlayer,
  PositionDepthView,
  // Constants
  POSITION_GROUPS,
  DEPTH_CHART_POSITIONS,
  // Functions
  calculatePlayerOverallRating,
  generateDepthChart,
  getPositionDepth,
  getPositionGroupDepths,
  movePlayerToDepth,
  swapPlayers,
  getStarters,
  getDepthLabel,
  getPositionDisplayName,
  isDepthChartComplete,
  getMissingStarters,
} from './DepthChartManager';
