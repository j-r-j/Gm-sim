import { GameState } from '../../core/models/game/GameState';
import { Player } from '../../core/models/player/Player';
import { CutBreakdown, PlayerContract, executeCut } from '../../core/contracts';

export type ComparisonPlayerData = {
  name: string;
  position: Player['position'];
  age: number;
  overall: number;
  skills: Record<string, number>;
  stats: Record<string, number>;
  contract?: {
    yearsRemaining: number;
    salary: number;
  };
};

export type RestructureActionInput = {
  contractId: string;
  amountToConvert: number;
  voidYears: number;
};

export function getSelectedCutAnalysis(cutBreakdown: CutBreakdown) {
  if (cutBreakdown.bestOption === 'standard') {
    return cutBreakdown.standardCut;
  }
  if (cutBreakdown.bestOption === 'post_june_1') {
    return cutBreakdown.postJune1Cut;
  }
  return cutBreakdown.designatedPostJune1Cut;
}

export function applyContractRestructure(
  gameState: GameState,
  action: RestructureActionInput
): GameState {
  const contract = Object.values(gameState.contracts).find((c) => c.id === action.contractId);
  if (!contract) {
    return gameState;
  }

  const restructuredContract: PlayerContract = {
    ...contract,
    notes: [
      ...(contract.notes || []),
      `Restructured: converted $${(action.amountToConvert / 1000).toFixed(1)}M${action.voidYears > 0 ? ` with ${action.voidYears} void year(s)` : ''}`,
    ],
    voidYears: contract.voidYears + action.voidYears,
  };

  return {
    ...gameState,
    contracts: {
      ...gameState.contracts,
      [contract.id]: restructuredContract,
    },
  };
}

export function applyPlayerCut(
  gameState: GameState,
  playerId: string,
  cutBreakdown: CutBreakdown
): GameState {
  const team = gameState.teams[gameState.userTeamId];
  const player = gameState.players[playerId];
  if (!team || !player) {
    return gameState;
  }

  const contractId = player.contractId || cutBreakdown.contractId;
  const existingContract = contractId ? gameState.contracts[contractId] : undefined;
  const cutAnalysis = getSelectedCutAnalysis(cutBreakdown);

  const updatedContracts = { ...gameState.contracts };
  const capPenalties = [...(team.finances.capPenalties || [])];

  if (existingContract) {
    const cutResult = executeCut(
      existingContract,
      gameState.league.calendar.currentYear,
      cutBreakdown.bestOption
    );
    if (cutResult.success) {
      updatedContracts[existingContract.id] = cutResult.contract;
      for (const penalty of cutResult.penalties) {
        capPenalties.push({
          id: penalty.id,
          playerId: penalty.playerId,
          playerName: penalty.playerName,
          reason: penalty.reason,
          amount: penalty.amount,
          yearsRemaining: penalty.yearsRemaining,
        });
      }
    }
  }

  const updatedPlayer: Player = {
    ...player,
    contractId: null,
  };

  const updatedCapUsage = Math.max(0, team.finances.currentCapUsage - cutAnalysis.capSavings);
  const updatedTeam = {
    ...team,
    rosterPlayerIds: team.rosterPlayerIds.filter((id) => id !== playerId),
    practiceSquadIds: team.practiceSquadIds.filter((id) => id !== playerId),
    injuredReserveIds: team.injuredReserveIds.filter((id) => id !== playerId),
    finances: {
      ...team.finances,
      currentCapUsage: updatedCapUsage,
      capSpace: team.finances.salaryCap - updatedCapUsage,
      deadMoney: team.finances.deadMoney + cutAnalysis.deadMoney,
      capPenalties,
    },
  };

  return {
    ...gameState,
    contracts: updatedContracts,
    players: {
      ...gameState.players,
      [playerId]: updatedPlayer,
    },
    teams: {
      ...gameState.teams,
      [team.id]: updatedTeam,
    },
  };
}

export function mapPlayerForComparison(
  player: Player,
  seasonStats?: unknown
): ComparisonPlayerData {
  const skills: Record<string, number> = {};
  for (const [key, skillVal] of Object.entries(player.skills || {})) {
    if (!skillVal || typeof skillVal !== 'object') continue;

    const skill = skillVal as {
      perceivedMin?: number;
      perceivedMax?: number;
      perceivedValue?: number;
    };
    if (typeof skill.perceivedMin === 'number' && typeof skill.perceivedMax === 'number') {
      skills[key] = Math.round((skill.perceivedMin + skill.perceivedMax) / 2);
    } else if (typeof skill.perceivedValue === 'number') {
      skills[key] = skill.perceivedValue;
    }
  }

  const stats: Record<string, number> = {};
  if (seasonStats && typeof seasonStats === 'object') {
    for (const [key, val] of Object.entries(seasonStats as Record<string, unknown>)) {
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
}
