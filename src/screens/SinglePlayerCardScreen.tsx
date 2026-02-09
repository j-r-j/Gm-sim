/**
 * SinglePlayerCardScreen
 * A single comprehensive view for draftable player/prospect details.
 * Consolidates all prospect information into one scrollable screen.
 *
 * BRAND GUIDELINES:
 * - Skills ALWAYS shown as ranges (perceivedMin to perceivedMax)
 * - NO overall rating anywhere
 * - Traits shown with revealed/unknown distinction
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
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
import { Avatar } from '../components/avatar';
import { Position } from '../core/models/player/Position';
import { SkillValue, SKILL_NAMES_BY_POSITION } from '../core/models/player/TechnicalSkills';
import { PhysicalAttributes } from '../core/models/player/PhysicalAttributes';
import { HiddenTraits } from '../core/models/player/HiddenTraits';
import { SkillRangeDisplay, TraitBadges, PhysicalAttributesDisplay } from '../components/player';
import { Scout } from '../core/models/staff/Scout';
import { ScoutReport } from '../core/scouting/ScoutReportGenerator';
import { FocusScoutingProgress } from '../core/scouting/FocusPlayerSystem';
import { DraftTier } from '../core/scouting/DraftBoardManager';
import { ScoutingStatusCard } from '../components/scouting/ScoutingStatusCard';
import { AssignScoutModal } from '../components/scouting/AssignScoutModal';

/**
 * Props for SinglePlayerCardScreen
 */
export interface SinglePlayerCardScreenProps {
  /** Player/Prospect ID */
  playerId: string;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Position */
  position: Position;
  /** Age */
  age: number;
  /** College name */
  collegeName: string;
  /** Height display string (e.g., "6'2\"") */
  height: string;
  /** Weight in pounds */
  weight: number;
  /** Technical skills */
  skills: Record<string, SkillValue>;
  /** Physical attributes */
  physical: PhysicalAttributes;
  /** Whether physicals have been revealed through scouting */
  physicalsRevealed: boolean;
  /** Hidden traits */
  hiddenTraits: HiddenTraits;
  /** Draft tier from scouting */
  tier: DraftTier | null;
  /** Projected round (1-7, null for unknown) */
  projectedRound: number | null;
  /** Projected pick range */
  projectedPickRange: { min: number; max: number } | null;
  /** User-assigned tier */
  userTier: string | null;
  /** User notes */
  userNotes: string;
  /** Whether player is flagged */
  flagged: boolean;
  /** Scouting reports */
  reports: ScoutReport[];
  /** Focus scouting progress */
  focusProgress: FocusScoutingProgress | null;
  /** Currently assigned scout */
  assignedScout: Scout | null;
  /** Available scouts for assignment */
  availableScouts: Scout[];
  /** Whether player board position is locked */
  isLocked: boolean;
  /** Callback to go back */
  onBack: () => void;
  /** Callback when a scout is assigned */
  onAssignScout: (scoutId: string) => void;
  /** Callback to toggle lock status */
  onToggleLock?: () => void;
  /** Callback to toggle flag */
  onToggleFlag?: () => void;
  /** Callback when user notes are updated */
  onUpdateNotes?: (notes: string) => void;
  /** Callback when user tier is updated */
  onUpdateTier?: (tier: string | null) => void;
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
 * Get position group for skill display
 */
function getPositionGroup(position: Position): keyof typeof SKILL_NAMES_BY_POSITION {
  switch (position) {
    case Position.QB:
      return 'QB';
    case Position.RB:
      return 'RB';
    case Position.WR:
      return 'WR';
    case Position.TE:
      return 'TE';
    case Position.LT:
    case Position.LG:
    case Position.C:
    case Position.RG:
    case Position.RT:
      return 'OL';
    case Position.DE:
    case Position.DT:
      return 'DL';
    case Position.OLB:
    case Position.ILB:
      return 'LB';
    case Position.CB:
    case Position.FS:
    case Position.SS:
      return 'DB';
    case Position.K:
      return 'K';
    case Position.P:
      return 'P';
    default:
      return 'QB';
  }
}

/**
 * Section component for grouping content
 */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

/**
 * Expandable report card component
 */
function ReportCard({ report }: { report: ScoutReport }): React.JSX.Element {
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
          <Text style={styles.reportDate}>{new Date(report.generatedAt).toLocaleDateString()}</Text>
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
                          - {note}
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
                          - {flag}
                        </Text>
                      ))}
                    </View>
                  )}
                  {report.medicalAssessment.clearances.length > 0 && (
                    <View style={styles.flagsContainer}>
                      <Text style={styles.clearancesLabel}>Clearances:</Text>
                      {report.medicalAssessment.clearances.map((clearance, index) => (
                        <Text key={index} style={styles.clearanceText}>
                          - {clearance}
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
                    {factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : 'o'}
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
 * User tier selection buttons
 */
const USER_TIERS = ['Must Have', 'Like', 'OK', 'Avoid'];

/**
 * SinglePlayerCardScreen Component
 */
export function SinglePlayerCardScreen({
  playerId,
  firstName,
  lastName,
  position,
  age,
  collegeName,
  height,
  weight,
  skills,
  physical,
  physicalsRevealed,
  hiddenTraits,
  tier,
  projectedRound,
  projectedPickRange,
  userTier,
  userNotes,
  flagged = false,
  reports,
  focusProgress,
  assignedScout,
  availableScouts,
  isLocked,
  onBack,
  onAssignScout,
  onToggleLock,
  onToggleFlag,
  onUpdateNotes,
  onUpdateTier,
}: SinglePlayerCardScreenProps): React.JSX.Element {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(userNotes);

  const fullName = `${firstName} ${lastName}`;
  const positionGroup = getPositionGroup(position);
  const skillNames = SKILL_NAMES_BY_POSITION[positionGroup] || [];
  const sortedReports = [...reports].sort((a, b) => b.generatedAt - a.generatedAt);

  const handleRequestFocus = () => {
    setShowAssignModal(true);
  };

  const handleAssignScout = (scoutId: string) => {
    onAssignScout(scoutId);
    setShowAssignModal(false);
  };

  const handleSaveNotes = () => {
    if (onUpdateNotes) {
      onUpdateNotes(notesValue);
    }
    setEditingNotes(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Prospect Profile" onBack={onBack} testID="prospect-profile-header" />
      <View style={styles.headerActions}>
        {onToggleLock && (
          <TouchableOpacity onPress={onToggleLock} style={styles.actionButton}>
            <Text style={styles.actionText}>{isLocked ? 'Locked' : 'Unlocked'}</Text>
          </TouchableOpacity>
        )}
        {onToggleFlag && (
          <TouchableOpacity
            onPress={onToggleFlag}
            style={[styles.actionButton, flagged && styles.actionButtonActive]}
          >
            <Text style={[styles.actionText, flagged && styles.actionTextActive]}>
              {flagged ? 'Flagged' : 'Flag'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Player Header Card */}
        <View style={styles.playerCard}>
          <View style={styles.playerHeader}>
            <Avatar id={playerId} size="xl" context="prospect" />
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>{fullName}</Text>
              <View style={styles.playerMeta}>
                <View style={styles.positionBadge}>
                  <Text style={styles.positionText}>{position}</Text>
                </View>
                <View style={[styles.tierBadge, { backgroundColor: getTierColor(tier) + '20' }]}>
                  <Text style={[styles.tierText, { color: getTierColor(tier) }]}>
                    {getTierLabel(tier)}
                  </Text>
                </View>
              </View>
              <Text style={styles.collegeText}>{collegeName}</Text>
            </View>
          </View>

          {/* Quick Info Row */}
          <View style={styles.quickInfoRow}>
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>Age</Text>
              <Text style={styles.quickInfoValue}>{age}</Text>
            </View>
            <View style={styles.quickInfoDivider} />
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>Height</Text>
              <Text style={styles.quickInfoValue}>{height}</Text>
            </View>
            <View style={styles.quickInfoDivider} />
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>Weight</Text>
              <Text style={styles.quickInfoValue}>{weight} lbs</Text>
            </View>
            <View style={styles.quickInfoDivider} />
            <View style={styles.quickInfoItem}>
              <Text style={styles.quickInfoLabel}>Proj. Round</Text>
              <Text style={styles.quickInfoValue}>
                {projectedRound ? `Rd ${projectedRound}` : '?'}
              </Text>
            </View>
          </View>

          {/* Projected Pick Range */}
          {projectedPickRange && (
            <View style={styles.pickRangeRow}>
              <Text style={styles.pickRangeLabel}>Projected Pick Range:</Text>
              <Text style={styles.pickRangeValue}>
                #{projectedPickRange.min} - #{projectedPickRange.max}
              </Text>
            </View>
          )}
        </View>

        {/* User Tier Selection */}
        {onUpdateTier && (
          <Section title="Your Evaluation">
            <View style={styles.userTierRow}>
              {USER_TIERS.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.userTierButton, userTier === t && styles.userTierButtonActive]}
                  onPress={() => onUpdateTier(userTier === t ? null : t)}
                >
                  <Text style={[styles.userTierText, userTier === t && styles.userTierTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Section>
        )}

        {/* User Notes */}
        {onUpdateNotes && (
          <Section title="Your Notes">
            {editingNotes ? (
              <View style={styles.notesEditContainer}>
                <TextInput
                  style={styles.notesInput}
                  value={notesValue}
                  onChangeText={setNotesValue}
                  placeholder="Add your notes about this prospect..."
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={styles.notesActions}>
                  <TouchableOpacity
                    style={styles.notesCancelButton}
                    onPress={() => {
                      setNotesValue(userNotes);
                      setEditingNotes(false);
                    }}
                  >
                    <Text style={styles.notesCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.notesSaveButton} onPress={handleSaveNotes}>
                    <Text style={styles.notesSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.notesDisplay} onPress={() => setEditingNotes(true)}>
                <Text style={userNotes ? styles.notesText : styles.notesPlaceholder}>
                  {userNotes || 'Tap to add notes...'}
                </Text>
              </TouchableOpacity>
            )}
          </Section>
        )}

        {/* Skills */}
        <Section title="Technical Skills">
          <Text style={styles.skillsNote}>
            Skills shown as scouting ranges. Ranges narrow as players mature.
          </Text>
          {skillNames.map((skillName) => {
            const skill = skills[skillName];
            if (!skill) return null;
            return (
              <SkillRangeDisplay
                key={skillName}
                skillName={skillName}
                perceivedMin={skill.perceivedMin}
                perceivedMax={skill.perceivedMax}
                playerAge={age}
                maturityAge={skill.maturityAge}
              />
            );
          })}
        </Section>

        {/* Physical Attributes */}
        <Section title="Physical Attributes">
          <PhysicalAttributesDisplay
            physical={physical}
            position={position}
            revealed={physicalsRevealed}
          />
        </Section>

        {/* Traits */}
        <Section title="Character & Traits">
          <Text style={styles.traitsNote}>
            Traits are revealed through scouting and evaluation.
          </Text>
          <TraitBadges hiddenTraits={hiddenTraits} maxUnknownPlaceholders={3} />
        </Section>

        {/* Scouting Status */}
        <Section title="Scouting Status">
          <ScoutingStatusCard
            prospectId={playerId}
            reports={reports}
            focusProgress={focusProgress}
            assignedScout={assignedScout}
            onRequestFocus={handleRequestFocus}
          />
        </Section>

        {/* Scouting Reports */}
        <Section title={`Scout Reports (${reports.length})`}>
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
        </Section>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Assign Scout Modal */}
      <AssignScoutModal
        visible={showAssignModal}
        prospectId={playerId}
        prospectName={fullName}
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
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    fontWeight: fontWeight.medium,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.textOnPrimary + '20',
  },
  actionButtonActive: {
    backgroundColor: colors.secondary,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    fontWeight: fontWeight.medium,
  },
  actionTextActive: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
  },
  content: {
    flex: 1,
  },
  playerCard: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  playerHeader: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  playerInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  playerName: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  playerMeta: {
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
  quickInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  quickInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickInfoDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  quickInfoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  quickInfoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  pickRangeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pickRangeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  pickRangeValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  userTierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  userTierButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userTierButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  userTierText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  userTierTextActive: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
  },
  notesEditContainer: {
    gap: spacing.sm,
  },
  notesInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  notesCancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  notesCancelText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  notesSaveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  notesSaveText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  notesDisplay: {
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    minHeight: 60,
  },
  notesText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  notesPlaceholder: {
    fontSize: fontSize.md,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  skillsNote: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  traitsNote: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  reportCard: {
    backgroundColor: colors.background,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.surfaceLight,
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
    padding: spacing.xl,
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
    height: spacing.xxl,
  },
});

export default SinglePlayerCardScreen;
