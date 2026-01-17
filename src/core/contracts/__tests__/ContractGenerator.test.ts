/**
 * Contract Generator Tests
 */

import { Position } from '../../models/player/Position';
import { Player } from '../../models/player/Player';
import { createHealthyStatus } from '../../models/player/InjuryStatus';
import {
  determineSkillTierFromPlayer,
  calculateContractValue,
  generatePlayerContract,
  generateRosterContracts,
  calculateTotalCapUsage,
  calculateFutureCommitments,
  getTeamContracts,
  validateTeamCapUsage,
} from '../ContractGenerator';
import { getMinimumSalary } from '../Contract';
import { DEFAULT_SALARY_CAP } from '../../models/team/TeamFinances';

// Helper to create a mock player
function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    firstName: 'John',
    lastName: 'Doe',
    position: Position.QB,
    age: 27,
    experience: 5,
    physical: {
      height: 75,
      weight: 225,
      armLength: 32,
      handSize: 10,
      wingspan: 78,
      speed: 4.6,
      acceleration: 78,
      agility: 75,
      strength: 70,
      verticalJump: 32,
    },
    skills: {
      armStrength: { trueValue: 85, perceivedMin: 82, perceivedMax: 88, maturityAge: 26 },
      accuracy: { trueValue: 88, perceivedMin: 85, perceivedMax: 91, maturityAge: 27 },
      decisionMaking: { trueValue: 85, perceivedMin: 82, perceivedMax: 88, maturityAge: 28 },
      pocketPresence: { trueValue: 80, perceivedMin: 77, perceivedMax: 83, maturityAge: 27 },
      playAction: { trueValue: 78, perceivedMin: 75, perceivedMax: 81, maturityAge: 26 },
      mobility: { trueValue: 75, perceivedMin: 72, perceivedMax: 78, maturityAge: 25 },
      leadership: { trueValue: 82, perceivedMin: 79, perceivedMax: 85, maturityAge: 28 },
      presnap: { trueValue: 80, perceivedMin: 77, perceivedMax: 83, maturityAge: 27 },
    },
    hiddenTraits: {
      positive: ['clutch', 'leader'],
      negative: [],
      revealedToUser: [],
    },
    itFactor: {
      value: 80,
    },
    consistency: {
      tier: 'steady',
      currentStreak: 'neutral',
      streakGamesRemaining: 0,
    },
    schemeFits: {
      offensive: {
        westCoast: 'good',
        airRaid: 'good',
        spreadOption: 'neutral',
        powerRun: 'neutral',
        zoneRun: 'neutral',
        playAction: 'good',
      },
      defensive: {
        fourThreeUnder: 'neutral',
        threeFour: 'neutral',
        coverThree: 'neutral',
        coverTwo: 'neutral',
        manPress: 'neutral',
        blitzHeavy: 'neutral',
      },
    },
    roleFit: {
      ceiling: 'highEndStarter',
      currentRole: 'solidStarter',
      roleEffectiveness: 75,
    },
    contractId: null,
    injuryStatus: createHealthyStatus(),
    fatigue: 0,
    morale: 75,
    collegeId: 'college-1',
    draftYear: 2020,
    draftRound: 1,
    draftPick: 15,
    ...overrides,
  };
}

describe('ContractGenerator', () => {
  describe('determineSkillTierFromPlayer', () => {
    it('should return elite for franchise cornerstone players', () => {
      const player = createMockPlayer({
        roleFit: {
          ceiling: 'franchiseCornerstone',
          currentRole: 'highEndStarter',
          roleEffectiveness: 75,
        },
      });
      expect(determineSkillTierFromPlayer(player)).toBe('elite');
    });

    it('should return elite for high-end starter players', () => {
      const player = createMockPlayer({
        roleFit: { ceiling: 'highEndStarter', currentRole: 'solidStarter', roleEffectiveness: 75 },
      });
      expect(determineSkillTierFromPlayer(player)).toBe('elite');
    });

    it('should return starter for solid starter players', () => {
      const player = createMockPlayer({
        roleFit: {
          ceiling: 'solidStarter',
          currentRole: 'qualityRotational',
          roleEffectiveness: 75,
        },
      });
      expect(determineSkillTierFromPlayer(player)).toBe('starter');
    });

    it('should return backup for quality rotational players', () => {
      const player = createMockPlayer({
        roleFit: { ceiling: 'qualityRotational', currentRole: 'depth', roleEffectiveness: 75 },
      });
      expect(determineSkillTierFromPlayer(player)).toBe('backup');
    });

    it('should return fringe for depth players', () => {
      const player = createMockPlayer({
        roleFit: { ceiling: 'depth', currentRole: 'depth', roleEffectiveness: 75 },
      });
      expect(determineSkillTierFromPlayer(player)).toBe('fringe');
    });
  });

  describe('calculateContractValue', () => {
    const year = 2025;

    it('should return bonusPerYear and salaryPerYear', () => {
      const value = calculateContractValue(Position.QB, 'elite', 27, 5, year);
      expect(value.bonusPerYear).toBeDefined();
      expect(value.salaryPerYear).toBeDefined();
      expect(value.years).toBeGreaterThanOrEqual(1);
    });

    it('should calculate higher bonus for elite players', () => {
      const eliteValue = calculateContractValue(Position.QB, 'elite', 27, 5, year);
      const fringeValue = calculateContractValue(Position.QB, 'fringe', 27, 5, year);

      // Elite players get higher guaranteed bonus
      expect(eliteValue.bonusPerYear).toBeGreaterThan(fringeValue.bonusPerYear);
    });

    it('should have total comp (bonus + salary) above minimum', () => {
      const value = calculateContractValue(Position.P, 'fringe', 30, 8, year);
      const minSalary = getMinimumSalary(8);
      const totalComp = value.bonusPerYear + value.salaryPerYear;
      expect(totalComp).toBeGreaterThanOrEqual(minSalary);
    });

    it('should reduce value for older players', () => {
      const youngValue = calculateContractValue(Position.RB, 'starter', 24, 2, year);
      const oldValue = calculateContractValue(Position.RB, 'starter', 32, 10, year);
      const youngTotal = youngValue.bonusPerYear + youngValue.salaryPerYear;
      const oldTotal = oldValue.bonusPerYear + oldValue.salaryPerYear;
      expect(youngTotal).toBeGreaterThan(oldTotal);
    });

    it('should give shorter contracts to older players', () => {
      const youngValue = calculateContractValue(Position.WR, 'elite', 25, 3, year);
      const oldValue = calculateContractValue(Position.WR, 'elite', 33, 11, year);
      expect(youngValue.years).toBeGreaterThanOrEqual(oldValue.years);
    });
  });

  describe('generatePlayerContract', () => {
    const year = 2025;

    it('should create a valid contract for a player', () => {
      const player = createMockPlayer();
      const contract = generatePlayerContract(player, 'team-1', year);

      expect(contract.playerId).toBe(player.id);
      expect(contract.teamId).toBe('team-1');
      expect(contract.position).toBe(player.position);
      expect(contract.status).toBe('active');
      expect(contract.totalYears).toBeGreaterThanOrEqual(1);
      expect(contract.yearsRemaining).toBe(contract.totalYears);
      expect(contract.totalValue).toBeGreaterThan(0);
      expect(contract.yearlyBreakdown.length).toBe(contract.totalYears);
    });

    it('should create yearly breakdown with bonus and salary', () => {
      const player = createMockPlayer();
      const contract = generatePlayerContract(player, 'team-1', year);

      for (const yearData of contract.yearlyBreakdown) {
        expect(yearData.bonus).toBeDefined();
        expect(yearData.salary).toBeDefined();
        expect(yearData.capHit).toBe(yearData.bonus + yearData.salary);
      }
    });

    it('should set rookie contract type for young drafted players', () => {
      const player = createMockPlayer({
        experience: 2,
        draftRound: 1,
      });
      const contract = generatePlayerContract(player, 'team-1', year);
      expect(contract.type).toBe('rookie');
    });

    it('should set veteran contract type for experienced players', () => {
      const player = createMockPlayer({
        experience: 6,
        draftRound: 3,
      });
      const contract = generatePlayerContract(player, 'team-1', year);
      expect(contract.type).toBe('veteran');
    });

    it('should have guaranteedMoney equal to total bonus across years', () => {
      const player = createMockPlayer();
      const contract = generatePlayerContract(player, 'team-1', year);

      const totalBonus = contract.yearlyBreakdown.reduce((sum, y) => sum + y.bonus, 0);
      expect(contract.guaranteedMoney).toBe(totalBonus);
    });

    it('should create yearly breakdown with correct years', () => {
      const player = createMockPlayer();
      const contract = generatePlayerContract(player, 'team-1', year);

      for (let i = 0; i < contract.yearlyBreakdown.length; i++) {
        expect(contract.yearlyBreakdown[i].year).toBe(year + i);
      }
    });
  });

  describe('generateRosterContracts', () => {
    it('should generate contracts for all players', () => {
      const players = [
        createMockPlayer({ id: 'player-1' }),
        createMockPlayer({ id: 'player-2', position: Position.WR }),
        createMockPlayer({ id: 'player-3', position: Position.CB }),
      ];

      const { contracts, updatedPlayers } = generateRosterContracts(players, 'team-1', 2025);

      expect(Object.keys(contracts).length).toBe(3);
      expect(updatedPlayers.length).toBe(3);

      // All players should have contract IDs
      for (const player of updatedPlayers) {
        expect(player.contractId).not.toBeNull();
      }
    });

    it('should link players to their contracts', () => {
      const players = [createMockPlayer({ id: 'player-1' })];
      const { contracts, updatedPlayers } = generateRosterContracts(players, 'team-1', 2025);

      const player = updatedPlayers[0];
      expect(player.contractId).not.toBeNull();

      const contract = contracts[player.contractId!];
      expect(contract).toBeDefined();
      expect(contract.playerId).toBe(player.id);
    });
  });

  describe('calculateTotalCapUsage', () => {
    it('should sum cap hits for the current year', () => {
      const player1 = createMockPlayer({ id: 'player-1' });
      const player2 = createMockPlayer({ id: 'player-2', position: Position.DE });

      const { contracts } = generateRosterContracts([player1, player2], 'team-1', 2025);
      const capUsage = calculateTotalCapUsage(contracts, 2025);

      // Sum of first year cap hits
      const expectedCap = Object.values(contracts).reduce((sum, c) => {
        const yearData = c.yearlyBreakdown.find((y) => y.year === 2025);
        return sum + (yearData?.capHit || 0);
      }, 0);

      expect(capUsage).toBe(expectedCap);
    });
  });

  describe('calculateFutureCommitments', () => {
    it('should calculate future year commitments', () => {
      const player = createMockPlayer({
        roleFit: {
          ceiling: 'franchiseCornerstone',
          currentRole: 'highEndStarter',
          roleEffectiveness: 75,
        },
      });

      const { contracts } = generateRosterContracts([player], 'team-1', 2025);
      const commitments = calculateFutureCommitments(contracts, 2025);

      // Elite player should have multi-year deal
      const contract = Object.values(contracts)[0];
      if (contract.totalYears > 1) {
        expect(commitments.nextYear).toBeGreaterThan(0);
      }
    });
  });

  describe('getTeamContracts', () => {
    it('should return only contracts for the specified team', () => {
      const player1 = createMockPlayer({ id: 'player-1' });
      const player2 = createMockPlayer({ id: 'player-2' });

      const { contracts: team1Contracts } = generateRosterContracts([player1], 'team-1', 2025);
      const { contracts: team2Contracts } = generateRosterContracts([player2], 'team-2', 2025);

      const allContracts = { ...team1Contracts, ...team2Contracts };
      const team1Only = getTeamContracts(allContracts, 'team-1');

      expect(team1Only.length).toBe(1);
      expect(team1Only[0].teamId).toBe('team-1');
    });
  });

  describe('validateTeamCapUsage', () => {
    it('should validate team is under cap', () => {
      const player = createMockPlayer();
      const { contracts } = generateRosterContracts([player], 'team-1', 2025);

      const result = validateTeamCapUsage(contracts, 'team-1', 2025, DEFAULT_SALARY_CAP);
      expect(result.isValid).toBe(true);
      expect(result.capSpace).toBeGreaterThan(0);
      expect(result.overBy).toBe(0);
    });

    it('should detect when team is over cap', () => {
      const player = createMockPlayer();
      const { contracts } = generateRosterContracts([player], 'team-1', 2025);

      // Use a very low cap to force over
      const result = validateTeamCapUsage(contracts, 'team-1', 2025, 100);
      expect(result.isValid).toBe(false);
      expect(result.overBy).toBeGreaterThan(0);
    });
  });

  describe('Position-based contract values', () => {
    const year = 2025;

    it('should give QBs higher values than RBs at same tier', () => {
      const qbValue = calculateContractValue(Position.QB, 'elite', 27, 5, year);
      const rbValue = calculateContractValue(Position.RB, 'elite', 27, 5, year);
      const qbTotal = qbValue.bonusPerYear + qbValue.salaryPerYear;
      const rbTotal = rbValue.bonusPerYear + rbValue.salaryPerYear;
      expect(qbTotal).toBeGreaterThan(rbTotal);
    });

    it('should give pass rushers higher values than interior linemen', () => {
      const deValue = calculateContractValue(Position.DE, 'starter', 27, 5, year);
      const rgValue = calculateContractValue(Position.RG, 'starter', 27, 5, year);
      const deTotal = deValue.bonusPerYear + deValue.salaryPerYear;
      const rgTotal = rgValue.bonusPerYear + rgValue.salaryPerYear;
      expect(deTotal).toBeGreaterThan(rgTotal);
    });

    it('should give left tackles higher values than right tackles', () => {
      const ltValue = calculateContractValue(Position.LT, 'elite', 27, 5, year);
      const rtValue = calculateContractValue(Position.RT, 'elite', 27, 5, year);
      const ltTotal = ltValue.bonusPerYear + ltValue.salaryPerYear;
      const rtTotal = rtValue.bonusPerYear + rtValue.salaryPerYear;
      expect(ltTotal).toBeGreaterThan(rtTotal);
    });
  });

  describe('Bonus/Salary split', () => {
    const year = 2025;

    it('should have higher bonus percentage for elite players', () => {
      const eliteValue = calculateContractValue(Position.QB, 'elite', 27, 5, year);
      const fringeValue = calculateContractValue(Position.QB, 'fringe', 27, 5, year);

      const eliteTotal = eliteValue.bonusPerYear + eliteValue.salaryPerYear;
      const fringeTotal = fringeValue.bonusPerYear + fringeValue.salaryPerYear;

      const eliteBonusPct = eliteValue.bonusPerYear / eliteTotal;
      const fringeBonusPct = fringeValue.bonusPerYear / fringeTotal;

      // Elite players should have higher percentage of their money guaranteed
      expect(eliteBonusPct).toBeGreaterThan(fringeBonusPct);
    });
  });
});
