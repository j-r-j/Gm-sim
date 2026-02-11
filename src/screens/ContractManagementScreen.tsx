/**
 * ContractManagementScreen
 * Displays team contract overview, salary cap status, and contract management actions
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { GameState } from '../core/models/game/GameState';
import { Avatar } from '../components/avatar';
import { ScreenHeader } from '../components';
import { Player } from '../core/models/player/Player';
import {
  PlayerContract,
  CapStatus,
  calculateDeadMoney,
  isExpiringContract,
  getCutBreakdown,
  CutBreakdown,
} from '../core/contracts';

/**
 * Props for ContractManagementScreen
 */
export interface ContractManagementScreenProps {
  gameState: GameState;
  capStatus: CapStatus;
  contracts: PlayerContract[];
  onBack: () => void;
  onPlayerSelect?: (playerId: string) => void;
  onCutPlayer?: (playerId: string, cutBreakdown: CutBreakdown) => void;
}

type SortOption = 'capHit' | 'yearsRemaining' | 'position' | 'name';
type FilterOption = 'all' | 'expiring' | 'highCap' | 'rookie';

/**
 * Format currency in millions
 */
function formatMoney(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}M`;
  }
  return `$${value}K`;
}

/**
 * Get color based on cap usage percentage
 */
function getCapUsageColor(percentUsed: number): string {
  if (percentUsed >= 95) return colors.error;
  if (percentUsed >= 85) return colors.warning;
  if (percentUsed >= 70) return colors.info;
  return colors.success;
}

/**
 * Get contract type display text
 */
function getContractTypeLabel(type: string): string {
  switch (type) {
    case 'rookie':
      return 'Rookie';
    case 'veteran':
      return 'Veteran';
    case 'extension':
      return 'Extension';
    case 'franchise_tag':
      return 'Franchise';
    case 'transition_tag':
      return 'Transition';
    default:
      return type;
  }
}

/**
 * Cap Overview section
 */
function CapOverview({ capStatus }: { capStatus: CapStatus }): React.JSX.Element {
  const usageColor = getCapUsageColor(capStatus.percentUsed);

  return (
    <View style={styles.capOverview}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Salary Cap Overview
      </Text>

      {/* Cap Bar */}
      <View style={styles.capBarContainer}>
        <View style={styles.capBarBackground}>
          <View
            style={[
              styles.capBarFill,
              {
                width: `${Math.min(100, capStatus.percentUsed)}%`,
                backgroundColor: usageColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.capPercentText, { color: usageColor }]}>
          {capStatus.percentUsed.toFixed(1)}% Used
        </Text>
      </View>

      {/* Cap Numbers */}
      <View style={styles.capStatsGrid}>
        <View style={styles.capStatItem}>
          <Text style={styles.capStatLabel}>Total Cap</Text>
          <Text style={styles.capStatValue}>{formatMoney(capStatus.salaryCap)}</Text>
        </View>
        <View style={styles.capStatItem}>
          <Text style={styles.capStatLabel}>Cap Used</Text>
          <Text style={styles.capStatValue}>{formatMoney(capStatus.currentCapUsage)}</Text>
        </View>
        <View style={styles.capStatItem}>
          <Text style={styles.capStatLabel}>Cap Space</Text>
          <Text
            style={[
              styles.capStatValue,
              { color: capStatus.capSpace >= 0 ? colors.success : colors.error },
            ]}
          >
            {formatMoney(capStatus.capSpace)}
          </Text>
        </View>
        <View style={styles.capStatItem}>
          <Text style={styles.capStatLabel}>Dead Money</Text>
          <Text style={[styles.capStatValue, { color: colors.warning }]}>
            {formatMoney(capStatus.deadMoney)}
          </Text>
        </View>
      </View>

      {/* Status Indicators */}
      <View style={styles.capStatusRow}>
        {capStatus.isOverCap && (
          <View style={[styles.statusBadge, styles.statusBadgeError]}>
            <Text style={styles.statusBadgeText}>OVER CAP</Text>
          </View>
        )}
        {!capStatus.meetsFloor && (
          <View style={[styles.statusBadge, styles.statusBadgeWarning]}>
            <Text style={styles.statusBadgeText}>BELOW FLOOR</Text>
          </View>
        )}
        {!capStatus.isOverCap && capStatus.meetsFloor && (
          <View style={[styles.statusBadge, styles.statusBadgeSuccess]}>
            <Text style={styles.statusBadgeText}>CAP COMPLIANT</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Contract list item
 */
function ContractItem({
  contract,
  _player,
  currentYear,
  onPress,
  onCutPress,
}: {
  contract: PlayerContract;
  _player: Player | undefined;
  currentYear: number;
  onPress: () => void;
  onCutPress: () => void;
}): React.JSX.Element {
  const isExpiring = isExpiringContract(contract);
  const capHit = contract.yearlyBreakdown[0]?.capHit || 0;
  const deadMoney = calculateDeadMoney(contract, currentYear);

  return (
    <TouchableOpacity
      style={styles.contractItem}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${contract.playerName}, ${contract.position}, ${getContractTypeLabel(contract.type)} contract`}
      accessibilityRole="button"
    >
      <View style={styles.contractHeader}>
        <Avatar id={contract.playerId} size="sm" context="player" />
        <View style={styles.contractPlayerInfo}>
          <Text style={styles.contractPlayerName}>{contract.playerName}</Text>
          <Text style={styles.contractPosition}>{contract.position}</Text>
        </View>
        <View style={styles.contractTypeBadge}>
          <Text style={styles.contractTypeText}>{getContractTypeLabel(contract.type)}</Text>
        </View>
      </View>

      <View style={styles.contractDetails}>
        <View style={styles.contractStat}>
          <Text style={styles.contractStatLabel}>Cap Hit</Text>
          <Text style={styles.contractStatValue}>{formatMoney(capHit)}</Text>
        </View>
        <View style={styles.contractStat}>
          <Text style={styles.contractStatLabel}>Years Left</Text>
          <Text style={styles.contractStatValue}>{contract.yearsRemaining}</Text>
        </View>
        <View style={styles.contractStat}>
          <Text style={styles.contractStatLabel}>Dead Money</Text>
          <Text style={[styles.contractStatValue, { color: colors.warning }]}>
            {formatMoney(deadMoney)}
          </Text>
        </View>
      </View>

      {/* Contract indicators */}
      <View style={styles.contractIndicators}>
        {isExpiring && (
          <View style={[styles.indicatorBadge, { backgroundColor: colors.warning + '30' }]}>
            <Text style={[styles.indicatorText, { color: colors.warning }]}>EXPIRING</Text>
          </View>
        )}
        {contract.hasNoTradeClause && (
          <View style={[styles.indicatorBadge, { backgroundColor: colors.info + '30' }]}>
            <Text style={[styles.indicatorText, { color: colors.info }]}>NTC</Text>
          </View>
        )}
        {contract.type === 'franchise_tag' && (
          <View style={[styles.indicatorBadge, { backgroundColor: colors.primary + '30' }]}>
            <Text style={[styles.indicatorText, { color: colors.primary }]}>TAG</Text>
          </View>
        )}
      </View>

      {/* Cut action */}
      <TouchableOpacity
        style={styles.cutButton}
        onPress={(e) => {
          e.stopPropagation();
          onCutPress();
        }}
        accessibilityLabel={`Cut analysis for ${contract.playerName}`}
        accessibilityRole="button"
        hitSlop={accessibility.hitSlop}
      >
        <Text style={styles.cutButtonText}>Cut Analysis</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

/**
 * Filter/Sort controls
 */
function ContractControls({
  sortBy,
  filterBy,
  onSortChange,
  onFilterChange,
}: {
  sortBy: SortOption;
  filterBy: FilterOption;
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: FilterOption) => void;
}): React.JSX.Element {
  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'capHit', label: 'Cap Hit' },
    { value: 'yearsRemaining', label: 'Years' },
    { value: 'position', label: 'Position' },
    { value: 'name', label: 'Name' },
  ];

  const filterOptions: { value: FilterOption; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'expiring', label: 'Expiring' },
    { value: 'highCap', label: 'High Cap' },
    { value: 'rookie', label: 'Rookie' },
  ];

  return (
    <View style={styles.controls}>
      <View style={styles.controlGroup}>
        <Text style={styles.controlLabel}>Sort:</Text>
        <View style={styles.controlButtons}>
          {sortOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.controlButton, sortBy === option.value && styles.controlButtonActive]}
              onPress={() => onSortChange(option.value)}
              accessibilityLabel={`Sort by ${option.label}${sortBy === option.value ? ', selected' : ''}`}
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Text
                style={[
                  styles.controlButtonText,
                  sortBy === option.value && styles.controlButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.controlGroup}>
        <Text style={styles.controlLabel}>Filter:</Text>
        <View style={styles.controlButtons}>
          {filterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.controlButton,
                filterBy === option.value && styles.controlButtonActive,
              ]}
              onPress={() => onFilterChange(option.value)}
              accessibilityLabel={`Filter by ${option.label}${filterBy === option.value ? ', selected' : ''}`}
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Text
                style={[
                  styles.controlButtonText,
                  filterBy === option.value && styles.controlButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

export function ContractManagementScreen({
  gameState,
  capStatus,
  contracts,
  onBack,
  onPlayerSelect,
  onCutPlayer,
}: ContractManagementScreenProps): React.JSX.Element {
  const [sortBy, setSortBy] = useState<SortOption>('capHit');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  // Sort and filter contracts
  const displayedContracts = useMemo(() => {
    let filtered = [...contracts];

    // Apply filter
    switch (filterBy) {
      case 'expiring':
        filtered = filtered.filter((c) => isExpiringContract(c));
        break;
      case 'highCap':
        const avgCapHit =
          contracts.length > 0
            ? contracts.reduce((sum, c) => sum + (c.yearlyBreakdown[0]?.capHit || 0), 0) /
              contracts.length
            : 0;
        filtered = filtered.filter((c) => (c.yearlyBreakdown[0]?.capHit || 0) > avgCapHit);
        break;
      case 'rookie':
        filtered = filtered.filter((c) => c.type === 'rookie');
        break;
    }

    // Apply sort
    switch (sortBy) {
      case 'capHit':
        filtered.sort(
          (a, b) => (b.yearlyBreakdown[0]?.capHit || 0) - (a.yearlyBreakdown[0]?.capHit || 0)
        );
        break;
      case 'yearsRemaining':
        filtered.sort((a, b) => a.yearsRemaining - b.yearsRemaining);
        break;
      case 'position':
        filtered.sort((a, b) => a.position.localeCompare(b.position));
        break;
      case 'name':
        filtered.sort((a, b) => a.playerName.localeCompare(b.playerName));
        break;
    }

    return filtered;
  }, [contracts, sortBy, filterBy]);

  const currentYear = gameState.league.calendar.currentYear;

  const handleCutAnalysis = (contract: PlayerContract) => {
    const breakdown = getCutBreakdown(contract, currentYear);
    if (onCutPlayer) {
      onCutPlayer(contract.playerId, breakdown);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="Contract Management" onBack={onBack} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cap Overview */}
        <CapOverview capStatus={capStatus} />

        {/* Controls */}
        <ContractControls
          sortBy={sortBy}
          filterBy={filterBy}
          onSortChange={setSortBy}
          onFilterChange={setFilterBy}
        />

        {/* Contract Count */}
        <View style={styles.contractCount}>
          <Text style={styles.contractCountText}>
            Showing {displayedContracts.length} of {contracts.length} contracts
          </Text>
        </View>

        {/* Contract List */}
        <View style={styles.contractList}>
          {displayedContracts.map((contract) => (
            <ContractItem
              key={contract.id}
              contract={contract}
              _player={gameState.players[contract.playerId]}
              currentYear={currentYear}
              onPress={() => onPlayerSelect?.(contract.playerId)}
              onCutPress={() => handleCutAnalysis(contract)}
            />
          ))}
        </View>

        <View style={styles.bottomPadding} />
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
  content: {
    flex: 1,
  },
  // Cap Overview
  capOverview: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  capBarContainer: {
    marginBottom: spacing.md,
  },
  capBarBackground: {
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  capBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  capPercentText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  capStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  capStatItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  capStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  capStatValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  capStatusRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusBadgeError: {
    backgroundColor: colors.error + '20',
  },
  statusBadgeWarning: {
    backgroundColor: colors.warning + '20',
  },
  statusBadgeSuccess: {
    backgroundColor: colors.success + '20',
  },
  statusBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  // Controls
  controls: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  controlGroup: {
    marginBottom: spacing.sm,
  },
  controlLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  controlButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  controlButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  controlButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  controlButtonText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  controlButtonTextActive: {
    color: colors.background,
    fontWeight: fontWeight.semibold,
  },
  // Contract Count
  contractCount: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  contractCountText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  // Contract List
  contractList: {
    marginHorizontal: spacing.md,
  },
  contractItem: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contractHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  contractPlayerInfo: {
    flex: 1,
  },
  contractPlayerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  contractPosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contractTypeBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  contractTypeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  contractDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  contractStat: {
    flex: 1,
  },
  contractStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  contractStatValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  contractIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  indicatorBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  indicatorText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  cutButton: {
    backgroundColor: colors.error + '20',
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  cutButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default ContractManagementScreen;
