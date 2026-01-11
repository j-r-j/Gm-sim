import {
  createDraftRoomState,
  startDraft,
  makeUserPick,
  processAIPick,
  pauseDraft,
  resumeDraft,
  getRoundStatus,
  getAllRoundStatuses,
  getDraftSummary,
  updateTimer,
  validateDraftRoomState,
  DraftStatus,
  DEFAULT_TIMER_CONFIG,
} from '../DraftRoomSimulator';
import {
  createDraftOrderState,
  setDraftOrderFromStandings,
  DraftOrderState,
} from '../DraftOrderManager';
import { generateDraftClass, DraftClass } from '../DraftClassGenerator';
import { createAIDraftProfile, DraftPhilosophy, assessTeamNeeds } from '../AIDraftStrategy';
import { Position } from '../../models/player/Position';

describe('DraftRoomSimulator', () => {
  const teamIds = ['team-1', 'team-2', 'team-3', 'team-4'];
  const userTeamId = 'team-1';
  const currentYear = 2025;

  let draftClass: DraftClass;
  let orderState: DraftOrderState;
  let aiProfiles: Map<string, ReturnType<typeof createAIDraftProfile>>;

  beforeAll(() => {
    draftClass = generateDraftClass({ year: 2025, minProspects: 250, maxProspects: 300 });
  });

  beforeEach(() => {
    orderState = createDraftOrderState(currentYear, teamIds, 3);
    // Set draft order (worst to best: team-4, team-3, team-2, team-1)
    const standings = ['team-1', 'team-2', 'team-3', 'team-4'];
    orderState = setDraftOrderFromStandings(orderState, currentYear, standings);

    // Create AI profiles
    aiProfiles = new Map();
    const rosterCounts = new Map<Position, number>();
    const idealCounts = new Map<Position, number>();
    rosterCounts.set(Position.QB, 2);
    idealCounts.set(Position.QB, 3);

    for (const teamId of teamIds) {
      if (teamId !== userTeamId) {
        const needs = assessTeamNeeds(teamId, rosterCounts, idealCounts);
        aiProfiles.set(teamId, createAIDraftProfile(teamId, needs, DraftPhilosophy.BALANCED));
      }
    }
  });

  describe('createDraftRoomState', () => {
    it('should create initial state', () => {
      const state = createDraftRoomState(
        currentYear,
        orderState,
        draftClass,
        aiProfiles,
        userTeamId
      );

      expect(state.year).toBe(currentYear);
      expect(state.status).toBe(DraftStatus.NOT_STARTED);
      expect(state.userTeamId).toBe(userTeamId);
      expect(state.availableProspects.length).toBe(draftClass.prospects.length);
    });

    it('should include all prospects as available', () => {
      const state = createDraftRoomState(
        currentYear,
        orderState,
        draftClass,
        aiProfiles,
        userTeamId
      );

      expect(state.availableProspects).toEqual(draftClass.prospects);
    });
  });

  describe('startDraft', () => {
    it('should change status to in progress', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);

      state = startDraft(state);
      expect(state.status).toBe(DraftStatus.IN_PROGRESS);
    });

    it('should set current pick', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);

      state = startDraft(state);
      expect(state.currentPick).not.toBeNull();
      expect(state.currentPick?.overallPick).toBe(1);
    });

    it('should throw if already started', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);

      state = startDraft(state);
      expect(() => startDraft(state)).toThrow();
    });
  });

  describe('processAIPick', () => {
    it('should make pick for AI team', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);
      state = startDraft(state);

      // First pick is team-4 (worst team picks first)
      expect(state.currentPick?.teamId).toBe('team-4');
      expect(state.currentPick?.isUserPick).toBe(false);

      state = processAIPick(state);

      expect(state.picks.length).toBe(1);
      expect(state.availableProspects.length).toBe(draftClass.prospects.length - 1);
    });

    it('should advance to next pick', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);
      state = startDraft(state);

      state = processAIPick(state);

      expect(state.currentPick?.overallPick).toBe(2);
    });
  });

  describe('makeUserPick', () => {
    it('should record user pick', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);
      state = startDraft(state);

      // Process AI picks until user's turn
      while (state.currentPick && !state.currentPick.isUserPick) {
        state = processAIPick(state);
      }

      expect(state.currentPick?.isUserPick).toBe(true);

      const prospectToSelect = state.availableProspects[0];
      state = makeUserPick(state, prospectToSelect.id);

      expect(state.picks.some((p) => p.prospect.id === prospectToSelect.id)).toBe(true);
    });

    it('should throw for non-user pick', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);
      state = startDraft(state);

      // First pick is AI team
      expect(state.currentPick?.isUserPick).toBe(false);

      expect(() => makeUserPick(state, state.availableProspects[0].id)).toThrow();
    });

    it('should throw for unavailable prospect', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);
      state = startDraft(state);

      while (state.currentPick && !state.currentPick.isUserPick) {
        state = processAIPick(state);
      }

      expect(() => makeUserPick(state, 'non-existent-id')).toThrow();
    });
  });

  describe('pauseDraft and resumeDraft', () => {
    it('should pause and resume draft', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);
      state = startDraft(state);

      state = pauseDraft(state);
      expect(state.status).toBe(DraftStatus.PAUSED);

      state = resumeDraft(state);
      expect(state.status).toBe(DraftStatus.IN_PROGRESS);
    });

    it('should throw if not in correct state', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);

      expect(() => pauseDraft(state)).toThrow();
      expect(() => resumeDraft(state)).toThrow();
    });
  });

  describe('getRoundStatus', () => {
    it('should return correct round status', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);
      state = startDraft(state);

      const status = getRoundStatus(state, 1);

      expect(status.round).toBe(1);
      expect(status.totalPicks).toBe(teamIds.length);
      expect(status.picksCompleted).toBe(0);
      expect(status.isComplete).toBe(false);
    });

    it('should track completed picks', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);
      state = startDraft(state);

      // Make some picks
      state = processAIPick(state);
      state = processAIPick(state);

      const status = getRoundStatus(state, 1);
      expect(status.picksCompleted).toBe(2);
    });
  });

  describe('getAllRoundStatuses', () => {
    it('should return status for all 7 rounds', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);

      const statuses = getAllRoundStatuses(state);

      expect(statuses.length).toBe(7);
      expect(statuses[0].round).toBe(1);
      expect(statuses[6].round).toBe(7);
    });
  });

  describe('getDraftSummary', () => {
    it('should provide accurate summary', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);
      state = startDraft(state);

      state = processAIPick(state);
      state = processAIPick(state);

      const summary = getDraftSummary(state);

      expect(summary.picksCompleted).toBe(2);
      expect(summary.status).toBe(DraftStatus.IN_PROGRESS);
    });
  });

  describe('updateTimer', () => {
    it('should decrement timer for user pick', () => {
      let state = createDraftRoomState(
        currentYear,
        orderState,
        draftClass,
        aiProfiles,
        userTeamId,
        { ...DEFAULT_TIMER_CONFIG, enabled: true }
      );
      state = startDraft(state);

      // Get to user's pick
      while (state.currentPick && !state.currentPick.isUserPick) {
        state = processAIPick(state);
      }

      const initialTime = state.currentPick?.timeRemaining;
      state = updateTimer(state);

      expect(state.currentPick?.timeRemaining).toBe((initialTime || 0) - 1);
    });

    it('should not affect AI picks', () => {
      let state = createDraftRoomState(currentYear, orderState, draftClass, aiProfiles, userTeamId);
      state = startDraft(state);

      // First pick is AI
      const initialTime = state.currentPick?.timeRemaining;
      state = updateTimer(state);

      // Should be unchanged (null for AI picks)
      expect(state.currentPick?.timeRemaining).toBe(initialTime);
    });
  });

  describe('validateDraftRoomState', () => {
    it('should validate correct state', () => {
      const state = createDraftRoomState(
        currentYear,
        orderState,
        draftClass,
        aiProfiles,
        userTeamId
      );

      expect(validateDraftRoomState(state)).toBe(true);
    });

    it('should reject invalid year', () => {
      const state = createDraftRoomState(
        currentYear,
        orderState,
        draftClass,
        aiProfiles,
        userTeamId
      );

      const invalid = { ...state, year: 1800 };
      expect(validateDraftRoomState(invalid)).toBe(false);
    });
  });
});
