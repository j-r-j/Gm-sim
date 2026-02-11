/**
 * SeasonOverScreen
 * Shown after playoff elimination or missing playoffs entirely
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../styles';
import { ScreenHeader } from '../components';

interface SeasonOverScreenProps {
  teamName: string;
  seasonYear: number;
  record: { wins: number; losses: number; ties: number };
  playoffResult?: string;
  seasonHighlights: string[];
  topPlayers: Array<{ name: string; position: string; stats: string }>;
  gmGrade: string;
  onProceedToOffseason: () => void;
}

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return colors.success;
  if (grade.startsWith('B')) return colors.info;
  if (grade.startsWith('C')) return colors.warning;
  return colors.error;
}

export function SeasonOverScreen({
  teamName,
  seasonYear,
  record,
  playoffResult,
  seasonHighlights,
  topPlayers,
  gmGrade,
  onProceedToOffseason,
}: SeasonOverScreenProps): React.JSX.Element {
  const recordString = `${record.wins}-${record.losses}${record.ties > 0 ? `-${record.ties}` : ''}`;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Season Over" subtitle={teamName} testID="season-over-header" />

      <ScrollView style={styles.content}>
        {/* Record Header */}
        <View style={styles.recordHeader}>
          <Text style={styles.yearText}>{seasonYear} Season</Text>
          <Text style={styles.recordValue}>{recordString}</Text>
          <Text style={styles.playoffText}>
            {playoffResult || 'Did not qualify for playoffs'}
          </Text>
        </View>

        {/* Season Highlights */}
        {seasonHighlights.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Season Highlights</Text>
            {seasonHighlights.map((highlight, index) => (
              <View key={index} style={styles.highlightItem}>
                <View style={styles.highlightBullet} />
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Top Performers */}
        {topPlayers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Performers</Text>
            {topPlayers.map((player, index) => (
              <View key={index} style={styles.playerCard}>
                <View style={styles.playerRank}>
                  <Text style={styles.playerRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  <Text style={styles.playerPosition}>{player.position}</Text>
                  <Text style={styles.playerStats}>{player.stats}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* GM Grade */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GM Grade</Text>
          <View style={styles.gradeCard}>
            <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(gmGrade) }]}>
              <Text style={styles.gradeText}>{gmGrade}</Text>
            </View>
          </View>
        </View>

        {/* Proceed CTA */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={onProceedToOffseason}
            accessibilityLabel="Proceed to offseason"
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Text style={styles.proceedButtonText}>Proceed to Offseason</Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  recordHeader: {
    backgroundColor: colors.surfaceDark,
    padding: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  yearText: {
    fontSize: fontSize.md,
    color: colors.textOnDark,
    opacity: 0.8,
    marginBottom: spacing.sm,
  },
  recordValue: {
    fontSize: 48,
    fontWeight: fontWeight.bold,
    color: colors.textOnDark,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  playoffText: {
    fontSize: fontSize.md,
    color: colors.textOnDark,
    opacity: 0.9,
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
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  highlightBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: spacing.md,
  },
  highlightText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 20,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  playerRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  playerRankText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  playerPosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  playerStats: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  gradeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  gradeBadge: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  gradeText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  ctaSection: {
    padding: spacing.xl,
  },
  proceedButton: {
    minHeight: accessibility.minTouchTarget,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  proceedButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
});

export default SeasonOverScreen;
