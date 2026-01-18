/**
 * PlayerDetailCard Component
 * Expandable card with tabbed content for comprehensive player details.
 *
 * Design inspired by:
 * - ESPN Fantasy 2025 player cards with sticky headers and tabbed content
 * - Madden NFL player profiles
 * - Sleeper app clean, modern design patterns
 *
 * Tabs:
 * - Profile: Skills, physicals, traits, morale, fatigue, injury, scheme fit, role
 * - Stats: Career/season toggle with position-specific stats
 * - Contract: Contract details, draft info
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  shadows,
  getRatingTierColor,
} from '../../styles';
import { Player } from '../../core/models/player/Player';
import { Position } from '../../core/models/player/Position';
import { SKILL_NAMES_BY_POSITION } from '../../core/models/player/TechnicalSkills';
import { getInjuryDisplayString, isHealthy } from '../../core/models/player/InjuryStatus';
import { getRoleDisplayName, getRoleFitDescription } from '../../core/models/player/RoleFit';
import {
  getSchemeFitDescription,
  OffensiveScheme,
  DefensiveScheme,
} from '../../core/models/player/SchemeFit';
import { PlayerContract, getContractSummary, ContractSummary } from '../../core/contracts/Contract';
import { PlayerSeasonStats } from '../../core/game/SeasonStatsAggregator';
import { SkillRangeDisplay } from './SkillRangeDisplay';
import { PhysicalAttributesDisplay } from './PhysicalAttributesDisplay';
import { TraitBadges } from './TraitBadges';
import { RatingTierIndicator } from './RatingTierIndicator';

type TabType = 'profile' | 'stats' | 'contract';
type StatsViewType = 'career' | 'season';

export interface PlayerDetailCardProps {
  /** The full player object */
  player: Player;
  /** Player's contract (if any) */
  contract?: PlayerContract | null;
  /** Current year for contract calculations */
  currentYear?: number;
  /** Team's offensive scheme (for scheme fit display) */
  teamOffensiveScheme?: OffensiveScheme | null;
  /** Team's defensive scheme (for scheme fit display) */
  teamDefensiveScheme?: DefensiveScheme | null;
  /** Player's season stats (current season) */
  seasonStats?: PlayerSeasonStats | null;
  /** Player's career stats */
  careerStats?: PlayerSeasonStats | null;
  /** Per-game stats for the season */
  gameByGameStats?: PlayerSeasonStats[];
  /** Callback when card is closed */
  onClose?: () => void;
  /** Whether to show as a modal */
  isModal?: boolean;
  /** Callback to release the player */
  onRelease?: () => void;
}

/**
 * Get position group for color coding
 */
function getPositionGroup(position: Position): 'offense' | 'defense' | 'special' {
  const offensePositions = [
    Position.QB,
    Position.RB,
    Position.WR,
    Position.TE,
    Position.LT,
    Position.LG,
    Position.C,
    Position.RG,
    Position.RT,
  ];
  const specialPositions = [Position.K, Position.P];

  if (offensePositions.includes(position)) return 'offense';
  if (specialPositions.includes(position)) return 'special';
  return 'defense';
}

/**
 * Get position color
 */
function getPositionColor(position: Position): { main: string; light: string } {
  const group = getPositionGroup(position);
  switch (group) {
    case 'offense':
      return { main: colors.positionOffense, light: colors.positionOffenseLight };
    case 'defense':
      return { main: colors.positionDefense, light: colors.positionDefenseLight };
    case 'special':
      return { main: colors.positionSpecial, light: colors.positionSpecialLight };
  }
}

/**
 * Map position to skill group key
 */
function getPositionGroupKey(position: Position): keyof typeof SKILL_NAMES_BY_POSITION {
  switch (position) {
    case Position.QB:
      return 'QB';
    case Position.RB:
      return 'RB';
    case Position.WR:
      return 'WR';
    case Position.TE:
      return 'TE';
    case Position.LT:
    case Position.LG:
    case Position.C:
    case Position.RG:
    case Position.RT:
      return 'OL';
    case Position.DE:
    case Position.DT:
      return 'DL';
    case Position.OLB:
    case Position.ILB:
      return 'LB';
    case Position.CB:
    case Position.FS:
    case Position.SS:
      return 'DB';
    case Position.K:
      return 'K';
    case Position.P:
      return 'P';
    default:
      return 'QB';
  }
}

/**
 * Calculate average skill rating
 */
function getAverageSkillRating(player: Player): number {
  const positionKey = getPositionGroupKey(player.position);
  const skillNames = SKILL_NAMES_BY_POSITION[positionKey];

  let total = 0;
  let count = 0;

  for (const skillName of skillNames) {
    const skill = player.skills[skillName];
    if (skill) {
      total += (skill.perceivedMin + skill.perceivedMax) / 2;
      count++;
    }
  }

  return count > 0 ? Math.round(total / count) : 50;
}

/**
 * Circular Progress Bar for morale/fatigue
 */
function CircularProgressBar({
  value,
  label,
  color,
  invertColor = false,
}: {
  value: number;
  label: string;
  color: string;
  invertColor?: boolean;
}): React.JSX.Element {
  const displayColor = invertColor
    ? value > 70
      ? colors.error
      : value > 40
        ? colors.warning
        : colors.success
    : value >= 70
      ? colors.success
      : value >= 40
        ? colors.warning
        : colors.error;

  return (
    <View style={styles.circularProgress}>
      <View style={[styles.circularOuter, { borderColor: `${displayColor}30` }]}>
        <View style={[styles.circularInner, { borderColor: displayColor }]}>
          <Text style={[styles.circularValue, { color: displayColor }]}>{value}</Text>
        </View>
      </View>
      <Text style={styles.circularLabel}>{label}</Text>
    </View>
  );
}

/**
 * Quick Info Chip
 */
function InfoChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}): React.JSX.Element {
  return (
    <View
      style={[
        styles.infoChip,
        color && { backgroundColor: `${color}15`, borderColor: `${color}40` },
      ]}
    >
      <Text style={styles.infoChipLabel}>{label}</Text>
      <Text style={[styles.infoChipValue, color && { color }]}>{value}</Text>
    </View>
  );
}

/**
 * Profile Tab Content
 */
function ProfileTab({
  player,
  teamOffensiveScheme,
  teamDefensiveScheme,
}: {
  player: Player;
  teamOffensiveScheme?: OffensiveScheme | null;
  teamDefensiveScheme?: DefensiveScheme | null;
}): React.JSX.Element {
  const positionKey = getPositionGroupKey(player.position);
  const skillNames = SKILL_NAMES_BY_POSITION[positionKey];
  const isOffensive = getPositionGroup(player.position) === 'offense';
  const teamScheme = isOffensive ? teamOffensiveScheme : teamDefensiveScheme;

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Quick Status Row */}
      <View style={styles.quickStatusRow}>
        <CircularProgressBar value={player.morale} label="Morale" color={colors.success} />
        <CircularProgressBar
          value={player.fatigue}
          label="Fatigue"
          color={colors.info}
          invertColor
        />
      </View>

      {/* Injury Alert */}
      {!isHealthy(player.injuryStatus) && (
        <View style={styles.injuryAlert}>
          <Text style={styles.injuryAlertIcon}>🩹</Text>
          <View style={styles.injuryAlertContent}>
            <Text style={styles.injuryAlertTitle}>
              {getInjuryDisplayString(player.injuryStatus)}
            </Text>
            {player.injuryStatus.weeksRemaining > 0 && (
              <Text style={styles.injuryAlertSubtitle}>
                {player.injuryStatus.weeksRemaining} week
                {player.injuryStatus.weeksRemaining !== 1 ? 's' : ''} remaining
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Role & Ceiling Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Player Role</Text>
        <View style={styles.roleCardsRow}>
          <View style={styles.roleCard}>
            <Text style={styles.roleCardLabel}>Current</Text>
            <Text style={styles.roleCardValue}>
              {getRoleDisplayName(player.roleFit.currentRole)}
            </Text>
          </View>
          <View style={styles.roleCardDivider} />
          <View style={styles.roleCard}>
            <Text style={styles.roleCardLabel}>Ceiling</Text>
            <Text style={styles.roleCardValue}>{getRoleDisplayName(player.roleFit.ceiling)}</Text>
          </View>
        </View>
        <Text style={styles.roleDescription}>{getRoleFitDescription(player.roleFit)}</Text>

        {/* Scheme Fit */}
        {teamScheme && (
          <View style={styles.schemeFitBadge}>
            <Text style={styles.schemeFitLabel}>Scheme Fit</Text>
            <Text style={styles.schemeFitValue}>
              {getSchemeFitDescription(player.schemeFits, teamScheme)}
            </Text>
          </View>
        )}
      </View>

      {/* Skills Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
        <View style={styles.skillsGrid}>
          {skillNames.map((skillName) => {
            const skill = player.skills[skillName];
            if (!skill) return null;
            return (
              <SkillRangeDisplay
                key={skillName}
                skillName={skillName}
                perceivedMin={skill.perceivedMin}
                perceivedMax={skill.perceivedMax}
                playerAge={player.age}
                maturityAge={skill.maturityAge}
                compact
              />
            );
          })}
        </View>
      </View>

      {/* Traits Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Traits & Abilities</Text>
        <TraitBadges hiddenTraits={player.hiddenTraits} />
      </View>

      {/* Physical Attributes Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Physical Attributes</Text>
        <PhysicalAttributesDisplay physical={player.physical} position={player.position} compact />
      </View>
    </ScrollView>
  );
}

/**
 * Stats Summary Rows - shows key stats based on position
 */
function StatsSummaryCard({
  stats,
  position,
  title,
}: {
  stats: PlayerSeasonStats;
  position: Position;
  title: string;
}): React.JSX.Element | null {
  const positionGroup = getPositionGroup(position);

  const renderStatRow = (label: string, value: string | number, highlight?: boolean) => (
    <View key={label} style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, highlight && styles.statValueHighlight]}>{value}</Text>
    </View>
  );

  const renderStats = () => {
    // QB stats
    if (position === Position.QB && stats.passing.attempts > 0) {
      const compPct = ((stats.passing.completions / stats.passing.attempts) * 100).toFixed(1);
      return (
        <>
          {renderStatRow('Comp/Att', `${stats.passing.completions}/${stats.passing.attempts}`)}
          {renderStatRow('Comp %', `${compPct}%`)}
          {renderStatRow('Pass Yds', stats.passing.yards, true)}
          {renderStatRow('Pass TD', stats.passing.touchdowns, true)}
          {renderStatRow('INT', stats.passing.interceptions)}
          {renderStatRow('Rating', stats.passing.rating.toFixed(1))}
        </>
      );
    }

    // RB stats
    if (position === Position.RB) {
      return (
        <>
          {stats.rushing.attempts > 0 && (
            <>
              {renderStatRow('Rush Yds', stats.rushing.yards, true)}
              {renderStatRow('Rush TD', stats.rushing.touchdowns, true)}
              {renderStatRow('YPC', stats.rushing.yardsPerCarry.toFixed(1))}
            </>
          )}
          {stats.receiving.targets > 0 && (
            <>
              {renderStatRow('Rec', stats.receiving.receptions)}
              {renderStatRow('Rec Yds', stats.receiving.yards)}
            </>
          )}
        </>
      );
    }

    // WR/TE stats
    if ((position === Position.WR || position === Position.TE) && stats.receiving.targets > 0) {
      return (
        <>
          {renderStatRow('Targets', stats.receiving.targets)}
          {renderStatRow('Rec', stats.receiving.receptions)}
          {renderStatRow('Rec Yds', stats.receiving.yards, true)}
          {renderStatRow('Rec TD', stats.receiving.touchdowns, true)}
          {renderStatRow('YPR', stats.receiving.yardsPerReception.toFixed(1))}
        </>
      );
    }

    // Defensive stats
    if (positionGroup === 'defense') {
      const hasStats =
        stats.defensive.tackles > 0 ||
        stats.defensive.sacks > 0 ||
        stats.defensive.interceptions > 0;
      if (!hasStats) return null;
      return (
        <>
          {renderStatRow('Tackles', stats.defensive.tackles, true)}
          {renderStatRow('TFL', stats.defensive.tacklesForLoss)}
          {renderStatRow('Sacks', stats.defensive.sacks.toFixed(1), true)}
          {renderStatRow('INT', stats.defensive.interceptions)}
          {renderStatRow('PD', stats.defensive.passesDefended)}
        </>
      );
    }

    // Kicker stats
    if (position === Position.K && stats.kicking.fieldGoalAttempts > 0) {
      const fgPct = (
        (stats.kicking.fieldGoalsMade / stats.kicking.fieldGoalAttempts) *
        100
      ).toFixed(1);
      return (
        <>
          {renderStatRow(
            'FG',
            `${stats.kicking.fieldGoalsMade}/${stats.kicking.fieldGoalAttempts}`
          )}
          {renderStatRow('FG %', `${fgPct}%`, true)}
          {renderStatRow('Long', stats.kicking.longestFieldGoal)}
        </>
      );
    }

    return null;
  };

  const content = renderStats();
  if (!content) return null;

  return (
    <View style={styles.statsSummaryCard}>
      <View style={styles.statsSummaryHeader}>
        <Text style={styles.statsSummaryTitle}>{title}</Text>
        <Text style={styles.statsSummaryGames}>
          {stats.gamesPlayed} GP / {stats.gamesStarted} GS
        </Text>
      </View>
      {content}
    </View>
  );
}

/**
 * Stats Tab Content
 */
function StatsTab({
  player,
  seasonStats,
  careerStats,
}: {
  player: Player;
  seasonStats?: PlayerSeasonStats | null;
  careerStats?: PlayerSeasonStats | null;
}): React.JSX.Element {
  const [viewType, setViewType] = useState<StatsViewType>('season');

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Toggle between season and career */}
      <View style={styles.statsToggle}>
        <TouchableOpacity
          style={[
            styles.statsToggleButton,
            viewType === 'season' && styles.statsToggleButtonActive,
          ]}
          onPress={() => setViewType('season')}
        >
          <Text
            style={[styles.statsToggleText, viewType === 'season' && styles.statsToggleTextActive]}
          >
            This Season
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.statsToggleButton,
            viewType === 'career' && styles.statsToggleButtonActive,
          ]}
          onPress={() => setViewType('career')}
        >
          <Text
            style={[styles.statsToggleText, viewType === 'career' && styles.statsToggleTextActive]}
          >
            Career
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats display */}
      {viewType === 'season' ? (
        seasonStats ? (
          <StatsSummaryCard
            stats={seasonStats}
            position={player.position}
            title="Season Statistics"
          />
        ) : (
          <View style={styles.noStatsContainer}>
            <Text style={styles.noStatsIcon}>📊</Text>
            <Text style={styles.noStatsText}>No season stats available</Text>
          </View>
        )
      ) : careerStats ? (
        <StatsSummaryCard
          stats={careerStats}
          position={player.position}
          title="Career Statistics"
        />
      ) : (
        <View style={styles.noStatsContainer}>
          <Text style={styles.noStatsIcon}>📊</Text>
          <Text style={styles.noStatsText}>No career stats available</Text>
        </View>
      )}
    </ScrollView>
  );
}

/**
 * Contract Tab Content
 */
function ContractTab({
  player,
  contract,
  currentYear = 2024,
}: {
  player: Player;
  contract?: PlayerContract | null;
  currentYear?: number;
}): React.JSX.Element {
  const summary: ContractSummary | null = contract
    ? getContractSummary(contract, currentYear)
    : null;

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Draft Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Draft History</Text>
        <View style={styles.draftInfoCard}>
          <View style={styles.draftInfoRow}>
            <InfoChip label="Draft Year" value={player.draftYear.toString()} />
            <InfoChip
              label="Selection"
              value={
                player.draftRound > 0
                  ? `Rd ${player.draftRound}, Pick ${player.draftPick}`
                  : 'Undrafted'
              }
            />
          </View>
          <View style={styles.draftInfoRow}>
            <InfoChip
              label="Experience"
              value={`${player.experience} yr${player.experience !== 1 ? 's' : ''}`}
            />
            <InfoChip label="Age" value={player.age.toString()} />
          </View>
        </View>
      </View>

      {/* Contract Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contract Details</Text>
        {summary ? (
          <View style={styles.contractCard}>
            {/* Contract status badge */}
            <View
              style={[
                styles.contractStatusBadge,
                summary.statusDescription === 'Expiring' && styles.contractStatusExpiring,
              ]}
            >
              <Text style={styles.contractStatusText}>{summary.statusDescription}</Text>
            </View>

            {/* Contract values */}
            <View style={styles.contractValuesGrid}>
              <View style={styles.contractValueItem}>
                <Text style={styles.contractValueLabel}>Total Value</Text>
                <Text style={styles.contractValueAmount}>{summary.totalValue}</Text>
              </View>
              <View style={styles.contractValueItem}>
                <Text style={styles.contractValueLabel}>Guaranteed</Text>
                <Text style={styles.contractValueAmount}>{summary.guaranteed}</Text>
              </View>
              <View style={styles.contractValueItem}>
                <Text style={styles.contractValueLabel}>AAV</Text>
                <Text style={styles.contractValueAmount}>{summary.aav}</Text>
              </View>
              <View style={styles.contractValueItem}>
                <Text style={styles.contractValueLabel}>Cap Hit</Text>
                <Text style={styles.contractValueAmount}>{summary.currentCapHit}</Text>
              </View>
            </View>

            {/* Contract length */}
            <View style={styles.contractLengthRow}>
              <Text style={styles.contractLengthLabel}>
                {summary.yearsRemaining} of {summary.years} years remaining
              </Text>
              <View style={styles.contractLengthBar}>
                <View
                  style={[
                    styles.contractLengthFill,
                    {
                      width: `${((summary.years - summary.yearsRemaining) / summary.years) * 100}%`,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Contract clauses */}
            {(contract?.hasNoTradeClause || contract?.hasNoTagClause) && (
              <View style={styles.contractClausesRow}>
                {contract?.hasNoTradeClause && (
                  <View style={styles.clauseBadge}>
                    <Text style={styles.clauseText}>No-Trade</Text>
                  </View>
                )}
                {contract?.hasNoTagClause && (
                  <View style={styles.clauseBadge}>
                    <Text style={styles.clauseText}>No-Tag</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noContractCard}>
            <Text style={styles.noContractIcon}>📝</Text>
            <Text style={styles.noContractText}>No Active Contract</Text>
            <Text style={styles.noContractSubtext}>Free Agent</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/**
 * PlayerDetailCard Component
 */
export function PlayerDetailCard({
  player,
  contract,
  currentYear = 2024,
  teamOffensiveScheme,
  teamDefensiveScheme,
  seasonStats,
  careerStats,
  onClose,
  isModal = true,
  onRelease,
}: PlayerDetailCardProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const positionColors = getPositionColor(player.position);
  const avgRating = getAverageSkillRating(player);
  const tierInfo = getRatingTierColor(avgRating);

  const content = (
    <View style={styles.container}>
      {/* Sticky Header - ESPN-style */}
      <View style={[styles.stickyHeader, { borderBottomColor: tierInfo.primary }]}>
        {/* Top row: Position badge, name, close button */}
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.positionBadge, { backgroundColor: positionColors.main }]}>
              <Text style={styles.positionText}>{player.position}</Text>
            </View>
            <View style={styles.headerNameSection}>
              <Text style={styles.playerName}>
                {player.firstName} {player.lastName}
              </Text>
              <Text style={styles.playerSubtitle}>
                {player.age} years old •{' '}
                {player.experience > 0
                  ? `${player.experience} yr${player.experience !== 1 ? 's' : ''} exp`
                  : 'Rookie'}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <RatingTierIndicator rating={avgRating} size="md" variant="badge" />
            {onClose && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabBar}>
          {(['profile', 'stats', 'contract'] as TabType[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {activeTab === tab && (
                <View style={[styles.tabIndicator, { backgroundColor: positionColors.main }]} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContentContainer}>
        {activeTab === 'profile' && (
          <ProfileTab
            player={player}
            teamOffensiveScheme={teamOffensiveScheme}
            teamDefensiveScheme={teamDefensiveScheme}
          />
        )}
        {activeTab === 'stats' && (
          <StatsTab player={player} seasonStats={seasonStats} careerStats={careerStats} />
        )}
        {activeTab === 'contract' && (
          <ContractTab player={player} contract={contract} currentYear={currentYear} />
        )}
      </View>

      {/* Footer Actions */}
      {onRelease && (
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.releaseButton} onPress={onRelease}>
            <Text style={styles.releaseButtonText}>Release Player</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (isModal) {
    return (
      <Modal visible={true} animationType="slide" transparent onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>{content}</View>
        </View>
      </Modal>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
    ...shadows.lg,
  },
  container: {
    flex: 1,
  },

  // Sticky Header styles
  stickyHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 3,
    ...shadows.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  positionBadge: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  positionText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  headerNameSection: {
    flex: 1,
  },
  playerName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  playerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },

  // Tab bar styles
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    position: 'relative',
  },
  tabButtonActive: {},
  tabButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: spacing.lg,
    right: spacing.lg,
    height: 3,
    borderRadius: borderRadius.sm,
  },

  // Tab content
  tabContentContainer: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: spacing.lg,
  },

  // Section styles
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  // Quick status row
  quickStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  circularProgress: {
    alignItems: 'center',
  },
  circularOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  circularValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  circularLabel: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  // Injury alert
  injuryAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.error}10`,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  injuryAlertIcon: {
    fontSize: fontSize.xl,
    marginRight: spacing.md,
  },
  injuryAlertContent: {
    flex: 1,
  },
  injuryAlertTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.error,
  },
  injuryAlertSubtitle: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xxs,
  },

  // Role cards
  roleCardsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  roleCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  roleCardDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  roleCardLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  roleCardValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  roleDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  schemeFitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  schemeFitLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  schemeFitValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },

  // Skills grid
  skillsGrid: {},

  // Info chip
  infoChip: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  infoChipLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  infoChipValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },

  // Stats toggle
  statsToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xxs,
    marginBottom: spacing.lg,
  },
  statsToggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  statsToggleButtonActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  statsToggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  statsToggleTextActive: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },

  // Stats summary card
  statsSummaryCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  statsSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statsSummaryTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statsSummaryGames: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  statValueHighlight: {
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },

  // No stats container
  noStatsContainer: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
  },
  noStatsIcon: {
    fontSize: fontSize.xxxl,
    marginBottom: spacing.md,
  },
  noStatsText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },

  // Draft info
  draftInfoCard: {
    gap: spacing.sm,
  },
  draftInfoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Contract card
  contractCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  contractStatusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },
  contractStatusExpiring: {
    backgroundColor: colors.warning,
  },
  contractStatusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  contractValuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  contractValueItem: {
    width: '48%',
    backgroundColor: colors.surfaceLight,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  contractValueLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xxs,
  },
  contractValueAmount: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  contractLengthRow: {
    marginTop: spacing.sm,
  },
  contractLengthLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  contractLengthBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  contractLengthFill: {
    height: '100%',
    backgroundColor: colors.info,
    borderRadius: borderRadius.full,
  },
  contractClausesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  clauseBadge: {
    backgroundColor: colors.info,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  clauseText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },

  // No contract card
  noContractCard: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
  },
  noContractIcon: {
    fontSize: fontSize.xxxl,
    marginBottom: spacing.md,
  },
  noContractText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  noContractSubtext: {
    fontSize: fontSize.md,
    color: colors.textLight,
    marginTop: spacing.xs,
  },

  // Footer actions
  footerActions: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  releaseButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  releaseButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});

export default PlayerDetailCard;
