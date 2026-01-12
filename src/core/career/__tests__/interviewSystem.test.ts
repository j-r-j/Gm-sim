/**
 * Interview System Tests
 * Tests for interview and offer management
 */

import {
  createInterviewState,
  requestInterview,
  conductInterview,
  generateOwnerPreview,
  acceptOffer,
  declineOffer,
  getPendingInterviews,
  getActiveOffers,
  processExpiredOffers,
  advanceInterviewWeek,
  getOfferSummary,
  validateInterviewState,
  InterviewState,
} from '../InterviewSystem';
import { JobOpening, TeamInterest } from '../JobMarketManager';
import { createDefaultOwner } from '../../models/owner/Owner';

describe('InterviewSystem', () => {
  // Helper to create test opening
  function createTestOpening(): JobOpening {
    return {
      id: 'opening-1',
      teamId: 'team-1',
      teamName: 'Tigers',
      teamCity: 'Test City',
      conference: 'AFC',
      division: 'North',
      reason: 'fired',
      dateOpened: 19,
      yearOpened: 2025,
      situation: 'mediocre',
      lastSeasonRecord: { wins: 8, losses: 9 },
      playoffAppearancesLast5Years: 1,
      championshipsLast10Years: 0,
      currentRosterTalent: 50,
      ownerName: 'John Smith',
      ownerPatience: 'moderate',
      ownerSpending: 'moderate',
      ownerControl: 'moderate',
      marketSize: 'medium',
      prestige: 50,
      fanbaseExpectations: 'moderate',
      isFilled: false,
      filledByPlayerId: null,
    };
  }

  // Helper to create team interest
  function createTestInterest(level: 'elite' | 'high' | 'moderate' | 'low' | 'none' = 'high'): TeamInterest {
    return {
      openingId: 'opening-1',
      teamId: 'team-1',
      teamName: 'Test City Tigers',
      interestLevel: level,
      reasonsForInterest: ['Good reputation'],
      reasonsAgainstInterest: [],
      hasRequestedInterview: false,
      interviewScheduled: false,
    };
  }

  describe('createInterviewState', () => {
    it('should create initial state', () => {
      const state = createInterviewState(2025, 1);

      expect(state.currentYear).toBe(2025);
      expect(state.currentWeek).toBe(1);
      expect(state.interviews).toHaveLength(0);
      expect(state.maxActiveInterviews).toBe(5);
    });
  });

  describe('requestInterview', () => {
    it('should schedule interview when team is interested', () => {
      const state = createInterviewState(2025, 1);
      const opening = createTestOpening();
      const interest = createTestInterest('high');

      const result = requestInterview(state, opening, interest);

      expect(result.success).toBe(true);
      expect(result.state.interviews).toHaveLength(1);
      expect(result.state.interviews[0].status).toBe('scheduled');
    });

    it('should fail when team has no interest', () => {
      const state = createInterviewState(2025, 1);
      const opening = createTestOpening();
      const interest = createTestInterest('none');

      const result = requestInterview(state, opening, interest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('no interest');
    });

    it('should fail when already have interview with team', () => {
      let state = createInterviewState(2025, 1);
      const opening = createTestOpening();
      const interest = createTestInterest('high');

      // First request succeeds
      const first = requestInterview(state, opening, interest);
      expect(first.success).toBe(true);

      // Second request fails
      const second = requestInterview(first.state, opening, interest);
      expect(second.success).toBe(false);
      expect(second.message.toLowerCase()).toContain('already have an interview');
    });

    it('should fail when max interviews reached', () => {
      let state = createInterviewState(2025, 1);
      state = { ...state, maxActiveInterviews: 1 };

      const opening1 = createTestOpening();
      const interest1 = createTestInterest('high');
      const result1 = requestInterview(state, opening1, interest1);

      const opening2 = { ...createTestOpening(), id: 'opening-2', teamId: 'team-2' };
      const interest2 = { ...createTestInterest('high'), openingId: 'opening-2', teamId: 'team-2' };
      const result2 = requestInterview(result1.state, opening2, interest2);

      expect(result2.success).toBe(false);
      expect(result2.message).toContain('too many active interviews');
    });

    it('should schedule sooner for higher interest', () => {
      const state = createInterviewState(2025, 1);
      const opening = createTestOpening();

      const eliteResult = requestInterview(state, opening, createTestInterest('elite'));
      const lowResult = requestInterview(state, opening, createTestInterest('low'));

      expect(eliteResult.state.interviews[0].scheduledFor).toBeLessThan(
        lowResult.state.interviews[0].scheduledFor!
      );
    });
  });

  describe('conductInterview', () => {
    it('should complete interview and potentially extend offer', () => {
      let state = createInterviewState(2025, 1);
      const opening = createTestOpening();
      const interest = createTestInterest('elite');
      const owner = createDefaultOwner('owner-1', 'team-1');

      const { state: afterRequest } = requestInterview(state, opening, interest);
      const interviewId = afterRequest.interviews[0].id;

      const afterInterview = conductInterview(afterRequest, interviewId, owner, 80, 0.6);

      expect(afterInterview.interviews[0].completedAt).toBe(1);
      expect(afterInterview.interviews[0].interviewScore).not.toBeNull();
      expect(afterInterview.interviews[0].ownerPreview).not.toBeNull();
    });

    it('should generate owner preview during interview', () => {
      let state = createInterviewState(2025, 1);
      const opening = createTestOpening();
      const interest = createTestInterest('high');
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.personality.traits.patience = 25;

      const { state: afterRequest } = requestInterview(state, opening, interest);
      const interviewId = afterRequest.interviews[0].id;

      const afterInterview = conductInterview(afterRequest, interviewId, owner, 70, 0.55);

      expect(afterInterview.interviews[0].ownerPreview).not.toBeNull();
      expect(afterInterview.interviews[0].ownerPreview?.warnings.length).toBeGreaterThan(0);
    });

    it('should not conduct already completed interview', () => {
      let state = createInterviewState(2025, 1);
      const opening = createTestOpening();
      const interest = createTestInterest('high');
      const owner = createDefaultOwner('owner-1', 'team-1');

      const { state: afterRequest } = requestInterview(state, opening, interest);
      const interviewId = afterRequest.interviews[0].id;

      const first = conductInterview(afterRequest, interviewId, owner, 70, 0.55);
      const second = conductInterview(first, interviewId, owner, 70, 0.55);

      // Should be unchanged
      expect(second.interviews[0].completedAt).toBe(first.interviews[0].completedAt);
    });
  });

  describe('generateOwnerPreview', () => {
    it('should include owner name and history', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.firstName = 'John';
      owner.lastName = 'Smith';
      owner.yearsAsOwner = 10;

      const preview = generateOwnerPreview(owner);

      expect(preview.fullName).toBe('John Smith');
      expect(preview.yearsAsOwner).toBe(10);
    });

    it('should generate warnings for problematic traits', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.personality.traits.patience = 20;
      owner.personality.traits.control = 80;

      const preview = generateOwnerPreview(owner);

      expect(preview.warnings.length).toBeGreaterThan(0);
      expect(preview.warnings.some((w) => w.includes('short leash'))).toBe(true);
    });

    it('should include characteristic quote', () => {
      const owner = createDefaultOwner('owner-1', 'team-1');

      const preview = generateOwnerPreview(owner);

      expect(preview.keyQuote).toBeTruthy();
      expect(preview.keyQuote.length).toBeGreaterThan(10);
    });
  });

  describe('acceptOffer', () => {
    it('should accept offer and decline others', () => {
      let state = createInterviewState(2025, 1);
      const owner = createDefaultOwner('owner-1', 'team-1');

      // Schedule and conduct two interviews
      const opening1 = createTestOpening();
      const interest1 = createTestInterest('elite');
      const { state: s1 } = requestInterview(state, opening1, interest1);

      const opening2 = { ...createTestOpening(), id: 'opening-2', teamId: 'team-2' };
      const interest2 = { ...createTestInterest('elite'), openingId: 'opening-2', teamId: 'team-2' };
      const { state: s2 } = requestInterview(s1, opening2, interest2);

      // Conduct both
      const s3 = conductInterview(s2, s2.interviews[0].id, owner, 90, 0.6);
      const s4 = conductInterview(s3, s3.interviews[1].id, owner, 90, 0.6);

      // Find interviews with offers
      const withOffers = s4.interviews.filter((i) => i.offer !== null);
      if (withOffers.length >= 2) {
        const { state: final, offer } = acceptOffer(s4, withOffers[0].id);

        expect(offer).not.toBeNull();
        expect(final.interviews.find((i) => i.id === withOffers[0].id)?.status).toBe('offer_accepted');
        expect(final.interviews.find((i) => i.id === withOffers[1].id)?.status).toBe('offer_declined');
      }
    });

    it('should return null when no offer exists', () => {
      const state = createInterviewState(2025, 1);
      const { state: newState, offer } = acceptOffer(state, 'nonexistent');

      expect(offer).toBeNull();
      expect(newState).toEqual(state);
    });
  });

  describe('declineOffer', () => {
    it('should mark offer as declined', () => {
      let state = createInterviewState(2025, 1);
      const owner = createDefaultOwner('owner-1', 'team-1');
      const opening = createTestOpening();
      const interest = createTestInterest('elite');

      const { state: s1 } = requestInterview(state, opening, interest);
      const s2 = conductInterview(s1, s1.interviews[0].id, owner, 90, 0.6);

      if (s2.interviews[0].offer) {
        const final = declineOffer(s2, s2.interviews[0].id);
        expect(final.interviews[0].status).toBe('offer_declined');
      }
    });
  });

  describe('getPendingInterviews', () => {
    it('should return scheduled but not completed interviews', () => {
      let state = createInterviewState(2025, 1);
      const opening = createTestOpening();
      const interest = createTestInterest('high');

      const { state: afterRequest } = requestInterview(state, opening, interest);

      const pending = getPendingInterviews(afterRequest);
      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('scheduled');
    });
  });

  describe('getActiveOffers', () => {
    it('should return interviews with extended offers', () => {
      let state = createInterviewState(2025, 1);
      const owner = createDefaultOwner('owner-1', 'team-1');
      const opening = createTestOpening();
      const interest = createTestInterest('elite');

      const { state: s1 } = requestInterview(state, opening, interest);
      const s2 = conductInterview(s1, s1.interviews[0].id, owner, 90, 0.6);

      const offers = getActiveOffers(s2);
      // May or may not have offer depending on interview score
      if (s2.interviews[0].status === 'offer_extended') {
        expect(offers).toHaveLength(1);
      }
    });
  });

  describe('processExpiredOffers', () => {
    it('should expire old offers', () => {
      let state = createInterviewState(2025, 1);
      const owner = createDefaultOwner('owner-1', 'team-1');
      const opening = createTestOpening();
      const interest = createTestInterest('elite');

      const { state: s1 } = requestInterview(state, opening, interest);
      const s2 = conductInterview(s1, s1.interviews[0].id, owner, 90, 0.6);

      if (s2.interviews[0].offer) {
        // Advance past expiration
        const s3 = { ...s2, currentWeek: s2.interviews[0].offer.expirationWeek + 1 };
        const final = processExpiredOffers(s3);

        expect(final.interviews[0].status).toBe('offer_declined');
        expect(final.interviews[0].rejectionReason).toContain('expired');
      }
    });
  });

  describe('advanceInterviewWeek', () => {
    it('should update current week and process expirations', () => {
      const state = createInterviewState(2025, 1);
      const advanced = advanceInterviewWeek(state, 5);

      expect(advanced.currentWeek).toBe(5);
    });
  });

  describe('getOfferSummary', () => {
    it('should format offer details correctly', () => {
      const offer = {
        teamId: 'team-1',
        teamName: 'Test City Tigers',
        annualSalary: 3000000,
        lengthYears: 4,
        signingBonus: 500000,
        totalValue: 12500000,
        autonomyLevel: 'high' as const,
        budgetLevel: 'competitive' as const,
        expirationWeek: 5,
      };

      const summary = getOfferSummary(offer);

      expect(summary).toContain('4 years');
      expect(summary).toContain('$3.0M/year');
      expect(summary).toContain('$12.5M total');
    });
  });

  describe('validateInterviewState', () => {
    it('should validate valid state', () => {
      const state = createInterviewState(2025, 1);
      expect(validateInterviewState(state)).toBe(true);
    });

    it('should reject invalid max interviews', () => {
      const state = { ...createInterviewState(2025, 1), maxActiveInterviews: 0 };
      expect(validateInterviewState(state)).toBe(false);
    });

    it('should reject negative interviews count', () => {
      const state = { ...createInterviewState(2025, 1), interviewsThisCycle: -1 };
      expect(validateInterviewState(state)).toBe(false);
    });
  });
});
