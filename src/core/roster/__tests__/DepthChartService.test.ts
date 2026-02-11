/**
 * DepthChartService Tests
 * Tests for the realistic depth chart system
 */

import {
  DepthChartSlot,
  SLOT_INFO,
  canFillSlot,
  getSlotsByCategory,
  getRequiredSlots,
  getSpecialistSlots,
} from '../DepthChartSlots';
import {
  OffensivePersonnel,
  DefensivePackage,
  OFFENSIVE_PACKAGES,
  DEFENSIVE_PACKAGES,
  getSituationalDefensivePackage,
} from '../FormationPackages';
import {
  createEmptyDepthChart,
  generateDepthChart,
  assignPlayerToSlot,
  removePlayerFromDepthChart,
  swapPlayers,
  getPlayerForSlot,
  getPlayerDepthStatus,
  getStarters,
  validateDepthChart,
  calculatePlayerRating,
  getPositionFlexibilityRating,
  selectStartingLineupFromDepthChart,
} from '../DepthChartService';
import { Position } from '../../models/player/Position';
import { Player } from '../../models/player/Player';
import { GameState } from '../../models/game/GameState';
import { Team } from '../../models/team/Team';

// ============================================
// TEST DATA HELPERS
// ============================================

function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: `player-${Math.random().toString(36).slice(2)}`,
    firstName: 'Test',
    lastName: 'Player',
    position: Position.QB,
    age: 25,
    experience: 3,
    physical: {
      height: 74,
      weight: 215,
      armLength: 33,
      handSize: 10,
      wingspan: 78,
      speed: 4.6,
      acceleration: 70,
      agility: 70,
      strength: 65,
      verticalJump: 34,
    },
    skills: {
      armStrength: { true: 75, perceivedMin: 70, perceivedMax: 80, scouted: true },
      accuracy: { true: 80, perceivedMin: 75, perceivedMax: 85, scouted: true },
      decisionMaking: { true: 78, perceivedMin: 73, perceivedMax: 83, scouted: true },
      pocketPresence: { true: 72, perceivedMin: 67, perceivedMax: 77, scouted: true },
      mobility: { true: 68, perceivedMin: 63, perceivedMax: 73, scouted: true },
    },
    hiddenTraits: { positive: [], negative: [], revealedToUser: [] },
    itFactor: { value: 60 },
    consistency: { tier: 'average', currentStreak: 'neutral', streakGamesRemaining: 0 },
    schemeFits: {
      offensive: {
        westCoast: 'neutral',
        airRaid: 'neutral',
        spreadOption: 'neutral',
        powerRun: 'neutral',
        zoneRun: 'neutral',
        playAction: 'neutral',
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
    roleFit: { ceiling: 'solidStarter', currentRole: 'solidStarter', roleEffectiveness: 75 },
    contractId: null,
    injuryStatus: {
      severity: 'none',
      type: 'none',
      weeksRemaining: 0,
      isPublic: true,
      lingeringEffect: 0,
    },
    fatigue: 0,
    morale: 75,
    collegeId: 'test-college',
    draftYear: 2020,
    draftRound: 1,
    draftPick: 15,
    ...overrides,
  } as Player;
}

function createMockTeam(playerIds: string[]): Team {
  return {
    id: 'test-team',
    city: 'Test',
    name: 'Team',
    nickname: 'Testers',
    abbreviation: 'TST',
    conference: 'AFC',
    division: 'North',
    stadium: {
      name: 'Test Stadium',
      type: 'outdoor',
      latitude: 40,
      longitude: -75,
      altitude: 100,
      grassType: 'natural',
      primaryColor: '#FF0000',
      secondaryColor: '#FFFFFF',
    },
    rosterPlayerIds: playerIds,
    practiceSquadIds: [],
    injuredReserveIds: [],
    headCoachId: null,
    offensiveCoordinatorId: null,
    defensiveCoordinatorId: null,
    specialTeamsCoordinatorId: null,
    scoutIds: [],
    ownerId: null,
    gmId: null,
    staffHierarchy: { headCoach: null, coordinators: [], positionCoaches: [] },
    currentRecord: { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 },
    finances: {
      salaryCap: 200000000,
      currentSalary: 0,
      deadMoney: 0,
      capSpace: 200000000,
      projectedCapNextYear: 210000000,
    },
    wins: 0,
    losses: 0,
    ties: 0,
    draftPicks: [],
    fanSupport: 75,
    reputation: 75,
    primaryColor: '#FF0000',
    secondaryColor: '#FFFFFF',
    tradeHistory: [],
    seasonHistory: [],
    playoffAppearances: 0,
    championshipWins: 0,
    divisionTitles: 0,
  } as unknown as Team;
}

function createMockGameState(players: Player[], team: Team): GameState {
  const playersMap: Record<string, Player> = {};
  for (const player of players) {
    playersMap[player.id] = player;
  }

  return {
    saveSlot: 1,
    createdAt: Date.now(),
    lastSavedAt: Date.now(),
    userName: 'Test User',
    userTeamId: team.id,
    players: playersMap,
    teams: { [team.id]: team },
    coaches: {},
    scouts: {},
    owners: {},
    contracts: {},
    draftProspects: {},
    draftResults: {},
    league: {
      currentYear: 2024,
      currentWeek: 1,
      currentPhase: 'regularSeason',
      regularSeasonGames: [],
      playoffSchedule: {
        wildCard: [],
        divisional: [],
        conference: [],
        superBowl: null,
      },
      standings: {},
    },
    newsItems: [],
    settings: {},
    gameHistory: [],
  } as unknown as GameState;
}

// ============================================
// DEPTH CHART SLOTS TESTS
// ============================================

describe('DepthChartSlots', () => {
  describe('SLOT_INFO', () => {
    it('should have info for all slots', () => {
      const allSlots = Object.values(DepthChartSlot);
      for (const slot of allSlots) {
        expect(SLOT_INFO[slot]).toBeDefined();
        expect(SLOT_INFO[slot].displayName).toBeTruthy();
        expect(SLOT_INFO[slot].shortName).toBeTruthy();
      }
    });

    it('should categorize slots correctly', () => {
      expect(SLOT_INFO[DepthChartSlot.QB1].category).toBe('offense');
      expect(SLOT_INFO[DepthChartSlot.CB1].category).toBe('defense');
      expect(SLOT_INFO[DepthChartSlot.K1].category).toBe('specialTeams');
    });

    it('should mark required slots appropriately', () => {
      expect(SLOT_INFO[DepthChartSlot.QB1].isRequired).toBe(true);
      expect(SLOT_INFO[DepthChartSlot.QB3].isRequired).toBe(false);
    });

    it('should mark specialist slots appropriately', () => {
      expect(SLOT_INFO[DepthChartSlot.SLOT_WR].isSpecialist).toBe(true);
      expect(SLOT_INFO[DepthChartSlot.THIRD_DOWN_RB].isSpecialist).toBe(true);
      expect(SLOT_INFO[DepthChartSlot.QB1].isSpecialist).toBe(false);
    });
  });

  describe('canFillSlot', () => {
    it('should allow QB to fill QB slots', () => {
      expect(canFillSlot(Position.QB, DepthChartSlot.QB1)).toBe(true);
      expect(canFillSlot(Position.QB, DepthChartSlot.QB2)).toBe(true);
    });

    it('should not allow QB to fill WR slots', () => {
      expect(canFillSlot(Position.QB, DepthChartSlot.WR1)).toBe(false);
    });

    it('should allow OL flexibility', () => {
      expect(canFillSlot(Position.LT, DepthChartSlot.LT1)).toBe(true);
      expect(canFillSlot(Position.LG, DepthChartSlot.LT1)).toBe(true); // Guard can play tackle
    });

    it('should allow WR to fill returner slots', () => {
      expect(canFillSlot(Position.WR, DepthChartSlot.KR1)).toBe(true);
      expect(canFillSlot(Position.WR, DepthChartSlot.PR1)).toBe(true);
    });
  });

  describe('getSlotsByCategory', () => {
    it('should return offense slots', () => {
      const offenseSlots = getSlotsByCategory('offense');
      expect(offenseSlots).toContain(DepthChartSlot.QB1);
      expect(offenseSlots).toContain(DepthChartSlot.WR1);
      expect(offenseSlots).not.toContain(DepthChartSlot.CB1);
    });

    it('should return defense slots', () => {
      const defenseSlots = getSlotsByCategory('defense');
      expect(defenseSlots).toContain(DepthChartSlot.CB1);
      expect(defenseSlots).toContain(DepthChartSlot.LE1);
      expect(defenseSlots).not.toContain(DepthChartSlot.QB1);
    });
  });

  describe('getRequiredSlots', () => {
    it('should return required starter slots', () => {
      const required = getRequiredSlots();
      expect(required).toContain(DepthChartSlot.QB1);
      expect(required).toContain(DepthChartSlot.WR1);
      expect(required).toContain(DepthChartSlot.CB1);
      expect(required).not.toContain(DepthChartSlot.QB3);
    });
  });

  describe('getSpecialistSlots', () => {
    it('should return specialist slots', () => {
      const specialists = getSpecialistSlots();
      expect(specialists).toContain(DepthChartSlot.SLOT_WR);
      expect(specialists).toContain(DepthChartSlot.SLOT_CB);
      expect(specialists).toContain(DepthChartSlot.THIRD_DOWN_RB);
      expect(specialists).not.toContain(DepthChartSlot.QB1);
    });
  });
});

// ============================================
// FORMATION PACKAGES TESTS
// ============================================

describe('FormationPackages', () => {
  describe('OFFENSIVE_PACKAGES', () => {
    it('should have 11 personnel as base', () => {
      const pkg = OFFENSIVE_PACKAGES[OffensivePersonnel.ELEVEN];
      expect(pkg.isBase).toBe(true);
      expect(pkg.slots.length).toBe(11);
    });

    it('should have correct slots for 11 personnel', () => {
      const pkg = OFFENSIVE_PACKAGES[OffensivePersonnel.ELEVEN];
      expect(pkg.slots).toContain(DepthChartSlot.QB1);
      expect(pkg.slots).toContain(DepthChartSlot.RB1);
      expect(pkg.slots).toContain(DepthChartSlot.WR1);
      expect(pkg.slots).toContain(DepthChartSlot.WR2);
      expect(pkg.slots).toContain(DepthChartSlot.SLOT_WR);
      expect(pkg.slots).toContain(DepthChartSlot.TE1);
    });
  });

  describe('DEFENSIVE_PACKAGES', () => {
    it('should have nickel as most common', () => {
      const nickel = DEFENSIVE_PACKAGES[DefensivePackage.NICKEL];
      expect(nickel.usagePercent).toBeGreaterThan(
        DEFENSIVE_PACKAGES[DefensivePackage.BASE_43].usagePercent
      );
    });

    it('should have correct slots for nickel package', () => {
      const pkg = DEFENSIVE_PACKAGES[DefensivePackage.NICKEL];
      expect(pkg.slots).toContain(DepthChartSlot.SLOT_CB); // Nickel corner
      expect(pkg.slots).toContain(DepthChartSlot.SUB_LB); // Coverage LB
    });
  });

  describe('getSituationalDefensivePackage', () => {
    it('should return goal line for short yardage', () => {
      expect(getSituationalDefensivePackage(1, 1, 2)).toBe(DefensivePackage.GOAL_LINE);
    });

    it('should return dime for 3rd and long', () => {
      expect(getSituationalDefensivePackage(3, 12, 50)).toBe(DefensivePackage.DIME);
    });

    it('should return nickel for standard passing downs', () => {
      expect(getSituationalDefensivePackage(3, 5, 50)).toBe(DefensivePackage.NICKEL);
    });
  });
});

// ============================================
// DEPTH CHART SERVICE TESTS
// ============================================

describe('DepthChartService', () => {
  describe('createEmptyDepthChart', () => {
    it('should create empty depth chart with version 2', () => {
      const dc = createEmptyDepthChart('test-team');
      expect(dc.teamId).toBe('test-team');
      expect(dc.version).toBe(2);
      expect(dc.assignments).toHaveLength(0);
      expect(dc.formationOverrides).toHaveLength(0);
      expect(dc.autoGenerated).toBe(false);
    });
  });

  describe('calculatePlayerRating', () => {
    it('should calculate rating from skills', () => {
      const player = createMockPlayer();
      const rating = calculatePlayerRating(player);
      expect(rating).toBeGreaterThan(0);
      expect(rating).toBeLessThanOrEqual(100);
    });
  });

  describe('getPositionFlexibilityRating', () => {
    it('should return 100 for natural position', () => {
      expect(getPositionFlexibilityRating(Position.QB, Position.QB)).toBe(100);
      expect(getPositionFlexibilityRating(Position.WR, Position.WR)).toBe(100);
    });

    it('should return reduced rating for OL flexibility', () => {
      const rating = getPositionFlexibilityRating(Position.LG, Position.LT);
      expect(rating).toBeGreaterThan(0);
      expect(rating).toBeLessThan(100);
    });

    it('should return 0 for incompatible positions', () => {
      expect(getPositionFlexibilityRating(Position.QB, Position.CB)).toBe(0);
    });
  });

  describe('generateDepthChart', () => {
    it('should generate depth chart from roster', () => {
      const qb = createMockPlayer({ id: 'qb1', position: Position.QB });
      const rb = createMockPlayer({ id: 'rb1', position: Position.RB });
      const wr1 = createMockPlayer({ id: 'wr1', position: Position.WR });

      const team = createMockTeam([qb.id, rb.id, wr1.id]);
      const gameState = createMockGameState([qb, rb, wr1], team);

      const result = generateDepthChart(gameState, team.id);

      expect(result.depthChart).toBeDefined();
      expect(result.depthChart.teamId).toBe(team.id);
      expect(result.depthChart.autoGenerated).toBe(true);
      expect(result.assignmentsChanged).toBeGreaterThan(0);
    });
  });

  describe('assignPlayerToSlot', () => {
    it('should assign player to slot', () => {
      const dc = createEmptyDepthChart('test-team');
      const updated = assignPlayerToSlot(dc, 'player-1', DepthChartSlot.QB1, Position.QB);

      expect(updated.assignments.length).toBe(1);
      expect(updated.assignments[0].slot).toBe(DepthChartSlot.QB1);
      expect(updated.assignments[0].playerId).toBe('player-1');
      expect(updated.autoGenerated).toBe(false);
    });

    it('should remove player from previous slot when moving', () => {
      let dc = createEmptyDepthChart('test-team');
      dc = assignPlayerToSlot(dc, 'player-1', DepthChartSlot.QB1, Position.QB);
      dc = assignPlayerToSlot(dc, 'player-1', DepthChartSlot.QB2, Position.QB);

      expect(dc.assignments.length).toBe(1);
      expect(dc.assignments[0].slot).toBe(DepthChartSlot.QB2);
    });
  });

  describe('removePlayerFromDepthChart', () => {
    it('should remove player from depth chart', () => {
      let dc = createEmptyDepthChart('test-team');
      dc = assignPlayerToSlot(dc, 'player-1', DepthChartSlot.QB1, Position.QB);
      dc = removePlayerFromDepthChart(dc, 'player-1');

      expect(dc.assignments.length).toBe(0);
    });
  });

  describe('swapPlayers', () => {
    it('should swap two players', () => {
      let dc = createEmptyDepthChart('test-team');
      dc = assignPlayerToSlot(dc, 'player-1', DepthChartSlot.QB1, Position.QB);
      dc = assignPlayerToSlot(dc, 'player-2', DepthChartSlot.QB2, Position.QB);

      dc = swapPlayers(dc, 'player-1', 'player-2');

      const qb1Assignment = dc.assignments.find((a) => a.slot === DepthChartSlot.QB1);
      const qb2Assignment = dc.assignments.find((a) => a.slot === DepthChartSlot.QB2);

      expect(qb1Assignment?.playerId).toBe('player-2');
      expect(qb2Assignment?.playerId).toBe('player-1');
    });
  });

  describe('getPlayerForSlot', () => {
    it('should return player ID for slot', () => {
      let dc = createEmptyDepthChart('test-team');
      dc = assignPlayerToSlot(dc, 'player-1', DepthChartSlot.QB1, Position.QB);

      expect(getPlayerForSlot(dc, DepthChartSlot.QB1)).toBe('player-1');
      expect(getPlayerForSlot(dc, DepthChartSlot.QB2)).toBeNull();
    });
  });

  describe('getPlayerDepthStatus', () => {
    it('should return depth status for player', () => {
      let dc = createEmptyDepthChart('test-team');
      dc = assignPlayerToSlot(dc, 'player-1', DepthChartSlot.QB1, Position.QB);

      const status = getPlayerDepthStatus(dc, 'player-1');

      expect(status.playerId).toBe('player-1');
      expect(status.primarySlot).toBe(DepthChartSlot.QB1);
      expect(status.isStarter).toBe(true);
      expect(status.isOnDepthChart).toBe(true);
    });

    it('should return not on depth chart for unassigned player', () => {
      const dc = createEmptyDepthChart('test-team');
      const status = getPlayerDepthStatus(dc, 'player-1');

      expect(status.isOnDepthChart).toBe(false);
      expect(status.primarySlot).toBeNull();
    });
  });

  describe('getStarters', () => {
    it('should return only starter slots', () => {
      let dc = createEmptyDepthChart('test-team');
      dc = assignPlayerToSlot(dc, 'player-1', DepthChartSlot.QB1, Position.QB);
      dc = assignPlayerToSlot(dc, 'player-2', DepthChartSlot.QB2, Position.QB);

      const starters = getStarters(dc);

      expect(starters.length).toBe(1);
      expect(starters[0].playerId).toBe('player-1');
    });
  });

  describe('validateDepthChart', () => {
    it('should detect missing required slots', () => {
      const dc = createEmptyDepthChart('test-team');
      const team = createMockTeam([]);
      const gameState = createMockGameState([], team);

      const validation = validateDepthChart(gameState, dc);

      expect(validation.isValid).toBe(false);
      expect(validation.missingRequiredSlots.length).toBeGreaterThan(0);
    });
  });

  describe('selectStartingLineupFromDepthChart', () => {
    it('should select lineup with fallback for injured players', () => {
      const qb1 = createMockPlayer({ id: 'qb1', position: Position.QB });
      const qb2 = createMockPlayer({ id: 'qb2', position: Position.QB });

      let dc = createEmptyDepthChart('test-team');
      dc = assignPlayerToSlot(dc, 'qb1', DepthChartSlot.QB1, Position.QB);
      dc = assignPlayerToSlot(dc, 'qb2', DepthChartSlot.QB2, Position.QB);

      const team = createMockTeam([qb1.id, qb2.id]);
      const gameState = createMockGameState([qb1, qb2], team);

      // Without injuries
      const lineup1 = selectStartingLineupFromDepthChart(gameState, dc);
      expect(lineup1.offense.qb).toBe('qb1');

      // With QB1 injured
      const lineup2 = selectStartingLineupFromDepthChart(gameState, dc, ['qb1']);
      expect(lineup2.offense.qb).toBe('qb2');
    });
  });
});
