/**
 * TradeOfferCard Component
 * Displays a trade offer with picks and/or players involved.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../styles';

export interface TradeAsset {
  /** Type of asset */
  type: 'pick' | 'player';
  /** Display label (e.g., "2024 1st Round Pick" or "John Smith, QB") */
  label: string;
  /** Additional info (e.g., "#12 overall" or "Age 24") */
  detail?: string;
  /** Value indicator (for picks: projected position, for players: tier) */
  value?: string;
}

export interface TradeOfferCardProps {
  /** Unique trade ID */
  tradeId: string;
  /** Team proposing the trade */
  proposingTeam: {
    name: string;
    abbr: string;
  };
  /** Assets the proposing team is offering */
  offering: TradeAsset[];
  /** Assets the proposing team wants in return */
  requesting: TradeAsset[];
  /** Whether this is an incoming offer (to user) */
  isIncoming: boolean;
  /** Trade status */
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  /** Time remaining to respond (seconds) */
  expiresIn?: number;
  /** Callback to accept the trade */
  onAccept?: () => void;
  /** Callback to reject the trade */
  onReject?: () => void;
  /** Callback to counter the trade */
  onCounter?: () => void;
  /** Callback when card is pressed */
  onPress?: () => void;
}

/**
 * Format expiry time
 */
function formatExpiry(seconds: number): string {
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h remaining`;
  }
  const mins = Math.floor(seconds / 60);
  return `${mins}m remaining`;
}

/**
 * Get status color
 */
function getStatusColor(status: TradeOfferCardProps['status']): string {
  switch (status) {
    case 'accepted':
      return colors.success;
    case 'rejected':
      return colors.error;
    case 'countered':
      return colors.info;
    case 'expired':
      return colors.textLight;
    default:
      return colors.warning;
  }
}

/**
 * Asset list item
 */
function AssetItem({ asset }: { asset: TradeAsset }): React.JSX.Element {
  return (
    <View style={styles.assetItem}>
      <View style={styles.assetIcon}>
        <Text style={styles.assetIconText}>
          {asset.type === 'pick' ? 'P' : 'PL'}
        </Text>
      </View>
      <View style={styles.assetInfo}>
        <Text style={styles.assetLabel}>{asset.label}</Text>
        {asset.detail && (
          <Text style={styles.assetDetail}>{asset.detail}</Text>
        )}
      </View>
      {asset.value && (
        <View style={styles.assetValue}>
          <Text style={styles.assetValueText}>{asset.value}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * TradeOfferCard Component
 */
export function TradeOfferCard({
  tradeId: _tradeId,
  proposingTeam,
  offering,
  requesting,
  isIncoming,
  status,
  expiresIn,
  onAccept,
  onReject,
  onCounter,
  onPress,
}: TradeOfferCardProps): React.JSX.Element {
  const statusColor = getStatusColor(status);
  const isPending = status === 'pending';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={!onPress}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.teamBadge}>
          <Text style={styles.teamAbbr}>{proposingTeam.abbr}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.teamName}>{proposingTeam.name}</Text>
          <Text style={styles.tradeDirection}>
            {isIncoming ? 'offers you a trade' : 'Trade Proposal'}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {status.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Trade Content */}
      <View style={styles.tradeContent}>
        {/* You receive */}
        <View style={styles.tradeColumn}>
          <Text style={styles.columnHeader}>
            {isIncoming ? 'You Receive' : 'They Receive'}
          </Text>
          {(isIncoming ? offering : requesting).map((asset, index) => (
            <AssetItem key={`receive-${index}`} asset={asset} />
          ))}
        </View>

        {/* Divider */}
        <View style={styles.tradeDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>FOR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* You give */}
        <View style={styles.tradeColumn}>
          <Text style={styles.columnHeader}>
            {isIncoming ? 'You Give' : 'They Give'}
          </Text>
          {(isIncoming ? requesting : offering).map((asset, index) => (
            <AssetItem key={`give-${index}`} asset={asset} />
          ))}
        </View>
      </View>

      {/* Expiry */}
      {isPending && expiresIn !== undefined && (
        <View style={styles.expiryRow}>
          <Text style={[styles.expiryText, expiresIn < 300 && styles.expiryUrgent]}>
            {formatExpiry(expiresIn)}
          </Text>
        </View>
      )}

      {/* Actions for incoming pending trades */}
      {isIncoming && isPending && (onAccept || onReject || onCounter) && (
        <View style={styles.actionsRow}>
          {onReject && (
            <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
              <Text style={styles.rejectButtonText}>Decline</Text>
            </TouchableOpacity>
          )}
          {onCounter && (
            <TouchableOpacity style={styles.counterButton} onPress={onCounter}>
              <Text style={styles.counterButtonText}>Counter</Text>
            </TouchableOpacity>
          )}
          {onAccept && (
            <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  teamBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAbbr: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  headerInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  teamName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  tradeDirection: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  tradeContent: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  tradeColumn: {
    marginBottom: spacing.sm,
  },
  columnHeader: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  assetIcon: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetIconText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  assetInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  assetLabel: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  assetDetail: {
    fontSize: fontSize.xs,
    color: colors.textLight,
  },
  assetValue: {
    backgroundColor: colors.info + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  assetValueText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.info,
  },
  tradeDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
  },
  expiryRow: {
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expiryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  expiryUrgent: {
    color: colors.error,
    fontWeight: fontWeight.bold,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rejectButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  rejectButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  counterButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.info,
  },
  counterButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textOnPrimary,
  },
  acceptButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.success,
  },
  acceptButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textOnPrimary,
  },
});

export default TradeOfferCard;
