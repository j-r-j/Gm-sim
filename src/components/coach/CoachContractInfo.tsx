/**
 * CoachContractInfo
 * Displays coach contract details
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';
import { CoachContract, isContractExpiring } from '../../core/models/staff/CoachContract';

interface CoachContractInfoProps {
  contract: CoachContract;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount}`;
}

export function CoachContractInfo({ contract }: CoachContractInfoProps): React.JSX.Element {
  const expiring = isContractExpiring(contract);
  const totalValue = contract.salaryPerYear * contract.yearsTotal + contract.signingBonus;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Contract</Text>
        {expiring && (
          <View style={styles.expiringBadge}>
            <Text style={styles.expiringText}>EXPIRING</Text>
          </View>
        )}
        {contract.isInterim && (
          <View style={styles.interimBadge}>
            <Text style={styles.interimText}>INTERIM</Text>
          </View>
        )}
      </View>

      <View style={styles.contractGrid}>
        <View style={styles.contractItem}>
          <Text style={styles.contractLabel}>Years Left</Text>
          <Text style={[styles.contractValue, expiring && styles.expiringValue]}>
            {contract.yearsRemaining} / {contract.yearsTotal}
          </Text>
        </View>

        <View style={styles.contractItem}>
          <Text style={styles.contractLabel}>Annual Salary</Text>
          <Text style={styles.contractValue}>{formatCurrency(contract.salaryPerYear)}</Text>
        </View>

        <View style={styles.contractItem}>
          <Text style={styles.contractLabel}>Total Value</Text>
          <Text style={styles.contractValue}>{formatCurrency(totalValue)}</Text>
        </View>

        <View style={styles.contractItem}>
          <Text style={styles.contractLabel}>Guaranteed</Text>
          <Text style={styles.contractValue}>{formatCurrency(contract.guaranteedMoney)}</Text>
        </View>
      </View>

      {contract.deadMoneyIfFired > 0 && (
        <View style={styles.deadMoneySection}>
          <Text style={styles.deadMoneyLabel}>Dead Money if Released</Text>
          <Text style={styles.deadMoneyValue}>{formatCurrency(contract.deadMoneyIfFired)}</Text>
        </View>
      )}

      <View style={styles.datesRow}>
        <Text style={styles.datesText}>
          Contract: {contract.startYear} - {contract.endYear}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    flex: 1,
  },
  expiringBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  expiringText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  interimBadge: {
    backgroundColor: colors.info + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  interimText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.info,
  },
  contractGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contractItem: {
    width: '47%',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  contractLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  contractValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  expiringValue: {
    color: colors.warning,
  },
  deadMoneySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deadMoneyLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  deadMoneyValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  datesRow: {
    marginTop: spacing.sm,
  },
  datesText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    textAlign: 'center',
  },
});

export default CoachContractInfo;
