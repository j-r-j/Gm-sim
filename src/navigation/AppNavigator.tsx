/**
 * AppNavigator
 * Main navigation stack for the app
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../styles';
import { RootStackParamList } from './types';

// Wrapper screens that adapt existing screens to navigation
import {
  StartScreenWrapper,
  TeamSelectionScreenWrapper,
  SettingsScreenWrapper,
  DashboardScreenWrapper,
  RosterScreenWrapper,
  StaffScreenWrapper,
  FinancesScreenWrapper,
  ScheduleScreenWrapper,
  StandingsScreenWrapper,
  NewsScreenWrapper,
  GamecastScreenWrapper,
  PlayoffBracketScreenWrapper,
  TradeScreenWrapper,
  DraftBoardScreenWrapper,
  DraftRoomScreenWrapper,
  FreeAgencyScreenWrapper,
  PlayerProfileScreenWrapper,
  ProspectDetailScreenWrapper,
  OffseasonScreenWrapper,
  SeasonRecapScreenWrapper,
  CareerSummaryScreenWrapper,
  FiredScreenWrapper,
  CoachProfileScreenWrapper,
  CoachHiringScreenWrapper,
  DepthChartScreenWrapper,
  OwnerRelationsScreenWrapper,
  ContractManagementScreenWrapper,
  OTAsScreenWrapper,
  TrainingCampScreenWrapper,
  PreseasonScreenWrapper,
  FinalCutsScreenWrapper,
  ScoutingReportsScreenWrapper,
  BigBoardScreenWrapper,
  RFAScreenWrapper,
  CompPickTrackerScreenWrapper,
  RumorMillScreenWrapper,
  WeeklyDigestScreenWrapper,
  CoachingTreeScreenWrapper,
  JobMarketScreenWrapper,
  InterviewScreenWrapper,
  CareerLegacyScreenWrapper,
  CombineScreenWrapper,
  StatsScreenWrapper,
  WeekGamesScreenWrapper,
  WeekSummaryScreenWrapper,
} from './ScreenWrappers';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Default screen options for consistent styling
 */
const defaultScreenOptions = {
  headerShown: false, // Screens have their own headers for now
  contentStyle: { backgroundColor: colors.background },
  animation: 'slide_from_right' as const,
};

/**
 * AppNavigator component
 * Defines all navigation routes
 */
export function AppNavigator(): React.JSX.Element {
  return (
    <Stack.Navigator screenOptions={defaultScreenOptions} initialRouteName="Start">
      {/* Pre-game screens */}
      <Stack.Screen name="Start" component={StartScreenWrapper} />
      <Stack.Screen name="TeamSelection" component={TeamSelectionScreenWrapper} />
      <Stack.Screen name="Settings" component={SettingsScreenWrapper} />

      {/* Main game screens */}
      <Stack.Screen name="Dashboard" component={DashboardScreenWrapper} />
      <Stack.Screen name="Roster" component={RosterScreenWrapper} />
      <Stack.Screen name="Staff" component={StaffScreenWrapper} />
      <Stack.Screen name="Finances" component={FinancesScreenWrapper} />
      <Stack.Screen name="Schedule" component={ScheduleScreenWrapper} />
      <Stack.Screen name="Standings" component={StandingsScreenWrapper} />
      <Stack.Screen name="Stats" component={StatsScreenWrapper} />
      <Stack.Screen name="News" component={NewsScreenWrapper} />
      <Stack.Screen name="Gamecast" component={GamecastScreenWrapper} />
      <Stack.Screen name="PlayoffBracket" component={PlayoffBracketScreenWrapper} />
      <Stack.Screen name="Trade" component={TradeScreenWrapper} />

      {/* Draft screens */}
      <Stack.Screen name="DraftBoard" component={DraftBoardScreenWrapper} />
      <Stack.Screen name="DraftRoom" component={DraftRoomScreenWrapper} />

      {/* Free Agency */}
      <Stack.Screen name="FreeAgency" component={FreeAgencyScreenWrapper} />

      {/* Profile screens */}
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreenWrapper} />
      <Stack.Screen name="ProspectDetail" component={ProspectDetailScreenWrapper} />
      <Stack.Screen name="CoachProfile" component={CoachProfileScreenWrapper} />
      <Stack.Screen name="CoachHiring" component={CoachHiringScreenWrapper} />
      <Stack.Screen name="CoachingTree" component={CoachingTreeScreenWrapper} />

      {/* Depth Chart */}
      <Stack.Screen name="DepthChart" component={DepthChartScreenWrapper} />

      {/* Owner Relations */}
      <Stack.Screen name="OwnerRelations" component={OwnerRelationsScreenWrapper} />

      {/* Contract Management */}
      <Stack.Screen name="ContractManagement" component={ContractManagementScreenWrapper} />

      {/* Offseason */}
      <Stack.Screen name="Offseason" component={OffseasonScreenWrapper} />
      <Stack.Screen name="SeasonRecap" component={SeasonRecapScreenWrapper} />
      <Stack.Screen name="OTAs" component={OTAsScreenWrapper} />
      <Stack.Screen name="TrainingCamp" component={TrainingCampScreenWrapper} />
      <Stack.Screen name="Preseason" component={PreseasonScreenWrapper} />
      <Stack.Screen name="FinalCuts" component={FinalCutsScreenWrapper} />

      {/* Scouting */}
      <Stack.Screen name="ScoutingReports" component={ScoutingReportsScreenWrapper} />
      <Stack.Screen name="BigBoard" component={BigBoardScreenWrapper} />
      <Stack.Screen name="Combine" component={CombineScreenWrapper} />

      {/* Free Agency */}
      <Stack.Screen name="RFA" component={RFAScreenWrapper} />
      <Stack.Screen name="CompPickTracker" component={CompPickTrackerScreenWrapper} />

      {/* News & Rumors */}
      <Stack.Screen name="RumorMill" component={RumorMillScreenWrapper} />
      <Stack.Screen name="WeeklyDigest" component={WeeklyDigestScreenWrapper} />

      {/* Career */}
      <Stack.Screen name="CareerSummary" component={CareerSummaryScreenWrapper} />
      <Stack.Screen name="Fired" component={FiredScreenWrapper} />
      <Stack.Screen name="JobMarket" component={JobMarketScreenWrapper} />
      <Stack.Screen name="Interview" component={InterviewScreenWrapper} />
      <Stack.Screen name="CareerLegacy" component={CareerLegacyScreenWrapper} />

      {/* Week/Season Progression */}
      <Stack.Screen name="WeekGames" component={WeekGamesScreenWrapper} />
      <Stack.Screen name="WeekSummary" component={WeekSummaryScreenWrapper} />
    </Stack.Navigator>
  );
}

export default AppNavigator;
