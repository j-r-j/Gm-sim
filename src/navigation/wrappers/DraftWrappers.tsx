/**
 * Draft-Related Screen Wrappers
 *
 * Bridge components for draft-related screens that adapt them to React Navigation.
 * Extracted from ScreenWrappers.tsx for modularity.
 *
 * Includes:
 * - DraftBoardScreenWrapper
 * - DraftRoomScreenWrapper (with timer management, AI draft loops, state machines)
 * - ScoutingReportsScreenWrapper
 * - BigBoardScreenWrapper
 * - ProspectDetailScreenWrapper
 * - CombineScreenWrapper
 * - DraftTradeCalculatorScreenWrapper
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useGame } from '../GameContext';
import { ScreenProps } from '../types';
import { LoadingFallback, tryCompleteViewTask } from './shared';

// Screen imports
import { DraftBoardScreen } from '../../screens/DraftBoardScreen';
import {
  DraftRoomScreen,
  DraftRoomProspect,
  DraftPick as ScreenDraftPick,
  TradeOffer as ScreenTradeOffer,
  ScoutRecommendationDisplay,
  UserDraftedPick,
} from '../../screens/DraftRoomScreen';
import { ScoutingReportsScreen } from '../../screens/ScoutingReportsScreen';
import { BigBoardScreen } from '../../screens/BigBoardScreen';
import { SinglePlayerCardScreen } from '../../screens/SinglePlayerCardScreen';
import { CombineProDayScreen } from '../../screens/CombineProDayScreen';
import {
  DraftTradeCalculatorScreen,
  TradeCalcPick,
} from '../../screens/DraftTradeCalculatorScreen';

// Core model imports
import { GameState } from '../../core/models/game/GameState';
import { Team } from '../../core/models/team/Team';
import { Position } from '../../core/models/player/Position';
import { DraftPick as CoreDraftPick } from '../../core/models/league/DraftPick';

// Draft engine imports
import { Prospect, getOverallRanking, getPositionRanking } from '../../core/draft/Prospect';
import { DraftClass } from '../../core/draft/DraftClassGenerator';
import {
  DraftRoomState,
  DraftStatus,
  createDraftRoomState,
  startDraft,
  processAIPick,
  makeUserPick,
  updateTimer,
  continueAfterRoundBreak,
  pauseDraft as enginePauseDraft,
  resumeDraft as engineResumeDraft,
  acceptTradeOffer,
  rejectTradeOffer,
  generatePotentialTradeOffers,
  receiveAITradeOffer,
  DraftPickResult,
} from '../../core/draft/DraftRoomSimulator';
import { DraftOrderState, DraftYearState, getDraftOrder } from '../../core/draft/DraftOrderManager';
import {
  createAIDraftProfile,
  assessTeamNeeds,
  generateRandomPhilosophy,
  AIDraftProfile,
} from '../../core/draft/AIDraftStrategy';
import {
  createDraftClassMetaWithStrength,
  ClassStrength,
} from '../../core/draft/ClassStrengthSystem';

// Scouting imports
import { ScoutReport } from '../../core/scouting/ScoutReportGenerator';
import {
  DraftTier,
  DraftBoardViewModel,
  DraftBoardProspectView,
} from '../../core/scouting/DraftBoardManager';
import { NeedLevel, ProspectRanking } from '../../core/scouting/BigBoardGenerator';
import {
  generatePickRecommendations,
  ScoutDraftRecommendation,
} from '../../core/scouting/DraftRecommendationSystem';

// Combine imports
import {
  CombineResults,
  CombineGrade,
  MedicalGrade,
  CombineSummary,
} from '../../core/draft/CombineSimulator';
import { ProDayResults, ProDayType, ProDaySummary } from '../../core/draft/ProDaySimulator';

// Narrator imports
import {
  gradePickValue,
  generatePickAnnouncement,
  classifyPickValue,
  generateStealReachAlert,
  generateUserTargetTaken,
  WarRoomFeedEvent,
} from '../../core/draft/DraftDayNarrator';

// Utility imports
import {
  convertProspectsToDraftBoard,
  sortProspectsByRank,
  DraftBoardEnrichment,
} from '../../utils/prospectUtils';

// ============================================
// DRAFT BOARD SCREEN
// ============================================

export function DraftBoardScreenWrapper({
  navigation,
}: ScreenProps<'DraftBoard'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  // Auto-complete offseason view task when screen is visited
  useEffect(() => {
    if (gameState) {
      const updatedState = tryCompleteViewTask(gameState, 'DraftBoard');
      if (updatedState) {
        setGameState(updatedState);
        saveGameState(updatedState);
      }
    }
  }, []); // Only run on mount

  if (!gameState) {
    return <LoadingFallback message="Loading draft board..." />;
  }

  // Build enrichment from offseason data (combine results, scout reports)
  const enrichment: DraftBoardEnrichment = {};
  if (gameState.offseasonData?.combineResults) {
    enrichment.combineResults = gameState.offseasonData.combineResults;
  }

  const draftBoardProspects = sortProspectsByRank(
    convertProspectsToDraftBoard(gameState.prospects, enrichment)
  );

  return (
    <DraftBoardScreen
      prospects={draftBoardProspects}
      draftYear={gameState.league.calendar.currentYear}
      onSelectProspect={(id) => navigation.navigate('PlayerProfile', { prospectId: id })}
      onToggleFlag={async (id) => {
        const prospect = gameState.prospects[id];
        if (prospect) {
          const updatedState: GameState = {
            ...gameState,
            prospects: {
              ...gameState.prospects,
              [id]: {
                ...prospect,
                flagged: !prospect.flagged,
              },
            },
          };
          setGameState(updatedState);
          await saveGameState(updatedState);
        }
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

// ============================================
// DRAFT ROOM SCREEN
// ============================================

/** Draft speed mode for controlling draft flow */
type DraftSpeedMode = 'AUTO' | 'SKIP' | 'SKIP_TO_MY_PICK';

/** User pick timer (seconds) in AUTO mode */
const USER_PICK_TIMER_SECONDS = 10;

/** Delay between AI picks in ms */
const AI_PICK_DELAY_MS = 400;

/** Fast-forward delay for skip modes */
const FAST_FORWARD_DELAY_MS = 30;

/**
 * Builds a DraftOrderState from the flat gameState.draftPicks record
 */
function buildDraftOrderState(
  draftPicks: Record<string, CoreDraftPick>,
  teamIds: string[],
  currentYear: number
): DraftOrderState {
  const picks = Object.values(draftPicks);
  const draftYears = new Map<number, DraftYearState>();

  // Group picks by year
  const picksByYear = new Map<number, CoreDraftPick[]>();
  for (const pick of picks) {
    const yearPicks = picksByYear.get(pick.year) || [];
    yearPicks.push(pick);
    picksByYear.set(pick.year, yearPicks);
  }

  for (const [year, yearPicks] of picksByYear) {
    draftYears.set(year, {
      year,
      picks: yearPicks.sort((a, b) => (a.overallPick ?? 999) - (b.overallPick ?? 999)),
      compensatoryPicks: [],
      isFinalized: false,
    });
  }

  // Ensure the current year exists
  if (!draftYears.has(currentYear)) {
    draftYears.set(currentYear, {
      year: currentYear,
      picks: [],
      compensatoryPicks: [],
      isFinalized: false,
    });
  }

  return {
    currentYear,
    draftYears,
    faTransactions: [],
    teamIds,
  };
}

/**
 * Builds AI draft profiles for all non-user teams
 */
function buildAIProfiles(teamIds: string[], userTeamId: string): Map<string, AIDraftProfile> {
  const profiles = new Map<string, AIDraftProfile>();
  for (const teamId of teamIds) {
    if (teamId === userTeamId) continue;
    const needs = assessTeamNeeds(teamId, new Map(), new Map());
    const philosophy = generateRandomPhilosophy();
    profiles.set(teamId, createAIDraftProfile(teamId, needs, philosophy));
  }
  return profiles;
}

/**
 * Builds a DraftClass from the gameState prospects record
 */
function buildDraftClassFromProspects(
  prospects: Record<string, Prospect>,
  year: number
): DraftClass {
  const allPositions = Object.values(prospects).map((p) => p.player.position.toString());
  const uniquePositions = [...new Set(allPositions)];
  return {
    id: `draft-class-${year}`,
    year,
    meta: createDraftClassMetaWithStrength(year, uniquePositions, ClassStrength.AVERAGE),
    prospects: Object.values(prospects),
    collegePrograms: [],
    generatedAt: Date.now(),
  };
}

/**
 * Converts a core DraftPick + pick result to a screen display DraftPick
 */
function corePickToScreenPick(
  pick: CoreDraftPick,
  teams: Record<string, Team>,
  pickResults: DraftPickResult[]
): ScreenDraftPick {
  const team = teams[pick.currentTeamId];
  const result = pickResults.find((r) => r.pick.id === pick.id);
  const originalTeam =
    pick.originalTeamId !== pick.currentTeamId ? teams[pick.originalTeamId] : undefined;

  return {
    round: pick.round,
    pickNumber: pick.overallPick ?? 0,
    teamId: pick.currentTeamId,
    teamName: team ? `${team.city} ${team.nickname}` : pick.currentTeamId,
    teamAbbr: team ? team.abbreviation : pick.currentTeamId.slice(0, 3).toUpperCase(),
    originalTeamId: originalTeam ? pick.originalTeamId : undefined,
    originalTeamAbbr: originalTeam ? originalTeam.abbreviation : undefined,
    selectedProspectId: result?.prospect.id,
    selectedProspectName: result
      ? `${result.prospect.player.firstName} ${result.prospect.player.lastName}`
      : undefined,
  };
}

/**
 * Maps a Prospect to a DraftRoomProspect for display
 */
function prospectToDisplayProspect(p: Prospect, index: number): DraftRoomProspect {
  const overallRank = getOverallRanking(p, 'consensus');
  const posRank = getPositionRanking(p, 'consensus');
  return {
    id: p.id,
    name: `${p.player.firstName} ${p.player.lastName}`,
    position: p.player.position,
    collegeName: p.collegeName,
    projectedRound: p.consensusProjection?.projectedRound ?? null,
    projectedPickRange: p.consensusProjection?.projectedPickRange ?? null,
    userTier: p.userTier,
    flagged: p.flagged,
    positionRank: posRank?.rank ?? index + 1,
    overallRank: overallRank?.rank ?? index + 1,
    isDrafted: false,
  };
}

export function DraftRoomScreenWrapper({
  navigation,
}: ScreenProps<'DraftRoom'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  // DraftRoomState is the engine state - kept in a ref for synchronous access,
  // with a version counter in React state to trigger re-renders
  const draftStateRef = useRef<DraftRoomState | null>(null);
  const [, setRenderVersion] = useState(0);
  const forceRender = useCallback(() => setRenderVersion((v) => v + 1), []);

  const [speedMode, setSpeedMode] = useState<DraftSpeedMode>('AUTO');
  const [initialized, setInitialized] = useState(false);
  const draftCompleteHandled = useRef(false);

  // Guard refs to prevent infinite loops
  const tradeOffersGeneratedRef = useRef<string | null>(null);
  const scoutRecsGeneratedRef = useRef<string | null>(null);

  // New state for enriched data
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [cachedScoutRecs, setCachedScoutRecs] = useState<ScoutRecommendationDisplay[]>([]);
  const [feedEvents, setFeedEvents] = useState<WarRoomFeedEvent[]>([]);
  const lastPickCountRef = useRef(0);

  // Refs for timers
  const aiLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper to update draft state immutably
  const updateDraftState = useCallback(
    (newState: DraftRoomState) => {
      draftStateRef.current = newState;
      forceRender();
    },
    [forceRender]
  );

  // Cleanup timers
  const clearTimers = useCallback(() => {
    if (aiLoopRef.current) {
      clearTimeout(aiLoopRef.current);
      aiLoopRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Initialize draft state on mount
  useEffect(() => {
    if (!gameState || initialized) return;

    const year = gameState.league.calendar.currentYear;
    const teamIds = Object.keys(gameState.teams);
    const orderState = buildDraftOrderState(gameState.draftPicks, teamIds, year);
    const draftClass = buildDraftClassFromProspects(gameState.prospects, year);
    const aiProfiles = buildAIProfiles(teamIds, gameState.userTeamId);

    const timerConfig = {
      roundsOneTwo: USER_PICK_TIMER_SECONDS,
      roundsThreeFour: USER_PICK_TIMER_SECONDS,
      roundsFiveToSeven: USER_PICK_TIMER_SECONDS,
      enabled: true,
    };

    let state = createDraftRoomState(
      year,
      orderState,
      draftClass,
      aiProfiles,
      gameState.userTeamId,
      timerConfig
    );
    state = startDraft(state);

    updateDraftState(state);
    setInitialized(true);
  }, [gameState, initialized, updateDraftState]);

  // Process AI picks automatically
  const processNextAIPick = useCallback(() => {
    const state = draftStateRef.current;
    if (!state) return;
    if (state.status !== DraftStatus.IN_PROGRESS) return;
    if (!state.currentPick || state.currentPick.isUserPick) return;

    try {
      const newState = processAIPick(state);
      updateDraftState(newState);
    } catch {
      // If AI pick fails (no prospects), stop processing
    }
  }, [updateDraftState]);

  // Schedule next AI pick with delay
  const scheduleAIPick = useCallback(
    (delay: number) => {
      if (aiLoopRef.current) clearTimeout(aiLoopRef.current);
      aiLoopRef.current = setTimeout(() => {
        processNextAIPick();
      }, delay);
    },
    [processNextAIPick]
  );

  // Auto-advance AI picks and handle speed modes
  useEffect(() => {
    const state = draftStateRef.current;
    if (!state || !initialized) return;

    // Handle round break - auto-continue
    if (state.status === DraftStatus.ROUND_COMPLETE) {
      const continued = continueAfterRoundBreak(state);
      updateDraftState(continued);
      return;
    }

    // Handle draft complete
    if (state.status === DraftStatus.COMPLETED) {
      clearTimers();
      return;
    }

    if (state.status !== DraftStatus.IN_PROGRESS) return;
    if (!state.currentPick) return;

    if (!state.currentPick.isUserPick) {
      // AI pick - schedule with appropriate delay
      const delay =
        speedMode === 'SKIP' || speedMode === 'SKIP_TO_MY_PICK'
          ? FAST_FORWARD_DELAY_MS
          : AI_PICK_DELAY_MS;
      scheduleAIPick(delay);

      // Clear user timer during AI picks
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else {
      // User's pick - clear AI timer
      if (aiLoopRef.current) {
        clearTimeout(aiLoopRef.current);
        aiLoopRef.current = null;
      }

      // Handle SKIP mode - auto-draft BPA
      if (speedMode === 'SKIP') {
        const topProspect = state.availableProspects[0];
        if (topProspect) {
          try {
            const newState = makeUserPick(state, topProspect.id);
            updateDraftState(newState);
          } catch {
            // Pick failed
          }
        }
        return;
      }

      // Handle SKIP_TO_MY_PICK - we've arrived at user's pick, switch back to AUTO
      if (speedMode === 'SKIP_TO_MY_PICK') {
        setSpeedMode('AUTO');
      }

      // Generate trade offers once per pick (guarded by ref)
      const currentPickId = state.currentPick.pick.id;
      if (tradeOffersGeneratedRef.current !== currentPickId) {
        tradeOffersGeneratedRef.current = currentPickId;
        const offers = generatePotentialTradeOffers(state);
        if (offers.length > 0) {
          let updatedState = state;
          for (const offer of offers.slice(0, 2)) {
            updatedState = receiveAITradeOffer(updatedState, offer);
          }
          updateDraftState(updatedState);
        }
      }

      // AUTO mode - start user pick timer
      if (!timerRef.current && state.currentPick.timeRemaining !== null) {
        timerRef.current = setInterval(() => {
          const currentState = draftStateRef.current;
          if (!currentState || !currentState.currentPick?.isUserPick) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return;
          }
          const newState = updateTimer(currentState);
          updateDraftState(newState);
        }, 1000);
      }
    }

    return () => {
      if (aiLoopRef.current) {
        clearTimeout(aiLoopRef.current);
        aiLoopRef.current = null;
      }
    };
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  // Save draft results to gameState when draft completes
  useEffect(() => {
    const state = draftStateRef.current;
    if (!state || state.status !== DraftStatus.COMPLETED || !gameState) return;
    if (draftCompleteHandled.current) return;
    draftCompleteHandled.current = true;

    // Convert drafted prospects to players and assign to teams
    const updatedPlayers = { ...gameState.players };
    const updatedTeams = { ...gameState.teams };
    const updatedProspects = { ...gameState.prospects };

    for (const pickResult of state.picks) {
      const { prospect, teamId } = pickResult;
      const player = prospect.player;

      // Add player to the players record
      updatedPlayers[player.id] = player;

      // Add to team roster
      const team = updatedTeams[teamId];
      if (team) {
        updatedTeams[teamId] = {
          ...team,
          rosterPlayerIds: [...team.rosterPlayerIds, player.id],
        };
      }

      // Remove from prospects
      delete updatedProspects[prospect.id];
    }

    const updatedGameState: GameState = {
      ...gameState,
      players: updatedPlayers,
      teams: updatedTeams,
      prospects: updatedProspects,
    };

    setGameState(updatedGameState);
    saveGameState(updatedGameState);

    Alert.alert('Draft Complete', 'The draft has concluded! All picks have been saved.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }, [draftStateRef.current?.status, gameState, setGameState, saveGameState, navigation]);

  if (!gameState || !initialized || !draftStateRef.current) {
    return <LoadingFallback message="Loading draft room..." />;
  }

  const draftState = draftStateRef.current;
  const allPicks = getDraftOrder(draftState.orderState, draftState.year);

  // Map current pick
  const currentPick: ScreenDraftPick = draftState.currentPick
    ? corePickToScreenPick(draftState.currentPick.pick, gameState.teams, draftState.picks)
    : {
        round: 1,
        pickNumber: 1,
        teamId: gameState.userTeamId,
        teamName: '',
        teamAbbr: '',
      };

  // Map recent picks (last 5 completed)
  const recentPicks: ScreenDraftPick[] = draftState.picks
    .slice(-5)
    .map((result) => corePickToScreenPick(result.pick, gameState.teams, draftState.picks));

  // Map upcoming picks (next 5 after current)
  const currentPickIndex = draftState.currentPick
    ? allPicks.findIndex((p) => p.id === draftState.currentPick!.pick.id)
    : -1;
  const upcomingCorePicks =
    currentPickIndex >= 0 ? allPicks.slice(currentPickIndex + 1, currentPickIndex + 6) : [];
  const upcomingPicks: ScreenDraftPick[] = upcomingCorePicks.map((p) =>
    corePickToScreenPick(p as CoreDraftPick, gameState.teams, draftState.picks)
  );

  // Map available prospects
  const availableProspects: DraftRoomProspect[] = draftState.availableProspects.map((p, index) =>
    prospectToDisplayProspect(p, index)
  );

  // Map trade offers
  const tradeOffers: ScreenTradeOffer[] = draftState.pendingTradeOffers.map((pending, index) => ({
    tradeId: String(index),
    proposingTeam: {
      id: pending.offer.offeringTeamId,
      name: gameState.teams[pending.offer.offeringTeamId]
        ? `${gameState.teams[pending.offer.offeringTeamId].city} ${gameState.teams[pending.offer.offeringTeamId].nickname}`
        : pending.offer.offeringTeamId,
      abbr: gameState.teams[pending.offer.offeringTeamId]?.abbreviation ?? 'UNK',
    },
    offering: pending.offer.picksOffered.map((pick) => ({
      type: 'pick' as const,
      label: `Round ${pick.round} Pick${pick.overallPick ? ` #${pick.overallPick}` : ''}`,
    })),
    requesting: pending.offer.picksRequested.map((pick) => ({
      type: 'pick' as const,
      label: `Round ${pick.round} Pick${pick.overallPick ? ` #${pick.overallPick}` : ''}`,
    })),
    status: 'pending' as const,
    expiresIn: Math.max(0, Math.floor((pending.expiresAt - Date.now()) / 1000)),
  }));

  const isPaused = draftState.status === DraftStatus.PAUSED;

  // Generate scout recommendations once per pick (guarded)
  const currentPickId = draftState.currentPick?.pick.id ?? null;
  useEffect(() => {
    if (!draftState.currentPick?.isUserPick || !currentPickId) {
      setCachedScoutRecs([]);
      return;
    }
    if (scoutRecsGeneratedRef.current === currentPickId) return;
    scoutRecsGeneratedRef.current = currentPickId;

    const userScouts = Object.values(gameState.scouts).filter(
      (s) => s.teamId === gameState.userTeamId
    );
    if (userScouts.length === 0) {
      setCachedScoutRecs([]);
      return;
    }
    const pickRecs = generatePickRecommendations(
      userScouts,
      draftState.availableProspects,
      [],
      draftState.currentPick.overallPick,
      draftState.currentPick.round
    );
    setCachedScoutRecs(
      pickRecs.recommendations.map(
        (rec: ScoutDraftRecommendation): ScoutRecommendationDisplay => ({
          scoutName: rec.scoutName,
          scoutRole: rec.scoutRole,
          prospectId: rec.recommendedProspectId,
          prospectName: rec.recommendedProspectName,
          prospectPosition: rec.recommendedProspectPosition,
          reasoning: rec.reasoning,
          confidence: rec.confidence,
          isFocusBased: rec.isFocusBased,
          estimatedOverall: rec.estimatedOverall,
        })
      )
    );
  }, [currentPickId, draftState.currentPick?.isUserPick]);

  // Generate feed events when new picks are made
  useEffect(() => {
    if (draftState.picks.length <= lastPickCountRef.current) return;
    const newPicks = draftState.picks.slice(lastPickCountRef.current);
    lastPickCountRef.current = draftState.picks.length;

    const newEvents: WarRoomFeedEvent[] = [];
    for (const pickResult of newPicks) {
      const team = gameState.teams[pickResult.teamId];
      const teamName = team ? `${team.city} ${team.nickname}` : pickResult.teamId;
      const isUserTeam = pickResult.teamId === gameState.userTeamId;

      newEvents.push(generatePickAnnouncement(pickResult, teamName, isUserTeam));

      const projectedRound = pickResult.prospect.consensusProjection?.projectedRound ?? null;
      const projectedPickRange =
        pickResult.prospect.consensusProjection?.projectedPickRange ?? null;
      const alert = classifyPickValue(
        pickResult.pick.overallPick ?? 0,
        projectedRound,
        projectedPickRange
      );
      const alertEvent = generateStealReachAlert(pickResult, alert, teamName);
      if (alertEvent) newEvents.push(alertEvent);

      if (!isUserTeam && pickResult.prospect.flagged) {
        newEvents.push(generateUserTargetTaken(pickResult, teamName, null, null));
      }
    }

    if (newEvents.length > 0) {
      setFeedEvents((prev) => [...newEvents, ...prev]);
    }
  }, [draftState.picks.length]);

  // Compute team needs from roster position gaps
  const computedTeamNeeds: Position[] = useMemo(() => {
    const userTeam = gameState.teams[gameState.userTeamId];
    if (!userTeam) return [];
    const rosterPositions = userTeam.rosterPlayerIds
      .map((id) => gameState.players[id]?.position)
      .filter((p): p is Position => p !== undefined);

    // Also include drafted prospects from this draft
    const draftedPositions = draftState.picks
      .filter((p) => p.teamId === gameState.userTeamId)
      .map((p) => p.prospect.player.position);

    const allPositions = [...rosterPositions, ...draftedPositions];

    // Position targets (approximate NFL starter counts)
    const targets: Partial<Record<Position, number>> = {
      [Position.QB]: 2,
      [Position.RB]: 3,
      [Position.WR]: 5,
      [Position.TE]: 3,
      [Position.LT]: 2,
      [Position.LG]: 2,
      [Position.C]: 2,
      [Position.RG]: 2,
      [Position.RT]: 2,
      [Position.DE]: 4,
      [Position.DT]: 3,
      [Position.OLB]: 3,
      [Position.ILB]: 3,
      [Position.CB]: 5,
      [Position.FS]: 2,
      [Position.SS]: 2,
    };

    const needs: { pos: Position; gap: number }[] = [];
    for (const [pos, target] of Object.entries(targets)) {
      const count = allPositions.filter((p) => p === pos).length;
      const gap = (target as number) - count;
      if (gap > 0) {
        needs.push({ pos: pos as Position, gap });
      }
    }

    return needs.sort((a, b) => b.gap - a.gap).map((n) => n.pos);
  }, [gameState.teams, gameState.players, gameState.userTeamId, draftState.picks]);

  // Compute user drafted picks with grades
  const userDraftedPicks: UserDraftedPick[] = useMemo(() => {
    return draftState.picks
      .filter((p) => p.teamId === gameState.userTeamId)
      .map((pickResult) => {
        const prospect = pickResult.prospect;
        const pickGrade = gradePickValue(
          pickResult.pick.overallPick ?? 0,
          pickResult.pick.round,
          prospect,
          prospect.consensusProjection?.projectedRound ?? null,
          prospect.consensusProjection?.projectedPickRange ?? null
        );
        return {
          pickNumber: pickResult.pick.overallPick ?? 0,
          round: pickResult.pick.round,
          prospectName: `${prospect.player.firstName} ${prospect.player.lastName}`,
          prospectPosition: prospect.player.position,
          grade: pickGrade.grade,
          assessment: pickGrade.assessment,
        };
      });
  }, [draftState.picks, gameState.userTeamId]);

  // Clear selected prospect when pick changes
  useEffect(() => {
    setSelectedProspectId(null);
  }, [currentPickId]);

  // Handle drafting the selected prospect
  const handleDraftSelectedProspect = useCallback(() => {
    if (!selectedProspectId || !draftState.currentPick?.isUserPick) return;
    try {
      const newState = makeUserPick(draftStateRef.current!, selectedProspectId);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setSelectedProspectId(null);
      updateDraftState(newState);
    } catch {
      Alert.alert('Error', 'Could not make that selection.');
    }
  }, [selectedProspectId, draftState.currentPick?.isUserPick, updateDraftState]);

  return (
    <DraftRoomScreen
      currentPick={currentPick}
      userTeamId={gameState.userTeamId}
      recentPicks={recentPicks}
      upcomingPicks={upcomingPicks}
      availableProspects={availableProspects}
      tradeOffers={tradeOffers}
      autoPickEnabled={speedMode === 'SKIP'}
      timeRemaining={
        draftState.currentPick?.timeRemaining !== null
          ? draftState.currentPick?.timeRemaining
          : undefined
      }
      isPaused={isPaused}
      scoutRecommendations={cachedScoutRecs}
      feedEvents={feedEvents}
      selectedProspectId={selectedProspectId}
      currentRound={draftState.currentRound}
      totalPicks={allPicks.length}
      picksCompleted={draftState.picks.length}
      userDraftedPicks={userDraftedPicks}
      teamNeeds={computedTeamNeeds}
      onHighlightProspect={setSelectedProspectId}
      onDraftSelectedProspect={handleDraftSelectedProspect}
      onSelectProspect={(prospectId) => {
        if (!draftState.currentPick?.isUserPick) return;
        try {
          const newState = makeUserPick(draftState, prospectId);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          updateDraftState(newState);
        } catch {
          Alert.alert('Error', 'Could not make that selection.');
        }
      }}
      onViewProspect={(prospectId) => navigation.navigate('PlayerProfile', { prospectId })}
      onAcceptTrade={(tradeId) => {
        try {
          const newState = acceptTradeOffer(draftState, Number(tradeId));
          updateDraftState(newState);
        } catch {
          Alert.alert('Error', 'Could not accept trade.');
        }
      }}
      onRejectTrade={(tradeId) => {
        try {
          const newState = rejectTradeOffer(draftState, Number(tradeId));
          updateDraftState(newState);
        } catch {
          Alert.alert('Error', 'Could not reject trade.');
        }
      }}
      onCounterTrade={() => Alert.alert('Counter Trade', 'Counter trade feature coming soon.')}
      onProposeTrade={() => Alert.alert('Propose Trade', 'Trade proposal feature coming soon.')}
      onToggleAutoPick={() => {
        if (speedMode === 'SKIP') {
          setSpeedMode('AUTO');
        } else {
          clearTimers();
          setSpeedMode('SKIP');
        }
      }}
      onSkipToMyPick={() => {
        clearTimers();
        setSpeedMode('SKIP_TO_MY_PICK');
      }}
      onTogglePause={() => {
        if (isPaused) {
          try {
            const newState = engineResumeDraft(draftState);
            updateDraftState(newState);
          } catch {
            // Already not paused
          }
        } else {
          clearTimers();
          try {
            const newState = enginePauseDraft(draftState);
            updateDraftState(newState);
          } catch {
            // Already paused
          }
        }
      }}
      onBack={() => {
        clearTimers();
        navigation.goBack();
      }}
    />
  );
}

// ============================================
// SCOUTING REPORTS SCREEN
// ============================================

export function ScoutingReportsScreenWrapper({
  navigation,
}: ScreenProps<'ScoutingReports'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Scout Reports..." />;
  }

  // Generate scout reports from prospects
  const prospects = Object.values(gameState.prospects || {});
  const scouts = Object.values(gameState.scouts).filter(
    (scout) => scout.teamId === gameState.userTeamId
  );
  const primaryScout = scouts[0];

  // Create mock scout reports from prospects (Prospect has nested player property)
  const reports: ScoutReport[] = prospects.slice(0, 50).map((prospect, index) => {
    const isAutoReport = index % 3 !== 0; // 2/3 auto, 1/3 focus
    const scoutingHours = isAutoReport ? 2 : 8;

    // Calculate skill ranges from player skills (using perceived values)
    const player = prospect.player;
    const skillEntries = Object.values(player.skills);
    const getAvgSkill = (): number => {
      if (skillEntries.length === 0) return 65;
      const sum = skillEntries.reduce((acc, s) => acc + (s.perceivedMin + s.perceivedMax) / 2, 0);
      return Math.round(sum / skillEntries.length);
    };

    const overallAvg = getAvgSkill();
    const physicalAvg = Math.round((player.physical.speed || 70) * 0.5 + overallAvg * 0.5);
    const technicalAvg = overallAvg;

    // Add uncertainty based on report type
    const rangeWidth = isAutoReport ? 25 : 10;
    const confidenceLevel: 'low' | 'medium' | 'high' = isAutoReport
      ? 'low'
      : overallAvg >= 70
        ? 'high'
        : 'medium';

    // Build visible traits from hidden traits (HiddenTraits has positive/negative arrays)
    const allTraits = [
      ...(player.hiddenTraits?.positive || []).map((t) => ({ name: t, category: 'character' })),
      ...(player.hiddenTraits?.negative || []).map((t) => ({ name: t, category: 'character' })),
    ];
    const visibleTraits = allTraits.slice(0, isAutoReport ? 1 : allTraits.length);

    const projectedRound =
      prospect.consensusProjection?.projectedRound ||
      Math.max(1, Math.min(7, Math.ceil((100 - overallAvg) / 12)));

    return {
      id: `report-${prospect.id}`,
      prospectId: prospect.id,
      prospectName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      reportType: isAutoReport ? 'auto' : 'focus',
      generatedAt: Date.now() - index * 86400000,
      scoutId: primaryScout?.id || 'scout-1',
      scoutName: primaryScout ? `${primaryScout.firstName} ${primaryScout.lastName}` : 'Head Scout',
      physicalMeasurements: {
        height: `${Math.floor(player.physical.height / 12)}'${player.physical.height % 12}"`,
        weight: player.physical.weight,
        college: prospect.collegeName || 'Unknown',
        fortyYardDash: 4.3 + Math.random() * 0.7,
        verticalJump: 28 + Math.random() * 12,
      },
      skillRanges: {
        overall: {
          min: Math.max(0, overallAvg - rangeWidth),
          max: Math.min(99, overallAvg + rangeWidth),
          confidence: confidenceLevel,
        },
        physical: {
          min: Math.max(0, physicalAvg - rangeWidth),
          max: Math.min(99, physicalAvg + rangeWidth),
          confidence: confidenceLevel,
        },
        technical: {
          min: Math.max(0, technicalAvg - rangeWidth),
          max: Math.min(99, technicalAvg + rangeWidth),
          confidence: confidenceLevel,
        },
      },
      visibleTraits: visibleTraits.map((trait) => ({
        name: trait.name,
        category: trait.category as 'physical' | 'mental' | 'character' | 'skill',
        analysis: `Demonstrates ${trait.name.toLowerCase()} tendency`,
      })),
      hiddenTraitCount: Math.max(0, allTraits.length - visibleTraits.length),
      draftProjection: {
        roundMin: Math.max(1, projectedRound - (isAutoReport ? 1 : 0)),
        roundMax: Math.min(7, projectedRound + (isAutoReport ? 1 : 0)),
        pickRangeDescription:
          projectedRound === 1
            ? 'First Round'
            : projectedRound === 2
              ? 'Day 2 Pick'
              : projectedRound <= 4
                ? 'Day 3 Pick'
                : 'Late Round',
        overallGrade:
          overallAvg >= 80
            ? 'Elite Prospect'
            : overallAvg >= 70
              ? 'First-Round Talent'
              : overallAvg >= 60
                ? 'Day 2 Value'
                : 'Developmental',
      },
      confidence: {
        level: confidenceLevel,
        score: isAutoReport ? 40 : 75,
        factors: [
          {
            factor: isAutoReport ? 'Limited tape' : 'Full evaluation',
            impact: isAutoReport ? 'negative' : 'positive',
            description: isAutoReport
              ? 'Only basic game film reviewed'
              : 'Comprehensive scouting conducted',
          },
        ],
      },
      needsMoreScouting: isAutoReport && overallAvg >= 65,
      scoutingHours,
    };
  });

  return (
    <ScoutingReportsScreen
      gameState={gameState}
      reports={reports}
      onBack={() => navigation.goBack()}
      onProspectSelect={(prospectId) => navigation.navigate('PlayerProfile', { prospectId })}
      onRequestFocusScouting={(prospectId) => {
        const prospect = gameState.prospects[prospectId];
        Alert.alert(
          'Focus Scouting Requested',
          `A scout will be assigned to do a comprehensive evaluation of ${prospect?.player.firstName} ${prospect?.player.lastName}.`
        );
      }}
    />
  );
}

// ============================================
// BIG BOARD SCREEN
// ============================================

export function BigBoardScreenWrapper({ navigation }: ScreenProps<'BigBoard'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Big Board..." />;
  }

  // Generate draft board view model from prospects
  const prospects = Object.values(gameState.prospects || {});
  const draftYear = gameState.league.calendar.currentYear;

  // Build prospect views from prospects
  const prospectViews: DraftBoardProspectView[] = prospects.slice(0, 100).map((prospect, index) => {
    const player = prospect.player;
    const skillEntries = Object.values(player.skills);
    const avgSkill =
      skillEntries.length > 0
        ? Math.round(
            skillEntries.reduce((acc, s) => acc + (s.perceivedMin + s.perceivedMax) / 2, 0) /
              skillEntries.length
          )
        : 65;

    // Calculate tier based on projected round
    const projectedRound =
      prospect.consensusProjection?.projectedRound ||
      Math.max(1, Math.min(7, Math.ceil((100 - avgSkill) / 12)));

    const tier: DraftTier =
      projectedRound === 1 && avgSkill >= 80
        ? 'elite'
        : projectedRound === 1
          ? 'first_round'
          : projectedRound === 2
            ? 'second_round'
            : projectedRound <= 3
              ? 'day_two'
              : projectedRound <= 5
                ? 'day_three'
                : projectedRound <= 6
                  ? 'priority_fa'
                  : 'draftable';

    const rangeWidth = 15;
    const overallMin = Math.max(0, avgSkill - rangeWidth);
    const overallMax = Math.min(99, avgSkill + rangeWidth);

    const confidenceScore = prospect.scoutReportIds?.length > 0 ? 70 : 40;

    return {
      prospectId: prospect.id,
      prospectName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      userRank: index < 20 ? index + 1 : null,
      directorRank: index < 50 ? index + 1 : null,
      consensusRank: index + 1,
      overallRange: `${overallMin}-${overallMax}`,
      projectedRound: `${projectedRound}`,
      tier,
      confidence: confidenceScore >= 70 ? 'High' : confidenceScore >= 50 ? 'Med' : 'Low',
      confidenceScore,
      reportCount: prospect.scoutReportIds?.length || 0,
      hasFocusReport: (prospect.scoutReportIds?.length || 0) > 1,
      needsMoreScouting: confidenceScore < 60,
      isLocked: false,
      userNotes: prospect.userNotes || '',
      latestScoutId: '',
      latestScoutName: 'Head Scout',
      latestReportSummary: `OVR ${overallMin}-${overallMax} | Rd ${projectedRound}`,
    };
  });

  // Build view model
  const viewModel: DraftBoardViewModel = {
    teamId: gameState.userTeamId,
    draftYear,
    totalProspects: prospectViews.length,
    rankedProspects: prospectViews.filter((p) => p.userRank !== null).length,
    unrankedProspects: prospectViews.filter((p) => p.userRank === null).length,
    prospects: prospectViews,
    tierCounts: {
      elite: prospectViews.filter((p) => p.tier === 'elite').length,
      first_round: prospectViews.filter((p) => p.tier === 'first_round').length,
      second_round: prospectViews.filter((p) => p.tier === 'second_round').length,
      day_two: prospectViews.filter((p) => p.tier === 'day_two').length,
      day_three: prospectViews.filter((p) => p.tier === 'day_three').length,
      priority_fa: prospectViews.filter((p) => p.tier === 'priority_fa').length,
      draftable: prospectViews.filter((p) => p.tier === 'draftable').length,
    },
    positionCounts: prospectViews.reduce(
      (acc, p) => {
        acc[p.position] = (acc[p.position] || 0) + 1;
        return acc;
      },
      {} as Partial<Record<Position, number>>
    ),
    averageConfidence:
      prospectViews.length > 0
        ? Math.round(
            prospectViews.reduce((acc, p) => acc + p.confidenceScore, 0) / prospectViews.length
          )
        : 0,
    focusedCount: prospectViews.filter((p) => p.hasFocusReport).length,
    needsScoutingCount: prospectViews.filter((p) => p.needsMoreScouting).length,
  };

  // Build rankings (simplified)
  const rankings: ProspectRanking[] = prospectViews.slice(0, 50).map((p, i) => ({
    prospectId: p.prospectId,
    prospectName: p.prospectName,
    position: p.position,
    rawScore: p.confidenceScore,
    needAdjustedScore: p.confidenceScore,
    finalRank: i + 1,
    skillScore: p.confidenceScore,
    confidenceScore: p.confidenceScore,
    needBonus: 0,
    reliabilityWeight: 1,
    projectedRound: parseInt(p.projectedRound),
    tier: p.tier || 'draftable',
    reportCount: p.reportCount,
    hasFocusReport: p.hasFocusReport,
  }));

  // Build positional needs (mock based on roster composition)
  const userTeam = gameState.teams[gameState.userTeamId];
  const rosterPositions = userTeam.rosterPlayerIds
    .map((id) => gameState.players[id]?.position)
    .filter((p) => p !== undefined);

  const positionalNeeds: Partial<Record<Position, NeedLevel>> = {};
  for (const pos of Object.values(Position)) {
    const count = rosterPositions.filter((p) => p === pos).length;
    const need: NeedLevel =
      count === 0 ? 'critical' : count === 1 ? 'high' : count <= 3 ? 'moderate' : 'low';
    positionalNeeds[pos] = need;
  }

  return (
    <BigBoardScreen
      gameState={gameState}
      viewModel={viewModel}
      rankings={rankings}
      positionalNeeds={positionalNeeds}
      onBack={() => navigation.goBack()}
      onProspectSelect={(prospectId) => navigation.navigate('ProspectDetail', { prospectId })}
      onToggleLock={(prospectId) => {
        const prospect = gameState.prospects[prospectId];
        Alert.alert(
          'Ranking Locked',
          `${prospect?.player.firstName} ${prospect?.player.lastName}'s ranking has been locked on your board.`
        );
      }}
    />
  );
}

// ============================================
// PROSPECT DETAIL SCREEN
// ============================================

export function ProspectDetailScreenWrapper({
  navigation,
  route,
}: ScreenProps<'ProspectDetail'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();
  const { prospectId } = route.params;

  if (!gameState) {
    return <LoadingFallback message="Loading prospect..." />;
  }

  const prospect = gameState.prospects[prospectId];
  if (!prospect) {
    navigation.goBack();
    return <LoadingFallback message="Prospect not found..." />;
  }

  // Get user team's scouts
  const teamScouts = Object.values(gameState.scouts || {}).filter(
    (scout) => scout.teamId === gameState.userTeamId
  );

  // Build scout reports array (empty for now if not implemented)
  const scoutReports: ScoutReport[] = [];

  // Get assigned scout if any
  const assignedScout =
    teamScouts.find((scout) => scout.focusProspects.includes(prospectId)) || null;

  // Calculate focus progress if assigned
  let focusProgress = null;
  if (assignedScout) {
    // Mock progress (would come from game state in full implementation)
    focusProgress = {
      prospectId,
      scoutId: assignedScout.id,
      weeksCompleted: 1,
      weeksTotal: 3,
      currentPhase: 'film' as const,
      partialReport: null,
    };
  }

  // Get physical measurements
  const physical = prospect.player.physical || { height: '6\'0"', weight: 200 };
  const height =
    typeof physical.height === 'string'
      ? physical.height
      : `${Math.floor(physical.height / 12)}'${physical.height % 12}"`;
  const weight = typeof physical.weight === 'number' ? physical.weight : 200;

  // Calculate tier
  const skillEntries = Object.values(prospect.player.skills);
  const avgSkill =
    skillEntries.length > 0
      ? Math.round(
          skillEntries.reduce((acc, s) => acc + (s.perceivedMin + s.perceivedMax) / 2, 0) /
            skillEntries.length
        )
      : 65;

  const projectedRound =
    prospect.consensusProjection?.projectedRound ||
    Math.max(1, Math.min(7, Math.ceil((100 - avgSkill) / 12)));

  const tier: DraftTier =
    projectedRound === 1 && avgSkill >= 80
      ? 'elite'
      : projectedRound === 1
        ? 'first_round'
        : projectedRound === 2
          ? 'second_round'
          : projectedRound <= 3
            ? 'day_two'
            : projectedRound <= 5
              ? 'day_three'
              : projectedRound <= 6
                ? 'priority_fa'
                : 'draftable';

  const handleAssignScout = async (scoutId: string) => {
    const scout = gameState.scouts?.[scoutId];
    if (!scout) return;

    // Add prospect to scout's focus list
    const updatedScouts = {
      ...gameState.scouts,
      [scoutId]: {
        ...scout,
        focusProspects: [...scout.focusProspects, prospectId],
      },
    };

    const updatedState: GameState = {
      ...gameState,
      scouts: updatedScouts,
    };

    setGameState(updatedState);
    await saveGameState(updatedState);

    Alert.alert(
      'Scout Assigned',
      `${scout.firstName} ${scout.lastName} has been assigned to scout ${prospect.player.firstName} ${prospect.player.lastName}.`
    );
  };

  const handleToggleFlag = async () => {
    const updatedState: GameState = {
      ...gameState,
      prospects: {
        ...gameState.prospects,
        [prospectId]: {
          ...prospect,
          flagged: !prospect.flagged,
        },
      },
    };

    setGameState(updatedState);
    await saveGameState(updatedState);
  };

  const handleUpdateNotes = async (notes: string) => {
    const updatedState: GameState = {
      ...gameState,
      prospects: {
        ...gameState.prospects,
        [prospectId]: {
          ...prospect,
          userNotes: notes,
        },
      },
    };

    setGameState(updatedState);
    await saveGameState(updatedState);
  };

  const handleUpdateTier = async (newTier: string | null) => {
    const updatedState: GameState = {
      ...gameState,
      prospects: {
        ...gameState.prospects,
        [prospectId]: {
          ...prospect,
          userTier: newTier,
        },
      },
    };

    setGameState(updatedState);
    await saveGameState(updatedState);
  };

  // Calculate projected pick range
  const projectedPickRange = prospect.consensusProjection?.projectedPickRange || {
    min: (projectedRound - 1) * 32 + 1,
    max: projectedRound * 32,
  };

  return (
    <SinglePlayerCardScreen
      playerId={prospectId}
      firstName={prospect.player.firstName}
      lastName={prospect.player.lastName}
      position={prospect.player.position}
      age={prospect.player.age}
      collegeName={prospect.collegeName || 'Unknown'}
      height={height}
      weight={weight}
      skills={prospect.player.skills}
      physical={prospect.player.physical}
      physicalsRevealed={prospect.physicalsRevealed ?? false}
      hiddenTraits={prospect.player.hiddenTraits}
      tier={tier}
      projectedRound={projectedRound}
      projectedPickRange={projectedPickRange}
      userTier={prospect.userTier || null}
      userNotes={prospect.userNotes || ''}
      flagged={prospect.flagged || false}
      reports={scoutReports}
      focusProgress={focusProgress}
      assignedScout={assignedScout}
      availableScouts={teamScouts}
      isLocked={false}
      onBack={() => navigation.goBack()}
      onAssignScout={handleAssignScout}
      onToggleFlag={handleToggleFlag}
      onUpdateNotes={handleUpdateNotes}
      onUpdateTier={handleUpdateTier}
    />
  );
}

// ============================================
// COMBINE SCREEN
// ============================================

export function CombineScreenWrapper({ navigation }: ScreenProps<'Combine'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Combine Results..." />;
  }

  // Get prospects from game state
  const allProspects = Object.values(gameState.prospects);

  // Create mock combine results for demonstration
  const combineResults = new Map<string, CombineResults>();
  const proDayResults = new Map<string, ProDayResults>();

  // Generate mock results for top 50 prospects
  allProspects.slice(0, 50).forEach((prospect: Prospect, index: number) => {
    const invited = index < 35;
    if (invited) {
      combineResults.set(prospect.id, {
        prospectId: prospect.id,
        invited: true,
        participated: Math.random() > 0.05,
        measurements: {
          height: prospect.player.physical.height,
          weight: prospect.player.physical.weight,
          armLength: prospect.player.physical.armLength,
          handSize: prospect.player.physical.handSize,
          wingspan: prospect.player.physical.armLength * 2 + prospect.player.physical.height * 0.15,
        },
        workoutResults: {
          fortyYardDash: 4.4 + Math.random() * 0.4,
          benchPress: Math.floor(15 + Math.random() * 15),
          verticalJump: 30 + Math.random() * 12,
          broadJump: 100 + Math.random() * 30,
          twentyYardShuttle: 4.0 + Math.random() * 0.4,
          threeConeDrill: 6.7 + Math.random() * 0.6,
          sixtyYardShuttle: Math.random() > 0.5 ? 11 + Math.random() : null,
        },
        interviewImpressions: [],
        medicalEvaluation: {
          grade: Math.random() > 0.8 ? MedicalGrade.MINOR_CONCERNS : MedicalGrade.CLEAN,
          concerns: [],
          durabilityRating: 70 + Math.floor(Math.random() * 25),
          passedPhysical: true,
          flaggedConditions: [],
        },
        overallGrade: [
          CombineGrade.EXCEPTIONAL,
          CombineGrade.ABOVE_AVERAGE,
          CombineGrade.AVERAGE,
          CombineGrade.BELOW_AVERAGE,
        ][Math.floor(Math.random() * 4)],
      });
    }

    // Everyone gets a pro day
    proDayResults.set(prospect.id, {
      prospectId: prospect.id,
      collegeProgramId: prospect.collegeProgramId,
      workoutType: invited ? ProDayType.POSITION_WORKOUT : ProDayType.FULL_WORKOUT,
      measurements: {
        height: prospect.player.physical.height,
        weight: prospect.player.physical.weight,
        armLength: prospect.player.physical.armLength,
        handSize: prospect.player.physical.handSize,
        wingspan: prospect.player.physical.armLength * 2 + prospect.player.physical.height * 0.15,
      },
      workoutResults: {
        fortyYardDash: 4.4 + Math.random() * 0.4,
        benchPress: Math.floor(15 + Math.random() * 15),
        verticalJump: 30 + Math.random() * 12,
        broadJump: 100 + Math.random() * 30,
        twentyYardShuttle: 4.0 + Math.random() * 0.4,
        threeConeDrill: 6.7 + Math.random() * 0.6,
        sixtyYardShuttle: null,
      },
      positionWorkouts: {
        receivingDrills: {
          catchRate: 75 + Math.random() * 20,
          routeRunning: 5 + Math.random() * 4,
          handsGrade: 5 + Math.random() * 4,
        },
      },
      attendance: Array.from({ length: 10 + Math.floor(Math.random() * 10) }, (_, i) => ({
        teamId: `team-${i}`,
        attendeeLevel: 'area_scout' as const,
        privateWorkoutRequested: Math.random() > 0.9,
      })),
      overallGrade: 5 + Math.random() * 4,
      observations: ['Good energy throughout workout', 'Showed natural hands'],
      date: Date.now(),
    });
  });

  const combineSummary: CombineSummary = {
    totalInvited: 35,
    totalParticipated: 33,
    gradeDistribution: {
      [CombineGrade.EXCEPTIONAL]: 3,
      [CombineGrade.ABOVE_AVERAGE]: 8,
      [CombineGrade.AVERAGE]: 15,
      [CombineGrade.BELOW_AVERAGE]: 5,
      [CombineGrade.POOR]: 2,
      [CombineGrade.DID_NOT_PARTICIPATE]: 2,
    },
    medicalRedFlags: 3,
    averageFortyTime: 4.58,
  };

  const proDaySummary: ProDaySummary = {
    totalProDays: 50,
    averageGrade: 6.5,
    fullWorkouts: 15,
    positionWorkouts: 30,
    privateWorkoutsRequested: 8,
  };

  return (
    <CombineProDayScreen
      gameState={gameState}
      prospects={allProspects.slice(0, 50)}
      combineResults={combineResults}
      proDayResults={proDayResults}
      combineSummary={combineSummary}
      proDaySummary={proDaySummary}
      onBack={() => navigation.goBack()}
      onProspectSelect={(prospectId) => navigation.navigate('PlayerProfile', { prospectId })}
    />
  );
}

// ============================================
// DRAFT TRADE CALCULATOR SCREEN
// ============================================

export function DraftTradeCalculatorScreenWrapper({
  navigation,
}: ScreenProps<'DraftTradeCalculator'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading trade calculator..." />;
  }

  const userTeamId = gameState.userTeamId;
  const userTeam = gameState.teams[userTeamId];

  // Map user's draft picks to TradeCalcPick format
  const picks: TradeCalcPick[] = Object.values(gameState.draftPicks)
    .filter((pick) => pick.currentTeamId === userTeamId)
    .map((pick) => ({
      id: pick.id,
      round: pick.round,
      pickNumber: pick.overallPick,
      year: pick.year,
      teamAbbreviation: userTeam.abbreviation,
      label:
        pick.originalTeamId !== userTeamId
          ? `Round ${pick.round} (via ${gameState.teams[pick.originalTeamId]?.abbreviation ?? 'trade'})`
          : `Round ${pick.round}`,
    }))
    .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.round - b.round));

  return <DraftTradeCalculatorScreen picks={picks} onBack={() => navigation.goBack()} />;
}
