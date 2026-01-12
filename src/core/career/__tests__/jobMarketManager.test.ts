/**
 * Job Market Manager Tests
 * Tests for job openings and market state
 */

import {
  createJobMarketState,
  generateJobOpening,
  calculateTeamInterest,
  addOpening,
  fillOpening,
  calculateAllInterests,
  getAvailableOpenings,
  getInterestForOpening,
  getTeamSituationDescription,
  getOpeningDescription,
  simulateOtherHires,
  cleanupOldOpenings,
  updateReputation,
  validateJobMarketState,
  JobOpening,
} from '../JobMarketManager';
import { createDefaultOwner } from '../../models/owner/Owner';

describe('JobMarketManager', () => {
  // Helper to create test team
  function createTestTeam() {
    return {
      id: 'team-1',
      city: 'Test City',
      nickname: 'Tigers',
      conference: 'AFC' as const,
      division: 'North' as const,
      currentRecord: { wins: 8, losses: 9, ties: 0 } as any,
      playoffSeed: null,
      championships: 0,
      lastChampionshipYear: null,
      marketSize: 'medium' as const,
      prestige: 50,
    } as any;
  }

  // Helper to create test opening
  function createTestOpening(overrides?: Partial<JobOpening>): JobOpening {
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
      ...overrides,
    };
  }

  describe('createJobMarketState', () => {
    it('should create initial state with defaults', () => {
      const state = createJobMarketState(2025, 50);

      expect(state.currentYear).toBe(2025);
      expect(state.openings).toHaveLength(0);
      expect(state.teamInterests).toHaveLength(0);
      expect(state.playerReputationScore).toBe(50);
      expect(state.playerReputationTier).toBe('moderate');
    });

    it('should calculate correct reputation tier', () => {
      const eliteState = createJobMarketState(2025, 90);
      expect(eliteState.playerReputationTier).toBe('elite');

      const lowState = createJobMarketState(2025, 25);
      expect(lowState.playerReputationTier).toBe('none');
    });
  });

  describe('generateJobOpening', () => {
    it('should create opening from team and owner', () => {
      const team = createTestTeam();
      const owner = createDefaultOwner('owner-1', 'team-1');

      const opening = generateJobOpening(team, owner, 'fired', 2025, 19);

      expect(opening.teamId).toBe('team-1');
      expect(opening.teamName).toBe('Tigers');
      expect(opening.teamCity).toBe('Test City');
      expect(opening.reason).toBe('fired');
      expect(opening.yearOpened).toBe(2025);
      expect(opening.isFilled).toBe(false);
    });

    it('should assess team situation correctly', () => {
      const team = createTestTeam();
      const owner = createDefaultOwner('owner-1', 'team-1');

      // Losing team = rebuilding
      team.currentRecord = { wins: 3, losses: 14, ties: 0 };
      const opening = generateJobOpening(team, owner, 'fired', 2025, 19);
      expect(opening.situation).toBe('full_rebuild');
    });

    it('should categorize owner traits', () => {
      const team = createTestTeam();
      const owner = createDefaultOwner('owner-1', 'team-1');
      owner.personality.traits.patience = 20;
      owner.personality.traits.spending = 80;
      owner.personality.traits.control = 50;

      const opening = generateJobOpening(team, owner, 'fired', 2025, 19);

      expect(opening.ownerPatience).toBe('low');
      expect(opening.ownerSpending).toBe('high');
      expect(opening.ownerControl).toBe('moderate');
    });
  });

  describe('calculateTeamInterest', () => {
    it('should calculate interest based on reputation', () => {
      const opening = createTestOpening();

      const highRepInterest = calculateTeamInterest(opening, 80, 1, 0.6, 0);

      expect(highRepInterest.interestLevel).not.toBe('none');
      // Higher reputation should generally lead to higher interest
    });

    it('should boost interest for championships', () => {
      const opening = createTestOpening();

      const withChampionship = calculateTeamInterest(opening, 50, 2, 0.5, 0);

      expect(
        withChampionship.reasonsForInterest.some((r) => r.toLowerCase().includes('championship'))
      ).toBe(true);
    });

    it('should penalize multiple firings', () => {
      const opening = createTestOpening();

      const firedOnce = calculateTeamInterest(opening, 50, 0, 0.5, 1);
      const firedMany = calculateTeamInterest(opening, 50, 0, 0.5, 3);

      expect(firedMany.reasonsAgainstInterest.length).toBeGreaterThan(
        firedOnce.reasonsAgainstInterest.length
      );
    });

    it('should include reasons for and against', () => {
      const opening = createTestOpening();
      const interest = calculateTeamInterest(opening, 50, 1, 0.55, 1);

      expect(Array.isArray(interest.reasonsForInterest)).toBe(true);
      expect(Array.isArray(interest.reasonsAgainstInterest)).toBe(true);
    });
  });

  describe('addOpening', () => {
    it('should add opening to state', () => {
      let state = createJobMarketState(2025, 50);
      const opening = createTestOpening();

      state = addOpening(state, opening);

      expect(state.openings).toHaveLength(1);
      expect(state.openings[0].id).toBe('opening-1');
    });
  });

  describe('fillOpening', () => {
    it('should mark opening as filled', () => {
      let state = createJobMarketState(2025, 50);
      state = addOpening(state, createTestOpening());

      state = fillOpening(state, 'opening-1', 'player-1');

      expect(state.openings[0].isFilled).toBe(true);
      expect(state.openings[0].filledByPlayerId).toBe('player-1');
    });

    it('should mark as filled by AI when no player ID', () => {
      let state = createJobMarketState(2025, 50);
      state = addOpening(state, createTestOpening());

      state = fillOpening(state, 'opening-1', null);

      expect(state.openings[0].isFilled).toBe(true);
      expect(state.openings[0].filledByPlayerId).toBeNull();
    });
  });

  describe('calculateAllInterests', () => {
    it('should calculate interest for all open positions', () => {
      let state = createJobMarketState(2025, 60);
      state = addOpening(state, createTestOpening({ id: 'opening-1' }));
      state = addOpening(state, createTestOpening({ id: 'opening-2', teamId: 'team-2' }));

      state = calculateAllInterests(state, 0, 0.5, 0);

      expect(state.teamInterests).toHaveLength(2);
    });

    it('should not calculate interest for filled positions', () => {
      let state = createJobMarketState(2025, 60);
      state = addOpening(state, createTestOpening({ id: 'opening-1' }));
      state = addOpening(state, createTestOpening({ id: 'opening-2', isFilled: true }));

      state = calculateAllInterests(state, 0, 0.5, 0);

      expect(state.teamInterests).toHaveLength(1);
    });
  });

  describe('getAvailableOpenings', () => {
    it('should return openings where team has interest', () => {
      let state = createJobMarketState(2025, 60);
      state = addOpening(state, createTestOpening());
      state = calculateAllInterests(state, 0, 0.5, 0);

      const available = getAvailableOpenings(state);

      // If there's interest, opening should be available
      if (state.teamInterests[0]?.interestLevel !== 'none') {
        expect(available.length).toBeGreaterThan(0);
      }
    });

    it('should exclude filled openings', () => {
      let state = createJobMarketState(2025, 60);
      state = addOpening(state, createTestOpening({ isFilled: true }));
      state = calculateAllInterests(state, 0, 0.5, 0);

      const available = getAvailableOpenings(state);
      expect(available).toHaveLength(0);
    });
  });

  describe('getInterestForOpening', () => {
    it('should return interest for specific opening', () => {
      let state = createJobMarketState(2025, 60);
      state = addOpening(state, createTestOpening());
      state = calculateAllInterests(state, 0, 0.5, 0);

      const interest = getInterestForOpening(state, 'opening-1');
      expect(interest).not.toBeNull();
      expect(interest?.openingId).toBe('opening-1');
    });

    it('should return null for unknown opening', () => {
      const state = createJobMarketState(2025, 60);
      const interest = getInterestForOpening(state, 'unknown');
      expect(interest).toBeNull();
    });
  });

  describe('getTeamSituationDescription', () => {
    it('should return appropriate descriptions', () => {
      expect(getTeamSituationDescription('contender')).toContain('Championship');
      expect(getTeamSituationDescription('full_rebuild')).toContain('rebuild');
      expect(getTeamSituationDescription('mediocre')).toContain('unclear');
    });
  });

  describe('getOpeningDescription', () => {
    it('should include team name and record', () => {
      const opening = createTestOpening();
      const description = getOpeningDescription(opening);

      expect(description).toContain('Test City');
      expect(description).toContain('Tigers');
      expect(description).toContain('8-9');
    });
  });

  describe('simulateOtherHires', () => {
    it('should potentially fill openings with AI', () => {
      let state = createJobMarketState(2025, 60);
      // Add high prestige opening (more likely to be filled)
      state = addOpening(state, createTestOpening({ prestige: 90 }));

      // Run simulation many times to account for randomness
      let filled = false;
      for (let i = 0; i < 100 && !filled; i++) {
        const result = simulateOtherHires(state);
        if (result.openings[0].isFilled) {
          filled = true;
        }
      }

      // With 90 prestige, should have been filled at least once in 100 tries
      expect(filled).toBe(true);
    });

    it('should exclude specified opening from filling', () => {
      let state = createJobMarketState(2025, 60);
      state = addOpening(state, createTestOpening({ id: 'opening-1', prestige: 100 }));

      // Even with 100% fill chance, excluded opening should not be filled
      const result = simulateOtherHires(state, 'opening-1');
      expect(result.openings[0].isFilled).toBe(false);
    });
  });

  describe('cleanupOldOpenings', () => {
    it('should remove old filled openings', () => {
      let state = createJobMarketState(2025, 60);
      state = addOpening(state, createTestOpening({ yearOpened: 2023, isFilled: true }));
      state = addOpening(state, createTestOpening({ id: 'opening-2', yearOpened: 2025 }));

      state = cleanupOldOpenings(state);

      expect(state.openings).toHaveLength(1);
      expect(state.openings[0].id).toBe('opening-2');
    });

    it('should keep recent unfilled openings', () => {
      let state = createJobMarketState(2025, 60);
      state = addOpening(state, createTestOpening({ yearOpened: 2024 }));

      state = cleanupOldOpenings(state);

      expect(state.openings).toHaveLength(1);
    });
  });

  describe('updateReputation', () => {
    it('should update reputation score and tier', () => {
      let state = createJobMarketState(2025, 50);

      state = updateReputation(state, 85);

      expect(state.playerReputationScore).toBe(85);
      expect(state.playerReputationTier).toBe('elite');
    });
  });

  describe('validateJobMarketState', () => {
    it('should validate valid state', () => {
      const state = createJobMarketState(2025, 50);
      expect(validateJobMarketState(state)).toBe(true);
    });

    it('should reject invalid year', () => {
      const state = { ...createJobMarketState(2025, 50), currentYear: 1900 };
      expect(validateJobMarketState(state)).toBe(false);
    });

    it('should reject invalid reputation', () => {
      const state = { ...createJobMarketState(2025, 50), playerReputationScore: 150 };
      expect(validateJobMarketState(state)).toBe(false);
    });
  });
});
