/**
 * CoachCard Component
 * Expandable card with tabbed content for coach details.
 *
 * Tabs:
 * - Profile: Role, scheme, coaching tree, personality, tendencies, reputation
 * - Career: Career history, wins/losses, championships, achievements
 * - Contract: Contract details, interview requests
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../../styles';
import {
  Coach,
  CareerHistoryEntry,
  getCareerWinningPercentage,
} from '../../core/models/staff/Coach';
import { CoachRole } from '../../core/models/staff/StaffSalary';
import {
  PersonalityType,
  getPersonalityDescription,
} from '../../core/models/staff/CoachPersonality';
import { TreeName } from '../../core/models/staff/CoachingTree';
import { getTendenciesDescription } from '../../core/models/staff/CoordinatorTendencies';
import { getTotalContractValue, isContractExpiring } from '../../core/models/staff/CoachContract';
import { OffensiveScheme, DefensiveScheme } from '../../core/models/player/SchemeFit';
import {
  generateCoachScoutingReport,
  getConfidenceColor,
  getAttributeRangeColor,
} from '../../core/coaching/CoachScoutingReport';

type TabType = 'profile' | 'career' | 'contract';

export interface CoachCardProps {
  /** The full coach object */
  coach: Coach;
  /** Current year for contract calculations */
  currentYear?: number;
  /** List of team names requesting interviews (if coach is available) */
  interviewingTeams?: string[];
  /** Callback when card is closed */
  onClose?: () => void;
  /** Whether to show as a modal */
  isModal?: boolean;
}

/**
 * Get role color
 */
function getRoleColor(role: CoachRole): string {
  switch (role) {
    case 'headCoach':
      return colors.primary;
    case 'offensiveCoordinator':
      return colors.success;
    case 'defensiveCoordinator':
      return colors.secondary;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get display name for role
 */
function getRoleDisplayName(role: CoachRole): string {
  const roleNames: Record<CoachRole, string> = {
    headCoach: 'Head Coach',
    offensiveCoordinator: 'Offensive Coordinator',
    defensiveCoordinator: 'Defensive Coordinator',
  };
  return roleNames[role] || role;
}

/**
 * Get display name for coaching tree
 */
function getTreeDisplayName(treeName: TreeName): string {
  const treeNames: Record<TreeName, string> = {
    walsh: 'Bill Walsh',
    parcells: 'Bill Parcells',
    belichick: 'Bill Belichick',
    shanahan: 'Mike Shanahan',
    reid: 'Andy Reid',
    coughlin: 'Tom Coughlin',
    dungy: 'Tony Dungy',
    holmgren: 'Mike Holmgren',
    gruden: 'Jon Gruden',
    payton: 'Sean Payton',
  };
  return treeNames[treeName] || treeName;
}

/**
 * Get display name for personality type
 */
function getPersonalityDisplayName(type: PersonalityType): string {
  const names: Record<PersonalityType, string> = {
    analytical: 'Analytical',
    aggressive: 'Aggressive',
    conservative: 'Conservative',
    innovative: 'Innovative',
    oldSchool: 'Old School',
    playersCoach: "Players' Coach",
  };
  return names[type] || type;
}

/**
 * Format scheme name for display
 */
function formatSchemeName(scheme: OffensiveScheme | DefensiveScheme): string {
  const schemeNames: Record<string, string> = {
    westCoast: 'West Coast',
    airRaid: 'Air Raid',
    spreadOption: 'Spread Option',
    powerRun: 'Power Run',
    zoneRun: 'Zone Run',
    playAction: 'Play Action',
    fourThreeUnder: '4-3 Under',
    threeFour: '3-4',
    coverThree: 'Cover 3',
    coverTwo: 'Cover 2',
    manPress: 'Man Press',
    blitzHeavy: 'Blitz Heavy',
  };
  return schemeNames[scheme] || scheme;
}

/**
 * Format money for display (values are stored in thousands, e.g., 15200 = $15.2 million)
 */
function formatMoney(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}M`;
  }
  if (value >= 1) {
    return `$${value.toFixed(0)}K`;
  }
  return `$${value}`;
}

/**
 * Profile Tab Content - Shows scouting report with uncertainty
 */
function ProfileTab({ coach }: { coach: Coach }): React.JSX.Element {
  const roleColor = getRoleColor(coach.role);
  const scoutingReport = generateCoachScoutingReport(coach);

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Role & Basic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Role</Text>
        <View style={styles.roleContainer}>
          <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
            <Text style={styles.roleBadgeText}>{getRoleDisplayName(coach.role)}</Text>
          </View>
          {coach.scheme && (
            <View style={styles.schemeBadge}>
              <Text style={styles.schemeBadgeText}>{formatSchemeName(coach.scheme)}</Text>
            </View>
          )}
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Age</Text>
            <Text style={styles.infoValue}>{coach.attributes.age}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Experience</Text>
            <Text style={styles.infoValue}>{coach.attributes.yearsExperience} years</Text>
          </View>
        </View>
      </View>

      {/* Scouting Assessment */}
      <View style={styles.section}>
        <View style={styles.scoutingHeader}>
          <Text style={styles.sectionTitle}>Scout Assessment</Text>
          <View
            style={[
              styles.confidenceBadge,
              {
                backgroundColor: getConfidenceColor(scoutingReport.perceivedReputation.confidence),
              },
            ]}
          >
            <Text style={styles.confidenceText}>
              {scoutingReport.perceivedReputation.confidence.toUpperCase()} CONFIDENCE
            </Text>
          </View>
        </View>
        <View style={styles.assessmentContainer}>
          <Text style={styles.assessmentText}>
            {scoutingReport.perceivedReputation.narrativeAssessment}
          </Text>
        </View>
        <Text style={styles.overallAssessmentText}>{scoutingReport.overallAssessment}</Text>
      </View>

      {/* Perceived Attributes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ability Estimates</Text>
        <Text style={styles.disclaimerText}>
          Ranges reflect uncertainty - actual ability may differ
        </Text>
        {Object.values(scoutingReport.attributes).map((attr) => (
          <View key={attr.name} style={styles.attributeRow}>
            <View style={styles.attributeInfo}>
              <Text style={styles.attributeName}>{attr.displayName}</Text>
              <Text style={styles.attributeAssessment}>{attr.assessment}</Text>
            </View>
            <View style={styles.attributeRangeContainer}>
              <View style={styles.attributeBarBg}>
                <View
                  style={[
                    styles.attributeBarFill,
                    {
                      left: `${attr.perceived.min}%`,
                      width: `${attr.perceived.max - attr.perceived.min}%`,
                      backgroundColor: getAttributeRangeColor(attr.perceived),
                    },
                  ]}
                />
              </View>
              <Text style={styles.attributeRangeText}>
                {attr.perceived.min}-{attr.perceived.max}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Upside & Risk */}
      <View style={styles.section}>
        <View style={styles.upsideRiskContainer}>
          <View style={styles.upsideBox}>
            <Text style={styles.upsideLabel}>Potential Upside</Text>
            <Text style={styles.upsideText}>{scoutingReport.upside}</Text>
          </View>
          <View style={styles.riskBox}>
            <Text style={styles.riskLabel}>Risk Factors</Text>
            <Text style={styles.riskText}>{scoutingReport.risk}</Text>
          </View>
        </View>
      </View>

      {/* Coaching Tree */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coaching Tree</Text>
        <View style={styles.treeContainer}>
          <View style={styles.treeItem}>
            <Text style={styles.treeLabel}>Lineage</Text>
            <Text style={styles.treeValue}>{getTreeDisplayName(coach.tree.treeName)} Tree</Text>
          </View>
          <View style={styles.treeItem}>
            <Text style={styles.treeLabel}>Generation</Text>
            <Text style={styles.treeValue}>
              {coach.tree.generation === 1
                ? '1st (Direct)'
                : coach.tree.generation === 2
                  ? '2nd'
                  : coach.tree.generation === 3
                    ? '3rd'
                    : '4th'}
            </Text>
          </View>
        </View>
        <View style={styles.philosophyContainer}>
          <Text style={styles.philosophyLabel}>Philosophy</Text>
          <Text style={styles.philosophyValue}>
            {coach.tree.philosophy.riskTolerance.charAt(0).toUpperCase() +
              coach.tree.philosophy.riskTolerance.slice(1)}{' '}
            approach
          </Text>
        </View>
      </View>

      {/* Personality */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personality</Text>
        <View style={styles.personalityContainer}>
          <View style={styles.personalityBadge}>
            <Text style={styles.personalityType}>
              {getPersonalityDisplayName(coach.personality.primary)}
            </Text>
            <Text style={styles.personalityDescription}>
              {getPersonalityDescription(coach.personality.primary)}
            </Text>
          </View>
          {coach.personality.secondary && (
            <View style={[styles.personalityBadge, styles.personalitySecondary]}>
              <Text style={styles.personalityType}>
                {getPersonalityDisplayName(coach.personality.secondary)}
              </Text>
              <Text style={styles.personalityDescription}>
                {getPersonalityDescription(coach.personality.secondary)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Tendencies (for coordinators) */}
      {coach.tendencies && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tendencies</Text>
          <View style={styles.tendenciesContainer}>
            <Text style={styles.tendenciesText}>{getTendenciesDescription(coach.tendencies)}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

/**
 * Career Tab Content
 */
function CareerTab({ coach }: { coach: Coach }): React.JSX.Element {
  // Calculate career totals
  const totalWins = coach.careerHistory.reduce((sum, entry) => sum + entry.wins, 0);
  const totalLosses = coach.careerHistory.reduce((sum, entry) => sum + entry.losses, 0);
  const totalChampionships = coach.careerHistory.reduce(
    (sum, entry) => sum + entry.championships,
    0
  );
  const totalPlayoffs = coach.careerHistory.reduce(
    (sum, entry) => sum + entry.playoffAppearances,
    0
  );
  const winPct = getCareerWinningPercentage(coach);

  const renderHistoryEntry = (entry: CareerHistoryEntry, index: number) => (
    <View key={index} style={styles.historyEntry}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTeam}>{entry.teamName}</Text>
        <Text style={styles.historyYears}>
          {entry.yearStart}-{entry.yearEnd}
        </Text>
      </View>
      <Text style={styles.historyRole}>{getRoleDisplayName(entry.role)}</Text>
      <View style={styles.historyStats}>
        <Text style={styles.historyStatText}>
          {entry.wins}-{entry.losses}
        </Text>
        {entry.playoffAppearances > 0 && (
          <Text style={styles.historyStatText}>
            {entry.playoffAppearances} Playoff{entry.playoffAppearances !== 1 ? 's' : ''}
          </Text>
        )}
        {entry.championships > 0 && (
          <Text style={styles.historyChampionship}>
            {entry.championships} Championship{entry.championships !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
      {entry.achievements.length > 0 && (
        <View style={styles.achievementsContainer}>
          {entry.achievements.map((achievement, i) => (
            <View key={i} style={styles.achievementBadge}>
              <Text style={styles.achievementText}>{achievement}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Career Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Career Summary</Text>
        <View style={styles.careerStatsGrid}>
          <View style={styles.careerStatItem}>
            <Text style={styles.careerStatValue}>
              {totalWins}-{totalLosses}
            </Text>
            <Text style={styles.careerStatLabel}>Record</Text>
          </View>
          <View style={styles.careerStatItem}>
            <Text style={styles.careerStatValue}>
              {winPct !== null ? `${(winPct * 100).toFixed(1)}%` : '-'}
            </Text>
            <Text style={styles.careerStatLabel}>Win %</Text>
          </View>
          <View style={styles.careerStatItem}>
            <Text style={styles.careerStatValue}>{totalPlayoffs}</Text>
            <Text style={styles.careerStatLabel}>Playoffs</Text>
          </View>
          <View style={styles.careerStatItem}>
            <Text
              style={[styles.careerStatValue, totalChampionships > 0 && styles.championshipValue]}
            >
              {totalChampionships}
            </Text>
            <Text style={styles.careerStatLabel}>Championships</Text>
          </View>
        </View>
      </View>

      {/* Career History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Career History</Text>
        {coach.careerHistory.length > 0 ? (
          coach.careerHistory.map((entry, index) => renderHistoryEntry(entry, index))
        ) : (
          <View style={styles.noHistoryContainer}>
            <Text style={styles.noHistoryText}>No previous coaching history</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/**
 * Contract Tab Content
 */
function ContractTab({
  coach,
  currentYear: _currentYear = 2024,
  interviewingTeams = [],
}: {
  coach: Coach;
  currentYear?: number;
  interviewingTeams?: string[];
}): React.JSX.Element {
  const contract = coach.contract;

  const renderContractRow = (label: string, value: string) => (
    <View style={styles.contractRow}>
      <Text style={styles.contractLabel}>{label}</Text>
      <Text style={styles.contractValue}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Contract Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contract</Text>
        {contract ? (
          <View style={styles.contractContainer}>
            <View style={styles.contractHeader}>
              <View
                style={[
                  styles.contractStatusBadge,
                  isContractExpiring(contract) && styles.contractStatusExpiring,
                  contract.isInterim && styles.contractStatusInterim,
                ]}
              >
                <Text style={styles.contractStatusText}>
                  {contract.isInterim
                    ? 'Interim'
                    : isContractExpiring(contract)
                      ? 'Expiring'
                      : 'Active'}
                </Text>
              </View>
            </View>
            {renderContractRow('Total Value', formatMoney(getTotalContractValue(contract)))}
            {renderContractRow('Annual Salary', formatMoney(contract.salaryPerYear))}
            {renderContractRow('Guaranteed', formatMoney(contract.guaranteedMoney))}
            {renderContractRow(
              'Length',
              `${contract.yearsTotal} year${contract.yearsTotal !== 1 ? 's' : ''}`
            )}
            {renderContractRow('Years Remaining', contract.yearsRemaining.toString())}
            {renderContractRow('Dead Money if Fired', formatMoney(contract.deadMoneyIfFired))}

            {contract.hasNoTradeClause && (
              <View style={styles.clauseBadge}>
                <Text style={styles.clauseText}>No-Trade Clause</Text>
              </View>
            )}
            {contract.canBePoached && (
              <View style={styles.poachableBadge}>
                <Text style={styles.poachableText}>Can Be Poached</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noContractContainer}>
            <Text style={styles.noContractText}>No active contract</Text>
            <Text style={styles.noContractSubtext}>
              {coach.isAvailable ? 'Free Agent' : 'Unsigned'}
            </Text>
          </View>
        )}
      </View>

      {/* Interview Requests */}
      {coach.isAvailable && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interest</Text>
          {coach.interviewRequests.length > 0 || interviewingTeams.length > 0 ? (
            <View style={styles.interviewsContainer}>
              <Text style={styles.interviewsCount}>
                {coach.interviewRequests.length + interviewingTeams.length} team
                {coach.interviewRequests.length + interviewingTeams.length !== 1 ? 's' : ''}{' '}
                interested
              </Text>
              {interviewingTeams.length > 0 && (
                <View style={styles.interviewingTeamsList}>
                  {interviewingTeams.map((team, index) => (
                    <View key={index} style={styles.interviewingTeamBadge}>
                      <Text style={styles.interviewingTeamText}>{team}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noInterviewsContainer}>
              <Text style={styles.noInterviewsText}>No interview requests</Text>
            </View>
          )}
        </View>
      )}

      {/* Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusContainer}>
          {renderContractRow('Available', coach.isAvailable ? 'Yes' : 'No')}
          {renderContractRow('Retired', coach.isRetired ? 'Yes' : 'No')}
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * CoachCard Component
 */
export function CoachCard({
  coach,
  currentYear = 2024,
  interviewingTeams = [],
  onClose,
  isModal = true,
}: CoachCardProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const roleColor = getRoleColor(coach.role);

  const content = (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.roleIcon, { backgroundColor: roleColor }]}>
          <Text style={styles.roleIconText}>
            {coach.role === 'headCoach'
              ? 'HC'
              : coach.role === 'offensiveCoordinator'
                ? 'OC'
                : 'DC'}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.coachName}>
            {coach.firstName} {coach.lastName}
          </Text>
          <Text style={styles.coachDetails}>{getRoleDisplayName(coach.role)}</Text>
        </View>
        {onClose && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close coach card"
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer} accessibilityRole="tablist">
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
          onPress={() => setActiveTab('profile')}
          accessibilityLabel="Profile tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'profile' }}
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
            Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'career' && styles.tabActive]}
          onPress={() => setActiveTab('career')}
          accessibilityLabel="Career tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'career' }}
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[styles.tabText, activeTab === 'career' && styles.tabTextActive]}>
            Career
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contract' && styles.tabActive]}
          onPress={() => setActiveTab('contract')}
          accessibilityLabel="Contract tab"
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'contract' }}
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[styles.tabText, activeTab === 'contract' && styles.tabTextActive]}>
            Contract
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'profile' && <ProfileTab coach={coach} />}
      {activeTab === 'career' && <CareerTab coach={coach} />}
      {activeTab === 'contract' && (
        <ContractTab
          coach={coach}
          currentYear={currentYear}
          interviewingTeams={interviewingTeams}
        />
      )}
    </View>
  );

  if (isModal) {
    return (
      <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>{content}</View>
        </View>
      </Modal>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    minHeight: 400,
    ...shadows.lg,
  },
  container: {
    flex: 1,
    minHeight: 350,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roleIconText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  headerInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  coachDetails: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  tabContent: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  // Profile Tab Styles
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  roleBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  roleBadgeText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  schemeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  schemeBadgeText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  infoItem: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xxs,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  reputationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    backgroundColor: colors.surface,
  },
  reputationText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  treeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  treeItem: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  treeLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xxs,
  },
  treeValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  philosophyContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  philosophyLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xxs,
  },
  philosophyValue: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  personalityContainer: {
    gap: spacing.sm,
  },
  personalityBadge: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  personalitySecondary: {
    borderLeftColor: colors.textSecondary,
  },
  personalityType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  personalityDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tendenciesContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  tendenciesText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: fontSize.md * 1.5,
  },
  // Career Tab Styles
  careerStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  careerStatItem: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  careerStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  championshipValue: {
    color: colors.warning,
  },
  careerStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.xxs,
  },
  historyEntry: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  historyTeam: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  historyYears: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  historyRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  historyStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  historyStatText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  historyChampionship: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  achievementBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  achievementText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  noHistoryContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  noHistoryText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  // Contract Tab Styles
  contractContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  contractHeader: {
    marginBottom: spacing.md,
  },
  contractStatusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  contractStatusExpiring: {
    backgroundColor: colors.warning,
  },
  contractStatusInterim: {
    backgroundColor: colors.info,
  },
  contractStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  contractRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contractLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contractValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  clauseBadge: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.info,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  clauseText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textOnPrimary,
  },
  poachableBadge: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  poachableText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
  noContractContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  noContractText: {
    fontSize: fontSize.md,
    color: colors.textLight,
  },
  noContractSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  interviewsContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  interviewsCount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  interviewingTeamsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  interviewingTeamBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  interviewingTeamText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  noInterviewsContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  noInterviewsText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  statusContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  // Scouting Report Styles
  scoutingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  assessmentContainer: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  assessmentText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontStyle: 'italic',
  },
  overallAssessmentText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: fontSize.sm * 1.5,
  },
  disclaimerText: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  attributeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  attributeInfo: {
    flex: 1,
  },
  attributeName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  attributeAssessment: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  attributeRangeContainer: {
    width: 100,
    alignItems: 'flex-end',
  },
  attributeBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.xxs,
    overflow: 'hidden',
    position: 'relative',
  },
  attributeBarFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 4,
  },
  attributeRangeText: {
    fontSize: 10,
    color: colors.textLight,
  },
  upsideRiskContainer: {
    gap: spacing.sm,
  },
  upsideBox: {
    backgroundColor: colors.success + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  upsideLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.success,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  upsideText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  riskBox: {
    backgroundColor: colors.error + '15',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  riskLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  riskText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
});

export default CoachCard;
