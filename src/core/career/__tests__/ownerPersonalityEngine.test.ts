/**
 * Owner Personality Engine Tests
 * Tests for owner personality generation and trait system
 */

import {
  TeamContext,
  PersonalityArchetype,
  selectArchetypeFromContext,
  generateOwnerTraits,
  generateSecondaryTraits,
  generateInterventionTriggers,
  generateOwnerPersonality,
  generateNetWorth,
  generateOwnerHistory,
  generateOwner,
  getOwnerPersonalitySummary,
  getArchetypeDescription,
} from '../OwnerPersonalityEngine';
import { validateOwnerPersonality } from '../../models/owner/OwnerPersonality';
import { validateOwner } from '../../models/owner/Owner';

describe('OwnerPersonalityEngine', () => {
  // Helper to create a default team context
  function createTestContext(overrides?: Partial<TeamContext>): TeamContext {
    return {
      teamId: 'team-1',
      marketSize: 'medium',
      historicalSuccess: 'contender',
      recentPerformance: 'average',
      fanbasePassion: 'passionate',
      mediaMarket: 'regional',
      ...overrides,
    };
  }

  describe('selectArchetypeFromContext', () => {
    it('should return a valid archetype', () => {
      const context = createTestContext();
      const archetype = selectArchetypeFromContext(context, 0.5);

      const validArchetypes: PersonalityArchetype[] = [
        'patient_builder',
        'win_now_spender',
        'meddling_micromanager',
        'hands_off_owner',
        'analytics_believer',
        'old_school_traditionalist',
        'penny_pincher',
        'balanced',
      ];

      expect(validArchetypes).toContain(archetype);
    });

    it('should favor patient_builder for dynasty teams', () => {
      const context = createTestContext({ historicalSuccess: 'dynasty' });
      let patientCount = 0;

      for (let i = 0; i < 100; i++) {
        const archetype = selectArchetypeFromContext(context, Math.random());
        if (archetype === 'patient_builder' || archetype === 'hands_off_owner') {
          patientCount++;
        }
      }

      expect(patientCount).toBeGreaterThan(20); // Should be biased toward these
    });

    it('should favor win_now for perennial losers', () => {
      const context = createTestContext({ historicalSuccess: 'perennial_loser' });
      let aggressiveCount = 0;

      for (let i = 0; i < 100; i++) {
        const archetype = selectArchetypeFromContext(context, Math.random());
        if (archetype === 'win_now_spender' || archetype === 'meddling_micromanager') {
          aggressiveCount++;
        }
      }

      expect(aggressiveCount).toBeGreaterThan(20);
    });

    it('should favor penny_pincher for small markets', () => {
      const context = createTestContext({ marketSize: 'small' });
      let frugalCount = 0;

      for (let i = 0; i < 100; i++) {
        const archetype = selectArchetypeFromContext(context, Math.random());
        if (archetype === 'penny_pincher' || archetype === 'patient_builder') {
          frugalCount++;
        }
      }

      expect(frugalCount).toBeGreaterThan(15);
    });
  });

  describe('generateOwnerTraits', () => {
    it('should generate traits within valid range', () => {
      const archetypes: PersonalityArchetype[] = [
        'patient_builder',
        'win_now_spender',
        'meddling_micromanager',
        'hands_off_owner',
      ];

      archetypes.forEach((archetype) => {
        const traits = generateOwnerTraits(archetype, 'medium');

        expect(traits.patience).toBeGreaterThanOrEqual(1);
        expect(traits.patience).toBeLessThanOrEqual(100);
        expect(traits.spending).toBeGreaterThanOrEqual(1);
        expect(traits.spending).toBeLessThanOrEqual(100);
        expect(traits.control).toBeGreaterThanOrEqual(1);
        expect(traits.control).toBeLessThanOrEqual(100);
        expect(traits.loyalty).toBeGreaterThanOrEqual(1);
        expect(traits.loyalty).toBeLessThanOrEqual(100);
        expect(traits.ego).toBeGreaterThanOrEqual(1);
        expect(traits.ego).toBeLessThanOrEqual(100);
      });
    });

    it('should generate patient traits for patient_builder', () => {
      const traits = generateOwnerTraits('patient_builder', 'medium', 12345);
      expect(traits.patience).toBeGreaterThan(60);
    });

    it('should generate impatient traits for win_now_spender', () => {
      const traits = generateOwnerTraits('win_now_spender', 'medium', 12345);
      expect(traits.patience).toBeLessThan(50);
      expect(traits.spending).toBeGreaterThan(65);
    });

    it('should apply market size modifiers', () => {
      const smallMarket = generateOwnerTraits('balanced', 'small', 12345);
      const megaMarket = generateOwnerTraits('balanced', 'mega', 12345);

      // Small markets tend toward less spending
      // Mega markets tend toward more spending and less patience
      expect(megaMarket.spending).toBeGreaterThan(smallMarket.spending);
    });

    it('should be deterministic with seed', () => {
      const traits1 = generateOwnerTraits('balanced', 'medium', 99999);
      const traits2 = generateOwnerTraits('balanced', 'medium', 99999);

      expect(traits1).toEqual(traits2);
    });
  });

  describe('generateSecondaryTraits', () => {
    it('should not include conflicting traits', () => {
      for (let i = 0; i < 50; i++) {
        const traits = generateSecondaryTraits('balanced');

        const hasWinNow = traits.includes('winNow');
        const hasLongTerm = traits.includes('longTermThinker');
        expect(hasWinNow && hasLongTerm).toBe(false);

        const hasAnalytics = traits.includes('analyticsBeliever');
        const hasOldSchool = traits.includes('oldSchool');
        expect(hasAnalytics && hasOldSchool).toBe(false);
      }
    });

    it('should prefer appropriate traits for archetype', () => {
      let analyticsCount = 0;
      // Use more iterations to reduce variance
      for (let i = 0; i < 100; i++) {
        const traits = generateSecondaryTraits('analytics_believer');
        if (traits.includes('analyticsBeliever')) analyticsCount++;
      }
      // Analytics believer archetype should have analytics trait at least 40% of the time
      expect(analyticsCount).toBeGreaterThanOrEqual(40);
    });
  });

  describe('generateInterventionTriggers', () => {
    it('should generate valid trigger thresholds', () => {
      const traits = {
        patience: 50,
        spending: 50,
        control: 50,
        loyalty: 50,
        ego: 50,
      };

      const triggers = generateInterventionTriggers(traits, 'passionate');

      expect(triggers.losingStreakLength).toBeGreaterThanOrEqual(2);
      expect(triggers.losingStreakLength).toBeLessThanOrEqual(8);
      expect(triggers.fanApprovalFloor).toBeGreaterThanOrEqual(20);
      expect(triggers.fanApprovalFloor).toBeLessThanOrEqual(70);
      expect(triggers.mediaScrutinyThreshold).toBeGreaterThanOrEqual(20);
      expect(triggers.mediaScrutinyThreshold).toBeLessThanOrEqual(80);
    });

    it('should have shorter losing streak trigger for impatient owners', () => {
      const impatientTraits = {
        patience: 20,
        spending: 50,
        control: 50,
        loyalty: 50,
        ego: 50,
      };
      const patientTraits = {
        patience: 80,
        spending: 50,
        control: 50,
        loyalty: 50,
        ego: 50,
      };

      const impatientTriggers = generateInterventionTriggers(impatientTraits, 'moderate');
      const patientTriggers = generateInterventionTriggers(patientTraits, 'moderate');

      expect(impatientTriggers.losingStreakLength).toBeLessThan(
        patientTriggers.losingStreakLength
      );
    });
  });

  describe('generateOwnerPersonality', () => {
    it('should generate a valid personality', () => {
      const context = createTestContext();
      const personality = generateOwnerPersonality({ teamContext: context });

      expect(validateOwnerPersonality(personality)).toBe(true);
    });

    it('should use specified archetype', () => {
      const context = createTestContext();
      const personality = generateOwnerPersonality({
        teamContext: context,
        archetype: 'patient_builder',
      });

      expect(personality.traits.patience).toBeGreaterThan(55);
    });

    it('should be deterministic with seed', () => {
      const context = createTestContext();
      const p1 = generateOwnerPersonality({ teamContext: context, randomSeed: 42 });
      const p2 = generateOwnerPersonality({ teamContext: context, randomSeed: 42 });

      expect(p1).toEqual(p2);
    });
  });

  describe('generateNetWorth', () => {
    it('should return valid net worth levels', () => {
      const validLevels = ['modest', 'wealthy', 'billionaire', 'oligarch'];

      for (let i = 0; i < 20; i++) {
        const netWorth = generateNetWorth('medium');
        expect(validLevels).toContain(netWorth);
      }
    });

    it('should favor wealthier owners in large markets', () => {
      let wealthyCount = 0;
      for (let i = 0; i < 100; i++) {
        const netWorth = generateNetWorth('mega');
        if (netWorth === 'billionaire' || netWorth === 'oligarch') {
          wealthyCount++;
        }
      }
      expect(wealthyCount).toBeGreaterThan(50);
    });
  });

  describe('generateOwnerHistory', () => {
    it('should generate reasonable history values', () => {
      const context = createTestContext();
      const personality = generateOwnerPersonality({ teamContext: context });
      const history = generateOwnerHistory(context, personality);

      expect(history.yearsAsOwner).toBeGreaterThanOrEqual(3);
      expect(history.yearsAsOwner).toBeLessThanOrEqual(40);
      expect(history.previousGMsFired).toBeGreaterThanOrEqual(0);
      expect(history.championshipsWon).toBeGreaterThanOrEqual(0);
    });

    it('should have more championships for dynasty teams', () => {
      const dynastyContext = createTestContext({ historicalSuccess: 'dynasty' });
      const loserContext = createTestContext({ historicalSuccess: 'perennial_loser' });
      const personality = generateOwnerPersonality({ teamContext: dynastyContext });

      let dynastyChamps = 0;
      let loserChamps = 0;

      for (let i = 0; i < 50; i++) {
        dynastyChamps += generateOwnerHistory(dynastyContext, personality).championshipsWon;
        loserChamps += generateOwnerHistory(loserContext, personality).championshipsWon;
      }

      expect(dynastyChamps).toBeGreaterThan(loserChamps);
    });
  });

  describe('generateOwner', () => {
    it('should generate a valid owner', () => {
      const context = createTestContext();
      const owner = generateOwner('owner-1', 'team-1', 'John', 'Smith', {
        teamContext: context,
      });

      expect(validateOwner(owner)).toBe(true);
    });

    it('should set correct IDs and name', () => {
      const context = createTestContext();
      const owner = generateOwner('owner-123', 'team-456', 'Robert', 'Johnson', {
        teamContext: context,
      });

      expect(owner.id).toBe('owner-123');
      expect(owner.teamId).toBe('team-456');
      expect(owner.firstName).toBe('Robert');
      expect(owner.lastName).toBe('Johnson');
    });

    it('should set initial patience based on recent performance', () => {
      const excellentContext = createTestContext({ recentPerformance: 'excellent' });
      const terribleContext = createTestContext({ recentPerformance: 'terrible' });

      const excellentOwner = generateOwner('o1', 't1', 'A', 'B', { teamContext: excellentContext });
      const terribleOwner = generateOwner('o2', 't2', 'C', 'D', { teamContext: terribleContext });

      expect(excellentOwner.patienceMeter).toBeGreaterThan(terribleOwner.patienceMeter);
    });
  });

  describe('getOwnerPersonalitySummary', () => {
    it('should return description without raw numbers', () => {
      const context = createTestContext();
      const owner = generateOwner('o1', 't1', 'John', 'Smith', { teamContext: context });
      const summary = getOwnerPersonalitySummary(owner);

      expect(typeof summary.primaryStyle).toBe('string');
      expect(summary.primaryStyle.length).toBeGreaterThan(0);
      expect(Array.isArray(summary.keyTraits)).toBe(true);
      expect(typeof summary.workingRelationship).toBe('string');
      expect(['low', 'moderate', 'high', 'extreme']).toContain(summary.riskLevel);
    });

    it('should not expose raw trait numbers', () => {
      const context = createTestContext();
      const owner = generateOwner('o1', 't1', 'John', 'Smith', { teamContext: context });
      const summary = getOwnerPersonalitySummary(owner);

      const summaryString = JSON.stringify(summary);

      // Should not contain exact trait values
      expect(summaryString).not.toMatch(/patience.*:\s*\d+/);
      expect(summaryString).not.toMatch(/spending.*:\s*\d+/);
      expect(summaryString).not.toMatch(/control.*:\s*\d+/);
    });

    it('should limit key traits to 5', () => {
      const context = createTestContext();
      const owner = generateOwner('o1', 't1', 'John', 'Smith', { teamContext: context });
      const summary = getOwnerPersonalitySummary(owner);

      expect(summary.keyTraits.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getArchetypeDescription', () => {
    it('should return descriptions for all archetypes', () => {
      const archetypes: PersonalityArchetype[] = [
        'patient_builder',
        'win_now_spender',
        'meddling_micromanager',
        'hands_off_owner',
        'analytics_believer',
        'old_school_traditionalist',
        'penny_pincher',
        'balanced',
      ];

      archetypes.forEach((archetype) => {
        const description = getArchetypeDescription(archetype);
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(10);
      });
    });
  });
});
