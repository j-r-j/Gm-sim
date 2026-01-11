/**
 * Interference System Tests
 * Tests for owner intervention detection and compliance tracking
 */

import {
  TeamState,
  createInterferenceState,
  detectLosingStreakIntervention,
  detectFanApprovalIntervention,
  detectMediaScrutinyIntervention,
  detectSeasonPerformanceIntervention,
  detectAllInterventions,
  getMostSevereTrigger,
  recordCompliance,
  recordDefiance,
  trackNewDemand,
  calculateComplianceConsequence,
  calculateDefianceConsequence,
  checkExpiredDemands,
  applyInterferenceConsequence,
  getComplianceRate,
  getComplianceDescription,
  shouldGenerateDemand,
} from '../InterferenceSystem';
import { createDefaultOwner, OwnerDemand } from '../../models/owner/Owner';

describe('InterferenceSystem', () => {
  // Helper to create test team state
  function createTestTeamState(overrides?: Partial<TeamState>): TeamState {
    return {
      currentLosingStreak: 0,
      fanApproval: 60,
      mediaScrutiny: 30,
      seasonWins: 4,
      seasonLosses: 4,
      currentWeek: 8,
      isPlayoffs: false,
      seasonExpectation: 'competitive',
      ...overrides,
    };
  }

  // Helper to create test owner
  function createTestOwner(overrides?: Partial<ReturnType<typeof createDefaultOwner>>) {
    const owner = createDefaultOwner('owner-1', 'team-1');
    return { ...owner, ...overrides };
  }

  describe('createInterferenceState', () => {
    it('should create initial state with empty history', () => {
      const state = createInterferenceState('team-1');

      expect(state.teamId).toBe('team-1');
      expect(state.complianceHistory).toHaveLength(0);
      expect(state.totalDefiances).toBe(0);
      expect(state.totalCompliances).toBe(0);
      expect(state.consecutiveDefiances).toBe(0);
      expect(state.lastInterventionWeek).toBeNull();
    });
  });

  describe('detectLosingStreakIntervention', () => {
    it('should not trigger for short losing streaks', () => {
      const owner = createTestOwner();
      owner.personality.interventionTriggers.losingStreakLength = 4;

      const teamState = createTestTeamState({ currentLosingStreak: 2 });
      const result = detectLosingStreakIntervention(owner, teamState);

      expect(result.triggered).toBe(false);
    });

    it('should trigger when losing streak hits threshold', () => {
      const owner = createTestOwner();
      owner.personality.interventionTriggers.losingStreakLength = 4;

      const teamState = createTestTeamState({ currentLosingStreak: 4 });
      const result = detectLosingStreakIntervention(owner, teamState);

      expect(result.triggered).toBe(true);
      expect(result.type).toBe('losingStreak');
      expect(result.severity).toBe('mild');
    });

    it('should increase severity for longer streaks', () => {
      const owner = createTestOwner();
      owner.personality.interventionTriggers.losingStreakLength = 4;

      const teamState = createTestTeamState({ currentLosingStreak: 8 });
      const result = detectLosingStreakIntervention(owner, teamState);

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe('severe');
    });
  });

  describe('detectFanApprovalIntervention', () => {
    it('should not trigger when fan approval is above threshold', () => {
      const owner = createTestOwner();
      owner.personality.interventionTriggers.fanApprovalFloor = 40;

      const teamState = createTestTeamState({ fanApproval: 60 });
      const result = detectFanApprovalIntervention(owner, teamState);

      expect(result.triggered).toBe(false);
    });

    it('should trigger when fan approval is below threshold', () => {
      const owner = createTestOwner();
      owner.personality.interventionTriggers.fanApprovalFloor = 40;

      const teamState = createTestTeamState({ fanApproval: 35 });
      const result = detectFanApprovalIntervention(owner, teamState);

      expect(result.triggered).toBe(true);
      expect(result.type).toBe('fanApproval');
    });

    it('should increase severity for much lower approval', () => {
      const owner = createTestOwner();
      owner.personality.interventionTriggers.fanApprovalFloor = 50;

      const teamState = createTestTeamState({ fanApproval: 25 });
      const result = detectFanApprovalIntervention(owner, teamState);

      expect(result.triggered).toBe(true);
      expect(result.severity).toBe('severe');
    });
  });

  describe('detectMediaScrutinyIntervention', () => {
    it('should not trigger when media scrutiny is below threshold', () => {
      const owner = createTestOwner();
      owner.personality.interventionTriggers.mediaScrutinyThreshold = 60;

      const teamState = createTestTeamState({ mediaScrutiny: 40 });
      const result = detectMediaScrutinyIntervention(owner, teamState);

      expect(result.triggered).toBe(false);
    });

    it('should trigger when media scrutiny exceeds threshold', () => {
      const owner = createTestOwner();
      owner.personality.interventionTriggers.mediaScrutinyThreshold = 50;

      const teamState = createTestTeamState({ mediaScrutiny: 60 });
      const result = detectMediaScrutinyIntervention(owner, teamState);

      expect(result.triggered).toBe(true);
      expect(result.type).toBe('mediaScrutiny');
    });
  });

  describe('detectSeasonPerformanceIntervention', () => {
    it('should not trigger early in season', () => {
      const owner = createTestOwner();
      const teamState = createTestTeamState({ currentWeek: 5, seasonWins: 1, seasonLosses: 4 });

      const result = detectSeasonPerformanceIntervention(owner, teamState);
      expect(result.triggered).toBe(false);
    });

    it('should trigger for significant underperformance mid-season', () => {
      const owner = createTestOwner();
      owner.personality.traits.patience = 30; // Impatient

      const teamState = createTestTeamState({
        currentWeek: 10,
        seasonWins: 2,
        seasonLosses: 8,
        seasonExpectation: 'contender',
      });

      const result = detectSeasonPerformanceIntervention(owner, teamState);
      expect(result.triggered).toBe(true);
      expect(result.type).toBe('seasonPerformance');
    });

    it('should not trigger when meeting expectations', () => {
      const owner = createTestOwner();
      const teamState = createTestTeamState({
        currentWeek: 10,
        seasonWins: 5,
        seasonLosses: 5,
        seasonExpectation: 'competitive',
      });

      const result = detectSeasonPerformanceIntervention(owner, teamState);
      expect(result.triggered).toBe(false);
    });
  });

  describe('detectAllInterventions', () => {
    it('should return all triggered interventions', () => {
      const owner = createTestOwner();
      owner.personality.interventionTriggers.losingStreakLength = 3;
      owner.personality.interventionTriggers.fanApprovalFloor = 50;

      const teamState = createTestTeamState({
        currentLosingStreak: 4,
        fanApproval: 40,
      });

      const state = createInterferenceState('team-1');
      const triggers = detectAllInterventions(owner, teamState, state);

      expect(triggers.length).toBeGreaterThanOrEqual(2);
      expect(triggers.some((t) => t.type === 'losingStreak')).toBe(true);
      expect(triggers.some((t) => t.type === 'fanApproval')).toBe(true);
    });

    it('should return empty array when no triggers', () => {
      const owner = createTestOwner();
      const teamState = createTestTeamState();
      const state = createInterferenceState('team-1');

      const triggers = detectAllInterventions(owner, teamState, state);
      expect(triggers.length).toBe(0);
    });
  });

  describe('getMostSevereTrigger', () => {
    it('should return null for empty array', () => {
      const result = getMostSevereTrigger([]);
      expect(result).toBeNull();
    });

    it('should return the most severe trigger', () => {
      const triggers = [
        {
          triggered: true,
          type: 'losingStreak' as const,
          severity: 'mild' as const,
          description: 'a',
        },
        {
          triggered: true,
          type: 'fanApproval' as const,
          severity: 'severe' as const,
          description: 'b',
        },
        {
          triggered: true,
          type: 'mediaScrutiny' as const,
          severity: 'moderate' as const,
          description: 'c',
        },
      ];

      const result = getMostSevereTrigger(triggers);
      expect(result?.severity).toBe('severe');
      expect(result?.type).toBe('fanApproval');
    });
  });

  describe('recordCompliance', () => {
    it('should increment compliance count', () => {
      let state = createInterferenceState('team-1');
      state = recordCompliance(state, 'demand-1', 5);

      expect(state.totalCompliances).toBe(1);
      expect(state.consecutiveDefiances).toBe(0);
    });

    it('should reset consecutive defiances', () => {
      let state = createInterferenceState('team-1');
      state = { ...state, consecutiveDefiances: 3 };
      state = recordCompliance(state, 'demand-1', 5);

      expect(state.consecutiveDefiances).toBe(0);
    });
  });

  describe('recordDefiance', () => {
    it('should increment defiance count', () => {
      let state = createInterferenceState('team-1');
      state = recordDefiance(state, 'demand-1', 5);

      expect(state.totalDefiances).toBe(1);
      expect(state.consecutiveDefiances).toBe(1);
    });

    it('should stack consecutive defiances', () => {
      let state = createInterferenceState('team-1');
      state = recordDefiance(state, 'demand-1', 5);
      state = recordDefiance(state, 'demand-2', 6);

      expect(state.consecutiveDefiances).toBe(2);
    });
  });

  describe('trackNewDemand', () => {
    it('should add demand to history', () => {
      let state = createInterferenceState('team-1');
      const demand: OwnerDemand = {
        id: 'demand-1',
        type: 'signPlayer',
        description: 'Sign player',
        targetId: 'player-1',
        deadline: 10,
        consequence: 'Bad things',
        issuedWeek: 5,
      };

      state = trackNewDemand(state, demand, 5);

      expect(state.complianceHistory).toHaveLength(1);
      expect(state.complianceHistory[0].status).toBe('pending');
      expect(state.lastInterventionWeek).toBe(5);
    });
  });

  describe('calculateComplianceConsequence', () => {
    it('should return positive patience and trust changes', () => {
      const owner = createTestOwner();
      const consequence = calculateComplianceConsequence(owner, 'signPlayer');

      expect(consequence.patienceChange).toBeGreaterThan(0);
      expect(consequence.trustChange).toBeGreaterThan(0);
      expect(consequence.firedImmediately).toBe(false);
    });
  });

  describe('calculateDefianceConsequence', () => {
    it('should return negative patience and trust changes', () => {
      const owner = createTestOwner();
      owner.patienceMeter = 60;

      const consequence = calculateDefianceConsequence(owner, 'signPlayer', 0, owner.patienceMeter);

      expect(consequence.patienceChange).toBeLessThan(0);
      expect(consequence.trustChange).toBeLessThan(0);
    });

    it('should increase penalty for consecutive defiances', () => {
      const owner = createTestOwner();
      owner.patienceMeter = 60;

      const firstDefiance = calculateDefianceConsequence(
        owner,
        'signPlayer',
        0,
        owner.patienceMeter
      );
      const thirdDefiance = calculateDefianceConsequence(
        owner,
        'signPlayer',
        2,
        owner.patienceMeter
      );

      expect(thirdDefiance.patienceChange).toBeLessThan(firstDefiance.patienceChange);
    });

    it('should indicate firing when patience would drop below threshold', () => {
      const owner = createTestOwner();
      owner.patienceMeter = 15; // Already very low
      owner.personality.traits.control = 80; // High control = harsh penalty

      const consequence = calculateDefianceConsequence(owner, 'signPlayer', 2, owner.patienceMeter);

      expect(consequence.firedImmediately).toBe(true);
    });
  });

  describe('checkExpiredDemands', () => {
    it('should identify expired pending demands', () => {
      let state = createInterferenceState('team-1');
      const demand: OwnerDemand = {
        id: 'demand-1',
        type: 'signPlayer',
        description: 'Sign player',
        targetId: null,
        deadline: 5,
        consequence: 'Bad',
        issuedWeek: 3,
      };

      const owner = createTestOwner();
      owner.activeDemands = [demand];
      state = trackNewDemand(state, demand, 3);

      const { expiredDemands, updatedState } = checkExpiredDemands(owner, state, 6);

      expect(expiredDemands).toHaveLength(1);
      expect(updatedState.totalDefiances).toBe(1);
    });
  });

  describe('applyInterferenceConsequence', () => {
    it('should update owner patience and trust', () => {
      const owner = createTestOwner();
      owner.patienceMeter = 50;
      owner.trustLevel = 50;

      const consequence = {
        patienceChange: -10,
        trustChange: -5,
        description: 'Bad',
        firedImmediately: false,
      };

      const updated = applyInterferenceConsequence(owner, consequence);

      expect(updated.patienceMeter).toBe(40);
      expect(updated.trustLevel).toBe(45);
    });

    it('should clamp values to valid range', () => {
      const owner = createTestOwner();
      owner.patienceMeter = 10;
      owner.trustLevel = 10;

      const consequence = {
        patienceChange: -50,
        trustChange: -50,
        description: 'Very bad',
        firedImmediately: true,
      };

      const updated = applyInterferenceConsequence(owner, consequence);

      expect(updated.patienceMeter).toBe(0);
      expect(updated.trustLevel).toBe(0);
    });
  });

  describe('getComplianceRate', () => {
    it('should return null when no history', () => {
      const state = createInterferenceState('team-1');
      expect(getComplianceRate(state)).toBeNull();
    });

    it('should calculate correct rate', () => {
      let state = createInterferenceState('team-1');
      state = { ...state, totalCompliances: 7, totalDefiances: 3 };

      expect(getComplianceRate(state)).toBe(70);
    });
  });

  describe('getComplianceDescription', () => {
    it('should return appropriate descriptions', () => {
      const exemplary = {
        ...createInterferenceState('t'),
        totalCompliances: 10,
        totalDefiances: 0,
      };
      expect(getComplianceDescription(exemplary)).toBe('exemplary');

      const defiant = { ...createInterferenceState('t'), totalCompliances: 3, totalDefiances: 7 };
      expect(getComplianceDescription(defiant)).toBe('defiant');

      const unknown = createInterferenceState('t');
      expect(getComplianceDescription(unknown)).toBe('unknown');
    });
  });

  describe('shouldGenerateDemand', () => {
    it('should not generate when has active demand and not high control', () => {
      const owner = createTestOwner();
      owner.personality.traits.control = 50;

      const triggers = [
        {
          triggered: true,
          type: 'losingStreak' as const,
          severity: 'moderate' as const,
          description: 'a',
        },
      ];

      expect(shouldGenerateDemand(owner, triggers, true)).toBe(false);
    });

    it('should generate for severe triggers', () => {
      const owner = createTestOwner();
      const triggers = [
        {
          triggered: true,
          type: 'losingStreak' as const,
          severity: 'severe' as const,
          description: 'a',
        },
      ];

      expect(shouldGenerateDemand(owner, triggers, false)).toBe(true);
    });

    it('should not generate when no triggers', () => {
      const owner = createTestOwner();
      expect(shouldGenerateDemand(owner, [], false)).toBe(false);
    });
  });
});
