/**
 * DepthChartScreenV2
 * Enhanced depth chart UI with realistic NFL-style organization
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { showAlert, showConfirm } from '../utils/alert';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { Player } from '../core/models/player/Player';
import { Avatar } from '../components/avatar';
import { ScreenHeader } from '../components';
import { GameState } from '../core/models/game/GameState';
import {
  DepthChartSlot,
  SLOT_INFO,
  DepthChartV2,
  DepthChartSlotView,
  generateCategoryView,
  generateDepthChartV2,
  assignPlayerToSlot,
  swapPlayersV2,
  getEligiblePlayersForSlot,
  calculatePlayerRating,
  calculateSlotEffectiveness,
  validateDepthChart,
  DefensivePackage,
  OffensivePersonnel,
  OFFENSIVE_PACKAGES,
  DEFENSIVE_PACKAGES,
} from '../core/roster';

/**
 * Props for DepthChartScreenV2
 */
export interface DepthChartScreenV2Props {
  gameState: GameState;
  depthChart: DepthChartV2;
  onBack: () => void;
  onDepthChartChange: (depthChart: DepthChartV2) => void;
  onPlayerSelect?: (playerId: string) => void;
}

type TabType = 'Offense' | 'Defense' | 'Special Teams';
type ViewMode = 'standard' | 'packages';

/**
 * Get rating color
 */
function getRatingColor(rating: number): string {
  if (rating >= 85) return colors.success;
  if (rating >= 70) return colors.primary;
  if (rating >= 55) return colors.warning;
  return colors.error;
}

/**
 * Player card component for depth chart slot
 */
function SlotPlayerCard({
  slotView,
  player,
  isSelected,
  isSwapTarget,
  onPress,
  onLongPress,
}: {
  slotView: DepthChartSlotView;
  player: Player | null;
  isSelected: boolean;
  isSwapTarget: boolean;
  onPress: () => void;
  onLongPress: () => void;
}): React.JSX.Element {
  const slotInfo = SLOT_INFO[slotView.slot];
  const isStarter = slotInfo.depthLevel === 1;
  const isSpecialist = slotInfo.isSpecialist;

  if (!player) {
    return (
      <TouchableOpacity
        style={[
          styles.slotCard,
          styles.emptySlotCard,
          isStarter && styles.starterSlotCard,
          isSpecialist && styles.specialistSlotCard,
          isSwapTarget && styles.swapTargetCard,
        ]}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityLabel={`${slotView.shortName} slot, empty. Tap to assign player`}
        accessibilityRole="button"
      >
        <Text style={styles.slotShortName}>{slotView.shortName}</Text>
        <Text style={styles.emptyText}>Empty</Text>
        {slotView.isRequired && <Text style={styles.requiredBadge}>REQ</Text>}
      </TouchableOpacity>
    );
  }

  const rating = calculatePlayerRating(player);
  const isOutOfPosition = slotView.assignment?.outOfPosition ?? false;

  return (
    <TouchableOpacity
      style={[
        styles.slotCard,
        isStarter && styles.starterSlotCard,
        isSpecialist && styles.specialistSlotCard,
        isSelected && styles.selectedCard,
        isSwapTarget && styles.swapTargetCard,
        isOutOfPosition && styles.outOfPositionCard,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={`${slotView.shortName}, ${player.lastName}, ${player.position}, rating ${rating}${isOutOfPosition ? ', out of position' : ''}${isSelected ? ', selected' : ''}`}
      accessibilityRole="button"
      accessibilityHint="Tap to select, long press for options"
    >
      <View style={styles.cardHeader}>
        <Text style={styles.slotShortName}>{slotView.shortName}</Text>
        <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(rating) }]}>
          <Text style={styles.ratingText}>{rating}</Text>
        </View>
      </View>
      <View style={styles.playerInfo}>
        <Avatar id={player.id} size="xs" age={player.age} context="player" />
        <View style={styles.playerDetails}>
          <Text style={styles.playerName} numberOfLines={1}>
            {player.lastName}
          </Text>
          <Text style={styles.playerPosition}>{player.position}</Text>
        </View>
      </View>
      {isOutOfPosition && (
        <View style={styles.oopBadge}>
          <Text style={styles.oopText}>OOP</Text>
        </View>
      )}
      {slotView.assignment?.isLocked && <Text style={styles.lockIcon}>🔒</Text>}
    </TouchableOpacity>
  );
}

/**
 * Subcategory section (e.g., "Wide Receivers")
 */
function SubcategorySection({
  name,
  slots,
  gameState,
  selectedPlayerId,
  selectedSlot,
  onSlotPress,
  onSlotLongPress,
}: {
  name: string;
  slots: DepthChartSlotView[];
  gameState: GameState;
  selectedPlayerId: string | null;
  selectedSlot: DepthChartSlot | null;
  onSlotPress: (slot: DepthChartSlot, playerId: string | null) => void;
  onSlotLongPress: (slot: DepthChartSlot) => void;
}): React.JSX.Element {
  // Group slots into rows (starters on one row, backups on another)
  const starterSlots = slots.filter((s) => SLOT_INFO[s.slot].depthLevel === 1);
  const backupSlots = slots.filter((s) => SLOT_INFO[s.slot].depthLevel === 2);
  const depthSlots = slots.filter((s) => SLOT_INFO[s.slot].depthLevel >= 3);

  const renderSlotRow = (rowSlots: DepthChartSlotView[], label: string) => {
    if (rowSlots.length === 0) return null;

    return (
      <View style={styles.slotRow} accessibilityLabel={`${name} ${label} row`}>
        <Text style={styles.depthLabel}>{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.slotsContainer}>
          {rowSlots.map((slotView) => {
            const player = slotView.assignment
              ? gameState.players[slotView.assignment.playerId]
              : null;
            const isSelected = selectedPlayerId === slotView.assignment?.playerId;
            const isSwapTarget =
              selectedSlot !== null && selectedSlot !== slotView.slot && selectedPlayerId !== null;

            return (
              <SlotPlayerCard
                key={slotView.slot}
                slotView={slotView}
                player={player ?? null}
                isSelected={isSelected}
                isSwapTarget={isSwapTarget}
                onPress={() => onSlotPress(slotView.slot, slotView.assignment?.playerId ?? null)}
                onLongPress={() => onSlotLongPress(slotView.slot)}
              />
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.subcategorySection}>
      <Text style={styles.subcategoryTitle} accessibilityRole="header">
        {name}
      </Text>
      {renderSlotRow(starterSlots, 'Starters')}
      {renderSlotRow(backupSlots, 'Backups')}
      {renderSlotRow(depthSlots, 'Depth')}
    </View>
  );
}

/**
 * Player selection modal content
 */
function PlayerSelectionList({
  players,
  slot,
  onSelect,
  onCancel,
}: {
  players: Player[];
  slot: DepthChartSlot;
  onSelect: (playerId: string) => void;
  onCancel: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.selectionModal}>
      <View style={styles.selectionHeader}>
        <Text style={styles.selectionTitle} accessibilityRole="header">
          Select Player for {SLOT_INFO[slot].displayName}
        </Text>
        <TouchableOpacity
          onPress={onCancel}
          accessibilityLabel="Cancel player selection"
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.playerList}>
        {players.map((player) => {
          const rating = calculatePlayerRating(player);
          const effectiveness = calculateSlotEffectiveness(player, slot);

          return (
            <TouchableOpacity
              key={player.id}
              style={styles.playerListItem}
              onPress={() => onSelect(player.id)}
              accessibilityLabel={`${player.firstName} ${player.lastName}, ${player.position}, age ${player.age}, rating ${rating}`}
              accessibilityRole="button"
            >
              <Avatar id={player.id} size="sm" age={player.age} context="player" />
              <View style={styles.playerListInfo}>
                <Text style={styles.playerListName}>
                  {player.firstName} {player.lastName}
                </Text>
                <Text style={styles.playerListMeta}>
                  {player.position} | Age {player.age}
                </Text>
              </View>
              <View style={styles.playerListRatings}>
                <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(rating) }]}>
                  <Text style={styles.ratingText}>{rating}</Text>
                </View>
                {effectiveness !== rating && (
                  <Text style={styles.effectivenessText}>Eff: {effectiveness}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        {players.length === 0 && (
          <Text style={styles.noPlayersText}>No eligible players available</Text>
        )}
      </ScrollView>
    </View>
  );
}

/**
 * Package view for formations
 */
function PackageView({
  packageName,
  slots,
  gameState,
  depthChart,
}: {
  packageName: string;
  slots: DepthChartSlot[];
  gameState: GameState;
  depthChart: DepthChartV2;
}): React.JSX.Element {
  return (
    <View style={styles.packageView}>
      <Text style={styles.packageTitle} accessibilityRole="header">
        {packageName}
      </Text>
      <View style={styles.packageSlots}>
        {slots.map((slot) => {
          const assignment = depthChart.assignments.find((a) => a.slot === slot);
          const player = assignment ? gameState.players[assignment.playerId] : null;
          const slotInfo = SLOT_INFO[slot];

          return (
            <View
              key={slot}
              style={styles.packageSlotItem}
              accessibilityLabel={`${slotInfo.shortName}, ${player ? player.lastName : 'empty'}`}
            >
              <Text style={styles.packageSlotLabel}>{slotInfo.shortName}</Text>
              {player ? (
                <View style={styles.packagePlayerInfo}>
                  <Text style={styles.packagePlayerName}>{player.lastName}</Text>
                  <Text style={styles.packagePlayerRating}>{calculatePlayerRating(player)}</Text>
                </View>
              ) : (
                <Text style={styles.packageEmptyText}>Empty</Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Main depth chart screen component
 */
export function DepthChartScreenV2({
  gameState,
  depthChart,
  onBack,
  onDepthChartChange,
  onPlayerSelect,
}: DepthChartScreenV2Props): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('Offense');
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<DepthChartSlot | null>(null);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);
  const [selectionSlot, setSelectionSlot] = useState<DepthChartSlot | null>(null);

  // Get category view data
  const categoryView = useMemo(() => {
    const category =
      activeTab === 'Offense' ? 'offense' : activeTab === 'Defense' ? 'defense' : 'specialTeams';
    return generateCategoryView(gameState, depthChart, category);
  }, [gameState, depthChart, activeTab]);

  // Validation status
  const validation = useMemo(() => {
    return validateDepthChart(gameState, depthChart);
  }, [gameState, depthChart]);

  // Handle slot press
  const handleSlotPress = useCallback(
    (slot: DepthChartSlot, playerId: string | null) => {
      if (showPlayerSelection) return;

      if (selectedPlayerId && selectedSlot) {
        // We have a selection - try to swap or move
        if (playerId && playerId !== selectedPlayerId) {
          try {
            const newDepthChart = swapPlayersV2(depthChart, selectedPlayerId, playerId);
            onDepthChartChange(newDepthChart);
            showAlert('Swapped', 'Players swapped successfully');
          } catch {
            showAlert('Error', 'Could not swap players');
          }
        }
        setSelectedPlayerId(null);
        setSelectedSlot(null);
      } else if (playerId) {
        // Select this player
        setSelectedPlayerId(playerId);
        setSelectedSlot(slot);
      } else {
        // Empty slot - show player selection
        setSelectionSlot(slot);
        setShowPlayerSelection(true);
      }
    },
    [selectedPlayerId, selectedSlot, depthChart, onDepthChartChange, showPlayerSelection]
  );

  // Handle slot long press (show options)
  const handleSlotLongPress = useCallback(
    (slot: DepthChartSlot) => {
      const assignment = depthChart.assignments.find((a) => a.slot === slot);
      if (assignment) {
        showConfirm(
          SLOT_INFO[slot].displayName,
          'Change the player in this slot?',
          () => {
            setSelectionSlot(slot);
            setShowPlayerSelection(true);
          },
          () => onPlayerSelect?.(assignment.playerId)
        );
      } else {
        setSelectionSlot(slot);
        setShowPlayerSelection(true);
      }
    },
    [depthChart, onPlayerSelect]
  );

  // Handle player selection
  const handlePlayerSelect = useCallback(
    (playerId: string) => {
      if (!selectionSlot) return;

      const player = gameState.players[playerId];
      if (!player) return;

      const newDepthChart = assignPlayerToSlot(
        depthChart,
        playerId,
        selectionSlot,
        player.position
      );
      onDepthChartChange(newDepthChart);

      setShowPlayerSelection(false);
      setSelectionSlot(null);
    },
    [selectionSlot, depthChart, gameState, onDepthChartChange]
  );

  // Handle auto-generate
  const handleAutoGenerate = useCallback(() => {
    showConfirm(
      'Auto-Generate Depth Chart',
      'This will regenerate the depth chart based on player ratings. Continue?',
      () => {
        const result = generateDepthChartV2(gameState, depthChart.teamId);
        onDepthChartChange(result.depthChart);
        if (result.warnings.length > 0) {
          showAlert('Generated with Warnings', result.warnings.join('\n'));
        } else {
          showAlert('Success', `Assigned ${result.assignmentsChanged} players`);
        }
      }
    );
  }, [gameState, depthChart.teamId, onDepthChartChange]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedPlayerId(null);
    setSelectedSlot(null);
    setShowPlayerSelection(false);
    setSelectionSlot(null);
  }, []);

  // Get eligible players for selection
  const eligiblePlayers = useMemo(() => {
    if (!selectionSlot) return [];
    return getEligiblePlayersForSlot(gameState, depthChart.teamId, selectionSlot);
  }, [gameState, depthChart.teamId, selectionSlot]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader
        title="Depth Chart"
        onBack={onBack}
        rightAction={{
          icon: 'refresh',
          onPress: handleAutoGenerate,
          accessibilityLabel: 'Auto-generate depth chart',
        }}
      />

      {/* Validation warnings */}
      {!validation.isValid && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            {validation.warnings.length > 0
              ? validation.warnings[0]
              : `Missing ${validation.missingRequiredSlots.length} required positions`}
          </Text>
        </View>
      )}

      {/* Selection instructions */}
      {selectedPlayerId && (
        <View style={styles.instructionsBanner}>
          <Text style={styles.instructionsText}>
            Tap another player to swap, or tap player again for profile
          </Text>
          <TouchableOpacity
            onPress={clearSelection}
            accessibilityLabel="Cancel selection"
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main tabs */}
      <View style={styles.tabContainer}>
        {(['Offense', 'Defense', 'Special Teams'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
            accessibilityLabel={`${tab} tab${activeTab === tab ? ', selected' : ''}`}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* View mode toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'standard' && styles.activeViewMode]}
          onPress={() => setViewMode('standard')}
          accessibilityLabel={`Standard view${viewMode === 'standard' ? ', selected' : ''}`}
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[styles.viewModeText, viewMode === 'standard' && styles.activeViewModeText]}>
            Standard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'packages' && styles.activeViewMode]}
          onPress={() => setViewMode('packages')}
          accessibilityLabel={`Packages view${viewMode === 'packages' ? ', selected' : ''}`}
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[styles.viewModeText, viewMode === 'packages' && styles.activeViewModeText]}>
            Packages
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {showPlayerSelection && selectionSlot ? (
        <PlayerSelectionList
          players={eligiblePlayers}
          slot={selectionSlot}
          onSelect={handlePlayerSelect}
          onCancel={clearSelection}
        />
      ) : viewMode === 'standard' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {categoryView.subcategories.map((subcategory) => (
            <SubcategorySection
              key={subcategory.name}
              name={subcategory.name}
              slots={subcategory.slots}
              gameState={gameState}
              selectedPlayerId={selectedPlayerId}
              selectedSlot={selectedSlot}
              onSlotPress={handleSlotPress}
              onSlotLongPress={handleSlotLongPress}
            />
          ))}
          <View style={styles.bottomPadding} />
        </ScrollView>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {activeTab === 'Offense' ? (
            <>
              <PackageView
                packageName="11 Personnel (Base)"
                slots={OFFENSIVE_PACKAGES[OffensivePersonnel.ELEVEN].slots}
                gameState={gameState}
                depthChart={depthChart}
              />
              <PackageView
                packageName="12 Personnel"
                slots={OFFENSIVE_PACKAGES[OffensivePersonnel.TWELVE].slots}
                gameState={gameState}
                depthChart={depthChart}
              />
              <PackageView
                packageName="21 Personnel (Power)"
                slots={OFFENSIVE_PACKAGES[OffensivePersonnel.TWENTY_ONE].slots}
                gameState={gameState}
                depthChart={depthChart}
              />
            </>
          ) : activeTab === 'Defense' ? (
            <>
              <PackageView
                packageName="4-3 Base"
                slots={DEFENSIVE_PACKAGES[DefensivePackage.BASE_43].slots}
                gameState={gameState}
                depthChart={depthChart}
              />
              <PackageView
                packageName="Nickel (5 DB)"
                slots={DEFENSIVE_PACKAGES[DefensivePackage.NICKEL].slots}
                gameState={gameState}
                depthChart={depthChart}
              />
              <PackageView
                packageName="Dime (6 DB)"
                slots={DEFENSIVE_PACKAGES[DefensivePackage.DIME].slots}
                gameState={gameState}
                depthChart={depthChart}
              />
            </>
          ) : (
            <Text style={styles.noPackagesText}>Special Teams uses standard view</Text>
          )}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* Auto-generated indicator */}
      {depthChart.autoGenerated && (
        <View style={styles.autoGeneratedBanner}>
          <Text style={styles.autoGeneratedText}>Auto-generated based on player ratings</Text>
        </View>
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
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  autoButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  autoButtonText: {
    color: colors.background,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  warningBanner: {
    backgroundColor: colors.warning + '30',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  warningText: {
    color: colors.warning,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  instructionsBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  instructionsText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    flex: 1,
  },
  cancelText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginLeft: spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xxs,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.background,
    fontWeight: fontWeight.bold,
  },
  viewModeContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  viewModeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
  },
  activeViewMode: {
    backgroundColor: colors.primary + '30',
  },
  viewModeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  activeViewModeText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  subcategorySection: {
    marginBottom: spacing.md,
  },
  subcategoryTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  slotRow: {
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
  },
  depthLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: fontWeight.medium,
  },
  slotsContainer: {
    flexDirection: 'row',
  },
  slotCard: {
    width: 100,
    padding: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptySlotCard: {
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  starterSlotCard: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  specialistSlotCard: {
    backgroundColor: colors.info + '10',
    borderColor: colors.info,
  },
  selectedCard: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  swapTargetCard: {
    borderColor: colors.warning,
    borderStyle: 'dashed',
  },
  outOfPositionCard: {
    backgroundColor: colors.warning + '10',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  slotShortName: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  ratingBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  ratingText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerDetails: {
    marginLeft: spacing.xs,
    flex: 1,
  },
  playerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  playerPosition: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  requiredBadge: {
    fontSize: 8,
    color: colors.error,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  oopBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.warning,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  oopText: {
    fontSize: 8,
    color: colors.background,
    fontWeight: fontWeight.bold,
  },
  lockIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    fontSize: 10,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
  autoGeneratedBanner: {
    backgroundColor: colors.info + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  autoGeneratedText: {
    fontSize: fontSize.xs,
    color: colors.info,
    textAlign: 'center',
  },
  selectionModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  playerList: {
    flex: 1,
  },
  playerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  playerListInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  playerListName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  playerListMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  playerListRatings: {
    alignItems: 'flex-end',
  },
  effectivenessText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  noPlayersText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  packageView: {
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  packageTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  packageSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  packageSlotItem: {
    width: '33.33%',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xxs,
  },
  packageSlotLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.semibold,
  },
  packagePlayerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packagePlayerName: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  packagePlayerRating: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  packageEmptyText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  noPackagesText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});

export default DepthChartScreenV2;
