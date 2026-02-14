/**
 * DraftRoomScreen
 * Draft room interface with stacked single-screen layout.
 * All critical info visible at once — no tabs, no hidden interactions.
 *
 * BRAND GUIDELINES:
 * - NO overall rating anywhere
 * - Focus on projected picks and user evaluation
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
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
import { ScreenHeader } from '../components';
import { Position, OFFENSIVE_POSITIONS, DEFENSIVE_POSITIONS } from '../core/models/player/Position';
import { type TradeAsset } from '../components/draft';
import { DraftLetterGrade, WarRoomFeedEvent } from '../core/draft/DraftDayNarrator';
import { getGradeColor } from '../utils/draftGradeUtils';

/**
 * Draft pick information
 */
export interface DraftPick {
  round: number;
  pickNumber: number;
  teamId: string;
  teamName: string;
  teamAbbr: string;
  originalTeamId?: string;
  originalTeamAbbr?: string;
  selectedProspectId?: string;
  selectedProspectName?: string;
}

/**
 * Trade offer
 */
export interface TradeOffer {
  tradeId: string;
  proposingTeam: {
    id: string;
    name: string;
    abbr: string;
  };
  offering: TradeAsset[];
  requesting: TradeAsset[];
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  expiresIn?: number;
}

/**
 * Simple prospect for draft room list
 */
export interface DraftRoomProspect {
  id: string;
  name: string;
  position: Position;
  collegeName: string;
  projectedRound: number | null;
  projectedPickRange: { min: number; max: number } | null;
  userTier: string | null;
  flagged: boolean;
  positionRank: number | null;
  overallRank: number | null;
  isDrafted: boolean;
}

/**
 * Scout recommendation for display in draft room
 */
export interface ScoutRecommendationDisplay {
  scoutName: string;
  scoutRole: string;
  prospectId: string;
  prospectName: string;
  prospectPosition: string;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  isFocusBased: boolean;
  estimatedOverall: { min: number; max: number } | null;
}

/**
 * User's drafted pick with grade info
 */
export interface UserDraftedPick {
  pickNumber: number;
  round: number;
  prospectName: string;
  prospectPosition: Position;
  grade: DraftLetterGrade;
  assessment: string;
}

/**
 * Position filter type
 */
type PositionFilter = 'ALL' | 'OFF' | 'DEF' | Position;

/**
 * Props for DraftRoomScreen
 */
export interface DraftRoomScreenProps {
  currentPick: DraftPick;
  userTeamId: string;
  recentPicks: DraftPick[];
  upcomingPicks: DraftPick[];
  availableProspects: DraftRoomProspect[];
  tradeOffers: TradeOffer[];
  autoPickEnabled: boolean;
  timeRemaining?: number;
  isPaused: boolean;
  scoutRecommendations?: ScoutRecommendationDisplay[];
  feedEvents?: WarRoomFeedEvent[];
  selectedProspectId?: string | null;
  currentRound?: number;
  totalPicks?: number;
  picksCompleted?: number;
  userDraftedPicks?: UserDraftedPick[];
  teamNeeds?: Position[];
  onHighlightProspect?: (id: string | null) => void;
  onDraftSelectedProspect?: () => void;
  onSelectProspect: (prospectId: string) => void;
  onViewProspect: (prospectId: string) => void;
  onAcceptTrade: (tradeId: string) => void;
  onRejectTrade: (tradeId: string) => void;
  onCounterTrade: (tradeId: string) => void;
  onProposeTrade: () => void;
  onToggleAutoPick: () => void;
  onTogglePause: () => void;
  onSkipToMyPick?: () => void;
  onBack?: () => void;
}

// =============================================
// Sub-components (inline)
// =============================================

/** Compact banner showing current pick, timer, and progress */
function CompactPickBanner({
  pick,
  isUserPick,
  timeRemaining,
  currentRound,
  picksCompleted,
  totalPicks,
}: {
  pick: DraftPick;
  isUserPick: boolean;
  timeRemaining?: number;
  currentRound?: number;
  picksCompleted?: number;
  totalPicks?: number;
}) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isLowTime = timeRemaining !== undefined && timeRemaining <= 30;

  return (
    <View style={[s.pickBanner, isUserPick ? s.pickBannerUser : s.pickBannerAI]}>
      <View style={s.pickBannerLeft}>
        <Text style={s.pickBannerLabel}>{isUserPick ? 'ON THE CLOCK' : 'NOW PICKING'}</Text>
        <View style={s.pickBannerTeamRow}>
          <Text style={s.pickBannerTeam}>[{pick.teamAbbr}]</Text>
          <Text style={s.pickBannerPick}>Pick #{pick.pickNumber}</Text>
        </View>
        {isUserPick && <Text style={s.pickBannerHint}>YOUR PICK — Select a player below</Text>}
      </View>
      <View style={s.pickBannerRight}>
        {timeRemaining !== undefined && (
          <Text style={[s.pickBannerTimer, isLowTime && s.pickBannerTimerLow]}>
            {formatTime(timeRemaining)}
          </Text>
        )}
        <Text style={s.pickBannerProgress}>
          Rd {currentRound ?? pick.round} | {picksCompleted ?? 0}/{totalPicks ?? 224}
        </Text>
      </View>
    </View>
  );
}

/** Dismissible trade offer banner */
function TradeOfferBanner({
  offer,
  onAccept,
  onReject,
}: {
  offer: TradeOffer;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <View style={s.tradeBanner}>
      <Ionicons name="swap-horizontal" size={16} color={colors.info} />
      <View style={s.tradeBannerInfo}>
        <Text style={s.tradeBannerText} numberOfLines={1}>
          TRADE from {offer.proposingTeam.abbr} — Wants{' '}
          {offer.requesting.map((r) => r.label).join(', ')}
        </Text>
        <Text style={s.tradeBannerDetail} numberOfLines={1}>
          Offers: {offer.offering.map((o) => o.label).join(', ')}
        </Text>
      </View>
      <TouchableOpacity
        style={s.tradeBannerAccept}
        onPress={onAccept}
        accessibilityLabel={`Accept trade from ${offer.proposingTeam.abbr}`}
        accessibilityRole="button"
        hitSlop={accessibility.hitSlop}
      >
        <Text style={s.tradeBannerAcceptText}>Accept</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={s.tradeBannerReject}
        onPress={onReject}
        accessibilityLabel={`Reject trade from ${offer.proposingTeam.abbr}`}
        accessibilityRole="button"
        hitSlop={accessibility.hitSlop}
      >
        <Ionicons name="close" size={18} color={colors.error} />
      </TouchableOpacity>
    </View>
  );
}

/** Horizontal strip of user's drafted picks with grade badges */
function UserDraftClassStrip({
  picks,
  currentPickNumber,
}: {
  picks: UserDraftedPick[];
  currentPickNumber: number;
}) {
  if (picks.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.draftClassStrip}
      contentContainerStyle={s.draftClassStripContent}
    >
      {picks.map((p, i) => (
        <View key={`udp-${i}`} style={s.draftClassChip}>
          <View style={[s.draftClassGrade, { backgroundColor: getGradeColor(p.grade) + '22' }]}>
            <Text style={[s.draftClassGradeText, { color: getGradeColor(p.grade) }]}>
              {p.grade}
            </Text>
          </View>
          <Text style={s.draftClassName} numberOfLines={1}>
            Rd{p.round}#{p.pickNumber}
          </Text>
          <Text style={s.draftClassPos}>{p.prospectPosition}</Text>
          <Text style={s.draftClassName2} numberOfLines={1}>
            {p.prospectName.split(' ').pop()}
          </Text>
        </View>
      ))}
      <View style={s.draftClassChipCurrent}>
        <Text style={s.draftClassCurrentText}>#{currentPickNumber}</Text>
        <Text style={s.draftClassCurrentLabel}>NOW</Text>
      </View>
    </ScrollView>
  );
}

/** Tappable team needs badges that double as position filters */
function TeamNeedsBar({
  needs,
  activeFilter,
  onFilterPress,
}: {
  needs: Position[];
  activeFilter: PositionFilter;
  onFilterPress: (pos: PositionFilter) => void;
}) {
  if (needs.length === 0) return null;

  return (
    <View style={s.needsBar}>
      <Text style={s.needsLabel}>NEEDS:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {needs.slice(0, 8).map((pos) => {
          const isActive = activeFilter === pos;
          return (
            <TouchableOpacity
              key={pos}
              style={[s.needsChip, isActive && s.needsChipActive]}
              onPress={() => onFilterPress(isActive ? 'ALL' : pos)}
              accessibilityLabel={`Filter by ${pos}${isActive ? ', currently active' : ''}`}
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Text style={[s.needsChipText, isActive && s.needsChipTextActive]}>{pos}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Position filter chips: ALL | OFF | DEF | individual positions */
function PositionFilterBar({
  activeFilter,
  onFilterPress,
  showFlaggedOnly,
  onToggleFlagged,
}: {
  activeFilter: PositionFilter;
  onFilterPress: (pos: PositionFilter) => void;
  showFlaggedOnly: boolean;
  onToggleFlagged: () => void;
}) {
  const groups: PositionFilter[] = ['ALL', 'OFF', 'DEF'];
  const positions: Position[] = [
    Position.QB,
    Position.WR,
    Position.RB,
    Position.TE,
    Position.CB,
    Position.DE,
    Position.OLB,
    Position.DT,
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={s.filterBar}
      contentContainerStyle={s.filterBarContent}
    >
      {groups.map((g) => (
        <TouchableOpacity
          key={g}
          style={[s.filterChip, activeFilter === g && s.filterChipActive]}
          onPress={() => onFilterPress(g)}
          accessibilityLabel={`Filter ${g}`}
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[s.filterChipText, activeFilter === g && s.filterChipTextActive]}>{g}</Text>
        </TouchableOpacity>
      ))}
      <View style={s.filterDivider} />
      {positions.map((p) => (
        <TouchableOpacity
          key={p}
          style={[s.filterChip, activeFilter === p && s.filterChipActive]}
          onPress={() => onFilterPress(activeFilter === p ? 'ALL' : p)}
          accessibilityLabel={`Filter by ${p}`}
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Text style={[s.filterChipText, activeFilter === p && s.filterChipTextActive]}>{p}</Text>
        </TouchableOpacity>
      ))}
      <View style={s.filterDivider} />
      <TouchableOpacity
        style={[s.filterChip, showFlaggedOnly && s.filterChipFlagged]}
        onPress={onToggleFlagged}
        accessibilityLabel={`Show ${showFlaggedOnly ? 'all' : 'flagged only'}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: showFlaggedOnly }}
        hitSlop={accessibility.hitSlop}
      >
        <Ionicons
          name={showFlaggedOnly ? 'star' : 'star-outline'}
          size={12}
          color={showFlaggedOnly ? colors.secondary : colors.textSecondary}
        />
        <Text style={[s.filterChipText, showFlaggedOnly && { color: colors.secondary }]}>
          Flagged
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/** Collapsible one-liner showing top scout recommendation */
function ScoutRecBar({
  recommendations,
  onViewProspect,
}: {
  recommendations: ScoutRecommendationDisplay[];
  onViewProspect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (recommendations.length === 0) return null;

  const top = recommendations[0];

  return (
    <View style={s.scoutBar}>
      <TouchableOpacity
        style={s.scoutBarRow}
        onPress={() => setExpanded(!expanded)}
        accessibilityLabel={`Scout recommendation: ${top.prospectName}`}
        accessibilityRole="button"
        hitSlop={accessibility.hitSlop}
      >
        <Ionicons name="eye" size={14} color={colors.primary} />
        <Text style={s.scoutBarText} numberOfLines={1}>
          SCOUT: "{top.prospectName}, {top.prospectPosition}" — {top.scoutName}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textLight}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={s.scoutBarExpanded}>
          {recommendations.slice(0, 3).map((rec, idx) => (
            <TouchableOpacity
              key={`sr-${idx}`}
              style={s.scoutBarItem}
              onPress={() => onViewProspect(rec.prospectId)}
              accessibilityLabel={`View ${rec.prospectName}`}
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <View style={s.scoutBarItemLeft}>
                <Text style={s.scoutBarItemName}>{rec.prospectName}</Text>
                <Text style={s.scoutBarItemPos}>{rec.prospectPosition}</Text>
              </View>
              <Text style={s.scoutBarItemReason} numberOfLines={1}>
                {rec.reasoning}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

/** Single row for a draftable prospect with explicit Select button */
function DraftableProspectRow({
  prospect,
  isSelected,
  isUserPick,
  onSelect,
  onView,
}: {
  prospect: DraftRoomProspect;
  isSelected: boolean;
  isUserPick: boolean;
  onSelect: () => void;
  onView: () => void;
}) {
  const pickRange = prospect.projectedPickRange
    ? `#${prospect.projectedPickRange.min}-${prospect.projectedPickRange.max}`
    : prospect.projectedRound
      ? `Rd ${prospect.projectedRound}`
      : '--';

  return (
    <TouchableOpacity
      style={[s.prospectRow, isSelected && s.prospectRowSelected]}
      onPress={onView}
      accessibilityLabel={`${prospect.name}, ${prospect.position}, ${prospect.collegeName}`}
      accessibilityRole="button"
      hitSlop={{ top: 2, bottom: 2, left: 0, right: 0 }}
    >
      <Text style={s.prospectRank}>#{prospect.overallRank ?? '--'}</Text>
      <View style={s.prospectInfo}>
        <View style={s.prospectNameRow}>
          <Text style={s.prospectName} numberOfLines={1}>
            {prospect.name}
          </Text>
          {prospect.flagged && <Ionicons name="star" size={12} color={colors.secondary} />}
        </View>
        <View style={s.prospectMetaRow}>
          <Text style={s.prospectPos}>{prospect.position}</Text>
          <Text style={s.prospectCollege} numberOfLines={1}>
            {prospect.collegeName}
          </Text>
          <Text style={s.prospectRange}>{pickRange}</Text>
        </View>
      </View>
      {isUserPick && (
        <TouchableOpacity
          style={[s.selectBtn, isSelected && s.selectBtnSelected]}
          onPress={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          accessibilityLabel={`Select ${prospect.name}`}
          accessibilityRole="button"
          hitSlop={accessibility.hitSlop}
        >
          <Ionicons
            name={isSelected ? 'checkmark' : 'add'}
            size={18}
            color={isSelected ? colors.textOnPrimary : colors.primary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

/** Large green DRAFT button anchored to bottom */
function DraftActionButton({
  prospectName,
  prospectPosition,
  onDraft,
}: {
  prospectName: string;
  prospectPosition: string;
  onDraft: () => void;
}) {
  return (
    <View style={s.draftActionContainer}>
      <TouchableOpacity
        style={s.draftActionBtn}
        onPress={onDraft}
        accessibilityLabel={`Draft ${prospectName}, ${prospectPosition}`}
        accessibilityRole="button"
        hitSlop={accessibility.hitSlop}
      >
        <Text style={s.draftActionText}>
          DRAFT {prospectName.toUpperCase()}, {prospectPosition}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// =============================================
// Main Component
// =============================================

export function DraftRoomScreen({
  currentPick,
  userTeamId,
  availableProspects,
  tradeOffers,
  autoPickEnabled: _autoPickEnabled,
  timeRemaining,
  isPaused,
  scoutRecommendations = [],
  feedEvents: _feedEvents = [],
  selectedProspectId,
  currentRound,
  totalPicks,
  picksCompleted,
  userDraftedPicks = [],
  teamNeeds = [],
  onHighlightProspect,
  onDraftSelectedProspect,
  onSelectProspect: _onSelectProspect,
  onViewProspect,
  onAcceptTrade,
  onRejectTrade,
  onToggleAutoPick: _onToggleAutoPick,
  onTogglePause,
  onSkipToMyPick,
  onBack,
}: DraftRoomScreenProps): React.JSX.Element {
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL');
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  const isUserPick = currentPick.teamId === userTeamId;
  const pendingTradeOffers = (tradeOffers ?? []).filter((t) => t.status === 'pending');

  // Find selected prospect details
  const selectedProspect = selectedProspectId
    ? availableProspects.find((p) => p.id === selectedProspectId)
    : null;

  // Filter prospects
  const filteredProspects = useMemo(() => {
    let result = availableProspects.filter((p) => !p.isDrafted);

    if (showFlaggedOnly) {
      result = result.filter((p) => p.flagged);
    }

    if (positionFilter !== 'ALL') {
      if (positionFilter === 'OFF') {
        result = result.filter((p) => OFFENSIVE_POSITIONS.includes(p.position));
      } else if (positionFilter === 'DEF') {
        result = result.filter((p) => DEFENSIVE_POSITIONS.includes(p.position));
      } else {
        result = result.filter((p) => p.position === positionFilter);
      }
    }

    return result.slice(0, 40);
  }, [availableProspects, showFlaggedOnly, positionFilter]);

  // Handle prospect selection (highlight for drafting)
  const handleHighlight = useCallback(
    (id: string) => {
      if (onHighlightProspect) {
        onHighlightProspect(selectedProspectId === id ? null : id);
      }
    },
    [onHighlightProspect, selectedProspectId]
  );

  // Render prospect row
  const renderProspect = useCallback(
    ({ item }: { item: DraftRoomProspect }) => (
      <DraftableProspectRow
        prospect={item}
        isSelected={item.id === selectedProspectId}
        isUserPick={isUserPick}
        onSelect={() => handleHighlight(item.id)}
        onView={() => onViewProspect(item.id)}
      />
    ),
    [selectedProspectId, isUserPick, handleHighlight, onViewProspect]
  );

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <ScreenHeader
        title="DRAFT ROOM"
        onBack={onBack}
        rightAction={{
          icon: isPaused ? 'play' : 'pause',
          onPress: onTogglePause,
          accessibilityLabel: isPaused ? 'Resume draft' : 'Pause draft',
        }}
        testID="draft-room-header"
      />

      {/* Compact Pick Banner */}
      <CompactPickBanner
        pick={currentPick}
        isUserPick={isUserPick}
        timeRemaining={timeRemaining}
        currentRound={currentRound}
        picksCompleted={picksCompleted}
        totalPicks={totalPicks}
      />

      {/* Trade Offer Banners */}
      {isUserPick &&
        pendingTradeOffers.map((offer) => (
          <TradeOfferBanner
            key={offer.tradeId}
            offer={offer}
            onAccept={() => onAcceptTrade(offer.tradeId)}
            onReject={() => onRejectTrade(offer.tradeId)}
          />
        ))}

      {/* AI picking state */}
      {!isUserPick && (
        <View style={s.aiPickingBar}>
          <Text style={s.aiPickingText}>AI picking...</Text>
          {onSkipToMyPick && (
            <TouchableOpacity
              style={s.skipButton}
              onPress={onSkipToMyPick}
              accessibilityLabel="Skip to my next pick"
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Ionicons name="play-forward" size={16} color={colors.textOnPrimary} />
              <Text style={s.skipButtonText}>Skip to My Pick</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* User Draft Class Strip */}
      {isUserPick && (
        <UserDraftClassStrip picks={userDraftedPicks} currentPickNumber={currentPick.pickNumber} />
      )}

      {/* Team Needs Bar (user's turn only) */}
      {isUserPick && (
        <TeamNeedsBar
          needs={teamNeeds}
          activeFilter={positionFilter}
          onFilterPress={setPositionFilter}
        />
      )}

      {/* Position Filter Bar (user's turn only) */}
      {isUserPick && (
        <PositionFilterBar
          activeFilter={positionFilter}
          onFilterPress={setPositionFilter}
          showFlaggedOnly={showFlaggedOnly}
          onToggleFlagged={() => setShowFlaggedOnly(!showFlaggedOnly)}
        />
      )}

      {/* Scout Recommendation Bar (user's turn only) */}
      {isUserPick && (
        <ScoutRecBar recommendations={scoutRecommendations} onViewProspect={onViewProspect} />
      )}

      {/* Prospect List */}
      <FlatList
        data={filteredProspects}
        keyExtractor={(item) => item.id}
        renderItem={renderProspect}
        style={s.prospectList}
        contentContainerStyle={selectedProspect ? s.prospectListContentWithAction : undefined}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <Text style={s.emptyText}>
              {showFlaggedOnly ? 'No flagged prospects' : 'No prospects available'}
            </Text>
          </View>
        }
      />

      {/* Draft Action Button (bottom, when prospect selected) */}
      {isUserPick && selectedProspect && onDraftSelectedProspect && (
        <DraftActionButton
          prospectName={selectedProspect.name}
          prospectPosition={selectedProspect.position}
          onDraft={onDraftSelectedProspect}
        />
      )}
    </SafeAreaView>
  );
}

// =============================================
// Styles
// =============================================

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Pick Banner
  pickBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickBannerUser: {
    backgroundColor: colors.primary,
  },
  pickBannerAI: {
    backgroundColor: colors.surfaceDark,
  },
  pickBannerLeft: {
    flex: 1,
  },
  pickBannerLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    letterSpacing: 1,
    opacity: 0.8,
  },
  pickBannerTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pickBannerTeam: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  pickBannerPick: {
    fontSize: fontSize.md,
    color: colors.textOnDark,
  },
  pickBannerHint: {
    fontSize: fontSize.xs,
    color: colors.textOnDark,
    opacity: 0.7,
    marginTop: spacing.xxs,
  },
  pickBannerRight: {
    alignItems: 'flex-end',
  },
  pickBannerTimer: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    fontVariant: ['tabular-nums'],
  },
  pickBannerTimerLow: {
    color: colors.error,
  },
  pickBannerProgress: {
    fontSize: fontSize.xs,
    color: colors.textOnDark,
    opacity: 0.7,
    fontVariant: ['tabular-nums'],
  },

  // Trade Banner
  tradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.info + '15',
    borderBottomWidth: 1,
    borderBottomColor: colors.info + '30',
    gap: spacing.sm,
  },
  tradeBannerInfo: {
    flex: 1,
  },
  tradeBannerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  tradeBannerDetail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  tradeBannerAccept: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minHeight: accessibility.minTouchTarget,
    justifyContent: 'center',
  },
  tradeBannerAcceptText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  tradeBannerReject: {
    minWidth: accessibility.minTouchTarget,
    minHeight: accessibility.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // AI Picking Bar
  aiPickingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  aiPickingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minHeight: accessibility.minTouchTarget,
  },
  skipButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },

  // Draft Class Strip
  draftClassStrip: {
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  draftClassStripContent: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  draftClassChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
  },
  draftClassGrade: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: borderRadius.sm,
  },
  draftClassGradeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  draftClassName: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  draftClassPos: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  draftClassName2: {
    fontSize: fontSize.xs,
    color: colors.text,
    maxWidth: 60,
  },
  draftClassChipCurrent: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
  },
  draftClassCurrentText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    fontVariant: ['tabular-nums'],
  },
  draftClassCurrentLabel: {
    fontSize: fontSize.xs,
    color: colors.textOnPrimary,
    opacity: 0.7,
  },

  // Needs Bar
  needsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  needsLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  needsChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.error + '15',
    marginRight: spacing.xs,
    minHeight: 28,
    justifyContent: 'center',
  },
  needsChipActive: {
    backgroundColor: colors.error,
  },
  needsChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  needsChipTextActive: {
    color: colors.textOnPrimary,
  },

  // Filter Bar
  filterBar: {
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterBarContent: {
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginVertical: spacing.xs,
    minHeight: 32,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipFlagged: {
    backgroundColor: colors.secondary + '20',
  },
  filterChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
  },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xxs,
  },

  // Scout Bar
  scoutBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scoutBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    minHeight: accessibility.minTouchTarget,
  },
  scoutBarText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  scoutBarExpanded: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  scoutBarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: accessibility.minTouchTarget,
  },
  scoutBarItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: 120,
  },
  scoutBarItemName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  scoutBarItemPos: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
  scoutBarItemReason: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontStyle: 'italic',
    marginLeft: spacing.sm,
  },

  // Prospect Row
  prospectList: {
    flex: 1,
  },
  prospectListContentWithAction: {
    paddingBottom: 80,
  },
  prospectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: accessibility.minTouchTarget,
  },
  prospectRowSelected: {
    backgroundColor: colors.success + '12',
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  prospectRank: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    width: 32,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  prospectInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  prospectNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  prospectName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  prospectMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xxs,
  },
  prospectPos: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    minWidth: 28,
  },
  prospectCollege: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    flex: 1,
  },
  prospectRange: {
    fontSize: fontSize.xs,
    color: colors.textLight,
    fontVariant: ['tabular-nums'],
  },
  selectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  selectBtnSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },

  // Draft Action Button
  draftActionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  draftActionBtn: {
    backgroundColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: accessibility.minTouchTarget,
  },
  draftActionText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    letterSpacing: 0.5,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    textAlign: 'center',
  },
});

export default DraftRoomScreen;
