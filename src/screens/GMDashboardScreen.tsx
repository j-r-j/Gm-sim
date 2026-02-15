/**
 * GMDashboardScreen
 * Main hub for managing your team - access all game features from here
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
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
import { GameState } from '../core/models/game/GameState';
import { Team, getRecordString } from '../core/models/team/Team';
import { createPatienceViewModel, PatienceViewModel } from '../core/career/PatienceMeterManager';
import { OffSeasonPhaseType } from '../core/offseason/OffSeasonPhaseManager';
import { ActionPrompt } from '../components/week-flow';
import { LoadingScreen } from '../components';
import { NextActionPrompt, getWeekLabel } from '../core/simulation/WeekFlowState';
import { getUserTeamGame, isUserOnBye } from '../core/season/WeekSimulator';

export type DashboardAction =
  | 'roster'
  | 'depthChart'
  | 'schedule'
  | 'standings'
  | 'stats'
  | 'draft'
  | 'bigBoard'
  | 'freeAgency'
  | 'rfa'
  | 'compPicks'
  | 'combine'
  | 'staff'
  | 'finances'
  | 'contracts'
  | 'gamecast'
  | 'news'
  | 'rumorMill'
  | 'weeklyDigest'
  | 'careerLegacy'
  | 'careerSummary'
  | 'offseason'
  | 'ownerRelations'
  | 'advanceWeek'
  | 'playWeek'
  | 'quickSim'
  | 'simSeason'
  | 'simByeWeek'
  | 'settings'
  | 'saveGame'
  | 'mainMenu'
  | 'gamePlan'
  | 'tradeOffers'
  | 'startSit'
  | 'weeklyAwards'
  | 'waiverWire'
  | 'seasonHistory'
  | 'hallOfFame';

interface GMDashboardScreenProps {
  gameState: GameState;
  onAction: (action: DashboardAction) => void;
}

interface MenuCardProps {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  badge?: string;
}

/**
 * Job security status colors
 */
function getJobSecurityColor(status: PatienceViewModel['status']): string {
  switch (status) {
    case 'secure':
      return colors.success;
    case 'stable':
      return colors.info;
    case 'warm seat':
      return colors.warning;
    case 'hot seat':
      return '#FF6B00';
    case 'danger':
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

/**
 * Job security status label
 */
function getJobSecurityLabel(status: PatienceViewModel['status']): string {
  switch (status) {
    case 'secure':
      return 'JOB SECURE';
    case 'stable':
      return 'STABLE';
    case 'warm seat':
      return 'WARM SEAT';
    case 'hot seat':
      return 'HOT SEAT';
    case 'danger':
      return 'DANGER';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Job security status icon - accessibility requirement (icon + text, not just color)
 */
function getJobSecurityIcon(status: PatienceViewModel['status']): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'secure':
      return 'shield-checkmark';
    case 'stable':
      return 'checkmark-circle';
    case 'warm seat':
      return 'alert-circle';
    case 'hot seat':
      return 'flame';
    case 'danger':
      return 'warning';
    default:
      return 'help-circle';
  }
}

function MenuCard({
  title,
  subtitle,
  icon,
  color,
  onPress,
  disabled,
  badge,
}: MenuCardProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.menuCard, disabled && styles.menuCardDisabled]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
      accessibilityLabel={`${title}. ${subtitle}${badge ? `. ${badge}` : ''}`}
      accessibilityRole="button"
      accessibilityHint={`Navigate to ${title}`}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={accessibility.hitSlop}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.menuCardContent}>
        <Text style={[styles.menuCardTitle, disabled && styles.textDisabled]}>{title}</Text>
        <Text style={[styles.menuCardSubtitle, disabled && styles.textDisabled]}>{subtitle}</Text>
      </View>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function getPhaseDisplay(phase: string): string {
  const phaseMap: Record<string, string> = {
    preseason: 'Preseason',
    regularSeason: 'Regular Season',
    playoffs: 'Playoffs',
    offseason: 'Offseason',
    season_end: 'Season End',
    coaching_decisions: 'Coaching Decisions',
    contract_management: 'Contract Management',
    combine: 'NFL Combine',
    free_agency: 'Free Agency',
    draft: 'NFL Draft',
    udfa: 'UDFA Signing',
    otas: 'OTAs',
    training_camp: 'Training Camp',
    final_cuts: 'Final Roster Cuts',
    season_start: 'Season Start',
  };
  return phaseMap[phase] || phase;
}

function getWeekDisplay(week: number, phase: string): string {
  if (phase === 'playoffs') {
    const playoffWeeks: Record<number, string> = {
      19: 'Wild Card',
      20: 'Divisional',
      21: 'Conference',
      22: 'Super Bowl',
    };
    return playoffWeeks[week] || `Week ${week}`;
  }
  if (phase === 'preseason') {
    return `Preseason Week ${week}`;
  }
  if (phase === 'regularSeason') {
    return `Week ${week}`;
  }
  return '';
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function GMDashboardScreen({
  gameState,
  onAction,
}: GMDashboardScreenProps): React.JSX.Element {
  const userTeam: Team | undefined = gameState.teams[gameState.userTeamId];
  const league = gameState.league;

  // Early return if critical data is missing
  if (!userTeam || !league) {
    return <LoadingScreen message="Loading team data..." hint="Preparing your dashboard" />;
  }

  const { calendar } = league;
  const phase = calendar.currentPhase;
  const isOffseason = phase === 'offseason';

  // Use unified offseasonState for phase detection
  const offseasonPhase: OffSeasonPhaseType | null = gameState.offseasonState?.currentPhase ?? null;
  const isDraft = offseasonPhase === 'draft';
  const isFreeAgency = offseasonPhase === 'free_agency';
  const isCombine = offseasonPhase === 'combine';

  // Get job security status
  const patienceViewModel: PatienceViewModel | null = gameState.patienceMeter
    ? createPatienceViewModel(gameState.patienceMeter)
    : null;
  const jobSecurityPct: number = gameState.patienceMeter?.currentValue ?? 0;

  // Generate action prompt for week advancement or offseason entry
  const actionPrompt: NextActionPrompt | null = useMemo(() => {
    // During offseason, show offseason entry/continue CTA
    if (isOffseason) {
      const offseasonLabel = offseasonPhase
        ? `Continue Offseason - ${getPhaseDisplay(offseasonPhase)}`
        : 'Enter Offseason';
      const contextLabel = offseasonPhase
        ? `Current phase: ${getPhaseDisplay(offseasonPhase)}`
        : 'Begin offseason activities';
      return {
        actionText: offseasonLabel,
        contextText: contextLabel,
        actionType: 'primary' as const,
        targetAction: 'enter_offseason' as const,
        isEnabled: true,
      };
    }

    const schedule = gameState.league.schedule;
    if (!schedule) return null;

    // Check if user has a game this week
    const userGame = getUserTeamGame(schedule, calendar.currentWeek, gameState.userTeamId);
    const userOnBye = isUserOnBye(schedule, calendar.currentWeek, gameState.userTeamId);
    const weekLabel = getWeekLabel(calendar.currentWeek, phase);

    // Check if all games for the week are complete
    const weekGames = schedule.regularSeason?.filter((g) => g.week === calendar.currentWeek) || [];
    const allGamesComplete = weekGames.length > 0 && weekGames.every((g) => g.isComplete);

    // Get opponent info
    let opponentInfo: { name: string; record: string; isHome: boolean } | null = null;
    if (userGame) {
      const isHome = userGame.homeTeamId === gameState.userTeamId;
      const opponentId = isHome ? userGame.awayTeamId : userGame.homeTeamId;
      const opponent = gameState.teams[opponentId];
      if (opponent) {
        opponentInfo = {
          name: opponent.nickname,
          record: getRecordString(opponent.currentRecord),
          isHome,
        };
      }
    }

    // If all games are complete, show advance to next week
    if (allGamesComplete) {
      const nextWeek = calendar.currentWeek + 1;
      const nextWeekLabel =
        phase === 'playoffs' ? getWeekLabel(nextWeek, phase) : `Week ${nextWeek}`;
      return {
        actionText: `Advance to ${nextWeekLabel}`,
        contextText: `${weekLabel} Complete`,
        actionType: 'success' as const,
        targetAction: 'advance_week' as const,
        isEnabled: true,
      };
    }

    // If on bye (and games not complete yet)
    if (userOnBye) {
      return {
        actionText: `Sim Bye Week`,
        contextText: `${weekLabel} - Your team has a bye`,
        actionType: 'secondary' as const,
        targetAction: 'advance_week' as const,
        isEnabled: true,
        isByeWeek: true,
      };
    }

    // If has game to play
    if (userGame && !userGame.isComplete) {
      const matchupText = opponentInfo
        ? `${opponentInfo.isHome ? 'vs' : '@'} ${opponentInfo.name} (${opponentInfo.record})`
        : 'View your matchup';

      return {
        actionText: `Play ${weekLabel}`,
        contextText: matchupText,
        actionType: 'primary' as const,
        targetAction: 'view_matchup' as const,
        isEnabled: true,
      };
    }

    // If user's game is complete but other games aren't
    if (userGame?.isComplete) {
      return {
        actionText: 'Sim Remaining Games',
        contextText: `Your game complete - sim rest of ${weekLabel}`,
        actionType: 'secondary' as const,
        targetAction: 'advance_week' as const,
        isEnabled: true,
      };
    }

    return null;
  }, [gameState, calendar.currentWeek, phase, isOffseason]);

  // Handle action prompt press
  const handleActionPromptPress = () => {
    if (!actionPrompt) return;

    // Bye week gets its own action for one-tap sim
    if ('isByeWeek' in actionPrompt && actionPrompt.isByeWeek) {
      onAction('simByeWeek');
      return;
    }

    switch (actionPrompt.targetAction) {
      case 'view_matchup':
      case 'start_simulation':
        onAction('playWeek');
        break;
      case 'enter_offseason':
        onAction('offseason');
        break;
      case 'advance_week':
        onAction('playWeek');
        break;
      default:
        onAction('playWeek');
    }
  };

  // Calculate division standing
  const divisionTeams = Object.values(gameState.teams).filter(
    (t) => t.conference === userTeam.conference && t.division === userTeam.division
  );
  divisionTeams.sort((a, b) => {
    const aWinPct =
      a.currentRecord.wins + a.currentRecord.losses > 0
        ? a.currentRecord.wins / (a.currentRecord.wins + a.currentRecord.losses)
        : 0.5;
    const bWinPct =
      b.currentRecord.wins + b.currentRecord.losses > 0
        ? b.currentRecord.wins / (b.currentRecord.wins + b.currentRecord.losses)
        : 0.5;
    if (bWinPct !== aWinPct) return bWinPct - aWinPct;
    return (
      b.currentRecord.pointsFor -
      b.currentRecord.pointsAgainst -
      (a.currentRecord.pointsFor - a.currentRecord.pointsAgainst)
    );
  });
  const divisionPosition = divisionTeams.findIndex((t) => t.id === userTeam.id) + 1;
  const divisionLeader = divisionTeams.length > 0 ? divisionTeams[0] : null;
  const gamesBehindLeader =
    divisionPosition === 1 || !divisionLeader
      ? 0
      : (divisionLeader.currentRecord.wins -
          userTeam.currentRecord.wins +
          (userTeam.currentRecord.losses - divisionLeader.currentRecord.losses)) /
        2;
  const isPlayoffs = phase === 'playoffs';

  // First-time onboarding modal: show on week 1, season 1 (first dashboard visit)
  const isNewGame =
    !isOffseason &&
    calendar.currentWeek === 1 &&
    (!gameState.careerStats || gameState.careerStats.seasonsCompleted === 0);
  const [showOnboarding, setShowOnboarding] = useState(isNewGame);

  return (
    <SafeAreaView style={styles.container}>
      {/* First-Time Onboarding Modal */}
      <Modal
        visible={showOnboarding}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOnboarding(false)}
      >
        <View style={styles.onboardingOverlay}>
          <View style={styles.onboardingModal}>
            <Text style={styles.onboardingTitle}>Welcome, GM!</Text>
            <Text style={styles.onboardingSubtitle}>Here are a few tips to get you started:</Text>
            <View style={styles.onboardingTips}>
              <Text style={styles.onboardingTip}>
                Tap &quot;Play Week&quot; to start your first game
              </Text>
              <Text style={styles.onboardingTip}>Check your Depth Chart before each game</Text>
              <Text style={styles.onboardingTip}>Visit Roster to manage your players</Text>
              <Text style={styles.onboardingTip}>Monitor Owner Relations to keep your job</Text>
            </View>
            <TouchableOpacity
              style={styles.onboardingButton}
              onPress={() => setShowOnboarding(false)}
              accessibilityLabel="Dismiss onboarding tips"
              accessibilityRole="button"
              hitSlop={accessibility.hitSlop}
            >
              <Text style={styles.onboardingButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header with Team Info */}
      <View style={styles.header}>
        <View style={styles.teamBanner}>
          <Text style={styles.teamAbbr}>{userTeam.abbreviation}</Text>
          <View style={styles.teamDetails}>
            <Text style={styles.teamName}>
              {userTeam.city} {userTeam.nickname}
            </Text>
            <Text style={styles.gmName}>GM: {gameState.userName}</Text>
          </View>
        </View>
        <View style={styles.seasonInfo}>
          <Text style={styles.yearText}>{calendar.currentYear}</Text>
          <Text style={styles.phaseText}>{getPhaseDisplay(phase)}</Text>
          {!isOffseason && (
            <Text style={styles.weekText}>{getWeekDisplay(calendar.currentWeek, phase)}</Text>
          )}
        </View>
      </View>

      {/* Team Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Record</Text>
          <Text style={styles.statusValue}>{getRecordString(userTeam.currentRecord)}</Text>
        </View>
        <View style={styles.statusDivider} />
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Cap Space</Text>
          <Text style={styles.statusValue}>
            ${Math.round(userTeam.finances.capSpace / 1000)}M
          </Text>
        </View>
        <View style={styles.statusDivider} />
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Roster</Text>
          <Text style={styles.statusValue}>{userTeam.rosterPlayerIds.length}/53</Text>
        </View>
        {userTeam.playoffSeed && (
          <>
            <View style={styles.statusDivider} />
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Seed</Text>
              <Text style={[styles.statusValue, styles.seedText]}>#{userTeam.playoffSeed}</Text>
            </View>
          </>
        )}
      </View>

      {/* Job Security Status (tap to see Owner Relations) */}
      {patienceViewModel && (
        <TouchableOpacity
          style={[
            styles.jobSecurityBar,
            { borderLeftColor: getJobSecurityColor(patienceViewModel.status) },
          ]}
          onPress={() => onAction('ownerRelations')}
          activeOpacity={0.7}
          accessibilityLabel={`Job security: ${getJobSecurityLabel(patienceViewModel.status)} ${jobSecurityPct}%. ${patienceViewModel.trendDescription}`}
          accessibilityRole="button"
          accessibilityHint="View owner relations and job security details"
          hitSlop={accessibility.hitSlop}
        >
          <View style={styles.jobSecurityLeft}>
            <View style={styles.jobSecurityStatusRow}>
              <Ionicons
                name={getJobSecurityIcon(patienceViewModel.status)}
                size={18}
                color={getJobSecurityColor(patienceViewModel.status)}
              />
              <Text
                style={[
                  styles.jobSecurityStatus,
                  { color: getJobSecurityColor(patienceViewModel.status) },
                ]}
              >
                {getJobSecurityLabel(patienceViewModel.status)} {jobSecurityPct}%
              </Text>
            </View>
            <View style={styles.jobSecurityProgressBar}>
              <View
                style={[
                  styles.jobSecurityProgressFill,
                  {
                    width: `${jobSecurityPct}%`,
                    backgroundColor: getJobSecurityColor(patienceViewModel.status),
                  },
                ]}
              />
            </View>
            <Text style={styles.jobSecurityTrend}>{patienceViewModel.trendDescription}</Text>
          </View>
          <View style={styles.jobSecurityRight}>
            {patienceViewModel.isAtRisk && (
              <View style={styles.jobSecurityWarning}>
                <Ionicons name="warning" size={14} color={colors.textOnPrimary} />
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
          </View>
        </TouchableOpacity>
      )}

      {/* Division/Playoff Status Bar */}
      {!isOffseason && (
        <TouchableOpacity
          style={styles.divisionStatusBar}
          onPress={() => onAction(isPlayoffs ? 'standings' : 'standings')}
          activeOpacity={0.7}
        >
          {isPlayoffs ? (
            <>
              <View style={styles.playoffStatusLeft}>
                <Text style={styles.playoffStatusLabel}>PLAYOFFS</Text>
                <Text style={styles.playoffRoundText}>
                  {getWeekDisplay(calendar.currentWeek, phase)}
                </Text>
              </View>
              {userTeam.playoffSeed && (
                <View style={styles.seedContainer}>
                  <Text style={styles.seedLabel}>Seed</Text>
                  <Text style={styles.seedNumber}>#{userTeam.playoffSeed}</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.divisionStatusLeft}>
                <Text style={styles.divisionName}>
                  {userTeam.conference} {userTeam.division}
                </Text>
                <Text style={styles.divisionPosition}>
                  {divisionPosition === 1
                    ? 'Division Leader'
                    : `${divisionPosition}${getOrdinalSuffix(divisionPosition)} in Division`}
                </Text>
              </View>
              <View style={styles.divisionStatusRight}>
                {divisionPosition === 1 ? (
                  <View style={styles.leaderBadge}>
                    <Text style={styles.leaderBadgeText}>LEAD</Text>
                  </View>
                ) : (
                  <Text style={styles.gamesBehind}>
                    {gamesBehindLeader > 0 ? `-${gamesBehindLeader} GB` : 'Tied'}
                  </Text>
                )}
                <Text style={styles.divisionArrow}>→</Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Action Prompt - What to do next */}
      {actionPrompt && (
        <ActionPrompt
          prompt={actionPrompt}
          onPress={handleActionPromptPress}
          showPulse={actionPrompt.actionType === 'success'}
        />
      )}

      {/* Main Menu Grid */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.menuGrid}>
        {/* Primary Actions */}
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Team Management
        </Text>

        <MenuCard
          title="Roster"
          subtitle="View and manage your players"
          icon="👥"
          color={colors.primary}
          onPress={() => onAction('roster')}
        />

        <MenuCard
          title="Depth Chart"
          subtitle="Set starters and backups"
          icon="📊"
          color={colors.secondary}
          onPress={() => onAction('depthChart')}
        />

        <MenuCard
          title="Staff"
          subtitle="Coaches and scouts"
          icon="📋"
          color={colors.info}
          onPress={() => onAction('staff')}
        />

        <MenuCard
          title="Finances"
          subtitle="Salary cap overview"
          icon="💰"
          color={colors.success}
          onPress={() => onAction('finances')}
        />

        <MenuCard
          title="Contracts"
          subtitle="Manage player contracts"
          icon="📝"
          color={colors.warning}
          onPress={() => onAction('contracts')}
        />

        {!isOffseason && (
          <MenuCard
            title="Game Plan"
            subtitle="Set practice focus and strategy"
            icon="🎯"
            color="#6C5CE7"
            onPress={() => onAction('gamePlan')}
            badge="NEW"
          />
        )}

        {!isOffseason && (
          <MenuCard
            title="Start / Sit"
            subtitle="Manage questionable players"
            icon="🏥"
            color="#E17055"
            onPress={() => onAction('startSit')}
          />
        )}

        {!isOffseason && (
          <MenuCard
            title="Waiver Wire"
            subtitle="Claim players and PS elevations"
            icon="📎"
            color="#00B894"
            onPress={() => onAction('waiverWire')}
          />
        )}

        {/* Season Actions */}
        <Text style={styles.sectionTitle} accessibilityRole="header">
          Season
        </Text>

        {!isOffseason && (
          <MenuCard
            title={`Quick Sim Week ${calendar.currentWeek}`}
            subtitle="Simulate game instantly"
            icon="⚡"
            color={colors.secondary}
            onPress={() => onAction('quickSim')}
            badge="SIM"
          />
        )}

        {!isOffseason && (
          <MenuCard
            title="Sim Season"
            subtitle="Simulate rest of season"
            icon="⏩"
            color={colors.accent}
            onPress={() => onAction('simSeason')}
            badge="SIM"
          />
        )}

        <MenuCard
          title="Schedule"
          subtitle="View upcoming games"
          icon="📅"
          color={colors.primary}
          onPress={() => onAction('schedule')}
        />

        <MenuCard
          title="Standings"
          subtitle="League standings"
          icon="🏆"
          color={colors.warning}
          onPress={() => onAction('standings')}
        />

        <MenuCard
          title="Stats"
          subtitle="League leaders & team stats"
          icon="📈"
          color={colors.accent}
          onPress={() => onAction('stats')}
        />

        <MenuCard
          title="News"
          subtitle="Latest headlines"
          icon="📰"
          color={colors.info}
          onPress={() => onAction('news')}
        />

        <MenuCard
          title="Rumors"
          subtitle="Trade talk & free agency buzz"
          icon="🔥"
          color={colors.error}
          onPress={() => onAction('rumorMill')}
        />

        <MenuCard
          title="Weekly Digest"
          subtitle="Week summary"
          icon="📰"
          color={colors.warning}
          onPress={() => onAction('weeklyDigest')}
        />

        {!isOffseason && (
          <MenuCard
            title="Trade Offers"
            subtitle="Review incoming trade proposals"
            icon="🤝"
            color="#0984E3"
            onPress={() => onAction('tradeOffers')}
            badge={(() => {
              const gs = gameState as GameState & {
                tradeOffers?: { activeOffers?: Array<{ status: string }> };
              };
              const pending = gs.tradeOffers?.activeOffers?.filter((o) => o.status === 'pending');
              return pending && pending.length > 0 ? String(pending.length) : undefined;
            })()}
          />
        )}

        {!isOffseason && (
          <MenuCard
            title="Awards & Rankings"
            subtitle="Power rankings, POTW, award races"
            icon="🏅"
            color="#FDCB6E"
            onPress={() => onAction('weeklyAwards')}
          />
        )}

        {/* Offseason Actions */}
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {isOffseason ? 'Offseason' : 'Player Acquisition'}
        </Text>

        {isOffseason && (
          <MenuCard
            title="Offseason Tasks"
            subtitle="Complete offseason activities"
            icon="📋"
            color={colors.warning}
            onPress={() => onAction('offseason')}
            badge="ACTIVE"
          />
        )}

        <MenuCard
          title="Draft Board"
          subtitle="Scout and evaluate prospects"
          icon="🎓"
          color={colors.secondary}
          onPress={() => onAction('draft')}
          badge={isDraft ? 'DRAFT' : isCombine ? 'SCOUTING' : undefined}
        />

        <MenuCard
          title="Big Board"
          subtitle="Your scouting rankings"
          icon="📊"
          color={colors.info}
          onPress={() => onAction('bigBoard')}
        />

        <MenuCard
          title="Free Agency"
          subtitle="Sign available players"
          icon="✍️"
          color={colors.success}
          onPress={() => onAction('freeAgency')}
          badge={isFreeAgency ? 'ACTIVE' : undefined}
        />

        {isOffseason && (
          <MenuCard
            title="Restricted Free Agents"
            subtitle="Manage RFA tenders and offers"
            icon="🔒"
            color="#6C5CE7"
            onPress={() => onAction('rfa')}
          />
        )}

        {isOffseason && (
          <MenuCard
            title="Compensatory Picks"
            subtitle="Track comp pick projections"
            icon="📌"
            color="#E17055"
            onPress={() => onAction('compPicks')}
          />
        )}

        {/* League */}
        <Text style={styles.sectionTitle} accessibilityRole="header">
          League
        </Text>

        <MenuCard
          title="Season History"
          subtitle="Past seasons and champions"
          icon="📚"
          color={colors.primary}
          onPress={() => onAction('seasonHistory')}
        />

        <MenuCard
          title="Hall of Fame"
          subtitle="All-time greats"
          icon="🏛️"
          color={colors.secondary}
          onPress={() => onAction('hallOfFame')}
        />

        {/* System Actions */}
        <Text style={styles.sectionTitle} accessibilityRole="header">
          System
        </Text>

        <View style={styles.systemButtons}>
          <TouchableOpacity
            style={styles.systemButton}
            onPress={() => onAction('saveGame')}
            accessibilityLabel="Save game"
            accessibilityRole="button"
            accessibilityHint="Save your current progress"
            hitSlop={accessibility.hitSlop}
          >
            <Ionicons name="save" size={24} color={colors.primary} />
            <Text style={styles.systemButtonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.systemButton}
            onPress={() => onAction('settings')}
            accessibilityLabel="Settings"
            accessibilityRole="button"
            accessibilityHint="Open game settings"
            hitSlop={accessibility.hitSlop}
          >
            <Ionicons name="settings" size={24} color={colors.primary} />
            <Text style={styles.systemButtonText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.systemButton}
            onPress={() => onAction('mainMenu')}
            accessibilityLabel="Main menu"
            accessibilityRole="button"
            accessibilityHint="Return to the main menu"
            hitSlop={accessibility.hitSlop}
          >
            <Ionicons name="home" size={24} color={colors.primary} />
            <Text style={styles.systemButtonText}>Menu</Text>
          </TouchableOpacity>
        </View>

        {/* Career Stats - tap to see full career legacy */}
        {gameState.careerStats && (
          <TouchableOpacity
            style={styles.careerSection}
            onPress={() => onAction('careerLegacy')}
            activeOpacity={0.7}
          >
            <View style={styles.careerHeader}>
              <Text style={styles.careerTitle}>Career Stats</Text>
              <Text style={styles.careerViewMore}>View Legacy →</Text>
            </View>
            <View style={styles.careerStats}>
              <View style={styles.careerStat}>
                <Text style={styles.careerStatValue}>{gameState.careerStats.seasonsCompleted}</Text>
                <Text style={styles.careerStatLabel}>Seasons</Text>
              </View>
              <View style={styles.careerStat}>
                <Text style={styles.careerStatValue}>
                  {gameState.careerStats.totalWins}-{gameState.careerStats.totalLosses}
                </Text>
                <Text style={styles.careerStatLabel}>Record</Text>
              </View>
              <View style={styles.careerStat}>
                <Text style={styles.careerStatValue}>
                  {gameState.careerStats.playoffAppearances}
                </Text>
                <Text style={styles.careerStatLabel}>Playoffs</Text>
              </View>
              <View style={styles.careerStat}>
                <Text style={styles.careerStatValue}>{gameState.careerStats.championships}</Text>
                <Text style={styles.careerStatLabel}>Titles</Text>
              </View>
            </View>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    ...shadows.md,
  },
  teamBanner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamAbbr: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
    marginRight: spacing.md,
    opacity: 0.9,
  },
  teamDetails: {
    flex: 1,
  },
  teamName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  gmName: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    opacity: 0.8,
    marginTop: spacing.xxs,
  },
  seasonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  yearText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.secondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  phaseText: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    fontWeight: fontWeight.semibold,
  },
  weekText: {
    fontSize: fontSize.md,
    color: colors.textOnPrimary,
    opacity: 0.8,
  },
  statusBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  jobSecurityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 4,
  },
  jobSecurityLeft: {
    flex: 1,
  },
  jobSecurityRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  jobSecurityArrow: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  jobSecurityStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  jobSecurityStatus: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  jobSecurityProgressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: spacing.xs,
    overflow: 'hidden' as const,
  },
  jobSecurityProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  jobSecurityTrend: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  jobSecurityWarning: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobSecurityWarningText: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  // Division/Playoff Status Bar
  divisionStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  divisionStatusLeft: {
    flex: 1,
  },
  divisionStatusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  divisionName: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  divisionPosition: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  leaderBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  leaderBadgeText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
  gamesBehind: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  divisionArrow: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  playoffStatusLeft: {
    flex: 1,
  },
  playoffStatusLabel: {
    fontSize: fontSize.xs,
    color: colors.secondary,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  playoffRoundText: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.xxs,
  },
  seedContainer: {
    alignItems: 'center',
  },
  seedLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  seedNumber: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
  },
  statusDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  statusLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xxs,
  },
  seedText: {
    color: colors.success,
  },
  scrollView: {
    flex: 1,
  },
  menuGrid: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingLeft: spacing.xs,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  menuCardDisabled: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  menuCardContent: {
    flex: 1,
  },
  menuCardTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  menuCardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  textDisabled: {
    color: colors.textLight,
  },
  badge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  systemButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  systemButton: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  systemButtonIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  systemButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  careerSection: {
    backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  careerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  careerTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  careerViewMore: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  careerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  careerStat: {
    alignItems: 'center',
  },
  careerStatValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  careerStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  // Onboarding Modal
  onboardingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  onboardingModal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    ...shadows.lg,
  },
  onboardingTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  onboardingSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  onboardingTips: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  onboardingTip: {
    fontSize: fontSize.md,
    color: colors.text,
    paddingLeft: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingVertical: spacing.xs,
  },
  onboardingButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minHeight: accessibility.minTouchTarget,
    justifyContent: 'center',
  },
  onboardingButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
});

export default GMDashboardScreen;
