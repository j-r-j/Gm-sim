/**
 * History Offseason Processor
 * Handles all offseason operations for pre-history simulation:
 * - Player retirement
 * - Contract expiration → free agent pipeline
 * - Player progression (age-based development)
 * - Coaching changes (fire/hire)
 * - AI Draft
 * - AI Free Agency
 * - Roster maintenance (fill to 53, cut extras)
 *
 * This is a simplified, automated version of the interactive offseason.
 * No user interaction required - all decisions are made by AI logic.
 */

import { Player, getPlayerFullName } from '../models/player/Player';
import { Position } from '../models/player/Position';
import { Team, createEmptyTeamRecord } from '../models/team/Team';
import { Coach } from '../models/staff/Coach';
import { DraftPick } from '../models/league/DraftPick';
import {
  PlayerContract,
  advanceContractYear,
  createPlayerContract,
  ContractOffer,
  getMinimumSalary,
  getCapHitForYear,
} from '../contracts/Contract';
import {
  generatePlayerContract,
  determineSkillTierFromPlayer,
  calculateTotalCapUsage,
  calculateFutureCommitments,
} from '../contracts/ContractGenerator';
import { DEFAULT_SALARY_CAP } from '../models/team/TeamFinances';
import { processTeamProgression } from '../career/PlayerProgression';
import { generateCoach } from '../coaching/CoachGenerator';
import { advanceContractYear as advanceCoachContractYear } from '../models/staff/CoachContract';
import { CoachRole } from '../models/staff/StaffSalary';
import { Prospect } from '../draft/Prospect';
import { generatePlayer } from '../generators/player/PlayerGenerator';
import { randomInt } from '../generators/utils/RandomUtils';

/**
 * Results of a single offseason processing
 */
export interface OffseasonResults {
  retiredPlayerIds: string[];
  expiredContractPlayerIds: string[];
  newFreeAgents: Player[];
  draftedPlayers: Player[];
  draftedContracts: PlayerContract[];
  freeAgencySignings: { playerId: string; teamId: string; contract: PlayerContract }[];
  coachChanges: { teamId: string; firedCoachId: string; newCoach: Coach }[];
  updatedPlayers: Record<string, Player>;
  updatedContracts: Record<string, PlayerContract>;
  updatedTeams: Record<string, Team>;
  updatedCoaches: Record<string, Coach>;
}

// ============================================================================
// PLAYER RETIREMENT
// ============================================================================

/**
 * Determine if a player should retire based on age, skill, and position.
 * Retirement probability increases significantly with age and decreases
 * with higher skill level.
 */
export function shouldPlayerRetire(player: Player): boolean {
  const age = player.age;

  // Nobody retires before 28
  if (age < 28) return false;

  // Base retirement probability by age
  let retirementChance = 0;
  if (age >= 40) retirementChance = 0.85;
  else if (age >= 38) retirementChance = 0.6;
  else if (age >= 36) retirementChance = 0.35;
  else if (age >= 34) retirementChance = 0.2;
  else if (age >= 32) retirementChance = 0.1;
  else if (age >= 30) retirementChance = 0.04;
  else if (age >= 28) retirementChance = 0.01;

  // Position-based adjustments (QBs and kickers last longer)
  if (player.position === Position.QB) {
    retirementChance *= 0.6;
  } else if (player.position === Position.K || player.position === Position.P) {
    retirementChance *= 0.5;
  } else if (player.position === Position.RB) {
    retirementChance *= 1.4; // RBs retire earlier
  }

  // Skill-based adjustment: better players hang on longer
  const skillTier = determineSkillTierFromPlayer(player);
  if (skillTier === 'elite') {
    retirementChance *= 0.5;
  } else if (skillTier === 'starter') {
    retirementChance *= 0.7;
  } else if (skillTier === 'fringe') {
    retirementChance *= 1.3;
  }

  return Math.random() < retirementChance;
}

/**
 * Process retirements for all players in the league
 */
export function processRetirements(
  players: Record<string, Player>,
  contracts: Record<string, PlayerContract>,
  teams: Record<string, Team>
): {
  updatedPlayers: Record<string, Player>;
  updatedContracts: Record<string, PlayerContract>;
  updatedTeams: Record<string, Team>;
  retiredPlayerIds: string[];
} {
  const updatedPlayers = { ...players };
  const updatedContracts = { ...contracts };
  const updatedTeams = { ...teams };
  const retiredPlayerIds: string[] = [];

  for (const player of Object.values(players)) {
    if (shouldPlayerRetire(player)) {
      retiredPlayerIds.push(player.id);

      // Remove contract
      if (player.contractId && updatedContracts[player.contractId]) {
        const contract = updatedContracts[player.contractId];
        updatedContracts[contract.id] = { ...contract, status: 'expired' };
      }

      // Remove from team roster
      for (const teamId of Object.keys(updatedTeams)) {
        const team = updatedTeams[teamId];
        if (team.rosterPlayerIds.includes(player.id)) {
          updatedTeams[teamId] = {
            ...team,
            rosterPlayerIds: team.rosterPlayerIds.filter((id) => id !== player.id),
          };
        }
      }

      // Remove player from active pool
      delete updatedPlayers[player.id];
    }
  }

  return { updatedPlayers, updatedContracts, updatedTeams, retiredPlayerIds };
}

// ============================================================================
// CONTRACT EXPIRATION
// ============================================================================

/**
 * Advance all contracts by one year and handle expirations.
 * Expired contracts result in players becoming free agents.
 */
export function processContractExpirations(
  players: Record<string, Player>,
  contracts: Record<string, PlayerContract>,
  teams: Record<string, Team>
): {
  updatedPlayers: Record<string, Player>;
  updatedContracts: Record<string, PlayerContract>;
  updatedTeams: Record<string, Team>;
  newFreeAgentIds: string[];
} {
  const updatedPlayers = { ...players };
  const updatedContracts = { ...contracts };
  const updatedTeams = { ...teams };
  const newFreeAgentIds: string[] = [];

  for (const [contractId, contract] of Object.entries(contracts)) {
    if (contract.status !== 'active') continue;

    const advancedContract = advanceContractYear(contract);

    if (advancedContract === null || advancedContract.status === 'expired') {
      // Contract expired - player becomes free agent
      updatedContracts[contractId] = advancedContract || { ...contract, status: 'expired' };
      const player = updatedPlayers[contract.playerId];
      if (player) {
        updatedPlayers[player.id] = { ...player, contractId: null };
        newFreeAgentIds.push(player.id);

        // Remove from team roster
        const team = updatedTeams[contract.teamId];
        if (team) {
          updatedTeams[contract.teamId] = {
            ...team,
            rosterPlayerIds: team.rosterPlayerIds.filter((id) => id !== player.id),
          };
        }
      }
    } else {
      updatedContracts[contractId] = advancedContract;
    }
  }

  return { updatedPlayers, updatedContracts, updatedTeams, newFreeAgentIds };
}

// ============================================================================
// PLAYER PROGRESSION
// ============================================================================

/**
 * Age all players by 1 year and apply skill progression/regression
 */
export function processPlayerProgression(
  players: Record<string, Player>,
  coaches: Record<string, Coach>,
  teams: Record<string, Team>
): Record<string, Player> {
  const updatedPlayers = { ...players };

  // Pre-build head coach lookup by teamId for O(1) access
  const headCoachByTeam = new Map<string, Coach>();
  for (const coach of Object.values(coaches)) {
    if (coach.teamId && coach.role === 'headCoach') {
      headCoachByTeam.set(coach.teamId, coach);
    }
  }

  for (const team of Object.values(teams)) {
    const teamPlayers = team.rosterPlayerIds
      .map((id) => updatedPlayers[id])
      .filter((p): p is Player => p != null);

    if (teamPlayers.length === 0) continue;

    // Use cached head coach lookup
    const teamCoach = headCoachByTeam.get(team.id);

    if (teamCoach) {
      const { updatedPlayers: progressed } = processTeamProgression(teamPlayers, teamCoach, {
        applyAgeModifier: true,
      });

      for (const player of progressed) {
        updatedPlayers[player.id] = {
          ...player,
          age: player.age + 1,
          experience: player.experience + 1,
        };
      }
    } else {
      // No coach - just age players without coach-boosted progression
      for (const player of teamPlayers) {
        updatedPlayers[player.id] = {
          ...player,
          age: player.age + 1,
          experience: player.experience + 1,
        };
      }
    }
  }

  // Also age free agents (players not on any team)
  const teamPlayerIds = new Set(Object.values(teams).flatMap((t) => t.rosterPlayerIds));
  for (const player of Object.values(updatedPlayers)) {
    if (!teamPlayerIds.has(player.id)) {
      updatedPlayers[player.id] = {
        ...player,
        age: player.age + 1,
        experience: player.experience + 1,
      };
    }
  }

  return updatedPlayers;
}

// ============================================================================
// COACHING CHANGES
// ============================================================================

/**
 * Process coaching changes: fire underperforming coaches and hire new ones.
 * Teams with bad records are more likely to fire their coaches.
 */
export function processCoachingChanges(
  teams: Record<string, Team>,
  coaches: Record<string, Coach>,
  year: number
): {
  updatedCoaches: Record<string, Coach>;
  changes: { teamId: string; firedCoachId: string; newCoach: Coach }[];
} {
  const updatedCoaches = { ...coaches };
  const changes: { teamId: string; firedCoachId: string; newCoach: Coach }[] = [];

  for (const team of Object.values(teams)) {
    const record = team.currentRecord;
    const totalGames = record.wins + record.losses + record.ties;
    if (totalGames === 0) continue;

    const winPct = record.wins / totalGames;

    // Fire probability based on record
    let fireChance = 0;
    if (winPct < 0.25) fireChance = 0.8;
    else if (winPct < 0.35) fireChance = 0.5;
    else if (winPct < 0.45) fireChance = 0.2;
    else if (winPct < 0.5) fireChance = 0.08;

    // Find head coach
    const headCoach = Object.values(updatedCoaches).find(
      (c) => c.teamId === team.id && c.role === 'headCoach'
    );

    if (headCoach && Math.random() < fireChance) {
      // Fire head coach
      updatedCoaches[headCoach.id] = {
        ...headCoach,
        teamId: null,
        isAvailable: true,
        contract: null,
      };

      // Generate new head coach
      const newCoach = generateCoach('headCoach', team.id, year + 1);
      updatedCoaches[newCoach.id] = newCoach;
      changes.push({ teamId: team.id, firedCoachId: headCoach.id, newCoach });

      // Often fire coordinators too when HC changes (~40% chance each)
      const roles: CoachRole[] = ['offensiveCoordinator', 'defensiveCoordinator'];
      for (const role of roles) {
        if (Math.random() < 0.4) {
          const coordinator = Object.values(updatedCoaches).find(
            (c) => c.teamId === team.id && c.role === role
          );
          if (coordinator) {
            updatedCoaches[coordinator.id] = {
              ...coordinator,
              teamId: null,
              isAvailable: true,
              contract: null,
            };
            const newCoord = generateCoach(role, team.id, year + 1);
            updatedCoaches[newCoord.id] = newCoord;
            changes.push({ teamId: team.id, firedCoachId: coordinator.id, newCoach: newCoord });
          }
        }
      }
    }

    // Handle expired coach contracts (advance and replace if needed)
    for (const coach of Object.values(updatedCoaches).filter((c) => c.teamId === team.id)) {
      if (coach.contract) {
        const advanced = advanceCoachContractYear(coach.contract);
        if (advanced === null) {
          // Contract expired - re-sign or let go
          const shouldResign = winPct > 0.45 || Math.random() < 0.5;
          if (shouldResign) {
            // Re-sign with new contract
            const newCoach = generateCoach(coach.role, team.id, year + 1);
            updatedCoaches[coach.id] = {
              ...coach,
              contract: newCoach.contract,
            };
          } else {
            // Let go
            updatedCoaches[coach.id] = {
              ...coach,
              teamId: null,
              isAvailable: true,
              contract: null,
            };
            const replacement = generateCoach(coach.role, team.id, year + 1);
            updatedCoaches[replacement.id] = replacement;
            changes.push({ teamId: team.id, firedCoachId: coach.id, newCoach: replacement });
          }
        } else {
          updatedCoaches[coach.id] = { ...coach, contract: advanced };
        }
      }
    }
  }

  return { updatedCoaches, changes };
}

// ============================================================================
// AI DRAFT
// ============================================================================

/**
 * Simple draft position needs assessment
 */
function getTeamPositionNeeds(team: Team, players: Record<string, Player>): Map<Position, number> {
  // Ideal roster composition
  const idealCounts: Partial<Record<Position, number>> = {
    [Position.QB]: 2,
    [Position.RB]: 3,
    [Position.WR]: 5,
    [Position.TE]: 3,
    [Position.LT]: 2,
    [Position.LG]: 2,
    [Position.C]: 2,
    [Position.RG]: 2,
    [Position.RT]: 2,
    [Position.DE]: 4,
    [Position.DT]: 3,
    [Position.OLB]: 3,
    [Position.ILB]: 3,
    [Position.CB]: 5,
    [Position.FS]: 2,
    [Position.SS]: 2,
    [Position.K]: 1,
    [Position.P]: 1,
  };

  const currentCounts: Record<string, number> = {};
  for (const pid of team.rosterPlayerIds) {
    const player = players[pid];
    if (player) {
      currentCounts[player.position] = (currentCounts[player.position] || 0) + 1;
    }
  }

  const needs = new Map<Position, number>();
  for (const [pos, ideal] of Object.entries(idealCounts)) {
    const current = currentCounts[pos] || 0;
    const deficit = (ideal as number) - current;
    if (deficit > 0) {
      needs.set(pos as Position, deficit);
    }
  }

  return needs;
}

/**
 * Run a simplified AI draft for all teams.
 * Each team picks based on their needs and available prospect quality.
 * Returns drafted players with their rookie contracts.
 */
export function processAIDraft(
  draftOrder: string[],
  prospects: Prospect[],
  teams: Record<string, Team>,
  players: Record<string, Player>,
  year: number
): {
  draftedPlayers: Player[];
  draftedContracts: PlayerContract[];
  updatedTeams: Record<string, Team>;
} {
  const draftedPlayers: Player[] = [];
  const draftedContracts: PlayerContract[] = [];
  const updatedTeams = { ...teams };
  const availableProspects = [...prospects];

  // 7 rounds, 32 picks per round
  for (let round = 1; round <= 7; round++) {
    for (let pick = 0; pick < draftOrder.length; pick++) {
      const teamId = draftOrder[pick];
      const team = updatedTeams[teamId];
      if (!team || availableProspects.length === 0) continue;

      const overallPick = (round - 1) * 32 + pick + 1;

      // Assess team needs
      const needs = getTeamPositionNeeds(team, {
        ...players,
        ...Object.fromEntries(
          draftedPlayers.filter((p) => team.rosterPlayerIds.includes(p.id)).map((p) => [p.id, p])
        ),
      });

      // Find best available - weight by need and talent
      let bestIndex = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < Math.min(availableProspects.length, 50); i++) {
        const prospect = availableProspects[i];
        const pos = prospect.player.position;

        // Talent score based on ceiling
        const ceilingScores: Record<string, number> = {
          franchiseCornerstone: 100,
          highEndStarter: 80,
          solidStarter: 60,
          qualityRotational: 40,
          specialist: 35,
          depth: 25,
          practiceSquad: 10,
        };
        const talentScore = ceilingScores[prospect.player.roleFit.ceiling] || 30;

        // Need bonus
        const needDeficit = needs.get(pos) || 0;
        const needBonus = needDeficit > 0 ? needDeficit * 15 : -10;

        const totalScore = talentScore + needBonus + randomInt(-5, 5);

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestIndex = i;
        }
      }

      // Draft the selected prospect
      const selectedProspect = availableProspects.splice(bestIndex, 1)[0];
      const draftedPlayer: Player = {
        ...selectedProspect.player,
        draftYear: year,
        draftRound: round,
        draftPick: overallPick,
        experience: 0,
        fatigue: 0,
        morale: 70 + randomInt(-10, 10),
      };

      // Generate rookie contract
      const slotAAV = getSlotAAVForPick(overallPick, round);
      const bonusPerYear = Math.round(slotAAV * 0.5);
      const salaryPerYear = slotAAV - bonusPerYear;

      const offer: ContractOffer = {
        years: 4,
        bonusPerYear,
        salaryPerYear,
        noTradeClause: false,
      };

      const contract = createPlayerContract(
        draftedPlayer.id,
        getPlayerFullName(draftedPlayer),
        teamId,
        draftedPlayer.position,
        offer,
        year,
        'rookie'
      );

      draftedPlayers.push({ ...draftedPlayer, contractId: contract.id });
      draftedContracts.push(contract);

      // Add to team roster
      updatedTeams[teamId] = {
        ...updatedTeams[teamId],
        rosterPlayerIds: [...updatedTeams[teamId].rosterPlayerIds, draftedPlayer.id],
      };
    }
  }

  return { draftedPlayers, draftedContracts, updatedTeams };
}

/**
 * Approximate rookie slot AAV based on draft position
 */
function getSlotAAVForPick(overallPick: number, round: number): number {
  if (round === 1) {
    // First round: $5M-$12M AAV
    return Math.round(12000000 - (overallPick - 1) * 220000);
  } else if (round === 2) {
    return Math.round(3500000 - (overallPick - 33) * 40000);
  } else if (round === 3) {
    return Math.round(2000000 - (overallPick - 65) * 20000);
  } else if (round <= 5) {
    return Math.round(1200000 - (overallPick - 97) * 5000);
  }
  // Late rounds
  return Math.round(900000 - (round - 5) * 30000);
}

// ============================================================================
// AI FREE AGENCY
// ============================================================================

/**
 * Process simplified AI free agency.
 * Free agents sign with teams that need their position and can afford them.
 */
export function processAIFreeAgency(
  freeAgentIds: string[],
  players: Record<string, Player>,
  teams: Record<string, Team>,
  contracts: Record<string, PlayerContract>,
  year: number,
  salaryCap: number = DEFAULT_SALARY_CAP
): {
  signings: { playerId: string; teamId: string; contract: PlayerContract }[];
  updatedPlayers: Record<string, Player>;
  updatedTeams: Record<string, Team>;
  updatedContracts: Record<string, PlayerContract>;
} {
  const signings: { playerId: string; teamId: string; contract: PlayerContract }[] = [];
  const updatedPlayers = { ...players };
  const updatedTeams = { ...teams };
  const updatedContracts = { ...contracts };

  // Cache skill tiers for all free agents to avoid redundant calls
  const skillTierCache = new Map<string, string>();
  const tierScores: Record<string, number> = { elite: 4, starter: 3, backup: 2, fringe: 1 };
  for (const id of freeAgentIds) {
    const player = updatedPlayers[id];
    if (player) {
      skillTierCache.set(id, determineSkillTierFromPlayer(player));
    }
  }

  // Sort free agents by skill (best first) using cached tiers
  const sortedFAs = freeAgentIds
    .map((id) => updatedPlayers[id])
    .filter((p): p is Player => p != null)
    .sort((a, b) => {
      const aScore = tierScores[skillTierCache.get(a.id) || 'fringe'] || 1;
      const bScore = tierScores[skillTierCache.get(b.id) || 'fringe'] || 1;
      return bScore - aScore;
    });

  // Pre-compute cap usage for all teams to avoid recalculating per signing
  const teamCapUsage = new Map<string, number>();
  for (const team of Object.values(updatedTeams)) {
    const teamContracts = Object.values(updatedContracts).filter(
      (c) => c.teamId === team.id && c.status === 'active'
    );
    const capUsage = calculateTotalCapUsage(
      Object.fromEntries(teamContracts.map((c) => [c.id, c])),
      year
    );
    teamCapUsage.set(team.id, capUsage);
  }

  for (const freeAgent of sortedFAs) {
    // Don't sign old marginal players (use cached skill tiers)
    const faTier = skillTierCache.get(freeAgent.id) || 'fringe';
    if (freeAgent.age > 36 && faTier === 'fringe') continue;
    if (freeAgent.age > 38 && faTier !== 'elite') continue;

    // Find teams that need this position
    const interestedTeams: { teamId: string; needScore: number }[] = [];

    for (const team of Object.values(updatedTeams)) {
      const needs = getTeamPositionNeeds(team, updatedPlayers);
      const needDeficit = needs.get(freeAgent.position) || 0;

      // Also consider roster size
      const rosterSize = team.rosterPlayerIds.length;
      const rosterNeed = rosterSize < 53 ? (53 - rosterSize) * 2 : 0;

      if (needDeficit > 0 || rosterSize < 50) {
        // Use cached cap usage for O(1) lookup
        const capUsage = teamCapUsage.get(team.id) || 0;
        const capSpace = salaryCap - capUsage;

        if (capSpace > 1000) {
          interestedTeams.push({
            teamId: team.id,
            needScore: needDeficit * 10 + rosterNeed + randomInt(0, 10),
          });
        }
      }
    }

    if (interestedTeams.length === 0) continue;

    // Sort by need and pick top team
    interestedTeams.sort((a, b) => b.needScore - a.needScore);
    const winnerTeamId = interestedTeams[0].teamId;

    // Generate contract
    const contract = generatePlayerContract(freeAgent, winnerTeamId, year);

    // Check if the contract's cap hit fits under the team's remaining cap space
    const contractCapHit = getCapHitForYear(contract, year);
    const currentTeamCapUsage = teamCapUsage.get(winnerTeamId) || 0;
    const remainingCap = salaryCap - currentTeamCapUsage;

    if (contractCapHit > remainingCap) {
      // Contract too expensive - try a minimum salary deal instead
      const minSalary = getMinimumSalary(freeAgent.experience);
      if (minSalary > remainingCap) {
        // Can't even afford minimum salary - skip this signing
        continue;
      }
      // Sign for minimum salary
      const minOffer: ContractOffer = {
        years: 1,
        bonusPerYear: minSalary,
        salaryPerYear: 0,
        noTradeClause: false,
      };
      const minContract = createPlayerContract(
        freeAgent.id,
        `${freeAgent.firstName} ${freeAgent.lastName}`,
        winnerTeamId,
        freeAgent.position,
        minOffer,
        year,
        'veteran'
      );
      updatedContracts[minContract.id] = minContract;
      updatedPlayers[freeAgent.id] = { ...freeAgent, contractId: minContract.id };
      const minCapHit = getCapHitForYear(minContract, year);
      teamCapUsage.set(winnerTeamId, currentTeamCapUsage + minCapHit);

      updatedTeams[winnerTeamId] = {
        ...updatedTeams[winnerTeamId],
        rosterPlayerIds: [...updatedTeams[winnerTeamId].rosterPlayerIds, freeAgent.id],
      };

      signings.push({ playerId: freeAgent.id, teamId: winnerTeamId, contract: minContract });
      continue;
    }

    updatedContracts[contract.id] = contract;
    updatedPlayers[freeAgent.id] = { ...freeAgent, contractId: contract.id };

    // Incrementally update cached cap usage for the signing team
    teamCapUsage.set(winnerTeamId, currentTeamCapUsage + contractCapHit);

    // Add to team
    updatedTeams[winnerTeamId] = {
      ...updatedTeams[winnerTeamId],
      rosterPlayerIds: [...updatedTeams[winnerTeamId].rosterPlayerIds, freeAgent.id],
    };

    signings.push({ playerId: freeAgent.id, teamId: winnerTeamId, contract });
  }

  return { signings, updatedPlayers, updatedTeams, updatedContracts };
}

// ============================================================================
// ROSTER MAINTENANCE
// ============================================================================

/**
 * Ensure every team has at least 53 players. Generate fill-in players as needed.
 * Cut excess players over 53.
 */
export function processRosterMaintenance(
  teams: Record<string, Team>,
  players: Record<string, Player>,
  contracts: Record<string, PlayerContract>,
  year: number
): {
  updatedTeams: Record<string, Team>;
  updatedPlayers: Record<string, Player>;
  updatedContracts: Record<string, PlayerContract>;
} {
  const updatedTeams = { ...teams };
  const updatedPlayers = { ...players };
  const updatedContracts = { ...contracts };

  for (const teamId of Object.keys(updatedTeams)) {
    const team = updatedTeams[teamId];
    let rosterIds = [...team.rosterPlayerIds];

    // Cut excess players (keep the best 53)
    if (rosterIds.length > 53) {
      const rosterPlayers = rosterIds
        .map((id) => updatedPlayers[id])
        .filter((p): p is Player => p != null);

      // Sort by skill tier (best first)
      rosterPlayers.sort((a, b) => {
        const tierOrder: Record<string, number> = { elite: 4, starter: 3, backup: 2, fringe: 1 };
        const aOrder = tierOrder[determineSkillTierFromPlayer(a)] || 0;
        const bOrder = tierOrder[determineSkillTierFromPlayer(b)] || 0;
        return bOrder - aOrder;
      });

      const keepers = rosterPlayers.slice(0, 53);
      const cutPlayers = rosterPlayers.slice(53);

      rosterIds = keepers.map((p) => p.id);

      // Remove contracts for cut players
      for (const cutPlayer of cutPlayers) {
        if (cutPlayer.contractId && updatedContracts[cutPlayer.contractId]) {
          updatedContracts[cutPlayer.contractId] = {
            ...updatedContracts[cutPlayer.contractId],
            status: 'expired',
          };
        }
        updatedPlayers[cutPlayer.id] = { ...cutPlayer, contractId: null };
      }
    }

    // Fill roster if below 53
    if (rosterIds.length < 53) {
      const needed = 53 - rosterIds.length;

      // Generate only the exact number of players needed
      const fillerPositions: Position[] = [
        Position.WR,
        Position.CB,
        Position.DE,
        Position.OLB,
        Position.DT,
        Position.RB,
        Position.TE,
        Position.ILB,
        Position.FS,
        Position.SS,
        Position.LG,
        Position.RG,
        Position.LT,
        Position.RT,
        Position.C,
        Position.QB,
        Position.K,
        Position.P,
      ];

      // Determine team's position needs for smarter filling
      const needs = getTeamPositionNeeds({ ...team, rosterPlayerIds: rosterIds }, updatedPlayers);

      for (let i = 0; i < needed; i++) {
        // Pick position based on team needs, falling back to common positions
        let position = fillerPositions[i % fillerPositions.length];
        for (const [needPos] of needs) {
          const currentNeed = needs.get(needPos) || 0;
          if (currentNeed > 0) {
            position = needPos;
            needs.set(needPos, currentNeed - 1);
            break;
          }
        }

        // Vary skill tier: ~20% backup, ~80% fringe (not all fringe)
        const skillTier = Math.random() < 0.2 ? 'backup' : 'fringe';
        const newPlayer = generatePlayer({
          position,
          skillTier,
          teamId,
          ageRange: { min: 22, max: 28 },
        });

        // Use generatePlayerContract for realistic multi-year contracts
        const contract = generatePlayerContract(newPlayer, teamId, year);

        updatedPlayers[newPlayer.id] = { ...newPlayer, contractId: contract.id };
        updatedContracts[contract.id] = contract;
        rosterIds.push(newPlayer.id);
      }
    }

    updatedTeams[teamId] = {
      ...team,
      rosterPlayerIds: rosterIds,
    };
  }

  return { updatedTeams, updatedPlayers, updatedContracts };
}

// ============================================================================
// CAP ENFORCEMENT
// ============================================================================

/**
 * Enforce salary cap compliance for all teams.
 * Teams over the cap will auto-cut their most overpaid/worst players until under.
 * This mimics the real NFL where teams MUST be under the cap by a deadline.
 */
export function enforceCapCompliance(
  teams: Record<string, Team>,
  players: Record<string, Player>,
  contracts: Record<string, PlayerContract>,
  year: number,
  salaryCap: number
): {
  updatedTeams: Record<string, Team>;
  updatedPlayers: Record<string, Player>;
  updatedContracts: Record<string, PlayerContract>;
} {
  const updatedTeams = { ...teams };
  const updatedPlayers = { ...players };
  const updatedContracts = { ...contracts };

  for (const teamId of Object.keys(updatedTeams)) {
    const team = updatedTeams[teamId];

    // Calculate current cap usage for this team
    const teamContracts = Object.values(updatedContracts).filter(
      (c) => c.teamId === teamId && c.status === 'active'
    );
    let capUsage = calculateTotalCapUsage(
      Object.fromEntries(teamContracts.map((c) => [c.id, c])),
      year
    );

    if (capUsage <= salaryCap) continue; // Team is compliant

    // Build list of cuttable players sorted by worst value (cap hit vs skill)
    // We want to cut overpaid low-skill players first
    const cuttablePlayers: {
      playerId: string;
      contractId: string;
      capHit: number;
      capSavings: number;
      skillScore: number;
    }[] = [];

    for (const contract of teamContracts) {
      const player = updatedPlayers[contract.playerId];
      if (!player) continue;

      const capHit = getCapHitForYear(contract, year);
      // Cap savings from cutting = non-guaranteed salary portion
      const capSavings = contract.yearlyBreakdown.find((y) => y.year === year)?.salary ?? 0;

      if (capSavings <= 0) continue; // Can't save anything by cutting (all guaranteed)

      const tierScores: Record<string, number> = { elite: 4, starter: 3, backup: 2, fringe: 1 };
      const skillTier = determineSkillTierFromPlayer(player);
      const skillScore = tierScores[skillTier] || 1;

      cuttablePlayers.push({
        playerId: player.id,
        contractId: contract.id,
        capHit,
        capSavings,
        skillScore,
      });
    }

    // Sort by worst value: highest (capHit / skillScore) first = most overpaid
    cuttablePlayers.sort((a, b) => {
      const aValue = a.capHit / a.skillScore;
      const bValue = b.capHit / b.skillScore;
      return bValue - aValue;
    });

    // Cut players until under cap, maintaining minimum 45 players
    let rosterIds = [...team.rosterPlayerIds];
    for (const candidate of cuttablePlayers) {
      if (capUsage <= salaryCap) break;
      if (rosterIds.length <= 45) break; // Don't cut below minimum viable roster

      // Cut the player
      const contract = updatedContracts[candidate.contractId];
      if (contract) {
        updatedContracts[candidate.contractId] = { ...contract, status: 'expired' };
      }
      updatedPlayers[candidate.playerId] = {
        ...updatedPlayers[candidate.playerId],
        contractId: null,
      };
      rosterIds = rosterIds.filter((id) => id !== candidate.playerId);
      capUsage -= candidate.capSavings;
    }

    updatedTeams[teamId] = {
      ...team,
      rosterPlayerIds: rosterIds,
    };
  }

  return { updatedTeams, updatedPlayers, updatedContracts };
}

// ============================================================================
// TEAM FINANCIAL UPDATE
// ============================================================================

/**
 * Recalculate team finances based on current contracts
 */
export function updateTeamFinances(
  teams: Record<string, Team>,
  contracts: Record<string, PlayerContract>,
  year: number,
  salaryCap: number = DEFAULT_SALARY_CAP
): Record<string, Team> {
  const updatedTeams = { ...teams };

  for (const teamId of Object.keys(updatedTeams)) {
    const teamContracts = Object.fromEntries(
      Object.entries(contracts).filter(([, c]) => c.teamId === teamId && c.status === 'active')
    );
    const capUsage = calculateTotalCapUsage(teamContracts, year);
    const futureCommitments = calculateFutureCommitments(teamContracts, year);

    updatedTeams[teamId] = {
      ...updatedTeams[teamId],
      finances: {
        ...updatedTeams[teamId].finances,
        salaryCap,
        currentCapUsage: capUsage,
        capSpace: salaryCap - capUsage,
        nextYearCommitted: futureCommitments.nextYear,
        twoYearsOutCommitted: futureCommitments.twoYearsOut,
        threeYearsOutCommitted: futureCommitments.threeYearsOut,
      },
    };
  }

  return updatedTeams;
}

// ============================================================================
// SEASON RECORD AGGREGATION
// ============================================================================

/**
 * Update all-time records and championship counts after a season
 */
export function updateTeamHistories(
  teams: Record<string, Team>,
  championTeamId: string | null,
  year: number
): Record<string, Team> {
  const updatedTeams = { ...teams };

  for (const teamId of Object.keys(updatedTeams)) {
    const team = updatedTeams[teamId];
    const record = team.currentRecord;

    updatedTeams[teamId] = {
      ...team,
      allTimeRecord: {
        wins: team.allTimeRecord.wins + record.wins,
        losses: team.allTimeRecord.losses + record.losses,
        ties: team.allTimeRecord.ties + record.ties,
      },
      championships: team.championships + (teamId === championTeamId ? 1 : 0),
      lastChampionshipYear: teamId === championTeamId ? year : team.lastChampionshipYear,
      // Reset current record for next season
      currentRecord: createEmptyTeamRecord(),
    };
  }

  return updatedTeams;
}

/**
 * Create draft picks for all teams for a given year
 */
export function createDraftPicksForYear(
  draftOrder: string[],
  year: number
): Record<string, DraftPick> {
  const draftPicks: Record<string, DraftPick> = {};

  for (let round = 1; round <= 7; round++) {
    draftOrder.forEach((teamId, index) => {
      const pickNumber = (round - 1) * 32 + index + 1;
      const pickId = `pick-${year}-${round}-${pickNumber}`;

      draftPicks[pickId] = {
        id: pickId,
        year,
        round,
        overallPick: pickNumber,
        originalTeamId: teamId,
        currentTeamId: teamId,
        selectedPlayerId: null,
        tradeHistory: [],
      };
    });
  }

  return draftPicks;
}
