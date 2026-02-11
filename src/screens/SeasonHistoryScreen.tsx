/**
 * SeasonHistoryScreen
 * Browse past seasons from league.seasonHistory
 */

import React, { useState } from 'react';
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

interface SeasonEntry {
  year: number;
  champion: { teamName: string; record: string };
  userTeamRecord: string;
  userPlayoffResult?: string;
  mvp?: string;
  superBowlScore?: string;
}

interface SeasonHistoryScreenProps {
  seasons: SeasonEntry[];
  onBack: () => void;
}

const GOLD = '#FFD700';
const DARK_GOLD = '#B8860B';

export function SeasonHistoryScreen({
  seasons,
  onBack,
}: SeasonHistoryScreenProps): React.JSX.Element {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  const sortedSeasons = [...seasons].sort((a, b) => b.year - a.year);

  const toggleExpand = (year: number) => {
    setExpandedYear(expandedYear === year ? null : year);
  };

  const isChampionship = (season: SeasonEntry): boolean => {
    return season.userPlayoffResult?.includes('Champion') ?? false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Season History" onBack={onBack} testID="season-history-header" />

      <ScrollView style={styles.content}>
        {sortedSeasons.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No season history yet</Text>
            <Text style={styles.emptyStateHint}>Complete a season to see it here</Text>
          </View>
        )}

        {sortedSeasons.map((season) => {
          const expanded = expandedYear === season.year;
          const isChamp = isChampionship(season);

          return (
            <TouchableOpacity
              key={season.year}
              style={[styles.seasonCard, isChamp && styles.championCard]}
              onPress={() => toggleExpand(season.year)}
              activeOpacity={0.7}
              accessibilityLabel={`${season.year} season. Champion: ${season.champion.teamName}. Your record: ${season.userTeamRecord}`}
              accessibilityRole="button"
              accessibilityHint="Tap to expand season details"
              hitSlop={accessibility.hitSlop}
            >
              {/* Season Row */}
              <View style={styles.seasonRow}>
                <View style={styles.yearColumn}>
                  <Text style={[styles.yearText, isChamp && styles.championYearText]}>
                    {season.year}
                  </Text>
                  {isChamp && <Text style={styles.championBadge}>CHAMP</Text>}
                </View>
                <View style={styles.infoColumn}>
                  <Text style={styles.championName}>{season.champion.teamName}</Text>
                  <Text style={styles.championRecord}>{season.champion.record}</Text>
                </View>
                <View style={styles.userColumn}>
                  <Text style={styles.userRecord}>{season.userTeamRecord}</Text>
                  <Text style={styles.userPlayoff}>
                    {season.userPlayoffResult || 'Missed Playoffs'}
                  </Text>
                </View>
              </View>

              {/* Expanded Details */}
              {expanded && (
                <View style={styles.expandedDetails}>
                  {season.superBowlScore && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Super Bowl</Text>
                      <Text style={styles.detailValue}>{season.superBowlScore}</Text>
                    </View>
                  )}
                  {season.mvp && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>MVP</Text>
                      <Text style={styles.detailValue}>{season.mvp}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
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
    padding: spacing.md,
  },
  emptyState: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  emptyStateHint: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    textAlign: 'center',
  },
  seasonCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  championCard: {
    borderWidth: 1,
    borderColor: GOLD + '60',
    backgroundColor: GOLD + '08',
  },
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearColumn: {
    width: 60,
    alignItems: 'center',
  },
  yearText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  championYearText: {
    color: DARK_GOLD,
  },
  championBadge: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: DARK_GOLD,
    backgroundColor: GOLD + '30',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xxs,
    overflow: 'hidden',
  },
  infoColumn: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  championName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  championRecord: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  userColumn: {
    alignItems: 'flex-end',
  },
  userRecord: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  userPlayoff: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  expandedDetails: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
});

export default SeasonHistoryScreen;
