/**
 * HallOfFameScreen
 * Display retired players with Hall of Fame status
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { ScreenHeader } from '../components';

interface HallOfFameInductee {
  name: string;
  position: string;
  teams: string[];
  yearsActive: string;
  careerHighlights: string[];
  legacyTier: string;
}

interface HallOfFameScreenProps {
  inductees: HallOfFameInductee[];
  onBack: () => void;
}

const GOLD = '#FFD700';
const DARK_GOLD = '#B8860B';

function getLegacyTierLabel(tier: string): string {
  switch (tier) {
    case 'first-ballot':
      return 'First Ballot';
    case 'hall-of-famer':
      return 'Hall of Famer';
    default:
      return tier
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
  }
}

function isFirstBallot(tier: string): boolean {
  return tier === 'first-ballot';
}

export function HallOfFameScreen({ inductees, onBack }: HallOfFameScreenProps): React.JSX.Element {
  const firstBallot = inductees.filter((i) => isFirstBallot(i.legacyTier));
  const hallOfFamers = inductees.filter((i) => !isFirstBallot(i.legacyTier));

  const renderInducteeCard = (inductee: HallOfFameInductee, index: number) => {
    const first = isFirstBallot(inductee.legacyTier);

    return (
      <View
        key={`${inductee.name}-${index}`}
        style={[styles.inducteeCard, first && styles.firstBallotCard]}
        accessibilityLabel={`${inductee.name}, ${inductee.position}. ${getLegacyTierLabel(inductee.legacyTier)}. Teams: ${inductee.teams.join(', ')}. Years: ${inductee.yearsActive}`}
      >
        {/* Header */}
        <View style={styles.inducteeHeader}>
          <View style={styles.inducteeNameRow}>
            <Text style={[styles.inducteeName, first && styles.firstBallotName]}>
              {inductee.name}
            </Text>
            <Text style={styles.inducteePosition}>{inductee.position}</Text>
          </View>
          <View style={[styles.tierBadge, first && styles.firstBallotBadge]}>
            <Text style={[styles.tierBadgeText, first && styles.firstBallotBadgeText]}>
              {getLegacyTierLabel(inductee.legacyTier)}
            </Text>
          </View>
        </View>

        {/* Teams and Years */}
        <View style={styles.inducteeMeta}>
          <Text style={styles.inducteeTeams}>{inductee.teams.join(' | ')}</Text>
          <Text style={styles.inducteeYears}>{inductee.yearsActive}</Text>
        </View>

        {/* Career Highlights */}
        {inductee.careerHighlights.length > 0 && (
          <View style={styles.highlightsList}>
            {inductee.careerHighlights.map((highlight, hIndex) => (
              <View key={hIndex} style={styles.highlightItem}>
                <View style={[styles.highlightBullet, first && styles.firstBallotBullet]} />
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Hall of Fame" onBack={onBack} testID="hall-of-fame-header" />

      <ScrollView style={styles.content}>
        {/* Gold Header */}
        <View style={styles.hofHeader}>
          <Text style={styles.hofHeaderText} accessibilityLabel="Hall of Fame">
            [HOF]
          </Text>
          <Text style={styles.hofTitle}>Hall of Fame</Text>
          <Text style={styles.hofSubtitle}>
            {inductees.length} Inductee{inductees.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {inductees.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No Hall of Fame inductees yet</Text>
            <Text style={styles.emptyStateHint}>
              Players with exceptional careers will be inducted here after retirement
            </Text>
          </View>
        )}

        {/* First Ballot Section */}
        {firstBallot.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>First Ballot</Text>
            {firstBallot.map((inductee, index) => renderInducteeCard(inductee, index))}
          </View>
        )}

        {/* Hall of Famer Section */}
        {hallOfFamers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hall of Famers</Text>
            {hallOfFamers.map((inductee, index) => renderInducteeCard(inductee, index))}
          </View>
        )}
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
  hofHeader: {
    backgroundColor: DARK_GOLD,
    padding: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  hofHeaderText: {
    fontSize: fontSize.display,
    color: GOLD,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.sm,
  },
  hofTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: GOLD,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  hofSubtitle: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    opacity: 0.9,
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
  section: {
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  inducteeCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  firstBallotCard: {
    borderWidth: 2,
    borderColor: GOLD,
    backgroundColor: GOLD + '08',
  },
  inducteeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  inducteeNameRow: {
    flex: 1,
    marginRight: spacing.sm,
  },
  inducteeName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  firstBallotName: {
    color: DARK_GOLD,
  },
  inducteePosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  tierBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  firstBallotBadge: {
    backgroundColor: GOLD + '30',
  },
  tierBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  firstBallotBadgeText: {
    color: DARK_GOLD,
  },
  inducteeMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  inducteeTeams: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  inducteeYears: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  highlightsList: {
    gap: spacing.xs,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  highlightBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 6,
    marginRight: spacing.sm,
  },
  firstBallotBullet: {
    backgroundColor: DARK_GOLD,
  },
  highlightText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text,
    lineHeight: 18,
  },
});

export default HallOfFameScreen;
