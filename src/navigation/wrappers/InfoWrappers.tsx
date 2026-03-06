/**
 * Info Wrappers
 * Information and display screen wrappers extracted from ScreenWrappers.tsx
 *
 * Includes: Schedule, Standings, News, Gamecast, PlayoffBracket,
 * Stats, RumorMill, WeeklyDigest
 */

import React from 'react';
import { useGame } from '../GameContext';
import { showAlert } from '@utils/alert';
import { ScreenProps } from '../types';
import { processWeekEnd, LoadingFallback } from './shared';
import { ScheduleScreen } from '../../screens/ScheduleScreen';
import { StandingsScreen } from '../../screens/StandingsScreen';
import { NewsScreen } from '../../screens/NewsScreen';
import { GameDayScreen } from '../../screens/GameDayScreen';
import {
  PlayoffBracketScreen,
  PlayoffMatchup,
  PlayoffSeed,
} from '../../screens/PlayoffBracketScreen';
import { StatsScreen } from '../../screens/StatsScreen';
import { RumorMillScreen } from '../../screens/RumorMillScreen';
import { WeeklyDigestScreen } from '../../screens/WeeklyDigestScreen';
import { GameState } from '../../core/models/game/GameState';
import {
  getAllNews,
  getAllActiveRumors,
  getCurrentWeekNews,
  getLatestWeeklyDigest,
} from '../../core/news/NewsFeedManager';
import { getUserTeamGame } from '../../core/season/WeekSimulator';
import { Rumor } from '../../core/news/RumorMill';
import { generateWeeklyDigest, WeeklyDigest } from '../../core/news/WeeklyDigest';
import { NewsItem } from '../../core/news/NewsGenerators';
import {
  getCurrentPlayoffRound,
  simulatePlayoffRound,
  advancePlayoffRound,
  PlayoffSchedule,
} from '../../core/season/PlayoffGenerator';
import { calculateStandings as calculateDetailedStandings } from '../../core/season/StandingsCalculator';

// ============================================
// SCHEDULE SCREEN
// ============================================

export function ScheduleScreenWrapper({ navigation }: ScreenProps<'Schedule'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading schedule..." />;
  }

  const schedule = gameState.league.schedule;
  const scheduleGames = schedule ? schedule.regularSeason : [];

  return (
    <ScheduleScreen
      userTeamId={gameState.userTeamId}
      teams={gameState.teams}
      schedule={scheduleGames}
      currentWeek={gameState.league.calendar.currentWeek}
      onBack={() => navigation.goBack()}
      onSelectGame={(game) => {
        if (game.week === gameState.league.calendar.currentWeek) {
          navigation.navigate('Gamecast');
        }
      }}
    />
  );
}

// ============================================
// STANDINGS SCREEN
// ============================================

export function StandingsScreenWrapper({
  navigation,
}: ScreenProps<'Standings'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading standings..." />;
  }

  const completedGames = gameState.league.schedule?.regularSeason?.filter((g) => g.isComplete);

  return (
    <StandingsScreen
      teams={gameState.teams}
      userTeamId={gameState.userTeamId}
      completedGames={completedGames}
      onBack={() => navigation.goBack()}
    />
  );
}

// ============================================
// NEWS SCREEN
// ============================================

export function NewsScreenWrapper({ navigation }: ScreenProps<'News'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading news..." />;
  }

  const currentWeek = gameState.league.calendar.currentWeek;
  const currentYear = gameState.league.calendar.currentYear;
  const readStatus = gameState.newsReadStatus || {};

  const mapCategory = (
    category: string
  ): 'trade' | 'injury' | 'team' | 'league' | 'yourTeam' | 'draft' | 'freeAgency' => {
    const mapping: Record<
      string,
      'trade' | 'injury' | 'team' | 'league' | 'yourTeam' | 'draft' | 'freeAgency'
    > = {
      trade: 'trade',
      injury: 'injury',
      team: 'team',
      league: 'league',
      draft: 'draft',
      signing: 'freeAgency',
      performance: 'team',
      milestone: 'team',
      coaching: 'team',
    };
    return mapping[category] || 'league';
  };

  let newsItems;
  if (gameState.newsFeed && gameState.newsFeed.newsItems.length > 0) {
    newsItems = getAllNews(gameState.newsFeed).map((item) => ({
      id: item.id,
      headline: item.headline,
      summary: item.body,
      date:
        typeof item.timestamp === 'number'
          ? new Date(item.timestamp).toISOString()
          : item.timestamp,
      category: mapCategory(item.category),
      week: item.week,
      year: item.season,
      relatedTeamIds: item.teamId ? [item.teamId] : [],
      isRead: item.isRead || readStatus[item.id] || false,
      priority: item.priority as 'breaking' | 'normal' | 'minor',
    }));
  } else {
    newsItems = [
      {
        id: '1',
        headline: 'Season Underway',
        summary: `Week ${currentWeek} of the ${currentYear} season is here.`,
        date: new Date().toISOString(),
        category: 'league' as const,
        week: currentWeek,
        year: currentYear,
        relatedTeamIds: [],
        isRead: readStatus['1'] || false,
        priority: 'normal' as const,
      },
      {
        id: '2',
        headline: 'Draft Class Revealed',
        summary: `${Object.keys(gameState.prospects).length} prospects available for the upcoming draft.`,
        date: new Date().toISOString(),
        category: 'draft' as const,
        week: currentWeek,
        year: currentYear,
        relatedTeamIds: [],
        isRead: readStatus['2'] || false,
        priority: 'normal' as const,
      },
    ];
  }

  return (
    <NewsScreen
      news={newsItems}
      currentWeek={currentWeek}
      currentYear={currentYear}
      onBack={() => navigation.goBack()}
      onRumorMill={() => navigation.navigate('RumorMill')}
      onMarkRead={async (newsId) => {
        const updatedState: GameState = {
          ...gameState,
          newsReadStatus: {
            ...readStatus,
            [newsId]: true,
          },
        };
        setGameState(updatedState);
        await saveGameState(updatedState);
      }}
    />
  );
}

// ============================================
// GAMECAST SCREEN (now using unified GameDayScreen)
// ============================================

export function GamecastScreenWrapper({ navigation }: ScreenProps<'Gamecast'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading game..." />;
  }

  const schedule = gameState.league.schedule;
  const currentWeek = gameState.league.calendar.currentWeek;

  // Get the user's game from the actual schedule
  const userGame = schedule ? getUserTeamGame(schedule, currentWeek, gameState.userTeamId) : null;

  if (!userGame) {
    showAlert('No Game', 'No game scheduled for this week.');
    navigation.goBack();
    return <LoadingFallback message="No game scheduled..." />;
  }

  return (
    <GameDayScreen
      game={userGame}
      gameState={gameState}
      userTeamId={gameState.userTeamId}
      onBack={() => navigation.goBack()}
      onGameComplete={async (result, updatedState) => {
        setGameState(updatedState);
        await saveGameState(updatedState);

        // Navigate to WeeklySchedule to show other games and allow simming
        navigation.navigate('WeeklySchedule');
      }}
    />
  );
}

// ============================================
// PLAYOFF BRACKET SCREEN
// ============================================

function toSeedMap(source: unknown): Map<number, string> {
  if (source instanceof Map) return source;
  if (source && typeof source === 'object') {
    return new Map(
      Object.entries(source as Record<string, unknown>)
        .map(([seed, teamId]) => [Number(seed), teamId] as const)
        .filter(
          (entry): entry is [number, string] =>
            Number.isFinite(entry[0]) && typeof entry[1] === 'string'
        )
    );
  }
  return new Map();
}

function playoffScheduleWithSeedMaps(playoffs: PlayoffSchedule): PlayoffSchedule {
  return {
    ...playoffs,
    afcSeeds: toSeedMap(playoffs.afcSeeds),
    nfcSeeds: toSeedMap(playoffs.nfcSeeds),
  };
}

export function PlayoffBracketScreenWrapper({
  navigation,
}: ScreenProps<'PlayoffBracket'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState, setIsLoading } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading playoffs..." />;
  }

  const playoffSchedule = gameState.league.schedule?.playoffs;
  const completedRegularSeasonGames =
    gameState.league.schedule?.regularSeason.filter((g) => g.isComplete) ?? [];

  const getSeedEntries = (seedSource: unknown): Array<[number, string]> => {
    if (seedSource instanceof Map) {
      return Array.from(seedSource.entries()).filter(
        (entry): entry is [number, string] =>
          typeof entry[0] === 'number' && typeof entry[1] === 'string'
      );
    }

    if (Array.isArray(seedSource)) {
      return seedSource.filter(
        (entry): entry is [number, string] =>
          Array.isArray(entry) && typeof entry[0] === 'number' && typeof entry[1] === 'string'
      );
    }

    if (seedSource && typeof seedSource === 'object') {
      return Object.entries(seedSource as Record<string, unknown>)
        .map(([seed, teamId]) => [Number(seed), teamId] as const)
        .filter(
          (entry): entry is [number, string] =>
            Number.isFinite(entry[0]) && typeof entry[1] === 'string'
        );
    }

    return [];
  };

  const toSeeds = (conference: 'AFC' | 'NFC'): PlayoffSeed[] => {
    const source = conference === 'AFC' ? playoffSchedule?.afcSeeds : playoffSchedule?.nfcSeeds;
    const entries = getSeedEntries(source).sort((a, b) => a[0] - b[0]);

    if (entries.length > 0) {
      return entries.map(([seed, teamId]) => ({
        seed,
        teamId,
        record: gameState.teams[teamId]?.currentRecord ?? { wins: 0, losses: 0, ties: 0 },
        conference,
      }));
    }

    const standings = calculateDetailedStandings(
      completedRegularSeasonGames,
      Object.values(gameState.teams)
    );
    const confTeams = Object.values(standings[conference.toLowerCase() as 'afc' | 'nfc'])
      .flat()
      .sort((a, b) => a.conferenceRank - b.conferenceRank)
      .slice(0, 7);

    return confTeams.map((standing, index) => ({
      seed: index + 1,
      teamId: standing.teamId,
      record: { wins: standing.wins, losses: standing.losses, ties: standing.ties },
      conference,
    }));
  };

  const afcSeeds = toSeeds('AFC');
  const nfcSeeds = toSeeds('NFC');

  const matchups: PlayoffMatchup[] = playoffSchedule
    ? [
        ...playoffSchedule.wildCardRound,
        ...playoffSchedule.divisionalRound,
        ...playoffSchedule.conferenceChampionships,
        ...(playoffSchedule.superBowl ? [playoffSchedule.superBowl] : []),
      ].map((matchup) => ({
        gameId: matchup.gameId,
        round: matchup.round,
        conference:
          matchup.conference === 'afc' ? 'AFC' : matchup.conference === 'nfc' ? 'NFC' : undefined,
        homeSeed: matchup.homeSeed,
        awaySeed: matchup.awaySeed,
        homeTeamId: matchup.homeTeamId,
        awayTeamId: matchup.awayTeamId,
        homeScore: matchup.homeScore,
        awayScore: matchup.awayScore,
        winnerId: matchup.winnerId,
        isComplete: matchup.isComplete,
      }))
    : [];

  const activeRound = playoffSchedule ? getCurrentPlayoffRound(playoffSchedule) : null;
  const currentRound =
    activeRound === 'wildCard'
      ? 'wildCard'
      : activeRound === 'divisional'
        ? 'divisional'
        : activeRound === 'conference'
          ? 'conference'
          : activeRound === 'superBowl'
            ? 'superBowl'
            : playoffSchedule?.superBowlChampion
              ? 'complete'
              : 'wildCard';

  const handlePlayGame = () => {
    navigation.navigate('LiveGameSimulation');
  };

  const handleSimRound = async () => {
    if (!playoffSchedule || !activeRound) return;

    setIsLoading(true);
    try {
      const normalized = playoffScheduleWithSeedMaps(playoffSchedule);
      const roundResults = simulatePlayoffRound(normalized, activeRound, gameState);

      const allComplete = roundResults.every((m) => m.isComplete);
      let updatedPlayoffs: PlayoffSchedule;
      if (allComplete) {
        updatedPlayoffs = advancePlayoffRound(normalized, roundResults);
      } else {
        updatedPlayoffs = { ...normalized };
        switch (activeRound) {
          case 'wildCard':
            updatedPlayoffs.wildCardRound = roundResults;
            break;
          case 'divisional':
            updatedPlayoffs.divisionalRound = roundResults;
            break;
          case 'conference':
            updatedPlayoffs.conferenceChampionships = roundResults;
            break;
          case 'superBowl':
            if (roundResults[0]) updatedPlayoffs.superBowl = roundResults[0];
            break;
        }
      }

      const newState: GameState = {
        ...gameState,
        league: {
          ...gameState.league,
          schedule: {
            ...gameState.league.schedule!,
            playoffs: updatedPlayoffs,
          },
        },
      };
      setGameState(newState);
      await saveGameState(newState);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error simulating playoff round:', error);
      showAlert('Error', 'Failed to simulate playoff round.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdvanceRound = async () => {
    setIsLoading(true);
    try {
      const weekEndResult = processWeekEnd(gameState);
      const newState = weekEndResult.state;
      setGameState(newState);
      await saveGameState(newState);

      if (weekEndResult.fired) {
        navigation.navigate('Fired');
        return;
      }

      const newPhase = newState.league.calendar.currentPhase;
      if (newPhase === 'offseason') {
        navigation.navigate('Offseason');
      } else if (newPhase === 'playoffs') {
        // Stay on PlayoffBracket — state update will re-render with the next round
      } else {
        navigation.navigate('Dashboard');
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error advancing playoff round:', error);
      showAlert('Error', 'Failed to advance to the next round.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PlayoffBracketScreen
      teams={gameState.teams}
      afcSeeds={afcSeeds}
      nfcSeeds={nfcSeeds}
      matchups={matchups}
      userTeamId={gameState.userTeamId}
      currentRound={currentRound}
      championId={playoffSchedule?.superBowlChampion ?? null}
      onBack={() => navigation.goBack()}
      onPlayGame={handlePlayGame}
      onSimRound={handleSimRound}
      onAdvanceRound={handleAdvanceRound}
    />
  );
}

// ============================================
// STATS SCREEN
// ============================================

export function StatsScreenWrapper({ navigation }: ScreenProps<'Stats'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading stats..." />;
  }

  return (
    <StatsScreen
      gameState={gameState}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
    />
  );
}

// ============================================
// RUMOR MILL SCREEN
// ============================================

export function RumorMillScreenWrapper({
  navigation,
}: ScreenProps<'RumorMill'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Rumor Mill..." />;
  }

  const rumors: Rumor[] = gameState.newsFeed ? getAllActiveRumors(gameState.newsFeed) : [];

  return (
    <RumorMillScreen
      gameState={gameState}
      rumors={rumors}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
    />
  );
}

// ============================================
// WEEKLY DIGEST SCREEN
// ============================================

export function WeeklyDigestScreenWrapper({
  navigation,
}: ScreenProps<'WeeklyDigest'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Weekly Digest..." />;
  }

  const currentYear = gameState.league.calendar.currentYear;
  const currentWeek = gameState.league.calendar.currentWeek;

  const newsFeed = gameState.newsFeed;
  const weekNews: NewsItem[] = newsFeed ? getCurrentWeekNews(newsFeed) : [];
  const activeRumors: Rumor[] = newsFeed ? getAllActiveRumors(newsFeed) : [];
  const latestDigest = newsFeed ? getLatestWeeklyDigest(newsFeed) : null;

  const digest: WeeklyDigest =
    latestDigest && latestDigest.season === currentYear && latestDigest.week === currentWeek
      ? latestDigest
      : generateWeeklyDigest(
          weekNews,
          activeRumors,
          currentYear,
          currentWeek,
          newsFeed?.digestConfig
        );

  return (
    <WeeklyDigestScreen
      gameState={gameState}
      digest={digest}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
    />
  );
}
