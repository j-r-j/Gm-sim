/**
 * StaffScreen
 * Displays and manages coaching staff and scouts
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { Coach } from '../core/models/staff/Coach';
import { Scout } from '../core/models/staff/Scout';

/**
 * Props for StaffScreen
 */
export interface StaffScreenProps {
  /** Team's coaches */
  coaches: Coach[];
  /** Team's scouts */
  scouts: Scout[];
  /** Callback to go back */
  onBack: () => void;
  /** Callback when staff member is selected */
  onSelectStaff?: (staffId: string, type: 'coach' | 'scout') => void;
}

type StaffTab = 'coaches' | 'scouts';

/**
 * Coach card component
 */
function CoachCard({ coach, onPress }: { coach: Coach; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.staffCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.staffInfo}>
        <View style={[styles.roleBadge, { backgroundColor: colors.primary }]}>
          <Text style={styles.roleText}>{coach.role.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.staffName}>
            {coach.firstName} {coach.lastName}
          </Text>
          <Text style={styles.staffRole}>{formatRole(coach.role)}</Text>
        </View>
      </View>
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>Rep</Text>
        <Text style={styles.ratingValue}>{coach.attributes.reputation}</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Scout card component
 */
function ScoutCard({ scout, onPress }: { scout: Scout; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.staffCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.staffInfo}>
        <View style={[styles.roleBadge, { backgroundColor: colors.accent }]}>
          <Text style={styles.roleText}>SC</Text>
        </View>
        <View style={styles.nameContainer}>
          <Text style={styles.staffName}>
            {scout.firstName} {scout.lastName}
          </Text>
          <Text style={styles.staffRole}>
            {scout.attributes.regionKnowledge || 'General'} Region •{' '}
            {scout.attributes.positionSpecialty || 'All'} Specialist
          </Text>
        </View>
      </View>
      <View style={styles.ratingContainer}>
        <Text style={styles.ratingLabel}>Exp</Text>
        <Text style={styles.ratingValue}>{scout.attributes.experience}</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Format coach role for display
 */
function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    headCoach: 'Head Coach',
    offensiveCoordinator: 'Offensive Coordinator',
    defensiveCoordinator: 'Defensive Coordinator',
    specialTeamsCoordinator: 'Special Teams Coordinator',
    quarterbacksCoach: 'Quarterbacks Coach',
    runningBacksCoach: 'Running Backs Coach',
    wideReceiversCoach: 'Wide Receivers Coach',
    tightEndsCoach: 'Tight Ends Coach',
    offensiveLineCoach: 'Offensive Line Coach',
    defensiveLineCoach: 'Defensive Line Coach',
    linebackersCoach: 'Linebackers Coach',
    secondaryCoach: 'Secondary Coach',
  };
  return roleMap[role] || role;
}

export function StaffScreen({ coaches, scouts, onBack, onSelectStaff }: StaffScreenProps) {
  const [activeTab, setActiveTab] = useState<StaffTab>('coaches');

  // Sort coaches by role importance
  const sortedCoaches = useMemo(() => {
    const roleOrder = [
      'headCoach',
      'offensiveCoordinator',
      'defensiveCoordinator',
      'specialTeamsCoordinator',
    ];
    return [...coaches].sort((a, b) => {
      const aIndex = roleOrder.indexOf(a.role);
      const bIndex = roleOrder.indexOf(b.role);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.lastName.localeCompare(b.lastName);
    });
  }, [coaches]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Staff</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'coaches' && styles.tabActive]}
          onPress={() => setActiveTab('coaches')}
        >
          <Text style={[styles.tabText, activeTab === 'coaches' && styles.tabTextActive]}>
            Coaches ({coaches.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'scouts' && styles.tabActive]}
          onPress={() => setActiveTab('scouts')}
        >
          <Text style={[styles.tabText, activeTab === 'scouts' && styles.tabTextActive]}>
            Scouts ({scouts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Staff List */}
      {activeTab === 'coaches' ? (
        <FlatList
          data={sortedCoaches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CoachCard coach={item} onPress={() => onSelectStaff?.(item.id, 'coach')} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No coaches on staff</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={scouts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ScoutCard scout={item} onPress={() => onSelectStaff?.(item.id, 'scout')} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No scouts on staff</Text>
            </View>
          }
        />
      )}
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
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  placeholder: {
    width: 60,
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
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  listContent: {
    padding: spacing.md,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  roleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  nameContainer: {
    flex: 1,
  },
  staffName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  staffRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  ratingContainer: {
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  ratingValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
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

export default StaffScreen;
