/**
 * GM Sim App
 * NFL General Manager Simulation
 */

import React, { useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';

import { HomeScreen, type Screen } from './src/screens/HomeScreen';
import { GamecastScreen } from './src/screens/GamecastScreen';
import { DraftBoardScreen } from './src/screens/DraftBoardScreen';
import { PlayerProfileScreen } from './src/screens/PlayerProfileScreen';
import { mockGameSetup, mockProspects, mockPlayerProfile } from './src/utils/mockData';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);

  const navigateTo = useCallback((screen: Screen) => {
    setCurrentScreen(screen);
  }, []);

  const goHome = useCallback(() => {
    setCurrentScreen('home');
    setSelectedProspectId(null);
  }, []);

  // Home Screen
  if (currentScreen === 'home') {
    return (
      <>
        <StatusBar style="light" />
        <HomeScreen onNavigate={navigateTo} />
      </>
    );
  }

  // Gamecast Screen
  if (currentScreen === 'gamecast') {
    return (
      <>
        <StatusBar style="light" />
        <GamecastScreen
          gameSetup={mockGameSetup}
          gameInfo={{ week: 10, date: '2025-11-15' }}
          onBack={goHome}
          onGameEnd={(result) => {
            console.log('Game ended:', result.homeScore, '-', result.awayScore);
          }}
        />
      </>
    );
  }

  // Draft Board Screen
  if (currentScreen === 'draftBoard') {
    return (
      <>
        <StatusBar style="light" />
        <DraftBoardScreen
          prospects={mockProspects}
          draftYear={2025}
          onSelectProspect={(id) => {
            setSelectedProspectId(id);
            setCurrentScreen('playerProfile');
          }}
          onToggleFlag={(id) => {
            console.log('Toggle flag for:', id);
          }}
          onBack={goHome}
        />
      </>
    );
  }

  // Player Profile Screen
  if (currentScreen === 'playerProfile') {
    // If coming from draft board, find that prospect
    const prospect = selectedProspectId
      ? mockProspects.find((p) => p.id === selectedProspectId)
      : null;

    const profileData = prospect
      ? {
          playerId: prospect.id,
          firstName: prospect.name.split(' ')[0],
          lastName: prospect.name.split(' ').slice(1).join(' '),
          position: prospect.position,
          age: prospect.age,
          experience: 0,
          skills: prospect.skills,
          physical: prospect.physical!,
          physicalsRevealed: true,
          hiddenTraits: { positive: [], negative: [], revealedToUser: [] },
          collegeName: prospect.collegeName,
          draftYear: 2025,
          projectedRound: prospect.projectedRound,
          projectedPickRange: prospect.projectedPickRange,
          userTier: prospect.userTier,
          flagged: prospect.flagged,
        }
      : mockPlayerProfile;

    return (
      <>
        <StatusBar style="light" />
        <PlayerProfileScreen
          {...profileData}
          onBack={() => {
            if (selectedProspectId) {
              setSelectedProspectId(null);
              setCurrentScreen('draftBoard');
            } else {
              goHome();
            }
          }}
          onToggleFlag={() => {
            console.log('Toggle flag');
          }}
        />
      </>
    );
  }

  // Fallback to home
  return (
    <>
      <StatusBar style="light" />
      <HomeScreen onNavigate={navigateTo} />
    </>
  );
}
