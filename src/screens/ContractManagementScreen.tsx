/**
 * ContractManagementScreen
 * Displays team contract overview, salary cap status, and contract management actions
 * including franchise tag management and contract restructuring.
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { GameState } from '../core/models/game/GameState';
import { Avatar } from '../components/avatar';
import { ScreenHeader } from '../components';
import { Player } from '../core/models/player/Player';
import { Position } from '../core/models/player/Position';
import {
  PlayerContract,
  CapStatus,
  calculateDeadMoney,
  isExpiringContract,
  getCutBreakdown,
  CutBreakdown,
  getFranchiseTagValue,
  getRestructureOptions,
  previewRestructure,
  RestructurePreview,
} from '../core/contracts';

/**
 * Action types the screen can dispatch to the wrapper
 */
export type ContractAction =
  | { type: 'applyFranchiseTag'; playerId: string; position: Position }
  | { type: 'removeFranchiseTag'; playerId: string }
  | { type: 'restructureContract'; contractId: string; amountToConvert: number; voidYears: number }
  | { type: 'cutPlayer'; playerId: string; cutBreakdown: CutBreakdown };

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
  onAction?: (action: ContractAction) => void;
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
 * Franchise Tag section
 */
function FranchiseTagSection({
  contracts,
  currentYear,
  players,
  onApplyTag,
  onRemoveTag,
}: {
  contracts: PlayerContract[];
  currentYear: number;
  players: Record<string, Player>;
  onApplyTag: (playerId: string, position: Position) => void;
  onRemoveTag: (playerId: string) => void;
}): React.JSX.Element {
  const [showEligible, setShowEligible] = useState(false);

  const taggedContract = useMemo(
    () => contracts.find((c) => c.type === 'franchise_tag' && c.status === 'active'),
    [contracts]
  );

  const eligiblePlayers = useMemo(() => {
    if (!showEligible) return [];
    return contracts
      .filter((c) => isExpiringContract(c) && c.type !== 'franchise_tag')
      .map((c) => {
        const tagCost = getFranchiseTagValue(c.position, 1, currentYear);
        return { contract: c, tagCost };
      })
      .sort((a, b) => b.tagCost - a.tagCost);
  }, [contracts, currentYear, showEligible]);

  return (
    <View style={styles.tagSection}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Franchise Tag
      </Text>

      {taggedContract ? (
        <View style={styles.taggedPlayerCard}>
          <View style={styles.taggedPlayerHeader}>
            <Avatar id={taggedContract.playerId} size="sm" context="player" />
            <View style={styles.taggedPlayerInfo}>
              <Text style={styles.taggedPlayerName}>{taggedContract.playerName}</Text>
              <Text style={styles.taggedPlayerPosition}>{taggedContract.position}</Text>
            </View>
            <View style={styles.tagCostBadge}>
              <Text style={styles.tagCostText}>
                {formatMoney(taggedContract.yearlyBreakdown[0]?.capHit || 0)}
              </Text>
            </View>
          </View>
          <View style={[styles.indicatorBadge, { backgroundColor: colors.primary + '30' }]}>
            <Text style={[styles.indicatorText, { color: colors.primary }]}>FRANCHISE TAGGED</Text>
          </View>
          <TouchableOpacity
            style={styles.removeTagButton}
            onPress={() => onRemoveTag(taggedContract.playerId)}
            accessibilityLabel={`Remove franchise tag from ${taggedContract.playerName}`}
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Text style={styles.removeTagButtonText}>Remove Tag</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.noTagContainer}>
          <Text style={styles.noTagText}>No player currently franchise tagged</Text>
          <TouchableOpacity
            style={styles.applyTagButton}
            onPress={() => setShowEligible(!showEligible)}
            accessibilityLabel={
              showEligible ? 'Hide eligible players' : 'Show eligible players for franchise tag'
            }
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Text style={styles.applyTagButtonText}>
              {showEligible ? 'Hide Eligible Players' : 'Apply Franchise Tag'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showEligible && !taggedContract && (
        <View style={styles.eligibleList}>
          {eligiblePlayers.length === 0 ? (
            <Text style={styles.emptyText}>
              No players with expiring contracts eligible for tag
            </Text>
          ) : (
            eligiblePlayers.map(({ contract, tagCost }) => {
              const player = players[contract.playerId];
              return (
                <View key={contract.id} style={styles.eligibleItem}>
                  <View style={styles.eligibleItemInfo}>
                    <Avatar id={contract.playerId} size="sm" context="player" />
                    <View style={styles.eligibleItemText}>
                      <Text style={styles.eligiblePlayerName}>{contract.playerName}</Text>
                      <Text style={styles.eligiblePlayerDetail}>
                        {contract.position} | Age {player?.age ?? '?'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.eligibleItemAction}>
                    <Text style={styles.tagCostLabel}>Tag Cost</Text>
                    <Text style={styles.tagCostValue}>{formatMoney(tagCost)}</Text>
                    <TouchableOpacity
                      style={styles.tagPlayerButton}
                      onPress={() => onApplyTag(contract.playerId, contract.position)}
                      accessibilityLabel={`Apply franchise tag to ${contract.playerName} for ${formatMoney(tagCost)}`}
                      accessibilityRole="button"
                      hitSlop={accessibility.hitSlop}
                    >
                      <Text style={styles.tagPlayerButtonText}>Tag</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

/**
 * Restructure Deals section
 */
function RestructureSection({
  contracts,
  currentYear,
  onRestructure,
}: {
  contracts: PlayerContract[];
  currentYear: number;
  onRestructure: (contractId: string, amount: number, voidYears: number) => void;
}): React.JSX.Element {
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  const restructurablePlayers = useMemo(() => {
    return contracts
      .filter((c) => {
        const options = getRestructureOptions(c, currentYear);
        return options.canRestructure;
      })
      .map((c) => {
        const options = getRestructureOptions(c, currentYear);
        return { contract: c, options };
      })
      .sort((a, b) => b.options.maxConversion - a.options.maxConversion);
  }, [contracts, currentYear]);

  if (restructurablePlayers.length === 0) {
    return (
      <View style={styles.restructureSection}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Restructure Deals
        </Text>
        <Text style={styles.emptyText}>No contracts eligible for restructuring</Text>
      </View>
    );
  }

  return (
    <View style={styles.restructureSection}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Restructure Deals
      </Text>
      <Text style={styles.restructureSubtitle}>
        {restructurablePlayers.length} player{restructurablePlayers.length !== 1 ? 's' : ''}{' '}
        eligible
      </Text>

      {restructurablePlayers.map(({ contract, options }) => {
        const isExpanded = expandedContractId === contract.id;
        const currentCapHit =
          contract.yearlyBreakdown.find((y) => y.year === currentYear)?.capHit ?? 0;

        return (
          <View key={contract.id} style={styles.restructureItem}>
            <TouchableOpacity
              style={styles.restructureItemHeader}
              onPress={() => setExpandedContractId(isExpanded ? null : contract.id)}
              accessibilityLabel={`${contract.playerName}, ${contract.position}, cap hit ${formatMoney(currentCapHit)}, max savings ${formatMoney(options.maxConversion)}${isExpanded ? ', collapse' : ', expand for options'}`}
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Avatar id={contract.playerId} size="sm" context="player" />
              <View style={styles.restructureItemInfo}>
                <Text style={styles.restructurePlayerName}>{contract.playerName}</Text>
                <Text style={styles.restructurePlayerDetail}>
                  {contract.position} | {contract.yearsRemaining} yr
                  {contract.yearsRemaining !== 1 ? 's' : ''} left
                </Text>
              </View>
              <View style={styles.restructureItemStats}>
                <Text style={styles.restructureStatLabel}>Cap Hit</Text>
                <Text style={styles.restructureStatValue}>{formatMoney(currentCapHit)}</Text>
              </View>
              <Text style={styles.expandIcon}>{isExpanded ? '[-]' : '[+]'}</Text>
            </TouchableOpacity>

            {isExpanded && (
              <RestructureOptions
                contract={contract}
                options={options}
                currentYear={currentYear}
                onRestructure={onRestructure}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Restructure options for an expanded player
 */
function RestructureOptions({
  contract,
  options,
  currentYear,
  onRestructure,
}: {
  contract: PlayerContract;
  options: ReturnType<typeof getRestructureOptions>;
  currentYear: number;
  onRestructure: (contractId: string, amount: number, voidYears: number) => void;
}): React.JSX.Element {
  const previews: { amount: number; preview: RestructurePreview }[] = useMemo(() => {
    return options.suggestedConversions.map((amount) => ({
      amount,
      preview: previewRestructure(contract, currentYear, amount),
    }));
  }, [contract, currentYear, options.suggestedConversions]);

  return (
    <View style={styles.restructureOptionsContainer}>
      <View style={styles.restructureOptionsHeader}>
        <Text style={styles.restructureOptionsTitle}>Conversion Options</Text>
        <Text style={styles.restructureOptionsSubtitle}>
          Max convertible: {formatMoney(options.maxConversion)}
        </Text>
      </View>

      {previews.map(({ amount, preview }) => {
        const deadMoneyImpact = preview.futureImpact.reduce(
          (sum, f) => sum + f.additionalCapHit,
          0
        );

        return (
          <View key={amount} style={styles.restructureOptionRow}>
            <View style={styles.restructureOptionInfo}>
              <Text style={styles.restructureOptionAmount}>Convert {formatMoney(amount)}</Text>
              <View style={styles.restructureOptionDetails}>
                <Text style={styles.restructureOptionDetail}>
                  New cap hit: {formatMoney(preview.newCapHit)}
                </Text>
                <Text style={[styles.restructureOptionDetail, { color: colors.success }]}>
                  Savings: {formatMoney(preview.capSavings)}
                </Text>
                {deadMoneyImpact > 0 && (
                  <Text style={[styles.restructureOptionDetail, { color: colors.warning }]}>
                    Future impact: +{formatMoney(deadMoneyImpact)}
                  </Text>
                )}
              </View>
              {preview.recommendation ? (
                <Text style={styles.restructureRecommendation}>{preview.recommendation}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={[
                styles.restructureButton,
                !preview.isRecommended && styles.restructureButtonCaution,
              ]}
              onPress={() => onRestructure(contract.id, amount, 0)}
              accessibilityLabel={`Restructure ${contract.playerName}, convert ${formatMoney(amount)}, save ${formatMoney(preview.capSavings)}`}
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Text
                style={[
                  styles.restructureButtonText,
                  !preview.isRecommended && styles.restructureButtonTextCaution,
                ]}
              >
                Restructure
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
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
  onAction,
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
      case 'highCap': {
        const avgCapHit =
          contracts.length > 0
            ? contracts.reduce((sum, c) => sum + (c.yearlyBreakdown[0]?.capHit || 0), 0) /
              contracts.length
            : 0;
        filtered = filtered.filter((c) => (c.yearlyBreakdown[0]?.capHit || 0) > avgCapHit);
        break;
      }
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
    if (onAction) {
      onAction({ type: 'cutPlayer', playerId: contract.playerId, cutBreakdown: breakdown });
    } else if (onCutPlayer) {
      onCutPlayer(contract.playerId, breakdown);
    }
  };

  const handleApplyTag = (playerId: string, position: Position) => {
    onAction?.({ type: 'applyFranchiseTag', playerId, position });
  };

  const handleRemoveTag = (playerId: string) => {
    onAction?.({ type: 'removeFranchiseTag', playerId });
  };

  const handleRestructure = (contractId: string, amount: number, voidYears: number) => {
    onAction?.({ type: 'restructureContract', contractId, amountToConvert: amount, voidYears });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="Contract Management" onBack={onBack} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cap Overview */}
        <CapOverview capStatus={capStatus} />

        {/* Franchise Tag */}
        <FranchiseTagSection
          contracts={contracts}
          currentYear={currentYear}
          players={gameState.players}
          onApplyTag={handleApplyTag}
          onRemoveTag={handleRemoveTag}
        />

        {/* Restructure Deals */}
        <RestructureSection
          contracts={contracts}
          currentYear={currentYear}
          onRestructure={handleRestructure}
        />

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
  // Franchise Tag Section
  tagSection: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  taggedPlayerCard: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  taggedPlayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taggedPlayerInfo: {
    flex: 1,
  },
  taggedPlayerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  taggedPlayerPosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tagCostBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  tagCostText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  removeTagButton: {
    backgroundColor: colors.error + '20',
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  removeTagButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  noTagContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  noTagText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  applyTagButton: {
    backgroundColor: colors.primary + '20',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  applyTagButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  eligibleList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  eligibleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  eligibleItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  eligibleItemText: {
    flex: 1,
  },
  eligiblePlayerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  eligiblePlayerDetail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  eligibleItemAction: {
    alignItems: 'flex-end',
    gap: spacing.xxs,
  },
  tagCostLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  tagCostValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  tagPlayerButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  tagPlayerButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  // Restructure Section
  restructureSection: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restructureSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  restructureItem: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  restructureItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.sm,
    minHeight: 44,
  },
  restructureItemInfo: {
    flex: 1,
  },
  restructurePlayerName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  restructurePlayerDetail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  restructureItemStats: {
    alignItems: 'flex-end',
  },
  restructureStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  restructureStatValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  expandIcon: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  restructureOptionsContainer: {
    padding: spacing.sm,
    paddingTop: 0,
    gap: spacing.sm,
  },
  restructureOptionsHeader: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  restructureOptionsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  restructureOptionsSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  restructureOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    gap: spacing.sm,
  },
  restructureOptionInfo: {
    flex: 1,
  },
  restructureOptionAmount: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  restructureOptionDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  restructureOptionDetail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  restructureRecommendation: {
    fontSize: fontSize.xs,
    color: colors.info,
    fontStyle: 'italic',
    marginTop: spacing.xxs,
  },
  restructureButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  restructureButtonCaution: {
    backgroundColor: colors.warning + '30',
  },
  restructureButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  restructureButtonTextCaution: {
    color: colors.warning,
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
