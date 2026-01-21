/**
 * PlayerProfileScreen
 * Full player/prospect profile view with skills, traits, and detailed information.
 *
 * BRAND GUIDELINES:
 * - Skills ALWAYS shown as ranges (perceivedMin to perceivedMax)
 * - NO overall rating anywhere
 * - Traits shown with revealed/unknown distinction
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows, accessibility } from '../styles';
import { Position } from '../core/models/player/Position';
import { SkillValue, SKILL_NAMES_BY_POSITION } from '../core/models/player/TechnicalSkills';
import { PhysicalAttributes } from '../core/models/player/PhysicalAttributes';
import {
  HiddenTraits,
  ALL_POSITIVE_TRAITS,
  ALL_NEGATIVE_TRAITS,
} from '../core/models/player/HiddenTraits';
import { SkillRangeDisplay, TraitBadges, PhysicalAttributesDisplay } from '../components/player';
import { Avatar } from '../components/avatar';
import { ScoutReport } from '../core/scouting/ScoutReportGenerator';

/**
 * Props for PlayerProfileScreen
 */
export interface PlayerProfileScreenProps {
  /** Player/Prospect ID */
  playerId: string;
  /** Player's first name */
  firstName: string;
  /** Player's last name */
  lastName: string;
  /** Position */
  position: Position;
  /** Age */
  age: number;
  /** Years of experience (0 for rookies/prospects) */
  experience: number;
  /** Technical skills */
  skills: Record<string, SkillValue>;
  /** Physical attributes */
  physical: PhysicalAttributes;
  /** Whether physicals have been revealed */
  physicalsRevealed: boolean;
  /** Hidden traits */
  hiddenTraits: HiddenTraits;
  /** College name (for prospects) */
  collegeName?: string;
  /** Draft year (for prospects) */
  draftYear?: number;
  /** Draft round (1-7, 0 for undrafted) */
  draftRound?: number;
  /** Draft pick number */
  draftPick?: number;
  /** Projected round (for prospects) */
  projectedRound?: number | null;
  /** Projected pick range (for prospects) */
  projectedPickRange?: { min: number; max: number } | null;
  /** User tier */
  userTier?: string | null;
  /** User notes */
  userNotes?: string;
  /** Whether player is flagged */
  flagged?: boolean;
  /** Scouting reports for this prospect */
  scoutReports?: ScoutReport[];
  /** Callback to go back */
  onBack?: () => void;
  /** Callback when flag is toggled */
  onToggleFlag?: () => void;
  /** Callback when user notes are updated */
  onUpdateNotes?: (notes: string) => void;
  /** Callback when user tier is updated */
  onUpdateTier?: (tier: string | null) => void;
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
 * Section header component
 */
function SectionHeader({ title }: { title: string }): React.JSX.Element {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/**
 * Info row component
 */
function InfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

/**
 * PlayerProfileScreen Component
 */
export function PlayerProfileScreen({
  playerId,
  firstName,
  lastName,
  position,
  age,
  experience,
  skills,
  physical,
  physicalsRevealed,
  hiddenTraits,
  collegeName,
  draftYear,
  draftRound,
  draftPick,
  projectedRound,
  projectedPickRange,
  userTier,
  userNotes,
  flagged = false,
  scoutReports = [],
  onBack,
  onToggleFlag,
  onUpdateNotes: _onUpdateNotes,
  onUpdateTier: _onUpdateTier,
}: PlayerProfileScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'skills' | 'physical' | 'traits' | 'scouting'>(
    'skills'
  );

  const fullName = `${firstName} ${lastName}`;
  const isProspect = experience === 0 && collegeName;
  const positionGroup = getPositionGroup(position);
  const skillNames = SKILL_NAMES_BY_POSITION[positionGroup] || [];

  // Count total possible unknown traits
  const totalPossibleTraits = ALL_POSITIVE_TRAITS.length + ALL_NEGATIVE_TRAITS.length;
  const revealedCount = hiddenTraits.revealedToUser.length;
  const maxUnknown = Math.min(3, totalPossibleTraits - revealedCount);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textOnPrimary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Avatar
            id={playerId}
            size="lg"
            age={age}
            context={isProspect ? 'prospect' : 'player'}
            accentColor={colors.secondary}
          />
          <Text style={styles.playerName} accessibilityRole="header">
            {fullName}
          </Text>
          <View style={styles.positionBadge}>
            <Text style={styles.positionText}>{position}</Text>
          </View>
        </View>
        {onToggleFlag && (
          <TouchableOpacity
            style={styles.flagButton}
            onPress={onToggleFlag}
            accessibilityLabel={flagged ? 'Remove from favorites' : 'Add to favorites'}
            accessibilityRole="button"
            accessibilityState={{ checked: flagged }}
            hitSlop={accessibility.hitSlop}
          >
            <Ionicons
              name={flagged ? 'star' : 'star-outline'}
              size={24}
              color={flagged ? colors.secondary : colors.textOnPrimary + '40'}
            />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Basic Info Card */}
        <View style={styles.card}>
          <View style={styles.basicInfoRow}>
            <View style={styles.basicInfoItem}>
              <Text style={styles.basicInfoValue}>{age}</Text>
              <Text style={styles.basicInfoLabel}>Age</Text>
            </View>
            <View style={styles.basicInfoDivider} />
            <View style={styles.basicInfoItem}>
              <Text style={styles.basicInfoValue}>
                {experience === 0 ? 'Rookie' : `${experience} yrs`}
              </Text>
              <Text style={styles.basicInfoLabel}>Experience</Text>
            </View>
            {isProspect && projectedRound !== undefined && (
              <>
                <View style={styles.basicInfoDivider} />
                <View style={styles.basicInfoItem}>
                  <Text style={styles.basicInfoValue}>
                    {projectedRound === 0 ? 'UDFA' : `Rd ${projectedRound}`}
                  </Text>
                  <Text style={styles.basicInfoLabel}>Projected</Text>
                </View>
              </>
            )}
          </View>

          {/* User Tier */}
          {userTier && (
            <View style={styles.userTierContainer}>
              <View style={styles.userTierBadge}>
                <Text style={styles.userTierText}>{userTier}</Text>
              </View>
            </View>
          )}
        </View>

        {/* College/Draft Info */}
        {(collegeName || draftYear) && (
          <View style={styles.card}>
            <SectionHeader title={isProspect ? 'College' : 'Background'} />
            {collegeName && <InfoRow label="School" value={collegeName} />}
            {draftYear && draftRound !== undefined && draftRound > 0 && (
              <InfoRow
                label="Drafted"
                value={`${draftYear} Round ${draftRound}, Pick ${draftPick}`}
              />
            )}
            {draftYear && draftRound === 0 && (
              <InfoRow label="Drafted" value={`${draftYear} (Undrafted)`} />
            )}
            {isProspect && projectedPickRange && (
              <InfoRow
                label="Projected Pick"
                value={`#${projectedPickRange.min}-${projectedPickRange.max}`}
              />
            )}
          </View>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer} accessibilityRole="tablist">
          <TouchableOpacity
            style={[styles.tab, activeTab === 'skills' && styles.tabActive]}
            onPress={() => setActiveTab('skills')}
            accessibilityLabel="Technical skills"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'skills' }}
            hitSlop={accessibility.hitSlop}
          >
            <Text style={[styles.tabText, activeTab === 'skills' && styles.tabTextActive]}>
              Skills
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'physical' && styles.tabActive]}
            onPress={() => setActiveTab('physical')}
            accessibilityLabel="Physical attributes"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'physical' }}
            hitSlop={accessibility.hitSlop}
          >
            <Text style={[styles.tabText, activeTab === 'physical' && styles.tabTextActive]}>
              Physical
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'traits' && styles.tabActive]}
            onPress={() => setActiveTab('traits')}
            accessibilityLabel="Character traits"
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'traits' }}
            hitSlop={accessibility.hitSlop}
          >
            <Text style={[styles.tabText, activeTab === 'traits' && styles.tabTextActive]}>
              Traits
            </Text>
          </TouchableOpacity>
          {isProspect && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'scouting' && styles.tabActive]}
              onPress={() => setActiveTab('scouting')}
              accessibilityLabel="Scouting reports"
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'scouting' }}
              hitSlop={accessibility.hitSlop}
            >
              <Text style={[styles.tabText, activeTab === 'scouting' && styles.tabTextActive]}>
                Scouting
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <View style={styles.card}>
            <SectionHeader title="Technical Skills" />
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
          </View>
        )}

        {/* Physical Tab */}
        {activeTab === 'physical' && (
          <View style={styles.card}>
            <SectionHeader title="Physical Attributes" />
            <PhysicalAttributesDisplay
              physical={physical}
              position={position}
              revealed={physicalsRevealed}
            />
          </View>
        )}

        {/* Traits Tab */}
        {activeTab === 'traits' && (
          <View style={styles.card}>
            <SectionHeader title="Character & Traits" />
            <Text style={styles.traitsNote}>
              Traits are revealed through gameplay events, training, and scout reports.
            </Text>
            <TraitBadges hiddenTraits={hiddenTraits} maxUnknownPlaceholders={maxUnknown} />
            {revealedCount === 0 && (
              <Text style={styles.noTraitsText}>
                No traits have been revealed yet. Play games, conduct interviews, and send scouts to
                learn more about this player.
              </Text>
            )}
          </View>
        )}

        {/* Scouting Tab */}
        {activeTab === 'scouting' && (
          <View style={styles.card}>
            <SectionHeader title="Scouting Reports" />
            {scoutReports.length > 0 ? (
              <>
                {scoutReports.map((report) => (
                  <View key={report.id} style={styles.scoutReportCard}>
                    <View style={styles.scoutReportHeader}>
                      <View style={styles.scoutReportTitleRow}>
                        <Text style={styles.scoutReportType}>
                          {report.reportType === 'focus' ? 'In-Depth Report' : 'Preliminary Report'}
                        </Text>
                        <View
                          style={[
                            styles.confidenceBadge,
                            {
                              backgroundColor:
                                report.confidence.level === 'high'
                                  ? colors.success + '20'
                                  : report.confidence.level === 'medium'
                                    ? colors.warning + '20'
                                    : colors.textSecondary + '20',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.confidenceText,
                              {
                                color:
                                  report.confidence.level === 'high'
                                    ? colors.success
                                    : report.confidence.level === 'medium'
                                      ? colors.warning
                                      : colors.textSecondary,
                              },
                            ]}
                          >
                            {report.confidence.level.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.scoutName}>Scout: {report.scoutName}</Text>
                      <Text style={styles.scoutDate}>
                        {new Date(report.generatedAt).toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={styles.scoutReportBody}>
                      {/* Draft Projection */}
                      <View style={styles.projectionRow}>
                        <Text style={styles.projectionLabel}>Projection:</Text>
                        <Text style={styles.projectionValue}>
                          {report.draftProjection.pickRangeDescription}
                        </Text>
                      </View>
                      <Text style={styles.projectionGrade}>
                        {report.draftProjection.overallGrade}
                      </Text>

                      {/* Skill Ranges */}
                      <View style={styles.skillRangeRow}>
                        <Text style={styles.skillRangeLabel}>Overall:</Text>
                        <Text style={styles.skillRangeValue}>
                          {report.skillRanges.overall.min}-{report.skillRanges.overall.max}
                        </Text>
                      </View>

                      {/* Visible Traits */}
                      {report.visibleTraits.length > 0 && (
                        <View style={styles.traitsSection}>
                          <Text style={styles.traitsSectionLabel}>Observed Traits:</Text>
                          <View style={styles.traitsList}>
                            {report.visibleTraits.map((trait, index) => (
                              <View key={index} style={styles.traitBadge}>
                                <Text style={styles.traitBadgeText}>{trait.name}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {report.hiddenTraitCount > 0 && (
                        <Text style={styles.hiddenTraitsNote}>
                          +{report.hiddenTraitCount} traits require deeper scouting
                        </Text>
                      )}

                      {/* Focus Report Details */}
                      {report.reportType === 'focus' && (
                        <>
                          {report.characterAssessment && (
                            <View style={styles.assessmentSection}>
                              <Text style={styles.assessmentTitle}>Character Assessment</Text>
                              <Text style={styles.assessmentItem}>
                                Work Ethic: {report.characterAssessment.workEthic}
                              </Text>
                              <Text style={styles.assessmentItem}>
                                Leadership: {report.characterAssessment.leadership}
                              </Text>
                              <Text style={styles.assessmentItem}>
                                Coachability: {report.characterAssessment.coachability}
                              </Text>
                            </View>
                          )}

                          {report.playerComparison && (
                            <View style={styles.comparisonSection}>
                              <Text style={styles.comparisonLabel}>Player Comparison:</Text>
                              <Text style={styles.comparisonValue}>{report.playerComparison}</Text>
                            </View>
                          )}

                          {report.ceiling && report.floor && (
                            <View style={styles.ceilingFloorSection}>
                              <View style={styles.ceilingFloorRow}>
                                <Text style={styles.ceilingLabel}>Ceiling:</Text>
                                <Text style={styles.ceilingValue}>{report.ceiling}</Text>
                              </View>
                              <View style={styles.ceilingFloorRow}>
                                <Text style={styles.floorLabel}>Floor:</Text>
                                <Text style={styles.floorValue}>{report.floor}</Text>
                              </View>
                            </View>
                          )}
                        </>
                      )}

                      {/* Scouting Hours */}
                      <Text style={styles.scoutingHours}>
                        {report.scoutingHours} hours of evaluation
                      </Text>

                      {report.needsMoreScouting && (
                        <View style={styles.needsScoutingBadge}>
                          <Text style={styles.needsScoutingText}>Needs More Scouting</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.noReportsContainer}>
                <Text style={styles.noReportsText}>No scouting reports available yet.</Text>
                <Text style={styles.noReportsHint}>
                  Assign scouts to evaluate this prospect to generate reports.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* User Notes */}
        {userNotes !== undefined && (
          <View style={styles.card}>
            <SectionHeader title="Your Notes" />
            {userNotes ? (
              <Text style={styles.notesText}>{userNotes}</Text>
            ) : (
              <Text style={styles.noNotesText}>No notes added yet.</Text>
            )}
          </View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
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
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    ...shadows.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minHeight: accessibility.minTouchTarget,
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  playerName: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.sm,
  },
  positionBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  positionText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  flagButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: accessibility.minTouchTarget,
    minHeight: accessibility.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: colors.surface,
    margin: spacing.md,
    marginBottom: 0,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  basicInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  basicInfoItem: {
    alignItems: 'center',
    flex: 1,
  },
  basicInfoValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  basicInfoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  basicInfoDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
  },
  userTierContainer: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userTierBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  userTierText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  sectionHeader: {
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    minHeight: accessibility.minTouchTarget,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textOnPrimary,
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
  noTraitsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  notesText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  noNotesText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
  // Scouting Report Styles
  scoutReportCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  scoutReportHeader: {
    backgroundColor: colors.primary + '10',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scoutReportTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  scoutReportType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  scoutName: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  scoutDate: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.xxs,
  },
  scoutReportBody: {
    padding: spacing.md,
  },
  projectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  projectionLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  projectionValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  projectionGrade: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  skillRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  skillRangeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  skillRangeValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  traitsSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  traitsSectionLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  traitsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  traitBadge: {
    backgroundColor: colors.info + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  traitBadgeText: {
    fontSize: fontSize.xs,
    color: colors.info,
    fontWeight: fontWeight.medium,
  },
  hiddenTraitsNote: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  assessmentSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  assessmentTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  assessmentItem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  comparisonSection: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  comparisonValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  ceilingFloorSection: {
    marginTop: spacing.sm,
  },
  ceilingFloorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxs,
  },
  ceilingLabel: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginRight: spacing.sm,
    width: 50,
  },
  ceilingValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  floorLabel: {
    fontSize: fontSize.sm,
    color: colors.warning,
    marginRight: spacing.sm,
    width: 50,
  },
  floorValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  scoutingHours: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    marginTop: spacing.md,
    textAlign: 'right',
  },
  needsScoutingBadge: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  needsScoutingText: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: fontWeight.bold,
  },
  noReportsContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  noReportsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  noReportsHint: {
    fontSize: fontSize.sm,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});

export default PlayerProfileScreen;
