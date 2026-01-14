/**
 * BigBoardScreen
 * Displays the team's big board with draft prospect rankings
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { GameState } from '../core/models/game/GameState';
import { Position } from '../core/models/player/Position';
import {
  DraftTier,
  DraftBoardProspectView,
  DraftBoardViewModel,
} from '../core/scouting/DraftBoardManager';
import { NeedLevel, ProspectRanking } from '../core/scouting/BigBoardGenerator';

/**
 * Props for BigBoardScreen
 */
export interface BigBoardScreenProps {
  gameState: GameState;
  viewModel: DraftBoardViewModel;
  rankings: ProspectRanking[];
  positionalNeeds: Partial<Record<Position, NeedLevel>>;
  onBack: () => void;
  onProspectSelect?: (prospectId: string) => void;
  onUpdateRank?: (prospectId: string, newRank: number) => void;
  onToggleLock?: (prospectId: string) => void;
  onAddNotes?: (prospectId: string, notes: string) => void;
}

type TabType = 'overall' | 'position' | 'tier' | 'needs';

const POSITIONS = Object.values(Position);
const TIERS: DraftTier[] = [
  'elite',
  'first_round',
  'second_round',
  'day_two',
  'day_three',
  'priority_fa',
  'draftable',
];

/**
 * Get tier display name
 */
function getTierLabel(tier: DraftTier): string {
  const labels: Record<DraftTier, string> = {
    elite: 'Elite',
    first_round: '1st Round',
    second_round: '2nd Round',
    day_two: 'Day 2',
    day_three: 'Day 3',
    priority_fa: 'Priority FA',
    draftable: 'Draftable',
  };
  return labels[tier];
}

/**
 * Get tier color
 */
function getTierColor(tier: DraftTier | null): string {
  if (!tier) return colors.textSecondary;
  const tierColors: Record<DraftTier, string> = {
    elite: '#FFD700',
    first_round: colors.success,
    second_round: '#4CAF50',
    day_two: colors.primary,
    day_three: colors.warning,
    priority_fa: colors.textSecondary,
    draftable: colors.textSecondary,
  };
  return tierColors[tier];
}

/**
 * Get need level color
 */
function getNeedColor(need: NeedLevel): string {
  const needColors: Record<NeedLevel, string> = {
    critical: colors.error,
    high: colors.warning,
    moderate: colors.primary,
    low: colors.success,
    none: colors.textSecondary,
  };
  return needColors[need];
}

/**
 * Prospect row component
 */
function ProspectRow({
  prospect,
  rank,
  showNeed,
  needLevel,
  onPress,
  onToggleLock,
}: {
  prospect: DraftBoardProspectView;
  rank: number;
  showNeed?: boolean;
  needLevel?: NeedLevel;
  onPress: () => void;
  onToggleLock?: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.prospectRow} onPress={onPress}>
      <View style={styles.rankColumn}>
        <Text style={styles.rankNumber}>#{rank}</Text>
        {prospect.userRank && prospect.userRank !== rank && (
          <Text style={styles.userRankLabel}>User: #{prospect.userRank}</Text>
        )}
      </View>

      <View style={styles.prospectInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.prospectName}>{prospect.prospectName}</Text>
          {prospect.isLocked && (
            <TouchableOpacity style={styles.lockBadge} onPress={onToggleLock}>
              <Text style={styles.lockText}>🔒</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.prospectPosition}>{prospect.position}</Text>
      </View>

      <View style={styles.gradesColumn}>
        <View style={[styles.tierBadge, { backgroundColor: getTierColor(prospect.tier) + '20' }]}>
          <Text style={[styles.tierText, { color: getTierColor(prospect.tier) }]}>
            {prospect.tier ? getTierLabel(prospect.tier) : 'Untiered'}
          </Text>
        </View>
        <Text style={styles.roundProjection}>Rd {prospect.projectedRound}</Text>
      </View>

      <View style={styles.confidenceColumn}>
        <Text style={styles.overallRange}>{prospect.overallRange}</Text>
        <Text
          style={[
            styles.confidenceText,
            { color: prospect.confidenceScore >= 70 ? colors.success : colors.warning },
          ]}
        >
          {prospect.confidence}
        </Text>
      </View>

      {showNeed && needLevel && (
        <View style={styles.needColumn}>
          <View style={[styles.needBadge, { backgroundColor: getNeedColor(needLevel) + '20' }]}>
            <Text style={[styles.needText, { color: getNeedColor(needLevel) }]}>
              {needLevel.toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.flagsColumn}>
        {prospect.hasFocusReport && <Text style={styles.flagIcon}>🎯</Text>}
        {prospect.needsMoreScouting && <Text style={styles.flagIcon}>📋</Text>}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Big Board Screen Component
 */
export function BigBoardScreen({
  viewModel,
  rankings: _rankings,
  positionalNeeds,
  onBack,
  onProspectSelect,
  onToggleLock,
}: BigBoardScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('overall');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedTier, setSelectedTier] = useState<DraftTier | null>(null);

  const handleProspectPress = (prospectId: string) => {
    onProspectSelect?.(prospectId);
  };

  // Filter prospects based on active tab and filters
  const getFilteredProspects = (): DraftBoardProspectView[] => {
    let filtered = [...viewModel.prospects];

    if (activeTab === 'position' && selectedPosition) {
      filtered = filtered.filter((p) => p.position === selectedPosition);
    }

    if (activeTab === 'tier' && selectedTier) {
      filtered = filtered.filter((p) => p.tier === selectedTier);
    }

    if (activeTab === 'needs') {
      // Sort by need level importance
      const needOrder: NeedLevel[] = ['critical', 'high', 'moderate', 'low', 'none'];
      filtered.sort((a, b) => {
        const needA = positionalNeeds[a.position] || 'moderate';
        const needB = positionalNeeds[b.position] || 'moderate';
        return needOrder.indexOf(needA) - needOrder.indexOf(needB);
      });
    }

    return filtered;
  };

  const filteredProspects = getFilteredProspects();

  const tabs: { key: TabType; label: string }[] = [
    { key: 'overall', label: 'Overall' },
    { key: 'position', label: 'By Position' },
    { key: 'tier', label: 'By Tier' },
    { key: 'needs', label: 'Team Needs' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Big Board</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{viewModel.totalProspects}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{viewModel.rankedProspects}</Text>
          <Text style={styles.statLabel}>Ranked</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{viewModel.focusedCount}</Text>
          <Text style={styles.statLabel}>Focus</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{viewModel.needsScoutingCount}</Text>
          <Text style={styles.statLabel}>Need Scout</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Position/Tier Filter */}
      {activeTab === 'position' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {POSITIONS.map((pos) => (
            <TouchableOpacity
              key={pos}
              style={[styles.filterChip, selectedPosition === pos && styles.activeFilterChip]}
              onPress={() => setSelectedPosition(selectedPosition === pos ? null : pos)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedPosition === pos && styles.activeFilterChipText,
                ]}
              >
                {pos}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {activeTab === 'tier' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {TIERS.map((tier) => (
            <TouchableOpacity
              key={tier}
              style={[
                styles.filterChip,
                selectedTier === tier && styles.activeFilterChip,
                { borderColor: getTierColor(tier) },
              ]}
              onPress={() => setSelectedTier(selectedTier === tier ? null : tier)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedTier === tier && styles.activeFilterChipText,
                ]}
              >
                {getTierLabel(tier)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Column Headers */}
      <View style={styles.columnHeaders}>
        <Text style={[styles.columnHeader, styles.rankHeader]}>Rank</Text>
        <Text style={[styles.columnHeader, styles.nameHeader]}>Player</Text>
        <Text style={[styles.columnHeader, styles.gradeHeader]}>Grade</Text>
        <Text style={[styles.columnHeader, styles.confHeader]}>OVR</Text>
        {activeTab === 'needs' && (
          <Text style={[styles.columnHeader, styles.needHeader]}>Need</Text>
        )}
        <Text style={[styles.columnHeader, styles.flagHeader]}>Info</Text>
      </View>

      {/* Prospect List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredProspects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Prospects</Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'position' && selectedPosition
                ? `No ${selectedPosition} prospects scouted yet`
                : activeTab === 'tier' && selectedTier
                  ? `No ${getTierLabel(selectedTier)} prospects`
                  : 'Scout some prospects to build your board'}
            </Text>
          </View>
        ) : (
          <>
            {filteredProspects.map((prospect, index) => (
              <ProspectRow
                key={prospect.prospectId}
                prospect={prospect}
                rank={index + 1}
                showNeed={activeTab === 'needs'}
                needLevel={positionalNeeds[prospect.position]}
                onPress={() => handleProspectPress(prospect.prospectId)}
                onToggleLock={onToggleLock ? () => onToggleLock(prospect.prospectId) : undefined}
              />
            ))}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🎯</Text>
          <Text style={styles.legendText}>Focus Report</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>📋</Text>
          <Text style={styles.legendText}>Needs Scouting</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendIcon}>🔒</Text>
          <Text style={styles.legendText}>Locked</Text>
        </View>
      </View>
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
    paddingVertical: spacing.sm,
    alignItems: 'center',
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
  filterContainer: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  activeFilterChip: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  activeFilterChipText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  columnHeaders: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  columnHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  rankHeader: {
    width: 50,
  },
  nameHeader: {
    flex: 1,
  },
  gradeHeader: {
    width: 70,
    textAlign: 'center',
  },
  confHeader: {
    width: 50,
    textAlign: 'center',
  },
  needHeader: {
    width: 60,
    textAlign: 'center',
  },
  flagHeader: {
    width: 50,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  prospectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rankColumn: {
    width: 50,
  },
  rankNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  userRankLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  prospectInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  prospectName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  lockBadge: {
    padding: 2,
  },
  lockText: {
    fontSize: fontSize.sm,
  },
  prospectPosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  gradesColumn: {
    width: 70,
    alignItems: 'center',
  },
  tierBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
  },
  tierText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  roundProjection: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  confidenceColumn: {
    width: 50,
    alignItems: 'center',
  },
  overallRange: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  confidenceText: {
    fontSize: fontSize.xs,
  },
  needColumn: {
    width: 60,
    alignItems: 'center',
  },
  needBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  needText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  flagsColumn: {
    width: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  flagIcon: {
    fontSize: fontSize.sm,
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
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendIcon: {
    fontSize: fontSize.sm,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});

export default BigBoardScreen;
