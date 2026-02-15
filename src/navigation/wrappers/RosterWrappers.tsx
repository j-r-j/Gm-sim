/**
 * Roster & Player Screen Wrappers
 * Bridge components for roster management, depth chart, owner relations,
 * contracts, player profiles, and player comparison screens.
 *
 * These wrappers handle:
 * - Roster management with IR, cut, extend, trade
 * - V2 depth chart with migration from legacy
 * - Owner demands, patience meter view
 * - Cap status, contracts, franchise tag, restructure
 * - Player/prospect profile with scout reports, PlayerDetailCard
 * - Side-by-side player comparison
 */

import React, { useEffect } from 'react';
import { SafeAreaView } from 'react-native';
import { useGame } from '../GameContext';
import { showAlert, showConfirm } from '@utils/alert';
import { ScreenProps } from '../types';
import { LoadingFallback, tryCompleteViewTask } from './shared';
import { colors } from '../../styles';

// Screen imports
import { RosterScreen } from '../../screens/RosterScreen';
import { DepthChartScreenV2 } from '../../screens/DepthChartScreenV2';
import { OwnerRelationsScreen } from '../../screens/OwnerRelationsScreen';
import { ContractManagementScreen } from '../../screens/ContractManagementScreen';
import { PlayerProfileScreen } from '../../screens/PlayerProfileScreen';
import { PlayerDetailCard } from '../../components/player';
import { PlayerComparisonScreen } from '../../screens/PlayerComparisonScreen';

// Core type imports
import { GameState } from '../../core/models/game/GameState';
import { generateDepthChartV2, DepthChartV2, migrateLegacyDepthChart } from '../../core/roster';
import { createOwnerViewModel } from '../../core/models/owner';
import { createPatienceViewModel } from '../../core/career/PatienceMeterManager';
import { PlayerContract } from '../../core/contracts';
import { ContractAction } from '../../screens/ContractManagementScreen';
import { ScoutReport } from '../../core/scouting/ScoutReportGenerator';
import { OffensiveScheme, DefensiveScheme } from '../../core/models/player/SchemeFit';

// ============================================
// ROSTER SCREEN
// ============================================

export function RosterScreenWrapper({ navigation }: ScreenProps<'Roster'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading roster..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const capSpace = userTeam.finances?.capSpace ?? 0;

  const injuredReserveIds: string[] = userTeam.injuredReserveIds || [];
  const practiceSquadIds: string[] = userTeam.practiceSquadIds || [];

  return (
    <RosterScreen
      rosterIds={userTeam.rosterPlayerIds}
      practiceSquadIds={practiceSquadIds}
      injuredReserveIds={injuredReserveIds}
      players={gameState.players}
      capSpace={capSpace}
      onBack={() => navigation.goBack()}
      onSelectPlayer={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
      onPlaceOnIR={async (playerId) => {
        const updatedRoster = userTeam.rosterPlayerIds.filter((id) => id !== playerId);
        const updatedIR = [...injuredReserveIds, playerId];
        const updatedTeam = {
          ...userTeam,
          rosterPlayerIds: updatedRoster,
          injuredReserveIds: updatedIR,
        };
        const updatedState: GameState = {
          ...gameState,
          teams: { ...gameState.teams, [userTeam.id]: updatedTeam },
        };
        setGameState(updatedState);
        await saveGameState(updatedState);
        return true;
      }}
      onActivateFromIR={async (playerId) => {
        const updatedIR = injuredReserveIds.filter((id) => id !== playerId);
        const updatedRoster = [...userTeam.rosterPlayerIds, playerId];
        const updatedTeam = {
          ...userTeam,
          rosterPlayerIds: updatedRoster,
          injuredReserveIds: updatedIR,
        };
        const updatedState: GameState = {
          ...gameState,
          teams: { ...gameState.teams, [userTeam.id]: updatedTeam },
        };
        setGameState(updatedState);
        await saveGameState(updatedState);
        return true;
      }}
      onPromoteFromPS={async (playerId) => {
        const updatedPS = practiceSquadIds.filter((id) => id !== playerId);
        const updatedRoster = [...userTeam.rosterPlayerIds, playerId];
        const updatedTeam = {
          ...userTeam,
          rosterPlayerIds: updatedRoster,
          practiceSquadIds: updatedPS,
        };
        const updatedState: GameState = {
          ...gameState,
          teams: { ...gameState.teams, [userTeam.id]: updatedTeam },
        };
        setGameState(updatedState);
        await saveGameState(updatedState);
        return true;
      }}
      onGetCutPreview={(playerId) => {
        const player = gameState.players[playerId];
        if (!player) return null;
        const estimatedSalary = 2000000 + Math.random() * 10000000;
        return {
          playerId,
          playerName: `${player.firstName} ${player.lastName}`,
          capSavings: estimatedSalary * 0.7,
          deadMoney: estimatedSalary * 0.3,
          recommendation:
            player.age >= 30 ? 'Consider releasing - aging player' : 'Still productive',
        };
      }}
      onCutPlayer={async (playerId) => {
        const player = gameState.players[playerId];
        if (!player) return false;

        const updatedRoster = userTeam.rosterPlayerIds.filter((id) => id !== playerId);
        const updatedTeam = {
          ...userTeam,
          rosterPlayerIds: updatedRoster,
        };
        const updatedState: GameState = {
          ...gameState,
          teams: {
            ...gameState.teams,
            [userTeam.id]: updatedTeam,
          },
        };
        setGameState(updatedState);
        await saveGameState(updatedState);
        return true;
      }}
      isExtensionEligible={(playerId) => {
        const player = gameState.players[playerId];
        return player ? player.experience >= 2 : false;
      }}
      onExtendPlayer={async (_playerId, offer) => {
        const aav = offer.totalValue / offer.years;
        if (aav >= 5000000 && offer.guaranteed >= offer.totalValue * 0.3) {
          return 'accepted';
        } else if (aav >= 3000000) {
          return 'counter';
        }
        return 'rejected';
      }}
      onTrade={() => navigation.navigate('Trade')}
    />
  );
}

// ============================================
// DEPTH CHART SCREEN
// ============================================

export function DepthChartScreenWrapper({
  navigation,
}: ScreenProps<'DepthChart'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading depth chart..." />;
  }

  // Get or generate depth chart for user's team (V2 format)
  const userTeamId = gameState.userTeamId;
  const existingV2DepthChart = gameState.depthChartsV2?.[userTeamId];
  const existingLegacyDepthChart = gameState.depthCharts?.[userTeamId];

  // Migrate legacy to V2 or generate new V2 depth chart
  let depthChart: DepthChartV2;
  if (existingV2DepthChart) {
    depthChart = existingV2DepthChart;
  } else if (existingLegacyDepthChart) {
    depthChart = migrateLegacyDepthChart(existingLegacyDepthChart, gameState);
  } else {
    depthChart = generateDepthChartV2(gameState, userTeamId).depthChart;
  }

  const handleDepthChartChange = async (newDepthChart: DepthChartV2) => {
    const updatedState: GameState = {
      ...gameState,
      depthChartsV2: {
        ...gameState.depthChartsV2,
        [userTeamId]: newDepthChart,
      },
    };
    setGameState(updatedState);
    await saveGameState(updatedState);
  };

  const handlePlayerSelect = (playerId: string) => {
    navigation.navigate('PlayerProfile', { playerId });
  };

  return (
    <DepthChartScreenV2
      gameState={gameState}
      depthChart={depthChart}
      onBack={() => navigation.goBack()}
      onDepthChartChange={handleDepthChartChange}
      onPlayerSelect={handlePlayerSelect}
    />
  );
}

// ============================================
// OWNER RELATIONS SCREEN
// ============================================

export function OwnerRelationsScreenWrapper({
  navigation,
}: ScreenProps<'OwnerRelations'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  // Auto-complete offseason view task when screen is visited
  useEffect(() => {
    if (gameState) {
      const updatedState = tryCompleteViewTask(gameState, 'OwnerRelations');
      if (updatedState) {
        setGameState(updatedState);
        saveGameState(updatedState);
      }
    }
  }, []); // Only run on mount

  if (!gameState) {
    return <LoadingFallback message="Loading owner relations..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const ownerId = `owner-${userTeam.abbreviation}`;
  const owner = gameState.owners[ownerId];

  if (!owner) {
    return <LoadingFallback message="Owner not found..." />;
  }

  const ownerViewModel = createOwnerViewModel(owner);
  const patienceView = gameState.patienceMeter
    ? createPatienceViewModel(gameState.patienceMeter)
    : null;

  return (
    <OwnerRelationsScreen
      owner={ownerViewModel}
      patienceView={patienceView}
      teamName={`${userTeam.city} ${userTeam.nickname}`}
      currentWeek={gameState.league.calendar.currentWeek}
      onBack={() => navigation.goBack()}
      onDemandPress={(demand) => {
        // Show demand details with action options
        showAlert(
          'Owner Demand',
          `${demand.description}\n\nDeadline: Week ${demand.deadline}\nIssued: Week ${demand.issuedWeek}\n\nConsequence if failed: ${demand.consequence}`
        );
      }}
    />
  );
}

// ============================================
// CONTRACT MANAGEMENT SCREEN
// ============================================

export function ContractManagementScreenWrapper({
  navigation,
}: ScreenProps<'ContractManagement'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading contracts..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];

  // Build cap status from team finances (all values in thousands)
  const salaryCap = userTeam.finances.salaryCap;
  const capStatus = {
    salaryCap,
    currentCapUsage: userTeam.finances.currentCapUsage,
    capSpace: userTeam.finances.capSpace,
    deadMoney: userTeam.finances.deadMoney,
    effectiveCapSpace: userTeam.finances.capSpace,
    percentUsed: salaryCap > 0 ? (userTeam.finances.currentCapUsage / salaryCap) * 100 : 0,
    top51Total: 0,
    isOverCap: userTeam.finances.capSpace < 0,
    meetsFloor: true,
    rolloverFromPreviousYear: 0,
  };

  // Get real contracts from gameState.contracts for players on the roster
  const contracts: PlayerContract[] = userTeam.rosterPlayerIds
    .map((playerId) => {
      const player = gameState.players[playerId];
      if (!player) return null;
      const contract = player.contractId ? gameState.contracts[player.contractId] : null;
      if (!contract) return null;
      return contract;
    })
    .filter((c): c is PlayerContract => c !== null);

  return (
    <ContractManagementScreen
      gameState={gameState}
      capStatus={capStatus}
      contracts={contracts}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => {
        navigation.navigate('PlayerProfile', { playerId });
      }}
      onCutPlayer={(playerId, breakdown) => {
        const player = gameState.players[playerId];
        showAlert(
          'Cut Analysis',
          `${player?.firstName} ${player?.lastName}\n\n` +
            `Standard Cut:\n` +
            `  Cap Savings: $${(breakdown.standardCut.capSavings / 1000).toFixed(1)}M\n` +
            `  Dead Money: $${(breakdown.standardCut.deadMoney / 1000).toFixed(1)}M\n\n` +
            `Post-June 1:\n` +
            `  Cap Savings: $${(breakdown.postJune1Cut.capSavings / 1000).toFixed(1)}M\n` +
            `  Dead Money: $${(breakdown.postJune1Cut.deadMoney / 1000).toFixed(1)}M\n\n` +
            `Recommendation: ${breakdown.bestOptionReason}`
        );
      }}
      onAction={async (action: ContractAction) => {
        switch (action.type) {
          case 'applyFranchiseTag': {
            // Mark player as franchise tagged in contracts
            const existingContract = gameState.contracts[action.playerId];
            if (existingContract) {
              const taggedContract: PlayerContract = {
                ...existingContract,
                type: 'franchise_tag',
                notes: [
                  ...(existingContract.notes || []),
                  `Franchise tagged at ${action.position}`,
                ],
              };
              const updatedContracts = {
                ...gameState.contracts,
                [action.playerId]: taggedContract,
              };
              const updatedState: GameState = { ...gameState, contracts: updatedContracts };
              setGameState(updatedState);
              await saveGameState(updatedState);
            }
            showAlert('Franchise Tag Applied', `Player has been franchise tagged.`);
            break;
          }
          case 'removeFranchiseTag': {
            const existingContract = gameState.contracts[action.playerId];
            if (existingContract) {
              const untaggedContract: PlayerContract = {
                ...existingContract,
                type: existingContract.totalYears <= 3 ? 'rookie' : 'veteran',
                notes: [...(existingContract.notes || []), 'Franchise tag removed'],
              };
              const updatedContracts = {
                ...gameState.contracts,
                [action.playerId]: untaggedContract,
              };
              const updatedState: GameState = { ...gameState, contracts: updatedContracts };
              setGameState(updatedState);
              await saveGameState(updatedState);
            }
            showAlert('Franchise Tag Removed', `Franchise tag has been removed.`);
            break;
          }
          case 'restructureContract': {
            // Apply contract restructure - convert salary to signing bonus
            const contract = Object.values(gameState.contracts).find(
              (c) => c.id === action.contractId
            );
            if (contract) {
              const restructuredContract: PlayerContract = {
                ...contract,
                notes: [
                  ...(contract.notes || []),
                  `Restructured: converted $${(action.amountToConvert / 1000).toFixed(1)}M${action.voidYears > 0 ? ` with ${action.voidYears} void year(s)` : ''}`,
                ],
                voidYears: contract.voidYears + action.voidYears,
              };
              const updatedContracts = {
                ...gameState.contracts,
                [contract.playerId]: restructuredContract,
              };
              const updatedState: GameState = { ...gameState, contracts: updatedContracts };
              setGameState(updatedState);
              await saveGameState(updatedState);
            }
            showAlert('Contract Restructured', `Contract has been restructured.`);
            break;
          }
          case 'cutPlayer': {
            const player = gameState.players[action.playerId];
            showAlert(
              'Cut Analysis',
              `${player?.firstName} ${player?.lastName}\n\n` +
                `Cap Savings: $${(action.cutBreakdown.standardCut.capSavings / 1000).toFixed(1)}M\n` +
                `Dead Money: $${(action.cutBreakdown.standardCut.deadMoney / 1000).toFixed(1)}M`
            );
            break;
          }
        }
      }}
    />
  );
}

// ============================================
// PLAYER PROFILE SCREEN
// ============================================

export function PlayerProfileScreenWrapper({
  navigation,
  route,
}: ScreenProps<'PlayerProfile'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();
  const { playerId, prospectId } = route.params;

  if (!gameState) {
    return <LoadingFallback message="Loading player..." />;
  }

  const realProspect = prospectId ? gameState.prospects[prospectId] : null;
  const realPlayer = playerId ? gameState.players[playerId] : null;

  let profileData = null;

  if (realProspect) {
    profileData = {
      playerId: realProspect.id,
      firstName: realProspect.player.firstName,
      lastName: realProspect.player.lastName,
      position: realProspect.player.position,
      age: realProspect.player.age,
      experience: 0,
      skills: realProspect.player.skills as Record<
        string,
        { trueValue: number; perceivedMin: number; perceivedMax: number; maturityAge: number }
      >,
      physical: realProspect.player.physical,
      physicalsRevealed: realProspect.physicalsRevealed,
      hiddenTraits: realProspect.player.hiddenTraits,
      collegeName: realProspect.collegeName,
      draftYear: realProspect.draftYear,
      projectedRound: realProspect.consensusProjection?.projectedRound ?? null,
      projectedPickRange: realProspect.consensusProjection?.projectedPickRange ?? null,
      userTier: realProspect.userTier,
      flagged: realProspect.flagged,
    };
  } else if (realPlayer) {
    profileData = {
      playerId: realPlayer.id,
      firstName: realPlayer.firstName,
      lastName: realPlayer.lastName,
      position: realPlayer.position,
      age: realPlayer.age,
      experience: realPlayer.experience || 0,
      skills: realPlayer.skills as Record<
        string,
        { trueValue: number; perceivedMin: number; perceivedMax: number; maturityAge: number }
      >,
      physical: realPlayer.physical,
      physicalsRevealed: true,
      hiddenTraits: realPlayer.hiddenTraits,
      collegeName: undefined,
      draftYear: undefined,
      projectedRound: null,
      projectedPickRange: null,
      userTier: null,
      flagged: false,
    };
  }

  if (!profileData) {
    navigation.goBack();
    return <LoadingFallback message="Player not found..." />;
  }

  // Generate scout reports for prospects
  let scoutReports: ScoutReport[] = [];
  if (realProspect) {
    const scouts = Object.values(gameState.scouts).filter(
      (scout) => scout.teamId === gameState.userTeamId
    );
    const primaryScout = scouts[0];
    const player = realProspect.player;

    // Calculate skill ranges from player skills
    const skillEntries = Object.values(player.skills);
    const getAvgSkill = (): number => {
      if (skillEntries.length === 0) return 65;
      const sum = skillEntries.reduce((acc, s) => acc + (s.perceivedMin + s.perceivedMax) / 2, 0);
      return Math.round(sum / skillEntries.length);
    };

    const overallAvg = getAvgSkill();
    const physicalAvg = Math.round((player.physical.speed || 70) * 0.5 + overallAvg * 0.5);
    const technicalAvg = overallAvg;

    const projectedRound =
      realProspect.consensusProjection?.projectedRound ||
      Math.max(1, Math.min(7, Math.ceil((100 - overallAvg) / 12)));

    // Always generate at least an auto report
    const autoRangeWidth = 25;
    const autoConfidenceLevel: 'low' | 'medium' | 'high' = 'low';

    const allTraits = [
      ...(player.hiddenTraits?.positive || []).map((t) => ({
        name: t,
        category: 'character' as const,
      })),
      ...(player.hiddenTraits?.negative || []).map((t) => ({
        name: t,
        category: 'character' as const,
      })),
    ];

    // Auto report (baseline scouting)
    scoutReports.push({
      id: `report-auto-${realProspect.id}`,
      prospectId: realProspect.id,
      prospectName: `${player.firstName} ${player.lastName}`,
      position: player.position,
      reportType: 'auto',
      generatedAt: Date.now() - 7 * 86400000,
      scoutId: primaryScout?.id || 'scout-1',
      scoutName: primaryScout ? `${primaryScout.firstName} ${primaryScout.lastName}` : 'Head Scout',
      physicalMeasurements: {
        height: `${Math.floor(player.physical.height / 12)}'${player.physical.height % 12}"`,
        weight: player.physical.weight,
        college: realProspect.collegeName || 'Unknown',
      },
      skillRanges: {
        overall: {
          min: Math.max(0, overallAvg - autoRangeWidth),
          max: Math.min(99, overallAvg + autoRangeWidth),
          confidence: autoConfidenceLevel,
        },
        physical: {
          min: Math.max(0, physicalAvg - autoRangeWidth),
          max: Math.min(99, physicalAvg + autoRangeWidth),
          confidence: autoConfidenceLevel,
        },
        technical: {
          min: Math.max(0, technicalAvg - autoRangeWidth),
          max: Math.min(99, technicalAvg + autoRangeWidth),
          confidence: autoConfidenceLevel,
        },
      },
      visibleTraits: allTraits.slice(0, 1),
      hiddenTraitCount: Math.max(0, allTraits.length - 1),
      draftProjection: {
        roundMin: Math.max(1, projectedRound - 1),
        roundMax: Math.min(7, projectedRound + 1),
        pickRangeDescription:
          projectedRound <= 2 ? `Round ${projectedRound}-${projectedRound + 1}` : 'Day 2-3',
        overallGrade:
          projectedRound === 1
            ? 'First-round talent'
            : projectedRound <= 3
              ? 'Day 2 pick'
              : 'Mid-round prospect',
      },
      confidence: {
        level: autoConfidenceLevel,
        score: 35,
        factors: [
          { factor: 'Scouting Depth', impact: 'negative', description: 'Limited observation time' },
        ],
      },
      needsMoreScouting: projectedRound <= 3,
      scoutingHours: 3,
    });

    // Add focus report if this is a higher-rated prospect (mock for now)
    if (projectedRound <= 3 || realProspect.flagged) {
      const focusRangeWidth = 10;
      const focusConfidenceLevel: 'low' | 'medium' | 'high' =
        overallAvg >= 75 ? 'high' : overallAvg >= 60 ? 'medium' : 'low';

      scoutReports.push({
        id: `report-focus-${realProspect.id}`,
        prospectId: realProspect.id,
        prospectName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        reportType: 'focus',
        generatedAt: Date.now() - 2 * 86400000,
        scoutId: primaryScout?.id || 'scout-1',
        scoutName: primaryScout
          ? `${primaryScout.firstName} ${primaryScout.lastName}`
          : 'Head Scout',
        physicalMeasurements: {
          height: `${Math.floor(player.physical.height / 12)}'${player.physical.height % 12}"`,
          weight: player.physical.weight,
          college: realProspect.collegeName || 'Unknown',
          fortyYardDash: 4.3 + Math.random() * 0.7,
          verticalJump: 28 + Math.random() * 12,
        },
        skillRanges: {
          overall: {
            min: Math.max(0, overallAvg - focusRangeWidth),
            max: Math.min(99, overallAvg + focusRangeWidth),
            confidence: focusConfidenceLevel,
          },
          physical: {
            min: Math.max(0, physicalAvg - focusRangeWidth),
            max: Math.min(99, physicalAvg + focusRangeWidth),
            confidence: focusConfidenceLevel,
          },
          technical: {
            min: Math.max(0, technicalAvg - focusRangeWidth),
            max: Math.min(99, technicalAvg + focusRangeWidth),
            confidence: focusConfidenceLevel,
          },
        },
        visibleTraits: allTraits,
        hiddenTraitCount: 0,
        draftProjection: {
          roundMin: projectedRound,
          roundMax: projectedRound,
          pickRangeDescription: `Round ${projectedRound}`,
          overallGrade:
            projectedRound === 1
              ? 'First-round talent'
              : projectedRound === 2
                ? 'Day 1-2 pick'
                : 'Day 2 pick',
        },
        confidence: {
          level: focusConfidenceLevel,
          score: focusConfidenceLevel === 'high' ? 85 : focusConfidenceLevel === 'medium' ? 65 : 45,
          factors: [
            {
              factor: 'Scouting Depth',
              impact: 'positive',
              description: 'In-depth evaluation completed',
            },
            { factor: 'Time Invested', impact: 'positive', description: '45+ hours of film study' },
          ],
        },
        characterAssessment: {
          workEthic: overallAvg >= 70 ? 'elite' : 'good',
          leadership: overallAvg >= 75 ? 'leader' : 'follower',
          coachability: overallAvg >= 70 ? 'excellent' : 'good',
          maturity: overallAvg >= 65 ? 'mature' : 'developing',
          competitiveness: overallAvg >= 70 ? 'fierce' : 'competitive',
          notes: ['Good football character', 'Works hard in practice'],
        },
        playerComparison:
          overallAvg >= 80
            ? 'Reminds scouts of a young Pro Bowler'
            : overallAvg >= 70
              ? 'Solid starter potential'
              : 'Rotational player',
        ceiling: overallAvg >= 75 ? 'Pro Bowl caliber' : 'Quality starter',
        floor: overallAvg >= 70 ? 'Reliable backup' : 'Practice squad',
        needsMoreScouting: false,
        scoutingHours: 45,
      });
    }
  }

  // For players (not prospects), use the new PlayerDetailCard
  if (realPlayer) {
    // Get the player's contract from gameState.contracts
    const playerContract = gameState.contracts[realPlayer.id] ?? null;

    // Get the team's coaches to find schemes
    const teamCoaches = Object.values(gameState.coaches).filter(
      (c) => c.teamId === gameState.userTeamId
    );
    const offensiveCoordinator = teamCoaches.find((c) => c.role === 'offensiveCoordinator');
    const defensiveCoordinator = teamCoaches.find((c) => c.role === 'defensiveCoordinator');
    const headCoach = teamCoaches.find((c) => c.role === 'headCoach');

    // Get schemes from coordinators, falling back to head coach
    const teamOffensiveScheme =
      (offensiveCoordinator?.scheme as OffensiveScheme | undefined) ??
      (headCoach?.scheme as OffensiveScheme | undefined) ??
      null;
    const teamDefensiveScheme =
      (defensiveCoordinator?.scheme as DefensiveScheme | undefined) ?? null;

    // Get season stats if available
    const seasonStats = gameState.seasonStats?.[realPlayer.id] ?? null;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <PlayerDetailCard
          player={realPlayer}
          contract={playerContract}
          currentYear={gameState.league.calendar.currentYear}
          teamOffensiveScheme={teamOffensiveScheme}
          teamDefensiveScheme={teamDefensiveScheme}
          seasonStats={seasonStats}
          onClose={() => navigation.goBack()}
          isModal={false}
        />
      </SafeAreaView>
    );
  }

  // For prospects, use the existing PlayerProfileScreen
  return (
    <PlayerProfileScreen
      {...profileData}
      scoutReports={scoutReports}
      onBack={() => navigation.goBack()}
      onToggleFlag={async () => {
        if (realProspect) {
          const updatedState: GameState = {
            ...gameState,
            prospects: {
              ...gameState.prospects,
              [realProspect.id]: {
                ...realProspect,
                flagged: !realProspect.flagged,
              },
            },
          };
          setGameState(updatedState);
          await saveGameState(updatedState);
        }
      }}
    />
  );
}

// ============================================
// PLAYER COMPARISON SCREEN
// ============================================

export function PlayerComparisonScreenWrapper({
  navigation,
  route,
}: ScreenProps<'PlayerComparison'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading comparison..." />;
  }

  const { player1Id, player2Id } = route.params;
  const p1 = gameState.players[player1Id];
  const p2 = gameState.players[player2Id];

  if (!p1 || !p2) {
    return <LoadingFallback message="Players not found..." />;
  }

  const mapPlayerData = (player: typeof p1) => {
    const skills: Record<string, number> = {};
    for (const [key, skillVal] of Object.entries(player.skills || {})) {
      if (skillVal && typeof skillVal === 'object' && 'perceivedValue' in skillVal) {
        skills[key] = (skillVal as { perceivedValue: number }).perceivedValue;
      }
    }

    const stats: Record<string, number> = {};
    const seasonStats = gameState.seasonStats?.[player.id];
    if (seasonStats) {
      for (const [key, val] of Object.entries(seasonStats)) {
        if (typeof val === 'number') stats[key] = val;
      }
    }

    return {
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
      age: player.age,
      overall:
        Object.values(skills).length > 0
          ? Math.round(
              Object.values(skills).reduce((a, b) => a + b, 0) / Object.values(skills).length
            )
          : 50,
      skills,
      stats,
      contract:
        player.experience > 0
          ? {
              yearsRemaining: Math.max(1, 4 - player.experience),
              salary: 2000000 + player.experience * 1000000,
            }
          : undefined,
    };
  };

  return (
    <PlayerComparisonScreen
      player1={mapPlayerData(p1)}
      player2={mapPlayerData(p2)}
      onBack={() => navigation.goBack()}
    />
  );
}
