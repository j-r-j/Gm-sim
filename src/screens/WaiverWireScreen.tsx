/**
 * WaiverWireScreen
 *
 * Shows available waiver wire players and allows the user to submit claims.
 * Also handles practice squad elevations.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
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
  WaiverWireState,
  WaiverPlayer,
  submitWaiverClaim,
  cancelWaiverClaim,
  elevatePracticeSquadPlayer,
} from '../core/roster/WaiverWireManager';

export interface WaiverWireScreenProps {
  waiverState: WaiverWireState;
  practiceSquadPlayers: Array<{ id: string; name: string; position: string; rating: number }>;
  rosterCount: number;
  droppablePlayers: Array<{ id: string; name: string; position: string; rating: number }>;
  onStateChange: (state: WaiverWireState) => void;
  onBack: () => void;
}

type TabType = 'waivers' | 'claims' | 'elevations';

export function WaiverWireScreen({
  waiverState,
  practiceSquadPlayers,
  rosterCount,
  droppablePlayers,
  onStateChange,
  onBack,
}: WaiverWireScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('waivers');
  const [selectedDropPlayer, setSelectedDropPlayer] = useState<string | null>(null);

  const rosterFull = rosterCount >= 53;

  const handleClaim = (player: WaiverPlayer) => {
    if (rosterFull && !selectedDropPlayer) {
      Alert.alert('Roster Full', 'Your roster is at 53 players. Select a player to drop first.', [
        { text: 'OK' },
      ]);
      return;
    }

    const dropPlayer = rosterFull
      ? droppablePlayers.find((p) => p.id === selectedDropPlayer)
      : null;

    const updated = submitWaiverClaim(
      waiverState,
      player.playerId,
      player.playerName,
      player.position,
      dropPlayer?.id || null,
      dropPlayer?.name || null
    );

    onStateChange(updated);
    setSelectedDropPlayer(null);
    Alert.alert('Claim Submitted', `Waiver claim for ${player.playerName} has been submitted.`);
  };

  const handleCancelClaim = (playerId: string) => {
    const updated = cancelWaiverClaim(waiverState, playerId);
    onStateChange(updated);
  };

  const handleElevation = (player: { id: string; name: string; position: string }) => {
    const count = waiverState.seasonElevationCounts[player.id] || 0;
    if (count >= 3) {
      Alert.alert('Limit Reached', `${player.name} has already been elevated 3 times this season.`);
      return;
    }

    const updated = elevatePracticeSquadPlayer(
      waiverState,
      player.id,
      player.name,
      player.position
    );
    onStateChange(updated);
  };

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
        <Text style={styles.headerTitle}>Waiver Wire</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Waiver Priority */}
      <View style={styles.priorityBar}>
        <Text style={styles.priorityLabel}>Waiver Priority:</Text>
        <Text style={styles.priorityValue}>#{waiverState.userWaiverPriority}</Text>
        <Text style={styles.priorityNote}>(Lower = better claim chance)</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['waivers', 'claims', 'elevations'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'waivers'
                ? `Available (${waiverState.availablePlayers.length})`
                : tab === 'claims'
                  ? `Claims (${waiverState.pendingClaims.length})`
                  : 'PS Elevate'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {activeTab === 'waivers' && (
          <>
            {waiverState.availablePlayers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color={colors.textSecondary} />
                <Text style={styles.emptyTitle}>No Players Available</Text>
                <Text style={styles.emptyText}>
                  Players become available when AI teams make roster cuts.
                </Text>
              </View>
            ) : (
              waiverState.availablePlayers.map((player) => {
                const alreadyClaimed = waiverState.pendingClaims.some(
                  (c) => c.playerId === player.playerId
                );
                return (
                  <View key={player.playerId} style={styles.playerCard}>
                    <View style={styles.playerHeader}>
                      <View>
                        <Text style={styles.playerName}>{player.playerName}</Text>
                        <Text style={styles.playerDetail}>
                          {player.position} | Age: {player.age} | Exp: {player.experience}yr
                        </Text>
                      </View>
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>{player.overallRating}</Text>
                      </View>
                    </View>
                    {player.formerTeamName && (
                      <Text style={styles.formerTeam}>
                        Released by {player.formerTeamName} - {player.releaseReason}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={[styles.claimButton, alreadyClaimed && styles.claimButtonDisabled]}
                      onPress={() => handleClaim(player)}
                      disabled={alreadyClaimed}
                      accessibilityLabel={
                        alreadyClaimed ? 'Claim already submitted' : `Claim ${player.playerName}`
                      }
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name={alreadyClaimed ? 'checkmark' : 'add-circle'}
                        size={18}
                        color={colors.textOnPrimary}
                      />
                      <Text style={styles.claimButtonText}>
                        {alreadyClaimed ? 'Claimed' : 'Submit Claim'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {/* Drop player selector (when roster is full) */}
            {rosterFull && waiverState.availablePlayers.length > 0 && (
              <View style={styles.dropSection}>
                <Text style={styles.dropTitle}>Roster Full (53/53) - Select player to drop:</Text>
                {droppablePlayers.slice(0, 10).map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.dropPlayerRow,
                      selectedDropPlayer === player.id && styles.dropPlayerSelected,
                    ]}
                    onPress={() => setSelectedDropPlayer(player.id)}
                  >
                    <Text style={styles.dropPlayerName}>{player.name}</Text>
                    <Text style={styles.dropPlayerDetail}>
                      {player.position} - OVR {player.rating}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'claims' && (
          <>
            {waiverState.pendingClaims.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No pending claims.</Text>
              </View>
            ) : (
              waiverState.pendingClaims.map((claim) => (
                <View key={claim.playerId} style={styles.claimCard}>
                  <View style={styles.claimInfo}>
                    <Text style={styles.claimName}>{claim.playerName}</Text>
                    <Text style={styles.claimDetail}>{claim.position}</Text>
                    {claim.dropPlayerName && (
                      <Text style={styles.claimDrop}>Dropping: {claim.dropPlayerName}</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelClaim(claim.playerId)}
                    accessibilityLabel={`Cancel claim for ${claim.playerName}`}
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={18} color={colors.error} />
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </>
        )}

        {activeTab === 'elevations' && (
          <>
            <Text style={styles.elevationNote}>
              Elevate a practice squad player for game day. Max 3 elevations per player per season.
            </Text>
            {practiceSquadPlayers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No practice squad players.</Text>
              </View>
            ) : (
              practiceSquadPlayers.map((player) => {
                const elevCount = waiverState.seasonElevationCounts[player.id] || 0;
                const alreadyElevated = waiverState.elevations.some(
                  (e) => e.playerId === player.id
                );
                return (
                  <View key={player.id} style={styles.elevationCard}>
                    <View style={styles.elevationInfo}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Text style={styles.playerDetail}>
                        {player.position} | OVR {player.rating} | Elevations: {elevCount}/3
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.elevateButton,
                        (alreadyElevated || elevCount >= 3) && styles.elevateButtonDisabled,
                      ]}
                      onPress={() => handleElevation(player)}
                      disabled={alreadyElevated || elevCount >= 3}
                    >
                      <Text style={styles.elevateText}>
                        {alreadyElevated ? 'Elevated' : elevCount >= 3 ? 'Max' : 'Elevate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
  priorityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  priorityLabel: { fontSize: fontSize.sm, color: colors.text },
  priorityValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  priorityNote: { fontSize: fontSize.xs, color: colors.textSecondary },
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
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center' },
  playerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  playerName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  playerDetail: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  ratingBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  formerTeam: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  claimButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    minHeight: accessibility.minTouchTarget,
  },
  claimButtonDisabled: { backgroundColor: colors.textSecondary },
  claimButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  dropSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  dropTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  dropPlayerRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderRadius: borderRadius.sm,
  },
  dropPlayerSelected: { backgroundColor: colors.error + '15' },
  dropPlayerName: { fontSize: fontSize.sm, color: colors.text },
  dropPlayerDetail: { fontSize: fontSize.xs, color: colors.textSecondary },
  claimCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  claimInfo: { flex: 1 },
  claimName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  claimDetail: { fontSize: fontSize.sm, color: colors.textSecondary },
  claimDrop: { fontSize: fontSize.xs, color: colors.error, marginTop: spacing.xxs },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  cancelText: { fontSize: fontSize.sm, color: colors.error, fontWeight: fontWeight.bold },
  elevationNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  elevationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  elevationInfo: { flex: 1 },
  elevateButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.md,
    minHeight: accessibility.minTouchTarget,
    justifyContent: 'center',
    alignItems: 'center',
  },
  elevateButtonDisabled: { opacity: 0.5 },
  elevateText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
});

export default WaiverWireScreen;
