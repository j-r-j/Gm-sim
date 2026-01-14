/**
 * CombineProDayScreen
 * Displays combine and pro day results for draft prospects
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { GameState } from '../core/models/game/GameState';
import { Prospect } from '../core/draft/Prospect';
import {
  CombineResults,
  CombineGrade,
  MedicalGrade,
  OfficialMeasurements,
  CombineWorkoutResults,
  MedicalEvaluation,
  CombineSummary,
} from '../core/draft/CombineSimulator';
import {
  ProDayResults,
  ProDayType,
  PositionWorkoutResults,
  ProDaySummary,
} from '../core/draft/ProDaySimulator';

/**
 * Props for CombineProDayScreen
 */
export interface CombineProDayScreenProps {
  gameState: GameState;
  prospects: Prospect[];
  combineResults: Map<string, CombineResults>;
  proDayResults: Map<string, ProDayResults>;
  combineSummary?: CombineSummary;
  proDaySummary?: ProDaySummary;
  onBack: () => void;
  onProspectSelect?: (prospectId: string) => void;
}

/**
 * Gets color for combine grade
 */
function getCombineGradeColor(grade: CombineGrade): string {
  switch (grade) {
    case CombineGrade.EXCEPTIONAL:
      return '#FFD700';
    case CombineGrade.ABOVE_AVERAGE:
      return colors.success;
    case CombineGrade.AVERAGE:
      return colors.primary;
    case CombineGrade.BELOW_AVERAGE:
      return colors.warning;
    case CombineGrade.POOR:
      return colors.error;
    case CombineGrade.DID_NOT_PARTICIPATE:
      return colors.textSecondary;
  }
}

/**
 * Gets display text for combine grade
 */
function getCombineGradeText(grade: CombineGrade): string {
  switch (grade) {
    case CombineGrade.EXCEPTIONAL:
      return 'Exceptional';
    case CombineGrade.ABOVE_AVERAGE:
      return 'Above Average';
    case CombineGrade.AVERAGE:
      return 'Average';
    case CombineGrade.BELOW_AVERAGE:
      return 'Below Average';
    case CombineGrade.POOR:
      return 'Poor';
    case CombineGrade.DID_NOT_PARTICIPATE:
      return 'Did Not Participate';
  }
}

/**
 * Gets color for medical grade
 */
function getMedicalGradeColor(grade: MedicalGrade): string {
  switch (grade) {
    case MedicalGrade.CLEAN:
      return colors.success;
    case MedicalGrade.MINOR_CONCERNS:
      return colors.primary;
    case MedicalGrade.MODERATE_CONCERNS:
      return colors.warning;
    case MedicalGrade.SIGNIFICANT_CONCERNS:
      return colors.error;
    case MedicalGrade.FAILED:
      return '#8B0000';
  }
}

/**
 * Gets display text for pro day type
 */
function getProDayTypeText(type: ProDayType): string {
  switch (type) {
    case ProDayType.FULL_WORKOUT:
      return 'Full Workout';
    case ProDayType.POSITION_WORKOUT:
      return 'Position Workout';
    case ProDayType.INDIVIDUAL_WORKOUT:
      return 'Individual Workout';
    case ProDayType.MEDICAL_ONLY:
      return 'Medical Only';
  }
}

/**
 * Formats 40-yard dash time
 */
function formatForty(time: number | null): string {
  if (time === null) return '-';
  return time.toFixed(2) + 's';
}

/**
 * Formats bench press reps
 */
function formatBench(reps: number | null): string {
  if (reps === null) return '-';
  return reps.toString();
}

/**
 * Formats jump measurement
 */
function formatJump(inches: number | null): string {
  if (inches === null) return '-';
  return inches.toFixed(1) + '"';
}

/**
 * Measurements Card Component
 */
function MeasurementsCard({
  measurements,
}: {
  measurements: OfficialMeasurements;
}): React.JSX.Element {
  const heightFeet = Math.floor(measurements.height / 12);
  const heightInches = measurements.height % 12;

  return (
    <View style={styles.measurementsCard}>
      <Text style={styles.cardTitle}>Official Measurements</Text>
      <View style={styles.measurementsGrid}>
        <View style={styles.measurementItem}>
          <Text style={styles.measurementValue}>
            {heightFeet}'{heightInches}"
          </Text>
          <Text style={styles.measurementLabel}>Height</Text>
        </View>
        <View style={styles.measurementItem}>
          <Text style={styles.measurementValue}>{measurements.weight} lbs</Text>
          <Text style={styles.measurementLabel}>Weight</Text>
        </View>
        <View style={styles.measurementItem}>
          <Text style={styles.measurementValue}>{measurements.armLength}"</Text>
          <Text style={styles.measurementLabel}>Arm Length</Text>
        </View>
        <View style={styles.measurementItem}>
          <Text style={styles.measurementValue}>{measurements.handSize}"</Text>
          <Text style={styles.measurementLabel}>Hand Size</Text>
        </View>
        <View style={styles.measurementItem}>
          <Text style={styles.measurementValue}>{measurements.wingspan}"</Text>
          <Text style={styles.measurementLabel}>Wingspan</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Workout Results Card Component
 */
function WorkoutResultsCard({ results }: { results: CombineWorkoutResults }): React.JSX.Element {
  return (
    <View style={styles.workoutCard}>
      <Text style={styles.cardTitle}>Athletic Testing</Text>
      <View style={styles.workoutGrid}>
        <View style={styles.workoutRow}>
          <Text style={styles.workoutLabel}>40-Yard Dash</Text>
          <Text style={styles.workoutValue}>{formatForty(results.fortyYardDash)}</Text>
        </View>
        <View style={styles.workoutRow}>
          <Text style={styles.workoutLabel}>Bench Press (225)</Text>
          <Text style={styles.workoutValue}>{formatBench(results.benchPress)} reps</Text>
        </View>
        <View style={styles.workoutRow}>
          <Text style={styles.workoutLabel}>Vertical Jump</Text>
          <Text style={styles.workoutValue}>{formatJump(results.verticalJump)}</Text>
        </View>
        <View style={styles.workoutRow}>
          <Text style={styles.workoutLabel}>Broad Jump</Text>
          <Text style={styles.workoutValue}>{formatJump(results.broadJump)}</Text>
        </View>
        <View style={styles.workoutRow}>
          <Text style={styles.workoutLabel}>20-Yard Shuttle</Text>
          <Text style={styles.workoutValue}>{formatForty(results.twentyYardShuttle)}</Text>
        </View>
        <View style={styles.workoutRow}>
          <Text style={styles.workoutLabel}>3-Cone Drill</Text>
          <Text style={styles.workoutValue}>{formatForty(results.threeConeDrill)}</Text>
        </View>
        {results.sixtyYardShuttle && (
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>60-Yard Shuttle</Text>
            <Text style={styles.workoutValue}>{formatForty(results.sixtyYardShuttle)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Medical Evaluation Card Component
 */
function MedicalCard({ medical }: { medical: MedicalEvaluation }): React.JSX.Element {
  return (
    <View style={styles.medicalCard}>
      <Text style={styles.cardTitle}>Medical Evaluation</Text>
      <View style={styles.medicalHeader}>
        <View
          style={[
            styles.medicalBadge,
            { backgroundColor: getMedicalGradeColor(medical.grade) + '20' },
          ]}
        >
          <Text style={[styles.medicalGrade, { color: getMedicalGradeColor(medical.grade) }]}>
            {medical.grade.replace('_', ' ')}
          </Text>
        </View>
        <Text style={styles.durabilityRating}>Durability: {medical.durabilityRating}/100</Text>
      </View>

      {medical.concerns.length > 0 && (
        <View style={styles.medicalConcerns}>
          <Text style={styles.concernsTitle}>Concerns:</Text>
          {medical.concerns.map((concern, i) => (
            <View key={i} style={styles.concernItem}>
              <Text style={styles.concernArea}>{concern.area}</Text>
              <Text style={styles.concernSeverity}>
                Severity: {concern.severity}/10 {concern.chronic ? '(Chronic)' : ''}
              </Text>
              {concern.followUp && <Text style={styles.concernFollowUp}>{concern.followUp}</Text>}
            </View>
          ))}
        </View>
      )}

      {medical.flaggedConditions.length > 0 && (
        <View style={styles.flaggedConditions}>
          <Text style={styles.flaggedTitle}>Flagged:</Text>
          {medical.flaggedConditions.map((condition, i) => (
            <Text key={i} style={styles.flaggedItem}>
              {condition}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * Position Workout Card Component
 */
function PositionWorkoutCard({
  workouts,
}: {
  workouts: PositionWorkoutResults;
}): React.JSX.Element {
  return (
    <View style={styles.positionCard}>
      <Text style={styles.cardTitle}>Position Drills</Text>

      {workouts.throwingAccuracy && (
        <View style={styles.positionSection}>
          <Text style={styles.positionSectionTitle}>Throwing Accuracy</Text>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Short Passes</Text>
            <Text style={styles.workoutValue}>
              {workouts.throwingAccuracy.shortPasses.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Medium Passes</Text>
            <Text style={styles.workoutValue}>
              {workouts.throwingAccuracy.mediumPasses.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Deep Passes</Text>
            <Text style={styles.workoutValue}>
              {workouts.throwingAccuracy.deepPasses.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>On The Move</Text>
            <Text style={styles.workoutValue}>
              {workouts.throwingAccuracy.onTheMove.toFixed(0)}%
            </Text>
          </View>
        </View>
      )}

      {workouts.receivingDrills && (
        <View style={styles.positionSection}>
          <Text style={styles.positionSectionTitle}>Receiving Drills</Text>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Catch Rate</Text>
            <Text style={styles.workoutValue}>
              {workouts.receivingDrills.catchRate.toFixed(0)}%
            </Text>
          </View>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Route Running</Text>
            <Text style={styles.workoutValue}>{workouts.receivingDrills.routeRunning}/10</Text>
          </View>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Hands Grade</Text>
            <Text style={styles.workoutValue}>{workouts.receivingDrills.handsGrade}/10</Text>
          </View>
        </View>
      )}

      {workouts.blockingDrills && (
        <View style={styles.positionSection}>
          <Text style={styles.positionSectionTitle}>Blocking Drills</Text>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Pass Set</Text>
            <Text style={styles.workoutValue}>{workouts.blockingDrills.passSet}/10</Text>
          </View>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Run Blocking</Text>
            <Text style={styles.workoutValue}>{workouts.blockingDrills.runBlocking}/10</Text>
          </View>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Pull & Trap</Text>
            <Text style={styles.workoutValue}>{workouts.blockingDrills.pullAndTrap}/10</Text>
          </View>
        </View>
      )}

      {workouts.passRushDrills && (
        <View style={styles.positionSection}>
          <Text style={styles.positionSectionTitle}>Pass Rush Drills</Text>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Get Off</Text>
            <Text style={styles.workoutValue}>{workouts.passRushDrills.getOff}/10</Text>
          </View>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Hand Usage</Text>
            <Text style={styles.workoutValue}>{workouts.passRushDrills.handUsage}/10</Text>
          </View>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Bend Around Edge</Text>
            <Text style={styles.workoutValue}>{workouts.passRushDrills.bendsAroundEdge}/10</Text>
          </View>
        </View>
      )}

      {workouts.coverageDrills && (
        <View style={styles.positionSection}>
          <Text style={styles.positionSectionTitle}>Coverage Drills</Text>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Backpedal</Text>
            <Text style={styles.workoutValue}>{workouts.coverageDrills.backpedal}/10</Text>
          </View>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Hip Flip</Text>
            <Text style={styles.workoutValue}>{workouts.coverageDrills.hipFlip}/10</Text>
          </View>
          <View style={styles.workoutRow}>
            <Text style={styles.workoutLabel}>Ball Skills</Text>
            <Text style={styles.workoutValue}>{workouts.coverageDrills.ballSkills}/10</Text>
          </View>
        </View>
      )}
    </View>
  );
}

/**
 * Prospect Combine Card Component
 */
function ProspectCombineCard({
  prospect,
  combineResult,
  proDayResult,
  onPress,
}: {
  prospect: Prospect;
  combineResult?: CombineResults;
  proDayResult?: ProDayResults;
  onPress?: () => void;
}): React.JSX.Element {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.prospectCard}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.prospectHeader}>
        <View style={styles.prospectInfo}>
          <Text style={styles.prospectName}>
            {prospect.player.firstName} {prospect.player.lastName}
          </Text>
          <Text style={styles.prospectDetails}>
            {prospect.player.position} • {prospect.collegeName}
          </Text>
        </View>
        {combineResult && (
          <View
            style={[
              styles.gradeBadge,
              { backgroundColor: getCombineGradeColor(combineResult.overallGrade) + '20' },
            ]}
          >
            <Text
              style={[
                styles.gradeText,
                { color: getCombineGradeColor(combineResult.overallGrade) },
              ]}
            >
              {getCombineGradeText(combineResult.overallGrade)}
            </Text>
          </View>
        )}
      </View>

      {/* Quick Stats Row */}
      {combineResult?.workoutResults && (
        <View style={styles.quickStatsRow}>
          <Text style={styles.quickStat}>
            40: {formatForty(combineResult.workoutResults.fortyYardDash)}
          </Text>
          <Text style={styles.quickStat}>
            Vert: {formatJump(combineResult.workoutResults.verticalJump)}
          </Text>
          <Text style={styles.quickStat}>
            Bench: {formatBench(combineResult.workoutResults.benchPress)}
          </Text>
        </View>
      )}

      {expanded && (
        <View style={styles.expandedContent}>
          {/* Combine Results */}
          {combineResult?.measurements && (
            <MeasurementsCard measurements={combineResult.measurements} />
          )}

          {combineResult?.workoutResults && (
            <WorkoutResultsCard results={combineResult.workoutResults} />
          )}

          {combineResult?.medicalEvaluation && (
            <MedicalCard medical={combineResult.medicalEvaluation} />
          )}

          {/* Pro Day Results */}
          {proDayResult && (
            <View style={styles.proDaySection}>
              <Text style={styles.sectionTitle}>Pro Day Results</Text>
              <Text style={styles.proDayType}>{getProDayTypeText(proDayResult.workoutType)}</Text>
              <Text style={styles.proDayGrade}>
                Overall Grade: {proDayResult.overallGrade.toFixed(1)}/10
              </Text>
              <Text style={styles.proDayAttendance}>
                {proDayResult.attendance.length} Teams in Attendance
              </Text>

              {proDayResult.positionWorkouts && (
                <PositionWorkoutCard workouts={proDayResult.positionWorkouts} />
              )}

              {proDayResult.observations.length > 0 && (
                <View style={styles.observations}>
                  <Text style={styles.observationsTitle}>Observations:</Text>
                  {proDayResult.observations.map((obs, i) => (
                    <Text key={i} style={styles.observation}>
                      • {obs}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {onPress && (
            <TouchableOpacity style={styles.viewProfileButton} onPress={onPress}>
              <Text style={styles.viewProfileText}>View Full Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Combine Pro Day Screen Component
 */
export function CombineProDayScreen({
  prospects,
  combineResults,
  proDayResults,
  combineSummary,
  proDaySummary,
  onBack,
  onProspectSelect,
}: CombineProDayScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'combine' | 'proday' | 'leaderboard'>('combine');
  const [filterPosition, setFilterPosition] = useState<string | null>(null);

  // Filter prospects
  const filteredProspects = filterPosition
    ? prospects.filter((p) => p.player.position === filterPosition)
    : prospects;

  // Get invited prospects (for combine tab)
  const invitedProspects = filteredProspects.filter((p) => combineResults.get(p.id)?.invited);

  // Get leaderboard data
  const getLeaderboard = () => {
    const leaderboards: { name: string; data: { prospect: Prospect; value: number | string }[] }[] =
      [];

    // 40-yard dash (fastest)
    const fortyLeaders = filteredProspects
      .map((p) => ({
        prospect: p,
        value: combineResults.get(p.id)?.workoutResults?.fortyYardDash || 99,
      }))
      .filter((x) => x.value < 99)
      .sort((a, b) => (a.value as number) - (b.value as number))
      .slice(0, 10)
      .map((x) => ({ prospect: x.prospect, value: (x.value as number).toFixed(2) + 's' }));
    if (fortyLeaders.length > 0) {
      leaderboards.push({ name: '40-Yard Dash', data: fortyLeaders });
    }

    // Bench press (most reps)
    const benchLeaders = filteredProspects
      .map((p) => ({
        prospect: p,
        value: combineResults.get(p.id)?.workoutResults?.benchPress || 0,
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 10)
      .map((x) => ({ prospect: x.prospect, value: x.value + ' reps' }));
    if (benchLeaders.length > 0) {
      leaderboards.push({ name: 'Bench Press', data: benchLeaders });
    }

    // Vertical jump (highest)
    const vertLeaders = filteredProspects
      .map((p) => ({
        prospect: p,
        value: combineResults.get(p.id)?.workoutResults?.verticalJump || 0,
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 10)
      .map((x) => ({ prospect: x.prospect, value: x.value + '"' }));
    if (vertLeaders.length > 0) {
      leaderboards.push({ name: 'Vertical Jump', data: vertLeaders });
    }

    // Broad jump (longest)
    const broadLeaders = filteredProspects
      .map((p) => ({
        prospect: p,
        value: combineResults.get(p.id)?.workoutResults?.broadJump || 0,
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => (b.value as number) - (a.value as number))
      .slice(0, 10)
      .map((x) => ({ prospect: x.prospect, value: x.value + '"' }));
    if (broadLeaders.length > 0) {
      leaderboards.push({ name: 'Broad Jump', data: broadLeaders });
    }

    return leaderboards;
  };

  const positions = [...new Set(prospects.map((p) => p.player.position))].sort();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Combine & Pro Day</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Summary Bar */}
      {combineSummary && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{combineSummary.totalInvited}</Text>
            <Text style={styles.summaryLabel}>Invited</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{combineSummary.totalParticipated}</Text>
            <Text style={styles.summaryLabel}>Participated</Text>
          </View>
          {combineSummary.averageFortyTime && (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{combineSummary.averageFortyTime.toFixed(2)}s</Text>
              <Text style={styles.summaryLabel}>Avg 40</Text>
            </View>
          )}
        </View>
      )}

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'combine' && styles.tabActive]}
          onPress={() => setActiveTab('combine')}
        >
          <Text style={[styles.tabText, activeTab === 'combine' && styles.tabTextActive]}>
            Combine
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'proday' && styles.tabActive]}
          onPress={() => setActiveTab('proday')}
        >
          <Text style={[styles.tabText, activeTab === 'proday' && styles.tabTextActive]}>
            Pro Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
          onPress={() => setActiveTab('leaderboard')}
        >
          <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>
            Leaderboard
          </Text>
        </TouchableOpacity>
      </View>

      {/* Position Filter */}
      <ScrollView horizontal style={styles.filterBar} showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterChip, !filterPosition && styles.filterChipActive]}
          onPress={() => setFilterPosition(null)}
        >
          <Text style={[styles.filterChipText, !filterPosition && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {positions.map((pos) => (
          <TouchableOpacity
            key={pos}
            style={[styles.filterChip, filterPosition === pos && styles.filterChipActive]}
            onPress={() => setFilterPosition(pos)}
          >
            <Text
              style={[styles.filterChipText, filterPosition === pos && styles.filterChipTextActive]}
            >
              {pos}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Combine Tab */}
        {activeTab === 'combine' && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Combine Invites ({invitedProspects.length})</Text>
            {invitedProspects.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No combine results available</Text>
              </View>
            ) : (
              invitedProspects.map((prospect) => (
                <ProspectCombineCard
                  key={prospect.id}
                  prospect={prospect}
                  combineResult={combineResults.get(prospect.id)}
                  proDayResult={proDayResults.get(prospect.id)}
                  onPress={onProspectSelect ? () => onProspectSelect(prospect.id) : undefined}
                />
              ))
            )}
          </View>
        )}

        {/* Pro Day Tab */}
        {activeTab === 'proday' && (
          <View style={styles.section}>
            {proDaySummary && (
              <View style={styles.proDaySummary}>
                <Text style={styles.proDaySummaryText}>
                  {proDaySummary.totalProDays} Pro Days • Avg Grade:{' '}
                  {proDaySummary.averageGrade.toFixed(1)}/10
                </Text>
                <Text style={styles.proDaySummaryText}>
                  {proDaySummary.fullWorkouts} Full • {proDaySummary.positionWorkouts} Position •{' '}
                  {proDaySummary.privateWorkoutsRequested} Private Requests
                </Text>
              </View>
            )}
            <Text style={styles.sectionHeader}>Pro Day Results</Text>
            {filteredProspects
              .filter((p) => proDayResults.has(p.id))
              .slice(0, 50)
              .map((prospect) => (
                <ProspectCombineCard
                  key={prospect.id}
                  prospect={prospect}
                  combineResult={combineResults.get(prospect.id)}
                  proDayResult={proDayResults.get(prospect.id)}
                  onPress={onProspectSelect ? () => onProspectSelect(prospect.id) : undefined}
                />
              ))}
          </View>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <View style={styles.section}>
            {getLeaderboard().map((leaderboard) => (
              <View key={leaderboard.name} style={styles.leaderboardSection}>
                <Text style={styles.leaderboardTitle}>{leaderboard.name}</Text>
                {leaderboard.data.map((entry, index) => (
                  <TouchableOpacity
                    key={entry.prospect.id}
                    style={styles.leaderboardRow}
                    onPress={
                      onProspectSelect ? () => onProspectSelect(entry.prospect.id) : undefined
                    }
                  >
                    <Text style={styles.leaderboardRank}>#{index + 1}</Text>
                    <View style={styles.leaderboardInfo}>
                      <Text style={styles.leaderboardName}>
                        {entry.prospect.player.firstName} {entry.prospect.player.lastName}
                      </Text>
                      <Text style={styles.leaderboardDetails}>
                        {entry.prospect.player.position} • {entry.prospect.collegeName}
                      </Text>
                    </View>
                    <Text style={styles.leaderboardValue}>{entry.value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}
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
  backButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  headerSpacer: {
    width: 60,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  filterBar: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.background,
    fontWeight: fontWeight.semibold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  prospectCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  prospectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  prospectInfo: {
    flex: 1,
  },
  prospectName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  prospectDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gradeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  gradeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  quickStatsRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  quickStat: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  measurementsCard: {
    marginBottom: spacing.md,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  measurementItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  measurementValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  measurementLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  workoutCard: {
    marginBottom: spacing.md,
  },
  workoutGrid: {
    gap: spacing.xs,
  },
  workoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  workoutLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  workoutValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  medicalCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
  },
  medicalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  medicalBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  medicalGrade: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
  },
  durabilityRating: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  medicalConcerns: {
    marginTop: spacing.sm,
  },
  concernsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  concernItem: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  concernArea: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  concernSeverity: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  concernFollowUp: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontStyle: 'italic',
  },
  flaggedConditions: {
    marginTop: spacing.sm,
  },
  flaggedTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginBottom: spacing.xs,
  },
  flaggedItem: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  positionCard: {
    marginTop: spacing.sm,
  },
  positionSection: {
    marginTop: spacing.sm,
  },
  positionSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  proDaySection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  proDayType: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  proDayGrade: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  proDayAttendance: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  observations: {
    marginTop: spacing.md,
  },
  observationsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  observation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  viewProfileButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  viewProfileText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  proDaySummary: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  proDaySummaryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  leaderboardSection: {
    marginBottom: spacing.lg,
  },
  leaderboardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  leaderboardRank: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    width: 40,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  leaderboardDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  leaderboardValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
});
