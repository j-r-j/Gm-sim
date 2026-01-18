/**
 * ProspectDetailScreen
 * Comprehensive prospect view with scouting reports and actions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { Avatar } from '../components/avatar';
import { Position } from '../core/models/player/Position';
import { Scout } from '../core/models/staff/Scout';
import { ScoutReport, formatSkillRange } from '../core/scouting/ScoutReportGenerator';
import { FocusScoutingProgress } from '../core/scouting/FocusPlayerSystem';
import { DraftTier } from '../core/scouting/DraftBoardManager';
import { ScoutingStatusCard } from '../components/scouting/ScoutingStatusCard';
import { AssignScoutModal } from '../components/scouting/AssignScoutModal';

/**
 * Props for ProspectDetailScreen
 */
export interface ProspectDetailScreenProps {
  prospectId: string;
  prospectName: string;
  position: Position;
  college: string;
  height: string;
  weight: number;
  reports: ScoutReport[];
  focusProgress: FocusScoutingProgress | null;
  assignedScout: Scout | null;
  availableScouts: Scout[];
  tier: DraftTier | null;
  userNotes: string;
  isLocked: boolean;
  onBack: () => void;
  onAssignScout: (scoutId: string) => void;
  onToggleLock?: () => void;
  onUpdateNotes?: (notes: string) => void;
}

/**
 * Get tier display name
 */
function getTierLabel(tier: DraftTier | null): string {
  if (!tier) return 'Untiered';
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
 * Section header component
 */
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/**
 * Report card component
 */
function ReportCard({ report }: { report: ScoutReport }) {
  const [expanded, setExpanded] = useState(false);
  const isFocus = report.reportType === 'focus';

  return (
    <TouchableOpacity
      style={styles.reportCard}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportHeaderLeft}>
          <View
            style={[
              styles.reportTypeBadge,
              { backgroundColor: isFocus ? colors.success + '20' : colors.primary + '20' },
            ]}
          >
            <Text
              style={[styles.reportTypeText, { color: isFocus ? colors.success : colors.primary }]}
            >
              {isFocus ? 'Focus Report' : 'Auto Report'}
            </Text>
          </View>
          <Text style={styles.reportDate}>
            {new Date(report.generatedAt).toLocaleDateString()}
          </Text>
        </View>
        <Text style={styles.reportScout}>{report.scoutName}</Text>
      </View>

      {/* Skills Summary */}
      <View style={styles.skillsRow}>
        <View style={styles.skillItem}>
          <Text style={styles.skillLabel}>Overall</Text>
          <Text style={styles.skillValue}>
            {report.skillRanges.overall.min}-{report.skillRanges.overall.max}
          </Text>
        </View>
        <View style={styles.skillItem}>
          <Text style={styles.skillLabel}>Physical</Text>
          <Text style={styles.skillValue}>
            {report.skillRanges.physical.min}-{report.skillRanges.physical.max}
          </Text>
        </View>
        <View style={styles.skillItem}>
          <Text style={styles.skillLabel}>Technical</Text>
          <Text style={styles.skillValue}>
            {report.skillRanges.technical.min}-{report.skillRanges.technical.max}
          </Text>
        </View>
      </View>

      {/* Draft Projection */}
      <View style={styles.projectionRow}>
        <Text style={styles.projectionLabel}>Draft Projection:</Text>
        <Text style={styles.projectionValue}>
          {report.draftProjection.pickRangeDescription} - {report.draftProjection.overallGrade}
        </Text>
      </View>

      {/* Confidence */}
      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>Confidence:</Text>
        <Text
          style={[
            styles.confidenceValue,
            {
              color:
                report.confidence.level === 'high'
                  ? colors.success
                  : report.confidence.level === 'medium'
                    ? colors.warning
                    : colors.error,
            },
          ]}
        >
          {report.confidence.level.toUpperCase()} ({report.confidence.score}/100)
        </Text>
      </View>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Traits */}
          <View style={styles.expandedSection}>
            <Text style={styles.expandedLabel}>Visible Traits</Text>
            <View style={styles.traitsContainer}>
              {report.visibleTraits.map((trait, index) => (
                <View key={index} style={styles.traitBadge}>
                  <Text style={styles.traitText}>{trait.name}</Text>
                </View>
              ))}
            </View>
            {report.hiddenTraitCount > 0 && (
              <Text style={styles.hiddenTraitsText}>
                +{report.hiddenTraitCount} additional traits require focus scouting
              </Text>
            )}
          </View>

          {/* Focus Report Details */}
          {isFocus && (
            <>
              {/* Character Assessment */}
              {report.characterAssessment && (
                <View style={styles.expandedSection}>
                  <Text style={styles.expandedLabel}>Character Assessment</Text>
                  <View style={styles.assessmentGrid}>
                    <Text style={styles.assessmentItem}>
                      Work Ethic: {report.characterAssessment.workEthic}
                    </Text>
                    <Text style={styles.assessmentItem}>
                      Leadership: {report.characterAssessment.leadership}
                    </Text>
                    <Text style={styles.assessmentItem}>
                      Coachability: {report.characterAssessment.coachability}
                    </Text>
                    <Text style={styles.assessmentItem}>
                      Maturity: {report.characterAssessment.maturity}
                    </Text>
                    <Text style={styles.assessmentItem}>
                      Competitiveness: {report.characterAssessment.competitiveness}
                    </Text>
                  </View>
                  {report.characterAssessment.notes.length > 0 && (
                    <View style={styles.notesContainer}>
                      {report.characterAssessment.notes.map((note, index) => (
                        <Text key={index} style={styles.noteText}>
                          • {note}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Medical Assessment */}
              {report.medicalAssessment && (
                <View style={styles.expandedSection}>
                  <Text style={styles.expandedLabel}>Medical Assessment</Text>
                  <Text style={styles.assessmentItem}>
                    Overall: {report.medicalAssessment.overallGrade.replace('_', ' ')}
                  </Text>
                  <Text style={styles.assessmentItem}>
                    Durability: {report.medicalAssessment.durabilityProjection}
                  </Text>
                  {report.medicalAssessment.redFlags.length > 0 && (
                    <View style={styles.flagsContainer}>
                      <Text style={styles.flagsLabel}>Red Flags:</Text>
                      {report.medicalAssessment.redFlags.map((flag, index) => (
                        <Text key={index} style={styles.redFlagText}>
                          • {flag}
                        </Text>
                      ))}
                    </View>
                  )}
                  {report.medicalAssessment.clearances.length > 0 && (
                    <View style={styles.flagsContainer}>
                      <Text style={styles.clearancesLabel}>Clearances:</Text>
                      {report.medicalAssessment.clearances.map((clearance, index) => (
                        <Text key={index} style={styles.clearanceText}>
                          • {clearance}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Interview Insights */}
              {report.interviewInsights && (
                <View style={styles.expandedSection}>
                  <Text style={styles.expandedLabel}>Interview Insights</Text>
                  <Text style={styles.assessmentItem}>
                    Football IQ: {report.interviewInsights.footballIQ}
                  </Text>
                  <Text style={styles.assessmentItem}>
                    Communication: {report.interviewInsights.communication}
                  </Text>
                  <Text style={styles.assessmentItem}>
                    Motivation: {report.interviewInsights.motivation}
                  </Text>
                  {report.interviewInsights.positives.length > 0 && (
                    <View style={styles.flagsContainer}>
                      {report.interviewInsights.positives.map((positive, index) => (
                        <Text key={index} style={styles.positiveText}>
                          + {positive}
                        </Text>
                      ))}
                    </View>
                  )}
                  {report.interviewInsights.concerns.length > 0 && (
                    <View style={styles.flagsContainer}>
                      {report.interviewInsights.concerns.map((concern, index) => (
                        <Text key={index} style={styles.concernText}>
                          - {concern}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Player Comparison */}
              {report.playerComparison && (
                <View style={styles.expandedSection}>
                  <Text style={styles.expandedLabel}>Player Comparison</Text>
                  <Text style={styles.comparisonText}>{report.playerComparison}</Text>
                  {report.ceiling && report.floor && (
                    <Text style={styles.ceilingFloorText}>
                      Ceiling: {report.ceiling} | Floor: {report.floor}
                    </Text>
                  )}
                </View>
              )}

              {/* Scheme Fit */}
              {report.schemeFitAnalysis && (
                <View style={styles.expandedSection}>
                  <Text style={styles.expandedLabel}>Scheme Fit</Text>
                  <Text style={styles.assessmentItem}>
                    Best Fit: {report.schemeFitAnalysis.bestFitScheme}
                  </Text>
                  <Text style={styles.assessmentItem}>
                    Worst Fit: {report.schemeFitAnalysis.worstFitScheme}
                  </Text>
                  <Text style={styles.assessmentItem}>
                    Versatility: {report.schemeFitAnalysis.versatility}
                  </Text>
                </View>
              )}
            </>
          )}

          {/* Confidence Factors */}
          <View style={styles.expandedSection}>
            <Text style={styles.expandedLabel}>Confidence Factors</Text>
            {report.confidence.factors.map((factor, index) => (
              <View key={index} style={styles.factorRow}>
                <View
                  style={[
                    styles.factorImpact,
                    {
                      backgroundColor:
                        factor.impact === 'positive'
                          ? colors.success + '20'
                          : factor.impact === 'negative'
                            ? colors.error + '20'
                            : colors.textSecondary + '20',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.factorImpactText,
                      {
                        color:
                          factor.impact === 'positive'
                            ? colors.success
                            : factor.impact === 'negative'
                              ? colors.error
                              : colors.textSecondary,
                      },
                    ]}
                  >
                    {factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : '○'}
                  </Text>
                </View>
                <View style={styles.factorContent}>
                  <Text style={styles.factorName}>{factor.factor}</Text>
                  <Text style={styles.factorDescription}>{factor.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.expandHint}>{expanded ? 'Tap to collapse' : 'Tap to expand'}</Text>
    </TouchableOpacity>
  );
}

/**
 * ProspectDetailScreen Component
 */
export function ProspectDetailScreen({
  prospectId,
  prospectName,
  position,
  college,
  height,
  weight,
  reports,
  focusProgress,
  assignedScout,
  availableScouts,
  tier,
  isLocked,
  onBack,
  onAssignScout,
  onToggleLock,
}: ProspectDetailScreenProps): React.JSX.Element {
  const [showAssignModal, setShowAssignModal] = useState(false);

  const hasFocusReport = reports.some((r) => r.reportType === 'focus');
  const sortedReports = [...reports].sort((a, b) => b.generatedAt - a.generatedAt);

  // Get aggregated stats
  const latestReport = sortedReports[0];
  const avgOverallMin =
    reports.length > 0
      ? Math.round(reports.reduce((sum, r) => sum + r.skillRanges.overall.min, 0) / reports.length)
      : 0;
  const avgOverallMax =
    reports.length > 0
      ? Math.round(reports.reduce((sum, r) => sum + r.skillRanges.overall.max, 0) / reports.length)
      : 0;

  const handleRequestFocus = () => {
    setShowAssignModal(true);
  };

  const handleAssignScout = (scoutId: string) => {
    onAssignScout(scoutId);
    setShowAssignModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Prospect Profile</Text>
        <View style={styles.headerActions}>
          {onToggleLock && (
            <TouchableOpacity onPress={onToggleLock} style={styles.lockButton}>
              <Text style={styles.lockText}>{isLocked ? '🔒' : '🔓'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Prospect Header Card */}
        <View style={styles.prospectCard}>
          <View style={styles.prospectHeader}>
            <Avatar id={prospectId} size="lg" context="prospect" />
            <View style={styles.prospectInfo}>
              <Text style={styles.prospectName}>{prospectName}</Text>
              <View style={styles.prospectMeta}>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionText}>{position}</Text>
                </View>
                <View style={[styles.tierBadge, { backgroundColor: getTierColor(tier) + '20' }]}>
                  <Text style={[styles.tierText, { color: getTierColor(tier) }]}>
                    {getTierLabel(tier)}
                  </Text>
                </View>
              </View>
              <Text style={styles.collegeText}>{college}</Text>
            </View>
          </View>

          {/* Physical Measurements */}
          <View style={styles.measurementsRow}>
            <View style={styles.measurementItem}>
              <Text style={styles.measurementLabel}>Height</Text>
              <Text style={styles.measurementValue}>{height}</Text>
            </View>
            <View style={styles.measurementItem}>
              <Text style={styles.measurementLabel}>Weight</Text>
              <Text style={styles.measurementValue}>{weight} lbs</Text>
            </View>
            {latestReport && (
              <>
                <View style={styles.measurementItem}>
                  <Text style={styles.measurementLabel}>OVR Range</Text>
                  <Text style={styles.measurementValue}>
                    {avgOverallMin}-{avgOverallMax}
                  </Text>
                </View>
                <View style={styles.measurementItem}>
                  <Text style={styles.measurementLabel}>Round</Text>
                  <Text style={styles.measurementValue}>
                    {latestReport.draftProjection.roundMin}-{latestReport.draftProjection.roundMax}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Scouting Status */}
        <SectionHeader title="Scouting Status" />
        <ScoutingStatusCard
          prospectId={prospectId}
          reports={reports}
          focusProgress={focusProgress}
          assignedScout={assignedScout}
          onRequestFocus={handleRequestFocus}
        />

        {/* Scout Reports */}
        <SectionHeader title={`Scout Reports (${reports.length})`} />
        {sortedReports.length > 0 ? (
          sortedReports.map((report) => <ReportCard key={report.id} report={report} />)
        ) : (
          <View style={styles.emptyReports}>
            <Text style={styles.emptyReportsText}>No scout reports yet</Text>
            <Text style={styles.emptyReportsSubtext}>
              Request focus scouting to evaluate this prospect
            </Text>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Assign Scout Modal */}
      <AssignScoutModal
        visible={showAssignModal}
        prospectId={prospectId}
        prospectName={prospectName}
        prospectPosition={position}
        scouts={availableScouts}
        onAssign={handleAssignScout}
        onClose={() => setShowAssignModal(false)}
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
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    width: 60,
    justifyContent: 'flex-end',
  },
  lockButton: {
    padding: spacing.xs,
  },
  lockText: {
    fontSize: fontSize.lg,
  },
  content: {
    flex: 1,
  },
  prospectCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  prospectHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  prospectInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  prospectName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  prospectMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  positionBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  positionText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  tierBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  tierText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  collegeText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  measurementsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  measurementItem: {
    alignItems: 'center',
  },
  measurementLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  measurementValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  reportCard: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  reportTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  reportTypeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  reportDate: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  reportScout: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  skillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
  },
  skillItem: {
    alignItems: 'center',
  },
  skillLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  skillValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  projectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  projectionLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  projectionValue: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  confidenceValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  expandHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandedSection: {
    marginBottom: spacing.md,
  },
  expandedLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  traitsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  traitBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  traitText: {
    fontSize: fontSize.xs,
    color: colors.primary,
  },
  hiddenTraitsText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  assessmentGrid: {
    gap: spacing.xxs,
  },
  assessmentItem: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  notesContainer: {
    marginTop: spacing.xs,
  },
  noteText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  flagsContainer: {
    marginTop: spacing.xs,
  },
  flagsLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginBottom: 2,
  },
  clearancesLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.success,
    marginBottom: 2,
  },
  redFlagText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  clearanceText: {
    fontSize: fontSize.sm,
    color: colors.success,
  },
  positiveText: {
    fontSize: fontSize.sm,
    color: colors.success,
  },
  concernText: {
    fontSize: fontSize.sm,
    color: colors.warning,
  },
  comparisonText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontStyle: 'italic',
  },
  ceilingFloorText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  factorImpact: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  factorImpactText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  factorContent: {
    flex: 1,
  },
  factorName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  factorDescription: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  emptyReports: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    padding: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  emptyReportsText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  emptyReportsSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default ProspectDetailScreen;
