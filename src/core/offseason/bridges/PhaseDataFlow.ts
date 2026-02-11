/**
 * Phase Data Flow
 * Utilities to ensure data flows properly between connected offseason phases
 */

import type { GameState } from '../../models/game/GameState';
import type { OffseasonPersistentData } from '../OffseasonPersistentData';
import type {
  OTAReport,
  RookieIntegrationReport,
  PositionBattlePreview,
} from '../phases/OTAsPhase';
import type { PositionBattle, DevelopmentReveal, CampInjury } from '../phases/TrainingCampPhase';
import type { PreseasonEvaluation } from '../phases/PreseasonPhase';
import type { CutEvaluationPlayer } from '../phases/FinalCutsPhase';

/**
 * Converts OTA reports to training camp position battle inputs
 * OTA impressions influence starting position for camp battles
 */
export function otaToTrainingCampInput(
  otaReports: OTAReport[],
  rookieReports: RookieIntegrationReport[],
  positionBattlePreviews: PositionBattlePreview[]
): {
  playerConditionLevels: Record<string, number>;
  playerSchemeGrasp: Record<string, number>;
  positionBattleSeeds: Array<{
    position: string;
    incumbentId: string;
    challengerIds: string[];
    incumbentAdvantage: number;
  }>;
  rookieReadiness: Record<string, 'ahead' | 'on_track' | 'behind'>;
} {
  const playerConditionLevels: Record<string, number> = {};
  const playerSchemeGrasp: Record<string, number> = {};

  // Extract conditioning and scheme grasp from OTA reports
  for (const report of otaReports) {
    playerConditionLevels[report.playerId] = report.conditioningLevel;
    playerSchemeGrasp[report.playerId] = report.schemeGrasp;
  }

  // Extract rookie readiness
  const rookieReadiness: Record<string, 'ahead' | 'on_track' | 'behind'> = {};
  for (const report of rookieReports) {
    rookieReadiness[report.playerId] = report.learningCurve;
  }

  // Convert position battle previews to seeds
  const positionBattleSeeds = positionBattlePreviews.map((preview) => {
    // Calculate incumbent advantage based on competition level
    let incumbentAdvantage = 10;
    if (preview.competitionLevel === 'heated') incumbentAdvantage = 5;
    else if (preview.competitionLevel === 'clear_starter') incumbentAdvantage = 20;

    return {
      position: preview.position,
      incumbentId: preview.incumbentId,
      challengerIds: preview.challengers.map((c) => c.playerId),
      incumbentAdvantage,
    };
  });

  return {
    playerConditionLevels,
    playerSchemeGrasp,
    positionBattleSeeds,
    rookieReadiness,
  };
}

/**
 * Converts training camp data to preseason input
 * Camp performance and injuries affect preseason playing time
 */
export function trainingCampToPreseasonInput(
  positionBattles: PositionBattle[],
  developmentReveals: DevelopmentReveal[],
  campInjuries: CampInjury[]
): {
  startingProjections: Record<string, boolean>; // playerId -> likely starter
  developmentBonuses: Record<string, number>; // playerId -> bonus to performance
  injuredPlayers: string[];
  repsDistribution: Record<string, number>; // playerId -> reps percentage (0-100)
} {
  const startingProjections: Record<string, boolean> = {};
  const developmentBonuses: Record<string, number> = {};
  const injuredPlayerSet = new Set<string>();
  const repsDistribution: Record<string, number> = {};

  // Determine starters from position battles
  for (const battle of positionBattles) {
    // Winner is the starter
    if (battle.winner) {
      startingProjections[battle.winner] = true;
      repsDistribution[battle.winner] = 30; // Starters get fewer preseason reps
    }

    // Competitors get more reps to evaluate
    for (const competitor of battle.competitors) {
      if (competitor.playerId !== battle.winner) {
        startingProjections[competitor.playerId] = false;
        repsDistribution[competitor.playerId] = 60; // More reps for evaluation
      }
    }
  }

  // Apply development reveals
  for (const reveal of developmentReveals) {
    let bonus = 0;
    if (reveal.revealType === 'skill_jump') bonus = 10;
    else if (reveal.revealType === 'trait' && reveal.impact === 'positive') bonus = 7;
    else if (reveal.revealType === 'decline') bonus = -5;
    else if (reveal.revealType === 'injury_concern') bonus = -3;
    developmentBonuses[reveal.playerId] = bonus;
  }

  // Track injured players based on severity
  for (const injury of campInjuries) {
    if (injury.severity === 'serious' || injury.severity === 'season_ending') {
      injuredPlayerSet.add(injury.playerId);
    } else if (injury.practiceStatus === 'out') {
      injuredPlayerSet.add(injury.playerId);
    }
  }

  return {
    startingProjections,
    developmentBonuses,
    injuredPlayers: [...injuredPlayerSet],
    repsDistribution,
  };
}

/**
 * Converts preseason data to final cuts input
 * Preseason performance heavily influences cut decisions
 */
export function preseasonToFinalCutsInput(
  preseasonEvaluations: PreseasonEvaluation[],
  positionBattles: PositionBattle[],
  gameState: GameState
): {
  cutCandidates: CutEvaluationPlayer[];
  practiceSquadCandidates: string[];
  mustKeepPlayers: string[];
  bubblePlayers: string[];
} {
  const cutCandidates: CutEvaluationPlayer[] = [];
  const practiceSquadCandidates: string[] = [];
  const mustKeepPlayers: string[] = [];
  const bubblePlayers: string[] = [];

  // Get user team's roster
  const userTeam = gameState.teams[gameState.userTeamId];
  if (!userTeam) {
    return { cutCandidates, practiceSquadCandidates, mustKeepPlayers, bubblePlayers };
  }

  // Build evaluation map
  const evaluationMap = new Map<string, PreseasonEvaluation>();
  for (const evaluation of preseasonEvaluations) {
    evaluationMap.set(evaluation.playerId, evaluation);
  }

  // Build position battle winners
  const positionWinners = new Set<string>();
  for (const battle of positionBattles) {
    if (battle.winner) {
      positionWinners.add(battle.winner);
    }
  }

  // Evaluate each player on roster
  for (const playerId of userTeam.rosterPlayerIds) {
    const player = gameState.players[playerId];
    if (!player) continue;

    const evaluation = evaluationMap.get(playerId);
    const contract = player.contractId ? gameState.contracts[player.contractId] : null;

    // Calculate cut priority based on preseason performance
    let cutPriority = 50; // Base

    if (evaluation) {
      // Adjust based on preseason roster projection
      if (evaluation.rosterProjection === 'cut_candidate') cutPriority += 30;
      else if (evaluation.rosterProjection === 'bubble') cutPriority += 15;
      else if (evaluation.rosterProjection === 'practice_squad') cutPriority += 20;
      else if (evaluation.rosterProjection === 'lock') cutPriority -= 30;
    }

    // Position battle winners are harder to cut
    if (positionWinners.has(playerId)) {
      cutPriority -= 25;
    }

    // Contract considerations
    let deadCapIfCut = 0;
    let guaranteed = 0;
    if (contract) {
      const currentYear = gameState.league.calendar.currentYear;
      const yearData = contract.yearlyBreakdown.find((y) => y.year === currentYear);
      if (yearData) {
        deadCapIfCut = yearData.bonus;
        guaranteed = yearData.bonus;
        if (yearData.bonus > 500) {
          // High guaranteed money = harder to cut
          cutPriority -= 20;
        }
      }
    }

    // Age considerations for PS eligibility
    const isPSEligible = player.experience < 3;

    // Categorize player
    if (cutPriority < 25) {
      mustKeepPlayers.push(playerId);
    } else if (cutPriority < 45) {
      bubblePlayers.push(playerId);
    } else {
      // Calculate approximate overall from skills (use perceived high end)
      let overallRating = 70; // Default
      const skillValues = Object.values(player.skills);
      if (skillValues.length > 0) {
        const sum = skillValues.reduce((acc, s) => acc + s.perceivedMax, 0);
        overallRating = Math.round(sum / skillValues.length);
      }

      cutCandidates.push({
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        position: player.position,
        age: player.age,
        experience: player.experience,
        overallRating,
        preseasonGrade: evaluation?.avgGrade ?? 70,
        salary: contract ? contract.averageAnnualValue : 0,
        guaranteed,
        deadCapIfCut,
        isVested: player.experience >= 4,
        practiceSquadEligible: isPSEligible,
        recommendation: cutPriority >= 60 ? 'cut' : 'practice_squad',
        notes: [],
      });

      if (isPSEligible && cutPriority < 70) {
        practiceSquadCandidates.push(playerId);
      }
    }
  }

  // Sort cut candidates by preseason grade (worst first)
  cutCandidates.sort((a, b) => a.preseasonGrade - b.preseasonGrade);

  return {
    cutCandidates,
    practiceSquadCandidates,
    mustKeepPlayers,
    bubblePlayers,
  };
}

/**
 * Calculates roster needs based on current roster and final cuts
 */
export function calculateRosterNeeds(
  gameState: GameState,
  currentRosterSize: number,
  targetRosterSize: number = 53
): {
  overBy: number;
  needToCut: number;
  positionBreakdown: Record<string, { current: number; ideal: number }>;
} {
  const userTeam = gameState.teams[gameState.userTeamId];
  const overBy = Math.max(0, currentRosterSize - targetRosterSize);
  const needToCut = overBy;

  // Calculate position breakdown
  const positionBreakdown: Record<string, { current: number; ideal: number }> = {};
  const idealCounts: Record<string, number> = {
    QB: 3,
    RB: 4,
    WR: 6,
    TE: 3,
    OT: 4,
    OG: 4,
    C: 2,
    DE: 4,
    DT: 4,
    LB: 7,
    CB: 6,
    S: 4,
    K: 1,
    P: 1,
  };

  // Count current players by position
  const currentCounts: Record<string, number> = {};
  if (userTeam) {
    for (const playerId of userTeam.rosterPlayerIds) {
      const player = gameState.players[playerId];
      if (player) {
        currentCounts[player.position] = (currentCounts[player.position] || 0) + 1;
      }
    }
  }

  for (const [position, ideal] of Object.entries(idealCounts)) {
    positionBreakdown[position] = {
      current: currentCounts[position] || 0,
      ideal,
    };
  }

  return {
    overBy,
    needToCut,
    positionBreakdown,
  };
}

/**
 * Summarizes data flow from all phases for debugging/display
 */
export function summarizePhaseDataFlow(offseasonData: OffseasonPersistentData): {
  otaPhase: { reports: number; rookieReports: number };
  campPhase: { battles: number; reveals: number; injuries: number };
  preseasonPhase: { games: number; evaluations: number; injuries: number };
  dataFlowStatus: 'complete' | 'partial' | 'none';
} {
  const otaPhase = {
    reports: offseasonData.otaReports?.length ?? 0,
    rookieReports: offseasonData.rookieIntegrationReports?.length ?? 0,
  };

  const campPhase = {
    battles: offseasonData.positionBattles?.length ?? 0,
    reveals: offseasonData.developmentReveals?.length ?? 0,
    injuries: offseasonData.campInjuries?.length ?? 0,
  };

  const preseasonPhase = {
    games: offseasonData.preseasonGames?.length ?? 0,
    evaluations: offseasonData.preseasonEvaluations?.length ?? 0,
    injuries: offseasonData.preseasonInjuries?.length ?? 0,
  };

  // Determine data flow status
  let dataFlowStatus: 'complete' | 'partial' | 'none' = 'none';
  const hasOta = otaPhase.reports > 0;
  const hasCamp = campPhase.battles > 0;
  const hasPreseason = preseasonPhase.games > 0;

  if (hasOta && hasCamp && hasPreseason) {
    dataFlowStatus = 'complete';
  } else if (hasOta || hasCamp || hasPreseason) {
    dataFlowStatus = 'partial';
  }

  return {
    otaPhase,
    campPhase,
    preseasonPhase,
    dataFlowStatus,
  };
}
