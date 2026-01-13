/**
 * CollegeStatsDisplay Component
 * Displays position-specific college statistics for prospects.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../../styles';
import {
  CollegeStats,
  PositionCollegeStats,
  QBCollegeStats,
  RBCollegeStats,
  WRCollegeStats,
  TECollegeStats,
  OLCollegeStats,
  DLCollegeStats,
  LBCollegeStats,
  DBCollegeStats,
  KPCollegeStats,
  CollegeAward,
} from '../../core/draft/Prospect';

export interface CollegeStatsDisplayProps {
  /** College stats object */
  collegeStats: CollegeStats;
  /** Whether to show compact version */
  compact?: boolean;
}

/**
 * Single stat row
 */
function StatRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  );
}

/**
 * QB Stats Section
 */
function QBStats({ stats }: { stats: QBCollegeStats }): React.JSX.Element {
  const completionPct =
    stats.passAttempts > 0
      ? ((stats.passCompletions / stats.passAttempts) * 100).toFixed(1)
      : '0.0';
  const yardsPerAttempt =
    stats.passAttempts > 0 ? (stats.passYards / stats.passAttempts).toFixed(1) : '0.0';
  const tdIntRatio =
    stats.interceptions > 0 ? (stats.passTouchdowns / stats.interceptions).toFixed(2) : 'N/A';

  return (
    <View style={styles.statsSection}>
      <Text style={styles.statsSectionTitle}>Passing</Text>
      <StatRow label="Completions/Attempts" value={`${stats.passCompletions}/${stats.passAttempts}`} />
      <StatRow label="Completion %" value={`${completionPct}%`} highlight={parseFloat(completionPct) >= 65} />
      <StatRow label="Passing Yards" value={stats.passYards.toLocaleString()} />
      <StatRow label="Yards/Attempt" value={yardsPerAttempt} />
      <StatRow label="Passing TDs" value={stats.passTouchdowns} highlight={stats.passTouchdowns >= 30} />
      <StatRow label="Interceptions" value={stats.interceptions} />
      <StatRow label="TD:INT Ratio" value={tdIntRatio} />
      <StatRow label="Sacks Taken" value={stats.sacksTaken} />

      <Text style={[styles.statsSectionTitle, { marginTop: spacing.md }]}>Rushing</Text>
      <StatRow label="Rush Attempts" value={stats.rushAttempts} />
      <StatRow label="Rush Yards" value={stats.rushYards} />
      <StatRow label="Rush TDs" value={stats.rushTouchdowns} />
    </View>
  );
}

/**
 * RB Stats Section
 */
function RBStats({ stats }: { stats: RBCollegeStats }): React.JSX.Element {
  const yardsPerCarry =
    stats.rushAttempts > 0 ? (stats.rushYards / stats.rushAttempts).toFixed(1) : '0.0';
  const yardsPerReception =
    stats.receptions > 0 ? (stats.receivingYards / stats.receptions).toFixed(1) : '0.0';

  return (
    <View style={styles.statsSection}>
      <Text style={styles.statsSectionTitle}>Rushing</Text>
      <StatRow label="Rush Attempts" value={stats.rushAttempts} />
      <StatRow label="Rush Yards" value={stats.rushYards.toLocaleString()} highlight={stats.rushYards >= 1000} />
      <StatRow label="Yards/Carry" value={yardsPerCarry} highlight={parseFloat(yardsPerCarry) >= 5.0} />
      <StatRow label="Rush TDs" value={stats.rushTouchdowns} highlight={stats.rushTouchdowns >= 10} />

      <Text style={[styles.statsSectionTitle, { marginTop: spacing.md }]}>Receiving</Text>
      <StatRow label="Receptions" value={stats.receptions} />
      <StatRow label="Receiving Yards" value={stats.receivingYards} />
      <StatRow label="Yards/Reception" value={yardsPerReception} />
      <StatRow label="Receiving TDs" value={stats.receivingTouchdowns} />

      <Text style={[styles.statsSectionTitle, { marginTop: spacing.md }]}>Ball Security</Text>
      <StatRow label="Fumbles" value={stats.fumbles} />
    </View>
  );
}

/**
 * WR Stats Section
 */
function WRStats({ stats }: { stats: WRCollegeStats }): React.JSX.Element {
  const yardsPerReception =
    stats.receptions > 0 ? (stats.receivingYards / stats.receptions).toFixed(1) : '0.0';
  const catchRate =
    stats.receptions > 0 && stats.drops >= 0
      ? ((stats.receptions / (stats.receptions + stats.drops)) * 100).toFixed(1)
      : '100.0';

  return (
    <View style={styles.statsSection}>
      <Text style={styles.statsSectionTitle}>Receiving</Text>
      <StatRow label="Receptions" value={stats.receptions} highlight={stats.receptions >= 50} />
      <StatRow label="Receiving Yards" value={stats.receivingYards.toLocaleString()} highlight={stats.receivingYards >= 1000} />
      <StatRow label="Yards/Reception" value={yardsPerReception} highlight={parseFloat(yardsPerReception) >= 15} />
      <StatRow label="Receiving TDs" value={stats.receivingTouchdowns} highlight={stats.receivingTouchdowns >= 8} />
      <StatRow label="Drops" value={stats.drops} />
      <StatRow label="Catch Rate" value={`${catchRate}%`} />

      <Text style={[styles.statsSectionTitle, { marginTop: spacing.md }]}>Rushing</Text>
      <StatRow label="Rush Attempts" value={stats.rushAttempts} />
      <StatRow label="Rush Yards" value={stats.rushYards} />
    </View>
  );
}

/**
 * TE Stats Section
 */
function TEStats({ stats }: { stats: TECollegeStats }): React.JSX.Element {
  const yardsPerReception =
    stats.receptions > 0 ? (stats.receivingYards / stats.receptions).toFixed(1) : '0.0';

  return (
    <View style={styles.statsSection}>
      <Text style={styles.statsSectionTitle}>Receiving</Text>
      <StatRow label="Receptions" value={stats.receptions} />
      <StatRow label="Receiving Yards" value={stats.receivingYards} />
      <StatRow label="Yards/Reception" value={yardsPerReception} />
      <StatRow label="Receiving TDs" value={stats.receivingTouchdowns} />

      <Text style={[styles.statsSectionTitle, { marginTop: spacing.md }]}>Blocking</Text>
      <StatRow label="Blocks Graded" value={stats.blocksGraded} />
      <StatRow label="Blocking Grade" value={stats.blockingGrade.toFixed(1)} highlight={stats.blockingGrade >= 80} />
    </View>
  );
}

/**
 * OL Stats Section
 */
function OLStats({ stats }: { stats: OLCollegeStats }): React.JSX.Element {
  const positions = Object.entries(stats.gamesAtPosition)
    .filter(([_, games]) => games > 0)
    .map(([pos, games]) => `${pos}: ${games}`)
    .join(', ');

  return (
    <View style={styles.statsSection}>
      <Text style={styles.statsSectionTitle}>Experience</Text>
      <StatRow label="Games by Position" value={positions || 'N/A'} />

      <Text style={[styles.statsSectionTitle, { marginTop: spacing.md }]}>Performance</Text>
      <StatRow label="Sacks Allowed" value={stats.sacksAllowed} />
      <StatRow label="Penalties" value={stats.penaltiesCommitted} />
      <StatRow label="Pass Block Grade" value={stats.passBlockGrade.toFixed(1)} highlight={stats.passBlockGrade >= 80} />
      <StatRow label="Run Block Grade" value={stats.runBlockGrade.toFixed(1)} highlight={stats.runBlockGrade >= 80} />
    </View>
  );
}

/**
 * DL Stats Section
 */
function DLStats({ stats }: { stats: DLCollegeStats }): React.JSX.Element {
  return (
    <View style={styles.statsSection}>
      <Text style={styles.statsSectionTitle}>Defense</Text>
      <StatRow label="Total Tackles" value={stats.totalTackles} />
      <StatRow label="Tackles for Loss" value={stats.tacklesForLoss} highlight={stats.tacklesForLoss >= 10} />
      <StatRow label="Sacks" value={stats.sacks} highlight={stats.sacks >= 8} />
      <StatRow label="Forced Fumbles" value={stats.forcedFumbles} />
      <StatRow label="Passes Defended" value={stats.passesDefended} />
    </View>
  );
}

/**
 * LB Stats Section
 */
function LBStats({ stats }: { stats: LBCollegeStats }): React.JSX.Element {
  return (
    <View style={styles.statsSection}>
      <Text style={styles.statsSectionTitle}>Defense</Text>
      <StatRow label="Total Tackles" value={stats.totalTackles} highlight={stats.totalTackles >= 80} />
      <StatRow label="Tackles for Loss" value={stats.tacklesForLoss} highlight={stats.tacklesForLoss >= 10} />
      <StatRow label="Sacks" value={stats.sacks} />
      <StatRow label="Interceptions" value={stats.interceptions} />
      <StatRow label="Passes Defended" value={stats.passesDefended} />
      <StatRow label="Forced Fumbles" value={stats.forcedFumbles} />
    </View>
  );
}

/**
 * DB Stats Section
 */
function DBStats({ stats }: { stats: DBCollegeStats }): React.JSX.Element {
  return (
    <View style={styles.statsSection}>
      <Text style={styles.statsSectionTitle}>Defense</Text>
      <StatRow label="Total Tackles" value={stats.totalTackles} />
      <StatRow label="Interceptions" value={stats.interceptions} highlight={stats.interceptions >= 4} />
      <StatRow label="Passes Defended" value={stats.passesDefended} highlight={stats.passesDefended >= 10} />
      <StatRow label="Forced Fumbles" value={stats.forcedFumbles} />
      <StatRow label="Touchdowns" value={stats.touchdowns} />
    </View>
  );
}

/**
 * K/P Stats Section
 */
function KPStats({ stats }: { stats: KPCollegeStats }): React.JSX.Element {
  const fgPct =
    stats.fieldGoalAttempts > 0
      ? ((stats.fieldGoalsMade / stats.fieldGoalAttempts) * 100).toFixed(1)
      : '0.0';
  const xpPct =
    stats.extraPointAttempts > 0
      ? ((stats.extraPointsMade / stats.extraPointAttempts) * 100).toFixed(1)
      : '0.0';

  return (
    <View style={styles.statsSection}>
      <Text style={styles.statsSectionTitle}>Field Goals</Text>
      <StatRow label="FG Made/Attempted" value={`${stats.fieldGoalsMade}/${stats.fieldGoalAttempts}`} />
      <StatRow label="FG %" value={`${fgPct}%`} highlight={parseFloat(fgPct) >= 80} />
      <StatRow label="Long FG" value={`${stats.longFieldGoal} yds`} highlight={stats.longFieldGoal >= 50} />

      <Text style={[styles.statsSectionTitle, { marginTop: spacing.md }]}>Extra Points</Text>
      <StatRow label="XP Made/Attempted" value={`${stats.extraPointsMade}/${stats.extraPointAttempts}`} />
      <StatRow label="XP %" value={`${xpPct}%`} />

      <Text style={[styles.statsSectionTitle, { marginTop: spacing.md }]}>Punting</Text>
      <StatRow label="Punts" value={stats.punts} />
      <StatRow label="Punt Yards" value={stats.puntYards} />
      <StatRow label="Punt Average" value={`${stats.puntAverage.toFixed(1)} yds`} highlight={stats.puntAverage >= 45} />
      <StatRow label="Touchbacks" value={stats.touchbacks} />
    </View>
  );
}

/**
 * Render position-specific stats
 */
function PositionStats({ positionStats }: { positionStats: PositionCollegeStats }): React.JSX.Element {
  switch (positionStats.type) {
    case 'QB':
      return <QBStats stats={positionStats as QBCollegeStats} />;
    case 'RB':
      return <RBStats stats={positionStats as RBCollegeStats} />;
    case 'WR':
      return <WRStats stats={positionStats as WRCollegeStats} />;
    case 'TE':
      return <TEStats stats={positionStats as TECollegeStats} />;
    case 'OL':
      return <OLStats stats={positionStats as OLCollegeStats} />;
    case 'DL':
      return <DLStats stats={positionStats as DLCollegeStats} />;
    case 'LB':
      return <LBStats stats={positionStats as LBCollegeStats} />;
    case 'DB':
      return <DBStats stats={positionStats as DBCollegeStats} />;
    case 'KP':
      return <KPStats stats={positionStats as KPCollegeStats} />;
  }
}

/**
 * Award badge
 */
function AwardBadge({ award }: { award: CollegeAward }): React.JSX.Element {
  const prestigeColor =
    award.prestige === 'national'
      ? colors.secondary
      : award.prestige === 'conference'
      ? colors.primary
      : colors.info;

  return (
    <View style={[styles.awardBadge, { backgroundColor: `${prestigeColor}20`, borderColor: prestigeColor }]}>
      <Text style={[styles.awardName, { color: prestigeColor }]}>{award.name}</Text>
      <Text style={styles.awardYear}>{award.year}</Text>
    </View>
  );
}

/**
 * CollegeStatsDisplay Component
 */
export function CollegeStatsDisplay({
  collegeStats,
  compact: _compact = false,
}: CollegeStatsDisplayProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {/* Career summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{collegeStats.seasonsPlayed}</Text>
          <Text style={styles.summaryLabel}>Seasons</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{collegeStats.gamesStarted}</Text>
          <Text style={styles.summaryLabel}>Starts</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{collegeStats.gamesPlayed}</Text>
          <Text style={styles.summaryLabel}>Games</Text>
        </View>
      </View>

      {/* Awards section */}
      {collegeStats.awards.length > 0 && (
        <View style={styles.awardsSection}>
          <Text style={styles.sectionTitle}>Awards & Honors</Text>
          <View style={styles.awardsList}>
            {collegeStats.awards.map((award, index) => (
              <AwardBadge key={`${award.name}-${award.year}-${index}`} award={award} />
            ))}
          </View>
        </View>
      )}

      {/* Position-specific stats */}
      <View style={styles.statsContainer}>
        <PositionStats positionStats={collegeStats.positionStats} />
      </View>

      {/* Injury history */}
      {collegeStats.injuryHistory.length > 0 && (
        <View style={styles.injurySection}>
          <Text style={styles.sectionTitle}>Injury History</Text>
          {collegeStats.injuryHistory.map((injury, index) => (
            <View key={`injury-${index}`} style={styles.injuryRow}>
              <Text style={styles.injuryType}>{injury.type}</Text>
              <Text style={styles.injuryDetails}>
                {injury.year} - {injury.gamesMissed} games missed
                {injury.surgeryRequired && ' (surgery)'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  awardsSection: {
    marginBottom: spacing.md,
  },
  awardsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  awardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.xs,
  },
  awardName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  awardYear: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  statsContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statsSection: {},
  statsSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  statValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  statValueHighlight: {
    color: colors.success,
  },
  injurySection: {
    backgroundColor: `${colors.warning}10`,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  injuryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  injuryType: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.warning,
  },
  injuryDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});

export default CollegeStatsDisplay;
