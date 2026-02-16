/**
 * BigBoardScreen
 * Displays the team's big board with draft prospect rankings.
 * Features: search, sortable columns, enriched prospect data.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { GameState } from '../core/models/game/GameState';
import { ScreenHeader } from '../components';
import { Avatar } from '../components/avatar';
import { Position } from '../core/models/player/Position';
import { WorkoutBadge } from '../components/draft/WorkoutBadge';
import { StockArrow } from '../components/draft/StockArrow';
import {
  DraftTier,
  DraftBoardProspectView,
  DraftBoardViewModel,
} from '../core/scouting/DraftBoardManager';
import { NeedLevel, ProspectRanking } from '../core/scouting/BigBoardGenerator';

/**
 * Enriched prospect data from combine/pro day
 */
export interface EnrichedProspectData {
  prospectId: string;
  collegeName: string;
  age: number;
  workoutSource: 'combine' | 'pro_day' | 'both' | 'none';
  fortyYardDash: number | null;
  combineGrade: string | null;
  collegeStatLine: string | null;
  stockDirection: 'up' | 'down' | 'steady';
  awards: string[];
}

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
  enrichedProspects?: EnrichedProspectData[];
}

type TabType = 'overall' | 'position' | 'tier' | 'needs';

type SortKey =
  | 'rank'
  | 'name'
  | 'position'
  | 'college'
  | 'age'
  | 'projectedRound'
  | 'fortyYardDash'
  | 'combineGrade'
  | 'confidence'
  | 'stock';

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

/** Merge enriched data by prospect ID */
function getEnrichedData(
  prospectId: string,
  enrichedMap: Map<string, EnrichedProspectData>
): EnrichedProspectData | undefined {
  return enrichedMap.get(prospectId);
}

/**
 * Sortable column header
 */
function SortableHeader({
  label,
  sortKey,
  activeSortKey,
  sortAsc,
  onSort,
  style,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
  style?: object;
}) {
  const isActive = activeSortKey === sortKey;
  return (
    <TouchableOpacity
      style={[styles.columnHeader, style]}
      onPress={() => onSort(sortKey)}
      accessibilityLabel={`Sort by ${label}${isActive ? (sortAsc ? ', ascending' : ', descending') : ''}`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <Text style={[styles.columnHeaderText, isActive && styles.columnHeaderActive]}>{label}</Text>
      {isActive && (
        <Ionicons name={sortAsc ? 'chevron-up' : 'chevron-down'} size={10} color={colors.primary} />
      )}
    </TouchableOpacity>
  );
}

/**
 * Prospect row component with enriched data
 */
function ProspectRow({
  prospect,
  rank,
  showNeed,
  needLevel,
  enriched,
  onPress,
  onToggleLock,
}: {
  prospect: DraftBoardProspectView;
  rank: number;
  showNeed?: boolean;
  needLevel?: NeedLevel;
  enriched?: EnrichedProspectData;
  onPress: () => void;
  onToggleLock?: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.prospectRow}
      onPress={onPress}
      accessibilityLabel={`${prospect.prospectName}, ${prospect.position}, ranked number ${rank}`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.rankColumn}>
        <Text style={styles.rankNumber}>#{rank}</Text>
        {prospect.userRank && prospect.userRank !== rank && (
          <Text style={styles.userRankLabel}>User: #{prospect.userRank}</Text>
        )}
      </View>

      <Avatar id={prospect.prospectId} size="xs" context="prospect" />

      <View style={styles.prospectInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.prospectName}>{prospect.prospectName}</Text>
          {prospect.isLocked && (
            <TouchableOpacity
              style={styles.lockBadge}
              onPress={onToggleLock}
              accessibilityLabel={`Toggle lock for ${prospect.prospectName}`}
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Text style={styles.lockText}>
                <Ionicons name="lock-closed" size={12} color={colors.warning} />
              </Text>
            </TouchableOpacity>
          )}
          {enriched && <StockArrow direction={enriched.stockDirection} size={12} />}
        </View>
        <Text style={styles.prospectPosition}>{prospect.position}</Text>
        {enriched && (
          <View style={styles.enrichedRow}>
            <WorkoutBadge source={enriched.workoutSource} />
            {enriched.fortyYardDash != null && (
              <Text style={styles.fortyTime}>{enriched.fortyYardDash.toFixed(2)}s</Text>
            )}
            {enriched.combineGrade && (
              <Text style={styles.combineGrade}>{enriched.combineGrade}</Text>
            )}
          </View>
        )}
        {enriched?.collegeStatLine && (
          <Text style={styles.statLine} numberOfLines={1}>
            {enriched.collegeStatLine}
          </Text>
        )}
        {!enriched && (
          <>
            <Text style={styles.scoutInfo}>Scout: {prospect.latestScoutName}</Text>
            {prospect.latestReportSummary && (
              <Text style={styles.reportSummary}>{prospect.latestReportSummary}</Text>
            )}
          </>
        )}
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
        {prospect.hasFocusReport && <Ionicons name="crosshair" size={14} color={colors.primary} />}
        {prospect.needsMoreScouting && (
          <Ionicons name="clipboard-outline" size={14} color={colors.textSecondary} />
        )}
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
  enrichedProspects,
}: BigBoardScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('overall');
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedTier, setSelectedTier] = useState<DraftTier | null>(null);
  const [searchText, setSearchText] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);

  // Build enriched lookup map
  const enrichedMap = useMemo(() => {
    const map = new Map<string, EnrichedProspectData>();
    if (enrichedProspects) {
      for (const ep of enrichedProspects) {
        map.set(ep.prospectId, ep);
      }
    }
    return map;
  }, [enrichedProspects]);

  const handleProspectPress = (prospectId: string) => {
    onProspectSelect?.(prospectId);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  // Sort prospects
  const sortProspects = (prospects: DraftBoardProspectView[]): DraftBoardProspectView[] => {
    if (sortKey === 'rank') {
      // Default order from viewModel; just flip for descending
      return sortAsc ? prospects : [...prospects].reverse();
    }

    return [...prospects].sort((a, b) => {
      let cmp = 0;
      const eA = enrichedMap.get(a.prospectId);
      const eB = enrichedMap.get(b.prospectId);

      switch (sortKey) {
        case 'name':
          cmp = a.prospectName.localeCompare(b.prospectName);
          break;
        case 'position':
          cmp = a.position.localeCompare(b.position);
          break;
        case 'college':
          cmp = (eA?.collegeName ?? '').localeCompare(eB?.collegeName ?? '');
          break;
        case 'age':
          cmp = (eA?.age ?? 99) - (eB?.age ?? 99);
          break;
        case 'projectedRound':
          cmp =
            (parseInt(String(a.projectedRound)) || 99) - (parseInt(String(b.projectedRound)) || 99);
          break;
        case 'fortyYardDash':
          cmp = (eA?.fortyYardDash ?? 99) - (eB?.fortyYardDash ?? 99);
          break;
        case 'combineGrade': {
          const gradeOrder = ['Elite', 'Above Avg', 'Average', 'Below Avg', 'Poor'];
          const idxA = gradeOrder.indexOf(eA?.combineGrade ?? 'Poor');
          const idxB = gradeOrder.indexOf(eB?.combineGrade ?? 'Poor');
          cmp = (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
          break;
        }
        case 'confidence':
          cmp = (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0);
          break;
        case 'stock': {
          const stockOrder = { up: 0, steady: 1, down: 2 };
          cmp =
            stockOrder[eA?.stockDirection ?? 'steady'] - stockOrder[eB?.stockDirection ?? 'steady'];
          break;
        }
      }

      return sortAsc ? cmp : -cmp;
    });
  };

  // Filter prospects based on active tab, filters, and search
  const filteredProspects = useMemo(() => {
    let filtered = [...viewModel.prospects];

    // Search filter
    if (searchText.trim()) {
      const query = searchText.trim().toLowerCase();
      filtered = filtered.filter((p) => p.prospectName.toLowerCase().includes(query));
    }

    if (activeTab === 'position' && selectedPosition) {
      filtered = filtered.filter((p) => p.position === selectedPosition);
    }

    if (activeTab === 'tier' && selectedTier) {
      filtered = filtered.filter((p) => p.tier === selectedTier);
    }

    if (activeTab === 'needs') {
      const needOrder: NeedLevel[] = ['critical', 'high', 'moderate', 'low', 'none'];
      filtered.sort((a, b) => {
        const needA = positionalNeeds[a.position] || 'moderate';
        const needB = positionalNeeds[b.position] || 'moderate';
        return needOrder.indexOf(needA) - needOrder.indexOf(needB);
      });
    }

    return sortProspects(filtered);
  }, [
    viewModel.prospects,
    searchText,
    activeTab,
    selectedPosition,
    selectedTier,
    positionalNeeds,
    sortKey,
    sortAsc,
    enrichedMap,
  ]);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'overall', label: 'Overall' },
    { key: 'position', label: 'By Position' },
    { key: 'tier', label: 'By Tier' },
    { key: 'needs', label: 'Team Needs' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="Big Board" onBack={onBack} testID="big-board-header" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search prospects..."
          placeholderTextColor={colors.textLight}
          value={searchText}
          onChangeText={setSearchText}
          accessibilityLabel="Search prospects by name"
          accessibilityRole="search"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchText('')}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
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
            accessibilityLabel={`${tab.label} tab${activeTab === tab.key ? ', selected' : ''}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
            hitSlop={accessibility.hitSlop}
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
          contentContainerStyle={styles.filterContentContainer}
        >
          {POSITIONS.map((pos) => (
            <TouchableOpacity
              key={pos}
              style={[styles.filterChip, selectedPosition === pos && styles.activeFilterChip]}
              onPress={() => setSelectedPosition(selectedPosition === pos ? null : pos)}
              accessibilityLabel={`Filter by ${pos}${selectedPosition === pos ? ', selected' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedPosition === pos }}
              hitSlop={accessibility.hitSlop}
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
          contentContainerStyle={styles.filterContentContainer}
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
              accessibilityLabel={`Filter by ${getTierLabel(tier)}${selectedTier === tier ? ', selected' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedTier === tier }}
              hitSlop={accessibility.hitSlop}
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

      {/* Sortable Column Headers */}
      <View style={styles.columnHeaders}>
        <SortableHeader
          label="Rank"
          sortKey="rank"
          activeSortKey={sortKey}
          sortAsc={sortAsc}
          onSort={handleSort}
          style={styles.rankHeader}
        />
        <SortableHeader
          label="Player"
          sortKey="name"
          activeSortKey={sortKey}
          sortAsc={sortAsc}
          onSort={handleSort}
          style={styles.nameHeader}
        />
        <SortableHeader
          label="Grade"
          sortKey="projectedRound"
          activeSortKey={sortKey}
          sortAsc={sortAsc}
          onSort={handleSort}
          style={styles.gradeHeader}
        />
        <SortableHeader
          label="OVR"
          sortKey="confidence"
          activeSortKey={sortKey}
          sortAsc={sortAsc}
          onSort={handleSort}
          style={styles.confHeader}
        />
        {activeTab === 'needs' && (
          <Text style={[styles.columnHeaderText, styles.needHeader]}>Need</Text>
        )}
        <Text style={[styles.columnHeaderText, styles.flagHeader]}>Info</Text>
      </View>

      {/* Prospect List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {filteredProspects.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Prospects</Text>
            <Text style={styles.emptySubtext}>
              {searchText.trim()
                ? `No prospects matching "${searchText}"`
                : activeTab === 'position' && selectedPosition
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
                enriched={getEnrichedData(prospect.prospectId, enrichedMap)}
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
          <Ionicons name="crosshair" size={12} color={colors.primary} />
          <Text style={styles.legendText}>Focus Report</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="clipboard-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.legendText}>Needs Scouting</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="lock-closed" size={12} color={colors.warning} />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    paddingVertical: spacing.xs,
    minHeight: 36,
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
  filterContentContainer: {
    alignItems: 'center',
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
    alignItems: 'center',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  columnHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  columnHeaderActive: {
    color: colors.primary,
  },
  rankHeader: {
    width: 50,
  },
  nameHeader: {
    flex: 1,
  },
  gradeHeader: {
    width: 70,
    justifyContent: 'center',
  },
  confHeader: {
    width: 50,
    justifyContent: 'center',
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
    gap: spacing.sm,
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
  enrichedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 2,
  },
  fortyTime: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  combineGrade: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  statLine: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: 1,
  },
  scoutInfo: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: 2,
  },
  reportSummary: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});

export default BigBoardScreen;
