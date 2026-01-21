/**
 * Screens Index
 * Export all screen components
 */

export { StartScreen } from './StartScreen';
export { TeamSelectionScreen } from './TeamSelectionScreen';
export { GMDashboardScreen, type DashboardAction } from './GMDashboardScreen';

// New unified game day screen (recommended for new integrations)
export { GameDayScreen, type GameDayScreenProps } from './GameDayScreen';

// Legacy game screens (deprecated - use GameDayScreen instead)
export { GamecastScreen, type GamecastScreenProps } from './GamecastScreen';
export {
  DraftBoardScreen,
  type DraftBoardScreenProps,
  type DraftBoardProspect,
} from './DraftBoardScreen';
export { PlayerProfileScreen, type PlayerProfileScreenProps } from './PlayerProfileScreen';
export { InterviewScreen, type InterviewScreenProps } from './InterviewScreen';
export { CoachHiringScreen, type CoachHiringScreenProps } from './CoachHiringScreen';
