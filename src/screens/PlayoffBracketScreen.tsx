/**
 * PlayoffBracketScreen
 * Displays the NFL playoff bracket with 14 teams
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { Team } from '../core/models/team/Team';

/**
 * Playoff matchup
 */
export interface PlayoffMatchup {
  gameId: string;
  round: 'wildCard' | 'divisional' | 'conference' | 'superBowl';
  conference?: 'AFC' | 'NFC';
  homeSeed: number;
  awaySeed: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerId: string | null;
  isComplete: boolean;
}

/**
 * Playoff seed
 */
export interface PlayoffSeed {
  seed: number;
  teamId: string;
  record: { wins: number; losses: number };
  conference: 'AFC' | 'NFC';
}

/**
 * Props for PlayoffBracketScreen
 */
export interface PlayoffBracketScreenProps {
  /** All teams */
  teams: Record<string, Team>;
  /** AFC seeds (7 teams) */
  afcSeeds: PlayoffSeed[];
  /** NFC seeds (7 teams) */
  nfcSeeds: PlayoffSeed[];
  /** Current playoff matchups */
  matchups: PlayoffMatchup[];
  /** User's team ID */
  userTeamId: string;
  /** Current playoff round */
  currentRound: 'wildCard' | 'divisional' | 'conference' | 'superBowl' | 'complete';
  /** Champion team ID (if complete) */
  championId: string | null;
  /** Callback to go back */
  onBack: () => void;
}

/**
 * Team card for bracket
 */
function TeamBracketCard({
  seed,
  team,
  score,
  isWinner,
  isUserTeam,
  isEliminated,
}: {
  seed: number;
  team: Team | null;
  score: number | null;
  isWinner: boolean;
  isUserTeam: boolean;
  isEliminated: boolean;
}) {
  if (!team) {
    return (
      <View style={[styles.teamCard, styles.teamCardEmpty]}>
        <Text style={styles.seedNumber}>{seed}</Text>
        <Text style={styles.teamNameEmpty}>TBD</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.teamCard,
        isWinner && styles.teamCardWinner,
        isUserTeam && styles.teamCardUser,
        isEliminated && styles.teamCardEliminated,
      ]}
    >
      <Text style={[styles.seedNumber, isWinner && styles.seedNumberWinner]}>{seed}</Text>
      <View style={styles.teamInfo}>
        <Text
          style={[
            styles.teamName,
            isWinner && styles.teamNameWinner,
            isEliminated && styles.teamNameEliminated,
          ]}
          numberOfLines={1}
        >
          {team.city}
        </Text>
        <Text style={styles.teamNickname} numberOfLines={1}>
          {team.nickname}
        </Text>
      </View>
      {score !== null && (
        <Text style={[styles.score, isWinner && styles.scoreWinner]}>{score}</Text>
      )}
    </View>
  );
}

/**
 * Matchup card
 */
function MatchupCard({
  matchup,
  teams,
  userTeamId,
}: {
  matchup: PlayoffMatchup;
  teams: Record<string, Team>;
  userTeamId: string;
}) {
  const homeTeam = matchup.homeTeamId ? teams[matchup.homeTeamId] : null;
  const awayTeam = matchup.awayTeamId ? teams[matchup.awayTeamId] : null;

  return (
    <View style={styles.matchupCard}>
      <TeamBracketCard
        seed={matchup.homeSeed}
        team={homeTeam}
        score={matchup.homeScore}
        isWinner={matchup.winnerId === matchup.homeTeamId}
        isUserTeam={matchup.homeTeamId === userTeamId}
        isEliminated={matchup.isComplete && matchup.winnerId !== matchup.homeTeamId}
      />
      <View style={styles.matchupDivider}>
        <Text style={styles.vsText}>vs</Text>
      </View>
      <TeamBracketCard
        seed={matchup.awaySeed}
        team={awayTeam}
        score={matchup.awayScore}
        isWinner={matchup.winnerId === matchup.awayTeamId}
        isUserTeam={matchup.awayTeamId === userTeamId}
        isEliminated={matchup.isComplete && matchup.winnerId !== matchup.awayTeamId}
      />
    </View>
  );
}

/**
 * Conference bracket section
 */
function ConferenceBracket({
  conference,
  seeds,
  matchups,
  teams,
  userTeamId,
}: {
  conference: 'AFC' | 'NFC';
  seeds: PlayoffSeed[];
  matchups: PlayoffMatchup[];
  teams: Record<string, Team>;
  userTeamId: string;
}) {
  const confMatchups = matchups.filter((m) => m.conference === conference);
  const wildCardMatchups = confMatchups.filter((m) => m.round === 'wildCard');
  const divisionalMatchups = confMatchups.filter((m) => m.round === 'divisional');
  const conferenceMatchup = confMatchups.find((m) => m.round === 'conference');

  return (
    <View style={styles.conferenceBracket}>
      <Text
        style={[styles.conferenceTitle, conference === 'AFC' ? styles.afcTitle : styles.nfcTitle]}
      >
        {conference}
      </Text>

      {/* Seeds display */}
      <View style={styles.seedsContainer}>
        {seeds.slice(0, 7).map((seed) => {
          const team = teams[seed.teamId];
          return (
            <View key={seed.seed} style={styles.seedItem}>
              <Text style={styles.seedLabel}>{seed.seed}.</Text>
              <Text style={styles.seedTeam} numberOfLines={1}>
                {team?.abbreviation || 'TBD'}
              </Text>
              <Text style={styles.seedRecord}>
                ({seed.record.wins}-{seed.record.losses})
              </Text>
            </View>
          );
        })}
      </View>

      {/* Wild Card */}
      <View style={styles.roundSection}>
        <Text style={styles.roundTitle}>Wild Card</Text>
        {wildCardMatchups.map((m) => (
          <MatchupCard key={m.gameId} matchup={m} teams={teams} userTeamId={userTeamId} />
        ))}
      </View>

      {/* Divisional */}
      <View style={styles.roundSection}>
        <Text style={styles.roundTitle}>Divisional</Text>
        {divisionalMatchups.map((m) => (
          <MatchupCard key={m.gameId} matchup={m} teams={teams} userTeamId={userTeamId} />
        ))}
      </View>

      {/* Conference Championship */}
      <View style={styles.roundSection}>
        <Text style={styles.roundTitle}>{conference} Championship</Text>
        {conferenceMatchup && (
          <MatchupCard matchup={conferenceMatchup} teams={teams} userTeamId={userTeamId} />
        )}
      </View>
    </View>
  );
}

export function PlayoffBracketScreen({
  teams,
  afcSeeds,
  nfcSeeds,
  matchups,
  userTeamId,
  currentRound,
  championId,
  onBack,
}: PlayoffBracketScreenProps): React.JSX.Element {
  const superBowlMatchup = useMemo(() => {
    return matchups.find((m) => m.round === 'superBowl');
  }, [matchups]);

  const championTeam = championId ? teams[championId] : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Playoff Bracket</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Champion display if complete */}
        {championId && championTeam && (
          <View style={styles.championContainer}>
            <Text style={styles.championLabel}>CHAMPION</Text>
            <Text style={styles.championTeam}>
              {championTeam.city} {championTeam.nickname}
            </Text>
          </View>
        )}

        {/* Super Bowl */}
        {superBowlMatchup && (
          <View style={styles.superBowlSection}>
            <Text style={styles.superBowlTitle}>SUPER BOWL</Text>
            <MatchupCard matchup={superBowlMatchup} teams={teams} userTeamId={userTeamId} />
          </View>
        )}

        {/* Conference brackets side by side */}
        <View style={styles.bracketsContainer}>
          <ConferenceBracket
            conference="AFC"
            seeds={afcSeeds}
            matchups={matchups}
            teams={teams}
            userTeamId={userTeamId}
          />
          <ConferenceBracket
            conference="NFC"
            seeds={nfcSeeds}
            matchups={matchups}
            teams={teams}
            userTeamId={userTeamId}
          />
        </View>

        {/* Current round indicator */}
        <View style={styles.roundIndicator}>
          <Text style={styles.roundIndicatorText}>
            Current Round:{' '}
            {currentRound === 'complete'
              ? 'Season Complete'
              : currentRound.replace(/([A-Z])/g, ' $1').trim()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  // Champion
  championContainer: {
    backgroundColor: colors.secondary,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  championLabel: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    opacity: 0.8,
    marginBottom: spacing.xs,
  },
  championTeam: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  // Super Bowl
  superBowlSection: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  superBowlTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.secondary,
    marginBottom: spacing.md,
  },
  // Brackets container
  bracketsContainer: {
    flexDirection: 'row',
    padding: spacing.sm,
  },
  // Conference bracket
  conferenceBracket: {
    flex: 1,
    padding: spacing.sm,
  },
  conferenceTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  afcTitle: {
    backgroundColor: '#D50A0A',
    color: colors.textOnPrimary,
  },
  nfcTitle: {
    backgroundColor: '#003069',
    color: colors.textOnPrimary,
  },
  // Seeds
  seedsContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  seedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  seedLabel: {
    width: 20,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  seedTeam: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  seedRecord: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  // Round section
  roundSection: {
    marginBottom: spacing.md,
  },
  roundTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  // Matchup
  matchupCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    ...shadows.sm,
  },
  teamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  teamCardEmpty: {
    opacity: 0.5,
  },
  teamCardWinner: {
    backgroundColor: colors.success + '20',
  },
  teamCardUser: {
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  teamCardEliminated: {
    opacity: 0.5,
  },
  seedNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.background,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginRight: spacing.sm,
  },
  seedNumberWinner: {
    backgroundColor: colors.success,
    color: colors.textOnPrimary,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  teamNameWinner: {
    color: colors.success,
  },
  teamNameEmpty: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  teamNameEliminated: {
    color: colors.textLight,
  },
  teamNickname: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  score: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    minWidth: 30,
    textAlign: 'right',
  },
  scoreWinner: {
    color: colors.success,
  },
  matchupDivider: {
    height: 1,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    position: 'absolute',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  // Round indicator
  roundIndicator: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  roundIndicatorText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});

export default PlayoffBracketScreen;
