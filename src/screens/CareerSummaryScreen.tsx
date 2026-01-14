/**
 * CareerSummaryScreen
 * Displays career summary when GM is fired
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { FiringRecord, getLegacyDescription } from '../core/career/FiringMechanics';

interface CareerSummaryScreenProps {
  firingRecord: FiringRecord;
  teamName: string;
  onContinue: () => void;
  onMainMenu: () => void;
}

export function CareerSummaryScreen({
  firingRecord,
  teamName,
  onContinue,
  onMainMenu,
}: CareerSummaryScreenProps): React.JSX.Element {
  const { reason, tenure, severance, legacy } = firingRecord;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>You've Been Relieved of Your Duties</Text>
          <Text style={styles.headerSubtitle}>{teamName} has decided to go in a new direction</Text>
        </View>

        {/* Public Statement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Official Statement</Text>
          <View style={styles.statementBox}>
            <Text style={styles.statementText}>"{reason.publicStatement}"</Text>
          </View>
        </View>

        {/* Internal Reason */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>The Real Reason</Text>
          <View style={[styles.statementBox, styles.internalBox]}>
            <Text style={styles.internalReason}>{reason.primaryReason}</Text>
            {reason.secondaryReasons.map((r, i) => (
              <Text key={i} style={styles.secondaryReason}>
                - {r}
              </Text>
            ))}
          </View>
        </View>

        {/* Tenure Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Tenure</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tenure.totalSeasons}</Text>
              <Text style={styles.statLabel}>Seasons</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {tenure.totalWins}-{tenure.totalLosses}
              </Text>
              <Text style={styles.statLabel}>Record</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(tenure.winPercentage * 100)}%</Text>
              <Text style={styles.statLabel}>Win %</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tenure.playoffAppearances}</Text>
              <Text style={styles.statLabel}>Playoffs</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tenure.superBowlWins}</Text>
              <Text style={styles.statLabel}>Championships</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{tenure.divisionTitles}</Text>
              <Text style={styles.statLabel}>Division Titles</Text>
            </View>
          </View>
        </View>

        {/* Legacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Legacy</Text>
          <View style={[styles.legacyBox, { borderColor: getLegacyColor(legacy.overall) }]}>
            <Text style={[styles.legacyRating, { color: getLegacyColor(legacy.overall) }]}>
              {legacy.overall.toUpperCase()}
            </Text>
            <Text style={styles.legacyScore}>Score: {legacy.score}/100</Text>
            <Text style={styles.legacyDescription}>{getLegacyDescription(legacy)}</Text>
          </View>

          {legacy.achievements.length > 0 && (
            <View style={styles.legacyList}>
              <Text style={styles.legacyListTitle}>Achievements</Text>
              {legacy.achievements.map((a, i) => (
                <Text key={i} style={styles.achievementItem}>
                  + {a}
                </Text>
              ))}
            </View>
          )}

          {legacy.failures.length > 0 && (
            <View style={styles.legacyList}>
              <Text style={styles.legacyListTitle}>Shortcomings</Text>
              {legacy.failures.map((f, i) => (
                <Text key={i} style={styles.failureItem}>
                  - {f}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Severance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Severance Package</Text>
          <View style={styles.severanceBox}>
            <Text style={styles.severanceAmount}>
              ${(severance.totalValue / 1000000).toFixed(1)}M
            </Text>
            <Text style={styles.severanceLabel}>{severance.description}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
            <Text style={styles.continueButtonText}>Find New Job</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mainMenuButton} onPress={onMainMenu}>
            <Text style={styles.mainMenuButtonText}>Main Menu</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getLegacyColor(rating: string): string {
  switch (rating) {
    case 'legendary':
      return '#FFD700';
    case 'excellent':
      return colors.success;
    case 'good':
      return colors.info;
    case 'average':
      return colors.textSecondary;
    case 'poor':
      return colors.warning;
    case 'disastrous':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: colors.error,
    padding: spacing.xl,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    opacity: 0.8,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statementBox: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  statementText: {
    fontSize: fontSize.md,
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: 24,
  },
  internalBox: {
    backgroundColor: colors.error + '10',
    borderWidth: 1,
    borderColor: colors.error + '30',
  },
  internalReason: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  secondaryReason: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  statItem: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  legacyBox: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    alignItems: 'center',
    ...shadows.sm,
  },
  legacyRating: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    letterSpacing: 2,
  },
  legacyScore: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  legacyDescription: {
    fontSize: fontSize.md,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 22,
  },
  legacyList: {
    marginTop: spacing.md,
  },
  legacyListTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  achievementItem: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  failureItem: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  severanceBox: {
    backgroundColor: colors.success + '20',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  severanceAmount: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  severanceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  continueButton: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  continueButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  mainMenuButton: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mainMenuButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
});

export default CareerSummaryScreen;
