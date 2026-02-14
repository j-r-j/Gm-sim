/**
 * OTAsScreen
 * Displays OTA reports, attendance, rookie integration, and position battle previews
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { GameState } from '../core/models/game/GameState';
import { ScreenHeader } from '../components';
import {
  OTAReport,
  OTASummary,
  RookieIntegrationReport,
  PositionBattlePreview,
} from '../core/offseason/phases/OTAsPhase';

/**
 * Props for OTAsScreen
 */
export interface OTAsScreenProps {
  gameState: GameState;
  summary: OTASummary;
  onBack: () => void;
  onPlayerSelect?: (playerId: string) => void;
}

type TabType = 'overview' | 'attendance' | 'rookies' | 'battles';

/**
 * Get color for attendance status
 */
function getAttendanceColor(attendance: OTAReport['attendance']): string {
  switch (attendance) {
    case 'full':
      return colors.success;
    case 'partial':
      return colors.warning;
    case 'holdout':
      return colors.error;
    case 'excused':
      return colors.textSecondary;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get color for impression
 */
function getImpressionColor(impression: OTAReport['impression']): string {
  switch (impression) {
    case 'standout':
      return colors.success;
    case 'solid':
      return colors.primary;
    case 'average':
      return colors.textSecondary;
    case 'concerning':
      return colors.warning;
    case 'injury':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get color for learning curve
 */
function getLearningCurveColor(curve: RookieIntegrationReport['learningCurve']): string {
  switch (curve) {
    case 'ahead':
      return colors.success;
    case 'on_track':
      return colors.primary;
    case 'behind':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
}

/**
 * Get color for competition level
 */
function getCompetitionColor(level: PositionBattlePreview['competitionLevel']): string {
  switch (level) {
    case 'heated':
      return colors.error;
    case 'competitive':
      return colors.warning;
    case 'clear_starter':
      return colors.success;
    default:
      return colors.textSecondary;
  }
}

/**
 * Overview stats card
 */
function OverviewCard({ summary }: { summary: OTASummary }): React.JSX.Element {
  return (
    <View style={styles.overviewCard}>
      <Text style={styles.cardTitle}>OTA Summary</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.totalParticipants}</Text>
          <Text style={styles.statLabel}>Total Participants</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.success }]}>
            {summary.standouts.length}
          </Text>
          <Text style={styles.statLabel}>Standouts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.warning }]}>
            {summary.concerns.length}
          </Text>
          <Text style={styles.statLabel}>Concerns</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.error }]}>{summary.holdouts}</Text>
          <Text style={styles.statLabel}>Holdouts</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.rookieReports.length}</Text>
          <Text style={styles.statLabel}>Rookies</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.positionBattles.length}</Text>
          <Text style={styles.statLabel}>Position Battles</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Standout player card
 */
function StandoutCard({
  report,
  onPress,
}: {
  report: OTAReport;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.standoutCard}
      onPress={onPress}
      accessibilityLabel={`${report.playerName}, ${report.position}, standout`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.standoutHeader}>
        <View>
          <Text style={styles.playerName}>{report.playerName}</Text>
          <Text style={styles.playerPosition}>{report.position}</Text>
        </View>
        <View style={[styles.impressionBadge, { backgroundColor: colors.success + '20' }]}>
          <Text style={[styles.impressionText, { color: colors.success }]}>STANDOUT</Text>
        </View>
      </View>

      {report.highlights.length > 0 && (
        <View style={styles.highlightsList}>
          {report.highlights.map((highlight, i) => (
            <Text key={i} style={styles.highlightItem}>
              + {highlight}
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.coachFeedback}>"{report.coachFeedback}"</Text>

      <View style={styles.metersRow}>
        <View style={styles.meterContainer}>
          <Text style={styles.meterLabel}>Conditioning</Text>
          <View style={styles.meterBar}>
            <View
              style={[
                styles.meterFill,
                {
                  width: `${report.conditioningLevel}%`,
                  backgroundColor: colors.success,
                },
              ]}
            />
          </View>
          <Text style={styles.meterValue}>{report.conditioningLevel}</Text>
        </View>
        <View style={styles.meterContainer}>
          <Text style={styles.meterLabel}>Scheme Grasp</Text>
          <View style={styles.meterBar}>
            <View
              style={[
                styles.meterFill,
                {
                  width: `${report.schemeGrasp}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.meterValue}>{report.schemeGrasp}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Concern player card
 */
function ConcernCard({
  report,
  onPress,
}: {
  report: OTAReport;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.concernCard}
      onPress={onPress}
      accessibilityLabel={`${report.playerName}, ${report.position}, concern`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.standoutHeader}>
        <View>
          <Text style={styles.playerName}>{report.playerName}</Text>
          <Text style={styles.playerPosition}>{report.position}</Text>
        </View>
        <View style={[styles.impressionBadge, { backgroundColor: colors.warning + '20' }]}>
          <Text style={[styles.impressionText, { color: colors.warning }]}>CONCERN</Text>
        </View>
      </View>

      {report.concerns.length > 0 && (
        <View style={styles.concernsList}>
          {report.concerns.map((concern, i) => (
            <Text key={i} style={styles.concernItem}>
              - {concern}
            </Text>
          ))}
        </View>
      )}

      <Text style={styles.coachFeedback}>"{report.coachFeedback}"</Text>
    </TouchableOpacity>
  );
}

/**
 * Attendance list item
 */
function AttendanceItem({
  report,
  onPress,
}: {
  report: OTAReport;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.attendanceItem}
      onPress={onPress}
      accessibilityLabel={`${report.playerName}, ${report.position}, ${report.attendance}`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.attendanceInfo}>
        <Text style={styles.attendanceName}>{report.playerName}</Text>
        <Text style={styles.attendancePosition}>
          {report.position} • {report.type}
        </Text>
      </View>

      <View style={styles.attendanceRight}>
        <View
          style={[
            styles.attendanceBadge,
            { backgroundColor: getAttendanceColor(report.attendance) + '20' },
          ]}
        >
          <Text
            style={[styles.attendanceBadgeText, { color: getAttendanceColor(report.attendance) }]}
          >
            {report.attendance.toUpperCase()}
          </Text>
        </View>

        <View
          style={[
            styles.impressionSmallBadge,
            { backgroundColor: getImpressionColor(report.impression) + '20' },
          ]}
        >
          <Text
            style={[styles.impressionSmallText, { color: getImpressionColor(report.impression) }]}
          >
            {report.impression}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Rookie integration card
 */
function RookieCard({
  report,
  onPress,
}: {
  report: RookieIntegrationReport;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.rookieCard}
      onPress={onPress}
      accessibilityLabel={`${report.playerName}, ${report.position}, ${report.learningCurve.replace('_', ' ')}`}
      accessibilityRole="button"
      hitSlop={accessibility.hitSlop}
    >
      <View style={styles.rookieHeader}>
        <View>
          <Text style={styles.playerName}>{report.playerName}</Text>
          <Text style={styles.playerPosition}>
            {report.position} • {report.draftRound ? `Round ${report.draftRound}` : 'UDFA'}
          </Text>
        </View>
        <View
          style={[
            styles.curveBadge,
            { backgroundColor: getLearningCurveColor(report.learningCurve) + '20' },
          ]}
        >
          <Text style={[styles.curveText, { color: getLearningCurveColor(report.learningCurve) }]}>
            {report.learningCurve.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.readinessRow}>
        <View style={styles.readinessItem}>
          <Text style={styles.readinessLabel}>Physical</Text>
          <Text style={styles.readinessValue}>{report.physicalReadiness.replace(/_/g, ' ')}</Text>
        </View>
        <View style={styles.readinessItem}>
          <Text style={styles.readinessLabel}>Mental</Text>
          <Text style={styles.readinessValue}>{report.mentalReadiness}</Text>
        </View>
      </View>

      {report.adjustmentNotes.length > 0 && (
        <View style={styles.notesList}>
          {report.adjustmentNotes.map((note, i) => (
            <Text key={i} style={styles.noteItem}>
              • {note}
            </Text>
          ))}
        </View>
      )}

      {report.veteranMentor && (
        <Text style={styles.mentorText}>Mentor: {report.veteranMentor}</Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * Position battle card
 */
function BattleCard({
  battle,
  onPlayerPress,
}: {
  battle: PositionBattlePreview;
  onPlayerPress: (playerId: string) => void;
}): React.JSX.Element {
  return (
    <View style={styles.battleCard}>
      <View style={styles.battleHeader}>
        <Text style={styles.battlePosition}>{battle.position}</Text>
        <View
          style={[
            styles.competitionBadge,
            { backgroundColor: getCompetitionColor(battle.competitionLevel) + '20' },
          ]}
        >
          <Text
            style={[
              styles.competitionText,
              { color: getCompetitionColor(battle.competitionLevel) },
            ]}
          >
            {battle.competitionLevel.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.incumbentRow}
        onPress={() => onPlayerPress(battle.incumbentId)}
        accessibilityLabel={`Incumbent: ${battle.incumbentName}`}
        accessibilityRole="button"
        hitSlop={accessibility.hitSlop}
      >
        <Text style={styles.incumbentLabel}>Incumbent:</Text>
        <Text style={styles.incumbentName}>{battle.incumbentName}</Text>
      </TouchableOpacity>

      <Text style={styles.challengersLabel}>Challengers:</Text>
      {battle.challengers.map((challenger) => (
        <TouchableOpacity
          key={challenger.playerId}
          style={styles.challengerRow}
          onPress={() => onPlayerPress(challenger.playerId)}
          accessibilityLabel={`Challenger: ${challenger.playerName}, ${challenger.earlyImpression}`}
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Text style={styles.challengerName}>{challenger.playerName}</Text>
          <View
            style={[
              styles.impressionSmallBadge,
              {
                backgroundColor:
                  challenger.earlyImpression === 'strong'
                    ? colors.success + '20'
                    : challenger.earlyImpression === 'weak'
                      ? colors.error + '20'
                      : colors.textSecondary + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.impressionSmallText,
                {
                  color:
                    challenger.earlyImpression === 'strong'
                      ? colors.success
                      : challenger.earlyImpression === 'weak'
                        ? colors.error
                        : colors.textSecondary,
                },
              ]}
            >
              {challenger.earlyImpression}
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      <Text style={styles.battleNotes}>{battle.previewNotes}</Text>
    </View>
  );
}

/**
 * OTAs Screen Component
 */
export function OTAsScreen({
  summary,
  onBack,
  onPlayerSelect,
}: OTAsScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Combine all reports for attendance view
  const allReports = useMemo(() => {
    return [...summary.standouts, ...summary.concerns].sort((a, b) =>
      a.playerName.localeCompare(b.playerName)
    );
  }, [summary]);

  const handlePlayerPress = (playerId: string) => {
    onPlayerSelect?.(playerId);
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'attendance', label: 'Attendance' },
    { key: 'rookies', label: 'Rookies' },
    { key: 'battles', label: 'Battles' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="OTAs" onBack={onBack} testID="otas-header" />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityLabel={`${tab.label}${activeTab === tab.key ? ', selected' : ''}`}
            accessibilityRole="button"
            hitSlop={accessibility.hitSlop}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <>
            <OverviewCard summary={summary} />

            {summary.standouts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Standouts</Text>
                {summary.standouts.slice(0, 5).map((report) => (
                  <StandoutCard
                    key={report.playerId}
                    report={report}
                    onPress={() => handlePlayerPress(report.playerId)}
                  />
                ))}
              </>
            )}

            {summary.concerns.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Concerns</Text>
                {summary.concerns.slice(0, 5).map((report) => (
                  <ConcernCard
                    key={report.playerId}
                    report={report}
                    onPress={() => handlePlayerPress(report.playerId)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {activeTab === 'attendance' && (
          <>
            <Text style={styles.sectionTitle}>Player Attendance</Text>
            {allReports.map((report) => (
              <AttendanceItem
                key={report.playerId}
                report={report}
                onPress={() => handlePlayerPress(report.playerId)}
              />
            ))}
          </>
        )}

        {activeTab === 'rookies' && (
          <>
            <Text style={styles.sectionTitle}>Rookie Integration</Text>
            {summary.rookieReports.length === 0 ? (
              <Text style={styles.emptyText}>No rookie reports available</Text>
            ) : (
              summary.rookieReports.map((report) => (
                <RookieCard
                  key={report.playerId}
                  report={report}
                  onPress={() => handlePlayerPress(report.playerId)}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'battles' && (
          <>
            <Text style={styles.sectionTitle}>Position Battles</Text>
            {summary.positionBattles.length === 0 ? (
              <Text style={styles.emptyText}>No position battles identified</Text>
            ) : (
              summary.positionBattles.map((battle, i) => (
                <BattleCard key={i} battle={battle} onPlayerPress={handlePlayerPress} />
              ))
            )}
          </>
        )}

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
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  standoutCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.success + '40',
  },
  concernCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  standoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  playerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  playerPosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  impressionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  impressionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  highlightsList: {
    marginBottom: spacing.sm,
  },
  highlightItem: {
    fontSize: fontSize.sm,
    color: colors.success,
    marginBottom: 2,
  },
  concernsList: {
    marginBottom: spacing.sm,
  },
  concernItem: {
    fontSize: fontSize.sm,
    color: colors.warning,
    marginBottom: 2,
  },
  coachFeedback: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  metersRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  meterContainer: {
    flex: 1,
  },
  meterLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  meterBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: 3,
  },
  meterValue: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
  },
  attendanceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attendanceInfo: {
    flex: 1,
  },
  attendanceName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  attendancePosition: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  attendanceRight: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  attendanceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  attendanceBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  impressionSmallBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  impressionSmallText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textTransform: 'capitalize',
  },
  rookieCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rookieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  curveBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  curveText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  readinessRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  readinessItem: {
    flex: 1,
  },
  readinessLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  readinessValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textTransform: 'capitalize',
  },
  notesList: {
    marginTop: spacing.xs,
  },
  noteItem: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  mentorText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  battleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  battleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  battlePosition: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  competitionBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  competitionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  incumbentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  incumbentLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
  },
  incumbentName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  challengersLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  challengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  challengerName: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  battleNotes: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default OTAsScreen;
