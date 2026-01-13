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
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { Position } from '../core/models/player/Position';
import { SkillValue, SKILL_NAMES_BY_POSITION } from '../core/models/player/TechnicalSkills';
import { PhysicalAttributes } from '../core/models/player/PhysicalAttributes';
import { HiddenTraits, ALL_POSITIVE_TRAITS, ALL_NEGATIVE_TRAITS } from '../core/models/player/HiddenTraits';
import { SkillRangeDisplay, TraitBadges, PhysicalAttributesDisplay } from '../components/player';

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
  playerId: _playerId,
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
  onBack,
  onToggleFlag,
  onUpdateNotes: _onUpdateNotes,
  onUpdateTier: _onUpdateTier,
}: PlayerProfileScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'skills' | 'physical' | 'traits'>('skills');

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
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.playerName}>{fullName}</Text>
          <View style={styles.positionBadge}>
            <Text style={styles.positionText}>{position}</Text>
          </View>
        </View>
        {onToggleFlag && (
          <TouchableOpacity style={styles.flagButton} onPress={onToggleFlag}>
            <Text style={[styles.flagIcon, flagged && styles.flagIconActive]}>*</Text>
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
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'skills' && styles.tabActive]}
            onPress={() => setActiveTab('skills')}
          >
            <Text style={[styles.tabText, activeTab === 'skills' && styles.tabTextActive]}>
              Skills
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'physical' && styles.tabActive]}
            onPress={() => setActiveTab('physical')}
          >
            <Text style={[styles.tabText, activeTab === 'physical' && styles.tabTextActive]}>
              Physical
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'traits' && styles.tabActive]}
            onPress={() => setActiveTab('traits')}
          >
            <Text style={[styles.tabText, activeTab === 'traits' && styles.tabTextActive]}>
              Traits
            </Text>
          </TouchableOpacity>
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
            <TraitBadges
              hiddenTraits={hiddenTraits}
              maxUnknownPlaceholders={maxUnknown}
            />
            {revealedCount === 0 && (
              <Text style={styles.noTraitsText}>
                No traits have been revealed yet. Play games, conduct interviews, and send scouts to learn more about this player.
              </Text>
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
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
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
  },
  flagIcon: {
    fontSize: fontSize.xxl,
    color: colors.textOnPrimary + '40',
    fontWeight: fontWeight.bold,
  },
  flagIconActive: {
    color: colors.secondary,
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
});

export default PlayerProfileScreen;
