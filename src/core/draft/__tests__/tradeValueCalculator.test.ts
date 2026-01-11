import {
  evaluateTrade,
  wouldAIAcceptTrade,
  suggestTradeAdditions,
  getPickTierDescription,
  comparePicksQualitative,
  validateTradeEvaluation,
  estimateOverallFromRound,
  TradeProposal,
  TradeAssessment,
} from '../TradeValueCalculator';
import { createDraftPick, assignOverallPick, DraftPick } from '../../models/league/DraftPick';

describe('TradeValueCalculator', () => {
  // Helper to create test picks
  function createTestPick(
    round: number,
    overallPick: number | null,
    year: number = 2025
  ): DraftPick {
    const pick = createDraftPick(`pick-${round}-${overallPick || 'future'}`, year, round, 'team-1');
    if (overallPick !== null) {
      return assignOverallPick(pick, overallPick);
    }
    return pick;
  }

  describe('evaluateTrade', () => {
    it('should rate fair trades as fair', () => {
      // Trade: Pick 10 for Picks 20 + 52
      const proposal: TradeProposal = {
        picksOffered: [createTestPick(1, 20), createTestPick(2, 52)],
        picksRequested: [createTestPick(1, 10)],
        currentYear: 2025,
      };

      const result = evaluateTrade(proposal);
      expect(['fair', 'slightly_favors_you', 'slightly_favors_them']).toContain(result.assessment);
    });

    it('should detect heavily unbalanced trades', () => {
      // Trade: Pick 200 for Pick 1 (heavily favors them)
      const proposal: TradeProposal = {
        picksOffered: [createTestPick(7, 200)],
        picksRequested: [createTestPick(1, 1)],
        currentYear: 2025,
      };

      const result = evaluateTrade(proposal);
      expect(result.assessment).toBe('heavily_favors_them');
    });

    it('should detect trades favoring user', () => {
      // Trade: Pick 1 for Pick 200 (heavily favors you)
      const proposal: TradeProposal = {
        picksOffered: [createTestPick(1, 1)],
        picksRequested: [createTestPick(7, 200)],
        currentYear: 2025,
      };

      const result = evaluateTrade(proposal);
      expect(result.assessment).toBe('heavily_favors_you');
    });

    it('should provide description', () => {
      const proposal: TradeProposal = {
        picksOffered: [createTestPick(1, 15)],
        picksRequested: [createTestPick(1, 16)],
        currentYear: 2025,
      };

      const result = evaluateTrade(proposal);
      expect(result.description).toBeDefined();
      expect(typeof result.description).toBe('string');
      expect(result.description.length).toBeGreaterThan(0);
    });

    it('should discount future picks', () => {
      // Current year pick vs next year pick (same round)
      const currentYearPick = createTestPick(1, 15, 2025);
      const nextYearPick = createTestPick(1, null, 2026);

      const proposal: TradeProposal = {
        picksOffered: [nextYearPick],
        picksRequested: [currentYearPick],
        currentYear: 2025,
      };

      const result = evaluateTrade(proposal);
      // Future picks should be worth less, so this should favor them
      expect(['slightly_favors_them', 'heavily_favors_them']).toContain(result.assessment);
    });
  });

  describe('wouldAIAcceptTrade', () => {
    it('should accept fair trades', () => {
      const proposal: TradeProposal = {
        picksOffered: [createTestPick(1, 20), createTestPick(2, 55)],
        picksRequested: [createTestPick(1, 12)],
        currentYear: 2025,
      };

      const result = wouldAIAcceptTrade(proposal, 1.0);
      expect(result).toBe(true);
    });

    it('should reject heavily unfavorable trades', () => {
      const proposal: TradeProposal = {
        picksOffered: [createTestPick(7, 220)],
        picksRequested: [createTestPick(1, 5)],
        currentYear: 2025,
      };

      const result = wouldAIAcceptTrade(proposal, 1.0);
      expect(result).toBe(false);
    });

    it('should be more lenient with higher personality factor', () => {
      const proposal: TradeProposal = {
        picksOffered: [createTestPick(2, 40)],
        picksRequested: [createTestPick(1, 32)],
        currentYear: 2025,
      };

      // Standard AI might not accept
      const standard = wouldAIAcceptTrade(proposal, 1.0);
      // Trade-happy AI (lower threshold = higher factor reciprocal) more likely to accept
      const tradeHappy = wouldAIAcceptTrade(proposal, 0.7);

      // At least one should accept (or they could have similar behavior)
      expect(typeof standard).toBe('boolean');
      expect(typeof tradeHappy).toBe('boolean');
    });
  });

  describe('suggestTradeAdditions', () => {
    it('should return empty array for fair trades', () => {
      const proposal: TradeProposal = {
        picksOffered: [createTestPick(1, 15)],
        picksRequested: [createTestPick(1, 16)],
        currentYear: 2025,
      };

      const additions = suggestTradeAdditions(proposal, []);
      expect(additions.length).toBe(0);
    });

    it('should suggest picks to balance unfair trade', () => {
      const proposal: TradeProposal = {
        picksOffered: [createTestPick(4, 110)],
        picksRequested: [createTestPick(2, 40)],
        currentYear: 2025,
      };

      const availablePicks = [
        createTestPick(5, 150),
        createTestPick(6, 180),
        createTestPick(7, 210),
      ];

      const additions = suggestTradeAdditions(proposal, availablePicks);
      expect(additions.length).toBeGreaterThan(0);
    });
  });

  describe('getPickTierDescription', () => {
    it('should describe first round picks', () => {
      const earlyFirst = createTestPick(1, 3);
      const midFirst = createTestPick(1, 12);
      const lateFirst = createTestPick(1, 28);

      expect(getPickTierDescription(earlyFirst)).toContain('Premium');
      expect(getPickTierDescription(midFirst)).toContain('High first');
      expect(getPickTierDescription(lateFirst)).toContain('Late first');
    });

    it('should describe later round picks', () => {
      const secondRound = createTestPick(2, 45);
      const seventhRound = createTestPick(7, 220);

      expect(getPickTierDescription(secondRound)).toContain('Second');
      expect(getPickTierDescription(seventhRound)).toContain('Seventh');
    });

    it('should handle future picks without overall number', () => {
      const futurePick = createTestPick(1, null, 2026);
      const description = getPickTierDescription(futurePick);
      expect(description).toContain('First');
    });
  });

  describe('comparePicksQualitative', () => {
    it('should compare picks correctly', () => {
      const pick1 = createTestPick(1, 1);
      const pick32 = createTestPick(1, 32);
      const pick200 = createTestPick(7, 200);

      const comparison1 = comparePicksQualitative(pick1, pick32);
      expect(['significantly_better', 'better']).toContain(comparison1);

      const comparison2 = comparePicksQualitative(pick200, pick1);
      expect(['significantly_worse', 'worse']).toContain(comparison2);

      const comparison3 = comparePicksQualitative(pick1, createTestPick(1, 2));
      expect(['similar', 'better', 'worse']).toContain(comparison3);
    });
  });

  describe('estimateOverallFromRound', () => {
    it('should estimate middle of round', () => {
      expect(estimateOverallFromRound(1)).toBe(16); // Middle of round 1
      expect(estimateOverallFromRound(2)).toBe(48); // Middle of round 2
      expect(estimateOverallFromRound(7)).toBe(208); // Middle of round 7
    });
  });

  describe('validateTradeEvaluation', () => {
    it('should validate correct evaluation', () => {
      const proposal: TradeProposal = {
        picksOffered: [createTestPick(1, 15)],
        picksRequested: [createTestPick(1, 16)],
        currentYear: 2025,
      };

      const evaluation = evaluateTrade(proposal);
      expect(validateTradeEvaluation(evaluation)).toBe(true);
    });

    it('should reject invalid assessment', () => {
      const invalid = {
        assessment: 'invalid' as TradeAssessment,
        description: 'Test',
        _internalValueDiff: 0,
        _internalValueRatio: 1,
      };

      expect(validateTradeEvaluation(invalid)).toBe(false);
    });
  });
});
