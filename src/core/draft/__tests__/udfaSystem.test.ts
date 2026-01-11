import {
  createUDFAPool,
  getProspectCompetition,
  getTopUDFAs,
  getUDFAsByPosition,
  attemptUDFASigning,
  simulateAISignings,
  getUserRemainingBudget,
  getUserSignedUDFAs,
  getTeamSignedUDFAs,
  createUDFAOffer,
  getUDFAPoolSummary,
  validateUDFAPoolState,
  UDFA_BONUS_BUDGET,
  UDFAPoolState,
} from '../UDFASystem';
import { generateDraftClass, DraftClass } from '../DraftClassGenerator';
import { Position } from '../../models/player/Position';

describe('UDFASystem', () => {
  const teamIds = ['team-1', 'team-2', 'team-3', 'team-4'];
  const userTeamId = 'team-1';

  let draftClass: DraftClass;
  let selectedIds: Set<string>;
  let udfaPool: UDFAPoolState;

  beforeAll(() => {
    draftClass = generateDraftClass({ year: 2025, minProspects: 300, maxProspects: 350 });
  });

  beforeEach(() => {
    // Simulate that top 224 prospects were drafted
    selectedIds = new Set(draftClass.prospects.slice(0, 224).map((p) => p.id));
    udfaPool = createUDFAPool(draftClass, selectedIds, teamIds, userTeamId);
  });

  describe('createUDFAPool', () => {
    it('should filter out drafted prospects', () => {
      expect(udfaPool.availableProspects.length).toBe(draftClass.prospects.length - 224);
    });

    it('should initialize budgets for all teams', () => {
      for (const teamId of teamIds) {
        expect(udfaPool.remainingBudget.get(teamId)).toBe(UDFA_BONUS_BUDGET);
      }
    });

    it('should initialize empty signings', () => {
      for (const teamId of teamIds) {
        expect(udfaPool.signedByTeam.get(teamId)).toEqual([]);
      }
    });

    it('should generate AI interests', () => {
      // At least some prospects should have AI interest
      let hasInterest = false;
      for (const interests of udfaPool.aiInterests.values()) {
        if (interests.length > 0) {
          hasInterest = true;
          break;
        }
      }
      expect(hasInterest).toBe(true);
    });
  });

  describe('getProspectCompetition', () => {
    it('should return competition for prospects with interest', () => {
      // Find a prospect with competition
      let prospectWithCompetition: string | null = null;
      for (const [prospectId, interests] of udfaPool.aiInterests) {
        if (interests.length > 0) {
          prospectWithCompetition = prospectId;
          break;
        }
      }

      if (prospectWithCompetition) {
        const competition = getProspectCompetition(udfaPool, prospectWithCompetition);
        expect(competition.length).toBeGreaterThan(0);
      }
    });

    it('should return empty for prospects without interest', () => {
      const competition = getProspectCompetition(udfaPool, 'non-existent-id');
      expect(competition.length).toBe(0);
    });
  });

  describe('getTopUDFAs', () => {
    it('should return requested number of prospects', () => {
      const top20 = getTopUDFAs(udfaPool, 20);
      expect(top20.length).toBe(20);
    });

    it('should return all if limit exceeds available', () => {
      const all = getTopUDFAs(udfaPool, 1000);
      expect(all.length).toBe(udfaPool.availableProspects.length);
    });
  });

  describe('getUDFAsByPosition', () => {
    it('should filter by position', () => {
      const qbs = getUDFAsByPosition(udfaPool, Position.QB);
      for (const qb of qbs) {
        expect(qb.player.position).toBe(Position.QB);
      }
    });
  });

  describe('attemptUDFASigning', () => {
    it('should sign available prospect', () => {
      const prospect = udfaPool.availableProspects[0];
      const { result, newState } = attemptUDFASigning(udfaPool, prospect.id, 50);

      // May or may not succeed depending on competition
      expect(typeof result.success).toBe('boolean');
      if (result.success) {
        expect(result.prospect).toBeDefined();
        expect(newState.availableProspects).not.toContain(prospect);
      }
    });

    it('should fail for unavailable prospect', () => {
      const { result } = attemptUDFASigning(udfaPool, 'non-existent', 50);
      expect(result.success).toBe(false);
      expect(result.message).toContain('not available');
    });

    it('should fail if budget insufficient', () => {
      const prospect = udfaPool.availableProspects[0];
      const { result } = attemptUDFASigning(udfaPool, prospect.id, UDFA_BONUS_BUDGET + 100);
      expect(result.success).toBe(false);
      expect(result.message).toContain('budget');
    });

    it('should deduct from budget on success', () => {
      // Find prospect with no competition for guaranteed signing
      let noCompetitionProspect = udfaPool.availableProspects.find(
        (p) => !udfaPool.aiInterests.has(p.id)
      );

      if (!noCompetitionProspect) {
        // Use any prospect with high offer
        noCompetitionProspect = udfaPool.availableProspects[0];
      }

      const { result, newState } = attemptUDFASigning(udfaPool, noCompetitionProspect.id, 100);

      if (result.success) {
        expect(getUserRemainingBudget(newState)).toBe(UDFA_BONUS_BUDGET - 100);
      }
    });
  });

  describe('simulateAISignings', () => {
    it('should sign some UDFAs for AI teams', () => {
      const newState = simulateAISignings(udfaPool, 5);

      let totalAISigned = 0;
      for (const teamId of teamIds) {
        if (teamId !== userTeamId) {
          totalAISigned += getTeamSignedUDFAs(newState, teamId).length;
        }
      }

      // AI teams should have signed some players
      expect(totalAISigned).toBeGreaterThan(0);
    });

    it('should reduce available prospects', () => {
      const initialCount = udfaPool.availableProspects.length;
      const newState = simulateAISignings(udfaPool, 5);

      expect(newState.availableProspects.length).toBeLessThan(initialCount);
    });

    it('should respect budget limits', () => {
      const newState = simulateAISignings(udfaPool, 10);

      for (const teamId of teamIds) {
        const remaining = newState.remainingBudget.get(teamId) || 0;
        expect(remaining).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('getUserRemainingBudget', () => {
    it('should return initial budget', () => {
      expect(getUserRemainingBudget(udfaPool)).toBe(UDFA_BONUS_BUDGET);
    });
  });

  describe('getUserSignedUDFAs', () => {
    it('should return empty initially', () => {
      expect(getUserSignedUDFAs(udfaPool)).toEqual([]);
    });
  });

  describe('createUDFAOffer', () => {
    it('should create valid offer', () => {
      const offer = createUDFAOffer('team-1', 'prospect-1', 50, true);

      expect(offer.teamId).toBe('team-1');
      expect(offer.prospectId).toBe('prospect-1');
      expect(offer.signingBonus).toBe(50);
      expect(offer.years).toBe(3);
      expect(offer.practiceSquadGuarantee).toBe(true);
      expect(offer.pitch.length).toBeGreaterThan(0);
    });
  });

  describe('getUDFAPoolSummary', () => {
    it('should provide accurate summary', () => {
      const summary = getUDFAPoolSummary(udfaPool);

      expect(summary.totalAvailable).toBe(udfaPool.availableProspects.length);
      expect(summary.topProspects.length).toBeLessThanOrEqual(10);
    });

    it('should count positions correctly', () => {
      const summary = getUDFAPoolSummary(udfaPool);

      let totalByPosition = 0;
      for (const count of summary.byPosition.values()) {
        totalByPosition += count;
      }

      expect(totalByPosition).toBe(udfaPool.availableProspects.length);
    });
  });

  describe('validateUDFAPoolState', () => {
    it('should validate correct state', () => {
      expect(validateUDFAPoolState(udfaPool)).toBe(true);
    });

    it('should reject invalid year', () => {
      const invalid = { ...udfaPool, year: 1800 };
      expect(validateUDFAPoolState(invalid)).toBe(false);
    });

    it('should reject missing user team ID', () => {
      const invalid = { ...udfaPool, userTeamId: '' };
      expect(validateUDFAPoolState(invalid)).toBe(false);
    });
  });

  describe('UDFA signing workflow', () => {
    it('should handle complete signing workflow', () => {
      // Simulate AI signings first
      let state = simulateAISignings(udfaPool, 2);

      // User attempts signings
      const topUDFAs = getTopUDFAs(state, 5);
      let successfulSignings = 0;

      for (const prospect of topUDFAs) {
        if (successfulSignings >= 3) break;

        const budget = getUserRemainingBudget(state);
        if (budget < 10) break;

        const { result, newState } = attemptUDFASigning(state, prospect.id, 30);
        if (result.success) {
          state = newState;
          successfulSignings++;
        }
      }

      // Verify signings
      const userSignings = getUserSignedUDFAs(state);
      expect(userSignings.length).toBe(successfulSignings);
    });
  });
});
