/**
 * RFAScreen
 * Manages Restricted Free Agent tenders and offer sheets
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { showAlert, showConfirm } from '../utils/alert';
import { colors, spacing, fontSize, fontWeight, borderRadius, accessibility } from '../styles';
import { ScreenHeader } from '../components';
import { GameState } from '../core/models/game/GameState';
import { Avatar } from '../components/avatar';
import { Position } from '../core/models/player/Position';
import {
  TenderLevel,
  ERFATenderLevel,
  TenderOffer,
  OfferSheet,
  calculateTenderValue,
  getTenderDraftCompensation,
} from '../core/freeAgency/RFATenderSystem';

/**
 * Props for RFAScreen
 */
export interface RFAScreenProps {
  gameState: GameState;
  eligibleRFAs: RFAPlayerView[];
  activeTenders: TenderOffer[];
  offerSheets: OfferSheet[];
  incomingOffers: OfferSheet[];
  salaryCap: number;
  onBack: () => void;
  onSubmitTender?: (playerId: string, level: TenderLevel | ERFATenderLevel) => void;
  onWithdrawTender?: (tenderId: string) => void;
  onMatchOffer?: (offerSheetId: string) => void;
  onDeclineOffer?: (offerSheetId: string) => void;
  onSubmitOfferSheet?: (playerId: string, offer: OfferSheetInput) => void;
  onPlayerSelect?: (playerId: string) => void;
}

/**
 * RFA player view
 */
export interface RFAPlayerView {
  playerId: string;
  playerName: string;
  position: Position;
  age: number;
  experience: number;
  draftRound: number;
  currentStatus: 'untokendered' | 'tendered' | 'offer_sheet_received';
  recommendedTender: TenderLevel;
}

/**
 * Offer sheet input
 */
export interface OfferSheetInput {
  years: number;
  totalValue: number;
  guaranteed: number;
}

type TabType = 'eligible' | 'tenders' | 'offer_sheets' | 'incoming';

const TENDER_LEVELS: (TenderLevel | ERFATenderLevel)[] = [
  'first_round',
  'second_round',
  'original_round',
  'right_of_first_refusal',
  'exclusive_rights',
];

/**
 * Get tender level display name
 */
function getTenderLabel(level: TenderLevel | ERFATenderLevel): string {
  const labels: Record<TenderLevel | ERFATenderLevel, string> = {
    first_round: '1st Round',
    second_round: '2nd Round',
    original_round: 'Original Round',
    right_of_first_refusal: 'ROFR',
    exclusive_rights: 'ERFA',
  };
  return labels[level];
}

/**
 * Get tender level color
 */
function getTenderColor(level: TenderLevel | ERFATenderLevel): string {
  const tenderColors: Record<TenderLevel | ERFATenderLevel, string> = {
    first_round: '#FFD700',
    second_round: colors.success,
    original_round: colors.primary,
    right_of_first_refusal: colors.warning,
    exclusive_rights: colors.textSecondary,
  };
  return tenderColors[level];
}

/**
 * Get status color
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'tendered':
      return colors.success;
    case 'pending':
      return colors.warning;
    case 'matched':
      return colors.primary;
    case 'not_matched':
    case 'expired':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

/**
 * Format salary
 */
function formatSalary(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}

/**
 * Eligible RFA card
 */
function EligibleRFACard({
  player,
  salaryCap,
  onTender,
  onPress,
}: {
  player: RFAPlayerView;
  salaryCap: number;
  onTender: (level: TenderLevel | ERFATenderLevel) => void;
  onPress: () => void;
}): React.JSX.Element {
  const [showTenderOptions, setShowTenderOptions] = useState(false);

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={onPress}>
        <Avatar id={player.playerId} size="sm" age={player.age} context="player" />
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{player.playerName}</Text>
          <Text style={styles.playerDetails}>
            {player.position} • Age {player.age} • {player.experience} yrs exp
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Draft Round:</Text>
          <Text style={styles.infoValue}>Round {player.draftRound}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Recommended:</Text>
          <View
            style={[
              styles.tenderBadge,
              { backgroundColor: getTenderColor(player.recommendedTender) + '20' },
            ]}
          >
            <Text
              style={[styles.tenderBadgeText, { color: getTenderColor(player.recommendedTender) }]}
            >
              {getTenderLabel(player.recommendedTender)}
            </Text>
          </View>
        </View>
      </View>

      {showTenderOptions ? (
        <View style={styles.tenderOptions}>
          <Text style={styles.tenderOptionsTitle}>Select Tender Level</Text>
          {TENDER_LEVELS.map((level) => {
            const cost =
              level === 'exclusive_rights' ? 795000 : calculateTenderValue(level, salaryCap);
            const compensation = getTenderDraftCompensation(level as TenderLevel);

            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.tenderOption,
                  { borderColor: getTenderColor(level) },
                  level === player.recommendedTender && styles.recommendedOption,
                ]}
                onPress={() => {
                  onTender(level);
                  setShowTenderOptions(false);
                }}
              >
                <View style={styles.tenderOptionInfo}>
                  <Text style={[styles.tenderOptionName, { color: getTenderColor(level) }]}>
                    {getTenderLabel(level)}
                  </Text>
                  <Text style={styles.tenderOptionCost}>{formatSalary(cost)}</Text>
                </View>
                <Text style={styles.tenderOptionComp}>
                  {compensation || 'No compensation required'}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.cancelButton} onPress={() => setShowTenderOptions(false)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.tenderButton} onPress={() => setShowTenderOptions(true)}>
            <Text style={styles.tenderButtonText}>Submit Tender</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * Active tender card
 */
function TenderCard({
  tender,
  onWithdraw,
  onPress,
}: {
  tender: TenderOffer;
  onWithdraw: () => void;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={onPress}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{tender.playerName}</Text>
          <Text style={styles.playerDetails}>Tender Year: {tender.year}</Text>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: getStatusColor(tender.status) + '20' }]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(tender.status) }]}>
            {tender.status.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tender Level:</Text>
          <View
            style={[styles.tenderBadge, { backgroundColor: getTenderColor(tender.level) + '20' }]}
          >
            <Text style={[styles.tenderBadgeText, { color: getTenderColor(tender.level) }]}>
              {getTenderLabel(tender.level)}
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Salary:</Text>
          <Text style={styles.infoValue}>{formatSalary(tender.salaryAmount)}</Text>
        </View>
        {tender.draftCompensation && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Compensation:</Text>
            <Text style={styles.infoValue}>{tender.draftCompensation}</Text>
          </View>
        )}
      </View>

      {tender.status === 'active' && (
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.withdrawButton} onPress={onWithdraw}>
            <Text style={styles.withdrawButtonText}>Withdraw Tender</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * Offer sheet card
 */
function OfferSheetCard({
  offerSheet,
  type,
  onMatch,
  onDecline,
  onPress,
}: {
  offerSheet: OfferSheet;
  type: 'incoming' | 'outgoing';
  onMatch?: () => void;
  onDecline?: () => void;
  onPress: () => void;
}): React.JSX.Element {
  const daysRemaining = Math.max(
    0,
    Math.ceil((offerSheet.matchDeadline - Date.now()) / (24 * 60 * 60 * 1000))
  );

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={onPress}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>Player #{offerSheet.rfaPlayerId.slice(-6)}</Text>
          <Text style={styles.playerDetails}>
            {type === 'incoming' ? 'From:' : 'To:'} Team{' '}
            {type === 'incoming' ? offerSheet.offeringTeamId : offerSheet.originalTeamId}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(offerSheet.status) + '20' },
          ]}
        >
          <Text style={[styles.statusText, { color: getStatusColor(offerSheet.status) }]}>
            {offerSheet.status.toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Contract:</Text>
          <Text style={styles.infoValue}>
            {offerSheet.offer.years}yr /{' '}
            {formatSalary(
              offerSheet.offer.totalValue ??
                (offerSheet.offer.bonusPerYear + offerSheet.offer.salaryPerYear) *
                  offerSheet.offer.years
            )}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Guaranteed:</Text>
          <Text style={styles.infoValue}>
            {formatSalary(
              offerSheet.offer.guaranteedMoney ??
                offerSheet.offer.bonusPerYear * offerSheet.offer.years
            )}
          </Text>
        </View>
        {offerSheet.status === 'pending' && (
          <View style={styles.deadlineRow}>
            <Text style={styles.deadlineLabel}>Time to Match:</Text>
            <Text style={[styles.deadlineValue, daysRemaining <= 2 && { color: colors.error }]}>
              {daysRemaining} days
            </Text>
          </View>
        )}
      </View>

      {type === 'incoming' && offerSheet.status === 'pending' && (
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.matchButton} onPress={onMatch}>
            <Text style={styles.matchButtonText}>Match Offer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Text style={styles.declineButtonText}>Let Go</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

/**
 * RFA Screen Component
 */
export function RFAScreen({
  eligibleRFAs,
  activeTenders,
  offerSheets,
  incomingOffers,
  salaryCap,
  onBack,
  onSubmitTender,
  onWithdrawTender,
  onMatchOffer,
  onDeclineOffer,
  onPlayerSelect,
}: RFAScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('eligible');

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: 'eligible', label: 'Eligible', count: eligibleRFAs.length },
    { key: 'tenders', label: 'Tenders', count: activeTenders.length },
    { key: 'offer_sheets', label: 'My Offers', count: offerSheets.length },
    { key: 'incoming', label: 'Incoming', count: incomingOffers.length },
  ];

  const handleSubmitTender = (playerId: string, level: TenderLevel | ERFATenderLevel) => {
    if (onSubmitTender) {
      onSubmitTender(playerId, level);
      showAlert('Tender Submitted', `Tender has been submitted for this player.`);
    }
  };

  const handleWithdrawTender = (tenderId: string) => {
    showConfirm(
      'Withdraw Tender',
      'Are you sure you want to withdraw this tender?',
      () => onWithdrawTender?.(tenderId)
    );
  };

  const handleMatchOffer = (offerSheetId: string) => {
    showConfirm(
      'Match Offer',
      'Do you want to match this offer sheet?',
      () => onMatchOffer?.(offerSheetId)
    );
  };

  const handleDeclineOffer = (offerSheetId: string) => {
    showConfirm(
      'Decline Offer',
      'Are you sure? The player will sign with the other team.',
      () => onDeclineOffer?.(offerSheetId)
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <ScreenHeader title="RFA Management" onBack={onBack} testID="rfa-header" />

      {/* Salary Cap Info */}
      <View style={styles.capInfo}>
        <Text style={styles.capLabel}>Salary Cap</Text>
        <Text style={styles.capValue}>{formatSalary(salaryCap)}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer} accessibilityRole="tablist">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
            accessibilityLabel={`${tab.label}${tab.count > 0 ? `, ${tab.count} items` : ''}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
            hitSlop={accessibility.hitSlop}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'eligible' && (
          <>
            {eligibleRFAs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Eligible RFAs</Text>
                <Text style={styles.emptySubtext}>
                  Players with 3 or fewer accrued seasons become restricted free agents
                </Text>
              </View>
            ) : (
              eligibleRFAs.map((player) => (
                <EligibleRFACard
                  key={player.playerId}
                  player={player}
                  salaryCap={salaryCap}
                  onTender={(level) => handleSubmitTender(player.playerId, level)}
                  onPress={() => onPlayerSelect?.(player.playerId)}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'tenders' && (
          <>
            {activeTenders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Active Tenders</Text>
                <Text style={styles.emptySubtext}>
                  Submit tenders to protect your restricted free agents
                </Text>
              </View>
            ) : (
              activeTenders.map((tender) => (
                <TenderCard
                  key={tender.id}
                  tender={tender}
                  onWithdraw={() => handleWithdrawTender(tender.id)}
                  onPress={() => onPlayerSelect?.(tender.playerId)}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'offer_sheets' && (
          <>
            {offerSheets.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Offer Sheets</Text>
                <Text style={styles.emptySubtext}>
                  Submit offer sheets to sign other teams' restricted free agents
                </Text>
              </View>
            ) : (
              offerSheets.map((offer) => (
                <OfferSheetCard
                  key={offer.id}
                  offerSheet={offer}
                  type="outgoing"
                  onPress={() => onPlayerSelect?.(offer.rfaPlayerId)}
                />
              ))
            )}
          </>
        )}

        {activeTab === 'incoming' && (
          <>
            {incomingOffers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Incoming Offers</Text>
                <Text style={styles.emptySubtext}>
                  Other teams haven't made offer sheets to your RFAs yet
                </Text>
              </View>
            ) : (
              incomingOffers.map((offer) => (
                <OfferSheetCard
                  key={offer.id}
                  offerSheet={offer}
                  type="incoming"
                  onMatch={() => handleMatchOffer(offer.id)}
                  onDecline={() => handleDeclineOffer(offer.id)}
                  onPress={() => onPlayerSelect?.(offer.rfaPlayerId)}
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
  capInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  capLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  capValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
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
  countBadge: {
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  countText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  playerDetails: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  cardBody: {
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  tenderBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  tenderBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  deadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deadlineLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  deadlineValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.warning,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tenderButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  tenderButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.background,
  },
  withdrawButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  withdrawButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  matchButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.success,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  matchButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.background,
  },
  declineButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: colors.error + '20',
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  tenderOptions: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tenderOptionsTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  tenderOption: {
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  recommendedOption: {
    backgroundColor: colors.primary + '10',
    borderWidth: 2,
  },
  tenderOptionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tenderOptionName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  tenderOptionCost: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  tenderOptionComp: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default RFAScreen;
