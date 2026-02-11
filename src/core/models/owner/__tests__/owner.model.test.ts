/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Owner Model Tests
 * Tests for Owner entity validation, patience meter, and demand system
 */

import {
  OwnerDemand,
  validateOwner,
  validateOwnerDemand,
  createDefaultOwner,
  getOwnerFullName,
  addOwnerDemand,
  removeOwnerDemand,
  updatePatienceMeter,
  getNetWorthBudgetMultiplier,
  ALL_NET_WORTH_LEVELS,
} from '../Owner';

import {
  validateOwnerPersonality,
  createDefaultOwnerPersonality,
  validateOwnerTraits,
} from '../OwnerPersonality';

import {
  PATIENCE_THRESHOLDS,
  PATIENCE_POSITIVE,
  PATIENCE_NEGATIVE,
  getJobSecurityLevel,
  calculatePatienceImpact,
  applyPatienceChange,
  wouldBeFired,
} from '../PatienceMeter';

describe('OwnerPersonality', () => {
  describe('validateOwnerTraits', () => {
    it('should validate traits within valid range', () => {
      const validTraits = {
        patience: 50,
        spending: 50,
        control: 50,
        loyalty: 50,
        ego: 50,
      };
      expect(validateOwnerTraits(validTraits)).toBe(true);
    });

    it('should reject traits below minimum', () => {
      const invalidTraits = {
        patience: 0, // Below min of 1
        spending: 50,
        control: 50,
        loyalty: 50,
        ego: 50,
      };
      expect(validateOwnerTraits(invalidTraits)).toBe(false);
    });

    it('should reject traits above maximum', () => {
      const invalidTraits = {
        patience: 50,
        spending: 101, // Above max of 100
        control: 50,
        loyalty: 50,
        ego: 50,
      };
      expect(validateOwnerTraits(invalidTraits)).toBe(false);
    });

    it('should accept edge values (1 and 100)', () => {
      const edgeTraits = {
        patience: 1,
        spending: 100,
        control: 1,
        loyalty: 100,
        ego: 50,
      };
      expect(validateOwnerTraits(edgeTraits)).toBe(true);
    });
  });

  describe('validateOwnerPersonality', () => {
    it('should validate a complete personality', () => {
      const personality = createDefaultOwnerPersonality();
      expect(validateOwnerPersonality(personality)).toBe(true);
    });

    it('should reject conflicting traits (winNow + longTermThinker)', () => {
      const personality = createDefaultOwnerPersonality();
      personality.secondaryTraits = ['winNow', 'longTermThinker'];
      expect(validateOwnerPersonality(personality)).toBe(false);
    });

    it('should reject conflicting traits (analyticsBeliever + oldSchool)', () => {
      const personality = createDefaultOwnerPersonality();
      personality.secondaryTraits = ['analyticsBeliever', 'oldSchool'];
      expect(validateOwnerPersonality(personality)).toBe(false);
    });

    it('should accept non-conflicting secondary traits', () => {
      const personality = createDefaultOwnerPersonality();
      personality.secondaryTraits = ['winNow', 'prObsessed', 'championshipOrBust'];
      expect(validateOwnerPersonality(personality)).toBe(true);
    });

    it('should reject invalid secondary traits', () => {
      const personality = createDefaultOwnerPersonality();
      personality.secondaryTraits = ['invalidTrait' as any];
      expect(validateOwnerPersonality(personality)).toBe(false);
    });
  });

  describe('createDefaultOwnerPersonality', () => {
    it('should create a valid default personality', () => {
      const personality = createDefaultOwnerPersonality();
      expect(validateOwnerPersonality(personality)).toBe(true);
    });

    it('should have moderate trait values', () => {
      const personality = createDefaultOwnerPersonality();
      expect(personality.traits.patience).toBe(50);
      expect(personality.traits.spending).toBe(50);
      expect(personality.traits.control).toBe(50);
    });

    it('should have empty secondary traits', () => {
      const personality = createDefaultOwnerPersonality();
      expect(personality.secondaryTraits).toHaveLength(0);
    });
  });
});

describe('PatienceMeter', () => {
  describe('PATIENCE_THRESHOLDS', () => {
    it('should have 5 thresholds', () => {
      expect(PATIENCE_THRESHOLDS).toHaveLength(5);
    });

    it('should cover 0-100 range without gaps', () => {
      const levels = ['secure', 'stable', 'warmSeat', 'hotSeat', 'fired'];
      levels.forEach((level) => {
        const threshold = PATIENCE_THRESHOLDS.find((t) => t.level === level);
        expect(threshold).toBeDefined();
      });
    });

    it('should have fired at lowest range', () => {
      const fired = PATIENCE_THRESHOLDS.find((t) => t.level === 'fired');
      expect(fired?.min).toBe(0);
      expect(fired?.max).toBe(19);
    });

    it('should have secure at highest range', () => {
      const secure = PATIENCE_THRESHOLDS.find((t) => t.level === 'secure');
      expect(secure?.min).toBe(70);
      expect(secure?.max).toBe(100);
    });
  });

  describe('getJobSecurityLevel', () => {
    it('should return secure for high patience', () => {
      expect(getJobSecurityLevel(85)).toBe('secure');
      expect(getJobSecurityLevel(100)).toBe('secure');
      expect(getJobSecurityLevel(70)).toBe('secure');
    });

    it('should return stable for moderate patience', () => {
      expect(getJobSecurityLevel(60)).toBe('stable');
      expect(getJobSecurityLevel(50)).toBe('stable');
    });

    it('should return warmSeat for lower patience', () => {
      expect(getJobSecurityLevel(45)).toBe('warmSeat');
      expect(getJobSecurityLevel(35)).toBe('warmSeat');
    });

    it('should return hotSeat for very low patience', () => {
      expect(getJobSecurityLevel(30)).toBe('hotSeat');
      expect(getJobSecurityLevel(20)).toBe('hotSeat');
    });

    it('should return fired for critical patience', () => {
      expect(getJobSecurityLevel(15)).toBe('fired');
      expect(getJobSecurityLevel(0)).toBe('fired');
    });
  });

  describe('PATIENCE_POSITIVE and PATIENCE_NEGATIVE', () => {
    it('should have positive impact values for positive events', () => {
      PATIENCE_POSITIVE.forEach((modifier) => {
        expect(modifier.minImpact).toBeGreaterThan(0);
        expect(modifier.maxImpact).toBeGreaterThan(0);
        expect(modifier.maxImpact).toBeGreaterThanOrEqual(modifier.minImpact);
      });
    });

    it('should have negative impact values for negative events', () => {
      PATIENCE_NEGATIVE.forEach((modifier) => {
        expect(modifier.minImpact).toBeLessThan(0);
        expect(modifier.maxImpact).toBeLessThan(0);
        expect(modifier.maxImpact).toBeGreaterThanOrEqual(modifier.minImpact);
      });
    });

    it('should include key positive events', () => {
      const events = PATIENCE_POSITIVE.map((m) => m.event);
      expect(events).toContain('superBowlWin');
      expect(events).toContain('playoffWin');
      expect(events).toContain('winningSeason');
    });

    it('should include key negative events', () => {
      const events = PATIENCE_NEGATIVE.map((m) => m.event);
      expect(events).toContain('losingSeason');
      expect(events).toContain('defiedOwner');
      expect(events).toContain('losingStreak5Plus');
    });
  });

  describe('calculatePatienceImpact', () => {
    it('should return 0 for unknown events', () => {
      expect(calculatePatienceImpact('unknownEvent', 50, 0.5)).toBe(0);
    });

    it('should calculate positive impact for positive events', () => {
      const impact = calculatePatienceImpact('superBowlWin', 50, 0.5);
      expect(impact).toBeGreaterThan(0);
    });

    it('should calculate negative impact for negative events', () => {
      const impact = calculatePatienceImpact('losingSeason', 50, 0.5);
      expect(impact).toBeLessThan(0);
    });
  });

  describe('applyPatienceChange', () => {
    it('should apply positive changes', () => {
      expect(applyPatienceChange(50, 10)).toBe(60);
    });

    it('should apply negative changes', () => {
      expect(applyPatienceChange(50, -15)).toBe(35);
    });

    it('should clamp to maximum of 100', () => {
      expect(applyPatienceChange(90, 20)).toBe(100);
    });

    it('should clamp to minimum of 0', () => {
      expect(applyPatienceChange(10, -30)).toBe(0);
    });
  });

  describe('wouldBeFired', () => {
    it('should return true for very low patience', () => {
      expect(wouldBeFired(15)).toBe(true);
      expect(wouldBeFired(0)).toBe(true);
    });

    it('should return false for acceptable patience', () => {
      expect(wouldBeFired(20)).toBe(false);
      expect(wouldBeFired(50)).toBe(false);
    });
  });
});

describe('Owner', () => {
  describe('validateOwner', () => {
    it('should validate a complete owner', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      expect(validateOwner(owner)).toBe(true);
    });

    it('should reject owner with missing id', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      (owner as any).id = '';
      expect(validateOwner(owner)).toBe(false);
    });

    it('should reject owner with invalid patience meter', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.patienceMeter = 150;
      expect(validateOwner(owner)).toBe(false);
    });

    it('should reject owner with invalid net worth', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      (owner as any).netWorth = 'invalid';
      expect(validateOwner(owner)).toBe(false);
    });
  });

  describe('validateOwnerDemand', () => {
    it('should validate a complete demand', () => {
      const demand: OwnerDemand = {
        id: 'demand-1',
        type: 'signPlayer',
        description: 'Sign the star player',
        targetId: 'player-1',
        deadline: 10,
        consequence: 'Lose trust',
        issuedWeek: 5,
      };
      expect(validateOwnerDemand(demand)).toBe(true);
    });

    it('should reject demand with invalid type', () => {
      const demand: OwnerDemand = {
        id: 'demand-1',
        type: 'invalidType' as any,
        description: 'Do something',
        targetId: null,
        deadline: 10,
        consequence: 'Bad things',
        issuedWeek: 5,
      };
      expect(validateOwnerDemand(demand)).toBe(false);
    });

    it('should accept null targetId', () => {
      const demand: OwnerDemand = {
        id: 'demand-1',
        type: 'other',
        description: 'General demand',
        targetId: null,
        deadline: 10,
        consequence: 'Lose trust',
        issuedWeek: 5,
      };
      expect(validateOwnerDemand(demand)).toBe(true);
    });
  });

  describe('createDefaultOwner', () => {
    it('should create a valid owner', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      expect(validateOwner(owner)).toBe(true);
    });

    it('should set correct ids', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      expect(owner.id).toBe('owner-1');
      expect(owner.teamId).toBe('team-1');
    });

    it('should have moderate initial patience', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      expect(owner.patienceMeter).toBe(50);
      expect(owner.trustLevel).toBe(50);
    });
  });

  describe('getOwnerFullName', () => {
    it('should return full name', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.firstName = 'John';
      owner.lastName = 'Doe';
      expect(getOwnerFullName(owner)).toBe('John Doe');
    });
  });

  describe('addOwnerDemand', () => {
    it('should add a demand to the owner', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const demand: OwnerDemand = {
        id: 'demand-1',
        type: 'signPlayer',
        description: 'Sign star',
        targetId: 'player-1',
        deadline: 10,
        consequence: 'Lose trust',
        issuedWeek: 5,
      };

      const updated = addOwnerDemand(owner, demand);
      expect(updated.activeDemands).toHaveLength(1);
      expect(updated.activeDemands[0].id).toBe('demand-1');
    });

    it('should not mutate original owner', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const demand: OwnerDemand = {
        id: 'demand-1',
        type: 'signPlayer',
        description: 'Sign star',
        targetId: 'player-1',
        deadline: 10,
        consequence: 'Lose trust',
        issuedWeek: 5,
      };

      addOwnerDemand(owner, demand);
      expect(owner.activeDemands).toHaveLength(0);
    });
  });

  describe('removeOwnerDemand', () => {
    it('should remove a demand from the owner', () => {
      let owner = createDefaultOwner('owner-1', 'team-1');
      const demand: OwnerDemand = {
        id: 'demand-1',
        type: 'signPlayer',
        description: 'Sign star',
        targetId: 'player-1',
        deadline: 10,
        consequence: 'Lose trust',
        issuedWeek: 5,
      };

      owner = addOwnerDemand(owner, demand);
      const updated = removeOwnerDemand(owner, 'demand-1');
      expect(updated.activeDemands).toHaveLength(0);
    });
  });

  describe('updatePatienceMeter', () => {
    it('should update patience meter', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const updated = updatePatienceMeter(owner, 75);
      expect(updated.patienceMeter).toBe(75);
    });

    it('should clamp to valid range', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      expect(updatePatienceMeter(owner, 150).patienceMeter).toBe(100);
      expect(updatePatienceMeter(owner, -50).patienceMeter).toBe(0);
    });
  });

  describe('getNetWorthBudgetMultiplier', () => {
    it('should return correct multipliers', () => {
      expect(getNetWorthBudgetMultiplier('modest')).toBe(0.8);
      expect(getNetWorthBudgetMultiplier('wealthy')).toBe(1.0);
      expect(getNetWorthBudgetMultiplier('billionaire')).toBe(1.2);
      expect(getNetWorthBudgetMultiplier('oligarch')).toBe(1.5);
    });

    it('should have multipliers for all net worth levels', () => {
      ALL_NET_WORTH_LEVELS.forEach((level) => {
        expect(getNetWorthBudgetMultiplier(level)).toBeDefined();
      });
    });
  });
});
