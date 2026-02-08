/**
 * RosterScreen
 * Displays and manages the team roster
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Modal,
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
import { ScreenHeader, Button } from '../components';
import { Player } from '../core/models/player/Player';
import {
  OFFENSIVE_POSITIONS,
  DEFENSIVE_POSITIONS,
  SPECIAL_TEAMS_POSITIONS,
} from '../core/models/player/Position';
import { PlayerCard } from '../components/player/PlayerCard';

/**
 * Cut preview info passed to the screen
 */
export interface CutPreview {
  playerId: string;
  playerName: string;
  capSavings: number;
  deadMoney: number;
  recommendation: string;
}

/**
 * Extension offer
 */
export interface ExtensionOffer {
  years: number;
  totalValue: number;
  guaranteed: number;
}

/**
 * Props for RosterScreen
 */
export interface RosterScreenProps {
  /** Team's player IDs */
  rosterIds: string[];
  /** All players */
  players: Record<string, Player>;
  /** Team's salary cap space */
  capSpace: number;
  /** Callback to go back */
  onBack: () => void;
  /** Callback when player is selected */
  onSelectPlayer?: (playerId: string) => void;
  /** Get cut preview for a player */
  onGetCutPreview?: (playerId: string) => CutPreview | null;
  /** Callback to cut a player */
  onCutPlayer?: (playerId: string) => Promise<boolean>;
  /** Check if player is extension eligible */
  isExtensionEligible?: (playerId: string) => boolean;
  /** Callback to extend a player */
  onExtendPlayer?: (
    playerId: string,
    offer: ExtensionOffer
  ) => Promise<'accepted' | 'rejected' | 'counter'>;
  /** Navigate to trade screen */
  onTrade?: () => void;
}

type PositionFilter = 'all' | 'offense' | 'defense' | 'special';

/**
 * Format money for display
 */
function formatMoney(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}

/**
 * Roster player card wrapper - uses refactored PlayerCard with action buttons overlay
 */
function RosterPlayerCard({
  player,
  onPress,
  onCut,
  onExtend,
  canExtend,
}: {
  player: Player;
  onPress?: () => void;
  onCut?: () => void;
  onExtend?: () => void;
  canExtend?: boolean;
}) {
  const [showActions, setShowActions] = useState(false);

  const handlePress = () => {
    if (showActions) {
      setShowActions(false);
    } else {
      onPress?.();
    }
  };

  const handleLongPress = () => {
    setShowActions(!showActions);
  };

  return (
    <View style={styles.rosterCardContainer}>
      <PlayerCard
        id={player.id}
        firstName={player.firstName}
        lastName={player.lastName}
        position={player.position}
        age={player.age}
        experience={player.experience}
        skills={player.skills}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
      {showActions && (
        <View style={styles.actionsOverlay}>
          {canExtend && (
            <TouchableOpacity
              style={styles.extendButton}
              onPress={onExtend}
              accessibilityLabel={`Extend ${player.firstName} ${player.lastName}`}
              accessibilityRole="button"
              accessibilityHint="Opens contract extension negotiation"
              hitSlop={accessibility.hitSlop}
            >
              <Ionicons name="document-text" size={14} color={colors.textOnPrimary} />
              <Text style={styles.extendButtonText}>Extend</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.cutButton}
            onPress={onCut}
            accessibilityLabel={`Cut ${player.firstName} ${player.lastName}`}
            accessibilityRole="button"
            accessibilityHint="Opens release confirmation"
            hitSlop={accessibility.hitSlop}
          >
            <Ionicons name="close-circle" size={14} color={colors.textOnPrimary} />
            <Text style={styles.cutButtonText}>Cut</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * Cut confirmation modal
 */
function CutModal({
  visible,
  preview,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  preview: CutPreview | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!preview) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Cut Player</Text>
          <Text style={styles.modalPlayerName}>{preview.playerName}</Text>

          <View style={styles.cutDetails}>
            <View style={styles.cutRow}>
              <Text style={styles.cutLabel}>Cap Savings:</Text>
              <Text style={[styles.cutValue, { color: colors.success }]}>
                {formatMoney(preview.capSavings)}
              </Text>
            </View>
            <View style={styles.cutRow}>
              <Text style={styles.cutLabel}>Dead Money:</Text>
              <Text style={[styles.cutValue, { color: colors.error }]}>
                {formatMoney(preview.deadMoney)}
              </Text>
            </View>
          </View>

          <Text style={styles.recommendation}>{preview.recommendation}</Text>

          <View style={styles.modalButtons}>
            <Button
              label="Cancel"
              onPress={onCancel}
              variant="ghost"
              style={styles.modalButtonFlex}
              testID="cut-cancel-button"
            />
            <Button
              label="Confirm Cut"
              onPress={onConfirm}
              variant="danger"
              style={styles.modalButtonFlex}
              accessibilityHint="Releases the player from the roster"
              testID="cut-confirm-button"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Extension negotiation modal
 */
function ExtensionModal({
  visible,
  player,
  onSubmit,
  onCancel,
}: {
  visible: boolean;
  player: Player | null;
  onSubmit: (offer: ExtensionOffer) => void;
  onCancel: () => void;
}) {
  const [years, setYears] = useState(3);
  const [totalValue, setTotalValue] = useState(15); // In millions
  const [guaranteed, setGuaranteed] = useState(8); // In millions

  if (!player) return null;

  const handleSubmit = () => {
    onSubmit({
      years,
      totalValue: totalValue * 1000000,
      guaranteed: guaranteed * 1000000,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Contract Extension</Text>
          <Text style={styles.modalPlayerName}>
            {player.firstName} {player.lastName}
          </Text>

          <View style={styles.extensionForm}>
            <Text style={styles.formLabel}>Years: {years}</Text>
            <View style={styles.yearsRow}>
              {[1, 2, 3, 4, 5].map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[styles.yearOption, years === y && styles.yearOptionActive]}
                  onPress={() => setYears(y)}
                  accessibilityLabel={`${y} year${y > 1 ? 's' : ''}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: years === y }}
                >
                  <Text style={[styles.yearOptionText, years === y && styles.yearOptionTextActive]}>
                    {y}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Total Value: {formatMoney(totalValue * 1000000)}</Text>
            <View style={styles.sliderRow}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => setTotalValue(Math.max(1, totalValue - 5))}
                accessibilityLabel="Decrease total value by 5 million"
                accessibilityRole="button"
              >
                <Text style={styles.adjustButtonText}>-5M</Text>
              </TouchableOpacity>
              <Text
                style={styles.sliderValue}
                accessibilityLabel={`Total value ${formatMoney(totalValue * 1000000)}`}
              >
                {formatMoney(totalValue * 1000000)}
              </Text>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => setTotalValue(totalValue + 5)}
                accessibilityLabel="Increase total value by 5 million"
                accessibilityRole="button"
              >
                <Text style={styles.adjustButtonText}>+5M</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Guaranteed: {formatMoney(guaranteed * 1000000)}</Text>
            <View style={styles.sliderRow}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => setGuaranteed(Math.max(0, guaranteed - 2))}
                accessibilityLabel="Decrease guaranteed by 2 million"
                accessibilityRole="button"
              >
                <Text style={styles.adjustButtonText}>-2M</Text>
              </TouchableOpacity>
              <Text
                style={styles.sliderValue}
                accessibilityLabel={`Guaranteed ${formatMoney(guaranteed * 1000000)}`}
              >
                {formatMoney(guaranteed * 1000000)}
              </Text>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => setGuaranteed(Math.min(totalValue, guaranteed + 2))}
                accessibilityLabel="Increase guaranteed by 2 million"
                accessibilityRole="button"
              >
                <Text style={styles.adjustButtonText}>+2M</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryText}>
                {years} year, {formatMoney(totalValue * 1000000)} contract
              </Text>
              <Text style={styles.summaryText}>
                AAV: {formatMoney((totalValue / years) * 1000000)}
              </Text>
            </View>
          </View>

          <View style={styles.modalButtons}>
            <Button
              label="Cancel"
              onPress={onCancel}
              variant="ghost"
              style={styles.modalButtonFlex}
              testID="extension-cancel-button"
            />
            <Button
              label="Submit Offer"
              onPress={handleSubmit}
              variant="primary"
              style={styles.modalButtonFlex}
              accessibilityHint="Submits the contract extension offer to the player"
              testID="extension-submit-button"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function RosterScreen({
  rosterIds,
  players,
  capSpace,
  onBack,
  onSelectPlayer,
  onGetCutPreview,
  onCutPlayer,
  isExtensionEligible,
  onExtendPlayer,
  onTrade,
}: RosterScreenProps) {
  const [filter, setFilter] = useState<PositionFilter>('all');
  const [cutModalVisible, setCutModalVisible] = useState(false);
  const [cutPreview, setCutPreview] = useState<CutPreview | null>(null);
  const [extensionModalVisible, setExtensionModalVisible] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // Handle cut button press
  const handleCutPress = (player: Player) => {
    if (onGetCutPreview) {
      const preview = onGetCutPreview(player.id);
      if (preview) {
        setCutPreview(preview);
        setCutModalVisible(true);
      }
    } else {
      // Simple cut without preview
      setCutPreview({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        capSavings: 0,
        deadMoney: 0,
        recommendation: 'Cut this player?',
      });
      setCutModalVisible(true);
    }
  };

  // Handle extend button press
  const handleExtendPress = (player: Player) => {
    setSelectedPlayer(player);
    setExtensionModalVisible(true);
  };

  // Handle cut confirmation
  const handleCutConfirm = async () => {
    if (cutPreview && onCutPlayer) {
      const success = await onCutPlayer(cutPreview.playerId);
      setCutModalVisible(false);
      setCutPreview(null);
      if (success) {
        Alert.alert('Player Released', `${cutPreview.playerName} has been released.`);
      } else {
        Alert.alert('Error', 'Failed to release player.');
      }
    } else {
      setCutModalVisible(false);
      setCutPreview(null);
    }
  };

  // Handle extension submission
  const handleExtensionSubmit = async (offer: ExtensionOffer) => {
    if (selectedPlayer && onExtendPlayer) {
      const result = await onExtendPlayer(selectedPlayer.id, offer);
      setExtensionModalVisible(false);

      switch (result) {
        case 'accepted':
          Alert.alert(
            'Extension Signed!',
            `${selectedPlayer.firstName} ${selectedPlayer.lastName} has agreed to the extension!`
          );
          break;
        case 'rejected':
          Alert.alert(
            'Extension Rejected',
            `${selectedPlayer.firstName} ${selectedPlayer.lastName} declined the offer.`
          );
          break;
        case 'counter':
          Alert.alert(
            'Counter Offer',
            `${selectedPlayer.firstName} ${selectedPlayer.lastName} wants different terms.`
          );
          break;
      }
      setSelectedPlayer(null);
    } else {
      setExtensionModalVisible(false);
      setSelectedPlayer(null);
    }
  };

  // Get roster players
  const rosterPlayers = useMemo(() => {
    return rosterIds
      .map((id) => players[id])
      .filter(Boolean)
      .sort((a, b) => {
        // Sort by position group, then position, then name
        const posOrder = [
          ...OFFENSIVE_POSITIONS,
          ...DEFENSIVE_POSITIONS,
          ...SPECIAL_TEAMS_POSITIONS,
        ];
        const aIndex = posOrder.indexOf(a.position);
        const bIndex = posOrder.indexOf(b.position);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.lastName.localeCompare(b.lastName);
      });
  }, [rosterIds, players]);

  // Filter players
  const filteredPlayers = useMemo(() => {
    if (filter === 'all') return rosterPlayers;

    return rosterPlayers.filter((player) => {
      const pos = player.position;
      switch (filter) {
        case 'offense':
          return OFFENSIVE_POSITIONS.includes(pos);
        case 'defense':
          return DEFENSIVE_POSITIONS.includes(pos);
        case 'special':
          return SPECIAL_TEAMS_POSITIONS.includes(pos);
        default:
          return true;
      }
    });
  }, [rosterPlayers, filter]);

  // Count by group
  const counts = useMemo(() => {
    const offense = rosterPlayers.filter((p) => OFFENSIVE_POSITIONS.includes(p.position)).length;
    const defense = rosterPlayers.filter((p) => DEFENSIVE_POSITIONS.includes(p.position)).length;
    const special = rosterPlayers.filter((p) =>
      SPECIAL_TEAMS_POSITIONS.includes(p.position)
    ).length;
    return { offense, defense, special, total: rosterPlayers.length };
  }, [rosterPlayers]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader
        title="Roster"
        onBack={onBack}
        rightAction={
          onTrade
            ? {
                icon: 'swap-horizontal',
                onPress: onTrade,
                accessibilityLabel: 'Trade players',
              }
            : undefined
        }
        testID="roster-header"
      />

      {/* Roster Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{counts.total}</Text>
          <Text style={styles.summaryLabel}>Players</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${(capSpace / 1000000).toFixed(1)}M</Text>
          <Text style={styles.summaryLabel}>Cap Space</Text>
        </View>
      </View>

      {/* Hint */}
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>Long press a player for actions</Text>
      </View>

      {/* Position Filter */}
      <View style={styles.filterContainer} accessibilityRole="tablist">
        {(['all', 'offense', 'defense', 'special'] as PositionFilter[]).map((f) => {
          const label =
            f === 'all'
              ? `All (${counts.total})`
              : f === 'offense'
                ? `Offense (${counts.offense})`
                : f === 'defense'
                  ? `Defense (${counts.defense})`
                  : `Special Teams (${counts.special})`;
          const shortLabel =
            f === 'all'
              ? `All (${counts.total})`
              : f === 'offense'
                ? `OFF (${counts.offense})`
                : f === 'defense'
                  ? `DEF (${counts.defense})`
                  : `ST (${counts.special})`;

          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterButton, filter === f && styles.filterActive]}
              onPress={() => setFilter(f)}
              accessibilityLabel={label}
              accessibilityRole="tab"
              accessibilityState={{ selected: filter === f }}
              hitSlop={accessibility.hitSlop}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Player List */}
      <FlatList
        data={filteredPlayers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RosterPlayerCard
            player={item}
            onPress={() => onSelectPlayer?.(item.id)}
            onCut={() => handleCutPress(item)}
            onExtend={() => handleExtendPress(item)}
            canExtend={isExtensionEligible?.(item.id) ?? false}
          />
        )}
        contentContainerStyle={[
          styles.listContent,
          filteredPlayers.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>👥</Text>
            <Text style={styles.emptyStateTitle}>No Players</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'all' ? 'Your roster is empty' : `No ${filter} players on roster`}
            </Text>
          </View>
        }
      />

      {/* Cut Modal */}
      <CutModal
        visible={cutModalVisible}
        preview={cutPreview}
        onConfirm={handleCutConfirm}
        onCancel={() => {
          setCutModalVisible(false);
          setCutPreview(null);
        }}
      />

      {/* Extension Modal */}
      <ExtensionModal
        visible={extensionModalVisible}
        player={selectedPlayer}
        onSubmit={handleExtensionSubmit}
        onCancel={() => {
          setExtensionModalVisible(false);
          setSelectedPlayer(null);
        }}
      />
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
    color: colors.primary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 60,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  summaryValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  filterButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  filterActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  rosterCardContainer: {
    position: 'relative',
  },
  actionsOverlay: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  // Trade button
  tradeButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tradeButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  // Hint
  hintContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  hintText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Action buttons
  extendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    minHeight: accessibility.minTouchTarget,
  },
  extendButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  cutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    minHeight: accessibility.minTouchTarget,
  },
  cutButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    ...shadows.md,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalPlayerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  // Cut modal
  cutDetails: {
    marginBottom: spacing.md,
  },
  cutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  cutLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  cutValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  recommendation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  // Extension form
  extensionForm: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  yearsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  yearOption: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  yearOptionActive: {
    backgroundColor: colors.primary,
  },
  yearOptionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  yearOptionTextActive: {
    color: colors.textOnPrimary,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adjustButton: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  adjustButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  sliderValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  summaryBox: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  // Modal buttons
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButtonFlex: {
    flex: 1,
  },
});

export default RosterScreen;
