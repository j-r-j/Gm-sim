/**
 * FinalCutsScreen
 * Displays roster management for final cuts to 53 players
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius } from '../styles';
import { GameState } from '../core/models/game/GameState';
import {
  FinalCutsSummary,
  CutEvaluationPlayer,
  WaiverClaim,
} from '../core/offseason/phases/FinalCutsPhase';

/**
 * Props for FinalCutsScreen
 */
export interface FinalCutsScreenProps {
  gameState: GameState;
  summary: FinalCutsSummary;
  rosterSize: number;
  maxRosterSize: number;
  practiceSquadSize: number;
  maxPracticeSquadSize: number;
  onBack: () => void;
  onPlayerSelect?: (playerId: string) => void;
  onCutPlayer?: (playerId: string) => void;
  onSignToPS?: (playerId: string) => void;
}

type TabType = 'roster' | 'cuts' | 'practice_squad' | 'waivers';

/**
 * Get color for recommendation
 */
function getRecommendationColor(recommendation: CutEvaluationPlayer['recommendation']): string {
  switch (recommendation) {
    case 'keep':
      return colors.success;
    case 'cut':
      return colors.error;
    case 'ir':
      return colors.warning;
    case 'practice_squad':
      return colors.primary;
    case 'trade_block':
      return colors.warning;
    default:
      return colors.textSecondary;
  }
}

/**
 * Format money value
 */
function formatMoney(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}M`;
  }
  return `$${value}K`;
}

/**
 * Roster overview card
 */
function RosterOverviewCard({
  rosterSize,
  maxRosterSize,
  practiceSquadSize,
  maxPracticeSquadSize,
  cutsNeeded,
}: {
  rosterSize: number;
  maxRosterSize: number;
  practiceSquadSize: number;
  maxPracticeSquadSize: number;
  cutsNeeded: number;
}): React.JSX.Element {
  return (
    <View style={styles.overviewCard}>
      <Text style={styles.cardTitle}>Roster Status</Text>

      <View style={styles.rosterNumbers}>
        <View style={styles.rosterNumberItem}>
          <Text
            style={[
              styles.rosterNumberValue,
              rosterSize > maxRosterSize ? { color: colors.error } : { color: colors.text },
            ]}
          >
            {rosterSize}
          </Text>
          <Text style={styles.rosterNumberLabel}>/ {maxRosterSize}</Text>
          <Text style={styles.rosterNumberSubLabel}>Active Roster</Text>
        </View>

        <View style={styles.rosterNumberDivider} />

        <View style={styles.rosterNumberItem}>
          <Text style={styles.rosterNumberValue}>{practiceSquadSize}</Text>
          <Text style={styles.rosterNumberLabel}>/ {maxPracticeSquadSize}</Text>
          <Text style={styles.rosterNumberSubLabel}>Practice Squad</Text>
        </View>
      </View>

      {cutsNeeded > 0 && (
        <View style={styles.cutsNeededBanner}>
          <Text style={styles.cutsNeededText}>
            {cutsNeeded} cut{cutsNeeded !== 1 ? 's' : ''} needed to reach 53-man roster
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Player card for roster management
 */
function RosterPlayerCard({
  player,
  onPress,
  onCut,
  showActions,
}: {
  player: CutEvaluationPlayer;
  onPress: () => void;
  onCut?: () => void;
  showActions: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.playerCard}>
      <TouchableOpacity style={styles.playerInfo} onPress={onPress}>
        <View style={styles.playerHeader}>
          <View>
            <Text style={styles.playerName}>{player.playerName}</Text>
            <Text style={styles.playerPosition}>
              {player.position} • {player.age} yrs • Yr {player.experience + 1}
            </Text>
          </View>
          <View
            style={[
              styles.recommendationBadge,
              { backgroundColor: getRecommendationColor(player.recommendation) + '20' },
            ]}
          >
            <Text
              style={[
                styles.recommendationText,
                { color: getRecommendationColor(player.recommendation) },
              ]}
            >
              {player.recommendation.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.playerStats}>
          <View style={styles.playerStatItem}>
            <Text style={styles.playerStatValue}>{player.overallRating}</Text>
            <Text style={styles.playerStatLabel}>OVR</Text>
          </View>
          <View style={styles.playerStatItem}>
            <Text style={styles.playerStatValue}>{player.preseasonGrade}</Text>
            <Text style={styles.playerStatLabel}>Camp</Text>
          </View>
          <View style={styles.playerStatItem}>
            <Text style={styles.playerStatValue}>{formatMoney(player.salary)}</Text>
            <Text style={styles.playerStatLabel}>Salary</Text>
          </View>
          <View style={styles.playerStatItem}>
            <Text
              style={[
                styles.playerStatValue,
                player.deadCapIfCut > 0 ? { color: colors.error } : {},
              ]}
            >
              {formatMoney(player.deadCapIfCut)}
            </Text>
            <Text style={styles.playerStatLabel}>Dead Cap</Text>
          </View>
        </View>

        {player.notes.length > 0 && (
          <View style={styles.notesList}>
            {player.notes.map((note, i) => (
              <Text key={i} style={styles.noteText}>
                • {note}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.playerTags}>
          {player.practiceSquadEligible && (
            <View style={[styles.tag, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>PS Eligible</Text>
            </View>
          )}
          {player.isVested && (
            <View style={[styles.tag, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[styles.tagText, { color: colors.warning }]}>Vested</Text>
            </View>
          )}
          {player.guaranteed > 0 && (
            <View style={[styles.tag, { backgroundColor: colors.error + '20' }]}>
              <Text style={[styles.tagText, { color: colors.error }]}>
                {formatMoney(player.guaranteed)} GTD
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {showActions && onCut && player.recommendation !== 'keep' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cutButton} onPress={onCut}>
            <Text style={styles.cutButtonText}>Release</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * Cut player card (simpler version for cuts tab)
 */
function CutPlayerCard({
  player,
  onPress,
}: {
  player: CutEvaluationPlayer;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.cutPlayerCard} onPress={onPress}>
      <View style={styles.cutPlayerInfo}>
        <Text style={styles.playerName}>{player.playerName}</Text>
        <Text style={styles.playerPosition}>{player.position}</Text>
      </View>
      <View style={styles.cutPlayerStats}>
        <Text style={styles.cutStatText}>OVR: {player.overallRating}</Text>
        <Text style={styles.cutStatText}>Camp: {player.preseasonGrade}</Text>
      </View>
      <View style={styles.cutPlayerSavings}>
        <Text style={styles.savingsValue}>{formatMoney(player.salary - player.deadCapIfCut)}</Text>
        <Text style={styles.savingsLabel}>Cap Saved</Text>
      </View>
    </TouchableOpacity>
  );
}

/**
 * Practice squad card
 */
function PracticeSquadCard({
  player,
  onPress,
  onSignToPS,
}: {
  player: CutEvaluationPlayer;
  onPress: () => void;
  onSignToPS?: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.psCard}>
      <TouchableOpacity style={styles.psPlayerInfo} onPress={onPress}>
        <View>
          <Text style={styles.playerName}>{player.playerName}</Text>
          <Text style={styles.playerPosition}>
            {player.position} • {player.age} yrs
          </Text>
        </View>
        <View style={styles.psStats}>
          <Text style={styles.psStatValue}>{player.overallRating}</Text>
          <Text style={styles.psStatLabel}>OVR</Text>
        </View>
      </TouchableOpacity>
      {onSignToPS && (
        <TouchableOpacity style={styles.signPSButton} onPress={onSignToPS}>
          <Text style={styles.signPSButtonText}>Sign to PS</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Waiver claim card
 */
function WaiverClaimCard({
  claim,
  isUserTeam,
}: {
  claim: WaiverClaim;
  isUserTeam: boolean;
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.waiverCard,
        claim.wasSuccessful && isUserTeam ? { borderColor: colors.success } : {},
      ]}
    >
      <View style={styles.waiverHeader}>
        <View>
          <Text style={styles.playerName}>{claim.playerName}</Text>
          <Text style={styles.playerPosition}>
            {claim.position} • From: {claim.formerTeam}
          </Text>
        </View>
        <View
          style={[
            styles.waiverStatusBadge,
            {
              backgroundColor: claim.wasSuccessful ? colors.success + '20' : colors.error + '20',
            },
          ]}
        >
          <Text
            style={[
              styles.waiverStatusText,
              { color: claim.wasSuccessful ? colors.success : colors.error },
            ]}
          >
            {claim.wasSuccessful ? 'CLAIMED' : 'MISSED'}
          </Text>
        </View>
      </View>
      <View style={styles.waiverDetails}>
        <Text style={styles.waiverDetailText}>Claiming Team: {claim.claimingTeam}</Text>
        <Text style={styles.waiverDetailText}>Priority: #{claim.claimPriority}</Text>
      </View>
    </View>
  );
}

/**
 * Final Cuts Screen Component
 */
export function FinalCutsScreen({
  gameState,
  summary,
  rosterSize,
  maxRosterSize,
  practiceSquadSize,
  maxPracticeSquadSize,
  onBack,
  onPlayerSelect,
  onCutPlayer,
  onSignToPS,
}: FinalCutsScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('roster');

  const handlePlayerPress = (playerId: string) => {
    onPlayerSelect?.(playerId);
  };

  const cutsNeeded = Math.max(0, rosterSize - maxRosterSize);

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'roster', label: 'Roster', count: summary.finalRoster.length },
    { key: 'cuts', label: 'Cuts', count: summary.playersCut },
    { key: 'practice_squad', label: 'PS', count: summary.playersToPS },
    { key: 'waivers', label: 'Waivers', count: summary.waiverClaims.length },
  ];

  // Group roster by position
  const positionGroups = new Map<string, CutEvaluationPlayer[]>();
  for (const player of summary.finalRoster) {
    const pos = player.position;
    if (!positionGroups.has(pos)) {
      positionGroups.set(pos, []);
    }
    positionGroups.get(pos)!.push(player);
  }

  // Sort positions in typical roster order
  const positionOrder = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];
  const sortedPositions = [...positionGroups.keys()].sort(
    (a, b) => positionOrder.indexOf(a) - positionOrder.indexOf(b)
  );

  const userTeamName = `${gameState.teams[gameState.userTeamId].city} ${gameState.teams[gameState.userTeamId].nickname}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Final Cuts</Text>
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
              {tab.label}
              {tab.count !== undefined && ` (${tab.count})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'roster' && (
          <>
            <RosterOverviewCard
              rosterSize={rosterSize}
              maxRosterSize={maxRosterSize}
              practiceSquadSize={practiceSquadSize}
              maxPracticeSquadSize={maxPracticeSquadSize}
              cutsNeeded={cutsNeeded}
            />

            {sortedPositions.map((position) => (
              <View key={position}>
                <Text style={styles.positionHeader}>
                  {position} ({positionGroups.get(position)!.length})
                </Text>
                {positionGroups.get(position)!.map((player) => (
                  <RosterPlayerCard
                    key={player.playerId}
                    player={player}
                    onPress={() => handlePlayerPress(player.playerId)}
                    onCut={onCutPlayer ? () => onCutPlayer(player.playerId) : undefined}
                    showActions={cutsNeeded > 0}
                  />
                ))}
              </View>
            ))}
          </>
        )}

        {activeTab === 'cuts' && (
          <>
            <Text style={styles.sectionTitle}>Released Players ({summary.playersCut})</Text>
            {summary.playersCut === 0 ? (
              <Text style={styles.emptyText}>No players have been released yet</Text>
            ) : (
              // We'd need the cut players list - for now show summary
              <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>
                  {summary.playersCut} player{summary.playersCut !== 1 ? 's' : ''} released
                </Text>
                <Text style={styles.summarySubtext}>
                  {summary.playersToIR} placed on Injured Reserve
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'practice_squad' && (
          <>
            <Text style={styles.sectionTitle}>
              Practice Squad ({practiceSquadSize}/{maxPracticeSquadSize})
            </Text>
            {summary.practiceSquad.length === 0 ? (
              <Text style={styles.emptyText}>Practice squad is empty</Text>
            ) : (
              summary.practiceSquad.map((player) => (
                <PracticeSquadCard
                  key={player.playerId}
                  player={player}
                  onPress={() => handlePlayerPress(player.playerId)}
                  onSignToPS={onSignToPS ? () => onSignToPS(player.playerId) : undefined}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'waivers' && (
          <>
            <Text style={styles.sectionTitle}>Waiver Wire Activity</Text>
            {summary.waiverClaims.length === 0 ? (
              <Text style={styles.emptyText}>No waiver claims this period</Text>
            ) : (
              summary.waiverClaims.map((claim, i) => (
                <WaiverClaimCard
                  key={i}
                  claim={claim}
                  isUserTeam={claim.claimingTeam === userTeamName}
                />
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
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  rosterNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  rosterNumberItem: {
    alignItems: 'center',
  },
  rosterNumberValue: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  rosterNumberLabel: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    marginTop: -spacing.xs,
  },
  rosterNumberSubLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  rosterNumberDivider: {
    width: 1,
    height: 60,
    backgroundColor: colors.border,
  },
  cutsNeededBanner: {
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  cutsNeededText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    textAlign: 'center',
  },
  positionHeader: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.sm,
  },
  playerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerInfo: {
    flex: 1,
  },
  playerHeader: {
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
  recommendationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  recommendationText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  playerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  playerStatItem: {
    alignItems: 'center',
  },
  playerStatValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  playerStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  notesList: {
    marginBottom: spacing.sm,
  },
  noteText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  playerTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tagText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cutButton: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  cutButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  cutPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cutPlayerInfo: {
    flex: 1,
  },
  cutPlayerStats: {
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  cutStatText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  cutPlayerSavings: {
    alignItems: 'center',
    paddingLeft: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  savingsValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  savingsLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  psCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  psPlayerInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  psStats: {
    alignItems: 'center',
  },
  psStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  psStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  signPSButton: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.md,
  },
  signPSButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  waiverCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  waiverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  waiverStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  waiverStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  waiverDetails: {
    gap: spacing.xs,
  },
  waiverDetailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  summarySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
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

export default FinalCutsScreen;
