/**
 * Shared utilities for screen wrappers
 * Extracted from ScreenWrappers.tsx for reuse across wrapper files
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSize } from '../../styles';
import { GameState } from '../../core/models/game/GameState';
import {
  completeTask as completeOffseasonTask,
  TaskTargetScreen,
  getCurrentPhaseTasks,
} from '../../core/offseason/OffSeasonPhaseManager';
import { advanceWeek } from '../../core/season/WeekSimulator';
import {
  createNewsFeedState,
  generateAndAddLeagueNews,
  advanceNewsFeedWeek,
} from '../../core/news/NewsFeedManager';
import { LeagueNewsContext } from '../../core/news/NewsGenerators';
import {
  createPatienceMeterState,
  updatePatienceValue,
} from '../../core/career/PatienceMeterManager';
import {
  shouldFire,
  createFiringRecord,
  createDefaultTenureStats,
  FiringContext,
  FiringRecord,
} from '../../core/career/FiringMechanics';
import { processWeeklyWaiverWire } from '../../core/roster/WaiverWireManager';
import { processWeeklyTradeOffers } from '../../core/trade/AITradeOfferGenerator';
import { processWeeklyAwards } from '../../core/season/WeeklyAwards';

/**
 * Result of processing week end, including potential firing info
 */
export interface ProcessWeekEndResult {
  state: GameState;
  fired: boolean;
  firingRecord: FiringRecord | null;
}

/**
 * Consolidates all weekly systems into a single state transition.
 * Called when advancing from one week to the next (after games are complete).
 */
export function processWeekEnd(gameState: GameState): ProcessWeekEndResult {
  let state = gameState;
  const { calendar, schedule } = state.league;
  const newWeek = calendar.currentWeek + 1;
  let newPhase = calendar.currentPhase;

  // Handle phase transitions
  if (newPhase === 'regularSeason' && newWeek > 18) {
    newPhase = 'playoffs';
  }

  // 1. Process injury recovery
  const advanceResult = advanceWeek(calendar.currentWeek, state);
  const updatedPlayers = { ...state.players };

  for (const recoveredPlayerId of advanceResult.recoveredPlayers) {
    const player = updatedPlayers[recoveredPlayerId];
    if (player) {
      updatedPlayers[recoveredPlayerId] = {
        ...player,
        injuryStatus: {
          ...player.injuryStatus,
          severity: 'none',
          weeksRemaining: 0,
        },
      };
    }
  }

  // Decrement weeks remaining for players still injured
  for (const playerId of Object.keys(updatedPlayers)) {
    const player = updatedPlayers[playerId];
    if (
      player.injuryStatus.weeksRemaining > 0 &&
      !advanceResult.recoveredPlayers.includes(playerId)
    ) {
      updatedPlayers[playerId] = {
        ...player,
        injuryStatus: {
          ...player.injuryStatus,
          weeksRemaining: player.injuryStatus.weeksRemaining - 1,
        },
      };
    }
  }

  // 2. Generate news
  let updatedNewsFeed =
    state.newsFeed || createNewsFeedState(calendar.currentYear, calendar.currentWeek);

  const updatedTeams = { ...state.teams };
  if (calendar.currentPhase === 'regularSeason' || calendar.currentPhase === 'playoffs') {
    const userTeam = updatedTeams[state.userTeamId];
    if (userTeam) {
      const userGameNews: LeagueNewsContext = {
        teamId: state.userTeamId,
        teamName: `${userTeam.city} ${userTeam.nickname}`,
        winStreak:
          userTeam.currentRecord.wins > userTeam.currentRecord.losses
            ? userTeam.currentRecord.wins
            : undefined,
      };
      updatedNewsFeed = generateAndAddLeagueNews(updatedNewsFeed, userGameNews);
    }
  }

  // 3. Update patience meter
  let updatedPatienceMeter = state.patienceMeter;
  const userTeam = updatedTeams[state.userTeamId];
  const userOwnerId = `owner-${userTeam.abbreviation}`;
  const userOwner = state.owners[userOwnerId];

  if (
    (calendar.currentPhase === 'regularSeason' || calendar.currentPhase === 'playoffs') &&
    userTeam &&
    userOwner
  ) {
    if (!updatedPatienceMeter) {
      updatedPatienceMeter = createPatienceMeterState(
        userOwnerId,
        userOwner.patienceMeter || 50,
        calendar.currentWeek,
        calendar.currentYear
      );
    }

    const wins = userTeam.currentRecord.wins;
    const losses = userTeam.currentRecord.losses;
    const winPct = wins + losses > 0 ? wins / (wins + losses) : 0.5;

    let patienceChange = 0;
    if (winPct >= 0.7) {
      patienceChange = 3;
    } else if (winPct >= 0.5) {
      patienceChange = 1;
    } else if (winPct >= 0.35) {
      patienceChange = -2;
    } else {
      patienceChange = -4;
    }

    const ownerPatience = userOwner.personality?.traits?.patience || 50;
    const modifier = ownerPatience < 30 ? 1.5 : ownerPatience > 70 ? 0.5 : 1.0;
    patienceChange = Math.round(patienceChange * modifier);

    const eventDesc =
      patienceChange > 0 ? `Team performance: ${wins}-${losses}` : `Concerns over ${losses} losses`;
    updatedPatienceMeter = updatePatienceValue(
      updatedPatienceMeter,
      patienceChange,
      calendar.currentWeek,
      calendar.currentYear,
      eventDesc
    );
  }

  // 3b. Check for firing after patience meter update
  let firedResult: { fired: boolean; firingRecord: FiringRecord | null } = {
    fired: false,
    firingRecord: null,
  };
  if (updatedPatienceMeter && userOwner) {
    const firingContext: FiringContext = {
      consecutiveLosingSeason: userTeam.currentRecord.losses > userTeam.currentRecord.wins ? 1 : 0,
      missedPlayoffsCount: 0,
      ownerDefianceCount: 0,
      majorScandals: 0,
      recentPatienceHistory: [],
      ownershipJustChanged: false,
      seasonExpectation: 'competitive',
    };

    const firingCheck = shouldFire(updatedPatienceMeter, firingContext, userOwner);

    if (firingCheck.shouldFire) {
      const tenureStats = state.tenureStats || createDefaultTenureStats();
      const record = createFiringRecord(
        state.userName,
        state.userTeamId,
        userOwner,
        calendar.currentYear,
        calendar.currentWeek,
        tenureStats,
        updatedPatienceMeter,
        firingContext,
        0,
        3000000
      );
      firedResult = { fired: true, firingRecord: record };
    }
  }

  updatedNewsFeed = advanceNewsFeedWeek(updatedNewsFeed, calendar.currentYear, newWeek);

  // 4. Process waiver wire
  let updatedWaiverWire = state.waiverWire;
  if (calendar.currentPhase === 'regularSeason' || calendar.currentPhase === 'playoffs') {
    const intermediateState: GameState = {
      ...state,
      league: {
        ...state.league,
        calendar: { ...calendar, currentWeek: newWeek, currentPhase: newPhase },
      },
      teams: updatedTeams,
      players: updatedPlayers,
    };
    const waiverResult = processWeeklyWaiverWire(intermediateState, newWeek);
    updatedWaiverWire = waiverResult.updatedWaiverState;
    if (waiverResult.updatedGameState?.teams) {
      Object.assign(updatedTeams, waiverResult.updatedGameState.teams);
    }
    if (waiverResult.updatedGameState?.players) {
      Object.assign(updatedPlayers, waiverResult.updatedGameState.players);
    }
  }

  // 5. Generate trade offers
  let updatedTradeOffers = state.tradeOffers;
  if (calendar.currentPhase === 'regularSeason' && newWeek <= 12) {
    const intermediateState: GameState = {
      ...state,
      league: {
        ...state.league,
        calendar: { ...calendar, currentWeek: newWeek, currentPhase: newPhase },
      },
      teams: updatedTeams,
      players: updatedPlayers,
    };
    const tradeResult = processWeeklyTradeOffers(intermediateState);
    updatedTradeOffers = tradeResult.tradeOffers;
  }

  // 6. Generate weekly awards
  let updatedWeeklyAwards = state.weeklyAwards;
  if (calendar.currentPhase === 'regularSeason' || calendar.currentPhase === 'playoffs') {
    const intermediateState: GameState = {
      ...state,
      league: {
        ...state.league,
        calendar: { ...calendar, currentWeek: newWeek, currentPhase: newPhase },
      },
      teams: updatedTeams,
      players: updatedPlayers,
    };
    updatedWeeklyAwards = processWeeklyAwards(intermediateState);
  }

  // 7. Build final state with advanced calendar
  state = {
    ...state,
    league: {
      ...state.league,
      calendar: {
        ...calendar,
        currentWeek: newWeek,
        currentPhase: newPhase,
      },
      schedule: schedule,
    },
    teams: updatedTeams,
    players: updatedPlayers,
    newsFeed: updatedNewsFeed,
    patienceMeter: updatedPatienceMeter || state.patienceMeter,
    waiverWire: updatedWaiverWire,
    tradeOffers: updatedTradeOffers,
    weeklyAwards: updatedWeeklyAwards,
    // Reset per-week decisions
    weeklyGamePlan: undefined,
    startSitDecisions: undefined,
    halftimeDecisions: undefined,
  };

  return {
    state,
    fired: firedResult.fired,
    firingRecord: firedResult.firingRecord,
  };
}

/**
 * Helper to mark offseason tasks as complete based on screen visits and conditions.
 * Returns the updated gameState if a task was completed, or the original state if not.
 */
export function tryCompleteOffseasonTask(gameState: GameState, taskId: string): GameState | null {
  const offseasonState = gameState.offseasonState;
  if (!offseasonState) return null;

  // Get current phase tasks
  const tasks = getCurrentPhaseTasks(offseasonState);
  const task = tasks.find((t) => t.id === taskId);

  // Only complete if task exists and is not already complete
  if (!task || task.isComplete) return null;

  // Mark task complete
  const newOffseasonState = completeOffseasonTask(offseasonState, taskId);

  return {
    ...gameState,
    offseasonState: newOffseasonState,
  };
}

/**
 * Find and complete a task by its target screen (for 'view' type tasks)
 */
export function tryCompleteViewTask(
  gameState: GameState,
  targetScreen: TaskTargetScreen
): GameState | null {
  const offseasonState = gameState.offseasonState;
  if (!offseasonState) return null;

  // Get current phase tasks
  const tasks = getCurrentPhaseTasks(offseasonState);

  // Find view tasks that target this screen and are not complete
  const viewTask = tasks.find(
    (t) => t.actionType === 'view' && t.targetScreen === targetScreen && !t.isComplete
  );

  if (!viewTask) return null;

  // Mark task complete
  const newOffseasonState = completeOffseasonTask(offseasonState, viewTask.id);

  return {
    ...gameState,
    offseasonState: newOffseasonState,
  };
}

/**
 * Validate that all blocking conditions are met before advancing offseason phase
 * Returns an error message if validation fails, or null if OK to advance
 */
export function validateOffseasonPhaseAdvance(gameState: GameState): string | null {
  const offseasonState = gameState.offseasonState;
  if (!offseasonState) return null;

  const currentPhase = offseasonState.currentPhase;

  // Check phase-specific validations
  if (currentPhase === 'final_cuts') {
    const userTeam = gameState.teams[gameState.userTeamId];
    const rosterSize = userTeam?.rosterPlayerIds?.length ?? 0;

    if (rosterSize > 53) {
      return `Roster must be 53 or fewer players before advancing. Current roster: ${rosterSize}. Please cut ${rosterSize - 53} player(s).`;
    }
  }

  // Add other phase validations here as needed
  // if (currentPhase === 'draft') {
  //   // Validate draft is complete
  // }

  return null;
}

/**
 * Loading fallback component for screens that need game state
 */
export function LoadingFallback({ message }: { message: string }): React.JSX.Element {
  return (
    <View style={styles.fallbackContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.fallbackText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  fallbackText: {
    marginTop: spacing.md,
    fontSize: fontSize.lg,
    color: colors.text,
  },
  fallbackSubtext: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});
