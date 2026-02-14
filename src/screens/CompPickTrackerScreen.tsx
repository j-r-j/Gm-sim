/**
 * CompPickTrackerScreen
 * Tracks compensatory draft pick calculations based on free agent losses and gains
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { ScreenHeader } from '../components';
import { GameState } from '../core/models/game/GameState';
import { CompensatoryRound } from '../core/models/league/DraftPick';
import {
  FADeparture,
  FAAcquisition,
  CompPickEntitlement,
  CompensatoryPickAward,
  TeamCompPickSummary,
  determineCompPickRound,
  MAX_COMP_PICKS_PER_TEAM,
} from '../core/freeAgency/CompensatoryPickCalculator';

/**
 * Props for CompPickTrackerScreen
 */
export interface CompPickTrackerScreenProps {
  gameState: GameState;
  summary: TeamCompPickSummary;
  leagueDepartures?: FADeparture[];
  onBack: () => void;
  onPlayerSelect?: (playerId: string) => void;
}

type TabType = 'overview' | 'losses' | 'gains' | 'picks';

/**
 * Format salary
 */
function formatSalary(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}M`;
  }
  return `$${amount}K`;
}

/**
 * Get round color
 */
function getRoundColor(round: CompensatoryRound): string {
  const roundColors: Record<CompensatoryRound, string> = {
    3: '#FFD700',
    4: colors.success,
    5: colors.primary,
    6: colors.warning,
    7: colors.textSecondary,
  };
  return roundColors[round];
}

/**
 * Departure card component
 */
function DepartureCard({
  departure,
  onPress,
}: {
  departure: FADeparture;
  onPress: () => void;
}): React.JSX.Element {
  const projectedRound = determineCompPickRound(departure.contractAAV);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityLabel={`${departure.playerName}, ${departure.position}, age ${departure.age}, ${departure.qualifyingContract ? 'qualifying' : 'non-qualifying'} departure`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.cardHeader}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{departure.playerName}</Text>
          <Text style={styles.playerDetails}>
            {departure.position} • Age {departure.age}
          </Text>
        </View>
        {departure.qualifyingContract ? (
          <View style={styles.qualifyingBadge}>
            <Text style={styles.qualifyingText}>QUALIFYING</Text>
          </View>
        ) : (
          <View style={styles.nonQualifyingBadge}>
            <Text style={styles.nonQualifyingText}>NON-QUAL</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.contractRow}>
          <Text style={styles.contractLabel}>New Contract</Text>
          <Text style={styles.contractValue}>
            {departure.contractYears}yr / {formatSalary(departure.contractTotal)}
          </Text>
        </View>
        <View style={styles.contractRow}>
          <Text style={styles.contractLabel}>AAV</Text>
          <Text style={styles.contractValue}>{formatSalary(departure.contractAAV)}</Text>
        </View>
        {projectedRound && departure.qualifyingContract && (
          <View style={styles.projectionRow}>
            <Text style={styles.projectionLabel}>Projected Comp:</Text>
            <View
              style={[styles.roundBadge, { backgroundColor: getRoundColor(projectedRound) + '20' }]}
            >
              <Text style={[styles.roundText, { color: getRoundColor(projectedRound) }]}>
                Round {projectedRound}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Acquisition card component
 */
function AcquisitionCard({
  acquisition,
  onPress,
}: {
  acquisition: FAAcquisition;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityLabel={`${acquisition.playerName}, ${acquisition.position}, age ${acquisition.age}, ${acquisition.qualifyingContract ? 'negating' : 'non-qualifying'} acquisition`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.cardHeader}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{acquisition.playerName}</Text>
          <Text style={styles.playerDetails}>
            {acquisition.position} • Age {acquisition.age}
          </Text>
        </View>
        {acquisition.qualifyingContract ? (
          <View style={styles.negatingBadge}>
            <Text style={styles.negatingText}>NEGATES</Text>
          </View>
        ) : (
          <View style={styles.nonQualifyingBadge}>
            <Text style={styles.nonQualifyingText}>NON-QUAL</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.contractRow}>
          <Text style={styles.contractLabel}>Contract</Text>
          <Text style={styles.contractValue}>
            {acquisition.contractYears}yr / {formatSalary(acquisition.contractTotal)}
          </Text>
        </View>
        <View style={styles.contractRow}>
          <Text style={styles.contractLabel}>AAV</Text>
          <Text style={styles.contractValue}>{formatSalary(acquisition.contractAAV)}</Text>
        </View>
        {acquisition.qualifyingContract && (
          <Text style={styles.negatesNote}>
            This signing may negate a compensatory pick entitlement
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Entitlement card component
 */
function EntitlementCard({
  entitlement,
  onPress,
}: {
  entitlement: CompPickEntitlement;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityLabel={`Entitlement for ${entitlement.lostPlayerName}, ${entitlement.projectedRound ? `projected round ${entitlement.projectedRound}` : 'cancelled'}`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.cardHeader}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{entitlement.lostPlayerName}</Text>
          <Text style={styles.playerDetails}>
            Lost FA • {formatSalary(entitlement.lostPlayerAAV)} AAV
          </Text>
        </View>
        {entitlement.projectedRound ? (
          <View
            style={[
              styles.roundBadge,
              { backgroundColor: getRoundColor(entitlement.projectedRound) + '20' },
            ]}
          >
            <Text style={[styles.roundText, { color: getRoundColor(entitlement.projectedRound) }]}>
              Round {entitlement.projectedRound}
            </Text>
          </View>
        ) : (
          <View style={styles.cancelledBadge}>
            <Text style={styles.cancelledText}>CANCELLED</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Net Value:</Text>
          <Text style={styles.infoValue}>{formatSalary(entitlement.netValue)}</Text>
        </View>
        {entitlement.matchedWithGain && (
          <View style={styles.matchedRow}>
            <Text style={styles.matchedLabel}>Matched with:</Text>
            <Text style={styles.matchedValue}>
              Signing ({entitlement.matchedGainPlayerId?.slice(-6)})
            </Text>
          </View>
        )}
        <Text style={styles.reasoning}>{entitlement.reasoning}</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Awarded pick card component
 */
function AwardedPickCard({ pick }: { pick: CompensatoryPickAward }): React.JSX.Element {
  return (
    <View style={styles.awardedCard}>
      <View style={styles.awardedHeader}>
        <View style={[styles.largeBadge, { backgroundColor: getRoundColor(pick.round) + '20' }]}>
          <Text style={[styles.largeBadgeText, { color: getRoundColor(pick.round) }]}>
            Round {pick.round}
          </Text>
        </View>
        <Text style={styles.awardedYear}>{pick.year} Draft</Text>
      </View>

      <View style={styles.awardedBody}>
        <Text style={styles.awardedReason}>For: {pick.associatedLossPlayerName}</Text>
        <Text style={styles.awardedValue}>Net Value: {formatSalary(pick.netValue)}</Text>
      </View>
    </View>
  );
}

/**
 * CompPickTracker Screen Component
 */
export function CompPickTrackerScreen({
  summary,
  onBack,
  onPlayerSelect,
}: CompPickTrackerScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'losses', label: 'Losses', count: summary.qualifyingLosses.length },
    { key: 'gains', label: 'Gains', count: summary.qualifyingGains.length },
    { key: 'picks', label: 'Projected', count: summary.awardedPicks.length },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="Comp Pick Tracker" onBack={onBack} testID="comp-pick-header" />

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{summary.totalLosses}</Text>
          <Text style={styles.statLabel}>Losses</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{summary.totalGains}</Text>
          <Text style={styles.statLabel}>Gains</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {formatSalary(summary.netLossValue)}
          </Text>
          <Text style={styles.statLabel}>Net Value</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {summary.awardedPicks.length}/{MAX_COMP_PICKS_PER_TEAM}
          </Text>
          <Text style={styles.statLabel}>Picks</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityLabel={`${tab.label} tab${tab.count !== undefined ? `, ${tab.count} items` : ''}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
            hitSlop={accessibility.hitSlop}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
            {tab.count !== undefined && tab.count > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How Comp Picks Work</Text>
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  Compensatory picks are awarded to teams that lose more qualifying free agents than
                  they sign. Picks are awarded in rounds 3-7 based on the contract value of the lost
                  player.
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AAV Thresholds</Text>
              <View style={styles.thresholdsCard}>
                <View style={styles.thresholdRow}>
                  <View style={[styles.roundBadge, { backgroundColor: getRoundColor(3) + '20' }]}>
                    <Text style={[styles.roundText, { color: getRoundColor(3) }]}>Round 3</Text>
                  </View>
                  <Text style={styles.thresholdValue}>$18M+</Text>
                </View>
                <View style={styles.thresholdRow}>
                  <View style={[styles.roundBadge, { backgroundColor: getRoundColor(4) + '20' }]}>
                    <Text style={[styles.roundText, { color: getRoundColor(4) }]}>Round 4</Text>
                  </View>
                  <Text style={styles.thresholdValue}>$12M - $18M</Text>
                </View>
                <View style={styles.thresholdRow}>
                  <View style={[styles.roundBadge, { backgroundColor: getRoundColor(5) + '20' }]}>
                    <Text style={[styles.roundText, { color: getRoundColor(5) }]}>Round 5</Text>
                  </View>
                  <Text style={styles.thresholdValue}>$8M - $12M</Text>
                </View>
                <View style={styles.thresholdRow}>
                  <View style={[styles.roundBadge, { backgroundColor: getRoundColor(6) + '20' }]}>
                    <Text style={[styles.roundText, { color: getRoundColor(6) }]}>Round 6</Text>
                  </View>
                  <Text style={styles.thresholdValue}>$4M - $8M</Text>
                </View>
                <View style={styles.thresholdRow}>
                  <View style={[styles.roundBadge, { backgroundColor: getRoundColor(7) + '20' }]}>
                    <Text style={[styles.roundText, { color: getRoundColor(7) }]}>Round 7</Text>
                  </View>
                  <Text style={styles.thresholdValue}>$1.5M - $4M</Text>
                </View>
              </View>
            </View>

            {summary.entitlements.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Your Entitlements</Text>
                {summary.entitlements.map((entitlement) => (
                  <EntitlementCard
                    key={entitlement.lostPlayerId}
                    entitlement={entitlement}
                    onPress={() => onPlayerSelect?.(entitlement.lostPlayerId)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'losses' && (
          <>
            {summary.qualifyingLosses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Qualifying Losses</Text>
                <Text style={styles.emptySubtext}>
                  Free agents that sign qualifying contracts elsewhere will appear here
                </Text>
              </View>
            ) : (
              summary.qualifyingLosses.map((departure) => (
                <DepartureCard
                  key={departure.id}
                  departure={departure}
                  onPress={() => onPlayerSelect?.(departure.playerId)}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'gains' && (
          <>
            {summary.qualifyingGains.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Qualifying Signings</Text>
                <Text style={styles.emptySubtext}>
                  Free agents you sign on qualifying contracts will appear here
                </Text>
              </View>
            ) : (
              summary.qualifyingGains.map((acquisition) => (
                <AcquisitionCard
                  key={acquisition.id}
                  acquisition={acquisition}
                  onPress={() => onPlayerSelect?.(acquisition.playerId)}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'picks' && (
          <>
            {summary.awardedPicks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Projected Picks</Text>
                <Text style={styles.emptySubtext}>
                  Lose more qualifying free agents than you sign to earn comp picks
                </Text>
              </View>
            ) : (
              summary.awardedPicks.map((pick, index) => (
                <AwardedPickCard key={`${pick.round}-${index}`} pick={pick} />
              ))
            )}
          </>
        )}

        <View style={styles.bottomPadding} />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  countBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  thresholdsCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  thresholdValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  playerDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  qualifyingBadge: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  qualifyingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  nonQualifyingBadge: {
    backgroundColor: colors.textSecondary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  nonQualifyingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  negatingBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  negatingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  cancelledBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  cancelledText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  cardBody: {
    padding: spacing.md,
  },
  contractRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  contractLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contractValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  projectionLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  roundBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roundText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  negatesNote: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  matchedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  matchedLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  matchedValue: {
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  reasoning: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  awardedCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.success,
    overflow: 'hidden',
  },
  awardedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.success + '10',
  },
  largeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  largeBadgeText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  awardedYear: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  awardedBody: {
    padding: spacing.md,
  },
  awardedReason: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  awardedValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default CompPickTrackerScreen;
