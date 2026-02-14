/**
 * Career Screen Wrappers
 * Bridge components for career-related screens (job market, interviews, legacy, etc.)
 *
 * Extracted from ScreenWrappers.tsx for modularity.
 */

import React from 'react';
import { Alert, View, Text, StyleSheet } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { useGame } from '../GameContext';
import { ScreenProps } from '../types';
import { LoadingFallback } from './shared';
import { colors, spacing, fontSize } from '../../styles';

// Screen imports
import { CareerSummaryScreen } from '../../screens/CareerSummaryScreen';
import { JobMarketScreen } from '../../screens/JobMarketScreen';
import { InterviewScreen } from '../../screens/InterviewScreen';
import { CareerLegacyScreen } from '../../screens/CareerLegacyScreen';
import { ChampionshipCelebrationScreen } from '../../screens/ChampionshipCelebrationScreen';
import { SeasonOverScreen } from '../../screens/SeasonOverScreen';
import { SeasonHistoryScreen } from '../../screens/SeasonHistoryScreen';
import { HallOfFameScreen } from '../../screens/HallOfFameScreen';

// Core imports
import { GameState } from '../../core/models/game/GameState';
import {
  createJobMarketState,
  calculateAllInterests,
  JobMarketState,
} from '../../core/career/JobMarketManager';
import {
  createInterviewState,
  InterviewState,
  InterviewRecord,
  conductInterview,
} from '../../core/career/InterviewSystem';
import { createCareerRecord } from '../../core/career/CareerRecordTracker';
import { enterPhase, initializeOffseason } from '../../core/offseason/OffseasonOrchestrator';
import { getAllNews } from '../../core/news/NewsFeedManager';
import { PlayoffMatchup as EnginePlayoffMatchup } from '../../core/season/PlayoffGenerator';

// ============================================
// CAREER SUMMARY SCREEN
// ============================================

export function CareerSummaryScreenWrapper({
  navigation: _navigation,
}: ScreenProps<'CareerSummary'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading career summary..." />;
  }

  // This screen is typically shown after firing, so we may not have firingRecord here
  // For general career viewing, we'd need different data
  return (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackText}>Career Summary</Text>
      <Text style={styles.fallbackSubtext}>Coming soon...</Text>
    </View>
  );
}

// ============================================
// FIRED SCREEN
// ============================================

export function FiredScreenWrapper({ navigation }: ScreenProps<'Fired'>): React.JSX.Element {
  const { gameState, firingRecord, setGameState, setFiringRecord } = useGame();

  if (!firingRecord || !gameState) {
    navigation.goBack();
    return <LoadingFallback message="Loading..." />;
  }

  const teamName = `${gameState.teams[gameState.userTeamId].city} ${gameState.teams[gameState.userTeamId].nickname}`;

  return (
    <CareerSummaryScreen
      firingRecord={firingRecord}
      teamName={teamName}
      onContinue={() => {
        // Navigate to JobMarket to find a new position
        navigation.navigate('JobMarket');
      }}
      onMainMenu={() => {
        setGameState(null);
        setFiringRecord(null);
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Start' }],
          })
        );
      }}
    />
  );
}

// ============================================
// JOB MARKET SCREEN
// ============================================

export function JobMarketScreenWrapper({
  navigation,
}: ScreenProps<'JobMarket'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Job Market..." />;
  }

  const currentYear = gameState.league.calendar.currentYear;
  const currentWeek = gameState.league.calendar.currentWeek;

  // Create mock job market state for demonstration
  // In a real implementation, this would come from gameState
  const baseJobMarket = createJobMarketState(currentYear, 50);

  // Generate sample job openings based on teams
  const teamIds = Object.keys(gameState.teams);
  const sampleOpenings = teamIds.slice(0, 3).map((teamId) => {
    const team = gameState.teams[teamId];
    const ownerId = `owner-${team.abbreviation}`;
    const owner = gameState.owners[ownerId];

    return {
      id: `opening-${team.id}-${currentYear}`,
      teamId: team.id,
      teamName: team.nickname,
      teamCity: team.city,
      conference: team.conference,
      division: team.division,
      reason: 'fired' as const,
      dateOpened: currentWeek,
      yearOpened: currentYear,
      situation:
        team.currentRecord.wins >= 10
          ? ('playoff_team' as const)
          : team.currentRecord.wins <= 4
            ? ('full_rebuild' as const)
            : ('mediocre' as const),
      lastSeasonRecord: { wins: team.currentRecord.wins, losses: team.currentRecord.losses },
      playoffAppearancesLast5Years: team.playoffSeed ? 1 : 0, // Derived from current season
      championshipsLast10Years: team.championships,
      currentRosterTalent: Math.min(
        100,
        Math.max(20, team.prestige + Math.floor(Math.random() * 20))
      ),
      ownerName: owner ? `${owner.firstName} ${owner.lastName}` : 'Unknown Owner',
      ownerPatience:
        owner?.personality.traits.patience <= 35
          ? ('low' as const)
          : owner?.personality.traits.patience >= 65
            ? ('high' as const)
            : ('moderate' as const),
      ownerSpending:
        owner?.personality.traits.spending <= 35
          ? ('low' as const)
          : owner?.personality.traits.spending >= 65
            ? ('high' as const)
            : ('moderate' as const),
      ownerControl:
        owner?.personality.traits.control <= 35
          ? ('low' as const)
          : owner?.personality.traits.control >= 65
            ? ('high' as const)
            : ('moderate' as const),
      marketSize: team.marketSize,
      prestige: team.prestige,
      fanbaseExpectations:
        team.championships > 0
          ? ('championship' as const)
          : team.prestige >= 70
            ? ('high' as const)
            : team.prestige >= 40
              ? ('moderate' as const)
              : ('low' as const),
      isFilled: false,
      filledByPlayerId: null,
    };
  });

  const jobMarket: JobMarketState = {
    ...baseJobMarket,
    openings: sampleOpenings,
  };

  // Calculate interests
  const jobMarketWithInterests = calculateAllInterests(jobMarket, 0, 0.5, 0);

  // Create interview state
  const interviewState: InterviewState = createInterviewState(currentYear, currentWeek);

  return (
    <JobMarketScreen
      gameState={gameState}
      jobMarket={jobMarketWithInterests}
      interviewState={interviewState}
      onBack={() => navigation.goBack()}
      onRequestInterview={(openingId) => {
        // Find the team ID from the opening
        const opening = sampleOpenings.find((o) => o.id === openingId);
        if (opening) {
          // Navigate to Interview screen with team ID
          navigation.navigate('Interview', { teamId: opening.teamId });
        }
      }}
      onAcceptOffer={(_interviewId) => {
        Alert.alert('Offer Accepted', 'Congratulations on your new position!', [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Dashboard'),
          },
        ]);
      }}
      onDeclineOffer={(_interviewId) => {
        Alert.alert('Offer Declined', 'You have declined the offer.');
      }}
    />
  );
}

// ============================================
// INTERVIEW SCREEN
// ============================================

export function InterviewScreenWrapper({
  navigation,
  route,
}: ScreenProps<'Interview'>): React.JSX.Element {
  const { gameState, setGameState } = useGame();
  const { teamId } = route.params;

  if (!gameState) {
    return <LoadingFallback message="Loading Interview..." />;
  }

  // Find the team
  const team = gameState.teams[teamId];
  if (!team) {
    return <LoadingFallback message="Team not found..." />;
  }

  // Find owner for the team
  const ownerId = `owner-${team.abbreviation}`;
  const owner = gameState.owners[ownerId];

  // Get or create interview state from gameState
  // For now, we'll create a mock interview for this team
  const currentYear = gameState.league.calendar.currentYear;
  const currentWeek = gameState.league.calendar.currentWeek;

  // Create a scheduled interview for this team
  const mockInterview: InterviewRecord = {
    id: `interview-${teamId}-${Date.now()}`,
    openingId: `opening-${teamId}-${currentYear}`,
    teamId: teamId,
    teamName: `${team.city} ${team.nickname}`,
    status: 'scheduled',
    requestedAt: currentWeek,
    scheduledFor: currentWeek,
    completedAt: null,
    interviewScore: null,
    offer: null,
    ownerPreview: null,
    playerAccepted: false,
    rejectionReason: null,
  };

  const [interview, setInterview] = React.useState<InterviewRecord>(mockInterview);

  // Handle conducting the interview
  const handleConductInterview = () => {
    if (!owner) return;

    // Create interview state and conduct the interview
    let interviewState = createInterviewState(currentYear, currentWeek);
    interviewState = {
      ...interviewState,
      interviews: [interview],
    };

    // Conduct the interview - use reputation score based on team performance
    const userTeam = gameState.teams[gameState.userTeamId];
    const winPct =
      userTeam.currentRecord.wins /
      Math.max(1, userTeam.currentRecord.wins + userTeam.currentRecord.losses);
    const reputationScore = 50 + (winPct - 0.5) * 40;

    const newState = conductInterview(interviewState, interview.id, owner, reputationScore, winPct);

    // Get the updated interview
    const updatedInterview = newState.interviews.find((i) => i.id === interview.id);
    if (updatedInterview) {
      setInterview(updatedInterview);
    }
  };

  // Handle accepting an offer
  const handleAcceptOffer = () => {
    Alert.alert(
      'Accept Offer',
      `Are you sure you want to accept the offer from ${team.city} ${team.nickname}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => {
            Alert.alert(
              'Congratulations!',
              `You are now the General Manager of the ${team.city} ${team.nickname}!`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Update user team to the new team
                    if (setGameState) {
                      setGameState({
                        ...gameState,
                        userTeamId: teamId,
                      });
                    }
                    navigation.navigate('Dashboard');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // Handle declining an offer
  const handleDeclineOffer = () => {
    Alert.alert('Decline Offer', 'Are you sure you want to decline this offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        onPress: () => {
          setInterview({
            ...interview,
            status: 'offer_declined',
          });
          Alert.alert('Offer Declined', 'You have declined the offer.');
        },
      },
    ]);
  };

  return (
    <InterviewScreen
      interview={interview}
      teamName={team.nickname}
      teamCity={team.city}
      onBack={() => navigation.goBack()}
      onConductInterview={handleConductInterview}
      onAcceptOffer={handleAcceptOffer}
      onDeclineOffer={handleDeclineOffer}
    />
  );
}

// ============================================
// CAREER LEGACY SCREEN
// ============================================

export function CareerLegacyScreenWrapper({
  navigation,
}: ScreenProps<'CareerLegacy'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Career Legacy..." />;
  }

  const currentYear = gameState.league.calendar.currentYear;

  // Create a career record - in a real implementation this would come from gameState
  // For now, create a sample career based on the current game state
  const baseRecord = createCareerRecord('gm-player', 'You');

  // Build career record from user team's history
  const userTeam = gameState.teams[gameState.userTeamId];
  const enhancedRecord = {
    ...baseRecord,
    totalSeasons: Math.max(1, currentYear - 2024),
    totalWins: userTeam.currentRecord.wins + (currentYear - 2024) * 8,
    totalLosses: userTeam.currentRecord.losses + (currentYear - 2024) * 9,
    careerWinPercentage: 0.47 + Math.random() * 0.1,
    championships: userTeam.championships,
    conferenceChampionships: 0,
    divisionTitles: 0,
    playoffAppearances: userTeam.playoffSeed ? 1 : 0,
    teamsWorkedFor: [
      {
        teamId: userTeam.id,
        teamName: userTeam.nickname,
        startYear: 2024,
        endYear: null,
        seasons: Math.max(1, currentYear - 2024),
        totalWins: userTeam.currentRecord.wins + (currentYear - 2024) * 8,
        totalLosses: userTeam.currentRecord.losses + (currentYear - 2024) * 9,
        totalTies: 0,
        winPercentage: 0.47,
        playoffAppearances: userTeam.playoffSeed ? 1 : 0,
        divisionTitles: 0,
        conferenceChampionships: 0,
        championships: userTeam.championships,
        wasFired: false,
        reasonForDeparture: 'current' as const,
      },
    ],
    currentTeamId: userTeam.id,
    reputationScore: 50 + userTeam.championships * 20 + (userTeam.playoffSeed ? 5 : 0),
    seasonHistory: [],
    achievements: [],
    yearsUnemployed: 0,
    timesFired: 0,
    isRetired: false,
    retirementYear: null,
  };

  return (
    <CareerLegacyScreen
      gameState={gameState}
      careerRecord={enhancedRecord}
      onBack={() => navigation.goBack()}
      onRetire={() => {
        Alert.alert('Retire?', 'Are you sure you want to retire? This will end your career.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Retire',
            style: 'destructive',
            onPress: () => {
              Alert.alert('Retirement', 'You have announced your retirement from the league.');
            },
          },
        ]);
      }}
    />
  );
}

// ============================================
// CHAMPIONSHIP CELEBRATION SCREEN
// ============================================

export function ChampionshipCelebrationScreenWrapper({
  navigation,
}: ScreenProps<'ChampionshipCelebration'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading celebration..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const calendar = gameState.league.calendar;
  const teamName = `${userTeam.city} ${userTeam.nickname}`;

  // Get playoff record from bracket data
  let playoffWins = 0;
  let playoffLosses = 0;
  const playoffs = gameState.league.schedule?.playoffs;
  if (playoffs) {
    const allMatchups = [
      ...playoffs.wildCardRound,
      ...playoffs.divisionalRound,
      ...playoffs.conferenceChampionships,
      ...(playoffs.superBowl ? [playoffs.superBowl] : []),
    ];
    for (const game of allMatchups) {
      if (game.homeTeamId === gameState.userTeamId || game.awayTeamId === gameState.userTeamId) {
        if (game.isComplete) {
          const isHomeGame = game.homeTeamId === gameState.userTeamId;
          const uScore = isHomeGame ? (game.homeScore ?? 0) : (game.awayScore ?? 0);
          const oScore = isHomeGame ? (game.awayScore ?? 0) : (game.homeScore ?? 0);
          if (uScore > oScore) playoffWins++;
          else playoffLosses++;
        }
      }
    }
  }

  // Get Super Bowl game info
  const superBowlGame = playoffs?.superBowl ?? null;
  const isHome = superBowlGame?.homeTeamId === gameState.userTeamId;
  const oppTeamId = superBowlGame
    ? isHome
      ? superBowlGame.awayTeamId
      : superBowlGame.homeTeamId
    : '';
  const oppTeam = gameState.teams[oppTeamId];
  const superBowlScore = {
    userScore: superBowlGame
      ? isHome
        ? (superBowlGame.homeScore ?? 0)
        : (superBowlGame.awayScore ?? 0)
      : 0,
    opponentScore: superBowlGame
      ? isHome
        ? (superBowlGame.awayScore ?? 0)
        : (superBowlGame.homeScore ?? 0)
      : 0,
    opponentName: oppTeam ? `${oppTeam.city} ${oppTeam.nickname}` : 'Opponent',
  };

  // Find MVP (best player by overall rating)
  const rosterPlayers = userTeam.rosterPlayerIds
    .map((id) => gameState.players[id])
    .filter(Boolean)
    .sort((a, b) => {
      const aSkills = Object.values(a.skills || {});
      const bSkills = Object.values(b.skills || {});
      const aAvg =
        aSkills.length > 0
          ? aSkills.reduce(
              (sum: number, s: unknown) => sum + ((s as { trueValue?: number })?.trueValue || 0),
              0
            ) / aSkills.length
          : 0;
      const bAvg =
        bSkills.length > 0
          ? bSkills.reduce(
              (sum: number, s: unknown) => sum + ((s as { trueValue?: number })?.trueValue || 0),
              0
            ) / bSkills.length
          : 0;
      return bAvg - aAvg;
    });
  const mvpPlayer = rosterPlayers[0];

  // Calculate GM grade based on record
  const { wins, losses } = userTeam.currentRecord;
  const winPct = wins + losses > 0 ? wins / (wins + losses) : 0.5;
  const gmGrade =
    winPct >= 0.85
      ? 'A+'
      : winPct >= 0.75
        ? 'A'
        : winPct >= 0.65
          ? 'A-'
          : winPct >= 0.55
            ? 'B+'
            : 'B';

  return (
    <ChampionshipCelebrationScreen
      teamName={teamName}
      teamAbbreviation={userTeam.abbreviation}
      seasonYear={calendar.currentYear}
      record={userTeam.currentRecord}
      playoffRecord={{ wins: playoffWins, losses: playoffLosses }}
      superBowlScore={superBowlScore}
      mvp={{
        name: mvpPlayer ? `${mvpPlayer.firstName} ${mvpPlayer.lastName}` : 'Unknown',
        position: mvpPlayer?.position ?? 'QB',
        keyStats: 'Championship Performance',
      }}
      gmGrade={gmGrade}
      onContinue={async () => {
        // Transition to offseason
        if (!gameState.offseasonState) {
          const initResult = initializeOffseason(gameState);
          const phaseResult = enterPhase(initResult.gameState, 'season_end');
          const updatedState: GameState = {
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
          setGameState(updatedState);
          await saveGameState(updatedState);
        }
        navigation.navigate('Offseason');
      }}
    />
  );
}

// ============================================
// SEASON OVER SCREEN
// ============================================

export function SeasonOverScreenWrapper({
  navigation,
}: ScreenProps<'SeasonOver'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading season summary..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const calendar = gameState.league.calendar;
  const teamName = `${userTeam.city} ${userTeam.nickname}`;

  // Determine playoff result
  let playoffResult: string | undefined;
  const playoffs = gameState.league.schedule?.playoffs;
  if (playoffs) {
    const userInPlayoffs =
      playoffs.wildCardRound?.some(
        (g) => g.homeTeamId === gameState.userTeamId || g.awayTeamId === gameState.userTeamId
      ) ||
      playoffs.divisionalRound?.some(
        (g) => g.homeTeamId === gameState.userTeamId || g.awayTeamId === gameState.userTeamId
      );

    if (userInPlayoffs) {
      // Determine which round they were eliminated
      const rounds: Array<{ matchups: EnginePlayoffMatchup[]; name: string }> = [
        { matchups: playoffs.superBowl ? [playoffs.superBowl] : [], name: 'Super Bowl Runner-Up' },
        { matchups: playoffs.conferenceChampionships, name: 'Conference Championship' },
        { matchups: playoffs.divisionalRound, name: 'Divisional Round' },
        { matchups: playoffs.wildCardRound, name: 'Wild Card Round' },
      ];
      for (const { matchups, name } of rounds) {
        const game = matchups.find(
          (g) => g.homeTeamId === gameState.userTeamId || g.awayTeamId === gameState.userTeamId
        );
        if (game?.isComplete) {
          const isHomeSide = game.homeTeamId === gameState.userTeamId;
          const userScore = isHomeSide ? (game.homeScore ?? 0) : (game.awayScore ?? 0);
          const oppScore = isHomeSide ? (game.awayScore ?? 0) : (game.homeScore ?? 0);
          if (userScore < oppScore) {
            playoffResult = `Eliminated in ${name}`;
            break;
          }
        }
      }
    }
  }

  // Generate season highlights from news
  const seasonHighlights: string[] = [];
  if (gameState.newsFeed) {
    const allNews = getAllNews(gameState.newsFeed);
    const teamNews = allNews
      .filter(
        (item) =>
          item.headline?.includes(userTeam.city) || item.headline?.includes(userTeam.nickname)
      )
      .slice(0, 5);
    for (const item of teamNews) {
      if (item.headline) seasonHighlights.push(item.headline);
    }
  }
  if (seasonHighlights.length === 0) {
    seasonHighlights.push(
      `Finished the season ${userTeam.currentRecord.wins}-${userTeam.currentRecord.losses}`
    );
  }

  // Find top 3 performers
  const topPlayers = userTeam.rosterPlayerIds
    .map((id) => gameState.players[id])
    .filter(Boolean)
    .sort((a, b) => {
      const aSkills = Object.values(a.skills || {});
      const bSkills = Object.values(b.skills || {});
      const aAvg =
        aSkills.length > 0
          ? aSkills.reduce(
              (sum: number, s: unknown) => sum + ((s as { trueValue?: number })?.trueValue || 0),
              0
            ) / aSkills.length
          : 0;
      const bAvg =
        bSkills.length > 0
          ? bSkills.reduce(
              (sum: number, s: unknown) => sum + ((s as { trueValue?: number })?.trueValue || 0),
              0
            ) / bSkills.length
          : 0;
      return bAvg - aAvg;
    })
    .slice(0, 3)
    .map((player) => ({
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
      stats: `Age ${player.age}, ${player.experience} yr${player.experience !== 1 ? 's' : ''} exp`,
    }));

  // Calculate GM grade
  const { wins, losses } = userTeam.currentRecord;
  const winPct = wins + losses > 0 ? wins / (wins + losses) : 0.5;
  const gmGrade =
    winPct >= 0.75
      ? 'A'
      : winPct >= 0.65
        ? 'B+'
        : winPct >= 0.55
          ? 'B'
          : winPct >= 0.45
            ? 'B-'
            : winPct >= 0.35
              ? 'C'
              : 'D';

  return (
    <SeasonOverScreen
      teamName={teamName}
      seasonYear={calendar.currentYear}
      record={userTeam.currentRecord}
      playoffResult={playoffResult}
      seasonHighlights={seasonHighlights}
      topPlayers={topPlayers}
      gmGrade={gmGrade}
      onProceedToOffseason={async () => {
        // Transition to offseason
        if (!gameState.offseasonState) {
          const initResult = initializeOffseason(gameState);
          const phaseResult = enterPhase(initResult.gameState, 'season_end');
          const updatedState: GameState = {
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
          setGameState(updatedState);
          await saveGameState(updatedState);
        }
        navigation.navigate('Offseason');
      }}
    />
  );
}

// ============================================
// SEASON HISTORY SCREEN
// ============================================

export function SeasonHistoryScreenWrapper({
  navigation,
}: ScreenProps<'SeasonHistory'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading season history..." />;
  }

  const seasonHistory = gameState.league.seasonHistory || [];

  const seasons = seasonHistory.map((summary) => {
    const championTeam = gameState.teams[summary.championTeamId];
    const championName = championTeam ? `${championTeam.city} ${championTeam.nickname}` : 'Unknown';
    const championRecord = championTeam
      ? `${championTeam.currentRecord.wins}-${championTeam.currentRecord.losses}`
      : 'N/A';

    const userTeam = gameState.teams[gameState.userTeamId];
    const userRecord = userTeam
      ? `${userTeam.currentRecord.wins}-${userTeam.currentRecord.losses}`
      : 'N/A';

    const mvpPlayer = gameState.players[summary.mvpPlayerId];
    const mvpName = mvpPlayer ? `${mvpPlayer.firstName} ${mvpPlayer.lastName}` : undefined;

    return {
      year: summary.year,
      champion: { teamName: championName, record: championRecord },
      userTeamRecord: userRecord,
      userPlayoffResult: undefined as string | undefined,
      mvp: mvpName,
    };
  });

  return <SeasonHistoryScreen seasons={seasons} onBack={() => navigation.goBack()} />;
}

// ============================================
// HALL OF FAME SCREEN
// ============================================

export function HallOfFameScreenWrapper({
  navigation,
}: ScreenProps<'HallOfFame'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Hall of Fame..." />;
  }

  // Find retired players with notable careers from playerHistory
  const inductees: Array<{
    name: string;
    position: string;
    teams: string[];
    yearsActive: string;
    careerHighlights: string[];
    legacyTier: string;
  }> = [];

  if (gameState.playerHistory) {
    for (const [, history] of Object.entries(gameState.playerHistory)) {
      // Consider players with long careers or many awards as HoF candidates
      const seasonCount = history.seasonLogs?.length ?? 0;
      const awardCount = history.awards?.length ?? 0;

      if (seasonCount >= 10 || awardCount >= 3) {
        const teams: string[] = [];
        const teamSet = new Set<string>();
        for (const tx of history.transactions || []) {
          if (tx.teamId && !teamSet.has(tx.teamId)) {
            teamSet.add(tx.teamId);
            const team = gameState.teams[tx.teamId];
            if (team) teams.push(`${team.city} ${team.nickname}`);
          }
        }
        if (teams.length === 0) {
          const draftTeam = gameState.teams[history.draftTeamId];
          if (draftTeam) teams.push(`${draftTeam.city} ${draftTeam.nickname}`);
        }

        const highlights = (history.awards || []).map((a) => a.type || 'Award');
        const legacyTier = awardCount >= 5 ? 'first-ballot' : 'hall-of-famer';
        const startYear = history.rookieYear;
        const endYear = startYear + seasonCount;

        inductees.push({
          name: history.playerName,
          position: history.position,
          teams,
          yearsActive: `${startYear}-${endYear}`,
          careerHighlights: highlights.slice(0, 5),
          legacyTier,
        });
      }
    }
  }

  return <HallOfFameScreen inductees={inductees} onBack={() => navigation.goBack()} />;
}

// ============================================
// LOCAL STYLES
// ============================================

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
