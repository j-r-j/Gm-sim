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
  OffseasonScreenWrapper,
  CareerSummaryScreenWrapper,
  FiredScreenWrapper,
  CoachProfileScreenWrapper,
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
      <Stack.Screen name="CoachProfile" component={CoachProfileScreenWrapper} />

      {/* Offseason */}
      <Stack.Screen name="Offseason" component={OffseasonScreenWrapper} />

      {/* Career */}
      <Stack.Screen name="CareerSummary" component={CareerSummaryScreenWrapper} />
      <Stack.Screen name="Fired" component={FiredScreenWrapper} />

      {/* ==================
          NEW SCREENS (Tier 1+)
          These will be added as we implement them
          ================== */}
    </Stack.Navigator>
  );
}

export default AppNavigator;
