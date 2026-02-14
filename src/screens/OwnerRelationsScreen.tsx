/**
 * OwnerRelationsScreen
 * Displays owner information, job security status, demands, and expectations
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { OwnerViewModel, OwnerDemand, getSecondaryTraitDescription } from '../core/models/owner';
import { ScreenHeader } from '../components';
import { PatienceViewModel } from '../core/career/PatienceMeterManager';

/**
 * Props for OwnerRelationsScreen
 */
export interface OwnerRelationsScreenProps {
  owner: OwnerViewModel;
  patienceView: PatienceViewModel | null;
  teamName: string;
  currentWeek: number;
  onBack: () => void;
  onDemandPress?: (demand: OwnerDemand) => void;
}

/**
 * Get color for job security status
 */
function getStatusColor(status: 'secure' | 'stable' | 'warm seat' | 'hot seat' | 'danger'): string {
  switch (status) {
    case 'secure':
      return colors.success;
    case 'stable':
      return colors.info;
    case 'warm seat':
      return colors.warning;
    case 'hot seat':
      return '#FF6B00';
    case 'danger':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get status label text
 */
function getStatusLabel(status: 'secure' | 'stable' | 'warm seat' | 'hot seat' | 'danger'): string {
  switch (status) {
    case 'secure':
      return 'Job Secure';
    case 'stable':
      return 'Stable Position';
    case 'warm seat':
      return 'Warm Seat';
    case 'hot seat':
      return 'Hot Seat';
    case 'danger':
      return 'In Danger';
    default:
      return 'Unknown';
  }
}

/**
 * Get color for urgency level
 */
function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'critical':
      return colors.error;
    case 'high':
      return '#FF6B00';
    case 'medium':
      return colors.warning;
    case 'low':
      return colors.info;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get demand urgency based on deadline vs current week
 */
function getDemandUrgency(
  demand: OwnerDemand,
  currentWeek: number
): 'relaxed' | 'soon' | 'urgent' | 'critical' {
  const weeksRemaining = demand.deadline - currentWeek;
  if (weeksRemaining <= 0) return 'critical';
  if (weeksRemaining <= 2) return 'urgent';
  if (weeksRemaining <= 4) return 'soon';
  return 'relaxed';
}

/**
 * Get net worth display text
 */
function getNetWorthDisplay(netWorth: string): string {
  switch (netWorth) {
    case 'modest':
      return 'Modest Fortune';
    case 'wealthy':
      return 'Wealthy';
    case 'billionaire':
      return 'Billionaire';
    case 'oligarch':
      return 'Mega-Billionaire';
    default:
      return netWorth;
  }
}

/**
 * Owner profile card
 */
function OwnerCard({ owner }: { owner: OwnerViewModel }): React.JSX.Element {
  return (
    <View style={styles.ownerCard}>
      <View style={styles.ownerHeader}>
        <View style={styles.ownerAvatar}>
          <Text style={styles.ownerInitials}>
            {owner.fullName
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </Text>
        </View>
        <View style={styles.ownerInfo}>
          <Text style={styles.ownerName}>{owner.fullName}</Text>
          <Text style={styles.ownerTitle}>Team Owner</Text>
        </View>
      </View>

      <View style={styles.ownerStats}>
        <View style={styles.ownerStat}>
          <Text style={styles.ownerStatValue}>{owner.yearsAsOwner}</Text>
          <Text style={styles.ownerStatLabel}>Years</Text>
        </View>
        <View style={styles.ownerStatDivider} />
        <View style={styles.ownerStat}>
          <Text style={styles.ownerStatValue}>{owner.championshipsWon}</Text>
          <Text style={styles.ownerStatLabel}>Titles</Text>
        </View>
        <View style={styles.ownerStatDivider} />
        <View style={styles.ownerStat}>
          <Text style={styles.ownerStatValue}>{owner.previousGMsFired}</Text>
          <Text style={styles.ownerStatLabel}>GMs Fired</Text>
        </View>
      </View>

      <View style={styles.netWorthRow}>
        <Text style={styles.netWorthLabel}>Net Worth:</Text>
        <Text style={styles.netWorthValue}>{getNetWorthDisplay(owner.netWorth)}</Text>
      </View>
    </View>
  );
}

/**
 * Personality traits section
 */
function PersonalitySection({ owner }: { owner: OwnerViewModel }): React.JSX.Element {
  const traits = [
    { label: 'Patience', value: owner.patienceDescription },
    { label: 'Spending', value: owner.spendingDescription },
    { label: 'Control', value: owner.controlDescription },
    { label: 'Loyalty', value: owner.loyaltyDescription },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Personality</Text>

      <View style={styles.traitsGrid}>
        {traits.map((trait) => (
          <View key={trait.label} style={styles.traitItem}>
            <Text style={styles.traitLabel}>{trait.label}</Text>
            <Text style={styles.traitValue}>{trait.value}</Text>
          </View>
        ))}
      </View>

      {owner.secondaryTraits.length > 0 && (
        <View style={styles.secondaryTraits}>
          <Text style={styles.secondaryTraitsLabel}>Notable Traits</Text>
          <View style={styles.secondaryTraitsList}>
            {owner.secondaryTraits.map((trait) => (
              <View key={trait} style={styles.secondaryTraitBadge}>
                <Text style={styles.secondaryTraitText}>{getSecondaryTraitDescription(trait)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Job security meter
 */
function JobSecuritySection({
  owner,
  patienceView,
}: {
  owner: OwnerViewModel;
  patienceView: PatienceViewModel | null;
}): React.JSX.Element {
  const status = patienceView?.status || owner.jobSecurityStatus;
  const statusColor = getStatusColor(status);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Job Security</Text>

      <View style={[styles.statusBanner, { borderLeftColor: statusColor }]}>
        <View style={styles.statusHeader}>
          <Text style={[styles.statusText, { color: statusColor }]}>{getStatusLabel(status)}</Text>
          {patienceView?.isAtRisk && (
            <View style={styles.atRiskBadge}>
              <Text style={styles.atRiskText}>!</Text>
            </View>
          )}
        </View>

        {patienceView && (
          <>
            <View style={styles.trendRow}>
              <Text style={styles.trendLabel}>Trend:</Text>
              <Text
                style={[
                  styles.trendValue,
                  {
                    color:
                      patienceView.trend === 'improving'
                        ? colors.success
                        : patienceView.trend === 'declining'
                          ? colors.error
                          : colors.textSecondary,
                  },
                ]}
              >
                {patienceView.trend === 'improving'
                  ? 'Improving'
                  : patienceView.trend === 'declining'
                    ? 'Declining'
                    : 'Stable'}
              </Text>
            </View>

            <Text style={styles.trendDescription}>{patienceView.trendDescription}</Text>

            {patienceView.urgencyLevel !== 'none' && (
              <View style={styles.urgencyRow}>
                <Text style={styles.urgencyLabel}>Urgency:</Text>
                <Text
                  style={[
                    styles.urgencyValue,
                    { color: getUrgencyColor(patienceView.urgencyLevel) },
                  ]}
                >
                  {patienceView.urgencyLevel.toUpperCase()}
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

/**
 * Active demands section
 */
function DemandsSection({
  demands,
  currentWeek,
  onDemandPress,
}: {
  demands: OwnerDemand[];
  currentWeek: number;
  onDemandPress?: (demand: OwnerDemand) => void;
}): React.JSX.Element {
  if (demands.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Owner Demands</Text>
        <View style={styles.emptyDemands}>
          <Text style={styles.emptyDemandsText}>No active demands</Text>
          <Text style={styles.emptyDemandsSubtext}>
            The owner is satisfied with the current direction
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Owner Demands</Text>

      {demands.map((demand) => {
        const urgency = getDemandUrgency(demand, currentWeek);
        const weeksRemaining = Math.max(0, demand.deadline - currentWeek);

        return (
          <TouchableOpacity
            key={demand.id}
            style={[styles.demandCard, { borderLeftColor: getUrgencyColor(urgency) }]}
            onPress={() => onDemandPress?.(demand)}
            activeOpacity={onDemandPress ? 0.7 : 1}
            accessibilityLabel={`${demand.type} demand: ${demand.description}, ${urgency === 'critical' ? 'overdue' : `${weeksRemaining} weeks remaining`}`}
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <View style={styles.demandHeader}>
              <Text style={styles.demandType}>{demand.type.toUpperCase()}</Text>
              <Text style={[styles.demandUrgency, { color: getUrgencyColor(urgency) }]}>
                {urgency === 'critical'
                  ? 'OVERDUE'
                  : `${weeksRemaining} week${weeksRemaining !== 1 ? 's' : ''}`}
              </Text>
            </View>
            <Text style={styles.demandDescription}>{demand.description}</Text>
            <Text style={styles.demandConsequence}>Consequence: {demand.consequence}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function OwnerRelationsScreen({
  owner,
  patienceView,
  teamName,
  currentWeek,
  onBack,
  onDemandPress,
}: OwnerRelationsScreenProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="Owner Relations" onBack={onBack} testID="owner-relations-header" />

      {/* Team name subtitle */}
      <View style={styles.teamBanner}>
        <Text style={styles.teamName}>{teamName}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Owner Card */}
        <OwnerCard owner={owner} />

        {/* Job Security */}
        <JobSecuritySection owner={owner} patienceView={patienceView} />

        {/* Active Demands */}
        <DemandsSection
          demands={owner.activeDemands ?? []}
          currentWeek={currentWeek}
          onDemandPress={onDemandPress}
        />

        {/* Personality */}
        <PersonalitySection owner={owner} />

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
  teamBanner: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  teamName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  // Owner Card
  ownerCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  ownerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerInitials: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  ownerInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  ownerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  ownerTitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  ownerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  ownerStat: {
    alignItems: 'center',
  },
  ownerStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  ownerStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  ownerStatDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  netWorthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  netWorthLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  netWorthValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  // Sections
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  // Job Security
  statusBanner: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    flex: 1,
  },
  atRiskBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  atRiskText: {
    color: colors.background,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.md,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  trendLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  trendValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  trendDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  urgencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgencyLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  urgencyValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  // Demands
  emptyDemands: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  emptyDemandsText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.success,
    marginBottom: spacing.xs,
  },
  emptyDemandsSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  demandCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    marginBottom: spacing.sm,
  },
  demandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  demandType: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  demandUrgency: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  demandDescription: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  demandConsequence: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  // Personality
  traitsGrid: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  traitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  traitLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  traitValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textTransform: 'capitalize',
  },
  secondaryTraits: {
    marginTop: spacing.md,
  },
  secondaryTraitsLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  secondaryTraitsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  secondaryTraitBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  secondaryTraitText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default OwnerRelationsScreen;
