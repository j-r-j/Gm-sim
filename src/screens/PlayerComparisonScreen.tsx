/**
 * PlayerComparisonScreen
 * Side-by-side player comparison
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
} from '../styles';
import { ScreenHeader } from '../components';

interface PlayerData {
  name: string;
  position: string;
  age: number;
  overall: number;
  skills: Record<string, number>;
  stats: Record<string, number>;
  contract?: { yearsRemaining: number; salary: number };
}

interface PlayerComparisonScreenProps {
  player1: PlayerData;
  player2: PlayerData;
  onBack: () => void;
}

function formatSalary(salary: number): string {
  if (salary >= 1_000_000) {
    return `$${(salary / 1_000_000).toFixed(1)}M`;
  }
  if (salary >= 1_000) {
    return `$${(salary / 1_000).toFixed(0)}K`;
  }
  return `$${salary}`;
}

function getComparisonColor(val1: number, val2: number, forPlayer: 1 | 2): string {
  if (val1 === val2) return colors.text;
  if (forPlayer === 1) return val1 > val2 ? colors.success : colors.textSecondary;
  return val2 > val1 ? colors.success : colors.textSecondary;
}

export function PlayerComparisonScreen({
  player1,
  player2,
  onBack,
}: PlayerComparisonScreenProps): React.JSX.Element {
  // Merge skill keys from both players
  const allSkills = Array.from(
    new Set([...Object.keys(player1.skills), ...Object.keys(player2.skills)])
  ).sort();

  // Merge stat keys from both players
  const allStats = Array.from(
    new Set([...Object.keys(player1.stats), ...Object.keys(player2.stats)])
  ).sort();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Player Comparison" onBack={onBack} testID="player-comparison-header" />

      <ScrollView style={styles.content}>
        {/* Player Names Header */}
        <View style={styles.namesHeader}>
          <View style={styles.nameColumn}>
            <Text style={styles.playerName} numberOfLines={1}>
              {player1.name}
            </Text>
            <Text style={styles.playerPosition}>{player1.position}</Text>
          </View>
          <View style={styles.vsColumn}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <View style={styles.nameColumn}>
            <Text style={styles.playerName} numberOfLines={1}>
              {player2.name}
            </Text>
            <Text style={styles.playerPosition}>{player2.position}</Text>
          </View>
        </View>

        {/* Core Attributes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>

          {/* Age */}
          <View style={styles.compRow}>
            <Text
              style={[
                styles.compValue,
                { color: getComparisonColor(player2.age, player1.age, 1) },
              ]}
            >
              {player1.age}
            </Text>
            <Text style={styles.compLabel}>Age</Text>
            <Text
              style={[
                styles.compValue,
                { color: getComparisonColor(player2.age, player1.age, 2) },
              ]}
            >
              {player2.age}
            </Text>
          </View>

          {/* Overall */}
          <View style={styles.compRow}>
            <Text
              style={[
                styles.compValue,
                { color: getComparisonColor(player1.overall, player2.overall, 1) },
              ]}
            >
              {player1.overall}
            </Text>
            <Text style={styles.compLabel}>Overall</Text>
            <Text
              style={[
                styles.compValue,
                { color: getComparisonColor(player1.overall, player2.overall, 2) },
              ]}
            >
              {player2.overall}
            </Text>
          </View>
        </View>

        {/* Skills Comparison */}
        {allSkills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            {allSkills.map((skill) => {
              const val1 = player1.skills[skill] ?? 0;
              const val2 = player2.skills[skill] ?? 0;

              return (
                <View key={skill} style={styles.skillRow}>
                  <View style={styles.skillBarContainer}>
                    <View
                      style={[
                        styles.skillBarLeft,
                        {
                          width: `${val1}%`,
                          backgroundColor:
                            val1 >= val2 ? colors.success : colors.primary + '40',
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.skillValue,
                      { color: getComparisonColor(val1, val2, 1) },
                    ]}
                  >
                    {val1}
                  </Text>
                  <Text style={styles.skillLabel} numberOfLines={1}>
                    {formatSkillName(skill)}
                  </Text>
                  <Text
                    style={[
                      styles.skillValue,
                      { color: getComparisonColor(val1, val2, 2) },
                    ]}
                  >
                    {val2}
                  </Text>
                  <View style={styles.skillBarContainer}>
                    <View
                      style={[
                        styles.skillBarRight,
                        {
                          width: `${val2}%`,
                          backgroundColor:
                            val2 >= val1 ? colors.success : colors.primary + '40',
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Stats Comparison */}
        {allStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stats</Text>
            {allStats.map((stat) => {
              const val1 = player1.stats[stat] ?? 0;
              const val2 = player2.stats[stat] ?? 0;

              return (
                <View key={stat} style={styles.compRow}>
                  <Text
                    style={[
                      styles.compValue,
                      { color: getComparisonColor(val1, val2, 1) },
                    ]}
                  >
                    {val1}
                  </Text>
                  <Text style={styles.compLabel}>{formatSkillName(stat)}</Text>
                  <Text
                    style={[
                      styles.compValue,
                      { color: getComparisonColor(val1, val2, 2) },
                    ]}
                  >
                    {val2}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Contract Comparison */}
        {(player1.contract || player2.contract) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contract</Text>
            <View style={styles.compRow}>
              <Text style={styles.compValue}>
                {player1.contract
                  ? `${player1.contract.yearsRemaining}yr`
                  : 'N/A'}
              </Text>
              <Text style={styles.compLabel}>Years Left</Text>
              <Text style={styles.compValue}>
                {player2.contract
                  ? `${player2.contract.yearsRemaining}yr`
                  : 'N/A'}
              </Text>
            </View>
            <View style={styles.compRow}>
              <Text style={styles.compValue}>
                {player1.contract ? formatSalary(player1.contract.salary) : 'N/A'}
              </Text>
              <Text style={styles.compLabel}>Salary</Text>
              <Text style={styles.compValue}>
                {player2.contract ? formatSalary(player2.contract.salary) : 'N/A'}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatSkillName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  namesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: spacing.lg,
  },
  nameColumn: {
    flex: 1,
    alignItems: 'center',
  },
  playerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  playerPosition: {
    fontSize: fontSize.sm,
    color: colors.textOnPrimary,
    opacity: 0.8,
    marginTop: spacing.xxs,
  },
  vsColumn: {
    paddingHorizontal: spacing.md,
  },
  vsText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    opacity: 0.6,
  },
  section: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  compValue: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  compLabel: {
    flex: 1.5,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  skillBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  skillBarLeft: {
    height: 8,
    borderRadius: 4,
    alignSelf: 'flex-end',
  },
  skillBarRight: {
    height: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  skillValue: {
    width: 28,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  skillLabel: {
    width: 80,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default PlayerComparisonScreen;
