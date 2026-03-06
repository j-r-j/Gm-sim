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
import { PlayerContract, ContractYear } from '../../core/contracts/Contract';
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
            const currentYear = gameState.league.calendar.currentYear;
            // Convert dollars to thousands for contract/finances
            const annualSalaryK = Math.round(offer.annualSalary / 1000);
            const guaranteedK = Math.round((offer.guaranteed || 0) / 1000);
            const signingBonusK = Math.round(guaranteedK * 0.3);
            const salaryPerYearK = annualSalaryK - Math.round(signingBonusK / offer.years);

            // Create contract
            const contractId = `contract-${playerId}-${currentYear}`;
            const yearlyBreakdown: ContractYear[] = Array.from({ length: offer.years }, (_, i) => ({
              year: currentYear + i,
              bonus: i === 0 ? signingBonusK : 0,
              salary: salaryPerYearK,
              capHit: annualSalaryK,
              isVoidYear: false,
              isGuaranteed: i === 0,
            }));

            const faContract: PlayerContract = {
              id: contractId,
              playerId,
              playerName: `${player.firstName} ${player.lastName}`,
              teamId: userTeam.id,
              position: player.position,
              status: 'active',
              type: 'veteran',
              signedYear: currentYear,
              totalYears: offer.years,
              yearsRemaining: offer.years,
              totalValue: annualSalaryK * offer.years,
              guaranteedMoney: guaranteedK,
              signingBonus: signingBonusK,
              averageAnnualValue: annualSalaryK,
              yearlyBreakdown,
              voidYears: 0,
              hasNoTradeClause: false,
              hasNoTagClause: false,
              originalContractId: null,
              notes: ['Signed as free agent'],
            };

            const updatedTeam = {
              ...userTeam,
              rosterPlayerIds: [...userTeam.rosterPlayerIds, playerId],
              finances: userTeam.finances
                ? {
                    ...userTeam.finances,
                    capSpace: userTeam.finances.capSpace - annualSalaryK,
                    currentCapUsage: userTeam.finances.currentCapUsage + annualSalaryK,
                  }
                : userTeam.finances,
            };
            const updatedState: GameState = {
              ...gameState,
              teams: {
                ...gameState.teams,
                [userTeam.id]: updatedTeam,
              },
              contracts: {
                ...gameState.contracts,
                [contractId]: faContract,
              },
              players: {
                ...gameState.players,
                [playerId]: { ...player, contractId },
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
  const [activeTenders, setActiveTenders] = React.useState<TenderOffer[]>([]);

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

  // Update eligibleRFAs status based on active tenders
  const updatedRFAs = eligibleRFAs.map((rfa) => {
    const tender = activeTenders.find((t) => t.playerId === rfa.playerId);
    if (tender) {
      return { ...rfa, currentStatus: 'tendered' as const };
    }
    return rfa;
  });

  const offerSheets: OfferSheet[] = [];
  const incomingOffers: OfferSheet[] = [];

  return (
    <RFAScreen
      gameState={gameState}
      eligibleRFAs={updatedRFAs}
      activeTenders={activeTenders}
      offerSheets={offerSheets}
      incomingOffers={incomingOffers}
      salaryCap={salaryCap}
      onBack={() => navigation.goBack()}
      onPlayerSelect={(playerId) => navigation.navigate('PlayerProfile', { playerId })}
      onSubmitTender={(playerId, level) => {
        const player = gameState.players[playerId];
        if (!player) return;

        const tenderSalaries: Record<string, number> = {
          original_round: 2500000,
          first_round: 5500000,
          second_round: 4000000,
        };
        const salaryAmount = tenderSalaries[level] || 2500000;

        const draftCompMap: Record<string, string | null> = {
          original_round: 'original draft round',
          first_round: '1st round',
          second_round: '2nd round',
        };

        const newTender: TenderOffer = {
          id: `tender-${playerId}-${gameState.league.calendar.currentYear}`,
          playerId,
          playerName: `${player.firstName} ${player.lastName}`,
          teamId: gameState.userTeamId,
          level: level as TenderOffer['level'],
          salaryAmount,
          draftCompensation: draftCompMap[level] || null,
          year: gameState.league.calendar.currentYear,
          status: 'active',
        };

        setActiveTenders((prev) => [...prev.filter((t) => t.playerId !== playerId), newTender]);

        showAlert(
          'Tender Submitted',
          `A ${level.replace(/_/g, ' ')} tender has been placed on ${player.firstName} ${player.lastName}.`
        );
      }}
      onWithdrawTender={(tenderId) => {
        setActiveTenders((prev) => prev.filter((t) => t.id !== tenderId));
        showAlert('Tender Withdrawn', 'The tender has been withdrawn.');
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

  // Build real FA departures from game state
  const losses: FADeparture[] = [];
  const gains: FAAcquisition[] = [];

  // Check offseason data for contract decisions (cuts from user's team)
  const contractDecisions = gameState.offseasonData?.contractDecisions || [];
  for (const decision of contractDecisions) {
    if (decision.teamId === userTeamId && decision.type === 'cut') {
      const player = gameState.players[decision.playerId];
      const skillEntries = player ? Object.values(player.skills) : [];
      const overallRating =
        skillEntries.length > 0
          ? Math.round(
              skillEntries.reduce((acc, s) => acc + (s.perceivedMin + s.perceivedMax) / 2, 0) /
                skillEntries.length
            )
          : 65;

      losses.push({
        id: `dep-${decision.playerId}`,
        playerId: decision.playerId,
        playerName: decision.playerName,
        position: (player?.position || 'QB') as Position,
        previousTeamId: userTeamId,
        newTeamId: '',
        contractAAV: decision.details.previousSalary || 5000,
        contractYears: 1,
        contractTotal: decision.details.previousSalary || 5000,
        age: player?.age || 25,
        overallRating,
        year: currentYear,
        qualifyingContract: (decision.details.previousSalary || 0) >= 2000,
      });
    }
  }

  // Also check for expired contracts — players no longer on the roster
  // whose contracts expired (removed by SeasonTransitionService)
  const expiredContracts = Object.values(gameState.contracts).filter(
    (c) => c.status === 'expired' && c.teamId === userTeamId
  );
  for (const contract of expiredContracts) {
    if (losses.some((l) => l.playerId === contract.playerId)) continue;

    const player = gameState.players[contract.playerId];
    if (!player) continue;

    const skillEntries = Object.values(player.skills);
    const overallRating =
      skillEntries.length > 0
        ? Math.round(
            skillEntries.reduce((acc, s) => acc + (s.perceivedMin + s.perceivedMax) / 2, 0) /
              skillEntries.length
          )
        : 65;

    losses.push({
      id: `dep-exp-${contract.playerId}`,
      playerId: contract.playerId,
      playerName: contract.playerName,
      position: player.position as Position,
      previousTeamId: userTeamId,
      newTeamId: '',
      contractAAV: contract.averageAnnualValue || 5000,
      contractYears: contract.totalYears,
      contractTotal: contract.totalValue || 5000,
      age: player.age,
      overallRating,
      year: currentYear,
      qualifyingContract: (contract.averageAnnualValue || 0) >= 2000,
    });
  }

  // Check offseason data for FA signings by user team
  const faSignings = gameState.offseasonData?.freeAgentSignings || [];
  for (const signing of faSignings) {
    if (signing.teamId === userTeamId) {
      const player = gameState.players[signing.playerId];
      const skillEntries = player ? Object.values(player.skills) : [];
      const overallRating =
        skillEntries.length > 0
          ? Math.round(
              skillEntries.reduce((acc, s) => acc + (s.perceivedMin + s.perceivedMax) / 2, 0) /
                skillEntries.length
            )
          : 65;

      gains.push({
        id: `acq-${signing.playerId}`,
        playerId: signing.playerId,
        playerName: signing.playerName,
        position: (player?.position || signing.position) as Position,
        newTeamId: userTeamId,
        previousTeamId: signing.previousTeamId || '',
        contractAAV: Math.round(signing.totalValue / Math.max(1, signing.contractYears)),
        contractYears: signing.contractYears,
        contractTotal: signing.totalValue,
        age: player?.age || 25,
        overallRating,
        year: currentYear,
        qualifyingContract: signing.totalValue >= 2000,
      });
    }
  }

  // Calculate entitlements and picks
  const entitlements: CompPickEntitlement[] = losses.map((loss) => {
    const netValue = calculateCompValue(loss.contractAAV, loss.age, loss.overallRating);
    const projectedRound = determineCompPickRound(netValue);
    const matchedGain = gains.find(
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
    totalLosses: losses.length,
    totalGains: gains.length,
    netLossValue:
      losses.reduce((acc, l) => acc + l.contractAAV, 0) -
      gains.reduce((acc, g) => acc + g.contractAAV, 0),
    qualifyingLosses: losses.filter((l) => l.qualifyingContract),
    qualifyingGains: gains.filter((g) => g.qualifyingContract),
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
