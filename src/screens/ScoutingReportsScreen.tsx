/**
 * ScoutingReportsScreen
 * Displays scout reports for draft prospects
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { GameState } from '../core/models/game/GameState';
import {
  ScoutReport,
  DisplayReport,
  formatReportForDisplay,
} from '../core/scouting/ScoutReportGenerator';

/**
 * Props for ScoutingReportsScreen
 */
export interface ScoutingReportsScreenProps {
  gameState: GameState;
  reports: ScoutReport[];
  onBack: () => void;
  onProspectSelect?: (prospectId: string) => void;
  onRequestFocusScouting?: (prospectId: string) => void;
}

type TabType = 'all' | 'focus' | 'auto' | 'needs_scouting';

/**
 * Get color for confidence level
 */
function getConfidenceColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'high':
      return colors.success;
    case 'medium':
      return colors.warning;
    case 'low':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

/**
 * Report summary card
 */
function ReportSummaryCard({
  report,
  displayReport,
  onPress,
  onRequestFocus,
}: {
  report: ScoutReport;
  displayReport: DisplayReport;
  onPress: () => void;
  onRequestFocus?: () => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <View
      style={[
        styles.reportCard,
        report.reportType === 'focus' ? { borderColor: colors.primary + '40' } : {},
      ]}
    >
      <TouchableOpacity style={styles.reportHeader} onPress={() => setExpanded(!expanded)}>
        <View style={styles.reportTitleSection}>
          <Text style={styles.prospectName}>{displayReport.header.playerName}</Text>
          <Text style={styles.prospectDetails}>
            {displayReport.header.position} • {displayReport.header.college}
          </Text>
        </View>

        <View style={styles.reportBadges}>
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor:
                  report.reportType === 'focus'
                    ? colors.primary + '20'
                    : colors.textSecondary + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.typeText,
                { color: report.reportType === 'focus' ? colors.primary : colors.textSecondary },
              ]}
            >
              {report.reportType === 'focus' ? 'FOCUS' : 'AUTO'}
            </Text>
          </View>
          <View
            style={[
              styles.confidenceBadge,
              { backgroundColor: getConfidenceColor(report.confidence.level) + '20' },
            ]}
          >
            <Text
              style={[
                styles.confidenceText,
                { color: getConfidenceColor(report.confidence.level) },
              ]}
            >
              {report.confidence.level.toUpperCase()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.reportPreview}>
        <View style={styles.projectionRow}>
          <View style={styles.projectionItem}>
            <Text style={styles.projectionLabel}>Projected</Text>
            <Text style={styles.projectionValue}>{displayReport.projection.round}</Text>
          </View>
          <View style={styles.projectionItem}>
            <Text style={styles.projectionLabel}>Grade</Text>
            <Text style={styles.projectionValue}>{displayReport.projection.grade}</Text>
          </View>
          <View style={styles.projectionItem}>
            <Text style={styles.projectionLabel}>Overall</Text>
            <Text style={styles.projectionValue}>{displayReport.skills.overall}</Text>
          </View>
        </View>
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillsGrid}>
            <View style={styles.skillItem}>
              <Text style={styles.skillLabel}>Physical</Text>
              <Text style={styles.skillValue}>{displayReport.skills.physical}</Text>
            </View>
            <View style={styles.skillItem}>
              <Text style={styles.skillLabel}>Technical</Text>
              <Text style={styles.skillValue}>{displayReport.skills.technical}</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Traits</Text>
          {displayReport.traits.visible.length > 0 ? (
            <View style={styles.traitsList}>
              {displayReport.traits.visible.slice(0, 5).map((trait, i) => (
                <Text key={i} style={styles.traitText}>
                  • {trait}
                </Text>
              ))}
              {displayReport.traits.hiddenCount > 0 && (
                <Text style={styles.hiddenTraitsText}>{displayReport.traits.message}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.noTraitsText}>No traits revealed yet</Text>
          )}

          {displayReport.detailedAnalysis && (
            <>
              {displayReport.detailedAnalysis.character && (
                <>
                  <Text style={styles.sectionTitle}>Character Assessment</Text>
                  {displayReport.detailedAnalysis.character.slice(0, 4).map((item, i) => (
                    <Text key={i} style={styles.analysisText}>
                      {item}
                    </Text>
                  ))}
                </>
              )}

              {displayReport.detailedAnalysis.schemeFit && (
                <>
                  <Text style={styles.sectionTitle}>Scheme Fit</Text>
                  {displayReport.detailedAnalysis.schemeFit.map((item, i) => (
                    <Text key={i} style={styles.analysisText}>
                      {item}
                    </Text>
                  ))}
                </>
              )}

              {displayReport.detailedAnalysis.ceilingFloor && (
                <Text style={styles.ceilingFloorText}>
                  {displayReport.detailedAnalysis.ceilingFloor}
                </Text>
              )}
            </>
          )}

          <View style={styles.divider} />

          <Text style={styles.recommendationTitle}>Recommendation</Text>
          <Text style={styles.recommendationText}>{displayReport.recommendation}</Text>

          <View style={styles.metaInfo}>
            <Text style={styles.metaText}>Scout: {displayReport.header.scoutName}</Text>
            <Text style={styles.metaText}>Date: {displayReport.header.dateGenerated}</Text>
            <Text style={styles.metaText}>Hours: {report.scoutingHours}</Text>
          </View>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.viewButton} onPress={onPress}>
          <Text style={styles.viewButtonText}>View Prospect</Text>
        </TouchableOpacity>

        {report.needsMoreScouting && onRequestFocus && (
          <TouchableOpacity style={styles.focusButton} onPress={onRequestFocus}>
            <Text style={styles.focusButtonText}>Request Focus</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.expandButton} onPress={() => setExpanded(!expanded)}>
          <Text style={styles.expandButtonText}>{expanded ? 'Less' : 'More'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * Scouting Reports Screen Component
 */
export function ScoutingReportsScreen({
  reports,
  onBack,
  onProspectSelect,
  onRequestFocusScouting,
}: ScoutingReportsScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const handleProspectPress = (prospectId: string) => {
    onProspectSelect?.(prospectId);
  };

  // Filter reports based on tab
  const filteredReports = reports.filter((report) => {
    switch (activeTab) {
      case 'focus':
        return report.reportType === 'focus';
      case 'auto':
        return report.reportType === 'auto';
      case 'needs_scouting':
        return report.needsMoreScouting;
      default:
        return true;
    }
  });

  // Sort by projected round
  const sortedReports = [...filteredReports].sort(
    (a, b) => a.draftProjection.roundMin - b.draftProjection.roundMin
  );

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: reports.length },
    { key: 'focus', label: 'Focus', count: reports.filter((r) => r.reportType === 'focus').length },
    { key: 'auto', label: 'Auto', count: reports.filter((r) => r.reportType === 'auto').length },
    {
      key: 'needs_scouting',
      label: 'Needs Work',
      count: reports.filter((r) => r.needsMoreScouting).length,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scout Reports</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label} ({tab.count})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sortedReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Reports Available</Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'all'
                ? 'Scout reports will appear here as your scouts evaluate prospects'
                : `No ${activeTab === 'focus' ? 'focus' : activeTab === 'auto' ? 'auto' : 'pending'} reports available`}
            </Text>
          </View>
        ) : (
          <>
            {sortedReports.map((report) => {
              const displayReport = formatReportForDisplay(report);
              return (
                <ReportSummaryCard
                  key={report.id}
                  report={report}
                  displayReport={displayReport}
                  onPress={() => handleProspectPress(report.prospectId)}
                  onRequestFocus={
                    onRequestFocusScouting
                      ? () => onRequestFocusScouting(report.prospectId)
                      : undefined
                  }
                />
              );
            })}
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
    fontSize: fontSize.xs,
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
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reportTitleSection: {
    flex: 1,
  },
  prospectName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  prospectDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  reportBadges: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  confidenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  confidenceText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  reportPreview: {
    marginTop: spacing.sm,
  },
  projectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  projectionItem: {
    alignItems: 'center',
  },
  projectionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  projectionValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  expandedContent: {
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  skillsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skillItem: {
    flex: 1,
  },
  skillLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  skillValue: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  traitsList: {
    marginLeft: spacing.sm,
  },
  traitText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: 2,
  },
  hiddenTraitsText: {
    fontSize: fontSize.sm,
    color: colors.warning,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  noTraitsText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  analysisText: {
    fontSize: fontSize.sm,
    color: colors.text,
    marginBottom: 2,
  },
  ceilingFloorText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
  recommendationTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  recommendationText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontStyle: 'italic',
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  viewButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.sm,
  },
  viewButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  focusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.sm,
  },
  focusButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  expandButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.textSecondary + '20',
    borderRadius: borderRadius.sm,
  },
  expandButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default ScoutingReportsScreen;
