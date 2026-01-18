/**
 * StandingsScreen
 * Displays league standings by division and conference
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { Team } from '../core/models/team/Team';
import { calculateStandings, StandingsEntry } from '../services/StandingsService';

/**
 * Props for StandingsScreen
 */
export interface StandingsScreenProps {
  /** All teams */
  teams: Record<string, Team>;
  /** User's team ID */
  userTeamId: string;
  /** Callback to go back */
  onBack: () => void;
}

type ViewMode = 'division' | 'conference' | 'playoff';

/**
 * Team row in standings table
 */
function StandingsRow({
  entry,
  rank,
  isUserTeam,
}: {
  entry: StandingsEntry;
  rank: number;
  isUserTeam: boolean;
}) {
  return (
    <View style={[styles.row, isUserTeam && styles.userTeamRow]}>
      <Text style={[styles.rankCell, isUserTeam && styles.userTeamText]}>{rank}</Text>
      <View style={styles.teamCell}>
        <Text style={[styles.teamAbbr, isUserTeam && styles.userTeamText]}>{entry.teamAbbr}</Text>
        <Text style={[styles.teamName, isUserTeam && styles.userTeamText]} numberOfLines={1}>
          {entry.teamName}
        </Text>
      </View>
      <Text style={[styles.cell, isUserTeam && styles.userTeamText]}>
        {entry.wins}-{entry.losses}
        {entry.ties > 0 ? `-${entry.ties}` : ''}
      </Text>
      <Text style={[styles.cell, isUserTeam && styles.userTeamText]}>
        {entry.pct.toFixed(3).slice(1)}
      </Text>
      <Text style={[styles.cell, isUserTeam && styles.userTeamText]}>{entry.pointsFor}</Text>
      <Text style={[styles.cell, isUserTeam && styles.userTeamText]}>{entry.pointsAgainst}</Text>
      <Text
        style={[
          styles.cell,
          isUserTeam && styles.userTeamText,
          entry.pointsDiff > 0 ? styles.positive : entry.pointsDiff < 0 ? styles.negative : null,
        ]}
      >
        {entry.pointsDiff > 0 ? '+' : ''}
        {entry.pointsDiff}
      </Text>
      <Text style={[styles.streakCell, isUserTeam && styles.userTeamText]}>{entry.streak}</Text>
    </View>
  );
}

/**
 * Table header
 */
function TableHeader() {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.headerRank}>#</Text>
      <Text style={styles.headerTeam}>Team</Text>
      <Text style={styles.headerCell}>W-L</Text>
      <Text style={styles.headerCell}>PCT</Text>
      <Text style={styles.headerCell}>PF</Text>
      <Text style={styles.headerCell}>PA</Text>
      <Text style={styles.headerCell}>DIFF</Text>
      <Text style={styles.headerStreak}>STR</Text>
    </View>
  );
}

/**
 * Division section
 */
function DivisionSection({
  conference,
  division,
  teams,
  userTeamId,
}: {
  conference: string;
  division: string;
  teams: StandingsEntry[];
  userTeamId: string;
}) {
  return (
    <View style={styles.divisionSection}>
      <Text style={styles.divisionHeader}>
        {conference} {division}
      </Text>
      <TableHeader />
      {teams.map((team, index) => (
        <StandingsRow
          key={team.teamId}
          entry={team}
          rank={index + 1}
          isUserTeam={team.teamId === userTeamId}
        />
      ))}
    </View>
  );
}

export function StandingsScreen({ teams, userTeamId, onBack }: StandingsScreenProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('division');

  // Calculate standings
  const standings = useMemo(() => calculateStandings(teams, userTeamId), [teams, userTeamId]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Standings</Text>
        <View style={styles.placeholder} />
      </View>

      {/* View Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'division' && styles.toggleActive]}
          onPress={() => setViewMode('division')}
        >
          <Text style={[styles.toggleText, viewMode === 'division' && styles.toggleTextActive]}>
            Division
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'conference' && styles.toggleActive]}
          onPress={() => setViewMode('conference')}
        >
          <Text style={[styles.toggleText, viewMode === 'conference' && styles.toggleTextActive]}>
            Conference
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'playoff' && styles.toggleActive]}
          onPress={() => setViewMode('playoff')}
        >
          <Text style={[styles.toggleText, viewMode === 'playoff' && styles.toggleTextActive]}>
            Playoff Picture
          </Text>
        </TouchableOpacity>
      </View>

      {/* Standings Tables */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {viewMode === 'division' ? (
          <>
            {/* AFC Divisions */}
            <Text style={styles.conferenceHeader}>AFC</Text>
            {['North', 'South', 'East', 'West'].map((div) => (
              <DivisionSection
                key={`AFC-${div}`}
                conference="AFC"
                division={div}
                teams={standings.byDivision.AFC[div] || []}
                userTeamId={userTeamId}
              />
            ))}

            {/* NFC Divisions */}
            <Text style={styles.conferenceHeader}>NFC</Text>
            {['North', 'South', 'East', 'West'].map((div) => (
              <DivisionSection
                key={`NFC-${div}`}
                conference="NFC"
                division={div}
                teams={standings.byDivision.NFC[div] || []}
                userTeamId={userTeamId}
              />
            ))}
          </>
        ) : viewMode === 'conference' ? (
          <>
            {/* AFC Conference */}
            <View style={styles.conferenceSection}>
              <Text style={styles.conferenceHeader}>AFC</Text>
              <TableHeader />
              {standings.byConference.AFC.map((team, index) => (
                <StandingsRow
                  key={team.teamId}
                  entry={team}
                  rank={index + 1}
                  isUserTeam={team.teamId === userTeamId}
                />
              ))}
            </View>

            {/* NFC Conference */}
            <View style={styles.conferenceSection}>
              <Text style={styles.conferenceHeader}>NFC</Text>
              <TableHeader />
              {standings.byConference.NFC.map((team, index) => (
                <StandingsRow
                  key={team.teamId}
                  entry={team}
                  rank={index + 1}
                  isUserTeam={team.teamId === userTeamId}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Playoff Picture - AFC */}
            <View style={styles.playoffSection}>
              <Text style={styles.conferenceHeader}>AFC Playoff Picture</Text>

              {/* Division Leaders */}
              <View style={styles.playoffGroup}>
                <Text style={styles.playoffGroupTitle}>Division Leaders (Seeds 1-4)</Text>
                {['North', 'South', 'East', 'West'].map((div) => {
                  const leader = standings.byDivision.AFC[div]?.[0];
                  if (!leader) return null;
                  return (
                    <View
                      key={`afc-${div}`}
                      style={[
                        styles.playoffRow,
                        leader.teamId === userTeamId && styles.userTeamRow,
                      ]}
                    >
                      <View style={styles.seedBadge}>
                        <Text style={styles.seedText}>
                          {['North', 'South', 'East', 'West'].indexOf(div) + 1}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.playoffTeamAbbr,
                          leader.teamId === userTeamId && styles.userTeamText,
                        ]}
                      >
                        {leader.teamAbbr}
                      </Text>
                      <Text style={styles.playoffDivision}>{div}</Text>
                      <Text
                        style={[
                          styles.playoffRecord,
                          leader.teamId === userTeamId && styles.userTeamText,
                        ]}
                      >
                        {leader.wins}-{leader.losses}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Wild Card */}
              <View style={styles.playoffGroup}>
                <Text style={styles.playoffGroupTitle}>Wild Card (Seeds 5-7)</Text>
                {standings.byConference.AFC.filter((team) => {
                  // Exclude division leaders
                  const isDivLeader = ['North', 'South', 'East', 'West'].some(
                    (div) => standings.byDivision.AFC[div]?.[0]?.teamId === team.teamId
                  );
                  return !isDivLeader;
                })
                  .slice(0, 3)
                  .map((team, index) => (
                    <View
                      key={team.teamId}
                      style={[styles.playoffRow, team.teamId === userTeamId && styles.userTeamRow]}
                    >
                      <View style={[styles.seedBadge, styles.wildcardBadge]}>
                        <Text style={styles.seedText}>{index + 5}</Text>
                      </View>
                      <Text
                        style={[
                          styles.playoffTeamAbbr,
                          team.teamId === userTeamId && styles.userTeamText,
                        ]}
                      >
                        {team.teamAbbr}
                      </Text>
                      <Text style={styles.playoffDivision}>{team.division}</Text>
                      <Text
                        style={[
                          styles.playoffRecord,
                          team.teamId === userTeamId && styles.userTeamText,
                        ]}
                      >
                        {team.wins}-{team.losses}
                      </Text>
                    </View>
                  ))}
              </View>

              {/* In The Hunt */}
              <View style={styles.playoffGroup}>
                <Text style={styles.playoffGroupTitle}>In The Hunt</Text>
                {standings.byConference.AFC.filter((team) => {
                  const isDivLeader = ['North', 'South', 'East', 'West'].some(
                    (div) => standings.byDivision.AFC[div]?.[0]?.teamId === team.teamId
                  );
                  return !isDivLeader;
                })
                  .slice(3, 6)
                  .map((team) => (
                    <View
                      key={team.teamId}
                      style={[
                        styles.playoffRow,
                        styles.huntRow,
                        team.teamId === userTeamId && styles.userTeamRow,
                      ]}
                    >
                      <Text
                        style={[
                          styles.playoffTeamAbbr,
                          styles.huntText,
                          team.teamId === userTeamId && styles.userTeamText,
                        ]}
                      >
                        {team.teamAbbr}
                      </Text>
                      <Text style={[styles.playoffDivision, styles.huntText]}>{team.division}</Text>
                      <Text
                        style={[
                          styles.playoffRecord,
                          styles.huntText,
                          team.teamId === userTeamId && styles.userTeamText,
                        ]}
                      >
                        {team.wins}-{team.losses}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>

            {/* Playoff Picture - NFC */}
            <View style={styles.playoffSection}>
              <Text style={styles.conferenceHeader}>NFC Playoff Picture</Text>

              {/* Division Leaders */}
              <View style={styles.playoffGroup}>
                <Text style={styles.playoffGroupTitle}>Division Leaders (Seeds 1-4)</Text>
                {['North', 'South', 'East', 'West'].map((div) => {
                  const leader = standings.byDivision.NFC[div]?.[0];
                  if (!leader) return null;
                  return (
                    <View
                      key={`nfc-${div}`}
                      style={[
                        styles.playoffRow,
                        leader.teamId === userTeamId && styles.userTeamRow,
                      ]}
                    >
                      <View style={styles.seedBadge}>
                        <Text style={styles.seedText}>
                          {['North', 'South', 'East', 'West'].indexOf(div) + 1}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.playoffTeamAbbr,
                          leader.teamId === userTeamId && styles.userTeamText,
                        ]}
                      >
                        {leader.teamAbbr}
                      </Text>
                      <Text style={styles.playoffDivision}>{div}</Text>
                      <Text
                        style={[
                          styles.playoffRecord,
                          leader.teamId === userTeamId && styles.userTeamText,
                        ]}
                      >
                        {leader.wins}-{leader.losses}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Wild Card */}
              <View style={styles.playoffGroup}>
                <Text style={styles.playoffGroupTitle}>Wild Card (Seeds 5-7)</Text>
                {standings.byConference.NFC.filter((team) => {
                  const isDivLeader = ['North', 'South', 'East', 'West'].some(
                    (div) => standings.byDivision.NFC[div]?.[0]?.teamId === team.teamId
                  );
                  return !isDivLeader;
                })
                  .slice(0, 3)
                  .map((team, index) => (
                    <View
                      key={team.teamId}
                      style={[styles.playoffRow, team.teamId === userTeamId && styles.userTeamRow]}
                    >
                      <View style={[styles.seedBadge, styles.wildcardBadge]}>
                        <Text style={styles.seedText}>{index + 5}</Text>
                      </View>
                      <Text
                        style={[
                          styles.playoffTeamAbbr,
                          team.teamId === userTeamId && styles.userTeamText,
                        ]}
                      >
                        {team.teamAbbr}
                      </Text>
                      <Text style={styles.playoffDivision}>{team.division}</Text>
                      <Text
                        style={[
                          styles.playoffRecord,
                          team.teamId === userTeamId && styles.userTeamText,
                        ]}
                      >
                        {team.wins}-{team.losses}
                      </Text>
                    </View>
                  ))}
              </View>

              {/* In The Hunt */}
              <View style={styles.playoffGroup}>
                <Text style={styles.playoffGroupTitle}>In The Hunt</Text>
                {standings.byConference.NFC.filter((team) => {
                  const isDivLeader = ['North', 'South', 'East', 'West'].some(
                    (div) => standings.byDivision.NFC[div]?.[0]?.teamId === team.teamId
                  );
                  return !isDivLeader;
                })
                  .slice(3, 6)
                  .map((team) => (
                    <View
                      key={team.teamId}
                      style={[
                        styles.playoffRow,
                        styles.huntRow,
                        team.teamId === userTeamId && styles.userTeamRow,
                      ]}
                    >
                      <Text
                        style={[
                          styles.playoffTeamAbbr,
                          styles.huntText,
                          team.teamId === userTeamId && styles.userTeamText,
                        ]}
                      >
                        {team.teamAbbr}
                      </Text>
                      <Text style={[styles.playoffDivision, styles.huntText]}>{team.division}</Text>
                      <Text
                        style={[
                          styles.playoffRecord,
                          styles.huntText,
                          team.teamId === userTeamId && styles.userTeamText,
                        ]}
                      >
                        {team.wins}-{team.losses}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
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
  toggleContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.background,
  },
  content: {
    flex: 1,
  },
  conferenceHeader: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  conferenceSection: {
    marginBottom: spacing.lg,
  },
  divisionSection: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  divisionHeader: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRank: {
    width: 24,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  headerTeam: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  headerCell: {
    width: 40,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  headerStreak: {
    width: 32,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  userTeamRow: {
    backgroundColor: colors.primaryLight,
  },
  userTeamText: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  rankCell: {
    width: 24,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  teamCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamAbbr: {
    width: 36,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  teamName: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  cell: {
    width: 40,
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'center',
  },
  streakCell: {
    width: 32,
    fontSize: fontSize.sm,
    color: colors.text,
    textAlign: 'center',
  },
  positive: {
    color: colors.success,
  },
  negative: {
    color: colors.error,
  },
  bottomPadding: {
    height: spacing.xl,
  },
  // Playoff picture styles
  playoffSection: {
    marginBottom: spacing.lg,
  },
  playoffGroup: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  playoffGroupTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  playoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  huntRow: {
    opacity: 0.7,
  },
  seedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  wildcardBadge: {
    backgroundColor: colors.warning,
  },
  seedText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  playoffTeamAbbr: {
    width: 50,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  playoffDivision: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  playoffRecord: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    minWidth: 50,
    textAlign: 'right',
  },
  huntText: {
    color: colors.textSecondary,
  },
});

export default StandingsScreen;
