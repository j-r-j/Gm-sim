/**
 * Dashboard Screen Wrapper
 * Extracted from ScreenWrappers.tsx
 *
 * Handles:
 * - Dashboard rendering
 * - Week advancement (handleAdvanceWeek)
 * - Game simulation (handleSimSeason, individual game sim)
 * - Playoff progression
 * - Season/offseason transitions
 * - Firing detection
 * - Navigation to all sub-screens
 */

import React, { useCallback } from 'react';
import { CommonActions } from '@react-navigation/native';
import { showAlert, showConfirm } from '@utils/alert';
import { useGame } from '../GameContext';
import { ScreenProps } from '../types';
import { LoadingFallback, validateOffseasonPhaseAdvance } from './shared';
import { GMDashboardScreen, DashboardAction } from '../../screens/GMDashboardScreen';
import { GameState } from '../../core/models/game/GameState';
import { simulateWeek, advanceWeek } from '../../core/season/WeekSimulator';
import {
  generatePlayoffBracket,
  simulatePlayoffRound,
  advancePlayoffRound,
  PlayoffRound,
} from '../../core/season/PlayoffGenerator';
import { calculateStandings as calculateDetailedStandings } from '../../core/season/StandingsCalculator';
import { updateSeasonStatsFromGame } from '../../core/game/SeasonStatsAggregator';
import {
  advancePhase as advanceOffseasonPhase,
  canAdvancePhase,
  PHASE_ORDER,
} from '../../core/offseason/OffSeasonPhaseManager';
import { enterPhase, initializeOffseason } from '../../core/offseason/OffseasonOrchestrator';
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
} from '../../core/career/FiringMechanics';
import { transitionToNewSeason } from '../../core/season/SeasonTransitionService';
import { processWeeklyWaiverWire } from '../../core/roster/WaiverWireManager';
import { processWeeklyTradeOffers } from '../../core/trade/AITradeOfferGenerator';
import { processWeeklyAwards } from '../../core/season/WeeklyAwards';

export function DashboardScreenWrapper({
  navigation,
}: ScreenProps<'Dashboard'>): React.JSX.Element {
  const { gameState, setGameState, saveGame, saveGameState, setIsLoading, setFiringRecord } =
    useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading game..." />;
  }

  // Advance week handler (complex logic moved from App.tsx)
  const handleAdvanceWeek = useCallback(async () => {
    if (!gameState) return;

    const { calendar, schedule } = gameState.league;

    if (!schedule) {
      showAlert('Error', 'No schedule available');
      return;
    }

    // For regular season and playoffs, check if we need to show games popup or directly advance
    if (
      (calendar.currentPhase === 'regularSeason' || calendar.currentPhase === 'playoffs') &&
      schedule.regularSeason
    ) {
      // Check if all games for current week are complete
      const weekGames = schedule.regularSeason.filter((g) => g.week === calendar.currentWeek);
      const allGamesComplete = weekGames.length > 0 && weekGames.every((g) => g.isComplete);

      // If games still need to be played/simulated, go to WeeklySchedule
      if (!allGamesComplete) {
        navigation.navigate('WeeklySchedule');
        return;
      }
      // Otherwise, fall through to advance the week directly
    }

    // For other phases (offseason, preseason), use the original direct advance logic
    setIsLoading(true);

    try {
      let newWeek = calendar.currentWeek;
      let newPhase = calendar.currentPhase;
      let newYear = calendar.currentYear;
      let offseasonPhase = calendar.offseasonPhase;

      const updatedTeams = { ...gameState.teams };
      const updatedSchedule = { ...schedule };
      let updatedPlayers = { ...gameState.players };

      // Original simulation logic (kept for non-regular-season phases)
      if ((newPhase === 'regularSeason' || newPhase === 'playoffs') && schedule.regularSeason) {
        const weekResults = simulateWeek(
          calendar.currentWeek,
          schedule,
          gameState,
          gameState.userTeamId,
          true
        );

        // Update team records
        for (const { game, result } of weekResults.games) {
          const homeTeam = updatedTeams[game.homeTeamId];
          const awayTeam = updatedTeams[game.awayTeamId];

          if (homeTeam && awayTeam) {
            if (result.isTie) {
              updatedTeams[game.homeTeamId] = {
                ...homeTeam,
                currentRecord: {
                  ...homeTeam.currentRecord,
                  ties: homeTeam.currentRecord.ties + 1,
                },
              };
              updatedTeams[game.awayTeamId] = {
                ...awayTeam,
                currentRecord: {
                  ...awayTeam.currentRecord,
                  ties: awayTeam.currentRecord.ties + 1,
                },
              };
            } else if (result.winnerId === game.homeTeamId) {
              updatedTeams[game.homeTeamId] = {
                ...homeTeam,
                currentRecord: {
                  ...homeTeam.currentRecord,
                  wins: homeTeam.currentRecord.wins + 1,
                },
              };
              updatedTeams[game.awayTeamId] = {
                ...awayTeam,
                currentRecord: {
                  ...awayTeam.currentRecord,
                  losses: awayTeam.currentRecord.losses + 1,
                },
              };
            } else {
              updatedTeams[game.homeTeamId] = {
                ...homeTeam,
                currentRecord: {
                  ...homeTeam.currentRecord,
                  losses: homeTeam.currentRecord.losses + 1,
                },
              };
              updatedTeams[game.awayTeamId] = {
                ...awayTeam,
                currentRecord: {
                  ...awayTeam.currentRecord,
                  wins: awayTeam.currentRecord.wins + 1,
                },
              };
            }
          }

          if (updatedSchedule.regularSeason) {
            updatedSchedule.regularSeason = updatedSchedule.regularSeason.map((g) =>
              g.gameId === game.gameId ? game : g
            );
          }
        }

        // Process injuries
        for (const injury of weekResults.injuryReport) {
          const player = updatedPlayers[injury.playerId];
          if (player) {
            updatedPlayers[injury.playerId] = {
              ...player,
              injuryStatus: {
                ...player.injuryStatus,
                severity: injury.weeksRemaining > 4 ? 'ir' : 'out',
                weeksRemaining: injury.weeksRemaining,
              },
            };
          }
        }
      }

      // Process injury recovery
      const advanceResult = advanceWeek(calendar.currentWeek, gameState);
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

      // Generate news
      let updatedNewsFeed =
        gameState.newsFeed || createNewsFeedState(calendar.currentYear, calendar.currentWeek);

      if ((newPhase === 'regularSeason' || newPhase === 'playoffs') && schedule.regularSeason) {
        const userTeam = updatedTeams[gameState.userTeamId];
        if (userTeam) {
          const userGameNews: LeagueNewsContext = {
            teamId: gameState.userTeamId,
            teamName: `${userTeam.city} ${userTeam.nickname}`,
            winStreak:
              userTeam.currentRecord.wins > userTeam.currentRecord.losses
                ? userTeam.currentRecord.wins
                : undefined,
          };
          updatedNewsFeed = generateAndAddLeagueNews(updatedNewsFeed, userGameNews);
        }
      }

      // Update patience meter
      let updatedPatienceMeter = gameState.patienceMeter;
      const userTeam = updatedTeams[gameState.userTeamId];
      const userOwnerId = `owner-${userTeam.abbreviation}`;
      const userOwner = gameState.owners[userOwnerId];

      if ((newPhase === 'regularSeason' || newPhase === 'playoffs') && userTeam && userOwner) {
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
          patienceChange > 0
            ? `Team performance: ${wins}-${losses}`
            : `Concerns over ${losses} losses`;
        updatedPatienceMeter = updatePatienceValue(
          updatedPatienceMeter,
          patienceChange,
          calendar.currentWeek,
          calendar.currentYear,
          eventDesc
        );

        // Check for firing
        const firingContext: FiringContext = {
          consecutiveLosingSeason: losses > wins ? 1 : 0,
          missedPlayoffsCount: 0,
          ownerDefianceCount: 0,
          majorScandals: 0,
          recentPatienceHistory: updatedPatienceMeter.history.slice(-5).map((h) => h.value),
          ownershipJustChanged: false,
          seasonExpectation: 'competitive',
        };

        const firingCheck = shouldFire(updatedPatienceMeter, firingContext, userOwner);

        if (firingCheck.shouldFire) {
          const tenureStats = gameState.tenureStats || createDefaultTenureStats();
          const record = createFiringRecord(
            gameState.userName,
            gameState.userTeamId,
            userOwner,
            calendar.currentYear,
            calendar.currentWeek,
            tenureStats,
            updatedPatienceMeter,
            firingContext,
            0,
            3000000
          );
          setFiringRecord(record);
          navigation.navigate('Fired');
          setIsLoading(false);
          return;
        }
      }

      updatedNewsFeed = advanceNewsFeedWeek(
        updatedNewsFeed,
        calendar.currentYear,
        calendar.currentWeek + 1
      );

      newWeek = calendar.currentWeek + 1;

      // ---- Weekly Systems Processing ----
      // Build intermediate state for weekly processing
      const intermediateState: GameState = {
        ...gameState,
        league: {
          ...gameState.league,
          calendar: { ...calendar, currentWeek: newWeek, currentPhase: newPhase },
          schedule: updatedSchedule,
        },
        teams: updatedTeams,
        players: updatedPlayers,
      };

      // Process waiver wire claims from previous week
      let updatedWaiverWire = gameState.waiverWire;
      if (newPhase === 'regularSeason' || newPhase === 'playoffs') {
        const waiverResult = processWeeklyWaiverWire(intermediateState, newWeek);
        updatedWaiverWire = waiverResult.updatedWaiverState;
        // Apply any roster changes from waiver claims
        if (waiverResult.updatedGameState?.teams) {
          Object.assign(updatedTeams, waiverResult.updatedGameState.teams);
        }
        if (waiverResult.updatedGameState?.players) {
          Object.assign(updatedPlayers, waiverResult.updatedGameState.players);
        }
      }

      // Generate new trade offers for the coming week
      let updatedTradeOffers = gameState.tradeOffers;
      if (newPhase === 'regularSeason' && newWeek <= 12) {
        const tradeResult = processWeeklyTradeOffers(intermediateState);
        updatedTradeOffers = tradeResult.tradeOffers;
      }

      // Generate weekly awards and power rankings
      let updatedWeeklyAwards = gameState.weeklyAwards;
      if (newPhase === 'regularSeason' || newPhase === 'playoffs') {
        updatedWeeklyAwards = processWeeklyAwards(intermediateState);
      }

      // Handle phase transitions
      if (newPhase === 'regularSeason' && newWeek > 18) {
        newWeek = 19;
        newPhase = 'playoffs';
      } else if (newPhase === 'playoffs' && newWeek > 22) {
        newWeek = 1;
        newPhase = 'offseason';
        offseasonPhase = 1;

        if (!gameState.offseasonState) {
          // Use orchestrator to initialize offseason with persistent data
          const initResult = initializeOffseason({
            ...gameState,
            league: {
              ...gameState.league,
              calendar: {
                ...calendar,
                currentYear: newYear,
              },
            },
          });
          // Then enter the first phase to auto-generate data
          const phaseResult = enterPhase(initResult.gameState, 'season_end');
          const updatedState: GameState = {
            ...phaseResult.gameState,
            league: {
              ...phaseResult.gameState.league,
              calendar: {
                ...phaseResult.gameState.league.calendar,
                currentWeek: newWeek,
                currentPhase: newPhase,
                currentYear: newYear,
                offseasonPhase: 1,
              },
            },
          };
          setGameState(updatedState);
          await saveGameState(updatedState);
          setIsLoading(false);
          // Auto-transition to offseason flow
          navigation.navigate('Offseason');
          return;
        }
      } else if (newPhase === 'offseason') {
        // Use unified offseason state management
        const currentOffseasonState = gameState.offseasonState;
        if (currentOffseasonState) {
          // Check if we can advance (required tasks complete)
          if (!canAdvancePhase(currentOffseasonState)) {
            showAlert(
              'Cannot Advance',
              'Complete required offseason tasks before advancing. Go to Offseason Tasks to see what needs to be done.'
            );
            setIsLoading(false);
            return;
          }

          // Validate phase-specific requirements (e.g., roster size for final_cuts)
          const validationError = validateOffseasonPhaseAdvance(gameState);
          if (validationError) {
            showAlert('Cannot Advance', validationError);
            setIsLoading(false);
            return;
          }

          // Advance the offseason phase properly
          const newOffseasonState = advanceOffseasonPhase(currentOffseasonState);

          if (newOffseasonState.isComplete) {
            // Offseason complete - use SeasonTransitionService for full year-over-year transition
            const transitionedState = transitionToNewSeason({
              ...gameState,
              offseasonState: undefined,
              offseasonData: undefined,
              players: updatedPlayers,
              newsFeed: updatedNewsFeed,
              patienceMeter: updatedPatienceMeter,
            });
            setGameState(transitionedState);
            await saveGameState(transitionedState);
            showAlert('Offseason Complete', 'Preseason begins!');
            setIsLoading(false);
            return;
          } else {
            // Sync calendar.offseasonPhase with offseasonState
            const phaseIndex = PHASE_ORDER.indexOf(newOffseasonState.currentPhase);
            offseasonPhase = phaseIndex + 1;

            const updatedState: GameState = {
              ...gameState,
              offseasonState: newOffseasonState,
              league: {
                ...gameState.league,
                calendar: {
                  ...calendar,
                  currentWeek: newWeek,
                  currentPhase: newPhase,
                  currentYear: newYear,
                  offseasonPhase,
                },
              },
              teams: updatedTeams,
              players: updatedPlayers,
              newsFeed: updatedNewsFeed,
              patienceMeter: updatedPatienceMeter,
            };
            setGameState(updatedState);
            await saveGameState(updatedState);
            setIsLoading(false);
            return;
          }
        } else {
          // Fallback: create offseason state if missing using orchestrator
          const initResult = initializeOffseason({
            ...gameState,
            league: {
              ...gameState.league,
              calendar: {
                ...calendar,
                currentYear: newYear,
              },
            },
          });
          // Enter the first phase to auto-generate data
          const phaseResult = enterPhase(initResult.gameState, 'season_end');
          offseasonPhase = 1;

          const updatedState: GameState = {
            ...phaseResult.gameState,
            league: {
              ...phaseResult.gameState.league,
              calendar: {
                ...phaseResult.gameState.league.calendar,
                currentWeek: newWeek,
                currentPhase: newPhase,
                currentYear: newYear,
                offseasonPhase: 1,
              },
            },
            teams: updatedTeams,
            players: updatedPlayers,
            newsFeed: updatedNewsFeed,
            patienceMeter: updatedPatienceMeter,
          };
          setGameState(updatedState);
          await saveGameState(updatedState);
          setIsLoading(false);
          return;
        }
      } else if (newPhase === 'preseason' && newWeek > 4) {
        newWeek = 1;
        newPhase = 'regularSeason';
      }

      const updatedState: GameState = {
        ...gameState,
        league: {
          ...gameState.league,
          calendar: {
            ...calendar,
            currentWeek: newWeek,
            currentPhase: newPhase,
            currentYear: newYear,
            offseasonPhase,
          },
          schedule: updatedSchedule,
        },
        teams: updatedTeams,
        players: updatedPlayers,
        newsFeed: updatedNewsFeed,
        patienceMeter: updatedPatienceMeter || gameState.patienceMeter,
        // Weekly systems state
        waiverWire: updatedWaiverWire,
        tradeOffers: updatedTradeOffers,
        weeklyAwards: updatedWeeklyAwards,
        // Reset per-week decisions for the new week
        weeklyGamePlan: undefined,
        startSitDecisions: undefined,
        halftimeDecisions: undefined,
      };

      setGameState(updatedState);
      await saveGameState(updatedState);

      const phaseLabel =
        newPhase === 'offseason' ? `Offseason Phase ${offseasonPhase}` : `Week ${newWeek}`;
      showAlert('Week Advanced', `Now in ${phaseLabel}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error advancing week:', error);
      showAlert('Error', 'Failed to advance week');
    } finally {
      setIsLoading(false);
    }
  }, [gameState, setGameState, saveGameState, setIsLoading, setFiringRecord, navigation]);

  // Sim entire season handler
  const handleSimSeason = useCallback(async () => {
    if (!gameState) return;

    const { calendar, schedule } = gameState.league;

    if (!schedule) {
      showAlert('Error', 'No schedule available');
      return;
    }

    // Use window.confirm for web compatibility (Alert.alert with buttons doesn't work on RN Web)
    // eslint-disable-next-line no-restricted-globals, no-alert
    const confirmed = window.confirm(
      'Sim Rest of Season\n\nThis will simulate all remaining games through the end of the season (including playoffs). Are you sure?'
    );
    if (!confirmed) return;

    setIsLoading(true);

    try {
      let currentState = gameState;
      let currentWeek = calendar.currentWeek;
      let currentPhase = calendar.currentPhase;

      // Simulate regular season (weeks 1-18)
      while (currentPhase === 'regularSeason' && currentWeek <= 18) {
        const stateSchedule = currentState.league.schedule;
        if (!stateSchedule) break;

        // Simulate the week
        const weekResults = simulateWeek(
          currentWeek,
          stateSchedule,
          currentState,
          currentState.userTeamId,
          true // simulate user game
        );

        // Update team records
        const updatedTeams = { ...currentState.teams };
        let updatedSchedule = { ...stateSchedule };

        for (const { game, result } of weekResults.games) {
          const homeTeam = updatedTeams[game.homeTeamId];
          const awayTeam = updatedTeams[game.awayTeamId];

          if (homeTeam && awayTeam) {
            if (result.isTie) {
              updatedTeams[game.homeTeamId] = {
                ...homeTeam,
                currentRecord: {
                  ...homeTeam.currentRecord,
                  ties: homeTeam.currentRecord.ties + 1,
                },
              };
              updatedTeams[game.awayTeamId] = {
                ...awayTeam,
                currentRecord: {
                  ...awayTeam.currentRecord,
                  ties: awayTeam.currentRecord.ties + 1,
                },
              };
            } else if (result.winnerId === game.homeTeamId) {
              updatedTeams[game.homeTeamId] = {
                ...homeTeam,
                currentRecord: {
                  ...homeTeam.currentRecord,
                  wins: homeTeam.currentRecord.wins + 1,
                },
              };
              updatedTeams[game.awayTeamId] = {
                ...awayTeam,
                currentRecord: {
                  ...awayTeam.currentRecord,
                  losses: awayTeam.currentRecord.losses + 1,
                },
              };
            } else {
              updatedTeams[game.homeTeamId] = {
                ...homeTeam,
                currentRecord: {
                  ...homeTeam.currentRecord,
                  losses: homeTeam.currentRecord.losses + 1,
                },
              };
              updatedTeams[game.awayTeamId] = {
                ...awayTeam,
                currentRecord: {
                  ...awayTeam.currentRecord,
                  wins: awayTeam.currentRecord.wins + 1,
                },
              };
            }
          }

          if (updatedSchedule.regularSeason) {
            updatedSchedule.regularSeason = updatedSchedule.regularSeason.map((g) =>
              g.gameId === game.gameId ? game : g
            );
          }
        }

        // Process injury recovery
        const advanceResult = advanceWeek(currentWeek, currentState);
        let updatedPlayers = { ...currentState.players };

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

        // Decrement weeks remaining for injured players
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

        // Process new injuries
        for (const injury of weekResults.injuryReport) {
          const player = updatedPlayers[injury.playerId];
          if (player) {
            updatedPlayers[injury.playerId] = {
              ...player,
              injuryStatus: {
                ...player.injuryStatus,
                severity: injury.weeksRemaining > 4 ? 'ir' : 'out',
                weeksRemaining: injury.weeksRemaining,
              },
            };
          }
        }

        // Advance to next week
        currentWeek++;
        if (currentWeek > 18) {
          currentPhase = 'playoffs';
          currentWeek = 19;
        }

        // Update state for next iteration
        currentState = {
          ...currentState,
          league: {
            ...currentState.league,
            calendar: {
              ...currentState.league.calendar,
              currentWeek,
              currentPhase,
            },
            schedule: updatedSchedule,
          },
          teams: updatedTeams,
          players: updatedPlayers,
        };
      }

      // Generate playoff bracket from final standings
      if (currentPhase === 'playoffs') {
        const stateSchedule = currentState.league.schedule;
        if (stateSchedule) {
          const completedGames = stateSchedule.regularSeason.filter((g) => g.isComplete);
          const teamsArray = Object.values(currentState.teams);
          const finalStandings = calculateDetailedStandings(completedGames, teamsArray);
          const playoffBracket = generatePlayoffBracket(finalStandings);

          currentState = {
            ...currentState,
            league: {
              ...currentState.league,
              schedule: {
                ...stateSchedule,
                playoffs: playoffBracket,
              },
            },
          };
        }
      }

      // Simulate playoffs round by round (weeks 19-22)
      const playoffRounds: PlayoffRound[] = [
        'wildCard',
        'divisional',
        'conference',
        'superBowl',
      ];

      for (const round of playoffRounds) {
        if (currentPhase !== 'playoffs') break;

        const stateSchedule = currentState.league.schedule;
        if (!stateSchedule?.playoffs) break;

        // Simulate the round
        const roundResults = simulatePlayoffRound(
          stateSchedule.playoffs,
          round,
          currentState
        );

        // Advance the bracket to generate next round matchups
        const advancedPlayoffs = advancePlayoffRound(stateSchedule.playoffs, roundResults);

        currentWeek++;

        // After Super Bowl, transition to offseason
        if (round === 'superBowl') {
          currentPhase = 'offseason';
          currentWeek = 1;
        }

        currentState = {
          ...currentState,
          league: {
            ...currentState.league,
            calendar: {
              ...currentState.league.calendar,
              currentWeek,
              currentPhase,
              offseasonPhase: currentPhase === 'offseason' ? 1 : null,
            },
            schedule: {
              ...stateSchedule,
              playoffs: advancedPlayoffs,
            },
          },
        };
      }

      // If we ended in offseason, initialize it
      if (currentPhase === 'offseason' && !currentState.offseasonState) {
        const initResult = initializeOffseason(currentState);
        const phaseResult = enterPhase(initResult.gameState, 'season_end');
        currentState = {
          ...phaseResult.gameState,
          league: {
            ...phaseResult.gameState.league,
            calendar: {
              ...phaseResult.gameState.league.calendar,
              currentWeek: 1,
              currentPhase: 'offseason',
              offseasonPhase: 1,
            },
          },
        };
      }

      // Save final state
      setGameState(currentState);
      await saveGameState(currentState);

      // Auto-navigate to offseason
      navigation.navigate('Offseason');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error simulating season:', error);
      showAlert('Error', 'Failed to simulate season');
    } finally {
      setIsLoading(false);
    }
  }, [gameState, setGameState, saveGameState, setIsLoading]);

  // Quick sim: simulate user's game + all other games instantly, then show WeekSummary
  const handleQuickSim = useCallback(async () => {
    if (!gameState) return;

    const { calendar, schedule } = gameState.league;
    if (!schedule?.regularSeason) {
      showAlert('Error', 'No schedule available');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate ALL games for the week (including user's game)
      const weekResults = simulateWeek(
        calendar.currentWeek,
        schedule,
        gameState,
        gameState.userTeamId,
        true // include user game
      );

      // Update schedule with results
      const updatedSchedule = { ...schedule };
      const updatedGames = [...updatedSchedule.regularSeason];
      for (const simResult of weekResults.games) {
        const gameIndex = updatedGames.findIndex((g) => g.gameId === simResult.game.gameId);
        if (gameIndex >= 0) {
          updatedGames[gameIndex] = simResult.game;
        }
      }
      updatedSchedule.regularSeason = updatedGames;

      // Update team records
      const updatedTeams = { ...gameState.teams };
      for (const simResult of weekResults.games) {
        const { result, game } = simResult;
        const homeTeam = updatedTeams[game.homeTeamId];
        const awayTeam = updatedTeams[game.awayTeamId];

        if (homeTeam && awayTeam) {
          const homeWon = result.homeScore > result.awayScore;
          const awayWon = result.awayScore > result.homeScore;
          const tie = result.homeScore === result.awayScore;

          updatedTeams[game.homeTeamId] = {
            ...homeTeam,
            currentRecord: {
              ...homeTeam.currentRecord,
              wins: homeTeam.currentRecord.wins + (homeWon ? 1 : 0),
              losses: homeTeam.currentRecord.losses + (awayWon ? 1 : 0),
              ties: homeTeam.currentRecord.ties + (tie ? 1 : 0),
              pointsFor: homeTeam.currentRecord.pointsFor + result.homeScore,
              pointsAgainst: homeTeam.currentRecord.pointsAgainst + result.awayScore,
            },
          };
          updatedTeams[game.awayTeamId] = {
            ...awayTeam,
            currentRecord: {
              ...awayTeam.currentRecord,
              wins: awayTeam.currentRecord.wins + (awayWon ? 1 : 0),
              losses: awayTeam.currentRecord.losses + (homeWon ? 1 : 0),
              ties: awayTeam.currentRecord.ties + (tie ? 1 : 0),
              pointsFor: awayTeam.currentRecord.pointsFor + result.awayScore,
              pointsAgainst: awayTeam.currentRecord.pointsAgainst + result.homeScore,
            },
          };
        }
      }

      // Aggregate season stats
      let updatedSeasonStats = gameState.seasonStats || {};
      for (const simResult of weekResults.games) {
        updatedSeasonStats = updateSeasonStatsFromGame(updatedSeasonStats, simResult.result);
      }

      const updatedState: GameState = {
        ...gameState,
        league: {
          ...gameState.league,
          schedule: updatedSchedule,
        },
        teams: updatedTeams,
        seasonStats: updatedSeasonStats,
      };

      setGameState(updatedState);
      await saveGameState(updatedState);
      setIsLoading(false);

      // Navigate to WeekSummary
      navigation.navigate('WeekSummary');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error quick-simming week:', error);
      showAlert('Error', 'Failed to simulate week');
      setIsLoading(false);
    }
  }, [gameState, setGameState, saveGameState, setIsLoading, navigation]);

  // Sim bye week: simulate all other teams' games (user is on bye), then show WeekSummary
  const handleSimByeWeek = useCallback(async () => {
    if (!gameState) return;

    const { calendar, schedule } = gameState.league;
    if (!schedule?.regularSeason) {
      showAlert('Error', 'No schedule available');
      return;
    }

    setIsLoading(true);
    try {
      // Simulate all games for the week EXCEPT user's game (since they're on bye)
      const weekResults = simulateWeek(
        calendar.currentWeek,
        schedule,
        gameState,
        gameState.userTeamId,
        false // do NOT include user game - they're on bye
      );

      // Update schedule with results
      const updatedSchedule = { ...schedule };
      const updatedGames = [...updatedSchedule.regularSeason];
      for (const simResult of weekResults.games) {
        const gameIndex = updatedGames.findIndex((g) => g.gameId === simResult.game.gameId);
        if (gameIndex >= 0) {
          updatedGames[gameIndex] = simResult.game;
        }
      }
      updatedSchedule.regularSeason = updatedGames;

      // Update team records for other teams
      const updatedTeams = { ...gameState.teams };
      for (const simResult of weekResults.games) {
        const { result, game } = simResult;
        const homeTeam = updatedTeams[game.homeTeamId];
        const awayTeam = updatedTeams[game.awayTeamId];

        if (homeTeam && awayTeam) {
          const homeWon = result.homeScore > result.awayScore;
          const awayWon = result.awayScore > result.homeScore;
          const tie = result.homeScore === result.awayScore;

          updatedTeams[game.homeTeamId] = {
            ...homeTeam,
            currentRecord: {
              ...homeTeam.currentRecord,
              wins: homeTeam.currentRecord.wins + (homeWon ? 1 : 0),
              losses: homeTeam.currentRecord.losses + (awayWon ? 1 : 0),
              ties: homeTeam.currentRecord.ties + (tie ? 1 : 0),
              pointsFor: homeTeam.currentRecord.pointsFor + result.homeScore,
              pointsAgainst: homeTeam.currentRecord.pointsAgainst + result.awayScore,
            },
          };
          updatedTeams[game.awayTeamId] = {
            ...awayTeam,
            currentRecord: {
              ...awayTeam.currentRecord,
              wins: awayTeam.currentRecord.wins + (awayWon ? 1 : 0),
              losses: awayTeam.currentRecord.losses + (homeWon ? 1 : 0),
              ties: awayTeam.currentRecord.ties + (tie ? 1 : 0),
              pointsFor: awayTeam.currentRecord.pointsFor + result.awayScore,
              pointsAgainst: awayTeam.currentRecord.pointsAgainst + result.homeScore,
            },
          };
        }
      }

      // Aggregate season stats
      let updatedSeasonStats = gameState.seasonStats || {};
      for (const simResult of weekResults.games) {
        updatedSeasonStats = updateSeasonStatsFromGame(updatedSeasonStats, simResult.result);
      }

      const updatedState: GameState = {
        ...gameState,
        league: {
          ...gameState.league,
          schedule: updatedSchedule,
        },
        teams: updatedTeams,
        seasonStats: updatedSeasonStats,
      };

      setGameState(updatedState);
      await saveGameState(updatedState);
      setIsLoading(false);

      // Navigate to WeekSummary to see around-the-league results
      navigation.navigate('WeekSummary');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error simming bye week:', error);
      showAlert('Error', 'Failed to simulate bye week');
      setIsLoading(false);
    }
  }, [gameState, setGameState, saveGameState, setIsLoading, navigation]);

  const handleAction = useCallback(
    (action: DashboardAction) => {
      switch (action) {
        case 'gamecast':
          // Navigate to WeeklySchedule to see all games for the week
          navigation.navigate('WeeklySchedule');
          break;
        case 'depthChart':
          navigation.navigate('DepthChart');
          break;
        case 'ownerRelations':
          navigation.navigate('OwnerRelations');
          break;
        case 'contracts':
          navigation.navigate('ContractManagement');
          break;
        case 'draft':
          if (
            gameState?.league.calendar.currentPhase === 'offseason' &&
            gameState?.league.calendar.offseasonPhase === 7
          ) {
            navigation.navigate('DraftRoom');
          } else {
            navigation.navigate('DraftBoard');
          }
          break;
        case 'bigBoard':
          navigation.navigate('BigBoard');
          break;
        case 'roster':
          navigation.navigate('Roster');
          break;
        case 'schedule':
          navigation.navigate('Schedule');
          break;
        case 'standings':
          if (gameState?.league.calendar.currentPhase === 'playoffs') {
            navigation.navigate('PlayoffBracket');
          } else {
            navigation.navigate('Standings');
          }
          break;
        case 'stats':
          navigation.navigate('Stats');
          break;
        case 'freeAgency':
          navigation.navigate('FreeAgency');
          break;
        case 'rfa':
          navigation.navigate('RFA');
          break;
        case 'compPicks':
          navigation.navigate('CompPickTracker');
          break;
        case 'combine':
          navigation.navigate('Combine');
          break;
        case 'careerSummary':
          navigation.navigate('CareerSummary');
          break;
        case 'staff':
          navigation.navigate('Staff');
          break;
        case 'finances':
          navigation.navigate('Finances');
          break;
        case 'news':
          navigation.navigate('News');
          break;
        case 'rumorMill':
          navigation.navigate('RumorMill');
          break;
        case 'weeklyDigest':
          navigation.navigate('WeeklyDigest');
          break;
        case 'careerLegacy':
          navigation.navigate('CareerLegacy');
          break;
        case 'offseason':
          navigation.navigate('Offseason');
          break;
        case 'advanceWeek':
          handleAdvanceWeek();
          break;
        case 'playWeek':
          // Navigate to the new LiveGameSimulation screen
          navigation.navigate('LiveGameSimulation');
          break;
        case 'simSeason':
          handleSimSeason();
          break;
        case 'saveGame':
          saveGame();
          break;
        case 'settings':
          navigation.navigate('Settings');
          break;
        case 'mainMenu':
          showConfirm(
            'Return to Main Menu',
            'Any unsaved progress will be lost. Are you sure?',
            () => {
              setGameState(null);
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Start' }],
                })
              );
            }
          );
          break;
        // New Weekly Decision Systems
        case 'gamePlan':
          navigation.navigate('GamePlan');
          break;
        case 'tradeOffers':
          navigation.navigate('TradeOffers');
          break;
        case 'startSit':
          navigation.navigate('StartSit');
          break;
        case 'weeklyAwards':
          navigation.navigate('WeeklyAwards');
          break;
        case 'waiverWire':
          navigation.navigate('WaiverWire');
          break;
        case 'quickSim':
          handleQuickSim();
          break;
        case 'simByeWeek':
          handleSimByeWeek();
          break;
        case 'seasonHistory':
          navigation.navigate('SeasonHistory');
          break;
        case 'hallOfFame':
          navigation.navigate('HallOfFame');
          break;
      }
    },
    [
      gameState,
      navigation,
      handleAdvanceWeek,
      handleSimSeason,
      handleQuickSim,
      handleSimByeWeek,
      saveGame,
      setGameState,
    ]
  );

  return <GMDashboardScreen gameState={gameState} onAction={handleAction} />;
}
