/**
 * Phase State Mappers
 * Functions to apply offseason phase results to GameState
 */

import type { GameState } from '../models/game/GameState';
import type { Player } from '../models/player/Player';
import type { PlayerContract, ContractYear } from '../contracts/Contract';
import type { InjuryStatus, InjurySeverity, InjuryType } from '../models/player/InjuryStatus';
import type {
  CoachingChangeRecord,
  ContractDecisionRecord,
  DraftSelectionRecord,
  FreeAgentSigningRecord,
  UDFASigningRecord,
} from './OffseasonPersistentData';
import type { CampInjury } from './phases/TrainingCampPhase';
import type { PreseasonInjury } from './phases/PreseasonPhase';
import type { Prospect } from '../draft/Prospect';
import { createDefaultCoach } from '../models/staff/Coach';
import type { CoachRole } from '../models/staff/StaffSalary';

/**
 * Result of applying a phase to GameState
 */
export interface PhaseApplicationResult {
  gameState: GameState;
  changes: {
    playersAdded: string[];
    playersRemoved: string[];
    playersModified: string[];
    coachesAdded: string[];
    coachesRemoved: string[];
    contractsAdded: string[];
    contractsRemoved: string[];
    contractsModified: string[];
    teamsModified: string[];
  };
  errors: string[];
}

/**
 * Creates an empty result structure
 */
function createEmptyResult(gameState: GameState): PhaseApplicationResult {
  return {
    gameState,
    changes: {
      playersAdded: [],
      playersRemoved: [],
      playersModified: [],
      coachesAdded: [],
      coachesRemoved: [],
      contractsAdded: [],
      contractsRemoved: [],
      contractsModified: [],
      teamsModified: [],
    },
    errors: [],
  };
}

/**
 * Applies coaching changes to GameState
 */
export function applyCoachingChanges(
  gameState: GameState,
  changes: CoachingChangeRecord[]
): PhaseApplicationResult {
  const result = createEmptyResult(gameState);
  const newCoaches = { ...gameState.coaches };
  const newTeams = { ...gameState.teams };

  for (const change of changes) {
    try {
      if (change.type === 'fire') {
        // Update staff hierarchy on team
        const team = newTeams[change.teamId];
        if (team) {
          const updatedStaffHierarchy = { ...team.staffHierarchy };

          // Remove coach from appropriate position
          if (updatedStaffHierarchy.headCoach === change.coachId) {
            updatedStaffHierarchy.headCoach = null;
          }
          if (updatedStaffHierarchy.offensiveCoordinator === change.coachId) {
            updatedStaffHierarchy.offensiveCoordinator = null;
          }
          if (updatedStaffHierarchy.defensiveCoordinator === change.coachId) {
            updatedStaffHierarchy.defensiveCoordinator = null;
          }

          newTeams[change.teamId] = { ...team, staffHierarchy: updatedStaffHierarchy };
          result.changes.teamsModified.push(change.teamId);
        }

        // Remove coach from active coaches (or mark as unemployed)
        if (newCoaches[change.coachId]) {
          delete newCoaches[change.coachId];
          result.changes.coachesRemoved.push(change.coachId);
        }
      } else if (change.type === 'hire') {
        // Create the coach object if it doesn't already exist in the coaches map
        if (!newCoaches[change.coachId]) {
          // Map the role string to CoachRole type
          const roleLower = change.role.toLowerCase();
          let coachRole: CoachRole = 'headCoach';
          if (roleLower.includes('offensive') || roleLower === 'oc') {
            coachRole = 'offensiveCoordinator';
          } else if (roleLower.includes('defensive') || roleLower === 'dc') {
            coachRole = 'defensiveCoordinator';
          }

          // Parse name into first/last
          const nameParts = change.coachName.split(' ');
          const firstName = nameParts[0] || 'Coach';
          const lastName = nameParts.slice(1).join(' ') || 'Unknown';

          const newCoach = createDefaultCoach(change.coachId, firstName, lastName, coachRole);
          newCoaches[change.coachId] = {
            ...newCoach,
            teamId: change.teamId,
            isAvailable: false,
          };
        }

        // Add coach to team's staff hierarchy
        const team = newTeams[change.teamId];
        if (team && newCoaches[change.coachId]) {
          const updatedStaffHierarchy = { ...team.staffHierarchy };

          // Assign to appropriate position based on role
          const roleLower = change.role.toLowerCase();
          if (roleLower.includes('head coach') || roleLower === 'headcoach') {
            updatedStaffHierarchy.headCoach = change.coachId;
          } else if (roleLower.includes('offensive') || roleLower === 'oc') {
            updatedStaffHierarchy.offensiveCoordinator = change.coachId;
          } else if (roleLower.includes('defensive') || roleLower === 'dc') {
            updatedStaffHierarchy.defensiveCoordinator = change.coachId;
          }

          newTeams[change.teamId] = { ...team, staffHierarchy: updatedStaffHierarchy };
          result.changes.teamsModified.push(change.teamId);
          result.changes.coachesAdded.push(change.coachId);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to apply coaching change: ${change.coachName} - ${error}`);
    }
  }

  result.gameState = {
    ...gameState,
    coaches: newCoaches,
    teams: newTeams,
  };

  return result;
}

/**
 * Applies contract decisions to GameState
 */
export function applyContractDecisions(
  gameState: GameState,
  decisions: ContractDecisionRecord[]
): PhaseApplicationResult {
  const result = createEmptyResult(gameState);
  const newContracts = { ...gameState.contracts };
  const newPlayers = { ...gameState.players };
  const newTeams = { ...gameState.teams };

  for (const decision of decisions) {
    try {
      if (decision.type === 'cut') {
        // Remove player from team roster
        const team = newTeams[decision.teamId];
        if (team) {
          const updatedRosterPlayerIds = team.rosterPlayerIds.filter(
            (id: string) => id !== decision.playerId
          );
          newTeams[decision.teamId] = { ...team, rosterPlayerIds: updatedRosterPlayerIds };
          result.changes.teamsModified.push(decision.teamId);
        }

        // Remove player's contract
        const contractId = Object.keys(newContracts).find(
          (id) => newContracts[id].playerId === decision.playerId
        );
        if (contractId) {
          // Update contract to null on player
          if (newPlayers[decision.playerId]) {
            newPlayers[decision.playerId] = {
              ...newPlayers[decision.playerId],
              contractId: null,
            };
            result.changes.playersModified.push(decision.playerId);
          }
          delete newContracts[contractId];
          result.changes.contractsRemoved.push(contractId);
        }

        // Track cut players so they can be added to the free agent pool
        result.changes.playersRemoved.push(decision.playerId);

        // Apply dead money to team finances
        if (team && decision.details.deadMoney) {
          const updatedFinances = {
            ...team.finances,
            deadMoney: (team.finances.deadMoney || 0) + decision.details.deadMoney,
          };
          newTeams[decision.teamId] = {
            ...newTeams[decision.teamId],
            finances: updatedFinances,
          };
        }
      } else if (decision.type === 'restructure') {
        // Update contract with new terms
        const contractId = Object.keys(newContracts).find(
          (id) => newContracts[id].playerId === decision.playerId
        );
        if (contractId && decision.details.newSalary !== undefined) {
          const contract = newContracts[contractId];
          const updatedYearlyBreakdown = contract.yearlyBreakdown.map(
            (year: ContractYear, idx: number) => {
              if (idx === 0) {
                return {
                  ...year,
                  salary: decision.details.newSalary!,
                  capHit: year.bonus + decision.details.newSalary!,
                };
              }
              return year;
            }
          );
          newContracts[contractId] = {
            ...contract,
            yearlyBreakdown: updatedYearlyBreakdown,
          };
          result.changes.contractsModified.push(contractId);
        }
      } else if (decision.type === 'franchise_tag' || decision.type === 'transition_tag') {
        // Apply tag to player's contract
        const contractId = Object.keys(newContracts).find(
          (id) => newContracts[id].playerId === decision.playerId
        );
        if (contractId && decision.details.newSalary !== undefined) {
          const currentYear = gameState.league.calendar.currentYear;
          const tagYear: ContractYear = {
            year: currentYear,
            bonus: 0,
            salary: decision.details.newSalary,
            capHit: decision.details.newSalary,
            isVoidYear: false,
            isGuaranteed: true,
          };
          newContracts[contractId] = {
            ...newContracts[contractId],
            yearlyBreakdown: [tagYear],
            totalYears: 1,
            yearsRemaining: 1,
            totalValue: decision.details.newSalary,
            type: decision.type === 'franchise_tag' ? 'franchise_tag' : 'transition_tag',
          };
          result.changes.contractsModified.push(contractId);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to apply contract decision for ${decision.playerName}: ${error}`);
    }
  }

  result.gameState = {
    ...gameState,
    contracts: newContracts,
    players: newPlayers,
    teams: newTeams,
  };

  return result;
}

/**
 * Converts a prospect to a player after being drafted
 */
function convertProspectToPlayer(prospect: Prospect, gameState: GameState): Player {
  // The prospect already contains a full Player object
  return {
    ...prospect.player,
    // Update draft-related fields
    draftYear: gameState.league.calendar.currentYear,
  };
}

/**
 * Applies draft selections to GameState
 */
export function applyDraftSelections(
  gameState: GameState,
  selections: DraftSelectionRecord[]
): PhaseApplicationResult {
  const result = createEmptyResult(gameState);
  const newPlayers = { ...gameState.players };
  const newContracts = { ...gameState.contracts };
  const newProspects = { ...gameState.prospects };
  const newTeams = { ...gameState.teams };

  for (const selection of selections) {
    try {
      const prospect = newProspects[selection.prospectId];
      if (!prospect) {
        result.errors.push(`Prospect not found: ${selection.prospectId}`);
        continue;
      }

      // Convert prospect to player
      const player = convertProspectToPlayer(prospect, gameState);
      player.draftRound = selection.round;
      player.draftPick = selection.overallPick;

      // Use the prospect's player ID
      const playerId = prospect.player.id;
      newPlayers[playerId] = player;
      result.changes.playersAdded.push(playerId);

      // Create rookie contract
      const contractId = `contract-${playerId}-${gameState.league.calendar.currentYear}`;
      const currentYear = gameState.league.calendar.currentYear;
      const yearlyBreakdown: ContractYear[] = Array.from(
        { length: selection.contractYears },
        (_, i) => ({
          year: currentYear + i,
          bonus: i === 0 ? Math.floor(selection.contractValue * 0.15) : 0,
          salary: Math.floor((selection.contractValue * 0.85) / selection.contractYears),
          capHit: Math.floor(selection.contractValue / selection.contractYears),
          isVoidYear: false,
          isGuaranteed: i < 2,
        })
      );

      const contract: PlayerContract = {
        id: contractId,
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        teamId: selection.teamId,
        position: player.position,
        status: 'active',
        type: 'rookie',
        signedYear: currentYear,
        totalYears: selection.contractYears,
        yearsRemaining: selection.contractYears,
        totalValue: selection.contractValue,
        guaranteedMoney: Math.floor(selection.contractValue * 0.8),
        signingBonus: Math.floor(selection.contractValue * 0.15),
        averageAnnualValue: Math.floor(selection.contractValue / selection.contractYears),
        yearlyBreakdown,
        voidYears: 0,
        hasNoTradeClause: false,
        hasNoTagClause: false,
        originalContractId: null,
        notes: [`Drafted in round ${selection.round}, pick ${selection.overallPick}`],
      };
      newContracts[contractId] = contract;
      result.changes.contractsAdded.push(contractId);

      // Update player's contractId
      newPlayers[playerId] = {
        ...newPlayers[playerId],
        contractId,
      };

      // Add player to team roster
      const team = newTeams[selection.teamId];
      if (team) {
        const updatedRosterPlayerIds = [...team.rosterPlayerIds, playerId];
        newTeams[selection.teamId] = { ...team, rosterPlayerIds: updatedRosterPlayerIds };
        result.changes.teamsModified.push(selection.teamId);
      }

      // Remove prospect from pool
      delete newProspects[selection.prospectId];
    } catch (error) {
      result.errors.push(`Failed to apply draft selection: ${selection.playerName} - ${error}`);
    }
  }

  result.gameState = {
    ...gameState,
    players: newPlayers,
    contracts: newContracts,
    prospects: newProspects,
    teams: newTeams,
  };

  return result;
}

/**
 * Applies free agency signings to GameState
 */
export function applyFreeAgencySignings(
  gameState: GameState,
  signings: FreeAgentSigningRecord[]
): PhaseApplicationResult {
  const result = createEmptyResult(gameState);
  const newPlayers = { ...gameState.players };
  const newContracts = { ...gameState.contracts };
  const newTeams = { ...gameState.teams };

  for (const signing of signings) {
    try {
      const player = newPlayers[signing.playerId];
      if (!player) {
        result.errors.push(`Player not found: ${signing.playerId}`);
        continue;
      }

      // Remove from previous team if applicable
      if (signing.previousTeamId) {
        const prevTeam = newTeams[signing.previousTeamId];
        if (prevTeam) {
          const updatedRosterPlayerIds = prevTeam.rosterPlayerIds.filter(
            (id: string) => id !== signing.playerId
          );
          newTeams[signing.previousTeamId] = {
            ...prevTeam,
            rosterPlayerIds: updatedRosterPlayerIds,
          };
          result.changes.teamsModified.push(signing.previousTeamId);
        }
      }

      // Create new contract
      const currentYear = gameState.league.calendar.currentYear;
      const contractId = `contract-${signing.playerId}-${currentYear}`;
      const yearlyBreakdown: ContractYear[] = Array.from(
        { length: signing.contractYears },
        (_, i) => ({
          year: currentYear + i,
          bonus: i === 0 ? signing.signingBonus : 0,
          salary: Math.floor((signing.totalValue - signing.signingBonus) / signing.contractYears),
          capHit: Math.floor(signing.totalValue / signing.contractYears),
          isVoidYear: false,
          isGuaranteed: i === 0,
        })
      );

      const contract: PlayerContract = {
        id: contractId,
        playerId: signing.playerId,
        playerName: signing.playerName,
        teamId: signing.teamId,
        position: player.position,
        status: 'active',
        type: 'veteran',
        signedYear: currentYear,
        totalYears: signing.contractYears,
        yearsRemaining: signing.contractYears,
        totalValue: signing.totalValue,
        guaranteedMoney: signing.guaranteedMoney,
        signingBonus: signing.signingBonus,
        averageAnnualValue: Math.floor(signing.totalValue / signing.contractYears),
        yearlyBreakdown,
        voidYears: 0,
        hasNoTradeClause: false,
        hasNoTagClause: false,
        originalContractId: null,
        notes: [`Signed as free agent`],
      };
      newContracts[contractId] = contract;
      result.changes.contractsAdded.push(contractId);

      // Update player's contractId
      newPlayers[signing.playerId] = {
        ...player,
        contractId,
      };
      result.changes.playersModified.push(signing.playerId);

      // Add player to new team roster
      const team = newTeams[signing.teamId];
      if (team) {
        const updatedRosterPlayerIds = [...team.rosterPlayerIds, signing.playerId];
        newTeams[signing.teamId] = { ...team, rosterPlayerIds: updatedRosterPlayerIds };
        if (!result.changes.teamsModified.includes(signing.teamId)) {
          result.changes.teamsModified.push(signing.teamId);
        }
      }
    } catch (error) {
      result.errors.push(`Failed to apply FA signing: ${signing.playerName} - ${error}`);
    }
  }

  result.gameState = {
    ...gameState,
    players: newPlayers,
    contracts: newContracts,
    teams: newTeams,
  };

  return result;
}

/**
 * Applies UDFA signings to GameState
 */
export function applyUDFASignings(
  gameState: GameState,
  signings: UDFASigningRecord[]
): PhaseApplicationResult {
  const result = createEmptyResult(gameState);
  const newPlayers = { ...gameState.players };
  const newContracts = { ...gameState.contracts };
  const newProspects = { ...gameState.prospects };
  const newTeams = { ...gameState.teams };

  for (const signing of signings) {
    try {
      const prospect = newProspects[signing.prospectId];
      if (!prospect) {
        result.errors.push(`UDFA prospect not found: ${signing.prospectId}`);
        continue;
      }

      // Convert prospect to player
      const player = convertProspectToPlayer(prospect, gameState);
      player.draftRound = 0; // Undrafted
      player.draftPick = 0;

      const playerId = prospect.player.id;
      newPlayers[playerId] = player;
      result.changes.playersAdded.push(playerId);

      // Create UDFA contract (3 years, minimum salary)
      const currentYear = gameState.league.calendar.currentYear;
      const contractId = `contract-${playerId}-${currentYear}`;
      const yearlyBreakdown: ContractYear[] = Array.from(
        { length: signing.contractYears },
        (_, i) => ({
          year: currentYear + i,
          bonus: i === 0 ? signing.signingBonus : 0,
          salary: signing.baseSalary,
          capHit: signing.baseSalary + signing.signingBonus / signing.contractYears,
          isVoidYear: false,
          isGuaranteed: false,
        })
      );

      const contract: PlayerContract = {
        id: contractId,
        playerId,
        playerName: signing.playerName,
        teamId: signing.teamId,
        position: player.position,
        status: 'active',
        type: 'rookie',
        signedYear: currentYear,
        totalYears: signing.contractYears,
        yearsRemaining: signing.contractYears,
        totalValue: signing.baseSalary * signing.contractYears + signing.signingBonus,
        guaranteedMoney: signing.signingBonus,
        signingBonus: signing.signingBonus,
        averageAnnualValue: signing.baseSalary,
        yearlyBreakdown,
        voidYears: 0,
        hasNoTradeClause: false,
        hasNoTagClause: false,
        originalContractId: null,
        notes: [`Signed as undrafted free agent`],
      };
      newContracts[contractId] = contract;
      result.changes.contractsAdded.push(contractId);

      // Update player's contractId
      newPlayers[playerId] = {
        ...newPlayers[playerId],
        contractId,
      };

      // Add player to team roster
      const team = newTeams[signing.teamId];
      if (team) {
        const updatedRosterPlayerIds = [...team.rosterPlayerIds, playerId];
        newTeams[signing.teamId] = { ...team, rosterPlayerIds: updatedRosterPlayerIds };
        result.changes.teamsModified.push(signing.teamId);
      }

      // Remove prospect from pool
      delete newProspects[signing.prospectId];
    } catch (error) {
      result.errors.push(`Failed to apply UDFA signing: ${signing.playerName} - ${error}`);
    }
  }

  result.gameState = {
    ...gameState,
    players: newPlayers,
    contracts: newContracts,
    prospects: newProspects,
    teams: newTeams,
  };

  return result;
}

/**
 * Maps camp/preseason severity to InjurySeverity
 */
function mapSeverityToInjurySeverity(
  severity: 'minor' | 'moderate' | 'serious' | 'season_ending'
): InjurySeverity {
  switch (severity) {
    case 'minor':
      return 'questionable';
    case 'moderate':
      return 'out';
    case 'serious':
      return 'ir';
    case 'season_ending':
      return 'ir';
    default:
      return 'out';
  }
}

/**
 * Maps injury type string to InjuryType
 */
function mapInjuryType(injuryType: string): InjuryType {
  const typeMap: Record<string, InjuryType> = {
    'Hamstring strain': 'hamstring',
    Hamstring: 'hamstring',
    'Soft tissue injury': 'other',
    'Ankle sprain': 'ankle',
    'Knee injury': 'knee',
    'Knee sprain': 'knee',
    'Shoulder injury': 'shoulder',
    'Shoulder stinger': 'shoulder',
    'ACL tear': 'acl',
    'Achilles rupture': 'achilles',
    Concussion: 'concussion',
    Back: 'back',
    Foot: 'foot',
    Hand: 'hand',
  };
  return typeMap[injuryType] || 'other';
}

/**
 * Applies injuries to player status
 */
export function applyInjuries(
  gameState: GameState,
  injuries: (CampInjury | PreseasonInjury)[]
): PhaseApplicationResult {
  const result = createEmptyResult(gameState);
  const newPlayers = { ...gameState.players };

  for (const injury of injuries) {
    try {
      const player = newPlayers[injury.playerId];
      if (!player) {
        result.errors.push(`Player not found for injury: ${injury.playerId}`);
        continue;
      }

      // Map severity to weeks out
      const severityToWeeks: Record<string, number> = {
        minor: 1,
        moderate: 4,
        serious: 8,
        season_ending: 17,
      };

      const injuryStatus: InjuryStatus = {
        severity: mapSeverityToInjurySeverity(injury.severity),
        type: mapInjuryType(injury.injuryType),
        weeksRemaining: severityToWeeks[injury.severity] || 2,
        isPublic: true,
        lingeringEffect: 0,
      };

      newPlayers[injury.playerId] = {
        ...player,
        injuryStatus,
      };
      result.changes.playersModified.push(injury.playerId);
    } catch (error) {
      result.errors.push(`Failed to apply injury: ${injury.playerName} - ${error}`);
    }
  }

  result.gameState = {
    ...gameState,
    players: newPlayers,
  };

  return result;
}

/**
 * Applies roster moves (cuts, practice squad signings, IR)
 */
export function applyRosterMoves(
  gameState: GameState,
  cuts: string[],
  practiceSquadSignings: string[],
  irPlacements: string[]
): PhaseApplicationResult {
  const result = createEmptyResult(gameState);
  const newPlayers = { ...gameState.players };
  const newTeams = { ...gameState.teams };
  const newContracts = { ...gameState.contracts };

  // Process cuts
  for (const playerId of cuts) {
    try {
      const player = newPlayers[playerId];
      if (!player) continue;

      // Find player's team from contract
      const contract = Object.values(newContracts).find((c) => c.playerId === playerId);
      const teamId = contract?.teamId;

      if (teamId) {
        const team = newTeams[teamId];
        if (team) {
          const updatedRosterPlayerIds = team.rosterPlayerIds.filter(
            (id: string) => id !== playerId
          );
          newTeams[teamId] = { ...team, rosterPlayerIds: updatedRosterPlayerIds };
          result.changes.teamsModified.push(teamId);
        }
      }

      // Update player's contract to null
      newPlayers[playerId] = {
        ...player,
        contractId: null,
      };
      result.changes.playersRemoved.push(playerId);

      // Remove contract
      const contractId = Object.keys(newContracts).find(
        (id) => newContracts[id].playerId === playerId
      );
      if (contractId) {
        delete newContracts[contractId];
        result.changes.contractsRemoved.push(contractId);
      }
    } catch (error) {
      result.errors.push(`Failed to cut player: ${playerId} - ${error}`);
    }
  }

  // Process practice squad signings
  for (const playerId of practiceSquadSignings) {
    try {
      const player = newPlayers[playerId];
      if (!player) continue;

      // Find player's team from contract
      const contract = Object.values(newContracts).find((c) => c.playerId === playerId);
      const teamId = contract?.teamId;

      if (teamId) {
        const team = newTeams[teamId];
        if (team) {
          // Move from roster to practice squad
          const updatedRosterPlayerIds = team.rosterPlayerIds.filter(
            (id: string) => id !== playerId
          );
          const updatedPracticeSquadIds = [...team.practiceSquadIds, playerId];
          newTeams[teamId] = {
            ...team,
            rosterPlayerIds: updatedRosterPlayerIds,
            practiceSquadIds: updatedPracticeSquadIds,
          };
          result.changes.teamsModified.push(teamId);
        }
      }

      result.changes.playersModified.push(playerId);
    } catch (error) {
      result.errors.push(`Failed to sign to PS: ${playerId} - ${error}`);
    }
  }

  // Process IR placements
  for (const playerId of irPlacements) {
    try {
      const player = newPlayers[playerId];
      if (!player) continue;

      // Find player's team from contract
      const contract = Object.values(newContracts).find((c) => c.playerId === playerId);
      const teamId = contract?.teamId;

      if (teamId) {
        const team = newTeams[teamId];
        if (team) {
          // Move from roster to IR
          const updatedRosterPlayerIds = team.rosterPlayerIds.filter(
            (id: string) => id !== playerId
          );
          const updatedInjuredReserveIds = [...team.injuredReserveIds, playerId];
          newTeams[teamId] = {
            ...team,
            rosterPlayerIds: updatedRosterPlayerIds,
            injuredReserveIds: updatedInjuredReserveIds,
          };
          result.changes.teamsModified.push(teamId);
        }
      }

      // Update injury status to IR
      newPlayers[playerId] = {
        ...player,
        injuryStatus: {
          ...player.injuryStatus,
          severity: 'ir' as InjurySeverity,
        },
      };
      result.changes.playersModified.push(playerId);
    } catch (error) {
      result.errors.push(`Failed to place on IR: ${playerId} - ${error}`);
    }
  }

  result.gameState = {
    ...gameState,
    players: newPlayers,
    teams: newTeams,
    contracts: newContracts,
  };

  return result;
}

/**
 * Applies development changes from training camp/OTAs
 */
export function applyDevelopmentChanges(
  gameState: GameState,
  changes: Array<{
    playerId: string;
    attributeChanges: Record<string, number>;
    overallChange?: number;
  }>
): PhaseApplicationResult {
  const result = createEmptyResult(gameState);
  const newPlayers = { ...gameState.players };

  for (const change of changes) {
    try {
      const player = newPlayers[change.playerId];
      if (!player) continue;

      // Apply attribute changes to skills
      const updatedSkills = { ...player.skills };
      for (const [attr, delta] of Object.entries(change.attributeChanges)) {
        if (attr in updatedSkills) {
          const skillCategory = updatedSkills as Record<string, unknown>;
          if (typeof skillCategory[attr] === 'object' && skillCategory[attr] !== null) {
            // Handle nested skill objects (e.g., { true: number, min: number, max: number })
            const skillValue = skillCategory[attr] as Record<string, number>;
            if ('true' in skillValue) {
              skillValue.true = Math.min(99, Math.max(1, skillValue.true + delta));
            }
          }
        }
      }

      newPlayers[change.playerId] = {
        ...player,
        skills: updatedSkills,
      };
      result.changes.playersModified.push(change.playerId);
    } catch (error) {
      result.errors.push(`Failed to apply development change: ${change.playerId} - ${error}`);
    }
  }

  result.gameState = {
    ...gameState,
    players: newPlayers,
  };

  return result;
}
