/**
 * Ownership Change System Tests
 * Tests for rare ownership changes and owner transitions
 */

import {
  OwnershipChangeType,
  createLeagueOwnershipState,
  generateOwnerName,
  calculateOwnershipChangeProbability,
  determineChangeType,
  generateChangeDescription,
  determineGMRetention,
  createNewOwner,
  processOwnershipChange,
  getOwnershipChangeSummary,
  initializeTeamOwnership,
} from '../OwnershipChangeSystem';
import { TeamContext } from '../OwnerPersonalityEngine';
import { createDefaultOwner, validateOwner } from '../../models/owner/Owner';
import { createDefaultOwnerPersonality } from '../../models/owner/OwnerPersonality';

describe('OwnershipChangeSystem', () => {
  // Helper to create test team context
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

  describe('createLeagueOwnershipState', () => {
    it('should create empty initial state', () => {
      const state = createLeagueOwnershipState();

      expect(state.owners.size).toBe(0);
      expect(state.teamContexts.size).toBe(0);
      expect(state.ownershipHistory).toHaveLength(0);
      expect(state.moodStates.size).toBe(0);
      expect(state.interferenceStates.size).toBe(0);
    });
  });

  describe('generateOwnerName', () => {
    it('should generate first and last name', () => {
      const name = generateOwnerName();

      expect(typeof name.firstName).toBe('string');
      expect(typeof name.lastName).toBe('string');
      expect(name.firstName.length).toBeGreaterThan(0);
      expect(name.lastName.length).toBeGreaterThan(0);
    });

    it('should generate different names on repeated calls', () => {
      const names = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const name = generateOwnerName();
        names.add(`${name.firstName} ${name.lastName}`);
      }

      // Should have some variety (not all the same)
      expect(names.size).toBeGreaterThan(10);
    });
  });

  describe('calculateOwnershipChangeProbability', () => {
    it('should return low base probability', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.yearsAsOwner = 10;

      const context = createTestContext();
      const prob = calculateOwnershipChangeProbability(owner, context, 2024, 2014);

      expect(prob).toBeGreaterThan(0);
      expect(prob).toBeLessThan(0.05); // Cap is 5%
    });

    it('should increase probability for longer ownership', () => {
      const newOwner = createDefaultOwner('owner-1', 'team-1');
      newOwner.yearsAsOwner = 5;

      const oldOwner = createDefaultOwner('owner-2', 'team-2');
      oldOwner.yearsAsOwner = 35;

      const context = createTestContext();

      const newProb = calculateOwnershipChangeProbability(newOwner, context, 2024, 2019);
      const oldProb = calculateOwnershipChangeProbability(oldOwner, context, 2024, 1990);

      expect(oldProb).toBeGreaterThan(newProb);
    });

    it('should increase probability for poor performance', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.yearsAsOwner = 15;

      const goodContext = createTestContext({ recentPerformance: 'good' });
      const terribleContext = createTestContext({ recentPerformance: 'terrible' });

      const goodProb = calculateOwnershipChangeProbability(owner, goodContext, 2024, 2009);
      const terribleProb = calculateOwnershipChangeProbability(owner, terribleContext, 2024, 2009);

      expect(terribleProb).toBeGreaterThan(goodProb);
    });

    it('should cap at 5%', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.yearsAsOwner = 50; // Very long tenure

      const context = createTestContext({
        recentPerformance: 'terrible',
        marketSize: 'small',
      });

      const prob = calculateOwnershipChangeProbability(owner, context, 2024, 1974);

      expect(prob).toBeLessThanOrEqual(0.05);
    });
  });

  describe('determineChangeType', () => {
    it('should return valid change type', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const validTypes: OwnershipChangeType[] = [
        'sale',
        'death',
        'family_transfer',
        'forced_sale',
        'group_purchase',
      ];

      for (let i = 0; i < 20; i++) {
        const type = determineChangeType(owner, Math.random());
        expect(validTypes).toContain(type);
      }
    });

    it('should favor death/family_transfer for long-tenured owners', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.yearsAsOwner = 30;

      let familyOrDeath = 0;
      for (let i = 0; i < 100; i++) {
        const type = determineChangeType(owner, Math.random());
        if (type === 'death' || type === 'family_transfer') {
          familyOrDeath++;
        }
      }

      expect(familyOrDeath).toBeGreaterThan(30);
    });
  });

  describe('generateChangeDescription', () => {
    it('should generate description for each change type', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.firstName = 'John';
      owner.lastName = 'Smith';

      const types: OwnershipChangeType[] = [
        'sale',
        'death',
        'family_transfer',
        'forced_sale',
        'group_purchase',
      ];

      types.forEach((type) => {
        const desc = generateChangeDescription(type, owner, 'Robert Johnson');
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(20);
        expect(desc).toContain('Robert Johnson');
      });
    });
  });

  describe('determineGMRetention', () => {
    it('should return boolean', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const personality = createDefaultOwnerPersonality();

      const result = determineGMRetention('sale', owner, personality, 'average');

      expect(typeof result).toBe('boolean');
    });

    it('should favor retention for excellent GM performance', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const personality = createDefaultOwnerPersonality();
      personality.traits.control = 30; // Hands-off

      let retained = 0;
      for (let i = 0; i < 100; i++) {
        if (determineGMRetention('sale', owner, personality, 'excellent')) {
          retained++;
        }
      }

      expect(retained).toBeGreaterThan(60);
    });

    it('should disfavor retention for poor performance', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const personality = createDefaultOwnerPersonality();
      personality.traits.control = 80; // Controlling

      let retained = 0;
      for (let i = 0; i < 100; i++) {
        if (determineGMRetention('group_purchase', owner, personality, 'terrible')) {
          retained++;
        }
      }

      expect(retained).toBeLessThan(40);
    });

    it('should have higher retention for family transfers', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      const personality = createDefaultOwnerPersonality();

      let familyRetained = 0;
      let forcedRetained = 0;

      for (let i = 0; i < 100; i++) {
        if (determineGMRetention('family_transfer', owner, personality, 'average')) {
          familyRetained++;
        }
        if (determineGMRetention('forced_sale', owner, personality, 'average')) {
          forcedRetained++;
        }
      }

      expect(familyRetained).toBeGreaterThan(forcedRetained);
    });
  });

  describe('createNewOwner', () => {
    it('should create valid owner', () => {
      const context = createTestContext();
      const previousOwner = createDefaultOwner('prev-1', 'team-1');

      const newOwner = createNewOwner('team-1', context, 'sale', previousOwner);

      expect(validateOwner(newOwner)).toBe(true);
      expect(newOwner.teamId).toBe('team-1');
      expect(newOwner.yearsAsOwner).toBe(1);
      expect(newOwner.previousGMsFired).toBe(0);
      expect(newOwner.activeDemands).toHaveLength(0);
    });

    it('should set initial patience above 50', () => {
      const context = createTestContext();
      const previousOwner = createDefaultOwner('prev-1', 'team-1');

      for (let i = 0; i < 10; i++) {
        const newOwner = createNewOwner('team-1', context, 'sale', previousOwner);
        expect(newOwner.patienceMeter).toBeGreaterThanOrEqual(55);
      }
    });
  });

  describe('processOwnershipChange', () => {
    it('should update state with new owner', () => {
      let state = createLeagueOwnershipState();
      const context = createTestContext();
      const owner = createDefaultOwner('owner-1', 'team-1');

      state = {
        ...state,
        owners: new Map([['team-1', owner]]),
        teamContexts: new Map([['team-1', context]]),
      };

      const result = processOwnershipChange(state, 'team-1', owner, 2024, 'average');

      expect(result.newOwner).toBeDefined();
      expect(result.event).toBeDefined();
      expect(result.newState.owners.get('team-1')).not.toBe(owner);
      expect(result.event.previousOwnerId).toBe(owner.id);
      expect(result.event.newOwnerId).toBe(result.newOwner.id);
    });

    it('should record event in history', () => {
      let state = createLeagueOwnershipState();
      const context = createTestContext();
      const owner = createDefaultOwner('owner-1', 'team-1');

      state = {
        ...state,
        owners: new Map([['team-1', owner]]),
        teamContexts: new Map([['team-1', context]]),
      };

      const result = processOwnershipChange(state, 'team-1', owner, 2024, 'average');

      expect(result.newState.ownershipHistory).toHaveLength(1);
      expect(result.newState.ownershipHistory[0].season).toBe(2024);
    });

    it('should reset mood and interference states', () => {
      let state = createLeagueOwnershipState();
      const context = createTestContext();
      const owner = createDefaultOwner('owner-1', 'team-1');

      state = {
        ...state,
        owners: new Map([['team-1', owner]]),
        teamContexts: new Map([['team-1', context]]),
      };

      const result = processOwnershipChange(state, 'team-1', owner, 2024, 'average');

      expect(result.newState.moodStates.get('team-1')).toBeDefined();
      expect(result.newState.interferenceStates.get('team-1')).toBeDefined();
    });
  });

  describe('getOwnershipChangeSummary', () => {
    it('should return user-friendly summary', () => {
      const event = {
        type: 'sale' as const,
        previousOwnerId: 'prev-1',
        newOwnerId: 'new-1',
        season: 2024,
        description: 'Team sold to new owner',
        gmRetained: true,
        expectationsReset: true,
      };

      const summary = getOwnershipChangeSummary(event);

      expect(typeof summary.headline).toBe('string');
      expect(typeof summary.subtext).toBe('string');
      expect(typeof summary.gmStatus).toBe('string');
      expect(summary.gmStatus).toContain('retained');
    });

    it('should indicate when GM is fired', () => {
      const event = {
        type: 'forced_sale' as const,
        previousOwnerId: 'prev-1',
        newOwnerId: 'new-1',
        season: 2024,
        description: 'Forced sale',
        gmRetained: false,
        expectationsReset: true,
      };

      const summary = getOwnershipChangeSummary(event);

      expect(summary.gmStatus).toContain('change');
    });
  });

  describe('initializeTeamOwnership', () => {
    it('should initialize all related state', () => {
      const state = createLeagueOwnershipState();
      const context = createTestContext();

      const newState = initializeTeamOwnership(state, 'team-1', context, 2024);

      expect(newState.owners.has('team-1')).toBe(true);
      expect(newState.teamContexts.has('team-1')).toBe(true);
      expect(newState.moodStates.has('team-1')).toBe(true);
      expect(newState.interferenceStates.has('team-1')).toBe(true);
      expect(newState.lastChangePerTeam.has('team-1')).toBe(true);
    });

    it('should create valid owner for team', () => {
      const state = createLeagueOwnershipState();
      const context = createTestContext();

      const newState = initializeTeamOwnership(state, 'team-1', context, 2024);
      const owner = newState.owners.get('team-1');

      expect(owner).toBeDefined();
      expect(validateOwner(owner!)).toBe(true);
      expect(owner!.teamId).toBe('team-1');
    });
  });
});
