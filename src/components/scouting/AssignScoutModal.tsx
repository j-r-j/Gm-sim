/**
 * AssignScoutModal
 * Modal for selecting a scout to assign for focus scouting on a prospect
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { colors, fontSize, fontWeight, borderRadius, spacing } from '../../styles';
import { Scout } from '../../core/models/staff/Scout';
import { getMaxFocusProspects, canAssignFocusPlayer } from '../../core/scouting/FocusPlayerSystem';
import { createScoutAccuracyViewModel } from '../../core/scouting/ScoutAccuracySystem';
import { Position, isOffensivePosition, isDefensivePosition } from '../../core/models/player/Position';
import { Avatar } from '../avatar';

export interface AssignScoutModalProps {
  visible: boolean;
  prospectId: string;
  prospectName: string;
  prospectPosition: Position;
  scouts: Scout[];
  onAssign: (scoutId: string) => void;
  onClose: () => void;
}

/**
 * Format scout role for display
 */
function formatScoutRole(role: string): string {
  const roleMap: Record<string, string> = {
    headScout: 'Head Scout',
    offensiveScout: 'Offensive Scout',
    defensiveScout: 'Defensive Scout',
  };
  return roleMap[role] || role;
}

/**
 * Check if scout's specialty matches prospect position
 */
function isSpecialtyMatch(scout: Scout, position: Position): boolean {
  if (!scout.attributes.positionSpecialty) return false;
  return scout.attributes.positionSpecialty === position;
}

/**
 * Check if scout role matches prospect position side of ball
 */
function isRoleMatch(scout: Scout, position: Position): boolean {
  if (scout.role === 'offensiveScout' && isOffensivePosition(position)) return true;
  if (scout.role === 'defensiveScout' && isDefensivePosition(position)) return true;
  if (scout.role === 'headScout') return true; // Head scout can evaluate anyone

  return false;
}

/**
 * Scout row in the selection list
 */
function ScoutRow({
  scout,
  prospectId,
  prospectPosition,
  onSelect,
}: {
  scout: Scout;
  prospectId: string;
  prospectPosition: Position;
  onSelect: () => void;
}) {
  const maxFocus = getMaxFocusProspects(scout.attributes.experience);
  const currentFocus = scout.focusProspects.length;
  const canAssign = canAssignFocusPlayer(scout, prospectId);
  const accuracyVM = createScoutAccuracyViewModel(scout);
  const specialtyMatch = isSpecialtyMatch(scout, prospectPosition);
  const roleMatch = isRoleMatch(scout, prospectPosition);

  const isRecommended = canAssign && (specialtyMatch || roleMatch);

  return (
    <TouchableOpacity
      style={[styles.scoutRow, !canAssign && styles.scoutRowDisabled]}
      onPress={onSelect}
      disabled={!canAssign}
      activeOpacity={0.7}
    >
      <View style={styles.scoutInfo}>
        <View style={styles.avatarSection}>
          <Avatar id={scout.id} size="sm" context="coach" accentColor={colors.accent} />
          {isRecommended && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>REC</Text>
            </View>
          )}
        </View>
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={[styles.scoutName, !canAssign && styles.textDisabled]}>
              {scout.firstName} {scout.lastName}
            </Text>
            {specialtyMatch && (
              <View style={styles.matchBadge}>
                <Text style={styles.matchText}>Position Match</Text>
              </View>
            )}
          </View>
          <Text style={[styles.scoutRole, !canAssign && styles.textDisabled]}>
            {formatScoutRole(scout.role)}
            {scout.attributes.positionSpecialty && ` - ${scout.attributes.positionSpecialty}`}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Accuracy */}
        <View style={styles.accuracySection}>
          {accuracyVM.reliabilityKnown ? (
            <View
              style={[
                styles.accuracyBadge,
                {
                  backgroundColor:
                    accuracyVM.overallAccuracy === 'Reliable'
                      ? colors.success + '20'
                      : accuracyVM.overallAccuracy === 'Mixed'
                        ? colors.warning + '20'
                        : colors.error + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.accuracyText,
                  {
                    color:
                      accuracyVM.overallAccuracy === 'Reliable'
                        ? colors.success
                        : accuracyVM.overallAccuracy === 'Mixed'
                          ? colors.warning
                          : colors.error,
                  },
                ]}
              >
                {accuracyVM.overallAccuracy}
              </Text>
            </View>
          ) : (
            <Text style={[styles.unknownAccuracy, !canAssign && styles.textDisabled]}>
              {accuracyVM.evaluationCount > 0 ? 'Building' : 'New'}
            </Text>
          )}
        </View>

        {/* Capacity */}
        <View style={styles.capacitySection}>
          <Text style={[styles.capacityLabel, !canAssign && styles.textDisabled]}>Slots</Text>
          <Text
            style={[
              styles.capacityValue,
              currentFocus >= maxFocus && styles.capacityFull,
              !canAssign && styles.textDisabled,
            ]}
          >
            {currentFocus}/{maxFocus}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export function AssignScoutModal({
  visible,
  prospectName,
  prospectPosition,
  prospectId,
  scouts,
  onAssign,
  onClose,
}: AssignScoutModalProps): React.JSX.Element {
  // Sort scouts: recommended first, then by availability
  const sortedScouts = [...scouts].sort((a, b) => {
    const aCanAssign = canAssignFocusPlayer(a, prospectId);
    const bCanAssign = canAssignFocusPlayer(b, prospectId);

    if (aCanAssign !== bCanAssign) return aCanAssign ? -1 : 1;

    const aRoleMatch = isRoleMatch(a, prospectPosition);
    const bRoleMatch = isRoleMatch(b, prospectPosition);

    if (aRoleMatch !== bRoleMatch) return aRoleMatch ? -1 : 1;

    const aSpecialtyMatch = isSpecialtyMatch(a, prospectPosition);
    const bSpecialtyMatch = isSpecialtyMatch(b, prospectPosition);

    if (aSpecialtyMatch !== bSpecialtyMatch) return aSpecialtyMatch ? -1 : 1;

    return a.lastName.localeCompare(b.lastName);
  });

  const availableCount = scouts.filter((s) => canAssignFocusPlayer(s, prospectId)).length;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Assign Scout</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Prospect Info */}
        <View style={styles.prospectInfo}>
          <Text style={styles.prospectLabel}>Focus Scouting:</Text>
          <Text style={styles.prospectName}>{prospectName}</Text>
          <View style={styles.positionBadge}>
            <Text style={styles.positionText}>{prospectPosition}</Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            Select a scout to conduct a detailed evaluation. Focus scouting takes 3 weeks and
            provides comprehensive insights including character, medical, and scheme fit analysis.
          </Text>
          <Text style={styles.availableText}>
            {availableCount} scout{availableCount !== 1 ? 's' : ''} available
          </Text>
        </View>

        {/* Scout List */}
        <FlatList
          data={sortedScouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ScoutRow
              scout={item}
              prospectId={prospectId}
              prospectPosition={prospectPosition}
              onSelect={() => onAssign(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No scouts available</Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
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
  closeButton: {
    padding: spacing.xs,
  },
  closeText: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 60,
  },
  prospectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  prospectLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  prospectName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    flex: 1,
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
  instructions: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  instructionsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  availableText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
  },
  scoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  scoutRowDisabled: {
    opacity: 0.5,
  },
  scoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarSection: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  recommendedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.success,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  recommendedText: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  nameSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  scoutName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginRight: spacing.xs,
  },
  matchBadge: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  matchText: {
    fontSize: fontSize.xs,
    color: colors.accent,
    fontWeight: fontWeight.medium,
  },
  scoutRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  textDisabled: {
    color: colors.textSecondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  accuracySection: {
    alignItems: 'center',
  },
  accuracyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  accuracyText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  unknownAccuracy: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  capacitySection: {
    alignItems: 'center',
    minWidth: 50,
  },
  capacityLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  capacityValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  capacityFull: {
    color: colors.error,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});

export default AssignScoutModal;
