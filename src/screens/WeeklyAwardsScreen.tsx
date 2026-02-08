/**
 * WeeklyAwardsScreen
 *
 * Shows weekly awards, power rankings, season award races, and milestones.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  accessibility,
} from '../styles';
import {
  WeeklyAwardsState,
  WeeklyPlayerAward,
  PowerRankingEntry,
  AwardRace,
  MilestoneTracker,
} from '../core/season/WeeklyAwards';

export interface WeeklyAwardsScreenProps {
  awardsState: WeeklyAwardsState;
  awardRaces: AwardRace[];
  userTeamId: string;
  onBack: () => void;
}

type Tab = 'awards' | 'rankings' | 'races' | 'milestones';

export function WeeklyAwardsScreen({
  awardsState,
  awardRaces,
  userTeamId,
  onBack,
}: WeeklyAwardsScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('rankings');

  const recentAwards = awardsState.weeklyAwards.slice(-6).reverse();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textOnPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Awards & Rankings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['rankings', 'awards', 'races', 'milestones'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'rankings'
                ? 'Power'
                : tab === 'awards'
                  ? 'POTW'
                  : tab === 'races'
                    ? 'Awards'
                    : 'Milestones'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {activeTab === 'rankings' && (
          <PowerRankingsTab rankings={awardsState.powerRankings} userTeamId={userTeamId} />
        )}
        {activeTab === 'awards' && <WeeklyAwardsTab awards={recentAwards} />}
        {activeTab === 'races' && <AwardRacesTab races={awardRaces} userTeamId={userTeamId} />}
        {activeTab === 'milestones' && <MilestonesTab milestones={awardsState.milestones} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function PowerRankingsTab({
  rankings,
  userTeamId,
}: {
  rankings: PowerRankingEntry[];
  userTeamId: string;
}): React.JSX.Element {
  return (
    <>
      <Text style={styles.sectionTitle}>Power Rankings</Text>
      {rankings.map((entry) => (
        <View
          key={entry.teamId}
          style={[styles.rankingRow, entry.teamId === userTeamId && styles.rankingRowHighlight]}
        >
          <Text style={styles.rankNumber}>#{entry.rank}</Text>
          <View style={styles.rankInfo}>
            <Text
              style={[styles.rankTeam, entry.teamId === userTeamId && styles.rankTeamHighlight]}
            >
              {entry.abbreviation} {entry.teamName.split(' ').pop()}
            </Text>
            <Text style={styles.rankRecord}>{entry.record}</Text>
          </View>
          <View style={styles.rankChange}>
            {entry.change > 0 && <Text style={styles.rankUp}>+{entry.change}</Text>}
            {entry.change < 0 && <Text style={styles.rankDown}>{entry.change}</Text>}
            {entry.change === 0 && <Text style={styles.rankFlat}>--</Text>}
          </View>
          <Text style={styles.rankBlurb} numberOfLines={1}>
            {entry.blurb}
          </Text>
        </View>
      ))}
    </>
  );
}

function WeeklyAwardsTab({ awards }: { awards: WeeklyPlayerAward[] }): React.JSX.Element {
  if (awards.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Text style={styles.emptyText}>No awards yet. Check back after games are played.</Text>
      </View>
    );
  }

  return (
    <>
      <Text style={styles.sectionTitle}>Players of the Week</Text>
      {awards.map((award, i) => (
        <View key={i} style={styles.awardCard}>
          <View style={styles.awardHeader}>
            <Text style={styles.awardWeek}>Week {award.week}</Text>
            <View
              style={[
                styles.awardTypeBadge,
                {
                  backgroundColor:
                    award.awardType === 'offensivePlayer'
                      ? colors.success + '20'
                      : award.awardType === 'defensivePlayer'
                        ? colors.error + '20'
                        : colors.info + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.awardTypeText,
                  {
                    color:
                      award.awardType === 'offensivePlayer'
                        ? colors.success
                        : award.awardType === 'defensivePlayer'
                          ? colors.error
                          : colors.info,
                  },
                ]}
              >
                {award.awardType === 'offensivePlayer'
                  ? 'OFF'
                  : award.awardType === 'defensivePlayer'
                    ? 'DEF'
                    : 'ROY'}
              </Text>
            </View>
          </View>
          <Text style={styles.awardPlayer}>{award.playerName}</Text>
          <Text style={styles.awardDetail}>
            {award.position} - {award.teamName}
          </Text>
          <Text style={styles.awardStats}>{award.statLine}</Text>
        </View>
      ))}
    </>
  );
}

function AwardRacesTab({
  races,
  userTeamId,
}: {
  races: AwardRace[];
  userTeamId: string;
}): React.JSX.Element {
  return (
    <>
      {races.map((race) => (
        <View key={race.awardAbbr} style={styles.raceCard}>
          <Text style={styles.raceTitle}>{race.awardName}</Text>
          {race.candidates.map((candidate, i) => (
            <View
              key={candidate.playerId}
              style={[
                styles.candidateRow,
                candidate.teamId === userTeamId && styles.candidateHighlight,
              ]}
            >
              <Text style={styles.candidateRank}>#{i + 1}</Text>
              <View style={styles.candidateInfo}>
                <Text style={styles.candidateName}>{candidate.playerName}</Text>
                <Text style={styles.candidateDetail}>
                  {candidate.position} - {candidate.teamName}
                </Text>
              </View>
              <Text style={styles.candidateStat}>{candidate.keyStat}</Text>
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

function MilestonesTab({ milestones }: { milestones: MilestoneTracker[] }): React.JSX.Element {
  if (milestones.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Text style={styles.emptyText}>Milestones start tracking after week 4.</Text>
      </View>
    );
  }

  return (
    <>
      <Text style={styles.sectionTitle}>Season Milestones</Text>
      {milestones.map((m, i) => (
        <View key={i} style={styles.milestoneCard}>
          <View style={styles.milestoneHeader}>
            <Text style={styles.milestoneName}>{m.playerName}</Text>
            <Text style={styles.milestonePosition}>{m.position}</Text>
          </View>
          <Text style={styles.milestoneDesc}>{m.description}</Text>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${m.progressPct}%` }]} />
          </View>
          <Text style={styles.progressText}>{m.progressPct}% of season</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: accessibility.minTouchTarget,
  },
  backText: { color: colors.textOnPrimary, fontSize: fontSize.md },
  headerTitle: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  headerSpacer: { width: 70 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.sm, color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: fontWeight.bold },
  scrollView: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptyTab: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },

  // Power Rankings
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  rankingRowHighlight: { backgroundColor: colors.primary + '10' },
  rankNumber: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    width: 30,
  },
  rankInfo: { width: 80 },
  rankTeam: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  rankTeamHighlight: { color: colors.primary },
  rankRecord: { fontSize: fontSize.xs, color: colors.textSecondary },
  rankChange: { width: 30, alignItems: 'center' },
  rankUp: { fontSize: fontSize.xs, color: colors.success, fontWeight: fontWeight.bold },
  rankDown: { fontSize: fontSize.xs, color: colors.error, fontWeight: fontWeight.bold },
  rankFlat: { fontSize: fontSize.xs, color: colors.textSecondary },
  rankBlurb: { flex: 1, fontSize: fontSize.xs, color: colors.textSecondary },

  // Awards
  awardCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  awardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  awardWeek: { fontSize: fontSize.xs, color: colors.textSecondary },
  awardTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  awardTypeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  awardPlayer: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  awardDetail: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  awardStats: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },

  // Award Races
  raceCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  raceTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  candidateHighlight: { backgroundColor: colors.primary + '08' },
  candidateRank: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    width: 24,
  },
  candidateInfo: { flex: 1 },
  candidateName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  candidateDetail: { fontSize: fontSize.xs, color: colors.textSecondary },
  candidateStat: { fontSize: fontSize.xs, color: colors.primary },

  // Milestones
  milestoneCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  milestonePosition: { fontSize: fontSize.sm, color: colors.textSecondary },
  milestoneDesc: {
    fontSize: fontSize.sm,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  progressContainer: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
    textAlign: 'right',
  },
});

export default WeeklyAwardsScreen;
