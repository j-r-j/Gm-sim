/**
 * FinancesScreen
 * Displays salary cap and financial information using real contract data
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { ScreenHeader } from '../components';
import { Team } from '../core/models/team/Team';
import { Player } from '../core/models/player/Player';
import { PlayerContract, getCapHitForYear, calculateDeadMoney } from '../core/contracts';

/**
 * Contract summary for display
 */
interface ContractSummary {
  playerId: string;
  playerName: string;
  position: string;
  capHit: number;
  yearsRemaining: number;
}

/**
 * Props for FinancesScreen
 */
export interface FinancesScreenProps {
  /** Team data */
  team: Team;
  /** All players */
  players: Record<string, Player>;
  /** Salary cap */
  salaryCap: number;
  /** Callback to go back */
  onBack: () => void;
  /** Callback when player is selected */
  onSelectPlayer?: (playerId: string) => void;
  /** Player contracts keyed by player ID or contract ID */
  contracts?: Record<string, PlayerContract>;
  /** Current season year for cap hit calculations */
  currentYear?: number;
}

/**
 * Format currency (values are stored in thousands, e.g., 30000 = $30 million)
 */
function formatCurrency(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}M`;
  }
  if (amount >= 1) {
    return `$${amount.toFixed(0)}K`;
  }
  return `$${amount}`;
}

/**
 * Cap bar component
 */
function CapBar({ used, total, deadMoney }: { used: number; total: number; deadMoney: number }) {
  const usedPercent = Math.min((used / total) * 100, 100);
  const deadPercent = Math.min((deadMoney / total) * 100, 100);
  const available = total - used;

  return (
    <View style={styles.capBarContainer}>
      <View style={styles.capBar}>
        <View style={[styles.capBarUsed, { width: `${usedPercent}%` }]} />
        {deadMoney > 0 && <View style={[styles.capBarDead, { width: `${deadPercent}%` }]} />}
      </View>
      <View style={styles.capBarLabels}>
        <View style={styles.capBarLegend}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Used: {formatCurrency(used)}</Text>
        </View>
        <View style={styles.capBarLegend}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>Available: {formatCurrency(available)}</Text>
        </View>
        {deadMoney > 0 && (
          <View style={styles.capBarLegend}>
            <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
            <Text style={styles.legendText}>Dead: {formatCurrency(deadMoney)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Contract row component
 */
function ContractRow({ contract, onPress }: { contract: ContractSummary; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.contractRow}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${contract.playerName}, ${contract.position}, cap hit ${formatCurrency(contract.capHit)}, ${contract.yearsRemaining} year${contract.yearsRemaining !== 1 ? 's' : ''} remaining`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.contractInfo}>
        <Text style={styles.playerName}>{contract.playerName}</Text>
        <Text style={styles.playerPosition}>{contract.position}</Text>
      </View>
      <View style={styles.contractDetails}>
        <Text style={styles.capHit}>{formatCurrency(contract.capHit)}</Text>
        <Text style={styles.yearsText}>
          {contract.yearsRemaining} yr{contract.yearsRemaining !== 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Build contract summaries from real contract data for a team's roster
 */
function buildContractsFromRealData(
  team: Team,
  contracts: Record<string, PlayerContract>,
  currentYear: number
): { contracts: ContractSummary[]; totalSpending: number; deadMoney: number } {
  const summaries: ContractSummary[] = [];
  let totalSpending = 0;
  let totalDeadMoney = 0;

  // Build a lookup from playerId to contract for quick access
  const contractsByPlayerId = new Map<string, PlayerContract>();
  for (const contract of Object.values(contracts)) {
    if (contract.teamId === team.id && contract.status === 'active') {
      contractsByPlayerId.set(contract.playerId, contract);
    }
  }

  // Iterate roster and map to real contracts
  for (const playerId of team.rosterPlayerIds) {
    const contract = contractsByPlayerId.get(playerId);
    if (!contract) continue;

    const capHit = getCapHitForYear(contract, currentYear);
    if (capHit <= 0) continue;

    summaries.push({
      playerId: contract.playerId,
      playerName: contract.playerName,
      position: contract.position,
      capHit,
      yearsRemaining: contract.yearsRemaining,
    });

    totalSpending += capHit;
  }

  // Also account for dead money from non-active contracts on this team
  for (const contract of Object.values(contracts)) {
    if (contract.teamId === team.id && contract.status !== 'active') {
      const deadMoney = calculateDeadMoney(contract, currentYear);
      totalDeadMoney += deadMoney;
    }
  }

  // Add team-level dead money from finances if available
  totalDeadMoney += team.finances?.deadMoney ?? 0;

  // Sort by cap hit descending
  summaries.sort((a, b) => b.capHit - a.capHit);

  return {
    contracts: summaries,
    totalSpending,
    deadMoney: totalDeadMoney,
  };
}

/**
 * Build contract summaries from player estimates (fallback when no contracts provided)
 */
function buildContractsFromEstimates(
  team: Team,
  players: Record<string, Player>
): { contracts: ContractSummary[]; totalSpending: number; deadMoney: number } {
  const summaries: ContractSummary[] = [];
  let totalSpending = 0;
  const deadMoney = team.finances?.deadMoney ?? 0;

  for (const playerId of team.rosterPlayerIds) {
    const player = players[playerId];
    if (!player) continue;

    const baseCapHit = 1000000;
    const experienceBonus = player.experience * 500000;
    const capHit = baseCapHit + experienceBonus;

    summaries.push({
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      capHit,
      yearsRemaining: Math.max(1, 4 - player.experience),
    });

    totalSpending += capHit;
  }

  summaries.sort((a, b) => b.capHit - a.capHit);

  return {
    contracts: summaries,
    totalSpending,
    deadMoney,
  };
}

export function FinancesScreen({
  team,
  players,
  salaryCap,
  onBack,
  onSelectPlayer,
  contracts,
  currentYear,
}: FinancesScreenProps) {
  // Calculate financial summary using real contract data when available
  const financials = useMemo(() => {
    if (contracts && currentYear) {
      return buildContractsFromRealData(team, contracts, currentYear);
    }
    return buildContractsFromEstimates(team, players);
  }, [team, players, salaryCap, contracts, currentYear]);

  const capSpace = salaryCap - financials.totalSpending;

  // Group by position
  const positionBreakdown = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const contract of financials.contracts) {
      const group = getPositionGroup(contract.position);
      groups[group] = (groups[group] || 0) + contract.capHit;
    }
    return Object.entries(groups)
      .map(([group, amount]) => ({ group, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [financials.contracts]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="Finances" onBack={onBack} />

      <FlatList
        ListHeaderComponent={
          <>
            {/* Cap Overview */}
            <View style={styles.capOverview}>
              <View style={styles.capHeader}>
                <Text style={styles.capTitle} accessibilityRole="header">
                  Salary Cap
                </Text>
                <Text style={styles.capTotal}>{formatCurrency(salaryCap)}</Text>
              </View>
              <CapBar
                used={financials.totalSpending}
                total={salaryCap}
                deadMoney={financials.deadMoney}
              />

              {/* Cap Summary with breakdown */}
              <View style={styles.capSummaryGrid}>
                <View style={styles.capSummaryGridItem}>
                  <Text style={styles.capSummaryLabel}>Active Roster</Text>
                  <Text style={styles.capSummaryGridValue}>
                    {formatCurrency(financials.totalSpending)}
                  </Text>
                </View>
                <View style={styles.capSummaryGridItem}>
                  <Text style={styles.capSummaryLabel}>Dead Money</Text>
                  <Text style={[styles.capSummaryGridValue, { color: colors.error }]}>
                    {formatCurrency(financials.deadMoney)}
                  </Text>
                </View>
                <View style={styles.capSummaryGridItem}>
                  <Text style={styles.capSummaryLabel}>Cap Space</Text>
                  <Text
                    style={[
                      styles.capSummaryGridValue,
                      capSpace < 0 ? styles.negative : styles.positive,
                    ]}
                  >
                    {formatCurrency(capSpace)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Position Breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                By Position Group
              </Text>
              {positionBreakdown.map(({ group, amount }) => (
                <View key={group} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{group}</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(amount)}</Text>
                </View>
              ))}
            </View>

            {/* Contracts Header */}
            <Text style={styles.sectionTitle} accessibilityRole="header">
              Contracts ({financials.contracts.length})
            </Text>
          </>
        }
        data={financials.contracts}
        keyExtractor={(item) => item.playerId}
        renderItem={({ item }) => (
          <ContractRow contract={item} onPress={() => onSelectPlayer?.(item.playerId)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

/**
 * Get position group name
 */
function getPositionGroup(position: string): string {
  const groups: Record<string, string> = {
    QB: 'Quarterbacks',
    RB: 'Running Backs',
    WR: 'Wide Receivers',
    TE: 'Tight Ends',
    LT: 'Offensive Line',
    LG: 'Offensive Line',
    C: 'Offensive Line',
    RG: 'Offensive Line',
    RT: 'Offensive Line',
    DE: 'Defensive Line',
    DT: 'Defensive Line',
    OLB: 'Linebackers',
    ILB: 'Linebackers',
    CB: 'Secondary',
    FS: 'Secondary',
    SS: 'Secondary',
    K: 'Special Teams',
    P: 'Special Teams',
  };
  return groups[position] || 'Other';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  capOverview: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  capHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  capTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  capTotal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  capBarContainer: {
    marginBottom: spacing.sm,
  },
  capBar: {
    height: 24,
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  capBarUsed: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  capBarDead: {
    height: '100%',
    backgroundColor: colors.error,
    position: 'absolute',
    right: 0,
  },
  capBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  capBarLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  legendText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  capSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  capSummaryGridItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  capSummaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  capSummaryGridValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  breakdownSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  breakdownLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  contractRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  contractInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  playerPosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contractDetails: {
    alignItems: 'flex-end',
  },
  capHit: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  yearsText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
});

export default FinancesScreen;
