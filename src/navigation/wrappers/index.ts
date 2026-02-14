/**
 * Barrel export for all screen wrapper components.
 * Re-exports from domain-specific wrapper files for cleaner imports.
 */

// Shared utilities
export {
  LoadingFallback,
  tryCompleteOffseasonTask,
  tryCompleteViewTask,
  validateOffseasonPhaseAdvance,
  processWeekEnd,
} from './shared';
export type { ProcessWeekEndResult } from './shared';

// Auth/Startup wrappers
export {
  StartScreenWrapper,
  TeamSelectionScreenWrapper,
  StaffDecisionScreenWrapper,
  StaffHiringScreenWrapper,
  SettingsScreenWrapper,
} from './AuthWrappers';

// Dashboard
export { DashboardScreenWrapper } from './DashboardWrapper';

// Game flow wrappers
export {
  WeeklyScheduleScreenWrapper,
  LiveGameSimulationScreenWrapper,
  WeekSummaryScreenWrapper,
  GamePlanScreenWrapper,
  StartSitScreenWrapper,
  WeeklyAwardsScreenWrapper,
  TradeOffersScreenWrapper,
  WaiverWireScreenWrapper,
} from './GameFlowWrappers';

// Draft wrappers
export {
  DraftBoardScreenWrapper,
  DraftRoomScreenWrapper,
  ScoutingReportsScreenWrapper,
  BigBoardScreenWrapper,
  ProspectDetailScreenWrapper,
  CombineScreenWrapper,
  DraftTradeCalculatorScreenWrapper,
} from './DraftWrappers';

// Roster wrappers
export {
  RosterScreenWrapper,
  DepthChartScreenWrapper,
  OwnerRelationsScreenWrapper,
  ContractManagementScreenWrapper,
  PlayerProfileScreenWrapper,
  PlayerComparisonScreenWrapper,
} from './RosterWrappers';

// Staff wrappers
export {
  StaffScreenWrapper,
  FinancesScreenWrapper,
  CoachProfileScreenWrapper,
  CoachHiringScreenWrapper,
  CoachingTreeScreenWrapper,
} from './StaffWrappers';

// Offseason wrappers
export {
  OffseasonScreenWrapper,
  SeasonRecapScreenWrapper,
  OTAsScreenWrapper,
  TrainingCampScreenWrapper,
  PreseasonScreenWrapper,
  FinalCutsScreenWrapper,
} from './OffseasonWrappers';

// Free agency wrappers
export {
  TradeScreenWrapper,
  FreeAgencyScreenWrapper,
  RFAScreenWrapper,
  CompPickTrackerScreenWrapper,
} from './FreeAgencyWrappers';

// Career wrappers
export {
  CareerSummaryScreenWrapper,
  FiredScreenWrapper,
  JobMarketScreenWrapper,
  InterviewScreenWrapper,
  CareerLegacyScreenWrapper,
  ChampionshipCelebrationScreenWrapper,
  SeasonOverScreenWrapper,
  SeasonHistoryScreenWrapper,
  HallOfFameScreenWrapper,
} from './CareerWrappers';

// Info wrappers
export {
  ScheduleScreenWrapper,
  StandingsScreenWrapper,
  NewsScreenWrapper,
  GamecastScreenWrapper,
  PlayoffBracketScreenWrapper,
  StatsScreenWrapper,
  RumorMillScreenWrapper,
  WeeklyDigestScreenWrapper,
} from './InfoWrappers';
