/**
 * DraftBoardScreen
 * Professional scouting big board with sortable data columns,
 * horizontal scrolling, and combine metrics.
 *
 * BRAND GUIDELINES:
 * - NO overall rating anywhere
 * - Skills shown as ranges in detail views
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Keyboard,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
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
import { ScreenHeader } from '../components';
import { Position } from '../core/models/player/Position';
import { SkillValue } from '../core/models/player/TechnicalSkills';
import { PhysicalAttributes } from '../core/models/player/PhysicalAttributes';

/**
 * Combine data attached to a prospect for display
 */
export interface ProspectCombineData {
  fortyYardDash: number | null;
  benchPress: number | null;
  verticalJump: number | null;
  broadJump: number | null;
  threeConeDrill: number | null;
  twentyYardShuttle: number | null;
}

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
  /** Combine workout results (null if not yet available) */
  combine: ProspectCombineData | null;
  /** Scouted overall range string, e.g. "72-81" */
  ovrRange: string | null;
  /** Scout confidence level */
  confidence: number | null;
  /** Confidence label */
  confidenceLabel: string | null;
}

/**
 * Props for DraftBoardScreen
 */
export interface DraftBoardScreenProps {
  prospects: DraftBoardProspect[];
  draftYear: number;
  onSelectProspect: (prospectId: string) => void;
  onToggleFlag: (prospectId: string) => void;
  onSetUserTier?: (prospectId: string, tier: string | null) => void;
  onBack?: () => void;
}

// Position filter pill groups
const POSITION_FILTERS = [
  { label: 'ALL', value: 'all' },
  { label: 'QB', value: 'QB' },
  { label: 'RB', value: 'RB' },
  { label: 'WR', value: 'WR' },
  { label: 'TE', value: 'TE' },
  { label: 'OL', value: 'OL' },
  { label: 'DL', value: 'DL' },
  { label: 'LB', value: 'LB' },
  { label: 'DB', value: 'DB' },
  { label: 'ST', value: 'KP' },
] as const;

// Sortable column definitions
type SortKey =
  | 'overallRank'
  | 'name'
  | 'position'
  | 'college'
  | 'age'
  | 'heightWeight'
  | 'fortyYardDash'
  | 'benchPress'
  | 'verticalJump'
  | 'broadJump'
  | 'threeConeDrill'
  | 'shuttle'
  | 'ovrRange'
  | 'projectedRound'
  | 'confidence'
  | 'userTier';

interface ColumnDef {
  key: SortKey;
  label: string;
  width: number;
  sticky?: boolean;
}

const COLUMNS: ColumnDef[] = [
  { key: 'overallRank', label: 'Rank', width: 52 },
  { key: 'name', label: 'Name', width: 140, sticky: true },
  { key: 'position', label: 'Pos', width: 48 },
  { key: 'college', label: 'College', width: 100 },
  { key: 'age', label: 'Age', width: 42 },
  { key: 'heightWeight', label: 'Ht/Wt', width: 72 },
  { key: 'fortyYardDash', label: '40-yd', width: 56 },
  { key: 'benchPress', label: 'Bench', width: 52 },
  { key: 'verticalJump', label: 'Vert', width: 48 },
  { key: 'broadJump', label: 'Broad', width: 52 },
  { key: 'threeConeDrill', label: '3-Cone', width: 56 },
  { key: 'shuttle', label: 'Shuttle', width: 58 },
  { key: 'ovrRange', label: 'OVR Range', width: 76 },
  { key: 'projectedRound', label: 'Proj Rd', width: 58 },
  { key: 'confidence', label: 'Conf', width: 52 },
  { key: 'userTier', label: 'Grade', width: 60 },
];

const STICKY_WIDTH = 140; // Width of sticky name column
const RANK_WIDTH = 52;
const FLAG_WIDTH = 36;

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
 * Get position group color for badge
 */
function getPositionGroupColor(position: Position): string {
  const offense = [
    Position.QB,
    Position.RB,
    Position.WR,
    Position.TE,
    Position.LT,
    Position.LG,
    Position.C,
    Position.RG,
    Position.RT,
  ];
  const special = [Position.K, Position.P];
  if (offense.includes(position)) return colors.positionOffenseLight;
  if (special.includes(position)) return colors.positionSpecialLight;
  return colors.positionDefenseLight;
}

/**
 * Format height from inches to ft'in"
 */
function formatHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;
  return `${feet}'${remaining}"`;
}

/**
 * Get sort value for a prospect given a sort key
 */
function getSortValue(prospect: DraftBoardProspect, key: SortKey): number | string {
  switch (key) {
    case 'overallRank':
      return prospect.overallRank ?? 999;
    case 'name':
      return prospect.name;
    case 'position':
      return prospect.position;
    case 'college':
      return prospect.collegeName;
    case 'age':
      return prospect.age;
    case 'heightWeight':
      return prospect.physical ? prospect.physical.height * 1000 + prospect.physical.weight : 99999;
    case 'fortyYardDash':
      return prospect.combine?.fortyYardDash ?? 99;
    case 'benchPress':
      return prospect.combine?.benchPress ?? -1;
    case 'verticalJump':
      return prospect.combine?.verticalJump ?? -1;
    case 'broadJump':
      return prospect.combine?.broadJump ?? -1;
    case 'threeConeDrill':
      return prospect.combine?.threeConeDrill ?? 99;
    case 'shuttle':
      return prospect.combine?.twentyYardShuttle ?? 99;
    case 'ovrRange': {
      if (!prospect.ovrRange) return 999;
      const parts = prospect.ovrRange.split('-');
      return parts.length === 2 ? parseInt(parts[1], 10) : 999;
    }
    case 'projectedRound':
      return prospect.projectedRound ?? 99;
    case 'confidence':
      return prospect.confidence ?? -1;
    case 'userTier':
      return prospect.userTier ?? 'zzz';
    default:
      return 0;
  }
}

// Keys where lower values are better (time-based)
const LOWER_IS_BETTER: Set<SortKey> = new Set([
  'overallRank',
  'fortyYardDash',
  'threeConeDrill',
  'shuttle',
  'projectedRound',
  'age',
]);

/**
 * Get confidence indicator color
 */
function getConfidenceColor(score: number | null): string {
  if (score === null) return colors.textLight;
  if (score >= 75) return colors.success;
  if (score >= 50) return colors.warning;
  return colors.error;
}

/**
 * DraftBoardScreen Component
 */
export function DraftBoardScreen({
  prospects,
  draftYear,
  onSelectProspect,
  onToggleFlag,
  onBack,
}: DraftBoardScreenProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('overallRank');
  const [sortAsc, setSortAsc] = useState(true);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [scrollX, setScrollX] = useState(0);
  const headerScrollRef = useRef<ScrollView>(null);
  const rowScrollRefs = useRef<Map<string, ScrollView>>(new Map());

  // Handle column header tap for sorting
  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortAsc(!sortAsc);
      } else {
        setSortKey(key);
        // Default direction: ascending for rank/time fields, descending for measurables
        setSortAsc(LOWER_IS_BETTER.has(key));
      }
    },
    [sortKey, sortAsc]
  );

  // Filter and sort prospects
  const filteredProspects = useMemo(() => {
    let result = [...prospects];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(query) || p.collegeName.toLowerCase().includes(query)
      );
    }

    result = result.filter((p) => matchesPositionFilter(p.position, positionFilter));

    if (showFlaggedOnly) {
      result = result.filter((p) => p.flagged);
    }

    result.sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      let cmp: number;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = (aVal as number) - (bVal as number);
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [prospects, searchQuery, positionFilter, sortKey, sortAsc, showFlaggedOnly]);

  // Sync horizontal scroll across header and all rows
  const handleHeaderScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    setScrollX(x);
    rowScrollRefs.current.forEach((ref) => {
      ref?.scrollTo({ x, animated: false });
    });
  }, []);

  // Scrollable columns (everything except rank, name which are sticky, and flag)
  const scrollableColumns = COLUMNS.filter((c) => c.key !== 'overallRank' && c.key !== 'name');

  const renderColumnHeader = useCallback(
    (col: ColumnDef) => {
      const isActive = sortKey === col.key;
      return (
        <TouchableOpacity
          key={col.key}
          style={[styles.headerCell, { width: col.width }]}
          onPress={() => handleSort(col.key)}
          accessibilityLabel={`Sort by ${col.label}${isActive ? (sortAsc ? ', ascending' : ', descending') : ''}`}
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Text
            style={[styles.headerCellText, isActive && styles.headerCellTextActive]}
            numberOfLines={1}
          >
            {col.label}
          </Text>
          {isActive && (
            <Ionicons
              name={sortAsc ? 'caret-up' : 'caret-down'}
              size={10}
              color={colors.primary}
              style={styles.sortArrow}
            />
          )}
        </TouchableOpacity>
      );
    },
    [sortKey, sortAsc, handleSort]
  );

  // Render a cell value for a scrollable column
  const renderCellValue = useCallback((prospect: DraftBoardProspect, col: ColumnDef) => {
    switch (col.key) {
      case 'position': {
        const posColor = getPositionGroupColor(prospect.position);
        return (
          <View style={[styles.posBadge, { backgroundColor: posColor + '22' }]}>
            <Text style={[styles.posBadgeText, { color: posColor }]}>{prospect.position}</Text>
          </View>
        );
      }
      case 'college':
        return (
          <Text style={styles.cellText} numberOfLines={1}>
            {prospect.collegeName}
          </Text>
        );
      case 'age':
        return <Text style={styles.cellTextCenter}>{prospect.age}</Text>;
      case 'heightWeight':
        return (
          <Text style={styles.cellTextCenter}>
            {prospect.physical
              ? `${formatHeight(prospect.physical.height)} ${prospect.physical.weight}`
              : '--'}
          </Text>
        );
      case 'fortyYardDash':
        return (
          <Text style={styles.cellTextMono}>
            {prospect.combine?.fortyYardDash != null
              ? prospect.combine.fortyYardDash.toFixed(2)
              : '--'}
          </Text>
        );
      case 'benchPress':
        return (
          <Text style={styles.cellTextMono}>
            {prospect.combine?.benchPress != null ? prospect.combine.benchPress : '--'}
          </Text>
        );
      case 'verticalJump':
        return (
          <Text style={styles.cellTextMono}>
            {prospect.combine?.verticalJump != null
              ? prospect.combine.verticalJump.toFixed(1)
              : '--'}
          </Text>
        );
      case 'broadJump':
        return (
          <Text style={styles.cellTextMono}>
            {prospect.combine?.broadJump != null ? prospect.combine.broadJump : '--'}
          </Text>
        );
      case 'threeConeDrill':
        return (
          <Text style={styles.cellTextMono}>
            {prospect.combine?.threeConeDrill != null
              ? prospect.combine.threeConeDrill.toFixed(2)
              : '--'}
          </Text>
        );
      case 'shuttle':
        return (
          <Text style={styles.cellTextMono}>
            {prospect.combine?.twentyYardShuttle != null
              ? prospect.combine.twentyYardShuttle.toFixed(2)
              : '--'}
          </Text>
        );
      case 'ovrRange':
        return (
          <Text style={[styles.cellTextMono, styles.ovrRangeText]}>
            {prospect.ovrRange ?? '--'}
          </Text>
        );
      case 'projectedRound': {
        const rd = prospect.projectedRound;
        return (
          <Text
            style={[
              styles.cellTextCenter,
              {
                color:
                  rd === 1
                    ? colors.success
                    : rd != null && rd <= 3
                      ? colors.info
                      : colors.textSecondary,
                fontWeight: rd === 1 ? fontWeight.bold : fontWeight.normal,
              },
            ]}
          >
            {rd != null ? `Rd ${rd}` : 'UDFA'}
          </Text>
        );
      }
      case 'confidence': {
        const confColor = getConfidenceColor(prospect.confidence);
        return (
          <View style={styles.confidenceCell}>
            <View
              style={[styles.confidenceDot, { backgroundColor: confColor }]}
              accessibilityLabel={`Confidence: ${prospect.confidenceLabel ?? 'unknown'}`}
            />
            <Text style={[styles.cellTextCenter, { color: confColor }]}>
              {prospect.confidence != null ? prospect.confidence : '--'}
            </Text>
          </View>
        );
      }
      case 'userTier':
        return prospect.userTier ? (
          <View style={styles.tierCell}>
            <Text style={styles.tierCellText} numberOfLines={1}>
              {prospect.userTier}
            </Text>
          </View>
        ) : (
          <Text style={styles.cellTextLight}>--</Text>
        );
      default:
        return <Text style={styles.cellText}>--</Text>;
    }
  }, []);

  // Render a single prospect row
  const renderProspectRow = useCallback(
    ({ item }: { item: DraftBoardProspect }) => {
      const isFlagged = item.flagged;
      return (
        <TouchableOpacity
          style={[styles.row, isFlagged && styles.rowFlagged]}
          onPress={() => onSelectProspect(item.id)}
          activeOpacity={0.7}
          accessibilityLabel={`${item.overallRank ? `#${item.overallRank} ` : ''}${item.name}, ${item.position}, ${item.collegeName}`}
          accessibilityRole="button"
          accessibilityHint="Tap to view prospect details"
        >
          {/* Sticky left section: flag + rank + name */}
          <View style={styles.stickyRow}>
            {/* Flag toggle */}
            <TouchableOpacity
              style={styles.flagCell}
              onPress={() => onToggleFlag(item.id)}
              accessibilityLabel={isFlagged ? 'Remove flag' : 'Flag prospect'}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isFlagged }}
              hitSlop={accessibility.hitSlop}
            >
              <Ionicons
                name={isFlagged ? 'star' : 'star-outline'}
                size={16}
                color={isFlagged ? colors.secondary : colors.border}
              />
            </TouchableOpacity>

            {/* Rank */}
            <View style={styles.rankCell}>
              <Text style={styles.rankText}>
                {item.overallRank != null ? item.overallRank : '--'}
              </Text>
            </View>

            {/* Name (sticky) */}
            <View style={styles.nameCell}>
              <Text style={styles.nameText} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          </View>

          {/* Scrollable columns */}
          <ScrollView
            ref={(ref) => {
              if (ref) {
                rowScrollRefs.current.set(item.id, ref);
              }
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            contentOffset={{ x: scrollX, y: 0 }}
            style={styles.scrollableRowContent}
          >
            {scrollableColumns.map((col) => (
              <View key={col.key} style={[styles.cell, { width: col.width }]}>
                {renderCellValue(item, col)}
              </View>
            ))}
          </ScrollView>
        </TouchableOpacity>
      );
    },
    [onSelectProspect, onToggleFlag, scrollX, scrollableColumns, renderCellValue]
  );

  const keyExtractor = useCallback((item: DraftBoardProspect) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={`${draftYear} Big Board`} onBack={onBack} testID="draft-board-header" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or college..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search prospects"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Ionicons name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Position Filter Pills */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={POSITION_FILTERS}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
          renderItem={({ item }) => {
            const isActive = positionFilter === item.value;
            return (
              <TouchableOpacity
                style={[styles.filterPill, isActive && styles.filterPillActive]}
                onPress={() => setPositionFilter(item.value)}
                accessibilityLabel={`Filter by ${item.label}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                hitSlop={accessibility.hitSlop}
              >
                <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Controls Row */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.flagToggle, showFlaggedOnly && styles.flagToggleActive]}
          onPress={() => setShowFlaggedOnly(!showFlaggedOnly)}
          accessibilityLabel={showFlaggedOnly ? 'Show all prospects' : 'Show flagged only'}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: showFlaggedOnly }}
          hitSlop={accessibility.hitSlop}
        >
          <Ionicons
            name={showFlaggedOnly ? 'star' : 'star-outline'}
            size={14}
            color={showFlaggedOnly ? colors.secondary : colors.textLight}
          />
          <Text style={[styles.flagToggleText, showFlaggedOnly && styles.flagToggleTextActive]}>
            Flagged
          </Text>
        </TouchableOpacity>

        <Text style={styles.resultsText}>
          {filteredProspects.length} prospect{filteredProspects.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        {/* Sticky header columns */}
        <View style={styles.stickyHeader}>
          <View style={[styles.headerCell, { width: FLAG_WIDTH }]} />
          {renderColumnHeader(COLUMNS[0])}
          {renderColumnHeader(COLUMNS[1])}
        </View>

        {/* Scrollable header columns */}
        <ScrollView
          ref={headerScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={handleHeaderScroll}
          scrollEventThrottle={16}
          style={styles.scrollableHeaderContent}
        >
          {scrollableColumns.map(renderColumnHeader)}
        </ScrollView>
      </View>

      {/* Prospect Rows */}
      <FlatList
        data={filteredProspects}
        keyExtractor={keyExtractor}
        renderItem={renderProspectRow}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        getItemLayout={(_, index) => ({
          length: ROW_HEIGHT,
          offset: ROW_HEIGHT * index,
          index,
        })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No prospects match your filters</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 36;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
  },
  // Filter pills
  filterContainer: {
    paddingVertical: spacing.xs,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: colors.textOnPrimary,
  },
  // Controls row
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  flagToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  flagToggleActive: {
    backgroundColor: colors.secondary + '18',
  },
  flagToggleText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  flagToggleTextActive: {
    color: colors.secondary,
    fontWeight: fontWeight.semibold,
  },
  resultsText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  // Table header
  tableHeader: {
    flexDirection: 'row',
    height: HEADER_HEIGHT,
    backgroundColor: colors.primaryDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stickyHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primaryDark,
    zIndex: 2,
    ...shadows.sm,
  },
  scrollableHeaderContent: {
    flex: 1,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    height: HEADER_HEIGHT,
  },
  headerCellText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnDark,
    textAlign: 'center',
  },
  headerCellTextActive: {
    color: '#FFD700',
  },
  sortArrow: {
    marginLeft: 2,
  },
  // Rows
  row: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowFlagged: {
    backgroundColor: colors.secondary + '08',
  },
  stickyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  scrollableRowContent: {
    flex: 1,
  },
  // Cells
  flagCell: {
    width: FLAG_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: accessibility.minTouchTarget,
  },
  rankCell: {
    width: RANK_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  nameCell: {
    width: STICKY_WIDTH,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  nameText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
    height: ROW_HEIGHT,
  },
  cellText: {
    fontSize: fontSize.xs,
    color: colors.text,
  },
  cellTextCenter: {
    fontSize: fontSize.xs,
    color: colors.text,
    textAlign: 'center',
  },
  cellTextMono: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  cellTextLight: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
  },
  // Position badge
  posBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  posBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  // OVR range
  ovrRangeText: {
    fontWeight: fontWeight.medium,
  },
  // Confidence
  confidenceCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // Tier / Grade
  tierCell: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  tierCellText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
  },
});

export default DraftBoardScreen;
