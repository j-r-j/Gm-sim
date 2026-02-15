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
import { LoadingFallback } from './shared';
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
import { getAllNews } from '../../core/news/NewsFeedManager';
import { getUserTeamGame } from '../../core/season/WeekSimulator';
import { Rumor } from '../../core/news/RumorMill';
import { WeeklyDigest } from '../../core/news/WeeklyDigest';
import { NewsItem } from '../../core/news/NewsGenerators';
import { NewsFeedCategory } from '../../core/news/StoryTemplates';

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

export function PlayoffBracketScreenWrapper({
  navigation,
}: ScreenProps<'PlayoffBracket'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading playoffs..." />;
  }

  const generateSeeds = (conference: 'AFC' | 'NFC'): PlayoffSeed[] => {
    const confTeams = Object.values(gameState.teams)
      .filter((t) => t.conference === conference)
      .sort((a, b) => {
        if (b.currentRecord.wins !== a.currentRecord.wins) {
          return b.currentRecord.wins - a.currentRecord.wins;
        }
        return b.currentRecord.losses - a.currentRecord.losses;
      })
      .slice(0, 7);

    return confTeams.map((team, index) => ({
      seed: index + 1,
      teamId: team.id,
      record: team.currentRecord,
      conference,
    }));
  };

  const afcSeeds = generateSeeds('AFC');
  const nfcSeeds = generateSeeds('NFC');

  const generateMatchups = (): PlayoffMatchup[] => {
    const matchups: PlayoffMatchup[] = [];
    const week = gameState.league.calendar.currentWeek;

    for (const conf of ['AFC', 'NFC'] as const) {
      const seeds = conf === 'AFC' ? afcSeeds : nfcSeeds;

      matchups.push({
        gameId: `wc-${conf}-1`,
        round: 'wildCard',
        conference: conf,
        homeSeed: 2,
        awaySeed: 7,
        homeTeamId: seeds[1]?.teamId || null,
        awayTeamId: seeds[6]?.teamId || null,
        homeScore: week > 19 ? 28 + Math.floor(Math.random() * 7) : null,
        awayScore: week > 19 ? 21 + Math.floor(Math.random() * 7) : null,
        winnerId: week > 19 ? seeds[1]?.teamId || null : null,
        isComplete: week > 19,
      });

      matchups.push({
        gameId: `wc-${conf}-2`,
        round: 'wildCard',
        conference: conf,
        homeSeed: 3,
        awaySeed: 6,
        homeTeamId: seeds[2]?.teamId || null,
        awayTeamId: seeds[5]?.teamId || null,
        homeScore: week > 19 ? 24 + Math.floor(Math.random() * 10) : null,
        awayScore: week > 19 ? 17 + Math.floor(Math.random() * 7) : null,
        winnerId: week > 19 ? seeds[2]?.teamId || null : null,
        isComplete: week > 19,
      });

      matchups.push({
        gameId: `wc-${conf}-3`,
        round: 'wildCard',
        conference: conf,
        homeSeed: 4,
        awaySeed: 5,
        homeTeamId: seeds[3]?.teamId || null,
        awayTeamId: seeds[4]?.teamId || null,
        homeScore: week > 19 ? 21 + Math.floor(Math.random() * 10) : null,
        awayScore: week > 19 ? 14 + Math.floor(Math.random() * 14) : null,
        winnerId: week > 19 ? seeds[3]?.teamId || null : null,
        isComplete: week > 19,
      });
    }

    return matchups;
  };

  const matchups = generateMatchups();
  const currentRound =
    gameState.league.calendar.currentWeek <= 18
      ? 'wildCard'
      : gameState.league.calendar.currentWeek <= 20
        ? 'divisional'
        : gameState.league.calendar.currentWeek <= 21
          ? 'conference'
          : gameState.league.calendar.currentWeek <= 22
            ? 'superBowl'
            : 'complete';

  return (
    <PlayoffBracketScreen
      teams={gameState.teams}
      afcSeeds={afcSeeds}
      nfcSeeds={nfcSeeds}
      matchups={matchups}
      userTeamId={gameState.userTeamId}
      currentRound={currentRound}
      championId={null}
      onBack={() => navigation.goBack()}
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

  const currentYear = gameState.league.calendar.currentYear;
  const currentWeek = gameState.league.calendar.currentWeek;
  const userTeam = gameState.teams[gameState.userTeamId];
  const teamName = userTeam ? `${userTeam.city} ${userTeam.nickname}` : 'Your Team';

  // Generate sample rumors for display
  // In production, these would come from gameState.rumors or similar
  const mockRumors: Rumor[] = [
    {
      id: 'rumor-1',
      type: 'trade_interest',
      headline: 'Report: Multiple Teams Interested in Trade',
      body: 'According to league sources, several teams have expressed interest in acquiring key players before the deadline. No trade is imminent, but conversations have taken place.',
      isTrue: true,
      sourceConfidence: 'moderate',
      timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
      season: currentYear,
      week: currentWeek,
      priority: 'medium',
      expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
      isResolved: false,
    },
    {
      id: 'rumor-2',
      type: 'contract_demand',
      headline: 'Star Player Seeking New Contract',
      body: 'Sources indicate a key player is seeking a new contract extension. The player believes they have outperformed their current deal and wants to be paid among the top at their position.',
      isTrue: false,
      sourceConfidence: 'whisper',
      timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
      season: currentYear,
      week: currentWeek,
      priority: 'low',
      expiresAt: Date.now() + 4 * 24 * 60 * 60 * 1000,
      isResolved: false,
    },
    {
      id: 'rumor-3',
      type: 'coaching',
      headline: `Hot Seat: ${teamName} Coach Under Pressure?`,
      body: `Sources say the coaching position with ${teamName} could be in jeopardy if results don't improve. The pressure is mounting after recent struggles.`,
      isTrue: false,
      sourceConfidence: 'whisper',
      timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
      season: currentYear,
      week: currentWeek > 1 ? currentWeek - 1 : currentWeek,
      priority: 'medium',
      expiresAt: Date.now() + 2 * 24 * 60 * 60 * 1000,
      isResolved: true,
      resolution: 'Reports of coaching changes were premature. The staff remains intact.',
    },
    {
      id: 'rumor-4',
      type: 'injury_recovery',
      headline: 'Injured Star Making Rapid Progress',
      body: 'Good news on the injury front: sources indicate an injured player is making excellent progress in rehab. An early return may be possible.',
      isTrue: true,
      sourceConfidence: 'strong',
      timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
      season: currentYear,
      week: currentWeek,
      priority: 'high',
      expiresAt: Date.now() + 6 * 24 * 60 * 60 * 1000,
      isResolved: false,
    },
    {
      id: 'rumor-5',
      type: 'locker_room',
      headline: 'Sources: Tension Building in Locker Room',
      body: 'Multiple sources describe tension in the locker room. The specifics are unclear, but chemistry may be becoming an issue for the team.',
      isTrue: true,
      sourceConfidence: 'moderate',
      timestamp: Date.now() - 4 * 24 * 60 * 60 * 1000,
      season: currentYear,
      week: currentWeek > 1 ? currentWeek - 1 : currentWeek,
      priority: 'medium',
      expiresAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // Expired
      isResolved: true,
      resolution:
        'Sources were right about locker room issues. The team has made roster changes to address the situation.',
    },
  ];

  return (
    <RumorMillScreen
      gameState={gameState}
      rumors={mockRumors}
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

  // Generate sample news items
  const mockNews: NewsItem[] = [
    {
      id: 'news-1',
      category: 'performance' as NewsFeedCategory,
      headline: 'Star Quarterback Dominates in Week ' + currentWeek,
      body: 'The franchise quarterback delivered another stellar performance, completing 28 of 35 passes for 320 yards and 3 touchdowns.',
      priority: 'high',
      isPositive: true,
      timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
      season: currentYear,
      week: currentWeek,
      isRead: false,
      revealsTraitHint: false,
    },
    {
      id: 'news-2',
      category: 'injury' as NewsFeedCategory,
      headline: 'Starting Linebacker Leaves Game with Knee Injury',
      body: 'The team is awaiting MRI results after their starting linebacker went down with a non-contact knee injury in the third quarter.',
      priority: 'breaking',
      isPositive: false,
      timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
      season: currentYear,
      week: currentWeek,
      isRead: false,
      revealsTraitHint: false,
    },
    {
      id: 'news-3',
      category: 'trade' as NewsFeedCategory,
      headline: 'Teams Swap Mid-Round Draft Picks',
      body: 'In a minor move, two teams exchanged mid-round draft picks as they continue to build for the future.',
      priority: 'low',
      isPositive: true,
      timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
      season: currentYear,
      week: currentWeek,
      isRead: true,
      revealsTraitHint: false,
    },
    {
      id: 'news-4',
      category: 'performance' as NewsFeedCategory,
      headline: 'Rookie Shows Surprising Work Ethic',
      body: 'Sources say the first-round pick has been the first to arrive and last to leave practice every day. Coaches are impressed with his dedication.',
      priority: 'medium',
      isPositive: true,
      timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
      season: currentYear,
      week: currentWeek,
      isRead: false,
      revealsTraitHint: true,
      hintedTrait: 'hard_worker',
    },
    {
      id: 'news-5',
      category: 'coaching' as NewsFeedCategory,
      headline: 'Defensive Coordinator Praises Unit After Shutout',
      body: 'The defense held their opponent scoreless for the first time this season, with the coordinator crediting improved communication.',
      priority: 'medium',
      isPositive: true,
      timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
      season: currentYear,
      week: currentWeek,
      isRead: true,
      revealsTraitHint: false,
    },
  ];

  // Generate sample rumors
  const mockRumors: Rumor[] = [
    {
      id: 'rumor-1',
      type: 'trade_interest',
      headline: 'Report: Multiple Teams Interested in Trade',
      body: 'League sources indicate several teams have made calls about potential trade targets.',
      isTrue: true,
      sourceConfidence: 'moderate',
      timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
      season: currentYear,
      week: currentWeek,
      priority: 'medium',
      expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
      isResolved: false,
    },
    {
      id: 'rumor-2',
      type: 'contract_demand',
      headline: 'Star Player Seeking Extension',
      body: 'Sources say negotiations have begun on a contract extension for a key player.',
      isTrue: false,
      sourceConfidence: 'whisper',
      timestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
      season: currentYear,
      week: currentWeek,
      priority: 'low',
      expiresAt: Date.now() + 4 * 24 * 60 * 60 * 1000,
      isResolved: false,
    },
  ];

  // Get unique categories
  const categoriesWithNews = Array.from(
    new Set(mockNews.map((n) => n.category))
  ) as NewsFeedCategory[];

  // Build digest
  const digest: WeeklyDigest = {
    id: `digest-s${currentYear}-w${currentWeek}`,
    season: currentYear,
    week: currentWeek,
    headline: 'Busy Week Around the League',
    summary: `Here's what you need to know from Week ${currentWeek}: 1 injury report was filed this week. We saw 2 noteworthy individual performances. Plus, 2 rumors are swirling around the league.`,
    topStories: mockNews,
    activeRumors: mockRumors,
    traitHintingNews: mockNews.filter((n) => n.revealsTraitHint),
    totalNewsCount: mockNews.length,
    unreadCount: mockNews.filter((n) => !n.isRead).length,
    categoriesWithNews,
    timestamp: Date.now(),
    isViewed: false,
  };

  return (
    <WeeklyDigestScreen
      gameState={gameState}
      digest={digest}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
    />
  );
}
