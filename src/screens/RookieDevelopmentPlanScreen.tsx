/**
 * RookieDevelopmentPlanScreen
 * Screen for setting up rookie development tracks during OTAs phase.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { ScreenHeader } from '../components';
import { DevelopmentTrack, FitLevel } from '../core/career/RookieDevelopment';

export interface RookieDevelopmentPlanScreenProps {
  rookies: Array<{
    playerId: string;
    playerName: string;
    position: string;
    draftRound: number;
    overallPick: number;
    currentTrack: DevelopmentTrack;
    mentorName: string | null;
    mentorQuality: number;
    schemeFit: FitLevel;
  }>;
  onUpdateTrack: (playerId: string, track: DevelopmentTrack) => void;
  onBack: () => void;
}

const TRACKS: { key: DevelopmentTrack; label: string }[] = [
  { key: 'starter', label: 'Starter' },
  { key: 'rotational', label: 'Rotational' },
  { key: 'sit_and_develop', label: 'Sit & Develop' },
];

function getTrackColor(track: DevelopmentTrack): string {
  switch (track) {
    case 'starter':
      return colors.success;
    case 'rotational':
      return colors.warning;
    case 'sit_and_develop':
      return colors.info;
  }
}

function getFitColor(fit: FitLevel): string {
  switch (fit) {
    case 'perfect':
      return colors.success;
    case 'good':
      return colors.primary;
    case 'neutral':
      return colors.textSecondary;
    case 'poor':
      return colors.error;
  }
}

function getFitLabel(fit: FitLevel): string {
  switch (fit) {
    case 'perfect':
      return 'PERFECT FIT';
    case 'good':
      return 'GOOD FIT';
    case 'neutral':
      return 'NEUTRAL';
    case 'poor':
      return 'POOR FIT';
  }
}

function getMentorQualityLabel(quality: number): string {
  if (quality >= 80) return 'Elite';
  if (quality >= 60) return 'Good';
  if (quality >= 40) return 'Average';
  return 'Below Avg';
}

function getMentorQualityColor(quality: number): string {
  if (quality >= 80) return colors.success;
  if (quality >= 60) return colors.primary;
  if (quality >= 40) return colors.textSecondary;
  return colors.error;
}

function RookieCard({
  rookie,
  onUpdateTrack,
}: {
  rookie: RookieDevelopmentPlanScreenProps['rookies'][number];
  onUpdateTrack: (playerId: string, track: DevelopmentTrack) => void;
}): React.JSX.Element {
  return (
    <View style={styles.rookieCard}>
      {/* Name and draft info */}
      <View style={styles.rookieHeader}>
        <View style={styles.rookieInfo}>
          <Text style={styles.rookieName}>{rookie.playerName}</Text>
          <Text style={styles.rookieDetail}>
            {rookie.position} | Round {rookie.draftRound}, Pick #{rookie.overallPick}
          </Text>
        </View>
        <View style={[styles.fitBadge, { backgroundColor: getFitColor(rookie.schemeFit) + '20' }]}>
          <Text style={[styles.fitBadgeText, { color: getFitColor(rookie.schemeFit) }]}>
            {getFitLabel(rookie.schemeFit)}
          </Text>
        </View>
      </View>

      {/* Track selection buttons */}
      <View style={styles.trackRow}>
        {TRACKS.map((track) => {
          const isSelected = rookie.currentTrack === track.key;
          const trackColor = getTrackColor(track.key);
          return (
            <TouchableOpacity
              key={track.key}
              style={[
                styles.trackButton,
                isSelected && { backgroundColor: trackColor + '20', borderColor: trackColor },
              ]}
              onPress={() => onUpdateTrack(rookie.playerId, track.key)}
              accessibilityLabel={`Set ${rookie.playerName} to ${track.label} track${isSelected ? ', currently selected' : ''}`}
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Text
                style={[
                  styles.trackButtonText,
                  isSelected && { color: trackColor, fontWeight: fontWeight.bold },
                ]}
              >
                {track.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Mentor line */}
      <View style={styles.mentorRow}>
        <Text style={styles.mentorLabel}>Mentor:</Text>
        {rookie.mentorName ? (
          <View style={styles.mentorInfo}>
            <Text style={styles.mentorName}>{rookie.mentorName}</Text>
            <View
              style={[
                styles.qualityBadge,
                { backgroundColor: getMentorQualityColor(rookie.mentorQuality) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.qualityBadgeText,
                  { color: getMentorQualityColor(rookie.mentorQuality) },
                ]}
              >
                {getMentorQualityLabel(rookie.mentorQuality)}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noMentor}>No mentor assigned</Text>
        )}
      </View>
    </View>
  );
}

export function RookieDevelopmentPlanScreen({
  rookies,
  onUpdateTrack,
  onBack,
}: RookieDevelopmentPlanScreenProps): React.JSX.Element {
  const summary = useMemo(() => {
    let starters = 0;
    let rotational = 0;
    let developmental = 0;
    for (const r of rookies) {
      switch (r.currentTrack) {
        case 'starter':
          starters++;
          break;
        case 'rotational':
          rotational++;
          break;
        case 'sit_and_develop':
          developmental++;
          break;
      }
    }
    return { starters, rotational, developmental };
  }, [rookies]);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="ROOKIE DEVELOPMENT" onBack={onBack} testID="rookie-dev-header" />

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: colors.success }]}>{summary.starters}</Text>
          <Text style={styles.summaryLabel}>Starters</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: colors.warning }]}>{summary.rotational}</Text>
          <Text style={styles.summaryLabel}>Rotational</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: colors.info }]}>{summary.developmental}</Text>
          <Text style={styles.summaryLabel}>Developmental</Text>
        </View>
      </View>

      {/* Rookie list */}
      <FlatList
        data={rookies}
        keyExtractor={(item) => item.playerId}
        renderItem={({ item }) => <RookieCard rookie={item} onUpdateTrack={onUpdateTrack} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyText}>No rookies on the roster</Text>}
        ListFooterComponent={
          rookies.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Projected Impact: {summary.starters} day-one contributors, {summary.rotational} role
                players, {summary.developmental} long-term projects
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryCount: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  listContent: {
    padding: spacing.md,
  },
  rookieCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rookieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  rookieInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rookieName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  rookieDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  fitBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  fitBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  trackRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  trackButton: {
    flex: 1,
    minHeight: accessibility.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
  trackButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  mentorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mentorLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  mentorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  mentorName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  qualityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  qualityBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  noMentor: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  footer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  footerText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default RookieDevelopmentPlanScreen;
