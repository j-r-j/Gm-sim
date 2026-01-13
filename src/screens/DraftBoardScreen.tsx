/**
 * DraftBoardScreen
 * Big board view for evaluating all draft prospects.
 *
 * BRAND GUIDELINES:
 * - NO overall rating anywhere
 * - Skills shown as ranges in detail views
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { Position } from '../core/models/player/Position';
import { ProspectListItem } from '../components/draft';
import { ComparisonModal, type ComparisonProspect } from '../components/draft/ComparisonModal';
import { SkillValue } from '../core/models/player/TechnicalSkills';
import { PhysicalAttributes } from '../core/models/player/PhysicalAttributes';

/**
 * Prospect data for the draft board
 */
export interface DraftBoardProspect {
  id: string;
  name: string;
  position: Position;
  collegeName: string;
  age: number;
  projectedRound: number | null;
  projectedPickRange: { min: number; max: number } | null;
  userTier: string | null;
  flagged: boolean;
  positionRank: number | null;
  overallRank: number | null;
  skills: Record<string, SkillValue>;
  physical: PhysicalAttributes | null;
}

/**
 * Props for DraftBoardScreen
 */
export interface DraftBoardScreenProps {
  /** List of prospects */
  prospects: DraftBoardProspect[];
  /** Draft year */
  draftYear: number;
  /** Callback when a prospect is selected */
  onSelectProspect: (prospectId: string) => void;
  /** Callback to toggle flag on a prospect */
  onToggleFlag: (prospectId: string) => void;
  /** Callback to set user tier */
  onSetUserTier?: (prospectId: string, tier: string | null) => void;
  /** Callback to go back */
  onBack?: () => void;
}

/**
 * Position filter options
 */
const POSITION_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'QB', value: 'QB' },
  { label: 'RB', value: 'RB' },
  { label: 'WR', value: 'WR' },
  { label: 'TE', value: 'TE' },
  { label: 'OL', value: 'OL' },
  { label: 'DL', value: 'DL' },
  { label: 'LB', value: 'LB' },
  { label: 'DB', value: 'DB' },
  { label: 'K/P', value: 'KP' },
] as const;

/**
 * Sort options
 */
const SORT_OPTIONS = [
  { label: 'Overall Rank', value: 'overallRank' },
  { label: 'Position Rank', value: 'positionRank' },
  { label: 'Projection', value: 'projection' },
  { label: 'Name', value: 'name' },
] as const;

/**
 * Check if position matches filter
 */
function matchesPositionFilter(position: Position, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'OL') {
    return [Position.LT, Position.LG, Position.C, Position.RG, Position.RT].includes(position);
  }
  if (filter === 'DL') {
    return [Position.DE, Position.DT].includes(position);
  }
  if (filter === 'LB') {
    return [Position.OLB, Position.ILB].includes(position);
  }
  if (filter === 'DB') {
    return [Position.CB, Position.FS, Position.SS].includes(position);
  }
  if (filter === 'KP') {
    return [Position.K, Position.P].includes(position);
  }
  return position === filter;
}

/**
 * DraftBoardScreen Component
 */
export function DraftBoardScreen({
  prospects,
  draftYear,
  onSelectProspect,
  onToggleFlag,
  onSetUserTier: _onSetUserTier,
  onBack,
}: DraftBoardScreenProps): React.JSX.Element {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'overallRank' | 'positionRank' | 'projection' | 'name'>(
    'overallRank'
  );
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [selectedProspects, setSelectedProspects] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  // Filter and sort prospects
  const filteredProspects = useMemo(() => {
    let result = [...prospects];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(query) || p.collegeName.toLowerCase().includes(query)
      );
    }

    // Position filter
    result = result.filter((p) => matchesPositionFilter(p.position, positionFilter));

    // Flagged filter
    if (showFlaggedOnly) {
      result = result.filter((p) => p.flagged);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'overallRank':
          return (a.overallRank ?? 999) - (b.overallRank ?? 999);
        case 'positionRank':
          return (a.positionRank ?? 999) - (b.positionRank ?? 999);
        case 'projection': {
          const aRound = a.projectedRound ?? 99;
          const bRound = b.projectedRound ?? 99;
          if (aRound !== bRound) return aRound - bRound;
          const aMin = a.projectedPickRange?.min ?? 999;
          const bMin = b.projectedPickRange?.min ?? 999;
          return aMin - bMin;
        }
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [prospects, searchQuery, positionFilter, sortBy, showFlaggedOnly]);

  // Handle prospect press
  const handleProspectPress = useCallback(
    (prospectId: string) => {
      onSelectProspect(prospectId);
    },
    [onSelectProspect]
  );

  // Handle prospect long press (for comparison)
  const handleProspectLongPress = useCallback((prospectId: string) => {
    setSelectedProspects((prev) => {
      if (prev.includes(prospectId)) {
        return prev.filter((id) => id !== prospectId);
      }
      if (prev.length >= 2) {
        return [prev[1], prospectId];
      }
      return [...prev, prospectId];
    });
  }, []);

  // Handle compare button press
  const handleCompare = useCallback(() => {
    if (selectedProspects.length === 2) {
      setShowComparison(true);
    }
  }, [selectedProspects]);

  // Clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedProspects([]);
  }, []);

  // Get comparison prospects
  const comparisonProspects = useMemo((): [
    ComparisonProspect | null,
    ComparisonProspect | null,
  ] => {
    const p1 = prospects.find((p) => p.id === selectedProspects[0]) || null;
    const p2 = prospects.find((p) => p.id === selectedProspects[1]) || null;
    return [
      p1
        ? {
            id: p1.id,
            name: p1.name,
            position: p1.position,
            collegeName: p1.collegeName,
            age: p1.age,
            skills: p1.skills,
            physical: p1.physical,
            projectedRound: p1.projectedRound,
            userTier: p1.userTier,
          }
        : null,
      p2
        ? {
            id: p2.id,
            name: p2.name,
            position: p2.position,
            collegeName: p2.collegeName,
            age: p2.age,
            skills: p2.skills,
            physical: p2.physical,
            projectedRound: p2.projectedRound,
            userTier: p2.userTier,
          }
        : null,
    ];
  }, [prospects, selectedProspects]);

  // Render prospect item
  const renderProspect = useCallback(
    ({ item }: { item: DraftBoardProspect }) => (
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
        isSelected={selectedProspects.includes(item.id)}
        onPress={() => handleProspectPress(item.id)}
        onLongPress={() => handleProspectLongPress(item.id)}
        onToggleFlag={() => onToggleFlag(item.id)}
      />
    ),
    [selectedProspects, handleProspectPress, handleProspectLongPress, onToggleFlag]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>{draftYear} Draft Board</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or college..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Position Filter */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={POSITION_FILTERS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, positionFilter === item.value && styles.filterChipActive]}
              onPress={() => setPositionFilter(item.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  positionFilter === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Sort & Flag Filter Row */}
      <View style={styles.sortRow}>
        <TouchableOpacity
          style={[styles.flagFilterButton, showFlaggedOnly && styles.flagFilterButtonActive]}
          onPress={() => setShowFlaggedOnly(!showFlaggedOnly)}
        >
          <Text style={[styles.flagFilterText, showFlaggedOnly && styles.flagFilterTextActive]}>
            * Flagged Only
          </Text>
        </TouchableOpacity>

        <View style={styles.sortOptions}>
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.sortButton, sortBy === option.value && styles.sortButtonActive]}
              onPress={() => setSortBy(option.value)}
            >
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === option.value && styles.sortButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Selection Bar */}
      {selectedProspects.length > 0 && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionText}>
            {selectedProspects.length} selected (long press to select)
          </Text>
          <View style={styles.selectionActions}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearSelection}>
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
            {selectedProspects.length === 2 && (
              <TouchableOpacity style={styles.compareButton} onPress={handleCompare}>
                <Text style={styles.compareButtonText}>Compare</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredProspects.length} prospect{filteredProspects.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Prospect List */}
      <FlatList
        data={filteredProspects}
        keyExtractor={(item) => item.id}
        renderItem={renderProspect}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No prospects match your filters</Text>
          </View>
        }
      />

      {/* Comparison Modal */}
      <ComparisonModal
        visible={showComparison}
        prospect1={comparisonProspects[0]}
        prospect2={comparisonProspects[1]}
        onClose={() => setShowComparison(false)}
        onViewProfile={(id) => {
          setShowComparison(false);
          onSelectProspect(id);
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
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
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
  headerSpacer: {
    width: 50,
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterContainer: {
    backgroundColor: colors.surface,
    paddingBottom: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
  },
  sortRow: {
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
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
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
  sortOptions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  sortButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sortButtonActive: {
    backgroundColor: colors.primary + '20',
  },
  sortButtonText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  sortButtonTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.info + '20',
  },
  selectionText: {
    fontSize: fontSize.sm,
    color: colors.info,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  clearButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  clearButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  compareButton: {
    backgroundColor: colors.info,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  compareButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  resultsBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  resultsText: {
    fontSize: fontSize.sm,
    color: colors.textLight,
  },
  listContent: {
    flexGrow: 1,
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

export default DraftBoardScreen;
