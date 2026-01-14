/**
 * TradeScreen
 * Propose and complete trades with other teams
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { Player } from '../core/models/player/Player';
import { Team } from '../core/models/team/Team';
import { DraftPick } from '../core/models/league/DraftPick';

/**
 * Trade asset (player or pick)
 */
export type TradeAsset =
  | { type: 'player'; playerId: string; playerName: string; position: string; value: number }
  | { type: 'pick'; pickId: string; round: number; year: number; value: number };

/**
 * Trade proposal
 */
export interface TradeProposal {
  offeringTeamId: string;
  receivingTeamId: string;
  assetsOffered: TradeAsset[];
  assetsRequested: TradeAsset[];
}

/**
 * Props for TradeScreen
 */
export interface TradeScreenProps {
  /** User's team */
  userTeam: Team;
  /** All teams */
  teams: Record<string, Team>;
  /** All players */
  players: Record<string, Player>;
  /** All draft picks */
  draftPicks: Record<string, DraftPick>;
  /** Callback to evaluate trade value */
  onGetTradeValue?: (assets: TradeAsset[]) => number;
  /** Callback to submit trade */
  onSubmitTrade: (proposal: TradeProposal) => Promise<'accepted' | 'rejected' | 'counter'>;
  /** Callback to go back */
  onBack: () => void;
}

/**
 * Format money for display
 */
function formatMoney(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}

/**
 * Get trade value for an asset (simplified)
 */
function getAssetValue(asset: TradeAsset): number {
  return asset.value;
}

/**
 * Team selector component
 */
function TeamSelector({
  teams,
  selectedTeamId,
  onSelect,
  excludeTeamId,
}: {
  teams: Record<string, Team>;
  selectedTeamId: string | null;
  onSelect: (teamId: string) => void;
  excludeTeamId: string;
}) {
  const sortedTeams = useMemo(() => {
    return Object.values(teams)
      .filter((t) => t.id !== excludeTeamId)
      .sort((a, b) => a.city.localeCompare(b.city));
  }, [teams, excludeTeamId]);

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={sortedTeams}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.teamSelectorContent}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.teamChip, selectedTeamId === item.id && styles.teamChipActive]}
          onPress={() => onSelect(item.id)}
        >
          <Text
            style={[styles.teamChipText, selectedTeamId === item.id && styles.teamChipTextActive]}
          >
            {item.abbreviation}
          </Text>
        </TouchableOpacity>
      )}
    />
  );
}

/**
 * Asset card component
 */
function AssetCard({ asset, onRemove }: { asset: TradeAsset; onRemove: () => void }) {
  return (
    <View style={styles.assetCard}>
      <View style={styles.assetInfo}>
        {asset.type === 'player' ? (
          <>
            <Text style={styles.assetPosition}>{asset.position}</Text>
            <Text style={styles.assetName}>{asset.playerName}</Text>
          </>
        ) : (
          <>
            <Text style={styles.assetPosition}>Rd {asset.round}</Text>
            <Text style={styles.assetName}>{asset.year} Pick</Text>
          </>
        )}
      </View>
      <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Trade value indicator
 */
function TradeValueIndicator({
  offeredValue,
  requestedValue,
}: {
  offeredValue: number;
  requestedValue: number;
}) {
  const difference = offeredValue - requestedValue;
  const isFair = Math.abs(difference) < requestedValue * 0.15;
  const isOverpay = difference > requestedValue * 0.15;

  let statusText: string;
  let statusColor: string;

  if (isFair) {
    statusText = 'Fair Trade';
    statusColor = colors.success;
  } else if (isOverpay) {
    statusText = 'You are overpaying';
    statusColor = colors.warning;
  } else {
    statusText = 'Unlikely to be accepted';
    statusColor = colors.error;
  }

  return (
    <View style={styles.tradeValueContainer}>
      <View style={styles.valueRow}>
        <Text style={styles.valueLabel}>Your offer value:</Text>
        <Text style={styles.valueAmount}>{formatMoney(offeredValue)}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.valueLabel}>Requested value:</Text>
        <Text style={styles.valueAmount}>{formatMoney(requestedValue)}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    </View>
  );
}

export function TradeScreen({
  userTeam,
  teams,
  players,
  draftPicks,
  onGetTradeValue,
  onSubmitTrade,
  onBack,
}: TradeScreenProps): React.JSX.Element {
  const [tradePartner, setTradePartner] = useState<string | null>(null);
  const [assetsOffered, setAssetsOffered] = useState<TradeAsset[]>([]);
  const [assetsRequested, setAssetsRequested] = useState<TradeAsset[]>([]);
  const [showAssetPicker, setShowAssetPicker] = useState<'offer' | 'request' | null>(null);

  // Get user's players
  const userPlayers = useMemo(() => {
    return userTeam.rosterPlayerIds.map((id) => players[id]).filter(Boolean);
  }, [userTeam, players]);

  // Get partner's players
  const partnerPlayers = useMemo(() => {
    if (!tradePartner) return [];
    const partner = teams[tradePartner];
    if (!partner) return [];
    return partner.rosterPlayerIds.map((id) => players[id]).filter(Boolean);
  }, [tradePartner, teams, players]);

  // Get user's draft picks
  const userPicks = useMemo(() => {
    return Object.values(draftPicks).filter(
      (p) => p.currentTeamId === userTeam.id && !p.selectedPlayerId
    );
  }, [draftPicks, userTeam.id]);

  // Get partner's draft picks
  const partnerPicks = useMemo(() => {
    if (!tradePartner) return [];
    return Object.values(draftPicks).filter(
      (p) => p.currentTeamId === tradePartner && !p.selectedPlayerId
    );
  }, [draftPicks, tradePartner]);

  // Calculate trade values
  const offeredValue = useMemo(() => {
    if (onGetTradeValue) return onGetTradeValue(assetsOffered);
    return assetsOffered.reduce((sum, a) => sum + getAssetValue(a), 0);
  }, [assetsOffered, onGetTradeValue]);

  const requestedValue = useMemo(() => {
    if (onGetTradeValue) return onGetTradeValue(assetsRequested);
    return assetsRequested.reduce((sum, a) => sum + getAssetValue(a), 0);
  }, [assetsRequested, onGetTradeValue]);

  // Add asset to offer
  const addToOffer = (asset: TradeAsset) => {
    if (
      assetsOffered.some(
        (a) =>
          (a.type === 'player' && asset.type === 'player' && a.playerId === asset.playerId) ||
          (a.type === 'pick' && asset.type === 'pick' && a.pickId === asset.pickId)
      )
    )
      return;
    setAssetsOffered([...assetsOffered, asset]);
    setShowAssetPicker(null);
  };

  // Add asset to request
  const addToRequest = (asset: TradeAsset) => {
    if (
      assetsRequested.some(
        (a) =>
          (a.type === 'player' && asset.type === 'player' && a.playerId === asset.playerId) ||
          (a.type === 'pick' && asset.type === 'pick' && a.pickId === asset.pickId)
      )
    )
      return;
    setAssetsRequested([...assetsRequested, asset]);
    setShowAssetPicker(null);
  };

  // Remove asset from offer
  const removeFromOffer = (index: number) => {
    setAssetsOffered(assetsOffered.filter((_, i) => i !== index));
  };

  // Remove asset from request
  const removeFromRequest = (index: number) => {
    setAssetsRequested(assetsRequested.filter((_, i) => i !== index));
  };

  // Submit trade
  const handleSubmitTrade = async () => {
    if (!tradePartner || assetsOffered.length === 0 || assetsRequested.length === 0) {
      Alert.alert('Invalid Trade', 'Please select a trade partner and add assets to both sides.');
      return;
    }

    const proposal: TradeProposal = {
      offeringTeamId: userTeam.id,
      receivingTeamId: tradePartner,
      assetsOffered,
      assetsRequested,
    };

    const result = await onSubmitTrade(proposal);

    switch (result) {
      case 'accepted':
        Alert.alert('Trade Accepted!', 'The trade has been completed.');
        setAssetsOffered([]);
        setAssetsRequested([]);
        break;
      case 'rejected':
        Alert.alert('Trade Rejected', 'The other team declined your offer.');
        break;
      case 'counter':
        Alert.alert('Counter Offer', 'The other team wants different terms.');
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Trade Center</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Team Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Trade Partner</Text>
          <TeamSelector
            teams={teams}
            selectedTeamId={tradePartner}
            onSelect={setTradePartner}
            excludeTeamId={userTeam.id}
          />
        </View>

        {tradePartner && (
          <>
            {/* Your Offer */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>You Offer</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowAssetPicker('offer')}
                >
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {assetsOffered.length === 0 ? (
                <Text style={styles.emptyText}>No assets added</Text>
              ) : (
                assetsOffered.map((asset, index) => (
                  <AssetCard
                    key={asset.type === 'player' ? asset.playerId : asset.pickId}
                    asset={asset}
                    onRemove={() => removeFromOffer(index)}
                  />
                ))
              )}
            </View>

            {/* You Request */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>You Request</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowAssetPicker('request')}
                >
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {assetsRequested.length === 0 ? (
                <Text style={styles.emptyText}>No assets added</Text>
              ) : (
                assetsRequested.map((asset, index) => (
                  <AssetCard
                    key={asset.type === 'player' ? asset.playerId : asset.pickId}
                    asset={asset}
                    onRemove={() => removeFromRequest(index)}
                  />
                ))
              )}
            </View>

            {/* Trade Value */}
            {(assetsOffered.length > 0 || assetsRequested.length > 0) && (
              <TradeValueIndicator offeredValue={offeredValue} requestedValue={requestedValue} />
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (assetsOffered.length === 0 || assetsRequested.length === 0) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitTrade}
              disabled={assetsOffered.length === 0 || assetsRequested.length === 0}
            >
              <Text style={styles.submitButtonText}>Propose Trade</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Asset Picker Modal */}
      <Modal visible={showAssetPicker !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {showAssetPicker === 'offer' ? 'Add to Your Offer' : 'Request from Partner'}
              </Text>
              <TouchableOpacity onPress={() => setShowAssetPicker(null)}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.assetList}>
              {/* Players */}
              <Text style={styles.assetGroupTitle}>Players</Text>
              {(showAssetPicker === 'offer' ? userPlayers : partnerPlayers).map((player) => (
                <TouchableOpacity
                  key={player.id}
                  style={styles.assetListItem}
                  onPress={() => {
                    const asset: TradeAsset = {
                      type: 'player',
                      playerId: player.id,
                      playerName: `${player.firstName} ${player.lastName}`,
                      position: player.position,
                      value: 5000000 + Math.random() * 15000000, // Simplified value
                    };
                    if (showAssetPicker === 'offer') {
                      addToOffer(asset);
                    } else {
                      addToRequest(asset);
                    }
                  }}
                >
                  <Text style={styles.assetListPosition}>{player.position}</Text>
                  <Text style={styles.assetListName}>
                    {player.firstName} {player.lastName}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* Draft Picks */}
              <Text style={styles.assetGroupTitle}>Draft Picks</Text>
              {(showAssetPicker === 'offer' ? userPicks : partnerPicks).map((pick) => (
                <TouchableOpacity
                  key={pick.id}
                  style={styles.assetListItem}
                  onPress={() => {
                    const asset: TradeAsset = {
                      type: 'pick',
                      pickId: pick.id,
                      round: pick.round,
                      year: pick.year,
                      value: (8 - pick.round) * 2000000, // Simplified value
                    };
                    if (showAssetPicker === 'offer') {
                      addToOffer(asset);
                    } else {
                      addToRequest(asset);
                    }
                  }}
                >
                  <Text style={styles.assetListPosition}>Rd {pick.round}</Text>
                  <Text style={styles.assetListName}>
                    {pick.year} Pick #{pick.overallPick}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    padding: spacing.md,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: spacing.sm,
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  addButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  emptyText: {
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: spacing.md,
  },
  // Team selector
  teamSelectorContent: {
    paddingVertical: spacing.sm,
  },
  teamChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  teamChipActive: {
    backgroundColor: colors.primary,
  },
  teamChipText: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: fontWeight.medium,
  },
  teamChipTextActive: {
    color: colors.textOnPrimary,
  },
  // Asset card
  assetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  assetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  assetPosition: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    marginRight: spacing.sm,
    width: 40,
  },
  assetName: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  // Trade value
  tradeValueContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  valueLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  valueAmount: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  statusBadge: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  statusText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  // Submit button
  submitButton: {
    backgroundColor: colors.secondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  submitButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  closeButton: {
    fontSize: fontSize.xxl,
    color: colors.textSecondary,
  },
  assetList: {
    padding: spacing.md,
  },
  assetGroupTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  assetListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  assetListPosition: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    width: 50,
  },
  assetListName: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
});

export default TradeScreen;
