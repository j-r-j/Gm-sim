/**
 * StatsScreen
 * Comprehensive stats view with league leaders, team stats, and player stats
 * Supports filtering by team, conference, division, and league-wide
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { colors, spacing, fontSize, fontWeight, borderRadius, shadows } from '../styles';
import { GameState } from '../core/models/game/GameState';
import { Team } from '../core/models/team/Team';
import { Player } from '../core/models/player/Player';
import { Position, DEFENSIVE_POSITIONS } from '../core/models/player/Position';
import { Conference, Division } from '../core/models/team/FakeCities';
import {
  PlayerSeasonStats,
  TeamSeasonStats,
  createEmptyPlayerSeasonStats,
  createEmptyTeamSeasonStats,
} from '../core/game/SeasonStatsAggregator';

// ============================================================================
// Types
// ============================================================================

type StatsTab = 'leaders' | 'teams' | 'players';
type FilterScope = 'league' | 'conference' | 'division' | 'team';

interface StatsScreenProps {
  gameState: GameState;
  onBack: () => void;
  onPlayerSelect?: (playerId: string) => void;
}

/** Player with team association for stats display */
interface PlayerWithTeam extends Player {
  teamId: string | null;
}

/** Build a map from playerId to teamId based on team rosters */
function buildPlayerTeamMap(gameState: GameState): Map<string, string> {
  const map = new Map<string, string>();
  for (const team of Object.values(gameState.teams)) {
    for (const playerId of team.rosterPlayerIds) {
      map.set(playerId, team.id);
    }
    // Also include practice squad and IR
    for (const playerId of team.practiceSquadIds || []) {
      map.set(playerId, team.id);
    }
    for (const playerId of team.injuredReserveIds || []) {
      map.set(playerId, team.id);
    }
  }
  return map;
}

/** Get all players with their team associations */
function getPlayersWithTeams(gameState: GameState): PlayerWithTeam[] {
  const playerTeamMap = buildPlayerTeamMap(gameState);
  return Object.values(gameState.players).map((player) => ({
    ...player,
    teamId: playerTeamMap.get(player.id) || null,
  }));
}

interface StatCategory {
  id: string;
  label: string;
  positions: Position[];
  getValue: (stats: PlayerSeasonStats) => number;
  format: (value: number) => string;
  minQualifier?: (stats: PlayerSeasonStats) => boolean;
}

// ============================================================================
// Stat Categories by Position Group
// ============================================================================

const PASSING_CATEGORIES: StatCategory[] = [
  {
    id: 'passYards',
    label: 'Pass Yards',
    positions: [Position.QB],
    getValue: (s) => s.passing.yards,
    format: (v) => v.toLocaleString(),
    minQualifier: (s) => s.passing.attempts >= 50,
  },
  {
    id: 'passTDs',
    label: 'Pass TDs',
    positions: [Position.QB],
    getValue: (s) => s.passing.touchdowns,
    format: (v) => v.toString(),
    minQualifier: (s) => s.passing.attempts >= 50,
  },
  {
    id: 'passerRating',
    label: 'Passer Rating',
    positions: [Position.QB],
    getValue: (s) => s.passing.rating,
    format: (v) => v.toFixed(1),
    minQualifier: (s) => s.passing.attempts >= 100,
  },
  {
    id: 'completionPct',
    label: 'Comp %',
    positions: [Position.QB],
    getValue: (s) =>
      s.passing.attempts > 0 ? (s.passing.completions / s.passing.attempts) * 100 : 0,
    format: (v) => v.toFixed(1) + '%',
    minQualifier: (s) => s.passing.attempts >= 100,
  },
  {
    id: 'interceptions',
    label: 'INTs Thrown',
    positions: [Position.QB],
    getValue: (s) => s.passing.interceptions,
    format: (v) => v.toString(),
  },
];

const RUSHING_CATEGORIES: StatCategory[] = [
  {
    id: 'rushYards',
    label: 'Rush Yards',
    positions: [Position.RB, Position.QB],
    getValue: (s) => s.rushing.yards,
    format: (v) => v.toLocaleString(),
    minQualifier: (s) => s.rushing.attempts >= 30,
  },
  {
    id: 'rushTDs',
    label: 'Rush TDs',
    positions: [Position.RB, Position.QB, Position.WR],
    getValue: (s) => s.rushing.touchdowns,
    format: (v) => v.toString(),
  },
  {
    id: 'yardsPerCarry',
    label: 'YPC',
    positions: [Position.RB],
    getValue: (s) => s.rushing.yardsPerCarry,
    format: (v) => v.toFixed(1),
    minQualifier: (s) => s.rushing.attempts >= 50,
  },
  {
    id: 'rushAttempts',
    label: 'Carries',
    positions: [Position.RB],
    getValue: (s) => s.rushing.attempts,
    format: (v) => v.toString(),
  },
];

const RECEIVING_CATEGORIES: StatCategory[] = [
  {
    id: 'recYards',
    label: 'Rec Yards',
    positions: [Position.WR, Position.TE, Position.RB],
    getValue: (s) => s.receiving.yards,
    format: (v) => v.toLocaleString(),
    minQualifier: (s) => s.receiving.receptions >= 10,
  },
  {
    id: 'receptions',
    label: 'Receptions',
    positions: [Position.WR, Position.TE, Position.RB],
    getValue: (s) => s.receiving.receptions,
    format: (v) => v.toString(),
  },
  {
    id: 'recTDs',
    label: 'Rec TDs',
    positions: [Position.WR, Position.TE, Position.RB],
    getValue: (s) => s.receiving.touchdowns,
    format: (v) => v.toString(),
  },
  {
    id: 'yardsPerRec',
    label: 'YPR',
    positions: [Position.WR, Position.TE],
    getValue: (s) => s.receiving.yardsPerReception,
    format: (v) => v.toFixed(1),
    minQualifier: (s) => s.receiving.receptions >= 20,
  },
  {
    id: 'targets',
    label: 'Targets',
    positions: [Position.WR, Position.TE, Position.RB],
    getValue: (s) => s.receiving.targets,
    format: (v) => v.toString(),
  },
];

const DEFENSIVE_CATEGORIES: StatCategory[] = [
  {
    id: 'tackles',
    label: 'Tackles',
    positions: [...DEFENSIVE_POSITIONS],
    getValue: (s) => s.defensive.tackles,
    format: (v) => v.toString(),
  },
  {
    id: 'sacks',
    label: 'Sacks',
    positions: [Position.DE, Position.DT, Position.OLB, Position.ILB],
    getValue: (s) => s.defensive.sacks,
    format: (v) => v.toFixed(1),
  },
  {
    id: 'defInterceptions',
    label: 'INTs',
    positions: [Position.CB, Position.FS, Position.SS, Position.ILB, Position.OLB],
    getValue: (s) => s.defensive.interceptions,
    format: (v) => v.toString(),
  },
  {
    id: 'passesDefended',
    label: 'PDs',
    positions: [Position.CB, Position.FS, Position.SS],
    getValue: (s) => s.defensive.passesDefended,
    format: (v) => v.toString(),
  },
  {
    id: 'forcedFumbles',
    label: 'FF',
    positions: [...DEFENSIVE_POSITIONS],
    getValue: (s) => s.defensive.forcedFumbles,
    format: (v) => v.toString(),
  },
  {
    id: 'tacklesForLoss',
    label: 'TFL',
    positions: [...DEFENSIVE_POSITIONS],
    getValue: (s) => s.defensive.tacklesForLoss,
    format: (v) => v.toString(),
  },
];

const KICKING_CATEGORIES: StatCategory[] = [
  {
    id: 'fgMade',
    label: 'FG Made',
    positions: [Position.K],
    getValue: (s) => s.kicking.fieldGoalsMade,
    format: (v) => v.toString(),
  },
  {
    id: 'fgPct',
    label: 'FG %',
    positions: [Position.K],
    getValue: (s) =>
      s.kicking.fieldGoalAttempts > 0
        ? (s.kicking.fieldGoalsMade / s.kicking.fieldGoalAttempts) * 100
        : 0,
    format: (v) => v.toFixed(1) + '%',
    minQualifier: (s) => s.kicking.fieldGoalAttempts >= 5,
  },
  {
    id: 'longFG',
    label: 'Long FG',
    positions: [Position.K],
    getValue: (s) => s.kicking.longestFieldGoal,
    format: (v) => v.toString(),
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get season stats for a player
 * Returns stats from gameState.seasonStats or empty stats if not tracked yet
 */
function getPlayerSeasonStats(gameState: GameState, playerId: string): PlayerSeasonStats {
  // Return stats from seasonStats if available, otherwise empty stats
  if (gameState.seasonStats && gameState.seasonStats[playerId]) {
    return gameState.seasonStats[playerId];
  }
  return createEmptyPlayerSeasonStats(playerId);
}

function getTeamSeasonStats(gameState: GameState, teamId: string): TeamSeasonStats {
  const team = gameState.teams[teamId];
  const stats = createEmptyTeamSeasonStats(teamId);

  if (!team) return stats;

  const gamesPlayed = team.currentRecord.wins + team.currentRecord.losses + team.currentRecord.ties;
  stats.gamesPlayed = gamesPlayed;
  stats.pointsFor = team.currentRecord.pointsFor;
  stats.pointsAgainst = team.currentRecord.pointsAgainst;

  // TODO: Pull actual yardage stats from gameState.seasonStats when implemented
  // For now, leave yardage and turnover stats at 0 until games are played

  if (gamesPlayed > 0) {
    stats.pointsPerGame = Math.round((stats.pointsFor / gamesPlayed) * 10) / 10;
    stats.pointsAllowedPerGame = Math.round((stats.pointsAgainst / gamesPlayed) * 10) / 10;
  }

  return stats;
}

// ============================================================================
// Sub-Components
// ============================================================================

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function TabButton({ label, isActive, onPress }: TabButtonProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface FilterChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function FilterChip({ label, isActive, onPress }: FilterChipProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.filterChip, isActive && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

interface LeaderCardProps {
  rank: number;
  playerName: string;
  teamAbbr: string;
  position: string;
  value: string;
  statLabel: string;
  isUserTeam: boolean;
  onPress: () => void;
}

function LeaderCard({
  rank,
  playerName,
  teamAbbr,
  position,
  value,
  statLabel,
  isUserTeam,
  onPress,
}: LeaderCardProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.leaderCard, isUserTeam && styles.leaderCardHighlight]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leaderRank}>
        <Text style={[styles.leaderRankText, rank <= 3 && styles.leaderRankTop]}>{rank}</Text>
      </View>
      <View style={styles.leaderInfo}>
        <Text style={styles.leaderName} numberOfLines={1}>
          {playerName}
        </Text>
        <Text style={styles.leaderTeam}>
          {teamAbbr} - {position}
        </Text>
      </View>
      <View style={styles.leaderStat}>
        <Text style={styles.leaderStatValue}>{value}</Text>
        <Text style={styles.leaderStatLabel}>{statLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

interface TeamStatsRowProps {
  rank: number;
  team: Team;
  stats: TeamSeasonStats;
  isUserTeam: boolean;
  statType: 'offense' | 'defense';
}

function TeamStatsRow({
  rank,
  team,
  stats,
  isUserTeam,
  statType,
}: TeamStatsRowProps): React.JSX.Element {
  return (
    <View style={[styles.teamRow, isUserTeam && styles.teamRowHighlight]}>
      <Text style={styles.teamRank}>{rank}</Text>
      <View style={styles.teamInfo}>
        <Text style={styles.teamAbbr}>{team.abbreviation}</Text>
        <Text style={styles.teamName} numberOfLines={1}>
          {team.nickname}
        </Text>
      </View>
      {statType === 'offense' ? (
        <>
          <Text style={styles.teamStat}>{stats.pointsPerGame.toFixed(1)}</Text>
          <Text style={styles.teamStat}>{stats.yardsPerGame.toFixed(0)}</Text>
          <Text style={styles.teamStat}>{stats.turnoversCommitted}</Text>
        </>
      ) : (
        <>
          <Text style={styles.teamStat}>{stats.pointsAllowedPerGame.toFixed(1)}</Text>
          <Text style={styles.teamStat}>{stats.yardsAllowedPerGame.toFixed(0)}</Text>
          <Text style={styles.teamStat}>{stats.turnoversForced}</Text>
        </>
      )}
    </View>
  );
}

// ============================================================================
// Main Views
// ============================================================================

interface LeagueLeadersViewProps {
  gameState: GameState;
  filterScope: FilterScope;
  selectedConference: Conference | null;
  selectedDivision: Division | null;
  selectedTeamId: string | null;
  onPlayerSelect?: (playerId: string) => void;
}

function LeagueLeadersView({
  gameState,
  filterScope,
  selectedConference,
  selectedDivision,
  selectedTeamId,
  onPlayerSelect,
}: LeagueLeadersViewProps): React.JSX.Element {
  const [selectedCategory, setSelectedCategory] = useState<
    'passing' | 'rushing' | 'receiving' | 'defense' | 'kicking'
  >('passing');

  const categories = useMemo(() => {
    switch (selectedCategory) {
      case 'passing':
        return PASSING_CATEGORIES;
      case 'rushing':
        return RUSHING_CATEGORIES;
      case 'receiving':
        return RECEIVING_CATEGORIES;
      case 'defense':
        return DEFENSIVE_CATEGORIES;
      case 'kicking':
        return KICKING_CATEGORIES;
      default:
        return PASSING_CATEGORIES;
    }
  }, [selectedCategory]);

  const [selectedStatCategory, setSelectedStatCategory] = useState(categories[0]);

  // Update selected stat when category group changes
  React.useEffect(() => {
    setSelectedStatCategory(categories[0]);
  }, [categories]);

  // Get filtered players with team associations
  const filteredPlayers = useMemo(() => {
    let players = getPlayersWithTeams(gameState);

    // Filter by position for the category
    players = players.filter((p) => selectedStatCategory.positions.includes(p.position));

    // Apply scope filter
    if (filterScope === 'team' && selectedTeamId) {
      players = players.filter((p) => p.teamId === selectedTeamId);
    } else if (filterScope === 'division' && selectedConference && selectedDivision) {
      const divisionTeamIds = Object.values(gameState.teams)
        .filter((t) => t.conference === selectedConference && t.division === selectedDivision)
        .map((t) => t.id);
      players = players.filter((p) => p.teamId && divisionTeamIds.includes(p.teamId));
    } else if (filterScope === 'conference' && selectedConference) {
      const confTeamIds = Object.values(gameState.teams)
        .filter((t) => t.conference === selectedConference)
        .map((t) => t.id);
      players = players.filter((p) => p.teamId && confTeamIds.includes(p.teamId));
    }

    return players;
  }, [
    gameState,
    filterScope,
    selectedConference,
    selectedDivision,
    selectedTeamId,
    selectedStatCategory,
  ]);

  // Get sorted leaders
  const leaders = useMemo(() => {
    const playerStats = filteredPlayers.map((player) => ({
      player,
      stats: getPlayerSeasonStats(gameState, player.id),
    }));

    // Apply qualifier filter if exists
    const qualified = selectedStatCategory.minQualifier
      ? playerStats.filter((ps) => selectedStatCategory.minQualifier!(ps.stats))
      : playerStats;

    // Sort by stat value
    return qualified
      .sort(
        (a, b) => selectedStatCategory.getValue(b.stats) - selectedStatCategory.getValue(a.stats)
      )
      .slice(0, 25);
  }, [filteredPlayers, gameState, selectedStatCategory]);

  return (
    <View style={styles.viewContainer}>
      {/* Category selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {(['passing', 'rushing', 'receiving', 'defense', 'kicking'] as const).map((cat) => (
          <FilterChip
            key={cat}
            label={cat.charAt(0).toUpperCase() + cat.slice(1)}
            isActive={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat)}
          />
        ))}
      </ScrollView>

      {/* Stat type selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statTypeScroll}
        contentContainerStyle={styles.statTypeScrollContent}
      >
        {categories.map((cat) => (
          <FilterChip
            key={cat.id}
            label={cat.label}
            isActive={selectedStatCategory.id === cat.id}
            onPress={() => setSelectedStatCategory(cat)}
          />
        ))}
      </ScrollView>

      {/* Leaders list */}
      <FlatList
        data={leaders}
        keyExtractor={(item) => item.player.id}
        renderItem={({ item, index }) => {
          const team = item.player.teamId ? gameState.teams[item.player.teamId] : null;
          return (
            <LeaderCard
              rank={index + 1}
              playerName={`${item.player.firstName} ${item.player.lastName}`}
              teamAbbr={team?.abbreviation || 'FA'}
              position={item.player.position}
              value={selectedStatCategory.format(selectedStatCategory.getValue(item.stats))}
              statLabel={selectedStatCategory.label}
              isUserTeam={item.player.teamId === gameState.userTeamId}
              onPress={() => onPlayerSelect?.(item.player.id)}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No qualifying players found</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

interface TeamStatsViewProps {
  gameState: GameState;
  filterScope: FilterScope;
  selectedConference: Conference | null;
  selectedDivision: Division | null;
}

function TeamStatsView({
  gameState,
  filterScope,
  selectedConference,
  selectedDivision,
}: TeamStatsViewProps): React.JSX.Element {
  const [statType, setStatType] = useState<'offense' | 'defense'>('offense');

  // Get filtered teams
  const filteredTeams = useMemo(() => {
    let teams = Object.values(gameState.teams);

    if (filterScope === 'division' && selectedConference && selectedDivision) {
      teams = teams.filter(
        (t) => t.conference === selectedConference && t.division === selectedDivision
      );
    } else if (filterScope === 'conference' && selectedConference) {
      teams = teams.filter((t) => t.conference === selectedConference);
    }

    return teams;
  }, [gameState.teams, filterScope, selectedConference, selectedDivision]);

  // Get sorted teams with stats
  const rankedTeams = useMemo(() => {
    const teamsWithStats = filteredTeams.map((team) => ({
      team,
      stats: getTeamSeasonStats(gameState, team.id),
    }));

    // Sort by relevant metric
    if (statType === 'offense') {
      return teamsWithStats.sort((a, b) => b.stats.pointsPerGame - a.stats.pointsPerGame);
    } else {
      return teamsWithStats.sort(
        (a, b) => a.stats.pointsAllowedPerGame - b.stats.pointsAllowedPerGame
      );
    }
  }, [filteredTeams, gameState, statType]);

  return (
    <View style={styles.viewContainer}>
      {/* Offense/Defense toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, statType === 'offense' && styles.toggleButtonActive]}
          onPress={() => setStatType('offense')}
        >
          <Text style={[styles.toggleText, statType === 'offense' && styles.toggleTextActive]}>
            Offense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, statType === 'defense' && styles.toggleButtonActive]}
          onPress={() => setStatType('defense')}
        >
          <Text style={[styles.toggleText, statType === 'defense' && styles.toggleTextActive]}>
            Defense
          </Text>
        </TouchableOpacity>
      </View>

      {/* Header row */}
      <View style={styles.teamHeader}>
        <Text style={styles.teamHeaderRank}>#</Text>
        <Text style={styles.teamHeaderName}>Team</Text>
        {statType === 'offense' ? (
          <>
            <Text style={styles.teamHeaderStat}>PPG</Text>
            <Text style={styles.teamHeaderStat}>YPG</Text>
            <Text style={styles.teamHeaderStat}>TO</Text>
          </>
        ) : (
          <>
            <Text style={styles.teamHeaderStat}>PPG</Text>
            <Text style={styles.teamHeaderStat}>YPG</Text>
            <Text style={styles.teamHeaderStat}>TO</Text>
          </>
        )}
      </View>

      {/* Teams list */}
      <FlatList
        data={rankedTeams}
        keyExtractor={(item) => item.team.id}
        renderItem={({ item, index }) => (
          <TeamStatsRow
            rank={index + 1}
            team={item.team}
            stats={item.stats}
            isUserTeam={item.team.id === gameState.userTeamId}
            statType={statType}
          />
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

interface PlayerStatsViewProps {
  gameState: GameState;
  filterScope: FilterScope;
  selectedConference: Conference | null;
  selectedDivision: Division | null;
  selectedTeamId: string | null;
  onPlayerSelect?: (playerId: string) => void;
}

function PlayerStatsView({
  gameState,
  filterScope,
  selectedConference,
  selectedDivision,
  selectedTeamId,
  onPlayerSelect,
}: PlayerStatsViewProps): React.JSX.Element {
  const [selectedPosition, setSelectedPosition] = useState<Position | 'ALL'>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'team' | 'games'>('games');

  // Position groups for filter
  const positionGroups = [
    { label: 'All', value: 'ALL' as const },
    { label: 'QB', value: Position.QB },
    { label: 'RB', value: Position.RB },
    { label: 'WR', value: Position.WR },
    { label: 'TE', value: Position.TE },
    { label: 'OL', value: Position.LT }, // Represents all OL
    { label: 'DL', value: Position.DE }, // Represents all DL
    { label: 'LB', value: Position.ILB },
    { label: 'DB', value: Position.CB },
    { label: 'K', value: Position.K },
  ];

  // Get filtered players with team associations
  const filteredPlayers = useMemo(() => {
    let players = getPlayersWithTeams(gameState);

    // Filter by position
    if (selectedPosition !== 'ALL') {
      if (selectedPosition === Position.LT) {
        // All OL positions
        players = players.filter((p) =>
          [Position.LT, Position.LG, Position.C, Position.RG, Position.RT].includes(p.position)
        );
      } else if (selectedPosition === Position.DE) {
        // All DL positions
        players = players.filter((p) => [Position.DE, Position.DT].includes(p.position));
      } else if (selectedPosition === Position.ILB) {
        // All LB positions
        players = players.filter((p) => [Position.ILB, Position.OLB].includes(p.position));
      } else if (selectedPosition === Position.CB) {
        // All DB positions
        players = players.filter((p) =>
          [Position.CB, Position.FS, Position.SS].includes(p.position)
        );
      } else {
        players = players.filter((p) => p.position === selectedPosition);
      }
    }

    // Apply scope filter
    if (filterScope === 'team' && selectedTeamId) {
      players = players.filter((p) => p.teamId === selectedTeamId);
    } else if (filterScope === 'division' && selectedConference && selectedDivision) {
      const divisionTeamIds = Object.values(gameState.teams)
        .filter((t) => t.conference === selectedConference && t.division === selectedDivision)
        .map((t) => t.id);
      players = players.filter((p) => p.teamId && divisionTeamIds.includes(p.teamId));
    } else if (filterScope === 'conference' && selectedConference) {
      const confTeamIds = Object.values(gameState.teams)
        .filter((t) => t.conference === selectedConference)
        .map((t) => t.id);
      players = players.filter((p) => p.teamId && confTeamIds.includes(p.teamId));
    }

    return players;
  }, [
    gameState,
    filterScope,
    selectedConference,
    selectedDivision,
    selectedTeamId,
    selectedPosition,
  ]);

  // Sort players
  const sortedPlayers = useMemo(() => {
    const playersWithStats = filteredPlayers.map((player) => ({
      player,
      stats: getPlayerSeasonStats(gameState, player.id),
    }));

    switch (sortBy) {
      case 'name':
        return playersWithStats.sort((a, b) => a.player.lastName.localeCompare(b.player.lastName));
      case 'team':
        return playersWithStats.sort((a, b) => {
          const teamA = a.player.teamId ? gameState.teams[a.player.teamId]?.abbreviation || '' : '';
          const teamB = b.player.teamId ? gameState.teams[b.player.teamId]?.abbreviation || '' : '';
          return teamA.localeCompare(teamB);
        });
      case 'games':
        return playersWithStats.sort((a, b) => b.stats.gamesPlayed - a.stats.gamesPlayed);
      default:
        return playersWithStats;
    }
  }, [filteredPlayers, gameState, sortBy]);

  // Get position-specific stat display
  const getPositionStats = (player: PlayerWithTeam, stats: PlayerSeasonStats): string => {
    switch (player.position) {
      case Position.QB:
        return `${stats.passing.yards} YDS, ${stats.passing.touchdowns} TD, ${stats.passing.interceptions} INT`;
      case Position.RB:
        return `${stats.rushing.yards} RUSH, ${stats.receiving.yards} REC, ${stats.rushing.touchdowns + stats.receiving.touchdowns} TD`;
      case Position.WR:
      case Position.TE:
        return `${stats.receiving.receptions} REC, ${stats.receiving.yards} YDS, ${stats.receiving.touchdowns} TD`;
      case Position.K:
        return `${stats.kicking.fieldGoalsMade}/${stats.kicking.fieldGoalAttempts} FG, ${stats.kicking.extraPointsMade} XP`;
      default:
        if (DEFENSIVE_POSITIONS.includes(player.position)) {
          return `${stats.defensive.tackles} TKL, ${stats.defensive.sacks} SCK, ${stats.defensive.interceptions} INT`;
        }
        return `${stats.gamesPlayed} GP`;
    }
  };

  return (
    <View style={styles.viewContainer}>
      {/* Position filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        {positionGroups.map((pg) => (
          <FilterChip
            key={pg.value}
            label={pg.label}
            isActive={selectedPosition === pg.value}
            onPress={() => setSelectedPosition(pg.value)}
          />
        ))}
      </ScrollView>

      {/* Sort options */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        {(['games', 'name', 'team'] as const).map((sort) => (
          <TouchableOpacity
            key={sort}
            style={[styles.sortOption, sortBy === sort && styles.sortOptionActive]}
            onPress={() => setSortBy(sort)}
          >
            <Text style={[styles.sortOptionText, sortBy === sort && styles.sortOptionTextActive]}>
              {sort.charAt(0).toUpperCase() + sort.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Players list */}
      <FlatList
        data={sortedPlayers}
        keyExtractor={(item) => item.player.id}
        renderItem={({ item }) => {
          const team = item.player.teamId ? gameState.teams[item.player.teamId] : null;
          return (
            <TouchableOpacity
              style={[
                styles.playerRow,
                item.player.teamId === gameState.userTeamId && styles.playerRowHighlight,
              ]}
              onPress={() => onPlayerSelect?.(item.player.id)}
              activeOpacity={0.7}
            >
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>
                  {item.player.firstName} {item.player.lastName}
                </Text>
                <Text style={styles.playerMeta}>
                  {team?.abbreviation || 'FA'} - {item.player.position} - {item.stats.gamesPlayed}{' '}
                  GP
                </Text>
              </View>
              <Text style={styles.playerStats}>{getPositionStats(item.player, item.stats)}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No players found</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function StatsScreen({
  gameState,
  onBack,
  onPlayerSelect,
}: StatsScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<StatsTab>('leaders');
  const [filterScope, setFilterScope] = useState<FilterScope>('league');
  const [selectedConference, setSelectedConference] = useState<Conference | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const userTeam = gameState.teams[gameState.userTeamId];

  // Get conference/division options
  const conferences: Conference[] = ['AFC', 'NFC'];
  const divisions: Division[] = ['North', 'South', 'East', 'West'];

  // Handle filter scope change
  const handleScopeChange = (scope: FilterScope) => {
    setFilterScope(scope);
    if (scope === 'league') {
      setSelectedConference(null);
      setSelectedDivision(null);
      setSelectedTeamId(null);
    } else if (scope === 'team') {
      setSelectedTeamId(gameState.userTeamId);
      setSelectedConference(userTeam.conference);
      setSelectedDivision(userTeam.division);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>League Stats</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TabButton
          label="Leaders"
          isActive={activeTab === 'leaders'}
          onPress={() => setActiveTab('leaders')}
        />
        <TabButton
          label="Teams"
          isActive={activeTab === 'teams'}
          onPress={() => setActiveTab('teams')}
        />
        <TabButton
          label="Players"
          isActive={activeTab === 'players'}
          onPress={() => setActiveTab('players')}
        />
      </View>

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          <FilterChip
            label="League"
            isActive={filterScope === 'league'}
            onPress={() => handleScopeChange('league')}
          />
          <FilterChip
            label="Conference"
            isActive={filterScope === 'conference'}
            onPress={() => handleScopeChange('conference')}
          />
          <FilterChip
            label="Division"
            isActive={filterScope === 'division'}
            onPress={() => handleScopeChange('division')}
          />
          {activeTab !== 'teams' && (
            <FilterChip
              label="My Team"
              isActive={filterScope === 'team'}
              onPress={() => handleScopeChange('team')}
            />
          )}
        </ScrollView>
      </View>

      {/* Conference/Division Selector */}
      {(filterScope === 'conference' || filterScope === 'division') && (
        <View style={styles.subFilterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {conferences.map((conf) => (
              <FilterChip
                key={conf}
                label={conf}
                isActive={selectedConference === conf}
                onPress={() => {
                  setSelectedConference(conf);
                  if (filterScope === 'division' && !selectedDivision) {
                    setSelectedDivision('North');
                  }
                }}
              />
            ))}
            {filterScope === 'division' && selectedConference && (
              <>
                <View style={styles.filterDivider} />
                {divisions.map((div) => (
                  <FilterChip
                    key={div}
                    label={div}
                    isActive={selectedDivision === div}
                    onPress={() => setSelectedDivision(div)}
                  />
                ))}
              </>
            )}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      {activeTab === 'leaders' && (
        <LeagueLeadersView
          gameState={gameState}
          filterScope={filterScope}
          selectedConference={selectedConference}
          selectedDivision={selectedDivision}
          selectedTeamId={selectedTeamId}
          onPlayerSelect={onPlayerSelect}
        />
      )}
      {activeTab === 'teams' && (
        <TeamStatsView
          gameState={gameState}
          filterScope={filterScope}
          selectedConference={selectedConference}
          selectedDivision={selectedDivision}
        />
      )}
      {activeTab === 'players' && (
        <PlayerStatsView
          gameState={gameState}
          filterScope={filterScope}
          selectedConference={selectedConference}
          selectedDivision={selectedDivision}
          selectedTeamId={selectedTeamId}
          onPlayerSelect={onPlayerSelect}
        />
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.md,
  },
  backButton: {
    paddingVertical: spacing.xs,
    paddingRight: spacing.md,
  },
  backButtonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textOnPrimary,
  },
  headerSpacer: {
    width: 50,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  filterBar: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subFilterBar: {
    backgroundColor: colors.surfaceLight,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterScrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.textOnPrimary,
  },
  filterDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  viewContainer: {
    flex: 1,
  },
  categoryScroll: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryScrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  statTypeScroll: {
    backgroundColor: colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statTypeScrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
  },
  leaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  leaderCardHighlight: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  leaderRank: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  leaderRankText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  leaderRankTop: {
    color: colors.secondary,
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  leaderTeam: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  leaderStat: {
    alignItems: 'flex-end',
  },
  leaderStatValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  leaderStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  toggleContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.textOnPrimary,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  teamHeaderRank: {
    width: 30,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  teamHeaderName: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  teamHeaderStat: {
    width: 60,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  teamRowHighlight: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  teamRank: {
    width: 30,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  teamInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamAbbr: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    width: 40,
  },
  teamName: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
  },
  teamStat: {
    width: 60,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: 'right',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  sortLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  sortOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  sortOptionActive: {
    backgroundColor: colors.primary + '20',
  },
  sortOptionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  sortOptionTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  playerRow: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  playerRowHighlight: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  playerInfo: {
    marginBottom: spacing.xs,
  },
  playerName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
  },
  playerMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  playerStats: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
});

export default StatsScreen;
