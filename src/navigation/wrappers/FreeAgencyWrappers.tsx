/**
 * Free Agency & Trade Wrappers
 * Extracted from ScreenWrappers.tsx
 *
 * Contains:
 * - TradeScreenWrapper
 * - FreeAgencyScreenWrapper
 * - RFAScreenWrapper
 * - CompPickTrackerScreenWrapper
 */

import React, { useEffect } from 'react';
import { useGame } from '../GameContext';
import { showAlert } from '@utils/alert';
import { ScreenProps } from '../types';
import { LoadingFallback, tryCompleteViewTask } from './shared';

// Screen imports
import { TradeScreen } from '../../screens/TradeScreen';
import { FreeAgencyScreen, FreeAgent } from '../../screens/FreeAgencyScreen';
import { RFAScreen, RFAPlayerView } from '../../screens/RFAScreen';
import { CompPickTrackerScreen } from '../../screens/CompPickTrackerScreen';

// Core type imports
import { GameState } from '../../core/models/game/GameState';
import { Position } from '../../core/models/player/Position';
import {
  evaluateUserTradeProposal,
  UserTradeProposal,
} from '../../core/trade/AITradeOfferGenerator';
import {
  TenderOffer,
  OfferSheet,
  recommendTenderLevel,
} from '../../core/freeAgency/RFATenderSystem';
import {
  FADeparture,
  FAAcquisition,
  TeamCompPickSummary,
  CompensatoryPickAward,
  CompPickEntitlement,
  determineCompPickRound,
  calculateCompValue,
} from '../../core/freeAgency/CompensatoryPickCalculator';

// Trade deadline week (P3-4): after this week, no more trades during regular season
const TRADE_DEADLINE_WEEK = 9;

export function TradeScreenWrapper({ navigation }: ScreenProps<'Trade'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading trade..." />;
  }

  // P3-4: Trade deadline - prevent trades after week 9 during regular season
  const { calendar } = gameState.league;
  if (calendar.currentPhase === 'regularSeason' && calendar.currentWeek > TRADE_DEADLINE_WEEK) {
    showAlert(
      'Trade Deadline Passed',
      `The trade deadline (Week ${TRADE_DEADLINE_WEEK}) has passed. No trades can be made until the offseason.`
    );
    navigation.goBack();
    return <LoadingFallback message="Trade deadline has passed..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];

  return (
    <TradeScreen
      userTeam={userTeam}
      teams={gameState.teams}
      players={gameState.players}
      draftPicks={gameState.draftPicks}
      onBack={() => navigation.goBack()}
      onSubmitTrade={async (proposal) => {
        // Build a UserTradeProposal for the AI evaluator
        const userTradeProposal: UserTradeProposal = {
          userTeamId: proposal.offeringTeamId,
          aiTeamId: proposal.receivingTeamId,
          playersOffered: proposal.assetsOffered
            .filter((a): a is Extract<typeof a, { type: 'player' }> => a.type === 'player')
            .map((a) => a.playerId),
          playersRequested: proposal.assetsRequested
            .filter((a): a is Extract<typeof a, { type: 'player' }> => a.type === 'player')
            .map((a) => a.playerId),
          picksOffered: proposal.assetsOffered
            .filter((a): a is Extract<typeof a, { type: 'pick' }> => a.type === 'pick')
            .map((a) => a.pickId),
          picksRequested: proposal.assetsRequested
            .filter((a): a is Extract<typeof a, { type: 'pick' }> => a.type === 'pick')
            .map((a) => a.pickId),
        };

        const aiResponse = evaluateUserTradeProposal(gameState, userTradeProposal);

        if (aiResponse.decision === 'accept') {
          // Execute the trade: swap players and picks
          const updatedTeams = { ...gameState.teams };
          const userTeamCopy = { ...updatedTeams[proposal.offeringTeamId] };
          const partnerTeamCopy = { ...updatedTeams[proposal.receivingTeamId] };

          for (const asset of proposal.assetsOffered) {
            if (asset.type === 'player') {
              userTeamCopy.rosterPlayerIds = userTeamCopy.rosterPlayerIds.filter(
                (id) => id !== asset.playerId
              );
              partnerTeamCopy.rosterPlayerIds = [
                ...partnerTeamCopy.rosterPlayerIds,
                asset.playerId,
              ];
            }
          }
          for (const asset of proposal.assetsRequested) {
            if (asset.type === 'player') {
              partnerTeamCopy.rosterPlayerIds = partnerTeamCopy.rosterPlayerIds.filter(
                (id) => id !== asset.playerId
              );
              userTeamCopy.rosterPlayerIds = [...userTeamCopy.rosterPlayerIds, asset.playerId];
            }
          }

          const updatedPicks = { ...gameState.draftPicks };
          for (const asset of proposal.assetsOffered) {
            if (asset.type === 'pick' && updatedPicks[asset.pickId]) {
              updatedPicks[asset.pickId] = {
                ...updatedPicks[asset.pickId],
                currentTeamId: proposal.receivingTeamId,
              };
            }
          }
          for (const asset of proposal.assetsRequested) {
            if (asset.type === 'pick' && updatedPicks[asset.pickId]) {
              updatedPicks[asset.pickId] = {
                ...updatedPicks[asset.pickId],
                currentTeamId: proposal.offeringTeamId,
              };
            }
          }

          updatedTeams[proposal.offeringTeamId] = userTeamCopy;
          updatedTeams[proposal.receivingTeamId] = partnerTeamCopy;

          const updatedState: GameState = {
            ...gameState,
            teams: updatedTeams,
            draftPicks: updatedPicks,
          };
          setGameState(updatedState);
          await saveGameState(updatedState);
          showAlert('Trade Accepted', aiResponse.reason);
          return 'accepted';
        } else if (aiResponse.decision === 'counter') {
          showAlert('Counter Offer', aiResponse.reason);
          return 'counter';
        }
        showAlert('Trade Rejected', aiResponse.reason);
        return 'rejected';
      }}
    />
  );
}

export function FreeAgencyScreenWrapper({
  navigation,
}: ScreenProps<'FreeAgency'>): React.JSX.Element {
  const { gameState, setGameState, saveGameState } = useGame();

  // Auto-complete offseason view task when screen is visited
  useEffect(() => {
    if (gameState) {
      const updatedState = tryCompleteViewTask(gameState, 'FreeAgency');
      if (updatedState) {
        setGameState(updatedState);
        saveGameState(updatedState);
      }
    }
  }, []); // Only run on mount

  if (!gameState) {
    return <LoadingFallback message="Loading free agency..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const leagueCap = gameState.league.settings?.salaryCap || 255000;
  // Convert from thousands to raw dollars to match estimatedValue units used by FreeAgencyScreen
  const capSpace = (userTeam.finances?.capSpace ?? leagueCap * 0.2) * 1000;

  const freeAgents: FreeAgent[] = Object.values(gameState.players)
    .filter((p) => {
      const isOnRoster = Object.values(gameState.teams).some(
        (t) =>
          t.rosterPlayerIds.includes(p.id) ||
          t.practiceSquadIds.includes(p.id) ||
          t.injuredReserveIds.includes(p.id)
      );
      return !isOnRoster;
    })
    .slice(0, 50)
    .map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      position: p.position,
      age: p.age,
      experience: p.experience || 0,
      estimatedValue: 2000000 + Math.random() * 15000000,
      skills: Object.fromEntries(
        Object.entries(p.skills).map(([key, skill]) => [
          key,
          { perceivedMin: skill.perceivedMin, perceivedMax: skill.perceivedMax },
        ])
      ),
    }));

  return (
    <FreeAgencyScreen
      freeAgents={freeAgents}
      capSpace={capSpace}
      teamName={`${userTeam.city} ${userTeam.nickname}`}
      onMakeOffer={async (playerId, offer) => {
        const agent = freeAgents.find((a) => a.id === playerId);
        if (!agent) return 'rejected';

        const offerRatio = offer.annualSalary / agent.estimatedValue;
        if (offerRatio >= 0.9) {
          const player = gameState.players[playerId];
          if (player) {
            const updatedTeam = {
              ...userTeam,
              rosterPlayerIds: [...userTeam.rosterPlayerIds, playerId],
              finances: userTeam.finances
                ? {
                    ...userTeam.finances,
                    // Convert raw dollars back to thousands to match finances units
                    capSpace: userTeam.finances.capSpace - offer.annualSalary / 1000,
                    currentCapUsage: userTeam.finances.currentCapUsage + offer.annualSalary / 1000,
                  }
                : userTeam.finances,
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
          }
          return 'accepted';
        } else if (offerRatio >= 0.7) {
          return 'counter';
        }
        return 'rejected';
      }}
      onBack={() => navigation.goBack()}
    />
  );
}

export function RFAScreenWrapper({ navigation }: ScreenProps<'RFA'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading RFA Management..." />;
  }

  const userTeam = gameState.teams[gameState.userTeamId];
  const salaryCap = 255000000; // $255M cap

  // Find eligible RFAs (players with 3 or fewer accrued seasons on expiring deals)
  const rosterPlayers = userTeam.rosterPlayerIds
    .map((id) => gameState.players[id])
    .filter((p) => p !== undefined);

  const eligibleRFAs: RFAPlayerView[] = rosterPlayers
    .filter((player) => player.experience >= 2 && player.experience <= 3)
    .slice(0, 10)
    .map((player) => {
      const skillEntries = Object.values(player.skills);
      const overallRating =
        skillEntries.length > 0
          ? Math.round(
              skillEntries.reduce((acc, s) => acc + (s.perceivedMin + s.perceivedMax) / 2, 0) /
                skillEntries.length
            )
          : 65;

      const draftRound = Math.ceil((100 - overallRating) / 14) || 5;
      const recommendedTender = recommendTenderLevel(overallRating, player.position, draftRound);

      return {
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        age: player.age,
        experience: player.experience,
        overallRating,
        draftRound,
        currentStatus: 'untokendered' as const,
        recommendedTender,
      };
    });

  // Mock active tenders (none submitted yet)
  const activeTenders: TenderOffer[] = [];

  // Mock offer sheets
  const offerSheets: OfferSheet[] = [];
  const incomingOffers: OfferSheet[] = [];

  return (
    <RFAScreen
      gameState={gameState}
      eligibleRFAs={eligibleRFAs}
      activeTenders={activeTenders}
      offerSheets={offerSheets}
      incomingOffers={incomingOffers}
      salaryCap={salaryCap}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
      onSubmitTender={(playerId, level) => {
        const player = gameState.players[playerId];
        showAlert(
          'Tender Submitted',
          `A ${level.replace('_', ' ')} tender has been placed on ${player?.firstName} ${player?.lastName}.`
        );
      }}
      onWithdrawTender={(tenderId) => {
        showAlert('Tender Withdrawn', `Tender ${tenderId} has been withdrawn.`);
      }}
      onMatchOffer={(offerSheetId) => {
        showAlert('Offer Matched', `You have matched offer sheet ${offerSheetId}.`);
      }}
      onDeclineOffer={(offerSheetId) => {
        showAlert('Offer Declined', `You have declined to match offer sheet ${offerSheetId}.`);
      }}
    />
  );
}

export function CompPickTrackerScreenWrapper({
  navigation,
}: ScreenProps<'CompPickTracker'>): React.JSX.Element {
  const { gameState } = useGame();

  if (!gameState) {
    return <LoadingFallback message="Loading Comp Pick Tracker..." />;
  }

  const currentYear = gameState.league.calendar.currentYear;
  const userTeamId = gameState.userTeamId;

  // Generate mock losses (players who left in free agency)
  const mockLosses: FADeparture[] = [
    {
      id: 'dep-1',
      playerId: 'lost-player-1',
      playerName: 'Marcus Williams',
      position: Position.FS,
      previousTeamId: userTeamId,
      newTeamId: 'team-002',
      contractAAV: 15000,
      contractYears: 4,
      contractTotal: 60000,
      age: 27,
      overallRating: 82,
      year: currentYear,
      qualifyingContract: true,
    },
    {
      id: 'dep-2',
      playerId: 'lost-player-2',
      playerName: 'Derek Thompson',
      position: Position.DE,
      previousTeamId: userTeamId,
      newTeamId: 'team-005',
      contractAAV: 9500,
      contractYears: 3,
      contractTotal: 28500,
      age: 29,
      overallRating: 76,
      year: currentYear,
      qualifyingContract: true,
    },
  ];

  // Generate mock gains (players signed in free agency)
  const mockGains: FAAcquisition[] = [
    {
      id: 'acq-1',
      playerId: 'signed-player-1',
      playerName: 'James Carter',
      position: Position.CB,
      newTeamId: userTeamId,
      previousTeamId: 'team-010',
      contractAAV: 7000,
      contractYears: 2,
      contractTotal: 14000,
      age: 28,
      overallRating: 73,
      year: currentYear,
      qualifyingContract: true,
    },
  ];

  // Calculate entitlements and picks
  const entitlements: CompPickEntitlement[] = mockLosses.map((loss) => {
    const netValue = calculateCompValue(loss.contractAAV, loss.age, loss.overallRating);
    const projectedRound = determineCompPickRound(netValue);
    const matchedGain = mockGains.find(
      (g) => g.qualifyingContract && g.contractAAV >= loss.contractAAV * 0.8
    );

    return {
      teamId: userTeamId,
      lostPlayerId: loss.playerId,
      lostPlayerName: loss.playerName,
      lostPlayerAAV: loss.contractAAV,
      matchedWithGain: !!matchedGain,
      matchedGainPlayerId: matchedGain?.playerId || null,
      netValue,
      projectedRound: matchedGain ? null : projectedRound,
      reasoning: matchedGain
        ? `Negated by signing of ${matchedGain.playerName}`
        : projectedRound
          ? `Qualifies for Round ${projectedRound} pick`
          : 'Below minimum threshold',
    };
  });

  // Calculate awarded picks
  const awardedPicks: CompensatoryPickAward[] = entitlements
    .filter((e) => e.projectedRound !== null)
    .map((e) => ({
      teamId: userTeamId,
      round: e.projectedRound!,
      reason: `Lost ${e.lostPlayerName} (${formatSalary(e.lostPlayerAAV)} AAV)`,
      associatedLossPlayerId: e.lostPlayerId,
      associatedLossPlayerName: e.lostPlayerName,
      netValue: e.netValue,
      year: currentYear + 1,
    }));

  // Build summary
  const summary: TeamCompPickSummary = {
    teamId: userTeamId,
    year: currentYear,
    totalLosses: mockLosses.length,
    totalGains: mockGains.length,
    netLossValue:
      mockLosses.reduce((acc, l) => acc + l.contractAAV, 0) -
      mockGains.reduce((acc, g) => acc + g.contractAAV, 0),
    qualifyingLosses: mockLosses.filter((l) => l.qualifyingContract),
    qualifyingGains: mockGains.filter((g) => g.qualifyingContract),
    entitlements,
    awardedPicks,
  };

  // Helper to format salary
  function formatSalary(amount: number): string {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}M`;
    }
    return `$${amount}K`;
  }

  return (
    <CompPickTrackerScreen
      gameState={gameState}
      summary={summary}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
    />
  );
}
