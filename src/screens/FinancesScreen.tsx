/**
 * FinancesScreen
 * Displays salary cap and financial information
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { Team } from '../core/models/team/Team';
import { Player } from '../core/models/player/Player';
import { PlayerContract, getCapHitForYear } from '../core/contracts/Contract';
import { getTeamContracts } from '../core/contracts/ContractGenerator';
import { SALARY_FLOOR_PERCENTAGE } from '../core/models/team/TeamFinances';

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
  /** All contracts */
  contracts: Record<string, PlayerContract>;
  /** Current season year */
  currentYear: number;
  /** Salary cap (in thousands, e.g., 255000 = $255M) */
  salaryCap: number;
  /** Callback to go back */
  onBack: () => void;
  /** Callback when player is selected */
  onSelectPlayer?: (playerId: string) => void;
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
    <TouchableOpacity style={styles.contractRow} onPress={onPress} activeOpacity={0.7}>
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

export function FinancesScreen({
  team,
  players,
  contracts,
  currentYear,
  salaryCap,
  onBack,
  onSelectPlayer,
}: FinancesScreenProps) {
  // Calculate financial summary using actual contract data
  const financials = useMemo(() => {
    // Get actual contracts for this team
    const teamContracts = getTeamContracts(contracts, team.id);
    const contractSummaries: ContractSummary[] = [];
    let totalSpending = 0;

    // Get actual dead money from team finances
    const deadMoney = team.finances?.deadMoney ?? 0;

    for (const contract of teamContracts) {
      const player = players[contract.playerId];
      if (!player) continue;

      // Get actual cap hit for current year from contract
      const capHit = getCapHitForYear(contract, currentYear);

      if (capHit > 0) {
        contractSummaries.push({
          playerId: contract.playerId,
          playerName: contract.playerName,
          position: contract.position,
          capHit,
          yearsRemaining: contract.yearsRemaining,
        });

        totalSpending += capHit;
      }
    }

    // Sort by cap hit descending
    contractSummaries.sort((a, b) => b.capHit - a.capHit);

    // Use team finances if available, otherwise calculate from contracts
    const actualCapUsage = team.finances?.currentCapUsage ?? totalSpending;
    const actualCapSpace = team.finances?.capSpace ?? salaryCap - totalSpending;

    return {
      contracts: contractSummaries,
      totalSpending: actualCapUsage,
      deadMoney,
      capSpace: actualCapSpace,
      // Future commitments from team finances
      nextYearCommitted: team.finances?.nextYearCommitted ?? 0,
      twoYearsOutCommitted: team.finances?.twoYearsOutCommitted ?? 0,
      threeYearsOutCommitted: team.finances?.threeYearsOutCommitted ?? 0,
      // Staff budget info
      staffBudget: team.finances?.staffBudget ?? 0,
      staffSpending: team.finances?.staffSpending ?? 0,
      // Cap penalties
      capPenalties: team.finances?.capPenalties ?? [],
    };
  }, [team, players, contracts, currentYear, salaryCap]);

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

  // Calculate cap status
  const capUsagePercent = (financials.totalSpending / salaryCap) * 100;
  const salaryFloor = salaryCap * SALARY_FLOOR_PERCENTAGE;
  const meetsFloor = financials.totalSpending >= salaryFloor;
  const isOverCap = financials.capSpace < 0;
  const capStatus = isOverCap ? 'over' : capUsagePercent > 95 ? 'tight' : 'healthy';

  const getCapStatusColor = () => {
    switch (capStatus) {
      case 'over':
        return colors.error;
      case 'tight':
        return colors.warning;
      default:
        return colors.success;
    }
  };

  const getCapStatusText = () => {
    switch (capStatus) {
      case 'over':
        return 'Over Cap';
      case 'tight':
        return 'Cap Tight';
      default:
        return 'Healthy';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Finances</Text>
        <View style={styles.placeholder} />
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            {/* Cap Overview */}
            <View style={styles.capOverview}>
              <View style={styles.capHeader}>
                <Text style={styles.capTitle}>Salary Cap</Text>
                <View style={[styles.statusBadge, { backgroundColor: getCapStatusColor() }]}>
                  <Text style={styles.statusText}>{getCapStatusText()}</Text>
                </View>
              </View>
              <View style={styles.capTotalRow}>
                <Text style={styles.capTotalLabel}>Total Cap:</Text>
                <Text style={styles.capTotal}>{formatCurrency(salaryCap)}</Text>
              </View>
              <CapBar
                used={financials.totalSpending}
                total={salaryCap}
                deadMoney={financials.deadMoney}
              />
              <View style={styles.capSummaryGrid}>
                <View style={styles.capSummaryItem}>
                  <Text style={styles.capSummaryLabel}>Cap Used</Text>
                  <Text style={styles.capSummaryValue}>
                    {formatCurrency(financials.totalSpending)}
                  </Text>
                  <Text style={styles.capSummaryPercent}>{capUsagePercent.toFixed(1)}%</Text>
                </View>
                <View style={styles.capSummaryItem}>
                  <Text style={styles.capSummaryLabel}>Cap Space</Text>
                  <Text
                    style={[
                      styles.capSummaryValue,
                      financials.capSpace < 0 ? styles.negative : styles.positive,
                    ]}
                  >
                    {formatCurrency(Math.abs(financials.capSpace))}
                  </Text>
                  <Text style={styles.capSummaryPercent}>
                    {financials.capSpace < 0 ? 'Over' : 'Available'}
                  </Text>
                </View>
                <View style={styles.capSummaryItem}>
                  <Text style={styles.capSummaryLabel}>Dead Money</Text>
                  <Text
                    style={[styles.capSummaryValue, financials.deadMoney > 0 && styles.warning]}
                  >
                    {formatCurrency(financials.deadMoney)}
                  </Text>
                  <Text style={styles.capSummaryPercent}>
                    {((financials.deadMoney / salaryCap) * 100).toFixed(1)}%
                  </Text>
                </View>
              </View>
              {/* Salary Floor Status */}
              <View style={styles.floorStatus}>
                <Text style={styles.floorLabel}>
                  Salary Floor ({(SALARY_FLOOR_PERCENTAGE * 100).toFixed(0)}%):
                </Text>
                <Text style={[styles.floorValue, meetsFloor ? styles.positive : styles.negative]}>
                  {meetsFloor
                    ? 'Met'
                    : `Need ${formatCurrency(salaryFloor - financials.totalSpending)} more`}
                </Text>
              </View>
            </View>

            {/* Future Cap Commitments */}
            {(financials.nextYearCommitted > 0 ||
              financials.twoYearsOutCommitted > 0 ||
              financials.threeYearsOutCommitted > 0) && (
              <View style={styles.breakdownSection}>
                <Text style={styles.sectionTitle}>Future Cap Commitments</Text>
                {financials.nextYearCommitted > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Next Year</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(financials.nextYearCommitted)}
                    </Text>
                  </View>
                )}
                {financials.twoYearsOutCommitted > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>2 Years Out</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(financials.twoYearsOutCommitted)}
                    </Text>
                  </View>
                )}
                {financials.threeYearsOutCommitted > 0 && (
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>3 Years Out</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(financials.threeYearsOutCommitted)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Dead Money Penalties */}
            {financials.capPenalties.length > 0 && (
              <View style={styles.breakdownSection}>
                <Text style={styles.sectionTitle}>Dead Money Details</Text>
                {financials.capPenalties.map((penalty) => (
                  <View key={penalty.id} style={styles.breakdownRow}>
                    <View style={styles.penaltyInfo}>
                      <Text style={styles.breakdownLabel}>{penalty.playerName}</Text>
                      <Text style={styles.penaltyReason}>
                        ({penalty.reason} - {penalty.yearsRemaining} yr
                        {penalty.yearsRemaining !== 1 ? 's' : ''} left)
                      </Text>
                    </View>
                    <Text style={[styles.breakdownValue, styles.negative]}>
                      {formatCurrency(penalty.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Staff Budget */}
            {financials.staffBudget > 0 && (
              <View style={styles.breakdownSection}>
                <Text style={styles.sectionTitle}>Staff Budget</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Total Budget</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(financials.staffBudget)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Current Spending</Text>
                  <Text style={styles.breakdownValue}>
                    {formatCurrency(financials.staffSpending)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Remaining</Text>
                  <Text style={[styles.breakdownValue, styles.positive]}>
                    {formatCurrency(financials.staffBudget - financials.staffSpending)}
                  </Text>
                </View>
              </View>
            )}

            {/* Position Breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionTitle}>By Position Group</Text>
              {positionBreakdown.map(({ group, amount }) => (
                <View key={group} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{group}</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(amount)}</Text>
                </View>
              ))}
            </View>

            {/* Contracts Header */}
            <Text style={styles.sectionTitle}>Contracts ({financials.contracts.length})</Text>
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
  capSummary: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  capSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  capSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  capSummaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  capSummaryValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  capSummaryPercent: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.background,
  },
  capTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  capTotalLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  floorStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  floorLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  floorValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  penaltyInfo: {
    flex: 1,
  },
  penaltyReason: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  warning: {
    color: colors.warning,
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
