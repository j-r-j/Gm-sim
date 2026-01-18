/**
 * PlayerDetailCard Component
 * Expandable card with tabbed content for player details.
 *
 * Tabs:
 * - Profile: Skills, physicals, traits, morale, fatigue, injury, scheme fit, role
 * - Stats: Career/season toggle with position-specific stats
 * - Contract: Contract details, draft info
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../../styles';
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
function getPositionColor(position: Position): string {
  const group = getPositionGroup(position);
  switch (group) {
    case 'offense':
      return colors.primary;
    case 'defense':
      return colors.secondary;
    case 'special':
      return colors.info;
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
 * Status bar component for morale/fatigue
 */
function StatusBar({
  label,
  value,
  color,
  invertColor = false,
}: {
  label: string;
  value: number;
  color: string;
  invertColor?: boolean;
}): React.JSX.Element {
  // For fatigue, higher is worse so we might want to invert the color logic
  const displayColor = invertColor
    ? value > 70
      ? colors.error
      : value > 40
        ? colors.warning
        : colors.success
    : color;

  return (
    <View style={styles.statusBarContainer}>
      <View style={styles.statusBarHeader}>
        <Text style={styles.statusBarLabel}>{label}</Text>
        <Text style={styles.statusBarValue}>{value}</Text>
      </View>
      <View style={styles.statusBarTrack}>
        <View
          style={[styles.statusBarFill, { width: `${value}%`, backgroundColor: displayColor }]}
        />
      </View>
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
      {/* Role & Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.roleContainer}>
          <View style={styles.roleItem}>
            <Text style={styles.roleLabel}>Current Role</Text>
            <Text style={styles.roleValue}>{getRoleDisplayName(player.roleFit.currentRole)}</Text>
          </View>
          <View style={styles.roleItem}>
            <Text style={styles.roleLabel}>Ceiling</Text>
            <Text style={styles.roleValue}>{getRoleDisplayName(player.roleFit.ceiling)}</Text>
          </View>
        </View>
        <Text style={styles.roleFitDescription}>{getRoleFitDescription(player.roleFit)}</Text>

        {/* Scheme Fit */}
        {teamScheme && (
          <View style={styles.schemeFitContainer}>
            <Text style={styles.schemeFitLabel}>Scheme Fit:</Text>
            <Text style={styles.schemeFitValue}>
              {getSchemeFitDescription(player.schemeFits, teamScheme)}
            </Text>
          </View>
        )}
      </View>

      {/* Morale, Fatigue, Injury Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Condition</Text>
        <StatusBar
          label="Morale"
          value={player.morale}
          color={
            player.morale >= 70
              ? colors.success
              : player.morale >= 40
                ? colors.warning
                : colors.error
          }
        />
        <StatusBar label="Fatigue" value={player.fatigue} color={colors.info} invertColor />
        {!isHealthy(player.injuryStatus) && (
          <View style={styles.injuryContainer}>
            <Text style={styles.injuryIcon}>🩹</Text>
            <Text style={styles.injuryText}>{getInjuryDisplayString(player.injuryStatus)}</Text>
            {player.injuryStatus.weeksRemaining > 0 && (
              <Text style={styles.injuryWeeks}>
                ({player.injuryStatus.weeksRemaining} week
                {player.injuryStatus.weeksRemaining !== 1 ? 's' : ''})
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Skills Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Skills</Text>
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

      {/* Physical Attributes Section */}
      <View style={styles.section}>
        <PhysicalAttributesDisplay physical={player.physical} position={player.position} compact />
      </View>

      {/* Traits Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Traits</Text>
        <TraitBadges hiddenTraits={player.hiddenTraits} compact />
      </View>
    </ScrollView>
  );
}

/**
 * Format stat value
 */
function formatStat(value: number, decimals: number = 0): string {
  return value.toFixed(decimals);
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
  const stats = viewType === 'season' ? seasonStats : careerStats;
  const positionGroup = getPositionGroup(player.position);

  const renderStatRow = (label: string, value: string | number) => (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );

  const renderNoStats = () => (
    <View style={styles.noStatsContainer}>
      <Text style={styles.noStatsText}>No stats available</Text>
    </View>
  );

  const renderPassingStats = () => {
    if (!stats || stats.passing.attempts === 0) return null;
    return (
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Passing</Text>
        {renderStatRow('Comp/Att', `${stats.passing.completions}/${stats.passing.attempts}`)}
        {renderStatRow(
          'Comp %',
          `${((stats.passing.completions / stats.passing.attempts) * 100).toFixed(1)}%`
        )}
        {renderStatRow('Yards', formatStat(stats.passing.yards))}
        {renderStatRow('TDs', formatStat(stats.passing.touchdowns))}
        {renderStatRow('INTs', formatStat(stats.passing.interceptions))}
        {renderStatRow('Rating', formatStat(stats.passing.rating, 1))}
        {renderStatRow('Sacks', formatStat(stats.passing.sacks))}
        {renderStatRow('Long', formatStat(stats.passing.longestPass))}
      </View>
    );
  };

  const renderRushingStats = () => {
    if (!stats || stats.rushing.attempts === 0) return null;
    return (
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Rushing</Text>
        {renderStatRow('Attempts', formatStat(stats.rushing.attempts))}
        {renderStatRow('Yards', formatStat(stats.rushing.yards))}
        {renderStatRow('YPC', formatStat(stats.rushing.yardsPerCarry, 1))}
        {renderStatRow('TDs', formatStat(stats.rushing.touchdowns))}
        {renderStatRow('Fumbles', formatStat(stats.rushing.fumbles))}
        {renderStatRow('Long', formatStat(stats.rushing.longestRush))}
      </View>
    );
  };

  const renderReceivingStats = () => {
    if (!stats || stats.receiving.targets === 0) return null;
    return (
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Receiving</Text>
        {renderStatRow('Targets', formatStat(stats.receiving.targets))}
        {renderStatRow('Receptions', formatStat(stats.receiving.receptions))}
        {renderStatRow(
          'Catch %',
          stats.receiving.targets > 0
            ? `${((stats.receiving.receptions / stats.receiving.targets) * 100).toFixed(1)}%`
            : '0%'
        )}
        {renderStatRow('Yards', formatStat(stats.receiving.yards))}
        {renderStatRow('YPR', formatStat(stats.receiving.yardsPerReception, 1))}
        {renderStatRow('TDs', formatStat(stats.receiving.touchdowns))}
        {renderStatRow('Drops', formatStat(stats.receiving.drops))}
        {renderStatRow('Long', formatStat(stats.receiving.longestReception))}
      </View>
    );
  };

  const renderDefensiveStats = () => {
    if (!stats) return null;
    const hasDefensiveStats =
      stats.defensive.tackles > 0 || stats.defensive.sacks > 0 || stats.defensive.interceptions > 0;
    if (!hasDefensiveStats) return null;

    return (
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Defense</Text>
        {renderStatRow('Tackles', formatStat(stats.defensive.tackles))}
        {renderStatRow('TFL', formatStat(stats.defensive.tacklesForLoss))}
        {renderStatRow('Sacks', formatStat(stats.defensive.sacks, 1))}
        {renderStatRow('INTs', formatStat(stats.defensive.interceptions))}
        {renderStatRow('PDs', formatStat(stats.defensive.passesDefended))}
        {renderStatRow('FF', formatStat(stats.defensive.forcedFumbles))}
        {renderStatRow('FR', formatStat(stats.defensive.fumblesRecovered))}
        {renderStatRow('TDs', formatStat(stats.defensive.touchdowns))}
      </View>
    );
  };

  const renderKickingStats = () => {
    if (!stats || stats.kicking.fieldGoalAttempts === 0) return null;
    return (
      <View style={styles.statsSection}>
        <Text style={styles.statsSectionTitle}>Kicking</Text>
        {renderStatRow('FG', `${stats.kicking.fieldGoalsMade}/${stats.kicking.fieldGoalAttempts}`)}
        {renderStatRow(
          'FG %',
          stats.kicking.fieldGoalAttempts > 0
            ? `${((stats.kicking.fieldGoalsMade / stats.kicking.fieldGoalAttempts) * 100).toFixed(1)}%`
            : '0%'
        )}
        {renderStatRow('Long', formatStat(stats.kicking.longestFieldGoal))}
        {renderStatRow(
          'XP',
          `${stats.kicking.extraPointsMade}/${stats.kicking.extraPointAttempts}`
        )}
      </View>
    );
  };

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
            Season
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

      {/* Games played info */}
      {stats && (
        <View style={styles.gamesInfo}>
          <Text style={styles.gamesInfoText}>
            {stats.gamesPlayed} Games Played ({stats.gamesStarted} Starts)
          </Text>
        </View>
      )}

      {/* Position-specific stats */}
      {!stats ? (
        renderNoStats()
      ) : (
        <>
          {/* QB and skill positions - show passing/rushing/receiving */}
          {player.position === Position.QB && (
            <>
              {renderPassingStats()}
              {renderRushingStats()}
            </>
          )}

          {/* RB - rushing and receiving */}
          {player.position === Position.RB && (
            <>
              {renderRushingStats()}
              {renderReceivingStats()}
            </>
          )}

          {/* WR/TE - receiving and rushing */}
          {(player.position === Position.WR || player.position === Position.TE) && (
            <>
              {renderReceivingStats()}
              {renderRushingStats()}
            </>
          )}

          {/* O-Line - we'd show sacks allowed but that's in game stats */}
          {(player.position === Position.LT ||
            player.position === Position.LG ||
            player.position === Position.C ||
            player.position === Position.RG ||
            player.position === Position.RT) && (
            <View style={styles.statsSection}>
              <Text style={styles.statsSectionTitle}>Blocking</Text>
              {renderStatRow('Games', formatStat(stats.gamesPlayed))}
              {renderStatRow('Starts', formatStat(stats.gamesStarted))}
              {/* O-line specific stats would be tracked separately */}
            </View>
          )}

          {/* Defensive positions */}
          {positionGroup === 'defense' && renderDefensiveStats()}

          {/* Kickers/Punters */}
          {(player.position === Position.K || player.position === Position.P) &&
            renderKickingStats()}
        </>
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

  const renderContractRow = (label: string, value: string) => (
    <View style={styles.contractRow}>
      <Text style={styles.contractLabel}>{label}</Text>
      <Text style={styles.contractValue}>{value}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Draft Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Draft Info</Text>
        <View style={styles.draftInfoContainer}>
          {renderContractRow('Draft Year', player.draftYear.toString())}
          {renderContractRow(
            'Draft Selection',
            player.draftRound > 0
              ? `Round ${player.draftRound}, Pick ${player.draftPick}`
              : 'Undrafted'
          )}
          {renderContractRow(
            'Experience',
            `${player.experience} year${player.experience !== 1 ? 's' : ''}`
          )}
          {renderContractRow('Age', player.age.toString())}
        </View>
      </View>

      {/* Contract Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contract</Text>
        {summary ? (
          <View style={styles.contractContainer}>
            <View style={styles.contractHeader}>
              <View
                style={[
                  styles.contractStatusBadge,
                  summary.statusDescription === 'Expiring' && styles.contractStatusExpiring,
                ]}
              >
                <Text style={styles.contractStatusText}>{summary.statusDescription}</Text>
              </View>
            </View>
            {renderContractRow('Total Value', summary.totalValue)}
            {renderContractRow('Guaranteed', summary.guaranteed)}
            {renderContractRow('AAV', summary.aav)}
            {renderContractRow('Length', `${summary.years} year${summary.years !== 1 ? 's' : ''}`)}
            {renderContractRow('Years Remaining', summary.yearsRemaining.toString())}
            {renderContractRow('Current Cap Hit', summary.currentCapHit)}

            {contract?.hasNoTradeClause && (
              <View style={styles.clauseBadge}>
                <Text style={styles.clauseText}>No-Trade Clause</Text>
              </View>
            )}
            {contract?.hasNoTagClause && (
              <View style={styles.clauseBadge}>
                <Text style={styles.clauseText}>No-Tag Clause</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noContractContainer}>
            <Text style={styles.noContractText}>No active contract</Text>
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
}: PlayerDetailCardProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const positionColor = getPositionColor(player.position);

  const content = (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.positionBadge, { backgroundColor: positionColor }]}>
          <Text style={styles.positionText}>{player.position}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.playerName}>
            {player.firstName} {player.lastName}
          </Text>
          <Text style={styles.playerDetails}>
            Age {player.age} •{' '}
            {player.experience > 0
              ? `${player.experience} yr${player.experience !== 1 ? 's' : ''} exp`
              : 'Rookie'}
          </Text>
        </View>
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'profile' && styles.tabActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
            Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'contract' && styles.tabActive]}
          onPress={() => setActiveTab('contract')}
        >
          <Text style={[styles.tabText, activeTab === 'contract' && styles.tabTextActive]}>
            Contract
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  positionBadge: {
    width: 56,
    height: 56,
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
  headerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  playerDetails: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  tabContent: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  // Role & Status styles
  roleContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  roleItem: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  roleLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: spacing.xxs,
  },
  roleValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  roleFitDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  schemeFitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  schemeFitLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  schemeFitValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  // Status bar styles
  statusBarContainer: {
    marginBottom: spacing.md,
  },
  statusBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  statusBarLabel: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  statusBarValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  statusBarTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  // Injury styles
  injuryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: `${colors.error}15`,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    marginTop: spacing.sm,
  },
  injuryIcon: {
    fontSize: fontSize.lg,
    marginRight: spacing.sm,
  },
  injuryText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },
  injuryWeeks: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginLeft: spacing.xs,
  },
  // Stats styles
  statsToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.xxs,
    marginBottom: spacing.lg,
  },
  statsToggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  statsToggleButtonActive: {
    backgroundColor: colors.primary,
  },
  statsToggleText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  statsToggleTextActive: {
    color: colors.textOnPrimary,
  },
  gamesInfo: {
    marginBottom: spacing.lg,
  },
  gamesInfoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statsSection: {
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  statsSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
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
    fontWeight: fontWeight.semibold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  noStatsContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  noStatsText: {
    fontSize: fontSize.md,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  // Contract styles
  draftInfoContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  contractContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  contractHeader: {
    marginBottom: spacing.md,
  },
  contractStatusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  contractStatusExpiring: {
    backgroundColor: colors.warning,
  },
  contractStatusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textOnPrimary,
  },
  contractRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contractLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  contractValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  clauseBadge: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.info,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  clauseText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textOnPrimary,
  },
  noContractContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },
  noContractText: {
    fontSize: fontSize.md,
    color: colors.textLight,
  },
  noContractSubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

export default PlayerDetailCard;
