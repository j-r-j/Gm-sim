/**
 * TradeOffersScreen
 *
 * Shows incoming trade offers from AI teams.
 * User can accept, reject, or view details of each offer.
 */

import React from 'react';
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
import { AITradeOffer, TradeOffersState, TradeAsset } from '../core/trade/AITradeOfferGenerator';

export interface TradeOffersScreenProps {
  tradeOffers: TradeOffersState;
  onAccept: (offerId: string) => void;
  onReject: (offerId: string) => void;
  onBack: () => void;
}

function AssetDisplay({ asset }: { asset: TradeAsset }): React.JSX.Element {
  if (asset.type === 'player') {
    return (
      <View style={styles.assetItem}>
        <Ionicons name="person" size={16} color={colors.text} />
        <View style={styles.assetInfo}>
          <Text style={styles.assetName}>{asset.playerName}</Text>
          <Text style={styles.assetDetail}>
            {asset.position} - OVR {asset.overallRating}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.assetItem}>
      <Ionicons name="document-text" size={16} color={colors.secondary} />
      <View style={styles.assetInfo}>
        <Text style={styles.assetName}>
          {asset.pickYear} Round {asset.pickRound} Pick
        </Text>
        <Text style={styles.assetDetail}>Draft Pick</Text>
      </View>
    </View>
  );
}

function getFairnessColor(score: number): string {
  if (score >= 60) return colors.success;
  if (score >= 40) return colors.warning;
  return colors.error;
}

function getFairnessLabel(score: number): string {
  if (score >= 70) return 'GREAT DEAL';
  if (score >= 55) return 'FAIR TRADE';
  if (score >= 40) return 'SLIGHTLY UNFAIR';
  return 'LOWBALL';
}

export function TradeOffersScreen({
  tradeOffers,
  onAccept,
  onReject,
  onBack,
}: TradeOffersScreenProps): React.JSX.Element {
  const activeOffers = tradeOffers.activeOffers.filter((o) => o.status === 'pending');

  const handleAccept = (offer: AITradeOffer) => {
    Alert.alert('Accept Trade', `Accept trade with ${offer.offeringTeamName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: () => onAccept(offer.id) },
    ]);
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
        <Text style={styles.headerTitle}>Trade Offers</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {activeOffers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="swap-horizontal" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No Active Offers</Text>
            <Text style={styles.emptyText}>
              AI teams may send you trade proposals during the season (weeks 1-12). Check back each
              week!
            </Text>
          </View>
        ) : (
          activeOffers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              {/* Header */}
              <View style={styles.offerHeader}>
                <Text style={styles.offerTeam}>{offer.offeringTeamName}</Text>
                <View
                  style={[
                    styles.fairnessBadge,
                    { backgroundColor: getFairnessColor(offer.fairnessScore) + '20' },
                  ]}
                >
                  <Text
                    style={[styles.fairnessText, { color: getFairnessColor(offer.fairnessScore) }]}
                  >
                    {getFairnessLabel(offer.fairnessScore)}
                  </Text>
                </View>
              </View>

              <Text style={styles.motivation}>{offer.motivation}</Text>

              {/* What they offer */}
              <View style={styles.assetSection}>
                <Text style={styles.assetSectionTitle}>They Offer:</Text>
                {offer.offering.map((asset, i) => (
                  <AssetDisplay key={i} asset={asset} />
                ))}
              </View>

              {/* What they want */}
              <View style={styles.assetSection}>
                <Text style={styles.assetSectionTitle}>They Want:</Text>
                {offer.requesting.map((asset, i) => (
                  <AssetDisplay key={i} asset={asset} />
                ))}
              </View>

              {/* Expiration */}
              <Text style={styles.expirationText}>Expires: Week {offer.expiresWeek}</Text>

              {/* Actions */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => onReject(offer.id)}
                  accessibilityLabel="Reject trade"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={20} color={colors.error} />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAccept(offer)}
                  accessibilityLabel="Accept trade"
                  accessibilityRole="button"
                >
                  <Ionicons name="checkmark" size={20} color={colors.textOnPrimary} />
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Recent trade history */}
        {tradeOffers.offerHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>Recent History</Text>
            {tradeOffers.offerHistory.slice(-5).map((offer) => (
              <View key={offer.id} style={styles.historyItem}>
                <Text style={styles.historyTeam}>{offer.offeringTeamName}</Text>
                <Text
                  style={[
                    styles.historyStatus,
                    {
                      color:
                        offer.status === 'accepted'
                          ? colors.success
                          : offer.status === 'rejected'
                            ? colors.error
                            : colors.textSecondary,
                    },
                  ]}
                >
                  {offer.status.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
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
  scrollView: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxxl, gap: spacing.md },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  offerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  offerTeam: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  fairnessBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  fairnessText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  motivation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  assetSection: { marginBottom: spacing.md },
  assetSectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  assetInfo: { flex: 1 },
  assetName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  assetDetail: { fontSize: fontSize.xs, color: colors.textSecondary },
  expirationText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.error,
    minHeight: accessibility.minTouchTarget,
  },
  rejectText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success,
    minHeight: accessibility.minTouchTarget,
  },
  acceptText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  historySection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  historySectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyTeam: { fontSize: fontSize.sm, color: colors.text },
  historyStatus: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});

export default TradeOffersScreen;
