/**
 * Owner Demand Generator Tests
 * Tests for generating owner demands with types, deadlines, and penalties
 */

import {
  PlayerInfo,
  CoachInfo,
  ProspectInfo,
  DemandContext,
  selectDemandType,
  generateSignPlayerDemand,
  generateFireCoachDemand,
  generateDraftPlayerDemand,
  generateTradeForDemand,
  generateOtherDemand,
  generateDemand,
  getDemandUrgency,
  getDemandDisplayInfo,
  isDemandSatisfied,
} from '../OwnerDemandGenerator';
import { TeamState } from '../InterferenceSystem';
import { createDefaultOwner, OwnerDemand } from '../../models/owner/Owner';

describe('OwnerDemandGenerator', () => {
  // Helper to create test player info
  function createTestPlayer(overrides?: Partial<PlayerInfo>): PlayerInfo {
    return {
      id: 'player-1',
      firstName: 'John',
      lastName: 'Doe',
      position: 'QB',
      overall: 80,
      age: 26,
      salary: 10000000,
      isStarter: true,
      isStar: false,
      isStruggling: false,
      isFreeAgent: true,
      ...overrides,
    };
  }

  // Helper to create test coach info
  function createTestCoach(overrides?: Partial<CoachInfo>): CoachInfo {
    return {
      id: 'coach-1',
      firstName: 'Mike',
      lastName: 'Smith',
      role: 'Offensive Coordinator',
      winPercentage: 0.45,
      yearsWithTeam: 3,
      isStruggling: false,
      ...overrides,
    };
  }

  // Helper to create test prospect info
  function createTestProspect(overrides?: Partial<ProspectInfo>): ProspectInfo {
    return {
      id: 'prospect-1',
      firstName: 'Tom',
      lastName: 'Brady',
      position: 'QB',
      projectedRound: 1,
      hypeLevel: 'star',
      ...overrides,
    };
  }

  // Helper to create test team state
  function createTestTeamState(overrides?: Partial<TeamState>): TeamState {
    return {
      currentLosingStreak: 2,
      fanApproval: 50,
      mediaScrutiny: 40,
      seasonWins: 4,
      seasonLosses: 4,
      currentWeek: 8,
      isPlayoffs: false,
      seasonExpectation: 'competitive',
      ...overrides,
    };
  }

  // Helper to create test demand context
  function createTestContext(overrides?: Partial<DemandContext>): DemandContext {
    return {
      currentWeek: 8,
      currentSeason: 2024,
      teamState: createTestTeamState(),
      availablePlayers: [createTestPlayer()],
      availableCoaches: [createTestCoach()],
      draftProspects: [createTestProspect()],
      tradeTargets: [createTestPlayer({ id: 'trade-target-1', isFreeAgent: false })],
      teamRoster: [],
      ...overrides,
    };
  }

  describe('selectDemandType', () => {
    it('should return a valid demand type', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext();

      const validTypes = ['signPlayer', 'fireCoach', 'draftPlayer', 'tradeFor', 'other'];

      for (let i = 0; i < 20; i++) {
        const type = selectDemandType(owner, null, context);
        expect(validTypes).toContain(type);
      }
    });

    it('should favor fireCoach for losing streak triggers', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.personality.traits.patience = 30;

      const context = createTestContext();
      context.availableCoaches = [createTestCoach({ isStruggling: true })];

      const trigger = {
        triggered: true,
        type: 'losingStreak' as const,
        severity: 'severe' as const,
        description: 'Losing streak',
      };

      let fireCoachCount = 0;
      for (let i = 0; i < 100; i++) {
        const type = selectDemandType(owner, trigger, context);
        if (type === 'fireCoach') fireCoachCount++;
      }

      expect(fireCoachCount).toBeGreaterThan(25);
    });

    it('should favor signPlayer when spending is high', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.personality.traits.spending = 90;

      const context = createTestContext();

      let signCount = 0;
      for (let i = 0; i < 100; i++) {
        const type = selectDemandType(owner, null, context);
        if (type === 'signPlayer') signCount++;
      }

      expect(signCount).toBeGreaterThan(20);
    });

    it('should reduce draftPlayer weight late in season', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext({ currentWeek: 18 }); // Past regular season

      let draftCount = 0;
      for (let i = 0; i < 100; i++) {
        const type = selectDemandType(owner, null, context);
        if (type === 'draftPlayer') draftCount++;
      }

      expect(draftCount).toBeLessThan(20);
    });
  });

  describe('generateSignPlayerDemand', () => {
    it('should generate demand with available free agent', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext();

      const demand = generateSignPlayerDemand(owner, context, null);

      expect(demand).not.toBeNull();
      expect(demand?.type).toBe('signPlayer');
      expect(demand?.targetId).toBe('player-1');
    });

    it('should generate generic demand when no free agents', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext({ availablePlayers: [] });

      const demand = generateSignPlayerDemand(owner, context, null);

      expect(demand).not.toBeNull();
      expect(demand?.type).toBe('signPlayer');
      expect(demand?.targetId).toBeNull();
    });

    it('should prefer stars for PR-obsessed owners', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.personality.secondaryTraits = ['prObsessed'];

      const context = createTestContext({
        availablePlayers: [
          createTestPlayer({ id: 'star', isStar: true }),
          createTestPlayer({ id: 'normal', isStar: false }),
        ],
      });

      let starCount = 0;
      for (let i = 0; i < 50; i++) {
        const demand = generateSignPlayerDemand(owner, context, null);
        if (demand?.targetId === 'star') starCount++;
      }

      expect(starCount).toBeGreaterThan(25);
    });
  });

  describe('generateFireCoachDemand', () => {
    it('should generate demand with available coach', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext();

      const demand = generateFireCoachDemand(owner, context, null);

      expect(demand).not.toBeNull();
      expect(demand?.type).toBe('fireCoach');
      expect(demand?.targetId).toBe('coach-1');
    });

    it('should return null when no coaches available', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext({ availableCoaches: [] });

      const demand = generateFireCoachDemand(owner, context, null);

      expect(demand).toBeNull();
    });

    it('should prefer struggling coaches', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext({
        availableCoaches: [
          createTestCoach({ id: 'struggling', isStruggling: true }),
          createTestCoach({ id: 'fine', isStruggling: false }),
        ],
      });

      let strugglingCount = 0;
      for (let i = 0; i < 50; i++) {
        const demand = generateFireCoachDemand(owner, context, null);
        if (demand?.targetId === 'struggling') strugglingCount++;
      }

      expect(strugglingCount).toBeGreaterThan(25);
    });
  });

  describe('generateDraftPlayerDemand', () => {
    it('should generate demand with available prospect', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext();

      const demand = generateDraftPlayerDemand(owner, context, null);

      expect(demand).not.toBeNull();
      expect(demand?.type).toBe('draftPlayer');
      expect(demand?.targetId).toBe('prospect-1');
    });

    it('should return null when no prospects', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext({ draftProspects: [] });

      const demand = generateDraftPlayerDemand(owner, context, null);

      expect(demand).toBeNull();
    });

    it('should prefer generational talents for high ego owners', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.personality.traits.ego = 90;

      const context = createTestContext({
        draftProspects: [
          createTestProspect({ id: 'generational', hypeLevel: 'generational' }),
          createTestProspect({ id: 'normal', hypeLevel: 'prospect' }),
        ],
      });

      let generationalCount = 0;
      for (let i = 0; i < 50; i++) {
        const demand = generateDraftPlayerDemand(owner, context, null);
        if (demand?.targetId === 'generational') generationalCount++;
      }

      expect(generationalCount).toBeGreaterThan(25);
    });
  });

  describe('generateTradeForDemand', () => {
    it('should generate demand with trade target', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext();

      const demand = generateTradeForDemand(owner, context, null);

      expect(demand).not.toBeNull();
      expect(demand?.type).toBe('tradeFor');
    });

    it('should generate generic demand when no targets', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext({ tradeTargets: [] });

      const demand = generateTradeForDemand(owner, context, null);

      expect(demand).not.toBeNull();
      expect(demand?.type).toBe('tradeFor');
      expect(demand?.targetId).toBeNull();
    });
  });

  describe('generateOtherDemand', () => {
    it('should generate valid other demand', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext();

      const demand = generateOtherDemand(owner, context, null);

      expect(demand.type).toBe('other');
      expect(demand.description.length).toBeGreaterThan(0);
      expect(demand.consequence.length).toBeGreaterThan(0);
    });
  });

  describe('generateDemand', () => {
    it('should generate some type of demand', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext();

      const demand = generateDemand(owner, context, null);

      expect(demand).not.toBeNull();
      expect(['signPlayer', 'fireCoach', 'draftPlayer', 'tradeFor', 'other']).toContain(
        demand?.type
      );
    });

    it('should set deadline in the future', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const context = createTestContext({ currentWeek: 5 });

      const demand = generateDemand(owner, context, null);

      expect(demand?.deadline).toBeGreaterThan(5);
    });
  });

  describe('getDemandUrgency', () => {
    it('should return relaxed for distant deadlines', () => {
      const demand: OwnerDemand = {
        id: 'd1',
        type: 'signPlayer',
        description: 'Sign',
        targetId: null,
        deadline: 10,
        consequence: 'Bad',
        issuedWeek: 3,
      };

      expect(getDemandUrgency(demand, 3)).toBe('relaxed');
    });

    it('should return soon for nearby deadlines', () => {
      const demand: OwnerDemand = {
        id: 'd1',
        type: 'signPlayer',
        description: 'Sign',
        targetId: null,
        deadline: 10,
        consequence: 'Bad',
        issuedWeek: 3,
      };

      expect(getDemandUrgency(demand, 8)).toBe('soon');
    });

    it('should return urgent for imminent deadlines', () => {
      const demand: OwnerDemand = {
        id: 'd1',
        type: 'signPlayer',
        description: 'Sign',
        targetId: null,
        deadline: 10,
        consequence: 'Bad',
        issuedWeek: 3,
      };

      expect(getDemandUrgency(demand, 9)).toBe('urgent');
    });

    it('should return critical for passed deadlines', () => {
      const demand: OwnerDemand = {
        id: 'd1',
        type: 'signPlayer',
        description: 'Sign',
        targetId: null,
        deadline: 10,
        consequence: 'Bad',
        issuedWeek: 3,
      };

      expect(getDemandUrgency(demand, 11)).toBe('critical');
    });
  });

  describe('getDemandDisplayInfo', () => {
    it('should return formatted display info', () => {
      const demand: OwnerDemand = {
        id: 'd1',
        type: 'signPlayer',
        description: 'Sign John Smith',
        targetId: 'p1',
        deadline: 10,
        consequence: 'Trust will decrease',
        issuedWeek: 5,
      };

      const info = getDemandDisplayInfo(demand, 7);

      expect(info.title).toBe('Sign John Smith');
      expect(info.weeksRemaining).toBe(3);
      expect(info.consequence).toBe('Trust will decrease');
      expect(info.urgency).toBe('Soon');
    });

    it('should show 0 weeks remaining for passed deadline', () => {
      const demand: OwnerDemand = {
        id: 'd1',
        type: 'signPlayer',
        description: 'Sign',
        targetId: null,
        deadline: 5,
        consequence: 'Bad',
        issuedWeek: 3,
      };

      const info = getDemandDisplayInfo(demand, 10);

      expect(info.weeksRemaining).toBe(0);
      expect(info.urgency).toBe('Overdue!');
    });
  });

  describe('isDemandSatisfied', () => {
    it('should return true when action matches demand', () => {
      const demand: OwnerDemand = {
        id: 'd1',
        type: 'signPlayer',
        description: 'Sign John',
        targetId: 'player-1',
        deadline: 10,
        consequence: 'Bad',
        issuedWeek: 5,
      };

      const actions = [{ type: 'signPlayer' as const, targetId: 'player-1' }];

      expect(isDemandSatisfied(demand, actions)).toBe(true);
    });

    it('should return true for generic demand when type matches', () => {
      const demand: OwnerDemand = {
        id: 'd1',
        type: 'tradeFor',
        description: 'Make a trade',
        targetId: null, // Generic
        deadline: 10,
        consequence: 'Bad',
        issuedWeek: 5,
      };

      const actions = [{ type: 'tradeFor' as const, targetId: 'any-player' }];

      expect(isDemandSatisfied(demand, actions)).toBe(true);
    });

    it('should return false when target does not match', () => {
      const demand: OwnerDemand = {
        id: 'd1',
        type: 'signPlayer',
        description: 'Sign specific player',
        targetId: 'player-1',
        deadline: 10,
        consequence: 'Bad',
        issuedWeek: 5,
      };

      const actions = [{ type: 'signPlayer' as const, targetId: 'player-2' }];

      expect(isDemandSatisfied(demand, actions)).toBe(false);
    });

    it('should return false when type does not match', () => {
      const demand: OwnerDemand = {
        id: 'd1',
        type: 'signPlayer',
        description: 'Sign',
        targetId: null,
        deadline: 10,
        consequence: 'Bad',
        issuedWeek: 5,
      };

      const actions = [{ type: 'fireCoach' as const, targetId: 'coach-1' }];

      expect(isDemandSatisfied(demand, actions)).toBe(false);
    });
  });
});
