/**
 * Franchise Tag System Tests
 */

import { Position } from '../../models/player/Position';
import {
  getFranchiseTagValue,
  getTransitionTagValue,
  createTeamTagStatus,
  canUseFranchiseTag,
  canUseTransitionTag,
  applyFranchiseTag,
  removeFranchiseTag,
  getPositionTagComparisons,
  getTagDifferences,
  advanceTagYear,
  validateFranchiseTag,
  getTagStatusSummary,
  FRANCHISE_TAG_VALUES,
  FranchiseTagType,
} from '../FranchiseTagSystem';

describe('FranchiseTagSystem', () => {
  describe('getFranchiseTagValue', () => {
    it('should return correct base value for each position', () => {
      expect(getFranchiseTagValue(Position.QB, 1, 2024)).toBe(FRANCHISE_TAG_VALUES[Position.QB]);
      expect(getFranchiseTagValue(Position.WR, 1, 2024)).toBe(FRANCHISE_TAG_VALUES[Position.WR]);
      expect(getFranchiseTagValue(Position.K, 1, 2024)).toBe(FRANCHISE_TAG_VALUES[Position.K]);
    });

    it('should increase value for consecutive tags', () => {
      const firstTag = getFranchiseTagValue(Position.QB, 1, 2024);
      const secondTag = getFranchiseTagValue(Position.QB, 2, 2024);
      const thirdTag = getFranchiseTagValue(Position.QB, 3, 2024);

      expect(secondTag).toBe(Math.round(firstTag * 1.2));
      expect(thirdTag).toBe(Math.round(firstTag * 1.44));
    });

    it('should apply cap growth for future years', () => {
      const value2024 = getFranchiseTagValue(Position.QB, 1, 2024);
      const value2025 = getFranchiseTagValue(Position.QB, 1, 2025);
      const value2026 = getFranchiseTagValue(Position.QB, 1, 2026);

      expect(value2025).toBeGreaterThan(value2024);
      expect(value2026).toBeGreaterThan(value2025);
    });
  });

  describe('getTransitionTagValue', () => {
    it('should be approximately 85% of franchise tag', () => {
      const franchise = getFranchiseTagValue(Position.QB, 1, 2024);
      const transition = getTransitionTagValue(Position.QB, 2024);

      expect(transition).toBe(Math.round(franchise * 0.85));
    });
  });

  describe('createTeamTagStatus', () => {
    it('should create fresh tag status', () => {
      const status = createTeamTagStatus('team-1', 2024);

      expect(status.teamId).toBe('team-1');
      expect(status.year).toBe(2024);
      expect(status.hasUsedFranchiseTag).toBe(false);
      expect(status.hasUsedTransitionTag).toBe(false);
      expect(status.taggedPlayerId).toBeNull();
      expect(status.transitionPlayerId).toBeNull();
    });
  });

  describe('canUseFranchiseTag', () => {
    it('should allow unused franchise tag', () => {
      const status = createTeamTagStatus('team-1', 2024);
      const result = canUseFranchiseTag(status);

      expect(result.canUse).toBe(true);
    });

    it('should not allow duplicate franchise tag', () => {
      const status = createTeamTagStatus('team-1', 2024);
      const usedStatus = { ...status, hasUsedFranchiseTag: true };

      const result = canUseFranchiseTag(usedStatus);

      expect(result.canUse).toBe(false);
      expect(result.reason).toContain('Already used');
    });
  });

  describe('canUseTransitionTag', () => {
    it('should allow unused transition tag', () => {
      const status = createTeamTagStatus('team-1', 2024);
      const result = canUseTransitionTag(status);

      expect(result.canUse).toBe(true);
    });

    it('should allow transition tag even if franchise tag used', () => {
      const status = createTeamTagStatus('team-1', 2024);
      const usedStatus = { ...status, hasUsedFranchiseTag: true };

      const result = canUseTransitionTag(usedStatus);

      expect(result.canUse).toBe(true);
    });
  });

  describe('applyFranchiseTag', () => {
    it('should successfully apply exclusive franchise tag', () => {
      const status = createTeamTagStatus('team-1', 2024);

      const result = applyFranchiseTag(status, 'player-1', 'John Doe', Position.QB, 'exclusive');

      expect(result.success).toBe(true);
      expect(result.tag).not.toBeNull();
      expect(result.tag!.type).toBe('exclusive');
      expect(result.tag!.salary).toBe(FRANCHISE_TAG_VALUES[Position.QB]);
      expect(result.contract).not.toBeNull();
      expect(result.contract!.type).toBe('franchise_tag');
      expect(result.updatedStatus!.hasUsedFranchiseTag).toBe(true);
      expect(result.updatedStatus!.taggedPlayerId).toBe('player-1');
    });

    it('should successfully apply non-exclusive franchise tag', () => {
      const status = createTeamTagStatus('team-1', 2024);

      const result = applyFranchiseTag(
        status,
        'player-1',
        'John Doe',
        Position.WR,
        'non_exclusive'
      );

      expect(result.success).toBe(true);
      expect(result.tag!.type).toBe('non_exclusive');
    });

    it('should successfully apply transition tag', () => {
      const status = createTeamTagStatus('team-1', 2024);

      const result = applyFranchiseTag(status, 'player-1', 'John Doe', Position.CB, 'transition');

      expect(result.success).toBe(true);
      expect(result.tag!.type).toBe('transition');
      expect(result.updatedStatus!.hasUsedTransitionTag).toBe(true);
      expect(result.updatedStatus!.transitionPlayerId).toBe('player-1');
    });

    it('should fail if franchise tag already used', () => {
      let status = createTeamTagStatus('team-1', 2024);
      status = { ...status, hasUsedFranchiseTag: true };

      const result = applyFranchiseTag(status, 'player-1', 'John Doe', Position.QB, 'exclusive');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Already used');
    });

    it('should increase salary for consecutive tags', () => {
      const status = createTeamTagStatus('team-1', 2024);

      const firstResult = applyFranchiseTag(
        status,
        'player-1',
        'John Doe',
        Position.DE,
        'exclusive',
        1
      );

      const secondResult = applyFranchiseTag(
        status,
        'player-1',
        'John Doe',
        Position.DE,
        'exclusive',
        2
      );

      expect(secondResult.tag!.salary).toBeGreaterThan(firstResult.tag!.salary);
    });
  });

  describe('removeFranchiseTag', () => {
    it('should remove franchise tag when player signs long-term deal', () => {
      let status = createTeamTagStatus('team-1', 2024);
      const result = applyFranchiseTag(status, 'player-1', 'John Doe', Position.QB, 'exclusive');
      status = result.updatedStatus!;

      const updatedStatus = removeFranchiseTag(status, 'player-1', true);

      expect(updatedStatus.taggedPlayerId).toBeNull();
      expect(updatedStatus.hasUsedFranchiseTag).toBe(false);
    });

    it('should keep tag used flag if just rescinded', () => {
      let status = createTeamTagStatus('team-1', 2024);
      const result = applyFranchiseTag(status, 'player-1', 'John Doe', Position.QB, 'exclusive');
      status = result.updatedStatus!;

      const updatedStatus = removeFranchiseTag(status, 'player-1', false);

      expect(updatedStatus.taggedPlayerId).toBeNull();
      expect(updatedStatus.hasUsedFranchiseTag).toBe(true);
    });
  });

  describe('getPositionTagComparisons', () => {
    it('should return comparisons for all positions', () => {
      const comparisons = getPositionTagComparisons(2024);

      expect(comparisons.length).toBe(Object.values(Position).length);

      // Should be sorted by franchise value descending
      for (let i = 0; i < comparisons.length - 1; i++) {
        expect(comparisons[i].franchiseValue).toBeGreaterThanOrEqual(
          comparisons[i + 1].franchiseValue
        );
      }
    });

    it('should categorize positions into tiers', () => {
      const comparisons = getPositionTagComparisons(2024);

      const premiumPositions = comparisons.filter((c) => c.tier === 'premium');
      const midPositions = comparisons.filter((c) => c.tier === 'mid');
      const valuePositions = comparisons.filter((c) => c.tier === 'value');

      expect(premiumPositions.length).toBeGreaterThan(0);
      expect(midPositions.length).toBeGreaterThan(0);
      expect(valuePositions.length).toBeGreaterThan(0);
    });
  });

  describe('getTagDifferences', () => {
    it('should explain tag type differences', () => {
      const differences = getTagDifferences(Position.QB, 2024);

      expect(differences).toHaveLength(3);

      const exclusive = differences.find((d) => d.type === 'exclusive')!;
      const nonExclusive = differences.find((d) => d.type === 'non_exclusive')!;
      const transition = differences.find((d) => d.type === 'transition')!;

      expect(exclusive.matchRights).toBe(true);
      expect(nonExclusive.matchRights).toBe(true);
      expect(transition.matchRights).toBe(true);

      expect(transition.value).toBeLessThan(exclusive.value);
    });
  });

  describe('advanceTagYear', () => {
    it('should reset tag status for new year', () => {
      let status = createTeamTagStatus('team-1', 2024);
      status = { ...status, hasUsedFranchiseTag: true, taggedPlayerId: 'player-1' };

      const newStatus = advanceTagYear(status, 2025);

      expect(newStatus.year).toBe(2025);
      expect(newStatus.hasUsedFranchiseTag).toBe(false);
      expect(newStatus.taggedPlayerId).toBeNull();
    });
  });

  describe('validateFranchiseTag', () => {
    it('should validate a correct tag', () => {
      const status = createTeamTagStatus('team-1', 2024);
      const result = applyFranchiseTag(status, 'player-1', 'John Doe', Position.QB, 'exclusive');

      expect(validateFranchiseTag(result.tag!)).toBe(true);
    });

    it('should reject invalid tag type', () => {
      const invalidTag = {
        playerId: 'player-1',
        playerName: 'John Doe',
        teamId: 'team-1',
        position: Position.QB,
        type: 'invalid' as FranchiseTagType,
        year: 2024,
        salary: 30000,
        deadline: 'July 15, 2024',
        isTagged: true,
        hasLongTermDeal: false,
        consecutiveTagCount: 1,
      };

      expect(validateFranchiseTag(invalidTag)).toBe(false);
    });
  });

  describe('getTagStatusSummary', () => {
    it('should describe available tags', () => {
      const status = createTeamTagStatus('team-1', 2024);

      const summary = getTagStatusSummary(status);

      expect(summary.franchiseStatus).toContain('available');
      expect(summary.transitionStatus).toContain('available');
      expect(summary.recommendation).toBeDefined();
    });

    it('should describe used tags', () => {
      let status = createTeamTagStatus('team-1', 2024);
      status = { ...status, hasUsedFranchiseTag: true, hasUsedTransitionTag: true };

      const summary = getTagStatusSummary(status);

      expect(summary.recommendation).toContain('All tags used');
    });
  });
});
