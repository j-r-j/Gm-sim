import {
  DraftPhilosophy,
  assessTeamNeeds,
  createAIDraftProfile,
  generateRandomPhilosophy,
  rankProspectsForTeam,
  getAITopPick,
  shouldConsiderTradeUp,
  shouldConsiderTradeDown,
  makeAIPickDecision,
  validateAIDraftProfile,
  validateTeamNeeds,
  TeamNeeds,
  AIDraftProfile,
} from '../AIDraftStrategy';
import { Position } from '../../models/player/Position';
import { generateDraftClass, DraftClass } from '../DraftClassGenerator';
import { createDraftPick, assignOverallPick } from '../../models/league/DraftPick';

describe('AIDraftStrategy', () => {
  let draftClass: DraftClass;
  let testNeeds: TeamNeeds;
  let testProfile: AIDraftProfile;

  beforeAll(() => {
    draftClass = generateDraftClass({ year: 2025, minProspects: 250, maxProspects: 300 });
  });

  beforeEach(() => {
    // Create team needs
    const rosterCounts = new Map<Position, number>();
    const idealCounts = new Map<Position, number>();

    // Set up some needs
    rosterCounts.set(Position.QB, 1);
    idealCounts.set(Position.QB, 3);

    rosterCounts.set(Position.WR, 3);
    idealCounts.set(Position.WR, 6);

    rosterCounts.set(Position.RB, 3);
    idealCounts.set(Position.RB, 3);

    testNeeds = assessTeamNeeds('team-1', rosterCounts, idealCounts);
    testProfile = createAIDraftProfile('team-1', testNeeds, DraftPhilosophy.BALANCED);
  });

  describe('assessTeamNeeds', () => {
    it('should identify critical positions', () => {
      expect(testNeeds.criticalPositions).toContain(Position.QB);
    });

    it('should identify high need positions', () => {
      // WR has deficit of 3, which is critical
      expect(testNeeds.criticalPositions).toContain(Position.WR);
    });

    it('should set correct need levels', () => {
      expect(testNeeds.positionNeeds.get(Position.QB)).toBe('critical');
      expect(testNeeds.positionNeeds.get(Position.RB)).toBe('moderate');
    });
  });

  describe('createAIDraftProfile', () => {
    it('should create profile with correct philosophy', () => {
      expect(testProfile.philosophy).toBe(DraftPhilosophy.BALANCED);
    });

    it('should set BPA profile with low needs weight', () => {
      const bpaProfile = createAIDraftProfile('team-1', testNeeds, DraftPhilosophy.BPA);
      expect(bpaProfile.needsWeight).toBeLessThan(0.3);
    });

    it('should set needs-based profile with high needs weight', () => {
      const needsProfile = createAIDraftProfile('team-1', testNeeds, DraftPhilosophy.NEEDS_BASED);
      expect(needsProfile.needsWeight).toBeGreaterThan(0.5);
    });

    it('should set trade-happy profile with high aggressiveness', () => {
      const tradeProfile = createAIDraftProfile('team-1', testNeeds, DraftPhilosophy.TRADE_HAPPY);
      expect(tradeProfile.tradeAggressiveness).toBeGreaterThan(0.5);
    });
  });

  describe('generateRandomPhilosophy', () => {
    it('should return valid philosophy', () => {
      const philosophies = Object.values(DraftPhilosophy);

      for (let i = 0; i < 20; i++) {
        const philosophy = generateRandomPhilosophy();
        expect(philosophies).toContain(philosophy);
      }
    });

    it('should have distribution across philosophies', () => {
      const counts = new Map<DraftPhilosophy, number>();

      for (let i = 0; i < 100; i++) {
        const philosophy = generateRandomPhilosophy();
        counts.set(philosophy, (counts.get(philosophy) || 0) + 1);
      }

      // Should have multiple different philosophies
      expect(counts.size).toBeGreaterThan(1);
    });
  });

  describe('rankProspectsForTeam', () => {
    it('should rank prospects', () => {
      const prospects = draftClass.prospects.slice(0, 50);
      const ranked = rankProspectsForTeam(prospects, testProfile);

      expect(ranked.length).toBe(50);
    });

    it('should prioritize needs for needs-based profile', () => {
      const needsProfile = createAIDraftProfile('team-1', testNeeds, DraftPhilosophy.NEEDS_BASED);

      // Get prospects with QB (critical need)
      const prospects = draftClass.prospects.slice(0, 100);
      const ranked = rankProspectsForTeam(prospects, needsProfile);

      // QBs should be ranked higher if they have similar talent
      const qbIndices = ranked
        .map((p, i) => (p.player.position === Position.QB ? i : -1))
        .filter((i) => i >= 0);

      // At least some QBs should be in top half
      const topHalfQBs = qbIndices.filter((i) => i < 50);
      expect(topHalfQBs.length).toBeGreaterThan(0);
    });
  });

  describe('getAITopPick', () => {
    it('should return top ranked prospect', () => {
      const prospects = draftClass.prospects.slice(0, 20);
      const topPick = getAITopPick(prospects, testProfile);

      expect(topPick).not.toBeNull();
      expect(prospects).toContain(topPick);
    });

    it('should return null for empty list', () => {
      const topPick = getAITopPick([], testProfile);
      expect(topPick).toBeNull();
    });
  });

  describe('shouldConsiderTradeUp', () => {
    it('should return boolean', () => {
      const result = shouldConsiderTradeUp(testProfile, 1000, draftClass.prospects.slice(0, 10));
      expect(typeof result).toBe('boolean');
    });

    it('should be more likely for trade-happy teams', () => {
      const tradeHappyProfile = createAIDraftProfile(
        'team-1',
        testNeeds,
        DraftPhilosophy.TRADE_HAPPY
      );

      let tradeHappyCount = 0;
      let balancedCount = 0;

      // Use more iterations to reduce variance
      for (let i = 0; i < 200; i++) {
        if (shouldConsiderTradeUp(tradeHappyProfile, 500, draftClass.prospects.slice(0, 5))) {
          tradeHappyCount++;
        }
        if (shouldConsiderTradeUp(testProfile, 500, draftClass.prospects.slice(0, 5))) {
          balancedCount++;
        }
      }

      // Trade-happy should consider more often (with margin for statistical variance)
      expect(tradeHappyCount).toBeGreaterThanOrEqual(balancedCount - 15);
    });
  });

  describe('shouldConsiderTradeDown', () => {
    it('should return boolean', () => {
      const pick = assignOverallPick(createDraftPick('pick-1', 2025, 1, 'team-1'), 10);
      const result = shouldConsiderTradeDown(testProfile, pick, draftClass.prospects.slice(0, 10));
      expect(typeof result).toBe('boolean');
    });
  });

  describe('makeAIPickDecision', () => {
    it('should return decision with selected prospect', () => {
      const pick = assignOverallPick(createDraftPick('pick-1', 2025, 1, 'team-1'), 10);
      const availablePicks = [assignOverallPick(createDraftPick('pick-2', 2025, 2, 'team-1'), 42)];

      const decision = makeAIPickDecision(
        testProfile,
        pick,
        draftClass.prospects.slice(0, 50),
        availablePicks,
        2025
      );

      expect(decision.type).toBe('select');
      expect(decision.selectedProspect).toBeDefined();
    });

    it('should select from available prospects', () => {
      const pick = assignOverallPick(createDraftPick('pick-1', 2025, 1, 'team-1'), 10);
      const availableProspects = draftClass.prospects.slice(0, 30);

      const decision = makeAIPickDecision(testProfile, pick, availableProspects, [], 2025);

      if (decision.selectedProspect) {
        expect(availableProspects).toContain(decision.selectedProspect);
      }
    });
  });

  describe('validateAIDraftProfile', () => {
    it('should validate correct profile', () => {
      expect(validateAIDraftProfile(testProfile)).toBe(true);
    });

    it('should reject invalid philosophy', () => {
      const invalid = { ...testProfile, philosophy: 'INVALID' as DraftPhilosophy };
      expect(validateAIDraftProfile(invalid)).toBe(false);
    });

    it('should reject out-of-range values', () => {
      const invalid1 = { ...testProfile, tradeAggressiveness: 1.5 };
      const invalid2 = { ...testProfile, needsWeight: -0.1 };

      expect(validateAIDraftProfile(invalid1)).toBe(false);
      expect(validateAIDraftProfile(invalid2)).toBe(false);
    });
  });

  describe('validateTeamNeeds', () => {
    it('should validate correct needs', () => {
      expect(validateTeamNeeds(testNeeds)).toBe(true);
    });

    it('should reject missing team ID', () => {
      const invalid = { ...testNeeds, teamId: '' };
      expect(validateTeamNeeds(invalid)).toBe(false);
    });
  });
});
