/**
 * Tests for Draft Board Manager
 */

import { Position } from '../../models/player/Position';
import { ScoutReport } from '../ScoutReportGenerator';
import {
  DirectorInput,
  createDraftBoardState,
  calculateConsensusRound,
  calculateAverageOverallRange,
  determineDraftTier,
  createDraftBoardProspect,
  addReportToBoard,
  addReportsToBoard,
  setUserRanking,
  removeUserRanking,
  setUserNotes,
  setUserTier,
  lockProspect,
  unlockProspect,
  addDirectorInput,
  setFilters,
  setSortOption,
  getSortedProspects,
  getDraftBoardView,
  removeProspect,
  finalizeDraftBoard,
  validateDraftBoardState,
  getProspectsNeedingScouting,
  getProspectsByPosition,
  getTopProspectsByTier,
} from '../DraftBoardManager';

// Helper to create mock report
function createMockReport(
  prospectId: string,
  scoutId: string,
  options: {
    position?: Position;
    overallMin?: number;
    overallMax?: number;
    roundMin?: number;
    roundMax?: number;
    confidenceScore?: number;
    reportType?: 'auto' | 'focus';
    needsMoreScouting?: boolean;
  } = {}
): ScoutReport {
  const {
    position = Position.WR,
    overallMin = 70,
    overallMax = 85,
    roundMin = 1,
    roundMax = 2,
    confidenceScore = 65,
    reportType = 'auto',
    needsMoreScouting = true,
  } = options;

  return {
    id: `report-${prospectId}-${scoutId}-${Date.now()}`,
    prospectId,
    prospectName: `Player ${prospectId}`,
    position,
    reportType,
    generatedAt: Date.now(),
    scoutId,
    scoutName: `Scout ${scoutId}`,
    physicalMeasurements: {
      height: '6\'2"',
      weight: 210,
      college: 'Test University',
    },
    skillRanges: {
      overall: { min: overallMin, max: overallMax, confidence: 'medium' },
      physical: { min: overallMin + 5, max: overallMax + 3, confidence: 'medium' },
      technical: { min: overallMin - 5, max: overallMax - 2, confidence: 'medium' },
    },
    visibleTraits: [{ name: 'Speed', category: 'physical' }],
    hiddenTraitCount: reportType === 'auto' ? 3 : 0,
    draftProjection: {
      roundMin,
      roundMax,
      pickRangeDescription: `Round ${roundMin}-${roundMax}`,
      overallGrade: 'Day 1-2 pick',
    },
    confidence: {
      level: confidenceScore >= 70 ? 'high' : confidenceScore >= 40 ? 'medium' : 'low',
      score: confidenceScore,
      factors: [],
    },
    needsMoreScouting,
    scoutingHours: reportType === 'focus' ? 45 : 3,
  };
}

describe('DraftBoardManager', () => {
  describe('createDraftBoardState', () => {
    it('should create empty draft board state', () => {
      const state = createDraftBoardState('team-1', 2025);

      expect(state.teamId).toBe('team-1');
      expect(state.draftYear).toBe(2025);
      expect(state.prospects.size).toBe(0);
      expect(state.userRankings).toHaveLength(0);
      expect(state.isFinalized).toBe(false);
    });

    it('should set default sort option', () => {
      const state = createDraftBoardState('team-1', 2025);

      expect(state.sortBy).toBe('consensus_round');
    });
  });

  describe('calculateConsensusRound', () => {
    it('should return average round from reports', () => {
      const reports = [
        createMockReport('p1', 's1', { roundMin: 1, roundMax: 1 }),
        createMockReport('p1', 's2', { roundMin: 1, roundMax: 2 }),
        createMockReport('p1', 's3', { roundMin: 2, roundMax: 2 }),
      ];

      const consensus = calculateConsensusRound(reports);

      // Average of 1, 1.5, 2 = 1.5 -> rounds to 2
      expect(consensus).toBe(2);
    });

    it('should return 7 for no reports', () => {
      const consensus = calculateConsensusRound([]);
      expect(consensus).toBe(7);
    });
  });

  describe('calculateAverageOverallRange', () => {
    it('should average ranges from reports', () => {
      const reports = [
        createMockReport('p1', 's1', { overallMin: 70, overallMax: 80 }),
        createMockReport('p1', 's2', { overallMin: 75, overallMax: 85 }),
      ];

      const range = calculateAverageOverallRange(reports);

      expect(range.min).toBe(73); // (70 + 75) / 2 rounded
      expect(range.max).toBe(83); // (80 + 85) / 2 rounded
    });

    it('should return full range for no reports', () => {
      const range = calculateAverageOverallRange([]);

      expect(range.min).toBe(1);
      expect(range.max).toBe(100);
    });
  });

  describe('determineDraftTier', () => {
    it('should return first_round for round 1', () => {
      expect(determineDraftTier(1)).toBe('first_round');
    });

    it('should return second_round for round 2', () => {
      expect(determineDraftTier(2)).toBe('second_round');
    });

    it('should return day_two for round 3', () => {
      expect(determineDraftTier(3)).toBe('day_two');
    });

    it('should return day_three for rounds 4-5', () => {
      expect(determineDraftTier(4)).toBe('day_three');
      expect(determineDraftTier(5)).toBe('day_three');
    });

    it('should return draftable for rounds 6-7', () => {
      expect(determineDraftTier(6)).toBe('draftable');
      expect(determineDraftTier(7)).toBe('draftable');
    });
  });

  describe('createDraftBoardProspect', () => {
    it('should create prospect from reports', () => {
      const reports = [
        createMockReport('p1', 's1', { overallMin: 70, overallMax: 85, roundMin: 1, roundMax: 2 }),
      ];

      const prospect = createDraftBoardProspect(reports, Date.now());

      expect(prospect).not.toBeNull();
      expect(prospect?.prospectId).toBe('p1');
      expect(prospect?.reports).toHaveLength(1);
    });

    it('should return null for no reports', () => {
      const prospect = createDraftBoardProspect([], Date.now());
      expect(prospect).toBeNull();
    });

    it('should identify focus reports', () => {
      const reports = [createMockReport('p1', 's1', { reportType: 'focus' })];

      const prospect = createDraftBoardProspect(reports, Date.now());

      expect(prospect?.hasFocusReport).toBe(true);
    });

    it('should aggregate confidence from multiple reports', () => {
      const reports = [
        createMockReport('p1', 's1', { confidenceScore: 60 }),
        createMockReport('p1', 's2', { confidenceScore: 70 }),
        createMockReport('p1', 's3', { confidenceScore: 65 }),
      ];

      const prospect = createDraftBoardProspect(reports, Date.now());

      expect(prospect?.aggregatedConfidence.scoutCount).toBe(3);
    });
  });

  describe('addReportToBoard', () => {
    it('should add new prospect to empty board', () => {
      const state = createDraftBoardState('team-1', 2025);
      const report = createMockReport('p1', 's1');

      const newState = addReportToBoard(state, report);

      expect(newState.prospects.size).toBe(1);
      expect(newState.prospects.has('p1')).toBe(true);
    });

    it('should add report to existing prospect', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));
      state = addReportToBoard(state, createMockReport('p1', 's2'));

      expect(state.prospects.size).toBe(1);
      expect(state.prospects.get('p1')?.reports).toHaveLength(2);
    });

    it('should preserve user input when adding reports', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));
      state = setUserRanking(state, 'p1', 5);
      state = setUserNotes(state, 'p1', 'Great prospect');
      state = addReportToBoard(state, createMockReport('p1', 's2'));

      const prospect = state.prospects.get('p1');
      expect(prospect?.userRank).toBe(5);
      expect(prospect?.userNotes).toBe('Great prospect');
    });

    it('should not modify finalized board', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = finalizeDraftBoard(state);

      const newState = addReportToBoard(state, createMockReport('p1', 's1'));

      expect(newState.prospects.size).toBe(0);
    });
  });

  describe('addReportsToBoard', () => {
    it('should add multiple reports at once', () => {
      const state = createDraftBoardState('team-1', 2025);
      const reports = [
        createMockReport('p1', 's1'),
        createMockReport('p2', 's1'),
        createMockReport('p3', 's1'),
      ];

      const newState = addReportsToBoard(state, reports);

      expect(newState.prospects.size).toBe(3);
    });
  });

  describe('setUserRanking', () => {
    it('should set user ranking for prospect', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));

      state = setUserRanking(state, 'p1', 5);

      expect(state.prospects.get('p1')?.userRank).toBe(5);
      expect(state.userRankings).toContain('p1');
    });

    it('should maintain ranking order', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));
      state = addReportToBoard(state, createMockReport('p2', 's1'));
      state = addReportToBoard(state, createMockReport('p3', 's1'));

      state = setUserRanking(state, 'p2', 1);
      state = setUserRanking(state, 'p1', 2);
      state = setUserRanking(state, 'p3', 3);

      expect(state.userRankings[0]).toBe('p2');
      expect(state.userRankings[1]).toBe('p1');
      expect(state.userRankings[2]).toBe('p3');
    });

    it('should not modify locked prospect', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));
      state = lockProspect(state, 'p1');

      state = setUserRanking(state, 'p1', 5);

      expect(state.prospects.get('p1')?.userRank).toBeNull();
    });
  });

  describe('removeUserRanking', () => {
    it('should remove user ranking', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));
      state = setUserRanking(state, 'p1', 5);

      state = removeUserRanking(state, 'p1');

      expect(state.prospects.get('p1')?.userRank).toBeNull();
      expect(state.userRankings).not.toContain('p1');
    });
  });

  describe('setUserNotes', () => {
    it('should set user notes', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));

      state = setUserNotes(state, 'p1', 'Great hands, needs work on routes');

      expect(state.prospects.get('p1')?.userNotes).toBe('Great hands, needs work on routes');
    });
  });

  describe('setUserTier', () => {
    it('should set user tier', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));

      state = setUserTier(state, 'p1', 'first_round');

      expect(state.prospects.get('p1')?.userTier).toBe('first_round');
    });

    it('should allow clearing tier', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));
      state = setUserTier(state, 'p1', 'first_round');
      state = setUserTier(state, 'p1', null);

      expect(state.prospects.get('p1')?.userTier).toBeNull();
    });
  });

  describe('lockProspect / unlockProspect', () => {
    it('should lock prospect', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));

      state = lockProspect(state, 'p1');

      expect(state.prospects.get('p1')?.isLocked).toBe(true);
    });

    it('should unlock prospect', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));
      state = lockProspect(state, 'p1');

      state = unlockProspect(state, 'p1');

      expect(state.prospects.get('p1')?.isLocked).toBe(false);
    });
  });

  describe('addDirectorInput', () => {
    it('should add director ranking and notes', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));

      const input: DirectorInput = {
        prospectId: 'p1',
        rank: 3,
        notes: 'Director thinks highly of this prospect',
        recommendFocus: false,
      };

      state = addDirectorInput(state, input);

      expect(state.prospects.get('p1')?.directorRank).toBe(3);
      expect(state.prospects.get('p1')?.directorNotes).toBe(
        'Director thinks highly of this prospect'
      );
      expect(state.directorRecommendations).toContain('p1');
    });

    it('should set needsMoreScouting when recommendFocus is true', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1', { needsMoreScouting: false }));

      const input: DirectorInput = {
        prospectId: 'p1',
        rank: 5,
        notes: 'Need more info',
        recommendFocus: true,
      };

      state = addDirectorInput(state, input);

      expect(state.prospects.get('p1')?.needsMoreScouting).toBe(true);
    });
  });

  describe('setFilters', () => {
    it('should set position filters', () => {
      let state = createDraftBoardState('team-1', 2025);

      state = setFilters(state, { positions: [Position.WR, Position.CB] });

      expect(state.positionFilters).toContain(Position.WR);
      expect(state.positionFilters).toContain(Position.CB);
    });

    it('should set tier filter', () => {
      let state = createDraftBoardState('team-1', 2025);

      state = setFilters(state, { tier: 'first_round' });

      expect(state.tierFilter).toBe('first_round');
    });

    it('should set showOnlyFocused filter', () => {
      let state = createDraftBoardState('team-1', 2025);

      state = setFilters(state, { showOnlyFocused: true });

      expect(state.showOnlyFocused).toBe(true);
    });
  });

  describe('setSortOption', () => {
    it('should set sort option', () => {
      let state = createDraftBoardState('team-1', 2025);

      state = setSortOption(state, 'user_rank');

      expect(state.sortBy).toBe('user_rank');
    });
  });

  describe('getSortedProspects', () => {
    it('should sort by consensus round by default', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1', { roundMin: 3, roundMax: 4 }));
      state = addReportToBoard(state, createMockReport('p2', 's1', { roundMin: 1, roundMax: 1 }));
      state = addReportToBoard(state, createMockReport('p3', 's1', { roundMin: 2, roundMax: 3 }));

      const sorted = getSortedProspects(state);

      expect(sorted[0].prospectId).toBe('p2'); // Round 1
      expect(sorted[1].prospectId).toBe('p3'); // Round 2-3
      expect(sorted[2].prospectId).toBe('p1'); // Round 3-4
    });

    it('should sort by user rank', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));
      state = addReportToBoard(state, createMockReport('p2', 's1'));
      state = addReportToBoard(state, createMockReport('p3', 's1'));
      state = setUserRanking(state, 'p3', 1);
      state = setUserRanking(state, 'p1', 2);
      state = setSortOption(state, 'user_rank');

      const sorted = getSortedProspects(state);

      expect(sorted[0].prospectId).toBe('p3');
      expect(sorted[1].prospectId).toBe('p1');
      expect(sorted[2].prospectId).toBe('p2'); // No rank, goes last
    });

    it('should filter by position', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1', { position: Position.WR }));
      state = addReportToBoard(state, createMockReport('p2', 's1', { position: Position.CB }));
      state = addReportToBoard(state, createMockReport('p3', 's1', { position: Position.WR }));
      state = setFilters(state, { positions: [Position.WR] });

      const sorted = getSortedProspects(state);

      expect(sorted).toHaveLength(2);
      expect(sorted.every((p) => p.position === Position.WR)).toBe(true);
    });

    it('should filter by focused only', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1', { reportType: 'auto' }));
      state = addReportToBoard(state, createMockReport('p2', 's1', { reportType: 'focus' }));
      state = setFilters(state, { showOnlyFocused: true });

      const sorted = getSortedProspects(state);

      expect(sorted).toHaveLength(1);
      expect(sorted[0].prospectId).toBe('p2');
    });
  });

  describe('getDraftBoardView', () => {
    it('should return view model with stats', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1', { position: Position.WR }));
      state = addReportToBoard(state, createMockReport('p2', 's1', { position: Position.CB }));
      state = setUserRanking(state, 'p1', 1);

      const view = getDraftBoardView(state);

      expect(view.teamId).toBe('team-1');
      expect(view.totalProspects).toBe(2);
      expect(view.rankedProspects).toBe(1);
      expect(view.unrankedProspects).toBe(1);
      expect(view.positionCounts[Position.WR]).toBe(1);
      expect(view.positionCounts[Position.CB]).toBe(1);
    });

    it('should include tier counts', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1', { roundMin: 1, roundMax: 1 }));
      state = addReportToBoard(state, createMockReport('p2', 's1', { roundMin: 2, roundMax: 2 }));
      state = addReportToBoard(state, createMockReport('p3', 's1', { roundMin: 4, roundMax: 5 }));

      const view = getDraftBoardView(state);

      expect(view.tierCounts.first_round).toBe(1);
      expect(view.tierCounts.second_round).toBe(1);
      expect(view.tierCounts.day_three).toBe(1);
    });
  });

  describe('removeProspect', () => {
    it('should remove prospect from board', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));
      state = addReportToBoard(state, createMockReport('p2', 's1'));
      state = setUserRanking(state, 'p1', 1);

      state = removeProspect(state, 'p1');

      expect(state.prospects.size).toBe(1);
      expect(state.prospects.has('p1')).toBe(false);
      expect(state.userRankings).not.toContain('p1');
    });

    it('should not remove from finalized board', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));
      state = finalizeDraftBoard(state);

      state = removeProspect(state, 'p1');

      expect(state.prospects.size).toBe(1);
    });
  });

  describe('finalizeDraftBoard', () => {
    it('should mark board as finalized', () => {
      let state = createDraftBoardState('team-1', 2025);

      state = finalizeDraftBoard(state);

      expect(state.isFinalized).toBe(true);
    });
  });

  describe('validateDraftBoardState', () => {
    it('should validate well-formed state', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1'));
      state = setUserRanking(state, 'p1', 1);

      expect(validateDraftBoardState(state)).toBe(true);
    });

    it('should reject state with missing team ID', () => {
      const state = createDraftBoardState('', 2025);

      expect(validateDraftBoardState(state)).toBe(false);
    });

    it('should reject state with orphaned rankings', () => {
      let state = createDraftBoardState('team-1', 2025);
      state.userRankings = ['nonexistent-prospect'];

      expect(validateDraftBoardState(state)).toBe(false);
    });
  });

  describe('getProspectsNeedingScouting', () => {
    it('should return prospects needing more scouting', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(
        state,
        createMockReport('p1', 's1', { needsMoreScouting: true, reportType: 'auto' })
      );
      state = addReportToBoard(
        state,
        createMockReport('p2', 's1', { needsMoreScouting: false, reportType: 'focus' })
      );
      state = addReportToBoard(
        state,
        createMockReport('p3', 's1', { needsMoreScouting: true, reportType: 'auto' })
      );

      const needsScouting = getProspectsNeedingScouting(state);

      expect(needsScouting).toHaveLength(2);
    });

    it('should exclude prospects with focus reports', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(
        state,
        createMockReport('p1', 's1', { needsMoreScouting: true, reportType: 'focus' })
      );

      const needsScouting = getProspectsNeedingScouting(state);

      expect(needsScouting).toHaveLength(0);
    });
  });

  describe('getProspectsByPosition', () => {
    it('should return prospects filtered by position', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1', { position: Position.WR }));
      state = addReportToBoard(state, createMockReport('p2', 's1', { position: Position.CB }));
      state = addReportToBoard(state, createMockReport('p3', 's1', { position: Position.WR }));

      const wrs = getProspectsByPosition(state, Position.WR);

      expect(wrs).toHaveLength(2);
      expect(wrs.every((p) => p.position === Position.WR)).toBe(true);
    });

    it('should sort by consensus round', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(
        state,
        createMockReport('p1', 's1', { position: Position.WR, roundMin: 3, roundMax: 4 })
      );
      state = addReportToBoard(
        state,
        createMockReport('p2', 's1', { position: Position.WR, roundMin: 1, roundMax: 1 })
      );

      const wrs = getProspectsByPosition(state, Position.WR);

      expect(wrs[0].prospectId).toBe('p2');
      expect(wrs[1].prospectId).toBe('p1');
    });
  });

  describe('getTopProspectsByTier', () => {
    it('should return top prospects in tier', () => {
      let state = createDraftBoardState('team-1', 2025);
      state = addReportToBoard(state, createMockReport('p1', 's1', { roundMin: 1, roundMax: 1 }));
      state = addReportToBoard(state, createMockReport('p2', 's1', { roundMin: 1, roundMax: 1 }));
      state = addReportToBoard(state, createMockReport('p3', 's1', { roundMin: 3, roundMax: 4 }));

      const firstRounders = getTopProspectsByTier(state, 'first_round');

      expect(firstRounders).toHaveLength(2);
    });

    it('should respect limit', () => {
      let state = createDraftBoardState('team-1', 2025);
      for (let i = 0; i < 15; i++) {
        state = addReportToBoard(
          state,
          createMockReport(`p${i}`, 's1', { roundMin: 1, roundMax: 1 })
        );
      }

      const topFive = getTopProspectsByTier(state, 'first_round', 5);

      expect(topFive).toHaveLength(5);
    });
  });
});
