/**
 * GMDashboardScreen
 * Main hub for managing your team - access all game features from here
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { GameState } from '../core/models/game/GameState';
import { Team, getRecordString } from '../core/models/team/Team';

export type DashboardAction =
  | 'roster'
  | 'schedule'
  | 'standings'
  | 'draft'
  | 'freeAgency'
  | 'staff'
  | 'finances'
  | 'gamecast'
  | 'news'
  | 'advanceWeek'
  | 'settings'
  | 'saveGame'
  | 'mainMenu';

interface GMDashboardScreenProps {
  gameState: GameState;
  onAction: (action: DashboardAction) => void;
}

interface MenuCardProps {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
}

function MenuCard({
  title,
  subtitle,
  icon,
  color,
  onPress,
  disabled,
  badge,
}: MenuCardProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.menuCard, disabled && styles.menuCardDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.menuCardContent}>
        <Text style={[styles.menuCardTitle, disabled && styles.textDisabled]}>{title}</Text>
        <Text style={[styles.menuCardSubtitle, disabled && styles.textDisabled]}>{subtitle}</Text>
      </View>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function getPhaseDisplay(phase: string): string {
  const phaseMap: Record<string, string> = {
    preseason: 'Preseason',
    regularSeason: 'Regular Season',
    playoffs: 'Playoffs',
    offseason: 'Offseason',
    season_end: 'Season End',
    coaching_decisions: 'Coaching Decisions',
    contract_management: 'Contract Management',
    combine: 'NFL Combine',
    free_agency: 'Free Agency',
    draft: 'NFL Draft',
    udfa: 'UDFA Signing',
    otas: 'OTAs',
    training_camp: 'Training Camp',
    final_cuts: 'Final Roster Cuts',
    season_start: 'Season Start',
  };
  return phaseMap[phase] || phase;
}

function getWeekDisplay(week: number, phase: string): string {
  if (phase === 'playoffs') {
    const playoffWeeks: Record<number, string> = {
      19: 'Wild Card',
      20: 'Divisional',
      21: 'Conference',
      22: 'Super Bowl',
    };
    return playoffWeeks[week] || `Week ${week}`;
  }
  if (phase === 'preseason') {
    return `Preseason Week ${week}`;
  }
  if (phase === 'regularSeason') {
    return `Week ${week}`;
  }
  return '';
}

export function GMDashboardScreen({ gameState, onAction }: GMDashboardScreenProps): React.JSX.Element {
  const userTeam: Team = gameState.teams[gameState.userTeamId];
  const { calendar } = gameState.league;
  const phase = calendar.currentPhase;
  const isOffseason = phase === 'offseason';
  const isDraft = calendar.offseasonPhase === 'draft';
  const isFreeAgency = calendar.offseasonPhase === 'free_agency';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Team Info */}
      <View style={styles.header}>
        <View style={styles.teamBanner}>
          <Text style={styles.teamAbbr}>{userTeam.abbreviation}</Text>
          <View style={styles.teamDetails}>
            <Text style={styles.teamName}>
              {userTeam.city} {userTeam.nickname}
            </Text>
            <Text style={styles.gmName}>GM: {gameState.userName}</Text>
          </View>
        </View>
        <View style={styles.seasonInfo}>
          <Text style={styles.yearText}>{calendar.currentYear}</Text>
          <Text style={styles.phaseText}>{getPhaseDisplay(phase)}</Text>
          {!isOffseason && (
            <Text style={styles.weekText}>
              {getWeekDisplay(calendar.currentWeek, phase)}
            </Text>
          )}
        </View>
      </View>

      {/* Team Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Record</Text>
          <Text style={styles.statusValue}>{getRecordString(userTeam.currentRecord)}</Text>
        </View>
        <View style={styles.statusDivider} />
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Cap Space</Text>
          <Text style={styles.statusValue}>
            ${Math.round(userTeam.finances.capSpace / 1000000)}M
          </Text>
        </View>
        <View style={styles.statusDivider} />
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Roster</Text>
          <Text style={styles.statusValue}>{userTeam.rosterPlayerIds.length}/53</Text>
        </View>
        {userTeam.playoffSeed && (
          <>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Seed</Text>
              <Text style={[styles.statusValue, styles.seedText]}>#{userTeam.playoffSeed}</Text>
            </View>
          </>
        )}
      </View>

      {/* Main Menu Grid */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.menuGrid}>
        {/* Primary Actions */}
        <Text style={styles.sectionTitle}>Team Management</Text>

        <MenuCard
          title="Roster"
          subtitle="View and manage your players"
          icon="👥"
          color={colors.primary}
          onPress={() => onAction('roster')}
        />

        <MenuCard
          title="Staff"
          subtitle="Coaches and scouts"
          icon="📋"
          color={colors.info}
          onPress={() => onAction('staff')}
        />

        <MenuCard
          title="Finances"
          subtitle="Salary cap and contracts"
          icon="💰"
          color={colors.success}
          onPress={() => onAction('finances')}
        />

        {/* Season Actions */}
        <Text style={styles.sectionTitle}>Season</Text>

        {!isOffseason && (
          <MenuCard
            title="Gamecast"
            subtitle="Watch your next game"
            icon="🏈"
            color={colors.secondary}
            onPress={() => onAction('gamecast')}
            badge="PLAY"
          />
        )}

        <MenuCard
          title="Schedule"
          subtitle="View upcoming games"
          icon="📅"
          color={colors.primary}
          onPress={() => onAction('schedule')}
        />

        <MenuCard
          title="Standings"
          subtitle="League standings"
          icon="🏆"
          color={colors.warning}
          onPress={() => onAction('standings')}
        />

        <MenuCard
          title="News"
          subtitle="Latest headlines"
          icon="📰"
          color={colors.info}
          onPress={() => onAction('news')}
        />

        {/* Offseason Actions */}
        <Text style={styles.sectionTitle}>
          {isOffseason ? 'Offseason' : 'Player Acquisition'}
        </Text>

        <MenuCard
          title="Draft Board"
          subtitle="Scout and evaluate prospects"
          icon="🎓"
          color={colors.secondary}
          onPress={() => onAction('draft')}
          badge={isDraft ? 'ACTIVE' : undefined}
        />

        <MenuCard
          title="Free Agency"
          subtitle="Sign available players"
          icon="✍️"
          color={colors.success}
          onPress={() => onAction('freeAgency')}
          badge={isFreeAgency ? 'ACTIVE' : undefined}
        />

        {/* Advance Button */}
        <View style={styles.advanceSection}>
          <TouchableOpacity
            style={styles.advanceButton}
            onPress={() => onAction('advanceWeek')}
            activeOpacity={0.8}
          >
            <Text style={styles.advanceButtonText}>
              {isOffseason ? 'Advance Phase' : 'Advance Week'}
            </Text>
            <Text style={styles.advanceButtonSubtext}>
              {isOffseason
                ? `Current: ${getPhaseDisplay(calendar.offseasonPhase || '')}`
                : 'Simulate to next week'
              }
            </Text>
          </TouchableOpacity>
        </View>

        {/* System Actions */}
        <Text style={styles.sectionTitle}>System</Text>

        <View style={styles.systemButtons}>
          <TouchableOpacity
            style={styles.systemButton}
            onPress={() => onAction('saveGame')}
          >
            <Text style={styles.systemButtonIcon}>💾</Text>
            <Text style={styles.systemButtonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.systemButton}
            onPress={() => onAction('settings')}
          >
            <Text style={styles.systemButtonIcon}>⚙️</Text>
            <Text style={styles.systemButtonText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.systemButton}
            onPress={() => onAction('mainMenu')}
          >
            <Text style={styles.systemButtonIcon}>🏠</Text>
            <Text style={styles.systemButtonText}>Menu</Text>
          </TouchableOpacity>
        </View>

        {/* Career Stats */}
        <View style={styles.careerSection}>
          <Text style={styles.careerTitle}>Career Stats</Text>
          <View style={styles.careerStats}>
            <View style={styles.careerStat}>
              <Text style={styles.careerStatValue}>
                {gameState.careerStats.seasonsCompleted}
              </Text>
              <Text style={styles.careerStatLabel}>Seasons</Text>
            </View>
            <View style={styles.careerStat}>
              <Text style={styles.careerStatValue}>
                {gameState.careerStats.totalWins}-{gameState.careerStats.totalLosses}
              </Text>
              <Text style={styles.careerStatLabel}>Record</Text>
            </View>
            <View style={styles.careerStat}>
              <Text style={styles.careerStatValue}>
                {gameState.careerStats.playoffAppearances}
              </Text>
              <Text style={styles.careerStatLabel}>Playoffs</Text>
            </View>
            <View style={styles.careerStat}>
              <Text style={styles.careerStatValue}>
                {gameState.careerStats.championships}
              </Text>
              <Text style={styles.careerStatLabel}>Titles</Text>
            </View>
          </View>
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
    backgroundColor: colors.primary,
    padding: spacing.lg,
    ...shadows.md,
  },
  teamBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamAbbr: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    marginRight: spacing.md,
    opacity: 0.9,
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  gmName: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    opacity: 0.8,
    marginTop: spacing.xxs,
  },
  seasonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  yearText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.secondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  phaseText: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    fontWeight: fontWeight.semibold,
  },
  weekText: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  statusBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  statusLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xxs,
  },
  seedText: {
    color: colors.success,
  },
  scrollView: {
    flex: 1,
  },
  menuGrid: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  menuCardDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  menuCardContent: {
    flex: 1,
  },
  menuCardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  menuCardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  textDisabled: {
    color: colors.textLight,
  },
  badge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  advanceSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  advanceButton: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  advanceButtonText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  advanceButtonSubtext: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    opacity: 0.8,
    marginTop: spacing.xxs,
  },
  systemButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  systemButton: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  systemButtonIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  systemButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  careerSection: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  careerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  careerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  careerStat: {
    alignItems: 'center',
  },
  careerStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  careerStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});

export default GMDashboardScreen;
