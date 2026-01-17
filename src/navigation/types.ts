/**
 * Navigation Types
 * Defines all routes and their parameters for React Navigation
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * Root Stack Parameter List
 * Defines all screens and their expected params
 */
export type RootStackParamList = {
  // Pre-game screens
  Start: undefined;
  TeamSelection: undefined;
  Settings: undefined;

  // Main game screens
  Dashboard: undefined;
  Roster: undefined;
  Staff: undefined;
  Finances: undefined;
  Schedule: undefined;
  Standings: undefined;
  News: undefined;
  Gamecast: undefined;
  PlayoffBracket: undefined;
  Trade: undefined;

  // Draft screens
  DraftBoard: undefined;
  DraftRoom: undefined;

  // Free Agency
  FreeAgency: undefined;

  // Profile screens
  PlayerProfile: {
    playerId?: string;
    prospectId?: string;
  };

  // Offseason
  Offseason: undefined;

  // Career
  CareerSummary: undefined;
  Fired: undefined;

  // ==================
  // NEW SCREENS (Tier 1+)
  // ==================

  // Coach screens (Tier 1.1, 1.2)
  CoachProfile: {
    coachId: string;
  };
  CoachHiring: {
    vacancyRole?: string;
  };

  // Depth Chart (Tier 1.3)
  DepthChart: undefined;

  // Owner Relations (Tier 1.4)
  OwnerRelations: undefined;

  // Contract Management (Tier 1.5)
  ContractManagement: undefined;

  // Offseason Phases (Tier 2)
  OTAs: undefined;
  TrainingCamp: undefined;
  Preseason: undefined;
  FinalCuts: undefined;

  // Scouting (Tier 2)
  ScoutingReports: undefined;
  BigBoard: undefined;
  Combine: undefined;

  // Free Agency Advanced (Tier 2)
  RFA: undefined;
  CompPickTracker: undefined;

  // News/Rumors (Tier 3)
  RumorMill: undefined;
  WeeklyDigest: undefined;

  // Coaching Tree (Tier 3)
  CoachingTree: {
    coachId: string;
  };

  // Career (Tier 3)
  JobMarket: undefined;
  Interview: {
    teamId: string;
  };
  CareerLegacy: undefined;

  // Stats
  Stats: undefined;
};

/**
 * Screen props type helper
 * Usage: type Props = ScreenProps<'Dashboard'>
 */
export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

/**
 * Navigation prop type helper
 * For components that only need navigation (not route)
 */
export type NavigationProp = ScreenProps<keyof RootStackParamList>['navigation'];

/**
 * Route names as constants for type-safe navigation
 */
export const Routes = {
  // Pre-game
  Start: 'Start',
  TeamSelection: 'TeamSelection',
  Settings: 'Settings',

  // Main game
  Dashboard: 'Dashboard',
  Roster: 'Roster',
  Staff: 'Staff',
  Finances: 'Finances',
  Schedule: 'Schedule',
  Standings: 'Standings',
  News: 'News',
  Gamecast: 'Gamecast',
  PlayoffBracket: 'PlayoffBracket',
  Trade: 'Trade',

  // Draft
  DraftBoard: 'DraftBoard',
  DraftRoom: 'DraftRoom',

  // Free Agency
  FreeAgency: 'FreeAgency',

  // Profiles
  PlayerProfile: 'PlayerProfile',
  CoachProfile: 'CoachProfile',

  // Offseason
  Offseason: 'Offseason',
  OTAs: 'OTAs',
  TrainingCamp: 'TrainingCamp',
  Preseason: 'Preseason',
  FinalCuts: 'FinalCuts',

  // Hiring
  CoachHiring: 'CoachHiring',

  // Depth Chart
  DepthChart: 'DepthChart',

  // Owner
  OwnerRelations: 'OwnerRelations',

  // Contracts
  ContractManagement: 'ContractManagement',

  // Scouting
  ScoutingReports: 'ScoutingReports',
  BigBoard: 'BigBoard',
  Combine: 'Combine',

  // RFA
  RFA: 'RFA',
  CompPickTracker: 'CompPickTracker',

  // News
  RumorMill: 'RumorMill',
  WeeklyDigest: 'WeeklyDigest',

  // Coaching Tree
  CoachingTree: 'CoachingTree',

  // Career
  CareerSummary: 'CareerSummary',
  Fired: 'Fired',
  JobMarket: 'JobMarket',
  Interview: 'Interview',
  CareerLegacy: 'CareerLegacy',

  // Stats
  Stats: 'Stats',
} as const;
