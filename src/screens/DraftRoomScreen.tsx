/**
 * DraftRoomScreen
 * Draft room interface with pick/trade controls and real-time draft flow.
 *
 * BRAND GUIDELINES:
 * - NO overall rating anywhere
 * - Focus on projected picks and user evaluation
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../styles';
import { Button } from '../components';
import { Position } from '../core/models/player/Position';
import {
  DraftPickCard,
  TradeOfferCard,
  ProspectListItem,
  type TradeAsset,
} from '../components/draft';

/**
 * Draft pick information
 */
export interface DraftPick {
  round: number;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbr: string;
  originalTeamId?: string;
  originalTeamAbbr?: string;
  selectedProspectId?: string;
  selectedProspectName?: string;
}

/**
 * Trade offer
 */
export interface TradeOffer {
  tradeId: string;
  proposingTeam: {
    id: string;
    name: string;
    abbr: string;
  };
  offering: TradeAsset[];
  requesting: TradeAsset[];
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  expiresIn?: number;
}

/**
 * Simple prospect for draft room list
 */
export interface DraftRoomProspect {
  id: string;
  name: string;
  position: Position;
  collegeName: string;
  projectedRound: number | null;
  projectedPickRange: { min: number; max: number } | null;
  userTier: string | null;
  flagged: boolean;
  positionRank: number | null;
  overallRank: number | null;
  isDrafted: boolean;
}

/**
 * Props for DraftRoomScreen
 */
export interface DraftRoomScreenProps {
  /** Current pick information */
  currentPick: DraftPick;
  /** User's team ID */
  userTeamId: string;
  /** Recent picks (last 5) */
  recentPicks: DraftPick[];
  /** Upcoming picks (next 5) */
  upcomingPicks: DraftPick[];
  /** Available prospects (not drafted) */
  availableProspects: DraftRoomProspect[];
  /** Incoming trade offers */
  tradeOffers: TradeOffer[];
  /** Whether auto-pick is enabled */
  autoPickEnabled: boolean;
  /** Time remaining for current pick (seconds) */
  timeRemaining?: number;
  /** Whether draft is paused */
  isPaused: boolean;
  /** Callback to select a prospect */
  onSelectProspect: (prospectId: string) => void;
  /** Callback to view prospect profile */
  onViewProspect: (prospectId: string) => void;
  /** Callback to accept a trade */
  onAcceptTrade: (tradeId: string) => void;
  /** Callback to reject a trade */
  onRejectTrade: (tradeId: string) => void;
  /** Callback to counter a trade */
  onCounterTrade: (tradeId: string) => void;
  /** Callback to propose a trade */
  onProposeTrade: () => void;
  /** Callback to toggle auto-pick */
  onToggleAutoPick: () => void;
  /** Callback to pause/resume draft */
  onTogglePause: () => void;
  /** Callback to go back */
  onBack?: () => void;
}

/**
 * Tab options for the draft room
 */
type DraftRoomTab = 'board' | 'trades' | 'picks';

/**
 * DraftRoomScreen Component
 */
export function DraftRoomScreen({
  currentPick,
  userTeamId,
  recentPicks,
  upcomingPicks,
  availableProspects,
  tradeOffers,
  autoPickEnabled,
  timeRemaining,
  isPaused,
  onSelectProspect,
  onViewProspect,
  onAcceptTrade,
  onRejectTrade,
  onCounterTrade,
  onProposeTrade,
  onToggleAutoPick,
  onTogglePause,
  onBack,
}: DraftRoomScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<DraftRoomTab>('board');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const isUserPick = currentPick.teamId === userTeamId;
  const safeTradeOffers = tradeOffers ?? [];
  const pendingTradeOffers = safeTradeOffers.filter((t) => t.status === 'pending');

  // Filter available prospects
  const filteredProspects = useMemo(() => {
    let result = availableProspects.filter((p) => !p.isDrafted);
    if (showFlaggedOnly) {
      result = result.filter((p) => p.flagged);
    }
    return result.slice(0, 20); // Limit for performance in draft room
  }, [availableProspects, showFlaggedOnly]);

  // Handle draft selection
  const handleDraftPlayer = useCallback(
    (prospectId: string) => {
      const prospect = availableProspects.find((p) => p.id === prospectId);
      if (!prospect) return;

      Alert.alert(
        'Confirm Selection',
        `Select ${prospect.name} with pick #${currentPick.pickNumber}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Select',
            style: 'default',
            onPress: () => onSelectProspect(prospectId),
          },
        ]
      );
    },
    [availableProspects, currentPick.pickNumber, onSelectProspect]
  );

  // Render prospect item
  const renderProspect = useCallback(
    ({ item }: { item: DraftRoomProspect }) => (
      <ProspectListItem
        id={item.id}
        name={item.name}
        position={item.position}
        collegeName={item.collegeName}
        projectedRound={item.projectedRound}
        projectedPickRange={item.projectedPickRange}
        userTier={item.userTier}
        flagged={item.flagged}
        positionRank={item.positionRank}
        overallRank={item.overallRank}
        onPress={() => onViewProspect(item.id)}
        onLongPress={isUserPick ? () => handleDraftPlayer(item.id) : undefined}
      />
    ),
    [isUserPick, handleDraftPlayer, onViewProspect]
  );

  // Render trade offer
  const renderTradeOffer = useCallback(
    ({ item }: { item: TradeOffer }) => (
      <TradeOfferCard
        tradeId={item.tradeId}
        proposingTeam={item.proposingTeam}
        offering={item.offering}
        requesting={item.requesting}
        isIncoming={true}
        status={item.status}
        expiresIn={item.expiresIn}
        onAccept={() => onAcceptTrade(item.tradeId)}
        onReject={() => onRejectTrade(item.tradeId)}
        onCounter={() => onCounterTrade(item.tradeId)}
      />
    ),
    [onAcceptTrade, onRejectTrade, onCounterTrade]
  );

  // Render pick history item
  const renderPickItem = useCallback(
    (pick: DraftPick, index: number, isRecent: boolean) => (
      <View
        key={`${isRecent ? 'recent' : 'upcoming'}-${pick.pickNumber}`}
        style={[styles.pickHistoryItem, pick.teamId === userTeamId && styles.pickHistoryItemUser]}
      >
        <View style={styles.pickNumberBadge}>
          <Text style={styles.pickNumberText}>#{pick.pickNumber}</Text>
        </View>
        <View style={styles.pickInfo}>
          <Text style={styles.pickTeamName}>{pick.teamAbbr}</Text>
          {pick.selectedProspectName ? (
            <Text style={styles.pickSelection}>{pick.selectedProspectName}</Text>
          ) : (
            <Text style={styles.pickPending}>--</Text>
          )}
        </View>
        <Text style={styles.pickRound}>Rd {pick.round}</Text>
      </View>
    ),
    [userTeamId]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityLabel="Exit draft room"
            accessibilityRole="button"
            accessibilityHint="Returns to the previous screen"
            hitSlop={accessibility.hitSlop}
          >
            <Ionicons name="close" size={24} color={colors.textOnPrimary} />
            <Text style={styles.backButtonText}>Exit</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle} accessibilityRole="header">
          Draft Room
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.pauseButton, isPaused && styles.pauseButtonActive]}
            onPress={onTogglePause}
            accessibilityLabel={isPaused ? 'Resume draft' : 'Pause draft'}
            accessibilityRole="button"
            accessibilityState={{ expanded: !isPaused }}
            hitSlop={accessibility.hitSlop}
          >
            <Ionicons name={isPaused ? 'play' : 'pause'} size={16} color={colors.textOnPrimary} />
            <Text style={styles.pauseButtonText}>{isPaused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Current Pick Card */}
      <View style={styles.currentPickContainer}>
        <DraftPickCard
          round={currentPick.round}
          pickNumber={currentPick.pickNumber}
          teamName={currentPick.teamName}
          teamAbbr={currentPick.teamAbbr}
          isUserPick={isUserPick}
          timeRemaining={timeRemaining}
          originalTeamAbbr={currentPick.originalTeamAbbr}
        />
      </View>

      {/* Auto-pick toggle (for user picks) */}
      {isUserPick && (
        <View style={styles.autoPickContainer}>
          <Text style={styles.autoPickLabel}>Auto-pick:</Text>
          <TouchableOpacity
            style={[styles.autoPickToggle, autoPickEnabled && styles.autoPickToggleActive]}
            onPress={onToggleAutoPick}
            accessibilityLabel={`Auto-pick ${autoPickEnabled ? 'enabled' : 'disabled'}`}
            accessibilityRole="switch"
            accessibilityState={{ checked: autoPickEnabled }}
            accessibilityHint="Toggle automatic player selection"
            hitSlop={accessibility.hitSlop}
          >
            <Text
              style={[
                styles.autoPickToggleText,
                autoPickEnabled && styles.autoPickToggleTextActive,
              ]}
            >
              {autoPickEnabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
          {!autoPickEnabled && (
            <Text style={styles.instructionText}>Long press a prospect to draft</Text>
          )}
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabContainer} accessibilityRole="tablist">
        <TouchableOpacity
          style={[styles.tab, activeTab === 'board' && styles.tabActive]}
          onPress={() => setActiveTab('board')}
          accessibilityLabel="Draft board"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'board' }}
          hitSlop={accessibility.hitSlop}
        >
          <Ionicons
            name="list"
            size={16}
            color={activeTab === 'board' ? colors.textOnPrimary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'board' && styles.tabTextActive]}>Board</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trades' && styles.tabActive]}
          onPress={() => setActiveTab('trades')}
          accessibilityLabel={`Trades${pendingTradeOffers.length > 0 ? `, ${pendingTradeOffers.length} pending` : ''}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'trades' }}
          hitSlop={accessibility.hitSlop}
        >
          <Ionicons
            name="swap-horizontal"
            size={16}
            color={activeTab === 'trades' ? colors.textOnPrimary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'trades' && styles.tabTextActive]}>
            Trades {pendingTradeOffers.length > 0 && `(${pendingTradeOffers.length})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'picks' && styles.tabActive]}
          onPress={() => setActiveTab('picks')}
          accessibilityLabel="Pick history"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'picks' }}
          hitSlop={accessibility.hitSlop}
        >
          <Ionicons
            name="time"
            size={16}
            color={activeTab === 'picks' ? colors.textOnPrimary : colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'picks' && styles.tabTextActive]}>Picks</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'board' && (
        <View style={styles.tabContent}>
          {/* Filter bar */}
          <View style={styles.boardFilterBar}>
            <TouchableOpacity
              style={[styles.flagFilterButton, showFlaggedOnly && styles.flagFilterButtonActive]}
              onPress={() => setShowFlaggedOnly(!showFlaggedOnly)}
              accessibilityLabel={`Show ${showFlaggedOnly ? 'all prospects' : 'flagged only'}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: showFlaggedOnly }}
              hitSlop={accessibility.hitSlop}
            >
              <Ionicons
                name={showFlaggedOnly ? 'star' : 'star-outline'}
                size={16}
                color={showFlaggedOnly ? colors.secondary : colors.textSecondary}
              />
              <Text style={[styles.flagFilterText, showFlaggedOnly && styles.flagFilterTextActive]}>
                Flagged Only
              </Text>
            </TouchableOpacity>
            <Text style={styles.boardCount}>{filteredProspects.length} available</Text>
          </View>

          <FlatList
            data={filteredProspects}
            keyExtractor={(item) => item.id}
            renderItem={renderProspect}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No prospects available</Text>
              </View>
            }
          />
        </View>
      )}

      {activeTab === 'trades' && (
        <View style={styles.tabContent}>
          <View style={styles.proposeTradeContainer}>
            <Button
              label="Propose Trade"
              onPress={onProposeTrade}
              variant="primary"
              leftIcon={<Ionicons name="add-circle" size={18} color={colors.textOnPrimary} />}
              accessibilityHint="Opens trade proposal interface"
              testID="propose-trade-button"
            />
          </View>

          <FlatList
            data={safeTradeOffers}
            keyExtractor={(item) => item.tradeId}
            renderItem={renderTradeOffer}
            contentContainerStyle={styles.tradeListContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No trade offers</Text>
              </View>
            }
          />
        </View>
      )}

      {activeTab === 'picks' && (
        <ScrollView style={styles.tabContent}>
          {/* Recent Picks */}
          <View style={styles.picksSection}>
            <Text style={styles.picksSectionTitle}>Recent Picks</Text>
            {recentPicks.length > 0 ? (
              recentPicks.map((pick, index) => renderPickItem(pick, index, true))
            ) : (
              <Text style={styles.noPicksText}>No picks made yet</Text>
            )}
          </View>

          {/* Upcoming Picks */}
          <View style={styles.picksSection}>
            <Text style={styles.picksSectionTitle}>Upcoming</Text>
            {upcomingPicks && upcomingPicks.length > 0 ? (
              upcomingPicks.map((pick, index) => renderPickItem(pick, index, false))
            ) : (
              <Text style={styles.noPicksText}>No upcoming picks</Text>
            )}
          </View>
        </ScrollView>
      )}
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
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: accessibility.minTouchTarget,
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minHeight: accessibility.minTouchTarget,
  },
  pauseButtonActive: {
    backgroundColor: colors.warning,
  },
  pauseButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  currentPickContainer: {
    padding: spacing.md,
  },
  autoPickContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  autoPickLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  autoPickToggle: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  autoPickToggleActive: {
    backgroundColor: colors.success,
  },
  autoPickToggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  autoPickToggleTextActive: {
    color: colors.textOnPrimary,
  },
  instructionText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
    marginLeft: spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    minHeight: accessibility.minTouchTarget,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textOnPrimary,
  },
  tabContent: {
    flex: 1,
    marginTop: spacing.md,
  },
  boardFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  flagFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minHeight: accessibility.minTouchTarget,
  },
  flagFilterButtonActive: {
    backgroundColor: colors.secondary + '20',
  },
  flagFilterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  flagFilterTextActive: {
    color: colors.secondary,
    fontWeight: fontWeight.bold,
  },
  boardCount: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  proposeTradeContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  tradeListContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  picksSection: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  picksSectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  pickHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickHistoryItemUser: {
    backgroundColor: colors.primary + '10',
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  pickNumberBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    minWidth: 50,
    alignItems: 'center',
  },
  pickNumberText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  pickInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  pickTeamName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  pickSelection: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  pickPending: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  pickRound: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  noPicksText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
  },
});

export default DraftRoomScreen;
