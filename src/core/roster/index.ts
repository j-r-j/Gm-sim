/**
 * Roster Module Exports
 * Central export point for depth chart and roster management
 */

// ============================================
// NEW DEPTH CHART SYSTEM (v2)
// ============================================

// Depth Chart Slots
export {
  DepthChartSlot,
  SLOT_ELIGIBLE_POSITIONS,
  SLOT_INFO,
  getSlotsByCategory,
  getSlotsBySubcategory,
  getRequiredSlots,
  getSpecialistSlots,
  canFillSlot,
  getPrimaryPositionForSlot,
} from './DepthChartSlots';
export type { SlotInfo } from './DepthChartSlots';

// Formation Packages
export {
  OffensivePersonnel,
  DefensivePackage,
  OFFENSIVE_PACKAGES,
  DEFENSIVE_PACKAGES,
  SPECIAL_TEAMS_PACKAGES,
  getBaseOffensivePackage,
  getBaseDefensivePackage,
  getSituationalDefensivePackage,
  getOffensivePackagesByUsage,
  getDefensivePackagesByUsage,
} from './FormationPackages';
export type { PersonnelPackage } from './FormationPackages';

// Depth Chart Types
export type {
  DepthChart as DepthChartV2,
  DepthChartAssignment,
  FormationOverride,
  LegacyDepthChart,
  DepthChartGroupView,
  DepthChartSubcategoryView,
  DepthChartSlotView,
  PlayerDepthStatus,
  DepthChartValidation,
  AutoFillResult,
  DepthChartDiff,
  DepthChartGenerationOptions,
  GameLineup,
  PackageLineup,
} from './DepthChartTypes';

// Depth Chart Service (main business logic)
export {
  // Rating calculations
  getPositionFlexibilityRating,
  calculatePlayerRating,
  calculateSlotEffectiveness,
  getEligiblePlayersForSlot,
  rankPlayersForSlot,
  // Depth chart creation
  createEmptyDepthChart,
  generateDepthChart as generateDepthChartV2,
  // Modifications
  assignPlayerToSlot,
  removePlayerFromDepthChart,
  swapPlayers as swapPlayersV2,
  toggleSlotLock,
  addFormationOverride,
  removeFormationOverride,
  // Queries
  getPlayerForSlot,
  getPlayerForSlotInFormation,
  getPlayerSlots,
  getPlayerDepthStatus,
  getStarters as getStartersV2,
  // UI views
  generateCategoryView,
  // Validation
  validateDepthChart,
  // Migration
  migrateLegacyDepthChart,
  // Game lineup
  getOffensiveLineup,
  getDefensiveLineup,
  getGameStarters,
  selectStartingLineupFromDepthChart,
} from './DepthChartService';

// ============================================
// LEGACY DEPTH CHART SYSTEM (v1) - Backwards Compatibility
// ============================================

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
