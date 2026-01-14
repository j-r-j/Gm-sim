/**
 * DepthChartScreen
 * Displays and allows editing of team depth chart
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { Player } from '../core/models/player/Player';
import { Position } from '../core/models/player/Position';
import {
  DepthChart,
  PositionDepthView,
  POSITION_GROUPS,
  getPositionGroupDepths,
  getDepthLabel,
  getPositionDisplayName,
  swapPlayers,
  calculatePlayerOverallRating,
} from '../core/roster/DepthChartManager';
import { GameState } from '../core/models/game/GameState';

/**
 * Props for DepthChartScreen
 */
export interface DepthChartScreenProps {
  gameState: GameState;
  depthChart: DepthChart;
  onBack: () => void;
  onDepthChartChange: (depthChart: DepthChart) => void;
  onPlayerSelect?: (playerId: string) => void;
}

type TabType = 'Offense' | 'Defense' | 'Special Teams';

/**
 * Player card in depth chart
 */
function PlayerDepthCard({
  player,
  depth,
  isSelected,
  onPress,
}: {
  player: Player | null;
  depth: 1 | 2 | 3;
  isSelected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  if (!player) {
    return (
      <TouchableOpacity
        style={[styles.playerCard, styles.emptyCard, depth === 1 && styles.starterCard]}
        onPress={onPress}
      >
        <Text style={styles.emptyText}>Empty</Text>
        <Text style={styles.emptyDepth}>{getDepthLabel(depth)}</Text>
      </TouchableOpacity>
    );
  }

  const rating = calculatePlayerOverallRating(player);

  return (
    <TouchableOpacity
      style={[
        styles.playerCard,
        depth === 1 && styles.starterCard,
        depth === 2 && styles.backupCard,
        depth === 3 && styles.thirdStringCard,
        isSelected && styles.selectedCard,
      ]}
      onPress={onPress}
    >
      <View style={styles.playerCardHeader}>
        <Text style={styles.playerName}>{player.lastName}</Text>
        <View style={[styles.ratingBadge, { backgroundColor: getRatingColor(rating) }]}>
          <Text style={styles.ratingText}>{rating}</Text>
        </View>
      </View>
      <Text style={styles.playerFirstName}>{player.firstName}</Text>
      <Text style={styles.depthLabel}>{getDepthLabel(depth)}</Text>
    </TouchableOpacity>
  );
}

/**
 * Position row showing all depth slots
 */
function PositionRow({
  positionDepth,
  selectedPlayerId,
  onPlayerSelect,
}: {
  positionDepth: PositionDepthView;
  selectedPlayerId: string | null;
  onPlayerSelect: (playerId: string | null, position: Position, depth: 1 | 2 | 3) => void;
}): React.JSX.Element {
  return (
    <View style={styles.positionRow}>
      <View style={styles.positionLabelContainer}>
        <Text style={styles.positionAbbr}>{positionDepth.position}</Text>
        <Text style={styles.positionName}>{getPositionDisplayName(positionDepth.position)}</Text>
      </View>
      <View style={styles.depthSlots}>
        <PlayerDepthCard
          player={positionDepth.starter}
          depth={1}
          isSelected={selectedPlayerId === positionDepth.starter?.id}
          onPress={() =>
            onPlayerSelect(positionDepth.starter?.id || null, positionDepth.position, 1)
          }
        />
        <PlayerDepthCard
          player={positionDepth.backup}
          depth={2}
          isSelected={selectedPlayerId === positionDepth.backup?.id}
          onPress={() =>
            onPlayerSelect(positionDepth.backup?.id || null, positionDepth.position, 2)
          }
        />
        <PlayerDepthCard
          player={positionDepth.thirdString}
          depth={3}
          isSelected={selectedPlayerId === positionDepth.thirdString?.id}
          onPress={() =>
            onPlayerSelect(positionDepth.thirdString?.id || null, positionDepth.position, 3)
          }
        />
      </View>
    </View>
  );
}

/**
 * Get color for rating badge
 */
function getRatingColor(rating: number): string {
  if (rating >= 85) return colors.success;
  if (rating >= 70) return colors.primary;
  if (rating >= 55) return colors.warning;
  return colors.error;
}

export function DepthChartScreen({
  gameState,
  depthChart,
  onBack,
  onDepthChartChange,
  onPlayerSelect,
}: DepthChartScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('Offense');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  // Get position depths for current tab
  const positionDepths = useMemo(() => {
    return getPositionGroupDepths(gameState, depthChart, activeTab);
  }, [gameState, depthChart, activeTab]);

  const handlePlayerSelect = (
    playerId: string | null,
    position: Position,
    _depth: 1 | 2 | 3
  ) => {
    if (!playerId) {
      // Empty slot - clear selection
      setSelectedPlayerId(null);
      setSelectedPosition(null);
      return;
    }

    if (selectedPlayerId && selectedPosition === position && selectedPlayerId !== playerId) {
      // Second selection at same position - swap players
      try {
        const newDepthChart = swapPlayers(depthChart, selectedPlayerId, playerId);
        onDepthChartChange(newDepthChart);
        Alert.alert('Players Swapped', 'Depth chart updated');
      } catch (error) {
        Alert.alert('Error', 'Could not swap players');
      }
      setSelectedPlayerId(null);
      setSelectedPosition(null);
    } else if (selectedPlayerId === playerId) {
      // Same player tapped - view profile
      if (onPlayerSelect) {
        onPlayerSelect(playerId);
      }
      setSelectedPlayerId(null);
      setSelectedPosition(null);
    } else {
      // First selection
      setSelectedPlayerId(playerId);
      setSelectedPosition(position);
    }
  };

  const clearSelection = () => {
    setSelectedPlayerId(null);
    setSelectedPosition(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Depth Chart</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Instructions */}
      {selectedPlayerId && (
        <View style={styles.instructionsBar}>
          <Text style={styles.instructionsText}>
            Tap another player at same position to swap, or tap again for profile
          </Text>
          <TouchableOpacity onPress={clearSelection}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['Offense', 'Defense', 'Special Teams'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Column Headers */}
      <View style={styles.columnHeaders}>
        <View style={styles.positionLabelContainer}>
          <Text style={styles.columnHeader}>Position</Text>
        </View>
        <View style={styles.depthSlots}>
          <View style={styles.columnHeaderSlot}>
            <Text style={styles.columnHeader}>Starter</Text>
          </View>
          <View style={styles.columnHeaderSlot}>
            <Text style={styles.columnHeader}>Backup</Text>
          </View>
          <View style={styles.columnHeaderSlot}>
            <Text style={styles.columnHeader}>3rd</Text>
          </View>
        </View>
      </View>

      {/* Depth Chart */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {positionDepths.map((positionDepth) => (
          <PositionRow
            key={positionDepth.position}
            positionDepth={positionDepth}
            selectedPlayerId={selectedPlayerId}
            onPlayerSelect={handlePlayerSelect}
          />
        ))}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Auto-generated indicator */}
      {depthChart.autoGenerated && (
        <View style={styles.autoGeneratedBanner}>
          <Text style={styles.autoGeneratedText}>
            Depth chart auto-generated based on player ratings
          </Text>
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
  placeholder: {
    width: 60,
  },
  instructionsBar: {
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
    paddingHorizontal: spacing.md,
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
    marginHorizontal: spacing.xs,
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
    textAlign: 'center',
  },
  columnHeaderSlot: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  positionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  positionLabelContainer: {
    width: 80,
    justifyContent: 'center',
  },
  positionAbbr: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  positionName: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  depthSlots: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  playerCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 70,
  },
  starterCard: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  backupCard: {
    borderColor: colors.warning,
    borderWidth: 1,
  },
  thirdStringCard: {
    borderColor: colors.textLight,
    borderWidth: 1,
  },
  selectedCard: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  emptyCard: {
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.5,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  emptyDepth: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  playerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
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
  playerFirstName: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  depthLabel: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xxs,
  },
  bottomPadding: {
    height: spacing.xl,
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
});

export default DepthChartScreen;
