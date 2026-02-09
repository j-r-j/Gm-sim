/**
 * RumorMillScreen
 * Displays trade rumors and speculation with resolution tracking
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { ScreenHeader } from '../components';
import { GameState } from '../core/models/game/GameState';
import {
  Rumor,
  RumorType,
  RumorSourceConfidence,
  getActiveRumors,
  sortRumors,
} from '../core/news/RumorMill';
import { StoryPriority } from '../core/news/StoryTemplates';

/**
 * Props for RumorMillScreen
 */
export interface RumorMillScreenProps {
  gameState: GameState;
  rumors: Rumor[];
  onBack: () => void;
  onPlayerSelect?: (playerId: string) => void;
  onTeamSelect?: (teamId: string) => void;
}

type TabType = 'active' | 'confirmed' | 'debunked' | 'all';
type FilterType = RumorType | 'all';

/**
 * Gets display name for rumor type
 */
function getRumorTypeDisplay(type: RumorType): string {
  const typeNames: Record<RumorType, string> = {
    trade_interest: 'Trade',
    contract_demand: 'Contract',
    locker_room: 'Locker Room',
    coaching: 'Coaching',
    front_office: 'Front Office',
    performance_concern: 'Performance',
    injury_recovery: 'Injury',
  };
  return typeNames[type];
}

/**
 * Gets color for source confidence
 */
function getConfidenceColor(confidence: RumorSourceConfidence): string {
  switch (confidence) {
    case 'confirmed':
      return colors.success;
    case 'strong':
      return colors.primary;
    case 'moderate':
      return colors.warning;
    case 'whisper':
      return colors.textSecondary;
  }
}

/**
 * Gets color for priority
 */
function getPriorityColor(priority: StoryPriority): string {
  switch (priority) {
    case 'breaking':
      return colors.error;
    case 'high':
      return colors.warning;
    case 'medium':
      return colors.primary;
    case 'low':
      return colors.textSecondary;
  }
}

/**
 * Formats time remaining until expiration
 */
function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const remaining = expiresAt - now;

  if (remaining <= 0) return 'Expired';

  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h remaining`;
  return 'Expiring soon';
}

/**
 * Rumor Card Component
 */
function RumorCard({
  rumor,
  onPlayerSelect,
  onTeamSelect,
}: {
  rumor: Rumor;
  onPlayerSelect?: (playerId: string) => void;
  onTeamSelect?: (teamId: string) => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.rumorCard, rumor.isResolved && styles.resolvedCard]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.rumorHeader}>
        <View style={styles.rumorMeta}>
          <View
            style={[styles.typeBadge, { backgroundColor: getPriorityColor(rumor.priority) + '20' }]}
          >
            <Text style={[styles.typeText, { color: getPriorityColor(rumor.priority) }]}>
              {getRumorTypeDisplay(rumor.type)}
            </Text>
          </View>
          <View
            style={[
              styles.confidenceBadge,
              { backgroundColor: getConfidenceColor(rumor.sourceConfidence) + '20' },
            ]}
          >
            <Text
              style={[styles.confidenceText, { color: getConfidenceColor(rumor.sourceConfidence) }]}
            >
              {rumor.sourceConfidence.charAt(0).toUpperCase() + rumor.sourceConfidence.slice(1)}
            </Text>
          </View>
        </View>
        {!rumor.isResolved && (
          <Text style={styles.expirationText}>{formatTimeRemaining(rumor.expiresAt)}</Text>
        )}
        {rumor.isResolved && (
          <View
            style={[
              styles.resolutionBadge,
              { backgroundColor: rumor.isTrue ? colors.success + '20' : colors.error + '20' },
            ]}
          >
            <Text
              style={[
                styles.resolutionText,
                { color: rumor.isTrue ? colors.success : colors.error },
              ]}
            >
              {rumor.isTrue ? 'CONFIRMED' : 'DEBUNKED'}
            </Text>
          </View>
        )}
      </View>

      {/* Headline */}
      <Text style={styles.headline}>{rumor.headline}</Text>

      {/* Body (expanded) */}
      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.body}>{rumor.body}</Text>

          {rumor.resolution && (
            <View style={styles.resolutionBox}>
              <Text style={styles.resolutionLabel}>Resolution:</Text>
              <Text style={styles.resolutionContent}>{rumor.resolution}</Text>
            </View>
          )}

          <View style={styles.rumorFooter}>
            <Text style={styles.timestampText}>
              Season {rumor.season}, Week {rumor.week}
            </Text>
            <View style={styles.actionButtons}>
              {rumor.playerId && onPlayerSelect && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onPlayerSelect(rumor.playerId!)}
                >
                  <Text style={styles.actionButtonText}>View Player</Text>
                </TouchableOpacity>
              )}
              {rumor.teamId && onTeamSelect && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => onTeamSelect(rumor.teamId!)}
                >
                  <Text style={styles.actionButtonText}>View Team</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Expand indicator */}
      <Text style={styles.expandIndicator}>{expanded ? '▲' : '▼'}</Text>
    </TouchableOpacity>
  );
}

/**
 * Filter Chip Component
 */
function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Rumor Mill Screen Component
 */
export function RumorMillScreen({
  rumors,
  onBack,
  onPlayerSelect,
  onTeamSelect,
}: RumorMillScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');

  // Filter rumors based on tab
  const getFilteredRumors = (): Rumor[] => {
    let filtered = rumors;

    // Filter by tab
    switch (activeTab) {
      case 'active':
        filtered = getActiveRumors(filtered);
        break;
      case 'confirmed':
        filtered = filtered.filter((r) => r.isResolved && r.isTrue);
        break;
      case 'debunked':
        filtered = filtered.filter((r) => r.isResolved && !r.isTrue);
        break;
      case 'all':
        // No additional filtering
        break;
    }

    // Filter by type
    if (typeFilter !== 'all') {
      filtered = filtered.filter((r) => r.type === typeFilter);
    }

    return sortRumors(filtered);
  };

  const filteredRumors = getFilteredRumors();
  const activeCount = getActiveRumors(rumors).length;
  const confirmedCount = rumors.filter((r) => r.isResolved && r.isTrue).length;
  const debunkedCount = rumors.filter((r) => r.isResolved && !r.isTrue).length;

  const rumorTypes: FilterType[] = [
    'all',
    'trade_interest',
    'contract_demand',
    'locker_room',
    'coaching',
    'front_office',
    'performance_concern',
    'injury_recovery',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Rumor Mill" onBack={onBack} testID="rumor-mill-header" />

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({activeCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'confirmed' && styles.tabActive]}
          onPress={() => setActiveTab('confirmed')}
        >
          <Text style={[styles.tabText, activeTab === 'confirmed' && styles.tabTextActive]}>
            Confirmed ({confirmedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'debunked' && styles.tabActive]}
          onPress={() => setActiveTab('debunked')}
        >
          <Text style={[styles.tabText, activeTab === 'debunked' && styles.tabTextActive]}>
            Debunked ({debunkedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({rumors.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {rumorTypes.map((type) => (
          <FilterChip
            key={type}
            label={type === 'all' ? 'All Types' : getRumorTypeDisplay(type as RumorType)}
            active={typeFilter === type}
            onPress={() => setTypeFilter(type)}
          />
        ))}
      </ScrollView>

      {/* Rumors List */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {filteredRumors.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No rumors to display</Text>
            <Text style={styles.emptyStateSubtext}>
              {activeTab === 'active'
                ? 'Check back later for new rumors'
                : 'Try changing your filters'}
            </Text>
          </View>
        ) : (
          filteredRumors.map((rumor) => (
            <RumorCard
              key={rumor.id}
              rumor={rumor}
              onPlayerSelect={onPlayerSelect}
              onTeamSelect={onTeamSelect}
            />
          ))
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
  backButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  filterContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    marginRight: spacing.xs,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  rumorCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  resolvedCard: {
    opacity: 0.8,
  },
  rumorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rumorMeta: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  expirationText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  resolutionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  resolutionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  headline: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  expandedContent: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  resolutionBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
  },
  resolutionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  resolutionContent: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  rumorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  timestampText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.sm,
  },
  actionButtonText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  expandIndicator: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
