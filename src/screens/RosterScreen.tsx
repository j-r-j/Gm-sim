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
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { Player } from '../core/models/player/Player';
import { Position, OFFENSIVE_POSITIONS, DEFENSIVE_POSITIONS, SPECIAL_TEAMS_POSITIONS } from '../core/models/player/Position';

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
  /** Callback to cut a player */
  onCutPlayer?: (playerId: string) => void;
}

type PositionFilter = 'all' | 'offense' | 'defense' | 'special';

/**
 * Player card component
 */
function PlayerCard({
  player,
  onPress,
}: {
  player: Player;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.playerCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.playerInfo}>
        <View style={styles.positionBadge}>
          <Text style={styles.positionText}>{player.position}</Text>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.playerName}>
            {player.firstName} {player.lastName}
          </Text>
          <Text style={styles.playerDetails}>
            Age {player.age} • {player.experience === 0 ? 'Rookie' : `${player.experience} yr${player.experience > 1 ? 's' : ''}`}
          </Text>
        </View>
      </View>
      <View style={styles.statsContainer}>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export function RosterScreen({
  rosterIds,
  players,
  capSpace,
  onBack,
  onSelectPlayer,
}: RosterScreenProps) {
  const [filter, setFilter] = useState<PositionFilter>('all');

  // Get roster players
  const rosterPlayers = useMemo(() => {
    return rosterIds
      .map((id) => players[id])
      .filter(Boolean)
      .sort((a, b) => {
        // Sort by position group, then position, then name
        const posOrder = [...OFFENSIVE_POSITIONS, ...DEFENSIVE_POSITIONS, ...SPECIAL_TEAMS_POSITIONS];
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
    const special = rosterPlayers.filter((p) => SPECIAL_TEAMS_POSITIONS.includes(p.position)).length;
    return { offense, defense, special, total: rosterPlayers.length };
  }, [rosterPlayers]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Roster</Text>
        <View style={styles.placeholder} />
      </View>

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

      {/* Position Filter */}
      <View style={styles.filterContainer}>
        {(['all', 'offense', 'defense', 'special'] as PositionFilter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? `All (${counts.total})` :
               f === 'offense' ? `OFF (${counts.offense})` :
               f === 'defense' ? `DEF (${counts.defense})` :
               `ST (${counts.special})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Player List */}
      <FlatList
        data={filteredPlayers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlayerCard
            player={item}
            onPress={() => onSelectPlayer?.(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  positionBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  positionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  nameContainer: {
    flex: 1,
  },
  playerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  playerDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: fontSize.xl,
    color: colors.textSecondary,
  },
});

export default RosterScreen;
