/**
 * GM Sim App
 * NFL General Manager Simulation
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator, GameProvider, useGame } from './src/navigation';
import { colors } from './src/styles';

/**
 * Loading overlay component
 * Shows when global isLoading is true
 */
function LoadingOverlay(): React.JSX.Element | null {
  const { isLoading } = useGame();

  if (!isLoading) return null;

  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={colors.secondary} />
      <Text style={styles.loadingText}>Please wait...</Text>
    </View>
  );
}

/**
 * App content with navigation
 */
function AppContent(): React.JSX.Element {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      <LoadingOverlay />
    </>
  );
}

/**
 * Root App component
 */
export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <AppContent />
      </GameProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textOnPrimary,
  },
});
